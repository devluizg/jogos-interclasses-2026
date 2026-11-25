import { Medal, Trophy } from 'lucide-react'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'
import { calcularMedalhas, resolverGruposMataMata } from '@/lib/chaveamentosEngine'
import type { AbaGruposMataMata } from '@/lib/chaveamentosTypes'
import type { ClassificacaoPublica } from '@/lib/types'
import {
  carregarChaveamentosPublicos,
  extrairAbaMedalhas,
} from './chaveamentosPublico'
import { useRealtime, useSeo } from './hooks'
import { Card, CarregandoPublico, ErroPublico, Medalha, NumeroTurma, PageHero, Vazio } from './ui'

export default function Classificacao() {
  useSeo({
    titulo: 'Classificação',
    descricao: 'Classificação geral por delegação e tabelas dos esportes com grupos dos Jogos Interclasses 2026.',
  })

  const dados = useAsync(async () => {
    const [chaves, resultado] = await Promise.all([
      carregarChaveamentosPublicos(),
      supabase.from('vw_classificacao_esportiva').select('*').order('posicao'),
    ])
    if (resultado.error) throw resultado.error
    return {
      chaves,
      classificacao: (resultado.data ?? []) as ClassificacaoPublica[],
    }
  })

  useRealtime(
    ['chaveamentos', 'resultados', 'partida_participantes', 'conduta_ocorrencias', 'configuracoes'],
    dados.reload,
  )

  const chaves = dados.data?.chaves ?? []
  const abaMedalhas = extrairAbaMedalhas(chaves)
  const quadro = abaMedalhas ? calcularMedalhas(abaMedalhas) : null

  const Grupos = chaves.flatMap((item) =>
    item.abas.flatMap((aba) =>
      aba.tipo === 'grupos_mata_mata' ? [{ key: `${item.slug}-${aba.id}`, aba }] : [],
    ),
  )

  const classificacao = dados.data?.classificacao ?? []
  const temResultados = classificacao.some(
    (linha) => linha.pontos > 0 || linha.ouros > 0 || linha.pratas > 0 || linha.bronzes > 0,
  )

  return (
    <>
      <PageHero
        chapeu="Disputa geral"
        titulo="Classificação"
        descricao="Quadro de medalhas por delegação e tabelas dos esportes com grupos."
      />

      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {dados.loading ? (
          <CarregandoPublico texto="Calculando a classificação…" />
        ) : dados.error ? (
          <ErroPublico mensagem={dados.error} onRecarregar={dados.reload} />
        ) : (
          <>
            {quadro ? (
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-noite-900/10 bg-noite-950 px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-2">
                    <Medal className="h-4 w-4 text-ouro-400" />
                    <div>
                      <p className="text-sm font-bold text-white">Quadro Geral de Medalhas</p>
                      <p className="text-[11px] text-slate-400">
                        {quadro.podiosLancados} de {quadro.totalPodios} pódios lançados
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 sm:text-[11px]">
                    Ouro {abaMedalhas?.pesos.ouro} · Prata {abaMedalhas?.pesos.prata} · Bronze {abaMedalhas?.pesos.bronze} pts
                  </p>
                </div>
                <div className="grid grid-cols-[2.2rem_1fr_2.2rem_2.2rem_2.2rem_3.2rem] items-center gap-1.5 border-b border-noite-900/10 bg-areia-50 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:grid-cols-[3rem_1fr_3rem_3rem_3rem_4.5rem] sm:gap-2 sm:px-5">
                  <span>Pos.</span>
                  <span>Delegação</span>
                  <span className="text-center" title="Ouros">O</span>
                  <span className="text-center" title="Pratas">P</span>
                  <span className="text-center" title="Bronzes">B</span>
                  <span className="text-right">Pontos</span>
                </div>
                <div className="divide-y divide-noite-900/5">
                  {quadro.linhas.map((linha) => (
                    <div
                      key={linha.turma}
                      className={`grid grid-cols-[2.2rem_1fr_2.2rem_2.2rem_2.2rem_3.2rem] items-center gap-1.5 px-3 py-3 sm:grid-cols-[3rem_1fr_3rem_3rem_3rem_4.5rem] sm:gap-2 sm:px-5 ${
                        linha.pos === 1 && linha.pontos > 0 ? 'bg-ouro-50' : ''
                      }`}
                    >
                      <Medalha posicao={linha.pos} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-noite-900">{linha.turma}</p>
                        <p className="text-[11px] text-slate-500">{linha.serie}</p>
                      </div>
                      <span className="text-center font-display text-lg font-bold tabular-nums text-noite-800">{linha.ouro}</span>
                      <span className="text-center font-display text-lg font-bold tabular-nums text-noite-800">{linha.prata}</span>
                      <span className="text-center font-display text-lg font-bold tabular-nums text-noite-800">{linha.bronze}</span>
                      <span className="text-right font-display text-2xl font-extrabold tabular-nums text-noite-900">
                        {linha.pontos}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {Grupos.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-brand-700" />
                  <h2 className="font-display text-xl font-bold text-noite-900">Esportes com Grupos</h2>
                </div>
                <p className="text-xs text-slate-500">
                  Tabelas recalculadas automaticamente a partir dos placares salvos dos chaveamentos.
                </p>
                {Grupos.map(({ key, aba }: { key: string; aba: AbaGruposMataMata }) => {
                  const res = resolverGruposMataMata(aba)
                  return (
                    <Card key={key} className="overflow-hidden">
                      <div className="border-b border-noite-900/10 bg-areia-50 px-4 py-3">
                        <p className="text-sm font-bold text-noite-900">{aba.titulo}</p>
                        <p className="text-[11px] text-slate-500">{aba.subtitulo}</p>
                      </div>
                      <div className="divide-y divide-noite-900/5">
                        {aba.grupos.map((grupo) => {
                          const linhas = res.classificacoes[grupo.id] ?? []
                          return (
                            <div key={grupo.id} className="px-4 py-3">
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                                {grupo.nome}
                              </p>
                              <div className="overflow-x-auto rounded-lg border border-noite-900/10">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-areia-50 text-[10px] uppercase text-slate-500">
                                    <tr>
                                      <th className="px-2.5 py-2">#</th>
                                      <th className="px-2.5 py-2">Equipe</th>
                                      <th className="px-2 py-2 text-center">J</th>
                                      <th className="px-2 py-2 text-center">V</th>
                                      <th className="px-2 py-2 text-center">E</th>
                                      <th className="px-2 py-2 text-center">{aba.rotuloSaldo}</th>
                                      <th className="px-2.5 py-2 text-right">Pts</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-noite-900/5">
                                    {linhas.map((linha) => (
                                      <tr key={linha.nome} className={linha.pos === 1 ? 'bg-ouro-50/60' : ''}>
                                        <td className="px-2.5 py-2 font-semibold text-slate-500">{linha.pos}º</td>
                                        <td className="px-2.5 py-2 font-medium text-noite-900">{linha.nome}</td>
                                        <td className="px-2 py-2 text-center tabular-nums">{linha.j}</td>
                                        <td className="px-2 py-2 text-center tabular-nums">{linha.v}</td>
                                        <td className="px-2 py-2 text-center tabular-nums">{linha.e}</td>
                                        <td className="px-2 py-2 text-center tabular-nums">{linha.saldo}</td>
                                        <td className="px-2.5 py-2 text-right font-bold tabular-nums">{linha.pts}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : null}

            {temResultados ? (
              <Card className="overflow-hidden">
                <div className="border-b border-noite-900/10 bg-noite-950 px-4 py-3 sm:px-5">
                  <p className="text-sm font-bold text-white">Classificação Esportiva (resultados oficiais)</p>
                </div>
                <div className="divide-y divide-noite-900/5">
                  {classificacao.map((linha) => (
                    <div
                      key={linha.turma_id}
                      className={`grid grid-cols-[2.2rem_1fr_2.2rem_2.2rem_2.2rem_3.2rem] items-center gap-1.5 px-3 py-3 sm:grid-cols-[3rem_1fr_3rem_3rem_3rem_4.5rem] sm:gap-2 sm:px-5 ${linha.posicao === 1 ? 'bg-ouro-50' : ''}`}
                    >
                      <Medalha posicao={linha.posicao} />
                      <div className="flex min-w-0 items-center gap-2">
                        <NumeroTurma numero={linha.numero} cor={linha.cor} className="h-8 min-w-8 text-base" />
                        <p className="truncate text-sm font-semibold text-noite-900">
                          {linha.nome_equipe ?? `Turma ${linha.numero}`}
                        </p>
                      </div>
                      <span className="text-center font-display text-lg font-bold tabular-nums text-noite-800">{linha.ouros}</span>
                      <span className="text-center font-display text-lg font-bold tabular-nums text-noite-800">{linha.pratas}</span>
                      <span className="text-center font-display text-lg font-bold tabular-nums text-noite-800">{linha.bronzes}</span>
                      <span className="text-right font-display text-2xl font-extrabold tabular-nums text-noite-900">
                        {linha.pontos}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {!quadro && Grupos.length === 0 && !temResultados ? (
              <Vazio
                titulo="Classificação em preparação"
                texto="A tabela é montada automaticamente a partir dos resultados oficiais."
                icone={<Trophy className="h-7 w-7" />}
              />
            ) : null}
          </>
        )}
      </div>
    </>
  )
}
