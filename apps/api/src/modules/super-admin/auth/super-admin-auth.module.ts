import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdminAuthController } from './super-admin-auth.controller';
import { SuperAdminJwtStrategy } from './strategies/super-admin-jwt.strategy';
import { SuperAdminAuditModule } from '../common/super-admin-audit.module';

@Module({
  imports: [
    PrismaModule,
    SuperAdminAuditModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('SUPER_ADMIN_JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [SuperAdminAuthController],
  providers: [SuperAdminAuthService, SuperAdminJwtStrategy],
  exports: [SuperAdminAuthService],
})
export class SuperAdminAuthModule {}
