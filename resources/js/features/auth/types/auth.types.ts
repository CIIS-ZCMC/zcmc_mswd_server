/**
 * Shape of the `UserResource` returned by /api/login and /api/me.
 * `roles`/`permissions` are only present when the backend eager-loads them
 * (both endpoints do), so they're typed as always-present here.
 */
export interface AuthUser {
  id: number
  employee_id: string | null
  employee_number: number | null
  employee_name: string | null
  email: string
  role: string | null
  roles: string[]
  permissions: string[]
  is_active: boolean
  synced_at: string | null
  created_at: string
  updated_at: string
}

export interface LoginPayload {
  employee_number: number
  password: string
  device_name?: string
}
