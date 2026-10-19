import { Link } from '@tanstack/react-router'
import type { Cart, Quote } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { displayEth } from '@/domain/money'
import { OrderTotals } from '@/features/cart/order-summary'
import { useIsDesktop } from '@/lib/use-media-query'

type PaymentSummaryProps = {
  quote: Quote
  cart: Cart
  refreshing: boolean
  reconfirm: { previousTotal: string | null; onAccept: () => void } | null
}

export function PaymentSummary({ quote, cart, refreshing, reconfirm }: PaymentSummaryProps) {
  const desktop = useIsDesktop()
  const images = new Map(cart.items.map((item) => [`${item.nftId}:${item.editionId}`, item.image]))

  return (
    <section aria-labelledby="summary-title" className="flex flex-col gap-3" aria-busy={refreshing} data-testid="payment-summary">
      {desktop ? (
        <>
          <h2 id="summary-title" className="text-[17px] font-bold leading-4">Seus NFTs</h2>
          <div className="flex items-center justify-between border-b border-line-soft pb-3 text-base leading-4">
            <span className="font-bold">NFTs</span>
            <span className="font-medium">Subtotal</span>
          </div>
          <ul className="flex flex-col gap-3">
            {quote.items.map((item) => {
              const image = images.get(`${item.nftId}:${item.editionId}`)
              return (
                <li key={`${item.nftId}:${item.editionId}`} className="flex h-[70px] items-center gap-2 bg-surface-card pl-1 pr-4" data-testid="quote-item">
                  {image && <img src={image.thumbSrc} alt="" width={66} height={66} className="size-[66px] rounded-lg object-cover" />}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 leading-4">
                    <span className="font-bold">{item.title}</span>
                    <span className="text-sm text-secondary">Edição {item.editionLabel}</span>
                  </div>
                  <span className="text-sm text-text-secondary">(x {item.quantity})</span>
                  <span className="min-w-[72px] text-right text-lg font-bold text-text-accent">{displayEth(item.lineTotalEth)} ETH</span>
                </li>
              )
            })}
          </ul>
          <p className="text-center text-sm">
            Tem um código promocional?{' '}
            <Link to="/carrinho" className="text-text-accent underline">
              Aplique aqui
            </Link>
          </p>
          <OrderTotals totals={quote} />
        </>
      ) : (
        <>
          <h2 id="summary-title" className="sr-only">Resumo do pedido</h2>
          <p className="flex items-center justify-end gap-6 font-bold">
            <span>Total:</span>
            <span className="text-xl text-text-accent" data-testid="total">
              {displayEth(quote.totalEth)} ETH
            </span>
          </p>
        </>
      )}
      {reconfirm && (
        <div role="alert" className="flex flex-col gap-2 rounded-md border border-primary bg-surface-card p-3 text-sm" data-testid="reconfirm">
          <p>
            Os valores mudaram
            {reconfirm.previousTotal ? ` (de ${displayEth(reconfirm.previousTotal)} para ${displayEth(quote.totalEth)} ETH)` : ''}. Confira e aceite o
            novo total para continuar.
          </p>
          <Button size="sm" onClick={reconfirm.onAccept}>
            Aceitar novos valores
          </Button>
        </div>
      )}
    </section>
  )
}
