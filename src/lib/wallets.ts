import type { WalletType } from '@/api/contracts'

export const walletTypeLabels: Record<WalletType, string> = {
  walletconnect: 'WalletConnect',
  metamask: 'MetaMask',
  coinbase: 'Coinbase Wallet',
}

export const walletTypeInitials: Record<WalletType, string> = {
  walletconnect: 'W',
  metamask: 'M',
  coinbase: 'C',
}

export function shortAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}
