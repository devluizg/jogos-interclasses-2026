import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Newspaper } from 'lucide-react'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'
import type { Noticia } from '@/lib/types'
import { useRealtime, useSeo } from './hooks'
import { dataCurta, textoPlano } from './utils'
import { CarregandoPublico, ErroPublico, PageHero, Vazio } from './ui'

export default function NoticiaPublica() {
  const { slug } = useParams()

  const dados = useAsync<Noticia | null>(async () => {
    if (!slug) return null
    const { data, error } = await supabase
      .from('noticias')
      .select('*')
      .eq('slug', slug)
      .eq('publicada', true)
      .maybeSingle()
    if (error) throw error
    return (data as Noticia) ?? null
  }, [slug])

  useRealtime(['noticias'], dados.reload)
  const noticia = dados.data

  useSeo({
    titulo: noticia?.titulo ?? 'Notícia',
    descricao: noticia?.resumo ?? undefined,
  })

  if (dados.loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <CarregandoPublico texto="Carregando notícia…" />
      </div>
    )
  }

  if (dados.error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <ErroPublico mensagem={dados.error} onRecarregar={dados.reload} />
      </div>
    )
  }

  if (!noticia) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Vazio
          titulo="Notícia não encontrada"
          texto="Ela pode ter sido despublicada ou o endereço está incorreto."
          icone={<Newspaper className="h-7 w-7" />}
        />
        <div className="mt-4 text-center">
          <Link to="/noticias" className="text-sm font-semibold text-brand-700 hover:underline">
            Ver todas as notícias
          </Link>
        </div>
      </div>
    )
  }

  const paragrafos = textoPlano(noticia.conteudo)

  return (
    <>
      <PageHero chapeu={dataCurta(noticia.publicado_em)} titulo={noticia.titulo} descricao={noticia.resumo ?? undefined}>
        <Link to="/noticias" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Todas as notícias
        </Link>
      </PageHero>

      <article className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        {noticia.autor ? (
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-500">
            Por {noticia.autor}
          </p>
        ) : null}
        {paragrafos.length > 0 ? (
          <div className="space-y-4">
            {paragrafos.map((paragrafo, i) => (
              <p key={i} className="text-base leading-relaxed text-slate-700">{paragrafo}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Conteúdo em atualização.</p>
        )}
      </article>
    </>
  )
}
