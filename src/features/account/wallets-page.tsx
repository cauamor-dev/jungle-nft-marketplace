import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import {
  ensSuffixSchema,
  ensSuffixes,
  evmAddressPattern,
  networkSchema,
  networks,
  referralCodePattern,
  walletTypeSchema,
  walletTypes,
  type Wallet,
  type WalletInput,
} from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { isApiError } from '@/domain/errors'
import { apiFieldErrors, readForm, validate, type FieldErrors } from '@/lib/form'
import { networkLabels } from '@/lib/categories'
import { walletTypeLabels } from '@/lib/wallets'
import { AccountLayout } from './account-layout'
import { useConnectWallet, useCreateWallet, useDisconnectWallet, useUpdateWallet, useWallets } from './queries'

const walletFormSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição'),
  label: z.string().trim().min(2, 'Informe o apelido da carteira').max(40, 'Use até 40 caracteres'),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil'),
  address: z.string().regex(evmAddressPattern, 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais'),
  secondaryAddress: z.string().trim().max(120, 'Use até 120 caracteres'),
  network: networkSchema,
  walletType: walletTypeSchema,
  referralCode: z.string().regex(referralCodePattern, 'Use de 4 a 20 letras, números ou hífen'),
  email: z.email('Informe um e-mail válido'),
  ensName: z.string().trim().min(2, 'Informe o nome ENS'),
  ensSuffix: ensSuffixSchema,
})

export function WalletsPage() {
  return (
    <AccountLayout title="Carteiras">
      <WalletsContent />
    </AccountLayout>
  )
}

function WalletsContent() {
  const wallets = useWallets()
  if (wallets.isPending) return <Skeleton className="h-96 w-full" />
  if (wallets.error || !wallets.data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3" data-testid="wallets-error">
        <p className="text-sm text-text-coral">Não foi possível carregar suas carteiras.</p>
        <Button variant="outline" onClick={() => void wallets.refetch()}>
          Tentar de novo
        </Button>
      </div>
    )
  }
  const primary = wallets.data.items.find((wallet) => wallet.kind === 'primary')
  const secondary = wallets.data.items.find((wallet) => wallet.kind === 'secondary')

  return (
    <div className="flex flex-col gap-12">
      <WalletSection kind="primary" wallet={primary} primary={primary} />
      <WalletSection kind="secondary" wallet={secondary} primary={primary} />
    </div>
  )
}

type SectionProps = { kind: 'primary' | 'secondary'; wallet: Wallet | undefined; primary: Wallet | undefined }

function WalletSection({ kind, wallet, primary }: SectionProps) {
  const isPrimary = kind === 'primary'
  const [adding, setAdding] = useState(false)
  const [copyPrimary, setCopyPrimary] = useState(false)
  const showForm = Boolean(wallet) || adding || (isPrimary && !wallet)
  const title = isPrimary ? 'Carteira principal' : 'Carteira secundária'
  const blockedBySecondaryRule = !isPrimary && !primary

  return (
    <section aria-labelledby={`${kind}-title`} className="flex flex-col gap-6" data-testid={`wallet-${kind}`}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <h2 id={`${kind}-title`} className="text-base font-bold leading-4">
            {title}
          </h2>
          {!isPrimary && !wallet && (
            <div className="flex items-center gap-3 text-sm">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 md:min-h-0">
                <input type="checkbox" checked={copyPrimary} onChange={(event) => setCopyPrimary(event.target.checked)} disabled={!primary} className="check-control" />
                Igual à carteira principal
              </label>
              <button type="button" onClick={() => setAdding(true)} disabled={blockedBySecondaryRule} className="relative font-bold text-text-accent touch-target disabled:opacity-50">
                Adicionar
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-secondary">
          {isPrimary
            ? 'Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.'
            : wallet
              ? 'Carteira alternativa para pagamento e recebimento.'
              : blockedBySecondaryRule
                ? 'Cadastre a carteira principal antes de adicionar uma secundária.'
                : 'Você ainda não adicionou uma carteira secundária.'}
        </p>
      </div>
      {showForm && (
        <WalletForm
          key={`${wallet?.id ?? 'new'}-${copyPrimary ? 'copy' : 'blank'}`}
          kind={kind}
          wallet={wallet}
          template={!wallet && copyPrimary ? primary : undefined}
          onCreated={() => setAdding(false)}
        />
      )}
    </section>
  )
}

type WalletFormProps = { kind: 'primary' | 'secondary'; wallet?: Wallet; template?: Wallet; onCreated: () => void }

function WalletForm({ kind, wallet, template, onCreated }: WalletFormProps) {
  const { notify } = useToast()
  const create = useCreateWallet()
  const update = useUpdateWallet()
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const source = wallet ?? template
  const pending = create.isPending || update.isPending

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = validate(walletFormSchema, readForm(event.currentTarget))
    if ('errors' in parsed) return setErrors(parsed.errors)
    setErrors({})
    const input: WalletInput = { ...parsed.data, kind }
    try {
      if (wallet) await update.mutateAsync({ id: wallet.id, input })
      else {
        await create.mutateAsync(input)
        onCreated()
      }
      notify('Carteira salva.', 'success')
    } catch (error) {
      const fields = apiFieldErrors(error)
      if (Object.keys(fields).length > 0) setErrors(fields)
      setFormError(isApiError(error) ? error.message : 'Não foi possível salvar a carteira agora.')
    }
  }

  function toggleConnection() {
    if (!wallet) return
    const request = wallet.connection === 'connected' ? disconnect.mutateAsync(wallet.id) : connect.mutateAsync({ id: wallet.id })
    request
      .then((updated) => notify(updated.connection === 'connected' ? 'Carteira conectada.' : 'Carteira desconectada.', 'success'))
      .catch((error: unknown) => notify(isApiError(error) ? error.message : 'Não foi possível alterar a conexão.', 'error'))
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6" data-testid={`wallet-form-${kind}`}>
      <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
        <Field label="Nome de exibição" required error={errors.displayName}>
          {(props) => <Input {...props} name="displayName" defaultValue={source?.displayName} autoComplete="off" />}
        </Field>
        <Field label="Apelido da carteira" required error={errors.label}>
          {(props) => <Input {...props} name="label" defaultValue={source?.label ?? (kind === 'primary' ? 'Principal' : 'Reserva')} autoComplete="off" />}
        </Field>
        <Field label="Rede" required error={errors.network}>
          {(props) => (
            <Select {...props} name="network" required defaultValue={source?.network ?? ''}>
              <option value="" disabled>
                Selecione uma rede
              </option>
              {networks.map((network) => (
                <option key={network} value={network}>
                  {networkLabels[network]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Nome do perfil" required error={errors.profileName}>
          {(props) => <Input {...props} name="profileName" defaultValue={source?.profileName} autoComplete="off" />}
        </Field>
        <Field label="Endereço da carteira" required error={errors.address}>
          {(props) => <Input {...props} name="address" defaultValue={wallet?.address} placeholder="Endereço 0x da carteira" autoComplete="off" spellCheck={false} />}
        </Field>
        <Field label="Carteira secundária (opcional)" error={errors.secondaryAddress} className="md:justify-end [&>label]:sr-only">
          {(props) => <Input {...props} name="secondaryAddress" defaultValue={source?.secondaryAddress} placeholder="ENS ou carteira secundária (opcional)" autoComplete="off" />}
        </Field>
        <Field label="Tipo de carteira" required error={errors.walletType}>
          {(props) => (
            <Select {...props} name="walletType" required defaultValue={source?.walletType ?? ''}>
              <option value="" disabled>
                Selecione uma carteira
              </option>
              {walletTypes.map((type) => (
                <option key={type} value={type}>
                  {walletTypeLabels[type]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Código de indicação (opcional)" error={errors.referralCode}>
          {(props) => <Input {...props} name="referralCode" defaultValue={source?.referralCode} autoComplete="off" />}
        </Field>
        <Field label="E-mail" required error={errors.email}>
          {(props) => <Input {...props} name="email" type="email" defaultValue={source?.email} autoComplete="email" />}
        </Field>
        <Field label="Nome ENS" required error={errors.ensName}>
          {(props) => (
            <div className="flex gap-2.5">
              <div className="w-[78px] shrink-0">
                <Select name="ensSuffix" aria-label="Sufixo ENS" defaultValue={source?.ensSuffix ?? 'eth'}>
                  {ensSuffixes.map((suffix) => (
                    <option key={suffix} value={suffix}>
                      .{suffix}
                    </option>
                  ))}
                </Select>
              </div>
              <Input {...props} name="ensName" defaultValue={source?.ensName} autoComplete="off" />
            </div>
          )}
        </Field>
      </div>

      {formError && (
        <p role="alert" className="text-sm text-text-coral" data-testid="wallet-error">
          {formError}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending} className="h-11 rounded-[3px] px-4 text-sm md:h-10">
          {pending ? 'Salvando…' : 'Salvar carteira'}
        </Button>
        {wallet && (
          <>
            <Button variant="outline" className="h-11 rounded-[3px] px-4 text-sm md:h-10" onClick={toggleConnection} disabled={connect.isPending || disconnect.isPending}>
              {wallet.connection === 'connected' ? 'Desconectar' : 'Conectar'}
            </Button>
            <p className="text-sm text-text-secondary" data-testid="wallet-connection">
              {wallet.connection === 'connected' ? 'Conectada' : 'Desconectada'}
            </p>
          </>
        )}
      </div>
    </form>
  )
}
