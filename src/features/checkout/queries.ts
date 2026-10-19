import { useQuery } from '@tanstack/react-query'
import { createQuote } from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'
import type { Network } from '@/api/contracts'
import { useOwner } from '@/features/auth/session'

// Cada busca cria uma cotação nova no servidor, então nada de refetch automático por foco ou reconexão:
// ela só é refeita quando o carrinho muda (invalidação) ou quando o usuário troca de rede.
export function useQuote(network: Network | null) {
  const owner = useOwner()
  return useQuery({
    queryKey: [...queryKeys.private(owner).quote, network],
    queryFn: () => createQuote(network as Network),
    enabled: network !== null,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
