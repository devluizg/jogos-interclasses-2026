import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { History, Medal, Plus, ShieldCheck, Trash2 } from 'lucide-react'
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
import { formatarDataHora, turmaRotulo } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import type {
  CategoriaComModalidade,
  HistoricoResultado,
  Resultado,
  StatusResultado,
  Turma,
} from '@/lib/types'

type ResultadoComTurma = Resultado & { turmas: { numero: number; nome_equipe: string | null } | null }

function BadgeResultado({ status }: { status: StatusResultado }) {
  const tom = { rascunho: 'ambar', oficial: 'verde', anulado: 'cinza' }[status] as
    | 'ambar'
    | 'verde'
    | 'cinza'
  const rotulo = { rascunho: 'Rascunho', oficial: 'Oficial', anulado: 'Anulado' }[status]
  return <Badge tom={tom}>{rotulo}</Badge>
}

export default function Resultados() {
  const { notificar } = useToast()
  const [params, setParams] = useSearchParams()

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

  const categorias = aux.data?.categorias ?? []
  const turmas = aux.data?.turmas ?? []

  const categoriaId = params.get('categoria') ?? ''
  const categoria = categorias.find((c) => c.id === categoriaId)

  useEffect(() => {
    if (!categoriaId && categorias.length > 0) {
      const novos = new URLSearchParams(params)
      novos.set('categoria', categorias[0].id)
      setParams(novos, { replace: true })
    }
  }, [categoriaId, categorias, params, setParams])

  const lista = useAsync(async () => {
    if (!categoriaId) return [] as ResultadoComTurma[]
    const { data, error } = await supabase
      .from('resultados')
      .select('*, turmas(numero, nome_equipe)')
      .eq('modalidade_categoria_id', categoriaId)
      .order('colocacao')
    if (error) throw error
    return data as ResultadoComTurma[]
  }, [categoriaId])

  const grupos = useMemo(() => {
    const mapa = new Map<string, { nome: string; itens: CategoriaComModalidade[] }>()
    for (const c of categorias) {
      const chave = c.modalidades?.id ?? 'outros'
      const grupo = mapa.get(chave) ?? { nome: c.modalidades?.nome ?? 'Outros', itens: [] }
      grupo.itens.push(c)
      mapa.set(chave, grupo)
    }
    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [categorias])

  const resultados = lista.data ?? []

  const [adicionando, setAdicionando] = useState(false)
  const [novo, setNovo] = useState({ turma_id: '', colocacao: '1', observacao: '' })
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  const [corrigindo, setCorrigindo] = useState<ResultadoComTurma | null>(null)
  const [formCorrecao, setFormCorrecao] = useState({ colocacao: '1', observacao: '', confirmo: false })
  const [salvandoCorrecao, setSalvandoCorrecao] = useState(false)

  const [anulando, setAnulando] = useState<ResultadoComTurma | null>(null)
  const [motivo, setMotivo] = useState('')
  const [anulandoLoading, setAnulandoLoading] = useState(false)

  const [publicandoId, setPublicandoId] = useState<string | null>(null)
  const [historico, setHistorico] = useState<{ resultado: ResultadoComTurma; itens: HistoricoResultado[] } | null>(
    null,
  )
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  const [excluindo, setExcluindo] = useState<ResultadoComTurma | null>(null)
  const [removendo, setRemovendo] = useState(false)

  function abrirNovo() {
    const proxima = Math.min(
      (categoria?.vagas_premiadas ?? 3) || 3,
      resultados.length + 1,
    )
    setNovo({ turma_id: '', colocacao: String(proxima), observacao: '' })
    setErroForm(null)
    setAdicionando(true)
  }

  async function adicionar() {
    if (!categoriaId || !novo.turma_id) {
      setErroForm('Selecione a turma.')
      return
    }
    setSalvando(true)
    setErroForm(null)
    try {
      const { error } = await supabase.from('resultados').insert({
        modalidade_categoria_id: categoriaId,
        turma_id: novo.turma_id,
        colocacao: Number(novo.colocacao),
        observacao: novo.observacao.trim() || null,
        status: 'rascunho',
      })
      if (error) throw error
      notificar('Resultado salvo como rascunho.')
      setAdicionando(false)
      lista.reload()
    } catch (e) {
      setErroForm(mensagemErro(e))
    } finally {
      setSalvando(false)
    }
  }

  async function publicar(r: ResultadoComTurma) {
    setPublicandoId(r.id)
    try {
      const { error } = await supabase.rpc('fn_publicar_resultado', { p_resultado_id: r.id })
      if (error) throw error
      notificar('Resultado publicado no site.')
      lista.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setPublicandoId(null)
    }
  }

  function abrirCorrecao(r: ResultadoComTurma) {
    setFormCorrecao({
      colocacao: String(r.colocacao),
      observacao: r.observacao ?? '',
      confirmo: false,
    })
    setCorrigindo(r)
  }

  async function salvarCorrecao() {
    if (!corrigindo) return
    if (!formCorrecao.confirmo) {
      notificar('Marque a confirmação para alterar um resultado oficial.', 'erro')
      return
    }
    setSalvandoCorrecao(true)
    try {
      const { error } = await supabase.rpc('fn_corrigir_resultado', {
        p_resultado_id: corrigindo.id,
        p_colocacao: Number(formCorrecao.colocacao),
        p_observacao: formCorrecao.observacao.trim() || null,
      })
      if (error) throw error
      notificar('Resultado corrigido. O histórico foi registrado.')
      setCorrigindo(null)
      lista.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setSalvandoCorrecao(false)
    }
  }

  function abrirAnulacao(r: ResultadoComTurma) {
    setMotivo('')
    setAnulando(r)
  }

  async function confirmarAnulacao() {
    if (!anulando) return
    setAnulandoLoading(true)
    try {
      const { error } = await supabase.rpc('fn_anular_resultado', {
        p_resultado_id: anulando.id,
        p_observacao: motivo.trim() || null,
      })
      if (error) throw error
      notificar('Resultado anulado. O ranking público foi recalculado.')
      setAnulando(null)
      lista.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setAnulandoLoading(false)
    }
  }

  async function verHistorico(r: ResultadoComTurma) {
    setCarregandoHistorico(true)
    setHistorico({ resultado: r, itens: [] })
    try {
      const { data, error } = await supabase
        .from('resultados_historico')
        .select('*')
        .eq('resultado_id', r.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setHistorico({ resultado: r, itens: data as HistoricoResultado[] })
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
      setHistorico(null)
    } finally {
      setCarregandoHistorico(false)
    }
  }

  async function excluir() {
    if (!excluindo) return
    setRemovendo(true)
    try {
      const { error } = await supabase.from('resultados').delete().eq('id', excluindo.id)
      if (error) throw error
      notificar('Rascunho excluído.')
      setExcluindo(null)
      lista.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setRemovendo(false)
    }
  }

  const totalOficiais = resultados.filter((r) => r.status === 'oficial').length

  return (
    <>
      <PageHeader
        titulo="Resultados oficiais"
        descricao="Rascunhos não aparecem no portal. Publicar congela o resultado no ranking; correções geram histórico."
        acoes={
          <Button onClick={abrirNovo} disabled={!categoriaId}>
            <Plus className="h-4 w-4" /> Novo resultado
          </Button>
        }
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-auto min-w-[300px]"
            value={categoriaId}
            onChange={(e) => {
              const novos = new URLSearchParams(params)
              novos.set('categoria', e.target.value)
              setParams(novos, { replace: true })
            }}
            aria-label="Categoria"
          >
            {grupos.map((g) => (
              <optgroup key={g.nome} label={g.nome}>
                {g.itens.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                    {c.vagas_premiadas ? ` · ${c.vagas_premiadas} vagas` : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          {categoria ? (
            <Badge tom={totalOficiais > 0 ? 'verde' : 'cinza'}>
              {totalOficiais} oficial(is) de {categoria.vagas_premiadas ?? '—'} vaga(s)
            </Badge>
          ) : null}
          <span className="ml-auto text-xs text-slate-500">{resultados.length} registro(s)</span>
        </div>
      </Card>

      {aux.loading || lista.loading ? (
        <Carregando />
      ) : aux.error || lista.error ? (
        <ErroBox mensagem={aux.error ?? lista.error ?? ''} onRetry={lista.reload} />
      ) : (
        <Card>
          {resultados.length === 0 ? (
            <EmptyState
              titulo="Nenhum resultado nesta categoria"
              descricao="Lance a colocação das turmas. Você pode salvar como rascunho e publicar depois."
              icone={<Medal className="h-6 w-6" />}
              acao={<Button onClick={abrirNovo}>Lançar resultado</Button>}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Colocação</Th>
                  <Th>Turma</Th>
                  <Th>Status</Th>
                  <Th>Observação</Th>
                  <Th>Atualizado</Th>
                  <Th className="w-52 text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums text-slate-900">
                        {r.colocacao <= 3 ? (
                          <Medal
                            className={
                              r.colocacao === 1
                                ? 'h-4 w-4 text-amber-500'
                                : r.colocacao === 2
                                  ? 'h-4 w-4 text-slate-400'
                                  : 'h-4 w-4 text-amber-700'
                            }
                          />
                        ) : null}
                        {r.colocacao}º
                      </span>
                    </Td>
                    <Td className="text-sm">{turmaRotulo(r.turmas)}</Td>
                    <Td>
                      <BadgeResultado status={r.status} />
                    </Td>
                    <Td className="max-w-[240px] text-xs text-slate-600">
                      <span className="line-clamp-2">{r.observacao || '—'}</span>
                    </Td>
                    <Td className="text-[11px] text-slate-500">{formatarDataHora(r.updated_at)}</Td>
                    <Td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {r.status === 'rascunho' ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => void publicar(r)}
                              loading={publicandoId === r.id}
                            >
                              <ShieldCheck className="h-4 w-4" /> Publicar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Excluir rascunho"
                              onClick={() => setExcluindo(r)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        ) : null}
                        {r.status === 'oficial' ? (
                          <Button variant="outline" size="sm" onClick={() => abrirCorrecao(r)}>
                            Corrigir
                          </Button>
                        ) : null}
                        {r.status === 'oficial' ? (
                          <Button variant="ghost" size="sm" onClick={() => abrirAnulacao(r)}>
                            Anular
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" aria-label="Histórico" onClick={() => void verHistorico(r)}>
                          <History className="h-4 w-4" />
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
        open={adicionando}
        onClose={() => setAdicionando(false)}
        titulo="Novo resultado"
        descricao={
          categoria
            ? `${categoria.modalidades?.nome ?? ''} · ${categoria.nome} · até ${categoria.vagas_premiadas ?? '—'} colocação(ões) premiada(s)`
            : ''
        }
        rodape={
          <>
            <Button variant="outline" onClick={() => setAdicionando(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={adicionar} loading={salvando}>
              Salvar rascunho
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Turma" obrigatorio className="sm:col-span-2">
            <Select value={novo.turma_id} onChange={(e) => setNovo({ ...novo, turma_id: e.target.value })}>
              <option value="">Selecione…</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.numero}
                  {t.nome_equipe ? ` · ${t.nome_equipe}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Colocação" obrigatorio>
            <Input
              type="number"
              min={1}
              value={novo.colocacao}
              onChange={(e) => setNovo({ ...novo, colocacao: e.target.value })}
            />
          </Field>
          <Field label="Observação" className="sm:col-span-2">
            <Textarea
              value={novo.observacao}
              onChange={(e) => setNovo({ ...novo, observacao: e.target.value })}
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

      <Dialog
        open={corrigindo !== null}
        onClose={() => setCorrigindo(null)}
        titulo="Corrigir resultado oficial"
        descricao="A alteração fica registrada no histórico com usuário e data."
        largura="sm"
        rodape={
          <>
            <Button variant="outline" onClick={() => setCorrigindo(null)} disabled={salvandoCorrecao}>
              Cancelar
            </Button>
            <Button onClick={salvarCorrecao} loading={salvandoCorrecao} disabled={!formCorrecao.confirmo}>
              Confirmar correção
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Aviso tom="atencao">
            Você está alterando um resultado <strong>oficial</strong> de {turmaRotulo(corrigindo?.turmas)}.
          </Aviso>
          <Field label="Nova colocação" obrigatorio>
            <Input
              type="number"
              min={1}
              value={formCorrecao.colocacao}
              onChange={(e) => setFormCorrecao({ ...formCorrecao, colocacao: e.target.value })}
            />
          </Field>
          <Field label="Motivo / observação">
            <Textarea
              value={formCorrecao.observacao}
              onChange={(e) => setFormCorrecao({ ...formCorrecao, observacao: e.target.value })}
            />
          </Field>
          <Checkbox
            label="Confirmo que desejo alterar este resultado oficial."
            checked={formCorrecao.confirmo}
            onChange={(e) => setFormCorrecao({ ...formCorrecao, confirmo: e.target.checked })}
          />
        </div>
      </Dialog>

      <Dialog
        open={anulando !== null}
        onClose={() => setAnulando(null)}
        titulo="Anular resultado"
        largura="sm"
        rodape={
          <>
            <Button variant="outline" onClick={() => setAnulando(null)} disabled={anulandoLoading}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarAnulacao} loading={anulandoLoading}>
              Anular resultado
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            O resultado de <strong>{turmaRotulo(anulando?.turmas)}</strong> deixará de contar no
            ranking. O registro é mantido para auditoria.
          </p>
          <Field label="Motivo">
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={historico !== null}
        onClose={() => setHistorico(null)}
        titulo="Histórico do resultado"
        descricao={historico ? turmaRotulo(historico.resultado.turmas) : ''}
        largura="lg"
      >
        {carregandoHistorico ? (
          <Carregando />
        ) : (historico?.itens.length ?? 0) === 0 ? (
          <Aviso tom="info">Nenhuma alteração registrada para este resultado.</Aviso>
        ) : (
          <div className="space-y-2">
            {historico?.itens.map((h) => (
              <div key={h.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tom="azul">{h.acao}</Badge>
                  <span className="text-[11px] text-slate-500">{formatarDataHora(h.created_at)}</span>
                </div>
                <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-2">
                  <div>
                    <p className="font-medium text-slate-500">Antes</p>
                    <pre className="mt-1 overflow-x-auto rounded bg-slate-50 p-2 text-slate-700">
                      {JSON.stringify(h.dados_anteriores, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="font-medium text-slate-500">Depois</p>
                    <pre className="mt-1 overflow-x-auto rounded bg-slate-50 p-2 text-slate-700">
                      {JSON.stringify(h.dados_novos, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={excluindo !== null}
        titulo="Excluir rascunho"
        descricao="Somente rascunhos podem ser excluídos. Resultados oficiais devem ser anulados para manter o histórico."
        confirmar="Excluir"
        loading={removendo}
        onConfirm={excluir}
        onClose={() => setExcluindo(null)}
      />
    </>
  )
}
