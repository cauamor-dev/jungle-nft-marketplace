import { Link } from '@tanstack/react-router'
import type { Nft } from '@/api/contracts'
import { NftCard } from '@/components/nft/nft-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isApiError } from '@/domain/errors'

export function ProductGridSkeleton() {
  return (
    <div role="status" aria-label="Carregando NFTs" className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-[34px] md:gap-y-[72px]" data-testid="grid-skeleton">
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="aspect-[175/200] rounded-[20px] md:aspect-[258/300] md:rounded-none" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  )
}

export function ProductGrid({ items }: { items: Nft[] }) {
  return (
    <>
      <ul className="hidden grid-cols-3 gap-x-[34px] gap-y-[72px] md:grid">
        {items.map((nft, index) => (
          <li key={nft.id}>
            <NftCard nft={nft} imageEager={index < 3} />
          </li>
        ))}
      </ul>
      <MobileColumns items={items} />
    </>
  )
}

// No mobile as colunas são independentes e a da direita começa mais abaixo, como no design.
function MobileColumns({ items }: { items: Nft[] }) {
  const left = items.filter((_, index) => index % 2 === 0)
  const right = items.filter((_, index) => index % 2 === 1)
  return (
    <div className="grid grid-cols-2 gap-x-4 md:hidden">
      <ul className="flex flex-col gap-6">
        {left.map((nft) => (
          <li key={nft.id}>
            <NftCard nft={nft} />
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-6 pt-8">
        {right.map((nft) => (
          <li key={nft.id}>
            <NftCard nft={nft} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function EmptyResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg bg-surface-card px-6 py-16 text-center" data-testid="empty-results">
      <h2 className="text-lg font-bold">Nenhum NFT encontrado</h2>
      <p className="max-w-sm text-sm text-text-secondary">Ajuste a busca ou remova alguns filtros para ver mais obras.</p>
      <Button onClick={onClear}>Limpar filtros</Button>
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = isApiError(error) ? error.message : 'Não foi possível carregar os NFTs agora.'
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-lg border border-text-coral px-6 py-16 text-center" data-testid="catalog-error">
      <h2 className="text-lg font-bold">Algo deu errado</h2>
      <p className="max-w-sm text-sm text-text-secondary">{message}</p>
      <div className="flex gap-3">
        <Button onClick={onRetry}>Tentar de novo</Button>
        <Button variant="outline" asChild>
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  )
}
