import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRES_WIDGET_KEY } from '../decorators/requires-widget.decorator';
import { WidgetsService } from '../widgets.service';

/**
 * Blocks a route if the requesting tenant does not have the widget declared
 * by @RequiresWidget(...) in an 'active' or 'trial' state.
 *
 * Assumes JwtAuthGuard has already run and populated req.user.tenantId.
 * Adjust the tenantId extraction below if your auth layer stores it
 * elsewhere (e.g. req.tenantId from TenantContextMiddleware).
 */
@Injectable()
export class WidgetGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly widgetsService: WidgetsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredWidgetKey = this.reflector.getAllAndOverride<
      string | undefined
    >(REQUIRES_WIDGET_KEY, [context.getHandler(), context.getClass()]);

    // No @RequiresWidget decorator present — nothing to guard.
    if (!requiredWidgetKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId: string | undefined =
      request.user?.tenantId ?? request.tenantId;

    if (!tenantId) {
      throw new ForbiddenException(
        'Tenant context missing — cannot verify widget access.',
      );
    }

    const isActive = await this.widgetsService.isWidgetActive(
      tenantId,
      requiredWidgetKey,
    );

    if (!isActive) {
      throw new ForbiddenException(
        `This feature requires the "${requiredWidgetKey}" widget to be active on your account.`,
      );
    }

    return true;
  }
}
