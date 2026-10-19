import Decimal from 'decimal.js'

// ETH tem 18 casas. Os valores circulam como string decimal; Decimal só aparece dentro destas funções.
const ETH_DECIMALS = 18
const EthDecimal = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_DOWN })

export type DecimalString = string

const DECIMAL_PATTERN = /^\d+(\.\d{1,18})?$/

export function isDecimalString(value: string): value is DecimalString {
  return DECIMAL_PATTERN.test(value)
}

function toDecimal(value: DecimalString) {
  if (!isDecimalString(value)) throw new Error(`Valor ETH inválido: ${value}`)
  return new EthDecimal(value)
}

function toEth(value: Decimal) {
  return value.toDecimalPlaces(ETH_DECIMALS, Decimal.ROUND_DOWN).toFixed()
}

export function addEth(...values: DecimalString[]): DecimalString {
  return toEth(values.reduce((sum, value) => sum.plus(toDecimal(value)), new EthDecimal(0)))
}

export function subtractEth(a: DecimalString, b: DecimalString): DecimalString {
  const result = toDecimal(a).minus(toDecimal(b))
  return toEth(result.isNegative() ? new EthDecimal(0) : result)
}

export function multiplyEth(value: DecimalString, quantity: number): DecimalString {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('Quantidade deve ser inteira e não negativa')
  return toEth(toDecimal(value).times(quantity))
}

export function percentOfEth(value: DecimalString, percent: number): DecimalString {
  return toEth(toDecimal(value).times(percent).div(100))
}

export function minEth(a: DecimalString, b: DecimalString): DecimalString {
  return toDecimal(a).lessThanOrEqualTo(toDecimal(b)) ? toEth(toDecimal(a)) : toEth(toDecimal(b))
}

export function compareEth(a: DecimalString, b: DecimalString): -1 | 0 | 1 {
  return toDecimal(a).comparedTo(toDecimal(b)) as -1 | 0 | 1
}

export function isZeroEth(value: DecimalString) {
  return toDecimal(value).isZero()
}

export function normalizeEth(value: DecimalString): DecimalString {
  return toEth(toDecimal(value))
}

export function formatEth(value: DecimalString, minimumFractionDigits = 2): string {
  const [integer, fraction = ''] = normalizeEth(value).split('.')
  return `${integer},${fraction.padEnd(minimumFractionDigits, '0')}`
}

// Valor como aparece nas telas: ponto decimal e ao menos duas casas ("1.19", "0.016").
export function displayEth(value: DecimalString, minimumFractionDigits = 2): string {
  return formatEth(value, minimumFractionDigits).replace(',', '.')
}

// Desconto como no design: "(-) 00.00" quando não há cupom, "(-) 2.68 ETH" quando há.
export function displayDiscount(value: DecimalString): string {
  return isZeroEth(value) ? '(-) 00.00' : `(-) ${displayEth(value)} ETH`
}
