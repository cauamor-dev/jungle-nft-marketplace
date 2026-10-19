import { useQuery } from '@tanstack/react-query'
import * as api from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'
import { useOwner, useSession } from '@/features/auth/session'

// O socket atualiza o pedido em tempo real; o polling cobre o caso de a conexão estar caída.
export function useOrder(id: string) {
  const owner = useOwner()
  const { data: session } = useSession()
  return useQuery({
    queryKey: queryKeys.private(owner).order(id),
    queryFn: ({ signal }) => api.getOrder(id, { signal }),
    enabled: Boolean(session),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 4000 : false),
  })
}

export function useOrders() {
  const owner = useOwner()
  const { data: session } = useSession()
  return useQuery({
    queryKey: queryKeys.private(owner).orders,
    queryFn: ({ signal }) => api.listOrders({ signal }),
    enabled: Boolean(session),
  })
}
