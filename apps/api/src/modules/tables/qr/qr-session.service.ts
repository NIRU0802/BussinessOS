import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { QrTokenService } from './qr-token.service';

export interface QrSession {
  tenantId: string;
  branchId: string;
  tableId: string;
  qrSessionId: string;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h — generous single dine-in visit window

@Injectable()
export class QrSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrTokenService: QrTokenService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Issues a token for a table and persists it as a QrCode row.
   * rotate=true revokes any previously active QrCode for this table first —
   * this is what makes an old printed/photographed QR stop working
   * immediately (DB-enforced, not just a timestamp heuristic).
   */
  async issueToken(
    tenantId: string,
    branchId: string,
    tableId: string,
    rotate: boolean,
  ): Promise<{ token: string; qrCodeId: string; rotatedAt: Date }> {
    if (rotate) {
      await this.prisma.forTenant(tenantId, (tx) =>
        tx.qrCode.updateMany({
          where: { tableId, isActive: true, revokedAt: null },
          data: { isActive: false, revokedAt: new Date() },
        }),
      );
    } else {
      const existing = await this.prisma.forTenant(tenantId, (tx) =>
        tx.qrCode.findFirst({
          where: { tableId, isActive: true, revokedAt: null },
        }),
      );
      if (existing) {
        // Can't recover the original raw token from a hash — if one is
        // already active and not rotating, the caller must rotate instead.
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

    return { token, qrCodeId: qrCode.id, rotatedAt: qrCode.createdAt };
  }

  /**
   * Full verification: HMAC signature + freshness (QrTokenService), THEN
   * a DB lookup confirming the QrCode is still active/not revoked, THEN
   * creates a QrSession row as an audit record of this scan.
   */
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
        where: { id: payload.tbid, deletedAt: null, isActive: true },
      }),
    );
    if (!table) {
      throw new UnauthorizedException('This table is no longer available.');
    }

    const resolvedTableId = table.mergedIntoTableId ?? table.id;
    const now = new Date();

    await this.prisma.forTenant(payload.tid, (tx) =>
      tx.qrCode.update({
        where: { id: qrCode.id },
        data: { lastUsedAt: now },
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
    };
  }
}
