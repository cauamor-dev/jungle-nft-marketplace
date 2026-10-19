import { HttpResponse } from 'msw'
import { z } from 'zod'
import { nextId, persist } from '../db'
import { MockHttpError } from '../http-error'
import { hashPassword, verifyPassword } from '../services/passwords'
import { createSession, readBearerToken, readGuestId, requireSession, toUser, validatePassword } from '../services/auth'
import { findCart, getOrCreateCart, mergeGuestCart } from '../services/cart'
import { parseBody, readJson, route } from './route'

const registerSchema = z.object({
  username: z.string().trim().min(3, 'Use ao menos 3 caracteres').max(30, 'Use até 30 caracteres').regex(/^[A-Za-z0-9._-]+$/, 'Use letras, números, ponto, hífen ou sublinhado'),
  email: z.email('E-mail inválido'),
  password: z.string(),
})

const loginSchema = z.object({
  email: z.email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})

export const authHandlers = [
  route('post', '/api/auth/register', async ({ db, request }) => {
    const input = parseBody(registerSchema, await readJson(request))
    const passwordError = validatePassword(input.password)
    if (passwordError) {
      throw new MockHttpError(422, 'VALIDATION_ERROR', 'Verifique os campos informados.', {
        fieldErrors: { password: passwordError },
      })
    }
    const email = input.email.toLowerCase()
    if (db.scenario.registrationConflict || db.users.some((user) => user.email === email)) {
      throw new MockHttpError(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail.', {
        fieldErrors: { email: 'Este e-mail já está em uso.' },
      })
    }
    if (db.users.some((user) => user.username.toLowerCase() === input.username.toLowerCase())) {
      throw new MockHttpError(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', {
        fieldErrors: { username: 'Este nome de usuário já está em uso.' },
      })
    }
    const { salt, hash } = await hashPassword(input.password)
    const user = {
      id: nextId(db, 'user'),
      email,
      name: input.username,
      username: input.username,
      ensName: '',
      ensSuffix: 'eth' as const,
      walletNickname: '',
      avatarUrl: null,
      passwordSalt: salt,
      passwordHash: hash,
    }
    db.users.push(user)
    persist()
    return HttpResponse.json({ user: toUser(user) }, { status: 201 })
  }),

  route('post', '/api/auth/login', async ({ db, request }) => {
    const input = parseBody(loginSchema, await readJson(request))
    const user = db.users.find((candidate) => candidate.email === input.email.toLowerCase())
    const valid = user && (await verifyPassword(input.password, user.passwordSalt, user.passwordHash))
    if (!user || !valid) {
      throw new MockHttpError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    }

    const session = createSession(db, user.id)
    const guestCart = findCart(db, { userId: null, guestId: readGuestId(request) })
    const cartMerge =
      guestCart && guestCart.lines.length > 0
        ? mergeGuestCart(db, guestCart, getOrCreateCart(db, { userId: user.id, guestId: '' }))
        : { mergedItems: 0, conflicts: [] }

    return {
      token: session.token,
      session: { user: toUser(user), expiresAt: new Date(session.expiresAt).toISOString() },
      cartMerge,
    }
  }),

  route('get', '/api/auth/session', async ({ db, request }) => {
    const { session, user } = requireSession(db, request)
    return { user: toUser(user), expiresAt: new Date(session.expiresAt).toISOString() }
  }),

  route('post', '/api/auth/logout', async ({ db, request }) => {
    const token = readBearerToken(request)
    db.sessions = db.sessions.filter((session) => session.token !== token)
    persist()
    return null
  }),
]
