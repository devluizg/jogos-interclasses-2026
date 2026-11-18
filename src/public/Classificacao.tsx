import { Trophy } from 'lucide-react'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'
import type { ClassificacaoPublica, Medalheiro } from '@/lib/types'
import { useRealtime, useSeo } from './hooks'
import { Card, CarregandoPublico, ErroPublico, Medalha, NumeroTurma, PageHero, Vazio } from './ui'

type Dados = {
  classificacao: ClassificacaoPublica[]
  medalheiro: Medalheiro[]
  pontos: { colocacao: number; pontos: number }[]
}

export default function Classificacao() {
  useSeo({
    titulo: 'Classificação',
    descricao: 'Classificação geral e medalheiro dos Jogos Interclasses 2026, atualizados a cada resultado oficial.',
  })

  const dados = useAsync<Dados>(async () => {
    const [classif, medalhas, pontuacao] = await Promise.all([
      supabase.from('vw_classificacao_esportiva').select('*').order('posicao'),
      supabase.from('vw_medalheiro').select('*'),
      supabase.from('pontuacao_colocacao').select('colocacao, pontos').eq('ativo', true).order('colocacao'),
    ])
    for (const r of [classif, medalhas, pontuacao]) if (r.error) throw r.error
    return {
      classificacao: (classif.data ?? []) as ClassificacaoPublica[],
      medalheiro: (medalhas.data ?? []) as Medalheiro[],
      pontos: (pontuacao.data ?? []) as { colocacao: number; pontos: number }[],
    }
  })

  useRealtime(['resultados', 'partida_participantes', 'conduta_ocorrencias', 'configuracoes'], dados.reload)

  const classificacao = dados.data?.classificacao ?? []
  const medalheiro = [...(dados.data?.medalheiro ?? [])].sort(
    (a, b) => b.ouros - a.ouros || b.pratas - a.pratas || b.bronzes - a.bronzes || a.numero - b.numero,
  )
  const pontos = dados.data?.pontos ?? []
  const temEmpate = classificacao.some((linha) => linha.empate_persistente)
  const temResultados = classificacao.some(
    (linha) => linha.pontos > 0 || linha.ouros > 0 || linha.pratas > 0 || linha.bronzes > 0,
  )

  return (
    <>
      <PageHero
        chapeu="Disputa geral"
        titulo="Classificação"
        descricao="Pontuação acumulada pelas turmas considerando apenas os resultados oficiais publicados."
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {dados.loading ? (
          <CarregandoPublico texto="Calculando a classificação…" />
        ) : dados.error ? (
          <ErroPublico mensagem={dados.error} onRecarregar={dados.reload} />
        ) : classificacao.length === 0 || !temResultados ? (
          <Vazio
            titulo="Classificação em preparação"
            texto="A tabela é montada automaticamente a partir dos resultados oficiais."
            icone={<Trophy className="h-7 w-7" />}
          />
        ) : (
          <>
            <Card className="overflow-hidden">
              <div className="grid grid-cols-[2.2rem_1fr_2.2rem_2.2rem_2.2rem_3.2rem] items-center gap-1.5 border-b border-noite-900/10 bg-noite-950 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:grid-cols-[3rem_1fr_3rem_3rem_3rem_4.5rem] sm:gap-2 sm:px-5">
                <span>Pos.</span>
                <span>Turma</span>
                <span className="text-center" title="Ouros">O</span>
                <span className="text-center" title="Pratas">P</span>
                <span className="text-center" title="Bronzes">B</span>
                <span className="text-right">Pontos</span>
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
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-noite-900">
                          {linha.nome_equipe ?? `Turma ${linha.numero}`}
                        </p>
                        {linha.posicao === 1 ? (
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                            Líder geral
                          </p>
                        ) : null}
                      </div>
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

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
              <span><strong className="font-semibold text-slate-700">O/P/B</strong> = ouros, pratas e bronzes</span>
              {temEmpate ? <span className="text-amber-700">Há empate persistente aplicando os critérios de desempate.</span> : null}
            </div>

            {pontos.length > 0 ? (
              <Card className="mt-6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">Tabela de pontos</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pontos.map((p) => (
                    <span key={p.colocacao} className="inline-flex items-center gap-1.5 rounded-lg bg-areia-100 px-2.5 py-1.5 text-xs text-slate-700">
                      <Medalha posicao={p.colocacao} className="h-5 w-5 text-[11px]" />
                      {p.pontos} pts
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Apenas as colocações premiadas somam pontos. Demais colocações não pontuam.
                </p>
              </Card>
            ) : null}
          </>
        )}
      </div>

      {medalheiro.length > 0 && !dados.loading ? (
        <div className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-noite-900">Medalheiro</h2>
            <span className="text-[11px] uppercase tracking-wide text-slate-500">Total de pódios</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {medalheiro.map((linha) => (
              <Card key={linha.turma_id} className="flex items-center gap-3 p-3.5">
                <NumeroTurma numero={linha.numero} cor={linha.cor} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-noite-900">{linha.nome_equipe ?? `Turma ${linha.numero}`}</p>
                  <p className="text-[11px] text-slate-500">{linha.total} pódios</p>
                </div>
                <div className="flex gap-2 text-center">
                  {[
                    { valor: linha.ouros, cor: 'text-ouro-600' },
                    { valor: linha.pratas, cor: 'text-slate-500' },
                    { valor: linha.bronzes, cor: 'text-[#a56b43]' },
                  ].map((medalha, i) => (
                    <div key={i}>
                      <p className={`font-display text-xl font-extrabold leading-none ${medalha.cor}`}>{medalha.valor}</p>
                      <p className="text-[9px] font-semibold uppercase text-slate-400">{['ouro', 'prata', 'bronze'][i]}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </>
  )
}
