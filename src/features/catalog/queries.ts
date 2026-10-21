import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import { listNfts } from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'
import type { NftListParams } from '@/api/contracts'

export function useNftList(params: NftListParams) {
  return useQuery({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => listNfts(params, { signal }),
    placeholderData: keepPreviousData,
  })
}

// Feed do celular: as páginas 1..N ficam em cache separadas e são exibidas em sequência
export function useNftFeed(params: NftListParams) {
  const pages = Array.from({ length: params.page ?? 1 }, (_, index) => ({ ...params, page: index + 1 }))
  return useQueries({
    queries: pages.map((pageParams) => ({
      queryKey: queryKeys.nfts.list(pageParams),
      queryFn: ({ signal }: { signal: AbortSignal }) => listNfts(pageParams, { signal }),
    })),
  })
}
