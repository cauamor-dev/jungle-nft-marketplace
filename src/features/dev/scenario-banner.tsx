import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getScenarioLabel, mockSocketAvailable, mocksEnabled, restoreNormalConditions } from '@/lib/demo'
import { scenarioEvent } from '@/mocks/scenario-names'

const scenarioKey = ['demo', 'scenario'] as const

// Mostra quando um cenário simulado (falha, latência, socket derrubado...) está ativo nesta aba,
// para um erro da demonstração nunca parecer um defeito sem explicação.
export function ScenarioBanner() {
  const queryClient = useQueryClient()
  const [restoring, setRestoring] = useState(false)
  const scenario = useQuery({ queryKey: scenarioKey, queryFn: getScenarioLabel, enabled: mocksEnabled, retry: false, staleTime: Infinity })

  useEffect(() => {
    if (!mocksEnabled) return
    const update = (event: Event) => queryClient.setQueryData(scenarioKey, (event as CustomEvent<{ label: string }>).detail.label)
    window.addEventListener(scenarioEvent, update)
    return () => window.removeEventListener(scenarioEvent, update)
  }, [queryClient])

  const label = scenario.data
  if (!mockSocketAvailable) {
    return (
      <p role="status" className="border-b border-primary bg-surface-raised px-4 py-2 text-center text-[13px]" data-testid="insecure-banner">
        Aberto por HTTP fora de localhost: catálogo, conta e compra funcionam, mas o tempo real simulado só roda em HTTPS ou localhost.
      </p>
    )
  }
  if (!label || label === 'happy-path') return null

  async function restore() {
    setRestoring(true)
    try {
      await restoreNormalConditions()
      await queryClient.invalidateQueries()
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-primary bg-surface-raised px-4 py-2 text-center text-[13px]"
      data-testid="scenario-banner"
    >
      <span>
        Cenário simulado ativo nesta aba: <strong className="text-text-accent">{label}</strong>
      </span>
      <button
        type="button"
        onClick={() => void restore()}
        disabled={restoring}
        className="font-bold text-text-accent underline underline-offset-2 hover:text-foreground disabled:opacity-60"
      >
        {restoring ? 'Restaurando…' : 'Restaurar condições normais'}
      </button>
    </div>
  )
}
