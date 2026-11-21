import { useMemo, useState } from 'react'
import { Check, Search, UserRound, X } from 'lucide-react'
import { Badge, Input } from './ui'

export type AtletaOpcao = {
  id: string
  nome_completo: string
  turma_id: string
  turmas?: { numero: number; nome_equipe?: string | null } | null
}

function normalizarTexto(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function SeletorAtleta({
  rotulo,
  obrigatorio,
  valor,
  atletas,
  inscritosNaCategoria,
  excluirIds,
  aoSelecionar,
  placeholder = 'Selecionar atleta…',
}: {
  rotulo: string
  obrigatorio?: boolean
  valor: string
  atletas: AtletaOpcao[]
  inscritosNaCategoria?: Set<string>
  excluirIds: Set<string>
  aoSelecionar: (atleta: AtletaOpcao | null) => void
  placeholder?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [somenteInscritos, setSomenteInscritos] = useState(false)

  const selecionado = useMemo(() => atletas.find((a) => a.id === valor) ?? null, [atletas, valor])
  const temInscritos = (inscritosNaCategoria?.size ?? 0) > 0

  const opcoes = useMemo(() => {
    const termo = normalizarTexto(busca)
    const filtrados = atletas.filter((a) => {
      if (a.id !== valor && excluirIds.has(a.id)) return false
      if (somenteInscritos && temInscritos && !inscritosNaCategoria?.has(a.id)) return false
      if (!termo) return true
      const nome = normalizarTexto(a.nome_completo)
      const turma = a.turmas?.numero !== undefined ? String(a.turmas.numero) : ''
      const equipe = normalizarTexto(a.turmas?.nome_equipe ?? '')
      return nome.includes(termo) || turma.includes(termo) || equipe.includes(termo)
    })

    if (temInscritos && inscritosNaCategoria) {
      filtrados.sort((a, b) => {
        const aIns = inscritosNaCategoria.has(a.id) ? 0 : 1
        const bIns = inscritosNaCategoria.has(b.id) ? 0 : 1
        if (aIns !== bIns) return aIns - bIns
        return a.nome_completo.localeCompare(b.nome_completo)
      })
    }

    return filtrados.slice(0, 60)
  }, [atletas, busca, excluirIds, inscritosNaCategoria, somenteInscritos, temInscritos, valor])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-700">
          {rotulo}
          {obrigatorio ? <span className="ml-0.5 text-red-600">*</span> : null}
        </span>
        {selecionado?.turmas ? (
          <Badge tom="azul">
            Turma {selecionado.turmas.numero}
            {selecionado.turmas.nome_equipe ? ` · ${selecionado.turmas.nome_equipe}` : ''}
          </Badge>
        ) : null}
      </div>

      {selecionado && !aberto ? (
        <div className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
          <UserRound className="h-4 w-4 shrink-0 text-brand-700" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-800">{selecionado.nome_completo}</p>
          </div>
          {inscritosNaCategoria?.has(selecionado.id) ? <Badge tom="verde">Inscrito</Badge> : null}
          <button
            type="button"
            onClick={() => {
              setBusca('')
              setAberto(true)
            }}
            className="rounded px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
          >
            Trocar
          </button>
          <button
            type="button"
            aria-label={`Remover ${rotulo}`}
            onClick={() => aoSelecionar(null)}
            className="rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : !aberto ? (
        <button
          type="button"
          onClick={() => {
            setBusca('')
            setAberto(true)
          }}
          className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 text-left text-sm text-slate-500 transition-colors hover:border-brand-500 hover:text-slate-800"
        >
          <span className="inline-flex items-center gap-2 truncate">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            {placeholder}
          </span>
          <span className="shrink-0 text-[11px] font-medium text-brand-700">Buscar</span>
        </button>
      ) : (
        <div className="rounded-lg border border-brand-300 bg-white p-2 shadow-sm">
          <div className="flex items-center gap-1.5">
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite o nome do atleta ou número da turma…"
              autoFocus
              className="h-9 text-xs"
            />
            <button
              type="button"
              onClick={() => {
                setAberto(false)
                setBusca('')
              }}
              aria-label="Fechar busca"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {temInscritos ? (
            <div className="mt-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSomenteInscritos(false)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                  !somenteInscritos
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos os estudantes
              </button>
              <button
                type="button"
                onClick={() => setSomenteInscritos(true)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                  somenteInscritos
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Inscritos na categoria ({inscritosNaCategoria?.size ?? 0})
              </button>
            </div>
          ) : null}

          <div className="scrollbar-thin mt-2 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {opcoes.length === 0 ? (
              <p className="p-3 text-xs text-slate-500">Nenhum atleta disponível encontrado.</p>
            ) : (
              opcoes.map((a) => {
                const ehAtual = a.id === valor
                const inscrito = inscritosNaCategoria?.has(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      aoSelecionar(a)
                      setAberto(false)
                      setBusca('')
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-brand-50/70 ${
                      ehAtual ? 'bg-brand-50 font-semibold text-brand-900' : 'text-slate-800'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      {ehAtual ? <Check className="h-3.5 w-3.5 shrink-0 text-brand-700" /> : null}
                      <span className="truncate">{a.nome_completo}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {inscrito ? <Badge tom="verde">Inscrito</Badge> : null}
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                        T{a.turmas?.numero ?? '—'}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
