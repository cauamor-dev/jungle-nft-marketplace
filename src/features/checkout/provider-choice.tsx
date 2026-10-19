import { walletTypes, type WalletType } from '@/api/contracts'
import { cn } from '@/lib/cn'
import { walletTypeInitials, walletTypeLabels } from '@/lib/wallets'

type ProviderChoiceProps = {
  value: WalletType
  onChange: (type: WalletType) => void
  variant: 'rows' | 'cards'
}

// Mesma escolha do select "Tipo de carteira", apresentada como rádios.
export function ProviderChoice({ value, onChange, variant }: ProviderChoiceProps) {
  const cards = variant === 'cards'
  return (
    <div role="radiogroup" aria-label="Carteira e rede" className={cn('flex flex-col', cards ? 'gap-3' : 'gap-4')}>
      {walletTypes.map((type) => {
        const selected = type === value
        return (
          <label
            key={type}
            className={cn(
              'flex cursor-pointer items-center gap-3 border text-[15px] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-text-accent',
              cards ? 'h-16 rounded-xl border-transparent bg-surface-card px-4' : 'h-[45px] rounded-[3px] px-3',
              !cards && (selected ? 'border-primary' : 'border-line'),
            )}
          >
            <input
              type="radio"
              name="provider"
              value={type}
              checked={selected}
              onChange={() => onChange(type)}
              className={cn('size-4 accent-primary', cards && 'order-last ml-auto')}
            />
            {cards && (
              <span aria-hidden="true" className="grid size-10 place-items-center rounded-full border border-line-soft bg-surface-raised text-sm font-bold text-text-accent">
                {walletTypeInitials[type]}
              </span>
            )}
            <span>{walletTypeLabels[type]}</span>
          </label>
        )
      })}
    </div>
  )
}
