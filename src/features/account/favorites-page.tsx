import { useQueries } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getNft } from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'
import { NftCard } from '@/components/nft/nft-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useFavorites } from '@/features/favorites/queries'
import { AccountLayout } from './account-layout'

export function FavoritesPage() {
  return (
    <AccountLayout title="Lista de interesse">
      <FavoritesContent />
    </AccountLayout>
  )
}

function FavoritesContent() {
  const favorites = useFavorites()
  const ids = favorites.data?.nftIds ?? []
  const nfts = useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.nfts.detail(id),
      queryFn: ({ signal }: { signal: AbortSignal }) => getNft(id, { signal }),
    })),
  })

  if (favorites.isPending) return <Skeleton className="h-64 w-full" />
  if (favorites.error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3" data-testid="favorites-error">
        <p className="text-sm text-text-coral">Não foi possível carregar sua lista de interesse.</p>
        <Button variant="outline" onClick={() => void favorites.refetch()}>
          Tentar de novo
        </Button>
      </div>
    )
  }
  if (ids.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg bg-surface-card p-6" data-testid="favorites-empty">
        <p className="font-bold">Sua lista está vazia</p>
        <p className="text-sm text-text-secondary">Use o coração nos cards para guardar obras que você quer acompanhar.</p>
        <Button asChild>
          <Link to="/mercado">Explorar o mercado</Link>
        </Button>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-[34px] md:gap-y-12" data-testid="favorites-list">
      {nfts.map((query, index) => (
        <li key={ids[index]}>{query.data ? <NftCard nft={query.data} /> : <Skeleton className="aspect-square rounded-2xl md:rounded-[15px]" />}</li>
      ))}
    </ul>
  )
}
