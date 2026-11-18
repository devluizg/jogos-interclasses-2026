import { useEffect } from 'react'
import { RefreshCw, Wifi, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function PwaAtualizacao() {
  const {
    needRefresh: [precisaAtualizar, setPrecisaAtualizar],
    offlineReady: [prontoOffline, setProntoOffline],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!prontoOffline) return
    const id = window.setTimeout(() => setProntoOffline(false), 5000)
    return () => window.clearTimeout(id)
  }, [prontoOffline, setProntoOffline])

  if (!precisaAtualizar && !prontoOffline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[45] mx-auto max-w-md rounded-2xl border border-noite-900/10 bg-white p-3 shadow-2xl lg:bottom-4 lg:right-4 lg:left-auto lg:mx-0 lg:w-96"
    >
      <div className="flex items-start gap-2.5">
        <span className="rounded-lg bg-brand-50 p-2 text-brand-700">
          {precisaAtualizar ? <RefreshCw className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-noite-900">
            {precisaAtualizar ? 'Nova versão disponível' : 'Pronto para usar offline'}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {precisaAtualizar
              ? 'Atualize para carregar a programação e os resultados mais recentes.'
              : 'O app já pode ser aberto sem internet. Os dados serão atualizados quando você conectar.'}
          </p>
          <div className="mt-2 flex gap-2">
            {precisaAtualizar ? (
              <button
                type="button"
                onClick={() => void updateServiceWorker(true)}
                className="min-h-9 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700"
              >
                Atualizar agora
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setPrecisaAtualizar(false)
                setProntoOffline(false)
              }}
              className="min-h-9 rounded-lg px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              {precisaAtualizar ? 'Depois' : 'Fechar'}
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Fechar aviso"
          onClick={() => {
            setPrecisaAtualizar(false)
            setProntoOffline(false)
          }}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
