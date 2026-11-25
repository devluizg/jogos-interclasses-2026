import {
  calcularFreeFire,
  calcularQuiz,
  calcularTempo,
  resolverBracket,
  resolverGruposMataMata,
  type PodioCalculado,
} from '@/lib/chaveamentosEngine'
import type {
  AbaArtilharia,
  AbaCartoes,
  AbaMedalhas,
  AbaPlanilha,
  AbaProgramacao,
  BlocoProgramacao,
  TipoChaveamento,
} from '@/lib/chaveamentosTypes'
import { supabase } from '@/lib/supabase'

export type ChaveamentoPublico = {
  slug: string
  titulo: string
  subtitulo: string | null
  tipo: TipoChaveamento
  ordem: number
  abas: AbaPlanilha[]
  updated_at: string
}

export type ResumoAbaPublica = {
  slug: string
  modalidade: string
  abaId: string
  tituloAba: string
  aba: AbaPlanilha
  podio: PodioCalculado
  temPodio: boolean
  updated_at: string
}

export async function carregarChaveamentosPublicos(): Promise<ChaveamentoPublico[]> {
  const { data, error } = await supabase
    .from('vw_chaveamentos_publicos')
    .select('*')
    .order('ordem', { ascending: true })
  if (error) {
    // Fallback silencioso caso a migration 0016 ainda não tenha sido aplicada
    return []
  }
  return (data ?? []) as ChaveamentoPublico[]
}

export function extrairBlocosProgramacao(lista: ChaveamentoPublico[]): BlocoProgramacao[] {
  const prog = lista.find((c) => c.slug === 'programacao-geral' || c.tipo === 'programacao')
  if (!prog) return []
  const aba = prog.abas.find((a): a is AbaProgramacao => a.tipo === 'programacao')
  return aba?.blocos ?? []
}

function podioAba(aba: AbaPlanilha): PodioCalculado {
  if (aba.tipo === 'grupos_mata_mata') return resolverGruposMataMata(aba).podio
  if (aba.tipo === 'mata_mata' || aba.tipo === 'repescagem') return resolverBracket(aba).podio
  if (aba.tipo === 'tempo') return calcularTempo(aba).podio
  if (aba.tipo === 'free_fire') return calcularFreeFire(aba).podio
  if (aba.tipo === 'quiz') return calcularQuiz(aba).podio
  return { primeiro: 'A definir', segundo: 'A definir', terceiro: 'A definir' }
}

function definido(valor: string): boolean {
  const limpo = valor.trim().toLowerCase()
  return Boolean(limpo) && !limpo.startsWith('a definir')
}

export function extrairResumosChaveamentos(lista: ChaveamentoPublico[]): ResumoAbaPublica[] {
  const saida: ResumoAbaPublica[] = []
  for (const item of lista) {
    if (item.tipo === 'programacao' || item.tipo === 'artilharia' || item.tipo === 'medalhas') continue
    for (const aba of item.abas) {
      if (aba.tipo === 'programacao' || aba.tipo === 'artilharia' || aba.tipo === 'medalhas' || aba.tipo === 'cartoes') continue
      const podio = podioAba(aba)
      const temPodio = definido(podio.primeiro) || definido(podio.segundo) || definido(podio.terceiro)
      saida.push({
        slug: item.slug,
        modalidade: item.titulo,
        abaId: aba.id,
        tituloAba: aba.titulo,
        aba,
        podio,
        temPodio,
        updated_at: item.updated_at,
      })
    }
  }
  return saida
}

export function extrairAbaMedalhas(lista: ChaveamentoPublico[]): AbaMedalhas | null {
  for (const item of lista) {
    for (const aba of item.abas) {
      if (aba.tipo === 'medalhas') return aba
    }
  }
  return null
}

export function extrairAbasArtilharia(lista: ChaveamentoPublico[]): AbaArtilharia[] {
  const saida: AbaArtilharia[] = []
  for (const item of lista) {
    for (const aba of item.abas) {
      if (aba.tipo === 'artilharia') saida.push(aba)
    }
  }
  return saida
}

export function extrairCartoes(lista: ChaveamentoPublico[], slug?: string): AbaCartoes[] {
  return lista
    .filter((item) => !slug || item.slug === slug)
    .flatMap((item) => item.abas.flatMap((aba) => (aba.tipo === 'cartoes' ? [aba] : [])))
}

export function statusParaBadge(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('andamento')) return 'em_andamento'
  if (s.includes('conclu') || s.includes('encerr')) return 'concluido'
  if (s.includes('adiad')) return 'adiado'
  if (s.includes('cancel')) return 'cancelado'
  return 'programado'
}
