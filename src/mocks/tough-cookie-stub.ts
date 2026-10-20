// O MSW importa o tough-cookie (que traz a lista de sufixos públicos do tldts, ~340 kB) só para simular
// cookies entre requisições. Os mocks deste projeto não usam cookies (a sessão vai no cabeçalho Authorization),
// então este substituto mantém a API que o MSW chama e tira esse peso do carregamento inicial.
// Se algum handler passar a responder Set-Cookie, remova o alias em vite.config.ts.

type StoredCookie = { key: string; value: string; toString(): string }

export class Cookie {
  static fromJSON(): StoredCookie | null {
    return null
  }
}

export class MemoryCookieStore {
  idx: Record<string, Record<string, Record<string, StoredCookie>>> = {}
}

export class CookieJar {
  constructor(readonly store: MemoryCookieStore) {}

  getCookiesSync(): StoredCookie[] {
    return []
  }

  async setCookie(): Promise<void> {}
}
