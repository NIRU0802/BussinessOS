/**
 * Menu & Catalog Engine — event definitions
 * Emitted via EventEmitter2 for downstream modules (KDS, Reports, Delivery
 * Aggregator adapters in Phase 12, etc.) to subscribe to via @OnEvent.
 * Menu module never calls another module's service/repository directly.
 */

export const MENU_EVENTS = {
  ITEM_UPDATED: 'menu.item_updated',
  PRODUCT_CREATED: 'menu.product_created',
  PRODUCT_UPDATED: 'menu.product_updated',
  PRODUCT_DELETED: 'menu.product_deleted',
  CATEGORY_CREATED: 'menu.category_created',
  CATEGORY_UPDATED: 'menu.category_updated',
  COMBO_CREATED: 'menu.combo_created',
  COMBO_UPDATED: 'menu.combo_updated',
} as const;

/**
 * Fired whenever a branch-level availability/visibility/price-override
 * field changes on a BranchProduct row. Does NOT cascade or auto-sync
 * to other branches or channels — consumers (e.g. Phase 12 Delivery
 * Aggregator adapters) decide what to do with it (typically: notify the
 * manager, never auto-sync), per the platform's manual-control philosophy.
 */
export class MenuItemUpdatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly productId: string,
    public readonly isAvailable: boolean,
    public readonly hidden: boolean,
    public readonly priceOverride: string | null,
  ) {}
}

export class ProductCreatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly productId: string,
    public readonly categoryId: string | null,
    public readonly name: string,
  ) {}
}

export class ProductUpdatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly productId: string,
    public readonly changedFields: string[],
  ) {}
}

export class ProductDeletedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly productId: string,
  ) {}
}

export class CategoryCreatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly categoryId: string,
    public readonly name: string,
  ) {}
}

export class CategoryUpdatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly categoryId: string,
    public readonly changedFields: string[],
  ) {}
}

export class ComboCreatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly comboId: string,
    public readonly name: string,
  ) {}
}

export class ComboUpdatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly comboId: string,
    public readonly changedFields: string[],
  ) {}
}
