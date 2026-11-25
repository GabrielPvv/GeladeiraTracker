// Contas da página do mapa (aba Mapas, U5): totais do time inteiro contra os adversários nas mesmas partidas (placar da GC: 1º abates,
// assistências de flash, bombas, desarmes, abates, mortes, 3K+), resultado contra o que a GC esperava (previsão de vitória antes da partida),
// veto e dicas. Segue os filtros de período e mapa. Só partidas sem membros nos dois times. A tela fica em mapas.js.
(function () {
  'use strict';
  const GT = window.GT;
  const { h, pct, UI, guardar } = GT.u;
  const f1 = (x) => Number(x).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const MIN = 6; // partidas para um mapa ter dicas

  function estatMapa(ms) {
    const s = { n: 0, v: 0, d: 0, pbS: 0, pbN: 0, saldo: 0, nivel: 0, nivelN: 0, n_: [0, 0, 0, 0, 0, 0, 0, 0], e_: [0, 0, 0, 0, 0, 0, 0, 0] };
    for (const p of ms) {
      if (!p.tn || p.r === 'X') continue;
      s.n++; if (p.r === 'V') s.v++; if (p.r === 'D') s.d++;
      if (Number.isFinite(p.pb)) { s.pbS += p.pb / 100; s.pbN++; }
      s.saldo += p.sn - p.se;
      if (Number.isFinite(p.ln) && Number.isFinite(p.le)) { s.nivel += p.ln - p.le; s.nivelN++; }
      for (let i = 0; i < 8; i++) { s.n_[i] += p.tn[i]; s.e_[i] += p.te[i]; }
    }
    const [fkN, faN, plN, dfN, kN, dN, , mkN] = s.n_, [fkE, faE, plE, dfE, kE, dE, , mkE] = s.e_;
    const n = Math.max(1, s.n);
    return { ...s, wr: s.v / Math.max(1, s.v + s.d), esp: s.pbN ? s.pbS / s.pbN : null, saldoP: s.saldo / n, nivelD: s.nivelN ? s.nivel / s.nivelN : null,
      abertura: fkN / Math.max(1, fkN + fkE), flashN: faN / n, flashE: faE / n, bombaN: plN / n, bombaE: plE / n, desarmeN: dfN / n, desarmeE: dfE / n,
      kdN: kN / Math.max(1, dN), kdE: kE / Math.max(1, dE), mkN: mkN / n, mkE: mkE / n };
  }
  const razao = (a, b) => (b > 0 ? a / b : a > 0 ? 2 : 1);

  // Veto (X4): mapas do filtro (mais jogados primeiro) separados em "jogar mais", "abaixo do esperado pela GC" e "ainda sem amostra".
  // Também usado pelo Início (lista e mais).
  GT.vetoMapas = (ms) => {
    const mapas = [...new Set(ms.filter((p) => p.tn && p.r !== 'X').map((p) => p.mp))];
    const lista = mapas.map((m) => [m, estatMapa(ms.filter((p) => p.mp === m))]).sort((a, b) => b[1].n - a[1].n);
    const cl = ([, s]) => window.GTCalc.classificarMapa({ n: s.n, wr: s.wr, esp: s.esp });
    const comEsp = lista.filter(([, s]) => s.esp !== null).map(([m, s]) => ({ m, s, dif: s.wr - s.esp, cl: cl([m, s]) }));
    const mais = comEsp.filter((x) => x.cl === 'mais').sort((a, b) => b.dif - a.dif);
    const menos = comEsp.filter((x) => x.cl === 'abaixo').sort((a, b) => a.dif - b.dif);
    const amostra = lista.filter((x) => cl(x) === 'amostra');
    return { lista, mais, menos, amostra };
  };

  // Link para a aba Granadas já filtrada (tipo e lado).
  const linkGranadas = (mapa, tipo, lado, texto) => h('a', { class: 'pl-link', href: '#granadas/' + mapa + '?' + GT.u.paramsTexto(),
    onclick: () => { UI.granTipo = tipo; UI.granLado = lado; UI.granFonte = 'essenciais'; guardar('geladeira.granTipo', tipo); guardar('geladeira.granLado', lado); } }, texto, ' →');

  // Dicas do mapa, em ordem de peso. tipo: forte | mais | menos | nade | atencao
  function dicas(mapa, s) {
    const out = [], add = (peso, tipo, titulo, texto, extra) => out.push({ peso, tipo, titulo, texto, extra });
    const pp = (x) => `${x > 0 ? '+' : ''}${Math.round(x * 100)}`;
    if (s.esp !== null) {
      const dif = s.wr - s.esp;
      // Só o lado bom vira dica: render abaixo do esperado aparece no win rate e nas dicas do que melhorar, não como "não jogue".
      if (dif >= 0.06) add(dif * 3, 'mais', 'Explorar mais: rende acima do esperado', `Win rate de ${pct(s.wr)} quando a GC esperava ${pct(s.esp)} (${pp(dif)} pontos). Bom mapa para puxar no veto.`);
    }
    if (s.abertura < 0.47) add((0.5 - s.abertura) * 6, 'atencao', 'Perde a abertura', `A Geladeira pega só ${pct(s.abertura)} dos primeiros abates. Entrar com flash, jogar o 1º duelo em dupla para trocar, e usar smoke para cortar os ângulos de quem segura.`, linkGranadas(mapa, 'smokes', 'T', 'Smokes de TR'));
    else if (s.abertura > 0.53 && s.esp !== null && s.wr < s.esp) add((s.abertura - 0.5) * 4, 'atencao', 'Ganha a abertura, mas não converte', `${pct(s.abertura)} dos primeiros abates são da Geladeira e mesmo assim o resultado fica abaixo do esperado: falta trocar as mortes seguintes e segurar o pós-plant.`, linkGranadas(mapa, 'molotovs', 'T', 'Molotovs de pós-plant'));
    else if (s.abertura > 0.53) add((s.abertura - 0.5) * 2, 'forte', 'Abertura forte', `A Geladeira pega ${pct(s.abertura)} dos primeiros abates. Continuar abrindo com dupla.`);
    const rf = razao(s.flashN, s.flashE);
    if (rf < 0.85) add((1 - rf) * 2, 'nade', 'Falta flash', `${f1(s.flashN)} assistências de flash por partida contra ${f1(s.flashE)} do adversário. Aprender 2 ou 3 flashes de entrada do mapa.`, linkGranadas(mapa, 'flashbangs', 'todos', 'Flashes do mapa'));
    else if (rf > 1.3) add((rf - 1) / 3, 'forte', 'Flash bem usada', `${f1(s.flashN)} assistências de flash por partida contra ${f1(s.flashE)} do adversário.`);
    const rb = razao(s.bombaN, s.bombaE);
    if (rb < 0.9) add((1 - rb) * 2.5, 'nade', 'Planta menos que o adversário', `A Geladeira planta ${f1(s.bombaN)} bombas por partida e o adversário ${f1(s.bombaE)}. Pode ser execução de TR travando ou rodada decidida antes do plant; se o lado TR estiver rendendo menos, treinar as smokes de execução de cada bomb.`, linkGranadas(mapa, 'smokes', 'T', 'Smokes de execução'));
    else if (rb > 1.1) add((rb - 1), 'forte', 'Lado TR chega no bomb', `${f1(s.bombaN)} bombas plantadas por partida contra ${f1(s.bombaE)} do adversário.`);
    const rd = razao(s.desarmeN, s.desarmeE);
    if (rd < 0.85) add((1 - rd) * 2, 'nade', 'Retake a treinar', `${f1(s.desarmeN)} desarmes por partida contra ${f1(s.desarmeE)} do adversário: quando o bomb cai, a Geladeira retoma menos. Combinar o retake e levar flash e molotov de CT.`, linkGranadas(mapa, 'todas', 'CT', 'Granadas de CT'));
    else if (rd > 1.2) add((rd - 1) / 2, 'forte', 'Retake forte', `${f1(s.desarmeN)} desarmes por partida contra ${f1(s.desarmeE)} do adversário.`);
    if (s.nivelD !== null && s.nivelD < -0.4 && s.wr >= 0.5) add(0.3, 'forte', 'Ganha de time de nível maior', `Mesmo com o adversário ${f1(Math.abs(s.nivelD))} nível acima em média, a Geladeira vence ${pct(s.wr)}.`);
    if (s.mkN < s.mkE * 0.8) add(0.25, 'atencao', 'Pouca rodada virada no individual', `${f1(s.mkN)} multiabates (3+) por partida contra ${f1(s.mkE)} do adversário. Jogar com crossfire para que um abate puxe outro.`);
    const ordemTipo = { menos: 0, atencao: 1, nade: 1, mais: 2, forte: 3 };
    return out.sort((a, b) => ordemTipo[a.tipo] - ordemTipo[b.tipo] || b.peso - a.peso);
  }

  // Membros no mapa: ADR no mapa contra o próprio ADR em todos os mapas do filtro, e 1º abates por rodada (placar da GC). 4 partidas ou mais no mapa.
  function membrosNoMapa(ctx, mapa) {
    const tudo = new Map(), noMapa = new Map();
    const soma = (M, x) => { const a = M.get(x.n) || { p: 0, dano: 0, rod: 0, k: 0, m: 0, fk: 0 }; a.p++; a.dano += x.dano; a.rod += x.rod; a.k += x.k; a.m += x.m; a.fk += x.fk || 0; M.set(x.n, a); };
    for (const p of ctx.ms) for (const x of p.mem) { soma(tudo, x); if (p.mp === mapa) soma(noMapa, x); }
    return [...noMapa].filter(([, a]) => a.p >= 4).map(([n, a]) => {
      const t = tudo.get(n), adr = a.dano / Math.max(1, a.rod), adrT = t.dano / Math.max(1, t.rod);
      return { n, p: a.p, adr, adrT, dif: adrT ? (adr - adrT) / adrT : 0, kd: a.k / Math.max(1, a.m), fkRod: a.fk / Math.max(1, a.rod) };
    }).sort((a, b) => b.dif - a.dif);
  }

  GT.planoMapa = { MIN, estatMapa, dicas, membrosNoMapa, linkGranadas };
})();
