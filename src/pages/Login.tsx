import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Aviso, Button, Card, Field, Input } from '@/components/ui'
import { mensagemErro } from '@/lib/errors'

export default function Login() {
  const { session, carregando, entrar } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!carregando && session) return <Navigate to="/admin" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await entrar(email.trim(), senha)
    } catch (e) {
      setErro(mensagemErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-noite-950 via-noite-900 to-slate-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-white p-1 shadow-lg ring-1 ring-white/30">
            <img
              src="/brand/brasao-192.png"
              alt="Brasão da Escola Estadual Celso Rodrigues"
              className="h-full w-full object-contain"
            />
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-300">
            Escola Estadual Celso Rodrigues
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Painel dos Jogos</h1>
          <p className="mt-1 text-sm text-slate-300">Acesso restrito à organização</p>
        </div>

        <Card className="p-5 sm:p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="E-mail">
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="organizacao@escola.com"
              />
            </Field>
            <Field label="Senha">
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            {erro ? <Aviso tom="erro">{erro}</Aviso> : null}

            <Button type="submit" className="w-full" size="lg" loading={enviando}>
              Entrar
            </Button>
          </form>

          <p className="mt-4 border-t border-slate-100 pt-3 text-center text-[11px] leading-relaxed text-slate-500">
            O cadastro de novos usuários está desativado. Fale com a organização se precisar de
            acesso.
          </p>
        </Card>

        <p className="mt-5 text-center text-xs text-slate-400">
          Jogos Interclasses 2026 · 24 a 27 de novembro
        </p>
      </div>
    </div>
  )
}
