import type { FormatoResultado, TipoModalidade } from './types'

export const MODALIDADES_MESA = ['baralho', 'uno', 'domino'] as const

export type FormatoPartida = 'coletiva' | 'individual_confronto' | 'mesa' | 'individual_bateria'

export interface InfoFormatoPartida {
  formato: FormatoPartida
  usaAtletas: boolean
  rotulo: string
  descricao: string
  minParticipantes: number
  maxParticipantes: number | null
}

export const INFO_FORMATO_PARTIDA: Record<FormatoPartida, InfoFormatoPartida> = {
  coletiva: {
    formato: 'coletiva',
    usaAtletas: false,
    rotulo: 'Modalidade coletiva / equipes',
    descricao: 'Selecione as turmas ou equipes que vão se enfrentar.',
    minParticipantes: 1,
    maxParticipantes: null,
  },
  individual_confronto: {
    formato: 'individual_confronto',
    usaAtletas: true,
    rotulo: 'Confronto individual (1 × 1)',
    descricao: 'Selecione os dois atletas que se enfrentam. As turmas são identificadas automaticamente.',
    minParticipantes: 2,
    maxParticipantes: 2,
  },
  mesa: {
    formato: 'mesa',
    usaAtletas: true,
    rotulo: 'Disputa por mesa (até 4 atletas)',
    descricao: 'Monte a mesa com até 4 atletas (sem repetição). A turma de cada participante é identificada automaticamente.',
    minParticipantes: 2,
    maxParticipantes: 4,
  },
  individual_bateria: {
    formato: 'individual_bateria',
    usaAtletas: true,
    rotulo: 'Prova individual por bateria',
    descricao: 'Selecione os atletas participantes desta bateria. As turmas são identificadas automaticamente.',
    minParticipantes: 1,
    maxParticipantes: null,
  },
}

export function ehModalidadeMesa(slug?: string | null): boolean {
  if (!slug) return false
  return (MODALIDADES_MESA as readonly string[]).includes(slug)
}

export function formatoPartidaDe(categoria?: {
  formato_resultado?: FormatoResultado | string | null
  modalidades?: { tipo?: TipoModalidade | string | null; slug?: string | null } | null
} | null): FormatoPartida {
  const slug = categoria?.modalidades?.slug ?? null
  const tipo = categoria?.modalidades?.tipo ?? null
  const formatoResultado = categoria?.formato_resultado ?? null

  if (ehModalidadeMesa(slug)) return 'mesa'
  if (tipo === 'individual') {
    return formatoResultado === 'tempo' ? 'individual_bateria' : 'individual_confronto'
  }
  return 'coletiva'
}

export function validarParticipantesPartida(
  formato: FormatoPartida,
  itens: { turma_id: string; estudante_id: string }[],
  opcoes?: { permitirVazio?: boolean },
): string | null {
  const info = INFO_FORMATO_PARTIDA[formato]
  const preenchidos = itens.filter((item) =>
    info.usaAtletas ? Boolean(item.estudante_id) : Boolean(item.turma_id),
  )

  if (preenchidos.length === 0) {
    if (opcoes?.permitirVazio) return null
    if (formato === 'mesa') return 'Selecione ao menos 2 atletas para compor a mesa (máximo de 4).'
    if (formato === 'individual_confronto') return 'Selecione os dois atletas do confronto individual.'
    if (formato === 'individual_bateria') return 'Adicione ao menos um atleta na bateria.'
    return 'Adicione ao menos uma turma participante.'
  }

  const chaves = preenchidos.map((item) => (info.usaAtletas ? item.estudante_id : item.turma_id))
  if (new Set(chaves).size !== chaves.length) {
    if (formato === 'mesa') return 'Não é permitido repetir o mesmo atleta na mesa.'
    if (info.usaAtletas) return 'Cada atleta pode aparecer apenas uma vez na partida.'
    return 'Cada turma pode aparecer apenas uma vez na partida.'
  }

  if (formato === 'individual_confronto') {
    if (preenchidos.length < 2) {
      return 'Selecione o primeiro e o segundo atleta para registrar o confronto individual.'
    }
    if (preenchidos.length > 2) {
      return 'Confrontos individuais diretos aceitam exatamente 2 atletas (1 × 1).'
    }
  }

  if (formato === 'mesa') {
    if (preenchidos.length < 2) {
      return 'Uma mesa precisa de pelo menos 2 atletas (até 4 participantes).'
    }
    if (preenchidos.length > 4) {
      return 'Mesas de baralho, UNO e dominó aceitam no máximo 4 atletas.'
    }
  }

  return null
}

export function ehErroRelacaoEstudantes(erro: unknown): boolean {
  if (!erro || typeof erro !== 'object') return false
  const e = erro as { code?: string; message?: string; details?: string }
  const texto = `${e.code ?? ''} ${e.message ?? ''} ${e.details ?? ''}`.toLowerCase()
  return (
    (texto.includes('pgrst200') && texto.includes('partida_participantes') && texto.includes('estudantes')) ||
    (texto.includes('42703') && texto.includes('estudante_id')) ||
    (texto.includes('could not find a relationship') && texto.includes('partida_participantes') && texto.includes('estudantes'))
  )
}
