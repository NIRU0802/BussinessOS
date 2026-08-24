import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentSuperAdminPayload {
  superAdminId: string;
  email: string;
  adminType: 'GR8' | 'TEAM';
}

export const CurrentSuperAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentSuperAdminPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
