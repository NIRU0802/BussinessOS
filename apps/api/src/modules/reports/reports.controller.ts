import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ReportsService } from './reports.service';
import { SalesSummaryQueryDto } from './dto/sales-summary-query.dto';
import { BestSellersQueryDto } from './dto/best-sellers-query.dto';
import { BranchRollupQueryDto } from './dto/branch-rollup-query.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-summary')
  @RequirePermissions('reports.read')
  getSalesSummary(@Query() query: SalesSummaryQueryDto) {
    return this.reportsService.getSalesSummary(query);
  }

  @Get('best-sellers')
  @RequirePermissions('reports.read')
  getBestSellers(@Query() query: BestSellersQueryDto) {
    return this.reportsService.getBestSellers(query);
  }

  @Get('branch-rollup')
  @RequirePermissions('reports.read_all_branches')
  getBranchRollup(@Query() query: BranchRollupQueryDto) {
    return this.reportsService.getBranchRollup(query);
  }
}
