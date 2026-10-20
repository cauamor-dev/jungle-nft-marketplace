import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Ver src/mocks/tough-cookie-stub.ts: os mocks não usam cookies e o tough-cookie pesa ~340 kB no MSW
      'tough-cookie': fileURLToPath(new URL('./src/mocks/tough-cookie-stub.ts', import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Bibliotecas grandes e estáveis em chunks próprios. O chunk "socket" leva só o cliente: os parsers são
        // compartilhados com o binding do MSW e ficam num grupo de prioridade maior, senão o chunk do mock
        // importaria (e executaria) o engine.io-client, que guarda o WebSocket ao ser executado e precisa
        // carregar depois do MSW ativo (e2e/realtime-transport.spec.ts falha se isso quebrar).
        codeSplitting: {
          groups: [
            { name: 'socket-protocol', test: /node_modules[\\/].*(engine\.io-parser|socket\.io-parser|@socket\.io[\\/]component-emitter)[\\/]/, priority: 30 },
            { name: 'socket', test: /node_modules[\\/].*(socket\.io-client|engine\.io-client)[\\/]/, priority: 20 },
            { name: 'msw', test: /node_modules[\\/].*(msw|@mswjs[\\/]interceptors)[\\/]/, priority: 10 },
            { name: 'radix', test: /node_modules[\\/].*(radix-ui|@radix-ui)[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
  },
})
