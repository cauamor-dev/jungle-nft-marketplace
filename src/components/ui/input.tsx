import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export const fieldClass =
  'h-11 w-full rounded-[3px] md:h-10 border border-line bg-ink px-3 text-sm text-foreground placeholder:text-secondary/80 focus-visible:border-primary aria-[invalid=true]:border-text-coral disabled:opacity-60'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldClass, className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldClass, 'h-auto min-h-24 py-2', className)} {...props} />
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        className={cn(
          fieldClass,
          'cursor-pointer appearance-none bg-surface-card pr-8 text-secondary invalid:text-secondary/80 [&:not(:invalid)]:text-foreground',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 8"
        className="pointer-events-none absolute right-3 top-1/2 h-2 w-3 -translate-y-1/2 text-secondary"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 1.5l5 5 5-5" />
      </svg>
    </div>
  )
}
