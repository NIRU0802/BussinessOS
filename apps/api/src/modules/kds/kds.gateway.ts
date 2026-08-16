import { Logger, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { KitchenTicketResponseDto } from './dto/kitchen-ticket-response.dto';

/**
 * KDS gateway reuses the tenant_id:branch_id room pattern established in
 * Phase 4's order gateway. JwtAuthGuard is global via APP_GUARD, so it is not
 * re-declared here.
 */
@WebSocketGateway({
  namespace: '/kds',
  cors: { origin: true, credentials: true },
})
export class KdsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(KdsGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket): void {
    const { tenantId, branchIds, isAllBranches } =
      this.extractJwtPayload(client);

    if (!tenantId) {
      client.disconnect(true);
      return;
    }

    if (isAllBranches) {
      client.join(`${tenantId}:all-branches`);
    }

    for (const branchId of branchIds ?? []) {
      client.join(this.roomName(tenantId, branchId));
    }

    this.logger.log(
      `KDS client connected: tenant=${tenantId} branches=${branchIds?.join(',')}`,
    );
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`KDS client disconnected: ${client.id}`);
  }

  private roomName(tenantId: string, branchId: string): string {
    return `${tenantId}:${branchId}`;
  }

  private extractJwtPayload(client: Socket): {
    tenantId?: string;
    branchIds?: string[];
    isAllBranches?: boolean;
  } {
    // The global JwtAuthGuard does not apply to gateway handshakes automatically;
    // the auth payload is expected to already be attached by a Socket.IO
    // middleware configured in Phase 4 (consistent with the existing order gateway).
    const user = (client.handshake as any)?.user;
    return {
      tenantId: user?.tenantId,
      branchIds: user?.branchIds,
      isAllBranches: user?.isAllBranches,
    };
  }

  emitTicketCreated(
    tenantId: string,
    branchId: string,
    ticket: KitchenTicketResponseDto,
  ): void {
    this.emitToBranch(tenantId, branchId, 'ticket.created', ticket);
  }

  emitTicketStatusChanged(
    tenantId: string,
    branchId: string,
    ticket: KitchenTicketResponseDto,
  ): void {
    this.emitToBranch(tenantId, branchId, 'ticket.status_changed', ticket);
  }

  private emitToBranch(
    tenantId: string,
    branchId: string,
    event: string,
    payload: unknown,
  ): void {
    this.server.to(this.roomName(tenantId, branchId)).emit(event, payload);
    this.server.to(`${tenantId}:all-branches`).emit(event, payload);
  }
}
