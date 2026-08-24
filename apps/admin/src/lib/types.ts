// Types mirroring apps/api DTOs and JWT payload. Keep in sync with backend
// when auth/RBAC/branch shapes change.

export interface JwtPayload {
  sub: string;
  tenantId: string;
  branchIds: string[];
  isAllBranches: boolean;
  roles: string[];
  permissions: string[];
  exp: number;
  iat: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  tenantSlug: string;
  email: string;
  password: string;
}

export interface LoginResponse extends TokenPair {
  user: AuthUser;
  tenant: AuthTenant;
}

export interface RefreshResponse extends TokenPair {}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  timezone: string;
  currencyCode: string;
  isActive: boolean;
}

// Derived, decoded session state kept in the auth context.
export interface SessionState {
  userId: string;
  tenantId: string;
  branchIds: string[];
  isAllBranches: boolean;
  roles: string[];
  permissions: string[];
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
