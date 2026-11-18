import { useState } from 'react'
import { History, Medal } from 'lucide-react'
import {
  Badge,
  Card,
  Carregando,
  EmptyState,
  ErroBox,
  PageHeader,
  Table,
  Td,
  Th,
} from '@/components/ui'
import { formatarDataHora } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import type { Auditoria, HistoricoResultado } from '@/lib/types'

type Aba = 'resultados' | 'auditoria'

function Json({ valor }: { valor: unknown }) {
  if (valor === null || valor === undefined) return <span className="text-slate-400">—</span>
  return (
    <details className="max-w-[380px]">
      <summary className="cursor-pointer text-[11px] text-brand-700">ver JSON</summary>
      <pre className="mt-1 max-h-56 overflow-auto rounded bg-slate-50 p-2 text-[10px] leading-relaxed text-slate-700">
        {JSON.stringify(valor, null, 2)}
      </pre>
    </details>
  )
}

export default function Historico() {
  const [aba, setAba] = useState<Aba>('resultados')

  const resultados = useAsync(async () => {
    const { data, error } = await supabase
      .from('resultados_historico')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error
    return data as HistoricoResultado[]
  })

  const auditoria = useAsync(async () => {
    const { data, error } = await supabase
      .from('auditoria')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error
    return data as Auditoria[]
  })

  const ativo = aba === 'resultados' ? resultados : auditoria

  return (
    <>
      <PageHeader
        titulo="Histórico e auditoria"
        descricao="Quem alterou o quê e quando. Resultados guardam o valor anterior e o novo; demais tabelas registram as mudanças principais."
      />

      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setAba('resultados')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
            aba === 'resultados' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Medal className="h-3.5 w-3.5" /> Resultados
        </button>
        <button
          type="button"
          onClick={() => setAba('auditoria')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
            aba === 'auditoria' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="h-3.5 w-3.5" /> Auditoria
        </button>
      </div>

      {ativo.loading ? (
        <Carregando />
      ) : ativo.error ? (
        <ErroBox mensagem={ativo.error} onRetry={ativo.reload} />
      ) : (
        <Card>
          {aba === 'resultados' ? (
            (resultados.data ?? []).length === 0 ? (
              <EmptyState
                titulo="Nenhuma alteração de resultado"
                descricao="Correções e anulações de resultados oficiais aparecem aqui."
                icone={<Medal className="h-6 w-6" />}
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Quando</Th>
                    <Th>Ação</Th>
                    <Th>Resultado</Th>
                    <Th>Usuário</Th>
                    <Th>Antes</Th>
                    <Th>Depois</Th>
                  </tr>
                </thead>
                <tbody>
                  {(resultados.data ?? []).map((h) => (
                    <tr key={h.id}>
                      <Td className="whitespace-nowrap text-[11px] tabular-nums text-slate-500">
                        {formatarDataHora(h.created_at)}
                      </Td>
                      <Td>
                        <Badge tom="azul">{h.acao}</Badge>
                      </Td>
                      <Td className="font-mono text-[10px] text-slate-500">{h.resultado_id.slice(0, 8)}…</Td>
                      <Td className="font-mono text-[10px] text-slate-500">
                        {h.usuario_id ? `${h.usuario_id.slice(0, 8)}…` : '—'}
                      </Td>
                      <Td>
                        <Json valor={h.dados_anteriores} />
                      </Td>
                      <Td>
                        <Json valor={h.dados_novos} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )
          ) : (auditoria.data ?? []).length === 0 ? (
            <EmptyState
              titulo="Nenhum registro de auditoria"
              descricao="Alterações em configurações, turmas, inscrições e partidas aparecem aqui."
              icone={<History className="h-6 w-6" />}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Quando</Th>
                  <Th>Tabela</Th>
                  <Th>Ação</Th>
                  <Th>Registro</Th>
                  <Th>Usuário</Th>
                  <Th>Dados</Th>
                </tr>
              </thead>
              <tbody>
                {(auditoria.data ?? []).map((a) => (
                  <tr key={a.id}>
                    <Td className="whitespace-nowrap text-[11px] tabular-nums text-slate-500">
                      {formatarDataHora(a.created_at)}
                    </Td>
                    <Td className="text-xs font-medium">{a.tabela}</Td>
                    <Td>
                      <Badge tom={a.acao === 'DELETE' ? 'vermelho' : a.acao === 'INSERT' ? 'verde' : 'azul'}>
                        {a.acao}
                      </Badge>
                    </Td>
                    <Td className="font-mono text-[10px] text-slate-500">
                      {a.registro_id ? `${a.registro_id.slice(0, 8)}…` : '—'}
                    </Td>
                    <Td className="font-mono text-[10px] text-slate-500">
                      {a.usuario_id ? `${a.usuario_id.slice(0, 8)}…` : '—'}
                    </Td>
                    <Td>
                      <div className="space-y-1">
                        <Json valor={a.dados_anteriores} />
                        <Json valor={a.dados_novos} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </>
  )
}
