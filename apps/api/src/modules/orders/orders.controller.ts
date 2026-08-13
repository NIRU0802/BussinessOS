import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddOrderItemsDto } from './dto/add-order-items.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { VoidRefundRequestDto } from './dto/void-refund-request.dto';
import { ApproveVoidRefundDto } from './dto/approve-void-refund.dto';
import { SplitBillDto } from './dto/split-bill.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';

// JwtAuthGuard and PermissionsGuard are both already global via APP_GUARD
// in app.module.ts — do not re-declare either here. @RequirePermissions
// supplies the metadata the global PermissionsGuard checks.

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @RequirePermissions('orders.create')
  create(@Req() req, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user, dto);
  }

  @Get()
  @RequirePermissions('orders.read')
  list(@Req() req, @Query() query: ListOrdersQueryDto) {
    return this.ordersService.listOrders(req.user, query);
  }

  @Get(':id')
  @RequirePermissions('orders.read')
  getOne(@Req() req, @Param('id') id: string) {
    return this.ordersService.getOrderById(req.user, id);
  }

  @Patch(':id/status')
  @RequirePermissions('orders.update')
  updateStatus(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(req.user, id, dto);
  }

  @Post(':id/items')
  @RequirePermissions('orders.update')
  addItems(@Req() req, @Param('id') id: string, @Body() dto: AddOrderItemsDto) {
    return this.ordersService.addItems(req.user, id, dto);
  }

  @Post(':id/void-refund-requests')
  @RequirePermissions('orders.request_void_refund')
  requestVoidRefund(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: VoidRefundRequestDto,
  ) {
    return this.ordersService.requestVoidRefund(req.user, id, dto);
  }

  @Patch(':id/void-refund-requests/:requestId/approve')
  @RequirePermissions('orders.approve_void_refund')
  approveVoidRefund(
    @Req() req,
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @Body() dto: ApproveVoidRefundDto,
  ) {
    return this.ordersService.approveVoidRefund(req.user, id, requestId, dto);
  }

  @Post(':id/split-bill')
  @RequirePermissions('orders.update')
  splitBill(@Req() req, @Param('id') id: string, @Body() dto: SplitBillDto) {
    return this.ordersService.splitBill(req.user, id, dto);
  }
}
