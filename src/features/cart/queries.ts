import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'
import type { AddCartItemInput, Cart, Network } from '@/api/contracts'
import { useOwner, useSession } from '@/features/auth/session'

export function useCart(network?: Network) {
  const owner = useOwner()
  // Espera a sessão resolver: antes disso o dono seria o visitante e o carrinho da conta cairia na chave errada.
  const { isPending: sessionPending } = useSession()
  return useQuery({
    queryKey: queryKeys.private(owner).cart(network),
    queryFn: ({ signal }) => api.getCart(network, { signal }),
    enabled: !sessionPending,
  })
}

export function useCartCount() {
  const { data } = useCart()
  return data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
}

// Qualquer mudança no carrinho invalida todas as variações por rede e a cotação em uso.
function useCartMutation<TInput>(mutationFn: (input: TInput) => Promise<Cart>) {
  const queryClient = useQueryClient()
  const owner = useOwner()
  return useMutation({
    mutationFn,
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.private(owner).cart(), cart)
      void queryClient.invalidateQueries({ queryKey: queryKeys.private(owner).cartRoot })
      void queryClient.invalidateQueries({ queryKey: queryKeys.private(owner).quote })
    },
  })
}

export const useAddToCart = () => useCartMutation((input: AddCartItemInput) => api.addCartItem(input))
export const useUpdateCartItem = () =>
  useCartMutation(({ key, quantity }: { key: string; quantity: number }) => api.updateCartItem(key, quantity))
export const useRemoveCartItem = () => useCartMutation((key: string) => api.removeCartItem(key))
export const useApplyCoupon = () => useCartMutation((code: string) => api.applyCoupon(code))
export const useRemoveCoupon = () => useCartMutation(() => api.removeCoupon())
