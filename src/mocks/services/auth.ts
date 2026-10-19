import type { User } from '@/api/contracts'
import { persist, type DbState, type SessionRecord, type UserRecord } from '../db'
import { MockHttpError } from '../http-error'

export const SESSION_TTL_MS = 2 * 60 * 60 * 1000

export function toUser(user: UserRecord): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    ensName: user.ensName,
    ensSuffix: user.ensSuffix,
    walletNickname: user.walletNickname,
    avatarUrl: user.avatarUrl,
  }
}

export function createSession(db: DbState, userId: string): SessionRecord {
  const session = { token: crypto.randomUUID(), userId, expiresAt: Date.now() + SESSION_TTL_MS }
  db.sessions.push(session)
  persist()
  return session
}

export function readBearerToken(request: Request) {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
}

export function findSession(db: DbState, request: Request) {
  const token = readBearerToken(request)
  if (!token) return null
  const session = db.sessions.find((candidate) => candidate.token === token)
  if (!session) throw new MockHttpError(401, 'UNAUTHENTICATED', 'Sessão inválida. Entre novamente.')
  if (session.expiresAt <= Date.now()) {
    throw new MockHttpError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  }
  const user = db.users.find((candidate) => candidate.id === session.userId)
  if (!user) throw new MockHttpError(401, 'UNAUTHENTICATED', 'Sessão inválida. Entre novamente.')
  return { session, user }
}

export function requireSession(db: DbState, request: Request) {
  const found = findSession(db, request)
  if (!found) throw new MockHttpError(401, 'UNAUTHENTICATED', 'É preciso entrar para continuar.')
  return found
}

export function readGuestId(request: Request) {
  return request.headers.get('X-Guest-Id') ?? 'anonymous'
}

export function expireAllSessions(db: DbState) {
  for (const session of db.sessions) session.expiresAt = Date.now() - 1
  persist()
}

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

export function validatePassword(password: string) {
  return PASSWORD_RULE.test(password) ? null : 'A senha precisa de 8 caracteres, com letras e números.'
}
