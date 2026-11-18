import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Inbox, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { StatusPartida } from '@/lib/types'
import { contrasteTexto, rotuloStatus } from './utils'

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
}

export function Section({
  eyebrow,
  titulo,
  descricao,
  acao,
  children,
  id,
  className,
}: {
  eyebrow?: string
  titulo: string
  descricao?: string
  acao?: ReactNode
  children: ReactNode
  id?: string
  className?: string
}) {
  return (
    <section id={id} className={cn('py-10 sm:py-14', className)}>
      <Container>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            {eyebrow ? (
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="font-display text-3xl font-bold uppercase leading-none tracking-tight text-noite-900 sm:text-4xl">
              {titulo}
            </h2>
            {descricao ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{descricao}</p> : null}
          </div>
          {acao}
        </div>
        {children}
      </Container>
    </section>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-noite-900/10 bg-white shadow-[0_10px_30px_-18px_rgba(8,40,74,0.35)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PageHero({
  chapeu,
  titulo,
  descricao,
  children,
}: {
  chapeu: string
  titulo: string
  descricao?: string
  children?: ReactNode
}) {
  return (
    <header className="relative overflow-hidden bg-noite-950 text-white">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(80% 120% at 15% 0%, rgba(236,77,9,0.35) 0%, rgba(236,77,9,0) 55%), radial-gradient(60% 90% at 85% 10%, rgba(69,181,247,0.25) 0%, rgba(69,181,247,0) 60%)',
        }}
      />
      <Container className="relative py-10 sm:py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-300">{chapeu}</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl">
          {titulo}
        </h1>
        {descricao ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">{descricao}</p> : null}
        {children ? <div className="mt-5">{children}</div> : null}
      </Container>
    </header>
  )
}

const BOTOES = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  navy: 'bg-noite-800 text-white hover:bg-noite-900',
  outline: 'border border-noite-900/15 bg-white text-noite-900 hover:bg-areia-100',
  ghost: 'text-noite-800 hover:bg-noite-900/5',
} as const

export function BotaoLink({
  to,
  children,
  variant = 'primary',
  className,
  externo,
}: {
  to: string
  children: ReactNode
  variant?: keyof typeof BOTOES
  className?: string
  externo?: boolean
}) {
  const classes = cn(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
    BOTOES[variant],
    className,
  )
  if (externo) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className={classes}>
        {children}
      </a>
    )
  }
  return (
    <Link to={to} className={classes}>
      {children}
    </Link>
  )
}

export function VerTudo({ to, texto = 'Ver tudo' }: { to: string; texto?: string }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-900"
    >
      {texto} <ArrowRight className="h-4 w-4" />
    </Link>
  )
}

const TONS_STATUS: Record<string, string> = {
  programado: 'border-ceu-200 bg-ceu-50 text-ceu-900',
  em_andamento: 'border-brand-300 bg-brand-50 text-brand-900',
  concluido: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  adiado: 'border-amber-200 bg-amber-50 text-amber-900',
  wo: 'border-slate-300 bg-slate-100 text-slate-700',
  cancelado: 'border-red-200 bg-red-50 text-red-800',
}

export function StatusBadge({ status }: { status: StatusPartida | string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
        TONS_STATUS[status] ?? 'border-slate-200 bg-slate-50 text-slate-700',
      )}
    >
      {status === 'em_andamento' ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-600" /> : null}
      {rotuloStatus(status)}
    </span>
  )
}

export function Medalha({ posicao, className }: { posicao: number; className?: string }) {
  const estilo =
    posicao === 1
      ? 'bg-ouro-400 text-noite-950'
      : posicao === 2
        ? 'bg-slate-200 text-slate-800'
        : posicao === 3
          ? 'bg-[#d9a273] text-noite-950'
          : 'bg-slate-100 text-slate-600'
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-lg font-extrabold leading-none',
        estilo,
        className,
      )}
      aria-label={`${posicao}º lugar`}
    >
      {posicao}
    </span>
  )
}

export function NumeroTurma({
  numero,
  cor,
  className,
}: {
  numero: number
  cor?: string | null
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-noite-900 px-2 font-display text-lg font-extrabold leading-none text-white',
        className,
      )}
      style={cor ? { backgroundColor: cor, color: contrasteTexto(cor) } : undefined}
    >
      {numero}
    </span>
  )
}

export function Vazio({
  titulo,
  texto,
  icone,
}: {
  titulo: string
  texto?: string
  icone?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-noite-900/15 bg-white/60 px-6 py-12 text-center">
      <div className="mb-1 text-noite-300">{icone ?? <Inbox className="h-7 w-7" />}</div>
      <p className="font-display text-xl font-bold uppercase tracking-wide text-noite-800">{titulo}</p>
      {texto ? <p className="max-w-md text-sm leading-relaxed text-slate-500">{texto}</p> : null}
    </div>
  )
}

export function CarregandoPublico({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
      {texto}
    </div>
  )
}

export function Rotulo({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{children}</span>
  )
}

export function ErroPublico({ mensagem, onRecarregar }: { mensagem: string; onRecarregar: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
      <p className="font-semibold">Não foi possível carregar estas informações.</p>
      <p className="mt-1 text-red-700">{mensagem}</p>
      <button
        type="button"
        onClick={onRecarregar}
        className="mt-3 rounded-lg bg-red-800 px-3 py-2 text-xs font-semibold text-white hover:bg-red-900"
      >
        Tentar novamente
      </button>
    </div>
  )
}
