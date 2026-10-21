import { Link } from '@tanstack/react-router'
import arrow from '@/assets/icons/arrow-right.svg'
import esmeralda from '@/assets/nfts/esmeralda-400.webp'
import ivory from '@/assets/nfts/ivory-400.webp'
import { articles } from '@/features/content/articles'

const promos = [
  {
    title: ['Lançamentos gênesis', 'de edição limitada'],
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: esmeralda,
    imageClass: 'lg:-left-[5px] lg:rounded-[18px]',
    listing: 'new' as const,
  },
  {
    title: ['Arte digital selecionada', 'e muito mais'],
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: ivory,
    imageClass: 'lg:left-0.5 lg:rounded-[17px]',
    listing: undefined,
  },
]

export function Promos() {
  return (
    <section aria-label="Destaques" className="grid gap-6 lg:grid-cols-2 lg:gap-0 lg:[&>*:last-child]:justify-self-end">
      {promos.map((promo) => (
        <article key={promo.title[0]} className="relative flex flex-col overflow-hidden rounded-lg bg-surface-card sm:min-h-[250px] sm:flex-row lg:w-[586px]">
          <img
            src={promo.image}
            alt=""
            width={292}
            height={250}
            loading="lazy"
            className={`h-44 w-full object-cover sm:absolute sm:inset-y-0 sm:left-0 sm:h-full sm:w-[42%] sm:max-w-[292px] lg:w-[292px] ${promo.imageClass}`}
          />
          <PromoArc />
          <div className="relative flex flex-1 flex-col items-end gap-3 px-5 py-6 text-right sm:ml-[46%] sm:py-[37px] sm:pl-0 sm:pr-[30px]">
            <h2 className="text-lg font-bold leading-6">
              {promo.title[0]}
              <br />
              {promo.title[1]}
            </h2>
            <p className="max-w-[263px] text-sm leading-6 text-text-secondary">{promo.text}</p>
            <Link
              to="/mercado"
              search={{ listing: promo.listing }}
              className="mt-auto flex h-11 w-[140px] md:h-10 items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-ink hover:bg-text-accent"
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

// Arco dourado do Figma: dois círculos com centro fora do card, por cima da imagem e recortados pela borda do card.
function PromoArc() {
  return (
    <svg aria-hidden="true" width="586" height="250" viewBox="0 0 586 250" fill="none" className="pointer-events-none absolute left-0 top-0 text-primary max-sm:-top-[74px]">
      <circle cx="-63" cy="270" r="127" stroke="currentColor" strokeWidth="2" />
      <circle cx="-71" cy="262" r="127.5" stroke="currentColor" />
    </svg>
  )
}

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
        {articles.map((post) => (
          <li key={post.slug}>
            <Link
              to="/aprenda/$slug"
              params={{ slug: post.slug }}
              className="group flex h-full flex-col overflow-hidden rounded-lg bg-surface-card transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent"
            >
              <img src={post.image} alt="" width={400} height={195} loading="lazy" className="h-[195px] w-full object-cover" />
              <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3">
                <p className="text-xs font-medium leading-4 text-text-secondary">
                  {post.date}&nbsp;&nbsp;|&nbsp;&nbsp;{post.read}
                </p>
                <h3 className="text-base font-bold text-text-primary">{post.title}</h3>
                <p className="text-xs font-medium leading-4 text-text-secondary">{post.text}</p>
                <p className="mt-auto flex gap-1 text-xs text-text-accent">
                  <span className="font-bold leading-[14px] group-hover:underline">Ler mais</span>
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
