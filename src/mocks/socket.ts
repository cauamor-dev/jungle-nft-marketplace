import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { socketEvents } from '@/api/contracts'
import { getDb } from './db'
import { registerConnection, type HubConnection } from './socket-hub'

// O binding só entende o namespace padrão e eventos de texto, e responde ao handshake com um sid fixo.
// Por isso o cliente usa apenas WebSocket (sem long-polling) e a identificação do usuário vai num evento próprio.
// O MSW remove o prefixo /socket.io/ da URL antes de comparar, então o link precisa aceitar qualquer caminho.
const PING_INTERVAL_MS = 25_000
const link = ws.link('*')

let counter = 0

export const socketHandlers = [
  link.addEventListener('connection', async (connection) => {
    // Outros WebSockets da página (como o HMR do Vite no desenvolvimento) seguem para o servidor real.
    if (!connection.client.url.searchParams.has('EIO')) {
      connection.server.connect()
      return
    }

    const db = await getDb()
    if (db.scenario.socketBlocked) {
      connection.client.close(1013, 'indisponível')
      return
    }

    const io = toSocketIo(connection)
    counter += 1
    const hubConnection: HubConnection = {
      id: `socket_${counter}`,
      userId: null,
      subscribed: false,
      send: (event, payload) => io.client.emit(event, payload),
      close: () => connection.client.close(1012, 'reiniciando'),
    }
    const unregister = registerConnection(hubConnection)

    // Sem pings do servidor o engine.io do cliente encerra a conexão após pingInterval + pingTimeout.
    const pingTimer = setInterval(() => connection.client.send('2'), PING_INTERVAL_MS)

    io.client.on(socketEvents.subscribe, async (_event, payload: { token?: string | null } | undefined) => {
      const current = await getDb()
      const session = payload?.token ? current.sessions.find((candidate) => candidate.token === payload.token) : undefined
      const active = session && session.expiresAt > Date.now()
      hubConnection.userId = active ? session.userId : null
      hubConnection.subscribed = true
    })

    connection.client.addEventListener('close', () => {
      clearInterval(pingTimer)
      unregister()
    })
  }),
]
