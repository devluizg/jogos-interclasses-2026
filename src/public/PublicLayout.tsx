import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarDays, MapPin, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ConfigProvider, cfgBooleano, cfgTexto, useConfig } from './hooks'
import MobileNav from './MobileNav'
import PwaAtualizacao from './PwaAtualizacao'
import { Container } from './ui'
import { periodoEvento } from './utils'

const LINKS = [
  { para: '/', rotulo: 'Início', fim: true },
  { para: '/programacao', rotulo: 'Programação' },
  { para: '/classificacao', rotulo: 'Classificação' },
  { para: '/resultados', rotulo: 'Resultados' },
  { para: '/medalhas', rotulo: 'Medalhas' },
  { para: '/modalidades', rotulo: 'Modalidades' },
  { para: '/noticias', rotulo: 'Notícias' },
  { para: '/documentos', rotulo: 'Documentos' },
]

function RolarAoTopo() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Navegacao() {
  const { configs } = useConfig()
  const tacaPublicada = cfgBooleano(configs, 'taca_publicada')
  const links = tacaPublicada ? [...LINKS, { para: '/taca', rotulo: 'Taça' }] : LINKS

  return (
    <nav
      aria-label="Navegação principal"
      className="hidden items-center gap-0.5 lg:flex"
    >
      {links.map((link) => (
        <NavLink
          key={link.para}
          to={link.para}
          end={'fim' in link ? link.fim : false}
          className={({ isActive }) =>
            cn(
              'whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors',
              isActive ? 'bg-noite-900 text-white' : 'text-noite-800 hover:bg-noite-900/5',
            )
          }
        >
          {link.rotulo}
        </NavLink>
      ))}
    </nav>
  )
}

function Cabecalho() {
  const { configs } = useConfig()
  const inicio = cfgTexto(configs, 'evento_inicio')
  const fim = cfgTexto(configs, 'evento_fim')
  const local = cfgTexto(configs, 'evento_local', 'Escola Estadual Celso Rodrigues')

  return (
    <header className="sticky top-0 z-40 border-b border-noite-900/10 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="hidden bg-brand-600 text-white sm:block">
        <Container className="flex h-8 items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wide">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> {periodoEvento(inicio, fim)}
          </span>
          <span className="inline-flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5" /> {local}
          </span>
        </Container>
      </div>

      <Container className="flex h-14 items-center justify-between gap-3 sm:h-16">
        <NavLink to="/" className="flex min-w-0 items-center gap-2.5">
          <img
            src="/brand/brasao-192.png"
            alt="Brasão da Escola Estadual Celso Rodrigues"
            width={44}
            height={44}
            decoding="async"
            className="h-9 w-9 shrink-0 object-contain sm:h-11 sm:w-11"
          />
          <span className="min-w-0 leading-none">
            <span className="block truncate font-display text-xl font-extrabold uppercase leading-none tracking-tight text-noite-900 sm:text-2xl">
              Jogos Interclasses
            </span>
            <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
              2026 · Celso Rodrigues
            </span>
          </span>
        </NavLink>
        <Navegacao />
      </Container>

    </header>
  )
}

function Rodape() {
  const { configs } = useConfig()
  const nome = cfgTexto(configs, 'evento_nome', 'Jogos Interclasses 2026')
  const tema = cfgTexto(configs, 'evento_tema')
  const inicio = cfgTexto(configs, 'evento_inicio')
  const fim = cfgTexto(configs, 'evento_fim')

  return (
    <footer className="mt-8 bg-noite-950 text-slate-300">
      <Container className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <img
              src="/brand/brasao-512.png"
              alt="Brasão da Escola Estadual Celso Rodrigues"
              width={56}
              height={56}
              loading="lazy"
              decoding="async"
              className="h-12 w-12 rounded-full bg-white object-contain p-0.5 sm:h-14 sm:w-14"
            />
            <div>
              <p className="font-display text-2xl font-extrabold uppercase leading-none tracking-tight text-white">
                Jogos Interclasses 2026
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-brand-300">
                Escola Estadual Celso Rodrigues
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">{tema || nome}</p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Evento</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand-400" /> {periodoEvento(inicio, fim)}
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" /> Santo Antônio do Tauá/PA
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Portal</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><NavLink to="/programacao" className="hover:text-white">Programação</NavLink></li>
            <li><NavLink to="/classificacao" className="hover:text-white">Classificação</NavLink></li>
            <li><NavLink to="/documentos" className="hover:text-white">Regulamento e anexos</NavLink></li>
            <li>
              <NavLink to="/admin" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white">
                <ShieldCheck className="h-3.5 w-3.5" /> Área da organização
              </NavLink>
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-wrap items-center justify-between gap-2 py-4 text-[11px] text-slate-500">
          <span>Jogos Interclasses 2026 · {periodoEvento(inicio, fim)}</span>
          <span>Feito pela organização do evento</span>
        </Container>
      </div>
    </footer>
  )
}

function AvisoConfig() {
  const { erro, recarregar } = useConfig()
  if (!erro) return null
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
      Não foi possível atualizar as informações agora.{' '}
      <button type="button" onClick={recarregar} className="font-semibold underline">
        Tentar novamente
      </button>
    </div>
  )
}

export default function PublicLayout() {
  return (
    <ConfigProvider>
      <RolarAoTopo />
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-noite-900"
      >
        Pular para o conteúdo
      </a>
      <div className="flex min-h-screen flex-col bg-areia-100 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Cabecalho />
        <AvisoConfig />
        <main id="conteudo" className="flex-1">
          <Outlet />
        </main>
        <Rodape />
        <PwaAtualizacao />
        <MobileNav />
      </div>
    </ConfigProvider>
  )
}
