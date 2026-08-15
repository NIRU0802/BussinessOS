import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface QrTokenPayload {
  tid: string; // tenantId
  bid: string; // branchId
  tbid: string; // tableId
  iat: number; // issued-at, ms epoch
}

/**
 * Pure HMAC signing/verification for QR table tokens. No DB access here —
 * DB-aware validation (table exists, not rotated-out, not deleted) lives in
 * QrSessionService. Uses Node's built-in crypto (no extra package needed).
 */
@Injectable()
export class QrTokenService {
  private readonly secret: string;
  private readonly maxAgeMs: number;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('QR_TOKEN_HMAC_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error(
        'QR_TOKEN_HMAC_SECRET must be set and at least 32 characters long.',
      );
    }
    this.secret = secret;

    const maxAgeDays = Number(
      this.configService.get<string>('QR_TOKEN_MAX_AGE_DAYS') ?? '90',
    );
    this.maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  }

  sign(tenantId: string, branchId: string, tableId: string): string {
    const payload: QrTokenPayload = {
      tid: tenantId,
      bid: branchId,
      tbid: tableId,
      iat: Date.now(),
    };
    const payloadB64 = this.toBase64Url(JSON.stringify(payload));
    const signature = this.computeSignature(payloadB64);
    return `${payloadB64}.${signature}`;
  }

  /**
   * Verifies signature and freshness only. Does NOT check the token
   * against the database (rotation, deletion, tenant/branch existence) —
   * callers must additionally use QrSessionService.verifyAndResolve for a
   * fully trustworthy result.
   */
  verify(token: string): QrTokenPayload {
    const parts = typeof token === 'string' ? token.split('.') : [];
    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid QR code.');
    }
    const [payloadB64, providedSig] = parts;

    const expectedSig = this.computeSignature(payloadB64);
    const providedBuf = Buffer.from(providedSig);
    const expectedBuf = Buffer.from(expectedSig);

    if (
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      throw new UnauthorizedException('Invalid QR code.');
    }

    let payload: QrTokenPayload;
    try {
      payload = JSON.parse(this.fromBase64Url(payloadB64));
    } catch {
      throw new UnauthorizedException('Invalid QR code.');
    }

    if (
      typeof payload.tid !== 'string' ||
      typeof payload.bid !== 'string' ||
      typeof payload.tbid !== 'string' ||
      typeof payload.iat !== 'number'
    ) {
      throw new UnauthorizedException('Invalid QR code.');
    }

    if (Date.now() - payload.iat > this.maxAgeMs) {
      throw new UnauthorizedException(
        'This QR code has expired. Please ask staff for a new one.',
      );
    }

    return payload;
  }

  private computeSignature(payloadB64: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(payloadB64)
      .digest('base64url');
  }

  private toBase64Url(input: string): string {
    return Buffer.from(input, 'utf8').toString('base64url');
  }

  private fromBase64Url(input: string): string {
    return Buffer.from(input, 'base64url').toString('utf8');
  }
}
