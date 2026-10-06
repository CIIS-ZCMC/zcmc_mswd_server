import { router, usePage } from "@inertiajs/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ApiError } from "@/lib/api-client"
import { login, logout } from "../api/auth-api"
import type { AuthUser, LoginPayload } from "../types/auth.types"

interface SharedProps {
  auth?: {
    user: AuthUser | null
    roles: string[]
    permissions: string[]
  }
}

export const AUTH_QUERY_KEY = ["auth", "me"] as const

/**
 * Single source of truth for "who is logged in". Reads directly from
 * Inertia's shared page props populated by HandleInertiaRequests middleware.
 */
export function useAuth() {
  const queryClient = useQueryClient()
  const page = usePage<SharedProps>()
  const user = page.props?.auth?.user ?? null

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: (newUser: AuthUser) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, newUser)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null)
      queryClient.clear()
      router.visit("/login")
    },
  })

  const roles = page.props?.auth?.roles ?? user?.roles ?? []
  const permissions = page.props?.auth?.permissions ?? user?.permissions ?? []

  return {
    user,
    roles,
    permissions,
    isLoading: false,
    isAuthenticated: Boolean(user),
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: (loginMutation.error as ApiError | null) ?? null,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  }
}
