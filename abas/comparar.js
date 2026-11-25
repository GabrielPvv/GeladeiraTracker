// Comparar dois jogadores (#jogadores/comparar/<nickA>/<nickB>), dentro da aba Jogadores. Segue o filtro do site (período e mapa).
// Cabeçalho com os dois, os 5 números em barras espelhadas (cores neutras, sem verde/vermelho), mapas e forma recente.
// A rota é lida e escrita em membros.js (UI.jogCmp, UI.cmpA, UI.cmpB). Cálculo em GTCalc.compararJogadores.
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pct, n1, n2, pl, E, UI, card, avatar, sparkline, paramsTexto, nomeMapa, iconeMapa, dica, infoIcone, dataBR } = GT.u;

  const janela = () => (GT.u.rotJanela ? GT.u.rotJanela() : `Ano ${E.ano}`);
  GT.linkComparar = (a, b) => '#jogadores/comparar' + (a ? '/' + encodeURIComponent(a) + (b ? '/' + encodeURIComponent(b) : '') : '') + '?' + paramsTexto();

  const LINHAS = [
    { k: 'wr', rot: 'Win rate', fmt: pct },
    { k: 'kd', rot: 'K/D', fmt: n2 },
    { k: 'adr', rot: 'ADR', fmt: n1, info: 'Dano médio por rodada.' },
    { k: 'kast', rot: 'KAST', fmt: pct, info: 'Rodadas com abate, assistência, sobrevivência ou troca.' },
    { k: 'hs', rot: 'HS%', fmt: pct, info: 'Abates com headshot.' }];

  function seletores(ctx) {
    const nomes = [...ctx.membros]; for (const n of [UI.cmpA, UI.cmpB]) if (n && !nomes.includes(n)) nomes.push(n);
    const ir = (a, b) => { location.hash = GT.linkComparar(a, b); };
    const sel = (rot, atual, lado) => h('label', { class: 'cp-sel' }, h('span', null, rot),
      h('select', { 'aria-label': rot, onchange: (e) => { const v = e.target.value || null; if (lado === 'a') ir(v, UI.cmpB); else ir(UI.cmpA, v); } },
        h('option', { value: '', selected: !atual }, 'Escolher jogador'),
        ...nomes.map((n) => h('option', { value: n, selected: n === atual }, n))));
    return h('div', { class: 'cp-seletores' }, sel('Jogador 1', UI.cmpA, 'a'), sel('Jogador 2', UI.cmpB, 'b'));
  }

  function lado(L, cl) {
    const nome = h('a', { class: 'cp-nome', href: '#jogadores/' + encodeURIComponent(L.nick) + '/visao?' + paramsTexto() }, L.nick);
    return h('div', { class: 'cp-id ' + cl }, avatar(L.nick, 40), h('div', { class: 'cp-id-t' }, nome,
      h('small', { class: 'mudo' }, L.tem ? pl(L.partidas, 'partida', 'partidas') + ' no filtro' : 'Sem partidas neste filtro')));
  }

  function barras(R) {
    const linhas = LINHAS.map((l) => {
      const a = R.a[l.k], b = R.b[l.k], max = Math.max(a || 0, b || 0) || 1, g = C.maiorLado(a, b);
      const larg = (v) => `width:${v == null ? 0 : Math.max(2, (v / max) * 100).toFixed(1)}%`;
      const num = (v, forte) => h(forte ? 'b' : 'span', { class: 'cp-n' + (forte ? ' forte' : '') }, v == null ? '—' : l.fmt(v));
      return h('tr', null,
        h('td', { class: 'cp-rot' }, l.rot, l.info && infoIcone(l.info)),
        h('td', { class: 'cp-lado a' }, h('div', { class: 'cp-in' }, num(a, g === 'a'), h('span', { class: 'cp-trilho', 'aria-hidden': 'true' }, h('i', { estilo: larg(a) })))),
        h('td', { class: 'cp-lado b' }, h('div', { class: 'cp-in' }, h('span', { class: 'cp-trilho', 'aria-hidden': 'true' }, h('i', { estilo: larg(b) })), num(b, g === 'b'))));
    });
    const tab = h('table', { class: 'cp-cmp' }, h('thead', null, h('tr', null, h('th', null, 'Número'),
      h('th', { class: 'cp-h a' }, h('i', { class: 'cp-sw', 'aria-hidden': 'true' }), R.a.nick), h('th', { class: 'cp-h b' }, R.b.nick, h('i', { class: 'cp-sw', 'aria-hidden': 'true' })))), h('tbody', null, ...linhas));
    return card({ t: 'Números no filtro', selos: [[janela()]] }, 'Cada barra é proporcional ao maior dos dois valores da linha; o maior valor está em negrito. Totais somados e divididos no fim, não médias de médias.', h('div', { class: 'cp-caixa' }, tab));
  }

  function mapas(R) {
    if (!R.mapas.length) return card('Mapas', null, h('p', { class: 'vazio' }, 'Nenhum dos dois tem partidas neste filtro.'));
    const cel = (x) => [h('td', { class: 'cp-t' }, x.partidas ? String(x.partidas) : '—'),
      h('td', { class: 'cp-t' }, x.wr != null ? pct(x.wr) : x.partidas ? dica(h('span', { class: 'mudo' }, '—'), () => `Menos de ${R.MIN_MAPA} partidas neste mapa.`) : '—')];
    const tab = h('table', { class: 'cp-mapas' }, h('thead', null, h('tr', null, h('th', null, 'Mapa'), h('th', { colspan: 2, class: 'cp-g a' }, R.a.nick), h('th', { colspan: 2, class: 'cp-g b' }, R.b.nick)),
      h('tr', { class: 'cp-sub' }, h('th'), h('th', null, 'Part.'), h('th', null, 'WR'), h('th', null, 'Part.'), h('th', null, 'WR'))),
      h('tbody', null, ...R.mapas.map((m) => h('tr', null, h('td', null, h('span', { class: 'cp-mapa' }, iconeMapa(m.mapa), h('span', null, nomeMapa(m.mapa)))), ...cel(m.a), ...cel(m.b)))));
    return card({ t: 'Mapas', selos: [[janela()]] }, `Mapas em que pelo menos um dos dois jogou. O win rate só aparece com ${R.MIN_MAPA} partidas ou mais no mapa.`, h('div', { class: 'rolar' }, tab));
  }

  function forma(R) {
    const um = (L, cl) => {
      const spark = h('span', { class: 'cp-spark' });
      const temAdr = L.adr10.length >= 3;
      if (temAdr) sparkline(spark, L.adr10, { largura: 120, altura: 34, area: true, ponto: true, cor: cl === 'a' ? 'var(--cp-a)' : 'var(--cp-b)', rotulo: `ADR nas últimas ${L.adr10.length} partidas de ${L.nick}` });
      const qs = L.ult5.map((x) => dica(h('span', { class: 'pj-q ' + x.r.toLowerCase() }, x.r), () => `${dataBR(x.d)} · ${nomeMapa(x.mp)} · ${x.sn} a ${x.se}`));
      return h('div', { class: 'cp-forma-i ' + cl }, h('b', null, L.nick),
        L.tem ? [h('span', { class: 'pj-qs', role: 'img', 'aria-label': 'Últimos resultados: ' + (L.ult5.map((x) => (x.r === 'V' ? 'vitória' : 'derrota')).join(', ') || 'nenhum') }, ...qs),
          h('small', { class: 'mudo' }, temAdr ? `ADR nas últimas ${L.adr10.length}` : 'Poucas partidas para o ADR'), temAdr ? spark : null]
          : h('small', { class: 'mudo' }, 'Sem partidas neste filtro'));
    };
    return card({ t: 'Forma recente', selos: [[janela()]] }, 'Últimos 5 resultados do time de cada um (da mais antiga para a mais recente) e ADR das últimas 10 partidas.', h('div', { class: 'cp-forma' }, um(R.a, 'a'), um(R.b, 'b')));
  }

  GT.paginaComparar = function (el, ctx) {
    const voltar = h('a', { class: 'pj-voltar', href: '#jogadores?' + paramsTexto() }, '← Jogadores');
    el.append(h('h1', { class: 'so-leitor' }, 'Geladeira Tracker: comparar jogadores'));
    el.append(card({ t: 'Comparar jogadores', selos: [[janela()]] }, null, voltar, seletores(ctx)));
    const a = UI.cmpA, b = UI.cmpB;
    if (!a || !b) { el.append(card('Comparação', null, h('p', { class: 'vazio' }, a || b ? 'Escolha o segundo jogador para ver a comparação.' : 'Escolha dois jogadores para comparar.'))); return; }
    if (a === b) { el.append(card('Comparação', null, h('p', { class: 'vazio' }, 'Os dois seletores estão com o mesmo jogador. Escolha dois jogadores diferentes.'))); return; }
    const R = C.compararJogadores(ctx.ms, a, b), j = R.juntos;
    el.append(h('header', { class: 'card cp-cab' }, h('div', { class: 'cp-ids' }, lado(R.a, 'a'), lado(R.b, 'b')),
      h('p', { class: 'cp-juntos' }, j.partidas ? [h('b', null, pl(j.partidas, 'partida', 'partidas')), ' no mesmo time neste filtro' + (j.v + j.d ? ` (${j.v} V · ${j.d} D)` : '')] : 'Nenhuma partida no mesmo time neste filtro.')));
    el.append(barras(R), mapas(R), forma(R));
  };
})();
