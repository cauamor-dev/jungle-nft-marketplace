import type { ReactNode } from 'react'
import { displayDiscount, displayEth } from '@/domain/money'
import { cn } from '@/lib/cn'

type Totals = { subtotalEth: string; discountEth: string; networkFeeEth: string; totalEth: string }

// Subtotal, desconto, taxa e total. Usado no carrinho (valores do carrinho) e no pagamento (valores da cotação).
export function OrderTotals({ totals, className, children }: { totals: Totals; className?: string; children?: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-3 text-[15px]', className)} data-testid="order-totals">
      <Row label="Subtotal" value={`${displayEth(totals.subtotalEth)} ETH`} testId="subtotal" />
      <Row label="Desconto do lançamento" value={displayDiscount(totals.discountEth)} testId="discount" small />
      <div className="flex flex-col items-end gap-3">
        <Row label="Taxa de rede" value={`${displayEth(totals.networkFeeEth)} ETH`} testId="network-fee" className="w-full" />
        <p className="text-xs text-text-accent">Taxa estimada</p>
      </div>
      <div className="flex items-start justify-between pt-1 font-bold leading-4">
        <span className="text-base">Total</span>
        <span className="text-lg text-text-accent" data-testid="total">
          {displayEth(totals.totalEth)} ETH
        </span>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, testId, small, className }: { label: string; value: string; testId: string; small?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between', className)}>
      <span>{label}</span>
      <span className={cn('text-right leading-4', small ? 'text-[15px]' : 'text-lg')} data-testid={testId}>
        {value}
      </span>
    </div>
  )
}
