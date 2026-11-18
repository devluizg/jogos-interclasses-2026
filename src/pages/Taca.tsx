import { useEffect, useMemo, useState } from 'react'
import { Award, CheckCircle2, Eye, EyeOff, Plus, Save, Trash2, Users } from 'lucide-react'
import {
  Aviso,
  Badge,
  Button,
  Card,
  CardHeader,
  Carregando,
  Checkbox,
  ConfirmDialog,
  ErroBox,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
  useToast,
} from '@/components/ui'
import { ROTULO_CRITERIO } from '@/lib/constantes'
import { mensagemErro } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import type { ClassificacaoTaca, TacaCriterio, TacaJurado, TacaNota, Turma } from '@/lib/types'

type CriterioDraft = TacaCriterio & {
  pesoTexto: string
  minimoTexto: string
  maximoTexto: string
}

function paraDraft(c: TacaCriterio): CriterioDraft {
  return {
    ...c,
    pesoTexto: c.peso === null ? '' : String(c.peso),
    minimoTexto: String(c.escala_min),
    maximoTexto: String(c.escala_max),
  }
}

export default function Taca() {
  const { notificar } = useToast()

  const base = useAsync(async () => {
    const [criterios, jurados, turmas, configs, ranking] = await Promise.all([
      supabase.from('taca_criterios').select('*').order('ordem', { nullsFirst: false }),
      supabase.from('taca_jurados').select('*').order('nome'),
      supabase.from('turmas').select('*').eq('ativo', true).order('numero'),
      supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', ['taca_publicada', 'taca_normalizar', 'taca_fator_desconto_conduta', 'taca_observacao_pesos']),
      supabase.rpc('fn_classificacao_taca'),
    ])
    if (criterios.error) throw criterios.error
    if (jurados.error) throw jurados.error
    if (turmas.error) throw turmas.error
    if (configs.error) throw configs.error
    if (ranking.error) throw ranking.error

    const mapa = new Map((configs.data ?? []).map((c) => [c.chave, c.valor]))
    return {
      criterios: (criterios.data as TacaCriterio[]).map(paraDraft),
      jurados: jurados.data as TacaJurado[],
      turmas: turmas.data as Turma[],
      publicada: mapa.get('taca_publicada') === true,
      normalizar: mapa.get('taca_normalizar') === true,
      fator: Number(mapa.get('taca_fator_desconto_conduta') ?? 1),
      observacao: typeof mapa.get('taca_observacao_pesos') === 'string' ? (mapa.get('taca_observacao_pesos') as string) : '',
      ranking: (ranking.data ?? []) as ClassificacaoTaca[],
    }
  })

  const [drafts, setDrafts] = useState<CriterioDraft[]>([])
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  const [publicando, setPublicando] = useState(false)

  const [juradoId, setJuradoId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [notas, setNotas] = useState<Record<string, string>>({})
  const [notasOriginais, setNotasOriginais] = useState<Record<string, string>>({})
  const [carregandoNotas, setCarregandoNotas] = useState(false)
  const [salvandoNotas, setSalvandoNotas] = useState(false)

  const [novoJurado, setNovoJurado] = useState('')
  const [salvandoJurado, setSalvandoJurado] = useState(false)
  const [removendoJurado, setRemovendoJurado] = useState<TacaJurado | null>(null)
  const [excluindoJurado, setExcluindoJurado] = useState(false)

  useEffect(() => {
    if (base.data) setDrafts(base.data.criterios)
  }, [base.data])

  const qualitativos = useMemo(
    () => drafts.filter((c) => c.tipo === 'qualitativo' && c.ativo),
    [drafts],
  )

  const somaPesos = drafts
    .filter((c) => c.ativo && c.tipo !== 'desconto' && c.peso !== null)
    .reduce((soma, c) => soma + Number(c.peso), 0)

  const ranking = base.data?.ranking ?? []
  const formulaCompleta = ranking.length > 0 ? ranking[0].formula_completa : somaPesos === 100

  useEffect(() => {
    if (!juradoId || !turmaId) {
      setNotas({})
      setNotasOriginais({})
      return
    }
    let ativo = true
    setCarregandoNotas(true)
    supabase
      .from('taca_notas')
      .select('*')
      .eq('jurado_id', juradoId)
      .eq('turma_id', turmaId)
      .then(({ data, error }) => {
        if (!ativo) return
        if (error) {
          notificar(mensagemErro(error), 'erro')
          setCarregandoNotas(false)
          return
        }
        const mapa: Record<string, string> = {}
        for (const n of (data ?? []) as TacaNota[]) mapa[n.criterio_id] = String(n.nota)
        setNotas(mapa)
        setNotasOriginais(mapa)
        setCarregandoNotas(false)
      })
    return () => {
      ativo = false
    }
  }, [juradoId, turmaId, notificar])

  function atualizarDraft(id: string, campo: keyof CriterioDraft, valor: string | boolean | null) {
    setDrafts((atuais) => atuais.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)))
  }

  async function salvarCriterio(c: CriterioDraft) {
    setSalvandoId(c.id)
    try {
      const { error } = await supabase
        .from('taca_criterios')
        .update({
          peso: c.pesoTexto === '' ? null : Number(c.pesoTexto),
          escala_min: Number(c.minimoTexto) || 0,
          escala_max: Number(c.maximoTexto) || 10,
          ativo: c.ativo,
          a_definir: c.a_definir,
        })
        .eq('id', c.id)
      if (error) throw error
      notificar('Critério atualizado.')
      base.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setSalvandoId(null)
    }
  }

  async function alternarPublicacao() {
    if (!base.data) return
    setPublicando(true)
    try {
      const { error } = await supabase
        .from('configuracoes')
        .update({ valor: !base.data.publicada })
        .eq('chave', 'taca_publicada')
      if (error) throw error
      notificar(base.data.publicada ? 'Ranking da Taça ocultado.' : 'Ranking da Taça publicado.')
      base.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setPublicando(false)
    }
  }

  async function adicionarJurado() {
    if (!novoJurado.trim()) return
    setSalvandoJurado(true)
    try {
      const { error } = await supabase.from('taca_jurados').insert({ nome: novoJurado.trim() })
      if (error) throw error
      notificar('Jurado cadastrado.')
      setNovoJurado('')
      base.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setSalvandoJurado(false)
    }
  }

  async function alternarJurado(j: TacaJurado) {
    try {
      const { error } = await supabase.from('taca_jurados').update({ ativo: !j.ativo }).eq('id', j.id)
      if (error) throw error
      base.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    }
  }

  async function excluirJurado() {
    if (!removendoJurado) return
    setExcluindoJurado(true)
    try {
      const { error } = await supabase.from('taca_jurados').delete().eq('id', removendoJurado.id)
      if (error) throw error
      notificar('Jurado removido, junto com suas notas.')
      setRemovendoJurado(null)
      base.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setExcluindoJurado(false)
    }
  }

  async function salvarNotas() {
    if (!juradoId || !turmaId) return
    setSalvandoNotas(true)
    try {
      for (const c of qualitativos) {
        const valor = notas[c.id] ?? ''
        const original = notasOriginais[c.id] ?? ''
        if (valor === original) continue

        if (valor === '') {
          const { error } = await supabase
            .from('taca_notas')
            .delete()
            .eq('jurado_id', juradoId)
            .eq('turma_id', turmaId)
            .eq('criterio_id', c.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('taca_notas').upsert(
            {
              jurado_id: juradoId,
              turma_id: turmaId,
              criterio_id: c.id,
              nota: Number(valor),
            },
            { onConflict: 'jurado_id,turma_id,criterio_id' },
          )
          if (error) throw error
        }
      }
      notificar('Notas salvas.')
      setNotasOriginais(notas)
      base.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setSalvandoNotas(false)
    }
  }

  if (base.loading) return <Carregando />
  if (base.error) return <ErroBox mensagem={base.error} onRetry={base.reload} />
  if (!base.data) return null

  const { publicada, jurados, turmas, observacao } = base.data

  return (
    <>
      <PageHeader
        titulo="Taça Turma Protagonista"
        descricao="Pesos, escalas e notas são configuráveis. O ranking só aparece no portal quando publicado."
        acoes={
          <Button
            variant={publicada ? 'outline' : 'primary'}
            onClick={alternarPublicacao}
            loading={publicando}
          >
            {publicada ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {publicada ? 'Ocultar do site' : 'Publicar no site'}
          </Button>
        }
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            titulo="Critérios e pesos"
            descricao="O desempenho esportivo usa a pontuação oficial. Os qualitativos usam a média dos jurados."
            acoes={
              <Badge tom={formulaCompleta ? 'verde' : 'ambar'}>
                Soma dos pesos: {somaPesos.toLocaleString('pt-BR')}%
              </Badge>
            }
          />
          <Table>
            <thead>
              <tr>
                <Th>Critério</Th>
                <Th>Peso</Th>
                <Th>Escala</Th>
                <Th>Ativo</Th>
                <Th className="w-20 text-right">Salvar</Th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <p className="text-sm font-medium text-slate-800">
                      {ROTULO_CRITERIO[c.chave] ?? c.nome}
                    </p>
                    <p className="text-[11px] text-slate-500">{c.tipo}</p>
                  </Td>
                  <Td>
                    <Input
                      className="h-8 w-20"
                      type="number"
                      min={0}
                      step="0.01"
                      value={c.pesoTexto}
                      disabled={c.tipo === 'desconto'}
                      onChange={(e) => atualizarDraft(c.id, 'pesoTexto', e.target.value)}
                    />
                  </Td>
                  <Td>
                    {c.tipo === 'qualitativo' ? (
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-8 w-16"
                          type="number"
                          step="0.01"
                          value={c.minimoTexto}
                          onChange={(e) => atualizarDraft(c.id, 'minimoTexto', e.target.value)}
                        />
                        <span className="text-xs text-slate-400">a</span>
                        <Input
                          className="h-8 w-16"
                          type="number"
                          step="0.01"
                          value={c.maximoTexto}
                          onChange={(e) => atualizarDraft(c.id, 'maximoTexto', e.target.value)}
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <Checkbox
                        label="Ativo"
                        checked={c.ativo}
                        onChange={(e) => atualizarDraft(c.id, 'ativo', e.target.checked)}
                      />
                      <Checkbox
                        label="A definir"
                        checked={c.a_definir}
                        onChange={(e) => atualizarDraft(c.id, 'a_definir', e.target.checked)}
                      />
                    </div>
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Salvar critério"
                      loading={salvandoId === c.id}
                      onClick={() => void salvarCriterio(c)}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {observacao ? (
            <div className="border-t border-slate-100 p-4">
              <Aviso tom="info">{observacao}</Aviso>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader titulo="Jurados" descricao="As notas são a média simples de todos os jurados." />
          <div className="space-y-3 p-4">
            <div className="flex gap-2">
              <Input
                value={novoJurado}
                onChange={(e) => setNovoJurado(e.target.value)}
                placeholder="Nome do jurado"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void adicionarJurado()
                }}
              />
              <Button onClick={adicionarJurado} loading={salvandoJurado} aria-label="Adicionar jurado">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {jurados.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum jurado cadastrado.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {jurados.map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span className={j.ativo ? 'text-sm text-slate-800' : 'text-sm text-slate-400 line-through'}>
                        {j.nome}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => void alternarJurado(j)}>
                        {j.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button variant="ghost" size="sm" aria-label="Excluir" onClick={() => setRemovendoJurado(j)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader
          titulo="Lançar notas"
          descricao="Selecione o jurado e a turma. Deixe em branco para remover a nota."
          acoes={
            <Button onClick={salvarNotas} loading={salvandoNotas} disabled={!juradoId || !turmaId}>
              Salvar notas
            </Button>
          }
        />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Jurado">
            <Select value={juradoId} onChange={(e) => setJuradoId(e.target.value)}>
              <option value="">Selecione…</option>
              {jurados
                .filter((j) => j.ativo)
                .map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nome}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Turma">
            <Select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
              <option value="">Selecione…</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.numero}
                  {t.nome_equipe ? ` · ${t.nome_equipe}` : ''}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="border-t border-slate-100 p-4">
          {carregandoNotas ? (
            <Carregando texto="Carregando notas…" />
          ) : !juradoId || !turmaId ? (
            <p className="text-xs text-slate-500">Selecione jurado e turma para lançar as notas.</p>
          ) : qualitativos.length === 0 ? (
            <Aviso tom="atencao">
              Nenhum critério qualitativo ativo. Ative um critério na tabela acima para lançar notas.
            </Aviso>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {qualitativos.map((c) => (
                <Field
                  key={c.id}
                  label={ROTULO_CRITERIO[c.chave] ?? c.nome}
                  hint={`Escala ${c.minimoTexto} a ${c.maximoTexto}`}
                >
                  <Input
                    type="number"
                    min={Number(c.minimoTexto)}
                    max={Number(c.maximoTexto)}
                    step="0.01"
                    value={notas[c.id] ?? ''}
                    onChange={(e) => setNotas({ ...notas, [c.id]: e.target.value })}
                    placeholder="—"
                  />
                </Field>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          titulo="Ranking da Taça"
          descricao="Prévia calculada com os dados atuais."
          acoes={
            <Badge tom={publicada ? 'verde' : 'ambar'}>
              {publicada ? 'Publicado no site' : 'Não publicado'}
            </Badge>
          }
        />
        {ranking.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Sem dados para calcular o ranking.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Turma</Th>
                <Th>Desempenho</Th>
                <Th>Qualitativos</Th>
                <Th>Conduta</Th>
                <Th>Final</Th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r) => (
                <tr key={r.turma_id}>
                  <Td className="tabular-nums font-semibold">{r.posicao}º</Td>
                  <Td>
                    <span className="font-medium">{r.numero}</span>
                    {r.nome_equipe ? <span className="ml-1 text-xs text-slate-500">{r.nome_equipe}</span> : null}
                    {r.empate_persistente ? (
                      <Badge tom="ambar" className="ml-2">
                        empate
                      </Badge>
                    ) : null}
                  </Td>
                  <Td className="tabular-nums text-xs">{Number(r.desempenho_pontos).toLocaleString('pt-BR')}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(r.qualitativos ?? {}).map(([chave, valor]) => (
                        <Badge key={chave} tom="azul">
                          {ROTULO_CRITERIO[chave] ?? chave}: {Number(valor).toLocaleString('pt-BR')}
                        </Badge>
                      ))}
                      {Object.keys(r.qualitativos ?? {}).length === 0 ? '—' : null}
                    </div>
                  </Td>
                  <Td className="tabular-nums text-xs text-red-700">
                    {Number(r.conduta_pontos) > 0 ? `−${Number(r.conduta_pontos).toLocaleString('pt-BR')}` : '0'}
                  </Td>
                  <Td className="text-sm font-semibold tabular-nums">
                    {Number(r.pontuacao_final).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {!formulaCompleta ? (
          <div className="border-t border-slate-100 p-4">
            <Aviso tom="atencao" titulo="Pesos não somam 100%">
              Ajuste os pesos dos critérios ativos. O cálculo continua funcionando, mas o resultado fica
              fora da escala prevista.
            </Aviso>
          </div>
        ) : null}
        {ranking.some((r) => r.empate_persistente) ? (
          <div className="border-t border-slate-100 p-4">
            <Aviso tom="info">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Há empates persistentes após todos os critérios
                configurados. O site sinaliza o empate em vez de inventar um desempate.
              </span>
            </Aviso>
          </div>
        ) : null}
      </Card>

      <ConfirmDialog
        open={removendoJurado !== null}
        titulo="Excluir jurado"
        descricao={
          <>
            Excluir <strong>{removendoJurado?.nome}</strong>? Todas as notas lançadas por ele serão
            removidas.
          </>
        }
        confirmar="Excluir jurado"
        loading={excluindoJurado}
        onConfirm={excluirJurado}
        onClose={() => setRemovendoJurado(null)}
      />
      <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
        <Award className="h-3.5 w-3.5" /> Normalização do desempenho:{' '}
        {base.data.normalizar ? 'ativa' : 'desativada'} · Fator de conduta: {base.data.fator}
      </div>
    </>
  )
}
