import { keepPreviousData, useQuery } from '@tanstack/react-query'
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
