// O perfil exige nome ENS e apelido da carteira; uma conta nova já nasce com valores editáveis para que salvar
// o perfil funcione na primeira vez (antes o formulário barrava o envio com esses campos vazios).
export function defaultEnsName(username: string) {
  const label = username
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return label.length >= 2 ? label.slice(0, 60) : 'colecionador'
}

export const DEFAULT_WALLET_NICKNAME = 'Principal'
