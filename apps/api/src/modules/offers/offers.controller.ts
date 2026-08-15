import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { OffersService, renderTemplate } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('offers')
export class OffersController {
  constructor(
    private readonly offersService: OffersService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @RequirePermissions('offers:create')
  create(@Body() dto: CreateOfferDto) {
    return this.offersService.create(dto);
  }

  @Get()
  @RequirePermissions('offers:read')
  findAll() {
    return this.offersService.findAll();
  }

  @Get(':id')
  @RequirePermissions('offers:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.offersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('offers:update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOfferDto) {
    return this.offersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('offers:delete')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.offersService.remove(id);
  }

  /**
   * Manually fires a MANUAL-trigger offer (or force-fires any offer) right
   * now: resolves its segment, dedupes, emits dispatch-ready events so
   * managers get notified with prepared WhatsApp links.
   */
  @Post(':id/trigger')
  @RequirePermissions('offers:update')
  trigger(@Param('id', ParseUUIDPipe) id: string) {
    return this.offersService.triggerNow(id);
  }

  /**
   * Returns the pre-filled wa.me link for a specific (offer, customer)
   * pair — same "prepare, never auto-send" pattern as birthdays.
   */
  @Get(':id/customers/:customerId/whatsapp-link')
  @RequirePermissions('offers:read')
  async getWhatsappLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    const [offer, customer] = await Promise.all([
      this.offersService.findOne(id),
      this.prisma.forCurrentTenant((tx) =>
        tx.customer.findUniqueOrThrow({ where: { id: customerId } }),
      ),
    ]);

    const message = renderTemplate(offer.messageTemplate, {
      customerName: customer.name,
      offerTitle: offer.title,
    });

    const digitsOnly = customer.phone.replace(/[^\d]/g, '');
    const whatsappDeepLink = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;

    await this.prisma.forCurrentTenant((tx) =>
      tx.offerDispatch.updateMany({
        where: { offerId: id, customerId, preparedAt: null },
        data: { preparedAt: new Date() },
      }),
    );

    return { offerId: id, customerId, message, whatsappDeepLink };
  }
}
