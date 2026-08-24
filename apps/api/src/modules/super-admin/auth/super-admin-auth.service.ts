import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { SuperAdminAuditService } from '../common/super-admin-audit.service';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 7;

@Injectable()
export class SuperAdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: SuperAdminAuditService,
  ) {}

  async login(dto: SuperAdminLoginDto, ipAddress: string, userAgent: string) {
    const admin = await this.prisma.superAdminUser.findUnique({
      where: { email: dto.email },
    });

    const dummyHash =
      '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RJHOTB0TQ0mvzr8dR5trPQ';

    if (!admin) {
      await argon2.verify(dummyHash, dto.password).catch(() => false);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (admin.status !== 'active') {
      throw new ForbiddenException('This account is not active');
    }

    if (admin.locked_until && admin.locked_until > new Date()) {
      const minutesLeft = Math.ceil(
        (admin.locked_until.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Account locked. Try again in ${minutesLeft} minute(s).`,
      );
    }

    const passwordValid = await argon2.verify(
      admin.password_hash,
      dto.password,
    );

    if (!passwordValid) {
      await this.handleFailedLogin(admin.id, admin.failed_login_count);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.superAdminUser.update({
      where: { id: admin.id },
      data: {
        failed_login_count: 0,
        locked_until: null,
        last_login_at: new Date(),
        last_login_ip: ipAddress,
      },
    });

    const tokens = await this.issueTokens(
      admin.id,
      admin.email,
      admin.admin_type,
      ipAddress,
      userAgent,
    );

    await this.auditService.record({
      superAdminId: admin.id,
      adminTypeAtTime: admin.admin_type,
      action: 'super_admin.login',
      resourceType: 'super_admin_session',
      ipAddress,
      userAgent,
    });

    return {
      ...tokens,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.full_name,
        adminType: admin.admin_type,
      },
    };
  }

  private async handleFailedLogin(adminId: string, currentCount: number) {
    const newCount = currentCount + 1;
    const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;

    await this.prisma.superAdminUser.update({
      where: { id: adminId },
      data: {
        failed_login_count: shouldLock ? 0 : newCount,
        locked_until: shouldLock
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : undefined,
      },
    });
  }

  async refresh(refreshToken: string, ipAddress: string, userAgent: string) {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.superAdminRefreshToken.findUnique({
      where: { token_hash: tokenHash },
      include: { superAdmin: true },
    });

    if (!stored || stored.revoked_at || stored.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (stored.superAdmin.status !== 'active') {
      throw new ForbiddenException('This account is not active');
    }

    await this.prisma.superAdminRefreshToken.update({
      where: { id: stored.id },
      data: { revoked_at: new Date() },
    });

    const tokens = await this.issueTokens(
      stored.superAdmin.id,
      stored.superAdmin.email,
      stored.superAdmin.admin_type,
      ipAddress,
      userAgent,
    );

    await this.auditService.record({
      superAdminId: stored.superAdmin.id,
      adminTypeAtTime: stored.superAdmin.admin_type,
      action: 'super_admin.refresh_token',
      resourceType: 'super_admin_session',
      ipAddress,
      userAgent,
    });

    return tokens;
  }

  async logout(superAdminId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.superAdminRefreshToken.updateMany({
      where: { super_admin_id: superAdminId, token_hash: tokenHash },
      data: { revoked_at: new Date() },
    });
  }

  private async issueTokens(
    superAdminId: string,
    email: string,
    adminType: 'GR8' | 'TEAM',
    ipAddress: string,
    userAgent: string,
  ) {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: superAdminId,
        email,
        super_admin_type: adminType,
        token_use: 'super_admin_access',
      },
      {
        secret: this.configService.get<string>('SUPER_ADMIN_JWT_SECRET'),
        expiresIn: ACCESS_TOKEN_TTL,
      },
    );

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    await this.prisma.superAdminRefreshToken.create({
      data: {
        super_admin_id: superAdminId,
        token_hash: tokenHash,
        expires_at: new Date(
          Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
        ),
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: ACCESS_TOKEN_TTL,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
