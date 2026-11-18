import { useState } from 'react'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
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
  Table,
  Td,
  Th,
  useToast,
} from '@/components/ui'
import { mensagemErro } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { numero } from '@/lib/format'
import type { Turma } from '@/lib/types'

type Formulario = {
  numero: string
  nome_equipe: string
  cor: string
  escudo_url: string
  representante1: string
  representante2: string
  ativo: boolean
  ordem: string
}

const VAZIO: Formulario = {
  numero: '',
  nome_equipe: '',
  cor: '',
  escudo_url: '',
  representante1: '',
  representante2: '',
  ativo: true,
  ordem: '',
}

export default function Turmas() {
  const { notificar } = useToast()
  const { data, loading, error, reload } = useAsync(async () => {
    const { data, error } = await supabase.from('turmas').select('*').order('numero')
    if (error) throw error
    return data as Turma[]
  })

  const [editando, setEditando] = useState<Turma | 'nova' | null>(null)
  const [form, setForm] = useState<Formulario>(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState<Turma | null>(null)
  const [removendo, setRemovendo] = useState(false)

  function abrir(turma: Turma | 'nova') {
    setErroForm(null)
    if (turma === 'nova') {
      setForm(VAZIO)
      setEditando('nova')
      return
    }
    setForm({
      numero: String(turma.numero),
      nome_equipe: turma.nome_equipe ?? '',
      cor: turma.cor ?? '',
      escudo_url: turma.escudo_url ?? '',
      representante1: turma.representante1 ?? '',
      representante2: turma.representante2 ?? '',
      ativo: turma.ativo,
      ordem: turma.ordem === null ? '' : String(turma.ordem),
    })
    setEditando(turma)
  }

  async function salvar() {
    const n = numero(form.numero)
    if (!n || n < 100 || n > 999) {
      setErroForm('Informe um número de turma entre 100 e 999.')
      return
    }
    setSalvando(true)
    setErroForm(null)
    const payload = {
      numero: n,
      nome_equipe: form.nome_equipe.trim() || null,
      cor: form.cor.trim() || null,
      escudo_url: form.escudo_url.trim() || null,
      representante1: form.representante1.trim() || null,
      representante2: form.representante2.trim() || null,
      ativo: form.ativo,
      ordem: numero(form.ordem),
    }
    try {
      if (editando === 'nova') {
        const { error } = await supabase.from('turmas').insert(payload)
        if (error) throw error
        notificar('Turma cadastrada.')
      } else if (editando) {
        const { error } = await supabase.from('turmas').update(payload).eq('id', editando.id)
        if (error) throw error
        notificar('Turma atualizada.')
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
      const { error } = await supabase.from('turmas').delete().eq('id', excluindo.id)
      if (error) throw error
      notificar('Turma removida.')
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
        titulo="Turmas"
        descricao="As 10 turmas participantes. Os representantes ficam visíveis apenas para a organização."
        acoes={
          <Button onClick={() => abrir('nova')}>
            <Plus className="h-4 w-4" /> Nova turma
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
              titulo="Nenhuma turma cadastrada"
              descricao="Cadastre as turmas participantes para começar."
              icone={<Users className="h-6 w-6" />}
              acao={<Button onClick={() => abrir('nova')}>Cadastrar turma</Button>}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Turma</Th>
                  <Th>Equipe / cor</Th>
                  <Th>Representantes</Th>
                  <Th>Situação</Th>
                  <Th className="w-24 text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((t) => (
                  <tr key={t.id}>
                    <Td>
                      <span className="font-semibold tabular-nums text-slate-900">{t.numero}</span>
                      <span className="ml-2 text-xs text-slate-400">{t.ano}º ano</span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        {t.cor ? (
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-slate-300"
                            style={{ backgroundColor: t.cor }}
                          />
                        ) : null}
                        <span>{t.nome_equipe || 'Sem nome de equipe'}</span>
                      </div>
                    </Td>
                    <Td>
                      <span className="text-xs text-slate-600">
                        {[t.representante1, t.representante2].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </Td>
                    <Td>
                      <Badge tom={t.ativo ? 'verde' : 'cinza'}>{t.ativo ? 'Ativa' : 'Inativa'}</Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" aria-label={`Editar turma ${t.numero}`} onClick={() => abrir(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Excluir turma ${t.numero}`}
                          onClick={() => setExcluindo(t)}
                        >
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
        titulo={editando === 'nova' ? 'Nova turma' : editando ? `Editar turma ${editando.numero}` : 'Turma'}
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
          <Field label="Número da turma" obrigatorio hint="Entre 100 e 999. O ano é calculado automaticamente.">
            <Input
              type="number"
              min={100}
              max={999}
              value={form.numero}
              onChange={(e) => setForm({ ...form, numero: e.target.value })}
            />
          </Field>
          <Field label="Ordem de exibição" hint="Opcional. Menor aparece primeiro.">
            <Input
              type="number"
              value={form.ordem}
              onChange={(e) => setForm({ ...form, ordem: e.target.value })}
            />
          </Field>
          <Field label="Nome da equipe">
            <Input
              value={form.nome_equipe}
              onChange={(e) => setForm({ ...form, nome_equipe: e.target.value })}
              placeholder="Ex.: Águias"
            />
          </Field>
          <Field label="Cor" hint="Nome ou código hexadecimal (ex.: #16a34a).">
            <div className="flex gap-2">
              <Input value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} placeholder="#16a34a" />
              <input
                type="color"
                aria-label="Selecionar cor"
                className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                value={/^#[0-9a-fA-F]{6}$/.test(form.cor) ? form.cor : '#16a34a'}
                onChange={(e) => setForm({ ...form, cor: e.target.value })}
              />
            </div>
          </Field>
          <Field label="URL do escudo" className="sm:col-span-2" hint="Deixe em branco até o arquivo ser enviado.">
            <Input
              value={form.escudo_url}
              onChange={(e) => setForm({ ...form, escudo_url: e.target.value })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Representante 1">
            <Input
              value={form.representante1}
              onChange={(e) => setForm({ ...form, representante1: e.target.value })}
            />
          </Field>
          <Field label="Representante 2">
            <Input
              value={form.representante2}
              onChange={(e) => setForm({ ...form, representante2: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Checkbox
              label="Turma ativa (aparece no site e nas classificações)"
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
        titulo="Excluir turma"
        descricao={
          <>
            Remover a turma <strong>{excluindo?.numero}</strong>? Turmas com estudantes, inscrições ou
            resultados vinculados não podem ser excluídas — desative-a em vez disso.
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
