import type {
  AbaArtilharia,
  AbaCartoes,
  AtletaArtilharia,
  AbaFreeFire,
  AbaGruposMataMata,
  AbaMataMata,
  AbaMedalhas,
  AbaQuiz,
  AbaRepescagem,
  AbaTempo,
  GrupoPlanilha,
  JogoChave,
} from './chaveamentosTypes'

export type LinhaClassificacaoGrupo = {
  pos: number
  nome: string
  grupoId: string
  j: number
  v: number
  e: number
  d: number
  pro: number
  contra: number
  saldo: number
  pts: number
}

export type PodioCalculado = {
  primeiro: string
  segundo: string
  terceiro: string
}

export function calcularClassificacaoGrupo(
  grupo: GrupoPlanilha,
  cfg: Pick<AbaGruposMataMata, 'pontosVitoria' | 'pontosEmpate' | 'pontosDerrota'>,
): LinhaClassificacaoGrupo[] {
  const stats = new Map<string, Omit<LinhaClassificacaoGrupo, 'pos'>>()
  for (const eq of grupo.equipes) {
    stats.set(eq.nome, {
      nome: eq.nome,
      grupoId: grupo.id,
      j: 0,
      v: 0,
      e: 0,
      d: 0,
      pro: 0,
      contra: 0,
      saldo: 0,
      pts: 0,
    })
  }

  for (const jogo of grupo.jogos) {
    if (jogo.placar1 === null || jogo.placar2 === null) continue
    const s1 = stats.get(jogo.eq1)
    const s2 = stats.get(jogo.eq2)
    if (!s1 || !s2) continue

    s1.j += 1
    s2.j += 1
    s1.pro += jogo.placar1
    s1.contra += jogo.placar2
    s2.pro += jogo.placar2
    s2.contra += jogo.placar1

    if (jogo.placar1 > jogo.placar2) {
      s1.v += 1
      s1.pts += cfg.pontosVitoria
      s2.d += 1
      s2.pts += cfg.pontosDerrota
    } else if (jogo.placar2 > jogo.placar1) {
      s2.v += 1
      s2.pts += cfg.pontosVitoria
      s1.d += 1
      s1.pts += cfg.pontosDerrota
    } else {
      s1.e += 1
      s2.e += 1
      s1.pts += cfg.pontosEmpate
      s2.pts += cfg.pontosEmpate
    }
  }

  const lista = [...stats.values()].map((s) => ({
    ...s,
    saldo: s.pro - s.contra,
  }))

  lista.sort(
    (a, b) =>
      b.pts - a.pts ||
      b.saldo - a.saldo ||
      b.pro - a.pro ||
      b.v - a.v ||
      a.nome.localeCompare(b.nome),
  )

  return lista.map((item, idx) => ({ ...item, pos: idx + 1 }))
}

function vencedorJogoSimples(
  eq1: string,
  eq2: string,
  p1: number | null,
  p2: number | null,
  desempate?: '1' | '2' | '',
): { vencedor: string | null; perdedor: string | null; empatePendente: boolean } {
  if (p1 === null || p2 === null) return { vencedor: null, perdedor: null, empatePendente: false }
  if (p1 > p2) return { vencedor: eq1, perdedor: eq2, empatePendente: false }
  if (p2 > p1) return { vencedor: eq2, perdedor: eq1, empatePendente: false }
  if (desempate === '1') return { vencedor: eq1, perdedor: eq2, empatePendente: false }
  if (desempate === '2') return { vencedor: eq2, perdedor: eq1, empatePendente: false }
  return { vencedor: null, perdedor: null, empatePendente: true }
}

export type EliminatoriaGrupoResolvida = {
  classificacoes: Record<string, LinhaClassificacaoGrupo[]>
  melhoresSegundos: LinhaClassificacaoGrupo[]
  jogosResolvidos: Array<{
    codigo: string
    fase: string
    eq1: string
    eq2: string
    vencedor: string | null
    perdedor: string | null
    empatePendente: boolean
  }>
  podio: PodioCalculado
}

export function resolverGruposMataMata(aba: AbaGruposMataMata): EliminatoriaGrupoResolvida {
  const classificacoes: Record<string, LinhaClassificacaoGrupo[]> = {}
  const grupoCompleto: Record<string, boolean> = {}

  for (const g of aba.grupos) {
    classificacoes[g.id] = calcularClassificacaoGrupo(g, aba)
    grupoCompleto[g.id] = g.jogos.length > 0 && g.jogos.every((j) => j.placar1 !== null && j.placar2 !== null)
  }

  const segundos: LinhaClassificacaoGrupo[] = aba.grupos
    .map((g) => classificacoes[g.id]?.[1])
    .filter((x): x is LinhaClassificacaoGrupo => Boolean(x))
    .sort((a, b) => b.pts - a.pts || b.saldo - a.saldo || b.pro - a.pro || b.v - a.v)

  const todosGruposProntos = aba.grupos.every((g) => grupoCompleto[g.id])

  const jogosResolvidos: EliminatoriaGrupoResolvida['jogosResolvidos'] = []
  let podio: PodioCalculado = { primeiro: 'A definir', segundo: 'A definir', terceiro: 'A definir' }

  if (aba.formatoEliminatoria === 'final_direta') {
    const g0 = aba.grupos[0]
    const tab = g0 ? classificacoes[g0.id] ?? [] : []
    const eq1 = todosGruposProntos && tab[0] ? tab[0].nome : '1º Colocado'
    const eq2 = todosGruposProntos && tab[1] ? tab[1].nome : '2º Colocado'
    const fin = aba.eliminatoria[0]
    const res = fin
      ? vencedorJogoSimples(eq1, eq2, fin.placar1, fin.placar2, fin.desempate)
      : { vencedor: null, perdedor: null, empatePendente: false }
    if (fin) {
      jogosResolvidos.push({ codigo: fin.codigo, fase: fin.fase, eq1, eq2, ...res })
    }
    podio = {
      primeiro: res.vencedor ?? 'A definir',
      segundo: res.perdedor ?? 'A definir',
      terceiro: todosGruposProntos && tab[2] ? tab[2].nome : 'A definir',
    }
    return { classificacoes, melhoresSegundos: segundos, jogosResolvidos, podio }
  }

  // Semis (2 grupos ou 3 grupos)
  let sf1Eq1 = '1º Grupo A'
  let sf1Eq2 = '2º Grupo B'
  let sf2Eq1 = '1º Grupo B'
  let sf2Eq2 = '2º Grupo A'

  if (aba.formatoEliminatoria === 'semis_2grupos') {
    const tA = classificacoes['A'] ?? []
    const tB = classificacoes['B'] ?? []
    if (grupoCompleto['A'] && tA[0]) sf1Eq1 = tA[0].nome
    if (grupoCompleto['B'] && tB[1]) sf1Eq2 = tB[1].nome
    if (grupoCompleto['B'] && tB[0]) sf2Eq1 = tB[0].nome
    if (grupoCompleto['A'] && tA[1]) sf2Eq2 = tA[1].nome
  } else {
    // 3 grupos: 1ºA, 1ºB, 1ºC + melhor 2º geral evitando confronto do mesmo grupo
    const tA = classificacoes['A'] ?? []
    const tB = classificacoes['B'] ?? []
    const tC = classificacoes['C'] ?? []
    const melhor2 = todosGruposProntos ? segundos[0] : undefined
    const lA = grupoCompleto['A'] && tA[0] ? tA[0].nome : '1º Grupo A'
    const lB = grupoCompleto['B'] && tB[0] ? tB[0].nome : '1º Grupo B'
    const lC = grupoCompleto['C'] && tC[0] ? tC[0].nome : '1º Grupo C'
    const m2 = melhor2 ? `${melhor2.nome} (2º ${melhor2.grupoId})` : 'Melhor 2º Geral'

    if (melhor2?.grupoId === 'A') {
      sf1Eq1 = lB
      sf1Eq2 = m2
      sf2Eq1 = lA
      sf2Eq2 = lC
    } else if (melhor2?.grupoId === 'B') {
      sf1Eq1 = lA
      sf1Eq2 = m2
      sf2Eq1 = lB
      sf2Eq2 = lC
    } else {
      sf1Eq1 = lA
      sf1Eq2 = m2
      sf2Eq1 = lB
      sf2Eq2 = lC
    }
  }

  const sf1 = aba.eliminatoria.find((j) => j.fase === 'Semifinal 1')
  const sf2 = aba.eliminatoria.find((j) => j.fase === 'Semifinal 2')
  const j3 = aba.eliminatoria.find((j) => j.fase === '3º Lugar')
  const fin = aba.eliminatoria.find((j) => j.fase === 'Final')

  const r1 = sf1 ? vencedorJogoSimples(sf1Eq1, sf1Eq2, sf1.placar1, sf1.placar2, sf1.desempate) : { vencedor: null, perdedor: null, empatePendente: false }
  const r2 = sf2 ? vencedorJogoSimples(sf2Eq1, sf2Eq2, sf2.placar1, sf2.placar2, sf2.desempate) : { vencedor: null, perdedor: null, empatePendente: false }

  if (sf1) jogosResolvidos.push({ codigo: sf1.codigo, fase: sf1.fase, eq1: sf1Eq1, eq2: sf1Eq2, ...r1 })
  if (sf2) jogosResolvidos.push({ codigo: sf2.codigo, fase: sf2.fase, eq1: sf2Eq1, eq2: sf2Eq2, ...r2 })

  const l3Eq1 = r1.perdedor ?? 'Perdedor Semifinal 1'
  const l3Eq2 = r2.perdedor ?? 'Perdedor Semifinal 2'
  const r3 = j3 ? vencedorJogoSimples(l3Eq1, l3Eq2, j3.placar1, j3.placar2, j3.desempate) : { vencedor: null, perdedor: null, empatePendente: false }
  if (j3) jogosResolvidos.push({ codigo: j3.codigo, fase: j3.fase, eq1: l3Eq1, eq2: l3Eq2, ...r3 })

  const finEq1 = r1.vencedor ?? 'Vencedor Semifinal 1'
  const finEq2 = r2.vencedor ?? 'Vencedor Semifinal 2'
  const rFin = fin ? vencedorJogoSimples(finEq1, finEq2, fin.placar1, fin.placar2, fin.desempate) : { vencedor: null, perdedor: null, empatePendente: false }
  if (fin) jogosResolvidos.push({ codigo: fin.codigo, fase: fin.fase, eq1: finEq1, eq2: finEq2, ...rFin })

  podio = {
    primeiro: rFin.vencedor ?? 'A definir',
    segundo: rFin.perdedor ?? 'A definir',
    terceiro: r3.vencedor ?? 'A definir',
  }

  return { classificacoes, melhoresSegundos: segundos, jogosResolvidos, podio }
}

export type RepescagemItem = {
  pos: number
  jogoCodigo: string
  participante: string
  criterio1: number
  criterio2: number
  classificado: boolean
}

export type JogoChaveResolvido = {
  jogo: JogoChave
  lado1: string
  lado2: string
  vencedor: string | null
  perdedor: string | null
  empatePendente: boolean
}

function avaliarJogoChave(jogo: JogoChave, lado1: string, lado2: string) {
  if (jogo.placar1 === null || jogo.placar2 === null) {
    return { vencedor: null, perdedor: null, empatePendente: false }
  }
  if (jogo.placar1 > jogo.placar2) return { vencedor: lado1, perdedor: lado2, empatePendente: false }
  if (jogo.placar2 > jogo.placar1) return { vencedor: lado2, perdedor: lado1, empatePendente: false }
  // Tie: check penalties first, then manual tiebreak
  if (jogo.pen1 !== undefined && jogo.pen2 !== undefined && jogo.pen1 !== null && jogo.pen2 !== null) {
    if (jogo.pen1 > jogo.pen2) return { vencedor: lado1, perdedor: lado2, empatePendente: false }
    if (jogo.pen2 > jogo.pen1) return { vencedor: lado2, perdedor: lado1, empatePendente: false }
  }
  if (jogo.desempate === '1') return { vencedor: lado1, perdedor: lado2, empatePendente: false }
  if (jogo.desempate === '2') return { vencedor: lado2, perdedor: lado1, empatePendente: false }
  return { vencedor: null, perdedor: null, empatePendente: true }
}

export function resolverBracket(aba: AbaMataMata | AbaRepescagem): {
  primeiraFaseResolvida: JogoChaveResolvido[]
  repescagem: RepescagemItem[]
  fasesResolvidas: Array<{ id: string; nome: string; jogos: JogoChaveResolvido[] }>
  podio: PodioCalculado
} {
  const winners = new Map<string, string>()
  const losers = new Map<string, string>()
  const byes = new Map<string, string>()

  if (aba.tipo === 'mata_mata') {
    for (const b of aba.byes) byes.set(b.codigo.toUpperCase(), b.participante)
  }

  const primeiraFaseResolvida: JogoChaveResolvido[] = []
  const repescagem: RepescagemItem[] = []

  if (aba.tipo === 'repescagem') {
    const candidatos: Array<{ jogoCodigo: string; participante: string; criterio1: number; criterio2: number }> = []
    for (const j of aba.primeiraFase) {
      const res = avaliarJogoChave(j, j.lado1Origem, j.lado2Origem)
      primeiraFaseResolvida.push({ jogo: j, lado1: j.lado1Origem, lado2: j.lado2Origem, ...res })
      if (res.vencedor) winners.set(j.codigo, res.vencedor)
      if (res.perdedor) {
        losers.set(j.codigo, res.perdedor)
        const pMin = Math.min(j.placar1 ?? 0, j.placar2 ?? 0)
        const extra = j.extraPerdedor ?? 0
        // Damas M: extraPerdedor (peças capturadas) is primary; Tênis de Mesa M: sets (pMin) then pts (extra); Tacobol: pts (pMin)
        const c1 = aba.rotuloExtraPerdedor?.includes('Peças') ? extra : pMin
        const c2 = aba.rotuloExtraPerdedor?.includes('Peças') ? 0 : extra
        candidatos.push({ jogoCodigo: j.codigo, participante: res.perdedor, criterio1: c1, criterio2: c2 })
      }
    }
    candidatos.sort((a, b) => b.criterio1 - a.criterio1 || b.criterio2 - a.criterio2 || a.jogoCodigo.localeCompare(b.jogoCodigo))
    candidatos.forEach((c, i) => {
      repescagem.push({
        ...c,
        pos: i + 1,
        classificado: i < aba.repescagemVagas,
      })
    })
  }

  const resolveRef = (origem: string): string => {
    if (origem.startsWith('@BYE:')) {
      const key = origem.slice(5).trim().toUpperCase()
      return byes.get(key) ?? origem.slice(5)
    }
    if (origem.startsWith('@WIN:')) {
      const cod = origem.slice(5).trim()
      return winners.get(cod) ?? `Vencedor ${cod}`
    }
    if (origem.startsWith('@LOSE:')) {
      const cod = origem.slice(6).trim()
      return losers.get(cod) ?? `Perdedor ${cod}`
    }
    if (origem.startsWith('@REP:')) {
      const idx = Number(origem.slice(5).trim()) - 1
      const item = repescagem[idx]
      return item ? `${item.participante} (Rep. ${idx + 1}º)` : `${idx + 1}º Melhor 2º`
    }
    return origem
  }

  const fasesResolvidas: Array<{ id: string; nome: string; jogos: JogoChaveResolvido[] }> = []
  let jogoFinal: JogoChaveResolvido | null = null
  let jogoTerceiro: JogoChaveResolvido | null = null

  for (const fase of aba.fases) {
    const jogos: JogoChaveResolvido[] = []
    for (const j of fase.jogos) {
      const l1 = resolveRef(j.lado1Origem)
      const l2 = resolveRef(j.lado2Origem)
      const res = avaliarJogoChave(j, l1, l2)
      const item: JogoChaveResolvido = { jogo: j, lado1: l1, lado2: l2, ...res }
      jogos.push(item)
      if (res.vencedor) winners.set(j.codigo, res.vencedor)
      if (res.perdedor) losers.set(j.codigo, res.perdedor)

      const rotUp = `${j.rotulo} ${fase.nome}`.toUpperCase()
      if (rotUp.includes('3º') || j.codigo === '3L') jogoTerceiro = item
      if (rotUp.includes('FINAL') && !rotUp.includes('OITAVAS') && !rotUp.includes('QUARTAS') && !rotUp.includes('SEMI') && !rotUp.includes('3º')) {
        jogoFinal = item
      }
    }
    fasesResolvidas.push({ id: fase.id, nome: fase.nome, jogos })
  }

  // Fallback: last two games of last phase if named by code only (e.g., X13 / X14)
  const ultimaFase = fasesResolvidas[fasesResolvidas.length - 1]
  if (ultimaFase && ultimaFase.jogos.length >= 2) {
    if (!jogoTerceiro) jogoTerceiro = ultimaFase.jogos[0]
    if (!jogoFinal) jogoFinal = ultimaFase.jogos[ultimaFase.jogos.length - 1]
  } else if (ultimaFase && ultimaFase.jogos.length === 1 && !jogoFinal) {
    jogoFinal = ultimaFase.jogos[0]
  }

  const podio: PodioCalculado = {
    primeiro: jogoFinal?.vencedor ?? 'A definir',
    segundo: jogoFinal?.perdedor ?? 'A definir',
    terceiro: jogoTerceiro?.vencedor ?? 'A definir',
  }

  return { primeiraFaseResolvida, repescagem, fasesResolvidas, podio }
}

export type LinhaTempoCalculada = {
  pos: number | null
  peito: string
  nome: string
  turma: string
  presenca: string
  tempoFinal: number | null
  melhor: number | null
  segundo: number | null
  terceiro: number | null
  penalidade: number
  status: string
}

export function calcularTempo(aba: AbaTempo): { linhas: LinhaTempoCalculada[]; podio: PodioCalculado } {
  const penSeg = aba.penalidadeSegundos ?? 2
  const base = aba.competidores.map((c) => {
    if (aba.modo === 'circuito') {
      const invalido = c.presenca !== 'Presente'
      const faltas = c.faltas ?? 0
      const penalidade = c.tempoBruto !== null && c.tempoBruto !== undefined ? faltas * penSeg : 0
      const tempoFinal =
        !invalido && c.tempoBruto !== null && c.tempoBruto !== undefined
          ? Number((c.tempoBruto + penalidade).toFixed(2))
          : null
      const status = invalido ? c.presenca : tempoFinal !== null ? 'Concluído' : 'Aguardando'
      return {
        pos: null as number | null,
        peito: c.peito,
        nome: c.nome,
        turma: c.turma,
        presenca: c.presenca,
        tempoFinal,
        melhor: tempoFinal,
        segundo: null,
        terceiro: null,
        penalidade,
        status,
      }
    }
    // Cubo Mágico: melhor de 3
    const validos = [c.tent1, c.tent2, c.tent3]
      .filter((t): t is number => t !== null && t !== undefined && Number.isFinite(t))
      .sort((a, b) => a - b)
    const melhor = validos[0] ?? null
    const segundo = validos[1] ?? null
    const terceiro = validos[2] ?? null
    const status =
      validos.length === 3 ? 'Concluído' : validos.length > 0 ? `${validos.length}/3` : 'Aguardando'
    return {
      pos: null as number | null,
      peito: c.peito,
      nome: c.nome,
      turma: c.turma,
      presenca: c.presenca,
      tempoFinal: melhor,
      melhor,
      segundo,
      terceiro,
      penalidade: 0,
      status,
    }
  })

  const ordenados = [...base].sort((a, b) => {
    if (a.melhor === null && b.melhor === null) return a.peito.localeCompare(b.peito)
    if (a.melhor === null) return 1
    if (b.melhor === null) return -1
    if (a.melhor !== b.melhor) return a.melhor - b.melhor
    if ((a.segundo ?? Infinity) !== (b.segundo ?? Infinity)) {
      return (a.segundo ?? Infinity) - (b.segundo ?? Infinity)
    }
    return (a.terceiro ?? Infinity) - (b.terceiro ?? Infinity)
  })

  ordenados.forEach((item, idx) => {
    item.pos = item.melhor !== null ? idx + 1 : null
  })

  const podio: PodioCalculado = {
    primeiro: ordenados[0]?.melhor !== null ? `${ordenados[0].nome} (${ordenados[0].turma}) — ${ordenados[0].melhor}s` : 'A definir',
    segundo: ordenados[1]?.melhor !== null ? `${ordenados[1].nome} (${ordenados[1].turma}) — ${ordenados[1].melhor}s` : 'A definir',
    terceiro: ordenados[2]?.melhor !== null ? `${ordenados[2].nome} (${ordenados[2].turma}) — ${ordenados[2].melhor}s` : 'A definir',
  }

  return { linhas: ordenados, podio }
}

export function calcularFreeFire(aba: AbaFreeFire) {
  const ptsPos = (pos: number | null) => (pos !== null ? (aba.tabelaPontos[String(pos)] ?? 0) : 0)

  const classif = aba.squads.map((s) => {
    const p1 = s.q1Pos !== null ? ptsPos(s.q1Pos) + (s.q1Abates ?? 0) : null
    const p2 = s.q2Pos !== null ? ptsPos(s.q2Pos) + (s.q2Abates ?? 0) : null
    const p3 = s.q3Pos !== null ? ptsPos(s.q3Pos) + (s.q3Abates ?? 0) : null
    const booyahs = [s.q1Pos, s.q2Pos, s.q3Pos].filter((p) => p === 1).length
    const abates = (s.q1Abates ?? 0) + (s.q2Abates ?? 0) + (s.q3Abates ?? 0)
    const total = (p1 ?? 0) + (p2 ?? 0) + (p3 ?? 0)
    const temDados = s.q1Pos !== null || s.q2Pos !== null || s.q3Pos !== null
    return { ...s, p1, p2, p3, booyahs, abates, total, temDados }
  })

  classif.sort((a, b) => {
    if (!a.temDados && !b.temDados) return a.id.localeCompare(b.id)
    if (!a.temDados) return 1
    if (!b.temDados) return -1
    return b.total - a.total || b.booyahs - a.booyahs || b.abates - a.abates
  })

  const top6 = classif.slice(0, 6)
  const finalistas = aba.quedaFinal.map((slot, idx) => {
    const sq = top6[idx]
    const ptsColoc = ptsPos(slot.posFinal)
    const abates = slot.abatesFinal ?? 0
    const totalFinal = slot.posFinal !== null ? ptsColoc + abates : null
    return {
      slot: slot.slot,
      id: sq?.id ?? '-',
      nome: sq?.temDados ? sq.nome : `${idx + 1}º Classificado`,
      ptsFase1: sq?.total ?? 0,
      posFinal: slot.posFinal,
      abatesFinal: slot.abatesFinal,
      ptsColoc: slot.posFinal !== null ? ptsColoc : null,
      totalFinal,
    }
  })

  const finalOrdenada = [...finalistas].sort((a, b) => {
    if (a.totalFinal === null && b.totalFinal === null) return a.slot - b.slot
    if (a.totalFinal === null) return 1
    if (b.totalFinal === null) return -1
    const booyahA = a.posFinal === 1 ? 1 : 0
    const booyahB = b.posFinal === 1 ? 1 : 0
    return (
      b.totalFinal - a.totalFinal ||
      booyahB - booyahA ||
      (b.abatesFinal ?? 0) - (a.abatesFinal ?? 0) ||
      b.ptsFase1 - a.ptsFase1
    )
  })

  const podio: PodioCalculado = {
    primeiro: finalOrdenada[0]?.totalFinal !== null ? `${finalOrdenada[0].nome} (${finalOrdenada[0].totalFinal} pts)` : 'A definir na Queda Final',
    segundo: finalOrdenada[1]?.totalFinal !== null ? `${finalOrdenada[1].nome} (${finalOrdenada[1].totalFinal} pts)` : 'A definir na Queda Final',
    terceiro: finalOrdenada[2]?.totalFinal !== null ? `${finalOrdenada[2].nome} (${finalOrdenada[2].totalFinal} pts)` : 'A definir na Queda Final',
  }

  return { classif, finalistas, finalOrdenada, podio }
}

export function calcularQuiz(aba: AbaQuiz) {
  const ordenadas = [...aba.equipes].sort((a, b) => {
    const valA = a.presenca === 'Presente' && a.pontuacao !== null
    const valB = b.presenca === 'Presente' && b.pontuacao !== null
    if (!valA && !valB) return a.id.localeCompare(b.id)
    if (!valA) return 1
    if (!valB) return -1
    return (
      (b.pontuacao ?? 0) - (a.pontuacao ?? 0) ||
      (b.acertos ?? 0) - (a.acertos ?? 0) ||
      (b.desempate ?? 0) - (a.desempate ?? 0)
    )
  })

  const temPont = (e: (typeof ordenadas)[number] | undefined) =>
    Boolean(e && e.presenca === 'Presente' && e.pontuacao !== null)

  const podio: PodioCalculado = {
    primeiro: temPont(ordenadas[0]) ? `${ordenadas[0].nome} [${ordenadas[0].nickname}] — ${ordenadas[0].pontuacao} pts` : 'A definir',
    segundo: temPont(ordenadas[1]) ? `${ordenadas[1].nome} [${ordenadas[1].nickname}] — ${ordenadas[1].pontuacao} pts` : 'A definir',
    terceiro: temPont(ordenadas[2]) ? `${ordenadas[2].nome} [${ordenadas[2].nickname}] — ${ordenadas[2].pontuacao} pts` : 'A definir',
  }

  return { ordenadas, podio }
}

export type LinhaArtilharia = {
  pos: number
  atleta: AtletaArtilharia
  total: number
}

export function calcularArtilharia(aba: AbaArtilharia): LinhaArtilharia[] {
  return aba.atletas
    .map((atleta) => ({
      atleta,
      total: atleta.gols.reduce<number>((soma, gols) => soma + (gols ?? 0), 0),
    }))
    .sort(
      (a, b) =>
        b.total - a.total || a.atleta.nome.localeCompare(b.atleta.nome, 'pt-BR'),
    )
    .map((linha, index) => ({ pos: index + 1, ...linha }))
}

export type LinhaMedalhas = {
  pos: number
  turma: string
  serie: string
  ouro: number
  prata: number
  bronze: number
  pontos: number
}

export type ClassificacaoMedalhas = {
  linhas: LinhaMedalhas[]
  totalPodios: number
  podiosLancados: number
}

function seriePorTurma(turma: string): string {
  const numero = turma.replace(/\D/g, '').slice(0, 1)
  if (numero === '1') return '1º Ano'
  if (numero === '2') return '2º Ano'
  if (numero === '3') return '3º Ano'
  return ''
}

export function calcularMedalhas(aba: AbaMedalhas): ClassificacaoMedalhas {
  const linhas = new Map<string, Omit<LinhaMedalhas, 'pos'>>()
  const garante = (turma: string) => {
    let linha = linhas.get(turma)
    if (!linha) {
      linha = {
        turma,
        serie: seriePorTurma(turma),
        ouro: 0,
        prata: 0,
        bronze: 0,
        pontos: 0,
      }
      linhas.set(turma, linha)
    }
    return linha
  }

  for (const delegacao of aba.delegacoes) {
    const linha = garante(delegacao.turma)
    if (delegacao.serie) linha.serie = delegacao.serie
  }

  let podiosLancados = 0
  for (const podio of aba.podios) {
    const temAlgum = Boolean(podio.ouro || podio.prata || podio.bronze)
    if (temAlgum) podiosLancados += 1
    for (const [campo, chave] of [
      ['ouro', 'ouro'],
      ['prata', 'prata'],
      ['bronze', 'bronze'],
    ] as const) {
      const valor = podio[campo].trim()
      if (!valor) continue
      garante(valor)[chave] += 1
    }
  }

  const ordenadas = [...linhas.values()]
    .map((linha) => ({
      ...linha,
      pontos:
        linha.ouro * aba.pesos.ouro +
        linha.prata * aba.pesos.prata +
        linha.bronze * aba.pesos.bronze,
    }))
    .sort(
      (a, b) =>
        b.pontos - a.pontos ||
        b.ouro - a.ouro ||
        b.prata - a.prata ||
        b.bronze - a.bronze ||
        a.turma.localeCompare(b.turma, 'pt-BR', { numeric: true }),
    )
    .map((linha, index) => ({ pos: index + 1, ...linha }))

  return {
    linhas: ordenadas,
    totalPodios: aba.podios.length,
    podiosLancados,
  }
}

export type LinhaCartoes = {
  pos: number
  nome: string
  turma: string
  categoria: string
  amarelos: number
  vermelhos: number
  total: number
}

export function calcularCartoes(aba: AbaCartoes): LinhaCartoes[] {
  const mapa = new Map<string, Omit<LinhaCartoes, 'pos' | 'amarelos' | 'vermelhos' | 'total'> & {
    amarelos: number
    vermelhos: number
  }>()

  for (const cartao of aba.cartoes) {
    const chave = `${cartao.nome}|${cartao.turma}|${cartao.categoria}`
    let linha = mapa.get(chave)
    if (!linha) {
      linha = {
        nome: cartao.nome,
        turma: cartao.turma,
        categoria: cartao.categoria,
        amarelos: 0,
        vermelhos: 0,
      }
      mapa.set(chave, linha)
    }
    if (cartao.tipo === 'vermelho') linha.vermelhos += 1
    else linha.amarelos += 1
  }

  return [...mapa.values()]
    .map((linha) => ({ ...linha, total: linha.amarelos + linha.vermelhos }))
    .sort(
      (a, b) =>
        b.vermelhos - a.vermelhos ||
        b.amarelos - a.amarelos ||
        a.nome.localeCompare(b.nome, 'pt-BR'),
    )
    .map((linha, index) => ({ pos: index + 1, ...linha }))
}
