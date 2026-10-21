import { displayEth } from '@/domain/money'
import { cn } from '@/lib/cn'

type PriceProps = { valueEth: string; compareEth?: string | null; className?: string }

export function Price({ valueEth, compareEth, className }: PriceProps) {
  return (
    <p className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-base font-bold leading-4 text-text-accent md:text-lg', className)}>
      <span data-testid="price" className="whitespace-nowrap">{displayEth(valueEth)} ETH</span>
      {compareEth && (
        <span className="whitespace-nowrap font-normal text-secondary line-through decoration-1">
          <span className="sr-only">Preço anterior: </span>
          {displayEth(compareEth)} ETH
        </span>
      )}
    </p>
  )
}
