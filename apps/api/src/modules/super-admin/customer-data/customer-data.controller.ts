import { Controller, Get, Query, Ip, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CustomerDataService } from './customer-data.service';
import { CustomerListQueryDto } from './dto/customer-list-query.dto';
import { RequiresGR8 } from '../auth/decorators/requires-gr8.decorator';
import { CurrentSuperAdmin } from '../auth/decorators/current-super-admin.decorator';
import type { CurrentSuperAdminPayload } from '../auth/decorators/current-super-admin.decorator';
import { Public } from '../../../common/decorators/public.decorator';

@Public()
@Controller('super-admin/customers')
export class CustomerDataController {
  constructor(private readonly customerDataService: CustomerDataService) {}

  @Get()
  @RequiresGR8()
  async list(
    @Query() query: CustomerListQueryDto,
    @CurrentSuperAdmin() admin: CurrentSuperAdminPayload,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.customerDataService.listCustomers(query, {
      superAdminId: admin.superAdminId,
      adminType: admin.adminType,
      ipAddress: ip,
      userAgent: (req.headers['user-agent'] as string) ?? 'unknown',
    });
  }
}
