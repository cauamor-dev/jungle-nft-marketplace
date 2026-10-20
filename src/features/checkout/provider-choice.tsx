import type { WalletType } from '@/api/contracts'
import walletIcon from '@/assets/icons/wallet.svg'
import { cn } from '@/lib/cn'
import { walletTypeInitials, walletTypeLabels } from '@/lib/wallets'

type ProviderChoiceProps = {
  value: WalletType
  onChange: (type: WalletType) => void
  variant: 'rows' | 'cards'
}

// Ordem do frame de pagamento do Figma.
const providers: WalletType[] = ['walletconnect', 'metamask', 'coinbase']

// Mesma escolha do select "Tipo de carteira", apresentada como rádios.
export function ProviderChoice({ value, onChange, variant }: ProviderChoiceProps) {
  const cards = variant === 'cards'
  return (
    <div role="radiogroup" aria-label="Carteira e rede" className={cn('flex flex-col', cards ? 'gap-3' : 'gap-4')}>
      {providers.map((type) => {
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
              className={cn('radio-control', cards && 'order-last ml-auto')}
            />
            {cards && (
              <span aria-hidden="true" className="grid size-10 place-items-center rounded-full border border-line-soft bg-surface-raised text-sm font-bold text-text-accent">
                {type === 'coinbase' ? <img src={walletIcon} alt="" className="size-5" /> : walletTypeInitials[type]}
              </span>
            )}
            <span>{walletTypeLabels[type]}</span>
          </label>
        )
      })}
    </div>
  )
}
