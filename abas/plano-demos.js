// Peças do Plano por mapa que vêm do rodada a rodada:
//   geral(ctx): primeiro abate, lados, economia, pós-plant e retake (partidas com estatísticas avançadas da GC: ctx.D.rodadas);
//   mapa(ctx, m): primeiro duelo por local (callout), bombs, granadas por rodada e quem abre (demos: ctx.D.contatos; placar: fk).
// Os dois NÃO seguem o filtro de período (são poucas partidas); o texto diz de quantas partidas vem cada número.
(function () {
  'use strict';
  const GT = window.GT;
  const { h, pct, pl, UI, card, avatar, infoIcone, guardar } = GT.u;
  const p = (par) => (par && par[1] ? par[0] / par[1] : null);
  const pctPar = (par) => (par && par[1] ? `${pct(par[0] / par[1])} (${par[0]} de ${par[1]})` : '—');
  // "OutsideA" -> "Outside A"; "BombsiteB" -> "Bomb B"; "BHalls" -> "B Halls".
  const local = (s) => String(s || '?').replace(/^Bombsite\s*([AB])$/i, 'Bomb $1').replace(/([a-z])of([A-Z])/g, '$1 of $2').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^([AB])([A-Z])/, '$1 $2');
  const linkGr = (mapa, tipo, lado, texto) => h('a', { class: 'pl-link', href: '#granadas/' + mapa + '?' + GT.u.paramsTexto(),
    onclick: () => { UI.granTipo = tipo; UI.granLado = lado; UI.granFonte = 'essenciais'; guardar('geladeira.granTipo', tipo); guardar('geladeira.granLado', lado); } }, texto, ' →');
  const dica = (tipo, titulo, texto, extra) => ({ tipo, titulo, texto, extra });
  const ICONES = { forte: '✔', mais: '↑', nade: '💣', atencao: '⚠', menos: '↓' };
  const itemDica = (d) => h('li', { class: 'pl-dica ' + d.tipo }, h('span', { class: 'pl-ico', 'aria-hidden': 'true' }, ICONES[d.tipo] || '•'), h('div', null, h('b', null, d.titulo), h('p', null, d.texto), d.extra));
  // Dois quadros: o que está dando certo (pontos fortes e o que explorar) e o que continuar trabalhando.
  function grupos(lista, vazioBom = 'Nada claramente acima dos adversários ainda.', vazioRuim = 'Nada claramente abaixo dos adversários.') {
    const bom = lista.filter((d) => d.tipo === 'forte' || d.tipo === 'mais'), ruim = lista.filter((d) => d.tipo !== 'forte' && d.tipo !== 'mais');
    return h('div', { class: 'pl-grupos' },
      h('div', { class: 'pl-grupo bom' }, h('h4', null, '✔ Está dando certo'), bom.length ? h('ol', { class: 'pl-dicas' }, ...bom.map(itemDica)) : h('p', { class: 'nota' }, vazioBom)),
      h('div', { class: 'pl-grupo ruim' }, h('h4', null, '⚙ Continuar trabalhando'), ruim.length ? h('ol', { class: 'pl-dicas' }, ...ruim.map(itemDica)) : h('p', { class: 'nota' }, vazioRuim)));
  }
  const kpi = (rot, valor, sub, tipo, cor, info) => h('div', { class: 'rs-kpi', estilo: `--k:${cor}` },
    h('div', { class: 'rs-kpi-topo' }, h('span', { class: 'rot' }, rot, info && infoIcone(info)), tipo && h('span', { class: 'rs-dif ' + tipo }, tipo === 'ok' ? 'bom' : tipo === 'bad' ? 'atenção' : 'ok')), h('b', { class: 'rs-kpi-v' }, valor), h('small', { class: 'mudo' }, sub));

  // ---------- geral: primeiro abate, lados, economia ----------
  function geral(ctx) {
    const R = ctx.D.rodadas && ctx.D.rodadas.total;
    if (!R || !R.rod) return null;
    const abre = p(R.conv.abre), toma = p(R.conv.toma), aT = p(R.abre.T), aCT = p(R.abre.CT), lT = p(R.lado.T), lCT = p(R.lado.CT);
    const eco = p(R.eco.eco), force = p(R.eco.force), pist = p(R.eco.pistol), pos = p(R.posPlant), ret = p(R.retake);
    const D = [];
    if (abre !== null && toma !== null) D.push(dica('mais', `Abrir a rodada vale ${Math.round((abre - toma) * 100)} pontos`, `Quando a Geladeira pega o primeiro abate, ganha ${pct(abre)} das rodadas; quando toma, ganha ${pct(toma)}. O primeiro duelo é a coisa que mais decide a rodada: entrar em dupla e com flash, para que a primeira morte seja trocada.`));
    if (aT !== null && aT < 0.48) D.push(dica('atencao', 'De T, a Geladeira toma o primeiro abate', `De T, o primeiro abate é da Geladeira só em ${pct(aT)} das rodadas (de CT, ${pct(aCT)}). O primeiro contato de T acontece aos ${R.tempo.T ?? '?'} s, na mediana: chegar no contato com utilitário pronto, e não em peek seco.`));
    if (lT !== null && lCT !== null && lCT - lT > 0.06) D.push(dica('atencao', 'Lado T rende menos que o CT', `Rodadas ganhas: ${pct(lT)} de T e ${pct(lCT)} de CT. Vale treinar 1 ou 2 execuções completas por mapa (smokes, flashes e entrada combinadas).`));
    if (eco !== null && eco < 0.25) D.push(dica('atencao', 'Eco quase nunca ganha', `Rodadas de eco ganhas: ${pctPar(R.eco.eco)}. Na eco, jogar junto num ponto só (anti-rush de CT ou stack de T) para buscar armas, ou economizar tudo para garantir a compra cheia seguinte.`));
    if (force !== null && force < 0.4) D.push(dica('atencao', 'Force buy rende pouco', `Rodadas de force ganhas: ${pctPar(R.eco.force)}. Forçar só quando o adversário também estiver fraco ou quando perder a rodada custar a partida.`));
    if (pos !== null && pos < 0.65) D.push(dica('nade', 'Pós-plant fraco', `Depois de plantar, a Geladeira ganha só ${pctPar(R.posPlant)}. Combinar posições de pós-plant (de fora do bomb, com crossfire) e guardar molotov para impedir o desarme.`));
    else if (pos !== null && pos >= 0.75) D.push(dica('forte', 'Pós-plant forte', `Depois de plantar, a Geladeira ganha ${pctPar(R.posPlant)}.`));
    if (ret !== null && ret >= 0.4) D.push(dica('forte', 'Retake bom', `Quando o adversário planta, a Geladeira ainda ganha ${pctPar(R.retake)}.`));
    else if (ret !== null && ret < 0.3) D.push(dica('nade', 'Retake fraco', `Quando o adversário planta, a Geladeira ganha só ${pctPar(R.retake)}. Retomar junto, com flash, em vez de um por vez.`));
    return card('Primeiro abate e rodada', `Rodada a rodada de ${pl(R.partidas, 'partida', 'partidas')} da Geladeira com estatísticas avançadas da GC (${R.rod} rodadas). Não segue o filtro de período.`,
      h('div', { class: 'rs-kpis' },
        kpi('Abrindo a rodada', pct(abre), 'rodadas ganhas com o 1º abate', abre >= 0.6 ? 'ok' : null, 'var(--ok)', 'Quando o primeiro abate da rodada é da Geladeira.'),
        kpi('Tomando o 1º abate', pct(toma), 'rodadas ganhas mesmo assim', toma < 0.35 ? 'bad' : null, 'var(--bad)'),
        kpi('1º abate de T', pct(aT), `contato aos ${R.tempo.T ?? '?'} s`, aT < 0.48 ? 'bad' : aT > 0.52 ? 'ok' : null, 'var(--c4)'),
        kpi('1º abate de CT', pct(aCT), `contato aos ${R.tempo.CT ?? '?'} s`, aCT < 0.48 ? 'bad' : aCT > 0.52 ? 'ok' : null, 'var(--c1)'),
        kpi('Rodadas de T', pct(lT), `de CT: ${pct(lCT)}`, lT < 0.47 ? 'bad' : null, 'var(--c3)'),
        kpi('Pistol', pct(pist), pctPar(R.eco.pistol), null, 'var(--c2)'),
        kpi('Eco / force', `${pct(eco)} / ${pct(force)}`, 'rodadas ganhas', eco < 0.25 ? 'bad' : null, 'var(--c5)'),
        kpi('Pós-plant / retake', `${pct(pos)} / ${pct(ret)}`, 'ganha depois de plantar / quando o adversário planta', null, 'var(--c6)')),
      grupos(D));
  }

  // ---------- por mapa: demos ----------
  function ladoBloco(mapa, L, rotulo, lado) {
    if (!L || !L.rod) return null;
    const locs = Object.entries(L.abertura.locais).map(([k, v]) => ({ k, ganha: v[0], perde: v[1], n: v[0] + v[1] })).filter((x) => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 6);
    const barras = locs.length ? h('div', { class: 'pl-locais' }, ...locs.map((x) => h('div', { class: 'pl-local' },
      h('span', { class: 'pl-local-nome' }, local(x.k)),
      h('span', { class: 'pl-local-barra', title: `${x.ganha} ganhos e ${x.perde} perdidos` }, h('i', { class: 'g', estilo: `width:${(x.ganha / x.n) * 100}%` }), h('i', { class: 'p', estilo: `width:${(x.perde / x.n) * 100}%` })),
      h('small', null, `${x.ganha}–${x.perde}`)))) : h('p', { class: 'nota' }, 'Poucos primeiros duelos repetidos no mesmo local.');
    const bombs = Object.entries(L.bombs).sort();
    const bombTxt = lado === 'T'
      ? bombs.map(([s, b]) => `Bomb ${s}: plantou ${b[0]}x, ganhou ${b[1]}`).concat(L.semPlant[0] ? [`Sem plantar: ${L.semPlant[1]} de ${L.semPlant[0]}`] : []).join(' · ')
      : bombs.map(([s, b]) => `Bomb ${s}: adversário plantou ${b[0]}x, Geladeira retomou ${b[1]}`).join(' · ');
    return h('div', { class: 'pl-lado' }, h('h4', null, rotulo, h('small', null, ` · ${L.rod} rodadas · ${pct(L.ganhas / L.rod)} ganhas · 1º abate ${pct(L.abertura.nos / Math.max(1, L.abertura.total))} · contato aos ${L.abertura.seg ?? '?'} s`)),
      h('span', { class: 'rot' }, 'Onde é o primeiro duelo (Geladeira ganha–perde)'), barras,
      bombTxt && h('p', { class: 'nota' }, bombTxt));
  }
  function dicasDemos(mapa, M) {
    const out = [];
    for (const lado of ['T', 'CT']) {
      const L = M[lado]; if (!L || !L.rod) continue;
      const locs = Object.entries(L.abertura.locais).map(([k, v]) => ({ k, g: v[0], p: v[1], n: v[0] + v[1] }));
      const pior = locs.filter((x) => x.p >= 3 && x.p / x.n >= 0.65).sort((a, b) => b.p - a.p)[0];
      const melhor = locs.filter((x) => x.g >= 3 && x.g / x.n >= 0.65).sort((a, b) => b.g - a.g)[0];
      if (pior) out.push(dica('atencao', `De ${lado}, o primeiro duelo em ${local(pior.k)} vai mal`, `A Geladeira perdeu ${pior.p} de ${pior.n} primeiros duelos ali. ${lado === 'T' ? 'Não dar o peek seco nesse ponto: smoke ou flash antes, ou passar por outro caminho.' : 'Quem segura ali está morrendo primeiro: segurar mais recuado, com molotov de atraso, ou jogar em dupla.'}`, linkGr(mapa, lado === 'T' ? 'smokes' : 'molotovs', lado, lado === 'T' ? 'Smokes de T' : 'Molotovs de CT')));
      if (melhor) out.push(dica('mais', `De ${lado}, o primeiro duelo em ${local(melhor.k)} vai bem`, `A Geladeira ganhou ${melhor.g} de ${melhor.n} primeiros duelos ali. ${lado === 'T' ? 'Bom caminho para buscar o abate de abertura: vale explorar mais.' : 'A posição está funcionando: manter quem segura ali e o jeito de segurar.'}`));
      const R = Object.entries(L.bombs).filter(([, b]) => b[0] >= 3).map(([s, b]) => ({ s, n: b[0], g: b[1], t: b[1] / b[0] }));
      if (lado === 'T' && R.length === 2 && Math.abs(R[0].t - R[1].t) >= 0.2) { const [bom, ruim] = R[0].t > R[1].t ? R : [R[1], R[0]]; out.push(dica('mais', `Depois de plantar, o Bomb ${bom.s} rende mais`, `Plantando no ${bom.s}, a Geladeira ganhou ${bom.g} de ${bom.n}; no ${ruim.s}, ${ruim.g} de ${ruim.n}. Vale puxar mais execuções para o ${bom.s} ou rever o pós-plant do ${ruim.s}.`)); }
      if (lado === 'T' && L.semPlant[0] >= 5 && L.semPlant[1] / L.semPlant[0] < 0.25) out.push(dica('atencao', 'Rodada de T sem plantar quase nunca dá certo', `Sem plantar, a Geladeira ganhou ${L.semPlant[1]} de ${L.semPlant[0]} rodadas de T. Priorizar chegar no bomb com a execução, em vez de buscar abates no meio do mapa.`, linkGr(mapa, 'smokes', 'T', 'Smokes de execução')));
      if (lado === 'CT') { const ruim = R.filter((x) => x.n >= 3 && x.t < 0.3)[0]; if (ruim) out.push(dica('nade', `Retake do Bomb ${ruim.s} fraco`, `Quando o adversário planta no ${ruim.s}, a Geladeira retoma ${ruim.g} de ${ruim.n}. Combinar o retake desse bomb (quem flasha, quem entra) e guardar molotov para o desarme.`, linkGr(mapa, 'todas', 'CT', 'Granadas de CT'))); }
    }
    // Granadas de T: Geladeira de T contra os adversários quando eles são T (rodadas de CT da Geladeira).
    const T = M.T, CT = M.CT;
    if (T && CT && T.rod >= 8 && CT.rod >= 8) for (const [tipo, nome] of [['smoke', 'smoke'], ['flash', 'flash'], ['molly', 'molotov']]) {
      const nos = T.gr.nos[tipo] / T.rod, eles = CT.gr.eles[tipo] / CT.rod;
      if (eles > 0.3 && nos < eles * 0.8) out.push(dica('nade', `Falta ${nome} de T`, `De T, a Geladeira joga ${nos.toFixed(1)} ${nome}${nome.endsWith('h') ? 'es' : 's'} por rodada; os adversários, quando são T contra a Geladeira, jogam ${eles.toFixed(1)}.`, linkGr(mapa, tipo === 'smoke' ? 'smokes' : tipo === 'flash' ? 'flashbangs' : 'molotovs', 'T', 'Granadas de T do mapa')));
    }
    return out;
  }
  function granadasTabela(M) {
    const T = M.T, CT = M.CT; if (!T || !CT || !T.rod || !CT.rod) return null;
    const linha = (rot, q, L, rod) => h('tr', null, h('td', null, rot), ...['smoke', 'flash', 'molly', 'he'].map((t) => h('td', null, (L.gr[q][t] / rod).toFixed(1))));
    return h('div', { class: 'rolar' }, h('table', { class: 'pl-gr' }, h('thead', null, h('tr', null, h('th', null, 'Por rodada'), h('th', null, 'Smoke'), h('th', null, 'Flash'), h('th', null, 'Molotov'), h('th', null, 'HE'))),
      h('tbody', null, linha('Geladeira de T', 'nos', T, T.rod), linha('Adversário de T', 'eles', CT, CT.rod), linha('Geladeira de CT', 'nos', CT, CT.rod), linha('Adversário de CT', 'eles', T, T.rod))));
  }
  // Quem abre a rodada no mapa (primeiros abates por rodada no placar da GC, todas as partidas do filtro).
  function quemAbre(ctx, mapa) {
    const S = new Map();
    for (const q of ctx.ms) if (q.mp === mapa) for (const x of q.mem) { const a = S.get(x.n) || { fk: 0, rod: 0, p: 0 }; a.fk += x.fk; a.rod += x.rod; a.p++; S.set(x.n, a); }
    const l = [...S].filter(([, a]) => a.p >= 4).map(([n, a]) => ({ n, r: a.fk / Math.max(1, a.rod), p: a.p })).sort((a, b) => b.r - a.r);
    if (l.length < 2) return null;
    return h('div', { class: 'rs-dest', estilo: '--k:var(--c4)' }, h('span', { class: 'rot' }, 'Quem abre a rodada aqui (1º abates por rodada)'),
      ...l.slice(0, 4).map((x, i) => h('span', { class: 'pl-membro' }, `${i + 1}º `, avatar(x.n, 20), ` ${x.n} · ${x.r.toFixed(3)} por rodada (${pl(x.p, 'partida', 'partidas')})`)));
  }

  function mapa(ctx, m) {
    const M = ctx.D.contatos && ctx.D.contatos[m];
    const nos = [];
    const qa = quemAbre(ctx, m);
    if (!M || !M.demos) { nos.push(h('h3', { class: 'adv-sub' }, 'Primeiro contato e bombs'), h('p', { class: 'nota' }, 'Ainda sem demo deste mapa. As dicas de onde acontece o primeiro duelo, de bomb e de granadas aparecem quando houver demo baixada e consolidada.'), qa); return nos; }
    const D = dicasDemos(m, M);
    nos.push(h('h3', { class: 'adv-sub' }, `Primeiro contato, bombs e granadas · ${pl(M.demos, 'demo', 'demos')}${M.demos < 3 ? ' (amostra pequena)' : ''}`),
      grupos(D, 'Nenhum ponto de duelo, bomb ou granada claramente a favor ainda.', 'Nenhum ponto de duelo, bomb ou granada claramente contra.'),
      h('div', { class: 'pl-lados' }, ladoBloco(m, M.T, 'Geladeira de T', 'T'), ladoBloco(m, M.CT, 'Geladeira de CT', 'CT')),
      h('span', { class: 'rot' }, 'Granadas por rodada'), granadasTabela(M), qa,
      h('p', { class: 'nota' }, 'Das demos da Geladeira deste mapa (não seguem o filtro de período). Local do primeiro duelo = onde estava quem morreu. "Explorar" e "vai mal" só aparecem com 3 duelos ou mais no mesmo ponto.'));
    return nos;
  }

  GT.planoDemos = { geral, mapa, grupos };
})();
