import { pbkdf2Sha256, sha256Bytes } from './sha256'

// Hash com salt via WebCrypto (ou a versão em JS puro fora de contexto seguro). É suficiente para a
// simulação: senhas nunca ficam em claro no store, mas isto não substitui um backend seguro.
const ITERATIONS = 100_000

const subtle = () => (typeof crypto !== 'undefined' ? crypto.subtle : undefined)

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string) {
  const pairs = hex.match(/.{2}/g) ?? []
  return Uint8Array.from(pairs, (pair) => parseInt(pair, 16))
}

async function derive(password: string, salt: Uint8Array) {
  const webCrypto = subtle()
  if (!webCrypto) return toHex(pbkdf2Sha256(new TextEncoder().encode(password), salt, ITERATIONS))
  const key = await webCrypto.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await webCrypto.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITERATIONS },
    key,
    256,
  )
  return toHex(new Uint8Array(bits))
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { salt: toHex(salt), hash: await derive(password, salt) }
}

export async function verifyPassword(password: string, salt: string, hash: string) {
  return (await derive(password, fromHex(salt))) === hash
}

export async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text)
  const webCrypto = subtle()
  if (!webCrypto) return toHex(sha256Bytes(bytes))
  return toHex(new Uint8Array(await webCrypto.digest('SHA-256', bytes)))
}
