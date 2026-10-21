import { Slider } from 'radix-ui'
import { useId, useState } from 'react'
import { networks, type Category, type Network, type NftList } from '@/api/contracts'
import { categoriesByLabel, categoryLabels, networkLabels } from '@/lib/categories'
import { centsToDecimal, decimalToCents, formatRange, PRICE_MAX, PRICE_MIN } from '@/domain/price-range'
import { cn } from '@/lib/cn'
import type { CatalogSearch } from './search'

type FiltersPanelProps = {
  search: CatalogSearch
  facets: NftList['facets'] | undefined
  onChange: (patch: Partial<CatalogSearch>) => void
  className?: string
}

function countOf(facets: { value: string; count: number }[] | undefined, value: string) {
  return facets?.find((facet) => facet.value === value)?.count ?? 0
}

export function FiltersPanel({ search, facets, onChange, className }: FiltersPanelProps) {
  return (
    <div className={cn('flex flex-col gap-10 bg-surface-card p-5', className)}>
      <FilterGroup title="Coleções">
        {categoriesByLabel.map((category) => (
          <FilterOption
            key={category}
            label={categoryLabels[category]}
            count={countOf(facets?.categories, category)}
            checked={search.category?.includes(category) ?? false}
            onToggle={(checked) => onChange({ category: toggle(search.category, category, checked) })}
            emphasized
          />
        ))}
      </FilterGroup>
      <PriceFilter search={search} onApply={onChange} />
      <FilterGroup title="Rede">
        {networks.map((network) => (
          <FilterOption
            key={network}
            label={networkLabels[network]}
            count={countOf(facets?.chains, network)}
            checked={search.chain?.includes(network) ?? false}
            onToggle={(checked) => onChange({ chain: toggle(search.chain, network, checked) })}
          />
        ))}
      </FilterGroup>
    </div>
  )
}

function toggle<T extends Category | Network>(current: T[] | undefined, value: T, checked: boolean): T[] | undefined {
  const next = checked ? [...(current ?? []), value] : (current ?? []).filter((item) => item !== value)
  return next.length ? next : undefined
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-lg font-bold leading-4">
        {title}
      </h2>
      <div className="flex flex-col px-3">{children}</div>
    </div>
  )
}

type FilterOptionProps = {
  label: string
  count: number
  checked: boolean
  onToggle: (checked: boolean) => void
  emphasized?: boolean
}

function FilterOption({ label, count, checked, onToggle, emphasized }: FilterOptionProps) {
  const id = useId()
  return (
    <div className="relative">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onToggle(event.target.checked)}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className={cn(
          'flex cursor-pointer items-start justify-between text-[15px] leading-10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-text-accent',
          checked ? 'text-text-accent' : 'text-text-secondary hover:text-text-accent',
        )}
      >
        <span>{label}</span>
        <span className={cn('text-right', emphasized && 'font-bold')} aria-label={`${count} ${count === 1 ? 'item' : 'itens'}`}>
          ({count})
        </span>
      </label>
    </div>
  )
}

function PriceFilter({ search, onApply }: { search: CatalogSearch; onApply: (patch: Partial<CatalogSearch>) => void }) {
  const appliedMin = decimalToCents(search.minPrice, PRICE_MIN)
  const appliedMax = decimalToCents(search.maxPrice, PRICE_MAX)
  const [range, setRange] = useState<[number, number]>([appliedMin, appliedMax])

  const [synced, setSynced] = useState([appliedMin, appliedMax])
  if (synced[0] !== appliedMin || synced[1] !== appliedMax) {
    setSynced([appliedMin, appliedMax])
    setRange([appliedMin, appliedMax])
  }

  function apply() {
    const [min, max] = range
    onApply({
      minPrice: min === PRICE_MIN ? undefined : centsToDecimal(min),
      maxPrice: max === PRICE_MAX ? undefined : centsToDecimal(max),
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold leading-4">Faixa de preço</h2>
      <div className="flex flex-col gap-3 pl-3">
        <Slider.Root
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={1}
          minStepsBetweenThumbs={0}
          value={range}
          onValueChange={(value) => setRange([value[0], value[1]])}
          className="relative flex h-5 w-full touch-none select-none items-center"
        >
          <Slider.Track className="relative h-1 grow rounded-full bg-line-soft">
            <Slider.Range className="absolute h-full rounded-full bg-primary" />
          </Slider.Track>
          {['Preço mínimo', 'Preço máximo'].map((label) => (
            <Slider.Thumb
              key={label}
              aria-label={label}
              className="block size-[15px] rounded-full bg-primary shadow-[0_0_0_3px_var(--color-surface-card)]"
            />
          ))}
        </Slider.Root>
        <p className="text-[15px]" data-testid="price-range-label">
          Preço: {formatRange(range[0], range[1])}
        </p>
        <button
          type="button"
          onClick={apply}
          className="w-fit rounded-md bg-primary px-3 py-2 text-base font-bold leading-5 text-ink hover:bg-text-accent"
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}
