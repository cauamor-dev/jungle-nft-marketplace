import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import activityIcon from '@/assets/icons/account-activity.svg'
import downloadIcon from '@/assets/icons/account-download.svg'
import heartIcon from '@/assets/icons/account-heart.svg'
import locationIcon from '@/assets/icons/account-location.svg'
import logoutIcon from '@/assets/icons/account-logout.svg'
import shoppingIcon from '@/assets/icons/account-shopping.svg'
import supportIcon from '@/assets/icons/account-support.svg'
import userIcon from '@/assets/icons/account-user.svg'
import { useLogout } from '@/features/auth/session'
import { cn } from '@/lib/cn'

const links = [
  { to: '/perfil', label: 'Dados do perfil', icon: userIcon, exact: true },
  { to: '/perfil/carteiras', label: 'Carteiras', icon: locationIcon },
  { to: '/perfil/atividade', label: 'Atividade', icon: shoppingIcon },
  { to: '/perfil/favoritos', label: 'Lista de interesse', icon: heartIcon },
] as const

const upcoming = [
  { label: 'Ofertas', icon: activityIcon },
  { label: 'Arquivos baixados', icon: downloadIcon },
  { label: 'Suporte', icon: supportIcon },
]

export function AccountLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 pb-8 pt-8 md:pt-6 lg:flex-row lg:gap-7 xl:px-0">
      <AccountSidebar />
      <section aria-labelledby="account-title" className="flex min-w-0 flex-1 flex-col gap-8">
        <h1 id="account-title" className="text-base font-bold leading-4">
          {title}
        </h1>
        {children}
      </section>
    </div>
  )
}

function AccountSidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const logout = useLogout()

  async function signOut() {
    await logout.mutateAsync()
    void navigate({ to: '/' })
  }

  return (
    <nav aria-label="Minha conta" className="flex shrink-0 flex-col self-start bg-surface-card py-2 max-lg:w-full lg:w-[310px]">
      <p className="p-2.5 text-lg font-bold leading-4">Meu perfil</p>
      <ul className="flex gap-1 overflow-x-auto scrollbar-none lg:flex-col lg:gap-0 lg:overflow-visible">
        {links.map((link) => {
          const active = 'exact' in link ? pathname === link.to : pathname.startsWith(link.to)
          return (
            <li key={link.to} className="shrink-0">
              <Link
                to={link.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 border-b-2 px-4 text-[15px] leading-[45px] text-text-accent hover:bg-primary/10 lg:border-b-0 lg:border-l-[6px]',
                  active ? 'border-primary' : 'border-transparent',
                )}
              >
                <img src={link.icon} alt="" className="size-[18px]" />
                {link.label}
              </Link>
            </li>
          )
        })}
        {upcoming.map((item) => (
          <li key={item.label} className="shrink-0">
            <span aria-disabled="true" title="Em breve" className="flex cursor-not-allowed items-center gap-3 px-4 text-[15px] leading-[45px] text-text-accent opacity-60 border-b-2 border-transparent lg:border-b-0 lg:border-l-[6px]">
              <img src={item.icon} alt="" className="size-[18px]" />
              {item.label}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-1 border-t-[0.3px] border-primary">
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={logout.isPending}
          className="flex h-10 w-full items-center gap-2 px-4 text-[15px] font-bold text-text-accent hover:bg-primary/10 lg:px-4"
        >
          <img src={logoutIcon} alt="" className="size-5" />
          Sair
        </button>
      </div>
    </nav>
  )
}
