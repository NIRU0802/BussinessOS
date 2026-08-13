import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { TenantRequestContext } from '../../common/tenant-context/tenant-context.service';
import { NotificationService } from './notification.service';
import { SendNotificationDto } from './dto/send-notification.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  @RequirePermissions('NOTIFICATIONS_SEND')
  send(
    @CurrentUser() user: TenantRequestContext,
    @Body() dto: SendNotificationDto,
  ) {
    return this.notificationService.send(user.tenantId, dto);
  }
}
