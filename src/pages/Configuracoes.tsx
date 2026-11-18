import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Info, Plus, Save, Trash2 } from 'lucide-react'
import {
  Aviso,
  Badge,
  Button,
  Card,
  CardHeader,
  Carregando,
  Checkbox,
  ErroBox,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Textarea,
  Th,
  useToast,
} from '@/components/ui'
import { CRITERIOS, ROTULO_CRITERIO } from '@/lib/constantes'
import { mensagemErro } from '@/lib/errors'
import { formatarDataHora } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import type { Configuracao, CriterioDesempate, Pontuacao } from '@/lib/types'

type Escopo = 'classificacao_geral' | 'taca'

const ROTULO_ESCOPO: Record<Escopo, string> = {
  classificacao_geral: 'Classificação geral',
  taca: 'Taça Turma Protagonista',
}

function valorParaTexto(valor: unknown): string {
  if (typeof valor === 'string') return valor
  if (valor === null || valor === undefined) return ''
  if (typeof valor === 'boolean' || typeof valor === 'number') return String(valor)
  return JSON.stringify(valor, null, 2)
}

export default function Configuracoes() {
  const { notificar } = useToast()

  const base = useAsync(async () => {
    const [configs, pontos, desempates] = await Promise.all([
      supabase.from('configuracoes').select('*').order('chave'),
      supabase.from('pontuacao_colocacao').select('*').order('colocacao'),
      supabase.from('criterios_desempate').select('*').order('escopo').order('ordem'),
    ])
    if (configs.error) throw configs.error
    if (pontos.error) throw pontos.error
    if (desempates.error) throw desempates.error
    return {
      configs: configs.data as Configuracao[],
      pontos: pontos.data as Pontuacao[],
      desempates: desempates.data as CriterioDesempate[],
    }
  })

  const [valores, setValores] = useState<Record<string, string>>({})
  const [salvandoChave, setSalvandoChave] = useState<string | null>(null)

  const [pontosDraft, setPontosDraft] = useState<Record<number, { pontos: string; ativo: boolean }>>({})
  const [salvandoPontos, setSalvandoPontos] = useState(false)

  const [ordens, setOrdens] = useState<Record<Escopo, string[]>>({
    classificacao_geral: [],
    taca: [],
  })
  const [salvandoOrdem, setSalvandoOrdem] = useState<Escopo | null>(null)

  useEffect(() => {
    if (!base.data) return
    const mapa: Record<string, string> = {}
    for (const c of base.data.configs) mapa[c.chave] = valorParaTexto(c.valor)
    setValores(mapa)

    const p: Record<number, { pontos: string; ativo: boolean }> = {}
    for (const item of base.data.pontos) p[item.colocacao] = { pontos: String(item.pontos), ativo: item.ativo }
    setPontosDraft(p)

    const ordensIniciais: Record<Escopo, string[]> = { classificacao_geral: [], taca: [] }
    for (const d of base.data.desempates) ordensIniciais[d.escopo].push(d.criterio)
    setOrdens(ordensIniciais)
  }, [base.data])

  const divergencias = useMemo(() => {
    const c = base.data?.configs.find((x) => x.chave === 'divergencias_documentos')
    if (!c || !Array.isArray(c.valor)) return []
    return c.valor as { tema: string; resolucao: string }[]
  }, [base.data])

  async function salvarConfig(c: Configuracao) {
    setSalvandoChave(c.chave)
    try {
      const bruto = valores[c.chave] ?? ''
      let valor: unknown
      if (typeof c.valor === 'boolean') valor = bruto === 'true'
      else if (typeof c.valor === 'number') valor = Number(bruto)
      else if (typeof c.valor === 'string') valor = bruto
      else valor = JSON.parse(bruto)

      const { error } = await supabase.from('configuracoes').update({ valor }).eq('chave', c.chave)
      if (error) throw error
      notificar('Configuração salva.')
      base.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setSalvandoChave(null)
    }
  }

  async function salvarPontuacao() {
    setSalvandoPontos(true)
    try {
      for (const item of base.data?.pontos ?? []) {
        const draft = pontosDraft[item.colocacao]
        if (!draft) continue
        if (Number(draft.pontos) === Number(item.pontos) && draft.ativo === item.ativo) continue
        const { error } = await supabase
          .from('pontuacao_colocacao')
          .update({ pontos: Number(draft.pontos), ativo: draft.ativo })
          .eq('colocacao', item.colocacao)
        if (error) throw error
      }
      notificar('Pontuação atualizada. As classificações recalculam automaticamente.')
      base.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setSalvandoPontos(false)
    }
  }

  function mover(escopo: Escopo, indice: number, direcao: -1 | 1) {
    setOrdens((atuais) => {
      const lista = [...atuais[escopo]]
      const alvo = indice + direcao
      if (alvo < 0 || alvo >= lista.length) return atuais
      ;[lista[indice], lista[alvo]] = [lista[alvo], lista[indice]]
      return { ...atuais, [escopo]: lista }
    })
  }

  function adicionarCriterio(escopo: Escopo, criterio: string) {
    if (!criterio) return
    setOrdens((atuais) => ({ ...atuais, [escopo]: [...atuais[escopo], criterio] }))
  }

  function removerCriterio(escopo: Escopo, indice: number) {
    setOrdens((atuais) => ({
      ...atuais,
      [escopo]: atuais[escopo].filter((_, i) => i !== indice),
    }))
  }

  async function salvarOrdem(escopo: Escopo) {
    if (ordens[escopo].length === 0) {
      notificar('Adicione ao menos um critério.', 'erro')
      return
    }
    setSalvandoOrdem(escopo)
    try {
      const { error } = await supabase.rpc('fn_definir_desempate', {
        p_escopo: escopo,
        p_criterios: ordens[escopo],
      })
      if (error) throw error
      notificar('Ordem de desempate salva.')
      base.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setSalvandoOrdem(null)
    }
  }

  if (base.loading) return <Carregando />
  if (base.error) return <ErroBox mensagem={base.error} onRetry={base.reload} />
  if (!base.data) return null

  return (
    <>
      <PageHeader
        titulo="Configurações"
        descricao="Pontuação, desempates e parâmetros do evento. Tudo que muda o site está aqui — sem editar código."
      />

      <Card className="mb-4">
        <CardHeader
          titulo="Pontuação por colocação"
          descricao="Vale para todas as modalidades. Alterar recalcula a classificação e a Taça."
          acoes={
            <Button onClick={salvarPontuacao} loading={salvandoPontos}>
              <Save className="h-4 w-4" /> Salvar pontuação
            </Button>
          }
        />
        <Table>
          <thead>
            <tr>
              <Th>Colocação</Th>
              <Th>Pontos</Th>
              <Th>Ativa</Th>
            </tr>
          </thead>
          <tbody>
            {base.data.pontos.map((p) => (
              <tr key={p.colocacao}>
                <Td className="font-medium tabular-nums">{p.colocacao}º</Td>
                <Td>
                  <Input
                    className="h-8 w-28"
                    type="number"
                    min={0}
                    step="0.01"
                    value={pontosDraft[p.colocacao]?.pontos ?? ''}
                    onChange={(e) =>
                      setPontosDraft({
                        ...pontosDraft,
                        [p.colocacao]: {
                          pontos: e.target.value,
                          ativo: pontosDraft[p.colocacao]?.ativo ?? true,
                        },
                      })
                    }
                  />
                </Td>
                <Td>
                  <Checkbox
                    label=""
                    checked={pontosDraft[p.colocacao]?.ativo ?? true}
                    onChange={(e) =>
                      setPontosDraft({
                        ...pontosDraft,
                        [p.colocacao]: {
                          pontos: pontosDraft[p.colocacao]?.pontos ?? '0',
                          ativo: e.target.checked,
                        },
                      })
                    }
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {(['classificacao_geral', 'taca'] as Escopo[]).map((escopo) => (
          <Card key={escopo}>
            <CardHeader
              titulo={`Desempate · ${ROTULO_ESCOPO[escopo]}`}
              descricao="Ordem de cima para baixo."
              acoes={
                <Button size="sm" onClick={() => salvarOrdem(escopo)} loading={salvandoOrdem === escopo}>
                  <Save className="h-4 w-4" /> Salvar
                </Button>
              }
            />
            <div className="space-y-1.5 p-4">
              {ordens[escopo].map((criterio, indice) => (
                <div
                  key={`${criterio}-${indice}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <span className="w-5 text-xs tabular-nums text-slate-400">{indice + 1}</span>
                  <span className="flex-1 text-sm">{ROTULO_CRITERIO[criterio] ?? criterio}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Subir"
                    disabled={indice === 0}
                    onClick={() => mover(escopo, indice, -1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Descer"
                    disabled={indice === ordens[escopo].length - 1}
                    onClick={() => mover(escopo, indice, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Remover"
                    onClick={() => removerCriterio(escopo, indice)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <Select
                  className="h-8 w-auto flex-1 text-xs"
                  value=""
                  onChange={(e) => adicionarCriterio(escopo, e.target.value)}
                >
                  <option value="">Adicionar critério…</option>
                  {CRITERIOS.map((c) => (
                    <option key={c.valor} value={c.valor}>
                      {c.rotulo}
                    </option>
                  ))}
                </Select>
                <Plus className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mb-4">
        <CardHeader
          titulo="Parâmetros gerais"
          descricao="Valores em JSON quando a configuração é uma lista ou objeto."
        />
        <div className="divide-y divide-slate-100">
          {base.data.configs
            .filter((c) => c.chave !== 'divergencias_documentos')
            .map((c) => (
              <div key={c.chave} className="grid gap-2 px-4 py-3 sm:grid-cols-[220px_1fr_auto] sm:items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-800">{c.chave}</p>
                  <p className="text-[11px] text-slate-500">{c.descricao ?? '—'}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{formatarDataHora(c.updated_at)}</p>
                </div>
                <div>
                  {typeof c.valor === 'boolean' ? (
                    <Checkbox
                      label={valores[c.chave] === 'true' ? 'Ativado' : 'Desativado'}
                      checked={valores[c.chave] === 'true'}
                      onChange={(e) => setValores({ ...valores, [c.chave]: e.target.checked ? 'true' : 'false' })}
                    />
                  ) : typeof c.valor === 'number' ? (
                    <Input
                      type="number"
                      step="0.01"
                      className="h-9 max-w-[180px]"
                      value={valores[c.chave] ?? ''}
                      onChange={(e) => setValores({ ...valores, [c.chave]: e.target.value })}
                    />
                  ) : typeof c.valor === 'string' && c.valor.length <= 120 ? (
                    <Input
                      className="h-9"
                      value={valores[c.chave] ?? ''}
                      onChange={(e) => setValores({ ...valores, [c.chave]: e.target.value })}
                    />
                  ) : (
                    <Textarea
                      className="min-h-[100px] font-mono text-xs"
                      value={valores[c.chave] ?? ''}
                      onChange={(e) => setValores({ ...valores, [c.chave]: e.target.value })}
                    />
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void salvarConfig(c)}
                  loading={salvandoChave === c.chave}
                >
                  Salvar
                </Button>
              </div>
            ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          titulo="Divergências entre documentos"
          descricao="Registro do que foi decidido quando Regulamento e Projeto divergem."
          acoes={<Badge tom="ambar">{divergencias.length} item(ns)</Badge>}
        />
        <div className="space-y-2 p-4">
          {divergencias.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhuma divergência registrada.</p>
          ) : (
            divergencias.map((d) => (
              <div key={d.tema} className="rounded-lg border border-slate-200 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <Info className="h-3.5 w-3.5 text-amber-600" /> {d.tema}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{d.resolucao}</p>
              </div>
            ))
          )}
          <Aviso tom="info">
            O Regulamento prevalece sobre o Projeto Executivo. Itens “a confirmar” podem ser ajustados
            nas telas de modalidades e da Taça.
          </Aviso>
        </div>
      </Card>
    </>
  )
}
