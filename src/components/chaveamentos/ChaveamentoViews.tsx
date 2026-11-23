import { useMemo, useState } from 'react'
import { Check, Medal, Search, Trophy } from 'lucide-react'
import { Badge, Card, CardHeader, Input, Select, Table, Td, Th } from '@/components/ui'
import {
  calcularFreeFire,
  calcularQuiz,
  calcularTempo,
  resolverBracket,
  resolverGruposMataMata,
  type PodioCalculado,
} from '@/lib/chaveamentosEngine'
import type {
  AbaFreeFire,
  AbaGruposMataMata,
  AbaMataMata,
  AbaProgramacao,
  AbaQuiz,
  AbaRepescagem,
  AbaTempo,
  ElencoAba,
  JogoChave,
} from '@/lib/chaveamentosTypes'

function parseNum(v: string): number | null {
  const limpo = v.replace(',', '.').trim()
  if (limpo === '') return null
  const n = Number(limpo)
  return Number.isFinite(n) ? n : null
}

function InputPlanilha({
  value,
  onChange,
  placeholder = '—',
  width = 'w-16',
  step = 'any',
}: {
  value: number | null | undefined
  onChange: (n: number | null) => void
  placeholder?: string
  width?: string
  step?: string
}) {
  return (
    <input
      type="number"
      step={step}
      value={value ?? ''}
      onChange={(e) => onChange(parseNum(e.target.value))}
      placeholder={placeholder}
      className={`${width} rounded-md border border-amber-300 bg-amber-50/70 px-2 py-1 text-center text-sm font-semibold tabular-nums text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20`}
    />
  )
}

function PodioCard({ podio, titulo = 'Pódio Oficial (Automático)' }: { podio: PodioCalculado; titulo?: string }) {
  const itens = [
    { pos: '1º Lugar (Ouro)', nome: podio.primeiro, cor: 'border-amber-300 bg-amber-50/80 text-amber-950' },
    { pos: '2º Lugar (Prata)', nome: podio.segundo, cor: 'border-slate-300 bg-slate-50 text-slate-900' },
    { pos: '3º Lugar (Bronze)', nome: podio.terceiro, cor: 'border-orange-300 bg-orange-50/70 text-orange-950' },
  ]
  return (
    <Card>
      <CardHeader titulo={titulo} descricao="Atualizado automaticamente conforme os placares são preenchidos." />
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {itens.map((it) => (
          <div key={it.pos} className={`rounded-xl border p-3.5 ${it.cor}`}>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-75">
              <Medal className="h-3.5 w-3.5" /> {it.pos}
            </p>
            <p className="mt-1.5 text-sm font-bold leading-snug">{it.nome}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function GruposMataMataView({
  aba,
  onChange,
}: {
  aba: AbaGruposMataMata
  onChange: (next: AbaGruposMataMata) => void
}) {
  const resolvido = useMemo(() => resolverGruposMataMata(aba), [aba])

  function atualizarJogoGrupo(grupoIdx: number, jogoIdx: number, campo: 'placar1' | 'placar2' | 'dataHora', valor: number | null | string) {
    const grupos = aba.grupos.map((g, gi) =>
      gi !== grupoIdx
        ? g
        : {
            ...g,
            jogos: g.jogos.map((j, ji) => (ji !== jogoIdx ? j : { ...j, [campo]: valor })),
          },
    )
    onChange({ ...aba, grupos })
  }

  function atualizarEliminatoria(
    idx: number,
    campo: 'placar1' | 'placar2' | 'dataHora' | 'desempate',
    valor: number | null | string,
  ) {
    const eliminatoria = aba.eliminatoria.map((j, i) => (i !== idx ? j : { ...j, [campo]: valor }))
    onChange({ ...aba, eliminatoria })
  }

  return (
    <div className="space-y-6">
      {aba.grupos.map((grupo, gi) => {
        const tabela = resolvido.classificacoes[grupo.id] ?? []
        return (
          <div key={grupo.id} className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
            <Card className="overflow-hidden">
              <CardHeader
                titulo={`Fase de Grupos — ${grupo.nome}`}
                descricao="Preencha os placares nas células em destaque; a classificação e o mata-mata atualizam na hora."
              />
              <Table>
                <thead>
                  <tr>
                    <Th>Jogo</Th>
                    <Th>Horário</Th>
                    <Th>Equipe 1</Th>
                    <Th className="text-center">{aba.rotuloPlacar}</Th>
                    <Th className="text-center">×</Th>
                    <Th className="text-center">{aba.rotuloPlacar}</Th>
                    <Th>Equipe 2</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.jogos.map((jogo, ji) => {
                    const encerrado = jogo.placar1 !== null && jogo.placar2 !== null
                    const empateProibido = encerrado && !aba.permiteEmpate && jogo.placar1 === jogo.placar2
                    return (
                      <tr key={jogo.codigo}>
                        <Td className="font-mono text-xs font-semibold text-slate-500">
                          <div>{jogo.codigo}</div>
                          <div className="text-[10px] font-normal">{jogo.rodada}</div>
                        </Td>
                        <Td>
                          <input
                            type="text"
                            value={jogo.dataHora}
                            onChange={(e) => atualizarJogoGrupo(gi, ji, 'dataHora', e.target.value)}
                            placeholder="Horário"
                            className="w-24 rounded border border-slate-200 px-1.5 py-1 text-xs text-slate-700"
                          />
                        </Td>
                        <Td className="font-medium text-slate-900">{jogo.eq1}</Td>
                        <Td className="text-center">
                          <InputPlanilha
                            value={jogo.placar1}
                            onChange={(n) => atualizarJogoGrupo(gi, ji, 'placar1', n)}
                            step="1"
                          />
                        </Td>
                        <Td className="text-center text-xs text-slate-400">×</Td>
                        <Td className="text-center">
                          <InputPlanilha
                            value={jogo.placar2}
                            onChange={(n) => atualizarJogoGrupo(gi, ji, 'placar2', n)}
                            step="1"
                          />
                        </Td>
                        <Td className="font-medium text-slate-900">{jogo.eq2}</Td>
                        <Td>
                          {empateProibido ? (
                            <Badge tom="ambar">Desempatar</Badge>
                          ) : encerrado ? (
                            <Badge tom="verde">Encerrado</Badge>
                          ) : (
                            <Badge tom="cinza">Agendado</Badge>
                          )}
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader titulo={`Classificação — ${grupo.nome}`} />
              <Table>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>Equipe</Th>
                    <Th className="text-center">J</Th>
                    <Th className="text-center">V</Th>
                    {aba.permiteEmpate ? <Th className="text-center">E</Th> : null}
                    <Th className="text-center">D</Th>
                    <Th className="text-center">{aba.rotuloPro}</Th>
                    <Th className="text-center">{aba.rotuloContra}</Th>
                    <Th className="text-center">{aba.rotuloSaldo}</Th>
                    <Th className="text-right">PTS</Th>
                  </tr>
                </thead>
                <tbody>
                  {tabela.map((l) => (
                    <tr key={l.nome} className={l.pos <= (aba.formatoEliminatoria === 'semis_3grupos' ? 1 : 2) ? 'bg-emerald-50/50' : ''}>
                      <Td className="font-semibold text-slate-600">{l.pos}º</Td>
                      <Td className="font-medium text-slate-900">{l.nome}</Td>
                      <Td className="text-center tabular-nums">{l.j}</Td>
                      <Td className="text-center tabular-nums">{l.v}</Td>
                      {aba.permiteEmpate ? <Td className="text-center tabular-nums">{l.e}</Td> : null}
                      <Td className="text-center tabular-nums">{l.d}</Td>
                      <Td className="text-center tabular-nums">{l.pro}</Td>
                      <Td className="text-center tabular-nums">{l.contra}</Td>
                      <Td className="text-center tabular-nums">{l.saldo}</Td>
                      <Td className="text-right font-bold tabular-nums text-slate-900">{l.pts}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </div>
        )
      })}

      {aba.formatoEliminatoria === 'semis_3grupos' ? (
        <Card className="overflow-hidden">
          <CardHeader
            titulo="Classificação dos 2º Colocados (Melhor 2º Geral)"
            descricao="O 1º colocado desta tabela avança às Semifinais sem repetir adversário do mesmo grupo."
          />
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Grupo</Th>
                <Th>Equipe</Th>
                <Th className="text-center">J</Th>
                <Th className="text-center">V</Th>
                <Th className="text-center">{aba.rotuloSaldo}</Th>
                <Th className="text-center">{aba.rotuloPro}</Th>
                <Th className="text-right">PTS</Th>
                <Th>Situação</Th>
              </tr>
            </thead>
            <tbody>
              {resolvido.melhoresSegundos.map((l, idx) => (
                <tr key={l.nome} className={idx === 0 ? 'bg-emerald-50/60' : ''}>
                  <Td className="font-semibold">{idx + 1}º</Td>
                  <Td>Grupo {l.grupoId}</Td>
                  <Td className="font-medium text-slate-900">{l.nome}</Td>
                  <Td className="text-center">{l.j}</Td>
                  <Td className="text-center">{l.v}</Td>
                  <Td className="text-center">{l.saldo}</Td>
                  <Td className="text-center">{l.pro}</Td>
                  <Td className="text-right font-bold">{l.pts}</Td>
                  <Td>
                    {idx === 0 ? <Badge tom="verde">Melhor 2º (Avança)</Badge> : <Badge tom="cinza">Eliminado</Badge>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader
          titulo="Fase Eliminatória (Preenchimento Automático)"
          descricao="Confrontos preenchidos automaticamente a partir da fase de grupos. Em caso de empate, escolha o vencedor no desempate."
        />
        <Table>
          <thead>
            <tr>
              <Th>Fase</Th>
              <Th>Horário</Th>
              <Th>Equipe 1</Th>
              <Th className="text-center">{aba.rotuloPlacar}</Th>
              <Th className="text-center">×</Th>
              <Th className="text-center">{aba.rotuloPlacar}</Th>
              <Th>Equipe 2</Th>
              <Th>Desempate</Th>
              <Th>Vencedor</Th>
            </tr>
          </thead>
          <tbody>
            {aba.eliminatoria.map((jogo, idx) => {
              const res = resolvido.jogosResolvidos[idx]
              return (
                <tr key={jogo.codigo}>
                  <Td className="font-semibold text-slate-800">{jogo.fase}</Td>
                  <Td>
                    <input
                      type="text"
                      value={jogo.dataHora}
                      onChange={(e) => atualizarEliminatoria(idx, 'dataHora', e.target.value)}
                      placeholder="Horário"
                      className="w-24 rounded border border-slate-200 px-1.5 py-1 text-xs"
                    />
                  </Td>
                  <Td className="font-medium text-slate-900">{res?.eq1 ?? 'A definir'}</Td>
                  <Td className="text-center">
                    <InputPlanilha value={jogo.placar1} onChange={(n) => atualizarEliminatoria(idx, 'placar1', n)} step="1" />
                  </Td>
                  <Td className="text-center text-xs text-slate-400">×</Td>
                  <Td className="text-center">
                    <InputPlanilha value={jogo.placar2} onChange={(n) => atualizarEliminatoria(idx, 'placar2', n)} step="1" />
                  </Td>
                  <Td className="font-medium text-slate-900">{res?.eq2 ?? 'A definir'}</Td>
                  <Td>
                    <Select
                      value={jogo.desempate ?? ''}
                      onChange={(e) => atualizarEliminatoria(idx, 'desempate', e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="">—</option>
                      <option value="1">Eq. 1</option>
                      <option value="2">Eq. 2</option>
                    </Select>
                  </Td>
                  <Td>
                    {res?.vencedor ? (
                      <Badge tom="verde">{res.vencedor}</Badge>
                    ) : res?.empatePendente ? (
                      <Badge tom="ambar">Definir desempate</Badge>
                    ) : (
                      <span className="text-xs text-slate-400">Aguardando</span>
                    )}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Card>

      <PodioCard podio={resolvido.podio} />
    </div>
  )
}

export function BracketView({
  aba,
  onChange,
}: {
  aba: AbaMataMata | AbaRepescagem
  onChange: (next: AbaMataMata | AbaRepescagem) => void
}) {
  const resolvido = useMemo(() => resolverBracket(aba), [aba])
  const temPenaltis = aba.tipo === 'mata_mata' && aba.temPenaltis

  function atualizarPrimeiraFase(idx: number, patch: Partial<JogoChave>) {
    if (aba.tipo !== 'repescagem') return
    onChange({
      ...aba,
      primeiraFase: aba.primeiraFase.map((j, i) => (i === idx ? { ...j, ...patch } : j)),
    })
  }

  function atualizarJogoFase(faseIdx: number, jogoIdx: number, patch: Partial<JogoChave>) {
    onChange({
      ...aba,
      fases: aba.fases.map((f, fi) =>
        fi !== faseIdx
          ? f
          : { ...f, jogos: f.jogos.map((j, ji) => (ji === jogoIdx ? { ...j, ...patch } : j)) },
      ),
    })
  }

  return (
    <div className="space-y-6">
      {aba.tipo === 'mata_mata' && aba.byes.length > 0 ? (
        <Card className="overflow-hidden">
          <CardHeader titulo="Byes Sorteados (Avançam Direto)" />
          <Table>
            <thead>
              <tr>
                <Th>Bye</Th>
                <Th>Participante</Th>
                <Th>Destino na Chave</Th>
              </tr>
            </thead>
            <tbody>
              {aba.byes.map((b) => (
                <tr key={b.codigo}>
                  <Td className="font-mono text-xs font-semibold text-brand-700">{b.codigo}</Td>
                  <Td className="font-medium text-slate-900">{b.participante}</Td>
                  <Td className="text-xs text-slate-500">{b.destino}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}

      {aba.tipo === 'repescagem' ? (
        <>
          <Card className="overflow-hidden">
            <CardHeader
              titulo={`1ª Fase (${aba.primeiraFase.length} confrontos)`}
              descricao={`Os ${aba.primeiraFase.length} vencedores avançam + os ${aba.repescagemVagas} melhores 2º colocados na repescagem.`}
            />
            <Table>
              <thead>
                <tr>
                  <Th>Jogo</Th>
                  <Th>{aba.rotuloLado1}</Th>
                  <Th className="text-center">{aba.rotuloPlacar}</Th>
                  <Th className="text-center">×</Th>
                  <Th className="text-center">{aba.rotuloPlacar}</Th>
                  <Th>{aba.rotuloLado2}</Th>
                  {aba.temDesempateManual ? <Th>Desemp.</Th> : null}
                  {aba.rotuloExtraPerdedor ? <Th className="text-center">{aba.rotuloExtraPerdedor}</Th> : null}
                  <Th>Vencedor</Th>
                </tr>
              </thead>
              <tbody>
                {resolvido.primeiraFaseResolvida.map((item, idx) => (
                  <tr key={item.jogo.codigo}>
                    <Td className="font-mono text-xs font-semibold text-slate-500">{item.jogo.codigo}</Td>
                    <Td className="font-medium text-slate-900">{item.lado1}</Td>
                    <Td className="text-center">
                      <InputPlanilha value={item.jogo.placar1} onChange={(n) => atualizarPrimeiraFase(idx, { placar1: n })} />
                    </Td>
                    <Td className="text-center text-xs text-slate-400">×</Td>
                    <Td className="text-center">
                      <InputPlanilha value={item.jogo.placar2} onChange={(n) => atualizarPrimeiraFase(idx, { placar2: n })} />
                    </Td>
                    <Td className="font-medium text-slate-900">{item.lado2}</Td>
                    {aba.temDesempateManual ? (
                      <Td>
                        <Select
                          value={item.jogo.desempate ?? ''}
                          onChange={(e) => atualizarPrimeiraFase(idx, { desempate: e.target.value as '1' | '2' | '' })}
                          className="h-8 text-xs"
                        >
                          <option value="">—</option>
                          <option value="1">1º</option>
                          <option value="2">2º</option>
                        </Select>
                      </Td>
                    ) : null}
                    {aba.rotuloExtraPerdedor ? (
                      <Td className="text-center">
                        <InputPlanilha
                          value={item.jogo.extraPerdedor}
                          onChange={(n) => atualizarPrimeiraFase(idx, { extraPerdedor: n })}
                          step="1"
                        />
                      </Td>
                    ) : null}
                    <Td>
                      {item.vencedor ? (
                        <Badge tom="verde">{item.vencedor}</Badge>
                      ) : item.empatePendente ? (
                        <Badge tom="ambar">Desempatar</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Agendado</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              titulo={`Ranking Automático de Repescagem (${aba.repescagemVagas} melhores 2º colocados)`}
              descricao="Preenchido automaticamente conforme os resultados da 1ª Fase são lançados."
            />
            {resolvido.repescagem.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Aguardando resultados da 1ª Fase.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>Jogo</Th>
                    <Th>2º Colocado</Th>
                    <Th className="text-center">Critério 1</Th>
                    {aba.rotuloExtraPerdedor && !aba.rotuloExtraPerdedor.includes('Peças') ? (
                      <Th className="text-center">{aba.rotuloExtraPerdedor}</Th>
                    ) : null}
                    <Th>Situação</Th>
                  </tr>
                </thead>
                <tbody>
                  {resolvido.repescagem.map((r) => (
                    <tr key={r.jogoCodigo} className={r.classificado ? 'bg-emerald-50/50' : ''}>
                      <Td className="font-semibold">{r.pos}º</Td>
                      <Td className="font-mono text-xs text-slate-500">{r.jogoCodigo}</Td>
                      <Td className="font-medium text-slate-900">{r.participante}</Td>
                      <Td className="text-center font-semibold tabular-nums">{r.criterio1}</Td>
                      {aba.rotuloExtraPerdedor && !aba.rotuloExtraPerdedor.includes('Peças') ? (
                        <Td className="text-center tabular-nums">{r.criterio2}</Td>
                      ) : null}
                      <Td>
                        {r.classificado ? <Badge tom="verde">Classificado (Repescagem)</Badge> : <Badge tom="cinza">Eliminado</Badge>}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </>
      ) : null}

      {resolvido.fasesResolvidas.map((fase, fi) => (
        <Card key={fase.id} className="overflow-hidden">
          <CardHeader titulo={fase.nome} />
          <Table>
            <thead>
              <tr>
                <Th>Jogo</Th>
                <Th>{aba.rotuloLado1}</Th>
                <Th className="text-center">{aba.rotuloPlacar}</Th>
                <Th className="text-center">×</Th>
                <Th className="text-center">{aba.rotuloPlacar}</Th>
                <Th>{aba.rotuloLado2}</Th>
                {temPenaltis ? <Th className="text-center">Pênaltis</Th> : null}
                {aba.temDesempateManual ? <Th>Desemp.</Th> : null}
                <Th>Vencedor (Avança)</Th>
              </tr>
            </thead>
            <tbody>
              {fase.jogos.map((item, ji) => (
                <tr key={item.jogo.codigo}>
                  <Td className="font-mono text-xs font-semibold text-slate-500">{item.jogo.rotulo || item.jogo.codigo}</Td>
                  <Td className="font-medium text-slate-900">{item.lado1}</Td>
                  <Td className="text-center">
                    <InputPlanilha value={item.jogo.placar1} onChange={(n) => atualizarJogoFase(fi, ji, { placar1: n })} />
                  </Td>
                  <Td className="text-center text-xs text-slate-400">×</Td>
                  <Td className="text-center">
                    <InputPlanilha value={item.jogo.placar2} onChange={(n) => atualizarJogoFase(fi, ji, { placar2: n })} />
                  </Td>
                  <Td className="font-medium text-slate-900">{item.lado2}</Td>
                  {temPenaltis ? (
                    <Td>
                      <div className="flex items-center justify-center gap-1">
                        <InputPlanilha value={item.jogo.pen1} onChange={(n) => atualizarJogoFase(fi, ji, { pen1: n })} width="w-12" step="1" />
                        <span className="text-xs text-slate-400">×</span>
                        <InputPlanilha value={item.jogo.pen2} onChange={(n) => atualizarJogoFase(fi, ji, { pen2: n })} width="w-12" step="1" />
                      </div>
                    </Td>
                  ) : null}
                  {aba.temDesempateManual ? (
                    <Td>
                      <Select
                        value={item.jogo.desempate ?? ''}
                        onChange={(e) => atualizarJogoFase(fi, ji, { desempate: e.target.value as '1' | '2' | '' })}
                        className="h-8 text-xs"
                      >
                        <option value="">—</option>
                        <option value="1">1º</option>
                        <option value="2">2º</option>
                      </Select>
                    </Td>
                  ) : null}
                  <Td>
                    {item.vencedor ? (
                      <Badge tom="verde">{item.vencedor}</Badge>
                    ) : item.empatePendente ? (
                      <Badge tom="ambar">Desempatar</Badge>
                    ) : (
                      <span className="text-xs text-slate-400">Agendado</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ))}

      <PodioCard podio={resolvido.podio} />
    </div>
  )
}

export function TempoView({ aba, onChange }: { aba: AbaTempo; onChange: (next: AbaTempo) => void }) {
  const { linhas, podio } = useMemo(() => calcularTempo(aba), [aba])

  function atualizar(idx: number, patch: Partial<AbaTempo['competidores'][number]>) {
    onChange({
      ...aba,
      competidores: aba.competidores.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    })
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader
          titulo={aba.modo === 'circuito' ? 'Tomada de Tempo Individual' : 'Lançamento de Tempos (Melhor de 3)'}
          descricao={
            aba.modo === 'circuito'
              ? `Penalidade automática de +${aba.penalidadeSegundos ?? 2}s por falta.`
              : 'Critério: menor tempo entre as 3 tentativas; desempate pelo 2º e 3º melhores tempos.'
          }
        />
        <Table>
          <thead>
            <tr>
              <Th>{aba.modo === 'circuito' ? 'Peito' : 'Nº'}</Th>
              <Th>Competidor</Th>
              <Th>Turma</Th>
              {aba.modo === 'circuito' ? (
                <>
                  <Th>Presença</Th>
                  <Th className="text-center">Tempo Bruto (s)</Th>
                  <Th className="text-center">Faltas</Th>
                  <Th className="text-center">Tempo Final (s)</Th>
                </>
              ) : (
                <>
                  <Th className="text-center">Tent. 1 (s)</Th>
                  <Th className="text-center">Tent. 2 (s)</Th>
                  <Th className="text-center">Tent. 3 (s)</Th>
                  <Th className="text-center">Melhor (s)</Th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {aba.competidores.map((c, idx) => {
              const calc = linhas.find((l) => l.peito === c.peito && l.nome === c.nome)
              return (
                <tr key={`${c.peito}-${c.nome}`}>
                  <Td className="font-mono text-xs font-semibold text-slate-500">{c.peito}</Td>
                  <Td className="font-medium text-slate-900">{c.nome}</Td>
                  <Td>{c.turma}</Td>
                  {aba.modo === 'circuito' ? (
                    <>
                      <Td>
                        <Select
                          value={c.presenca}
                          onChange={(e) => atualizar(idx, { presenca: e.target.value as 'Presente' | 'DNS' | 'DNF' | 'DSQ' })}
                          className="h-8 text-xs"
                        >
                          <option value="Presente">Presente</option>
                          <option value="DNS">DNS (Ausente)</option>
                          <option value="DNF">DNF (Não Concluiu)</option>
                          <option value="DSQ">DSQ (Desclass.)</option>
                        </Select>
                      </Td>
                      <Td className="text-center">
                        <InputPlanilha value={c.tempoBruto} onChange={(n) => atualizar(idx, { tempoBruto: n })} width="w-20" />
                      </Td>
                      <Td className="text-center">
                        <InputPlanilha value={c.faltas} onChange={(n) => atualizar(idx, { faltas: n ?? 0 })} width="w-16" step="1" />
                      </Td>
                      <Td className="text-center font-bold tabular-nums text-slate-900">
                        {calc?.tempoFinal !== null && calc?.tempoFinal !== undefined ? `${calc.tempoFinal}s` : calc?.status ?? '—'}
                      </Td>
                    </>
                  ) : (
                    <>
                      <Td className="text-center">
                        <InputPlanilha value={c.tent1} onChange={(n) => atualizar(idx, { tent1: n })} width="w-20" />
                      </Td>
                      <Td className="text-center">
                        <InputPlanilha value={c.tent2} onChange={(n) => atualizar(idx, { tent2: n })} width="w-20" />
                      </Td>
                      <Td className="text-center">
                        <InputPlanilha value={c.tent3} onChange={(n) => atualizar(idx, { tent3: n })} width="w-20" />
                      </Td>
                      <Td className="text-center font-bold tabular-nums text-slate-900">
                        {calc?.melhor !== null && calc?.melhor !== undefined ? `${calc.melhor}s` : '—'}
                      </Td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Card>

      <PodioCard podio={podio} />

      <Card className="overflow-hidden">
        <CardHeader titulo="Classificação Geral Automática" />
        <Table>
          <thead>
            <tr>
              <Th>Pos.</Th>
              <Th>Competidor</Th>
              <Th>Turma</Th>
              <Th className="text-right">{aba.modo === 'circuito' ? 'Tempo Final' : 'Melhor Tempo'}</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={`${l.peito}-${l.nome}`} className={l.pos && l.pos <= 3 ? 'bg-amber-50/50' : ''}>
                <Td className="font-bold">{l.pos ? `${l.pos}º` : '—'}</Td>
                <Td className="font-medium text-slate-900">{l.nome}</Td>
                <Td>{l.turma}</Td>
                <Td className="text-right font-bold tabular-nums">{l.melhor !== null ? `${l.melhor}s` : '—'}</Td>
                <Td><Badge tom={l.status === 'Concluído' ? 'verde' : 'cinza'}>{l.status}</Badge></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}

export function FreeFireView({ aba, onChange }: { aba: AbaFreeFire; onChange: (next: AbaFreeFire) => void }) {
  const { classif, finalistas, finalOrdenada, podio } = useMemo(() => calcularFreeFire(aba), [aba])

  function atualizarSquad(idx: number, patch: Partial<AbaFreeFire['squads'][number]>) {
    onChange({
      ...aba,
      squads: aba.squads.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    })
  }

  function atualizarFinal(idx: number, patch: Partial<AbaFreeFire['quedaFinal'][number]>) {
    onChange({
      ...aba,
      quedaFinal: aba.quedaFinal.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    })
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader
          titulo="1. Fase Classificatória — 3 Quedas (12 Squads)"
          descricao="Pontuação por posição: 1º=12, 2º=9, 3º=8, 4º=7, 5º=6, 6º=5, 7º=4, 8º=3, 9º=2, 10º=1 + 1 pt por abate. Top 6 avançam à Queda Final."
        />
        <Table>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Squad</Th>
              <Th className="text-center">Q1 Pos / Ab.</Th>
              <Th className="text-center">Q2 Pos / Ab.</Th>
              <Th className="text-center">Q3 Pos / Ab.</Th>
              <Th className="text-center">Booyah</Th>
              <Th className="text-center">Abates</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {aba.squads.map((sq, idx) => {
              const calc = classif.find((c) => c.id === sq.id)
              return (
                <tr key={sq.id}>
                  <Td className="font-mono text-xs text-slate-500">{sq.id}</Td>
                  <Td className="font-medium text-slate-900">{sq.nome}</Td>
                  <Td>
                    <div className="flex items-center justify-center gap-1">
                      <InputPlanilha value={sq.q1Pos} onChange={(n) => atualizarSquad(idx, { q1Pos: n })} width="w-12" placeholder="P" step="1" />
                      <InputPlanilha value={sq.q1Abates} onChange={(n) => atualizarSquad(idx, { q1Abates: n })} width="w-12" placeholder="K" step="1" />
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-center gap-1">
                      <InputPlanilha value={sq.q2Pos} onChange={(n) => atualizarSquad(idx, { q2Pos: n })} width="w-12" placeholder="P" step="1" />
                      <InputPlanilha value={sq.q2Abates} onChange={(n) => atualizarSquad(idx, { q2Abates: n })} width="w-12" placeholder="K" step="1" />
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-center gap-1">
                      <InputPlanilha value={sq.q3Pos} onChange={(n) => atualizarSquad(idx, { q3Pos: n })} width="w-12" placeholder="P" step="1" />
                      <InputPlanilha value={sq.q3Abates} onChange={(n) => atualizarSquad(idx, { q3Abates: n })} width="w-12" placeholder="K" step="1" />
                    </div>
                  </Td>
                  <Td className="text-center tabular-nums">{calc?.booyahs ?? 0}</Td>
                  <Td className="text-center tabular-nums">{calc?.abates ?? 0}</Td>
                  <Td className="text-right font-bold tabular-nums">{calc?.total ?? 0}</Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader titulo="2. Queda Final — Top 6 (Zerados)" descricao="Os 6 melhores squads da 1ª fase são puxados automaticamente." />
        <Table>
          <thead>
            <tr>
              <Th>Classif. 1ª Fase</Th>
              <Th>Squad Finalista</Th>
              <Th className="text-center">Pts 1ª Fase</Th>
              <Th className="text-center">Pos. Final</Th>
              <Th className="text-center">Abates Final</Th>
              <Th className="text-right">TOTAL FINAL</Th>
            </tr>
          </thead>
          <tbody>
            {finalistas.map((f, idx) => (
              <tr key={f.slot}>
                <Td className="font-semibold text-slate-600">{f.slot}º Classif.</Td>
                <Td className="font-medium text-slate-900">{f.nome}</Td>
                <Td className="text-center tabular-nums text-slate-500">{f.ptsFase1}</Td>
                <Td className="text-center">
                  <InputPlanilha value={f.posFinal} onChange={(n) => atualizarFinal(idx, { posFinal: n })} width="w-14" step="1" />
                </Td>
                <Td className="text-center">
                  <InputPlanilha value={f.abatesFinal} onChange={(n) => atualizarFinal(idx, { abatesFinal: n })} width="w-14" step="1" />
                </Td>
                <Td className="text-right font-bold tabular-nums text-slate-900">{f.totalFinal ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <PodioCard podio={podio} />

      <Card className="overflow-hidden">
        <CardHeader titulo="Classificação Final — Queda Final" />
        <Table>
          <thead>
            <tr>
              <Th>Pos.</Th>
              <Th>Squad</Th>
              <Th className="text-center">Pos. Queda</Th>
              <Th className="text-center">Abates</Th>
              <Th className="text-right">Total Final</Th>
            </tr>
          </thead>
          <tbody>
            {finalOrdenada.map((f, i) => (
              <tr key={f.slot} className={i < 3 && f.totalFinal !== null ? 'bg-amber-50/50' : ''}>
                <Td className="font-bold">{i + 1}º</Td>
                <Td className="font-medium text-slate-900">{f.nome}</Td>
                <Td className="text-center">{f.posFinal ?? '—'}</Td>
                <Td className="text-center">{f.abatesFinal ?? '—'}</Td>
                <Td className="text-right font-bold tabular-nums">{f.totalFinal ?? '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}

export function QuizView({ aba, onChange }: { aba: AbaQuiz; onChange: (next: AbaQuiz) => void }) {
  const { ordenadas, podio } = useMemo(() => calcularQuiz(aba), [aba])

  function atualizar(idx: number, patch: Partial<AbaQuiz['equipes'][number]>) {
    onChange({
      ...aba,
      equipes: aba.equipes.map((e, i) => (i === idx ? { ...e, ...patch } : e)),
    })
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader
          titulo="Lançamento — Rodada Única no Wayground"
          descricao="Critério: 1º Pontuação Wayground • 2º Acertos • 3º Desempate (Morte Súbita)."
        />
        <Table>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Equipe</Th>
              <Th>Nickname</Th>
              <Th>Presença</Th>
              <Th className="text-center">Pontuação</Th>
              <Th className="text-center">Acertos</Th>
              <Th className="text-center">Desempate</Th>
            </tr>
          </thead>
          <tbody>
            {aba.equipes.map((eq, idx) => (
              <tr key={eq.id}>
                <Td className="font-mono text-xs text-slate-500">{eq.id}</Td>
                <Td className="font-medium text-slate-900">{eq.nome}</Td>
                <Td className="font-mono text-xs text-brand-700">{eq.nickname}</Td>
                <Td>
                  <Select
                    value={eq.presenca}
                    onChange={(e) => atualizar(idx, { presenca: e.target.value as 'Presente' | 'W.O.' | 'DSQ' })}
                    className="h-8 text-xs"
                  >
                    <option value="Presente">Presente</option>
                    <option value="W.O.">W.O. / Ausente</option>
                    <option value="DSQ">DSQ (Desclass.)</option>
                  </Select>
                </Td>
                <Td className="text-center">
                  <InputPlanilha value={eq.pontuacao} onChange={(n) => atualizar(idx, { pontuacao: n })} width="w-24" step="1" />
                </Td>
                <Td className="text-center">
                  <InputPlanilha value={eq.acertos} onChange={(n) => atualizar(idx, { acertos: n })} width="w-16" step="1" />
                </Td>
                <Td className="text-center">
                  <InputPlanilha value={eq.desempate} onChange={(n) => atualizar(idx, { desempate: n ?? 0 })} width="w-16" step="1" />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <PodioCard podio={podio} />

      <Card className="overflow-hidden">
        <CardHeader titulo="Classificação Final Automática (1º ao 9º)" />
        <Table>
          <thead>
            <tr>
              <Th>Pos.</Th>
              <Th>Equipe</Th>
              <Th>Nickname</Th>
              <Th className="text-right">Pontuação</Th>
              <Th className="text-center">Acertos</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((e, i) => (
              <tr key={e.id} className={i < 3 && e.pontuacao !== null ? 'bg-amber-50/50' : ''}>
                <Td className="font-bold">{i + 1}º</Td>
                <Td className="font-medium text-slate-900">{e.nome}</Td>
                <Td className="font-mono text-xs">{e.nickname}</Td>
                <Td className="text-right font-bold tabular-nums">{e.pontuacao ?? '—'}</Td>
                <Td className="text-center tabular-nums">{e.acertos ?? '—'}</Td>
                <Td>
                  <Badge tom={e.presenca !== 'Presente' ? 'vermelho' : e.pontuacao !== null ? 'verde' : 'cinza'}>
                    {e.presenca !== 'Presente' ? e.presenca : e.pontuacao !== null ? 'Lançado' : 'Aguardando'}
                  </Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}

export function ProgramacaoView({ aba, onChange }: { aba: AbaProgramacao; onChange: (next: AbaProgramacao) => void }) {
  const [visao, setVisao] = useState<'completa' | 'quadra' | 'dia' | 'modalidade'>('completa')
  const [diaFiltro, setDiaFiltro] = useState('Terça-feira')
  const [modFiltro, setModFiltro] = useState('todas')
  const [busca, setBusca] = useState('')

  const dias = ['Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira']
  const modalidades = useMemo(() => [...new Set(aba.blocos.map((b) => b.modalidade))].sort(), [aba.blocos])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return aba.blocos.filter((b) => {
      if (visao === 'quadra' && !b.local.toLowerCase().includes('quadra')) return false
      if (visao === 'dia' && b.dia !== diaFiltro) return false
      if (visao === 'modalidade' && modFiltro !== 'todas' && b.modalidade !== modFiltro) return false
      if (q && !`${b.modalidade} ${b.categoriaFase} ${b.confronto} ${b.local} ${b.arbitragem}`.toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [aba.blocos, visao, diaFiltro, modFiltro, busca])

  const resumoPorDia = useMemo(() => {
    return dias.map((d) => {
      const lista = aba.blocos.filter((b) => b.dia === d)
      return {
        dia: d,
        total: lista.length,
        quadra: lista.filter((b) => b.local.toLowerCase().includes('quadra')).length,
        conferidos: lista.filter((b) => b.conferido).length,
      }
    })
  }, [aba.blocos])

  function atualizarBloco(id: string, patch: Partial<AbaProgramacao['blocos'][number]>) {
    onChange({
      ...aba,
      blocos: aba.blocos.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {resumoPorDia.map((r) => (
          <Card key={r.dia} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{r.dia}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{r.total} blocos</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {r.quadra} na Quadra · <strong className="text-emerald-700">{r.conferidos} concluídos</strong>
            </p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'completa', label: 'Programação Completa' },
            { id: 'quadra', label: 'Quadra Principal' },
            { id: 'dia', label: 'Por Dia' },
            { id: 'modalidade', label: 'Por Modalidade' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setVisao(tab.id as typeof visao)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                visao === tab.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="relative ml-auto min-w-[200px] flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar turma, atleta, local…"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {visao === 'dia' ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {dias.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiaFiltro(d)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  diaFiltro === d ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        ) : null}

        {visao === 'modalidade' ? (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Modalidade:</span>
            <Select value={modFiltro} onChange={(e) => setModFiltro(e.target.value)} className="h-8 max-w-xs text-xs">
              <option value="todas">Todas ({aba.blocos.length})</option>
              {modalidades.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </div>
        ) : null}
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <thead>
            <tr>
              <Th>Conf.</Th>
              <Th>Dia / Horário</Th>
              <Th>Espaço</Th>
              <Th>Modalidade / Fase</Th>
              <Th>Confronto / Participantes</Th>
              <Th>Arbitragem / Resp.</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((b) => (
              <tr key={b.id} className={b.conferido ? 'bg-emerald-50/40' : ''}>
                <Td>
                  <button
                    type="button"
                    onClick={() => atualizarBloco(b.id, { conferido: !b.conferido, status: !b.conferido ? 'Concluído' : 'Agendado' })}
                    className={`flex h-6 w-6 items-center justify-center rounded border ${
                      b.conferido ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent'
                    }`}
                    title="Marcar como conferido"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </Td>
                <Td className="whitespace-nowrap text-xs">
                  <div className="font-semibold text-slate-800">{b.dia} · {b.turno}</div>
                  <div className="font-mono text-slate-500">{b.horario}</div>
                </Td>
                <Td className="text-xs text-slate-700">{b.local}</Td>
                <Td className="text-xs">
                  <div className="font-semibold text-slate-900">{b.modalidade}</div>
                  <div className="text-slate-500">{b.categoriaFase}</div>
                </Td>
                <Td className="max-w-xs text-xs text-slate-700">{b.confronto}</Td>
                <Td>
                  <input
                    type="text"
                    value={b.arbitragem}
                    onChange={(e) => atualizarBloco(b.id, { arbitragem: e.target.value })}
                    placeholder="Responsável…"
                    className="w-28 rounded border border-slate-200 px-1.5 py-1 text-xs"
                  />
                </Td>
                <Td>
                  <Select
                    value={b.status}
                    onChange={(e) => atualizarBloco(b.id, { status: e.target.value, conferido: e.target.value === 'Concluído' })}
                    className="h-7 text-xs"
                  >
                    <option value="Agendado">Agendado</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Adiado">Adiado</option>
                  </Select>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}

export function ElencosView({ elencos, onChange }: { elencos: ElencoAba; onChange: (next: ElencoAba) => void }) {
  const [busca, setBusca] = useState('')
  const conferidos = elencos.linhas.filter((l) => l.conferido).length

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return elencos.linhas
      .map((linha, idx) => ({ linha, idx }))
      .filter(({ linha }) => !q || linha.valores.join(' ').toLowerCase().includes(q))
  }, [elencos.linhas, busca])

  function toggle(idx: number) {
    onChange({
      ...elencos,
      linhas: elencos.linhas.map((l, i) => (i === idx ? { ...l, conferido: !l.conferido } : l)),
    })
  }

  function setObs(idx: number, obs: string) {
    onChange({
      ...elencos,
      linhas: elencos.linhas.map((l, i) => (i === idx ? { ...l, obs } : l)),
    })
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Trophy className="h-4 w-4 text-brand-600" /> Elencos e Conferência ({conferidos}/{elencos.linhas.length} conferidos)
          </h3>
          <p className="text-xs text-slate-500">Marque a presença/conferência em quadra ou mesa.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar atleta ou turma…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>OK</Th>
            {elencos.colunas.map((col) => (
              <Th key={col}>{col}</Th>
            ))}
            <Th>Camisa / Obs.</Th>
          </tr>
        </thead>
        <tbody>
          {filtradas.map(({ linha, idx }) => (
            <tr key={idx} className={linha.conferido ? 'bg-emerald-50/40' : ''}>
              <Td>
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className={`flex h-6 w-6 items-center justify-center rounded border ${
                    linha.conferido ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </Td>
              {linha.valores.map((v, vi) => (
                <Td key={vi} className={vi === 0 || vi === 2 ? 'font-medium text-slate-900' : 'text-slate-600'}>
                  {v}
                </Td>
              ))}
              <Td>
                <input
                  type="text"
                  value={linha.obs}
                  onChange={(e) => setObs(idx, e.target.value)}
                  placeholder="Nº / Obs."
                  className="w-24 rounded border border-slate-200 px-1.5 py-1 text-xs"
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}
