type ErroComCodigo = {
  message?: string
  code?: string
  details?: string
  hint?: string
}

const MENSAGENS: Record<string, string> = {
  '23505': 'Já existe um registro com esses dados.',
  '23503': 'Este registro está em uso e não pode ser removido.',
  '23514': 'Valor inválido para uma das regras do banco.',
  '23502': 'Preencha os campos obrigatórios.',
  '42501': 'Sem permissão para esta ação.',
}

export function mensagemErro(erro: unknown): string {
  if (!erro) return 'Erro inesperado.'
  if (typeof erro === 'string') return erro

  const e = erro as ErroComCodigo
  const base = e.message || 'Erro inesperado.'

  if (e.code && MENSAGENS[e.code]) {
    return `${MENSAGENS[e.code]} ${base}`.trim()
  }

  return base
}
