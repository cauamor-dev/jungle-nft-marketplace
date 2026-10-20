import type { Network } from '@/api/contracts'
import { addEth, isZeroEth, minEth, multiplyEth, percentOfEth, subtractEth, type DecimalString } from '@/domain/money'
import type { CouponRecord, DbState } from '../db'

export const networkFees: Record<Network, DecimalString> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.0005',
}

export type CouponResult =
  | { status: 'none' }
  | { status: 'valid'; coupon: CouponRecord }
  | { status: 'expired' | 'invalid' }

export function evaluateCoupon(db: DbState, code: string | null): CouponResult {
  if (!code) return { status: 'none' }
  const coupon = db.coupons.find((candidate) => candidate.code === code.trim().toUpperCase())
  if (!coupon) return { status: 'invalid' }
  if (new Date(coupon.expiresAt).getTime() <= Date.now()) return { status: 'expired' }
  return { status: 'valid', coupon }
}

type PricedLine = { unitPriceEth: DecimalString; quantity: number }

export function computeTotals(lines: PricedLine[], coupon: CouponResult, network: Network) {
  const subtotalEth = addEth('0', ...lines.map((line) => multiplyEth(line.unitPriceEth, line.quantity)))
  let discountEth: DecimalString = '0'
  if (coupon.status === 'valid') {
    const { kind, value } = coupon.coupon
    discountEth = kind === 'percent' ? percentOfEth(subtotalEth, Number(value)) : minEth(value, subtotalEth)
  }
  const networkFeeEth = isZeroEth(subtotalEth) ? '0' : networkFees[network]
  const totalEth = addEth(subtractEth(subtotalEth, discountEth), networkFeeEth)
  return { subtotalEth, discountEth, networkFeeEth, totalEth }
}
