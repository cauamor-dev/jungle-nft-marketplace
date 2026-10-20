import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useQueryClient } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { Providers } from './providers'
import { router } from './router'
import '../styles.css'

export function mount(container: HTMLElement) {
  createRoot(container).render(
    <StrictMode>
      <Providers>
        <AppRouter />
      </Providers>
    </StrictMode>,
  )
}

function AppRouter() {
  const queryClient = useQueryClient()
  return <RouterProvider router={router} context={{ queryClient }} />
}
