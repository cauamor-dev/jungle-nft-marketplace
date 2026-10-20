export async function enableMocks() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') return
  const { startMocks } = await import('./browser')
  await startMocks()
}
