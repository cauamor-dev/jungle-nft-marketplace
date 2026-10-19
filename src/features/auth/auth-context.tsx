import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useSession } from './session'

export type AuthMode = 'login' | 'register'

type AuthContextValue = {
  mode: AuthMode | null
  open: (mode?: AuthMode) => void
  close: () => void
  setMode: (mode: AuthMode) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode | null>(null)
  const open = useCallback((next: AuthMode = 'login') => setMode(next), [])
  const close = useCallback(() => setMode(null), [])
  const value = useMemo(() => ({ mode, open, close, setMode }), [mode, open, close])
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuthDialog() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuthDialog precisa estar dentro de AuthDialogProvider')
  return value
}

// Executa a ação se houver sessão; sem sessão abre o diálogo de login.
export function useRequireAuth() {
  const { data: session } = useSession()
  const { open } = useAuthDialog()
  return useCallback(
    (action: () => void) => {
      if (session) action()
      else open('login')
    },
    [session, open],
  )
}
