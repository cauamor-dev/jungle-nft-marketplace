import { HttpResponse } from 'msw'
import { z } from 'zod'
import {
  ensSuffixSchema,
  evmAddressPattern,
  networkSchema,
  referralCodePattern,
  walletTypeSchema,
} from '@/api/contracts'
import { nextId, persist, type DbState, type WalletRecord } from '../db'
import { MockHttpError } from '../http-error'
import { requireSession, toUser, validatePassword } from '../services/auth'
import { hashPassword, verifyPassword } from '../services/passwords'
import { parseBody, readJson, route } from './route'

const MAX_AVATAR_BYTES = 512 * 1024
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome de exibição'),
  username: z.string().trim().min(3, 'Use ao menos 3 caracteres').max(30, 'Use até 30 caracteres'),
  email: z.email('E-mail inválido'),
  ensName: z.string().trim().min(2, 'Informe o nome ENS').max(60, 'Use até 60 caracteres'),
  ensSuffix: ensSuffixSchema,
  walletNickname: z.string().trim().min(2, 'Informe o apelido da carteira').max(40, 'Use até 40 caracteres'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: z.string(),
})

const walletSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição'),
  label: z.string().trim().min(2, 'Informe o apelido da carteira').max(40, 'Use até 40 caracteres'),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil'),
  address: z.string().regex(evmAddressPattern, 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais'),
  secondaryAddress: z.string().trim().max(120, 'Use até 120 caracteres'),
  network: networkSchema,
  walletType: walletTypeSchema,
  referralCode: z.string().regex(referralCodePattern, 'Use de 4 a 20 letras, números ou hífen'),
  email: z.email('E-mail inválido'),
  ensName: z.string().trim().min(2, 'Informe o nome ENS'),
  ensSuffix: ensSuffixSchema,
  kind: z.enum(['primary', 'secondary']),
})

function toPublicWallet({ userId: _userId, ...wallet }: WalletRecord) {
  return wallet
}

function userWallets(db: DbState, userId: string) {
  return db.wallets.filter((wallet) => wallet.userId === userId)
}

function findOwnWallet(db: DbState, userId: string, id: string) {
  const wallet = db.wallets.find((candidate) => candidate.id === id)
  if (!wallet) throw new MockHttpError(404, 'WALLET_NOT_FOUND', 'Carteira não encontrada.')
  if (wallet.userId !== userId) throw new MockHttpError(403, 'FORBIDDEN', 'Você não tem acesso a esta carteira.')
  return wallet
}

function validateWalletRules(
  db: DbState,
  userId: string,
  input: z.infer<typeof walletSchema>,
  ignoreId: string | null,
) {
  const others = userWallets(db, userId).filter((wallet) => wallet.id !== ignoreId)
  if (others.some((wallet) => wallet.address.toLowerCase() === input.address.toLowerCase())) {
    throw new MockHttpError(409, 'WALLET_DUPLICATED', 'Esta carteira já está cadastrada.', {
      fieldErrors: { address: 'Você já cadastrou este endereço.' },
    })
  }
  if (others.some((wallet) => wallet.kind === input.kind)) {
    const label = input.kind === 'primary' ? 'principal' : 'secundária'
    throw new MockHttpError(409, 'WALLET_KIND_TAKEN', `Você já tem uma carteira ${label}.`, {
      fieldErrors: { kind: `Já existe uma carteira ${label}. Edite a existente.` },
    })
  }
  if (input.kind === 'secondary' && !others.some((wallet) => wallet.kind === 'primary')) {
    throw new MockHttpError(422, 'PRIMARY_WALLET_REQUIRED', 'Cadastre a carteira principal primeiro.', {
      fieldErrors: { kind: 'Cadastre a carteira principal antes da secundária.' },
    })
  }
}

export const accountHandlers = [
  route('get', '/api/profile', async ({ db, request }) => {
    const { user } = requireSession(db, request)
    return { ...toUser(user) }
  }),

  route('patch', '/api/profile', async ({ db, request }) => {
    const { user } = requireSession(db, request)
    const input = parseBody(profileSchema, await readJson(request))
    const email = input.email.toLowerCase()
    if (db.users.some((other) => other.id !== user.id && other.email === email)) {
      throw new MockHttpError(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail.', {
        fieldErrors: { email: 'Este e-mail já está em uso.' },
      })
    }
    if (db.users.some((other) => other.id !== user.id && other.username.toLowerCase() === input.username.toLowerCase())) {
      throw new MockHttpError(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', {
        fieldErrors: { username: 'Este nome de usuário já está em uso.' },
      })
    }
    Object.assign(user, {
      name: input.name,
      username: input.username,
      email,
      ensName: input.ensName,
      ensSuffix: input.ensSuffix,
      walletNickname: input.walletNickname,
    })
    persist()
    return { ...toUser(user) }
  }),

  route('post', '/api/profile/avatar', async ({ db, request }) => {
    const { user } = requireSession(db, request)
    const form = await request.formData()
    const file = form.get('avatar')
    if (!(file instanceof Blob)) {
      throw new MockHttpError(422, 'VALIDATION_ERROR', 'Envie uma imagem.', { fieldErrors: { avatar: 'Selecione uma imagem.' } })
    }
    if (!AVATAR_TYPES.includes(file.type)) {
      throw new MockHttpError(422, 'VALIDATION_ERROR', 'Formato não suportado.', {
        fieldErrors: { avatar: 'Use PNG, JPEG ou WebP.' },
      })
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new MockHttpError(422, 'VALIDATION_ERROR', 'Imagem grande demais.', {
        fieldErrors: { avatar: 'A imagem deve ter até 512 KB.' },
      })
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    user.avatarUrl = `data:${file.type};base64,${btoa(binary)}`
    persist()
    return { ...toUser(user) }
  }),

  route('delete', '/api/profile/avatar', async ({ db, request }) => {
    const { user } = requireSession(db, request)
    user.avatarUrl = null
    persist()
    return { ...toUser(user) }
  }),

  route('put', '/api/profile/password', async ({ db, request }) => {
    const { user } = requireSession(db, request)
    const input = parseBody(passwordSchema, await readJson(request))
    if (!(await verifyPassword(input.currentPassword, user.passwordSalt, user.passwordHash))) {
      throw new MockHttpError(422, 'VALIDATION_ERROR', 'Senha atual incorreta.', {
        fieldErrors: { currentPassword: 'A senha atual não confere.' },
      })
    }
    const passwordError = validatePassword(input.newPassword)
    if (passwordError) {
      throw new MockHttpError(422, 'VALIDATION_ERROR', 'Verifique os campos informados.', {
        fieldErrors: { newPassword: passwordError },
      })
    }
    const { salt, hash } = await hashPassword(input.newPassword)
    user.passwordSalt = salt
    user.passwordHash = hash
    persist()
    return null
  }),

  route('get', '/api/wallets', async ({ db, request }) => {
    const { user } = requireSession(db, request)
    return { items: userWallets(db, user.id).map(toPublicWallet) }
  }),

  route('post', '/api/wallets', async ({ db, request }) => {
    const { user } = requireSession(db, request)
    const input = parseBody(walletSchema, await readJson(request))
    validateWalletRules(db, user.id, input, null)
    const wallet: WalletRecord = { id: nextId(db, 'wallet'), userId: user.id, ...input, connection: 'disconnected' }
    db.wallets.push(wallet)
    persist()
    return HttpResponse.json(toPublicWallet(wallet), { status: 201 })
  }),

  route('patch', '/api/wallets/:id', async ({ db, request, params }) => {
    const { user } = requireSession(db, request)
    const wallet = findOwnWallet(db, user.id, params.id)
    const input = parseBody(walletSchema, await readJson(request))
    validateWalletRules(db, user.id, input, wallet.id)
    Object.assign(wallet, input)
    persist()
    return { ...toPublicWallet(wallet) }
  }),

  route('post', '/api/wallets/:id/connect', async ({ db, request, params }) => {
    const { user } = requireSession(db, request)
    const wallet = findOwnWallet(db, user.id, params.id)
    if (db.scenario.walletRefusal) {
      throw new MockHttpError(403, 'WALLET_REJECTED', 'A carteira recusou a conexão.')
    }
    const body = parseBody(z.object({ provider: walletTypeSchema.optional() }), await readJson(request).catch(() => ({})))
    wallet.connection = 'connected'
    if (body.provider) wallet.walletType = body.provider
    persist()
    return { ...toPublicWallet(wallet) }
  }),

  route('post', '/api/wallets/:id/disconnect', async ({ db, request, params }) => {
    const { user } = requireSession(db, request)
    const wallet = findOwnWallet(db, user.id, params.id)
    wallet.connection = 'disconnected'
    persist()
    return { ...toPublicWallet(wallet) }
  }),
]
