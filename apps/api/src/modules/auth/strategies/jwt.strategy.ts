import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  branchIds: string[];
  isAllBranches: boolean;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  // Passport attaches whatever this returns as req.user. The JWT itself
  // stores the user id under the standard "sub" claim, but every service
  // in this codebase (OrdersService, SyncEngineService, etc.) expects
  // req.user.id — mapping it here, once, means every existing call site
  // starts working correctly without changes elsewhere.
  async validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      sub: payload.sub,
      tenantId: payload.tenantId,
      branchIds: payload.branchIds,
      isAllBranches: payload.isAllBranches,
      roles: payload.roles,
      permissions: payload.permissions,
    };
  }
}
