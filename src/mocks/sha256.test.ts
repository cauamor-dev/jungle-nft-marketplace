import { describe, expect, it } from 'vitest'
import { pbkdf2Sha256, sha256Bytes } from './services/sha256'

const hex = (bytes: Uint8Array | ArrayBuffer) => Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
const encode = (text: string) => new TextEncoder().encode(text)

// A versão em JS puro roda fora de contexto seguro; precisa bater byte a byte com o WebCrypto.
describe('sha256 e pbkdf2 sem WebCrypto', () => {
  it('sha256 confere com o vetor conhecido e com o WebCrypto', async () => {
    expect(hex(sha256Bytes(encode('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    for (const text of ['', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'pedido çãé ✓'.repeat(20)]) {
      expect(hex(sha256Bytes(encode(text)))).toBe(hex(await crypto.subtle.digest('SHA-256', encode(text))))
    }
  })

  it('pbkdf2 confere com o WebCrypto', async () => {
    const salt = Uint8Array.from({ length: 16 }, (_, index) => index * 7)
    for (const [password, iterations] of [['Demo@1234', 1000], ['x'.repeat(80), 3]] as const) {
      const key = await crypto.subtle.importKey('raw', encode(password), 'PBKDF2', false, ['deriveBits'])
      const expected = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
      expect(hex(pbkdf2Sha256(encode(password), salt, iterations))).toBe(hex(expected))
    }
  })
})
