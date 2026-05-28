import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMe, login, logout } from '@/lib/api'
import type { LoginBody } from '@zf45/shared-types'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => getMe(),
    retry: false,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LoginBody) => login(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      qc.clear()
    },
  })
}
