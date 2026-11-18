import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { FORMATOS, GENEROS_CATEGORIA } from '@/lib/constantes'
import { mensagemErro } from '@/lib/errors'
import { numero } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import type { Categoria, FormatoResultado, GeneroCategoria, Modalidade } from '@/lib/types'

type Formulario = {
  nome: string
  genero: GeneroCategoria
  formato_resultado: FormatoResultado
  max_equipes_por_turma: string
  tamanho_equipe_min: string
  tamanho_equipe_max: string
  max_participantes_por_turma: string
  min_participantes_partida: string
  min_feminino: string
  min_masculino: string
  min_percentual_feminino: string
  vagas_premiadas: string
  ativo: boolean
  a_confirmar: boolean
  observacao: string
  ordem: string
}

const VAZIO: Formulario = {
  nome: '',
  genero: 'unica',
  formato_resultado: 'posicao',
  max_equipes_por_turma: '1',
  tamanho_equipe_min: '',
  tamanho_equipe_max: '',
  max_participantes_por_turma: '',
  min_participantes_partida: '',
  min_feminino: '',
  min_masculino: '',
  min_percentual_feminino: '',
  vagas_premiadas: '3',
  ativo: true,
  a_confirmar: false,
  observacao: '',
  ordem: '',
}

function paraForm(c: Categoria): Formulario {
  const s = (v: number | null) => (v === null ? '' : String(v))
  return {
    nome: c.nome,
    genero: c.genero,
    formato_resultado: c.formato_resultado,
    max_equipes_por_turma: s(c.max_equipes_por_turma),
    tamanho_equipe_min: s(c.tamanho_equipe_min),
    tamanho_equipe_max: s(c.tamanho_equipe_max),
    max_participantes_por_turma: s(c.max_participantes_por_turma),
    min_participantes_partida: s(c.min_participantes_partida),
    min_feminino: s(c.min_feminino),
    min_masculino: s(c.min_masculino),
    min_percentual_feminino: s(c.min_percentual_feminino),
    vagas_premiadas: s(c.vagas_premiadas),
    ativo: c.ativo,
    a_confirmar: c.a_confirmar,
    observacao: c.observacao ?? '',
    ordem: s(c.ordem),
  }
}

function resumo(c: Categoria) {
  const partes: string[] = []
  if (c.max_equipes_por_turma) partes.push(`até ${c.max_equipes_por_turma} inscrição(ões)/turma`)
  if (c.tamanho_equipe_min || c.tamanho_equipe_max) {
    partes.push(`equipe ${c.tamanho_equipe_min ?? '?'}–${c.tamanho_equipe_max ?? '?'}`)
  }
  if (c.max_participantes_por_turma) partes.push(`máx. ${c.max_participantes_por_turma} atletas/turma`)
  if (c.min_participantes_partida) partes.push(`mín. ${c.min_participantes_partida} na partida`)
  if (c.min_percentual_feminino) partes.push(`${c.min_percentual_feminino}% feminino`)
  return partes.join(' · ') || 'Sem limites definidos'
}

export default function ModalidadeDetalhe() {
  const { id } = useParams<{ id: string }>()
  const { notificar } = useToast()

  const base = useAsync(async () => {
    const [mod, cats] = await Promise.all([
      supabase.from('modalidades').select('*').eq('id', id!).single(),
      supabase
        .from('modalidade_categorias')
        .select('*')
        .eq('modalidade_id', id!)
        .order('ordem', { nullsFirst: false })
        .order('nome'),
    ])
    if (mod.error) throw mod.error
    if (cats.error) throw cats.error
    return { modalidade: mod.data as Modalidade, categorias: cats.data as Categoria[] }
  }, [id])

  const [editando, setEditando] = useState<Categoria | 'nova' | null>(null)
  const [form, setForm] = useState<Formulario>(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState<Categoria | null>(null)
  const [removendo, setRemovendo] = useState(false)

  function abrir(c: Categoria | 'nova') {
    setErroForm(null)
    if (c === 'nova') {
      setForm({ ...VAZIO, ordem: String((base.data?.categorias.length ?? 0) + 1) })
      setEditando('nova')
    } else {
      setForm(paraForm(c))
      setEditando(c)
    }
  }

  async function salvar() {
    if (!form.nome.trim()) {
      setErroForm('Informe o nome da categoria.')
      return
    }
    setSalvando(true)
    setErroForm(null)
    const payload = {
      modalidade_id: id,
      nome: form.nome.trim(),
      genero: form.genero,
      formato_resultado: form.formato_resultado,
      max_equipes_por_turma: numero(form.max_equipes_por_turma),
      tamanho_equipe_min: numero(form.tamanho_equipe_min),
      tamanho_equipe_max: numero(form.tamanho_equipe_max),
      max_participantes_por_turma: numero(form.max_participantes_por_turma),
      min_participantes_partida: numero(form.min_participantes_partida),
      min_feminino: numero(form.min_feminino),
      min_masculino: numero(form.min_masculino),
      min_percentual_feminino: numero(form.min_percentual_feminino),
      vagas_premiadas: numero(form.vagas_premiadas),
      ativo: form.ativo,
      a_confirmar: form.a_confirmar,
      observacao: form.observacao.trim() || null,
      ordem: numero(form.ordem),
    }
    try {
      if (editando === 'nova') {
        const { error } = await supabase.from('modalidade_categorias').insert(payload)
        if (error) throw error
        notificar('Categoria criada.')
      } else if (editando) {
        const { error } = await supabase.from('modalidade_categorias').update(payload).eq('id', editando.id)
        if (error) throw error
        notificar('Categoria atualizada.')
      }
      setEditando(null)
      base.reload()
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
      const { error } = await supabase.from('modalidade_categorias').delete().eq('id', excluindo.id)
      if (error) throw error
      notificar('Categoria removida.')
      setExcluindo(null)
      base.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setRemovendo(false)
    }
  }

  if (base.loading) return <Carregando />
  if (base.error) return <ErroBox mensagem={base.error} onRetry={base.reload} />
  if (!base.data) return null

  const { modalidade, categorias } = base.data

  return (
    <>
      <Link
        to="/admin/modalidades"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para modalidades
      </Link>

      <PageHeader
        titulo={modalidade.nome}
        descricao={`${modalidade.eixo} · ${categorias.length} categoria(s). Configure limites, gênero e premiação de cada uma.`}
        acoes={
          <>
            <Link to={`/admin/inscricoes?modalidade=${modalidade.id}`}>
              <Button variant="outline">
                <ClipboardList className="h-4 w-4" /> Inscrições
              </Button>
            </Link>
            <Button onClick={() => abrir('nova')}>
              <Plus className="h-4 w-4" /> Nova categoria
            </Button>
          </>
        }
      />

      {modalidade.regras_especificas ? (
        <Card className="mb-4 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Regras específicas</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {modalidade.regras_especificas}
          </p>
        </Card>
      ) : null}

      <Card>
        {categorias.length === 0 ? (
          <EmptyState
            titulo="Nenhuma categoria"
            descricao="Adicione as categorias/gêneros desta modalidade. Cada categoria é premiada separadamente."
            acao={<Button onClick={() => abrir('nova')}>Criar categoria</Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Categoria</Th>
                <Th>Gênero</Th>
                <Th>Formato</Th>
                <Th>Regras</Th>
                <Th>Prêmios</Th>
                <Th>Situação</Th>
                <Th className="w-24 text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <span className="font-medium text-slate-800">{c.nome}</span>
                    {c.a_confirmar ? (
                      <Badge tom="ambar" className="ml-2">
                        A confirmar
                      </Badge>
                    ) : null}
                  </Td>
                  <Td className="text-xs">
                    {GENEROS_CATEGORIA.find((g) => g.valor === c.genero)?.rotulo ?? c.genero}
                  </Td>
                  <Td className="text-xs">
                    {FORMATOS.find((f) => f.valor === c.formato_resultado)?.rotulo ?? c.formato_resultado}
                  </Td>
                  <Td>
                    <span className="text-[11px] leading-relaxed text-slate-600">{resumo(c)}</span>
                    {c.min_participantes_partida === null ? (
                      <p className="mt-1 text-[11px] font-medium text-amber-700">
                        Mínimo de partida não definido — jogos bloqueados.
                      </p>
                    ) : null}
                  </Td>
                  <Td className="text-xs tabular-nums">{c.vagas_premiadas ?? '—'}</Td>
                  <Td>
                    <Badge tom={c.ativo ? 'verde' : 'cinza'}>{c.ativo ? 'Ativa' : 'Inativa'}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => abrir(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label="Excluir" onClick={() => setExcluindo(c)}>
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

      <Dialog
        open={editando !== null}
        onClose={() => setEditando(null)}
        titulo={editando === 'nova' ? 'Nova categoria' : `Editar categoria${editando ? ` · ${editando.nome}` : ''}`}
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
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nome" obrigatorio className="sm:col-span-2">
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex.: Masculino, Feminino, Mista"
            />
          </Field>
          <Field label="Ordem">
            <Input
              type="number"
              value={form.ordem}
              onChange={(e) => setForm({ ...form, ordem: e.target.value })}
            />
          </Field>
          <Field label="Gênero">
            <Select
              value={form.genero}
              onChange={(e) => setForm({ ...form, genero: e.target.value as GeneroCategoria })}
            >
              {GENEROS_CATEGORIA.map((g) => (
                <option key={g.valor} value={g.valor}>
                  {g.rotulo}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Formato do resultado">
            <Select
              value={form.formato_resultado}
              onChange={(e) => setForm({ ...form, formato_resultado: e.target.value as FormatoResultado })}
            >
              {FORMATOS.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.rotulo}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vagas premiadas" hint="1º, 2º… até este limite.">
            <Input
              type="number"
              min={1}
              value={form.vagas_premiadas}
              onChange={(e) => setForm({ ...form, vagas_premiadas: e.target.value })}
            />
          </Field>

          <p className="sm:col-span-3 mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Limites de inscrição
          </p>
          <Field label="Máx. inscrições por turma">
            <Input
              type="number"
              min={1}
              value={form.max_equipes_por_turma}
              onChange={(e) => setForm({ ...form, max_equipes_por_turma: e.target.value })}
            />
          </Field>
          <Field label="Tamanho mínimo da equipe">
            <Input
              type="number"
              min={1}
              value={form.tamanho_equipe_min}
              onChange={(e) => setForm({ ...form, tamanho_equipe_min: e.target.value })}
            />
          </Field>
          <Field label="Tamanho máximo da equipe">
            <Input
              type="number"
              min={1}
              value={form.tamanho_equipe_max}
              onChange={(e) => setForm({ ...form, tamanho_equipe_max: e.target.value })}
            />
          </Field>
          <Field label="Máx. atletas por turma" hint="Para modalidades individuais com várias inscrições.">
            <Input
              type="number"
              min={1}
              value={form.max_participantes_por_turma}
              onChange={(e) => setForm({ ...form, max_participantes_por_turma: e.target.value })}
            />
          </Field>
          <Field
            label="Mín. participantes na partida"
            hint="Obrigatório para gerar jogos. Deixe vazio só se a regra ainda não estiver definida."
          >
            <Input
              type="number"
              min={1}
              value={form.min_participantes_partida}
              onChange={(e) => setForm({ ...form, min_participantes_partida: e.target.value })}
            />
          </Field>
          <Field label="Mín. percentual feminino" hint="0 a 100. Ex.: 50 para metade feminina.">
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={form.min_percentual_feminino}
              onChange={(e) => setForm({ ...form, min_percentual_feminino: e.target.value })}
            />
          </Field>
          <Field label="Mín. feminino (absoluto)">
            <Input
              type="number"
              min={0}
              value={form.min_feminino}
              onChange={(e) => setForm({ ...form, min_feminino: e.target.value })}
            />
          </Field>
          <Field label="Mín. masculino (absoluto)">
            <Input
              type="number"
              min={0}
              value={form.min_masculino}
              onChange={(e) => setForm({ ...form, min_masculino: e.target.value })}
            />
          </Field>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <Checkbox
              label="Categoria ativa"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            <Checkbox
              label="Regra a confirmar"
              checked={form.a_confirmar}
              onChange={(e) => setForm({ ...form, a_confirmar: e.target.checked })}
            />
          </div>
          <Field label="Observação" className="sm:col-span-3">
            <Textarea
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              placeholder="Detalhes da regra, distâncias, tempo, pontuação…"
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
        titulo="Excluir categoria"
        descricao={
          <>
            Excluir <strong>{excluindo?.nome}</strong>? Inscrições e resultados vinculados impedem a
            exclusão.
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
