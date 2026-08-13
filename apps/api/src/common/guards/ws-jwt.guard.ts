import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';

// Socket.IO connections don't carry an Authorization header the way HTTP
// requests do, so this guard reads the token from the handshake auth
// payload instead: `io(url, { auth: { token: '<accessToken>' } })` on the
// client side (Electron/Mobile/Web Dashboard). Verifies with the SAME
// secret AuthService signs with, so quick-login and full-login tokens
// both work here identically — no separate WS-specific auth path exists.
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();

    // Already authenticated earlier in this connection's lifetime.
    if (client.data?.user) {
      return true;
    }

    const token = this.extractToken(client);
    if (!token) {
      this.logger.debug(
        `WS connection ${client.id} rejected: no token provided`,
      );
      client.emit('auth-error', { message: 'Authentication token required.' });
      return false;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
      client.data.user = payload;
      return true;
    } catch (err) {
      this.logger.debug(
        `WS connection ${client.id} rejected: invalid/expired token`,
      );
      client.emit('auth-error', { message: 'Invalid or expired token.' });
      return false;
    }
  }

  private extractToken(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.token;
    if (typeof fromAuth === 'string' && fromAuth.length > 0) {
      return fromAuth;
    }
    const authHeader = client.handshake.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return null;
  }
}
