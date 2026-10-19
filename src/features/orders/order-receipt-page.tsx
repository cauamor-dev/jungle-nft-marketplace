import { useQueries } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { getNft } from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'
import type { Order } from '@/api/contracts'
import closeIcon from '@/assets/icons/close.svg'
import thankYou from '@/assets/icons/thank-you.svg'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { displayEth } from '@/domain/money'
import { isApiError } from '@/domain/errors'
import { RequireAuth } from '@/features/auth/require-auth'
import { formatDate } from '@/lib/format'
import { networkLabels } from '@/lib/categories'
import { shortAddress, walletTypeLabels } from '@/lib/wallets'
import { useOrder } from './queries'

export function OrderReceiptPage({ orderId }: { orderId: string }) {
  return (
    <RequireAuth title="Entre para ver seu pedido" description="Os pedidos ficam disponíveis apenas para a conta que os criou.">
      <Receipt orderId={orderId} />
    </RequireAuth>
  )
}

const titles = {
  confirmed: 'Seus NFTs agora estão na sua carteira',
  pending: 'Aguardando a confirmação da rede',
  rejected: 'O pagamento não foi concluído',
} as const

function Receipt({ orderId }: { orderId: string }) {
  const { data: order, error, isPending, refetch } = useOrder(orderId)
  const navigate = useNavigate()

  if (isPending) {
    return (
      <div role="status" aria-label="Carregando pedido" className="mx-auto mt-16 w-full max-w-[578px] px-4">
        <Skeleton className="h-[480px] rounded-none" />
      </div>
    )
  }
  if (error || !order) {
    const message = isApiError(error) ? error.message : 'Não foi possível carregar o pedido.'
    return (
      <div role="alert" className="mx-auto flex max-w-[578px] flex-col items-center gap-4 px-6 py-24 text-center" data-testid="order-error">
        <h1 className="text-2xl font-bold">Pedido indisponível</h1>
        <p className="text-sm text-text-secondary">{message}</p>
        <div className="flex gap-3">
          <Button onClick={() => void refetch()}>Tentar de novo</Button>
          <Button variant="outline" asChild>
            <Link to="/mercado">Voltar ao mercado</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[578px] items-start px-0 py-0 md:items-center md:px-4 md:py-10">
      <article
        aria-labelledby="receipt-title"
        className="relative w-full overflow-hidden border-b-[10px] border-primary bg-surface-card"
        data-testid="order-receipt"
        data-status={order.status}
      >
        <button
          type="button"
          onClick={() => void navigate({ to: '/mercado' })}
          aria-label="Fechar recibo"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-sm hover:bg-primary/15"
        >
          <img src={closeIcon} alt="" className="size-3.5" />
        </button>

        <header className="flex min-h-[156px] flex-col items-center justify-center gap-4 px-6 py-5">
          {order.status === 'confirmed' && <img src={thankYou} alt="" className="size-20" />}
          {order.status === 'pending' && <span aria-hidden="true" className="size-12 animate-spin rounded-full border-4 border-line-soft border-t-primary" />}
          {order.status === 'rejected' && <span aria-hidden="true" className="grid size-14 place-items-center rounded-full border-2 border-text-coral text-3xl text-text-coral">!</span>}
          <h1 id="receipt-title" className="text-center text-base font-bold text-text-secondary" role="status">
            {titles[order.status]}
          </h1>
        </header>

        <TransactionMeta order={order} />
        <TransactionDetails order={order} />
      </article>
    </div>
  )
}

function TransactionMeta({ order }: { order: Order }) {
  const { receipt } = order
  const cells = [
    { label: 'ID da transação', value: order.txReference ? shortAddress(order.txReference) : order.id, bold: true, testId: 'order-tx' },
    { label: 'Data', value: formatDate(order.settledAt ?? order.createdAt) },
    { label: 'Total', value: `${displayEth(receipt.totalEth)} ETH` },
    { label: 'Carteira', value: walletTypeLabels[receipt.collector.walletType], bold: true },
  ]
  return (
    <dl className="grid grid-cols-2 gap-y-3 border-y border-primary px-6 py-2 md:flex md:justify-between md:px-9 md:py-1">
      {cells.map((cell, index) => (
        <div key={cell.label} className={index > 0 ? 'md:border-l md:border-primary md:pl-3' : ''}>
          <dt className={cell.bold ? 'text-sm font-bold text-text-secondary' : 'text-sm text-text-secondary'}>{cell.label}</dt>
          <dd className="text-[15px] text-text-secondary" data-testid={cell.testId}>
            {cell.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function TransactionDetails({ order }: { order: Order }) {
  const { receipt } = order
  const nfts = useQueries({
    queries: receipt.items.map((item) => ({
      queryKey: queryKeys.nfts.detail(item.nftId),
      queryFn: ({ signal }: { signal: AbortSignal }) => getNft(item.nftId, { signal }),
      staleTime: Infinity,
    })),
  })

  return (
    <section aria-labelledby="receipt-details" className="flex flex-col gap-3 px-6 pb-10 pt-5 md:px-11 md:pb-12">
      <h2 id="receipt-details" className="text-[15px] font-bold leading-4">Detalhes da transação</h2>
      <div className="flex items-center justify-between border-b border-line-soft pb-3 text-base leading-4">
        <span className="font-bold">NFTs</span>
        <span className="flex gap-12">
          <span className="font-bold">Edições</span>
          <span className="font-medium">Subtotal</span>
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {receipt.items.map((item, index) => {
          const image = nfts[index]?.data?.images[0]
          return (
            <li key={`${item.nftId}:${item.editionId}`} className="flex min-h-[70px] items-center justify-between gap-3" data-testid="receipt-item">
              <div className="flex min-w-0 items-center gap-3">
                {image ? (
                  <img src={image.thumbSrc} alt="" width={70} height={70} className="size-[70px] shrink-0 rounded-lg object-cover" />
                ) : (
                  <Skeleton className="size-[70px] shrink-0 rounded-lg" />
                )}
                <div className="flex min-w-0 flex-col gap-1.5 leading-4">
                  <span className="truncate font-bold">{item.title}</span>
                  <span className="text-sm text-secondary">Edição {item.editionLabel}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-6 text-right md:gap-12">
                <span className="text-sm text-text-secondary">(x {item.quantity})</span>
                <span className="min-w-[72px] text-lg font-bold text-text-accent">{displayEth(item.lineTotalEth)} ETH</span>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col items-end gap-2 pt-1 text-sm">
        {receipt.couponCode && (
          <p className="flex gap-6 text-text-secondary">
            <span>Cupom {receipt.couponCode}</span>
            <span>(-) {displayEth(receipt.discountEth)} ETH</span>
          </p>
        )}
        <p className="flex gap-8">
          <span>Taxa de rede</span>
          <span className="min-w-[92px] text-right text-[15px]">{displayEth(receipt.networkFeeEth)} ETH</span>
        </p>
        <p className="flex gap-8 font-bold">
          <span>Total</span>
          <span className="min-w-[92px] text-right text-[15px] text-text-accent" data-testid="receipt-total">
            {displayEth(receipt.totalEth)} ETH
          </span>
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 border-t border-line-soft pt-4 text-center text-xs leading-5 text-text-secondary">
        <StatusMessage order={order} />
        {order.status === 'confirmed' && order.explorerUrl && (
          <Button asChild className="h-[30px] rounded-[3px] px-5 text-xs">
            <a href={order.explorerUrl} target="_blank" rel="noreferrer">
              Ver no Etherscan
            </a>
          </Button>
        )}
        {order.status === 'rejected' && (
          <Button asChild className="h-[30px] rounded-[3px] px-5 text-xs">
            <Link to="/carrinho">Voltar ao carrinho</Link>
          </Button>
        )}
      </div>
    </section>
  )
}

function StatusMessage({ order }: { order: Order }) {
  const network = networkLabels[order.receipt.network]
  if (order.status === 'confirmed') {
    return (
      <p data-testid="order-message">
        Transação confirmada na {network}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
      </p>
    )
  }
  if (order.status === 'pending') {
    return (
      <p data-testid="order-message">
        Sua transação foi enviada para a {network} e aguarda confirmação. Esta página atualiza sozinha quando o resultado chegar.
      </p>
    )
  }
  return (
    <p data-testid="order-message">
      {order.rejectionReason ?? 'A rede recusou a transação.'} Nenhum valor foi cobrado e seu carrinho continua guardado.
    </p>
  )
}
