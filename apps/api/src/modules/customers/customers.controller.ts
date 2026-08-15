import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer360Service } from './customer-360.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { PrepareBirthdayMessageDto } from './dto/prepare-birthday-message.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly customer360Service: Customer360Service,
  ) {}

  @Post()
  @RequirePermissions('customers:create')
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get()
  @RequirePermissions('customers:read')
  findAll(@Query() query: QueryCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('customers:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Get(':id/360')
  @RequirePermissions('customers:read')
  getCustomer360(@Param('id', ParseUUIDPipe) id: string) {
    return this.customer360Service.getCustomer360(id);
  }

  @Patch(':id')
  @RequirePermissions('customers:update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('customers:delete')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.remove(id);
  }

  @Post(':id/addresses')
  @RequirePermissions('customers:update')
  addAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    return this.customersService.addAddress(id, dto);
  }

  @Delete(':id/addresses/:addressId')
  @RequirePermissions('customers:update')
  removeAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    return this.customersService.removeAddress(id, addressId);
  }

  /**
   * Returns a pre-filled wa.me deep link (customer phone + pre-written
   * birthday message) for a manager to review and send manually with one
   * tap. Never sends anything server-side — this is a link generator only.
   */
  @Post(':id/prepare-birthday-message')
  @RequirePermissions('customers:update')
  async prepareBirthdayMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PrepareBirthdayMessageDto,
  ) {
    const customer = await this.customersService.findOne(id);

    const defaultMessage = `Happy Birthday, ${customer.name}! 🎉 Wishing you a wonderful day from all of us. As a small token, enjoy a special treat on your next visit!`;

    const message = dto.customMessage ?? defaultMessage;

    // wa.me requires digits only, no leading '+'
    const digitsOnly = customer.phone.replace(/[^\d]/g, '');

    const waLink = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;

    return {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      message,
      whatsappDeepLink: waLink,
    };
  }
}
