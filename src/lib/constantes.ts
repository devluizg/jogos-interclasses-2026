import type {
  FormatoResultado,
  Genero,
  GeneroCategoria,
  StatusInscricao,
  StatusPartida,
  TipoModalidade,
} from './types'

export const GENEROS: { valor: Genero; rotulo: string }[] = [
  { valor: 'feminino', rotulo: 'Feminino' },
  { valor: 'masculino', rotulo: 'Masculino' },
  { valor: 'outro', rotulo: 'Outro' },
  { valor: 'nao_informado', rotulo: 'Não informado' },
]

export const GENEROS_CATEGORIA: { valor: GeneroCategoria; rotulo: string }[] = [
  { valor: 'masculino', rotulo: 'Masculino' },
  { valor: 'feminino', rotulo: 'Feminino' },
  { valor: 'mista', rotulo: 'Mista' },
  { valor: 'unica', rotulo: 'Única' },
]

export const TIPOS_MODALIDADE: { valor: TipoModalidade; rotulo: string }[] = [
  { valor: 'coletiva', rotulo: 'Coletiva' },
  { valor: 'individual', rotulo: 'Individual' },
  { valor: 'equipe', rotulo: 'Equipe' },
  { valor: 'apresentacao', rotulo: 'Apresentação' },
]

export const FORMATOS: { valor: FormatoResultado; rotulo: string }[] = [
  { valor: 'placar', rotulo: 'Placar' },
  { valor: 'tempo', rotulo: 'Tempo' },
  { valor: 'pontuacao', rotulo: 'Pontuação' },
  { valor: 'posicao', rotulo: 'Posição' },
]

export const STATUS_INSCRICAO: { valor: StatusInscricao; rotulo: string }[] = [
  { valor: 'pendente', rotulo: 'Pendente' },
  { valor: 'aprovada', rotulo: 'Aprovada' },
  { valor: 'rejeitada', rotulo: 'Rejeitada' },
  { valor: 'cancelada', rotulo: 'Cancelada' },
]

export const STATUS_PARTIDA: { valor: StatusPartida; rotulo: string }[] = [
  { valor: 'programado', rotulo: 'Programado' },
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'concluido', rotulo: 'Concluído' },
  { valor: 'adiado', rotulo: 'Adiado' },
  { valor: 'wo', rotulo: 'W.O.' },
  { valor: 'cancelado', rotulo: 'Cancelado' },
]

export const TIPOS_DOCUMENTO = [
  { valor: 'regulamento', rotulo: 'Regulamento', plural: 'Regulamento' },
  { valor: 'anexo', rotulo: 'Anexo', plural: 'Anexos' },
  { valor: 'projeto', rotulo: 'Projeto', plural: 'Projetos' },
  { valor: 'outro', rotulo: 'Outro', plural: 'Outros' },
] as const

export const CRITERIOS = [
  { valor: 'pontos', rotulo: 'Pontuação' },
  { valor: 'ouros', rotulo: 'Ouros' },
  { valor: 'pratas', rotulo: 'Pratas' },
  { valor: 'bronzes', rotulo: 'Bronzes' },
  { valor: 'conduta', rotulo: 'Conduta' },
] as const

export const FASES = [
  'classificatoria',
  'quartas',
  'semifinal',
  'terceiro_lugar',
  'final',
  'unica',
] as const

export const ROTULO_FASE: Record<string, string> = {
  classificatoria: 'Classificatória',
  quartas: 'Quartas de final',
  semifinal: 'Semifinal',
  terceiro_lugar: 'Disputa de 3º lugar',
  final: 'Final',
  unica: 'Fase única',
}

export const ROTULO_CRITERIO: Record<string, string> = {
  pontos: 'Pontuação',
  ouros: 'Ouros',
  pratas: 'Pratas',
  bronzes: 'Bronzes',
  conduta: 'Conduta',
  desempenho_esportivo: 'Desempenho esportivo',
  mobilizacao_participacao: 'Mobilização e Participação',
  torcida_protagonismo: 'Torcida e Protagonismo',
  identificacao_turma: 'Identificação da turma',
  conduta_convivencia: 'Conduta e Convivência',
  mobilizacao: 'Mobilização',
  torcida: 'Torcida',
  identificacao: 'Identificação da turma',
  conduta_desconto: 'Conduta (desconto)',
}
