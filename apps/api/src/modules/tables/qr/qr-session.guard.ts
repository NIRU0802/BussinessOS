import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { QrSessionService } from './qr-session.service';
import { TenantContextService } from '../../../common/tenant-context/tenant-context.service';

/**
 * Guards customer-facing QR ordering routes. Verifies the signed table
 * token from the `x-qr-token` header, resolves it to a trustworthy
 * {tenantId, branchId, tableId}, attaches it to the request as
 * `req.qrSession`, and populates TenantContextService so downstream
 * services (EffectiveMenuService, PrismaService.forTenant, AuditLogService)
 * work exactly as they do for staff requests — with zero Phase 5 changes.
 *
 * Apply alongside @Public() on the controller/route, since the global
 * JwtAuthGuard expects a staff Bearer token which anonymous QR customers
 * will never have.
 */
@Injectable()
export class QrSessionGuard implements CanActivate {
  constructor(
    private readonly qrSessionService: QrSessionService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req.headers['x-qr-token'];

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Missing QR session token.');
    }

    const session = await this.qrSessionService.verifyAndResolve(token);

    req.qrSession = session;

    // Synthetic, non-persisted identity for the AsyncLocalStorage context.
    // permissions is intentionally empty — QR services never rely on
    // permission checks, only on the guard having run at all.
    this.tenantContext.enterWith({
      tenantId: session.tenantId,
      userId: 'qr-guest',
      branchIds: [session.branchId],
      isAllBranches: false,
      roles: ['CUSTOMER'],
      permissions: [],
    });

    return true;
  }
}
