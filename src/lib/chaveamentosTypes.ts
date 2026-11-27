export type TipoChaveamento =
  | 'grupos_mata_mata'
  | 'mata_mata'
  | 'repescagem'
  | 'tempo'
  | 'free_fire'
  | 'quiz'
  | 'programacao'
  | 'artilharia'
  | 'medalhas'

export type EquipeGrupo = {
  cod: string
  nome: string
  idEquipe?: string
  atletas?: string
}

export type JogoGrupo = {
  codigo: string
  rodada: string
  dataHora: string
  eq1: string
  eq2: string
  placar1: number | null
  placar2: number | null
}

export type GrupoPlanilha = {
  id: string
  nome: string
  equipes: EquipeGrupo[]
  jogos: JogoGrupo[]
}

export type JogoEliminatoriaGrupo = {
  codigo: string
  fase: 'Semifinal 1' | 'Semifinal 2' | '3º Lugar' | 'Final'
  dataHora: string
  placar1: number | null
  placar2: number | null
  desempate?: '1' | '2' | ''
}

export type AbaGruposMataMata = {
  tipo: 'grupos_mata_mata'
  id: string
  titulo: string
  subtitulo: string
  rotuloPlacar: string
  permiteEmpate: boolean
  pontosVitoria: number
  pontosEmpate: number
  pontosDerrota: number
  rotuloPro: string
  rotuloContra: string
  rotuloSaldo: string
  formatoEliminatoria: 'final_direta' | 'semis_2grupos' | 'semis_3grupos' | 'semis_intragrupo' | 'semis_por_ranking'
  grupos: GrupoPlanilha[]
  eliminatoria: JogoEliminatoriaGrupo[]
}

export type ByeItem = {
  codigo: string
  participante: string
  destino: string
}

export type JogoChave = {
  codigo: string
  rotulo: string
  dataHora: string
  lado1Origem: string
  lado2Origem: string
  placar1: number | null
  placar2: number | null
  pen1?: number | null
  pen2?: number | null
  desempate?: '1' | '2' | ''
  extraPerdedor?: number | null
}

export type FaseChave = {
  id: string
  nome: string
  jogos: JogoChave[]
}

export type AbaMataMata = {
  tipo: 'mata_mata'
  id: string
  titulo: string
  subtitulo: string
  rotuloLado1: string
  rotuloLado2: string
  rotuloPlacar: string
  temPenaltis: boolean
  temDesempateManual: boolean
  byes: ByeItem[]
  fases: FaseChave[]
}

export type AbaRepescagem = {
  tipo: 'repescagem'
  id: string
  titulo: string
  subtitulo: string
  rotuloLado1: string
  rotuloLado2: string
  rotuloPlacar: string
  temDesempateManual: boolean
  repescagemVagas: number
  rotuloExtraPerdedor: string | null
  primeiraFase: JogoChave[]
  fases: FaseChave[]
}

export type CompetidorTempo = {
  peito: string
  nome: string
  turma: string
  origem?: string
  presenca: 'Presente' | 'DNS' | 'DNF' | 'DSQ'
  tempoBruto?: number | null
  faltas?: number | null
  tent1?: number | null
  tent2?: number | null
  tent3?: number | null
}

export type AbaTempo = {
  tipo: 'tempo'
  modo: 'circuito' | 'cubo'
  id: string
  titulo: string
  subtitulo: string
  penalidadeSegundos?: number
  competidores: CompetidorTempo[]
}

export type SquadFreeFire = {
  id: string
  nome: string
  q1Pos: number | null
  q1Abates: number | null
  q2Pos: number | null
  q2Abates: number | null
  q3Pos: number | null
  q3Abates: number | null
}

export type QuedaFinalSlot = {
  slot: number
  posFinal: number | null
  abatesFinal: number | null
}

export type AbaFreeFire = {
  tipo: 'free_fire'
  id: string
  titulo: string
  subtitulo: string
  tabelaPontos: Record<string, number>
  squads: SquadFreeFire[]
  quedaFinal: QuedaFinalSlot[]
}

export type EquipeQuiz = {
  id: string
  nome: string
  nickname: string
  presenca: 'Presente' | 'W.O.' | 'DSQ'
  pontuacao: number | null
  acertos: number | null
  desempate: number | null
  obs: string
}

export type AbaQuiz = {
  tipo: 'quiz'
  id: string
  titulo: string
  subtitulo: string
  equipes: EquipeQuiz[]
}

export type BlocoProgramacao = {
  id: string
  dia: string
  turno: string
  horario: string
  local: string
  modalidade: string
  categoriaFase: string
  confronto: string
  tipo: string
  status: string
  arbitragem: string
  obs: string
  conferido: boolean
}

export type AbaProgramacao = {
  tipo: 'programacao'
  id: string
  titulo: string
  subtitulo: string
  blocos: BlocoProgramacao[]
}

export type AtletaArtilharia = {
  id: string
  nome: string
  equipe: string
  turma: string
  gols: (number | null)[]
}

export type AbaArtilharia = {
  tipo: 'artilharia'
  id: string
  titulo: string
  subtitulo: string
  modalidade: string
  categoria: string
  colunasPartidas: string[]
  atletas: AtletaArtilharia[]
}

export type PodioMedalha = {
  id: string
  modalidade: string
  categoria: string
  ouro: string
  prata: string
  bronze: string
  coOuro: string
  coPrata: string
  coBronze: string
  status: string
  obs: string
}

export type DelegacaoMedalha = {
  turma: string
  serie: string
}

export type PesosMedalha = {
  ouro: number
  prata: number
  bronze: number
}

export type AbaMedalhas = {
  tipo: 'medalhas'
  id: string
  titulo: string
  subtitulo: string
  pesos: PesosMedalha
  delegacoes: DelegacaoMedalha[]
  podios: PodioMedalha[]
}

export type CartaoItem = {
  id: string
  nome: string
  turma: string
  categoria: string
  jogo: string
  tipo: 'amarelo' | 'vermelho'
  minuto: string
  obs: string
}

export type AbaCartoes = {
  tipo: 'cartoes'
  id: string
  titulo: string
  subtitulo: string
  modalidade: string
  cartoes: CartaoItem[]
}

export type AbaPlanilha =
  | AbaGruposMataMata
  | AbaMataMata
  | AbaRepescagem
  | AbaTempo
  | AbaFreeFire
  | AbaQuiz
  | AbaProgramacao
  | AbaArtilharia
  | AbaMedalhas
  | AbaCartoes

export type ElencoLinha = {
  valores: string[]
  conferido: boolean
  obs: string
}

export type ElencoAba = {
  colunas: string[]
  linhas: ElencoLinha[]
}

export type DadosPlanilha = {
  abas: AbaPlanilha[]
  elencos?: ElencoAba
}

export type ChaveamentoRegistro = {
  slug: string
  titulo: string
  subtitulo: string | null
  tipo: TipoChaveamento
  ordem: number
  dados: DadosPlanilha
  updated_at: string
}
