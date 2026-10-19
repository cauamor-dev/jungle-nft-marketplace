import { Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import type { Category } from '@/api/contracts'
import facebook from '@/assets/icons/social-facebook.svg'
import instagram from '@/assets/icons/social-instagram.svg'
import linkedin from '@/assets/icons/social-linkedin.svg'
import twitter from '@/assets/icons/social-twitter.svg'
import youtube from '@/assets/icons/social-youtube.svg'
import { categoryLabels } from '@/lib/categories'

const medallions = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const footerCategories: Category[] = ['art', 'photography', 'music', 'art3d', 'utility']
const socials = [
  { name: 'Facebook', icon: facebook },
  { name: 'Instagram', icon: instagram },
  { name: 'Twitter', icon: twitter },
  { name: 'LinkedIn', icon: linkedin },
  { name: 'YouTube', icon: youtube },
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
        <a href="mailto:contato@email.com" className="flex-1 text-sm leading-[22px] text-foreground">
          contato@email.com
        </a>
        <p className="text-sm leading-[22px] text-foreground md:w-[228px]">+55 11 4002 8922</p>
      </div>
      <div className="mt-1.5 bg-surface-card px-6 py-8 md:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[1fr_1fr_1fr_228px] lg:gap-x-[124px]">
          <FooterColumn title="Meu perfil">
            <FooterLink to="/perfil">Meu perfil</FooterLink>
            <FooterLink to="/perfil/atividade">Minha coleção</FooterLink>
            <FooterLink to="/perfil/atividade">Atividade</FooterLink>
            <FooterText>Estúdio do criador</FooterText>
            <FooterLink to="/perfil/favoritos">Lista de interesse</FooterLink>
          </FooterColumn>
          <FooterColumn title="Central de ajuda">
            <FooterText>Central de ajuda</FooterText>
            <FooterText>Como comprar NFTs</FooterText>
            <FooterText>Carteira e segurança</FooterText>
            <FooterText>Política do mercado</FooterText>
            <FooterText>Denunciar item</FooterText>
          </FooterColumn>
          <FooterColumn title="Coleções">
            {footerCategories.map((category) => (
              <li key={category}>
                <Link to="/mercado" search={{ category: [category] }} className="text-sm leading-[30px] text-foreground hover:text-text-accent">
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
                    <img src={social.icon} alt={social.name} className="size-[30px]" />
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

function FooterLink({ to, children }: { to: '/perfil' | '/perfil/atividade' | '/perfil/favoritos'; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="text-sm leading-[30px] text-foreground hover:text-text-accent">
        {children}
      </Link>
    </li>
  )
}

function FooterText({ children }: { children: React.ReactNode }) {
  return <li className="text-sm leading-[30px] text-foreground">{children}</li>
}

function Newsletter() {
  const [status, setStatus] = useState<'idle' | 'invalid' | 'done'>('idle')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setStatus('invalid')
    setStatus('done')
    event.currentTarget.reset()
  }

  return (
    <div id="criadores" className="grid gap-8 bg-surface-card p-8 md:grid-cols-3 lg:grid-cols-[1fr_1px_1fr_1px_1fr_1px_357px] lg:gap-0">
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
        <div className="flex h-10 overflow-hidden rounded-md bg-surface-dark shadow-[0_0_10px_rgba(10,6,4,0.45)]">
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
          {status === 'done'
            ? 'Pronto! Você vai receber os próximos lançamentos da Kurio.'
            : status === 'invalid'
              ? 'Informe um e-mail válido.'
              : 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.'}
        </p>
      </form>
    </div>
  )
}
