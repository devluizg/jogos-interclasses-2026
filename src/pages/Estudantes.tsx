import { useEffect, useState } from 'react'
import { GraduationCap, Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
import { GENEROS } from '@/lib/constantes'
import { mensagemErro } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import type { Estudante, Genero, Turma } from '@/lib/types'

type EstudanteComTurma = Estudante & { turmas: { numero: number; nome_equipe: string | null } | null }

type Formulario = {
  turma_id: string
  nome_completo: string
  genero: Genero
  taxa_paga: boolean
  ativo: boolean
  observacoes: string
}

const VAZIO: Formulario = {
  turma_id: '',
  nome_completo: '',
  genero: 'nao_informado',
  taxa_paga: false,
  ativo: true,
  observacoes: '',
}

export default function Estudantes() {
  const { notificar } = useToast()
  const [turmaId, setTurmaId] = useState('')
  const [soAtivos, setSoAtivos] = useState(true)
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setBuscaAplicada(busca.trim()), 350)
    return () => window.clearTimeout(t)
  }, [busca])

  const turmas = useAsync(async () => {
    const { data, error } = await supabase.from('turmas').select('*').order('numero')
    if (error) throw error
    return data as Turma[]
  })

  const { data, loading, error, reload } = useAsync(async () => {
    let q = supabase
      .from('estudantes')
      .select('*, turmas(numero, nome_equipe)')
      .order('nome_completo')
    if (turmaId) q = q.eq('turma_id', turmaId)
    if (soAtivos) q = q.eq('ativo', true)
    if (buscaAplicada) q = q.ilike('nome_completo', `%${buscaAplicada}%`)
    const { data, error } = await q
    if (error) throw error
    return data as EstudanteComTurma[]
  }, [turmaId, soAtivos, buscaAplicada])

  const [editando, setEditando] = useState<EstudanteComTurma | 'novo' | null>(null)
  const [form, setForm] = useState<Formulario>(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState<EstudanteComTurma | null>(null)
  const [removendo, setRemovendo] = useState(false)

  function abrir(estudante: EstudanteComTurma | 'novo') {
    setErroForm(null)
    if (estudante === 'novo') {
      setForm({ ...VAZIO, turma_id: turmaId || (turmas.data?.[0]?.id ?? '') })
      setEditando('novo')
      return
    }
    setForm({
      turma_id: estudante.turma_id,
      nome_completo: estudante.nome_completo,
      genero: estudante.genero,
      taxa_paga: estudante.taxa_paga,
      ativo: estudante.ativo,
      observacoes: estudante.observacoes ?? '',
    })
    setEditando(estudante)
  }

  async function salvar() {
    if (!form.turma_id) {
      setErroForm('Selecione a turma.')
      return
    }
    if (!form.nome_completo.trim()) {
      setErroForm('Informe o nome completo.')
      return
    }
    setSalvando(true)
    setErroForm(null)
    const payload = {
      turma_id: form.turma_id,
      nome_completo: form.nome_completo.trim(),
      genero: form.genero,
      taxa_paga: form.taxa_paga,
      ativo: form.ativo,
      observacoes: form.observacoes.trim() || null,
    }
    try {
      if (editando === 'novo') {
        const { error } = await supabase.from('estudantes').insert(payload)
        if (error) throw error
        notificar('Estudante cadastrado.')
      } else if (editando) {
        const { error } = await supabase.from('estudantes').update(payload).eq('id', editando.id)
        if (error) throw error
        notificar('Estudante atualizado.')
      }
      setEditando(null)
      reload()
    } catch (e) {
      setErroForm(mensagemErro(e))
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!excluindo) return
    setRemovendo(true)
    try {
      const { error } = await supabase.from('estudantes').delete().eq('id', excluindo.id)
      if (error) throw error
      notificar('Estudante removido.')
      setExcluindo(null)
      reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setRemovendo(false)
    }
  }

  const lista = data ?? []

  return (
    <>
      <PageHeader
        titulo="Estudantes"
        descricao="Cadastro usado na montagem das equipes. O público nunca vê nomes completos — apenas o formato “Nome S.”."
        acoes={
          <Button onClick={() => abrir('novo')}>
            <Plus className="h-4 w-4" /> Novo estudante
          </Button>
        }
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select
            className="w-auto min-w-[180px]"
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            aria-label="Filtrar por turma"
          >
            <option value="">Todas as turmas</option>
            {(turmas.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.numero}
                {t.nome_equipe ? ` · ${t.nome_equipe}` : ''}
              </option>
            ))}
          </Select>
          <Checkbox
            label="Somente ativos"
            checked={soAtivos}
            onChange={(e) => setSoAtivos(e.target.checked)}
            className="whitespace-nowrap"
          />
          <span className="ml-auto text-xs text-slate-500">
            {lista.length} {lista.length === 1 ? 'estudante' : 'estudantes'}
          </span>
        </div>
      </Card>

      {loading ? (
        <Carregando />
      ) : error ? (
        <ErroBox mensagem={error} onRetry={reload} />
      ) : (
        <Card>
          {lista.length === 0 ? (
            <EmptyState
              titulo="Nenhum estudante encontrado"
              descricao="Ajuste os filtros ou cadastre o primeiro estudante."
              icone={<GraduationCap className="h-6 w-6" />}
              acao={<Button onClick={() => abrir('novo')}>Cadastrar estudante</Button>}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Nome</Th>
                  <Th>Turma</Th>
                  <Th>Gênero</Th>
                  <Th>Taxa</Th>
                  <Th>Situação</Th>
                  <Th className="w-24 text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {lista.map((e) => (
                  <tr key={e.id}>
                    <Td className="max-w-[300px] truncate font-medium text-slate-800">{e.nome_completo}</Td>
                    <Td className="tabular-nums">{e.turmas?.numero ?? '—'}</Td>
                    <Td className="text-xs">{GENEROS.find((g) => g.valor === e.genero)?.rotulo ?? e.genero}</Td>
                    <Td>
                      <Badge tom={e.taxa_paga ? 'verde' : 'cinza'}>{e.taxa_paga ? 'Paga' : 'Não paga'}</Badge>
                    </Td>
                    <Td>
                      <Badge tom={e.ativo ? 'verde' : 'cinza'}>{e.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => abrir(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" aria-label="Excluir" onClick={() => setExcluindo(e)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      <Dialog
        open={editando !== null}
        onClose={() => setEditando(null)}
        titulo={editando === 'novo' ? 'Novo estudante' : 'Editar estudante'}
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
          <Field label="Nome completo" obrigatorio className="sm:col-span-2">
            <Input
              value={form.nome_completo}
              onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
              placeholder="Nome do estudante"
            />
          </Field>
          <Field label="Turma" obrigatorio>
            <Select value={form.turma_id} onChange={(e) => setForm({ ...form, turma_id: e.target.value })}>
              <option value="">Selecione…</option>
              {(turmas.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.numero}
                  {t.nome_equipe ? ` · ${t.nome_equipe}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Gênero" hint="Usado nas regras de composição (ex.: 4H + 2M no vôlei).">
            <Select
              value={form.genero}
              onChange={(e) => setForm({ ...form, genero: e.target.value as Genero })}
            >
              {GENEROS.map((g) => (
                <option key={g.valor} value={g.valor}>
                  {g.rotulo}
                </option>
              ))}
            </Select>
          </Field>
          <div className="space-y-2 sm:col-span-2">
            <Checkbox
              label="Taxa de inscrição paga"
              checked={form.taxa_paga}
              onChange={(e) => setForm({ ...form, taxa_paga: e.target.checked })}
            />
            <Checkbox
              label="Estudante ativo"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
          </div>
          <Field label="Observações" className="sm:col-span-2">
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Opcional"
            />
          </Field>
        </div>

        {erroForm ? (
          <div className="mt-3">
            <Aviso tom="erro">{erroForm}</Aviso>
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={excluindo !== null}
        titulo="Excluir estudante"
        descricao={
          <>
            Remover <strong>{excluindo?.nome_completo}</strong>? Estudantes inscritos em modalidades não
            podem ser excluídos — desative o cadastro em vez disso.
          </>
        }
        confirmar="Excluir"
        loading={removendo}
        onConfirm={excluir}
        onClose={() => setExcluindo(null)}
      />
    </>
  )
}
