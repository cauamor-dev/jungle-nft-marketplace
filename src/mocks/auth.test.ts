import { describe, expect, it } from 'vitest'
import {
  changePassword,
  connectWallet,
  createWallet,
  fetchSession,
  getFavorites,
  getOrder,
  listOrders,
  listWallets,
  login,
  logout,
  register,
  addFavorite,
  updateProfile,
  uploadAvatar,
} from '@/api/endpoints'
import { clearSessionToken } from '@/api/session-storage'
import { getDb } from '@/mocks/db'
import { demoScenario, DEMO_PASSWORD, loginAs } from '@/test/helpers'

describe('conta e sessão', () => {
  it('cadastra e depois permite login', async () => {
    const user = await register({ name: 'Ana Souza', email: 'ana@example.test', password: 'Senha123' })
    expect(user.email).toBe('ana@example.test')
    const result = await login({ email: 'ana@example.test', password: 'Senha123' })
    expect(result.session.user.id).toBe(user.id)
  })

  it('responde 409 em e-mail repetido e 422 em senha fraca', async () => {
    await expect(register({ name: 'Outra', email: 'DEMO1@example.test', password: 'Senha123' })).rejects.toMatchObject({
      status: 409,
      fieldErrors: { email: expect.any(String) },
    })
    await expect(register({ name: 'Fraca', email: 'fraca@example.test', password: 'abc' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { password: expect.any(String) },
    })
  })

  it('força conflito de cadastro no cenário registration-conflict', async () => {
    await demoScenario('registration-conflict')
    await expect(register({ name: 'Nova Pessoa', email: 'nova@example.test', password: 'Senha123' })).rejects.toMatchObject({
      status: 409,
    })
  })

  it('nunca guarda a senha em claro', async () => {
    await register({ name: 'Ana Souza', email: 'ana@example.test', password: 'Senha123' })
    const db = await getDb()
    const stored = JSON.stringify(db.users)
    expect(stored).not.toContain('Senha123')
    expect(stored).not.toContain(DEMO_PASSWORD)
    expect(db.users.every((user) => /^[0-9a-f]{64}$/.test(user.passwordHash) && user.passwordSalt.length === 32)).toBe(true)
  })

  it('rejeita credenciais erradas com 401', async () => {
    await expect(login({ email: 'demo1@example.test', password: 'errada123' })).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
    })
  })

  it('recupera a sessão, expira e encerra no logout', async () => {
    await loginAs('demo1@example.test')
    expect((await fetchSession()).user.email).toBe('demo1@example.test')

    await demoScenario('expired-session')
    await expect(fetchSession()).rejects.toMatchObject({ status: 401, code: 'SESSION_EXPIRED' })

    const again = await loginAs('demo1@example.test')
    await logout()
    await expect(fetchSession()).rejects.toMatchObject({ status: 401 })
    expect(again.token).toBeTruthy()
  })

  it('exige autenticação nas rotas privadas', async () => {
    clearSessionToken()
    await expect(getFavorites()).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' })
    await expect(listWallets()).rejects.toMatchObject({ status: 401 })
    await expect(listOrders()).rejects.toMatchObject({ status: 401 })
  })
})

describe('isolamento entre usuários', () => {
  it('favoritos e carteiras são por usuário', async () => {
    await loginAs('demo1@example.test')
    await addFavorite('nft_03')
    const demo1Wallets = await listWallets()

    await loginAs('demo2@example.test')
    expect((await getFavorites()).nftIds).toEqual([])
    const demo2Wallets = await listWallets()
    expect(demo2Wallets.items.map((wallet) => wallet.id)).not.toEqual(demo1Wallets.items.map((wallet) => wallet.id))
    await expect(connectWallet('wallet_1')).rejects.toMatchObject({ status: 403 })
  })

  it('pedido de outro usuário responde 403 e não aparece na lista', async () => {
    await loginAs('demo2@example.test')
    expect((await getOrder('order_1')).status).toBe('confirmed')

    await loginAs('demo1@example.test')
    await expect(getOrder('order_1')).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect((await listOrders()).items).toEqual([])
  })
})

describe('perfil', () => {
  it('atualiza dados, valida e-mail duplicado e persiste', async () => {
    await loginAs('demo1@example.test')
    const updated = await updateProfile({ name: 'Marina D.', email: 'marina@example.test', bio: 'Nova bio' })
    expect(updated.name).toBe('Marina D.')
    await expect(updateProfile({ name: 'Marina D.', email: 'demo2@example.test', bio: '' })).rejects.toMatchObject({
      status: 409,
    })
    await expect(updateProfile({ name: 'M', email: 'invalido', bio: '' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { name: expect.any(String), email: expect.any(String) },
    })
    expect((await fetchSession()).user.email).toBe('marina@example.test')
  })

  it('troca a senha exigindo a atual e aplicando a regra', async () => {
    await loginAs('demo1@example.test')
    await expect(changePassword({ currentPassword: 'errada', newPassword: 'NovaSenha1' })).rejects.toMatchObject({
      fieldErrors: { currentPassword: expect.any(String) },
    })
    await expect(changePassword({ currentPassword: DEMO_PASSWORD, newPassword: 'curta' })).rejects.toMatchObject({
      fieldErrors: { newPassword: expect.any(String) },
    })
    await changePassword({ currentPassword: DEMO_PASSWORD, newPassword: 'NovaSenha1' })
    await expect(login({ email: 'demo1@example.test', password: DEMO_PASSWORD })).rejects.toMatchObject({ status: 401 })
    expect((await login({ email: 'demo1@example.test', password: 'NovaSenha1' })).token).toBeTruthy()
  })

  it('valida o tipo e o tamanho do avatar', async () => {
    await loginAs('demo1@example.test')
    const png = new File([new Uint8Array([137, 80, 78, 71])], 'a.png', { type: 'image/png' })
    expect((await uploadAvatar(png)).avatarUrl).toMatch(/^data:image\/png;base64,/)

    const text = new File(['oi'], 'a.txt', { type: 'text/plain' })
    await expect(uploadAvatar(text)).rejects.toMatchObject({ fieldErrors: { avatar: expect.any(String) } })

    const big = new File([new Uint8Array(600 * 1024)], 'b.png', { type: 'image/png' })
    await expect(uploadAvatar(big)).rejects.toMatchObject({ fieldErrors: { avatar: expect.any(String) } })
  })
})

describe('carteiras', () => {
  it('mantém uma principal e uma secundária e valida endereço', async () => {
    await loginAs('demo2@example.test')
    await expect(
      createWallet({ label: 'Outra principal', address: '0x1111111111111111111111111111111111111111', network: 'polygon', kind: 'primary' }),
    ).rejects.toMatchObject({ status: 409, fieldErrors: { kind: expect.any(String) } })

    await expect(
      createWallet({ label: 'Curta', address: '0x123', network: 'polygon', kind: 'secondary' }),
    ).rejects.toMatchObject({ status: 422, fieldErrors: { address: expect.any(String) } })

    const created = await createWallet({
      label: 'Reserva',
      address: '0x1111111111111111111111111111111111111111',
      network: 'arbitrum',
      kind: 'secondary',
    })
    expect(created.connection).toBe('disconnected')
    expect((await listWallets()).items).toHaveLength(2)
  })

  it('simula conexão e recusa da carteira', async () => {
    await loginAs('demo1@example.test')
    expect((await connectWallet('wallet_1')).connection).toBe('connected')
    await demoScenario('wallet-refused')
    await expect(connectWallet('wallet_2')).rejects.toMatchObject({ status: 403, code: 'WALLET_REJECTED' })
  })
})
