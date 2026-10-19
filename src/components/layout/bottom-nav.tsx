import { Link, useLocation } from '@tanstack/react-router'
import fab from '@/assets/icons/fab.svg'
import scan from '@/assets/icons/scan.svg'
import tabbar from '@/assets/icons/tabbar-bg.svg'
import cart from '@/assets/icons/tab-cart.svg'
import heart from '@/assets/icons/tab-heart.svg'
import home from '@/assets/icons/tab-home.svg'
import user from '@/assets/icons/tab-user.svg'
import { MaskIcon } from '@/components/ui/mask-icon'
import { useCartCount } from '@/features/cart/queries'
import { cn } from '@/lib/cn'

export function BottomNav() {
  const { pathname } = useLocation()
  const count = useCartCount()

  const items = [
    { to: '/', label: 'Início', icon: home, active: pathname === '/' },
    { to: '/perfil/favoritos', label: 'Favoritos', icon: heart, active: pathname.startsWith('/perfil/favoritos') },
    null,
    { to: '/carrinho', label: 'Carrinho', icon: cart, active: pathname.startsWith('/carrinho') },
    { to: '/perfil', label: 'Perfil', icon: user, active: pathname === '/perfil' || pathname.startsWith('/perfil/carteiras') },
  ] as const

  return (
    <nav aria-label="Navegação principal" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[95px] md:hidden">
      <img src={tabbar} alt="" className="absolute inset-x-[-7.25%] bottom-[-21%] top-[-42%] h-[163%] w-[114.5%] max-w-none" />
      <ul className="pointer-events-auto relative grid h-full grid-cols-5 items-start pt-[34px]">
        {items.map((item, index) =>
          item ? (
            <li key={item.to} className="flex justify-center">
              <Link to={item.to} aria-label={item.label} aria-current={item.active ? 'page' : undefined} className="relative grid size-8 place-items-center">
                <MaskIcon src={item.icon} className={cn('size-5', item.active ? 'text-text-accent' : 'text-text-secondary')} />
                {item.label === 'Carrinho' && count > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-medium leading-4 text-ink">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          ) : (
            <li key={`fab-${index}`} aria-hidden="true" />
          ),
        )}
      </ul>
      <Link
        to="/mercado"
        aria-label="Explorar o mercado"
        className="pointer-events-auto absolute left-1/2 top-[-31px] grid size-[65px] -translate-x-1/2 place-items-center"
      >
        <img src={fab} alt="" className="absolute inset-0 size-full" />
        <img src={scan} alt="" className="relative h-6 w-[27px]" />
      </Link>
    </nav>
  )
}
