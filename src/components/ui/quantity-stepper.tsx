import minus from '@/assets/icons/minus.svg'
import plus from '@/assets/icons/plus.svg'
import { cn } from '@/lib/cn'

type QuantityStepperProps = {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  label: string
  disabled?: boolean
  className?: string
}

export function QuantityStepper({ value, min = 1, max, onChange, label, disabled, className }: QuantityStepperProps) {
  const button =
    'relative grid h-[34px] w-[22px] place-items-center touch-target rounded-full bg-primary text-ink shadow-[0_4px_6px_rgba(20,13,10,0.15)] disabled:opacity-50 md:h-[49.5px] md:w-[33px]'
  return (
    <div role="group" aria-label={label} className={cn('flex items-center gap-3', className)}>
      <button type="button" className={button} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label={`Diminuir ${label}`}>
        <img src={minus} alt="" className="size-4 md:size-[26px]" />
      </button>
      <output aria-live="polite" className="min-w-5 text-center text-base md:text-xl">
        {value}
      </output>
      <button type="button" className={button} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label={`Aumentar ${label}`}>
        <img src={plus} alt="" className="size-4 md:size-[26px]" />
      </button>
    </div>
  )
}
