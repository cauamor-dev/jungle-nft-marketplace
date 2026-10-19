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
      <nav aria-label="Listagem" className="flex gap-4 overflow-x-auto scrollbar-none md:gap-5">
        {tabs.map((tab) => {
          const active = search.listing === tab.listing
          return (
            <Link
              key={tab.label}
              to={to}
              search={{ ...search, listing: tab.listing, page: undefined }}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'relative whitespace-nowrap pb-1 text-sm leading-4 md:text-[15px] md:font-medium',
                active ? 'font-bold text-text-accent' : 'text-foreground hover:text-text-accent',
              )}
            >
              {tab.label}
              {active && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />}
            </Link>
          )
        })}
      </nav>
      <div className="hidden items-center gap-1 text-[15px] md:flex">
        <label htmlFor="sort" className="whitespace-nowrap">
          Ordenar por:
        </label>
        <div className="relative">
          <select
            id="sort"
            value={search.sort ?? 'recent'}
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
    </div>
  )
}
