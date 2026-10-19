import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import * as api from '@/api/endpoints'
import { getGuestId, clearSessionToken, getSessionToken, setSessionToken } from '@/api/session-storage'
import { guestOwner, queryKeys, userOwner } from '@/api/query-keys'
import type { LoginInput, Session } from '@/api/contracts'
import { isApiError } from '@/domain/errors'
import { clearAttempt } from '@/features/checkout/checkout-attempt'
import { clearDrafts } from '@/features/checkout/checkout-draft'

export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: async ({ signal }): Promise<Session | null> => {
      if (!getSessionToken()) return null
      try {
        return await api.fetchSession({ signal })
      } catch (error) {
        if (isApiError(error) && error.status === 401) {
          clearSessionToken()
          return null
        }
        throw error
      }
    },
    retry: false,
    staleTime: 60_000,
  })
}

export function useOwner() {
  const { data } = useSession()
  return data ? userOwner(data.user.id) : guestOwner(getGuestId())
}

// Remove tudo o que é privado: cache, requests em andamento e a tentativa de checkout salva.
export async function resetPrivateState(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: queryKeys.privateRoot })
  queryClient.removeQueries({ queryKey: queryKeys.privateRoot })
  clearAttempt()
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => api.login(input),
    onSuccess: async (data) => {
      setSessionToken(data.token)
      await resetPrivateState(queryClient)
      queryClient.setQueryData(queryKeys.session, data.session)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.logout().catch(() => undefined),
    onSettled: async () => {
      clearSessionToken()
      clearDrafts()
      await resetPrivateState(queryClient)
      queryClient.setQueryData(queryKeys.session, null)
    },
  })
}

// Sessão rejeitada pela API (expirada ou inválida): mesma limpeza do logout, sem chamar o servidor.
export async function dropInvalidSession(queryClient: QueryClient) {
  clearSessionToken()
  await resetPrivateState(queryClient)
  queryClient.setQueryData(queryKeys.session, null)
}
