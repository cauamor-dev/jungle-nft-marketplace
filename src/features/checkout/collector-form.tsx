import type { ChangeEvent, ReactNode } from 'react'
import { ensSuffixes, networks, walletTypes, type EnsSuffix, type Network, type WalletType } from '@/api/contracts'
import { Field } from '@/components/ui/field'
import { Input, Select, Textarea } from '@/components/ui/input'
import { networkLabels } from '@/lib/categories'
import type { FieldErrors } from '@/lib/form'
import { walletTypeLabels } from '@/lib/wallets'

export type CollectorValues = {
  displayName: string
  username: string
  profileName: string
  email: string
  ensName: string
  ensSuffix: EnsSuffix
  referralCode: string
  walletType: WalletType
  walletAddress: string
  secondaryAddress: string
  note: string
  network: Network | ''
}

type CollectorFormProps = {
  values: CollectorValues
  errors: FieldErrors
  onChange: <K extends keyof CollectorValues>(field: K, value: CollectorValues[K]) => void
  otherWallets: ReactNode
}

// Campos do perfil do colecionador. `otherWallets` é o bloco opcional "Usar outra carteira?".
export function CollectorForm({ values, errors, onChange, otherWallets }: CollectorFormProps) {
  const text = (field: keyof CollectorValues) => ({
    name: field,
    value: values[field],
    onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(field, event.target.value as never),
  })

  return (
    <div className="grid gap-x-6 gap-y-3 md:grid-cols-2" data-testid="collector-form">
      <Field label="Nome de exibição" required error={errors.displayName}>
        {(props) => <Input {...props} {...text('displayName')} autoComplete="name" />}
      </Field>
      <Field label="Nome de usuário" required error={errors.username}>
        {(props) => <Input {...props} {...text('username')} autoComplete="username" />}
      </Field>

      <Field label="Rede" required error={errors.network}>
        {(props) => (
          <Select
            {...props}
            name="network"
            required
            value={values.network}
            onChange={(event) => onChange('network', event.target.value as Network)}
          >
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
        {(props) => <Input {...props} {...text('profileName')} />}
      </Field>

      <Field label="Endereço da carteira" required error={errors.walletAddress}>
        {(props) => <Input {...props} {...text('walletAddress')} placeholder="Endereço 0x da carteira" autoComplete="off" spellCheck={false} />}
      </Field>
      <Field label="Carteira secundária" error={errors.secondaryAddress} className="[&>label]:sr-only md:justify-end">
        {(props) => <Input {...props} {...text('secondaryAddress')} placeholder="ENS ou carteira secundária (opcional)" autoComplete="off" />}
      </Field>

      <Field label="Tipo de carteira" required error={errors.walletType}>
        {(props) => (
          <Select
            {...props}
            name="walletType"
            value={values.walletType}
            onChange={(event) => onChange('walletType', event.target.value as WalletType)}
          >
            {walletTypes.map((type) => (
              <option key={type} value={type}>
                {walletTypeLabels[type]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Código de indicação (opcional)" error={errors.referralCode}>
        {(props) => <Input {...props} {...text('referralCode')} autoComplete="off" />}
      </Field>

      <Field label="E-mail" required error={errors.email}>
        {(props) => <Input {...props} {...text('email')} type="email" autoComplete="email" />}
      </Field>
      <Field label="Nome ENS" required error={errors.ensName}>
        {(props) => (
          <div className="flex gap-2.5">
            <div className="w-[78px] shrink-0">
              <Select
                name="ensSuffix"
                aria-label="Sufixo ENS"
                value={values.ensSuffix}
                onChange={(event) => onChange('ensSuffix', event.target.value as EnsSuffix)}
              >
                {ensSuffixes.map((suffix) => (
                  <option key={suffix} value={suffix}>
                    .{suffix}
                  </option>
                ))}
              </Select>
            </div>
            <Input {...props} {...text('ensName')} autoComplete="off" />
          </div>
        )}
      </Field>

      {otherWallets && <div className="md:col-span-2">{otherWallets}</div>}

      <Field label="Observação do colecionador (opcional)" error={errors.note} className="md:col-span-2 md:max-w-[350px]">
        {(props) => (
          <Textarea
            {...props}
            name="note"
            value={values.note}
            onChange={(event) => onChange('note', event.target.value)}
            rows={5}
            className="min-h-[152px]"
          />
        )}
      </Field>
    </div>
  )
}
