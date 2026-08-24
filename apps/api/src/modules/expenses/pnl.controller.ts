import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RequiresWidget } from '../widgets/decorators/requires-widget.decorator';
import { TenantContextService } from '../../common/tenant-context/tenant-context.service';
import { PnlService } from './pnl.service';
import { PnlQueryDto } from './dto/pnl-query.dto';

@UseGuards(AuthGuard('jwt'))
@RequiresWidget('expenses')
@Controller('reports/profit-and-loss')
export class PnlController {
  constructor(
    private readonly pnlService: PnlService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get()
  @RequirePermissions('reports.read')
  getPnl(@Query() query: PnlQueryDto) {
    return this.pnlService.getProfitAndLoss(
      this.tenantContext.getContext(),
      query,
    );
  }
}
