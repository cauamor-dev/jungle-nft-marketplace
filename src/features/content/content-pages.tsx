import { Link, useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'
import { articles } from './articles'
import { helpSections } from './help'

export function ArticlePage({ slug }: { slug: string }) {
  const article = articles.find((candidate) => candidate.slug === slug)
  if (!article) {
    return (
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-6 py-24 text-center" data-testid="article-not-found">
        <h1 className="text-2xl font-bold">Artigo não encontrado</h1>
        <Link to="/" hash="blog" className="text-text-accent underline">
          Ver todos os artigos
        </Link>
      </div>
    )
  }
  const others = articles.filter((candidate) => candidate.slug !== slug).slice(0, 3)

  return (
    <article className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-6 pt-8" data-testid="article">
      <nav aria-label="Trilha de navegação" className="text-[15px] font-bold leading-4">
        <Link to="/" className="hover:text-text-accent">Início</Link> /{' '}
        <Link to="/" hash="blog" className="hover:text-text-accent">Diário da Cunhagem</Link>
      </nav>
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium text-text-secondary">
          {article.date}&nbsp;&nbsp;|&nbsp;&nbsp;{article.read}
        </p>
        <h1 className="text-[28px] font-bold leading-tight">{article.title}</h1>
        <p className="text-base text-text-secondary">{article.text}</p>
      </header>
      <img src={article.image} alt="" width={400} height={300} className="aspect-[2/1] w-full rounded-lg object-cover" />
      <div className="flex flex-col gap-4 text-[15px] leading-7">
        {article.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <section aria-labelledby="more-articles" className="mt-6 flex flex-col gap-4 border-t-[0.3px] border-primary pt-6">
        <h2 id="more-articles" className="text-lg font-bold">Continue lendo</h2>
        <ul className="flex flex-col gap-3">
          {others.map((other) => (
            <li key={other.slug}>
              <Link to="/aprenda/$slug" params={{ slug: other.slug }} className="inline-flex min-h-11 items-center text-text-accent hover:underline md:min-h-0">
                {other.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}

export function HelpPage() {
  const { hash } = useLocation()

  // A página carrega sob demanda: quando ela monta, o router já tentou rolar até a âncora e não achou a seção
  useEffect(() => {
    if (hash) document.getElementById(hash)?.scrollIntoView({ block: 'start' })
  }, [hash])

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-6 pt-8 lg:flex-row lg:gap-16 xl:px-0" data-testid="help">
      <nav aria-label="Tópicos da ajuda" className="lg:sticky lg:top-6 lg:w-[260px] lg:self-start">
        <h1 className="mb-4 text-[28px] font-bold">Ajuda</h1>
        <ul className="flex flex-wrap gap-x-5 lg:flex-col">
          {helpSections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="inline-flex min-h-11 items-center text-[15px] text-text-accent hover:underline lg:min-h-0 lg:leading-9">
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex max-w-[680px] flex-1 flex-col gap-10">
        {helpSections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="flex scroll-mt-6 flex-col gap-3">
            <h2 id={`${section.id}-title`} className="text-lg font-bold">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-[15px] leading-7 text-text-secondary">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
