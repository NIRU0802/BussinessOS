import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Marks a route as requiring one or more permission keys, e.g.
 * @RequirePermissions('orders.void', 'orders.write')
 * Guard requires the user to have ALL listed permissions (AND semantics).
 * Use multiple decorators or an explicit "any of" helper if OR semantics
 * are needed for a specific route.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
