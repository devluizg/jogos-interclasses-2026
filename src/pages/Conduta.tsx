import { useMemo, useState } from 'react'
import { Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react'
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
import { mensagemErro } from '@/lib/errors'
import { formatarData, turmaRotulo } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import type { Conduta, Turma } from '@/lib/types'

type CondutaComTurma = Conduta & { turmas: { numero: number; nome_equipe: string | null } | null }

type Formulario = {
  turma_id: string
  data: string
  descricao: string
  pontos_desconto: string
  responsavel: string
  ativo: boolean
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

const VAZIO: Formulario = {
  turma_id: '',
  data: hoje(),
  descricao: '',
  pontos_desconto: '0',
  responsavel: '',
  ativo: true,
}

export default function Conduta() {
  const { notificar } = useToast()

  const base = useAsync(async () => {
    const [ocorrencias, turmas] = await Promise.all([
      supabase
        .from('conduta_ocorrencias')
        .select('*, turmas(numero, nome_equipe)')
        .order('data', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('turmas').select('*').eq('ativo', true).order('numero'),
    ])
    if (ocorrencias.error) throw ocorrencias.error
    if (turmas.error) throw turmas.error
    return {
      ocorrencias: ocorrencias.data as CondutaComTurma[],
      turmas: turmas.data as Turma[],
    }
  })

  const [editando, setEditando] = useState<CondutaComTurma | 'nova' | null>(null)
  const [form, setForm] = useState<Formulario>(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState<CondutaComTurma | null>(null)
  const [removendo, setRemovendo] = useState(false)

  const totais = useMemo(() => {
    const mapa = new Map<string, { rotulo: string; total: number }>()
    for (const o of base.data?.ocorrencias ?? []) {
      if (!o.ativo) continue
      const chave = o.turma_id
      const atual = mapa.get(chave) ?? { rotulo: turmaRotulo(o.turmas), total: 0 }
      atual.total += Number(o.pontos_desconto) || 0
      mapa.set(chave, atual)
    }
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total)
  }, [base.data])

  function abrir(o: CondutaComTurma | 'nova') {
    setErroForm(null)
    if (o === 'nova') {
      setForm({ ...VAZIO, turma_id: base.data?.turmas[0]?.id ?? '' })
      setEditando('nova')
      return
    }
    setForm({
      turma_id: o.turma_id,
      data: o.data,
      descricao: o.descricao,
      pontos_desconto: String(o.pontos_desconto ?? 0),
      responsavel: o.responsavel ?? '',
      ativo: o.ativo,
    })
    setEditando(o)
  }

  async function salvar() {
    if (!form.turma_id || !form.descricao.trim()) {
      setErroForm('Selecione a turma e descreva a ocorrência.')
      return
    }
    setSalvando(true)
    setErroForm(null)
    const payload = {
      turma_id: form.turma_id,
      data: form.data,
      descricao: form.descricao.trim(),
      pontos_desconto: Number(form.pontos_desconto) || 0,
      responsavel: form.responsavel.trim() || null,
      ativo: form.ativo,
    }
    try {
      if (editando === 'nova') {
        const { error } = await supabase.from('conduta_ocorrencias').insert(payload)
        if (error) throw error
        notificar('Ocorrência registrada.')
      } else if (editando) {
        const { error } = await supabase.from('conduta_ocorrencias').update(payload).eq('id', editando.id)
        if (error) throw error
        notificar('Ocorrência atualizada.')
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
      const { error } = await supabase.from('conduta_ocorrencias').delete().eq('id', excluindo.id)
      if (error) throw error
      notificar('Ocorrência removida.')
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

  return (
    <>
      <PageHeader
        titulo="Conduta"
        descricao="Registre ocorrências e descontos. A conduta aparece à parte na classificação geral e desconta pontos na Taça."
        acoes={
          <Button onClick={() => abrir('nova')}>
            <Plus className="h-4 w-4" /> Nova ocorrência
          </Button>
        }
      />

      {totais.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {totais.map((t) => (
            <Badge key={t.rotulo} tom="ambar">
              {t.rotulo}: −{t.total.toLocaleString('pt-BR')} pts
            </Badge>
          ))}
        </div>
      ) : null}

      <Card>
        {base.data.ocorrencias.length === 0 ? (
          <EmptyState
            titulo="Nenhuma ocorrência"
            descricao="Registre cartões, ausências ou outras ocorrências quando existirem."
            icone={<ShieldAlert className="h-6 w-6" />}
            acao={<Button onClick={() => abrir('nova')}>Registrar ocorrência</Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Data</Th>
                <Th>Turma</Th>
                <Th>Descrição</Th>
                <Th>Desconto</Th>
                <Th>Responsável</Th>
                <Th>Situação</Th>
                <Th className="w-20 text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {base.data.ocorrencias.map((o) => (
                <tr key={o.id}>
                  <Td className="text-xs tabular-nums">{formatarData(o.data)}</Td>
                  <Td className="text-sm font-medium">{turmaRotulo(o.turmas)}</Td>
                  <Td className="max-w-[320px] text-xs text-slate-600">{o.descricao}</Td>
                  <Td className="tabular-nums text-sm">−{Number(o.pontos_desconto).toLocaleString('pt-BR')}</Td>
                  <Td className="text-xs">{o.responsavel || '—'}</Td>
                  <Td>
                    <Badge tom={o.ativo ? 'ambar' : 'cinza'}>{o.ativo ? 'Ativa' : 'Cancelada'}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => abrir(o)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label="Excluir" onClick={() => setExcluindo(o)}>
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
        titulo={editando === 'nova' ? 'Nova ocorrência' : 'Editar ocorrência'}
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
          <Field label="Turma" obrigatorio>
            <Select value={form.turma_id} onChange={(e) => setForm({ ...form, turma_id: e.target.value })}>
              <option value="">Selecione…</option>
              {base.data.turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.numero}
                  {t.nome_equipe ? ` · ${t.nome_equipe}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data">
            <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </Field>
          <Field label="Descrição" obrigatorio className="sm:col-span-2">
            <Textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex.: cartão vermelho na partida de futsal"
            />
          </Field>
          <Field label="Pontos de desconto">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.pontos_desconto}
              onChange={(e) => setForm({ ...form, pontos_desconto: e.target.value })}
            />
          </Field>
          <Field label="Responsável">
            <Input
              value={form.responsavel}
              onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
              placeholder="Quem registrou"
            />
          </Field>
          <div className="sm:col-span-2">
            <Checkbox
              label="Ocorrência ativa (conta nos descontos)"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
          </div>
        </div>

        {erroForm ? (
          <div className="mt-3">
            <Aviso tom="erro">{erroForm}</Aviso>
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={excluindo !== null}
        titulo="Excluir ocorrência"
        descricao="O desconto será removido da Taça. Prefira desativar a ocorrência se precisar manter o registro."
        confirmar="Excluir"
        loading={removendo}
        onConfirm={excluir}
        onClose={() => setExcluindo(null)}
      />
    </>
  )
}
