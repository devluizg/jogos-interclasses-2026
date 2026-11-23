import { useMemo, useState } from 'react'
import { CalendarDays, Clock, MapPin, Search } from 'lucide-react'
import type { BlocoProgramacao } from '@/lib/chaveamentosTypes'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'
import type { Programacao as Jogo } from '@/lib/types'
import { BlocoProgramacaoCard, ehLogisticaOuIntervalo } from './BlocoProgramacaoCard'
import { carregarChaveamentosPublicos, extrairBlocosProgramacao } from './chaveamentosPublico'
import { useRealtime, useSeo } from './hooks'
import { ParticipantesPartida } from './ParticipantesPartida'
import { chaveDia, dataCurta, dataLonga, diaSemanaCurto, horaCurta, rotuloFase, tituloCategoria } from './utils'
import {
  Card,
  CarregandoPublico,
  Container,
  ErroPublico,
  PageHero,
  StatusBadge,
  Vazio,
} from './ui'

const ORDEM_DIAS = ['Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira']
const TURMAS_OPCOES = ['101', '102', '103', '104', '201', '202', '203', '204', '301', '302']

type DadosProg = {
  jogos: Jogo[]
  blocos: BlocoProgramacao[]
}

export default function Programacao() {
  useSeo({
    titulo: 'Programação',
    descricao: 'Tabela oficial de jogos, horários e locais dos Jogos Interclasses 2026.',
  })

  const [dia, setDia] = useState('todos')
  const [modalidade, setModalidade] = useState('todas')
  const [turma, setTurma] = useState('todas')
  const [busca, setBusca] = useState('')

  const dados = useAsync<DadosProg>(async () => {
    const [resJogos, chaveamentos] = await Promise.all([
      supabase
        .from('vw_programacao')
        .select('*')
        .neq('status', 'cancelado')
        .order('data_hora', { ascending: true, nullsFirst: false })
        .limit(500),
      carregarChaveamentosPublicos(),
    ])
    if (resJogos.error) throw resJogos.error
    return {
      jogos: (resJogos.data ?? []) as Jogo[],
      blocos: extrairBlocosProgramacao(chaveamentos).filter((b) => !ehLogisticaOuIntervalo(b)),
    }
  })

  useRealtime(['partidas', 'partida_participantes', 'configuracoes', 'chaveamentos'], dados.reload)

  const jogos = dados.data?.jogos ?? []
  const blocos = dados.data?.blocos ?? []
  const usarPlanilha = jogos.length === 0 && blocos.length > 0
  const termo = busca.trim().toLowerCase()
  const filtroPessoalAtivo = turma !== 'todas' || Boolean(termo)

  // --- Modo Planilha (Programação Geral do /admin/chaveamentos) ---
  const diasBlocos = useMemo(() => {
    const mapa = new Map<string, BlocoProgramacao[]>()
    for (const b of blocos) {
      const lista = mapa.get(b.dia)
      if (lista) lista.push(b)
      else mapa.set(b.dia, [b])
    }
    return [...mapa.entries()].sort(
      ([a], [b]) =>
        (ORDEM_DIAS.indexOf(a) === -1 ? 99 : ORDEM_DIAS.indexOf(a)) -
        (ORDEM_DIAS.indexOf(b) === -1 ? 99 : ORDEM_DIAS.indexOf(b)),
    )
  }, [blocos])

  const modalidadesBlocos = useMemo(() => {
    return [...new Set(blocos.map((b) => b.modalidade))].sort((a, b) => a.localeCompare(b))
  }, [blocos])

  const gruposBlocos = useMemo(() => {
    return diasBlocos
      .filter(([d]) => dia === 'todos' || d === dia)
      .map(([d, lista]) => {
        const filtrada = lista.filter((b) => {
          if (modalidade !== 'todas' && b.modalidade !== modalidade) return false
          const textoCompleto = `${b.modalidade} ${b.categoriaFase} ${b.confronto} ${b.local}`.toLowerCase()
          if (turma !== 'todas' && !new RegExp(`\\b${turma}\\b`).test(textoCompleto)) return false
          if (termo && !textoCompleto.includes(termo)) return false
          return true
        })
        // Agrupa internamente por Manhã / Tarde mantendo a ordem
        const porTurno = new Map<string, BlocoProgramacao[]>()
        for (const item of filtrada) {
          const chaveTurno = item.turno.toLowerCase().includes('tarde') ? 'Tarde' : 'Manhã'
          const arr = porTurno.get(chaveTurno)
          if (arr) arr.push(item)
          else porTurno.set(chaveTurno, [item])
        }
        return {
          dia: d,
          total: filtrada.length,
          turnos: [...porTurno.entries()],
        }
      })
      .filter((g) => g.total > 0)
  }, [diasBlocos, dia, modalidade, turma, termo])

  // --- Modo Partidas (tabela partidas do /admin/partidas) ---
  const diasJogos = useMemo(() => {
    const mapa = new Map<string, Jogo[]>()
    for (const jogo of jogos) {
      const chave = chaveDia(jogo.data_hora)
      const lista = mapa.get(chave)
      if (lista) lista.push(jogo)
      else mapa.set(chave, [jogo])
    }
    const comData = [...mapa.entries()]
      .filter(([chave]) => chave !== 'a-definir')
      .sort(([a], [b]) => a.localeCompare(b))
    const semData = mapa.get('a-definir')
    return semData ? [...comData, ['a-definir', semData] as [string, Jogo[]]] : comData
  }, [jogos])

  const modalidadesJogos = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const jogo of jogos) mapa.set(jogo.slug, jogo.modalidade)
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [jogos])

  const filtradosJogos = jogos.filter(
    (jogo) => (modalidade === 'todas' || jogo.slug === modalidade) && (dia === 'todos' || chaveDia(jogo.data_hora) === dia),
  )

  const gruposJogos = diasJogos
    .map(([chave, lista]) => [chave, lista.filter((jogo) => filtradosJogos.includes(jogo))] as [string, Jogo[]])
    .filter(([, lista]) => lista.length > 0)

  const totalItens = usarPlanilha ? blocos.length : jogos.length
  const totalModalidades = usarPlanilha ? modalidadesBlocos.length : modalidadesJogos.length
  const temFiltro = dia !== 'todos' || modalidade !== 'todas' || turma !== 'todas' || Boolean(termo)

  return (
    <>
      <PageHero
        chapeu="Tabela oficial"
        titulo="Programação"
        descricao="Filtre pela sua turma, modalidade ou nome para encontrar seu jogo rapidamente."
      >
        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
            {totalItens} atividades na tabela
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
            {totalModalidades} modalidades
          </span>
        </div>
      </PageHero>

      <Container className="py-6">
        <Card className="mb-6 p-3">
          <div className="scrollbar-none flex snap-x gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setDia('todos')}
              className={`min-h-11 snap-start whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${dia === 'todos' ? 'bg-noite-900 text-white' : 'bg-areia-100 text-noite-800'}`}
            >
              Todos os dias
            </button>
            {usarPlanilha
              ? diasBlocos.map(([nomeDia, lista]) => (
                  <button
                    key={nomeDia}
                    type="button"
                    onClick={() => setDia(nomeDia)}
                    className={`min-h-11 snap-start whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${dia === nomeDia ? 'bg-noite-900 text-white' : 'bg-areia-100 text-noite-800'}`}
                  >
                    {nomeDia}
                    <span className="ml-1.5 opacity-60">{lista.length}</span>
                  </button>
                ))
              : diasJogos.map(([chave, lista]) => (
                  <button
                    key={chave}
                    type="button"
                    onClick={() => setDia(chave)}
                    className={`min-h-11 snap-start whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${dia === chave ? 'bg-noite-900 text-white' : 'bg-areia-100 text-noite-800'}`}
                  >
                    {chave === 'a-definir' ? 'A definir' : `${dataCurta(chave)} · ${diaSemanaCurto(chave)}`}
                    <span className="ml-1.5 opacity-60">{lista.length}</span>
                  </button>
                ))}
          </div>

          <div className="mt-2.5 grid gap-2 border-t border-noite-900/5 pt-2.5 sm:grid-cols-3">
            {usarPlanilha ? (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar seu nome ou local…"
                  className="min-h-11 w-full rounded-lg border border-noite-900/15 bg-white pl-9 pr-3 text-sm text-noite-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                />
              </div>
            ) : null}

            {usarPlanilha ? (
              <select
                aria-label="Filtrar por turma"
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-noite-900/15 bg-white px-3 text-sm text-noite-900"
              >
                <option value="todas">Minha Turma: Todas</option>
                {TURMAS_OPCOES.map((t) => (
                  <option key={t} value={t}>Turma {t}</option>
                ))}
              </select>
            ) : null}

            <div className="flex items-center gap-2">
              <select
                aria-label="Filtrar por modalidade"
                value={modalidade}
                onChange={(e) => setModalidade(e.target.value)}
                className="min-h-11 flex-1 rounded-lg border border-noite-900/15 bg-white px-3 text-sm text-noite-900"
              >
                <option value="todas">Modalidade: Todas</option>
                {usarPlanilha
                  ? modalidadesBlocos.map((nome) => (
                      <option key={nome} value={nome}>{nome}</option>
                    ))
                  : modalidadesJogos.map(([slug, nome]) => (
                      <option key={slug} value={slug}>{nome}</option>
                    ))}
              </select>
              {temFiltro ? (
                <button
                  type="button"
                  onClick={() => {
                    setDia('todos')
                    setModalidade('todas')
                    setTurma('todas')
                    setBusca('')
                  }}
                  className="min-h-11 shrink-0 px-2 text-xs font-semibold text-brand-700 hover:underline"
                >
                  Limpar
                </button>
              ) : null}
            </div>
          </div>
        </Card>

        {dados.loading ? (
          <CarregandoPublico texto="Carregando a tabela de jogos…" />
        ) : dados.error ? (
          <ErroPublico mensagem={dados.error} onRecarregar={dados.reload} />
        ) : usarPlanilha ? (
          gruposBlocos.length === 0 ? (
            <Vazio
              titulo="Nenhum jogo encontrado"
              texto="Ajuste os filtros de dia, turma, modalidade ou busca."
              icone={<CalendarDays className="h-7 w-7" />}
            />
          ) : (
            <div className="space-y-9">
              {gruposBlocos.map((grupo) => (
                <section key={grupo.dia} aria-labelledby={`dia-${grupo.dia}`}>
                  <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-noite-900/10 pb-2">
                    <h2 id={`dia-${grupo.dia}`} className="font-display text-2xl font-bold uppercase tracking-tight text-noite-900 sm:text-3xl">
                      {grupo.dia}
                    </h2>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {grupo.total} {grupo.total === 1 ? 'atividade' : 'atividades'}
                    </span>
                  </div>

                  <div className="space-y-6">
                    {grupo.turnos.map(([nomeTurno, lista]) => (
                      <div key={nomeTurno}>
                        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-700">
                          {nomeTurno}
                        </p>
                        <div className="grid gap-3 md:grid-cols-2">
                          {lista.map((bloco) => (
                            <BlocoProgramacaoCard
                              key={bloco.id}
                              bloco={bloco}
                              abrirAutomatico={filtroPessoalAtivo}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        ) : gruposJogos.length === 0 ? (
          <Vazio
            titulo="Nenhum jogo encontrado"
            texto="Ajuste os filtros ou aguarde a divulgação da tabela pela organização."
            icone={<CalendarDays className="h-7 w-7" />}
          />
        ) : (
          <div className="space-y-8">
            {gruposJogos.map(([chave, lista]) => (
              <section key={chave} aria-labelledby={`dia-${chave}`}>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 id={`dia-${chave}`} className="font-display text-2xl font-bold uppercase tracking-tight text-noite-900">
                    {chave === 'a-definir' ? 'Data a definir' : dataLonga(chave)}
                  </h2>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {lista.length} {lista.length === 1 ? 'jogo' : 'jogos'}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {lista.map((jogo) => (
                    <Card key={jogo.id} className="overflow-hidden">
                      <div className="flex">
                        <div className="flex w-[74px] shrink-0 flex-col items-center justify-center bg-noite-950 px-2 py-4 text-white">
                          <Clock className="mb-1 h-3.5 w-3.5 text-brand-400" />
                          <span className="font-display text-xl font-extrabold leading-none">
                            {jogo.data_hora ? horaCurta(jogo.data_hora) : '—'}
                          </span>
                          <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                            {jogo.data_hora ? 'Horário' : 'A definir'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                                {tituloCategoria(jogo.modalidade, jogo.categoria)}
                              </p>
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

                          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5" /> {jogo.local ?? 'Local a definir'}
                          </p>
                          {jogo.observacoes ? (
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{jogo.observacoes}</p>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Container>
    </>
  )
}
