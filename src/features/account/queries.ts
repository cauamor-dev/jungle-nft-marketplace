import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'
import type { ChangePasswordInput, UpdateProfileInput, Wallet, WalletInput, WalletType } from '@/api/contracts'
import { useOwner, useSession } from '@/features/auth/session'

export function useWallets() {
  const owner = useOwner()
  const { data: session } = useSession()
  return useQuery({
    queryKey: queryKeys.private(owner).wallets,
    queryFn: ({ signal }) => api.listWallets({ signal }),
    enabled: Boolean(session),
  })
}

function useWalletMutation<TInput>(mutationFn: (input: TInput) => Promise<Wallet>) {
  const queryClient = useQueryClient()
  const owner = useOwner()
  return useMutation({
    mutationFn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.private(owner).wallets }),
  })
}

export const useCreateWallet = () => useWalletMutation((input: WalletInput) => api.createWallet(input))
export const useUpdateWallet = () =>
  useWalletMutation(({ id, input }: { id: string; input: WalletInput }) => api.updateWallet(id, input))
export const useConnectWallet = () =>
  useWalletMutation(({ id, provider }: { id: string; provider?: WalletType }) => api.connectWallet(id, provider))
export const useDisconnectWallet = () => useWalletMutation((id: string) => api.disconnectWallet(id))

// A sessão guarda o usuário; depois de alterar o perfil, os dois lugares precisam refletir o novo valor.
function useProfileMutation<TInput>(mutationFn: (input: TInput) => ReturnType<typeof api.getProfile>) {
  const queryClient = useQueryClient()
  const owner = useOwner()
  return useMutation({
    mutationFn,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.private(owner).profile, user)
      queryClient.setQueryData(queryKeys.session, (session: { user: unknown; expiresAt: string } | null | undefined) =>
        session ? { ...session, user } : session,
      )
    },
  })
}

export const useUpdateProfile = () => useProfileMutation((input: UpdateProfileInput) => api.updateProfile(input))
export const useUploadAvatar = () => useProfileMutation((file: File) => api.uploadAvatar(file))
export const useRemoveAvatar = () => useProfileMutation(() => api.removeAvatar())
export const useChangePassword = () => useMutation({ mutationFn: (input: ChangePasswordInput) => api.changePassword(input) })
