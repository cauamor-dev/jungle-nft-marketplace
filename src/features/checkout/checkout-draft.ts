const PREFIX = 'jg-checkout-draft:'

export type CheckoutDraft = {
  walletId: string | null
  values: Record<string, string>
}

// Rascunho do formulário por usuário: sobrevive a refresh e a sessão expirada, mas não à saída da conta.
export function loadDraft(userId: string): CheckoutDraft | null {
  const raw = sessionStorage.getItem(PREFIX + userId)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CheckoutDraft
  } catch {
    return null
  }
}

export function saveDraft(userId: string, draft: CheckoutDraft) {
  sessionStorage.setItem(PREFIX + userId, JSON.stringify(draft))
}

export function clearDrafts(userId?: string) {
  if (userId) {
    sessionStorage.removeItem(PREFIX + userId)
    return
  }
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith(PREFIX)) sessionStorage.removeItem(key)
  }
}
