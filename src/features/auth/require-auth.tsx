import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthDialog } from './auth-context'
import { useSession } from './session'

type RequireAuthProps = { title: string; description: string; children: ReactNode }

// Rota privada: sem sessão mostra o aviso e abre o login; ao entrar, renderiza a página no mesmo lugar.
export function RequireAuth({ title, description, children }: RequireAuthProps) {
  const { data: session, isPending } = useSession()
  const { open } = useAuthDialog()
  const asked = useRef(false)

  // Abre o login uma vez por ausência de sessão; fechar o diálogo não deve reabri-lo.
  useEffect(() => {
    if (session) asked.current = false
    else if (!isPending && !asked.current) {
      asked.current = true
      open('login')
    }
  }, [isPending, session, open])

  if (isPending) {
    return (
      <div role="status" aria-label="Verificando sessão" className="mx-auto max-w-[1200px] px-6 pt-10">
        <Skeleton className="h-10 w-1/3" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-6 py-24 text-center" data-testid="auth-required">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="max-w-md text-sm text-text-secondary">{description}</p>
        <Button onClick={() => open('login')}>Entrar</Button>
      </div>
    )
  }

  return children
}
