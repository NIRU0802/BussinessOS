import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { Public } from '../../common/decorators/public.decorator';

import { QrSessionGuard } from '../tables/qr/qr-session.guard';
import { CurrentQrSession } from '../tables/qr/qr-session.decorator';
import type { QrSession } from '../tables/qr/qr-session.service';

import { CreateQrCustomerDto } from './dto/create-qr-customer.dto';
import { QrCreateOrderDto } from './dto/qr-order-item.dto';
import { QrOrderingService } from './qr-ordering.service';

@Controller('qr')
@Public()
@UseGuards(QrSessionGuard)
export class QrOrderingController {
  constructor(private readonly qrOrderingService: QrOrderingService) {}

  @Get('session')
  getSession(@CurrentQrSession() session: QrSession) {
    return {
      branchId: session.branchId,
      tableId: session.tableId,
      qrSessionId: session.qrSessionId,
      customerId: session.customerId,
    };
  }

  @Post('customer')
  registerCustomer(
    @CurrentQrSession() session: QrSession,
    @Body() dto: CreateQrCustomerDto,
  ) {
    return this.qrOrderingService.registerCustomer(session, dto);
  }

  @Get('menu')
  getMenu(@CurrentQrSession() session: QrSession) {
    return this.qrOrderingService.getMenu(session);
  }

  @Post('orders')
  placeOrder(
    @CurrentQrSession() session: QrSession,
    @Body() dto: QrCreateOrderDto,
  ) {
    return this.qrOrderingService.placeOrder(session, dto);
  }
}
