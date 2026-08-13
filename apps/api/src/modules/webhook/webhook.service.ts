import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterEndpointDto } from './dto/register-endpoint.dto';

export const WEBHOOK_QUEUE = 'webhook-delivery-queue';
const MAX_ATTEMPTS = 6;

@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(WEBHOOK_QUEUE) private readonly queue: Queue,
  ) {}

  async registerEndpoint(tenantId: string, dto: RegisterEndpointDto) {
    if (dto.direction === 'outbound' && !dto.url) {
      throw new BadRequestException('url is required for outbound endpoints');
    }
    const secret = crypto.randomBytes(32).toString('hex');
    return this.prisma.webhookEndpoint.create({
      data: {
        tenantId,
        name: dto.name,
        direction: dto.direction,
        url: dto.url ?? null,
        secret,
      },
    });
  }

  signPayload(secret: string, payload: unknown): string {
    const body =
      typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  verifySignature(secret: string, rawBody: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  async receiveInbound(
    tenantId: string,
    endpointName: string,
    rawBody: string,
    signatureHeader: string | undefined,
    eventType: string,
    payload: unknown,
  ) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: {
        tenantId,
        name: endpointName,
        direction: 'inbound',
        isActive: true,
      },
    });
    if (!endpoint) throw new NotFoundException('Webhook endpoint not found');

    const signatureValid = signatureHeader
      ? this.verifySignature(endpoint.secret, rawBody, signatureHeader)
      : false;

    const event = await this.prisma.webhookEvent.create({
      data: {
        tenantId,
        endpointId: endpoint.id,
        eventType,
        direction: 'inbound',
        payload: payload as any,
        signatureValid,
        status: signatureValid ? 'delivered' : 'failed',
      },
    });

    if (!signatureValid) {
      throw new BadRequestException('Invalid webhook signature');
    }
    return event;
  }

  async sendOutbound(
    tenantId: string,
    endpointName: string,
    eventType: string,
    payload: unknown,
  ) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: {
        tenantId,
        name: endpointName,
        direction: 'outbound',
        isActive: true,
      },
    });
    if (!endpoint || !endpoint.url) {
      throw new NotFoundException(
        'Outbound webhook endpoint not found or missing url',
      );
    }

    const event = await this.prisma.webhookEvent.create({
      data: {
        tenantId,
        endpointId: endpoint.id,
        eventType,
        direction: 'outbound',
        payload: payload as any,
        status: 'pending',
      },
    });

    await this.queue.add(
      'deliver-webhook',
      { eventId: event.id, tenantId },
      {
        attempts: MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return event;
  }

  async markDeadLetter(tenantId: string, eventId: string) {
    return this.prisma.webhookEvent.update({
      where: { id: eventId },
      data: { status: 'dead_letter' },
    });
  }
}
