import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { QrSession } from './qr-session.service';

/** Extracts the verified QR session attached by QrSessionGuard. */
export const CurrentQrSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): QrSession => {
    const req = ctx.switchToHttp().getRequest();
    return req.qrSession;
  },
);
