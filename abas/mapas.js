// Aba "Mapas": mapas mais jogados e com mais sucesso, win rate mapa × mês, tabelas de mapas e de horário.
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pct, n1, n2, pl, mesNome, UI, card, grafico, grade, ranking, tabela, cWr, render, avatar, rotuloMembro, cls, AMOSTRA } = GT.u;
  Object.assign(UI, { minMapa: 10 });
  const MIN_MEMBRO = 5; // mínimo de partidas no mapa para entrar no "melhor membro"; abaixo de AMOSTRA aparece o selo de amostra pequena
  const NOMES = { cbble: 'Cobblestone', dust2: 'Dust2' };
  const TEMAS = ['mirage', 'dust2', 'inferno', 'nuke', 'ancient', 'anubis', 'overpass', 'cache', 'vertigo', 'train', 'cbble'];
  const nomeMapa = (m) => NOMES[m] || m.charAt(0).toUpperCase() + m.slice(1);

  GT.registrarAba({ id: 'mapas', titulo: 'Mapas', ordem: 40 });

  const dicaMapa = (d) => `${d.mapa}: ${d.v}V ${d.d}D · K/D ${n2(d.kd)} · ADR ${n1(d.adr)}`;

  GT.registrarBloco({ aba: 'mapas', id: 'cartoes', ordem: 5, render(el, ctx) {
    const mp = ctx.cache('mapas', () => C.mapas(ctx.ms));
    const porMapa = C.agrupar(ctx.ms, (m) => m.mp);
    const cartoes = mp.map((d) => {
      const melhor = C.membros(porMapa.get(d.mapa) || [], ctx.membros).filter((x) => x.partidas >= MIN_MEMBRO).sort((a, b) => b.adr - a.adr || b.kd - a.kd)[0];
      const tema = TEMAS.includes(d.mapa) ? d.mapa : 'neutro';
      return h('article', { class: `mp-cartao mp-${tema}`, 'aria-label': `Mapa ${nomeMapa(d.mapa)}` },
        h('header', { class: 'mp-topo' }, h('h3', { class: 'mp-nome' }, nomeMapa(d.mapa))),
        h('div', { class: 'mp-veu' },
          h('div', { class: 'mp-wr' }, h('b', { class: d.comResultado ? cls(d.wr) : '' }, d.comResultado ? pct(d.wr) : '—'), h('span', null, 'win rate da Geladeira'), h('span', { class: 'mp-vd' }, `${d.v}V-${d.d}D`)),
          h('dl', { class: 'mp-nums' },
            h('div', null, h('dt', null, 'Partidas'), h('dd', null, d.partidas)),
            h('div', null, h('dt', null, 'ADR'), h('dd', null, n1(d.adr))),
            h('div', null, h('dt', null, 'K/D'), h('dd', null, n2(d.kd)))),
          melhor
            ? h('div', { class: 'mp-melhor' }, avatar(melhor.jogador, 34), h('div', { class: 'tx' }, h('span', null, 'Melhor membro (ADR)'), h('b', null, rotuloMembro(melhor.jogador), melhor.partidas < AMOSTRA && h('span', { class: 'mp-selo', title: `Menos de ${AMOSTRA} partidas neste mapa` }, 'amostra pequena')), h('span', null, `ADR ${n1(melhor.adr)} · K/D ${n2(melhor.kd)} · ${pl(melhor.partidas, 'partida', 'partidas')}`)))
            : h('p', { class: 'mp-sem' }, `Nenhum membro com ${MIN_MEMBRO} partidas ou mais neste mapa.`)));
    });
    el.append(h('div', { class: 'mp-grade' }, ...cartoes));
  } });

  GT.registrarBloco({ aba: 'mapas', id: 'rankings', ordem: 10, render(el, ctx) {
    const mp = ctx.cache('mapas', () => C.mapas(ctx.ms));
    const jogados = mp.map((d) => ({ ...d, rotulo: d.mapa }));
    const sucesso = mp.filter((d) => d.comResultado >= UI.minMapa).sort((a, b) => b.wr - a.wr).map((d) => ({ ...d, rotulo: d.mapa }));
    el.append(h('div', { class: 'grade2' },
      card('Mais jogados', 'Mapas por número de partidas da Geladeira.', ranking(jogados, 'partidas', Math.max(...jogados.map((d) => d.partidas)), (d) => `${pl(d.partidas, 'jogo', 'jogos')} · ${pct(d.wr)}`, dicaMapa)),
      card('Mais sucesso', null, h('div', { class: 'controles' }, h('label', null, 'Mínimo de partidas', h('input', { type: 'number', min: 1, max: 100, value: UI.minMapa, onchange: (e) => { UI.minMapa = Math.max(1, Number(e.target.value) || 10); render(); } }))),
        sucesso.length ? ranking(sucesso, 'wr', 1, (d) => `${pct(d.wr)} · ${pl(d.partidas, 'jogo', 'jogos')}`, dicaMapa) : h('p', { class: 'vazio' }, `Nenhum mapa com ${UI.minMapa} partidas ou mais neste filtro.`))));
  } });

  GT.registrarBloco({ aba: 'mapas', id: 'mapa-mes', ordem: 20, render(el, ctx) {
    const mp = ctx.cache('mapas', () => C.mapas(ctx.ms));
    const meses = [...new Set(ctx.ms.map(C.mesDe))].sort();
    const porMes = new Map(); for (const [mapa, ps] of C.agrupar(ctx.ms, (m) => m.mp)) for (const [mes, qs] of C.agrupar(ps, C.mesDe)) porMes.set(`${mapa}|${mes}`, C.grupo(qs));
    for (const d of mp) porMes.set(`${d.mapa}|ano`, d);
    const cols = [...meses.map((m) => ({ k: m, t: mesNome(m) })), { k: 'ano', t: 'Total' }];
    el.append(card('Mapa × mês', 'Win rate da Geladeira em cada mapa em cada mês (verde acima de 50%, vermelho abaixo); o número pequeno é a quantidade de partidas.', grafico((g) => grade(g, mp.map((d) => d.mapa), cols, (n, k) => porMes.get(`${n}|${k}`), 90), 'grafico rolar')));
  } });

  GT.registrarBloco({ aba: 'mapas', id: 'tabelas', ordem: 30, render(el, ctx) {
    const mp = ctx.cache('mapas', () => C.mapas(ctx.ms));
    el.append(h('div', { class: 'grade2' },
      card('Mapas', null, tabela([{ t: 'Mapa', f: (r) => r.mapa }, { t: 'Part.', f: (r) => r.partidas }, cWr, { t: 'K/D', f: (r) => n2(r.kd) }, { t: 'ADR', f: (r) => n1(r.adr) }], mp)),
      card('Horário em que a partida começou', null, tabela([{ t: 'Faixa', f: (r) => r.faixa }, { t: 'Part.', f: (r) => r.partidas }, cWr, { t: 'K/D', f: (r) => n2(r.kd) }, { t: 'ADR', f: (r) => n1(r.adr) }], C.horario(ctx.ms)))));
  } });
})();
