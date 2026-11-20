import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Download,
  Flame,
  MapPin,
  Medal,
  Newspaper,
  Sparkles,
  Trophy,
  UserRound,
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
import { usePwaInstall } from './usePwaInstall'
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
}

export default function Home() {
  const { configs } = useConfig()
  const { podeInstalar, instalar } = usePwaInstall()
  const inicio = cfgTexto(configs, 'evento_inicio')
  const fim = cfgTexto(configs, 'evento_fim')
  const tema = cfgTexto(configs, 'evento_tema')
  const local = cfgTexto(configs, 'evento_local', 'Escola Estadual Celso Rodrigues')
  const nomeEvento = cfgTexto(configs, 'evento_nome', 'Jogos Interclasses 2026')
  const contagem = useContagem(inicio)
  const fimMs = fim ? new Date(`${fim}T23:59:59-03:00`).getTime() : null
  const encerrado = fimMs !== null && Number.isFinite(fimMs) && Date.now() > fimMs

  const dados = useAsync<Resumo>(async () => {
    const [prox, res, classif, noticias, taca] = await Promise.all([
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
    ])

    for (const r of [prox, res, classif, noticias, taca]) {
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
  const classificacao = dados.data?.classificacao ?? []
  const temClassificacao = classificacao.some(
    (c) => c.pontos > 0 || c.ouros > 0 || c.pratas > 0 || c.bronzes > 0,
  )
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
        <Container className="relative flex flex-col gap-6 py-7 sm:py-12 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-16">
          <div>
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg sm:hidden">
                <img
                  src="/brand/logo-interclasses.jpg"
                  alt="Logo Jogos Interclasses 2026"
                  width={64}
                  height={64}
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300">
                  {local.split('–')[0].trim()}
                </p>
                <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:mt-2 sm:text-6xl lg:text-7xl">
                  Jogos Interclasses{' '}
                  <span className="text-brand-400">2026</span>
                </h1>
              </div>
            </div>

            {tema ? (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">{tema}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300 sm:gap-x-5 sm:text-sm">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-brand-400" /> {periodoEvento(inicio, fim)}
              </span>
              {contagem && !contagem.passado ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  Abertura em {contagem.dias}d {String(contagem.horas).padStart(2, '0')}h
                </span>
              ) : encerrado ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  <Trophy className="h-3.5 w-3.5 text-ouro-400" /> Edição encerrada
                </span>
              ) : contagem?.passado ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-400/40 bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-200">
                  <Flame className="h-3.5 w-3.5" /> Em andamento
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <BotaoLink to="/programacao" className="flex-1 sm:flex-none">
                Ver jogos <ArrowRight className="h-4 w-4" />
              </BotaoLink>
              <BotaoLink
                to="/classificacao"
                variant="outline"
                className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20 sm:flex-none"
              >
                Classificação
              </BotaoLink>
              {podeInstalar ? (
                <button
                  type="button"
                  onClick={() => void instalar()}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-400/40 bg-brand-500/20 px-4 text-sm font-semibold text-brand-100 transition-transform active:scale-[0.98] hover:bg-brand-500/30 sm:w-auto"
                >
                  <Download className="h-4 w-4" /> Instalar app
                </button>
              ) : null}
            </div>
          </div>

          <div className="hidden flex-col items-center justify-center lg:flex">
            <div className="relative">
              <div className="absolute -inset-3 rounded-[2.5rem] bg-brand-500/20 blur-2xl" />
              <div className="relative flex h-52 w-52 items-center justify-center overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <img
                  src="/brand/logo-interclasses.jpg"
                  alt="Logo Jogos Interclasses 2026"
                  width={208}
                  height={208}
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Section
        eyebrow="Acontece nos jogos"
        titulo="Próximos jogos"
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
          <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
            {(dados.data?.proximos ?? []).map((jogo) => (
              <Card key={jogo.id} className="w-[82vw] max-w-sm shrink-0 snap-start p-4 md:w-auto md:max-w-none">
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
                  {jogo.atletas.length > 0 ? (
                    jogo.atletas.map((nome, i) => (
                      <span key={`${nome}-${i}`} className="inline-flex items-center gap-1.5 rounded-lg bg-areia-100 px-2 py-1 text-xs font-medium text-slate-600">
                        <UserRound className="h-3.5 w-3.5 text-brand-700" /> {nome}
                      </span>
                    ))
                  ) : jogo.turmas.length > 0 ? (
                    jogo.turmas.map((numero) => (
                      <span key={numero} className="inline-flex items-center gap-1.5 rounded-lg bg-areia-100 px-2 py-1">
                        <NumeroTurma numero={numero} className="h-7 min-w-7 text-base" />
                        <span className="pr-1 text-xs font-medium text-slate-600">{nomeTurma({ numero })}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">Participantes a definir</span>
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
        eyebrow="Placar"
        titulo="Últimos resultados"
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
          <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
            {grupos.map((grupo) => (
              <Card key={grupo.chave} className="w-[80vw] max-w-sm shrink-0 snap-start p-4 md:w-auto md:max-w-none">
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
          acao={<VerTudo to="/classificacao" />}
          className="py-10 sm:py-12"
        >
          {dados.loading ? (
            <div className="h-56 animate-pulse rounded-2xl bg-areia-100" />
          ) : classificacao.length === 0 || !temClassificacao ? (
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
                    className="grid grid-cols-[2.2rem_1fr_3.5rem] items-center gap-2 px-3 py-2.5 transition-colors hover:bg-areia-50 active:bg-areia-100 sm:grid-cols-[3rem_1fr_3rem_3rem_3rem_5rem] sm:px-4"
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
                <Card className="flex h-full flex-col p-4 transition-transform group-hover:-translate-y-0.5 active:scale-[0.99]">
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
                Desempenho esportivo, participação, torcida, identificação e conduta.
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
    </>
  )
}
