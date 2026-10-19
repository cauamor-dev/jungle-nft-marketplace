import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { z } from 'zod'
import { ensSuffixSchema, ensSuffixes, type User } from '@/api/contracts'
import imageIcon from '@/assets/icons/account-image.svg'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Select } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { isApiError } from '@/domain/errors'
import { useSession } from '@/features/auth/session'
import { apiFieldErrors, passwordMessage, passwordRule, readForm, validate, type FieldErrors } from '@/lib/form'
import { AccountLayout } from './account-layout'
import { useChangePassword, useRemoveAvatar, useUpdateProfile, useUploadAvatar } from './queries'

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome de exibição'),
  username: z.string().trim().min(3, 'Use ao menos 3 caracteres').max(30, 'Use até 30 caracteres'),
  email: z.email('Informe um e-mail válido'),
  ensName: z.string().trim().min(2, 'Informe o nome ENS').max(60, 'Use até 60 caracteres'),
  ensSuffix: ensSuffixSchema,
  walletNickname: z.string().trim().min(2, 'Informe o apelido da carteira').max(40, 'Use até 40 caracteres'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: z.string().regex(passwordRule, passwordMessage),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não conferem' })

export function ProfilePage() {
  return (
    <AccountLayout title="Perfil do colecionador">
      <ProfileContent />
    </AccountLayout>
  )
}

function ProfileContent() {
  const { data: session } = useSession()
  if (!session) return <Skeleton className="h-96 w-full" />
  // O formulário reinicia quando o usuário muda, evitando valores de outra conta.
  return <ProfileForm key={session.user.id} user={session.user} />
}

function ProfileForm({ user }: { user: User }) {
  const { notify } = useToast()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const form = event.currentTarget
    const values = readForm(form)

    const profile = validate(profileSchema, values)
    const wantsPassword = Boolean(values.currentPassword || values.newPassword || values.confirmPassword)
    const password = wantsPassword ? validate(passwordSchema, values) : null
    const found = { ...('errors' in profile ? profile.errors : {}), ...(password && 'errors' in password ? password.errors : {}) }
    if (Object.keys(found).length > 0) return setErrors(found)
    if (!('data' in profile)) return

    setErrors({})
    setSaving(true)
    try {
      await updateProfile.mutateAsync(profile.data)
      if (password && 'data' in password) {
        await changePassword.mutateAsync({ currentPassword: password.data.currentPassword, newPassword: password.data.newPassword })
        for (const name of ['currentPassword', 'newPassword', 'confirmPassword']) {
          const input = form.elements.namedItem(name)
          if (input instanceof HTMLInputElement) input.value = ''
        }
      }
      notify('Perfil atualizado.', 'success')
    } catch (error) {
      const fields = apiFieldErrors(error)
      if (Object.keys(fields).length > 0) setErrors(fields)
      setFormError(isApiError(error) ? error.message : 'Não foi possível salvar o perfil agora.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-8" data-testid="profile-form">
      <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
        <Field label="Nome de exibição" required error={errors.name}>
          {(props) => <Input {...props} name="name" defaultValue={user.name} autoComplete="name" />}
        </Field>
        <Field label="Nome de usuário" required error={errors.username}>
          {(props) => <Input {...props} name="username" defaultValue={user.username} autoComplete="username" />}
        </Field>
        <Field label="E-mail" required error={errors.email}>
          {(props) => <Input {...props} name="email" type="email" defaultValue={user.email} autoComplete="email" />}
        </Field>
        <Field label="Nome ENS" required error={errors.ensName}>
          {(props) => (
            <div className="flex gap-2.5">
              <div className="w-[78px] shrink-0">
                <Select name="ensSuffix" aria-label="Sufixo ENS" defaultValue={user.ensSuffix}>
                  {ensSuffixes.map((suffix) => (
                    <option key={suffix} value={suffix}>
                      .{suffix}
                    </option>
                  ))}
                </Select>
              </div>
              <Input {...props} name="ensName" defaultValue={user.ensName} autoComplete="off" />
            </div>
          )}
        </Field>
        <Field label="Apelido da carteira" required error={errors.walletNickname}>
          {(props) => <Input {...props} name="walletNickname" defaultValue={user.walletNickname} autoComplete="off" />}
        </Field>
        <AvatarField user={user} error={errors.avatar} />
      </div>

      <fieldset className="flex max-w-[417px] flex-col gap-6">
        <legend className="mb-6 text-base font-medium leading-4">Alterar senha</legend>
        <Field label="Senha atual" error={errors.currentPassword}>
          {(props) => <PasswordInput {...props} name="currentPassword" autoComplete="current-password" />}
        </Field>
        <Field label="Nova senha" error={errors.newPassword}>
          {(props) => <PasswordInput {...props} name="newPassword" autoComplete="new-password" />}
        </Field>
        <Field label="Confirmar nova senha" error={errors.confirmPassword}>
          {(props) => <PasswordInput {...props} name="confirmPassword" autoComplete="new-password" />}
        </Field>
      </fieldset>

      {formError && (
        <p role="alert" className="text-sm text-text-coral" data-testid="profile-error">
          {formError}
        </p>
      )}
      <Button type="submit" disabled={saving} className="h-10 w-[131px] rounded-[3px] text-sm">
        {saving ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}

function AvatarField({ user, error }: { user: User; error?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()
  const { notify } = useToast()
  const [localError, setLocalError] = useState<string | null>(null)

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setLocalError(null)
    upload.mutate(file, {
      onSuccess: () => notify('Avatar atualizado.', 'success'),
      onError: (failure) => setLocalError(apiFieldErrors(failure).avatar ?? (isApiError(failure) ? failure.message : 'Não foi possível enviar a imagem.')),
    })
  }

  return (
    <div className="flex flex-col gap-2.5" data-testid="avatar-field">
      <p className="text-[15px] leading-[15px]">Avatar</p>
      <div className="flex items-center gap-6">
        <div className="grid size-[50px] shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface-raised">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="Avatar atual" className="size-full object-cover" /> : <img src={imageIcon} alt="" className="size-6" />}
        </div>
        <div className="flex items-center gap-5">
          <Button className="h-10 w-[98px] rounded-[3px] text-sm" onClick={() => input.current?.click()} disabled={upload.isPending}>
            Alterar
          </Button>
          <button
            type="button"
            onClick={() => remove.mutate(undefined, { onSuccess: () => notify('Avatar removido.', 'info') })}
            disabled={!user.avatarUrl || remove.isPending}
            className="text-sm disabled:opacity-50"
          >
            Remover
          </button>
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} className="sr-only" aria-label="Escolher imagem do avatar" tabIndex={-1} />
      </div>
      {(localError ?? error) && (
        <p role="alert" className="text-xs text-text-coral">
          {localError ?? error}
        </p>
      )}
    </div>
  )
}
