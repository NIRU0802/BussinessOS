import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { TenantRequestContext } from '../../common/tenant-context/tenant-context.service';
import { WebhookService } from './webhook.service';
import { RegisterEndpointDto } from './dto/register-endpoint.dto';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('endpoints')
  @RequirePermissions('SETTINGS_MANAGE')
  register(
    @CurrentUser() user: TenantRequestContext,
    @Body() dto: RegisterEndpointDto,
  ) {
    return this.webhookService.registerEndpoint(user.tenantId, dto);
  }

  @Post('inbound/:tenantId/:endpointName')
  async receiveInbound(
    @Param('tenantId') tenantId: string,
    @Param('endpointName') endpointName: string,
    @Headers('x-webhook-signature') signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body);
    const payload = req.body;
    const eventType = payload?.event_type ?? 'unknown';

    return this.webhookService.receiveInbound(
      tenantId,
      endpointName,
      rawBody,
      signature,
      eventType,
      payload,
    );
  }
}
