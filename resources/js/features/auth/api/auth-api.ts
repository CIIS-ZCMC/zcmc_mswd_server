import { apiClient } from "@/lib/api-client"
import type { AuthUser, LoginPayload } from "../types/auth.types"

interface UserEnvelope {
  data: AuthUser
}

/**
 * POST /login — authenticates via session cookie.
 */
export async function login(payload: LoginPayload): Promise<AuthUser> {
  const res = await apiClient.post<UserEnvelope>("/login", payload)
  return res.data
}

/**
 * GET /me — returns user + roles + permissions for the current authenticated session.
 */
export async function getMe(): Promise<AuthUser> {
  const res = await apiClient.get<UserEnvelope>("/me")
  return res.data
}

/**
 * POST /logout — logs out session cookie server-side.
 */
export async function logout(): Promise<void> {
  await apiClient.post<void>("/logout")
}

/**
 * Mirrors `UserResource`. Note there is no `name` — the display field is
 * `employee_name`, and reading `name` yields `undefined` for every row.
 */
export interface SystemUser {
  id: number
  employee_name: string | null
  employee_number?: number | null
  email?: string | null
  role?: string | null
  is_active?: boolean
}

/**
 * GET /users — staff for the caretaker assignment pickers. Paginated by
 * `ListQuery`, so the rows are under `data`.
 *
 * Deliberately does not catch: the endpoint is gated on `users.view`, which
 * Case Manager and Processor do not hold. Swallowing that 403 made an
 * authorization failure indistinguishable from "no staff exist" — an empty
 * picker with nothing to explain it. Let the error reach the query so the
 * caller can say which it is.
 */
export async function getUsers(): Promise<SystemUser[]> {
  const res = await apiClient.get<{ data: SystemUser[] }>("/users", {
    params: { per_page: 100 },
  })

  return res.data ?? []
}

/** The label to show for a staff row; never blank, never invented. */
export function userDisplayName(user: SystemUser): string {
  return user.employee_name?.trim() || `User #${user.id}`
}
