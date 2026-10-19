import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { enableMocks } from './mocks'
import { Providers } from './app/providers'
import { router } from './app/router'
import './styles.css'

async function bootstrap() {
  await enableMocks()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  )
}

void bootstrap()
