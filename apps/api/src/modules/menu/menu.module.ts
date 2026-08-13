import { Module } from '@nestjs/common';
import { CategoryService } from './categories/category.service';
import { CategoryController } from './categories/category.controller';
import { MenuItemService } from './items/menu-item.service';
import { MenuItemController } from './items/menu-item.controller';
import { ModifierService } from './modifiers/modifier.service';
import { ModifierController } from './modifiers/modifier.controller';
import { BranchOverrideService } from './overrides/branch-override.service';
import { BranchOverrideController } from './overrides/branch-override.controller';
import { EffectiveMenuService } from './effective-menu.service';
import { EffectiveMenuController } from './effective-menu.controller';
import { ComboService } from './combos/combo.service';
import { ComboController } from './combos/combo.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  providers: [
    CategoryService,
    MenuItemService,
    ModifierService,
    BranchOverrideService,
    EffectiveMenuService,
    ComboService,
  ],
  controllers: [
    CategoryController,
    MenuItemController,
    ModifierController,
    BranchOverrideController,
    EffectiveMenuController,
    ComboController,
  ],
  exports: [MenuItemService, EffectiveMenuService, ComboService],
})
export class MenuModule {}
