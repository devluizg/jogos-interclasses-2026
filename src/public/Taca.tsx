import { ChevronDown, Sparkles } from 'lucide-react'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'
import type { TacaPublica } from '@/lib/types'
import { cfgBooleano, cfgTexto, useConfig, useRealtime, useSeo } from './hooks'
import { qualitativosDaTaca } from './utils'
import { Card, CarregandoPublico, ErroPublico, Medalha, NumeroTurma, PageHero, Vazio } from './ui'

type Criterio = {
  chave: string
  nome: string
  tipo: 'desempenho' | 'qualitativo' | 'conduta'
  peso: number | null
  escala_min: number | null
  escala_max: number | null
  a_definir: boolean
}

type Dados = { ranking: TacaPublica[]; criterios: Criterio[] }

export default function Taca() {
  const { configs } = useConfig()
  const publicada = cfgBooleano(configs, 'taca_publicada')
  const nomeTaca = cfgTexto(configs, 'taca_nome', 'Taça Turma Protagonista')

  useSeo({
    titulo: nomeTaca,
    descricao: `Ranking da ${nomeTaca} dos Jogos Interclasses 2026.`,
  })

  const dados = useAsync<Dados>(async () => {
    const [ranking, criterios] = await Promise.all([
      supabase.from('vw_taca_publica').select('*').order('posicao'),
      supabase.from('taca_criterios').select('chave, nome, tipo, peso, escala_min, escala_max, a_definir').eq('ativo', true).order('ordem'),
    ])
    for (const r of [ranking, criterios]) if (r.error) throw r.error
    return {
      ranking: (ranking.data ?? []) as TacaPublica[],
      criterios: (criterios.data ?? []) as Criterio[],
    }
  })

  useRealtime(['taca_notas', 'taca_criterios', 'resultados', 'conduta_ocorrencias', 'configuracoes'], dados.reload)

  const ranking = dados.data?.ranking ?? []
  const criterios = dados.data?.criterios ?? []
  const nomesCriterios = new Map(criterios.map((c) => [c.chave, c.nome]))
  const pesos = criterios.filter((c) => c.peso !== null)
  const incompleto = ranking.some((linha) => !linha.formula_completa)

  return (
    <>
      <PageHero
        chapeu="Premiação paralela"
        titulo={nomeTaca}
        descricao="Uma disputa que vai além do placar: desempenho esportivo, participação, torcida, identificação e conduta."
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {!publicada ? (
          <Vazio
            titulo="Ranking em preparação"
            texto="A organização ainda não publicou a pontuação da Taça. Assim que for liberada, ela aparece aqui."
            icone={<Sparkles className="h-7 w-7" />}
          />
        ) : dados.loading ? (
          <CarregandoPublico texto="Calculando a Taça…" />
        ) : dados.error ? (
          <ErroPublico mensagem={dados.error} onRecarregar={dados.reload} />
        ) : ranking.length === 0 ? (
          <Vazio
            titulo="Ranking em preparação"
            texto="Ainda não há pontuação suficiente para montar o ranking da Taça."
            icone={<Sparkles className="h-7 w-7" />}
          />
        ) : (
          <>
            <div className="space-y-2.5">
              {ranking.map((linha) => {
                const qualitativos = qualitativosDaTaca(linha)
                return (
                  <Card key={linha.turma_id} className={linha.posicao === 1 ? 'border-ouro-300 bg-ouro-50/50' : ''}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5 [&::-webkit-details-marker]:hidden">
                        <Medalha posicao={linha.posicao} />
                        <NumeroTurma numero={linha.numero} cor={linha.cor} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-noite-900">
                            {linha.nome_equipe ?? `Turma ${linha.numero}`}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {linha.ouros} ouro(s) · {linha.pratas} prata(s)
                            {linha.empate_persistente ? ' · empate' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-2xl font-extrabold leading-none text-noite-900">
                            {linha.pontuacao_final}
                          </p>
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">pontos</p>
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="grid gap-2 border-t border-noite-900/10 px-4 py-3 text-sm sm:grid-cols-2">
                        <div className="rounded-lg bg-white p-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Desempenho esportivo</p>
                          <p className="mt-0.5 font-semibold text-noite-900">{linha.desempenho_pontos} pts</p>
                        </div>
                        {qualitativos.map((q) => (
                          <div key={q.chave} className="rounded-lg bg-white p-2.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              {nomesCriterios.get(q.chave) ?? q.rotulo}
                            </p>
                            <p className="mt-0.5 font-semibold text-noite-900">{q.valor} pts</p>
                          </div>
                        ))}
                        <div className="rounded-lg bg-white p-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Descontos de conduta</p>
                          <p className="mt-0.5 font-semibold text-red-700">− {linha.conduta_pontos} pts</p>
                        </div>
                      </div>
                    </details>
                  </Card>
                )
              })}
            </div>

            {incompleto ? (
              <p className="mt-3 text-xs font-medium text-amber-700">
                A pontuação está em ajuste pela organização.
              </p>
            ) : null}

            {pesos.length > 0 ? (
              <Card className="mt-6 p-4">
                <h2 className="font-display text-xl font-bold uppercase text-noite-900">Como a Taça é calculada</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  O desempenho esportivo é normalizado pelo melhor resultado entre as turmas. Os critérios qualitativos usam as médias dos jurados. Descontos de conduta são subtraídos ao final.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pesos.map((c) => (
                    <span key={c.chave} className="rounded-lg bg-areia-100 px-2.5 py-1.5 text-xs text-slate-700">
                      <strong className="font-semibold text-noite-900">{c.nome}</strong> · {c.peso}%
                      {c.tipo === 'qualitativo' && c.escala_min !== null && c.escala_max !== null
                        ? ` · escala ${c.escala_min}–${c.escala_max}`
                        : ''}
                    </span>
                  ))}
                </div>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}
