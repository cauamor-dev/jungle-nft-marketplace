import type { z } from 'zod'
import { isApiError } from '@/domain/errors'

export type FieldErrors = Record<string, string>

// Primeiro erro de cada campo, na mesma forma que a API devolve em fieldErrors.
export function validate<T extends z.ZodType>(schema: T, values: unknown): { data: z.infer<T> } | { errors: FieldErrors } {
  const result = schema.safeParse(values)
  if (result.success) return { data: result.data }
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.')
    errors[key] ??= issue.message
  }
  return { errors }
}

export function apiFieldErrors(error: unknown): FieldErrors {
  return isApiError(error) && error.fieldErrors ? error.fieldErrors : {}
}

export function readForm(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries([...new FormData(form).entries()].map(([key, value]) => [key, String(value)]))
}

export const passwordRule = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/
export const passwordMessage = 'A senha precisa de 8 caracteres, com letras e números.'
