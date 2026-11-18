import { useEffect, useState } from 'react'

type AntesDeInstalar = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function estaInstalado(): boolean {
  if (typeof window === 'undefined') return false
  const navegador = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    navegador.standalone === true
  )
}

export function usePwaInstall() {
  const [prompt, setPrompt] = useState<AntesDeInstalar | null>(null)
  const [instalado, setInstalado] = useState(estaInstalado)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    setIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent))

    function aoPoderInstalar(evento: Event) {
      evento.preventDefault()
      setPrompt(evento as AntesDeInstalar)
    }

    function aoInstalar() {
      setPrompt(null)
      setInstalado(true)
    }

    window.addEventListener('beforeinstallprompt', aoPoderInstalar)
    window.addEventListener('appinstalled', aoInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar)
      window.removeEventListener('appinstalled', aoInstalar)
    }
  }, [])

  async function instalar() {
    if (!prompt) return
    await prompt.prompt()
    const escolha = await prompt.userChoice
    if (escolha.outcome === 'accepted') setInstalado(true)
    setPrompt(null)
  }

  return {
    podeInstalar: Boolean(prompt),
    instalado,
    ios,
    instalar,
  }
}
