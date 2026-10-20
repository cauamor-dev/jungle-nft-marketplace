import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/features/auth/session'
import { mockSocketAvailable } from '@/lib/demo'
import { RealtimeClient, type RealtimeActivity } from './realtime-client'

const MAX_ACTIVITY = 50
const RealtimeContext = createContext<RealtimeActivity[]>([])

export function useRealtimeActivity() {
  return useContext(RealtimeContext)
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { data: session, isPending } = useSession()
  const userId = session?.user.id ?? null
  const [activity, setActivity] = useState<RealtimeActivity[]>([])

  useEffect(() => {
    if (isPending || !mockSocketAvailable) return
    const client = new RealtimeClient({ queryClient, userId })
    client.subscribe((entry) => setActivity((current) => [...current.slice(-(MAX_ACTIVITY - 1)), entry]))
    client.start()
    return () => {
      client.stop()
      setActivity([])
    }
  }, [queryClient, userId, isPending])

  return <RealtimeContext value={activity}>{children}</RealtimeContext>
}
