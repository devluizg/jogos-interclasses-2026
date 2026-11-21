import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, MapPin, Medal } from 'lucide-react'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'
import type { Programacao, ResultadoPublico } from '@/lib/types'
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

export default function Resultados() {
  useSeo({
    titulo: 'Resultados',
    descricao: 'Resultados oficiais por modalidade e categoria dos Jogos Interclasses 2026.',
  })

  const [modalidade, setModalidade] = useState('todas')

  const dados = useAsync<{ oficiais: ResultadoPublico[]; partidas: Programacao[] }>(async () => {
    const [resOficiais, resPartidas] = await Promise.all([
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
    ])
    if (resOficiais.error) throw resOficiais.error
    if (resPartidas.error) throw resPartidas.error
    return {
      oficiais: (resOficiais.data ?? []) as ResultadoPublico[],
      partidas: (resPartidas.data ?? []) as Programacao[],
    }
  })

  useRealtime(['resultados', 'partidas', 'partida_participantes', 'configuracoes'], dados.reload)

  const todos = dados.data?.oficiais ?? []
  const partidasConcluidas = dados.data?.partidas ?? []

  const modalidades = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const linha of todos) mapa.set(linha.slug, linha.modalidade)
    for (const jogo of partidasConcluidas) mapa.set(jogo.slug, jogo.modalidade)
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [todos, partidasConcluidas])

  const grupos = agruparResultados(
    modalidade === 'todas' ? todos : todos.filter((linha) => linha.slug === modalidade),
  )

  const partidasFiltradas =
    modalidade === 'todas'
      ? partidasConcluidas
      : partidasConcluidas.filter((jogo) => jogo.slug === modalidade)

  const temConteudo = todos.length > 0 || partidasConcluidas.length > 0

  return (
    <>
      <PageHero
        chapeu="Placar oficial"
        titulo="Resultados"
        descricao="Resultados oficiais por modalidade e categoria, além dos placares das partidas concluídas."
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {dados.loading ? (
          <CarregandoPublico texto="Carregando resultados…" />
        ) : dados.error ? (
          <ErroPublico mensagem={dados.error} onRecarregar={dados.reload} />
        ) : !temConteudo ? (
          <Vazio
            titulo="Aguardando os primeiros resultados"
            texto="Assim que a organização publicar um resultado oficial ou encerrar uma partida, ele aparece aqui."
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

            {grupos.length === 0 && partidasFiltradas.length === 0 ? (
              <Vazio titulo="Nenhum resultado nesta modalidade" texto="Selecione outra modalidade." />
            ) : (
              <div className="space-y-8">
                {grupos.length > 0 ? (
                  <section aria-labelledby="titulo-podios">
                    {partidasFiltradas.length > 0 ? (
                      <h2
                        id="titulo-podios"
                        className="mb-3 font-display text-2xl font-bold uppercase tracking-tight text-noite-900"
                      >
                        Pódios oficiais
                      </h2>
                    ) : null}
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
