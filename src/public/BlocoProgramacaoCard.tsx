import { ChevronDown, Clock, MapPin, Users } from 'lucide-react'
import type { BlocoProgramacao } from '@/lib/chaveamentosTypes'
import { statusParaBadge } from './chaveamentosPublico'
import { Card, StatusBadge } from './ui'

type ParticipanteFormatado = {
  nome: string
  turma: string | null
}

type DueloFormatado = {
  etiqueta?: string
  lado1: ParticipanteFormatado
  lado2: ParticipanteFormatado
}

const PREPOSICOES = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

function encurtarNomePessoa(bruto: string): string {
  const limpo = bruto.trim()
  if (!limpo) return ''
  // Mantém nomes de equipe/turma intactos
  if (/^(turma|equipe|vencedor|perdedor|1º|2º|3º|melhor|classificad)/i.test(limpo)) {
    return limpo
  }
  // Duplas separadas por " e " (ex: Tacobol)
  if (/\s+e\s+/i.test(limpo) && limpo.split(/\s+/).length >= 5) {
    const partes = limpo.split(/\s+e\s+/i)
    if (partes.length === 2 && partes[0].split(/\s+/).length >= 2 && partes[1].split(/\s+/).length >= 2) {
      return `${encurtarUnico(partes[0])} e ${encurtarUnico(partes[1])}`
    }
  }
  return encurtarUnico(limpo)
}

function encurtarUnico(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean)
  if (palavras.length <= 2) return palavras.join(' ')
  const primeira = palavras[0]
  // Pega o segundo nome significativo (ignora preposições como "da", "de", "do")
  const segunda = palavras.slice(1).find((p) => !PREPOSICOES.has(p.toLowerCase())) ?? palavras[1]
  return `${primeira} ${segunda}`
}

function extrairParticipante(texto: string): ParticipanteFormatado {
  const limpo = texto.trim()
  // Ex: "Sofia Ester de Souza de Lima (Turma 104)" ou "Equipe Mista (Turmas 102/104)"
  const mTurma = limpo.match(/\((?:Turmas?\s+)?([\d/]+)\)\s*$/i)
  if (mTurma) {
    const semPar = limpo.slice(0, mTurma.index).trim()
    return {
      nome: encurtarNomePessoa(semPar),
      turma: mTurma[1],
    }
  }
  // Ex: "Turma 101" ou "Turma 301/302"
  const mSoTurma = limpo.match(/^Turma\s+([\d/]+)$/i)
  if (mSoTurma) {
    return { nome: `Turma ${mSoTurma[1]}`, turma: mSoTurma[1] }
  }
  return { nome: encurtarNomePessoa(limpo), turma: null }
}

export function parsearConfrontos(texto: string): {
  duelos: DueloFormatado[]
  gruposTexto: Array<{ etiqueta?: string; itens: ParticipanteFormatado[] }>
} {
  const duelos: DueloFormatado[] = []
  const gruposTexto: Array<{ etiqueta?: string; itens: ParticipanteFormatado[] }> = []

  const blocosPipe = texto
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)

  for (const seg of blocosPipe) {
    let etiquetaAtual: string | undefined
    let corpo = seg
    const mEtiq = seg.match(/^([A-Za-zÀ-ÿ0-9\sºª]+):\s*(.+)$/)
    if (mEtiq && mEtiq[1].length <= 22) {
      etiquetaAtual = mEtiq[1].trim()
      corpo = mEtiq[2].trim()
    }

    const subItens = corpo
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)

    let achouDueloNoSeg = false
    for (const sub of subItens) {
      if (sub.includes('×')) {
        const [a, b] = sub.split('×').map((s) => s.trim())
        if (a && b) {
          duelos.push({
            etiqueta: etiquetaAtual,
            lado1: extrairParticipante(a),
            lado2: extrairParticipante(b),
          })
          achouDueloNoSeg = true
        }
      }
    }

    if (!achouDueloNoSeg && corpo.includes(',') && corpo.length > 70) {
      const itens = corpo
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map(extrairParticipante)
      if (itens.length >= 2) {
        gruposTexto.push({ etiqueta: etiquetaAtual, itens })
      }
    }
  }

  return { duelos, gruposTexto }
}

export function ehLogisticaOuIntervalo(bloco: BlocoProgramacao): boolean {
  const mod = bloco.modalidade.toLowerCase()
  const tipo = bloco.tipo.toLowerCase()
  return (
    mod.includes('logística') ||
    mod === 'intervalo' ||
    tipo === 'logística' ||
    tipo === 'intervalo'
  )
}

function PilulaParticipante({ p, alinharDireita = false }: { p: ParticipanteFormatado; alinharDireita?: boolean }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${alinharDireita ? 'flex-row-reverse text-right' : ''}`}>
      <span className="truncate text-xs font-semibold text-noite-900 sm:text-[13px]">{p.nome}</span>
      {p.turma && !p.nome.startsWith('Turma ') ? (
        <span className="shrink-0 rounded bg-noite-900/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-noite-800">
          {p.turma}
        </span>
      ) : null}
    </span>
  )
}

function LinhaDuelo({ d }: { d: DueloFormatado }) {
  return (
    <div className="rounded-xl border border-noite-900/10 bg-areia-50/70 px-2.5 py-2">
      {d.etiqueta ? (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-700">{d.etiqueta}</p>
      ) : null}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <PilulaParticipante p={d.lado1} />
        <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-brand-600 ring-1 ring-noite-900/10">
          ×
        </span>
        <PilulaParticipante p={d.lado2} alinharDireita />
      </div>
    </div>
  )
}

export function BlocoProgramacaoCard({
  bloco,
  compacto = false,
  abrirAutomatico = false,
}: {
  bloco: BlocoProgramacao
  compacto?: boolean
  abrirAutomatico?: boolean
}) {
  const { duelos, gruposTexto } = parsearConfrontos(bloco.confronto)
  const horaInicio = bloco.horario.split('–')[0]?.trim() || '—'

  if (compacto) {
    // Versão compacta usada no carrossel da Home
    return (
      <Card className="flex w-[84vw] max-w-sm shrink-0 snap-start flex-col justify-between p-4 md:w-auto md:max-w-none">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                {bloco.modalidade}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {bloco.dia} · <Clock className="mb-0.5 inline h-3.5 w-3.5" /> {bloco.horario}
              </p>
            </div>
            <StatusBadge status={statusParaBadge(bloco.status)} />
          </div>

          <div className="mt-3">
            {duelos.length === 1 ? (
              <LinhaDuelo d={duelos[0]} />
            ) : duelos.length > 1 ? (
              <div className="flex items-center justify-between rounded-xl border border-noite-900/10 bg-areia-50 px-3 py-2 text-xs">
                <span className="font-semibold text-noite-900">{bloco.categoriaFase}</span>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-800">
                  {duelos.length} jogos
                </span>
              </div>
            ) : (
              <p className="line-clamp-2 text-xs font-medium leading-relaxed text-noite-900">
                {bloco.categoriaFase}
              </p>
            )}
          </div>
        </div>

        <p className="mt-3 flex items-center gap-1.5 truncate text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" /> {bloco.local}
        </p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex h-full">
        <div className="flex w-[74px] shrink-0 flex-col items-center justify-center bg-noite-950 px-2 py-4 text-center text-white">
          <Clock className="mb-1 h-3.5 w-3.5 text-brand-400" />
          <span className="font-display text-lg font-extrabold leading-tight">{horaInicio}</span>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            {bloco.turno}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between p-3.5 sm:p-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                  {bloco.modalidade}
                </p>
                <p className="mt-0.5 text-xs font-medium text-slate-600">{bloco.categoriaFase}</p>
              </div>
              <StatusBadge status={statusParaBadge(bloco.status)} />
            </div>

            <div className="mt-3">
              {duelos.length === 1 ? (
                <LinhaDuelo d={duelos[0]} />
              ) : duelos.length > 1 ? (
                <details className="group" open={abrirAutomatico}>
                  <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-noite-900/10 bg-areia-50 px-3 py-2 text-xs font-semibold text-noite-900 transition-colors hover:bg-areia-100 [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-brand-600" />
                      {duelos.length} confrontos nesta bateria
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-brand-700">
                      Ver jogos
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    {duelos.map((d, i) => (
                      <LinhaDuelo key={i} d={d} />
                    ))}
                  </div>
                </details>
              ) : gruposTexto.length > 0 ? (
                <details className="group" open={abrirAutomatico}>
                  <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-noite-900/10 bg-areia-50 px-3 py-2 text-xs font-semibold text-noite-900 transition-colors hover:bg-areia-100 [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-brand-600" />
                      {gruposTexto.reduce((acc, g) => acc + g.itens.length, 0)} participantes
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-brand-700">
                      Ver lista
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="mt-2 space-y-2">
                    {gruposTexto.map((g, gi) => (
                      <div key={gi} className="rounded-xl border border-noite-900/10 bg-white p-2.5">
                        {g.etiqueta ? (
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                            {g.etiqueta}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-1.5">
                          {g.itens.map((it, ii) => (
                            <span
                              key={ii}
                              className="inline-flex items-center gap-1 rounded-lg bg-areia-100 px-2 py-1 text-[11px] font-medium text-noite-900"
                            >
                              {it.nome}
                              {it.turma ? (
                                <span className="font-mono text-[10px] font-bold text-brand-700">{it.turma}</span>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : (
                <p className="text-xs leading-relaxed text-slate-600">{bloco.confronto}</p>
              )}
            </div>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" /> {bloco.local} · {bloco.horario}
          </p>
        </div>
      </div>
    </Card>
  )
}
