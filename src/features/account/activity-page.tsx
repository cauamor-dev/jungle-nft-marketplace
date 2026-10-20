import { Link } from '@tanstack/react-router'
import type { OrderStatus } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { displayEth } from '@/domain/money'
import { useOrders } from '@/features/orders/queries'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'
import { AccountLayout } from './account-layout'

const statusLabels: Record<OrderStatus, string> = {
  confirmed: 'Confirmado',
  pending: 'Aguardando rede',
  rejected: 'Recusado',
}

export function ActivityPage() {
  return (
    <AccountLayout title="Atividade">
      <ActivityContent />
    </AccountLayout>
  )
}

function ActivityContent() {
  const orders = useOrders()

  if (orders.isPending) return <Skeleton className="h-48 w-full" />
  if (orders.error || !orders.data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3" data-testid="orders-error">
        <p className="text-sm text-text-coral">Não foi possível carregar seus pedidos.</p>
        <Button variant="outline" onClick={() => void orders.refetch()}>
          Tentar de novo
        </Button>
      </div>
    )
  }
  const items = [...orders.data.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg bg-surface-card p-6" data-testid="orders-empty">
        <p className="font-bold">Nenhum pedido ainda</p>
        <p className="text-sm text-text-secondary">Quando você finalizar uma compra, o recibo aparece aqui.</p>
        <Button asChild>
          <Link to="/mercado">Explorar o mercado</Link>
        </Button>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3" data-testid="orders-list">
      {items.map((order) => {
        const quantity = order.receipt.items.reduce((sum, item) => sum + item.quantity, 0)
        return (
          <li key={order.id} className="flex flex-wrap items-center justify-between gap-4 bg-surface-card p-4" data-testid="order-row">
            <div className="flex flex-col gap-1.5">
              <p className="font-bold">
                Pedido {order.id} <span className="font-normal text-text-secondary">· {formatDateTime(order.createdAt)}</span>
              </p>
              <p className="text-sm text-secondary">
                {order.receipt.items.map((item) => item.title).join(', ')} ({quantity} {quantity === 1 ? 'unidade' : 'unidades'})
              </p>
            </div>
            <div className="flex items-center gap-5">
              <span
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-bold',
                  order.status === 'confirmed' && 'border-success text-success',
                  order.status === 'pending' && 'border-primary text-text-accent',
                  order.status === 'rejected' && 'border-text-coral text-text-coral',
                )}
                data-testid="order-status"
              >
                {statusLabels[order.status]}
              </span>
              <span className="text-lg font-bold text-text-accent">{displayEth(order.receipt.totalEth)} ETH</span>
              <Link to="/pedido/$orderId" params={{ orderId: order.id }} className="text-sm text-text-accent underline">
                Ver recibo
              </Link>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
