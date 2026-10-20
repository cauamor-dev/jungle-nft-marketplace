import { Link } from '@tanstack/react-router'
import arrow from '@/assets/icons/arrow-right.svg'
import mask from '@/assets/icons/promo-mask.svg'
import esmeralda from '@/assets/nfts/esmeralda-400.webp'
import ivory from '@/assets/nfts/ivory-400.webp'
import dourado from '@/assets/nfts/dourado-400.webp'
import violeta from '@/assets/nfts/violeta-400.webp'

const promos = [
  {
    title: ['Lançamentos gênesis', 'de edição limitada'],
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: esmeralda,
    imageClass: '-left-[5px] rounded-[18px]',
    listing: 'new' as const,
  },
  {
    title: ['Arte digital selecionada', 'e muito mais'],
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: ivory,
    imageClass: 'left-0.5 rounded-[17px]',
    listing: undefined,
  },
]

export function Promos() {
  return (
    <section aria-label="Destaques" className="grid gap-6 lg:grid-cols-2 lg:gap-0 lg:[&>*:last-child]:justify-self-end">
      {promos.map((promo) => (
        <article key={promo.title[0]} className="relative flex min-h-[250px] overflow-hidden rounded-lg bg-surface-card lg:w-[586px]">
          <img src={mask} alt="" className="pointer-events-none absolute inset-0 size-full object-cover" />
          <img
            src={promo.image}
            alt=""
            width={292}
            height={250}
            loading="lazy"
            className={`absolute top-0 h-[250px] w-[42%] max-w-[292px] object-cover ${promo.imageClass}`}
          />
          <div className="relative ml-[46%] flex flex-1 flex-col items-end gap-3 py-[37px] pr-5 text-right sm:pr-[30px]">
            <h2 className="text-lg font-bold leading-6">
              {promo.title[0]}
              <br />
              {promo.title[1]}
            </h2>
            <p className="max-w-[263px] text-sm leading-6 text-text-secondary">{promo.text}</p>
            <Link
              to="/mercado"
              search={{ listing: promo.listing }}
              className="mt-auto flex h-10 w-[140px] items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-ink hover:bg-text-accent"
            >
              Explorar
              <img src={arrow} alt="" className="h-3 w-2.5 -rotate-90" />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}

export const blogPosts = [
  { image: ivory, date: '12 de setembro', read: 'Leitura de 6 min', title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { image: esmeralda, date: '13 de setembro', read: 'Leitura de 2 min', title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.' },
  { image: violeta, date: '15 de setembro', read: 'Leitura de 3 min', title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { image: dourado, date: '15 de setembro', read: 'Leitura de 2 min', title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.' },
]

export function Blog() {
  return (
    <section id="blog" aria-labelledby="blog-title" className="flex scroll-mt-6 flex-col items-center gap-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 id="blog-title" className="text-[28px] font-bold text-text-primary">
          Diário da Cunhagem
        </h2>
        <p className="text-sm text-text-secondary">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      </div>
      <ul className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {blogPosts.map((post) => (
          <li key={post.title} className="flex flex-col overflow-hidden rounded-lg bg-surface-card">
            <img src={post.image} alt="" width={400} height={195} loading="lazy" className="h-[195px] w-full object-cover" />
            <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3">
              <p className="text-xs font-medium leading-4 text-text-secondary">
                {post.date}&nbsp;&nbsp;|&nbsp;&nbsp;{post.read}
              </p>
              <h3 className="text-base font-bold text-text-primary">{post.title}</h3>
              <p className="text-xs font-medium leading-4 text-text-secondary">{post.text}</p>
              <p className="mt-auto flex gap-1 text-xs text-text-accent">
                <span className="font-bold leading-[14px]">Ler mais</span>
                <span aria-hidden="true">→</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
