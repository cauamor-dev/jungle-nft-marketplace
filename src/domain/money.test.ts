import { describe, expect, it } from 'vitest'
import {
  addEth,
  compareEth,
  formatEth,
  isDecimalString,
  multiplyEth,
  normalizeEth,
  percentOfEth,
  subtractEth,
} from './money'

describe('money', () => {
  it('soma sem erro de ponto flutuante', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(addEth('0.1', '0.2')).toBe('0.3')
  })

  it('preserva as 18 casas do ETH', () => {
    expect(addEth('0.000000000000000001', '0.000000000000000002')).toBe('0.000000000000000003')
    expect(multiplyEth('0.000000000000000001', 3)).toBe('0.000000000000000003')
  })

  it('multiplica por quantidade inteira e rejeita fracionária', () => {
    expect(multiplyEth('0.0425', 3)).toBe('0.1275')
    expect(() => multiplyEth('1', 1.5)).toThrow()
  })

  it('calcula porcentagem arredondando para baixo', () => {
    expect(percentOfEth('0.1275', 10)).toBe('0.01275')
    expect(percentOfEth('0.000000000000000019', 10)).toBe('0.000000000000000001')
  })

  it('não deixa a subtração ficar negativa', () => {
    expect(subtractEth('1', '0.25')).toBe('0.75')
    expect(subtractEth('0.1', '0.5')).toBe('0')
  })

  it('compara e normaliza strings decimais', () => {
    expect(compareEth('0.10', '0.1')).toBe(0)
    expect(compareEth('0.2', '0.10')).toBe(1)
    expect(normalizeEth('2.500')).toBe('2.5')
  })

  it('valida o formato aceito', () => {
    expect(isDecimalString('1.5')).toBe(true)
    expect(isDecimalString('1,5')).toBe(false)
    expect(isDecimalString('-1')).toBe(false)
    expect(isDecimalString('1e3')).toBe(false)
  })

  it('formata para exibição sem perder casas relevantes', () => {
    expect(formatEth('1.5')).toBe('1,50')
    expect(formatEth('0.012345')).toBe('0,012345')
  })
})
