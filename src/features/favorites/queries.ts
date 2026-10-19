import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addFavorite, getFavorites, removeFavorite } from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'
import { useOwner, useSession } from '@/features/auth/session'

export function useFavorites() {
  const owner = useOwner()
  const { data: session } = useSession()
  return useQuery({
    queryKey: queryKeys.private(owner).favorites,
    queryFn: ({ signal }) => getFavorites({ signal }),
    enabled: Boolean(session),
  })
}

// Atualiza a lista na hora e desfaz se a API recusar.
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const owner = useOwner()
  const key = queryKeys.private(owner).favorites
  return useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean }) =>
      favorite ? addFavorite(nftId) : removeFavorite(nftId),
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<{ nftIds: string[] }>(key)
      const current = previous?.nftIds ?? []
      const nftIds = favorite ? [...new Set([...current, nftId])] : current.filter((id) => id !== nftId)
      queryClient.setQueryData(key, { nftIds })
      return { previous }
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
  })
}
