import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/* Botão                                                               */
/* ------------------------------------------------------------------ */

type Variante = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Tamanho = 'sm' | 'md' | 'lg'

const VARIANTES: Record<Variante, string> = {
  primary:
    'bg-brand-700 text-white shadow-sm hover:bg-brand-800 active:bg-brand-900 disabled:bg-brand-700/50',
  secondary: 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-900/50',
  outline: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50',
}

const TAMANHOS: Record<Tamanho, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variante
  size?: Tamanho
  loading?: boolean
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTES[variant],
        TAMANHOS[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Campos                                                              */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  erro,
  obrigatorio,
  children,
  className,
}: {
  label?: string
  hint?: string
  erro?: string | null
  obrigatorio?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      {label ? (
        <label className="label">
          {label}
          {obrigatorio ? <span className="ml-0.5 text-red-600">*</span> : null}
        </label>
      ) : null}
      {children}
      {erro ? <p className="mt-1 text-xs text-red-600">{erro}</p> : null}
      {!erro && hint ? <p className="hint">{hint}</p> : null}
    </div>
  )
}

export const inputBase =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-600'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, 'h-10', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, 'h-10 pr-8', className)} {...props}>
      {children}
    </select>
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, 'min-h-[84px]', className)} {...props} />
}

export function Checkbox({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-2 text-sm text-slate-700', className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 accent-brand-700"
        {...props}
      />
      <span>{label}</span>
    </label>
  )
}

/* ------------------------------------------------------------------ */
/* Cartões, selos e tabelas                                            */
/* ------------------------------------------------------------------ */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-card', className)}>
      {children}
    </div>
  )
}

export function CardHeader({
  titulo,
  descricao,
  acoes,
}: {
  titulo: ReactNode
  descricao?: ReactNode
  acoes?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
        {descricao ? <p className="mt-0.5 text-xs text-slate-500">{descricao}</p> : null}
      </div>
      {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
    </div>
  )
}

type Tom = 'cinza' | 'verde' | 'ambar' | 'vermelho' | 'azul' | 'roxo'

const TONS: Record<Tom, string> = {
  cinza: 'bg-slate-100 text-slate-700 ring-slate-200',
  verde: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  ambar: 'bg-amber-50 text-amber-800 ring-amber-200',
  vermelho: 'bg-red-50 text-red-700 ring-red-200',
  azul: 'bg-sky-50 text-sky-800 ring-sky-200',
  roxo: 'bg-violet-50 text-violet-800 ring-violet-200',
}

export function Badge({
  children,
  tom = 'cinza',
  className,
}: {
  children: ReactNode
  tom?: Tom
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        TONS[tom],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="table-wrap">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn('border-b border-slate-100 px-4 py-3 align-middle text-slate-700', className)}>
      {children}
    </td>
  )
}

/* ------------------------------------------------------------------ */
/* Diálogo                                                             */
/* ------------------------------------------------------------------ */

export function Dialog({
  open,
  onClose,
  titulo,
  descricao,
  children,
  rodape,
  largura = 'md',
}: {
  open: boolean
  onClose: () => void
  titulo: ReactNode
  descricao?: ReactNode
  children: ReactNode
  rodape?: ReactNode
  largura?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = anterior
    }
  }, [open, onClose])

  if (!open) return null

  const larguras = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl',
          larguras[largura],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{titulo}</h3>
            {descricao ? <p className="mt-1 text-xs text-slate-500">{descricao}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {rodape ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
            {rodape}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  titulo = 'Confirmar ação',
  descricao,
  confirmar = 'Confirmar',
  tom = 'danger',
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean
  titulo?: string
  descricao: ReactNode
  confirmar?: string
  tom?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titulo={titulo}
      largura="sm"
      rodape={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={tom === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmar}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="mt-0.5 rounded-full bg-amber-50 p-2 text-amber-700 ring-1 ring-amber-200">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="text-sm leading-relaxed text-slate-700">{descricao}</div>
      </div>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Estados                                                             */
/* ------------------------------------------------------------------ */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand-700', className)} />
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-slate-500">
      <Spinner />
      {texto}
    </div>
  )
}

export function ErroBox({ mensagem, onRetry }: { mensagem: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 shrink-0" />
        <span>{mensagem}</span>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  )
}

export function EmptyState({
  titulo,
  descricao,
  acao,
  icone,
}: {
  titulo: string
  descricao?: string
  acao?: ReactNode
  icone?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icone ? <div className="mb-1 text-slate-400">{icone}</div> : null}
      <p className="text-sm font-medium text-slate-800">{titulo}</p>
      {descricao ? <p className="max-w-md text-xs leading-relaxed text-slate-500">{descricao}</p> : null}
      {acao ? <div className="mt-2">{acao}</div> : null}
    </div>
  )
}

export function Aviso({
  tom = 'info',
  titulo,
  children,
}: {
  tom?: 'info' | 'atencao' | 'erro' | 'sucesso'
  titulo?: string
  children: ReactNode
}) {
  const estilos = {
    info: { box: 'border-sky-200 bg-sky-50 text-sky-900', Icone: Info },
    atencao: { box: 'border-amber-200 bg-amber-50 text-amber-900', Icone: AlertTriangle },
    erro: { box: 'border-red-200 bg-red-50 text-red-900', Icone: XCircle },
    sucesso: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', Icone: CheckCircle2 },
  }[tom]

  return (
    <div className={cn('flex gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm', estilos.box)}>
      <estilos.Icone className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        {titulo ? <p className="font-medium">{titulo}</p> : null}
        <div className={cn('leading-relaxed', titulo && 'mt-0.5')}>{children}</div>
      </div>
    </div>
  )
}

export function PageHeader({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string
  descricao?: string
  acoes?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{titulo}</h1>
        {descricao ? <p className="mt-1 max-w-3xl text-sm text-slate-500">{descricao}</p> : null}
      </div>
      {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

type TipoToast = 'sucesso' | 'erro' | 'info'
type Toast = { id: number; mensagem: string; tipo: TipoToast }

const ToastContext = createContext<{ notificar: (mensagem: string, tipo?: TipoToast) => void } | null>(
  null,
)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notificar = useCallback((mensagem: string, tipo: TipoToast = 'sucesso') => {
    const id = Date.now() + Math.random()
    setToasts((atuais) => [...atuais, { id, mensagem, tipo }])
    window.setTimeout(() => {
      setToasts((atuais) => atuais.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const valor = useMemo(() => ({ notificar }), [notificar])

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg',
              t.tipo === 'sucesso' && 'border-emerald-200',
              t.tipo === 'erro' && 'border-red-200',
              t.tipo === 'info' && 'border-sky-200',
            )}
          >
            {t.tipo === 'sucesso' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : t.tipo === 'erro' ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            )}
            <span className="leading-snug text-slate-700">{t.mensagem}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de ToastProvider')
  return ctx
}
