import { Link } from 'react-router-dom'
import { ArrowRight, Trophy, Users } from 'lucide-react'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'
import { TIPOS_MODALIDADE } from '@/lib/constantes'
import type { Categoria, Modalidade } from '@/lib/types'
import { useRealtime, useSeo } from './hooks'
import { Card, CarregandoPublico, ErroPublico, PageHero, Vazio } from './ui'
import { rotuloCategoria } from './utils'

type Dados = { modalidades: Modalidade[]; categorias: Categoria[] }

export default function Modalidades() {
  useSeo({
    titulo: 'Modalidades',
    descricao: 'Modalidades, categorias e regras gerais dos Jogos Interclasses 2026.',
  })

  const dados = useAsync<Dados>(async () => {
    const [mods, cats] = await Promise.all([
      supabase.from('modalidades').select('*').eq('ativo', true).order('ordem').order('nome'),
      supabase.from('modalidade_categorias').select('*').eq('ativo', true).order('ordem').order('nome'),
    ])
    for (const r of [mods, cats]) if (r.error) throw r.error
    return {
      modalidades: (mods.data ?? []) as Modalidade[],
      categorias: (cats.data ?? []) as Categoria[],
    }
  })

  useRealtime(['modalidades', 'modalidade_categorias'], dados.reload)

  const modalidades = dados.data?.modalidades ?? []
  const categorias = dados.data?.categorias ?? []

  return (
    <>
      <PageHero
        chapeu="O que está em jogo"
        titulo="Modalidades"
        descricao="Conheça as modalidades, categorias e formatos de disputa. Toque em uma modalidade para ver regras e participantes."
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {dados.loading ? (
          <CarregandoPublico texto="Carregando modalidades…" />
        ) : dados.error ? (
          <ErroPublico mensagem={dados.error} onRecarregar={dados.reload} />
        ) : modalidades.length === 0 ? (
          <Vazio
            titulo="Modalidades em definição"
            texto="A organização ainda está fechando a lista de modalidades."
            icone={<Trophy className="h-7 w-7" />}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modalidades.map((modalidade) => {
              const cats = categorias.filter((c) => c.modalidade_id === modalidade.id)
              const tipo = TIPOS_MODALIDADE.find((t) => t.valor === modalidade.tipo)?.rotulo ?? modalidade.tipo
              return (
                <Link key={modalidade.id} to={`/modalidades/${modalidade.slug}`} className="group">
                  <Card className="flex h-full flex-col p-5 transition-transform group-hover:-translate-y-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-lg bg-brand-600 p-2.5 text-white">
                        {modalidade.tipo === 'coletiva' ? <Users className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
                      </span>
                      <span className="rounded-full bg-areia-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-noite-700">
                        {tipo}
                      </span>
                    </div>
                    <h2 className="mt-3 font-display text-2xl font-bold uppercase leading-tight text-noite-900">
                      {modalidade.nome}
                    </h2>
                    {modalidade.descricao ? (
                      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-600">{modalidade.descricao}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {cats.length > 0 ? (
                        cats.slice(0, 4).map((cat) => (
                          <span key={cat.id} className="rounded-md bg-noite-900/5 px-2 py-1 text-[11px] font-medium text-noite-800">
                            {rotuloCategoria(cat.nome, cat.genero)}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400">Categorias a definir</span>
                      )}
                      {cats.length > 4 ? (
                        <span className="rounded-md bg-noite-900/5 px-2 py-1 text-[11px] font-medium text-noite-800">
                          +{cats.length - 4}
                        </span>
                      ) : null}
                    </div>
                    <span className="mt-auto flex items-center gap-1 pt-4 text-xs font-semibold text-brand-700">
                      Ver detalhes <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
