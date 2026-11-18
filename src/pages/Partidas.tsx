import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarDays,
  Pencil,
  Plus,
  Swords,
  Trash2,
  Trophy,
} from 'lucide-react'
import {
  Aviso,
  Badge,
  Button,
  Card,
  Carregando,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ErroBox,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Textarea,
  Th,
  useToast,
} from '@/components/ui'
import { FASES, ROTULO_FASE, STATUS_PARTIDA } from '@/lib/constantes'
import { mensagemErro } from '@/lib/errors'
import { deInputDataHora, formatarDataHora, paraInputDataHora, turmaRotulo } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import type {
  CategoriaComModalidade,
  Local,
  Partida,
  PartidaParticipante,
  StatusPartida,
  Turma,
} from '@/lib/types'

type Linha = {
  id?: string
  turma_id: string
  placar: string
  tempo: string
  pontuacao: string
  posicao: string
  vencedor: '' | 'sim' | 'nao'
  observacao: string
}

type Conflito = {
  tipo: string
  data_hora: string
  referencia: string
  detalhe: string
}

type Formulario = {
  modalidade_categoria_id: string
  fase: string
  rodada: string
  data_hora: string
  local_id: string
  status: StatusPartida
  observacoes: string
}

const VAZIO: Formulario = {
  modalidade_categoria_id: '',
  fase: 'classificatoria',
  rodada: '',
  data_hora: '',
  local_id: '',
  status: 'programado',
  observacoes: '',
}

function BadgePartida({ status }: { status: StatusPartida }) {
  const tom = {
    programado: 'azul',
    em_andamento: 'ambar',
    concluido: 'verde',
    adiado: 'cinza',
    wo: 'roxo',
    cancelado: 'vermelho',
  }[status] as 'azul' | 'ambar' | 'verde' | 'cinza' | 'roxo' | 'vermelho'
  return <Badge tom={tom}>{STATUS_PARTIDA.find((s) => s.valor === status)?.rotulo ?? status}</Badge>
}

function linhaDe(p: PartidaParticipante): Linha {
  return {
    id: p.id,
    turma_id: p.turma_id,
    placar: p.placar === null ? '' : String(p.placar),
    tempo: p.tempo === null ? '' : String(p.tempo),
    pontuacao: p.pontuacao === null ? '' : String(p.pontuacao),
    posicao: p.posicao === null ? '' : String(p.posicao),
    vencedor: p.vencedor === null ? '' : p.vencedor ? 'sim' : 'nao',
    observacao: p.observacao ?? '',
  }
}

export default function Partidas() {
  const { notificar } = useToast()
  const [statusFiltro, setStatusFiltro] = useState<'todas' | StatusPartida>('todas')
  const [dataFiltro, setDataFiltro] = useState('')

  const aux = useAsync(async () => {
    const [cats, turmas, locais] = await Promise.all([
      supabase
        .from('modalidade_categorias')
        .select('*, modalidades(id, nome, tipo, slug)')
        .eq('ativo', true)
        .order('nome'),
      supabase.from('turmas').select('*').eq('ativo', true).order('numero'),
      supabase.from('locais').select('*').eq('ativo', true).order('ordem', { nullsFirst: false }),
    ])
    if (cats.error) throw cats.error
    if (turmas.error) throw turmas.error
    if (locais.error) throw locais.error
    return {
      categorias: cats.data as CategoriaComModalidade[],
      turmas: turmas.data as Turma[],
      locais: locais.data as Local[],
    }
  })

  const lista = useAsync(async () => {
    let q = supabase
      .from('partidas')
      .select(
        '*, modalidade_categorias(nome, min_participantes_partida, modalidades(id, nome)), locais(nome), partida_participantes(*, turmas(numero, nome_equipe))',
      )
      .order('data_hora', { ascending: true, nullsFirst: false })
      .order('created_at')
    if (statusFiltro !== 'todas') q = q.eq('status', statusFiltro)
    if (dataFiltro) {
      q = q
        .gte('data_hora', new Date(`${dataFiltro}T00:00:00`).toISOString())
        .lte('data_hora', new Date(`${dataFiltro}T23:59:59.999`).toISOString())
    }
    const { data, error } = await q
    if (error) throw error
    return data as unknown as Partida[]
  }, [statusFiltro, dataFiltro])

  const categorias = aux.data?.categorias ?? []
  const turmas = aux.data?.turmas ?? []
  const locais = aux.data?.locais ?? []

  const gruposCategorias = useMemo(() => {
    const mapa = new Map<string, { nome: string; itens: CategoriaComModalidade[] }>()
    for (const c of categorias) {
      const chave = c.modalidades?.id ?? 'outros'
      const grupo = mapa.get(chave) ?? { nome: c.modalidades?.nome ?? 'Outros', itens: [] }
      grupo.itens.push(c)
      mapa.set(chave, grupo)
    }
    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [categorias])

  const [editando, setEditando] = useState<Partida | 'nova' | null>(null)
  const [form, setForm] = useState<Formulario>(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  const [gerenciando, setGerenciando] = useState<Partida | null>(null)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [salvandoPartida, setSalvandoPartida] = useState(false)
  const [erroPartida, setErroPartida] = useState<string | null>(null)

  const [excluindo, setExcluindo] = useState<Partida | null>(null)
  const [removendo, setRemovendo] = useState(false)

  const [conflitos, setConflitos] = useState<Conflito[] | null>(null)
  const [carregandoConflitos, setCarregandoConflitos] = useState(false)

  function abrir(p: Partida | 'nova') {
    setErroForm(null)
    if (p === 'nova') {
      setForm(VAZIO)
      setEditando('nova')
      return
    }
    setForm({
      modalidade_categoria_id: p.modalidade_categoria_id,
      fase: p.fase,
      rodada: p.rodada === null ? '' : String(p.rodada),
      data_hora: paraInputDataHora(p.data_hora),
      local_id: p.local_id ?? '',
      status: p.status,
      observacoes: p.observacoes ?? '',
    })
    setEditando(p)
  }

  async function salvar() {
    if (!form.modalidade_categoria_id) {
      setErroForm('Selecione a modalidade/categoria.')
      return
    }
    const categoria = categorias.find((c) => c.id === form.modalidade_categoria_id)
    if (categoria && categoria.min_participantes_partida === null) {
      setErroForm(
        'Esta categoria ainda não tem mínimo de participantes definido. Configure a categoria antes de criar partidas oficiais.',
      )
      return
    }
    setSalvando(true)
    setErroForm(null)
    const payload = {
      modalidade_categoria_id: form.modalidade_categoria_id,
      fase: form.fase,
      rodada: form.rodada === '' ? null : Number(form.rodada),
      data_hora: deInputDataHora(form.data_hora),
      local_id: form.local_id || null,
      status: form.status,
      observacoes: form.observacoes.trim() || null,
    }
    try {
      if (editando === 'nova') {
        const { data, error } = await supabase.from('partidas').insert(payload).select('id').single()
        if (error) throw error
        const { data: completa } = await supabase
          .from('partidas')
          .select(
            '*, modalidade_categorias(nome, min_participantes_partida, modalidades(id, nome)), locais(nome), partida_participantes(*, turmas(numero, nome_equipe))',
          )
          .eq('id', data.id)
          .single()
        notificar('Partida criada. Agora defina as turmas e o resultado.')
        setEditando(null)
        lista.reload()
        abrirResultado((completa ?? data) as unknown as Partida)
      } else if (editando) {
        const { error } = await supabase.from('partidas').update(payload).eq('id', editando.id)
        if (error) throw error
        notificar('Partida atualizada.')
        setEditando(null)
        lista.reload()
      }
    } catch (e) {
      setErroForm(mensagemErro(e))
    } finally {
      setSalvando(false)
    }
  }

  function abrirResultado(p: Partida) {
    setErroPartida(null)
    setGerenciando(p)
    setLinhas((p.partida_participantes ?? []).map(linhaDe))
  }

  function adicionarLinha() {
    const usadas = new Set(linhas.map((l) => l.turma_id))
    const disponivel = turmas.find((t) => !usadas.has(t.id))
    setLinhas((ls) => [
      ...ls,
      {
        turma_id: disponivel?.id ?? '',
        placar: '',
        tempo: '',
        pontuacao: '',
        posicao: '',
        vencedor: '',
        observacao: '',
      },
    ])
  }

  function atualizarLinha(indice: number, campo: keyof Linha, valor: string) {
    setLinhas((ls) => ls.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)))
  }

  function removerLinha(indice: number) {
    setLinhas((ls) => ls.filter((_, i) => i !== indice))
  }

  async function salvarResultado() {
    if (!gerenciando) return
    const ids = linhas.map((l) => l.turma_id).filter(Boolean)
    if (new Set(ids).size !== ids.length) {
      setErroPartida('Cada turma pode aparecer apenas uma vez na partida.')
      return
    }
    if (ids.length === 0) {
      setErroPartida('Adicione ao menos uma turma.')
      return
    }
    setSalvandoPartida(true)
    setErroPartida(null)
    try {
      const existentes = new Set((gerenciando.partida_participantes ?? []).map((p) => p.id))
      const manter = new Set(linhas.map((l) => l.id).filter(Boolean) as string[])
      const remover = [...existentes].filter((id) => !manter.has(id))

      if (remover.length > 0) {
        const { error } = await supabase.from('partida_participantes').delete().in('id', remover)
        if (error) throw error
      }

      for (const l of linhas) {
        const payload = {
          partida_id: gerenciando.id,
          turma_id: l.turma_id,
          placar: l.placar === '' ? null : Number(l.placar),
          tempo: l.tempo === '' ? null : Number(l.tempo),
          pontuacao: l.pontuacao === '' ? null : Number(l.pontuacao),
          posicao: l.posicao === '' ? null : Number(l.posicao),
          vencedor: l.vencedor === '' ? null : l.vencedor === 'sim',
          observacao: l.observacao.trim() || null,
        }
        if (l.id) {
          const { error } = await supabase.from('partida_participantes').update(payload).eq('id', l.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('partida_participantes').insert(payload)
          if (error) throw error
        }
      }

      notificar('Partida atualizada.')
      setGerenciando(null)
      lista.reload()
    } catch (e) {
      setErroPartida(mensagemErro(e))
    } finally {
      setSalvandoPartida(false)
    }
  }

  async function excluir() {
    if (!excluindo) return
    setRemovendo(true)
    try {
      const { error } = await supabase.from('partidas').delete().eq('id', excluindo.id)
      if (error) throw error
      notificar('Partida excluída.')
      setExcluindo(null)
      lista.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setRemovendo(false)
    }
  }

  async function verConflitos() {
    setCarregandoConflitos(true)
    try {
      const { data, error } = await supabase.rpc('fn_conflitos_horario')
      if (error) throw error
      setConflitos((data ?? []) as Conflito[])
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setCarregandoConflitos(false)
    }
  }

  const itens = lista.data ?? []

  return (
    <>
      <PageHeader
        titulo="Partidas"
        descricao="Programe jogos, registre placares e acompanhe conflitos de horário."
        acoes={
          <>
            <Button variant="outline" onClick={verConflitos} loading={carregandoConflitos}>
              <AlertTriangle className="h-4 w-4" /> Conflitos
            </Button>
            <Button onClick={() => abrir('nova')}>
              <Plus className="h-4 w-4" /> Nova partida
            </Button>
          </>
        }
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-auto min-w-[190px]"
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as 'todas' | StatusPartida)}
            aria-label="Filtrar por situação"
          >
            <option value="todas">Todas as situações</option>
            {STATUS_PARTIDA.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            className="w-auto"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            aria-label="Filtrar por data"
          />
          {dataFiltro ? (
            <Button variant="ghost" size="sm" onClick={() => setDataFiltro('')}>
              Limpar data
            </Button>
          ) : null}
          <span className="ml-auto text-xs text-slate-500">{itens.length} partida(s)</span>
        </div>
      </Card>

      {lista.loading || aux.loading ? (
        <Carregando />
      ) : lista.error || aux.error ? (
        <ErroBox mensagem={lista.error ?? aux.error ?? ''} onRetry={lista.reload} />
      ) : (
        <Card>
          {itens.length === 0 ? (
            <EmptyState
              titulo="Nenhuma partida"
              descricao="Programe as partidas quando os horários forem definidos."
              icone={<CalendarDays className="h-6 w-6" />}
              acao={<Button onClick={() => abrir('nova')}>Nova partida</Button>}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Quando / local</Th>
                  <Th>Modalidade</Th>
                  <Th>Turmas</Th>
                  <Th>Fase</Th>
                  <Th>Status</Th>
                  <Th className="w-40 text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {itens.map((p) => {
                  const participantes = p.partida_participantes ?? []
                  return (
                    <tr key={p.id}>
                      <Td>
                        <p className="text-sm font-medium tabular-nums text-slate-800">
                          {formatarDataHora(p.data_hora)}
                        </p>
                        <p className="text-[11px] text-slate-500">{p.locais?.nome ?? 'Local não definido'}</p>
                      </Td>
                      <Td>
                        <p className="text-sm">{p.modalidade_categorias?.modalidades?.nome ?? '—'}</p>
                        <p className="text-[11px] text-slate-500">{p.modalidade_categorias?.nome}</p>
                      </Td>
                      <Td>
                        {participantes.length === 0 ? (
                          <span className="text-xs text-amber-700">Sem turmas</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1 text-xs">
                            {participantes.map((pp, idx) => (
                              <span key={pp.id}>
                                {idx > 0 ? <span className="mx-0.5 text-slate-400">×</span> : null}
                                <span className="font-medium">{turmaRotulo(pp.turmas)}</span>
                                {pp.placar !== null ? (
                                  <span className="ml-1 rounded bg-slate-100 px-1 tabular-nums">{pp.placar}</span>
                                ) : null}
                              </span>
                            ))}
                          </div>
                        )}
                      </Td>
                      <Td className="text-xs">
                        {ROTULO_FASE[p.fase] ?? p.fase}
                        {p.rodada ? ` · ${p.rodada}ª` : ''}
                      </Td>
                      <Td>
                        <BadgePartida status={p.status} />
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => abrirResultado(p)}>
                            <Swords className="h-4 w-4" /> Resultado
                          </Button>
                          <Link
                            to={`/admin/resultados?categoria=${p.modalidade_categoria_id}`}
                            className="inline-flex h-8 items-center rounded-lg px-2 text-xs font-medium text-brand-700 hover:bg-brand-50"
                            title="Lançar colocação oficial"
                          >
                            <Trophy className="h-4 w-4" />
                          </Link>
                          <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => abrir(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" aria-label="Excluir" onClick={() => setExcluindo(p)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      <Dialog
        open={editando !== null}
        onClose={() => setEditando(null)}
        titulo={editando === 'nova' ? 'Nova partida' : 'Editar partida'}
        rodape={
          <>
            <Button variant="outline" onClick={() => setEditando(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvar} loading={salvando}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Modalidade / categoria" obrigatorio className="sm:col-span-2">
            <Select
              value={form.modalidade_categoria_id}
              onChange={(e) => setForm({ ...form, modalidade_categoria_id: e.target.value })}
            >
              <option value="">Selecione…</option>
              {gruposCategorias.map((g) => (
                <optgroup key={g.nome} label={g.nome}>
                  {g.itens.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                      {c.min_participantes_partida === null ? ' (mínimo não definido)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label="Data e hora" hint="Fuso de Belém (UTC−3).">
            <Input
              type="datetime-local"
              value={form.data_hora}
              onChange={(e) => setForm({ ...form, data_hora: e.target.value })}
            />
          </Field>
          <Field label="Local">
            <Select value={form.local_id} onChange={(e) => setForm({ ...form, local_id: e.target.value })}>
              <option value="">Não definido</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fase">
            <Select value={form.fase} onChange={(e) => setForm({ ...form, fase: e.target.value })}>
              {FASES.map((f) => (
                <option key={f} value={f}>
                  {ROTULO_FASE[f]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Rodada" hint="Opcional.">
            <Input
              type="number"
              min={1}
              value={form.rodada}
              onChange={(e) => setForm({ ...form, rodada: e.target.value })}
            />
          </Field>
          <Field label="Situação">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as StatusPartida })}
            >
              {STATUS_PARTIDA.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </Field>
        </div>

        {erroForm ? (
          <div className="mt-3">
            <Aviso tom="erro">{erroForm}</Aviso>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={gerenciando !== null}
        onClose={() => setGerenciando(null)}
        titulo="Turmas e resultado"
        descricao={
          gerenciando
            ? `${gerenciando.modalidade_categorias?.modalidades?.nome ?? ''} · ${
                gerenciando.modalidade_categorias?.nome ?? ''
              }${gerenciando.modalidade_categorias?.min_participantes_partida ? ` · mínimo ${gerenciando.modalidade_categorias.min_participantes_partida}` : ''}`
            : ''
        }
        largura="lg"
        rodape={
          gerenciando ? (
            <>
              <Button variant="outline" onClick={() => setGerenciando(null)} disabled={salvandoPartida}>
                Fechar
              </Button>
              <Button onClick={salvarResultado} loading={salvandoPartida}>
                Salvar
              </Button>
            </>
          ) : null
        }
      >
        {gerenciando ? (
          <div className="space-y-3">
            {erroPartida ? <Aviso tom="erro">{erroPartida}</Aviso> : null}

            {linhas.length === 0 ? (
              <Aviso tom="info">
                Adicione as turmas participantes. Para partidas oficiais, a categoria precisa ter um
                mínimo de participantes configurado.
              </Aviso>
            ) : null}

            <div className="space-y-3">
              {linhas.map((l, idx) => (
                <div key={l.id ?? `nova-${idx}`} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <Field label="Turma" className="min-w-[180px] flex-1">
                      <Select
                        value={l.turma_id}
                        onChange={(e) => atualizarLinha(idx, 'turma_id', e.target.value)}
                      >
                        <option value="">Selecione…</option>
                        {turmas.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.numero}
                            {t.nome_equipe ? ` · ${t.nome_equipe}` : ''}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Placar" className="w-20">
                      <Input
                        type="number"
                        value={l.placar}
                        onChange={(e) => atualizarLinha(idx, 'placar', e.target.value)}
                      />
                    </Field>
                    <Field label="Tempo" className="w-20">
                      <Input
                        type="number"
                        step="0.01"
                        value={l.tempo}
                        onChange={(e) => atualizarLinha(idx, 'tempo', e.target.value)}
                      />
                    </Field>
                    <Field label="Pontos" className="w-20">
                      <Input
                        type="number"
                        step="0.01"
                        value={l.pontuacao}
                        onChange={(e) => atualizarLinha(idx, 'pontuacao', e.target.value)}
                      />
                    </Field>
                    <Field label="Posição" className="w-20">
                      <Input
                        type="number"
                        value={l.posicao}
                        onChange={(e) => atualizarLinha(idx, 'posicao', e.target.value)}
                      />
                    </Field>
                    <Field label="Vencedor" className="w-32">
                      <Select
                        value={l.vencedor}
                        onChange={(e) => atualizarLinha(idx, 'vencedor', e.target.value)}
                      >
                        <option value="">—</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </Select>
                    </Field>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Remover turma"
                      onClick={() => removerLinha(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                  <Field label="Observação" className="mt-2">
                    <Input
                      value={l.observacao}
                      onChange={(e) => atualizarLinha(idx, 'observacao', e.target.value)}
                      placeholder="Opcional"
                    />
                  </Field>
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={adicionarLinha} disabled={linhas.length >= turmas.length}>
              <Plus className="h-4 w-4" /> Adicionar turma
            </Button>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={conflitos !== null}
        onClose={() => setConflitos(null)}
        titulo="Conflitos de horário"
        descricao="Turmas com duas partidas no mesmo horário ou dois jogos no mesmo local."
        largura="lg"
      >
        {(conflitos ?? []).length === 0 ? (
          <Aviso tom="sucesso">Nenhum conflito encontrado na programação atual.</Aviso>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Tipo</Th>
                <Th>Horário</Th>
                <Th>Referência</Th>
                <Th>Detalhe</Th>
              </tr>
            </thead>
            <tbody>
              {(conflitos ?? []).map((c, i) => (
                <tr key={`${c.tipo}-${i}`}>
                  <Td>
                    <Badge tom={c.tipo === 'local' ? 'ambar' : 'vermelho'}>{c.tipo}</Badge>
                  </Td>
                  <Td className="text-xs tabular-nums">{formatarDataHora(c.data_hora)}</Td>
                  <Td className="text-xs font-medium">{c.referencia}</Td>
                  <Td className="text-xs text-slate-600">{c.detalhe}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Dialog>

      <ConfirmDialog
        open={excluindo !== null}
        titulo="Excluir partida"
        descricao="A partida e seus participantes serão removidos. Esta ação não pode ser desfeita."
        confirmar="Excluir"
        loading={removendo}
        onConfirm={excluir}
        onClose={() => setExcluindo(null)}
      />
    </>
  )
}
