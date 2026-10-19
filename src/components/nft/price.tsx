import { displayEth } from '@/domain/money'
import { cn } from '@/lib/cn'

type PriceProps = { valueEth: string; compareEth?: string | null; className?: string }

export function Price({ valueEth, compareEth, className }: PriceProps) {
  return (
    <p className={cn('flex items-center gap-3 text-base font-bold leading-4 text-text-accent md:text-lg', className)}>
      <span>{displayEth(valueEth)} ETH</span>
      {compareEth && (
        <span className="font-normal text-secondary">{displayEth(compareEth)} ETH</span>
      )}
    </p>
  )
}
