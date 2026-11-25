import { Medal, Trophy } from 'lucide-react'
import { calcularArtilharia, calcularMedalhas } from '@/lib/chaveamentosEngine'
import { useAsync } from '@/lib/useAsync'
import {
  carregarChaveamentosPublicos,
  extrairAbasArtilharia,
  extrairAbaMedalhas,
} from './chaveamentosPublico'
import { useRealtime, useSeo } from './hooks'
import { Card, CarregandoPublico, ErroPublico, Medalha, PageHero, Vazio } from './ui'

export default function Medalhas() {
  useSeo({
    titulo: 'Quadro de Medalhas',
    descricao: 'Classificação geral por delegação e artilharia do futsal dos Jogos Interclasses 2026.',
  })

  const dados = useAsync(carregarChaveamentosPublicos)
  useRealtime(['chaveamentos'], dados.reload)

  const lista = dados.data ?? []
  const abaMedalhas = extrairAbaMedalhas(lista)
  const abasArtilharia = extrairAbasArtilharia(lista)
  const classificacao = abaMedalhas ? calcularMedalhas(abaMedalhas) : null

  return (
    <>
      <PageHero
        chapeu="Disputa geral"
        titulo="Quadro de Medalhas"
        descricao="Pontuação por delegação e artilharia do futsal, atualizadas a cada resultado oficial."
      />

      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {dados.loading ? (
          <CarregandoPublico texto="Calculando o quadro de medalhas…" />
        ) : dados.error ? (
          <ErroPublico mensagem={dados.error} onRecarregar={dados.reload} />
        ) : !classificacao ? (
          <Vazio
            titulo="Quadro em preparação"
            texto="A classificação por delegação ainda não foi publicada."
            icone={<Trophy className="h-7 w-7" />}
          />
        ) : (
          <>
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-noite-900/10 bg-noite-950 px-4 py-3 sm:px-5">
                <div>
                  <p className="text-sm font-bold text-white">Classificação por Delegação</p>
                  <p className="text-[11px] text-slate-400">
                    {classificacao.podiosLancados} de {classificacao.totalPodios} pódios lançados
                  </p>
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
                {classificacao.linhas.map((linha) => (
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
                    <span className="text-center text-xs font-semibold text-amber-700">{linha.ouro}</span>
                    <span className="text-center text-xs font-semibold text-slate-600">{linha.prata}</span>
                    <span className="text-center text-xs font-semibold text-orange-700">{linha.bronze}</span>
                    <span className="text-right font-display text-sm font-extrabold tabular-nums text-noite-900">
                      {linha.pontos}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {abasArtilharia.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-brand-700" />
                  <h2 className="font-display text-xl font-bold text-noite-900">Artilharia do Futsal</h2>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {abasArtilharia.map((aba) => {
                    const rank = calcularArtilharia(aba)
                    return (
                      <Card key={aba.id} className="overflow-hidden">
                        <div className="border-b border-noite-900/10 bg-areia-50 px-4 py-3">
                          <p className="text-sm font-bold text-noite-900">{aba.titulo}</p>
                          <p className="text-[11px] text-slate-500">{aba.subtitulo}</p>
                        </div>
                        <div className="divide-y divide-noite-900/5">
                          {rank.slice(0, 10).map((linha) => (
                            <div key={linha.atleta.id} className="flex items-center gap-2 px-4 py-2.5">
                              <span className="w-6 shrink-0 text-center text-xs font-bold text-slate-400">{linha.pos}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-noite-900">{linha.atleta.nome}</p>
                                <p className="truncate text-[10px] text-slate-500">
                                  {linha.atleta.equipe} · {linha.atleta.turma}
                                </p>
                              </div>
                              <span className="shrink-0 font-display text-sm font-extrabold tabular-nums text-brand-700">
                                {linha.total}
                              </span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}
