import { useState, type ComponentProps } from 'react'
import eyeOff from '@/assets/icons/eye-off.svg'
import { cn } from '@/lib/cn'
import { fieldClass } from './input'

export function PasswordInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input type={visible ? 'text' : 'password'} className={cn(fieldClass, 'pr-11', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 touch-target place-items-center"
      >
        <img src={eyeOff} alt="" className={cn('size-5', visible && 'opacity-50')} />
      </button>
    </div>
  )
}
