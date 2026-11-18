import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Medal } from 'lucide-react'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'
import type { ResultadoPublico } from '@/lib/types'
import { useRealtime, useSeo } from './hooks'
import { agruparResultados, dataCurta, horaCurta, tituloCategoria } from './utils'
import {
  Card,
  CarregandoPublico,
  ErroPublico,
  Medalha,
  PageHero,
  Vazio,
} from './ui'

export default function Resultados() {
  useSeo({
    titulo: 'Resultados',
    descricao: 'Resultados oficiais por modalidade e categoria dos Jogos Interclasses 2026.',
  })

  const [modalidade, setModalidade] = useState('todas')

  const dados = useAsync<ResultadoPublico[]>(async () => {
    const { data, error } = await supabase
      .from('vw_resultados_publicos')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500)
    if (error) throw error
    return (data ?? []) as ResultadoPublico[]
  })

  useRealtime(['resultados', 'partidas', 'partida_participantes', 'configuracoes'], dados.reload)

  const todos = dados.data ?? []
  const modalidades = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const linha of todos) mapa.set(linha.slug, linha.modalidade)
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [todos])

  const grupos = agruparResultados(
    modalidade === 'todas' ? todos : todos.filter((linha) => linha.slug === modalidade),
  )

  return (
    <>
      <PageHero
        chapeu="Placar oficial"
        titulo="Resultados"
        descricao="Somente resultados publicados pela organização. Rascunhos e ajustes internos não aparecem no portal."
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {dados.loading ? (
          <CarregandoPublico texto="Carregando resultados…" />
        ) : dados.error ? (
          <ErroPublico mensagem={dados.error} onRecarregar={dados.reload} />
        ) : todos.length === 0 ? (
          <Vazio
            titulo="Aguardando os primeiros resultados"
            texto="Assim que a organização publicar um resultado oficial, ele aparece aqui."
            icone={<Medal className="h-7 w-7" />}
          />
        ) : (
          <>
            {modalidades.length > 1 ? (
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setModalidade('todas')}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${modalidade === 'todas' ? 'bg-noite-900 text-white' : 'bg-white text-noite-800'}`}
                >
                  Todas
                </button>
                {modalidades.map(([slug, nome]) => (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => setModalidade(slug)}
                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${modalidade === slug ? 'bg-noite-900 text-white' : 'bg-white text-noite-800'}`}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            ) : null}

            {grupos.length === 0 ? (
              <Vazio titulo="Nenhum resultado nesta modalidade" texto="Selecione outra modalidade." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {grupos.map((grupo) => (
                  <Card key={grupo.chave} className="overflow-hidden">
                    <div className="flex items-start justify-between gap-3 border-b border-noite-900/10 bg-areia-50 px-4 py-3">
                      <div>
                        <Link
                          to={`/modalidades/${grupo.slug}`}
                          className="font-display text-xl font-bold uppercase leading-tight text-noite-900 hover:text-brand-700"
                        >
                          {tituloCategoria(grupo.modalidade, grupo.categoria)}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Publicado em {dataCurta(grupo.atualizado)} às {horaCurta(grupo.atualizado)}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                        Oficial
                      </span>
                    </div>
                    <ul className="divide-y divide-noite-900/5">
                      {grupo.itens.map((item) => (
                        <li key={item.id} className={`flex items-center gap-3 px-4 py-3 ${item.colocacao === 1 ? 'bg-ouro-50/60' : ''}`}>
                          <Medalha posicao={item.colocacao} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-noite-900">
                              {item.nome_equipe ?? `Turma ${item.numero}`}
                            </p>
                            {item.observacao ? (
                              <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{item.observacao}</p>
                            ) : null}
                          </div>
                          <span className="font-display text-lg font-bold tabular-nums text-slate-600">
                            {item.pontos ?? 0} <span className="text-[10px] font-medium text-slate-400">pts</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
