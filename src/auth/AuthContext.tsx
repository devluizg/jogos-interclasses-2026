import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { mensagemErro } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

type AuthContexto = {
  session: Session | null
  carregando: boolean
  isAdmin: boolean | null
  erroAdmin: string | null
  entrar: (email: string, senha: string) => Promise<void>
  sair: () => Promise<void>
  recarregarAdmin: () => Promise<void>
}

const Contexto = createContext<AuthContexto | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [erroAdmin, setErroAdmin] = useState<string | null>(null)

  const verificarAdmin = useCallback(async () => {
    setErroAdmin(null)
    setIsAdmin(null)
    const { data, error } = await supabase.rpc('fn_sou_admin')
    if (error) {
      setIsAdmin(false)
      setErroAdmin(
        `${mensagemErro(error)} Verifique se a migration 0005 foi aplicada no Supabase.`,
      )
      return
    }
    setIsAdmin(Boolean(data))
  }, [])

  useEffect(() => {
    let ativo = true

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      setSession(data.session)
      setCarregando(false)
    })

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSession(novaSessao)
      setCarregando(false)
    })

    return () => {
      ativo = false
      assinatura.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setIsAdmin(false)
      setErroAdmin(null)
      return
    }
    void verificarAdmin()
  }, [session?.user?.id, verificarAdmin])

  const entrar = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw new Error(mensagemErro(error))
  }, [])

  const sair = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const valor = useMemo(
    () => ({
      session,
      carregando,
      isAdmin,
      erroAdmin,
      entrar,
      sair,
      recarregarAdmin: verificarAdmin,
    }),
    [session, carregando, isAdmin, erroAdmin, entrar, sair, verificarAdmin],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useAuth() {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return ctx
}
