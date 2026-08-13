import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { WidgetsService } from './widgets.service';
import { PresetsService } from './presets/presets.service';
import { EnableWidgetDto } from './dto/enable-widget.dto';
import { ApplyPresetDto } from './dto/apply-preset.dto';

@Controller('widgets')
export class WidgetsController {
  constructor(
    private readonly widgetsService: WidgetsService,
    private readonly presetsService: PresetsService,
  ) {}

  @Get()
  async listWidgets(@Req() req: any) {
    const tenantId: string = req.user.tenantId;
    return this.widgetsService.listWidgetsForTenant(tenantId);
  }

  @Post(':widgetKey/enable')
  async enableWidget(
    @Req() req: any,
    @Param('widgetKey') widgetKey: string,
    @Body() dto: EnableWidgetDto,
  ) {
    const tenantId: string = req.user.tenantId;
    return this.widgetsService.enableWidget(
      tenantId,
      widgetKey,
      dto.billingCycle,
    );
  }

  @Post(':widgetKey/disable')
  async disableWidget(@Req() req: any, @Param('widgetKey') widgetKey: string) {
    const tenantId: string = req.user.tenantId;
    return this.widgetsService.disableWidget(tenantId, widgetKey);
  }

  @Post('presets/apply')
  async applyPreset(@Req() req: any, @Body() dto: ApplyPresetDto) {
    const tenantId: string = req.user.tenantId;
    return this.presetsService.applyPreset(tenantId, dto.presetKey);
  }
}
