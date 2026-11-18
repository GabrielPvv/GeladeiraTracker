// Aba "Adversários": win rate da Geladeira por nível do time adversário, diferença de nível e previsão da GC; adversários que mais se repetem.
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pct, pl, E, card, ranking, tabela, cWr, vazioFiltro } = GT.u;

  GT.registrarAba({ id: 'adversarios', titulo: 'Adversários', ordem: 50 });

  GT.registrarBloco({ aba: 'adversarios', id: 'niveis', ordem: 10, render(el, ctx) {
    const nv = C.niveis(ctx.ms), ok = nv.filter((d) => d.partidas >= 10).sort((a, b) => b.wr - a.wr || b.partidas - a.partidas);
    const barras = (grupo) => ranking(nv.filter((d) => d.grupo === grupo).map((d) => ({ ...d, rotulo: d.faixa })), 'wr', 1, (d) => (d.partidas ? `${pct(d.wr)} · ${pl(d.partidas, 'jogo', 'jogos')}` : '0 jogos'), (d) => `${d.faixa}: ${d.v}V ${d.d}D em ${pl(d.partidas, 'partida', 'partidas')} (${pct(d.wr)})`, 'rank50');
    const G1 = 'Nível médio do time adversário', G2 = 'Diferença de nível (time da Geladeira menos o adversário)', G3 = 'Previsão da GC para o time da Geladeira';
    el.append(card('Adversários da Geladeira', null, h('p', { class: 'nota' }, 'Só partidas sem membros nos dois times; empates ficam fora do win rate. ', ok.length ? ['A faixa com melhor resultado (10 partidas ou mais) foi ', h('b', null, `${ok[0].faixa} (${pct(ok[0].wr)} em ${ok[0].partidas} partidas)`), ', e a pior foi ', h('b', null, `${ok[ok.length - 1].faixa} (${pct(ok[ok.length - 1].wr)} em ${ok[ok.length - 1].partidas} partidas)`), '. '] : 'Nenhuma faixa tem 10 partidas neste filtro. ', 'A linha vertical em cada barra marca 50%, e o número de partidas está ao lado: faixas com poucas partidas variam muito. Respeita os filtros.'),
      C.semMistas(ctx.ms).length ? [
        h('div', { class: 'grade2' }, h('div', { class: 'sub' }, h('strong', null, 'Por nível do time adversário'), barras(G1)), h('div', { class: 'sub' }, h('strong', null, 'Por diferença de nível (Geladeira menos adversário)'), barras(G2))),
        h('div', { class: 'sub' }, h('strong', null, 'Quando a GC dava a Geladeira como azarão / favorita'), barras(G3), h('p', { class: 'nota' }, 'Previsão de vitória que a GC mostrava para o time da Geladeira antes da partida: azarão abaixo de 45%, favorita acima de 55%.'))] : vazioFiltro()));
  } });

  GT.registrarBloco({ aba: 'adversarios', id: 'frequentes', ordem: 20, render(el, ctx) {
    const adv = ctx.D.adversarios, vence = adv.filter((a) => a.wr > 0.5).sort((a, b) => b.wr - a.wr || b.partidas - a.partidas).slice(0, 8), perde = adv.filter((a) => a.wr < 0.5).sort((a, b) => a.wr - b.wr || b.partidas - a.partidas).slice(0, 8);
    const colsAdv = [{ t: 'Jogador', f: (r) => r.jogador, cls: 'quebra' }, { t: 'Nível', f: (r) => r.nivel }, { t: 'Part.', f: (r) => r.partidas }, { t: 'V', f: (r) => r.v }, { t: 'D', f: (r) => r.d }, cWr];
    const dest = (r) => r.jogador === E.destaqueAdv;
    el.append(card('Adversários que mais se repetem', `Só adversários que apareceram 3 vezes ou mais contra a Geladeira em ${E.ano}, em ordem de win rate e depois de partidas. Esta lista é do ano todo e não muda com os filtros. Poucos se repetem: lobbies são aleatórios.`,
      h('div', { class: 'grade2' }, h('div', null, h('h3', { class: 'nota' }, 'MAIS VENCEMOS'), tabela(colsAdv, vence, { destaque: dest })), h('div', null, h('h3', { class: 'nota' }, 'MAIS PERDEMOS'), tabela(colsAdv, perde, { destaque: dest })))));
  } });
})();
