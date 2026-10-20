import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'info' | 'success' | 'error'
type Toast = { id: number; message: string; tone: Tone }

type ToastApi = { notify: (message: string, tone?: Tone) => void }

const ToastContext = createContext<ToastApi>({ notify: () => undefined })

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const notify = useCallback((message: string, tone: Tone = 'info') => {
    const id = nextId.current++
    setToasts((current) => [...current.slice(-2), { id, message, tone }])
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 5000)
  }, [])

  const api = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto max-w-md animate-rise-in rounded-md border px-4 py-3 text-sm shadow-lg',
              toast.tone === 'error' && 'border-text-coral bg-surface-card text-text-coral',
              toast.tone === 'success' && 'border-success bg-surface-card text-foreground',
              toast.tone === 'info' && 'border-primary bg-surface-card text-foreground',
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
