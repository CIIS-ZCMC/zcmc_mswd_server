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

/** True if the user holds a role with this system code (e.g. "case_manager"). */
export function useHasRole(code: string): boolean {
  const { roleCodes, user } = useAuth()
  const c = roleCodes ?? user?.roleCodes ?? []
  return Array.isArray(c) ? c.includes(code) : false
}
