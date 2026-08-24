import { useAuth } from "@/lib/auth-context";

export function usePermissions() {
  const { hasPermission, session } = useAuth();

  return {
    hasPermission,
    hasAnyPermission: (perms: string[]) => perms.some((p) => hasPermission(p)),
    hasAllPermissions: (perms: string[]) => perms.every((p) => hasPermission(p)),
    isOwner: session?.roles.includes("OWNER") ?? false,
    roles: session?.roles ?? [],
  };
}
