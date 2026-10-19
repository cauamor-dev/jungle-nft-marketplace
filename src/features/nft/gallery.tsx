import { useState } from 'react'
import type { NftImage } from '@/api/contracts'
import zoomIcon from '@/assets/icons/zoom.svg'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'

type GalleryProps = { images: NftImage[]; title: string; unavailable: boolean }

export function Gallery({ images, title, unavailable }: GalleryProps) {
  const [index, setIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const current = images[index] ?? images[0]
  if (!current) return null

  return (
    <div className="flex gap-7">
      <ul className="hidden w-[100px] shrink-0 flex-col gap-4 md:flex" aria-label="Miniaturas">
        {images.map((image, position) => (
          <li key={`${image.thumbSrc}-${position}`}>
            <button
              type="button"
              onClick={() => setIndex(position)}
              aria-label={`Ver imagem ${position + 1} de ${images.length}`}
              aria-current={position === index ? 'true' : undefined}
              className={cn('block size-[100px] overflow-hidden rounded-lg border bg-surface-card', position === index ? 'border-primary' : 'border-transparent')}
            >
              <img src={image.thumbSrc} alt="" width={100} height={100} loading="lazy" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative grid aspect-square w-full place-items-center rounded-[24px] bg-surface-card p-3 md:size-[444px] md:rounded-md md:p-4">
        <img
          src={current.src}
          alt={current.alt}
          width={800}
          height={800}
          fetchPriority="high"
          className={cn('size-full rounded-[24px] object-cover', unavailable && 'opacity-60 grayscale')}
        />
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Ampliar imagem"
          className="absolute right-4 top-4 hidden size-[30px] place-items-center rounded-full bg-ink/80 hover:bg-ink md:grid"
        >
          <img src={zoomIcon} alt="" className="size-4" />
        </button>
      </div>

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="w-[min(92vw,720px)] p-3">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">Imagem ampliada do NFT</DialogDescription>
          <img src={current.src} alt={current.alt} className="aspect-square w-full rounded-lg object-cover" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
