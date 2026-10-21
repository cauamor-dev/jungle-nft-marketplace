import { Link } from '@tanstack/react-router'
import nextIcon from '@/assets/icons/pagination-next.svg'
import { cn } from '@/lib/cn'
import { scrollToResults } from './scroll'
import type { CatalogSearch } from './search'

type PaginationProps = {
  page: number
  totalPages: number
  search: CatalogSearch
  to: '/' | '/mercado'
}

export function Pagination({ page, totalPages, search, to }: PaginationProps) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
  const pageSearch = (target: number) => ({ ...search, page: target > 1 ? target : undefined })
  const base = 'relative grid size-[35px] touch-target place-items-center rounded-[4px] text-lg leading-4'

  return (
    <nav aria-label="Paginação" className="self-end">
      <ul className="flex items-center gap-2">
        {page > 1 && (
          <li>
            <Link to={to} search={pageSearch(page - 1)} resetScroll={false} onClick={scrollToResults} aria-label="Página anterior" className={cn(base, 'border border-line')}>
              <img src={nextIcon} alt="" className="w-3 rotate-90" />
            </Link>
          </li>
        )}
        {pages.map((target) => (
          <li key={target}>
            <Link
              to={to}
              search={pageSearch(target)}
              resetScroll={false}
              onClick={scrollToResults}
              aria-label={`Página ${target}`}
              aria-current={target === page ? 'page' : undefined}
              className={cn(base, target === page ? 'bg-primary font-bold text-ink' : 'border border-line text-foreground hover:border-primary')}
            >
              {target}
            </Link>
          </li>
        ))}
        {page < totalPages && (
          <li>
            <Link to={to} search={pageSearch(page + 1)} resetScroll={false} onClick={scrollToResults} aria-label="Próxima página" className={cn(base, 'border border-line')}>
              <img src={nextIcon} alt="" className="w-3 -rotate-90" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
