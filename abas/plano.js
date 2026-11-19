// Aba "Plano por mapa": dicas para a Geladeira inteira em cada mapa, comparando o time com os adversários nas mesmas partidas
// (totais do placar da GC: 1º abates, assistências de flash, bombas, desarmes, abates, mortes, 3K+) e o resultado com o que
// a GC esperava (previsão de vitória antes da partida). Segue os filtros de período e mapa. Só partidas sem membros nos dois times.
(function () {
  'use strict';
  const GT = window.GT;
  const { h, pct, pl, UI, card, avatar, infoIcone, guardar, render } = GT.u;
  const MIN = 6; // partidas para um mapa ter dicas
  const NOMES = { mirage: 'Mirage', dust2: 'Dust 2', inferno: 'Inferno', overpass: 'Overpass', anubis: 'Anubis', cache: 'Cache', ancient: 'Ancient', nuke: 'Nuke', train: 'Train', vertigo: 'Vertigo', cobblestone: 'Cobblestone' };
  const nome = (m) => NOMES[m] || m;

  GT.registrarAba({ id: 'plano', titulo: 'Plano por mapa', ordem: 42, aceitaVazio: true, apelidos: ['melhoria', 'mapa-a-mapa'],
    rotaLer(resto) { UI.planoMapa = resto[0] || UI.planoMapa || null; },
    rotaEscrever() { return UI.planoMapa ? '/' + UI.planoMapa : ''; } });

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
    if (s.abertura < 0.47) add((0.5 - s.abertura) * 6, 'atencao', 'Perde a abertura', `A Geladeira pega só ${pct(s.abertura)} dos primeiros abates. Entrar com flash, jogar o 1º duelo em dupla para trocar, e usar smoke para cortar os ângulos de quem segura.`, linkGranadas(mapa, 'smokes', 'T', 'Smokes de T'));
    else if (s.abertura > 0.53 && s.esp !== null && s.wr < s.esp) add((s.abertura - 0.5) * 4, 'atencao', 'Ganha a abertura, mas não converte', `${pct(s.abertura)} dos primeiros abates são da Geladeira e mesmo assim o resultado fica abaixo do esperado: falta trocar as mortes seguintes e segurar o pós-plant.`, linkGranadas(mapa, 'molotovs', 'T', 'Molotovs de pós-plant'));
    else if (s.abertura > 0.53) add((s.abertura - 0.5) * 2, 'forte', 'Abertura forte', `A Geladeira pega ${pct(s.abertura)} dos primeiros abates. Continuar abrindo com dupla.`);
    const rf = razao(s.flashN, s.flashE);
    if (rf < 0.85) add((1 - rf) * 2, 'nade', 'Falta flash', `${s.flashN.toFixed(1)} assistências de flash por partida contra ${s.flashE.toFixed(1)} do adversário. Aprender 2 ou 3 flashes de entrada do mapa.`, linkGranadas(mapa, 'flashbangs', 'todos', 'Flashes do mapa'));
    else if (rf > 1.3) add((rf - 1) / 3, 'forte', 'Flash bem usada', `${s.flashN.toFixed(1)} assistências de flash por partida contra ${s.flashE.toFixed(1)} do adversário.`);
    const rb = razao(s.bombaN, s.bombaE);
    if (rb < 0.9) add((1 - rb) * 2.5, 'nade', 'Planta menos que o adversário', `A Geladeira planta ${s.bombaN.toFixed(1)} bombas por partida e o adversário ${s.bombaE.toFixed(1)}. Pode ser execução de T travando ou rodada decidida antes do plant; se o lado T estiver sofrendo, treinar as smokes de execução de cada bomb.`, linkGranadas(mapa, 'smokes', 'T', 'Smokes de execução'));
    else if (rb > 1.1) add((rb - 1), 'forte', 'Lado T chega no bomb', `${s.bombaN.toFixed(1)} bombas plantadas por partida contra ${s.bombaE.toFixed(1)} do adversário.`);
    const rd = razao(s.desarmeN, s.desarmeE);
    if (rd < 0.85) add((1 - rd) * 2, 'nade', 'Retake fraco', `${s.desarmeN.toFixed(1)} desarmes por partida contra ${s.desarmeE.toFixed(1)} do adversário: quando o bomb cai, a Geladeira retoma menos. Combinar o retake e levar flash e molotov de CT.`, linkGranadas(mapa, 'todas', 'CT', 'Granadas de CT'));
    else if (rd > 1.2) add((rd - 1) / 2, 'forte', 'Retake forte', `${s.desarmeN.toFixed(1)} desarmes por partida contra ${s.desarmeE.toFixed(1)} do adversário.`);
    if (s.nivelD !== null && s.nivelD < -0.4 && s.wr >= 0.5) add(0.3, 'forte', 'Ganha de time de nível maior', `Mesmo com o adversário ${Math.abs(s.nivelD).toFixed(1)} nível acima em média, a Geladeira vence ${pct(s.wr)}.`);
    if (s.mkN < s.mkE * 0.8) add(0.25, 'atencao', 'Pouca rodada virada no individual', `${s.mkN.toFixed(1)} multiabates (3+) por partida contra ${s.mkE.toFixed(1)} do adversário. Jogar com crossfire para que um abate puxe outro.`);
    const ordemTipo = { menos: 0, atencao: 1, nade: 1, mais: 2, forte: 3 };
    return out.sort((a, b) => ordemTipo[a.tipo] - ordemTipo[b.tipo] || b.peso - a.peso);
  }

  // Quem rende mais e menos no mapa (ADR no mapa contra o próprio ADR em todos os mapas do filtro).
  function membrosNoMapa(ctx, mapa) {
    const tudo = new Map(), noMapa = new Map();
    const soma = (M, x) => { const a = M.get(x.n) || { p: 0, dano: 0, rod: 0, k: 0, m: 0 }; a.p++; a.dano += x.dano; a.rod += x.rod; a.k += x.k; a.m += x.m; M.set(x.n, a); };
    for (const p of ctx.ms) for (const x of p.mem) { soma(tudo, x); if (p.mp === mapa) soma(noMapa, x); }
    return [...noMapa].filter(([, a]) => a.p >= 4).map(([n, a]) => { const t = tudo.get(n); const adr = a.dano / Math.max(1, a.rod), adrT = t.dano / Math.max(1, t.rod); return { n, p: a.p, adr, dif: (adr - adrT) / adrT, kd: a.k / Math.max(1, a.m) }; })
      .sort((a, b) => b.dif - a.dif);
  }

  const ICONE = { forte: '✔', mais: '↑', menos: '↓', nade: '💣', atencao: '⚠' };
  const kpi = (rot, valor, sub, tipo, cor, info) => h('div', { class: 'rs-kpi', estilo: `--k:${cor}` },
    h('div', { class: 'rs-kpi-topo' }, h('span', { class: 'rot' }, rot, info && infoIcone(info)), tipo && h('span', { class: 'rs-dif ' + tipo }, tipo === 'ok' ? 'melhor' : tipo === 'bad' ? 'pior' : 'igual')),
    h('b', { class: 'rs-kpi-v' }, valor), h('small', { class: 'mudo' }, sub));
  const comp = (a, b, folga = 0.08) => (a > b * (1 + folga) ? 'ok' : a < b * (1 - folga) ? 'bad' : 'neutro');

  GT.registrarBloco({ aba: 'plano', id: 'tudo', ordem: 10, render(el, ctx) {
    const mapas = [...new Set(ctx.ms.filter((p) => p.tn && p.r !== 'X').map((p) => p.mp))];
    const E = new Map(mapas.map((m) => [m, estatMapa(ctx.ms.filter((p) => p.mp === m))])).entries();
    const lista = [...E].sort((a, b) => b[1].n - a[1].n);
    el.append(h('header', { class: 'cabeca' }, h('h1', null, 'Plano por mapa'),
      h('p', { class: 'lead' }, 'O que funciona e o que falta para a Geladeira em cada mapa: o time contra os adversários nas mesmas partidas, e o resultado contra o que a GC esperava. Segue os filtros de período e mapa.')));
    if (!lista.length) { el.append(GT.u.vazioFiltro()); return; }

    // Veto: jogar mais, jogar menos.
    const comEsp = lista.filter(([, s]) => s.n >= MIN && s.esp !== null).map(([m, s]) => ({ m, s, dif: s.wr - s.esp }));
    const mais = comEsp.filter((x) => x.dif >= 0.03).sort((a, b) => b.dif - a.dif), menos = comEsp.filter((x) => x.dif <= -0.03).sort((a, b) => a.dif - b.dif);
    const itemVeto = (x) => h('a', { class: 'pl-veto-item', href: '#plano/' + x.m + '?' + GT.u.paramsTexto() }, h('b', null, nome(x.m)), h('small', null, `${pct(x.s.wr)} (esperado ${pct(x.s.esp)}) · ${pl(x.s.n, 'partida', 'partidas')}`));
    el.append(card('Veto da Geladeira', `Comparação do win rate com a previsão de vitória que a GC mostrava antes de cada partida (mapas com ${MIN} partidas ou mais no filtro).`,
      h('div', { class: 'pl-veto' },
        h('div', { class: 'pl-veto-col mais' }, h('h3', null, '↑ Jogar mais'), mais.length ? h('div', { class: 'pl-veto-lista' }, ...mais.map(itemVeto)) : h('p', { class: 'nota' }, 'Nenhum mapa bem acima do esperado.')),
        h('div', { class: 'pl-veto-col menos' }, h('h3', null, '↓ Precisa de treino'), menos.length ? h('div', { class: 'pl-veto-lista' }, ...menos.map(itemVeto)) : h('p', { class: 'nota' }, 'Nenhum mapa bem abaixo do esperado.')))));

    const G0 = GT.planoDemos ? GT.planoDemos.geral(ctx) : null; if (G0) el.append(G0);
    if (!UI.planoMapa || !lista.some(([m]) => m === UI.planoMapa)) UI.planoMapa = lista[0][0];
    el.append(h('nav', { class: 'gr-mapas', 'aria-label': 'Escolher mapa' }, ...lista.map(([m, s]) => h('a', { class: 'gr-mapa' + (m === UI.planoMapa ? ' ativo' : ''), href: '#plano/' + m + '?' + GT.u.paramsTexto(), 'aria-current': m === UI.planoMapa ? 'page' : null },
      h('b', null, nome(m)), h('small', null, `${pl(s.n, 'partida', 'partidas')} · ${pct(s.wr)}`)))));

    const m = UI.planoMapa, s = estatMapa(ctx.ms.filter((p) => p.mp === m)), D = s.n >= MIN ? dicas(m, s) : [];
    const kpis = h('div', { class: 'rs-kpis' },
      kpi('Win rate', pct(s.wr), s.esp !== null ? `esperado pela GC: ${pct(s.esp)}` : 'sem previsão da GC', s.esp !== null ? comp(s.wr, s.esp, 0.06) : null, 'var(--c1)', 'Previsão de vitória que a GC mostrava para o time da Geladeira antes da partida, em média.'),
      kpi('Saldo de rodadas', `${s.saldoP > 0 ? '+' : ''}${s.saldoP.toFixed(1)}`, 'por partida', s.saldoP > 0.5 ? 'ok' : s.saldoP < -0.5 ? 'bad' : 'neutro', 'var(--c2)'),
      kpi('Primeiros abates', pct(s.abertura), 'da Geladeira, contra o adversário', s.abertura > 0.52 ? 'ok' : s.abertura < 0.48 ? 'bad' : 'neutro', 'var(--c4)', 'De todos os primeiros abates das rodadas (dos dois times), quantos foram da Geladeira.'),
      kpi('Assist. de flash', `${s.flashN.toFixed(1)} × ${s.flashE.toFixed(1)}`, 'por partida: Geladeira × adversário', comp(s.flashN, s.flashE, 0.12), 'var(--c5)'),
      kpi('Bombas plantadas', `${s.bombaN.toFixed(1)} × ${s.bombaE.toFixed(1)}`, 'por partida: Geladeira × adversário', comp(s.bombaN, s.bombaE), 'var(--c3)', 'Quem planta mais chega mais no bomb como T; quando o adversário planta mais, a Geladeira de CT está cedendo o bomb.'),
      kpi('Desarmes', `${s.desarmeN.toFixed(1)} × ${s.desarmeE.toFixed(1)}`, 'por partida: Geladeira × adversário', comp(s.desarmeN, s.desarmeE, 0.12), 'var(--c6)', 'Desarmes medem o retake: retomar o bomb depois que o adversário plantou.'),
      kpi('K/D do time', s.kdN.toFixed(2), `adversário: ${s.kdE.toFixed(2)}`, comp(s.kdN, s.kdE, 0.04), 'var(--c1)'),
      s.nivelD !== null && kpi('Nível médio', `${s.nivelD > 0 ? '+' : ''}${s.nivelD.toFixed(1)}`, 'Geladeira menos adversário', null, 'var(--c2)'));
    const lista2 = D.length && GT.planoDemos ? GT.planoDemos.grupos(D)
      : h('p', { class: 'vazio' }, s.n < MIN ? `Só ${pl(s.n, 'partida', 'partidas')} neste mapa no filtro; as dicas aparecem a partir de ${MIN}.` : 'Nada fora do normal neste mapa: os números estão parecidos com os dos adversários.');
    const mb = membrosNoMapa(ctx, m);
    const quem = mb.length >= 2 ? h('div', { class: 'pl-quem' },
      h('div', { class: 'rs-dest forte' }, h('span', { class: 'rot' }, 'Rendem mais aqui'), ...mb.filter((x) => x.dif > 0.03).slice(0, 3).map((x) => h('span', { class: 'pl-membro' }, avatar(x.n, 20), ` ${x.n} · ADR ${x.adr.toFixed(1)} (+${Math.round(x.dif * 100)}% do próprio)`))),
      h('div', { class: 'rs-dest fraco' }, h('span', { class: 'rot' }, 'Sofrem mais aqui'), ...mb.filter((x) => x.dif < -0.03).slice(-3).reverse().map((x) => h('span', { class: 'pl-membro' }, avatar(x.n, 20), ` ${x.n} · ADR ${x.adr.toFixed(1)} (${Math.round(x.dif * 100)}% do próprio)`))))
      : null;
    el.append(card(nome(m), `${pl(s.n, 'partida', 'partidas')} da Geladeira no filtro (${s.v}V ${s.d}D).`, kpis,
      h('h3', { class: 'adv-sub' }, 'Pontos fortes e o que trabalhar (todas as partidas do filtro)'), lista2,
      ...(GT.planoDemos ? GT.planoDemos.mapa(ctx, m) : []),
      quem && h('h3', { class: 'adv-sub' }, 'Quem rende mais e menos neste mapa'), quem,
      h('p', { class: 'nota' }, 'Números somados do time inteiro da Geladeira (incluindo quem completa a line) e do adversário, nas mesmas partidas. "Rendem mais aqui": ADR do membro neste mapa contra o ADR dele em todos os mapas do filtro (4 partidas ou mais no mapa).')));
  } });
})();
