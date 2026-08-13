import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { TenantRequestContext } from '../../common/tenant-context/tenant-context.service';
import { PaymentService } from './payment.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @RequirePermissions('PAYMENT_RECORD')
  record(
    @CurrentUser() user: TenantRequestContext,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.paymentService.recordPayment(user.tenantId, user.userId, dto);
  }

  @Get('order/:orderId')
  @RequirePermissions('PAYMENT_VIEW')
  getForOrder(
    @CurrentUser() user: TenantRequestContext,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentService.getOrderPayments(user.tenantId, orderId);
  }

  @Post('refund')
  @RequirePermissions('PAYMENT_REFUND_APPROVE')
  refund(
    @CurrentUser() user: TenantRequestContext,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentService.refundPayment(user.tenantId, user.userId, dto);
  }
}
