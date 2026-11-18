import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, FileText, MapPin, Users } from 'lucide-react'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'
import { FORMATOS, TIPOS_MODALIDADE } from '@/lib/constantes'
import type { Categoria, Documento, Modalidade, ParticipantePublico, Programacao } from '@/lib/types'
import { useRealtime, useSeo } from './hooks'
import { dataCurta, horaCurta, rotuloCategoria, tituloCategoria } from './utils'
import {
  Card,
  CarregandoPublico,
  ErroPublico,
  NumeroTurma,
  PageHero,
  Vazio,
} from './ui'

type Detalhe = {
  modalidade: Modalidade
  categorias: Categoria[]
  participantes: ParticipantePublico[]
  documentos: Documento[]
  jogos: Programacao[]
}

export default function ModalidadePublica() {
  const { slug } = useParams()

  const dados = useAsync<Detalhe | null>(async () => {
    if (!slug) return null
    const mod = await supabase.from('modalidades').select('*').eq('slug', slug).eq('ativo', true).maybeSingle()
    if (mod.error) throw mod.error
    if (!mod.data) return null
    const modalidade = mod.data as Modalidade

    const [cats, parts, docs, jogos] = await Promise.all([
      supabase.from('modalidade_categorias').select('*').eq('modalidade_id', modalidade.id).eq('ativo', true).order('ordem').order('nome'),
      supabase.from('vw_participantes_publico').select('*').eq('slug', slug),
      supabase.from('documentos').select('*').eq('modalidade_id', modalidade.id).eq('publico', true).order('ordem'),
      supabase.from('vw_programacao').select('*').eq('slug', slug).in('status', ['programado', 'em_andamento', 'adiado']).order('data_hora', { ascending: true, nullsFirst: false }).limit(5),
    ])
    for (const r of [cats, parts, docs, jogos]) if (r.error) throw r.error

    return {
      modalidade,
      categorias: (cats.data ?? []) as Categoria[],
      participantes: (parts.data ?? []) as ParticipantePublico[],
      documentos: (docs.data ?? []) as Documento[],
      jogos: (jogos.data ?? []) as Programacao[],
    }
  }, [slug])

  useRealtime(['modalidades', 'modalidade_categorias', 'resultados', 'partidas'], dados.reload)

  const detalhe = dados.data
  useSeo({
    titulo: detalhe?.modalidade.nome ?? 'Modalidade',
    descricao: detalhe?.modalidade.descricao ?? undefined,
  })

  if (dados.loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <CarregandoPublico texto="Carregando modalidade…" />
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

  if (!detalhe) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Vazio
          titulo="Modalidade não encontrada"
          texto="Ela pode ter sido renomeada ou ainda não está publicada."
        />
        <div className="mt-4 text-center">
          <Link to="/modalidades" className="text-sm font-semibold text-brand-700 hover:underline">
            Ver todas as modalidades
          </Link>
        </div>
      </div>
    )
  }

  const { modalidade, categorias, participantes, documentos, jogos } = detalhe
  const tipo = TIPOS_MODALIDADE.find((t) => t.valor === modalidade.tipo)?.rotulo ?? modalidade.tipo

  return (
    <>
      <PageHero
        chapeu={tipo}
        titulo={modalidade.nome}
        descricao={modalidade.descricao ?? undefined}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link to="/modalidades" className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-slate-300 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Todas as modalidades
          </Link>
        </div>
      </PageHero>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.4fr_0.6fr] lg:px-8">
        <div className="space-y-5">
          <section>
            <h2 className="mb-3 font-display text-2xl font-bold uppercase tracking-tight text-noite-900">Categorias</h2>
            {categorias.length === 0 ? (
              <Vazio titulo="Categorias a definir" texto="A organização ainda está fechando as categorias desta modalidade." />
            ) : (
              <div className="space-y-4">
                {categorias.map((cat) => {
                  const formato = FORMATOS.find((f) => f.valor === cat.formato_resultado)?.rotulo ?? cat.formato_resultado
                  const inscricoes = participantes.filter((p) => p.categoria === cat.nome)

                  return (
                    <Card key={cat.id} className="overflow-hidden">
                      <div className="border-b border-noite-900/10 bg-areia-50 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-display text-xl font-bold uppercase text-noite-900">
                            {rotuloCategoria(cat.nome, cat.genero)}
                          </h3>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-noite-900/10">
                            {formato}
                          </span>
                        </div>
                        {cat.tamanho_equipe_min || cat.tamanho_equipe_max ? (
                          <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-slate-600">
                            <Users className="h-3.5 w-3.5" />
                            {cat.tamanho_equipe_min === cat.tamanho_equipe_max
                              ? `${cat.tamanho_equipe_min} atletas por equipe`
                              : `${cat.tamanho_equipe_min ?? '?'} a ${cat.tamanho_equipe_max ?? '?'} atletas`}
                          </p>
                        ) : null}
                      </div>

                      <div className="p-4">
                        {inscricoes.length === 0 ? (
                          <p className="text-sm text-slate-500">Inscrições ainda não divulgadas.</p>
                        ) : (
                          <div className="space-y-3">
                            {inscricoes.map((inscricao) => (
                              <div key={inscricao.inscricao_id} className="rounded-xl border border-noite-900/10 p-3">
                                <div className="flex items-center gap-2">
                                  <NumeroTurma numero={inscricao.numero} cor={inscricao.cor} className="h-7 min-w-7 text-sm" />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-noite-900">
                                      {inscricao.nome_equipe ?? inscricao.turma_equipe ?? `Turma ${inscricao.numero}`}
                                    </p>
                                    {inscricao.nome_equipe && inscricao.turma_equipe ? (
                                      <p className="text-[10px] uppercase tracking-wide text-slate-400">{inscricao.turma_equipe}</p>
                                    ) : null}
                                  </div>
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                  {inscricao.participantes.length > 0
                                    ? inscricao.participantes.join(', ')
                                    : 'Atletas a confirmar'}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>

          {modalidade.regras_especificas ? (
            <section>
              <h2 className="mb-3 font-display text-2xl font-bold uppercase tracking-tight text-noite-900">Regras específicas</h2>
              <Card className="p-4">
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{modalidade.regras_especificas}</p>
              </Card>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5">
          {jogos.length > 0 ? (
            <Card className="p-4">
              <h2 className="font-display text-xl font-bold uppercase text-noite-900">Próximos jogos</h2>
              <ul className="mt-3 space-y-3">
                {jogos.map((jogo) => (
                  <li key={jogo.id} className="rounded-xl bg-areia-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                      {tituloCategoria(jogo.modalidade, jogo.categoria)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      <CalendarDays className="mb-0.5 inline h-3.5 w-3.5" /> {dataCurta(jogo.data_hora)} · {horaCurta(jogo.data_hora)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {jogo.turmas.length > 0 ? jogo.turmas.map((n) => `Turma ${n}`).join(' × ') : 'Turmas a definir'}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      <MapPin className="mb-0.5 inline h-3.5 w-3.5" /> {jogo.local ?? 'Local a definir'}
                    </p>
                  </li>
                ))}
              </ul>
              <Link to="/programacao" className="mt-3 inline-block text-xs font-semibold text-brand-700 hover:underline">
                Ver programação completa
              </Link>
            </Card>
          ) : null}

          <Card className="p-4">
            <h2 className="font-display text-xl font-bold uppercase text-noite-900">Documentos</h2>
            {documentos.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Nenhum documento específico publicado.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {documentos.map((doc) => (
                  <li key={doc.id}>
                    {doc.arquivo_url ? (
                      <a
                        href={doc.arquivo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-start gap-2 text-sm font-medium text-noite-800 hover:text-brand-700"
                      >
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {doc.titulo}
                      </a>
                    ) : (
                      <span className="flex items-start gap-2 text-sm text-slate-500">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0" /> {doc.titulo} (em breve)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Link to="/documentos" className="mt-3 inline-block text-xs font-semibold text-brand-700 hover:underline">
              Todos os documentos
            </Link>
          </Card>
        </aside>
      </div>
    </>
  )
}
