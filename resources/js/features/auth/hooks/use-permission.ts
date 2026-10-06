import { useAuth } from "./use-auth"

/**
 * Gate UI on a single backend permission string (e.g. "patients.update"),
 * matching the `permission:` middleware names in routes/api.php exactly.
 */
export function usePermission(permission: string): boolean {
  const { permissions, user } = useAuth()
  const perms = permissions ?? user?.permissions ?? []
  return Array.isArray(perms) ? perms.includes(permission) : false
}

/** True if the user holds any of the given permissions. */
export function useAnyPermission(targetPermissions: string[]): boolean {
  const { permissions, user } = useAuth()
  const perms = permissions ?? user?.permissions ?? []
  return Array.isArray(perms) ? targetPermissions.some((permission) => perms.includes(permission)) : false
}

export function useHasRole(role: string): boolean {
  const { roles, user } = useAuth()
  const r = roles ?? user?.roles ?? []
  return Array.isArray(r) ? r.includes(role) : false
}
