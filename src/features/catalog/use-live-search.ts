import { useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { CatalogSearch } from './search'

const DEBOUNCE_MS = 300

// O termo vive na URL (?q=): os resultados mudam enquanto a pessoa digita e o campo continua preenchido ao
// voltar para a página. Digitar não empilha histórico; só a primeira busca fora do catálogo cria uma entrada.
export function useLiveSearch() {
  const location = useLocation()
  const navigate = useNavigate()
  const onCatalog = location.pathname === '/' || location.pathname === '/mercado'
  const urlQuery = onCatalog ? ((location.search as CatalogSearch).q ?? '') : ''
  const [value, setValue] = useState(urlQuery)
  const [syncedQuery, setSyncedQuery] = useState(urlQuery)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Mudança vinda de fora (limpar filtros, voltar no histórico) atualiza o campo, sem apagar o espaço que a
  // pessoa acabou de digitar
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery)
    if (urlQuery !== value.trim()) setValue(urlQuery)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  function commit(next: string) {
    clearTimeout(timer.current)
    const q = next.trim() || undefined
    if (onCatalog && q === (urlQuery || undefined)) return
    void navigate({
      to: onCatalog ? (location.pathname as '/' | '/mercado') : '/mercado',
      search: (onCatalog ? { ...(location.search as CatalogSearch), q, page: undefined } : { q }) as never,
      replace: onCatalog,
      resetScroll: !onCatalog,
    })
  }

  function change(next: string) {
    setValue(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => commit(next), DEBOUNCE_MS)
  }

  return { value, change, submit: () => commit(value), active: urlQuery !== '' }
}
