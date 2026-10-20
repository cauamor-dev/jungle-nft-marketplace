import { Link } from '@tanstack/react-router'
import { sortOptions, type Listing, type Sort } from '@/api/contracts'
import chevron from '@/assets/icons/chevron-down-sm.svg'
import { cn } from '@/lib/cn'
import type { CatalogSearch } from './search'

const tabs: { label: string; listing: Listing | undefined }[] = [
  { label: 'Todos os NFTs', listing: undefined },
  { label: 'Novos lançamentos', listing: 'new' },
  { label: 'Em alta', listing: 'trending' },
]

const sortLabels: Record<Sort, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Preço: menor para maior',
  'price-desc': 'Preço: maior para menor',
  name: 'Nome (A–Z)',
}

type ToolbarProps = {
  search: CatalogSearch
  to: '/' | '/mercado'
  onSort: (sort: Sort) => void
}

export function Toolbar({ search, to, onSort }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <nav aria-label="Listagem" className="-my-3 flex gap-4 overflow-x-auto py-3 scrollbar-none md:my-0 md:gap-5 md:py-0">
        {tabs.map((tab) => {
          const active = search.listing === tab.listing
          return (
            <Link
              key={tab.label}
              to={to}
              search={{ ...search, listing: tab.listing, page: undefined }}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'relative -my-3 whitespace-nowrap pb-4 pt-3 text-sm leading-4 md:my-0 md:pb-1 md:pt-0 md:text-[15px] md:font-medium',
                active ? 'font-bold text-text-accent' : 'text-foreground hover:text-text-accent',
              )}
            >
              {tab.label}
              {active && <span aria-hidden="true" className="absolute inset-x-0 bottom-3 h-0.5 rounded-full bg-primary md:bottom-0" />}
            </Link>
          )
        })}
      </nav>
      <SortSelect id="sort" value={search.sort} onSort={onSort} className="hidden md:flex" />
    </div>
  )
}

// No desktop fica na barra do catálogo; no mobile, no topo do painel de filtros.
export function SortSelect({ id, value, onSort, className }: { id: string; value: Sort | undefined; onSort: (sort: Sort) => void; className?: string }) {
  return (
    <div className={cn('items-center gap-1 text-[15px]', className)}>
      <label htmlFor={id} className="whitespace-nowrap">
        Ordenar por:
      </label>
      <div className="relative">
        <select
          id={id}
          value={value ?? 'recent'}
          onChange={(event) => onSort(event.target.value as Sort)}
          className="cursor-pointer appearance-none bg-transparent py-1 pl-1 pr-5 text-[15px] text-foreground"
        >
          {sortOptions.map((option) => (
            <option key={option} value={option} className="bg-surface-card">
              {sortLabels[option]}
            </option>
          ))}
        </select>
        <img src={chevron} alt="" className="pointer-events-none absolute right-0 top-1/2 w-3 -translate-y-1/2" />
      </div>
    </div>
  )
}
