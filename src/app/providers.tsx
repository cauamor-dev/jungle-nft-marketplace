import { useEffect, useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { onSessionInvalid } from '@/api/session-storage'
import { dropInvalidSession } from '@/features/auth/session'
import { RealtimeProvider } from '@/features/realtime/realtime-provider'
import { createQueryClient } from './query-client'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  useEffect(() => onSessionInvalid(() => void dropInvalidSession(queryClient)), [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>{children}</RealtimeProvider>
    </QueryClientProvider>
  )
}
