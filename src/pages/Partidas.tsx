import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarDays,
  LayoutGrid,
  Pencil,
  Plus,
  Swords,
  Trash2,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react'
import { SeletorAtleta, type AtletaOpcao } from '@/components/SeletorAtleta'
import {
  Aviso,
  Badge,
  Button,
  Card,
  Carregando,
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
import { FASES, ROTULO_FASE, STATUS_PARTIDA } from '@/lib/constantes'
import { mensagemErro } from '@/lib/errors'
import { deInputDataHora, formatarDataHora, paraInputDataHora, turmaRotulo } from '@/lib/format'
import {
  ehErroRelacaoEstudantes,
  formatoPartidaDe,
  INFO_FORMATO_PARTIDA,
  validarParticipantesPartida,
  type FormatoPartida,
} from '@/lib/partidasFormato'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import type {
  CategoriaComModalidade,
  Local,
  Partida,
  PartidaParticipante,
  StatusPartida,
  Turma,
} from '@/lib/types'

type Linha = {
  id?: string
  turma_id: string
  estudante_id: string
  placar: string
  tempo: string
  pontuacao: string
  posicao: string
  vencedor: '' | 'sim' | 'nao'
  observacao: string
}

type SlotParticipante = {
  turma_id: string
  estudante_id: string
}

type Conflito = {
  tipo: string
  data_hora: string
  referencia: string
  detalhe: string
}

type Formulario = {
  modalidade_categoria_id: string
  fase: string
  rodada: string
  data_hora: string
  local_id: string
  status: StatusPartida
  observacoes: string
}

const VAZIO: Formulario = {
  modalidade_categoria_id: '',
  fase: 'classificatoria',
  rodada: '',
  data_hora: '',
  local_id: '',
  status: 'programado',
  observacoes: '',
}

const SELECT_PARTIDA_COMPLETA =
  '*, modalidade_categorias(nome, formato_resultado, min_participantes_partida, modalidades(id, nome, tipo, slug)), locais(nome), partida_participantes(*, turmas(numero, nome_equipe), estudantes(nome_completo))'

const SELECT_PARTIDA_LEGADO =
  '*, modalidade_categorias(nome, formato_resultado, min_participantes_partida, modalidades(id, nome, tipo, slug)), locais(nome), partida_participantes(*, turmas(numero, nome_equipe))'

function linhaVazia(turma_id = '', estudante_id = ''): Linha {
  return {
    turma_id,
    estudante_id,
    placar: '',
    tempo: '',
    pontuacao: '',
    posicao: '',
    vencedor: '',
    observacao: '',
  }
}

function slotsIniciaisPara(formato: FormatoPartida): SlotParticipante[] {
  if (formato === 'mesa') {
    return Array.from({ length: 4 }, () => ({ turma_id: '', estudante_id: '' }))
  }
  return [
    { turma_id: '', estudante_id: '' },
    { turma_id: '', estudante_id: '' },
  ]
}

function BadgePartida({ status }: { status: StatusPartida }) {
  const tom = {
    programado: 'azul',
    em_andamento: 'ambar',
    concluido: 'verde',
    adiado: 'cinza',
    wo: 'roxo',
    cancelado: 'vermelho',
  }[status] as 'azul' | 'ambar' | 'verde' | 'cinza' | 'roxo' | 'vermelho'
  return <Badge tom={tom}>{STATUS_PARTIDA.find((s) => s.valor === status)?.rotulo ?? status}</Badge>
}

function BadgeFormato({ formato }: { formato: FormatoPartida }) {
  if (formato === 'mesa') {
    return (
      <Badge tom="roxo">
        <LayoutGrid className="h-3 w-3" /> Mesa (até 4)
      </Badge>
    )
  }
  if (formato === 'individual_confronto') {
    return (
      <Badge tom="azul">
        <UserRound className="h-3 w-3" /> Individual 1×1
      </Badge>
    )
  }
  if (formato === 'individual_bateria') {
    return (
      <Badge tom="ambar">
        <UserRound className="h-3 w-3" /> Bateria individual
      </Badge>
    )
  }
  return (
    <Badge tom="cinza">
      <Users className="h-3 w-3" /> Coletiva / equipes
    </Badge>
  )
}

function linhaDe(p: PartidaParticipante): Linha {
  return {
    id: p.id,
    turma_id: p.turma_id,
    estudante_id: p.estudante_id ?? '',
    placar: p.placar === null ? '' : String(p.placar),
    tempo: p.tempo === null ? '' : String(p.tempo),
    pontuacao: p.pontuacao === null ? '' : String(p.pontuacao),
    posicao: p.posicao === null ? '' : String(p.posicao),
    vencedor: p.vencedor === null ? '' : p.vencedor ? 'sim' : 'nao',
    observacao: p.observacao ?? '',
  }
}

export default function Partidas() {
  const { notificar } = useToast()
  const [statusFiltro, setStatusFiltro] = useState<'todas' | StatusPartida>('todas')
  const [dataFiltro, setDataFiltro] = useState('')
  const [schemaAtletasPendente, setSchemaAtletasPendente] = useState(false)

  const aux = useAsync(async () => {
    const [cats, turmasRes, locaisRes, alunosRes, inscsRes] = await Promise.all([
      supabase
        .from('modalidade_categorias')
        .select('*, modalidades(id, nome, tipo, slug)')
        .eq('ativo', true)
        .order('nome'),
      supabase.from('turmas').select('*').eq('ativo', true).order('numero'),
      supabase.from('locais').select('*').eq('ativo', true).order('ordem', { nullsFirst: false }),
      supabase
        .from('estudantes')
        .select('id, nome_completo, turma_id, turmas(numero, nome_equipe)')
        .eq('ativo', true)
        .order('nome_completo'),
      supabase
        .from('inscricoes')
        .select('modalidade_categoria_id, inscricao_participantes(estudante_id)')
        .in('status', ['pendente', 'aprovada']),
    ])
    if (cats.error) throw cats.error
    if (turmasRes.error) throw turmasRes.error
    if (locaisRes.error) throw locaisRes.error
    if (alunosRes.error) throw alunosRes.error

    const inscritosPorCategoria = new Map<string, Set<string>>()
    if (!inscsRes.error && inscsRes.data) {
      for (const insc of inscsRes.data as unknown as {
        modalidade_categoria_id: string
        inscricao_participantes?: { estudante_id: string }[]
      }[]) {
        const conjunto = inscritosPorCategoria.get(insc.modalidade_categoria_id) ?? new Set<string>()
        for (const p of insc.inscricao_participantes ?? []) {
          if (p.estudante_id) conjunto.add(p.estudante_id)
        }
        inscritosPorCategoria.set(insc.modalidade_categoria_id, conjunto)
      }
    }

    return {
      categorias: cats.data as CategoriaComModalidade[],
      turmas: turmasRes.data as Turma[],
      locais: locaisRes.data as Local[],
      atletas: (alunosRes.data ?? []) as unknown as AtletaOpcao[],
      inscritosPorCategoria,
    }
  })

  const lista = useAsync(async () => {
    const montarQuery = (selectExpr: string) => {
      let q = supabase
        .from('partidas')
        .select(selectExpr)
        .order('data_hora', { ascending: true, nullsFirst: false })
        .order('created_at')
      if (statusFiltro !== 'todas') q = q.eq('status', statusFiltro)
      if (dataFiltro) {
        q = q
          .gte('data_hora', new Date(`${dataFiltro}T00:00:00`).toISOString())
          .lte('data_hora', new Date(`${dataFiltro}T23:59:59.999`).toISOString())
      }
      return q
    }

    const res = await montarQuery(SELECT_PARTIDA_COMPLETA)
    if (!res.error) {
      setSchemaAtletasPendente(false)
      return (res.data ?? []) as unknown as Partida[]
    }

    if (ehErroRelacaoEstudantes(res.error)) {
      setSchemaAtletasPendente(true)
      const fallback = await montarQuery(SELECT_PARTIDA_LEGADO)
      if (fallback.error) throw fallback.error
      return (fallback.data ?? []) as unknown as Partida[]
    }

    throw res.error
  }, [statusFiltro, dataFiltro])

  const categorias = aux.data?.categorias ?? []
  const turmas = aux.data?.turmas ?? []
  const locais = aux.data?.locais ?? []
  const atletas = aux.data?.atletas ?? []
  const inscritosPorCategoria = aux.data?.inscritosPorCategoria ?? new Map<string, Set<string>>()

  const gruposCategorias = useMemo(() => {
    const mapa = new Map<string, { nome: string; itens: CategoriaComModalidade[] }>()
    for (const c of categorias) {
      const chave = c.modalidades?.id ?? 'outros'
      const grupo = mapa.get(chave) ?? { nome: c.modalidades?.nome ?? 'Outros', itens: [] }
      grupo.itens.push(c)
      mapa.set(chave, grupo)
    }
    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [categorias])

  const [editando, setEditando] = useState<Partida | 'nova' | null>(null)
  const [form, setForm] = useState<Formulario>(VAZIO)
  const [slotsCriacao, setSlotsCriacao] = useState<SlotParticipante[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  const [gerenciando, setGerenciando] = useState<Partida | null>(null)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [salvandoPartida, setSalvandoPartida] = useState(false)
  const [erroPartida, setErroPartida] = useState<string | null>(null)

  const [excluindo, setExcluindo] = useState<Partida | null>(null)
  const [removendo, setRemovendo] = useState(false)

  const [conflitos, setConflitos] = useState<Conflito[] | null>(null)
  const [carregandoConflitos, setCarregandoConflitos] = useState(false)

  const categoriaForm = useMemo(
    () => categorias.find((c) => c.id === form.modalidade_categoria_id) ?? null,
    [categorias, form.modalidade_categoria_id],
  )
  const formatoForm = useMemo(() => formatoPartidaDe(categoriaForm), [categoriaForm])
  const infoFormatoForm = INFO_FORMATO_PARTIDA[formatoForm]
  const inscritosCategoriaForm = categoriaForm
    ? inscritosPorCategoria.get(categoriaForm.id)
    : undefined

  const categoriaGerenciando = useMemo(
    () =>
      gerenciando
        ? categorias.find((c) => c.id === gerenciando.modalidade_categoria_id) ?? null
        : null,
    [categorias, gerenciando],
  )
  const formatoGerenciando = useMemo(
    () => formatoPartidaDe(categoriaGerenciando),
    [categoriaGerenciando],
  )
  const infoFormatoGerenciando = INFO_FORMATO_PARTIDA[formatoGerenciando]
  const inscritosCategoriaGerenciando = categoriaGerenciando
    ? inscritosPorCategoria.get(categoriaGerenciando.id)
    : undefined

  function abrir(p: Partida | 'nova') {
    setErroForm(null)
    if (p === 'nova') {
      setForm(VAZIO)
      setSlotsCriacao([])
      setEditando('nova')
      return
    }
    setForm({
      modalidade_categoria_id: p.modalidade_categoria_id,
      fase: p.fase,
      rodada: p.rodada === null ? '' : String(p.rodada),
      data_hora: paraInputDataHora(p.data_hora),
      local_id: p.local_id ?? '',
      status: p.status,
      observacoes: p.observacoes ?? '',
    })
    setSlotsCriacao([])
    setEditando(p)
  }

  function aoTrocarCategoriaForm(categoriaId: string) {
    setForm((atual) => ({ ...atual, modalidade_categoria_id: categoriaId }))
    setErroForm(null)
    if (editando !== 'nova') return
    if (!categoriaId) {
      setSlotsCriacao([])
      return
    }
    const cat = categorias.find((c) => c.id === categoriaId) ?? null
    setSlotsCriacao(slotsIniciaisPara(formatoPartidaDe(cat)))
  }

  function atualizarSlotCriacao(indice: number, novo: SlotParticipante) {
    setErroForm(null)
    setSlotsCriacao((atuais) => atuais.map((s, i) => (i === indice ? novo : s)))
  }

  function adicionarSlotCriacao() {
    if (infoFormatoForm.maxParticipantes && slotsCriacao.length >= infoFormatoForm.maxParticipantes) {
      return
    }
    setSlotsCriacao((atuais) => [...atuais, { turma_id: '', estudante_id: '' }])
  }

  function removerSlotCriacao(indice: number) {
    setSlotsCriacao((atuais) => atuais.filter((_, i) => i !== indice))
  }

  async function salvar() {
    if (!form.modalidade_categoria_id) {
      setErroForm('Selecione a modalidade/categoria.')
      return
    }
    const categoria = categorias.find((c) => c.id === form.modalidade_categoria_id)
    if (categoria && categoria.min_participantes_partida === null) {
      setErroForm(
        'Esta categoria ainda não tem mínimo de participantes definido. Configure a categoria antes de criar partidas oficiais.',
      )
      return
    }

    const formato = formatoPartidaDe(categoria)
    const infoFormato = INFO_FORMATO_PARTIDA[formato]
    const participantesPreenchidos =
      editando === 'nova'
        ? slotsCriacao.filter((s) => (infoFormato.usaAtletas ? Boolean(s.estudante_id) : Boolean(s.turma_id)))
        : []

    if (editando === 'nova') {
      const erroValidacao = validarParticipantesPartida(formato, slotsCriacao, { permitirVazio: true })
      if (erroValidacao) {
        setErroForm(erroValidacao)
        return
      }
      if (infoFormato.usaAtletas && participantesPreenchidos.length > 0 && schemaAtletasPendente) {
        setErroForm(
          'O banco Supabase ainda não tem a coluna estudante_id em partida_participantes. Aplique as migrations 0012_partidas_atletas.sql e 0013_partidas_formatos_validacoes.sql no SQL Editor antes de vincular atletas.',
        )
        return
      }
    }

    setSalvando(true)
    setErroForm(null)
    const payload = {
      modalidade_categoria_id: form.modalidade_categoria_id,
      fase: form.fase,
      rodada: form.rodada === '' ? null : Number(form.rodada),
      data_hora: deInputDataHora(form.data_hora),
      local_id: form.local_id || null,
      status: form.status,
      observacoes: form.observacoes.trim() || null,
    }

    try {
      if (editando === 'nova') {
        const { data, error } = await supabase.from('partidas').insert(payload).select('id').single()
        if (error) throw error

        if (participantesPreenchidos.length > 0) {
          const registros = participantesPreenchidos.map((p) => {
            if (infoFormato.usaAtletas) {
              const atleta = atletas.find((a) => a.id === p.estudante_id)
              return {
                partida_id: data.id,
                turma_id: atleta?.turma_id ?? p.turma_id,
                estudante_id: p.estudante_id,
              }
            }
            return {
              partida_id: data.id,
              turma_id: p.turma_id,
              ...(schemaAtletasPendente ? {} : { estudante_id: null }),
            }
          })

          const { error: erroPart } = await supabase.from('partida_participantes').insert(registros)
          if (erroPart) {
            await supabase.from('partidas').delete().eq('id', data.id)
            throw erroPart
          }

          const mensagemSucesso =
            formato === 'mesa'
              ? `Mesa criada com ${registros.length} atletas.`
              : formato === 'individual_confronto'
                ? 'Confronto individual criado com sucesso.'
                : formato === 'individual_bateria'
                  ? `Bateria individual criada com ${registros.length} atleta(s).`
                  : 'Partida criada com sucesso.'
          notificar(mensagemSucesso)
          setEditando(null)
          lista.reload()
          return
        }

        const selectUsado = schemaAtletasPendente ? SELECT_PARTIDA_LEGADO : SELECT_PARTIDA_COMPLETA
        const { data: completa } = await supabase
          .from('partidas')
          .select(selectUsado)
          .eq('id', data.id)
          .single()

        notificar(
          formato === 'mesa'
            ? 'Mesa criada. Agora selecione os atletas da mesa.'
            : infoFormato.usaAtletas
              ? 'Partida criada. Agora selecione os atletas participantes.'
              : 'Partida criada. Agora defina as turmas e o resultado.',
        )
        setEditando(null)
        lista.reload()
        if (completa) {
          abrirResultado(completa as unknown as Partida)
        }
      } else if (editando) {
        const { error } = await supabase.from('partidas').update(payload).eq('id', editando.id)
        if (error) throw error
        notificar('Partida atualizada.')
        setEditando(null)
        lista.reload()
      }
    } catch (e) {
      setErroForm(mensagemErro(e))
    } finally {
      setSalvando(false)
    }
  }

  function abrirResultado(p: Partida) {
    const cat = categorias.find((c) => c.id === p.modalidade_categoria_id) ?? null
    const formato = formatoPartidaDe(cat)
    const atuais = (p.partida_participantes ?? []).map(linhaDe)

    let iniciais = atuais
    if (iniciais.length === 0) {
      if (formato === 'individual_confronto') {
        iniciais = [linhaVazia(), linhaVazia()]
      } else if (formato === 'mesa') {
        iniciais = [linhaVazia(), linhaVazia()]
      }
    } else if (formato === 'individual_confronto' && iniciais.length === 1 && iniciais[0].estudante_id) {
      iniciais = [...iniciais, linhaVazia()]
    }

    setErroPartida(null)
    setGerenciando(p)
    setLinhas(iniciais)
  }

  function adicionarLinhaTurma() {
    const usadas = new Set(linhas.map((l) => l.turma_id))
    const disponivel = turmas.find((t) => !usadas.has(t.id))
    setLinhas((ls) => [...ls, linhaVazia(disponivel?.id ?? '', '')])
  }

  function adicionarLinhaAtleta() {
    if (infoFormatoGerenciando.maxParticipantes && linhas.length >= infoFormatoGerenciando.maxParticipantes) {
      setErroPartida(
        formatoGerenciando === 'mesa'
          ? 'A mesa já atingiu o limite de 4 atletas. Crie outra partida para a próxima mesa.'
          : 'Confrontos individuais diretos aceitam no máximo 2 atletas (1 × 1).',
      )
      return
    }
    setErroPartida(null)
    setLinhas((ls) => [...ls, linhaVazia('', '')])
  }

  function atualizarLinha(indice: number, campo: keyof Linha, valor: string) {
    setErroPartida(null)
    setLinhas((ls) => ls.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)))
  }

  function selecionarAtletaNaLinha(indice: number, atleta: AtletaOpcao | null) {
    setErroPartida(null)
    setLinhas((ls) =>
      ls.map((l, i) =>
        i === indice
          ? {
              ...l,
              estudante_id: atleta?.id ?? '',
              turma_id: atleta?.turma_id ?? '',
            }
          : l,
      ),
    )
  }

  function removerLinha(indice: number) {
    setErroPartida(null)
    setLinhas((ls) => ls.filter((_, i) => i !== indice))
  }

  async function salvarResultado() {
    if (!gerenciando) return
    const porAtleta = infoFormatoGerenciando.usaAtletas

    if (porAtleta && schemaAtletasPendente) {
      setErroPartida(
        'O banco Supabase ainda não tem o relacionamento partida_participantes -> estudantes. Aplique as migrations 0012_partidas_atletas.sql e 0013_partidas_formatos_validacoes.sql no SQL Editor.',
      )
      return
    }

    const linhasValidas = linhas.filter((l) => (porAtleta ? Boolean(l.estudante_id) : Boolean(l.turma_id)))
    const erroValidacao = validarParticipantesPartida(formatoGerenciando, linhasValidas)
    if (erroValidacao) {
      setErroPartida(erroValidacao)
      return
    }

    setSalvandoPartida(true)
    setErroPartida(null)
    try {
      const mapaExistentes = new Map((gerenciando.partida_participantes ?? []).map((p) => [p.id, p]))
      const manterMesmaIdentidade = new Set<string>()
      const linhasParaInserir: Linha[] = []
      const linhasParaAtualizar: Linha[] = []

      for (const l of linhasValidas) {
        const antigo = l.id ? mapaExistentes.get(l.id) : undefined
        const mesmaIdentidade =
          antigo !== undefined &&
          (porAtleta
            ? antigo.estudante_id === l.estudante_id
            : antigo.estudante_id === null && antigo.turma_id === l.turma_id)

        if (mesmaIdentidade && l.id) {
          manterMesmaIdentidade.add(l.id)
          linhasParaAtualizar.push(l)
        } else {
          linhasParaInserir.push(l)
        }
      }

      const removerIds = [...mapaExistentes.keys()].filter((id) => !manterMesmaIdentidade.has(id))
      if (removerIds.length > 0) {
        const { error } = await supabase.from('partida_participantes').delete().in('id', removerIds)
        if (error) throw error
      }

      const montarPayload = (l: Linha) => {
        const atleta = porAtleta ? atletas.find((a) => a.id === l.estudante_id) : undefined
        return {
          partida_id: gerenciando.id,
          turma_id: porAtleta ? (atleta?.turma_id ?? l.turma_id) : l.turma_id,
          ...(schemaAtletasPendente ? {} : { estudante_id: porAtleta ? l.estudante_id : null }),
          placar: l.placar === '' ? null : Number(l.placar),
          tempo: l.tempo === '' ? null : Number(l.tempo),
          pontuacao: l.pontuacao === '' ? null : Number(l.pontuacao),
          posicao: l.posicao === '' ? null : Number(l.posicao),
          vencedor: l.vencedor === '' ? null : l.vencedor === 'sim',
          observacao: l.observacao.trim() || null,
        }
      }

      for (const l of linhasParaAtualizar) {
        const { error } = await supabase
          .from('partida_participantes')
          .update(montarPayload(l))
          .eq('id', l.id as string)
        if (error) throw error
      }

      if (linhasParaInserir.length > 0) {
        const { error } = await supabase
          .from('partida_participantes')
          .insert(linhasParaInserir.map(montarPayload))
        if (error) throw error
      }

      notificar('Participantes e resultado atualizados.')
      setGerenciando(null)
      lista.reload()
    } catch (e) {
      setErroPartida(mensagemErro(e))
    } finally {
      setSalvandoPartida(false)
    }
  }

  async function excluir() {
    if (!excluindo) return
    setRemovendo(true)
    try {
      const { error } = await supabase.from('partidas').delete().eq('id', excluindo.id)
      if (error) throw error
      notificar('Partida excluída.')
      setExcluindo(null)
      lista.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setRemovendo(false)
    }
  }

  async function verConflitos() {
    setCarregandoConflitos(true)
    try {
      const { data, error } = await supabase.rpc('fn_conflitos_horario')
      if (error) throw error
      setConflitos((data ?? []) as Conflito[])
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setCarregandoConflitos(false)
    }
  }

  const itens = lista.data ?? []

  return (
    <>
      <PageHeader
        titulo="Partidas"
        descricao="Programe jogos coletivos, confrontos individuais (1×1) e mesas de até 4 atletas."
        acoes={
          <>
            <Button variant="outline" onClick={verConflitos} loading={carregandoConflitos}>
              <AlertTriangle className="h-4 w-4" /> Conflitos
            </Button>
            <Button onClick={() => abrir('nova')}>
              <Plus className="h-4 w-4" /> Nova partida
            </Button>
          </>
        }
      />

      {schemaAtletasPendente ? (
        <div className="mb-4">
          <Aviso tom="atencao" titulo="Atualização pendente no banco Supabase">
            A coluna <code>partida_participantes.estudante_id</code> ainda não existe no banco de produção (erro{' '}
            <code>PGRST200</code>). Para habilitar confrontos individuais e mesas de atletas, execute as migrations{' '}
            <strong>0012_partidas_atletas.sql</strong> e <strong>0013_partidas_formatos_validacoes.sql</strong> no SQL
            Editor do Supabase.
          </Aviso>
        </div>
      ) : null}

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-auto min-w-[190px]"
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as 'todas' | StatusPartida)}
            aria-label="Filtrar por situação"
          >
            <option value="todas">Todas as situações</option>
            {STATUS_PARTIDA.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            className="w-auto"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            aria-label="Filtrar por data"
          />
          {dataFiltro ? (
            <Button variant="ghost" size="sm" onClick={() => setDataFiltro('')}>
              Limpar data
            </Button>
          ) : null}
          <span className="ml-auto text-xs text-slate-500">{itens.length} partida(s)</span>
        </div>
      </Card>

      {lista.loading || aux.loading ? (
        <Carregando />
      ) : lista.error || aux.error ? (
        <ErroBox mensagem={lista.error ?? aux.error ?? ''} onRetry={lista.reload} />
      ) : (
        <Card>
          {itens.length === 0 ? (
            <EmptyState
              titulo="Nenhuma partida"
              descricao="Programe as partidas quando os horários forem definidos."
              icone={<CalendarDays className="h-6 w-6" />}
              acao={<Button onClick={() => abrir('nova')}>Nova partida</Button>}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Quando / local</Th>
                  <Th>Modalidade</Th>
                  <Th>Participantes</Th>
                  <Th>Fase</Th>
                  <Th>Status</Th>
                  <Th className="w-40 text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {itens.map((p) => {
                  const participantes = p.partida_participantes ?? []
                  const cat = categorias.find((c) => c.id === p.modalidade_categoria_id) ?? p.modalidade_categorias
                  const formato = formatoPartidaDe(cat)
                  const ehMesa = formato === 'mesa'
                  return (
                    <tr key={p.id}>
                      <Td>
                        <p className="text-sm font-medium tabular-nums text-slate-800">
                          {formatarDataHora(p.data_hora)}
                        </p>
                        <p className="text-[11px] text-slate-500">{p.locais?.nome ?? 'Local não definido'}</p>
                      </Td>
                      <Td>
                        <p className="text-sm font-medium text-slate-800">
                          {p.modalidade_categorias?.modalidades?.nome ?? '—'}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">{p.modalidade_categorias?.nome}</span>
                          {ehMesa ? <Badge tom="roxo">Mesa</Badge> : null}
                          {formato === 'individual_confronto' ? <Badge tom="azul">1×1</Badge> : null}
                        </div>
                      </Td>
                      <Td>
                        {participantes.length === 0 ? (
                          <span className="text-xs text-amber-700">Sem participantes</span>
                        ) : ehMesa && participantes.some((pp) => pp.estudante_id) ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              <LayoutGrid className="h-3 w-3 text-violet-600" />
                              Mesa ({participantes.length}/4)
                            </span>
                            <div className="flex flex-wrap gap-1 text-xs">
                              {participantes.map((pp) => (
                                <span
                                  key={pp.id}
                                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
                                    pp.vencedor
                                      ? 'bg-emerald-50 font-semibold text-emerald-900 ring-1 ring-emerald-200'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {pp.vencedor ? <Trophy className="h-3 w-3 text-emerald-600" /> : null}
                                  <span>{pp.estudantes?.nome_completo ?? 'Atleta'}</span>
                                  {pp.turmas ? (
                                    <span className="text-[10px] text-slate-500">T{pp.turmas.numero}</span>
                                  ) : null}
                                  {pp.posicao !== null ? (
                                    <span className="rounded bg-white px-1 text-[10px] font-semibold tabular-nums">
                                      {pp.posicao}º
                                    </span>
                                  ) : pp.placar !== null ? (
                                    <span className="rounded bg-white px-1 text-[10px] font-semibold tabular-nums">
                                      {pp.placar}
                                    </span>
                                  ) : null}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1 text-xs">
                            {participantes.map((pp, idx) => (
                              <span key={pp.id} className="inline-flex items-center gap-1">
                                {idx > 0 ? <span className="mx-0.5 text-slate-400">×</span> : null}
                                <span
                                  className={`font-medium ${pp.vencedor ? 'text-emerald-800' : 'text-slate-800'}`}
                                >
                                  {pp.estudante_id
                                    ? pp.estudantes?.nome_completo ?? 'Atleta'
                                    : turmaRotulo(pp.turmas)}
                                </span>
                                {pp.estudante_id && pp.turmas ? (
                                  <span className="rounded bg-slate-100 px-1 text-[10px] font-medium text-slate-500">
                                    T{pp.turmas.numero}
                                  </span>
                                ) : null}
                                {pp.placar !== null ? (
                                  <span className="rounded bg-slate-100 px-1 font-semibold tabular-nums">
                                    {pp.placar}
                                  </span>
                                ) : pp.posicao !== null ? (
                                  <span className="rounded bg-slate-100 px-1 font-semibold tabular-nums">
                                    {pp.posicao}º
                                  </span>
                                ) : null}
                              </span>
                            ))}
                          </div>
                        )}
                      </Td>
                      <Td className="text-xs">
                        {ROTULO_FASE[p.fase] ?? p.fase}
                        {p.rodada ? ` · ${p.rodada}ª` : ''}
                      </Td>
                      <Td>
                        <BadgePartida status={p.status} />
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => abrirResultado(p)}>
                            <Swords className="h-4 w-4" /> Resultado
                          </Button>
                          <Link
                            to={`/admin/resultados?categoria=${p.modalidade_categoria_id}`}
                            className="inline-flex h-8 items-center rounded-lg px-2 text-xs font-medium text-brand-700 hover:bg-brand-50"
                            title="Lançar colocação oficial"
                          >
                            <Trophy className="h-4 w-4" />
                          </Link>
                          <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => abrir(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" aria-label="Excluir" onClick={() => setExcluindo(p)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {/* Modal: Nova partida / Editar partida */}
      <Dialog
        open={editando !== null}
        onClose={() => setEditando(null)}
        titulo={editando === 'nova' ? 'Nova partida' : 'Editar partida'}
        descricao={
          editando === 'nova'
            ? 'Escolha a modalidade para exibir automaticamente o formato de seleção de participantes.'
            : 'Altere data, local, fase ou situação da partida.'
        }
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
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Modalidade / categoria" obrigatorio className="sm:col-span-2">
              <Select
                value={form.modalidade_categoria_id}
                onChange={(e) => aoTrocarCategoriaForm(e.target.value)}
              >
                <option value="">Selecione…</option>
                {gruposCategorias.map((g) => (
                  <optgroup key={g.nome} label={g.nome}>
                    {g.itens.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                        {c.min_participantes_partida === null ? ' (mínimo não definido)' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>

            <Field label="Data e hora" hint="Fuso de Belém (UTC−3).">
              <Input
                type="datetime-local"
                value={form.data_hora}
                onChange={(e) => setForm({ ...form, data_hora: e.target.value })}
              />
            </Field>
            <Field label="Local">
              <Select value={form.local_id} onChange={(e) => setForm({ ...form, local_id: e.target.value })}>
                <option value="">Não definido</option>
                {locais.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fase">
              <Select value={form.fase} onChange={(e) => setForm({ ...form, fase: e.target.value })}>
                {FASES.map((f) => (
                  <option key={f} value={f}>
                    {ROTULO_FASE[f]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Rodada" hint="Opcional.">
              <Input
                type="number"
                min={1}
                value={form.rodada}
                onChange={(e) => setForm({ ...form, rodada: e.target.value })}
              />
            </Field>
            <Field label="Situação">
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as StatusPartida })}
              >
                {STATUS_PARTIDA.map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.rotulo}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Observações" className="sm:col-span-2">
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </Field>
          </div>

          {editando === 'nova' && categoriaForm ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {formatoForm === 'mesa'
                        ? 'Composição da mesa'
                        : formatoForm === 'individual_confronto'
                          ? 'Confronto de atletas'
                          : formatoForm === 'individual_bateria'
                            ? 'Atletas da bateria'
                            : 'Equipes / turmas participantes'}
                    </h3>
                    <BadgeFormato formato={formatoForm} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{infoFormatoForm.descricao}</p>
                </div>
                {formatoForm === 'mesa' ? (
                  <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    {slotsCriacao.filter((s) => Boolean(s.estudante_id)).length} / 4 atletas
                  </span>
                ) : null}
              </div>

              {formatoForm === 'coletiva' ? (
                <div className="space-y-2">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {slotsCriacao.map((slot, idx) => {
                      const outrasTurmas = new Set(
                        slotsCriacao.filter((_, i) => i !== idx).map((s) => s.turma_id).filter(Boolean),
                      )
                      return (
                        <div key={`turma-${idx}`} className="flex items-end gap-1.5">
                          <Field label={`Turma / equipe ${idx + 1}`} className="flex-1">
                            <Select
                              value={slot.turma_id}
                              onChange={(e) =>
                                atualizarSlotCriacao(idx, { turma_id: e.target.value, estudante_id: '' })
                              }
                            >
                              <option value="">A definir…</option>
                              {turmas.map((t) => (
                                <option key={t.id} value={t.id} disabled={outrasTurmas.has(t.id)}>
                                  {t.numero}
                                  {t.nome_equipe ? ` · ${t.nome_equipe}` : ''}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          {slotsCriacao.length > 2 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label="Remover turma"
                              onClick={() => removerSlotCriacao(idx)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={adicionarSlotCriacao}
                    disabled={slotsCriacao.length >= turmas.length}
                  >
                    <Plus className="h-4 w-4" /> Adicionar outra turma
                  </Button>
                </div>
              ) : formatoForm === 'individual_confronto' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[0, 1].map((idx) => {
                    const slot = slotsCriacao[idx] ?? { turma_id: '', estudante_id: '' }
                    const outrosIds = new Set(
                      slotsCriacao.filter((_, i) => i !== idx).map((s) => s.estudante_id).filter(Boolean),
                    )
                    return (
                      <div key={`confronto-${idx}`} className="rounded-lg border border-slate-200 bg-white p-3">
                        <SeletorAtleta
                          rotulo={idx === 0 ? 'Primeiro atleta' : 'Segundo atleta'}
                          valor={slot.estudante_id}
                          atletas={atletas}
                          inscritosNaCategoria={inscritosCategoriaForm}
                          excluirIds={outrosIds}
                          placeholder={idx === 0 ? 'Buscar primeiro atleta…' : 'Buscar segundo atleta…'}
                          aoSelecionar={(atleta) =>
                            atualizarSlotCriacao(idx, {
                              estudante_id: atleta?.id ?? '',
                              turma_id: atleta?.turma_id ?? '',
                            })
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              ) : formatoForm === 'mesa' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((idx) => {
                    const slot = slotsCriacao[idx] ?? { turma_id: '', estudante_id: '' }
                    const outrosIds = new Set(
                      slotsCriacao.filter((_, i) => i !== idx).map((s) => s.estudante_id).filter(Boolean),
                    )
                    return (
                      <div key={`mesa-${idx}`} className="rounded-lg border border-slate-200 bg-white p-3">
                        <SeletorAtleta
                          rotulo={`Jogador ${idx + 1}`}
                          valor={slot.estudante_id}
                          atletas={atletas}
                          inscritosNaCategoria={inscritosCategoriaForm}
                          excluirIds={outrosIds}
                          placeholder={`Selecionar jogador ${idx + 1}…`}
                          aoSelecionar={(atleta) =>
                            atualizarSlotCriacao(idx, {
                              estudante_id: atleta?.id ?? '',
                              turma_id: atleta?.turma_id ?? '',
                            })
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {slotsCriacao.map((slot, idx) => {
                      const outrosIds = new Set(
                        slotsCriacao.filter((_, i) => i !== idx).map((s) => s.estudante_id).filter(Boolean),
                      )
                      return (
                        <div
                          key={`bateria-${idx}`}
                          className="relative rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <SeletorAtleta
                            rotulo={`Atleta ${idx + 1}`}
                            valor={slot.estudante_id}
                            atletas={atletas}
                            inscritosNaCategoria={inscritosCategoriaForm}
                            excluirIds={outrosIds}
                            placeholder="Selecionar atleta…"
                            aoSelecionar={(atleta) =>
                              atualizarSlotCriacao(idx, {
                                estudante_id: atleta?.id ?? '',
                                turma_id: atleta?.turma_id ?? '',
                              })
                            }
                          />
                          {slotsCriacao.length > 2 ? (
                            <button
                              type="button"
                              onClick={() => removerSlotCriacao(idx)}
                              className="mt-2 text-[11px] font-medium text-red-600 hover:underline"
                            >
                              Remover vaga
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={adicionarSlotCriacao}>
                    <Plus className="h-4 w-4" /> Adicionar atleta à bateria
                  </Button>
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                Você pode definir os participantes agora ou deixar em branco para preencher depois em{' '}
                <strong>Resultado</strong>.
              </p>
            </div>
          ) : null}

          {erroForm ? <Aviso tom="erro">{erroForm}</Aviso> : null}
        </div>
      </Dialog>

      {/* Modal: Participantes e resultado */}
      <Dialog
        open={gerenciando !== null}
        onClose={() => setGerenciando(null)}
        titulo="Participantes e resultado"
        descricao={
          gerenciando
            ? `${gerenciando.modalidade_categorias?.modalidades?.nome ?? ''} · ${
                gerenciando.modalidade_categorias?.nome ?? ''
              }${
                gerenciando.modalidade_categorias?.min_participantes_partida
                  ? ` · mínimo ${gerenciando.modalidade_categorias.min_participantes_partida}`
                  : ''
              }`
            : ''
        }
        largura="lg"
        rodape={
          gerenciando ? (
            <>
              <Button variant="outline" onClick={() => setGerenciando(null)} disabled={salvandoPartida}>
                Fechar
              </Button>
              <Button onClick={salvarResultado} loading={salvandoPartida}>
                Salvar
              </Button>
            </>
          ) : null
        }
      >
        {gerenciando ? (
          <div className="space-y-3">
            {erroPartida ? <Aviso tom="erro">{erroPartida}</Aviso> : null}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <BadgeFormato formato={formatoGerenciando} />
                  {formatoGerenciando === 'mesa' ? (
                    <span className="text-xs font-semibold text-slate-700">
                      {linhas.filter((l) => Boolean(l.estudante_id)).length} / 4 atletas na mesa
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500">{infoFormatoGerenciando.descricao}</p>
              </div>

              {infoFormatoGerenciando.usaAtletas &&
              formatoGerenciando !== 'individual_confronto' &&
              (!infoFormatoGerenciando.maxParticipantes ||
                linhas.length < infoFormatoGerenciando.maxParticipantes) ? (
                <Button variant="outline" size="sm" onClick={adicionarLinhaAtleta}>
                  <Plus className="h-4 w-4" />
                  {formatoGerenciando === 'mesa' ? 'Adicionar jogador' : 'Adicionar atleta'}
                </Button>
              ) : null}
            </div>

            {infoFormatoGerenciando.usaAtletas &&
            linhas.some((l) => !l.estudante_id && Boolean(l.turma_id)) ? (
              <Aviso tom="atencao">
                Esta partida possui participantes cadastrados como turma. Selecione os atletas correspondentes abaixo
                para atualizar para o formato individual.
              </Aviso>
            ) : null}

            {linhas.length === 0 ? (
              <Aviso tom="info">
                {formatoGerenciando === 'mesa'
                  ? 'Adicione de 2 a 4 atletas para montar esta mesa.'
                  : infoFormatoGerenciando.usaAtletas
                    ? 'Adicione os atletas que vão competir nesta partida.'
                    : 'Adicione as turmas participantes desta partida.'}
              </Aviso>
            ) : null}

            <div className="space-y-3">
              {linhas.map((l, idx) => {
                const outrosIdsAtleta = new Set(
                  linhas.filter((_, i) => i !== idx).map((x) => x.estudante_id).filter(Boolean),
                )
                const outrasTurmas = new Set(
                  linhas.filter((_, i) => i !== idx).map((x) => x.turma_id).filter(Boolean),
                )
                const rotuloAtleta =
                  formatoGerenciando === 'individual_confronto'
                    ? idx === 0
                      ? 'Primeiro atleta'
                      : 'Segundo atleta'
                    : formatoGerenciando === 'mesa'
                      ? `Jogador ${idx + 1}`
                      : `Atleta ${idx + 1}`

                return (
                  <div key={l.id ?? `nova-${idx}`} className="rounded-xl border border-slate-200 p-3">
                    {infoFormatoGerenciando.usaAtletas ? (
                      <div className="mb-3 flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <SeletorAtleta
                            rotulo={rotuloAtleta}
                            obrigatorio
                            valor={l.estudante_id}
                            atletas={atletas}
                            inscritosNaCategoria={inscritosCategoriaGerenciando}
                            excluirIds={outrosIdsAtleta}
                            aoSelecionar={(atleta) => selecionarAtletaNaLinha(idx, atleta)}
                          />
                        </div>
                        {formatoGerenciando !== 'individual_confronto' || linhas.length > 2 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-5"
                            aria-label="Remover atleta"
                            onClick={() => removerLinha(idx)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-end gap-2">
                      {!infoFormatoGerenciando.usaAtletas ? (
                        <Field label="Turma" className="min-w-[180px] flex-1">
                          <Select
                            value={l.turma_id}
                            onChange={(e) => atualizarLinha(idx, 'turma_id', e.target.value)}
                          >
                            <option value="">Selecione…</option>
                            {turmas.map((t) => (
                              <option key={t.id} value={t.id} disabled={outrasTurmas.has(t.id)}>
                                {t.numero}
                                {t.nome_equipe ? ` · ${t.nome_equipe}` : ''}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      ) : null}
                      <Field label="Placar" className="w-20">
                        <Input
                          type="number"
                          value={l.placar}
                          onChange={(e) => atualizarLinha(idx, 'placar', e.target.value)}
                        />
                      </Field>
                      <Field label="Tempo" className="w-20">
                        <Input
                          type="number"
                          step="0.01"
                          value={l.tempo}
                          onChange={(e) => atualizarLinha(idx, 'tempo', e.target.value)}
                        />
                      </Field>
                      <Field label="Pontos" className="w-20">
                        <Input
                          type="number"
                          step="0.01"
                          value={l.pontuacao}
                          onChange={(e) => atualizarLinha(idx, 'pontuacao', e.target.value)}
                        />
                      </Field>
                      <Field label="Posição" className="w-20">
                        <Input
                          type="number"
                          value={l.posicao}
                          onChange={(e) => atualizarLinha(idx, 'posicao', e.target.value)}
                        />
                      </Field>
                      <Field label="Vencedor" className="w-32">
                        <Select
                          value={l.vencedor}
                          onChange={(e) => atualizarLinha(idx, 'vencedor', e.target.value)}
                        >
                          <option value="">—</option>
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </Select>
                      </Field>
                      {!infoFormatoGerenciando.usaAtletas ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Remover turma"
                          onClick={() => removerLinha(idx)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      ) : null}
                    </div>
                    <Field label="Observação" className="mt-2">
                      <Input
                        value={l.observacao}
                        onChange={(e) => atualizarLinha(idx, 'observacao', e.target.value)}
                        placeholder="Opcional"
                      />
                    </Field>
                  </div>
                )
              })}
            </div>

            {!infoFormatoGerenciando.usaAtletas ? (
              <Button variant="outline" onClick={adicionarLinhaTurma} disabled={linhas.length >= turmas.length}>
                <Plus className="h-4 w-4" /> Adicionar turma
              </Button>
            ) : formatoGerenciando === 'mesa' && linhas.length < 4 ? (
              <Button variant="outline" onClick={adicionarLinhaAtleta}>
                <Plus className="h-4 w-4" /> Adicionar jogador à mesa ({linhas.length}/4)
              </Button>
            ) : formatoGerenciando === 'individual_bateria' ? (
              <Button variant="outline" onClick={adicionarLinhaAtleta}>
                <Plus className="h-4 w-4" /> Adicionar atleta à bateria
              </Button>
            ) : null}
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={conflitos !== null}
        onClose={() => setConflitos(null)}
        titulo="Conflitos de horário"
        descricao="Turmas ou atletas com duas partidas no mesmo horário, ou dois jogos no mesmo local."
        largura="lg"
      >
        {(conflitos ?? []).length === 0 ? (
          <Aviso tom="sucesso">Nenhum conflito encontrado na programação atual.</Aviso>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Tipo</Th>
                <Th>Horário</Th>
                <Th>Referência</Th>
                <Th>Detalhe</Th>
              </tr>
            </thead>
            <tbody>
              {(conflitos ?? []).map((c, i) => (
                <tr key={`${c.tipo}-${i}`}>
                  <Td>
                    <Badge tom={c.tipo === 'local' ? 'ambar' : c.tipo === 'atleta' ? 'roxo' : 'vermelho'}>
                      {c.tipo}
                    </Badge>
                  </Td>
                  <Td className="text-xs tabular-nums">{formatarDataHora(c.data_hora)}</Td>
                  <Td className="text-xs font-medium">{c.referencia}</Td>
                  <Td className="text-xs text-slate-600">{c.detalhe}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Dialog>

      <ConfirmDialog
        open={excluindo !== null}
        titulo="Excluir partida"
        descricao="A partida e seus participantes serão removidos. Esta ação não pode ser desfeita."
        confirmar="Excluir"
        loading={removendo}
        onConfirm={excluir}
        onClose={() => setExcluindo(null)}
      />
    </>
  )
}
