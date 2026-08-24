import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../prisma/prisma.service';

export interface SuperAdminJwtPayload {
  sub: string;
  email: string;
  super_admin_type: 'GR8' | 'TEAM';
  token_use: 'super_admin_access';
}

@Injectable()
export class SuperAdminJwtStrategy extends PassportStrategy(
  Strategy,
  'super-admin-jwt',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('SUPER_ADMIN_JWT_SECRET');
    if (!secret) {
      throw new Error(
        'SUPER_ADMIN_JWT_SECRET is not set in environment variables',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: SuperAdminJwtPayload) {
    if (payload.token_use !== 'super_admin_access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const admin = await this.prisma.superAdminUser.findUnique({
      where: { id: payload.sub },
    });

    if (!admin) {
      throw new UnauthorizedException('Super admin not found');
    }
    if (admin.status !== 'active') {
      throw new UnauthorizedException('Super admin account is not active');
    }
    if (admin.admin_type !== payload.super_admin_type) {
      throw new UnauthorizedException(
        'Super admin tier mismatch — please log in again',
      );
    }

    return {
      superAdminId: admin.id,
      email: admin.email,
      adminType: admin.admin_type,
    };
  }
}
