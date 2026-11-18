import { useMemo, useState } from 'react'
import { CalendarDays, Clock, MapPin } from 'lucide-react'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'
import type { Programacao as Jogo } from '@/lib/types'
import { useRealtime, useSeo } from './hooks'
import { chaveDia, dataCurta, dataLonga, diaSemanaCurto, horaCurta, nomeTurma, rotuloFase, tituloCategoria } from './utils'
import {
  Card,
  CarregandoPublico,
  Container,
  ErroPublico,
  NumeroTurma,
  PageHero,
  StatusBadge,
  Vazio,
} from './ui'

export default function Programacao() {
  useSeo({
    titulo: 'Programação',
    descricao: 'Tabela oficial de jogos, horários e locais dos Jogos Interclasses 2026.',
  })

  const [dia, setDia] = useState('todos')
  const [modalidade, setModalidade] = useState('todas')

  const dados = useAsync<Jogo[]>(async () => {
    const { data, error } = await supabase
      .from('vw_programacao')
      .select('*')
      .neq('status', 'cancelado')
      .order('data_hora', { ascending: true, nullsFirst: false })
      .limit(500)
    if (error) throw error
    return (data ?? []) as Jogo[]
  })

  useRealtime(['partidas', 'partida_participantes', 'configuracoes'], dados.reload)

  const jogos = dados.data ?? []

  const dias = useMemo(() => {
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

  const modalidades = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const jogo of jogos) mapa.set(jogo.slug, jogo.modalidade)
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [jogos])

  const filtrados = jogos.filter(
    (jogo) => (modalidade === 'todas' || jogo.slug === modalidade) && (dia === 'todos' || chaveDia(jogo.data_hora) === dia),
  )

  const grupos = dias
    .map(([chave, lista]) => [chave, lista.filter((jogo) => filtrados.includes(jogo))] as [string, Jogo[]])
    .filter(([, lista]) => lista.length > 0)

  return (
    <>
      <PageHero
        chapeu="Tabela oficial"
        titulo="Programação"
        descricao="Jogos, horários e locais divulgados pela organização. Acompanhe também os jogos em andamento."
      >
        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
            {jogos.length} jogos na tabela
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
            {modalidades.length} modalidades com jogos
          </span>
        </div>
      </PageHero>

      <Container className="py-6">
        <Card className="mb-6 p-3">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setDia('todos')}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${dia === 'todos' ? 'bg-noite-900 text-white' : 'bg-areia-100 text-noite-800'}`}
            >
              Todos os dias
            </button>
            {dias.map(([chave, lista]) => (
              <button
                key={chave}
                type="button"
                onClick={() => setDia(chave)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${dia === chave ? 'bg-noite-900 text-white' : 'bg-areia-100 text-noite-800'}`}
              >
                {chave === 'a-definir' ? 'A definir' : `${dataCurta(chave)} · ${diaSemanaCurto(chave)}`}
                <span className="ml-1.5 opacity-60">{lista.length}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 border-t border-noite-900/5 px-1 pt-2">
            <label htmlFor="modalidade" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Modalidade
            </label>
            <select
              id="modalidade"
              value={modalidade}
              onChange={(e) => setModalidade(e.target.value)}
              className="min-h-9 flex-1 rounded-lg border border-noite-900/15 bg-white px-2 text-sm text-noite-900 sm:flex-none"
            >
              <option value="todas">Todas</option>
              {modalidades.map(([slug, nome]) => (
                <option key={slug} value={slug}>{nome}</option>
              ))}
            </select>
            {(dia !== 'todos' || modalidade !== 'todas') ? (
              <button
                type="button"
                onClick={() => { setDia('todos'); setModalidade('todas') }}
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                Limpar
              </button>
            ) : null}
          </div>
        </Card>

        {dados.loading ? (
          <CarregandoPublico texto="Carregando a tabela de jogos…" />
        ) : dados.error ? (
          <ErroPublico mensagem={dados.error} onRecarregar={dados.reload} />
        ) : grupos.length === 0 ? (
          <Vazio
            titulo="Nenhum jogo encontrado"
            texto="Ajuste os filtros ou aguarde a divulgação da tabela pela organização."
            icone={<CalendarDays className="h-7 w-7" />}
          />
        ) : (
          <div className="space-y-8">
            {grupos.map(([chave, lista]) => (
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

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {jogo.turmas.length > 0 ? (
                              jogo.turmas.map((numero) => (
                                <span key={numero} className="inline-flex items-center gap-1.5 rounded-lg bg-areia-100 py-1 pl-1 pr-2">
                                  <NumeroTurma numero={numero} className="h-7 min-w-7 text-sm" />
                                  <span className="text-xs font-medium text-slate-700">{nomeTurma({ numero })}</span>
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500">Turmas a definir</span>
                            )}
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
