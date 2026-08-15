import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { MergeTablesDto } from './dto/merge-tables.dto';
import { BranchIdQueryDto } from './dto/branch-id-query.dto';

// JwtAuthGuard and PermissionsGuard are global via APP_GUARD — not
// re-declared here, consistent with the rest of the codebase.

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @RequirePermissions('tables.read')
  list(@Query() query: BranchIdQueryDto) {
    return this.tablesService.listForBranch(query.branchId);
  }

  @Post()
  @RequirePermissions('tables.write')
  create(@Query() query: BranchIdQueryDto, @Body() dto: CreateTableDto) {
    return this.tablesService.create(query.branchId, dto);
  }

  @Get(':id')
  @RequirePermissions('tables.read')
  findOne(@Param('id') id: string) {
    return this.tablesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('tables.write')
  update(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.tablesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('tables.write')
  remove(@Param('id') id: string) {
    return this.tablesService.softDelete(id);
  }

  @Get(':id/qr')
  @RequirePermissions('tables.manage')
  getQrToken(@Param('id') id: string) {
    return this.tablesService.getCurrentQrToken(id);
  }

  @Post(':id/qr/rotate')
  @RequirePermissions('tables.manage')
  rotateQrToken(@Param('id') id: string) {
    return this.tablesService.rotateQrToken(id);
  }

  @Post('merge')
  @RequirePermissions('tables.manage')
  merge(@Query() query: BranchIdQueryDto, @Body() dto: MergeTablesDto) {
    return this.tablesService.mergeTables(query.branchId, dto);
  }

  @Post(':id/split')
  @RequirePermissions('tables.manage')
  split(@Param('id') id: string) {
    return this.tablesService.splitTable(id);
  }

  @Get(':id/dining-sessions')
  @RequirePermissions('tables.read')
  diningSessions(@Param('id') id: string) {
    return this.tablesService.listDiningSessions(id);
  }
}
