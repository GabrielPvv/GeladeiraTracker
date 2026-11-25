// Peças da aba Mapas que vêm do rodada a rodada e das demos (U5):
//   geral(ctx): primeiro abate, lados, economia, pós-plant e retake (partidas com estatísticas avançadas da GC: ctx.D.rodadas);
//   contato(ctx, m): primeiro duelo por local (callout), bombs e granadas por rodada (demos: ctx.D.contatos); demosDe(ctx, m): quantas demos.
// Os dois NÃO seguem o filtro de período (são poucas partidas): o selo do título diz de quantas partidas ou demos vem cada número.
// Quem abre a rodada no mapa fica na tabela "Membros" (mapas.js).
(function () {
  'use strict';
  const GT = window.GT;
  const { h, pct, pl, UI, card, infoIcone, guardar, AMOSTRA } = GT.u;
  const f1 = (x) => Number(x).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const p = (par) => (par && par[1] ? par[0] / par[1] : null);
  const pctPar = (par) => (par && par[1] ? `${pct(par[0] / par[1])} (${par[0]} de ${par[1]})` : '—');
  // "OutsideA" -> "Outside A"; "BombsiteB" -> "Bomb B"; "BHalls" -> "B Halls".
  const local = (s) => String(s || '?').replace(/^Bombsite\s*([AB])$/i, 'Bomb $1').replace(/([a-z])of([A-Z])/g, '$1 of $2').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^([AB])([A-Z])/, '$1 $2');
  const linkGr = (mapa, tipo, lado, texto) => h('a', { class: 'pl-link', href: '#granadas/' + mapa + '?' + GT.u.paramsTexto(),
    onclick: () => { UI.granTipo = tipo; UI.granLado = lado; UI.granFonte = 'essenciais'; guardar('geladeira.granTipo', tipo); guardar('geladeira.granLado', lado); } }, texto, ' →');
  const dica = (tipo, titulo, texto, extra) => ({ tipo, titulo, texto, extra });
  const ICONES = { forte: '+', mais: '↑', nade: '●', atencao: '!', menos: '↓' };
  const itemDica = (d) => h('li', { class: 'pl-dica ' + d.tipo }, h('span', { class: 'pl-ico', 'aria-hidden': 'true' }, ICONES[d.tipo] || '•'), h('div', null, h('b', null, d.titulo), h('p', null, d.texto), d.extra));
  // Dois quadros: o que está dando certo (pontos fortes e o que explorar) e o que trabalhar.
  function grupos(lista, vazioBom = 'Nada claramente acima dos adversários ainda.', vazioRuim = 'Nada claramente abaixo dos adversários.', tituloBom = 'Pontos fortes') {
    const bom = lista.filter((d) => d.tipo === 'forte' || d.tipo === 'mais'), ruim = lista.filter((d) => d.tipo !== 'forte' && d.tipo !== 'mais');
    return h('div', { class: 'pl-grupos' },
      h('div', { class: 'pl-grupo bom' }, h('h4', null, tituloBom), bom.length ? h('ol', { class: 'pl-dicas' }, ...bom.map(itemDica)) : h('p', { class: 'nota' }, vazioBom)),
      h('div', { class: 'pl-grupo ruim' }, h('h4', null, 'O que trabalhar'), ruim.length ? h('ol', { class: 'pl-dicas' }, ...ruim.map(itemDica)) : h('p', { class: 'nota' }, vazioRuim)));
  }
  // Número sem veredito: a faixa lateral só marca o assunto (TR e CT usam --tr e --ct; o resto, o acento).
  const kpi = (rot, valor, sub, cor, info) => h('div', { class: 'rs-kpi', estilo: `--k:${cor}` },
    h('div', { class: 'rs-kpi-topo' }, h('span', { class: 'rot' }, rot, info && infoIcone(info))), h('b', { class: 'rs-kpi-v' }, valor), h('small', { class: 'mudo' }, sub));
  const selosDe = (n, unidade, plural) => [[`${pl(n, unidade, plural)} · não segue o filtro`, 'aviso'], n < AMOSTRA ? ['amostra pequena', 'aviso'] : null].filter(Boolean);

  // ---------- geral: primeiro abate, lados, economia ----------
  function geral(ctx) {
    const R = ctx.D.rodadas && ctx.D.rodadas.total;
    if (!R || !R.rod) return null;
    const abre = p(R.conv.abre), toma = p(R.conv.toma), aT = p(R.abre.T), aCT = p(R.abre.CT), lT = p(R.lado.T), lCT = p(R.lado.CT);
    const eco = p(R.eco.eco), force = p(R.eco.force), pist = p(R.eco.pistol), pos = p(R.posPlant), ret = p(R.retake);
    const D = [];
    if (abre !== null && toma !== null) D.push(dica('mais', `Abrir a rodada vale ${Math.round((abre - toma) * 100)} pontos`, `Quando a Geladeira pega o primeiro abate, ganha ${pct(abre)} das rodadas; quando toma, ganha ${pct(toma)}. O primeiro duelo é a coisa que mais decide a rodada: entrar em dupla e com flash, para que a primeira morte seja trocada.`));
    if (aT !== null && aT < 0.48) D.push(dica('atencao', 'De TR, a Geladeira toma o primeiro abate', `De TR, o primeiro abate é da Geladeira só em ${pct(aT)} das rodadas (de CT, ${pct(aCT)}). O primeiro contato de TR acontece aos ${R.tempo.T ?? '?'} s, na mediana: chegar no contato com utilitário pronto, e não em peek seco.`));
    if (lT !== null && lCT !== null && lCT - lT > 0.06) D.push(dica('atencao', 'Lado TR rende menos que o CT', `Rodadas ganhas: ${pct(lT)} de TR e ${pct(lCT)} de CT. Vale treinar 1 ou 2 execuções completas por mapa (smokes, flashes e entrada combinadas).`));
    if (eco !== null && eco < 0.25) D.push(dica('atencao', 'Eco quase nunca ganha', `Rodadas de eco ganhas: ${pctPar(R.eco.eco)}. Na eco, jogar junto num ponto só (anti-rush de CT ou stack de TR) para buscar armas, ou economizar tudo para garantir a compra cheia seguinte.`));
    if (force !== null && force < 0.4) D.push(dica('atencao', 'Force buy rende pouco', `Rodadas de force ganhas: ${pctPar(R.eco.force)}. Forçar só quando o adversário também estiver sem compra cheia ou quando perder a rodada custar a partida.`));
    if (pos !== null && pos < 0.65) D.push(dica('nade', 'Pós-plant a treinar', `Depois de plantar, a Geladeira ganha só ${pctPar(R.posPlant)}. Combinar posições de pós-plant (de fora do bomb, com crossfire) e guardar molotov para impedir o desarme.`));
    else if (pos !== null && pos >= 0.75) D.push(dica('forte', 'Pós-plant forte', `Depois de plantar, a Geladeira ganha ${pctPar(R.posPlant)}.`));
    if (ret !== null && ret >= 0.4) D.push(dica('forte', 'Retake bom', `Quando o adversário planta, a Geladeira ainda ganha ${pctPar(R.retake)}.`));
    else if (ret !== null && ret < 0.3) D.push(dica('nade', 'Retake a treinar', `Quando o adversário planta, a Geladeira ganha só ${pctPar(R.retake)}. Retomar junto, com flash, em vez de um por vez.`));
    return card({ t: 'Primeiro abate e rodada', selos: selosDe(R.partidas, 'partida', 'partidas') },
      `Rodada a rodada de ${pl(R.partidas, 'partida', 'partidas')} da Geladeira com estatísticas avançadas da GC (${R.rod} rodadas).`,
      h('div', { class: 'rs-kpis' },
        kpi('Abrindo a rodada', pct(abre), 'rodadas ganhas com o 1º abate', 'var(--acento)', 'Quando o primeiro abate da rodada é da Geladeira.'),
        kpi('Tomando o 1º abate', pct(toma), 'rodadas ganhas mesmo assim', 'var(--acento)'),
        kpi('1º abate de TR', pct(aT), `contato aos ${R.tempo.T ?? '?'} s`, 'var(--tr)'),
        kpi('1º abate de CT', pct(aCT), `contato aos ${R.tempo.CT ?? '?'} s`, 'var(--ct)'),
        kpi('Rodadas de TR', pct(lT), `de CT: ${pct(lCT)}`, 'var(--tr)'),
        kpi('Pistol', pct(pist), pctPar(R.eco.pistol), 'var(--acento)'),
        kpi('Eco / force', `${pct(eco)} / ${pct(force)}`, 'rodadas ganhas', 'var(--acento)'),
        kpi('Pós-plant / retake', `${pct(pos)} / ${pct(ret)}`, 'ganha depois de plantar / quando o adversário planta', 'var(--acento)')),
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
    return h('div', { class: 'pl-lado ' + (lado === 'T' ? 'tr' : 'ct') }, h('h4', null, rotulo, h('small', null, ` · ${L.rod} rodadas · ${pct(L.ganhas / L.rod)} ganhas · 1º abate ${pct(L.abertura.nos / Math.max(1, L.abertura.total))} · contato aos ${L.abertura.seg ?? '?'} s`)),
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
      if (pior) out.push(dica('atencao', `De ${GT.u.nomeLado(lado)}, o primeiro duelo em ${local(pior.k)} pede ajuste`, `A Geladeira perdeu ${pior.p} de ${pior.n} primeiros duelos ali. ${lado === 'T' ? 'Não dar o peek seco nesse ponto: smoke ou flash antes, ou passar por outro caminho.' : 'Quem segura ali está morrendo primeiro: segurar mais recuado, com molotov de atraso, ou jogar em dupla.'}`, linkGr(mapa, lado === 'T' ? 'smokes' : 'molotovs', lado, lado === 'T' ? 'Smokes de TR' : 'Molotovs de CT')));
      if (melhor) out.push(dica('mais', `De ${GT.u.nomeLado(lado)}, o primeiro duelo em ${local(melhor.k)} vai bem`, `A Geladeira ganhou ${melhor.g} de ${melhor.n} primeiros duelos ali. ${lado === 'T' ? 'Bom caminho para buscar o abate de abertura: vale explorar mais.' : 'A posição está funcionando: manter quem segura ali e o jeito de segurar.'}`));
      const R = Object.entries(L.bombs).filter(([, b]) => b[0] >= 3).map(([s, b]) => ({ s, n: b[0], g: b[1], t: b[1] / b[0] }));
      if (lado === 'T' && R.length === 2 && Math.abs(R[0].t - R[1].t) >= 0.2) { const [bom, ruim] = R[0].t > R[1].t ? R : [R[1], R[0]]; out.push(dica('mais', `Depois de plantar, o Bomb ${bom.s} rende mais`, `Plantando no ${bom.s}, a Geladeira ganhou ${bom.g} de ${bom.n}; no ${ruim.s}, ${ruim.g} de ${ruim.n}. Vale puxar mais execuções para o ${bom.s} ou rever o pós-plant do ${ruim.s}.`)); }
      if (lado === 'T' && L.semPlant[0] >= 5 && L.semPlant[1] / L.semPlant[0] < 0.25) out.push(dica('atencao', 'Rodada de TR sem plantar quase nunca dá certo', `Sem plantar, a Geladeira ganhou ${L.semPlant[1]} de ${L.semPlant[0]} rodadas de TR. Priorizar chegar no bomb com a execução, em vez de buscar abates no meio do mapa.`, linkGr(mapa, 'smokes', 'T', 'Smokes de execução')));
      if (lado === 'CT') { const ruim = R.filter((x) => x.n >= 3 && x.t < 0.3)[0]; if (ruim) out.push(dica('nade', `Retake do Bomb ${ruim.s} a treinar`, `Quando o adversário planta no ${ruim.s}, a Geladeira retoma ${ruim.g} de ${ruim.n}. Combinar o retake desse bomb (quem flasha, quem entra) e guardar molotov para o desarme.`, linkGr(mapa, 'todas', 'CT', 'Granadas de CT'))); }
    }
    // Granadas de T: Geladeira de T contra os adversários quando eles são T (rodadas de CT da Geladeira).
    const T = M.T, CT = M.CT;
    if (T && CT && T.rod >= 8 && CT.rod >= 8) for (const [tipo, nome] of [['smoke', 'smoke'], ['flash', 'flash'], ['molly', 'molotov']]) {
      const nos = T.gr.nos[tipo] / T.rod, eles = CT.gr.eles[tipo] / CT.rod;
      if (eles > 0.3 && nos < eles * 0.8) out.push(dica('nade', `Falta ${nome} de TR`, `De TR, a Geladeira joga ${f1(nos)} ${nome}${nome.endsWith('h') ? 'es' : 's'} por rodada; os adversários, quando são TR contra a Geladeira, jogam ${f1(eles)}.`, linkGr(mapa, tipo === 'smoke' ? 'smokes' : tipo === 'flash' ? 'flashbangs' : 'molotovs', 'T', 'Granadas de TR do mapa')));
    }
    return out;
  }
  function granadasTabela(M) {
    const T = M.T, CT = M.CT; if (!T || !CT || !T.rod || !CT.rod) return null;
    const linha = (rot, q, L, rod) => h('tr', null, h('td', null, rot), ...['smoke', 'flash', 'molly', 'he'].map((t) => h('td', null, f1(L.gr[q][t] / rod))));
    return h('div', { class: 'rolar' }, h('table', { class: 'pl-gr' }, h('thead', null, h('tr', null, h('th', null, 'Por rodada'), h('th', null, 'Smoke'), h('th', null, 'Flash'), h('th', null, 'Molotov'), h('th', null, 'HE'))),
      h('tbody', null, linha('Geladeira de TR', 'nos', T, T.rod), linha('Adversário de TR', 'eles', CT, CT.rod), linha('Geladeira de CT', 'nos', CT, CT.rod), linha('Adversário de CT', 'eles', T, T.rod))));
  }

  const demosDe = (ctx, m) => { const M = ctx.D.contatos && ctx.D.contatos[m]; return M && M.demos ? M.demos : 0; };

  // Aba "Primeiro contato" da página do mapa: dicas, lados TR e CT e granadas por rodada, das demos do ano (não seguem o filtro).
  function contato(ctx, m) {
    const M = ctx.D.contatos && ctx.D.contatos[m], n = demosDe(ctx, m);
    if (!n) return [card({ t: 'Primeiro contato, bombs e granadas', selos: [['sem demo', 'aviso']] }, null,
      h('p', { class: 'nota' }, 'Ainda sem demo deste mapa. As dicas de onde acontece o primeiro duelo, de bomb e de granadas aparecem quando houver demo baixada e consolidada.'))];
    return [card({ t: 'Primeiro contato, bombs e granadas', selos: selosDe(n, 'demo', 'demos') },
      'Das demos da Geladeira neste mapa. Local do primeiro duelo = onde estava quem morreu. Dicas só com 3 duelos ou mais no mesmo ponto.',
      grupos(dicasDemos(m, M), 'Nenhum ponto de duelo, bomb ou granada claramente a favor ainda.', 'Nenhum ponto de duelo, bomb ou granada claramente contra.'),
      h('div', { class: 'pl-lados' }, ladoBloco(m, M.T, 'Geladeira de TR', 'T'), ladoBloco(m, M.CT, 'Geladeira de CT', 'CT')),
      h('h3', { class: 'adv-sub' }, 'Granadas por rodada'), granadasTabela(M))];
  }

  GT.planoDemos = { geral, contato, demosDe, grupos };
})();
