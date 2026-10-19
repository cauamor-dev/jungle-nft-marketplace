import { useQueryClient } from '@tanstack/react-query'
import { useLogin, useLogout, useSession } from '@/features/auth/session'
import { useNftDetail } from '@/features/nft/queries'
import { useRealtimeActivity } from '@/features/realtime/realtime-provider'
import { scenarioNames } from '@/mocks/scenario-names'

async function demoRequest(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return response.json()
}

// Painel técnico dos mocks: seleciona cenários e mostra a atividade do Socket.IO. Não faz parte do layout do Figma.
export function MockPanelPage() {
  const queryClient = useQueryClient()
  const session = useSession()
  const login = useLogin()
  const logout = useLogout()
  const activity = useRealtimeActivity()
  const nft = useNftDetail('nft_01')

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-xl font-semibold">Painel dos mocks</h1>

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
            <button key={name} type="button" className="rounded border px-2 py-1 text-sm" onClick={() => void demoRequest('/__demo/scenario', { name })}>
              {name}
            </button>
          ))}
          <button type="button" className="rounded border px-2 py-1 text-sm" onClick={() => void demoRequest('/__demo/reset')}>
            reset
          </button>
        </div>
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
    </main>
  )
}
