import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ListTree, Pencil, Plus, Trash2, Trophy } from 'lucide-react'
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
import { TIPOS_MODALIDADE } from '@/lib/constantes'
import { mensagemErro } from '@/lib/errors'
import { numero } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import type { Modalidade, TipoModalidade } from '@/lib/types'

type ModalidadeComContagem = Modalidade & { modalidade_categorias: { count: number }[] | null }

type Formulario = {
  slug: string
  nome: string
  eixo: string
  tipo: TipoModalidade
  descricao: string
  regras_especificas: string
  conta_classificacao_geral: boolean
  conta_taca_desempenho: boolean
  ativo: boolean
  ordem: string
  a_confirmar: boolean
  nota_admin: string
}

const VAZIO: Formulario = {
  slug: '',
  nome: '',
  eixo: 'Esportivo',
  tipo: 'equipe',
  descricao: '',
  regras_especificas: '',
  conta_classificacao_geral: true,
  conta_taca_desempenho: true,
  ativo: true,
  ordem: '',
  a_confirmar: false,
  nota_admin: '',
}

function slugificar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function Modalidades() {
  const { notificar } = useToast()
  const { data, loading, error, reload } = useAsync(async () => {
    const { data, error } = await supabase
      .from('modalidades')
      .select('*, modalidade_categorias(count)')
      .order('ordem', { nullsFirst: false })
      .order('nome')
    if (error) throw error
    return data as ModalidadeComContagem[]
  })

  const [editando, setEditando] = useState<ModalidadeComContagem | 'nova' | null>(null)
  const [form, setForm] = useState<Formulario>(VAZIO)
  const [slugTocado, setSlugTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState<ModalidadeComContagem | null>(null)
  const [removendo, setRemovendo] = useState(false)

  function abrir(m: ModalidadeComContagem | 'nova') {
    setErroForm(null)
    setSlugTocado(true)
    if (m === 'nova') {
      setForm(VAZIO)
      setSlugTocado(false)
      setEditando('nova')
      return
    }
    setForm({
      slug: m.slug,
      nome: m.nome,
      eixo: m.eixo,
      tipo: m.tipo,
      descricao: m.descricao ?? '',
      regras_especificas: m.regras_especificas ?? '',
      conta_classificacao_geral: m.conta_classificacao_geral,
      conta_taca_desempenho: m.conta_taca_desempenho,
      ativo: m.ativo,
      ordem: m.ordem === null ? '' : String(m.ordem),
      a_confirmar: m.a_confirmar,
      nota_admin: m.nota_admin ?? '',
    })
    setEditando(m)
  }

  function alterarNome(valor: string) {
    setForm((f) => ({ ...f, nome: valor, slug: slugTocado ? f.slug : slugificar(valor) }))
  }

  async function salvar() {
    if (!form.nome.trim() || !form.slug.trim() || !form.eixo.trim()) {
      setErroForm('Preencha nome, identificador e eixo.')
      return
    }
    setSalvando(true)
    setErroForm(null)
    const payload = {
      slug: slugificar(form.slug),
      nome: form.nome.trim(),
      eixo: form.eixo.trim(),
      tipo: form.tipo,
      descricao: form.descricao.trim() || null,
      regras_especificas: form.regras_especificas.trim() || null,
      conta_classificacao_geral: form.conta_classificacao_geral,
      conta_taca_desempenho: form.conta_taca_desempenho,
      ativo: form.ativo,
      ordem: numero(form.ordem),
      a_confirmar: form.a_confirmar,
      nota_admin: form.nota_admin.trim() || null,
    }
    try {
      if (editando === 'nova') {
        const { error } = await supabase.from('modalidades').insert(payload)
        if (error) throw error
        notificar('Modalidade criada.')
      } else if (editando) {
        const { error } = await supabase.from('modalidades').update(payload).eq('id', editando.id)
        if (error) throw error
        notificar('Modalidade atualizada.')
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
      const { error } = await supabase.from('modalidades').delete().eq('id', excluindo.id)
      if (error) throw error
      notificar('Modalidade removida.')
      setExcluindo(null)
      reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setRemovendo(false)
    }
  }

  return (
    <>
      <PageHeader
        titulo="Modalidades e categorias"
        descricao="Cada modalidade tem suas próprias categorias, limites e regras de premiação. Tudo editável."
        acoes={
          <Button onClick={() => abrir('nova')}>
            <Plus className="h-4 w-4" /> Nova modalidade
          </Button>
        }
      />

      {loading ? (
        <Carregando />
      ) : error ? (
        <ErroBox mensagem={error} onRetry={reload} />
      ) : (
        <Card>
          {(data ?? []).length === 0 ? (
            <EmptyState
              titulo="Nenhuma modalidade"
              descricao="Cadastre as modalidades dos jogos."
              icone={<Trophy className="h-6 w-6" />}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Modalidade</Th>
                  <Th>Eixo / tipo</Th>
                  <Th>Categorias</Th>
                  <Th>Participa de</Th>
                  <Th>Situação</Th>
                  <Th className="w-40 text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((m) => (
                  <tr key={m.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{m.nome}</span>
                        {m.a_confirmar ? <Badge tom="ambar">A confirmar</Badge> : null}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">{m.slug}</p>
                    </Td>
                    <Td className="text-xs">
                      {m.eixo} · {TIPOS_MODALIDADE.find((t) => t.valor === m.tipo)?.rotulo}
                    </Td>
                    <Td className="tabular-nums">{m.modalidade_categorias?.[0]?.count ?? 0}</Td>
                    <Td className="text-[11px] text-slate-600">
                      {m.conta_classificacao_geral ? 'Geral' : '—'} ·{' '}
                      {m.conta_taca_desempenho ? 'Taça' : '—'}
                    </Td>
                    <Td>
                      <Badge tom={m.ativo ? 'verde' : 'cinza'}>{m.ativo ? 'Ativa' : 'Inativa'}</Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`/admin/modalidades/${m.id}`}
                          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-brand-700 hover:bg-brand-50"
                        >
                          <ListTree className="h-4 w-4" /> Categorias
                        </Link>
                        <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => abrir(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" aria-label="Excluir" onClick={() => setExcluindo(m)}>
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
        titulo={editando === 'nova' ? 'Nova modalidade' : 'Editar modalidade'}
        largura="lg"
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
          <Field label="Nome" obrigatorio>
            <Input value={form.nome} onChange={(e) => alterarNome(e.target.value)} />
          </Field>
          <Field label="Identificador (slug)" obrigatorio hint="Usado em URLs e referências internas.">
            <Input
              value={form.slug}
              onChange={(e) => {
                setSlugTocado(true)
                setForm({ ...form, slug: e.target.value })
              }}
              onBlur={() => setForm((f) => ({ ...f, slug: slugificar(f.slug) }))}
            />
          </Field>
          <Field label="Eixo" obrigatorio hint="Ex.: Esportivo, Cultural, Conhecimento.">
            <Input value={form.eixo} onChange={(e) => setForm({ ...form, eixo: e.target.value })} />
          </Field>
          <Field label="Tipo">
            <Select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoModalidade })}
            >
              {TIPOS_MODALIDADE.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ordem" hint="Opcional.">
            <Input
              type="number"
              value={form.ordem}
              onChange={(e) => setForm({ ...form, ordem: e.target.value })}
            />
          </Field>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <Checkbox
              label="Conta na classificação geral"
              checked={form.conta_classificacao_geral}
              onChange={(e) => setForm({ ...form, conta_classificacao_geral: e.target.checked })}
            />
            <Checkbox
              label="Conta no desempenho da Taça"
              checked={form.conta_taca_desempenho}
              onChange={(e) => setForm({ ...form, conta_taca_desempenho: e.target.checked })}
            />
            <Checkbox
              label="Modalidade ativa"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
          </div>
          <Field label="Descrição" className="sm:col-span-2">
            <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Field>
          <Field
            label="Regras específicas"
            className="sm:col-span-2"
            hint="Texto exibido no site. Ex.: distâncias da corrida, tempo de partida, pontuação."
          >
            <Textarea
              className="min-h-[120px]"
              value={form.regras_especificas}
              onChange={(e) => setForm({ ...form, regras_especificas: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Checkbox
              label="Marcar como “regra a confirmar”"
              checked={form.a_confirmar}
              onChange={(e) => setForm({ ...form, a_confirmar: e.target.checked })}
            />
          </div>
          <Field label="Nota interna" className="sm:col-span-2" hint="Visível apenas no painel.">
            <Textarea value={form.nota_admin} onChange={(e) => setForm({ ...form, nota_admin: e.target.value })} />
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
        titulo="Excluir modalidade"
        descricao={
          <>
            Excluir <strong>{excluindo?.nome}</strong> e todas as suas categorias? Se houver inscrições
            ou partidas vinculadas, a exclusão será bloqueada.
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
