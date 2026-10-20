import type { Wallet } from '@/api/contracts'
import { networkLabels } from '@/lib/categories'
import { cn } from '@/lib/cn'
import { shortAddress } from '@/lib/wallets'

type WalletPickerProps = {
  wallets: Wallet[]
  selectedId: string | null
  onSelect: (wallet: Wallet) => void
}

export function WalletPicker({ wallets, selectedId, onSelect }: WalletPickerProps) {
  return (
    <div role="radiogroup" aria-label="Carteira" className="flex flex-col gap-3">
      {wallets.map((wallet) => {
        const selected = wallet.id === selectedId
        return (
          <label
            key={wallet.id}
            className={cn(
              'flex cursor-pointer items-center gap-4 rounded-xl border bg-surface-card px-4 py-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-text-accent',
              selected ? 'border-primary' : 'border-transparent',
            )}
            data-testid="wallet-option"
          >
            <input type="radio" name="wallet" checked={selected} onChange={() => onSelect(wallet)} className="radio-control" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-lg font-bold leading-5">{wallet.label}</span>
              <span className="truncate text-sm text-text-secondary">{wallet.ensName ? `${wallet.ensName}.${wallet.ensSuffix}` : shortAddress(wallet.address)}</span>
              <span className="text-sm text-text-secondary">
                {wallet.kind === 'primary' ? 'Rede principal' : 'Rede'} {networkLabels[wallet.network]}
                {' · '}
                {wallet.connection === 'connected' ? 'conectada' : 'desconectada'}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}
