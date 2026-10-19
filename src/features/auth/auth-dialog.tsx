import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import eyeOff from '@/assets/icons/eye-off.svg'
import facebookLogo from '@/assets/icons/facebook-logo.svg'
import googleLogo from '@/assets/icons/google-logo.svg'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { isApiError } from '@/domain/errors'
import { apiFieldErrors, passwordMessage, passwordRule, readForm, validate, type FieldErrors } from '@/lib/form'
import { cn } from '@/lib/cn'
import type { LoginResponse } from '@/api/contracts'
import * as api from '@/api/endpoints'
import { useAuthDialog, type AuthMode } from './auth-context'
import { useLogin } from './session'

const loginSchema = z.object({
  email: z.email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
})

const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Use ao menos 3 caracteres')
      .max(30, 'Use até 30 caracteres')
      .regex(/^[A-Za-z0-9._-]+$/, 'Use letras, números, ponto, hífen ou sublinhado'),
    email: z.email('Informe um e-mail válido'),
    password: z.string().regex(passwordRule, passwordMessage),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })

const inputClass =
  'h-[50px] w-full rounded-[10px] border border-line bg-transparent px-4 text-sm text-foreground placeholder:text-secondary focus-visible:border-primary aria-[invalid=true]:border-text-coral md:h-10 md:rounded-[5px]'

export function AuthDialog() {
  const { mode, close, setMode, restoreFocus } = useAuthDialog()

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent
        closeLabel="Fechar"
        className="max-md:inset-0 max-md:left-0 max-md:top-0 max-md:h-dvh max-md:max-h-none max-md:w-screen max-md:translate-x-0 max-md:translate-y-0 max-md:border-b-0 max-md:bg-ink md:w-[500px]"
        aria-describedby="auth-description"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          restoreFocus()
        }}
      >
        {mode && <AuthForms mode={mode} onMode={setMode} onDone={close} />}
      </DialogContent>
    </Dialog>
  )
}

function AuthForms({ mode, onMode, onDone }: { mode: AuthMode; onMode: (mode: AuthMode) => void; onDone: () => void }) {
  const isLogin = mode === 'login'
  const title = isLogin ? 'Entrar' : 'Criar perfil de colecionador'
  const description = isLogin
    ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
    : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'

  return (
    <div className="flex min-h-full flex-col px-7 pb-6 pt-20 md:block md:p-0 md:pb-0">
      <div className="mb-10 flex h-[136px] items-center justify-center md:hidden" aria-hidden="true">
        <span className="text-[32px] font-bold tracking-[3.2px] text-foreground">KURIO</span>
      </div>

      <div className="flex flex-col items-center gap-10 md:px-12 md:pt-12">
        <DialogTitle className="text-xl font-bold text-foreground md:sr-only">{title}</DialogTitle>
        <div role="tablist" aria-label="Acesso" className="hidden items-center justify-center gap-2 md:flex">
          <ModeTab active={isLogin} onClick={() => onMode('login')}>
            Entrar
          </ModeTab>
          <span aria-hidden="true" className="h-4 w-px bg-text-coral" />
          <ModeTab active={!isLogin} onClick={() => onMode('register')}>
            Criar conta
          </ModeTab>
        </div>
        <DialogDescription id="auth-description" className="hidden text-center text-[13px] leading-4 text-foreground md:block">
          {description}
        </DialogDescription>
      </div>

      <div className="mt-10 md:mt-0">{isLogin ? <LoginForm onDone={onDone} /> : <RegisterForm onDone={onDone} />}</div>
      <SocialBlock />

      <p className="mt-10 text-center text-[15px] text-text-secondary md:hidden">
        {isLogin ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
        <button type="button" onClick={() => onMode(isLogin ? 'register' : 'login')} className="text-text-accent underline">
          {isLogin ? 'Crie uma conta' : 'Entre'}
        </button>
      </p>
      <div aria-hidden="true" className="hidden h-[10px] bg-primary md:mt-6 md:block" />
    </div>
  )
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn('text-xl font-medium leading-4', active ? 'text-text-accent' : 'text-foreground hover:text-text-accent')}
    >
      {children}
    </button>
  )
}

function PasswordInput({ id, name, error, ...rest }: { id: string; name: string; error: boolean; 'aria-describedby'?: string; autoComplete: string; placeholder?: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        aria-invalid={error}
        className={cn(inputClass, 'pr-11')}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center"
      >
        <img src={eyeOff} alt="" className="size-[18px]" />
      </button>
    </div>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-[5px] border border-text-coral px-3 py-2 text-[13px] text-text-coral">
      {message}
    </p>
  )
}

const submitClass =
  'mt-6 flex h-[60px] w-full items-center justify-center rounded-[10px] bg-primary text-base font-bold text-ink hover:bg-text-accent disabled:opacity-60 md:h-[45px] md:rounded-[5px]'

function announceCartMerge(result: LoginResponse, notify: (message: string, tone?: 'info') => void) {
  if (result.cartMerge.conflicts.length === 0) return
  notify('Nem todos os itens do carrinho de visitante couberam na conta. A quantidade foi ajustada ao estoque ou ao limite da edição.')
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const login = useLogin()
  const { notify } = useToast()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = validate(loginSchema, readForm(event.currentTarget))
    if ('errors' in parsed) return setErrors(parsed.errors)
    setErrors({})
    try {
      const result = await login.mutateAsync(parsed.data)
      announceCartMerge(result, notify)
      onDone()
    } catch (error) {
      setErrors(apiFieldErrors(error))
      setFormError(isApiError(error) ? error.message : 'Não foi possível entrar. Verifique sua conexão e tente de novo.')
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Entrar" className="flex flex-col md:px-20">
      <div className="flex flex-col gap-3 md:pt-6">
        <Field label="E-mail" error={errors.email} className="[&>label]:sr-only">
          {(props) => (
            <input {...props} name="email" type="email" autoComplete="email" placeholder="contato@email.com" className={inputClass} />
          )}
        </Field>
        <Field label="Senha" error={errors.password} className="[&>label]:sr-only">
          {({ id, 'aria-invalid': invalid, 'aria-describedby': describedBy }) => (
            <PasswordInput id={id} name="password" error={invalid} aria-describedby={describedBy} autoComplete="current-password" placeholder="Senha" />
          )}
        </Field>
        <ForgotPassword />
        <FormError message={formError} />
      </div>
      <button type="submit" disabled={login.isPending} className={submitClass}>
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}

function ForgotPassword() {
  const { notify } = useToast()
  return (
    <button
      type="button"
      onClick={() => notify('A recuperação de senha não faz parte desta demonstração.')}
      className="self-end text-sm text-text-accent hover:underline"
    >
      Esqueceu a senha?
    </button>
  )
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const login = useLogin()
  const { notify } = useToast()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = validate(registerSchema, readForm(event.currentTarget))
    if ('errors' in parsed) return setErrors(parsed.errors)
    setErrors({})
    setPending(true)
    try {
      await api.register({ username: parsed.data.username, email: parsed.data.email, password: parsed.data.password })
      const result = await login.mutateAsync({ email: parsed.data.email, password: parsed.data.password })
      announceCartMerge(result, notify)
      onDone()
    } catch (error) {
      setErrors(apiFieldErrors(error))
      setFormError(isApiError(error) ? error.message : 'Não foi possível criar a conta. Tente de novo.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Criar conta" className="flex flex-col md:px-20">
      <div className="flex flex-col gap-3 md:pt-6">
        <Field label="Nome de usuário" error={errors.username} className="[&>label]:sr-only">
          {(props) => <input {...props} name="username" autoComplete="username" placeholder="Nome de usuário" className={inputClass} />}
        </Field>
        <Field label="E-mail" error={errors.email} className="[&>label]:sr-only">
          {(props) => <input {...props} name="email" type="email" autoComplete="email" placeholder="Digite seu e-mail" className={inputClass} />}
        </Field>
        <Field label="Senha" error={errors.password} className="[&>label]:sr-only">
          {({ id, 'aria-invalid': invalid, 'aria-describedby': describedBy }) => (
            <PasswordInput id={id} name="password" error={invalid} aria-describedby={describedBy} autoComplete="new-password" placeholder="Senha" />
          )}
        </Field>
        <Field label="Confirmar senha" error={errors.confirmPassword} className="[&>label]:sr-only">
          {({ id, 'aria-invalid': invalid, 'aria-describedby': describedBy }) => (
            <PasswordInput id={id} name="confirmPassword" error={invalid} aria-describedby={describedBy} autoComplete="new-password" placeholder="Confirmar senha" />
          )}
        </Field>
        <FormError message={formError} />
      </div>
      <button type="submit" disabled={pending} className={submitClass}>
        {pending ? 'Criando…' : 'Criar conta'}
      </button>
    </form>
  )
}

function SocialBlock() {
  const { notify } = useToast()
  const unavailable = () => notify('O acesso social não está disponível nesta demonstração. Use e-mail e senha.')
  return (
    <div className="mt-10 flex flex-col gap-3 md:mt-6 md:border-t md:border-line md:pt-6">
      <div className="flex items-center gap-2.5 md:gap-3">
        <span aria-hidden="true" className="h-px flex-1 bg-line-soft" />
        <span className="text-[13px] text-foreground">Ou continue com</span>
        <span aria-hidden="true" className="h-px flex-1 bg-line-soft" />
      </div>
      <div className="flex flex-col gap-4 md:gap-3 md:px-20">
        <SocialButton icon={googleLogo} label="Continuar com Google" onClick={unavailable} />
        <SocialButton icon={facebookLogo} label="Continuar com Facebook" onClick={unavailable} />
      </div>
    </div>
  )
}

function SocialButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full items-center justify-center gap-3 rounded-[5px] border border-line text-[13px] font-medium text-text-secondary hover:bg-surface-raised"
    >
      <img src={icon} alt="" className="size-5" />
      {label}
    </button>
  )
}
