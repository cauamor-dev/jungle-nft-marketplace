import type { OrderStatus } from '@/api/contracts'

export const terminalStatuses: OrderStatus[] = ['confirmed', 'rejected']

export function isTerminal(status: OrderStatus) {
  return terminalStatuses.includes(status)
}

// Só `pending` avança; confirmado e recusado nunca mudam.
export function canTransition(from: OrderStatus, to: OrderStatus) {
  return from === 'pending' && isTerminal(to)
}
