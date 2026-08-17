import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

// ADJUST: 'billing.plans.manage' is a placeholder permission key —
// confirm it exists in prisma/seed/seed.ts, or swap for a real one.
// Since Owner is granted ['*'], Owner will always pass this check
// regardless of the exact key chosen.
@Controller('admin/billing/plans')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  @RequirePermissions('billing.plans.manage')
  create(@Body() dto: CreatePlanDto) {
    return this.planService.create(dto);
  }

  @Get()
  @RequirePermissions('billing.plans.manage')
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.planService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @RequirePermissions('billing.plans.manage')
  findOne(@Param('id') id: string) {
    return this.planService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('billing.plans.manage')
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.planService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('billing.plans.manage')
  deactivate(@Param('id') id: string) {
    return this.planService.deactivate(id);
  }
}
