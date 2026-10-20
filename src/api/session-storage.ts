import { randomId } from '@/lib/random-id'

const TOKEN_KEY = 'jg-session-token'
const GUEST_KEY = 'jg-guest-id'

type Listener = () => void
const invalidListeners = new Set<Listener>()

export function getSessionToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setSessionToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearSessionToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// Identifica o visitante para o carrinho anônimo, que é migrado para a conta no login.
export function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY)
  if (!id) {
    id = randomId()
    localStorage.setItem(GUEST_KEY, id)
  }
  return id
}

export function onSessionInvalid(listener: Listener) {
  invalidListeners.add(listener)
  return () => {
    invalidListeners.delete(listener)
  }
}

export function notifySessionInvalid() {
  for (const listener of invalidListeners) listener()
}
