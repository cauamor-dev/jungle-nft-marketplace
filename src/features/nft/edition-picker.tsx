import type { Edition } from '@/api/contracts'
import { editionPriceEth } from '@/domain/editions'
import { displayEth, type DecimalString } from '@/domain/money'
import { cn } from '@/lib/cn'

type EditionPickerProps = {
  editions: Edition[]
  basePriceEth: DecimalString
  selectedId: string | null
  onSelect: (edition: Edition) => void
}

export function EditionPicker({ editions, basePriceEth, selectedId, onSelect }: EditionPickerProps) {
  return (
    <div role="radiogroup" aria-label="Edição" aria-describedby="edition-info" className="flex flex-wrap gap-1.5">
      {editions.map((edition) => {
        const soldOut = edition.stock === 0
        const selected = edition.id === selectedId
        return (
          <button
            key={edition.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={soldOut || undefined}
            onClick={() => !soldOut && onSelect(edition)}
            title={soldOut ? 'Edição esgotada' : `${displayEth(editionPriceEth(basePriceEth, edition))} ETH · ${edition.stock} disponíveis`}
            className={cn(
              'relative h-7 rounded-full border px-2 text-sm leading-4 touch-target md:px-[7px]',
              selected ? 'border-primary font-medium text-text-accent' : 'border-line-soft text-text-secondary hover:border-primary',
              soldOut && 'cursor-not-allowed line-through opacity-50 hover:border-line-soft',
              edition.label === 'ABERTA' && 'px-3',
            )}
          >
            {edition.label}
          </button>
        )
      })}
    </div>
  )
}
