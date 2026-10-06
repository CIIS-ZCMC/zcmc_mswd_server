import { useAuth } from "./use-auth"

/**
 * Gate UI on a single backend permission string (e.g. "patients.update"),
 * matching the `permission:` middleware names in routes/api.php exactly.
 */
export function usePermission(permission: string): boolean {
  const { user } = useAuth()
  return user?.permissions.includes(permission) ?? false
}

/** True if the user holds any of the given permissions. */
export function useAnyPermission(permissions: string[]): boolean {
  const { user } = useAuth()
  if (!user) return false
  return permissions.some((permission) => user.permissions.includes(permission))
}

export function useHasRole(role: string): boolean {
  const { user } = useAuth()
  return user?.roles.includes(role) ?? false
}
