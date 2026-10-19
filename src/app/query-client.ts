import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/domain/errors'

// Política de cache: dados do catálogo ficam frescos por 30 s; eventos do socket e mutations invalidam antes disso.
// Retry: só em falha de rede ou 5xx e no máximo 2 vezes. Erros 4xx são respostas definitivas da API.
// Mutations nunca repetem sozinhas: reenvio de pedido é decisão explícita, protegida pela chave de idempotência.
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => failureCount < 2 && !(isApiError(error) && error.status < 500),
      },
      mutations: { retry: false },
    },
  })
}
