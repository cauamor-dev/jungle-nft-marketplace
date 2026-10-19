import { describe, expect, it } from 'vitest'
import { getNft, listNfts } from '@/api/endpoints'
import { ApiError } from '@/domain/errors'
import { demoScenario } from '@/test/helpers'

describe('catálogo', () => {
  it('pagina e informa o total', async () => {
    const first = await listNfts({ page: 1, pageSize: 9 })
    const last = await listNfts({ page: 4, pageSize: 9 })
    expect(first.items).toHaveLength(9)
    expect(first.total).toBe(36)
    expect(first.totalPages).toBe(4)
    expect(last.items).toHaveLength(9)
  })

  it('combina busca, categoria e rede', async () => {
    const all = await listNfts({ pageSize: 48 })
    const filtered = await listNfts({ category: ['art', 'music'], chain: ['ethereum'], pageSize: 48 })
    expect(filtered.total).toBeGreaterThan(0)
    expect(filtered.total).toBeLessThan(all.total)
    for (const nft of filtered.items) {
      expect(['art', 'music']).toContain(nft.category)
      expect(nft.chain).toBe('ethereum')
    }

    const bySearch = await listNfts({ q: 'emerald' })
    expect(bySearch.items.map((nft) => nft.title)).toEqual(['Emerald Ape #042'])
    expect((await listNfts({ q: 'EMERALD APE' })).total).toBe(1)
  })

  it('ordena por preço com comparação decimal', async () => {
    const asc = await listNfts({ sort: 'price-asc', pageSize: 48 })
    const prices = asc.items.map((nft) => nft.priceEth)
    expect(prices[0]).toBe('0.02')
    expect(prices.at(-1)).toBe('12.3')
    const desc = await listNfts({ sort: 'price-desc', pageSize: 48 })
    expect(desc.items[0].priceEth).toBe('12.3')
  })

  it('lista só os destaques', async () => {
    const featured = await listNfts({ featured: true, pageSize: 48 })
    expect(featured.total).toBeGreaterThan(0)
    expect(featured.items.every((nft) => nft.featured)).toBe(true)
  })

  it('calcula cada faceta ignorando o próprio filtro', async () => {
    const all = await listNfts({ pageSize: 48 })
    const result = await listNfts({ chain: ['ethereum'], category: ['art'], pageSize: 48 })
    const ethereumOnly = await listNfts({ chain: ['ethereum'], pageSize: 48 })
    const artOnly = await listNfts({ category: ['art'], pageSize: 48 })

    expect(result.facets.categories).toEqual(ethereumOnly.facets.categories)
    expect(result.facets.chains).toEqual(artOnly.facets.chains)
    expect(all.facets.chains.reduce((sum, facet) => sum + facet.count, 0)).toBe(all.total)
    expect(result.facets.categories.find((facet) => facet.value === 'art')?.count).toBe(result.total)
  })

  it('devolve resultado vazio no cenário empty-results', async () => {
    await demoScenario('empty-results')
    const result = await listNfts({})
    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })

  it('detalha um NFT e responde 404 para um inexistente', async () => {
    expect((await getNft('nft_01')).title).toBe('Emerald Ape #042')
    await expect(getNft('nft_999')).rejects.toMatchObject({ status: 404, code: 'NFT_NOT_FOUND' })
    await expect(getNft('nft_999')).rejects.toBeInstanceOf(ApiError)
  })

  it('aplica falha HTTP do cenário e volta ao normal depois', async () => {
    await demoScenario('http-5xx', { match: 'GET /api/nfts', remaining: 1 })
    await expect(listNfts({})).rejects.toMatchObject({ status: 503 })
    expect((await listNfts({})).total).toBe(36)
  })
})
