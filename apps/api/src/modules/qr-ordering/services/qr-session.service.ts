import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

import { PrismaService } from '../../../prisma/prisma.service';
import { QrTokenService } from './qr-token.service';

export interface QrSession {
  tenantId: string;
  branchId: string;
  tableId: string;
  qrSessionId: string;
  customerId: string | null;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

@Injectable()
export class QrSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrTokenService: QrTokenService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async issueToken(
    tenantId: string,
    branchId: string,
    tableId: string,
    rotate: boolean,
  ): Promise<{
    token: string;
    qrCodeId: string;
    rotatedAt: Date;
  }> {
    if (rotate) {
      await this.prisma.forTenant(tenantId, (tx) =>
        tx.qrCode.updateMany({
          where: {
            tableId,
            isActive: true,
            revokedAt: null,
          },
          data: {
            isActive: false,
            revokedAt: new Date(),
          },
        }),
      );
    } else {
      const existing = await this.prisma.forTenant(tenantId, (tx) =>
        tx.qrCode.findFirst({
          where: {
            tableId,
            isActive: true,
            revokedAt: null,
          },
        }),
      );

      if (existing) {
        throw new UnauthorizedException(
          'An active QR code already exists for this table. Use rotate to replace it.',
        );
      }
    }

    const token = this.qrTokenService.sign(tenantId, branchId, tableId);

    const qrCode = await this.prisma.forTenant(tenantId, (tx) =>
      tx.qrCode.create({
        data: {
          tenantId,
          branchId,
          tableId,
          tokenHash: this.hashToken(token),
        },
      }),
    );

    return {
      token,
      qrCodeId: qrCode.id,
      rotatedAt: qrCode.createdAt,
    };
  }

  async verifyAndResolve(token: string): Promise<QrSession> {
    const payload = this.qrTokenService.verify(token);

    const tokenHash = this.hashToken(token);

    const qrCode = await this.prisma.forTenant(payload.tid, (tx) =>
      tx.qrCode.findFirst({
        where: {
          tokenHash,
          tableId: payload.tbid,
          branchId: payload.bid,
          isActive: true,
          revokedAt: null,
        },
      }),
    );

    if (!qrCode) {
      throw new UnauthorizedException(
        'This QR code is no longer valid. Please scan the current code at your table.',
      );
    }

    const table = await this.prisma.forTenant(payload.tid, (tx) =>
      tx.table.findFirst({
        where: {
          id: payload.tbid,
          deletedAt: null,
          isActive: true,
        },
      }),
    );

    if (!table) {
      throw new UnauthorizedException('This table is no longer available.');
    }

    const resolvedTableId = table.mergedIntoTableId ?? table.id;

    const now = new Date();

    await this.prisma.forTenant(payload.tid, (tx) =>
      tx.qrCode.update({
        where: {
          id: qrCode.id,
        },
        data: {
          lastUsedAt: now,
        },
      }),
    );

    const session = await this.prisma.forTenant(payload.tid, (tx) =>
      tx.qrSession.create({
        data: {
          tenantId: payload.tid,
          branchId: payload.bid,
          tableId: resolvedTableId,
          qrCodeId: qrCode.id,
          sessionHash: crypto.randomBytes(32).toString('hex'),
          expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
          lastUsedAt: now,
        },
      }),
    );

    return {
      tenantId: payload.tid,
      branchId: payload.bid,
      tableId: resolvedTableId,
      qrSessionId: session.id,
      customerId: session.customerId,
    };
  }

  async attachCustomer(
    session: QrSession,
    customerId: string,
  ): Promise<QrSession> {
    const customer = await this.prisma.forTenant(session.tenantId, (tx) =>
      tx.customer.findFirst({
        where: {
          id: customerId,
        },
      }),
    );

    if (!customer) {
      throw new UnauthorizedException(
        'Customer does not belong to this business.',
      );
    }

    const updatedSession = await this.prisma.forTenant(session.tenantId, (tx) =>
      tx.qrSession.update({
        where: {
          id: session.qrSessionId,
        },
        data: {
          customerId,
          lastUsedAt: new Date(),
        },
      }),
    );

    return {
      ...session,
      customerId: updatedSession.customerId,
    };
  }

  async getSession(sessionId: string): Promise<QrSession> {
    const session = await this.prisma.qrSession.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        tableId: true,
        customerId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('QR session not found.');
    }

    if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException(
        'Your QR session has expired. Please scan the QR code again.',
      );
    }

    return {
      tenantId: session.tenantId,
      branchId: session.branchId,
      tableId: session.tableId,
      qrSessionId: session.id,
      customerId: session.customerId,
    };
  }

  async touchSession(session: QrSession): Promise<void> {
    await this.prisma.forTenant(session.tenantId, (tx) =>
      tx.qrSession.update({
        where: {
          id: session.qrSessionId,
        },
        data: {
          lastUsedAt: new Date(),
        },
      }),
    );
  }

  async revokeSession(session: QrSession): Promise<void> {
    await this.prisma.forTenant(session.tenantId, (tx) =>
      tx.qrSession.update({
        where: {
          id: session.qrSessionId,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    );
  }
}
