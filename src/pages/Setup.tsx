import { Database, KeyRound } from 'lucide-react'
import { Aviso, Card } from '@/components/ui'

export default function Setup() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <img
            src="/brand/brasao-192.png"
            alt="Brasão da Escola Estadual Celso Rodrigues"
            className="h-14 w-14 shrink-0 object-contain"
          />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Configuração necessária</h1>
            <p className="mt-1 text-sm text-slate-600">
              O painel precisa das credenciais públicas do Supabase para funcionar.
            </p>
          </div>
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <KeyRound className="h-4 w-4" /> 1. Crie o arquivo <code className="rounded bg-slate-100 px-1.5 py-0.5">.env</code>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
{`VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY`}
          </pre>
          <p className="mt-2 text-xs text-slate-500">
            Use apenas a chave <strong>anon</strong>. Nunca coloque a <code>service_role</code> no
            frontend.
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <Database className="h-4 w-4" /> 2. Aplique as migrations no Supabase
          </div>
          <p className="mt-2 text-sm text-slate-600">
            No SQL Editor, execute na ordem os arquivos de{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">supabase/migrations/</code> (0001 a
            0006). Depois crie o usuário administrador e registre-o na tabela{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">admins</code>.
          </p>
        </Card>

        <Aviso tom="info">
          Depois de criar o <code>.env</code>, reinicie o servidor com{' '}
          <code>npm run dev</code>.
        </Aviso>
      </div>
    </div>
  )
}
