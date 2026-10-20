import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
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
