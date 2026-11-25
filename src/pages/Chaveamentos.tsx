import { useEffect, useState } from 'react'
import { Printer, Save, Table2 } from 'lucide-react'
import {
  Aviso,
  Badge,
  Button,
  Card,
  Carregando,
  EmptyState,
  ErroBox,
  PageHeader,
  useToast,
} from '@/components/ui'
import {
  ArtilhariaView,
  BracketView,
  CartoesView,
  ElencosView,
  FreeFireView,
  GruposMataMataView,
  MedalhasView,
  ProgramacaoView,
  QuizView,
  TempoView,
} from '@/components/chaveamentos/ChaveamentoViews'
import type { AbaPlanilha, ChaveamentoRegistro, DadosPlanilha } from '@/lib/chaveamentosTypes'
import { mensagemErro } from '@/lib/errors'
import { formatarDataHora } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'

export default function Chaveamentos() {
  const { notificar } = useToast()

  const { data, loading, error, reload } = useAsync(async () => {
    const { data, error } = await supabase
      .from('chaveamentos')
      .select('*')
      .order('ordem', { ascending: true })
    if (error) throw error
    return (data ?? []) as ChaveamentoRegistro[]
  })

  const [slugAtivo, setSlugAtivo] = useState<string>('')
  const [abaAtiva, setAbaAtiva] = useState<string>('')
  const [rascunho, setRascunho] = useState<DadosPlanilha | null>(null)
  const [alterado, setAlterado] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const lista = data ?? []
  const registroAtual = lista.find((r) => r.slug === slugAtivo) ?? lista[0] ?? null

  useEffect(() => {
    if (!slugAtivo && lista.length > 0) {
      setSlugAtivo(lista[0].slug)
    }
  }, [lista, slugAtivo])

  useEffect(() => {
    if (!registroAtual) return
    setRascunho(structuredClone(registroAtual.dados))
    setAbaAtiva(registroAtual.dados.abas[0]?.id ?? 'elencos')
    setAlterado(false)
  }, [registroAtual?.slug, registroAtual?.updated_at])

  function trocarPlanilha(novoSlug: string) {
    if (novoSlug === slugAtivo) return
    if (alterado && !window.confirm('Há alterações não salvas nesta planilha. Deseja descartar e trocar?')) {
      return
    }
    setSlugAtivo(novoSlug)
  }

  function atualizarAba(index: number, novaAba: AbaPlanilha) {
    if (!rascunho) return
    setRascunho({
      ...rascunho,
      abas: rascunho.abas.map((a, i) => (i === index ? novaAba : a)),
    })
    setAlterado(true)
  }

  async function salvar() {
    if (!registroAtual || !rascunho) return
    setSalvando(true)
    try {
      const { error } = await supabase
        .from('chaveamentos')
        .update({ dados: rascunho })
        .eq('slug', registroAtual.slug)
      if (error) throw error
      setAlterado(false)
      notificar(`Planilha "${registroAtual.titulo}" salva com sucesso.`)
      reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <Carregando />
  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader titulo="Chaveamentos e Planilhas" descricao="Réplica interativa das 16 planilhas oficiais dos Jogos 2026." />
        <ErroBox mensagem={error} onRetry={reload} />
        <Aviso tom="atencao" titulo="Migrations pendentes?">
          Certifique-se de aplicar <code>0014_chaveamentos_planilhas.sql</code> e{' '}
          <code>0015_seed_chaveamentos_excel.sql</code> no SQL Editor do Supabase.
        </Aviso>
      </div>
    )
  }

  if (lista.length === 0 || !registroAtual || !rascunho) {
    return (
      <div className="space-y-4">
        <PageHeader titulo="Chaveamentos e Planilhas" descricao="Réplica interativa das 16 planilhas oficiais dos Jogos 2026." />
        <EmptyState
          icone={<Table2 className="h-6 w-6" />}
          titulo="Nenhuma planilha carregada"
          descricao="Execute o script 0015_seed_chaveamentos_excel.sql no Supabase para importar todos os chaveamentos e a programação."
        />
      </div>
    )
  }

  const abaIndex = rascunho.abas.findIndex((a) => a.id === abaAtiva)
  const abaSelecionada = abaIndex >= 0 ? rascunho.abas[abaIndex] : null

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Chaveamentos e Planilhas"
        descricao="Réplica interativa de todas as 16 planilhas oficiais com cálculo automático de tabelas, repescagem, chaves e pódio."
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            {alterado ? <Badge tom="ambar">Alterações não salvas</Badge> : null}
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            <Button size="sm" onClick={() => void salvar()} loading={salvando} disabled={!alterado}>
              <Save className="h-4 w-4" /> Salvar alterações
            </Button>
          </div>
        }
      />

      {/* Seletor das 15 planilhas (Programação + 14 Modalidades) */}
      <Card className="p-3 print:hidden">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Selecione a planilha ({lista.length})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {lista.map((item) => {
            const ativo = item.slug === registroAtual.slug
            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => trocarPlanilha(item.slug)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  ativo
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {item.titulo}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Cabeçalho da planilha ativa + Abas internas */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{registroAtual.titulo}</h2>
          {registroAtual.subtitulo ? (
            <p className="text-xs text-slate-500">{registroAtual.subtitulo}</p>
          ) : null}
        </div>
        <p className="text-[11px] text-slate-400">
          Última atualização: {formatarDataHora(registroAtual.updated_at)}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 print:hidden">
        {rascunho.abas.map((aba) => (
          <button
            key={aba.id}
            type="button"
            onClick={() => setAbaAtiva(aba.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              abaAtiva === aba.id
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {aba.titulo}
          </button>
        ))}
        {rascunho.elencos && rascunho.elencos.linhas.length > 0 ? (
          <button
            type="button"
            onClick={() => setAbaAtiva('elencos')}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              abaAtiva === 'elencos'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Elencos e Conferência ({rascunho.elencos.linhas.length})
          </button>
        ) : null}
      </div>

      {/* Conteúdo da aba ativa */}
      {abaAtiva === 'elencos' && rascunho.elencos ? (
        <ElencosView
          elencos={rascunho.elencos}
          onChange={(elencos) => {
            setRascunho({ ...rascunho, elencos })
            setAlterado(true)
          }}
        />
      ) : abaSelecionada ? (
        <>
          {abaSelecionada.tipo === 'grupos_mata_mata' ? (
            <GruposMataMataView aba={abaSelecionada} onChange={(next) => atualizarAba(abaIndex, next)} />
          ) : null}
          {abaSelecionada.tipo === 'mata_mata' || abaSelecionada.tipo === 'repescagem' ? (
            <BracketView aba={abaSelecionada} onChange={(next) => atualizarAba(abaIndex, next)} />
          ) : null}
          {abaSelecionada.tipo === 'tempo' ? (
            <TempoView aba={abaSelecionada} onChange={(next) => atualizarAba(abaIndex, next)} />
          ) : null}
          {abaSelecionada.tipo === 'free_fire' ? (
            <FreeFireView aba={abaSelecionada} onChange={(next) => atualizarAba(abaIndex, next)} />
          ) : null}
          {abaSelecionada.tipo === 'quiz' ? (
            <QuizView aba={abaSelecionada} onChange={(next) => atualizarAba(abaIndex, next)} />
          ) : null}
          {abaSelecionada.tipo === 'programacao' ? (
            <ProgramacaoView aba={abaSelecionada} onChange={(next) => atualizarAba(abaIndex, next)} />
          ) : null}
          {abaSelecionada.tipo === 'artilharia' ? (
            <ArtilhariaView aba={abaSelecionada} onChange={(next) => atualizarAba(abaIndex, next)} />
          ) : null}
          {abaSelecionada.tipo === 'medalhas' ? (
            <MedalhasView aba={abaSelecionada} onChange={(next) => atualizarAba(abaIndex, next)} />
          ) : null}
          {abaSelecionada.tipo === 'cartoes' ? (
            <CartoesView aba={abaSelecionada} onChange={(next) => atualizarAba(abaIndex, next)} />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
