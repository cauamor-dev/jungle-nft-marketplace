import { Link, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import cartIcon from '@/assets/icons/cart.svg'
import badgeIcon from '@/assets/icons/cart-badge.svg'
import enterIcon from '@/assets/icons/enter.svg'
import searchIcon from '@/assets/icons/search.svg'
import { useAuthDialog } from '@/features/auth/auth-context'
import { useSession } from '@/features/auth/session'
import { useCartCount } from '@/features/cart/queries'
import { cn } from '@/lib/cn'

type NavSection = 'home' | 'market'

const navItems = [
  { label: 'Início', section: 'home' as const, to: '/' },
  { label: 'Mercado', section: 'market' as const, to: '/mercado' },
  { label: 'Criadores', section: null, to: '/', hash: 'criadores' },
  { label: 'Aprenda', section: null, to: '/', hash: 'blog' },
]

type HeaderProps = { active: NavSection; divider?: boolean }

export function Header({ active, divider = false }: HeaderProps) {
  const [searching, setSearching] = useState(false)

  return (
    <header className="mx-auto hidden w-full max-w-[1200px] px-6 md:block md:pt-6 xl:px-0">
      <div className={cn(divider && 'border-b-[0.5px] border-primary')}>
        <div className="flex h-[45px] items-start justify-between">
          <Link to="/" className="mt-[8px] w-40 text-sm font-bold tracking-[1.4px] text-foreground" aria-label="Kurio, página inicial">
            KURIO
          </Link>
          <nav aria-label="Principal" className="flex gap-10">
            {navItems.map((item) => {
              const isActive = item.section === active
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  hash={item.hash}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative h-[45px] text-base leading-[21px]',
                    isActive ? 'font-bold text-text-accent' : 'font-normal text-foreground hover:text-text-accent',
                  )}
                >
                  {item.label}
                  {isActive && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-primary" />}
                </Link>
              )
            })}
          </nav>
          <HeaderActions onToggleSearch={() => setSearching((current) => !current)} searching={searching} />
        </div>
      </div>
      {searching && <HeaderSearch onDone={() => setSearching(false)} />}
    </header>
  )
}

function HeaderActions({ onToggleSearch, searching }: { onToggleSearch: () => void; searching: boolean }) {
  const count = useCartCount()
  const { data: session } = useSession()
  const { open } = useAuthDialog()

  return (
    <div className="flex items-center gap-7">
      <button
        type="button"
        onClick={onToggleSearch}
        aria-label="Buscar NFTs"
        aria-expanded={searching}
        className="grid size-6 place-items-center"
      >
        <img src={searchIcon} alt="" className="size-5" />
      </button>
      <Link to="/carrinho" aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`} className="relative grid size-6 place-items-center">
        <img src={cartIcon} alt="" className="size-6" />
        <span className="absolute -right-1 -top-1 grid size-4 place-items-center" data-testid="cart-count">
          <img src={badgeIcon} alt="" className="absolute inset-0 size-full" />
          <span className="relative text-[10px] font-medium leading-none text-ink">{count > 99 ? '99+' : count}</span>
        </span>
      </Link>
      {session ? (
        <Link
          to="/perfil"
          className="flex h-[35px] max-w-[140px] items-center justify-center gap-1 rounded-md bg-primary px-3 text-base font-medium text-ink hover:bg-text-accent"
        >
          <img src={enterIcon} alt="" className="size-5" />
          <span className="truncate">{session.user.name.split(' ')[0]}</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => open('login')}
          className="flex h-[35px] w-[100px] items-center justify-center gap-1 rounded-md bg-primary text-base font-medium text-ink hover:bg-text-accent"
        >
          <img src={enterIcon} alt="" className="size-5" />
          Entrar
        </button>
      )}
    </div>
  )
}

function HeaderSearch({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    onDone()
    void navigate({ to: '/mercado', search: { q: q || undefined } })
  }

  return (
    <form role="search" onSubmit={submit} className="flex gap-2 pb-4 pt-3">
      <input
        name="q"
        type="search"
        autoFocus
        aria-label="Buscar NFTs pelo nome"
        placeholder="Buscar por nome, coleção ou criador"
        className="h-10 flex-1 rounded-md border border-line bg-surface-card px-3 text-sm placeholder:text-secondary"
      />
      <button type="submit" className="h-10 rounded-md bg-primary px-5 text-sm font-bold text-ink hover:bg-text-accent">
        Buscar
      </button>
    </form>
  )
}
