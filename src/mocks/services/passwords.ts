// Hash com salt via WebCrypto. É suficiente para a simulação: senhas nunca ficam em claro no store,
// mas isto não substitui um backend seguro.
const ITERATIONS = 100_000

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string) {
  const pairs = hex.match(/.{2}/g) ?? []
  return Uint8Array.from(pairs, (pair) => parseInt(pair, 16))
}

async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
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
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return toHex(new Uint8Array(digest))
}
