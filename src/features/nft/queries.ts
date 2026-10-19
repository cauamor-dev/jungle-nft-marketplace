import { useQuery } from '@tanstack/react-query'
import { getNft } from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'

export function useNftDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.nfts.detail(id),
    queryFn: ({ signal }) => getNft(id, { signal }),
  })
}
