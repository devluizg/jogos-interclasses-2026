import { CalendarDays, MapPin, Medal, Trophy } from 'lucide-react'
import {
  calcularArtilharia,
  calcularCartoes,
  resolverBracket,
  resolverGruposMataMata,
} from '@/lib/chaveamentosEngine'
import type { BlocoProgramacao } from '@/lib/chaveamentosTypes'
import {
  extrairAbasArtilharia,
  extrairBlocosProgramacao,
  extrairCartoes,
  extrairResumosChaveamentos,
  type ChaveamentoPublico,
} from './chaveamentosPublico'
import { Card, Vazio } from './ui'

export default function FichaModalidade({
  chave,
  chaves,
  nomeModalidade,
}: {
  chave: ChaveamentoPublico | null
  chaves: ChaveamentoPublico[]
  nomeModalidade: string
}) {
  if (!chave) {
    return (
      <Vazio
        titulo="Resultados em preparação"
        texto="Os resultados desta modalidade ainda não foram publicados."
        icone={<Trophy className="h-7 w-7" />}
      />
    )
  }

  const resumos = extrairResumosChaveamentos([chave])
  const grupos = chave.abas.filter((a) => a.tipo === 'grupos_mata_mata')
  const brackets = chave.abas.filter((a) => a.tipo === 'mata_mata' || a.tipo === 'repescagem')
  const artilharia = extrairAbasArtilharia([chave])
  const cartoes = extrairCartoes([chave])
  const alvo = nomeModalidade.toLowerCase()
  const primeiraPalavra = alvo.split(' ')[0]
  const blocos = extrairBlocosProgramacao(chaves)
    .filter((b: BlocoProgramacao) =>
      b.modalidade.toLowerCase().includes(alvo) ||
      b.modalidade.toLowerCase().includes(primeiraPalavra) ||
      alvo.includes(b.modalidade.toLowerCase()),
    )
    .slice(0, 12)

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-brand-700" />
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-noite-900">
          Resultados e chaves
        </h2>
      </div>

      {resumos.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="border-b border-noite-900/10 bg-areia-50 px-4 py-3">
            <h3 className="font-display text-lg font-bold uppercase text-noite-900">Pódios</h3>
          </div>
          <div className="divide-y divide-noite-900/5">
            {resumos.map((resumo) => (
              <div key={resumo.abaId} className="px-4 py-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                  {resumo.tituloAba}
                </p>
                {resumo.temPodio ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      ['Ouro', resumo.podio.primeiro, 'border-amber-300 bg-amber-50 text-amber-950'],
                      ['Prata', resumo.podio.segundo, 'border-slate-300 bg-slate-50 text-slate-900'],
                      ['Bronze', resumo.podio.terceiro, 'border-orange-300 bg-orange-50 text-orange-950'],
                    ].map(([rotulo, nome, cor]) => (
                      <div key={rotulo} className={`rounded-lg border p-2.5 ${cor}`}>
                        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-75">
                          <Medal className="h-3 w-3" /> {rotulo}
                        </p>
                        <p className="mt-1 text-xs font-bold leading-snug">{nome}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Pódio a definir.</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {grupos.map((aba) => {
        if (aba.tipo !== 'grupos_mata_mata') return null
        const res = resolverGruposMataMata(aba)
        return (
          <Card key={aba.id} className="overflow-hidden">
            <div className="border-b border-noite-900/10 bg-areia-50 px-4 py-3">
              <h3 className="font-display text-lg font-bold uppercase text-noite-900">{aba.titulo}</h3>
              <p className="text-[11px] text-slate-500">{aba.subtitulo}</p>
            </div>
            <div className="divide-y divide-noite-900/5">
              {aba.grupos.map((grupo) => (
                <div key={grupo.id} className="px-4 py-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700">{grupo.nome}</p>
                  <div className="overflow-x-auto rounded-lg border border-noite-900/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-areia-50 text-[10px] uppercase text-slate-500">
                        <tr>
                          <th className="px-2 py-2">#</th>
                          <th className="px-2 py-2">Equipe</th>
                          <th className="px-2 py-2 text-center">J</th>
                          <th className="px-2 py-2 text-center">V</th>
                          <th className="px-2 py-2 text-center">E</th>
                          <th className="px-2 py-2 text-center">{aba.rotuloSaldo}</th>
                          <th className="px-2 py-2 text-right">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-noite-900/5">
                        {(res.classificacoes[grupo.id] ?? []).map((linha) => (
                          <tr key={linha.nome} className={linha.pos === 1 ? 'bg-ouro-50/60' : ''}>
                            <td className="px-2 py-2 font-semibold text-slate-500">{linha.pos}º</td>
                            <td className="px-2 py-2 font-medium text-noite-900">{linha.nome}</td>
                            <td className="px-2 py-2 text-center tabular-nums">{linha.j}</td>
                            <td className="px-2 py-2 text-center tabular-nums">{linha.v}</td>
                            <td className="px-2 py-2 text-center tabular-nums">{linha.e}</td>
                            <td className="px-2 py-2 text-center tabular-nums">{linha.saldo}</td>
                            <td className="px-2 py-2 text-right font-bold tabular-nums">{linha.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )
      })}

      {brackets.map((aba) => {
        if (aba.tipo !== 'mata_mata' && aba.tipo !== 'repescagem') return null
        const res = resolverBracket(aba)
        const fases = [
          ...(res.primeiraFaseResolvida.length > 0
            ? [{ id: 'primeira', nome: 'Primeira fase', jogos: res.primeiraFaseResolvida }]
            : []),
          ...res.fasesResolvidas,
        ]
        return (
          <Card key={aba.id} className="overflow-hidden">
            <div className="border-b border-noite-900/10 bg-areia-50 px-4 py-3">
              <h3 className="font-display text-lg font-bold uppercase text-noite-900">{aba.titulo}</h3>
              <p className="text-[11px] text-slate-500">{aba.subtitulo}</p>
            </div>
            <div className="divide-y divide-noite-900/5">
              {fases.map((fase) => (
                <div key={fase.id} className="px-4 py-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700">{fase.nome}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {fase.jogos.map((jogo) => (
                      <div key={jogo.jogo.codigo} className="flex items-center justify-between gap-2 rounded-lg bg-areia-50 px-2.5 py-1.5 text-xs">
                        <span className="min-w-0 flex-1 truncate text-noite-900">{jogo.lado1 || 'A definir'}</span>
                        <span className="shrink-0 font-display text-sm font-extrabold text-brand-700">
                          {jogo.jogo.placar1 ?? '–'} × {jogo.jogo.placar2 ?? '–'}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-right text-noite-900">{jogo.lado2 || 'A definir'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )
      })}

      {artilharia.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="border-b border-noite-900/10 bg-areia-50 px-4 py-3">
            <h3 className="font-display text-lg font-bold uppercase text-noite-900">Artilharia</h3>
          </div>
          <div className="divide-y divide-noite-900/5">
            {artilharia.map((aba) => (
              <div key={aba.id} className="px-4 py-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700">{aba.titulo}</p>
                <div className="space-y-1">
                  {calcularArtilharia(aba)
                    .filter((l) => l.total > 0)
                    .slice(0, 5)
                    .map((linha) => (
                      <div key={linha.atleta.id} className="flex items-center gap-2 text-xs">
                        <span className="w-5 text-center font-bold text-slate-400">{linha.pos}</span>
                        <span className="min-w-0 flex-1 truncate font-medium text-noite-900">{linha.atleta.nome}</span>
                        <span className="shrink-0 text-[10px] text-slate-500">{linha.atleta.turma}</span>
                        <span className="w-6 shrink-0 text-right font-display font-extrabold text-brand-700">{linha.total}</span>
                      </div>
                    ))}
                  {aba.atletas.every((a) => a.gols.every((g) => !g)) ? (
                    <p className="text-xs text-slate-500">Nenhum gol lançado até agora.</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {cartoes.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="border-b border-noite-900/10 bg-areia-50 px-4 py-3">
            <h3 className="font-display text-lg font-bold uppercase text-noite-900">Cartões</h3>
          </div>
          <div className="divide-y divide-noite-900/5">
            {cartoes.map((aba) => (
              <div key={aba.id} className="px-4 py-3">
                {calcularCartoes(aba).length === 0 ? (
                  <p className="text-xs text-slate-500">Nenhum cartão lançado até agora.</p>
                ) : (
                  <div className="space-y-1">
                    {calcularCartoes(aba).map((linha) => (
                      <div key={`${linha.nome}-${linha.turma}`} className="flex items-center gap-2 text-xs">
                        <span className="min-w-0 flex-1 truncate font-medium text-noite-900">{linha.nome}</span>
                        <span className="shrink-0 text-[10px] text-slate-500">{linha.turma}</span>
                        <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 font-bold text-amber-700">{linha.amarelos} A</span>
                        <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 font-bold text-red-700">{linha.vermelhos} V</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {blocos.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="border-b border-noite-900/10 bg-areia-50 px-4 py-3">
            <h3 className="font-display text-lg font-bold uppercase text-noite-900">Programação</h3>
          </div>
          <div className="divide-y divide-noite-900/5">
            {blocos.map((bloco) => (
              <div key={bloco.id} className="px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                  {bloco.dia} · {bloco.turno} · {bloco.horario}
                </p>
                <p className="mt-1 text-sm font-semibold text-noite-900">{bloco.categoriaFase}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{bloco.confronto}</p>
                <p className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-slate-500">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {bloco.tipo}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {bloco.local}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </section>
  )
}
