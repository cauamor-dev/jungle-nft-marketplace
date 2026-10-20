import { http } from '@/api/http'

// Rotas de apoio da demonstração (MSW). Ficam fora de /api e não passam pelas falhas simuladas.
export const mocksEnabled = import.meta.env.VITE_ENABLE_MOCKS !== 'false'

// Fora de HTTPS/localhost o MSW roda sem service worker e, na versão 2.15, não intercepta WebSocket nesse
// modo. REST continua funcionando; o Socket.IO simulado não.
export const mockSocketAvailable = !mocksEnabled || (typeof window !== 'undefined' && window.isSecureContext)

export async function getScenarioLabel() {
  const { data } = await http.get<{ scenario: { label: string } }>('/__demo/state')
  return data.scenario.label
}

export const applyScenario = (name: string, params?: Record<string, unknown>) => http.post('/__demo/scenario', { name, params })

// Volta latência, falhas e socket ao normal sem apagar carrinho, pedidos e sessão.
export const restoreNormalConditions = () => applyScenario('happy-path')

// Restaura o estado inicial completo: dados e cenário.
export const resetDemo = () => http.post('/__demo/reset')
