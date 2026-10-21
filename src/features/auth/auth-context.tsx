import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSession } from './session'

export type AuthMode = 'login' | 'register'

type AuthContextValue = {
  mode: AuthMode | null
  open: (mode?: AuthMode) => void
  close: () => void
  setMode: (mode: AuthMode) => void
  restoreFocus: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const open = useCallback((next: AuthMode = 'login') => {
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) opener.current = document.activeElement
    setMode(next)
  }, [])
  const close = useCallback(() => setMode(null), [])
  const restoreFocus = useCallback(() => {
    if (opener.current?.isConnected) opener.current.focus()
    opener.current = null
  }, [])
  const value = useMemo(() => ({ mode, open, close, setMode, restoreFocus }), [mode, open, close, restoreFocus])
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuthDialog() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuthDialog precisa estar dentro de AuthDialogProvider')
  return value
}

// Ação que exige conta: sem sessão abre o login e, quando a pessoa entra, executa a ação na hora (com o estado
// já da conta nova). Fechar o login sem entrar descarta a intenção.
export function useRequireAuth(action: () => void) {
  const { data: session } = useSession()
  const { open, mode } = useAuthDialog()
  const latest = useRef(action)
  const pending = useRef(false)
  const dialogShown = useRef(false)

  useEffect(() => {
    latest.current = action
  })

  useEffect(() => {
    if (!pending.current) return
    if (session) {
      pending.current = false
      latest.current()
    } else if (mode) dialogShown.current = true
    else if (dialogShown.current) {
      dialogShown.current = false
      pending.current = false
    }
  }, [session, mode])

  return useCallback(() => {
    if (session) return action()
    pending.current = true
    dialogShown.current = false
    open('login')
  }, [session, open, action])
}
