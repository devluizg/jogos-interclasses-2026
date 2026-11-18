import { Trophy } from 'lucide-react'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'
import type { ClassificacaoPublica } from '@/lib/types'
import { useRealtime, useSeo } from './hooks'
import { Card, CarregandoPublico, ErroPublico, Medalha, NumeroTurma, PageHero, Vazio } from './ui'

export default function Classificacao() {
  useSeo({
    titulo: 'Classificação',
    descricao: 'Classificação geral dos Jogos Interclasses 2026, atualizada a cada resultado oficial.',
  })

  const dados = useAsync<ClassificacaoPublica[]>(async () => {
    const { data, error } = await supabase
      .from('vw_classificacao_esportiva')
      .select('*')
      .order('posicao')
    if (error) throw error
    return (data ?? []) as ClassificacaoPublica[]
  })

  useRealtime(['resultados', 'partida_participantes', 'conduta_ocorrencias', 'configuracoes'], dados.reload)

  const classificacao = dados.data ?? []
  const temResultados = classificacao.some(
    (linha) => linha.pontos > 0 || linha.ouros > 0 || linha.pratas > 0 || linha.bronzes > 0,
  )

  return (
    <>
      <PageHero
        chapeu="Disputa geral"
        titulo="Classificação"
        descricao="Pontuação e medalhas acumuladas por turma."
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

            <p className="mt-3 text-[11px] text-slate-500">
              <strong className="font-semibold text-slate-700">O/P/B</strong> = ouros, pratas e bronzes
            </p>
          </>
        )}
      </div>
    </>
  )
}
