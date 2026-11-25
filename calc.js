// Agregações do Geladeira Tracker (do grupo). Funciona no navegador (window.GTCalc) e no Node (globalThis.GTCalc).
// Regra: somar os totais e dividir no fim (nunca média de médias).
// Partida da Geladeira = 2 ou mais membros no mesmo time. r = 'V' | 'D' | 'E' (time da Geladeira) ou 'X' (membros nos dois times:
// entra nas estatísticas individuais, fica fora do win rate do grupo e é contada à parte).
(function () {
  'use strict';
  const r = (x, c = 2) => Number(x.toFixed(c));

  // Soma linhas { v, dd, k, m, a, dano, rod, hs, kast, fk, rt } e calcula as taxas no fim.
  function somar(linhas) {
    const s = { partidas: 0, v: 0, d: 0, k: 0, mortes: 0, a: 0, dano: 0, rod: 0, hs: 0, kast: 0, fk: 0, mk: 0 };
    let rt = 0, nrt = 0;
    for (const j of linhas) { s.partidas++; s.v += j.v; s.d += j.dd; s.k += j.k; s.mortes += j.m; s.a += j.a; s.dano += j.dano; s.rod += j.rod; s.hs += j.hs; s.kast += j.kast; s.fk += j.fk; s.mk += j.mk || 0; if (j.rt) { rt += j.rt; nrt++; } }
    return { ...s, wr: r(s.v / Math.max(1, s.v + s.d), 4), kd: r(s.k / Math.max(1, s.mortes)), adr: r(s.dano / Math.max(1, s.rod), 1), hsPct: r(s.hs / Math.max(1, s.k), 4), kastPct: r(s.kast / Math.max(1, s.rod), 4), fkRod: r(s.fk / Math.max(1, s.rod), 3), mkRod: r(s.mk / Math.max(1, s.rod), 3), rating: nrt ? Math.round(rt / nrt) : null };
  }
  const linhaMembro = (x) => ({ ...x, v: x.r === 'V' ? 1 : 0, dd: x.r === 'D' ? 1 : 0 }); // resultado do time do próprio membro

  // Veto por mapa: compara o win rate (wr) com a previsão da GC (esp) usando margem que cresce quando há poucas partidas.
  // Devolve 'mais' | 'abaixo' | 'amostra' (menos de 10 partidas) | 'neutro'. Função pura (testável pelo Node).
  const MIN_VETO = 10;
  function classificarMapa({ n, wr, esp }) {
    if (!(n >= MIN_VETO)) return 'amostra';
    if (!Number.isFinite(wr) || !Number.isFinite(esp)) return 'neutro';
    const dif = wr - esp, margem = Math.max(0.05, Math.sqrt(esp * (1 - esp) / n));
    return dif >= margem ? 'mais' : dif <= -margem ? 'abaixo' : 'neutro';
  }

  const agrupar = (ms, chave) => { const g = new Map(); for (const m of ms) { const k = chave(m); if (!g.has(k)) g.set(k, []); g.get(k).push(m); } return g; };
  const mesDe = (m) => m.d.slice(0, 7);
  const semMistas = (ms) => ms.filter((m) => !m.mix);

  // Números do grupo: win rate só das partidas sem membros nos dois times; K/D, ADR etc. somando todos os membros em campo.
  function grupo(ms) {
    let v = 0, d = 0, e = 0, mistas = 0; const lin = [];
    for (const m of ms) {
      if (m.r === 'X') mistas++; else if (m.r === 'V') v++; else if (m.r === 'D') d++; else e++;
      for (const x of m.mem) lin.push({ ...x, v: 0, dd: 0 });
    }
    const s = somar(lin);
    return { ...s, partidas: ms.length, participacoes: lin.length, v, d, e, mistas, comResultado: v + d + e, wr: r(v / Math.max(1, v + d), 4) };
  }
  const meses = (ms) => [...agrupar(ms, mesDe).entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, ps]) => ({ mes, ...grupo(ps) }));
  const mapas = (ms) => [...agrupar(ms, (m) => m.mp).entries()].map(([mapa, ps]) => ({ mapa, ...grupo(ps) })).sort((a, b) => b.partidas - a.partidas);
  const FAIXAS = [['Madrugada (0h–5h)', 0, 5], ['Manhã (6h–11h)', 6, 11], ['Tarde (12h–17h)', 12, 17], ['Noite (18h–23h)', 18, 23]];
  const horario = (ms) => FAIXAS.map(([faixa, a, b]) => ({ faixa, ...grupo(ms.filter((m) => m.h >= a && m.h <= b)) })).filter((x) => x.partidas > 0);

  // Números individuais de cada membro em todas as partidas da Geladeira que ele jogou (inclusive as mistas).
  function membros(ms, ordem) {
    const out = [];
    for (const nome of ordem) {
      const lin = []; for (const m of ms) for (const x of m.mem) if (x.n === nome) lin.push(linhaMembro(x));
      if (lin.length) out.push({ jogador: nome, ...somar(lin) });
    }
    return out;
  }
  // Membro por mês.
  function membrosMes(ms, ordem) {
    const out = [];
    for (const nome of ordem) {
      const por = new Map();
      for (const m of ms) for (const x of m.mem) if (x.n === nome) { const k = mesDe(m); if (!por.has(k)) por.set(k, []); por.get(k).push(linhaMembro(x)); }
      for (const [mes, lin] of [...por.entries()].sort((a, b) => a[0].localeCompare(b[0]))) out.push({ jogador: nome, mes, ...somar(lin) });
    }
    return out;
  }
  // Outros membros no mesmo time do membro: resultado dele junto de cada um.
  function comQuem(ms, nome) {
    const por = new Map();
    for (const m of ms) { const eu = m.mem.find((x) => x.n === nome); if (!eu) continue; for (const x of m.mem) if (x.n !== nome && x.l === eu.l) { if (!por.has(x.n)) por.set(x.n, []); por.get(x.n).push(linhaMembro(eu)); } }
    return [...por.entries()].map(([com, lin]) => ({ com, ...somar(lin) }));
  }

  // Soma só as linhas dos membros pedidos (para o montador de line).
  function somarMembros(ms, nomes) {
    const lin = []; for (const m of ms) for (const x of m.mem) if (!nomes.length || nomes.includes(x.n)) lin.push({ ...x, v: 0, dd: 0 });
    return somar(lin);
  }

  // Filtro com/sem: "com" = todos no mesmo time na partida; "sem" = nenhum deles na partida.
  function comSem(ms, com = [], sem = []) {
    if (!com.length && !sem.length) return ms;
    return ms.filter((m) => {
      if (sem.some((s) => m.mem.some((x) => x.n === s))) return false;
      return !com.length || ['A', 'B'].some((l) => com.every((c) => m.mem.some((x) => x.n === c && x.l === l)));
    });
  }

  // Lines (2 a 5 membros juntos no mesmo time), só partidas sem membros nos dois times. K/D e ADR são dos membros da line.
  function combos(ms, ordem) {
    const pos = new Map(ordem.map((nm, i) => [nm, i]));
    const mapa = new Map();
    for (const m of semMistas(ms)) {
      const mem = m.mem.filter((x) => pos.has(x.n)).sort((a, b) => pos.get(a.n) - pos.get(b.n));
      const L = mem.length;
      for (let mask = 1; mask < (1 << L); mask++) {
        const sub = []; for (let i = 0; i < L; i++) if (mask & (1 << i)) sub.push(mem[i]);
        if (sub.length < 2) continue;
        const k = sub.map((x) => x.n).join(' + ');
        if (!mapa.has(k)) mapa.set(k, { nomes: sub.map((x) => x.n), v: 0, d: 0, e: 0, partidas: 0, lin: [] });
        const c = mapa.get(k); c.partidas++; if (m.r === 'V') c.v++; else if (m.r === 'D') c.d++; else c.e++;
        for (const x of sub) c.lin.push({ ...x, v: 0, dd: 0 });
      }
    }
    return [...mapa.entries()].map(([combinacao, c]) => { const s = somar(c.lin); return { combinacao, nomes: c.nomes, tamanho: c.nomes.length, partidas: c.partidas, v: c.v, d: c.d, wr: r(c.v / Math.max(1, c.v + c.d), 4), kd: s.kd, adr: s.adr }; });
  }

  // Níveis e previsão da GC (só partidas sem membros nos dois times).
  const FAIXAS_NIVEL = [['menos de 16', (m) => m < 16], ['16 a 17,4', (m) => m >= 16 && m < 17.5], ['17,5 a 18,4', (m) => m >= 17.5 && m < 18.5], ['18,5 a 19,4', (m) => m >= 18.5 && m < 19.5], ['19,5 ou mais', (m) => m >= 19.5]];
  const FAIXAS_DIF = [['1 ou mais abaixo', (x) => x <= -1], ['um pouco abaixo', (x) => x > -1 && x < -0.3], ['empatado (±0,3)', (x) => x >= -0.3 && x <= 0.3], ['um pouco acima', (x) => x > 0.3 && x < 1], ['1 ou mais acima', (x) => x >= 1]];
  const FAIXAS_PROB = [['azarão (menos de 45%)', (x) => x < 45], ['equilibrado (45% a 55%)', (x) => x >= 45 && x <= 55], ['favorito (mais de 55%)', (x) => x > 55]];
  function niveis(ms0) {
    const ms = semMistas(ms0), out = [];
    const bloco = (nome, faixas, valor) => {
      const ok = ms.filter((m) => Number.isFinite(valor(m)));
      for (const [faixa, f] of faixas) {
        const ps = ok.filter((m) => f(Number(valor(m).toFixed(2))));
        const v = ps.filter((m) => m.r === 'V').length, d = ps.filter((m) => m.r === 'D').length;
        out.push({ grupo: nome, faixa, partidas: ps.length, v, d, wr: Number((v / Math.max(1, v + d)).toFixed(4)) });
      }
    };
    bloco('Nível médio do time adversário', FAIXAS_NIVEL, (m) => m.le);
    bloco('Diferença de nível (time da Geladeira menos o adversário)', FAIXAS_DIF, (m) => m.ln - m.le);
    bloco('Previsão da GC para o time da Geladeira', FAIXAS_PROB, (m) => (m.pb == null ? NaN : m.pb));
    return out;
  }

  // Maior sequência de vitórias, de derrotas e a atual (partidas com resultado do grupo; empate quebra).
  function sequencias(ms0) {
    const ms = semMistas(ms0);
    let melhor = { n: 0 }, pior = { n: 0 }, cur = { tipo: null, n: 0, ini: null };
    ms.forEach((m, i) => {
      if (m.r === 'E') { cur = { tipo: null, n: 0, ini: null }; return; }
      if (cur.tipo === m.r) cur.n++; else cur = { tipo: m.r, n: 1, ini: i };
      if (m.r === 'V' && cur.n > melhor.n) melhor = { n: cur.n, de: ms[cur.ini].d, ate: m.d };
      if (m.r === 'D' && cur.n > pior.n) pior = { n: cur.n, de: ms[cur.ini].d, ate: m.d };
    });
    return { melhor, pior, atual: cur.tipo ? { tipo: cur.tipo, n: cur.n, de: ms[ms.length - cur.n].d, ate: ms[ms.length - 1].d } : { tipo: null, n: 0 } };
  }

  // K/D e ADR do grupo acumulados e em janela móvel de `janela` partidas (soma da janela / soma da janela).
  function acumulado(ms, janela = 10) {
    const som = ms.map((m) => m.mem.reduce((a, x) => ({ k: a.k + x.k, m: a.m + x.m, dano: a.dano + x.dano, rod: a.rod + x.rod }), { k: 0, m: 0, dano: 0, rod: 0 }));
    const out = []; let K = 0, M = 0, D = 0, R = 0;
    ms.forEach((m, i) => {
      K += som[i].k; M += som[i].m; D += som[i].dano; R += som[i].rod;
      let k = 0, mo = 0, dn = 0, ro = 0;
      for (let j = Math.max(0, i - janela + 1); j <= i; j++) { k += som[j].k; mo += som[j].m; dn += som[j].dano; ro += som[j].rod; }
      out.push({ i, d: m.d, kd: K / Math.max(1, M), adr: D / Math.max(1, R), kdMov: k / Math.max(1, mo), adrMov: dn / Math.max(1, ro), cheia: i + 1 >= janela });
    });
    return out;
  }

  globalThis.GTCalc = { r, classificarMapa, MIN_VETO, somar, linhaMembro, agrupar, mesDe, semMistas, grupo, meses, mapas, horario, membros, membrosMes, comQuem, somarMembros, comSem, combos, niveis, sequencias, acumulado };
})();

// ===== Jogador: forma com tendência e desempenho contra nível (itens 8 e 9) =====
(function () {
  'use strict';
  const C = globalThis.GTCalc;
  const rd = (x, c = 4) => Number(x.toFixed(c));

  // Forma com tendência: últimas n partidas contra as n anteriores (linhas em ordem de data), só partidas com rodadas.
  // Somar e dividir no fim. Limiares de diferença mínima (em unidades da métrica; porcentagens em fração).
  const LIMIARES_FORMA = { adr: 5, kast: 0.03, kd: 0.1, fk: 0.02 };
  const MET_FORMA = [
    ['adr', (s) => s.dano / Math.max(1, s.rod)],
    ['kast', (s) => s.kast / Math.max(1, s.rod)],
    ['kd', (s) => s.k / Math.max(1, s.m)],
    ['fk', (s) => s.fk / Math.max(1, s.rod)],
  ];
  function tendenciaForma(linhas, opc = {}) {
    const n = opc.n || 10, lim = { ...LIMIARES_FORMA, ...(opc.limiares || {}) };
    const l = (linhas || []).filter((x) => x.rod > 0);
    if (l.length < 2 * n) return { amostra: l.length, ok: false, metricas: [] };
    const soma = (xs) => xs.reduce((s, x) => ({ k: s.k + (x.k || 0), m: s.m + (x.m || 0), dano: s.dano + (x.dano || 0), rod: s.rod + (x.rod || 0), kast: s.kast + (x.kast || 0), fk: s.fk + (x.fk || 0) }), { k: 0, m: 0, dano: 0, rod: 0, kast: 0, fk: 0 });
    const ant = soma(l.slice(-2 * n, -n)), ago = soma(l.slice(-n));
    const metricas = MET_FORMA.map(([id, f]) => {
      const antes = f(ant), agora = f(ago), dif = rd(agora - antes);
      const dir = Math.abs(dif) + 1e-9 < lim[id] ? 'estavel' : dif > 0 ? 'sobe' : 'cai';
      return { id, antes: rd(antes), agora: rd(agora), dif, dir };
    });
    return { amostra: l.length, ok: true, metricas };
  }

  // Desempenho do jogador contra times de nível maior, igual e menor (le - ln, mesmo corte de ±0,3 de niveis). Mistas ficam fora.
  const MIN_NIVEL_ADV = 5, CORTE_NIVEL = 0.3;
  const FAIXAS_ADV = [['forte', 'adversário mais forte', (x) => x > CORTE_NIVEL], ['parecido', 'nível parecido', (x) => x >= -CORTE_NIVEL && x <= CORTE_NIVEL], ['fraco', 'adversário mais fraco', (x) => x < -CORTE_NIVEL]];
  function porNivelAdversario(ms, nick) {
    const por = new Map(FAIXAS_ADV.map(([id]) => [id, []]));
    for (const m of ms || []) {
      if (m.mix || m.r === 'X' || !Number.isFinite(m.ln) || !Number.isFinite(m.le)) continue;
      const x = (m.mem || []).find((y) => y.n === nick);
      if (!x) continue;
      const dif = Number((m.le - m.ln).toFixed(2));
      const f = FAIXAS_ADV.find(([, , t]) => t(dif));
      if (f) por.get(f[0]).push(C.linhaMembro(x));
    }
    return FAIXAS_ADV.map(([id, rotulo]) => {
      const s = C.somar(por.get(id));
      return { id, rotulo, partidas: s.partidas, v: s.v, d: s.d, wr: s.wr, kd: s.kd, adr: s.adr, amostraPequena: s.partidas < MIN_NIVEL_ADV };
    });
  }

  Object.assign(C, { tendenciaForma, LIMIARES_FORMA, porNivelAdversario, MIN_NIVEL_ADV });
})();

// ===== Time: dia e horário, reação depois de sequência, duplas (itens 10 a 12) =====
(function () {
  'use strict';
  const C = globalThis.GTCalc;
  const AMOSTRA_TIME = 8; // mínimo de partidas com resultado (ou de ocorrências) para mostrar conclusão

  // Win rate do grupo por dia da semana (domingo = 0 ... sábado = 6), a partir de m.d 'AAAA-MM-DD'.
  // O dia é calculado em UTC para não depender do fuso da máquina. Devolve sempre os 7 dias (os sem partida vêm com partidas = 0).
  // comResultado = V + D + E (mistas ficam fora, como em C.grupo); amostra = comResultado >= AMOSTRA_TIME.
  const NOMES_DIA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  function diaDaSemana(d) { const [a, m, dd] = String(d).split('-').map(Number); return new Date(Date.UTC(a, m - 1, dd)).getUTCDay(); }
  function diaSemana(ms) {
    return NOMES_DIA.map((nome, dia) => {
      const g = C.grupo(ms.filter((m) => diaDaSemana(m.d) === dia));
      return { dia, nome, partidas: g.partidas, v: g.v, d: g.d, e: g.e, mistas: g.mistas, comResultado: g.comResultado, wr: g.wr, amostra: g.comResultado >= AMOSTRA_TIME };
    });
  }
  // Mesma ideia para as 4 faixas de horário (reaproveita C.horario; faixas sem partida somem de lá, aqui voltam com zero).
  function faixaHorario(ms) {
    const por = new Map(C.horario(ms).map((x) => [x.faixa, x]));
    return ['Madrugada (0h–5h)', 'Manhã (6h–11h)', 'Tarde (12h–17h)', 'Noite (18h–23h)'].map((faixa) => {
      const g = por.get(faixa) || { partidas: 0, v: 0, d: 0, e: 0, mistas: 0, comResultado: 0, wr: 0 };
      return { faixa, partidas: g.partidas, v: g.v, d: g.d, e: g.e, mistas: g.mistas, comResultado: g.comResultado, wr: g.wr, amostra: g.comResultado >= AMOSTRA_TIME };
    });
  }

  // Reação depois de n derrotas (ou n vitórias) seguidas. Usa as partidas sem mistas, na ordem recebida.
  // Regra: toda partida cujas n anteriores (imediatamente anteriores, sem mistas) foram todas D (ou todas V) é uma "seguinte"; assim,
  // numa sequência de 4 derrotas a 3ª e a 4ª derrota contam como "seguinte" de D-D (as ocorrências se sobrepõem). Empate quebra a sequência
  // e uma partida seguinte que terminou empatada não entra na conta (v + d = ocorrências com vencedor).
  // Devolve { base (win rate geral), aposDerrotas, aposVitorias }, cada um com { ocorrencias, v, d, wr, amostra }.
  function reacaoSequencia(ms, n = 2) {
    const ps = C.semMistas(ms), apos = { D: { v: 0, d: 0 }, V: { v: 0, d: 0 } };
    let v = 0, d = 0;
    ps.forEach((m, i) => {
      if (m.r === 'V') v++; else if (m.r === 'D') d++;
      if (i < n || (m.r !== 'V' && m.r !== 'D')) return;
      for (const t of ['D', 'V']) {
        let ok = true; for (let j = i - n; j < i; j++) if (ps[j].r !== t) { ok = false; break; }
        if (ok) apos[t][m.r === 'V' ? 'v' : 'd']++;
      }
    });
    const fim = (x) => { const o = x.v + x.d; return { ocorrencias: o, v: x.v, d: x.d, wr: C.r(x.v / Math.max(1, o), 4), amostra: o >= AMOSTRA_TIME }; };
    return { n, base: { partidas: v + d, v, d, wr: C.r(v / Math.max(1, v + d), 4) }, aposDerrotas: fim(apos.D), aposVitorias: fim(apos.V) };
  }

  // Duplas que funcionam: pares de membros no mesmo time (C.combos tamanho 2; a dupla conta em toda partida em que os dois estão no time,
  // mesmo com outros membros juntos) com pelo menos `min` partidas e win rate ACIMA do win rate do grupo no mesmo filtro.
  // Ordena por win rate e depois por partidas; `dif` = win rate da dupla menos o do grupo (em pontos de fração).
  function duplas(ms, ordem, min = 8, max = 8) {
    const base = C.grupo(ms).wr;
    const todas = C.combos(ms, ordem).filter((c) => c.tamanho === 2 && c.partidas >= min);
    const boas = todas.filter((c) => c.wr > base).map((c) => ({ ...c, dif: C.r(c.wr - base, 4) }))
      .sort((a, b) => b.wr - a.wr || b.partidas - a.partidas || a.combinacao.localeCompare(b.combinacao));
    return { base, elegiveis: todas.length, duplas: boas.slice(0, max), acima: boas.length };
  }

  Object.assign(C, { AMOSTRA_TIME, diaSemana, faixaHorario, reacaoSequencia, duplas });
})();

// ===== Partidas: sugestão de filtro mais próximo com dados (item 7) =====
(function () {
  'use strict';
  const C = globalThis.GTCalc;
  // Mesma lógica de filtrar() em nucleo.js: mapa, depois período por data, depois "últimas n".
  const somarDias = (d, dias) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) + dias * 864e5).toISOString().slice(0, 10);
  const menosMeses = (d, m) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1 - m, +d.slice(8, 10))).toISOString().slice(0, 10);
  function aplicarFiltro(partidas, per, n, mapas, ultima) {
    let ms = partidas || [];
    if (mapas && mapas.length) ms = ms.filter((m) => mapas.includes(m.mp));
    if (per === '6m' && ultima) { const c = menosMeses(ultima, 6); ms = ms.filter((m) => m.d >= c); }
    else if (per === '30d' && ultima) { const c = somarDias(ultima, -30); ms = ms.filter((m) => m.d >= c); }
    return per === 'n' ? ms.slice(-n) : ms;
  }
  const NOME_PER = { '30d': 'últimos 30 dias', '6m': 'últimos 6 meses', ano: 'ano todo' };
  const qtd = (k) => `${k} ${k === 1 ? 'partida' : 'partidas'}`;
  // Sugestões de filtro com dados quando o filtro atual não tem partida. Cada uma: { tipo: 'periodo' | 'mapa', per, mapas, partidas, rotulo }.
  // opts: { per, n, mapas, ultima, nomeMapa }. Devolve [] se o filtro atual já tem partida ou se nada ajuda.
  function sugerirFiltro(partidas, opts) {
    const { per = 'ano', n = 20, ultima } = opts || {};
    const mapas = (opts && opts.mapas) || [], nome = (opts && opts.nomeMapa) || ((x) => x);
    if (aplicarFiltro(partidas, per, n, mapas, ultima).length) return [];
    const out = [];
    const maiores = per === '30d' ? ['6m', 'ano'] : per === '6m' ? ['ano'] : [];
    for (const p of maiores) {
      const k = aplicarFiltro(partidas, p, n, mapas, ultima).length;
      if (!k) continue;
      out.push({ tipo: 'periodo', per: p, mapas: [...mapas], partidas: k, rotulo: mapas.length ? `${mapas.map(nome).join(' + ')}, ${NOME_PER[p]}: ${qtd(k)}` : `${NOME_PER[p][0].toUpperCase()}${NOME_PER[p].slice(1)}: ${qtd(k)}` });
      break;
    }
    if (mapas.length) {
      const cont = new Map();
      for (const m of aplicarFiltro(partidas, per, n, [], ultima)) cont.set(m.mp, (cont.get(m.mp) || 0) + 1);
      let melhor = null;
      for (const [mp, k] of cont) if (!mapas.includes(mp) && (!melhor || k > melhor.k)) melhor = { mp, k };
      if (melhor) out.push({ tipo: 'mapa', per, mapas: [melhor.mp], partidas: melhor.k, rotulo: `${nome(melhor.mp)} neste período: ${qtd(melhor.k)}` });
    }
    return out;
  }
  // Faixa de rodadas em miniatura (lista de partidas): um item por rodada, separador quando o lado troca (intervalo e prorrogação).
  function faixaMini(jogo) {
    const rs = (jogo && jogo.rodadas) || [];
    const itens = rs.map((r, i) => ({ n: r.n, v: !!r.v, sep: i > 0 && rs[i - 1].lado !== r.lado }));
    const v = itens.filter((x) => x.v).length;
    return { itens, v, d: itens.length - v };
  }
  Object.assign(C, { sugerirFiltro, faixaMini });
})();

// ===== Comparar jogadores (item 1) =====
(function () {
  'use strict';
  const C = globalThis.GTCalc;
  const MIN_MAPA_CMP = 3; // partidas do jogador no mapa para mostrar o win rate
  // Compara dois jogadores nas partidas do filtro (ms em ordem cronológica). Soma e divide no fim (C.somar).
  function compararJogadores(ms, a, b) {
    const lado = (nick) => {
      const lin = [];
      for (const m of ms) for (const x of m.mem) if (x.n === nick) lin.push({ ...C.linhaMembro(x), pt: m });
      const s = C.somar(lin);
      const ult10 = lin.filter((x) => x.rod).slice(-10).map((x) => x.dano / x.rod);
      const ult5 = lin.filter((x) => x.r === 'V' || x.r === 'D').slice(-5).map((x) => ({ r: x.r, d: x.pt.d, mp: x.pt.mp, sn: x.pt.sn, se: x.pt.se }));
      const por = new Map();
      for (const x of lin) { const o = por.get(x.pt.mp) || { partidas: 0, v: 0, d: 0 }; o.partidas++; o.v += x.v; o.d += x.dd; por.set(x.pt.mp, o); }
      return { nick, partidas: lin.length, tem: lin.length > 0, wr: lin.length ? s.wr : null, kd: lin.length ? s.kd : null, adr: lin.length ? s.adr : null,
        kast: lin.length ? s.kastPct : null, hs: lin.length ? s.hsPct : null, ult5, adr10: ult10, porMapa: por };
    };
    const A = lado(a), B = lado(b);
    let jv = 0, jd = 0, jp = 0;
    for (const m of ms) {
      const xa = m.mem.find((x) => x.n === a), xb = m.mem.find((x) => x.n === b);
      if (!xa || !xb || xa.l !== xb.l) continue;
      jp++; if (xa.r === 'V') jv++; else if (xa.r === 'D') jd++;
    }
    const mapas = [...new Set([...A.porMapa.keys(), ...B.porMapa.keys()])].map((mapa) => {
      const f = (L) => { const o = L.porMapa.get(mapa); return o ? { partidas: o.partidas, wr: o.partidas >= MIN_MAPA_CMP && o.v + o.d ? C.r(o.v / (o.v + o.d), 4) : null } : { partidas: 0, wr: null }; };
      const fa = f(A), fb = f(B);
      return { mapa, a: fa, b: fb, total: fa.partidas + fb.partidas };
    }).sort((x, y) => y.total - x.total || x.mapa.localeCompare(y.mapa));
    const limpa = (L) => { const { porMapa, ...r } = L; return r; };
    return { a: limpa(A), b: limpa(B), juntos: { partidas: jp, v: jv, d: jd }, mapas, MIN_MAPA: MIN_MAPA_CMP };
  }
  // Quem tem o maior valor numa linha (null se empate ou algum lado vazio).
  function maiorLado(x, y) { return x == null || y == null || x === y ? null : (x > y ? 'a' : 'b'); }
  Object.assign(C, { compararJogadores, maiorLado, MIN_MAPA_CMP });
})();

// ===== Filtro de line, busca e compartilhar (itens 2 a 4) =====
(function () {
  'use strict';
  const C = globalThis.GTCalc;
  const MAX_LINE = 5, MIN_LINE_FILTRO = 2;
  const semAcento = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const p2 = (n) => String(n).padStart(2, '0');
  const fmt = (v, d) => Number(v).toFixed(d).replace('.', ',');
  const pct0 = (v) => fmt(v * 100, 0) + '%';

  // Line escolhida: só nicks que são membros do ano, sem repetir, no máximo 5 (pode ter 1 enquanto se escolhe).
  function normalizarLine(line, membros) {
    const ok = new Set(membros || []), out = [];
    for (const n of Array.isArray(line) ? line : []) if (ok.has(n) && !out.includes(n)) out.push(n);
    return out.slice(0, MAX_LINE);
  }
  // O filtro só vale com 2 ou mais jogadores; abaixo disso fica desligado ([]).
  const lineAtiva = (line) => (Array.isArray(line) && line.length >= MIN_LINE_FILTRO ? line : []);
  // Partidas em que todos da line jogaram no mesmo time.
  const filtrarLine = (ms, line) => { const l = lineAtiva(line); return l.length ? C.comSem(ms, l, []) : ms; };

  // "25/11", "25/11/2026", "25-11-26": { dia, mes, ano|null } ou null.
  function reconhecerData(q) {
    const m = /^(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{4}|\d{2}))?$/.exec(String(q || '').trim());
    if (!m) return null;
    const dia = +m[1], mes = +m[2];
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
    const ano = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null;
    return { dia, mes, ano };
  }
  // Mapas cujo nome, chave ou sigla casa com a busca ("dust", "d2", "mirage").
  function casarMapa(q, mapas, nomeMapa) {
    const t = semAcento(q).replace(/\s+/g, '');
    if (t.length < 2) return [];
    const nome = nomeMapa || ((x) => x);
    return (mapas || []).filter((mp) => {
      const n = semAcento(nome(mp)), k = semAcento(mp);
      const palavras = n.split(/\s+/).filter(Boolean);
      const sigla = palavras.length > 1 ? palavras.map((w) => w[0]).join('') : '';
      return k.includes(t) || n.replace(/\s+/g, '').includes(t) || (sigla && sigla === t) || (palavras.length > 1 && (palavras[0][0] + (palavras[1] || '')) === t);
    });
  }
  const rotuloPartida = (m, nomeMapa) => `${(nomeMapa || ((x) => x))(m.mp)} ${m.sn}–${m.se} · ${m.d.slice(8, 10)}/${m.d.slice(5, 7)} ${p2(m.h)}h`;
  // Resultados de busca por mapa e por data. opts: { mapas: [chaves], partidas, ano, nomeMapa }.
  function resultadosBusca(q, opts) {
    const o = opts || {}, nome = o.nomeMapa || ((x) => x), out = [];
    for (const mp of casarMapa(q, o.mapas, nome)) out.push({ tipo: 'mapa', mp, rotulo: nome(mp) });
    const dt = reconhecerData(q);
    if (dt && (!dt.ano || String(dt.ano) === String(o.ano))) {
      const sufixo = `-${p2(dt.mes)}-${p2(dt.dia)}`;
      const dia = (o.partidas || []).filter((m) => m.d && m.d.slice(4) === sufixo && (!o.ano || m.d.slice(0, 4) === String(o.ano)));
      for (const m of [...dia].sort((a, b) => a.h - b.h).slice(0, 8)) out.push({ tipo: 'partida', m, rotulo: rotuloPartida(m, nome) });
    }
    return out;
  }

  const dataCompleta = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
  // Texto curto para colar no WhatsApp. j = jogo da partida (análise completa).
  function textoCompartilharPartida(j, link, nomeMapa) {
    const nome = nomeMapa || ((x) => x);
    const rating = (x) => { const v = x.rt != null ? +x.rt : (((j.jogadores || []).find((y) => y.n === x.n) || {}).rating); return v != null && Number.isFinite(+v) && +v >= 0 && +v <= 5 ? +v : null; };
    const cand = (j.placar || []).filter((x) => x.nos).map((x) => ({ x, rt: rating(x) }));
    cand.sort((a, b) => (b.rt ?? -1) - (a.rt ?? -1) || (b.x.adr || 0) - (a.x.adr || 0));
    const mvp = cand[0];
    const mvpTxt = mvp ? `MVP: ${mvp.x.n}${mvp.rt != null ? ` (rating ${fmt(mvp.rt, 2)})` : mvp.x.adr != null ? ` (ADR ${fmt(mvp.x.adr, 1)})` : ''}` : null;
    return [`Geladeira ${j.sn} x ${j.se} em ${nome(j.mp)} (${dataCompleta(j.d)})`, mvpTxt, link].filter(Boolean).join(' · ');
  }
  // dados: { nick, janela, wr (0 a 1), kd, adr }. Números sem valor ficam de fora.
  function textoCompartilharJogador(dados, link) {
    const d = dados || {};
    const nums = [d.wr != null ? `win rate ${pct0(d.wr)}` : null, d.kd != null ? `K/D ${fmt(d.kd, 2)}` : null, d.adr != null ? `ADR ${fmt(d.adr, 1)}` : null].filter(Boolean);
    return [`${d.nick} na Geladeira${d.janela ? ` (${d.janela})` : ''}${nums.length ? ': ' + nums.join(', ') : ''}`, link].filter(Boolean).join(' · ');
  }
  Object.assign(C, { MAX_LINE, normalizarLine, lineAtiva, filtrarLine, reconhecerData, casarMapa, resultadosBusca, textoCompartilharPartida, textoCompartilharJogador });
})();
