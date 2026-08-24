import apiClient from "../api-client";

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface AuditLogQueryParams {
  entityType?: string;
  entityId?: string;
  userId?: string;
  take?: number;
  skip?: number;
}

// NOTE: exact return shape (bare array vs. { data, total }) wasn't
// confirmed from audit-log.service.ts — assuming a bare array consistent
// with how most list() methods in this codebase that don't paginate via
// an explicit DTO tend to behave. Verify if this screen renders wrong.
export async function listAuditLogs(params: AuditLogQueryParams): Promise<AuditLogEntry[]> {
  const res = await apiClient.get<AuditLogEntry[]>("/audit-logs", { params });
  return res.data;
}
