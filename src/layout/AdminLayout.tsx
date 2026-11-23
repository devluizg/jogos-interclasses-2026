import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Award,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  Medal,
  Menu,
  Settings,
  ShieldAlert,
  Table2,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/cn'

const GRUPOS = [
  {
    titulo: 'Visão geral',
    itens: [{ para: '/admin', rotulo: 'Painel', icone: LayoutDashboard, fim: true }],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { para: '/admin/turmas', rotulo: 'Turmas', icone: Users },
      { para: '/admin/estudantes', rotulo: 'Estudantes', icone: GraduationCap },
      { para: '/admin/modalidades', rotulo: 'Modalidades', icone: Trophy },
    ],
  },
  {
    titulo: 'Competição',
    itens: [
      { para: '/admin/inscricoes', rotulo: 'Inscrições', icone: ClipboardList },
      { para: '/admin/partidas', rotulo: 'Partidas', icone: CalendarDays },
      { para: '/admin/chaveamentos', rotulo: 'Chaveamentos', icone: Table2 },
      { para: '/admin/resultados', rotulo: 'Resultados', icone: Medal },
      { para: '/admin/conduta', rotulo: 'Conduta', icone: ShieldAlert },
      { para: '/admin/taca', rotulo: 'Taça Protagonista', icone: Award },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [
      { para: '/admin/configuracoes', rotulo: 'Configurações', icone: Settings },
      { para: '/admin/conteudo', rotulo: 'Conteúdo', icone: FileText },
      { para: '/admin/historico', rotulo: 'Histórico', icone: History },
    ],
  },
]

function Navegacao({ aoNavegar }: { aoNavegar?: () => void }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {grupo.titulo}
          </p>
          <div className="space-y-0.5">
            {grupo.itens.map((item) => (
              <NavLink
                key={item.para}
                to={item.para}
                end={'fim' in item ? item.fim : false}
                onClick={aoNavegar}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-900 ring-1 ring-inset ring-brand-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )
                }
              >
                <item.icone className="h-4 w-4 shrink-0" />
                {item.rotulo}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

function Marca() {
  return (
    <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-4">
      <img
        src="/brand/brasao-192.png"
        alt="Brasão da Escola Estadual Celso Rodrigues"
        className="h-10 w-10 shrink-0 rounded-full object-contain"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">Jogos Interclasses</p>
        <p className="text-[11px] text-slate-500">Celso Rodrigues · 2026</p>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const { session, sair, isAdmin } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)
  const local = useLocation()

  return (
    <div className="min-h-screen lg:flex">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <Marca />
        <Navegacao />
        <div className="border-t border-slate-200 px-4 py-3">
          <p className="truncate text-xs font-medium text-slate-700">{session?.user?.email}</p>
          <p className="text-[11px] text-slate-400">{isAdmin === false ? 'Sem permissão' : 'Administrador'}</p>
          <button
            type="button"
            onClick={() => void sair()}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-700"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </aside>

      {menuAberto ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setMenuAberto(false)} />
          <aside className="relative flex h-full w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200">
              <Marca />
              <button
                type="button"
                aria-label="Fechar menu"
                className="mr-3 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                onClick={() => setMenuAberto(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Navegacao aoNavegar={() => setMenuAberto(false)} />
            <button
              type="button"
              onClick={() => void sair()}
              className="flex items-center gap-2 border-t border-slate-200 px-5 py-3 text-sm text-slate-600 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </aside>
        </div>
      ) : null}

      <div className="min-w-0 flex-1 lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menu"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setMenuAberto(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Painel da organização</p>
              <p className="truncate text-sm font-medium text-slate-800">
                {local.pathname === '/admin' ? 'Visão geral' : 'Jogos Interclasses 2026'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline">{session?.user?.email}</span>
            <button
              type="button"
              onClick={() => void sair()}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-700"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
