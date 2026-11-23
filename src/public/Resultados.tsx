import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronDown, MapPin, Medal, Trophy } from 'lucide-react'
import {
  calcularFreeFire,
  calcularQuiz,
  calcularTempo,
  resolverBracket,
  resolverGruposMataMata,
} from '@/lib/chaveamentosEngine'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'
import type { Programacao, ResultadoPublico } from '@/lib/types'
import {
  carregarChaveamentosPublicos,
  extrairResumosChaveamentos,
  type ResumoAbaPublica,
} from './chaveamentosPublico'
import { useRealtime, useSeo } from './hooks'
import { ParticipantesPartida } from './ParticipantesPartida'
import { agruparResultados, dataCurta, horaCurta, rotuloFase, tituloCategoria } from './utils'
import {
  Card,
  CarregandoPublico,
  ErroPublico,
  Medalha,
  PageHero,
  StatusBadge,
  Vazio,
} from './ui'

function DetalheChaveamentoPublico({ resumo }: { resumo: ResumoAbaPublica }) {
  const { aba } = resumo

  if (aba.tipo === 'grupos_mata_mata') {
    const res = resolverGruposMataMata(aba)
    return (
      <div className="space-y-4">
        {aba.grupos.map((g) => {
          const tab = res.classificacoes[g.id] ?? []
          const jogosComPlacar = g.jogos.filter((j) => j.placar1 !== null && j.placar2 !== null)
          return (
            <div key={g.id} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{g.nome}</p>
              <div className="overflow-x-auto rounded-xl border border-noite-900/10 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-areia-50 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-2.5 py-2">#</th>
                      <th className="px-2.5 py-2">Equipe</th>
                      <th className="px-2 py-2 text-center">J</th>
                      <th className="px-2 py-2 text-center">V</th>
                      <th className="px-2 py-2 text-center">{aba.rotuloSaldo}</th>
                      <th className="px-2.5 py-2 text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-noite-900/5">
                    {tab.map((l) => (
                      <tr key={l.nome}>
                        <td className="px-2.5 py-2 font-semibold text-slate-500">{l.pos}º</td>
                        <td className="px-2.5 py-2 font-medium text-noite-900">{l.nome}</td>
                        <td className="px-2 py-2 text-center tabular-nums">{l.j}</td>
                        <td className="px-2 py-2 text-center tabular-nums">{l.v}</td>
                        <td className="px-2 py-2 text-center tabular-nums">{l.saldo}</td>
                        <td className="px-2.5 py-2 text-right font-bold tabular-nums">{l.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {jogosComPlacar.length > 0 ? (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {jogosComPlacar.map((j) => (
                    <div key={j.codigo} className="flex items-center justify-between gap-2 rounded-lg bg-areia-50 px-2.5 py-1.5 text-xs">
                      <span className="truncate font-medium text-noite-900">{j.eq1}</span>
                      <span className="shrink-0 font-display text-sm font-extrabold text-brand-700">
                        {j.placar1} × {j.placar2}
                      </span>
                      <span className="truncate text-right font-medium text-noite-900">{j.eq2}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}

        {res.jogosResolvidos.some((_, i) => aba.eliminatoria[i]?.placar1 !== null) ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">Fase eliminatória</p>
            {res.jogosResolvidos.map((jr, i) => {
              const orig = aba.eliminatoria[i]
              return (
                <div key={jr.codigo} className="flex items-center justify-between gap-2 rounded-lg border border-noite-900/10 bg-white px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-500">{jr.fase}</span>
                  <span className="truncate font-medium text-noite-900">
                    {jr.eq1} {orig?.placar1 !== null && orig?.placar2 !== null ? `${orig.placar1} × ${orig.placar2}` : '×'} {jr.eq2}
                  </span>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    )
  }

  if (aba.tipo === 'mata_mata' || aba.tipo === 'repescagem') {
    const res = resolverBracket(aba)
    const fasesComJogos = [
      ...(res.primeiraFaseResolvida.length > 0
        ? [{ id: 'p1', nome: '1ª Fase', jogos: res.primeiraFaseResolvida }]
        : []),
      ...res.fasesResolvidas,
    ]
    return (
      <div className="space-y-3">
        {fasesComJogos.map((fase) => {
          const concluidos = fase.jogos.filter((j) => j.jogo.placar1 !== null && j.jogo.placar2 !== null)
          if (concluidos.length === 0) return null
          return (
            <div key={fase.id} className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{fase.nome}</p>
              <div className="space-y-1.5">
                {concluidos.map((j) => (
                  <div key={j.jogo.codigo} className="flex items-center justify-between gap-2 rounded-lg bg-areia-50 px-2.5 py-1.5 text-xs">
                    <span className={`truncate ${j.vencedor === j.lado1 ? 'font-bold text-noite-900' : 'text-slate-600'}`}>
                      {j.lado1}
                    </span>
                    <span className="shrink-0 font-display text-sm font-extrabold text-brand-700">
                      {j.jogo.placar1} × {j.jogo.placar2}
                    </span>
                    <span className={`truncate text-right ${j.vencedor === j.lado2 ? 'font-bold text-noite-900' : 'text-slate-600'}`}>
                      {j.lado2}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (aba.tipo === 'tempo') {
    const { linhas } = calcularTempo(aba)
    const comTempo = linhas.filter((l) => l.melhor !== null)
    if (comTempo.length === 0) return <p className="text-xs text-slate-500">Tempos ainda não lançados.</p>
    return (
      <ul className="divide-y divide-noite-900/5 rounded-xl border border-noite-900/10 bg-white">
        {comTempo.map((l) => (
          <li key={`${l.peito}-${l.nome}`} className="flex items-center gap-2.5 px-3 py-2 text-xs">
            <span className="w-6 font-bold text-slate-500">{l.pos}º</span>
            <span className="min-w-0 flex-1 truncate font-medium text-noite-900">
              {l.nome} <span className="text-slate-400">({l.turma})</span>
            </span>
            <span className="font-display text-base font-extrabold tabular-nums text-brand-700">{l.melhor}s</span>
          </li>
        ))}
      </ul>
    )
  }

  if (aba.tipo === 'free_fire') {
    const { classif } = calcularFreeFire(aba)
    return (
      <ul className="divide-y divide-noite-900/5 rounded-xl border border-noite-900/10 bg-white">
        {classif.slice(0, 6).map((s, i) => (
          <li key={s.id} className="flex items-center gap-2.5 px-3 py-2 text-xs">
            <span className="w-6 font-bold text-slate-500">{i + 1}º</span>
            <span className="min-w-0 flex-1 truncate font-medium text-noite-900">{s.nome}</span>
            <span className="text-slate-500">{s.abates} ab.</span>
            <span className="font-display text-base font-extrabold tabular-nums text-brand-700">{s.total} pts</span>
          </li>
        ))}
      </ul>
    )
  }

  if (aba.tipo === 'quiz') {
    const { ordenadas } = calcularQuiz(aba)
    const lancadas = ordenadas.filter((e) => e.pontuacao !== null)
    if (lancadas.length === 0) return <p className="text-xs text-slate-500">Pontuações ainda não lançadas.</p>
    return (
      <ul className="divide-y divide-noite-900/5 rounded-xl border border-noite-900/10 bg-white">
        {lancadas.map((e, i) => (
          <li key={e.id} className="flex items-center gap-2.5 px-3 py-2 text-xs">
            <span className="w-6 font-bold text-slate-500">{i + 1}º</span>
            <span className="min-w-0 flex-1 truncate font-medium text-noite-900">{e.nome}</span>
            <span className="font-display text-base font-extrabold tabular-nums text-brand-700">{e.pontuacao} pts</span>
          </li>
        ))}
      </ul>
    )
  }

  return null
}

export default function Resultados() {
  useSeo({
    titulo: 'Resultados',
    descricao: 'Resultados oficiais, pódios e chaves atualizadas dos Jogos Interclasses 2026.',
  })

  const [modalidade, setModalidade] = useState('todas')

  const dados = useAsync<{
    oficiais: ResultadoPublico[]
    partidas: Programacao[]
    chaveamentos: ResumoAbaPublica[]
  }>(async () => {
    const [resOficiais, resPartidas, chaveamentosRaw] = await Promise.all([
      supabase
        .from('vw_resultados_publicos')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(500),
      supabase
        .from('vw_programacao')
        .select('*')
        .in('status', ['concluido', 'wo'])
        .order('data_hora', { ascending: false, nullsFirst: false })
        .limit(200),
      carregarChaveamentosPublicos(),
    ])
    if (resOficiais.error) throw resOficiais.error
    if (resPartidas.error) throw resPartidas.error
    return {
      oficiais: (resOficiais.data ?? []) as ResultadoPublico[],
      partidas: (resPartidas.data ?? []) as Programacao[],
      chaveamentos: extrairResumosChaveamentos(chaveamentosRaw),
    }
  })

  useRealtime(['resultados', 'partidas', 'partida_participantes', 'configuracoes', 'chaveamentos'], dados.reload)

  const todos = dados.data?.oficiais ?? []
  const partidasConcluidas = dados.data?.partidas ?? []
  const chaveamentos = dados.data?.chaveamentos ?? []

  const modalidades = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const linha of todos) mapa.set(linha.slug, linha.modalidade)
    for (const jogo of partidasConcluidas) mapa.set(jogo.slug, jogo.modalidade)
    for (const ch of chaveamentos) mapa.set(ch.slug, ch.modalidade)
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [todos, partidasConcluidas, chaveamentos])

  const grupos = agruparResultados(
    modalidade === 'todas' ? todos : todos.filter((linha) => linha.slug === modalidade),
  )

  const partidasFiltradas =
    modalidade === 'todas'
      ? partidasConcluidas
      : partidasConcluidas.filter((jogo) => jogo.slug === modalidade)

  const chaveamentosFiltrados =
    modalidade === 'todas'
      ? chaveamentos
      : chaveamentos.filter((ch) => ch.slug === modalidade)

  const temConteudo = todos.length > 0 || partidasConcluidas.length > 0 || chaveamentos.length > 0

  return (
    <>
      <PageHero
        chapeu="Placar oficial"
        titulo="Resultados"
        descricao="Resultados oficiais, pódios e tabelas atualizadas ao vivo pela organização."
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {dados.loading ? (
          <CarregandoPublico texto="Carregando resultados…" />
        ) : dados.error ? (
          <ErroPublico mensagem={dados.error} onRecarregar={dados.reload} />
        ) : !temConteudo ? (
          <Vazio
            titulo="Aguardando os primeiros resultados"
            texto="Assim que a organização publicar um resultado oficial ou lançar placares, eles aparecem aqui."
            icone={<Medal className="h-7 w-7" />}
          />
        ) : (
          <>
            {modalidades.length > 1 ? (
              <div className="scrollbar-none mb-5 flex snap-x gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setModalidade('todas')}
                  className={`min-h-11 snap-start whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${modalidade === 'todas' ? 'bg-noite-900 text-white' : 'bg-white text-noite-800'}`}
                >
                  Todas
                </button>
                {modalidades.map(([slug, nome]) => (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => setModalidade(slug)}
                    className={`min-h-11 snap-start whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${modalidade === slug ? 'bg-noite-900 text-white' : 'bg-white text-noite-800'}`}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            ) : null}

            {grupos.length === 0 && partidasFiltradas.length === 0 && chaveamentosFiltrados.length === 0 ? (
              <Vazio titulo="Nenhum resultado nesta modalidade" texto="Selecione outra modalidade." />
            ) : (
              <div className="space-y-8">
                {grupos.length > 0 ? (
                  <section aria-labelledby="titulo-podios">
                    <h2
                      id="titulo-podios"
                      className="mb-3 font-display text-2xl font-bold uppercase tracking-tight text-noite-900"
                    >
                      Pódios oficiais
                    </h2>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {grupos.map((grupo) => (
                        <Card key={grupo.chave} className="overflow-hidden">
                          <div className="flex items-start justify-between gap-3 border-b border-noite-900/10 bg-areia-50 px-4 py-3">
                            <div>
                              <Link
                                to={`/modalidades/${grupo.slug}`}
                                className="font-display text-xl font-bold uppercase leading-tight text-noite-900 hover:text-brand-700"
                              >
                                {tituloCategoria(grupo.modalidade, grupo.categoria)}
                              </Link>
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                Publicado em {dataCurta(grupo.atualizado)} às {horaCurta(grupo.atualizado)}
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                              Oficial
                            </span>
                          </div>
                          <ul className="divide-y divide-noite-900/5">
                            {grupo.itens.map((item) => (
                              <li key={item.id} className={`flex items-center gap-3 px-4 py-3 ${item.colocacao === 1 ? 'bg-ouro-50/60' : ''}`}>
                                <Medalha posicao={item.colocacao} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-noite-900">
                                    {item.nome_equipe ?? `Turma ${item.numero}`}
                                  </p>
                                  {item.observacao ? (
                                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{item.observacao}</p>
                                  ) : null}
                                </div>
                                <span className="font-display text-lg font-bold tabular-nums text-slate-600">
                                  {item.pontos ?? 0} <span className="text-[10px] font-medium text-slate-400">pts</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </Card>
                      ))}
                    </div>
                  </section>
                ) : null}

                {chaveamentosFiltrados.length > 0 ? (
                  <section aria-labelledby="titulo-chaveamentos-ao-vivo">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <h2
                        id="titulo-chaveamentos-ao-vivo"
                        className="font-display text-2xl font-bold uppercase tracking-tight text-noite-900"
                      >
                        Chaveamentos e tabelas
                      </h2>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Atualização ao vivo
                      </span>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {chaveamentosFiltrados.map((resumo) => (
                        <Card key={`${resumo.slug}-${resumo.abaId}`} className="overflow-hidden">
                          <div className="flex items-start justify-between gap-3 border-b border-noite-900/10 bg-areia-50 px-4 py-3">
                            <div>
                              <p className="font-display text-xl font-bold uppercase leading-tight text-noite-900">
                                {resumo.tituloAba}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                {resumo.aba.subtitulo}
                              </p>
                            </div>
                            <Trophy className="h-4 w-4 shrink-0 text-brand-600" />
                          </div>

                          {resumo.temPodio ? (
                            <ul className="divide-y divide-noite-900/5 border-b border-noite-900/10">
                              {[
                                { pos: 1, nome: resumo.podio.primeiro },
                                { pos: 2, nome: resumo.podio.segundo },
                                { pos: 3, nome: resumo.podio.terceiro },
                              ].map((it) => (
                                <li key={it.pos} className={`flex items-center gap-3 px-4 py-2.5 ${it.pos === 1 ? 'bg-ouro-50/50' : ''}`}>
                                  <Medalha posicao={it.pos} className="h-7 w-7 text-sm" />
                                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-noite-900">
                                    {it.nome}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : null}

                          <details className="group">
                            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-semibold text-brand-700 hover:bg-areia-50 [&::-webkit-details-marker]:hidden">
                              <span>Ver tabela e placares</span>
                              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="border-t border-noite-900/10 bg-areia-50/40 p-3.5">
                              <DetalheChaveamentoPublico resumo={resumo} />
                            </div>
                          </details>
                        </Card>
                      ))}
                    </div>
                  </section>
                ) : null}

                {partidasFiltradas.length > 0 ? (
                  <section aria-labelledby="titulo-partidas-concluidas">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <h2
                        id="titulo-partidas-concluidas"
                        className="font-display text-2xl font-bold uppercase tracking-tight text-noite-900"
                      >
                        Partidas concluídas
                      </h2>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {partidasFiltradas.length} {partidasFiltradas.length === 1 ? 'partida' : 'partidas'}
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {partidasFiltradas.map((jogo) => (
                        <Card key={jogo.id} className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Link
                                to={`/modalidades/${jogo.slug}`}
                                className="text-[11px] font-semibold uppercase tracking-wide text-brand-700 hover:underline"
                              >
                                {tituloCategoria(jogo.modalidade, jogo.categoria)}
                              </Link>
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                {rotuloFase(jogo.fase)}
                                {jogo.rodada ? ` · ${jogo.rodada}ª rodada` : ''}
                              </p>
                            </div>
                            <StatusBadge status={jogo.status} />
                          </div>

                          <div className="mt-3">
                            <ParticipantesPartida jogo={jogo} />
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            {jogo.data_hora ? (
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" /> {dataCurta(jogo.data_hora)} · {horaCurta(jogo.data_hora)}
                              </span>
                            ) : null}
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {jogo.local ?? 'Local a definir'}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
