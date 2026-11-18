import { FileText } from 'lucide-react'
import { useAsync } from '@/lib/useAsync'
import { supabase } from '@/lib/supabase'
import { TIPOS_DOCUMENTO } from '@/lib/constantes'
import type { Documento } from '@/lib/types'
import { useRealtime, useSeo } from './hooks'
import { Card, CarregandoPublico, ErroPublico, PageHero, Vazio } from './ui'

export default function Documentos() {
  useSeo({
    titulo: 'Documentos',
    descricao: 'Regulamento, anexos e documentos oficiais dos Jogos Interclasses 2026.',
  })

  const dados = useAsync<Documento[]>(async () => {
    const { data, error } = await supabase
      .from('documentos')
      .select('*, modalidades(nome)')
      .eq('publico', true)
      .order('ordem')
    if (error) throw error
    return (data ?? []) as Documento[]
  })

  useRealtime(['documentos'], dados.reload)
  const documentos = dados.data ?? []

  return (
    <>
      <PageHero
        chapeu="Documentos oficiais"
        titulo="Regulamento e anexos"
        descricao="Consulte o regulamento geral, anexos e demais documentos publicados pela organização."
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {dados.loading ? (
          <CarregandoPublico texto="Carregando documentos…" />
        ) : dados.error ? (
          <ErroPublico mensagem={dados.error} onRecarregar={dados.reload} />
        ) : documentos.length === 0 ? (
          <Vazio
            titulo="Nenhum documento publicado"
            texto="O regulamento e os anexos aparecerão aqui assim que forem liberados."
            icone={<FileText className="h-7 w-7" />}
          />
        ) : (
          <div className="space-y-7">
            {TIPOS_DOCUMENTO.map((tipo) => {
              const lista = documentos.filter((doc) => doc.tipo === tipo.valor)
              if (lista.length === 0) return null
              return (
                <section key={tipo.valor}>
                  <h2 className="mb-3 font-display text-2xl font-bold uppercase tracking-tight text-noite-900">
                    {tipo.plural}
                  </h2>
                  <div className="space-y-2.5">
                    {lista.map((doc) => (
                      <Card key={doc.id} className="flex items-center gap-3 p-4">
                        <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
                          <FileText className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-noite-900">{doc.titulo}</p>
                          <p className="text-[11px] text-slate-500">
                            {doc.modalidades?.nome ?? 'Documento geral'}
                          </p>
                        </div>
                        {doc.arquivo_url ? (
                          <a
                            href={doc.arquivo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-noite-900 px-3 py-2 text-xs font-semibold text-white hover:bg-noite-950"
                          >
                            Abrir
                          </a>
                        ) : (
                          <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                            Em breve
                          </span>
                        )}
                      </Card>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
