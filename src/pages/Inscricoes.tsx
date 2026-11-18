import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, ClipboardList, Pencil, Plus, Trash2, UserRound, X } from 'lucide-react'
import {
  Aviso,
  Badge,
  Button,
  Card,
  Carregando,
  Checkbox,
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
import { STATUS_INSCRICAO } from '@/lib/constantes'
import { mensagemErro } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { turmaRotulo } from '@/lib/format'
import type {
  CategoriaComModalidade,
  Estudante,
  Inscricao,
  StatusInscricao,
  Turma,
} from '@/lib/types'

type Validacao = { ok: boolean; erros: string[]; avisos: string[] }

type Formulario = {
  modalidade_categoria_id: string
  turma_id: string
  tipo: 'individual' | 'equipe'
  nome_equipe: string
  observacoes: string
}

type PainelEquipe = {
  inscricao: Inscricao
  alunos: Estudante[]
  selecionados: Set<string>
  iniciais: Set<string>
  validacao: Validacao | null
}

const VAZIO: Formulario = {
  modalidade_categoria_id: '',
  turma_id: '',
  tipo: 'equipe',
  nome_equipe: '',
  observacoes: '',
}

function BadgeStatus({ status }: { status: StatusInscricao }) {
  const tom = {
    pendente: 'ambar',
    aprovada: 'verde',
    rejeitada: 'vermelho',
    cancelada: 'cinza',
  }[status] as 'ambar' | 'verde' | 'vermelho' | 'cinza'
  return <Badge tom={tom}>{STATUS_INSCRICAO.find((s) => s.valor === status)?.rotulo ?? status}</Badge>
}

export default function Inscricoes() {
  const { notificar } = useToast()
  const [params, setParams] = useSearchParams()

  const [status, setStatus] = useState<'todas' | StatusInscricao>('todas')
  const [categoriaId, setCategoriaId] = useState(params.get('categoria') ?? '')
  const [turmaId, setTurmaId] = useState('')

  const modalidadeFiltro = params.get('modalidade') ?? ''

  useEffect(() => {
    setCategoriaId(params.get('categoria') ?? '')
  }, [params])

  const aux = useAsync(async () => {
    const [cats, turmas] = await Promise.all([
      supabase
        .from('modalidade_categorias')
        .select('*, modalidades(id, nome, tipo, slug)')
        .eq('ativo', true)
        .order('nome'),
      supabase.from('turmas').select('*').eq('ativo', true).order('numero'),
    ])
    if (cats.error) throw cats.error
    if (turmas.error) throw turmas.error
    return {
      categorias: cats.data as CategoriaComModalidade[],
      turmas: turmas.data as Turma[],
    }
  })

  const lista = useAsync(async () => {
    let q = supabase
      .from('inscricoes')
      .select(
        '*, modalidade_categorias(nome, genero, modalidades(id, nome, tipo)), turmas(numero, nome_equipe), inscricao_participantes(count)',
      )
      .order('created_at', { ascending: false })
    if (status !== 'todas') q = q.eq('status', status)
    if (categoriaId) q = q.eq('modalidade_categoria_id', categoriaId)
    if (turmaId) q = q.eq('turma_id', turmaId)
    const { data, error } = await q
    if (error) throw error
    return data as unknown as Inscricao[]
  }, [status, categoriaId, turmaId])

  const categorias = aux.data?.categorias ?? []
  const turmas = aux.data?.turmas ?? []

  const categoriasVisiveis = useMemo(() => {
    if (!modalidadeFiltro) return categorias
    return categorias.filter((c) => c.modalidades?.id === modalidadeFiltro)
  }, [categorias, modalidadeFiltro])

  const categoriasAgrupadas = useMemo(() => {
    const mapa = new Map<string, { nome: string; itens: CategoriaComModalidade[] }>()
    for (const c of categoriasVisiveis) {
      const chave = c.modalidades?.id ?? 'outros'
      const grupo = mapa.get(chave) ?? { nome: c.modalidades?.nome ?? 'Outros', itens: [] }
      grupo.itens.push(c)
      mapa.set(chave, grupo)
    }
    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [categoriasVisiveis])

  const [criando, setCriando] = useState(false)
  const [form, setForm] = useState<Formulario>(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  const [editando, setEditando] = useState<Inscricao | null>(null)
  const [formEdicao, setFormEdicao] = useState({ tipo: 'equipe' as 'individual' | 'equipe', nome_equipe: '', observacoes: '' })

  const [painel, setPainel] = useState<PainelEquipe | null>(null)
  const [carregandoEquipe, setCarregandoEquipe] = useState(false)
  const [salvandoEquipe, setSalvandoEquipe] = useState(false)
  const [validando, setValidando] = useState(false)
  const [aprovando, setAprovando] = useState(false)
  const [erroEquipe, setErroEquipe] = useState<string | null>(null)

  const [excluindo, setExcluindo] = useState<Inscricao | null>(null)
  const [removendo, setRemovendo] = useState(false)

  function categoriaSelecionada(): CategoriaComModalidade | undefined {
    return categorias.find((c) => c.id === form.modalidade_categoria_id)
  }

  function abrirNova() {
    setErroForm(null)
    setForm({
      ...VAZIO,
      modalidade_categoria_id: categoriaId || '',
      turma_id: turmaId || (turmas[0]?.id ?? ''),
    })
    setCriando(true)
  }

  async function criar() {
    if (!form.modalidade_categoria_id || !form.turma_id) {
      setErroForm('Selecione a categoria e a turma.')
      return
    }
    setSalvando(true)
    setErroForm(null)
    try {
      const { data, error } = await supabase
        .from('inscricoes')
        .insert({
          modalidade_categoria_id: form.modalidade_categoria_id,
          turma_id: form.turma_id,
          tipo: form.tipo,
          nome_equipe: form.nome_equipe.trim() || null,
          observacoes: form.observacoes.trim() || null,
          status: 'pendente',
        })
        .select('id')
        .single()
      if (error) throw error

      const { data: completa, error: erroCompleta } = await supabase
        .from('inscricoes')
        .select(
          '*, modalidade_categorias(nome, genero, modalidades(id, nome, tipo)), turmas(numero, nome_equipe)',
        )
        .eq('id', data.id)
        .single()
      if (erroCompleta) throw erroCompleta

      notificar('Inscrição criada. Agora monte a equipe.')
      setCriando(false)
      lista.reload()
      void abrirEquipe(completa as unknown as Inscricao)
    } catch (e) {
      setErroForm(mensagemErro(e))
    } finally {
      setSalvando(false)
    }
  }

  async function abrirEquipe(inscricao: Inscricao) {
    setCarregandoEquipe(true)
    setErroEquipe(null)
    setPainel(null)
    try {
      const { data: alunosData, error: erroAlunos } = await supabase
        .from('estudantes')
        .select('*')
        .eq('turma_id', inscricao.turma_id)
        .eq('ativo', true)
        .order('nome_completo')
      if (erroAlunos) throw erroAlunos

      const { data: atuais, error: erroAtuais } = await supabase
        .from('inscricao_participantes')
        .select('estudante_id')
        .eq('inscricao_id', inscricao.id)
      if (erroAtuais) throw erroAtuais

      const selecionados = new Set((atuais ?? []).map((a) => a.estudante_id as string))
      setPainel({
        inscricao,
        alunos: alunosData as Estudante[],
        selecionados,
        iniciais: new Set(selecionados),
        validacao: null,
      })
      void validar(inscricao.id, false)
    } catch (e) {
      const msg = mensagemErro(e)
      setErroEquipe(msg)
      notificar(msg, 'erro')
    } finally {
      setCarregandoEquipe(false)
    }
  }

  async function validar(inscricaoId: string, paraAprovar: boolean) {
    setValidando(true)
    try {
      const { data, error } = await supabase.rpc('fn_validar_inscricao', {
        p_inscricao_id: inscricaoId,
        p_para_aprovar: paraAprovar,
      })
      if (error) throw error
      const v = data as Validacao
      setPainel((p) => (p && p.inscricao.id === inscricaoId ? { ...p, validacao: v } : p))
      return v
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
      return null
    } finally {
      setValidando(false)
    }
  }

  function alternar(estudanteId: string) {
    setPainel((p) => {
      if (!p) return p
      const selecionados = new Set(p.selecionados)
      if (selecionados.has(estudanteId)) selecionados.delete(estudanteId)
      else selecionados.add(estudanteId)
      return { ...p, selecionados }
    })
  }

  async function persistirEquipe(atual: PainelEquipe): Promise<boolean> {
    const adicionar = [...atual.selecionados].filter((id) => !atual.iniciais.has(id))
    const remover = [...atual.iniciais].filter((id) => !atual.selecionados.has(id))

    if (remover.length > 0) {
      const { error } = await supabase
        .from('inscricao_participantes')
        .delete()
        .eq('inscricao_id', atual.inscricao.id)
        .in('estudante_id', remover)
      if (error) throw error
    }

    if (adicionar.length > 0) {
      const { error } = await supabase.from('inscricao_participantes').insert(
        adicionar.map((estudante_id) => ({
          inscricao_id: atual.inscricao.id,
          estudante_id,
        })),
      )
      if (error) throw error
    }

    setPainel((p) => (p ? { ...p, iniciais: new Set(atual.selecionados) } : p))
    lista.reload()
    return true
  }

  async function salvarEquipe() {
    if (!painel) return
    setSalvandoEquipe(true)
    setErroEquipe(null)
    try {
      await persistirEquipe(painel)
      notificar('Equipe salva.')
      await validar(painel.inscricao.id, false)
    } catch (e) {
      setErroEquipe(mensagemErro(e))
    } finally {
      setSalvandoEquipe(false)
    }
  }

  async function validarSalvando() {
    if (!painel) return
    setValidando(true)
    setErroEquipe(null)
    try {
      await persistirEquipe(painel)
      const v = await validar(painel.inscricao.id, true)
      if (v?.ok) notificar('Equipe válida para aprovação.')
    } catch (e) {
      setErroEquipe(mensagemErro(e))
    } finally {
      setValidando(false)
    }
  }

  async function aprovar() {
    if (!painel) return
    setAprovando(true)
    setErroEquipe(null)
    try {
      await persistirEquipe(painel)
      const v = await validar(painel.inscricao.id, true)
      if (!v) return
      if (!v.ok) {
        notificar('Corrija os erros antes de aprovar a inscrição.', 'erro')
        return
      }
      const { error } = await supabase
        .from('inscricoes')
        .update({ status: 'aprovada' })
        .eq('id', painel.inscricao.id)
      if (error) throw error
      notificar('Inscrição aprovada.')
      setPainel(null)
      lista.reload()
    } catch (e) {
      setErroEquipe(mensagemErro(e))
    } finally {
      setAprovando(false)
    }
  }

  async function mudarStatus(inscricao: Inscricao, novo: StatusInscricao) {
    try {
      const { error } = await supabase.from('inscricoes').update({ status: novo }).eq('id', inscricao.id)
      if (error) throw error
      notificar(`Inscrição marcada como ${novo}.`)
      lista.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    }
  }

  function abrirEdicao(i: Inscricao) {
    setFormEdicao({
      tipo: i.tipo,
      nome_equipe: i.nome_equipe ?? '',
      observacoes: i.observacoes ?? '',
    })
    setEditando(i)
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvando(true)
    try {
      const { error } = await supabase
        .from('inscricoes')
        .update({
          tipo: formEdicao.tipo,
          nome_equipe: formEdicao.nome_equipe.trim() || null,
          observacoes: formEdicao.observacoes.trim() || null,
        })
        .eq('id', editando.id)
      if (error) throw error
      notificar('Inscrição atualizada.')
      setEditando(null)
      lista.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!excluindo) return
    setRemovendo(true)
    try {
      const { error } = await supabase.from('inscricoes').delete().eq('id', excluindo.id)
      if (error) throw error
      notificar('Inscrição excluída.')
      setExcluindo(null)
      lista.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setRemovendo(false)
    }
  }

  const itens = lista.data ?? []
  const catAtual = categoriaSelecionada()

  return (
    <>
      <PageHeader
        titulo="Inscrições"
        descricao="Monte as equipes e aprove somente inscrições que cumprem as regras da modalidade."
        acoes={
          <Button onClick={abrirNova}>
            <Plus className="h-4 w-4" /> Nova inscrição
          </Button>
        }
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-auto min-w-[170px]"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'todas' | StatusInscricao)}
            aria-label="Filtrar por situação"
          >
            <option value="todas">Todas as situações</option>
            {STATUS_INSCRICAO.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto min-w-[260px]"
            value={categoriaId}
            onChange={(e) => {
              setCategoriaId(e.target.value)
              const novos = new URLSearchParams(params)
              if (e.target.value) novos.set('categoria', e.target.value)
              else novos.delete('categoria')
              setParams(novos, { replace: true })
            }}
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {categoriasAgrupadas.map((g) => (
              <optgroup key={g.nome} label={g.nome}>
                {g.itens.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          <Select
            className="w-auto min-w-[170px]"
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            aria-label="Filtrar por turma"
          >
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.numero}
                {t.nome_equipe ? ` · ${t.nome_equipe}` : ''}
              </option>
            ))}
          </Select>
          <span className="ml-auto text-xs text-slate-500">{itens.length} inscrição(ões)</span>
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
              titulo="Nenhuma inscrição encontrada"
              descricao="Crie a primeira inscrição e monte a equipe."
              icone={<ClipboardList className="h-6 w-6" />}
              acao={<Button onClick={abrirNova}>Nova inscrição</Button>}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Modalidade / categoria</Th>
                  <Th>Turma</Th>
                  <Th>Equipe</Th>
                  <Th>Atletas</Th>
                  <Th>Status</Th>
                  <Th className="w-48 text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {itens.map((i) => {
                  const qtd = i.inscricao_participantes?.[0]?.count ?? 0
                  return (
                    <tr key={i.id}>
                      <Td>
                        <p className="font-medium text-slate-800">
                          {i.modalidade_categorias?.modalidades?.nome ?? '—'}
                        </p>
                        <p className="text-[11px] text-slate-500">{i.modalidade_categorias?.nome}</p>
                      </Td>
                      <Td className="text-xs">{turmaRotulo(i.turmas)}</Td>
                      <Td className="text-xs">
                        <span className="capitalize">{i.tipo}</span>
                        {i.nome_equipe ? ` · ${i.nome_equipe}` : ''}
                      </Td>
                      <Td>
                        <span className={qtd === 0 ? 'text-xs font-medium text-amber-700' : 'text-xs'}>
                          {qtd === 0 ? 'Sem atletas' : `${qtd} atleta(s)`}
                        </span>
                      </Td>
                      <Td>
                        <BadgeStatus status={i.status} />
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => void abrirEquipe(i)}>
                            <UserRound className="h-4 w-4" /> Equipe
                          </Button>
                          {i.status === 'pendente' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Aprovar"
                              title="Aprovar"
                              onClick={() => void mudarStatus(i, 'aprovada')}
                            >
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                          ) : null}
                          {i.status === 'pendente' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Rejeitar"
                              title="Rejeitar"
                              onClick={() => void mudarStatus(i, 'rejeitada')}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => abrirEdicao(i)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" aria-label="Excluir" onClick={() => setExcluindo(i)}>
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

      {/* Nova inscrição */}
      <Dialog
        open={criando}
        onClose={() => setCriando(false)}
        titulo="Nova inscrição"
        descricao="Depois de criar, você poderá selecionar os atletas."
        rodape={
          <>
            <Button variant="outline" onClick={() => setCriando(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={criar} loading={salvando}>
              Criar e montar equipe
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Categoria" obrigatorio className="sm:col-span-2">
            <Select
              value={form.modalidade_categoria_id}
              onChange={(e) => {
                const cat = categorias.find((c) => c.id === e.target.value)
                setForm({
                  ...form,
                  modalidade_categoria_id: e.target.value,
                  tipo: cat?.modalidades?.tipo === 'individual' ? 'individual' : 'equipe',
                })
              }}
            >
              <option value="">Selecione…</option>
              {categoriasAgrupadas.map((g) => (
                <optgroup key={g.nome} label={g.nome}>
                  {g.itens.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label="Turma" obrigatorio>
            <Select value={form.turma_id} onChange={(e) => setForm({ ...form, turma_id: e.target.value })}>
              <option value="">Selecione…</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.numero}
                  {t.nome_equipe ? ` · ${t.nome_equipe}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tipo">
            <Select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as 'individual' | 'equipe' })}
            >
              <option value="equipe">Equipe</option>
              <option value="individual">Individual</option>
            </Select>
          </Field>
          <Field
            label="Nome da equipe"
            className="sm:col-span-2"
            hint={
              catAtual
                ? `Limite: ${catAtual.max_equipes_por_turma ?? '—'} inscrição(ões) por turma nesta categoria.`
                : 'Opcional. Útil quando a turma tem mais de uma equipe.'
            }
          >
            <Input
              value={form.nome_equipe}
              onChange={(e) => setForm({ ...form, nome_equipe: e.target.value })}
              placeholder="Ex.: Time A"
            />
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

      {/* Editar inscrição */}
      <Dialog
        open={editando !== null}
        onClose={() => setEditando(null)}
        titulo="Editar inscrição"
        rodape={
          <>
            <Button variant="outline" onClick={() => setEditando(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvarEdicao} loading={salvando}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo">
            <Select
              value={formEdicao.tipo}
              onChange={(e) =>
                setFormEdicao({ ...formEdicao, tipo: e.target.value as 'individual' | 'equipe' })
              }
            >
              <option value="equipe">Equipe</option>
              <option value="individual">Individual</option>
            </Select>
          </Field>
          <Field label="Nome da equipe">
            <Input
              value={formEdicao.nome_equipe}
              onChange={(e) => setFormEdicao({ ...formEdicao, nome_equipe: e.target.value })}
            />
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            <Textarea
              value={formEdicao.observacoes}
              onChange={(e) => setFormEdicao({ ...formEdicao, observacoes: e.target.value })}
            />
          </Field>
        </div>
      </Dialog>

      {/* Equipe */}
      <Dialog
        open={painel !== null || carregandoEquipe}
        onClose={() => setPainel(null)}
        titulo="Montar equipe"
        descricao={
          painel
            ? `${painel.inscricao.modalidade_categorias?.modalidades?.nome ?? ''} · ${
                painel.inscricao.modalidade_categorias?.nome ?? ''
              } · ${turmaRotulo(painel.inscricao.turmas)}`
            : 'Carregando estudantes…'
        }
        largura="lg"
        rodape={
          painel ? (
            <>
              <Button variant="outline" onClick={() => setPainel(null)} disabled={salvandoEquipe}>
                Fechar
              </Button>
              <Button variant="outline" onClick={validarSalvando} loading={validando}>
                Validar equipe
              </Button>
              <Button onClick={salvarEquipe} loading={salvandoEquipe}>
                Salvar equipe
              </Button>
              {painel.inscricao.status !== 'aprovada' ? (
                <Button variant="secondary" onClick={aprovar} loading={aprovando}>
                  Salvar e aprovar
                </Button>
              ) : null}
            </>
          ) : null
        }
      >
        {carregandoEquipe ? (
          <Carregando texto="Carregando estudantes da turma…" />
        ) : painel ? (
          <div className="space-y-4">
            {erroEquipe ? <Aviso tom="erro">{erroEquipe}</Aviso> : null}

            {painel.validacao ? (
              <div className="space-y-2">
                {painel.validacao.erros.length > 0 ? (
                  <Aviso tom="erro" titulo="Impede a aprovação">
                    <ul className="list-disc space-y-0.5 pl-4">
                      {painel.validacao.erros.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </Aviso>
                ) : (
                  <Aviso tom="sucesso">Nenhum erro encontrado. A inscrição pode ser aprovada.</Aviso>
                )}
                {painel.validacao.avisos.length > 0 ? (
                  <Aviso tom="atencao" titulo="Avisos">
                    <ul className="list-disc space-y-0.5 pl-4">
                      {painel.validacao.avisos.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </Aviso>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                {painel.alunos.length} estudante(s) ativo(s) nesta turma · {painel.selecionados.size}{' '}
                selecionado(s)
              </p>
              {validando ? <span className="text-xs text-slate-400">Validando…</span> : null}
            </div>

            {painel.alunos.length === 0 ? (
              <Aviso tom="atencao">
                Esta turma não tem estudantes ativos cadastrados. Cadastre-os em{' '}
                <strong>Estudantes</strong> antes de montar a equipe.
              </Aviso>
            ) : (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {painel.alunos.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={painel.selecionados.has(a.id)}
                      onChange={() => alternar(a.id)}
                      label={<span className="block truncate">{a.nome_completo}</span>}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={excluindo !== null}
        titulo="Excluir inscrição"
        descricao="A equipe e a seleção de atletas serão removidas. Partidas ou resultados vinculados impedem a exclusão."
        confirmar="Excluir"
        loading={removendo}
        onConfirm={excluir}
        onClose={() => setExcluindo(null)}
      />
    </>
  )
}
