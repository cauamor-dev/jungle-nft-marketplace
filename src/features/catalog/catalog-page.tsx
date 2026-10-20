import { useState, type FormEvent } from 'react'
import filterIcon from '@/assets/icons/filter.svg'
import searchIcon from '@/assets/icons/search-mobile.svg'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { FeaturedBanner } from './featured-banner'
import { FiltersPanel } from './filters-panel'
import { Hero } from './hero'
import { Pagination } from './pagination'
import { EmptyResults, ErrorState, ProductGrid, ProductGridSkeleton } from './product-grid'
import { Blog, Promos } from './promos'
import { useNftList } from './queries'
import { searchToParams, type CatalogSearch } from './search'
import { SortSelect, Toolbar } from './toolbar'

type CatalogPageProps = {
  variant: 'home' | 'market'
  search: CatalogSearch
  onSearchChange: (next: CatalogSearch) => void
}

export function CatalogPage({ variant, search, onSearchChange }: CatalogPageProps) {
  const list = useNftList(searchToParams(search))
  const [filtersOpen, setFiltersOpen] = useState(false)
  const to = variant === 'home' ? '/' : '/mercado'

  const update = (patch: Partial<CatalogSearch>) => onSearchChange({ ...search, ...patch, page: undefined })
  const clearFilters = () => onSearchChange({})

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 pt-10 md:gap-8 md:pt-8 xl:px-0 lg:gap-24">
      <MobileSearch value={search.q ?? ''} onSubmit={(q) => update({ q: q || undefined })} onOpenFilters={() => setFiltersOpen(true)} />

      {variant === 'home' ? <Hero /> : <h1 className="sr-only">Mercado de NFTs</h1>}

      <div id="mercado" className="flex scroll-mt-6 gap-12">
        <aside aria-label="Filtros" className="hidden w-[310px] shrink-0 flex-col gap-6 lg:flex">
          <FiltersPanel search={search} facets={list.data?.facets} onChange={update} />
          {variant === 'home' && <FeaturedBanner />}
        </aside>

        <section aria-label="Catálogo de NFTs" className="flex min-w-0 flex-1 flex-col gap-8 lg:gap-[88px]">
          <div className="flex flex-col gap-6 md:gap-8">
            <div className="flex items-center justify-between gap-4 lg:block">
              <div className="min-w-0 flex-1">
                <Toolbar search={search} to={to} onSort={(sort) => update({ sort: sort === 'recent' ? undefined : sort })} />
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="hidden h-9 shrink-0 items-center gap-2 rounded-md border border-primary px-3 text-sm text-text-accent md:flex lg:hidden"
              >
                Filtros
              </button>
            </div>

            <Results list={list} onClear={clearFilters} />
          </div>
          {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} search={search} to={to} />}
        </section>
      </div>

      {variant === 'home' && (
        <>
          <Promos />
          <Blog />
        </>
      )}

      <FilterSheet open={filtersOpen} onOpenChange={setFiltersOpen} search={search} facets={list.data?.facets} onChange={update} />
    </div>
  )
}

function Results({ list, onClear }: { list: ReturnType<typeof useNftList>; onClear: () => void }) {
  if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  if (!list.data) return <ProductGridSkeleton />
  if (list.data.items.length === 0) return <EmptyResults onClear={onClear} />
  return (
    <div aria-busy={list.isFetching} className={list.isFetching ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
      <h2 className="sr-only">Resultados</h2>
      <p className="sr-only" role="status">
        {list.data.total} {list.data.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}
      </p>
      <ProductGrid items={list.data.items} />
    </div>
  )
}

function MobileSearch({ value, onSubmit, onOpenFilters }: { value: string; onSubmit: (q: string) => void; onOpenFilters: () => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(String(new FormData(event.currentTarget).get('q') ?? '').trim())
  }

  return (
    <form role="search" onSubmit={submit} className="flex h-[45px] gap-2 md:hidden">
      <label className="flex flex-1 items-center gap-2 rounded-[10px] bg-surface-card px-3">
        <img src={searchIcon} alt="" className="size-[22px]" />
        <span className="sr-only">Buscar coleções e NFTs</span>
        <input
          key={value}
          name="q"
          type="search"
          defaultValue={value}
          placeholder="Explorar coleções"
          className="min-w-0 flex-1 self-stretch bg-transparent text-sm font-bold text-secondary placeholder:text-secondary focus:text-foreground"
        />
      </label>
      <button
        type="button"
        onClick={onOpenFilters}
        aria-label="Abrir filtros"
        className="grid size-[45px] shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-primary/45 from-25% to-primary"
      >
        <img src={filterIcon} alt="" className="size-[22px]" />
      </button>
    </form>
  )
}

type FilterSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  search: CatalogSearch
  facets: React.ComponentProps<typeof FiltersPanel>['facets']
  onChange: (patch: Partial<CatalogSearch>) => void
}

function FilterSheet({ open, onOpenChange, search, facets, onChange }: FilterSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel="Fechar filtros"
        className="max-md:sheet-panel top-auto bottom-0 left-0 max-h-[88dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-2xl border-b-0 md:left-1/2 md:top-1/2 md:bottom-auto md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-none lg:hidden"
        aria-describedby="filters-description"
      >
        <DialogTitle className="px-5 pt-5 text-lg font-bold">Filtros</DialogTitle>
        <DialogDescription id="filters-description" className="sr-only">
          Ordene e filtre os NFTs por coleção, faixa de preço e rede.
        </DialogDescription>
        <SortSelect
          id="sort-mobile"
          value={search.sort}
          onSort={(sort) => onChange({ sort: sort === 'recent' ? undefined : sort })}
          className="flex px-5 pt-4 md:hidden"
        />
        <FiltersPanel search={search} facets={facets} onChange={onChange} />
      </DialogContent>
    </Dialog>
  )
}
