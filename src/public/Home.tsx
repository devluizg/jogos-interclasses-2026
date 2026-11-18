import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Flame,
  MapPin,
  Medal,
  Newspaper,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'
import type {
  ClassificacaoPublica,
  Noticia,
  Programacao,
  ResultadoPublico,
  TacaPublica,
} from '@/lib/types'
import { cfgTexto, useConfig, useContagem, useRealtime, useSeo } from './hooks'
import {
  agruparResultados,
  dataCurta,
  diaSemanaCurto,
  horaCurta,
  nomeTurma,
  periodoEvento,
  tituloCategoria,
} from './utils'
import {
  BotaoLink,
  Card,
  Container,
  Medalha,
  NumeroTurma,
  Section,
  StatusBadge,
  Vazio,
  VerTudo,
} from './ui'

type Resumo = {
  proximos: Programacao[]
  resultados: ResultadoPublico[]
  classificacao: ClassificacaoPublica[]
  noticias: Noticia[]
  taca: TacaPublica[]
  contagens: { turmas: number; modalidades: number; jogos: number; resultados: number }
}

export default function Home() {
  const { configs } = useConfig()
  const inicio = cfgTexto(configs, 'evento_inicio')
  const fim = cfgTexto(configs, 'evento_fim')
  const tema = cfgTexto(configs, 'evento_tema')
  const sobre = cfgTexto(configs, 'evento_sobre')
  const local = cfgTexto(configs, 'evento_local', 'Escola Estadual Celso Rodrigues')
  const nomeEvento = cfgTexto(configs, 'evento_nome', 'Jogos Interclasses 2026')
  const contagem = useContagem(inicio)
  const fimMs = fim ? new Date(`${fim}T23:59:59-03:00`).getTime() : null
  const encerrado = fimMs !== null && Number.isFinite(fimMs) && Date.now() > fimMs

  const dados = useAsync<Resumo>(async () => {
    const [prox, res, classif, noticias, taca, turmas, modalidades, jogos, resultados] = await Promise.all([
      supabase
        .from('vw_programacao')
        .select('*')
        .in('status', ['programado', 'em_andamento', 'adiado'])
        .order('data_hora', { ascending: true, nullsFirst: false })
        .limit(16),
      supabase
        .from('vw_resultados_publicos')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(48),
      supabase.from('vw_classificacao_esportiva').select('*').order('posicao').limit(5),
      supabase
        .from('noticias')
        .select('*')
        .eq('publicada', true)
        .order('publicado_em', { ascending: false, nullsFirst: false })
        .limit(3),
      supabase.from('vw_taca_publica').select('*').order('posicao').limit(3),
      supabase.from('vw_turmas_publicas').select('*', { count: 'exact', head: true }),
      supabase.from('modalidades').select('*', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('vw_programacao').select('*', { count: 'exact', head: true }),
      supabase.from('vw_resultados_publicos').select('*', { count: 'exact', head: true }),
    ])

    for (const r of [prox, res, classif, noticias, taca, turmas, modalidades, jogos, resultados]) {
      if (r.error) throw r.error
    }

    const proximos = ((prox.data ?? []) as Programacao[])
      .filter((p) => p.data_hora)
      .sort((a, b) => {
        const andA = a.status === 'em_andamento'
        const andB = b.status === 'em_andamento'
        if (andA !== andB) return andA ? -1 : 1
        return new Date(a.data_hora as string).getTime() - new Date(b.data_hora as string).getTime()
      })
      .slice(0, 4)

    return {
      proximos,
      resultados: (res.data ?? []) as ResultadoPublico[],
      classificacao: (classif.data ?? []) as ClassificacaoPublica[],
      noticias: (noticias.data ?? []) as Noticia[],
      taca: (taca.data ?? []) as TacaPublica[],
      contagens: {
        turmas: turmas.count ?? 0,
        modalidades: modalidades.count ?? 0,
        jogos: jogos.count ?? 0,
        resultados: resultados.count ?? 0,
      },
    }
  })

  useRealtime(
    [
      'resultados',
      'partidas',
      'partida_participantes',
      'configuracoes',
      'noticias',
      'taca_notas',
      'taca_criterios',
    ],
    dados.reload,
  )
  useSeo({ descricao: `${nomeEvento}. ${tema}` })

  const grupos = agruparResultados(dados.data?.resultados ?? []).slice(0, 3)
  const contagens = dados.data?.contagens
  const classificacao = dados.data?.classificacao ?? []
  const tacaPublicada = (dados.data?.taca ?? []).length > 0

  return (
    <>
      <section className="relative overflow-hidden bg-noite-950 text-white">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(70% 90% at 12% 10%, rgba(236,77,9,0.45) 0%, rgba(236,77,9,0) 60%), radial-gradient(55% 80% at 92% 0%, rgba(69,181,247,0.28) 0%, rgba(69,181,247,0) 60%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, #ffffff 0 1px, transparent 1px 14px)',
          }}
        />
        <Container className="relative grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-300">
              {local.split('–')[0].trim()}
            </p>
            <h1 className="mt-3 font-display text-5xl font-extrabold uppercase leading-[0.88] tracking-tight sm:text-7xl lg:text-8xl">
              Jogos
              <br />
              Interclasses
              <span className="ml-2 inline-block text-brand-400 sm:ml-3">2026</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">{tema}</p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand-400" /> {periodoEvento(inicio, fim)}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-400" /> Santo Antônio do Tauá/PA
              </span>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <BotaoLink to="/programacao">
                Ver programação <ArrowRight className="h-4 w-4" />
              </BotaoLink>
              <BotaoLink to="/classificacao" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                Classificação
              </BotaoLink>
            </div>
          </div>

          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <div className="absolute -inset-3 rounded-[2.5rem] bg-brand-500/20 blur-2xl" />
              <div className="relative flex h-44 w-44 items-center justify-center rounded-[2rem] bg-white p-4 shadow-2xl sm:h-56 sm:w-56">
                <img
                  src="/brand/brasao-512.png"
                  alt="Brasão da Escola Estadual Celso Rodrigues"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            {contagem && !contagem.passado ? (
              <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Contagem para a abertura
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  {[
                    ['Dias', contagem.dias],
                    ['Horas', contagem.horas],
                    ['Min', contagem.minutos],
                  ].map(([rotulo, valor]) => (
                    <div key={rotulo as string} className="rounded-xl bg-white/10 py-2">
                      <p className="font-display text-3xl font-extrabold leading-none text-white">
                        {String(valor).padStart(2, '0')}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {rotulo}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : encerrado ? (
              <div className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-300">
                <Trophy className="mr-1.5 inline h-4 w-4 text-ouro-400" /> Edição encerrada
              </div>
            ) : contagem?.passado ? (
              <div className="rounded-full border border-brand-400/40 bg-brand-500/15 px-5 py-2 text-sm font-semibold text-brand-200">
                <Flame className="mr-1.5 inline h-4 w-4" /> O evento está em andamento
              </div>
            ) : (
              <div className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-300">
                Datas em breve
              </div>
            )}
          </div>
        </Container>
      </section>

      <section className="border-b border-noite-900/10 bg-white">
        <Container className="grid grid-cols-2 gap-4 py-6 sm:grid-cols-4">
          {[
            { rotulo: 'Turmas', valor: contagens?.turmas, icone: Users },
            { rotulo: 'Modalidades', valor: contagens?.modalidades, icone: Trophy },
            { rotulo: 'Jogos', valor: contagens?.jogos, icone: CalendarDays },
            { rotulo: 'Resultados', valor: contagens?.resultados, icone: Medal },
          ].map((item) => (
            <div key={item.rotulo} className="flex items-center gap-3">
              <div className="rounded-xl bg-areia-100 p-2.5 text-noite-700">
                <item.icone className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-3xl font-extrabold leading-none text-noite-900">
                  {dados.loading ? '—' : (item.valor ?? 0)}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {item.rotulo}
                </p>
              </div>
            </div>
          ))}
        </Container>
      </section>

      <Section
        eyebrow="Acontece nos jogos"
        titulo="Próximos jogos"
        descricao="Programação oficial divulgada pela organização. Horários e locais podem ser ajustados."
        acao={<VerTudo to="/programacao" />}
        className="pb-0"
      >
        {dados.loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : (dados.data?.proximos ?? []).length === 0 ? (
          <Vazio
            titulo="Programação em preparação"
            texto="Assim que a tabela de jogos for divulgada, ela aparece aqui automaticamente."
            icone={<CalendarDays className="h-7 w-7" />}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(dados.data?.proximos ?? []).map((jogo) => (
              <Card key={jogo.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                      {tituloCategoria(jogo.modalidade, jogo.categoria)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {dataCurta(jogo.data_hora)} · {diaSemanaCurto(jogo.data_hora)} ·{' '}
                      <Clock className="mb-0.5 inline h-3.5 w-3.5" /> {horaCurta(jogo.data_hora)}
                    </p>
                  </div>
                  <StatusBadge status={jogo.status} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {jogo.turmas.length > 0 ? (
                    jogo.turmas.map((numero) => (
                      <span key={numero} className="inline-flex items-center gap-1.5 rounded-lg bg-areia-100 px-2 py-1">
                        <NumeroTurma numero={numero} className="h-7 min-w-7 text-base" />
                        <span className="pr-1 text-xs font-medium text-slate-600">{nomeTurma({ numero })}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">Turmas a definir</span>
                  )}
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  <MapPin className="mb-0.5 inline h-3.5 w-3.5" /> {jogo.local ?? 'Local a definir'} ·{' '}
                  {jogo.fase.replace(/_/g, ' ')}
                </p>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section
        eyebrow="Placar oficial"
        titulo="Últimos resultados"
        descricao="Somente resultados publicados pela organização."
        acao={<VerTudo to="/resultados" />}
      >
        {dados.loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : grupos.length === 0 ? (
          <Vazio
            titulo="Aguardando os primeiros resultados"
            texto="Nenhum resultado oficial foi publicado até agora."
            icone={<Medal className="h-7 w-7" />}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {grupos.map((grupo) => (
              <Card key={grupo.chave} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                    {tituloCategoria(grupo.modalidade, grupo.categoria)}
                  </p>
                  <Medal className="h-4 w-4 text-noite-300" />
                </div>
                <ul className="mt-3 space-y-2.5">
                  {grupo.itens.map((item) => (
                    <li key={item.id} className="flex items-center gap-2.5">
                      <Medalha posicao={item.colocacao} className="h-7 w-7 text-base" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-noite-900">
                        {item.nome_equipe ?? `Turma ${item.numero}`}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {item.pontos ?? 0} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <section className="border-y border-noite-900/10 bg-white">
        <Section
          eyebrow="Disputa geral"
          titulo="Classificação"
          descricao="Pontuação acumulada por turma nos resultados oficiais."
          acao={<VerTudo to="/classificacao" />}
          className="py-10 sm:py-12"
        >
          {dados.loading ? (
            <div className="h-56 animate-pulse rounded-2xl bg-areia-100" />
          ) : classificacao.length === 0 || (contagens?.resultados ?? 0) === 0 ? (
            <Vazio
              titulo="Classificação em preparação"
              texto="A tabela começa a valer com a publicação do primeiro resultado oficial."
              icone={<Trophy className="h-7 w-7" />}
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="grid grid-cols-[2.2rem_1fr_3.5rem] items-center gap-2 border-b border-noite-900/10 bg-areia-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:grid-cols-[3rem_1fr_3rem_3rem_3rem_5rem] sm:px-4">
                <span>#</span>
                <span>Turma</span>
                <span className="hidden text-center sm:block">O</span>
                <span className="hidden text-center sm:block">P</span>
                <span className="hidden text-center sm:block">B</span>
                <span className="text-right">Pts</span>
              </div>
              <div className="divide-y divide-noite-900/5">
                {classificacao.map((linha) => (
                  <Link
                    key={linha.turma_id}
                    to="/classificacao"
                    className="grid grid-cols-[2.2rem_1fr_3.5rem] items-center gap-2 px-3 py-2.5 hover:bg-areia-50 sm:grid-cols-[3rem_1fr_3rem_3rem_3rem_5rem] sm:px-4"
                  >
                    <Medalha posicao={linha.posicao} className="h-7 w-7 text-sm" />
                    <span className="flex min-w-0 items-center gap-2">
                      <NumeroTurma numero={linha.numero} cor={linha.cor} className="h-7 min-w-7 text-sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-noite-900">
                          {linha.nome_equipe ?? `Turma ${linha.numero}`}
                        </span>
                        <span className="block text-[10px] text-slate-500 sm:hidden">
                          {linha.ouros} O · {linha.pratas} P · {linha.bronzes} B
                        </span>
                      </span>
                    </span>
                    <span className="hidden text-center text-sm tabular-nums text-slate-600 sm:block">{linha.ouros}</span>
                    <span className="hidden text-center text-sm tabular-nums text-slate-600 sm:block">{linha.pratas}</span>
                    <span className="hidden text-center text-sm tabular-nums text-slate-600 sm:block">{linha.bronzes}</span>
                    <span className="text-right font-display text-xl font-extrabold text-noite-900">
                      {linha.pontos}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </Section>
      </section>

      {(dados.data?.noticias ?? []).length > 0 ? (
        <Section
          eyebrow="Comunicados"
          titulo="Notícias"
          acao={<VerTudo to="/noticias" />}
        >
          <div className="grid gap-4 md:grid-cols-3">
            {(dados.data?.noticias ?? []).map((noticia) => (
              <Link key={noticia.id} to={`/noticias/${noticia.slug}`} className="group">
                <Card className="flex h-full flex-col p-4 transition-transform group-hover:-translate-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                    <Newspaper className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
                    {dataCurta(noticia.publicado_em)}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-bold uppercase leading-tight text-noite-900">
                    {noticia.titulo}
                  </h3>
                  {noticia.resumo ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{noticia.resumo}</p>
                  ) : null}
                  <span className="mt-auto pt-3 text-xs font-semibold text-brand-700">Ler notícia →</span>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      {tacaPublicada ? (
        <section className="bg-noite-950 text-white">
          <Container className="grid gap-6 py-10 sm:py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300">
                <Sparkles className="mr-1.5 inline h-4 w-4" /> Premiação paralela
              </p>
              <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">
                {cfgTexto(configs, 'taca_nome', 'Taça Turma Protagonista')}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
                Desempenho esportivo, participação, torcida, identificação e conduta. Uma disputa que vai além do placar.
              </p>
              <BotaoLink to="/taca" className="mt-5">
                Ver ranking da Taça <ArrowRight className="h-4 w-4" />
              </BotaoLink>
            </div>
            <div className="space-y-2">
              {(dados.data?.taca ?? []).map((linha) => (
                <div
                  key={linha.turma_id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
                >
                  <Medalha posicao={linha.posicao} />
                  <NumeroTurma numero={linha.numero} cor={linha.cor} className="bg-white/10" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {linha.nome_equipe ?? `Turma ${linha.numero}`}
                  </span>
                  <span className="font-display text-2xl font-extrabold text-brand-300">
                    {linha.pontuacao_final}
                  </span>
                </div>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {sobre ? (
        <Section eyebrow="Sobre os jogos" titulo="Mais que uma competição">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="p-5">
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{sobre}</p>
            </Card>
            <Card className="bg-brand-600 p-5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-100">Tema 2026</p>
              <p className="mt-2 font-display text-3xl font-bold uppercase leading-tight">{tema}</p>
              <p className="mt-4 text-xs leading-relaxed text-brand-100">
                Evento organizado pela Escola Estadual Celso Rodrigues, em Santo Antônio do Tauá/PA.
              </p>
            </Card>
          </div>
        </Section>
      ) : null}
    </>
  )
}
