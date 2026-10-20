import { describe, expect, it } from 'vitest'
import { centsToDecimal, decimalToCents, formatRange, PRICE_MAX, PRICE_MIN } from './price-range'

describe('faixa de preço', () => {
  it('converte centésimos em decimal sem ponto flutuante', () => {
    expect(centsToDecimal(2)).toBe('0.02')
    expect(centsToDecimal(119)).toBe('1.19')
    expect(centsToDecimal(1230)).toBe('12.30')
  })

  it('lê decimais da URL e respeita os limites', () => {
    expect(decimalToCents('1.5', 0)).toBe(150)
    expect(decimalToCents('0.001', 99)).toBe(PRICE_MIN)
    expect(decimalToCents('99', 5)).toBe(PRICE_MAX)
    expect(decimalToCents(undefined, 77)).toBe(77)
  })

  it('formata como no design', () => {
    expect(formatRange(2, 1230)).toBe('0,02 - 12,30 ETH')
  })
})
