import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useNftFeed } from './queries'
import { ProductGrid, ProductGridSkeleton } from './product-grid'
import { searchToParams, type CatalogSearch } from './search'

type MobileFeedProps = { search: CatalogSearch; onLoadMore: (page: number) => void }

// No celular a lista cresce em vez de paginar: perto do fim a próxima página carrega sozinha e o botão fica
// como alternativa (teclado, leitor de tela ou quando a rolagem automática não dispara).
export function MobileFeed({ search, onLoadMore }: MobileFeedProps) {
  const results = useNftFeed(searchToParams(search))
  const loaded = results.filter((result) => result.data).map((result) => result.data!)
  const last = loaded.at(-1)
  const loading = results.some((result) => result.isPending)
  const hasMore = Boolean(last && last.page < last.totalPages)
  const sentinel = useRef<HTMLDivElement>(null)
  const nextPage = (last?.page ?? 0) + 1

  useEffect(() => {
    const target = sentinel.current
    if (!target || !hasMore || loading) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadMore(nextPage)
    }, { rootMargin: '300px 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, loading, nextPage, onLoadMore])

  if (!last) return <ProductGridSkeleton />
  const items = loaded.flatMap((page) => page.items)

  return (
    <div className="flex flex-col items-center gap-4" data-testid="mobile-feed">
      <ProductGrid items={items} />
      <div ref={sentinel} aria-hidden="true" />
      {hasMore ? (
        <Button variant="outline" onClick={() => onLoadMore(nextPage)} disabled={loading} aria-busy={loading}>
          {loading ? 'Carregando…' : 'Carregar mais'}
        </Button>
      ) : (
        <p className="text-sm text-text-secondary" role="status">
          Você viu {last.total === 1 ? 'a única obra' : `todas as ${last.total} obras`}.
        </p>
      )}
    </div>
  )
}
