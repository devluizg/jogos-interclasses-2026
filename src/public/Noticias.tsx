import { Link } from 'react-router-dom'
import { Newspaper } from 'lucide-react'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'
import type { Noticia } from '@/lib/types'
import { useRealtime, useSeo } from './hooks'
import { dataCurta } from './utils'
import { Card, CarregandoPublico, ErroPublico, PageHero, Vazio } from './ui'

export default function Noticias() {
  useSeo({
    titulo: 'Notícias',
    descricao: 'Comunicados e notícias oficiais dos Jogos Interclasses 2026.',
  })

  const dados = useAsync<Noticia[]>(async () => {
    const { data, error } = await supabase
      .from('noticias')
      .select('*')
      .eq('publicada', true)
      .order('publicado_em', { ascending: false, nullsFirst: false })
    if (error) throw error
    return (data ?? []) as Noticia[]
  })

  useRealtime(['noticias'], dados.reload)
  const noticias = dados.data ?? []

  return (
    <>
      <PageHero
        chapeu="Comunicados"
        titulo="Notícias"
        descricao="Informações oficiais da organização dos jogos: horários, mudanças, orientações e destaques."
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {dados.loading ? (
          <CarregandoPublico texto="Carregando notícias…" />
        ) : dados.error ? (
          <ErroPublico mensagem={dados.error} onRecarregar={dados.reload} />
        ) : noticias.length === 0 ? (
          <Vazio
            titulo="Nenhuma notícia publicada"
            texto="Os comunicados da organização aparecerão aqui."
            icone={<Newspaper className="h-7 w-7" />}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {noticias.map((noticia) => (
              <Link key={noticia.id} to={`/noticias/${noticia.slug}`} className="group">
                <Card className="flex h-full flex-col p-5 transition-transform group-hover:-translate-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                    {dataCurta(noticia.publicado_em)}
                    {noticia.autor ? <span className="text-slate-400"> · {noticia.autor}</span> : null}
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold uppercase leading-tight text-noite-900">
                    {noticia.titulo}
                  </h2>
                  {noticia.resumo ? (
                    <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-slate-600">{noticia.resumo}</p>
                  ) : null}
                  <span className="mt-auto pt-4 text-xs font-semibold text-brand-700 group-hover:underline">
                    Ler notícia →
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
