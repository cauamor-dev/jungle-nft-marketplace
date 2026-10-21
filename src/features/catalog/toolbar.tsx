import { Link } from '@tanstack/react-router'
import { Select } from 'radix-ui'
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
    <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-8">
      <nav aria-label="Listagem" className="-my-3 flex gap-4 overflow-x-auto py-3 scrollbar-none md:my-0 md:shrink-0 md:gap-5 md:py-0">
        {tabs.map((tab) => {
          const active = search.listing === tab.listing
          return (
            <Link
              key={tab.label}
              to={to}
              search={{ ...search, listing: tab.listing, page: undefined }}
              resetScroll={false}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'relative -my-3 whitespace-nowrap pb-4 pt-3 text-sm leading-4 md:my-0 md:pb-1 md:pt-0 md:text-[15px] md:font-medium',
                active ? 'font-bold text-text-accent' : 'text-foreground hover:text-text-accent',
              )}
            >
              {tab.label}
              {active && <span aria-hidden="true" className="absolute inset-x-0 bottom-3 h-0.5 animate-tab-in rounded-full bg-primary md:bottom-0" />}
            </Link>
          )
        })}
      </nav>
      <SortSelect id="sort" value={search.sort} onSort={onSort} className="hidden md:flex" />
    </div>
  )
}

// No desktop fica na barra do catálogo; no mobile, no topo do painel de filtros.
type SortSelectProps = { id: string; value: Sort | undefined; onSort: (sort: Sort) => void; className?: string; triggerClassName?: string }

export function SortSelect({ id, value, onSort, className, triggerClassName }: SortSelectProps) {
  return (
    <div className={cn('items-center gap-1 text-[15px]', className)}>
      <label htmlFor={id} className="whitespace-nowrap">
        Ordenar por:
      </label>
      <Select.Root value={value ?? 'recent'} onValueChange={(next) => onSort(next as Sort)}>
        <Select.Trigger
          id={id}
          className={cn(
            'group flex min-h-9 items-center justify-between gap-2 whitespace-nowrap rounded-md px-2 text-[15px] text-foreground transition-colors hover:bg-primary/10 data-[state=open]:bg-primary/10',
            triggerClassName,
          )}
        >
          <Select.Value />
          <Select.Icon asChild>
            <img src={chevron} alt="" className="w-3 transition-transform group-data-[state=open]:rotate-180" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            align="end"
            sideOffset={6}
            className="z-[60] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line-soft bg-surface-card/95 p-1 shadow-2xl backdrop-blur-md"
          >
            <Select.Viewport>
              {sortOptions.map((option) => (
                <Select.Item
                  key={option}
                  value={option}
                  className="flex cursor-pointer select-none items-center justify-between gap-4 rounded-md px-3 py-2 text-sm text-foreground outline-none data-[highlighted]:bg-primary/15 data-[state=checked]:text-text-accent"
                >
                  <Select.ItemText>{sortLabels[option]}</Select.ItemText>
                  <Select.ItemIndicator aria-hidden="true">✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  )
}
