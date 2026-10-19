import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'

// Ícone monocromático a partir de um SVG: a cor vem do texto, então estados ativo/inativo trocam só a classe.
export function MaskIcon({ src, className }: { src: string; className?: string }) {
  // Ícones pequenos viram data URI no build; sem aspas o espaço e os parênteses invalidam o url().
  const url = `url(${JSON.stringify(src)})`
  const style: CSSProperties = {
    maskImage: url,
    WebkitMaskImage: url,
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
  }
  return <span aria-hidden="true" style={style} className={cn('inline-block size-5 bg-current', className)} />
}
