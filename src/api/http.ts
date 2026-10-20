import axios, { AxiosError } from 'axios'
import { apiErrorSchema } from './contracts'
import { ApiError, NetworkError } from '@/domain/errors'
import { getGuestId, getSessionToken, notifySessionInvalid } from './session-storage'

export const http = axios.create({
  timeout: 10_000,
  // category=a&category=b em vez de category[]=a
  paramsSerializer: { indexes: null },
})

http.interceptors.request.use((config) => {
  const token = getSessionToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  config.headers.set('X-Guest-Id', getGuestId())
  return config
})

http.interceptors.response.use(undefined, (error: unknown) => {
  if (!(error instanceof AxiosError) || axios.isCancel(error)) throw error

  if (!error.response) {
    throw new NetworkError(error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
  }

  const parsed = apiErrorSchema.safeParse(error.response.data)
  const body = parsed.success
    ? parsed.data
    : { code: 'UNKNOWN_ERROR', message: 'Não foi possível concluir a operação.' }
  const apiError = new ApiError(error.response.status, body)

  // Um 401 de uma requisição feita com o token de uma sessão anterior não derruba a sessão atual.
  const sentWith = error.config?.headers?.get('Authorization')
  const current = getSessionToken()
  const sameSession = current !== null && sentWith === `Bearer ${current}`
  if (apiError.status === 401 && sameSession && (apiError.code === 'SESSION_EXPIRED' || apiError.code === 'UNAUTHENTICATED')) {
    notifySessionInvalid()
  }
  throw apiError
})
