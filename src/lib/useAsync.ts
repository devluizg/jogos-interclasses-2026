import { useCallback, useEffect, useRef, useState } from 'react'
import { mensagemErro } from './errors'

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    let ativo = true
    setLoading(true)
    setError(null)

    fnRef
      .current()
      .then((resultado) => {
        if (ativo) setData(resultado)
      })
      .catch((erro) => {
        if (ativo) setError(mensagemErro(erro))
      })
      .finally(() => {
        if (ativo) setLoading(false)
      })

    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { data, loading, error, reload, setData }
}
