import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { isApiError } from '@/domain/errors'
import { useLogin, useLogout, useSession } from '@/features/auth/session'
import { useNftDetail } from '@/features/nft/queries'
import { useRealtimeActivity } from '@/features/realtime/realtime-provider'
import { applyScenario, resetDemo, restoreNormalConditions } from '@/lib/demo'
import { scenarioNames } from '@/mocks/scenario-names'

// Painel técnico dos mocks: seleciona cenários e mostra a atividade do Socket.IO. Não faz parte do layout do Figma.
export function MockPanelPage() {
  const queryClient = useQueryClient()
  const session = useSession()
  const login = useLogin()
  const logout = useLogout()
  const activity = useRealtimeActivity()
  const nft = useNftDetail('nft_01')
  const [notice, setNotice] = useState<string | null>(null)

  // Cenários que repetem eventos respondem 409 quando ainda não há evento: vira aviso no painel.
  function runScenario(name: string) {
    setNotice(null)
    applyScenario(name).then(
      () => setNotice(`Cenário ${name} aplicado.`),
      (error: unknown) => setNotice(isApiError(error) ? error.message : `Não foi possível aplicar ${name}.`),
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-xl font-semibold">Painel dos mocks</h1>
      <p className="text-sm text-text-secondary">
        Painel técnico da demonstração. Os cenários valem só para esta aba (uma aba nova começa normal) e ficam
        indicados no topo da página enquanto estiverem ativos.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-primary px-3 py-1.5 text-sm font-bold text-ink"
          onClick={() => void restoreNormalConditions().then(() => queryClient.invalidateQueries())}
        >
          Restaurar condições normais
        </button>
        <button
          type="button"
          className="rounded border border-primary px-3 py-1.5 text-sm font-bold text-text-accent"
          onClick={() => void resetDemo().then(() => queryClient.resetQueries())}
        >
          Restaurar tudo (dados e cenário)
        </button>
      </div>

      <section aria-labelledby="session-title" className="space-y-2">
        <h2 id="session-title" className="font-medium">Sessão</h2>
        <p data-testid="session-user">{session.data ? session.data.user.email : 'visitante'}</p>
        <div className="flex flex-wrap gap-2">
          {['demo1@example.test', 'demo2@example.test'].map((email) => (
            <button
              key={email}
              type="button"
              className="rounded border px-3 py-1"
              onClick={() => login.mutate({ email, password: 'Demo@1234' })}
            >
              Entrar como {email.split('@')[0]}
            </button>
          ))}
          <button type="button" className="rounded border px-3 py-1" onClick={() => logout.mutate()}>
            Sair
          </button>
        </div>
      </section>

      <section aria-labelledby="nft-title" className="space-y-2">
        <h2 id="nft-title" className="font-medium">nft_01 (REST + eventos)</h2>
        {nft.data ? (
          <p data-testid="nft-state">
            {nft.data.title}: {nft.data.priceEth} ETH, versão {nft.data.version}
          </p>
        ) : (
          <p>Carregando</p>
        )}
        <button type="button" className="rounded border px-3 py-1" onClick={() => void queryClient.invalidateQueries()}>
          Recarregar da API
        </button>
      </section>

      <section aria-labelledby="scenario-title" className="space-y-2">
        <h2 id="scenario-title" className="font-medium">Cenários</h2>
        <div className="flex flex-wrap gap-2">
          {scenarioNames.map((name) => (
            <button key={name} type="button" className="rounded border px-2 py-1 text-sm" onClick={() => runScenario(name)}>
              {name}
            </button>
          ))}
        </div>
        <p role="status" className="text-sm text-text-secondary" data-testid="scenario-notice">
          {notice}
        </p>
      </section>

      <section aria-labelledby="activity-title" className="space-y-2">
        <h2 id="activity-title" className="font-medium">Atividade do socket</h2>
        <ol data-testid="activity-log" aria-live="polite" className="space-y-1 font-mono text-sm">
          {activity.map((entry, index) => (
            <li key={index} data-kind={entry.kind}>
              {entry.kind}
              {'eventName' in entry ? ` ${entry.eventName} ${entry.resource ?? ''} v${entry.version ?? '?'}` : ''}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
