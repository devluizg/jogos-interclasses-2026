import { useState } from 'react'
import { FileText, Newspaper, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import {
  Aviso,
  Badge,
  Button,
  Card,
  Carregando,
  Checkbox,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ErroBox,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Textarea,
  Th,
  useToast,
} from '@/components/ui'
import { TIPOS_DOCUMENTO } from '@/lib/constantes'
import { mensagemErro } from '@/lib/errors'
import { numero } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import type { Documento, Modalidade, Noticia } from '@/lib/types'

type Aba = 'noticias' | 'documentos'

function slugificar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type FormNoticia = {
  titulo: string
  slug: string
  resumo: string
  conteudo: string
  autor: string
  publicada: boolean
}

const NOTICIA_VAZIA: FormNoticia = {
  titulo: '',
  slug: '',
  resumo: '',
  conteudo: '',
  autor: '',
  publicada: false,
}

type FormDocumento = {
  titulo: string
  tipo: 'regulamento' | 'anexo' | 'projeto' | 'outro'
  modalidade_id: string
  arquivo_url: string
  ordem: string
  publico: boolean
}

const DOCUMENTO_VAZIO: FormDocumento = {
  titulo: '',
  tipo: 'regulamento',
  modalidade_id: '',
  arquivo_url: '',
  ordem: '',
  publico: true,
}

export default function Conteudo() {
  const { notificar } = useToast()
  const [aba, setAba] = useState<Aba>('noticias')

  const base = useAsync(async () => {
    const [noticias, documentos, modalidades] = await Promise.all([
      supabase.from('noticias').select('*').order('created_at', { ascending: false }),
      supabase.from('documentos').select('*, modalidades(nome)').order('ordem', { nullsFirst: false }),
      supabase.from('modalidades').select('*').eq('ativo', true).order('nome'),
    ])
    if (noticias.error) throw noticias.error
    if (documentos.error) throw documentos.error
    if (modalidades.error) throw modalidades.error
    return {
      noticias: noticias.data as Noticia[],
      documentos: documentos.data as (Documento & { modalidades: { nome: string } | null })[],
      modalidades: modalidades.data as Modalidade[],
    }
  })

  const [noticiaEditando, setNoticiaEditando] = useState<Noticia | 'nova' | null>(null)
  const [formNoticia, setFormNoticia] = useState<FormNoticia>(NOTICIA_VAZIA)
  const [slugTocado, setSlugTocado] = useState(false)
  const [salvandoNoticia, setSalvandoNoticia] = useState(false)
  const [erroNoticia, setErroNoticia] = useState<string | null>(null)

  const [documentoEditando, setDocumentoEditando] = useState<Documento | 'novo' | null>(null)
  const [formDocumento, setFormDocumento] = useState<FormDocumento>(DOCUMENTO_VAZIO)
  const [salvandoDocumento, setSalvandoDocumento] = useState(false)
  const [erroDocumento, setErroDocumento] = useState<string | null>(null)
  const [enviandoArquivo, setEnviandoArquivo] = useState(false)

  const [excluindoNoticia, setExcluindoNoticia] = useState<Noticia | null>(null)
  const [excluindoDocumento, setExcluindoDocumento] = useState<Documento | null>(null)
  const [removendo, setRemovendo] = useState(false)

  function abrirNoticia(n: Noticia | 'nova') {
    setErroNoticia(null)
    setSlugTocado(true)
    if (n === 'nova') {
      setFormNoticia(NOTICIA_VAZIA)
      setSlugTocado(false)
      setNoticiaEditando('nova')
      return
    }
    setFormNoticia({
      titulo: n.titulo,
      slug: n.slug,
      resumo: n.resumo ?? '',
      conteudo: n.conteudo ?? '',
      autor: n.autor ?? '',
      publicada: n.publicada,
    })
    setNoticiaEditando(n)
  }

  async function salvarNoticia() {
    if (!formNoticia.titulo.trim() || !formNoticia.slug.trim()) {
      setErroNoticia('Informe título e slug.')
      return
    }
    setSalvandoNoticia(true)
    setErroNoticia(null)
    const publicada = formNoticia.publicada
    const publicadoEm =
      publicada && noticiaEditando !== 'nova' ? noticiaEditando?.publicado_em ?? new Date().toISOString() : publicada ? new Date().toISOString() : null
    const payload = {
      titulo: formNoticia.titulo.trim(),
      slug: slugificar(formNoticia.slug),
      resumo: formNoticia.resumo.trim() || null,
      conteudo: formNoticia.conteudo.trim() || null,
      autor: formNoticia.autor.trim() || null,
      publicada,
      publicado_em: publicadoEm,
    }
    try {
      if (noticiaEditando === 'nova') {
        const { error } = await supabase.from('noticias').insert(payload)
        if (error) throw error
        notificar('Notícia criada.')
      } else if (noticiaEditando) {
        const { error } = await supabase.from('noticias').update(payload).eq('id', noticiaEditando.id)
        if (error) throw error
        notificar('Notícia atualizada.')
      }
      setNoticiaEditando(null)
      base.reload()
    } catch (e) {
      setErroNoticia(mensagemErro(e))
    } finally {
      setSalvandoNoticia(false)
    }
  }

  function abrirDocumento(d: Documento | 'novo') {
    setErroDocumento(null)
    if (d === 'novo') {
      setFormDocumento(DOCUMENTO_VAZIO)
      setDocumentoEditando('novo')
      return
    }
    setFormDocumento({
      titulo: d.titulo,
      tipo: d.tipo,
      modalidade_id: d.modalidade_id ?? '',
      arquivo_url: d.arquivo_url ?? '',
      ordem: d.ordem === null ? '' : String(d.ordem),
      publico: d.publico,
    })
    setDocumentoEditando(d)
  }

  async function enviarArquivo(arquivo: File) {
    setEnviandoArquivo(true)
    try {
      const nome = `${Date.now()}-${arquivo.name.replace(/[^a-zA-Z0-9._-]+/g, '-')}`
      const caminho = `regulamentos/${nome}`
      const { error } = await supabase.storage.from('documentos').upload(caminho, arquivo, {
        contentType: arquivo.type || 'application/pdf',
        upsert: false,
      })
      if (error) throw error
      const { data } = supabase.storage.from('documentos').getPublicUrl(caminho)
      setFormDocumento((f) => ({ ...f, arquivo_url: data.publicUrl }))
      notificar('Arquivo enviado.')
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setEnviandoArquivo(false)
    }
  }

  async function salvarDocumento() {
    if (!formDocumento.titulo.trim()) {
      setErroDocumento('Informe o título.')
      return
    }
    setSalvandoDocumento(true)
    setErroDocumento(null)
    const payload = {
      titulo: formDocumento.titulo.trim(),
      tipo: formDocumento.tipo,
      modalidade_id: formDocumento.modalidade_id || null,
      arquivo_url: formDocumento.arquivo_url.trim() || null,
      ordem: numero(formDocumento.ordem),
      publico: formDocumento.publico,
    }
    try {
      if (documentoEditando === 'novo') {
        const { error } = await supabase.from('documentos').insert(payload)
        if (error) throw error
        notificar('Documento criado.')
      } else if (documentoEditando) {
        const { error } = await supabase.from('documentos').update(payload).eq('id', documentoEditando.id)
        if (error) throw error
        notificar('Documento atualizado.')
      }
      setDocumentoEditando(null)
      base.reload()
    } catch (e) {
      setErroDocumento(mensagemErro(e))
    } finally {
      setSalvandoDocumento(false)
    }
  }

  async function excluirNoticia() {
    if (!excluindoNoticia) return
    setRemovendo(true)
    try {
      const { error } = await supabase.from('noticias').delete().eq('id', excluindoNoticia.id)
      if (error) throw error
      notificar('Notícia excluída.')
      setExcluindoNoticia(null)
      base.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setRemovendo(false)
    }
  }

  async function excluirDocumento() {
    if (!excluindoDocumento) return
    setRemovendo(true)
    try {
      const { error } = await supabase.from('documentos').delete().eq('id', excluindoDocumento.id)
      if (error) throw error
      notificar('Documento excluído.')
      setExcluindoDocumento(null)
      base.reload()
    } catch (e) {
      notificar(mensagemErro(e), 'erro')
    } finally {
      setRemovendo(false)
    }
  }

  if (base.loading) return <Carregando />
  if (base.error) return <ErroBox mensagem={base.error} onRetry={base.reload} />
  if (!base.data) return null

  return (
    <>
      <PageHeader
        titulo="Conteúdo"
        descricao="Notícias, comunicados e documentos oficiais exibidos no portal."
        acoes={
          aba === 'noticias' ? (
            <Button onClick={() => abrirNoticia('nova')}>
              <Plus className="h-4 w-4" /> Nova notícia
            </Button>
          ) : (
            <Button onClick={() => abrirDocumento('novo')}>
              <Plus className="h-4 w-4" /> Novo documento
            </Button>
          )
        }
      />

      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setAba('noticias')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
            aba === 'noticias' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Newspaper className="h-3.5 w-3.5" /> Notícias ({base.data.noticias.length})
        </button>
        <button
          type="button"
          onClick={() => setAba('documentos')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
            aba === 'documentos' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> Documentos ({base.data.documentos.length})
        </button>
      </div>

      {aba === 'noticias' ? (
        <Card>
          {base.data.noticias.length === 0 ? (
            <EmptyState
              titulo="Nenhuma notícia"
              descricao="Publique comunicados oficiais, avisos de horário e resultados."
              icone={<Newspaper className="h-6 w-6" />}
              acao={<Button onClick={() => abrirNoticia('nova')}>Criar notícia</Button>}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Título</Th>
                  <Th>Slug</Th>
                  <Th>Publicação</Th>
                  <Th>Autor</Th>
                  <Th className="w-24 text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {base.data.noticias.map((n) => (
                  <tr key={n.id}>
                    <Td>
                      <p className="font-medium text-slate-800">{n.titulo}</p>
                      {n.resumo ? <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{n.resumo}</p> : null}
                    </Td>
                    <Td className="text-[11px] text-slate-500">{n.slug}</Td>
                    <Td>
                      <Badge tom={n.publicada ? 'verde' : 'cinza'}>{n.publicada ? 'Publicada' : 'Rascunho'}</Badge>
                    </Td>
                    <Td className="text-xs">{n.autor || '—'}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => abrirNoticia(n)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" aria-label="Excluir" onClick={() => setExcluindoNoticia(n)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      ) : (
        <Card>
          {base.data.documentos.length === 0 ? (
            <EmptyState
              titulo="Nenhum documento"
              descricao="Envie o Regulamento, os anexos e o Projeto Executivo em PDF."
              icone={<FileText className="h-6 w-6" />}
              acao={<Button onClick={() => abrirDocumento('novo')}>Enviar documento</Button>}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Documento</Th>
                  <Th>Tipo</Th>
                  <Th>Modalidade</Th>
                  <Th>Arquivo</Th>
                  <Th>Visível</Th>
                  <Th className="w-24 text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {base.data.documentos.map((d) => (
                  <tr key={d.id}>
                    <Td className="font-medium text-slate-800">{d.titulo}</Td>
                    <Td className="text-xs">{TIPOS_DOCUMENTO.find((t) => t.valor === d.tipo)?.rotulo ?? d.tipo}</Td>
                    <Td className="text-xs">{d.modalidades?.nome ?? '—'}</Td>
                    <Td className="text-xs">
                      {d.arquivo_url ? (
                        <a
                          href={d.arquivo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-700 hover:underline"
                        >
                          Abrir PDF
                        </a>
                      ) : (
                        <span className="text-amber-700">Sem arquivo</span>
                      )}
                    </Td>
                    <Td>
                      <Badge tom={d.publico ? 'verde' : 'cinza'}>{d.publico ? 'Público' : 'Interno'}</Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" aria-label="Editar" onClick={() => abrirDocumento(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" aria-label="Excluir" onClick={() => setExcluindoDocumento(d)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      <Dialog
        open={noticiaEditando !== null}
        onClose={() => setNoticiaEditando(null)}
        titulo={noticiaEditando === 'nova' ? 'Nova notícia' : 'Editar notícia'}
        largura="lg"
        rodape={
          <>
            <Button variant="outline" onClick={() => setNoticiaEditando(null)} disabled={salvandoNoticia}>
              Cancelar
            </Button>
            <Button onClick={salvarNoticia} loading={salvandoNoticia}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título" obrigatorio className="sm:col-span-2">
            <Input
              value={formNoticia.titulo}
              onChange={(e) =>
                setFormNoticia((f) => ({
                  ...f,
                  titulo: e.target.value,
                  slug: slugTocado ? f.slug : slugificar(e.target.value),
                }))
              }
            />
          </Field>
          <Field label="Slug" obrigatorio>
            <Input
              value={formNoticia.slug}
              onChange={(e) => {
                setSlugTocado(true)
                setFormNoticia({ ...formNoticia, slug: e.target.value })
              }}
              onBlur={() => setFormNoticia((f) => ({ ...f, slug: slugificar(f.slug) }))}
            />
          </Field>
          <Field label="Autor">
            <Input
              value={formNoticia.autor}
              onChange={(e) => setFormNoticia({ ...formNoticia, autor: e.target.value })}
            />
          </Field>
          <Field label="Resumo" className="sm:col-span-2">
            <Textarea
              value={formNoticia.resumo}
              onChange={(e) => setFormNoticia({ ...formNoticia, resumo: e.target.value })}
            />
          </Field>
          <Field label="Conteúdo" className="sm:col-span-2" hint="Texto simples; o portal preserva quebras de linha.">
            <Textarea
              className="min-h-[180px]"
              value={formNoticia.conteudo}
              onChange={(e) => setFormNoticia({ ...formNoticia, conteudo: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Checkbox
              label="Publicar no portal"
              checked={formNoticia.publicada}
              onChange={(e) => setFormNoticia({ ...formNoticia, publicada: e.target.checked })}
            />
          </div>
        </div>

        {erroNoticia ? (
          <div className="mt-3">
            <Aviso tom="erro">{erroNoticia}</Aviso>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={documentoEditando !== null}
        onClose={() => setDocumentoEditando(null)}
        titulo={documentoEditando === 'novo' ? 'Novo documento' : 'Editar documento'}
        rodape={
          <>
            <Button variant="outline" onClick={() => setDocumentoEditando(null)} disabled={salvandoDocumento}>
              Cancelar
            </Button>
            <Button onClick={salvarDocumento} loading={salvandoDocumento}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título" obrigatorio className="sm:col-span-2">
            <Input
              value={formDocumento.titulo}
              onChange={(e) => setFormDocumento({ ...formDocumento, titulo: e.target.value })}
              placeholder="Ex.: Regulamento Geral dos Jogos 2026"
            />
          </Field>
          <Field label="Tipo">
            <Select
              value={formDocumento.tipo}
              onChange={(e) =>
                setFormDocumento({ ...formDocumento, tipo: e.target.value as FormDocumento['tipo'] })
              }
            >
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Modalidade (opcional)">
            <Select
              value={formDocumento.modalidade_id}
              onChange={(e) => setFormDocumento({ ...formDocumento, modalidade_id: e.target.value })}
            >
              <option value="">Todos / geral</option>
              {base.data.modalidades.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ordem" className="w-32">
            <Input
              type="number"
              value={formDocumento.ordem}
              onChange={(e) => setFormDocumento({ ...formDocumento, ordem: e.target.value })}
            />
          </Field>
          <div className="flex items-end pb-1">
            <Checkbox
              label="Visível publicamente"
              checked={formDocumento.publico}
              onChange={(e) => setFormDocumento({ ...formDocumento, publico: e.target.checked })}
            />
          </div>
          <Field label="Arquivo PDF" className="sm:col-span-2" hint="Envie o PDF ou cole uma URL pública.">
            <div className="flex flex-wrap gap-2">
              <Input
                value={formDocumento.arquivo_url}
                onChange={(e) => setFormDocumento({ ...formDocumento, arquivo_url: e.target.value })}
                placeholder="https://…"
                className="min-w-[240px] flex-1"
              />
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Upload className="h-4 w-4" />
                {enviandoArquivo ? 'Enviando…' : 'Enviar PDF'}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={enviandoArquivo}
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0]
                    if (arquivo) void enviarArquivo(arquivo)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
          </Field>
        </div>

        {erroDocumento ? (
          <div className="mt-3">
            <Aviso tom="erro">{erroDocumento}</Aviso>
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={excluindoNoticia !== null}
        titulo="Excluir notícia"
        descricao={`Excluir “${excluindoNoticia?.titulo ?? ''}”?`}
        confirmar="Excluir"
        loading={removendo}
        onConfirm={excluirNoticia}
        onClose={() => setExcluindoNoticia(null)}
      />
      <ConfirmDialog
        open={excluindoDocumento !== null}
        titulo="Excluir documento"
        descricao={`Excluir “${excluindoDocumento?.titulo ?? ''}”? O arquivo no Storage não é apagado automaticamente.`}
        confirmar="Excluir"
        loading={removendo}
        onConfirm={excluirDocumento}
        onClose={() => setExcluindoDocumento(null)}
      />
    </>
  )
}
