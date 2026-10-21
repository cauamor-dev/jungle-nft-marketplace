import { Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import type { Category } from '@/api/contracts'
import facebook from '@/assets/icons/social-facebook.svg'
import instagram from '@/assets/icons/social-instagram.svg'
import linkedin from '@/assets/icons/social-linkedin.svg'
import twitter from '@/assets/icons/social-twitter.svg'
import youtube from '@/assets/icons/social-youtube.svg'
import { categoriesByLabel, categoryLabels } from '@/lib/categories'

const medallions = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const footerCategories = categoriesByLabel.filter((category: Category) => ['art', 'photography', 'music', 'art3d', 'utility'].includes(category))
const socials = [
  { name: 'Facebook', icon: facebook, href: 'https://www.facebook.com/' },
  { name: 'Instagram', icon: instagram, href: 'https://www.instagram.com/' },
  { name: 'Twitter', icon: twitter, href: 'https://x.com/' },
  { name: 'LinkedIn', icon: linkedin, href: 'https://www.linkedin.com/' },
  { name: 'YouTube', icon: youtube, href: 'https://www.youtube.com/' },
]

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-[1200px] px-0 md:px-6 xl:px-0">
      <Newsletter />
      <div className="flex flex-col bg-surface-dark px-6 py-6 md:h-[88px] md:flex-row md:items-center md:gap-8 md:p-8">
        <p className="flex-1 py-2 text-sm font-bold tracking-[1.4px] text-foreground">KURIO</p>
        <p className="flex-1 text-sm leading-[22px] text-foreground">
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <a href="mailto:contato@email.com" className="flex min-h-11 flex-1 items-center text-sm leading-[22px] text-foreground md:min-h-0 md:block">
          contato@email.com
        </a>
        <p className="text-sm leading-[22px] text-foreground md:w-[228px]">+55 11 4002 8922</p>
      </div>
      <div className="mt-1.5 bg-surface-card px-6 py-8 md:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[repeat(3,minmax(0,1fr))_228px] lg:gap-x-12 xl:gap-x-[124px]">
          <FooterColumn title="Meu perfil">
            <FooterLink to="/perfil">Meu perfil</FooterLink>
            <FooterLink to="/perfil/atividade">Minha coleção</FooterLink>
            <FooterLink to="/perfil/atividade">Atividade</FooterLink>
            <FooterSoon>Estúdio do criador</FooterSoon>
            <FooterLink to="/perfil/favoritos">Lista de interesse</FooterLink>
          </FooterColumn>
          <FooterColumn title="Central de ajuda">
            <FooterLink to="/ajuda" hash="central-de-ajuda">Central de ajuda</FooterLink>
            <FooterLink to="/ajuda" hash="como-comprar">Como comprar NFTs</FooterLink>
            <FooterLink to="/ajuda" hash="carteira-e-seguranca">Carteira e segurança</FooterLink>
            <FooterLink to="/ajuda" hash="politica-do-mercado">Política do mercado</FooterLink>
            <FooterLink to="/ajuda" hash="denunciar-item">Denunciar item</FooterLink>
          </FooterColumn>
          <FooterColumn title="Coleções">
            {footerCategories.map((category) => (
              <li key={category}>
                <Link to="/mercado" search={{ category: [category] }} className="inline-flex min-h-11 items-center text-sm text-foreground hover:text-text-accent md:min-h-0 md:leading-[30px]">
                  {categoryLabels[category]}
                </Link>
              </li>
            ))}
          </FooterColumn>
          <div className="col-span-2 flex flex-col gap-8 lg:col-span-1">
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-bold leading-4">Redes sociais</h2>
              <ul className="flex gap-2.5">
                {socials.map((social) => (
                  <li key={social.name}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${social.name} (abre em nova aba)`}
                      className="relative block rounded-full touch-target transition-[transform,opacity] duration-150 hover:-translate-y-0.5 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent active:translate-y-0"
                    >
                      <img src={social.icon} alt="" className="size-[30px]" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="whitespace-nowrap text-lg font-bold leading-4">Carteiras compatíveis</h2>
              <p className="flex h-[26px] items-center justify-center rounded-md border border-line-soft bg-surface-dark text-[9px] font-bold tracking-[0.1px] text-text-accent">
                METAMASK&nbsp;&nbsp;·&nbsp;&nbsp;WALLETCONNECT&nbsp;&nbsp;·&nbsp;&nbsp;COINBASE
              </p>
            </div>
          </div>
        </div>
      </div>
      <p className="py-1.5 text-center text-sm leading-[30px] text-foreground">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-bold leading-4">{title}</h2>
      <ul>{children}</ul>
    </div>
  )
}

function FooterLink({ to, hash, children }: { to: '/perfil' | '/perfil/atividade' | '/perfil/favoritos' | '/ajuda'; hash?: string; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} hash={hash} className="inline-flex min-h-11 items-center text-sm text-foreground hover:text-text-accent md:min-h-0 md:leading-[30px]">
        {children}
      </Link>
    </li>
  )
}

function FooterSoon({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex min-h-11 flex-wrap items-center gap-x-2 text-sm text-foreground/60 md:min-h-0 md:pb-1.5 md:leading-[30px] xl:flex-nowrap xl:whitespace-nowrap xl:pb-0">
      <span>{children}</span>
      <span className="rounded-full border border-line-soft px-2 text-[10px] uppercase leading-4 tracking-[0.08em] text-text-secondary">em breve</span>
    </li>
  )
}

function Newsletter() {
  const [status, setStatus] = useState<'idle' | 'invalid' | 'unavailable'>('idle')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setStatus('invalid')
    setStatus('unavailable')
  }

  return (
    <div id="criadores" className="grid scroll-mt-6 gap-8 bg-surface-card p-8 md:grid-cols-3 lg:grid-cols-[1fr_1px_1fr_1px_1fr_1px_357px] lg:gap-0">
      {medallions.map((item, index) => (
        <div key={item.letter} className="contents">
          {index > 0 && <div aria-hidden="true" className="hidden bg-primary lg:block" />}
          <div className="flex flex-col gap-3 lg:px-4">
            <div className="grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-ink" aria-hidden="true">
              {item.letter}
            </div>
            <h2 className="text-[17px] font-bold leading-4">{item.title}</h2>
            <p className="max-w-[204px] text-sm leading-[22px] text-text-secondary">{item.text}</p>
          </div>
        </div>
      ))}
      <div aria-hidden="true" className="hidden bg-primary lg:block" />
      <form onSubmit={submit} noValidate className="flex flex-col gap-3 md:col-span-3 lg:col-span-1 lg:px-4">
        <h2 className="text-lg font-bold leading-4">Antecipe-se ao próximo lançamento</h2>
        <div className="flex h-11 overflow-hidden rounded-md bg-surface-dark md:h-10 shadow-[0_0_10px_rgba(10,6,4,0.45)]">
          <label htmlFor="newsletter-email" className="sr-only">
            E-mail para receber lançamentos
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            placeholder="digite seu e-mail..."
            aria-invalid={status === 'invalid'}
            className="min-w-0 flex-1 bg-transparent px-3 text-sm placeholder:text-secondary"
          />
          <button type="submit" className="w-[85px] bg-primary pl-4 pr-1 text-lg font-bold text-ink hover:bg-text-accent">
            Enviar
          </button>
        </div>
        <p role="status" className="text-[13px] leading-[22px] text-text-secondary">
          {status === 'unavailable'
            ? 'Os alertas de lançamento não fazem parte desta demonstração. Nenhum e-mail foi cadastrado.'
            : status === 'invalid'
              ? 'Informe um e-mail válido.'
              : 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.'}
        </p>
      </form>
    </div>
  )
}
