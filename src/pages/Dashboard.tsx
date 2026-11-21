import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Medal,
  Trophy,
  Users,
} from 'lucide-react'
import { Badge, Card, CardHeader, Carregando, ErroBox, PageHeader } from '@/components/ui'
import { ehErroRelacaoEstudantes } from '@/lib/partidasFormato'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { formatarDataHora, turmaRotulo } from '@/lib/format'
import type { Configuracao } from '@/lib/types'

type ProximaPartida = {
  id: string
  data_hora: string | null
  fase: string
  modalidade_categorias: { nome: string; modalidades: { nome: string; slug?: string } | null } | null
  locais: { nome: string } | null
  partida_participantes: {
    estudante_id?: string | null
    turmas: { numero: number; nome_equipe: string | null } | null
    estudantes?: { nome_completo: string } | null
  }[]
}

async function carregarProximasPartidas() {
  const agora = new Date().toISOString()
  const completa = await supabase
    .from('partidas')
    .select(
      'id, data_hora, fase, modalidade_categorias(nome, modalidades(nome, slug)), locais(nome), partida_participantes(estudante_id, turmas(numero, nome_equipe), estudantes(nome_completo))',
    )
    .gte('data_hora', agora)
    .in('status', ['programado', 'em_andamento'])
    .order('data_hora', { ascending: true })
    .limit(5)

  if (!completa.error || !ehErroRelacaoEstudantes(completa.error)) {
    return completa
  }

  return supabase
    .from('partidas')
    .select(
      'id, data_hora, fase, modalidade_categorias(nome, modalidades(nome, slug)), locais(nome), partida_participantes(turmas(numero, nome_equipe))',
    )
    .gte('data_hora', agora)
    .in('status', ['programado', 'em_andamento'])
    .order('data_hora', { ascending: true })
    .limit(5)
}

async function carregarResumo() {
  const [
    turmas,
    modalidades,
    pendentes,
    aprovadas,
    rascunhos,
    oficiais,
    proximas,
    semMinimo,
    aConfirmar,
    configs,
  ] = await Promise.all([
    supabase.from('turmas').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('modalidades').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase
      .from('inscricoes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente'),
    supabase
      .from('inscricoes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'aprovada'),
    supabase
      .from('resultados')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rascunho'),
    supabase
      .from('resultados')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'oficial'),
    carregarProximasPartidas(),
    supabase
      .from('modalidade_categorias')
      .select('id, nome, modalidades(nome)')
      .is('min_participantes_partida', null)
      .eq('ativo', true),
    supabase.from('modalidades').select('id, nome').eq('a_confirmar', true),
    supabase
      .from('configuracoes')
      .select('chave, valor, descricao, updated_at')
      .in('chave', ['evento_inicio', 'evento_fim', 'taca_publicada', 'divergencias_documentos']),
  ])

  const erro =
    turmas.error ||
    modalidades.error ||
    pendentes.error ||
    aprovadas.error ||
    rascunhos.error ||
    oficiais.error ||
    proximas.error ||
    semMinimo.error ||
    aConfirmar.error ||
    configs.error
  if (erro) throw erro

  const mapaConfig = new Map((configs.data as Configuracao[]).map((c) => [c.chave, c.valor]))

  return {
    turmas: turmas.count ?? 0,
    modalidades: modalidades.count ?? 0,
    pendentes: pendentes.count ?? 0,
    aprovadas: aprovadas.count ?? 0,
    rascunhos: rascunhos.count ?? 0,
    oficiais: oficiais.count ?? 0,
    proximas: (proximas.data ?? []) as unknown as ProximaPartida[],
    semMinimo: (semMinimo.data ?? []) as unknown as { id: string; nome: string; modalidades: { nome: string } | null }[],
    aConfirmar: (aConfirmar.data ?? []) as { id: string; nome: string }[],
    inicio: typeof mapaConfig.get('evento_inicio') === 'string' ? (mapaConfig.get('evento_inicio') as string) : null,
    tacaPublicada: mapaConfig.get('taca_publicada') === true,
  }
}

function diasPara(inicio: string | null) {
  if (!inicio) return null
  const hoje = new Date()
  const alvo = new Date(`${inicio}T00:00:00`)
  const diff = Math.ceil((alvo.getTime() - hoje.getTime()) / 86400000)
  return diff
}

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(carregarResumo)

  if (loading) return <Carregando />
  if (error) return <ErroBox mensagem={error} onRetry={reload} />
  if (!data) return null

  const dias = diasPara(data.inicio)

  const cartoes = [
    { rotulo: 'Turmas ativas', valor: data.turmas, icone: Users, para: '/admin/turmas' },
    { rotulo: 'Modalidades ativas', valor: data.modalidades, icone: Trophy, para: '/admin/modalidades' },
    { rotulo: 'Inscrições pendentes', valor: data.pendentes, icone: ClipboardList, para: '/admin/inscricoes' },
    { rotulo: 'Resultados em rascunho', valor: data.rascunhos, icone: Medal, para: '/admin/resultados' },
  ]

  return (
    <>
      <PageHeader
        titulo="Visão geral"
        descricao="Tudo o que a organização precisa acompanhar antes e durante os jogos."
        acoes={
          dias !== null ? (
            <Badge tom={dias > 0 ? 'ambar' : 'verde'}>
              {dias > 0
                ? `Faltam ${dias} dia${dias === 1 ? '' : 's'} para o início`
                : dias === 0
                  ? 'O evento começa hoje'
                  : 'Evento em andamento/encerrado'}
            </Badge>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cartoes.map((c) => (
          <Link key={c.rotulo} to={c.para} className="group">
            <Card className="flex items-center justify-between gap-3 p-4 transition-shadow group-hover:shadow-lg">
              <div>
                <p className="text-xs font-medium text-slate-500">{c.rotulo}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{c.valor}</p>
              </div>
              <div className="rounded-xl bg-brand-50 p-2.5 text-brand-700 ring-1 ring-brand-100">
                <c.icone className="h-5 w-5" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            titulo="Próximas partidas"
            descricao={`${data.aprovadas} inscrições aprovadas · ${data.oficiais} resultados oficiais`}
            acoes={
              <Link
                to="/admin/partidas"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
              >
                Ver programação <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {data.proximas.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CalendarDays className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-2 text-sm text-slate-600">Nenhuma partida agendada.</p>
              <p className="mt-1 text-xs text-slate-400">
                Cadastre as partidas quando os horários forem definidos pela organização.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.proximas.map((p) => {
                const participantes = (p.partida_participantes ?? [])
                  .map((pp) =>
                    pp.estudante_id
                      ? `${pp.estudantes?.nome_completo ?? 'Atleta'}${pp.turmas ? ` (T${pp.turmas.numero})` : ''}`
                      : turmaRotulo(pp.turmas),
                  )
                  .join(' × ')
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {p.modalidade_categorias?.modalidades?.nome ?? 'Modalidade'} ·{' '}
                        {p.modalidade_categorias?.nome ?? 'Categoria'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {participantes || 'Participantes ainda não definidos'}
                        {p.locais?.nome ? ` · ${p.locais.nome}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums text-slate-800">
                        {formatarDataHora(p.data_hora)}
                      </p>
                      <Badge tom={p.fase === 'final' ? 'ambar' : 'azul'}>{p.fase}</Badge>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader titulo="Pendências de configuração" />
            <div className="space-y-3 p-4">
              {data.semMinimo.length > 0 ? (
                <Link to="/admin/modalidades" className="block rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {data.semMinimo.length} categoria(s) sem mínimo de participantes
                  </p>
                  <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-amber-800">
                    {data.semMinimo
                      .map((c) => `${c.modalidades?.nome ?? ''} · ${c.nome}`)
                      .join(', ')}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-amber-900">
                    Partidas dessas categorias estão bloqueadas.
                  </p>
                </Link>
              ) : null}

              {data.aConfirmar.length > 0 ? (
                <Link to="/admin/modalidades" className="block rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-800">Regras a confirmar</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {data.aConfirmar.map((m) => m.nome).join(', ')}
                  </p>
                </Link>
              ) : null}

              <Link to="/admin/taca" className="block rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-800">
                  Taça Turma Protagonista {data.tacaPublicada ? 'publicada' : 'não publicada'}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {data.tacaPublicada
                    ? 'O ranking está visível no portal.'
                    : 'Configure as notas e publique quando estiver pronto.'}
                </p>
              </Link>

              <div className="rounded-lg bg-slate-50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <GraduationCap className="h-3.5 w-3.5" /> Atalhos
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link to="/admin/inscricoes" className="text-[11px] font-medium text-brand-700 hover:underline">
                    Inscrições
                  </Link>
                  <Link to="/admin/resultados" className="text-[11px] font-medium text-brand-700 hover:underline">
                    Resultados
                  </Link>
                  <Link to="/admin/conteudo" className="text-[11px] font-medium text-brand-700 hover:underline">
                    Conteúdo
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
