export type Genero = 'feminino' | 'masculino' | 'outro' | 'nao_informado'
export type GeneroCategoria = 'masculino' | 'feminino' | 'mista' | 'unica'
export type TipoModalidade = 'coletiva' | 'individual' | 'equipe' | 'apresentacao'
export type FormatoResultado = 'placar' | 'tempo' | 'pontuacao' | 'posicao'
export type StatusInscricao = 'pendente' | 'aprovada' | 'rejeitada' | 'cancelada'
export type StatusPartida = 'programado' | 'em_andamento' | 'concluido' | 'adiado' | 'wo' | 'cancelado'
export type StatusResultado = 'rascunho' | 'oficial' | 'anulado'

export interface Turma {
  id: string
  numero: number
  ano: number
  nome_equipe: string | null
  cor: string | null
  escudo_url: string | null
  representante1: string | null
  representante2: string | null
  ativo: boolean
  ordem: number | null
  created_at: string
  updated_at: string
}

export interface Estudante {
  id: string
  turma_id: string
  nome_completo: string
  genero: Genero
  taxa_paga: boolean
  ativo: boolean
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface Modalidade {
  id: string
  slug: string
  nome: string
  eixo: string
  tipo: TipoModalidade
  descricao: string | null
  regras_especificas: string | null
  conta_classificacao_geral: boolean
  conta_taca_desempenho: boolean
  ativo: boolean
  ordem: number | null
  a_confirmar: boolean
  nota_admin: string | null
}

export interface Categoria {
  id: string
  modalidade_id: string
  nome: string
  genero: GeneroCategoria
  formato_resultado: FormatoResultado
  max_equipes_por_turma: number | null
  tamanho_equipe_min: number | null
  tamanho_equipe_max: number | null
  max_participantes_por_turma: number | null
  min_participantes_partida: number | null
  min_feminino: number | null
  min_masculino: number | null
  min_percentual_feminino: number | null
  vagas_premiadas: number | null
  ativo: boolean
  a_confirmar: boolean
  observacao: string | null
  ordem: number | null
}

export interface CategoriaComModalidade extends Categoria {
  modalidades: Pick<Modalidade, 'id' | 'nome' | 'tipo' | 'slug'> | null
}

export interface Inscricao {
  id: string
  modalidade_categoria_id: string
  turma_id: string
  tipo: 'individual' | 'equipe'
  nome_equipe: string | null
  status: StatusInscricao
  observacoes: string | null
  created_at: string
  updated_at: string
  modalidade_categorias?: {
    nome: string
    genero: GeneroCategoria
    modalidades: { id: string; nome: string; tipo: TipoModalidade } | null
  } | null
  turmas?: Pick<Turma, 'numero' | 'nome_equipe'> | null
  inscricao_participantes?: { count: number }[] | null
}

export interface Local {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
  ordem: number | null
}

export interface DiaEvento {
  id: string
  data: string
  titulo: string
  descricao: string | null
  ordem: number
}

export interface Partida {
  id: string
  modalidade_categoria_id: string
  fase: string
  rodada: number | null
  data_hora: string | null
  local_id: string | null
  status: StatusPartida
  observacoes: string | null
  modalidade_categorias?: {
    nome: string
    min_participantes_partida: number | null
    modalidades: { id: string; nome: string } | null
  } | null
  locais?: { nome: string } | null
  partida_participantes?: PartidaParticipante[]
}

export interface PartidaParticipante {
  id: string
  partida_id: string
  turma_id: string
  estudante_id: string | null
  inscricao_id: string | null
  placar: number | null
  tempo: number | null
  pontuacao: number | null
  posicao: number | null
  vencedor: boolean | null
  observacao: string | null
  turmas?: { numero: number; nome_equipe: string | null } | null
  estudantes?: { nome_completo: string; turmas?: { numero: number } | null } | null
}

export interface Resultado {
  id: string
  modalidade_categoria_id: string
  turma_id: string
  colocacao: number
  status: StatusResultado
  observacao: string | null
  criado_por: string | null
  atualizado_por: string | null
  created_at: string
  updated_at: string
  turmas?: { numero: number; nome_equipe: string | null } | null
}

export interface Conduta {
  id: string
  turma_id: string
  data: string
  descricao: string
  pontos_desconto: number
  responsavel: string | null
  ativo: boolean
  turmas?: { numero: number; nome_equipe: string | null } | null
}

export interface TacaCriterio {
  id: string
  chave: string
  nome: string
  tipo: 'esportivo' | 'qualitativo' | 'desconto'
  peso: number | null
  escala_min: number
  escala_max: number
  a_definir: boolean
  ordem: number | null
  ativo: boolean
}

export interface TacaJurado {
  id: string
  nome: string
  ativo: boolean
}

export interface TacaNota {
  id: string
  jurado_id: string
  turma_id: string
  criterio_id: string
  nota: number
}

export interface Configuracao {
  chave: string
  valor: unknown
  descricao: string | null
  updated_at: string
}

export interface Pontuacao {
  colocacao: number
  pontos: number
  ativo: boolean
}

export interface CriterioDesempate {
  id: string
  escopo: 'classificacao_geral' | 'taca'
  ordem: number
  criterio: 'pontos' | 'ouros' | 'pratas' | 'bronzes' | 'conduta'
  ativo: boolean
}

export interface Noticia {
  id: string
  titulo: string
  slug: string
  resumo: string | null
  conteudo: string | null
  publicada: boolean
  publicado_em: string | null
  autor: string | null
  created_at: string
  updated_at: string
}

export interface Documento {
  id: string
  titulo: string
  tipo: 'regulamento' | 'anexo' | 'projeto' | 'outro'
  modalidade_id: string | null
  arquivo_url: string | null
  ordem: number | null
  publico: boolean
  modalidades?: { nome: string } | null
}

export interface HistoricoResultado {
  id: string
  resultado_id: string
  acao: string
  dados_anteriores: Record<string, unknown> | null
  dados_novos: Record<string, unknown> | null
  usuario_id: string | null
  created_at: string
}

export interface Auditoria {
  id: number
  tabela: string
  registro_id: string | null
  acao: string
  dados_anteriores: Record<string, unknown> | null
  dados_novos: Record<string, unknown> | null
  usuario_id: string | null
  created_at: string
}

export interface ClassificacaoTaca {
  posicao: number
  turma_id: string
  numero: number
  nome_equipe: string | null
  cor: string | null
  escudo_url: string | null
  desempenho_pontos: number
  qualitativos: Record<string, number>
  conduta_pontos: number
  pontuacao_final: number
  ouros: number
  pratas: number
  empate_persistente: boolean
  formula_completa: boolean
}

export interface ClassificacaoPublica {
  posicao: number
  turma_id: string
  numero: number
  nome_equipe: string | null
  cor: string | null
  escudo_url: string | null
  pontos: number
  ouros: number
  pratas: number
  bronzes: number
  pontos_conduta: number
  empate_persistente: boolean
}

export interface Medalheiro {
  turma_id: string
  numero: number
  nome_equipe: string | null
  cor: string | null
  escudo_url: string | null
  ouros: number
  pratas: number
  bronzes: number
  total: number
}

export interface TacaPublica {
  posicao: number
  turma_id: string
  numero: number
  nome_equipe: string | null
  cor: string | null
  escudo_url: string | null
  desempenho_pontos: number
  qualitativos: Record<string, number> | null
  conduta_pontos: number
  pontuacao_final: number
  ouros: number
  pratas: number
  empate_persistente: boolean
  formula_completa: boolean
}

export interface Programacao {
  id: string
  data_hora: string | null
  fase: string
  rodada: number | null
  status: StatusPartida
  observacoes: string | null
  modalidade: string
  slug: string
  categoria: string
  genero: GeneroCategoria
  formato_resultado: FormatoResultado
  local: string | null
  turmas: number[]
  modalidade_tipo: TipoModalidade
  atletas: string[]
}

export interface ResultadoPublico {
  id: string
  modalidade: string
  slug: string
  categoria: string
  genero: GeneroCategoria
  numero: number
  nome_equipe: string | null
  cor: string | null
  escudo_url: string | null
  colocacao: number
  pontos: number | null
  observacao: string | null
  updated_at: string
}

export interface ParticipantePublico {
  inscricao_id: string
  numero: number
  turma_equipe: string | null
  cor: string | null
  nome_equipe: string | null
  modalidade: string
  slug: string
  categoria: string
  genero: GeneroCategoria
  tipo: 'individual' | 'equipe'
  participantes: string[]
}
