// Agregações do Geladeira Tracker (do grupo). Funciona no navegador (window.GTCalc) e no Node (globalThis.GTCalc).
// Regra: somar os totais e dividir no fim (nunca média de médias).
// Partida da Geladeira = 2 ou mais membros no mesmo time. r = 'V' | 'D' | 'E' (time da Geladeira) ou 'X' (membros nos dois times:
// entra nas estatísticas individuais, fica fora do win rate do grupo e é contada à parte).
(function () {
  'use strict';
  const r = (x, c = 2) => Number(x.toFixed(c));

  // Soma linhas { v, dd, k, m, a, dano, rod, hs, kast, fk, rt } e calcula as taxas no fim.
  function somar(linhas) {
    const s = { partidas: 0, v: 0, d: 0, k: 0, mortes: 0, a: 0, dano: 0, rod: 0, hs: 0, kast: 0, fk: 0 };
    let rt = 0, nrt = 0;
    for (const j of linhas) { s.partidas++; s.v += j.v; s.d += j.dd; s.k += j.k; s.mortes += j.m; s.a += j.a; s.dano += j.dano; s.rod += j.rod; s.hs += j.hs; s.kast += j.kast; s.fk += j.fk; if (j.rt) { rt += j.rt; nrt++; } }
    return { ...s, wr: r(s.v / Math.max(1, s.v + s.d), 4), kd: r(s.k / Math.max(1, s.mortes)), adr: r(s.dano / Math.max(1, s.rod), 1), hsPct: r(s.hs / Math.max(1, s.k), 4), kastPct: r(s.kast / Math.max(1, s.rod), 4), fkRod: r(s.fk / Math.max(1, s.rod), 3), rating: nrt ? Math.round(rt / nrt) : null };
  }
  const linhaMembro = (x) => ({ ...x, v: x.r === 'V' ? 1 : 0, dd: x.r === 'D' ? 1 : 0 }); // resultado do time do próprio membro

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

  globalThis.GTCalc = { r, somar, linhaMembro, agrupar, mesDe, semMistas, grupo, meses, mapas, horario, membros, membrosMes, comQuem, somarMembros, comSem, combos, niveis, sequencias, acumulado };
})();
