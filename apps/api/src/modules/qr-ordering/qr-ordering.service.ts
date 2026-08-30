import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { OrderChannel } from '@prisma/client';

import { CustomersService } from '../customers/customers.service';
import { EffectiveMenuService } from '../menu/effective-menu.service';
import { OrdersService } from '../orders/orders.service';
import {
  CreateOrderDto,
  CreateOrderItemDto,
} from '../orders/dto/create-order.dto';
import { QrSession, QrSessionService } from '../tables/qr/qr-session.service';

import { CreateQrCustomerDto } from './dto/create-qr-customer.dto';
import { QrCreateOrderDto } from './dto/qr-order-item.dto';

@Injectable()
export class QrOrderingService {
  constructor(
    private readonly effectiveMenuService: EffectiveMenuService,
    private readonly ordersService: OrdersService,
    private readonly customersService: CustomersService,
    private readonly qrSessionService: QrSessionService,
  ) {}

  async getMenu(session: QrSession) {
    return this.effectiveMenuService.getForBranch(session.branchId);
  }

  async registerCustomer(session: QrSession, dto: CreateQrCustomerDto) {
    if (session.customerId) {
      const customer = await this.customersService.findOne(session.customerId);

      return {
        customer,
        alreadyRegistered: true,
      };
    }

    const customer = await this.customersService.findOrCreateByPhone(
      dto.phone,
      dto.name,
    );

    const updateData: {
      name?: string;
      phone?: string;
      dob?: string;
    } = {};

    if (customer.name !== dto.name) {
      updateData.name = dto.name;
    }

    if (dto.dob) {
      const existingDob = customer.dob
        ? customer.dob.toISOString().slice(0, 10)
        : null;

      if (existingDob !== dto.dob) {
        updateData.dob = dto.dob;
      }
    }

    let finalCustomer = customer;

    if (Object.keys(updateData).length > 0) {
      finalCustomer = await this.customersService.update(
        customer.id,
        updateData,
      );
    }

    await this.qrSessionService.attachCustomer(session, finalCustomer.id);

    return {
      customer: finalCustomer,
      alreadyRegistered: false,
    };
  }

  async placeOrder(session: QrSession, dto: QrCreateOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Order must contain at least one item.');
    }

    if (!session.customerId) {
      throw new BadRequestException(
        'Customer information is required before placing an order.',
      );
    }

    const menu = await this.effectiveMenuService.getForBranch(session.branchId);

    const menuById = new Map(menu.map((item) => [item.id, item]));

    let subtotal = 0;

    const orderItems: CreateOrderItemDto[] = dto.items.map((requested) => {
      const menuItem = menuById.get(requested.productId);

      if (!menuItem) {
        throw new NotFoundException(
          `Menu item ${requested.productId} is not available at this branch.`,
        );
      }

      if (!menuItem.isAvailable) {
        throw new BadRequestException(
          `"${menuItem.name}" is currently unavailable.`,
        );
      }

      let unitPrice = menuItem.effectivePrice;

      let variantId: string | null = null;

      if (requested.variantId) {
        const variant = menuItem.variants.find(
          (v) => v.id === requested.variantId,
        );

        if (!variant) {
          throw new BadRequestException(
            `Invalid variant selected for "${menuItem.name}".`,
          );
        }

        unitPrice += variant.priceDelta;
        variantId = variant.id;
      }

      const selectedModifiers: {
        id: string;
        name: string;
        priceDelta: number;
      }[] = [];

      if (requested.modifierOptionIds?.length) {
        const allOptions = menuItem.modifierGroups.flatMap(
          (group) => group.options,
        );

        for (const optionId of requested.modifierOptionIds) {
          const option = allOptions.find((item) => item.id === optionId);

          if (!option) {
            throw new BadRequestException(
              `Invalid modifier selected for "${menuItem.name}".`,
            );
          }

          unitPrice += option.priceDelta;
          selectedModifiers.push(option);
        }
      }

      subtotal += unitPrice * requested.quantity;

      return {
        productId: requested.productId,
        quantity: requested.quantity,
        unitPrice: unitPrice.toFixed(2),
        modifiers: {
          variantId,
          selectedOptions: selectedModifiers.map((option) => ({
            id: option.id,
            name: option.name,
          })),
        },
      };
    });

    const subtotalStr = subtotal.toFixed(2);

    const createOrderDto: CreateOrderDto = {
      branchId: session.branchId,
      tableId: session.tableId,
      deviceId: 'qr-web',
      clientGeneratedId: dto.clientGeneratedId ?? crypto.randomUUID(),
      channel: OrderChannel.qr,
      items: orderItems,
      subtotal: subtotalStr,
      taxAmount: '0.00',
      total: subtotalStr,
    };

    return this.ordersService.createOrder(
      {
        id: 'qr-guest',
        tenantId: session.tenantId,
        permissions: [],
      },
      createOrderDto,
    );
  }
}
