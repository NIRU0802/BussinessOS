import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

interface QrTokenPayload {
  tid: string;
  bid: string;
  tbid: string;
  type: 'qr';
}

@Injectable()
export class QrTokenService {
  private readonly expiresIn: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const configuredExpiry =
      this.configService.get<string>('QR_TOKEN_EXPIRES_IN') ?? '365d';

    this.expiresIn = this.parseExpiry(configuredExpiry);
  }

  private parseExpiry(value: string): number {
    const normalized = value.trim().toLowerCase();

    const match = normalized.match(/^(\d+)\s*(s|m|h|d|w)$/);

    if (!match) {
      throw new Error(
        `Invalid QR_TOKEN_EXPIRES_IN value: "${value}". Use formats such as 30d, 12h, 60m, or 3600s.`,
      );
    }

    const amount = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return amount;

      case 'm':
        return amount * 60;

      case 'h':
        return amount * 60 * 60;

      case 'd':
        return amount * 24 * 60 * 60;

      case 'w':
        return amount * 7 * 24 * 60 * 60;

      default:
        throw new Error(`Unsupported QR token expiry unit: "${unit}".`);
    }
  }

  sign(tenantId: string, branchId: string, tableId: string): string {
    if (!tenantId || !branchId || !tableId) {
      throw new Error(
        'tenantId, branchId and tableId are required to create a QR token.',
      );
    }

    const payload: QrTokenPayload = {
      tid: tenantId,
      bid: branchId,
      tbid: tableId,
      type: 'qr',
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.expiresIn,
    });
  }

  verify(token: string): QrTokenPayload {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('QR token is required.');
    }

    try {
      const payload = this.jwtService.verify<QrTokenPayload>(token);

      if (
        !payload.tid ||
        !payload.bid ||
        !payload.tbid ||
        payload.type !== 'qr'
      ) {
        throw new UnauthorizedException('Invalid QR token.');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired QR code.');
    }
  }
}
