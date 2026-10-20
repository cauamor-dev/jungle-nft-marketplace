// A faixa de preço é manipulada em centésimos de ETH (inteiros) para não depender de ponto flutuante.
export const PRICE_MIN = 2
export const PRICE_MAX = 1230

export function centsToDecimal(cents: number): string {
  const whole = Math.floor(cents / 100)
  const fraction = String(cents % 100).padStart(2, '0')
  return `${whole}.${fraction}`
}

export function decimalToCents(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const [whole, fraction = ''] = value.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2))
  return Number.isFinite(cents) ? Math.min(PRICE_MAX, Math.max(PRICE_MIN, cents)) : fallback
}

export function formatRange(minCents: number, maxCents: number): string {
  const format = (cents: number) => centsToDecimal(cents).replace('.', ',')
  return `${format(minCents)} - ${format(maxCents)} ETH`
}
