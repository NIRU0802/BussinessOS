import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionService } from './subscription.service';
import { AssignPlanDto } from './dto/assign-plan.dto';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';

@Controller('billing/subscription')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @RequirePermissions('billing.subscription.read')
  getCurrent(@CurrentUser() user: { tenantId: string }) {
    return this.subscriptionService.getCurrentSubscription(user.tenantId);
  }

  @Get('invoices')
  @RequirePermissions('billing.subscription.read')
  getInvoices(@CurrentUser() user: { tenantId: string }) {
    return this.subscriptionService.getInvoices(user.tenantId);
  }

  @Get('payment-method')
  @RequirePermissions('billing.subscription.read')
  getPaymentMethod(@CurrentUser() user: { tenantId: string }) {
    return this.subscriptionService.getDefaultPaymentMethod(user.tenantId);
  }

  @Post('activate')
  @RequirePermissions('billing.subscription.manage')
  activate(
    @CurrentUser() user: { tenantId: string },
    @Body() dto: ActivateSubscriptionDto,
  ) {
    return this.subscriptionService.activateSubscription(user.tenantId, dto);
  }

  @Post('change-plan')
  @RequirePermissions('billing.subscription.manage')
  changePlan(
    @CurrentUser() user: { tenantId: string },
    @Body() dto: AssignPlanDto,
  ) {
    return this.subscriptionService.changePlan(user.tenantId, dto);
  }

  @Post('cancel')
  @RequirePermissions('billing.subscription.manage')
  cancel(@CurrentUser() user: { tenantId: string }) {
    return this.subscriptionService.cancelSubscription(user.tenantId);
  }
}
