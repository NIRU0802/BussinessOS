export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  roleId: string;
  roleName: string;
  /** Empty array + isAllBranches = true means "all active branches for this tenant" */
  branchIds: string[];
  isAllBranches: boolean;
  permissions: string[];
}
