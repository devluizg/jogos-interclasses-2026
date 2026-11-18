import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'

export type ConfigMap = Record<string, unknown>

const ConfigContexto = createContext<{
  configs: ConfigMap
  carregando: boolean
  erro: string | null
  recarregar: () => void
}>({ configs: {}, carregando: true, erro: null, recarregar: () => {} })

export function ConfigProvider({ children }: { children: ReactNode }) {
  const consulta = useAsync(async () => {
    const { data, error } = await supabase.from('configuracoes').select('chave, valor')
    if (error) throw error
    return Object.fromEntries((data ?? []).map((c) => [c.chave as string, c.valor]))
  })

  const valor = useMemo(
    () => ({
      configs: consulta.data ?? {},
      carregando: consulta.loading,
      erro: consulta.error,
      recarregar: consulta.reload,
    }),
    [consulta.data, consulta.loading, consulta.error, consulta.reload],
  )

  return <ConfigContexto.Provider value={valor}>{children}</ConfigContexto.Provider>
}

export function useConfig() {
  return useContext(ConfigContexto)
}

export function cfgTexto(configs: ConfigMap, chave: string, padrao = '') {
  const v = configs[chave]
  return typeof v === 'string' ? v : padrao
}

export function cfgBooleano(configs: ConfigMap, chave: string, padrao = false) {
  return typeof configs[chave] === 'boolean' ? (configs[chave] as boolean) : padrao
}

export function cfgNumero(configs: ConfigMap, chave: string, padrao = 0) {
  const v = configs[chave]
  return typeof v === 'number' && Number.isFinite(v) ? v : padrao
}

export function useRealtime(tabelas: string[], aoMudar: () => void) {
  const callback = useRef(aoMudar)
  callback.current = aoMudar
  const chave = tabelas.join('|')

  useEffect(() => {
    let timer: number | undefined
    const canal = supabase.channel(`portal-${chave}`)

    for (const tabela of tabelas) {
      canal.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tabela },
        () => {
          window.clearTimeout(timer)
          timer = window.setTimeout(() => callback.current(), 350)
        },
      )
    }

    canal.subscribe()

    return () => {
      window.clearTimeout(timer)
      void supabase.removeChannel(canal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])
}

function definirMeta(nome: string, conteudo: string, propriedade = false) {
  if (typeof document === 'undefined') return
  const seletor = propriedade ? `meta[property="${nome}"]` : `meta[name="${nome}"]`
  let el = document.head.querySelector<HTMLMetaElement>(seletor)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(propriedade ? 'property' : 'name', nome)
    document.head.appendChild(el)
  }
  el.setAttribute('content', conteudo)
}

export function useSeo({ titulo, descricao }: { titulo?: string; descricao?: string }) {
  useEffect(() => {
    const nome = 'Jogos Interclasses 2026 · E.E. Celso Rodrigues'
    const tituloFinal = titulo ? `${titulo} · Jogos Interclasses 2026` : nome
    const texto =
      descricao ??
      'Acompanhe a programação, os resultados, a classificação e a Taça Turma Protagonista dos Jogos Interclasses 2026 da Escola Estadual Celso Rodrigues.'

    document.title = tituloFinal
    definirMeta('description', texto)
    definirMeta('og:title', tituloFinal, true)
    definirMeta('og:description', texto, true)
    definirMeta('og:type', 'website', true)
    definirMeta('og:url', window.location.href, true)
    definirMeta('og:image', `${window.location.origin}/brand/brasao-512.png`, true)
    definirMeta('twitter:card', 'summary_large_image')
  }, [titulo, descricao])
}

export function useContagem(dataISO: string | null | undefined) {
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  if (!dataISO) return null

  const alvo = new Date(`${dataISO}T00:00:00-03:00`).getTime()
  const diferenca = alvo - agora

  if (!Number.isFinite(alvo)) return null

  if (diferenca <= 0) {
    return { passado: true, dias: 0, horas: 0, minutos: 0 }
  }

  return {
    passado: false,
    dias: Math.floor(diferenca / 86_400_000),
    horas: Math.floor((diferenca % 86_400_000) / 3_600_000),
    minutos: Math.floor((diferenca % 3_600_000) / 60_000),
  }
}

