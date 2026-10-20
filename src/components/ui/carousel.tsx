import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type CarouselProps = {
  label: string
  children: ReactNode
  className?: string
}

// Faixa com scroll-snap nativo. Os pontos refletem as "páginas" visíveis e levam até elas.
export function Carousel({ label, children, className }: CarouselProps) {
  const track = useRef<HTMLUListElement>(null)
  const [pages, setPages] = useState(1)
  const [current, setCurrent] = useState(0)

  const measure = useCallback(() => {
    const element = track.current
    if (!element) return
    const total = Math.max(1, Math.ceil((element.scrollWidth - 2) / element.clientWidth))
    setPages(total)
    const maxScroll = element.scrollWidth - element.clientWidth
    const ratio = maxScroll > 0 ? element.scrollLeft / maxScroll : 0
    setCurrent(Math.round(ratio * (total - 1)))
  }, [])

  useEffect(() => {
    measure()
    const element = track.current
    if (!element) return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [measure, children])

  function goTo(page: number) {
    const element = track.current
    if (!element) return
    const maxScroll = element.scrollWidth - element.clientWidth
    element.scrollTo({ left: pages > 1 ? (maxScroll * page) / (pages - 1) : 0, behavior: 'smooth' })
  }

  return (
    <div className={cn('flex flex-col items-center gap-8', className)} role="region" aria-roledescription="carrossel" aria-label={label}>
      <ul
        ref={track}
        onScroll={measure}
        tabIndex={0}
        className="scrollbar-none flex w-full snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth focus-visible:outline-offset-4 md:gap-[26px]"
      >
        {children}
      </ul>
      {pages > 1 && (
        <div className="flex gap-3" role="group" aria-label="Páginas do carrossel">
          {Array.from({ length: pages }, (_, page) => (
            <button
              key={page}
              type="button"
              onClick={() => goTo(page)}
              aria-label={`Ir para a página ${page + 1}`}
              aria-current={page === current ? 'true' : undefined}
              className={cn('size-3 rounded-full border-[1.3px] border-primary', page === current && 'bg-primary')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CarouselItem({ children, className }: { children: ReactNode; className?: string }) {
  return <li className={cn('w-[44%] shrink-0 snap-start md:w-[219px]', className)}>{children}</li>
}
