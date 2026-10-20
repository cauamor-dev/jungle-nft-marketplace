import type { ReactNode } from 'react'

// Botões de estados de erro: empilhados e com largura total em telas estreitas, lado a lado a partir de 640 px.
export function ErrorActions({ children }: { children: ReactNode }) {
  return <div className="flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center [&>*]:w-full sm:[&>*]:w-auto">{children}</div>
}
