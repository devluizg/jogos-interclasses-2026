import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  Home,
  Medal,
  Menu,
  Newspaper,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { cfgBooleano, useConfig } from './hooks'
import { usePwaInstall } from './usePwaInstall'

const PRINCIPAIS = [
  { para: '/', rotulo: 'Início', icone: Home, fim: true },
  { para: '/programacao', rotulo: 'Jogos', icone: CalendarDays },
  { para: '/classificacao', rotulo: 'Tabela', icone: Trophy },
  { para: '/resultados', rotulo: 'Placar', icone: Medal },
]

const CAMINHOS_MAIS = ['/modalidades', '/noticias', '/documentos', '/taca']

function BotaoInstalar() {
  const { podeInstalar, instalado, ios, instalar } = usePwaInstall()

  if (instalado) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-4 w-4 shrink-0" /> App instalado neste celular
      </div>
    )
  }

  if (podeInstalar) {
    return (
      <button
        type="button"
        onClick={() => void instalar()}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] hover:bg-brand-700"
      >
        <Download className="h-4 w-4" /> Instalar aplicativo
      </button>
    )
  }

  if (ios) {
    return (
      <p className="rounded-xl bg-ceu-50 px-3 py-2.5 text-xs leading-relaxed text-ceu-900 ring-1 ring-ceu-200">
        No iPhone: toque em <strong>Compartilhar</strong> e depois em{' '}
        <strong>Adicionar à Tela de Início</strong>.
      </p>
    )
  }

  return (
    <p className="rounded-xl bg-areia-100 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
      Para instalar, abra o menu do navegador e escolha <strong>Instalar aplicativo</strong> ou{' '}
      <strong>Adicionar à tela inicial</strong>.
    </p>
  )
}

export default function MobileNav() {
  const { configs } = useConfig()
  const tacaPublicada = cfgBooleano(configs, 'taca_publicada')
  const { pathname } = useLocation()
  const [aberto, setAberto] = useState(false)
  const [dragY, setDragY] = useState(0)
  const fecharRef = useRef<HTMLButtonElement>(null)
  const inicioToque = useRef<number | null>(null)

  const extras = [
    { para: '/modalidades', rotulo: 'Modalidades', icone: Trophy },
    { para: '/noticias', rotulo: 'Notícias', icone: Newspaper },
    { para: '/documentos', rotulo: 'Documentos', icone: FileText },
    ...(tacaPublicada
      ? [{ para: '/taca', rotulo: 'Taça Protagonista', icone: Sparkles }]
      : []),
  ]

  const maisAtivo = CAMINHOS_MAIS.some((caminho) => pathname.startsWith(caminho))

  useEffect(() => {
    setAberto(false)
    setDragY(0)
  }, [pathname])

  useEffect(() => {
    if (!aberto) return
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    fecharRef.current?.focus()

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAberto(false)
    }

    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.body.style.overflow = overflowAnterior
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  function aoMoverArrasto(evento: React.TouchEvent) {
    if (inicioToque.current === null) return
    const atual = evento.touches[0]?.clientY
    if (atual === undefined) return
    const delta = atual - inicioToque.current
    if (delta > 0) setDragY(delta)
  }

  function aoTerminarArrasto() {
    if (dragY > 70) {
      setAberto(false)
    }
    setDragY(0)
    inicioToque.current = null
  }

  return (
    <>
      <nav
        aria-label="Navegação rápida"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-noite-900/10 bg-white/95 shadow-[0_-12px_35px_-26px_rgba(3,17,31,0.65)] backdrop-blur lg:hidden"
        style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {PRINCIPAIS.map((link) => (
            <NavLink
              key={link.para}
              to={link.para}
              end={link.fim}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-colors',
                  isActive ? 'text-brand-700' : 'text-slate-500 active:bg-areia-100',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <link.icone className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                  <span>{link.rotulo}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setAberto(true)}
            aria-expanded={aberto}
            aria-controls="menu-mais"
            className={cn(
              'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-colors',
              maisAtivo ? 'text-brand-700' : 'text-slate-500 active:bg-areia-100',
            )}
          >
            <Menu className={cn('h-5 w-5', maisAtivo && 'stroke-[2.5]')} />
            <span>Mais</span>
          </button>
        </div>
      </nav>

      {aberto ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setAberto(false)}
            className="fade-in absolute inset-0 bg-noite-950/55 backdrop-blur-[2px]"
          />
          <section
            id="menu-mais"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-mais"
            style={dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
            className="sheet-up absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-areia-50 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl transition-transform"
          >
            <div
              onTouchStart={(evento) => {
                inicioToque.current = evento.touches[0]?.clientY ?? null
              }}
              onTouchMove={aoMoverArrasto}
              onTouchEnd={aoTerminarArrasto}
              onTouchCancel={() => {
                setDragY(0)
                inicioToque.current = null
              }}
            >
              <div className="flex justify-center pt-3">
                <span className="h-1.5 w-12 rounded-full bg-noite-900/20" />
              </div>
              <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                    Jogos Interclasses 2026
                  </p>
                  <h2 id="titulo-mais" className="font-display text-2xl font-extrabold uppercase text-noite-900">
                    Mais
                  </h2>
                </div>
                <button
                  ref={fecharRef}
                  type="button"
                  aria-label="Fechar menu"
                  onClick={() => setAberto(false)}
                  className="rounded-full bg-white p-2.5 text-slate-500 shadow-sm ring-1 ring-noite-900/10 transition-transform active:scale-95 active:bg-areia-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 px-4">
              <div className="grid grid-cols-2 gap-2.5">
                {extras.map((item) => (
                  <NavLink
                    key={item.para}
                    to={item.para}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-20 flex-col justify-between rounded-2xl border p-3.5 transition-all active:scale-[0.98]',
                        isActive
                          ? 'border-brand-200 bg-brand-50 text-brand-900'
                          : 'border-noite-900/10 bg-white text-noite-900 active:bg-areia-100',
                      )
                    }
                  >
                    <item.icone className="h-5 w-5 text-brand-700" />
                    <span className="text-sm font-semibold leading-tight">{item.rotulo}</span>
                  </NavLink>
                ))}
              </div>

              <div className="rounded-2xl border border-noite-900/10 bg-white p-3.5">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Download className="h-4 w-4" /> Aplicativo
                </p>
                <BotaoInstalar />
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
