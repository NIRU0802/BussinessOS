import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { SyncEngineService } from './sync-engine.service';
import { PullChangesQueryDto } from './dto/pull-changes-query.dto';
import { PushQueuedOrdersDto } from './dto/push-queued-orders.dto';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

class ResolveConflictDto {
  @IsUUID()
  keepOrderId: string;

  @IsString()
  @IsNotEmpty()
  resolutionNote: string;
}

@Controller('sync')
export class SyncEngineController {
  constructor(private readonly syncEngineService: SyncEngineService) {}

  @Get('pull-changes')
  @RequirePermissions('orders.read')
  pullChanges(@Req() req, @Query() query: PullChangesQueryDto) {
    return this.syncEngineService.pullChangesSince(req.user, query);
  }

  @Post('push-queued-orders')
  @RequirePermissions('orders.create')
  pushQueuedOrders(@Req() req, @Body() dto: PushQueuedOrdersDto) {
    return this.syncEngineService.pushQueuedOrders(req.user, dto);
  }

  @Post('conflicts/:id/resolve')
  @RequirePermissions('orders.approve_void_refund')
  resolveConflict(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: ResolveConflictDto,
  ) {
    return this.syncEngineService.resolveConflict(
      req.user,
      id,
      dto.keepOrderId,
      dto.resolutionNote,
    );
  }
}
