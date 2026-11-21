import { LayoutGrid, Trophy, UserRound } from 'lucide-react'
import { ehModalidadeMesa } from '@/lib/partidasFormato'
import type { ParticipanteProgramacao, Programacao } from '@/lib/types'
import { NumeroTurma } from './ui'
import { nomeTurma } from './utils'

function resumoPlacar(p: ParticipanteProgramacao): string | null {
  if (p.placar !== null && p.placar !== undefined) return String(p.placar)
  if (p.pontuacao !== null && p.pontuacao !== undefined) return `${p.pontuacao} pts`
  if (p.tempo !== null && p.tempo !== undefined) return `${p.tempo}s`
  if (p.posicao !== null && p.posicao !== undefined) return `${p.posicao}º`
  return null
}

export function ParticipantesPartida({
  jogo,
  compacto = false,
}: {
  jogo: Programacao
  compacto?: boolean
}) {
  const detalhes = jogo.participantes ?? []
  const atletasLegado = jogo.atletas ?? []
  const turmasLegado = jogo.turmas ?? []
  const ehMesa = ehModalidadeMesa(jogo.slug)

  if (detalhes.length > 0) {
    const porAtleta = detalhes.some((p) => p.tipo === 'atleta')

    if (porAtleta && ehMesa) {
      return (
        <div className="space-y-1.5">
          <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <LayoutGrid className="h-3 w-3 text-brand-700" />
            Mesa · {detalhes.length} {detalhes.length === 1 ? 'atleta' : 'atletas'}
          </p>
          <div className={compacto ? 'flex flex-wrap gap-1.5' : 'grid gap-1.5 sm:grid-cols-2'}>
            {detalhes.map((p, idx) => {
              const marca = resumoPlacar(p)
              return (
                <div
                  key={`${p.nome}-${p.turma_numero}-${idx}`}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${
                    p.vencedor
                      ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'
                      : 'bg-areia-100 text-slate-700'
                  }`}
                >
                  {p.vencedor ? (
                    <Trophy className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <UserRound className="h-3.5 w-3.5 shrink-0 text-brand-700" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium">{p.nome}</span>
                  <span className="shrink-0 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-noite-900/10">
                    T{p.turma_numero}
                  </span>
                  {marca ? (
                    <span className="shrink-0 rounded bg-noite-900 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                      {marca}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (porAtleta) {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {detalhes.map((p, idx) => {
            const marca = resumoPlacar(p)
            return (
              <span key={`${p.nome}-${p.turma_numero}-${idx}`} className="inline-flex items-center gap-1.5">
                {idx > 0 ? <span className="text-xs font-bold text-slate-400">×</span> : null}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${
                    p.vencedor
                      ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'
                      : 'bg-areia-100 text-slate-700'
                  }`}
                >
                  {p.vencedor ? (
                    <Trophy className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <UserRound className="h-3.5 w-3.5 shrink-0 text-brand-700" />
                  )}
                  <span>{p.nome}</span>
                  <span className="rounded bg-white/90 px-1 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-noite-900/10">
                    T{p.turma_numero}
                  </span>
                  {marca ? (
                    <span className="rounded bg-noite-900 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                      {marca}
                    </span>
                  ) : null}
                </span>
              </span>
            )
          })}
        </div>
      )
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {detalhes.map((p, idx) => {
          const marca = resumoPlacar(p)
          return (
            <span key={`${p.turma_numero}-${idx}`} className="inline-flex items-center gap-1.5">
              {idx > 0 ? <span className="text-xs font-bold text-slate-400">×</span> : null}
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg py-1 pl-1 pr-2 ${
                  p.vencedor
                    ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'
                    : 'bg-areia-100 text-slate-700'
                }`}
              >
                <NumeroTurma numero={p.turma_numero} className="h-7 min-w-7 text-sm" />
                <span className="text-xs font-medium">
                  {nomeTurma({ numero: p.turma_numero, nome_equipe: p.turma_equipe })}
                </span>
                {marca ? (
                  <span className="rounded bg-noite-900 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                    {marca}
                  </span>
                ) : null}
              </span>
            </span>
          )
        })}
      </div>
    )
  }

  if (atletasLegado.length > 0) {
    return (
      <div className="space-y-1.5">
        {ehMesa ? (
          <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <LayoutGrid className="h-3 w-3 text-brand-700" />
            Mesa · {atletasLegado.length} {atletasLegado.length === 1 ? 'atleta' : 'atletas'}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5">
          {atletasLegado.map((nome, i) => (
            <span key={`${nome}-${i}`} className="inline-flex items-center gap-1.5">
              {!ehMesa && i > 0 ? <span className="text-xs font-bold text-slate-400">×</span> : null}
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-areia-100 px-2 py-1 text-xs font-medium text-slate-700">
                <UserRound className="h-3.5 w-3.5 text-brand-700" /> {nome}
              </span>
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (turmasLegado.length > 0) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {turmasLegado.map((numero, idx) => (
          <span key={numero} className="inline-flex items-center gap-1.5">
            {idx > 0 ? <span className="text-xs font-bold text-slate-400">×</span> : null}
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-areia-100 py-1 pl-1 pr-2">
              <NumeroTurma numero={numero} className="h-7 min-w-7 text-sm" />
              <span className="text-xs font-medium text-slate-700">{nomeTurma({ numero })}</span>
            </span>
          </span>
        ))}
      </div>
    )
  }

  return <span className="text-xs text-slate-500">Participantes a definir</span>
}
