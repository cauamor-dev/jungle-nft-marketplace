import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type FieldProps = {
  label: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string; 'aria-required'?: boolean }) => ReactNode
}

// Associa rótulo, mensagem de erro e controle sem repetir ids em cada formulário.
export function Field({ label, required, error, hint, className, children }: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm text-foreground">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-text-coral">
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': message ? messageId : undefined,
        'aria-required': required || undefined,
      })}
      {message && (
        <p id={messageId} role={error ? 'alert' : undefined} className={cn('text-xs', error ? 'text-text-coral' : 'text-secondary')}>
          {message}
        </p>
      )}
    </div>
  )
}
