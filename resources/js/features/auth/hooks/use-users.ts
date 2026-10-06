import { useQuery } from "@tanstack/react-query"
import { getUsers, type SystemUser } from "../api/auth-api"

export function useUsers() {
  return useQuery<SystemUser[]>({
    queryKey: ["users"],
    queryFn: getUsers,
    staleTime: 5 * 60 * 1000,
  })
}
