import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class RequiresGr8Guard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.adminType !== 'GR8') {
      throw new ForbiddenException(
        'This action requires GR8 Superadmin access',
      );
    }

    return true;
  }
}
