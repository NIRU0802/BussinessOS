import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context/tenant-context.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import {
  CUSTOMER_EVENTS,
  CustomerCreatedEvent,
  CustomerUpdatedEvent,
} from './events/customer.events';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateCustomerDto) {
    const tenantId = this.tenantContext.getTenantId();

    const customer = await this.prisma.forCurrentTenant((tx) =>
      tx.customer.create({
        data: {
          tenantId,
          name: dto.name,
          phone: dto.phone,
          email: dto.email,
          dob: dto.dob ? new Date(dto.dob) : undefined,
          notes: dto.notes,
          preferences: (dto.preferences ?? {}) as Prisma.InputJsonValue,
        },
      }),
    );

    this.eventEmitter.emit(CUSTOMER_EVENTS.CREATED, {
      tenantId,
      customerId: customer.id,
    } satisfies CustomerCreatedEvent);

    return customer;
  }

  async findAll(query: QueryCustomersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    return this.prisma.forCurrentTenant(async (tx) => {
      const where: Prisma.CustomerWhereInput = query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {};

      const [items, total] = await Promise.all([
        tx.customer.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        tx.customer.count({ where }),
      ]);

      return {
        items,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.forCurrentTenant((tx) =>
      tx.customer.findUnique({
        where: { id },
        include: { addresses: true },
      }),
    );

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    const tenantId = this.tenantContext.getTenantId();

    const customer = await this.prisma.forCurrentTenant((tx) =>
      tx.customer.update({
        where: { id },
        data: {
          name: dto.name,
          phone: dto.phone,
          email: dto.email,
          dob: dto.dob ? new Date(dto.dob) : undefined,
          notes: dto.notes,
          preferences: dto.preferences
            ? (dto.preferences as Prisma.InputJsonValue)
            : undefined,
        },
      }),
    );

    this.eventEmitter.emit(CUSTOMER_EVENTS.UPDATED, {
      tenantId,
      customerId: customer.id,
    } satisfies CustomerUpdatedEvent);

    return customer;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.forCurrentTenant((tx) =>
      tx.customer.delete({ where: { id } }),
    );
  }

  async addAddress(customerId: string, dto: CreateCustomerAddressDto) {
    await this.findOne(customerId);
    const tenantId = this.tenantContext.getTenantId();

    return this.prisma.forCurrentTenant(async (tx) => {
      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.create({
        data: {
          tenantId,
          customerId,
          label: dto.label ?? 'Home',
          line1: dto.line1,
          line2: dto.line2,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country ?? 'IN',
          latitude: dto.latitude,
          longitude: dto.longitude,
          isDefault: dto.isDefault ?? false,
        },
      });
    });
  }

  async removeAddress(customerId: string, addressId: string) {
    await this.findOne(customerId);

    return this.prisma.forCurrentTenant(async (tx) => {
      const address = await tx.customerAddress.findFirst({
        where: { id: addressId, customerId },
      });

      if (!address) {
        throw new NotFoundException(
          `Address ${addressId} not found for customer ${customerId}`,
        );
      }

      return tx.customerAddress.delete({ where: { id: addressId } });
    });
  }

  /**
   * Finds an existing customer by phone, or creates one, for the current
   * tenant. Used by Orders module (via event) to link walk-in / QR orders
   * to a customer record without Orders directly touching this repository.
   */
  async findOrCreateByPhone(phone: string, name?: string) {
    return this.prisma.forCurrentTenant(async (tx) => {
      const existing = await tx.customer.findFirst({ where: { phone } });
      if (existing) return existing;

      if (!name) {
        throw new BadRequestException(
          'name is required to create a new customer record',
        );
      }

      const tenantId = this.tenantContext.getTenantId();
      return tx.customer.create({
        data: { tenantId, name, phone },
      });
    });
  }
}
