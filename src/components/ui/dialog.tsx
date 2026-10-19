import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import closeIcon from '@/assets/icons/close.svg'
import { cn } from '@/lib/cn'

export const Dialog = DialogPrimitive.Root
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

type ContentProps = ComponentProps<typeof DialogPrimitive.Content> & { children: ReactNode; closeLabel?: string }

export function DialogContent({ className, children, closeLabel = 'Fechar', ...props }: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/75" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto border-b-[6px] border-primary bg-surface-card shadow-2xl',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-sm hover:bg-primary/15"
        >
          <img src={closeIcon} alt="" className="size-3.5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
