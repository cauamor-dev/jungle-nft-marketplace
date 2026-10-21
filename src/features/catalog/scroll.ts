// Filtros, abas e ordenação mantêm a posição da página. Ao trocar de página, quem está no fim da lista
// volta suavemente ao começo dos resultados, sem o salto para o topo do site.
export function scrollToResults() {
  const results = document.getElementById('resultados')
  if (!results || results.getBoundingClientRect().top >= 0) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  results.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
