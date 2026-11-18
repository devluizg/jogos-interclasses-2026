import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AlertOctagon, LogOut, RefreshCw } from 'lucide-react'
import { AuthProvider, useAuth } from '@/auth/AuthContext'
import { Button, Card, Spinner, ToastProvider } from '@/components/ui'
import { supabaseConfigurado } from '@/lib/supabase'
import AdminLayout from '@/layout/AdminLayout'
import Setup from '@/pages/Setup'

const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Turmas = lazy(() => import('@/pages/Turmas'))
const Estudantes = lazy(() => import('@/pages/Estudantes'))
const ModalidadesAdmin = lazy(() => import('@/pages/Modalidades'))
const ModalidadeDetalhe = lazy(() => import('@/pages/ModalidadeDetalhe'))
const Inscricoes = lazy(() => import('@/pages/Inscricoes'))
const Partidas = lazy(() => import('@/pages/Partidas'))
const ResultadosAdmin = lazy(() => import('@/pages/Resultados'))
const Conduta = lazy(() => import('@/pages/Conduta'))
const TacaAdmin = lazy(() => import('@/pages/Taca'))
const Configuracoes = lazy(() => import('@/pages/Configuracoes'))
const Conteudo = lazy(() => import('@/pages/Conteudo'))
const Historico = lazy(() => import('@/pages/Historico'))

const PublicLayout = lazy(() => import('@/public/PublicLayout'))
const Home = lazy(() => import('@/public/Home'))
const Programacao = lazy(() => import('@/public/Programacao'))
const Classificacao = lazy(() => import('@/public/Classificacao'))
const ResultadosPublicos = lazy(() => import('@/public/Resultados'))
const ModalidadesPublicas = lazy(() => import('@/public/Modalidades'))
const ModalidadePublica = lazy(() => import('@/public/ModalidadePublica'))
const Noticias = lazy(() => import('@/public/Noticias'))
const NoticiaPublica = lazy(() => import('@/public/NoticiaPublica'))
const Documentos = lazy(() => import('@/public/Documentos'))
const TacaPublica = lazy(() => import('@/public/Taca'))
const NaoEncontrado = lazy(() => import('@/public/NaoEncontrado'))

function TelaCarregando() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="h-7 w-7" />
    </div>
  )
}

function SemPermissao() {
  const { session, erroAdmin, recarregarAdmin, sair } = useAuth()
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-50 p-2 text-amber-700 ring-1 ring-amber-200">
            <AlertOctagon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Acesso não autorizado</h1>
            <p className="mt-1 text-sm text-slate-600">
              A conta <strong>{session?.user?.email}</strong> não está registrada como
              administradora.
            </p>
            {erroAdmin ? <p className="mt-2 text-xs text-red-700">{erroAdmin}</p> : null}
            <p className="mt-2 text-xs text-slate-500">
              Registre o usuário na tabela <code>admins</code> ou peça acesso à organização.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void recarregarAdmin()}>
                <RefreshCw className="h-4 w-4" /> Verificar novamente
              </Button>
              <Button variant="ghost" onClick={() => void sair()}>
                <LogOut className="h-4 w-4" /> Sair
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function Protegido() {
  const { carregando, session, isAdmin } = useAuth()

  if (carregando) return <TelaCarregando />
  if (!session) return <Navigate to="/admin/login" replace />
  if (isAdmin === null) return <TelaCarregando />
  if (!isAdmin) return <SemPermissao />

  return <AdminLayout />
}

export default function App() {
  if (!supabaseConfigurado) return <Setup />

  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<TelaCarregando />}>
          <Routes>
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={<Protegido />}>
              <Route index element={<Dashboard />} />
              <Route path="turmas" element={<Turmas />} />
              <Route path="estudantes" element={<Estudantes />} />
              <Route path="modalidades" element={<ModalidadesAdmin />} />
              <Route path="modalidades/:id" element={<ModalidadeDetalhe />} />
              <Route path="inscricoes" element={<Inscricoes />} />
              <Route path="partidas" element={<Partidas />} />
              <Route path="resultados" element={<ResultadosAdmin />} />
              <Route path="conduta" element={<Conduta />} />
              <Route path="taca" element={<TacaAdmin />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="conteudo" element={<Conteudo />} />
              <Route path="historico" element={<Historico />} />
            </Route>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/programacao" element={<Programacao />} />
              <Route path="/classificacao" element={<Classificacao />} />
              <Route path="/resultados" element={<ResultadosPublicos />} />
              <Route path="/modalidades" element={<ModalidadesPublicas />} />
              <Route path="/modalidades/:slug" element={<ModalidadePublica />} />
              <Route path="/noticias" element={<Noticias />} />
              <Route path="/noticias/:slug" element={<NoticiaPublica />} />
              <Route path="/documentos" element={<Documentos />} />
              <Route path="/taca" element={<TacaPublica />} />
              <Route path="*" element={<NaoEncontrado />} />
            </Route>
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}
