import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatarData(iso: string | null | undefined) {
  if (!iso) return '—'
  return format(new Date(iso), "dd/MM/yyyy", { locale: ptBR })
}

export function formatarDataHora(iso: string | null | undefined) {
  if (!iso) return 'Não definido'
  return format(new Date(iso), "dd/MM 'às' HH:mm", { locale: ptBR })
}

export function formatarHora(iso: string | null | undefined) {
  if (!iso) return '—'
  return format(new Date(iso), 'HH:mm')
}

export function paraInputDataHora(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`
}

export function deInputDataHora(valor: string) {
  if (!valor) return null
  return new Date(valor).toISOString()
}

export function numero(valor: unknown): number | null {
  if (valor === '' || valor === null || valor === undefined) return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

export function numeroOu(valor: unknown, padrao = 0) {
  const n = numero(valor)
  return n ?? padrao
}

export function texto(valor: unknown) {
  if (valor === null || valor === undefined) return ''
  return String(valor)
}

export function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function turmaRotulo(turma: { numero: number; nome_equipe?: string | null } | null | undefined) {
  if (!turma) return 'Turma'
  return turma.nome_equipe ? `${turma.numero} · ${turma.nome_equipe}` : String(turma.numero)
}

export function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}
