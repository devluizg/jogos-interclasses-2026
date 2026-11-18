import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ROTULO_FASE, STATUS_PARTIDA } from '@/lib/constantes'
import type { GeneroCategoria, ResultadoPublico, StatusPartida, TacaPublica } from '@/lib/types'

export function dataLocal(iso: string | null | undefined) {
  if (!iso) return null
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function dataCurta(iso: string | null | undefined) {
  const d = dataLocal(iso)
  return d ? format(d, "dd 'de' MMM", { locale: ptBR }) : 'A definir'
}

export function dataLonga(iso: string | null | undefined) {
  const d = dataLocal(iso)
  return d ? format(d, "EEEE, dd 'de' MMMM", { locale: ptBR }) : 'Data a definir'
}

export function diaSemanaCurto(iso: string | null | undefined) {
  const d = dataLocal(iso)
  return d ? format(d, 'EEE', { locale: ptBR }).replace('.', '') : '—'
}

export function horaCurta(iso: string | null | undefined) {
  const d = dataLocal(iso)
  return d ? format(d, 'HH:mm') : 'A definir'
}

export function periodoEvento(inicio: string | null | undefined, fim: string | null | undefined) {
  const a = dataLocal(inicio)
  const b = dataLocal(fim)
  if (!a && !b) return 'Datas a definir'
  if (a && b) {
    if (a.getMonth() === b.getMonth()) {
      return `${format(a, 'dd')} a ${format(b, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
    }
    return `${format(a, "dd 'de' MMM", { locale: ptBR })} a ${format(b, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}`
  }
  return dataCurta((a ? inicio : fim) ?? null)
}

export function nomeTurma(t: { numero: number; nome_equipe?: string | null } | null | undefined) {
  if (!t) return 'A definir'
  return t.nome_equipe?.trim() ? t.nome_equipe : `Turma ${t.numero}`
}

export function rotuloGenero(genero: GeneroCategoria | string | null | undefined) {
  const mapa: Record<string, string> = {
    masculino: 'Masculino',
    feminino: 'Feminino',
    mista: 'Mista',
    unica: 'Única',
  }
  return genero ? (mapa[genero] ?? genero) : ''
}

export function rotuloStatus(status: StatusPartida | string) {
  return STATUS_PARTIDA.find((s) => s.valor === status)?.rotulo ?? status
}

export function rotuloFase(fase: string) {
  return ROTULO_FASE[fase] ?? fase
}

export function tituloCategoria(modalidade: string, categoria: string) {
  return categoria && categoria !== 'Única' ? `${modalidade} · ${categoria}` : modalidade
}

export type GrupoResultado = {
  chave: string
  modalidade: string
  slug: string
  categoria: string
  atualizado: string
  itens: ResultadoPublico[]
}

export function agruparResultados(linhas: ResultadoPublico[]): GrupoResultado[] {
  const mapa = new Map<string, GrupoResultado>()
  for (const linha of linhas) {
    const chave = `${linha.slug}|${linha.categoria}`
    const atual = mapa.get(chave)
    if (!atual) {
      mapa.set(chave, {
        chave,
        modalidade: linha.modalidade,
        slug: linha.slug,
        categoria: linha.categoria,
        atualizado: linha.updated_at,
        itens: [linha],
      })
    } else {
      atual.itens.push(linha)
      if (linha.updated_at > atual.atualizado) atual.atualizado = linha.updated_at
    }
  }
  for (const grupo of mapa.values()) {
    grupo.itens.sort((a, b) => a.colocacao - b.colocacao)
  }
  return [...mapa.values()].sort((a, b) => b.atualizado.localeCompare(a.atualizado))
}

export function qualitativosDaTaca(linha: TacaPublica) {
  const mapa: Record<string, string> = {
    mobilizacao_participacao: 'Mobilização',
    torcida_protagonismo: 'Torcida e protagonismo',
    identificacao_turma: 'Identificação',
    mobilizacao: 'Mobilização',
    torcida: 'Torcida',
    identificacao: 'Identificação',
  }
  return Object.entries(linha.qualitativos ?? {}).map(([chave, valor]) => ({
    chave,
    rotulo: mapa[chave] ?? chave,
    valor: Number(valor),
  }))
}

export function textoPlano(valor: string | null | undefined) {
  return (valor ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function numeroOuNull(valor: unknown) {
  if (valor === null || valor === undefined || valor === '') return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

export function chaveDia(iso: string | null | undefined) {
  const d = dataLocal(iso)
  return d ? format(d, 'yyyy-MM-dd') : 'a-definir'
}

export function rotuloCategoria(nome: string, genero: string | null | undefined) {
  if (!genero || genero === 'unica') return nome
  const rotulo = rotuloGenero(genero)
  return nome.toLowerCase() === rotulo.toLowerCase() ? nome : `${nome} · ${rotulo}`
}

export function contrasteTexto(cor: string | null | undefined) {
  if (!cor) return undefined
  const hex = cor.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!hex) return undefined
  const bruto = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1]
  const r = parseInt(bruto.slice(0, 2), 16)
  const g = parseInt(bruto.slice(2, 4), 16)
  const b = parseInt(bruto.slice(4, 6), 16)
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminancia > 0.62 ? '#03111f' : '#ffffff'
}
