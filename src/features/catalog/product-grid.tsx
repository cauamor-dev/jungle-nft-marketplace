import { Link } from '@tanstack/react-router'
import type { Nft } from '@/api/contracts'
import { NftCard } from '@/components/nft/nft-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorActions } from '@/components/ui/error-actions'
import { isApiError, isUnknownOutcome } from '@/domain/errors'
import { useIsDesktop } from '@/lib/use-media-query'

export function ProductGridSkeleton() {
  return (
    <div role="status" aria-label="Carregando NFTs" className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-[34px] md:gap-y-[72px]" data-testid="grid-skeleton">
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="aspect-square rounded-2xl md:rounded-[15px]" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  )
}

// Monta só a variante da largura atual, para não duplicar os cards no DOM.
export function ProductGrid({ items }: { items: Nft[] }) {
  const desktop = useIsDesktop()
  if (!desktop) return <MobileColumns items={items} />
  return (
    <ul className="grid grid-cols-3 gap-x-[34px] gap-y-[72px]">
      {items.map((nft, index) => (
        <li key={nft.id} className="animate-card-in" style={{ animationDelay: `${index * 40}ms` }}>
          <NftCard nft={nft} imageEager={index < 3} />
        </li>
      ))}
    </ul>
  )
}

// No mobile a coluna da direita começa mais abaixo, como no design. O deslocamento é só visual (transform),
// então a ordem do DOM continua a da listagem para leitor de tela, teclado e ordenação.
function MobileColumns({ items }: { items: Nft[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 pb-8">
      {items.map((nft, index) => (
        <li key={nft.id} className="animate-card-in even:translate-y-8" style={{ animationDelay: `${index * 40}ms` }}>
          <NftCard nft={nft} imageEager={index < 2} />
        </li>
      ))}
    </ul>
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
  const message = isApiError(error)
    ? error.message
    : isUnknownOutcome(error) && error.timedOut
      ? 'O servidor demorou demais para responder. Tente de novo em instantes.'
      : 'Sem conexão com o servidor. Confira sua internet e tente de novo.'
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-lg border border-text-coral px-4 py-16 text-center sm:px-6" data-testid="catalog-error">
      <h2 className="text-lg font-bold">Algo deu errado</h2>
      <p className="max-w-sm text-sm text-text-secondary">{message}</p>
      <ErrorActions>
        <Button onClick={onRetry}>Tentar de novo</Button>
        <Button variant="outline" asChild>
          <Link to="/">Voltar ao início</Link>
        </Button>
      </ErrorActions>
    </div>
  )
}
