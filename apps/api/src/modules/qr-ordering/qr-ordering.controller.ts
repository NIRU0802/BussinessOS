import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { QrOrderingService } from './qr-ordering.service';
import { QrSessionGuard } from '../tables/qr/qr-session.guard';
import { CurrentQrSession } from '../tables/qr/qr-session.decorator';
import type { QrSession } from '../tables/qr/qr-session.service';
import { QrCreateOrderDto } from './dto/qr-order-item.dto';

/**
 * Anonymous customer-facing QR ordering endpoints. Every route here is
 * @Public() (bypasses the global staff JwtAuthGuard) and protected instead
 * by QrSessionGuard, which independently verifies the signed table token
 * and populates tenant context.
 */
@Controller('qr')
@Public()
@UseGuards(QrSessionGuard)
export class QrOrderingController {
  constructor(private readonly qrOrderingService: QrOrderingService) {}

  // Scan landing: confirms the QR is valid and tells the client which
  // table it resolved to, without exposing internal ids beyond what's
  // needed to render a "Table 4" style confirmation.
  @Get('session')
  getSession(@CurrentQrSession() session: QrSession) {
    return { branchId: session.branchId, tableId: session.tableId };
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
