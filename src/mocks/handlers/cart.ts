import { HttpResponse } from 'msw'
import { z } from 'zod'
import { networkSchema } from '@/api/contracts'
import { MockHttpError } from '../http-error'
import { findSession, readGuestId } from '../services/auth'
import { addLine, buildCartView, getOrCreateCart, removeLine, setLineQuantity, touch } from '../services/cart'
import { evaluateCoupon } from '../services/pricing'
import { parseBody, readJson, route, type RouteContext } from './route'

const addItemSchema = z.object({
  nftId: z.string().min(1),
  editionId: z.string().min(1),
  quantity: z.number().int('Quantidade deve ser inteira').positive('Quantidade deve ser maior que zero'),
})

const quantitySchema = z.object({
  quantity: z.number().int('Quantidade deve ser inteira').positive('Quantidade deve ser maior que zero'),
})

const couponSchema = z.object({ code: z.string().trim().min(1, 'Informe o cupom') })

function cartFor({ db, request }: RouteContext) {
  const found = findSession(db, request)
  return getOrCreateCart(db, { userId: found?.user.id ?? null, guestId: readGuestId(request) })
}

function networkFrom(url: URL) {
  const parsed = networkSchema.safeParse(url.searchParams.get('network') ?? 'ethereum')
  return parsed.success ? parsed.data : 'ethereum'
}

export const cartHandlers = [
  route('get', '/api/cart', async (context) => ({ ...buildCartView(context.db, cartFor(context), networkFrom(context.url)) })),

  route('post', '/api/cart/items', async (context) => {
    const input = parseBody(addItemSchema, await readJson(context.request))
    const cart = cartFor(context)
    addLine(context.db, cart, input.nftId, input.editionId, input.quantity)
    return HttpResponse.json(buildCartView(context.db, cart), { status: 201 })
  }),

  route('patch', '/api/cart/items/:key', async (context) => {
    const { quantity } = parseBody(quantitySchema, await readJson(context.request))
    const cart = cartFor(context)
    setLineQuantity(context.db, cart, decodeURIComponent(context.params.key), quantity)
    return { ...buildCartView(context.db, cart) }
  }),

  route('delete', '/api/cart/items/:key', async (context) => {
    const cart = cartFor(context)
    removeLine(cart, decodeURIComponent(context.params.key))
    return { ...buildCartView(context.db, cart) }
  }),

  route('put', '/api/cart/coupon', async (context) => {
    const { code } = parseBody(couponSchema, await readJson(context.request))
    const result = evaluateCoupon(context.db, code)
    if (result.status === 'invalid' || result.status === 'expired') {
      const expired = result.status === 'expired'
      throw new MockHttpError(422, expired ? 'COUPON_EXPIRED' : 'COUPON_INVALID', expired ? 'O cupom expirou.' : 'Cupom inválido.', {
        fieldErrors: { code: expired ? 'Este cupom expirou.' : 'Este cupom não existe.' },
      })
    }
    const cart = cartFor(context)
    cart.couponCode = code.trim().toUpperCase()
    touch(cart)
    return { ...buildCartView(context.db, cart) }
  }),

  route('delete', '/api/cart/coupon', async (context) => {
    const cart = cartFor(context)
    cart.couponCode = null
    touch(cart)
    return { ...buildCartView(context.db, cart) }
  }),
]
