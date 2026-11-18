// Aba "Meses": win rate, K/D e ADR mês a mês, K/D e ADR acumulados (com média móvel de 10 partidas) e a tabela de números do mês.
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pct, n1, n2, dataBR, pl, mesNome, card, grafico, barrasWr, linhas, rotulosMeses, tabela, cWr } = GT.u;

  GT.registrarAba({ id: 'meses', titulo: 'Meses', ordem: 20 });

  GT.registrarBloco({ aba: 'meses', id: 'win-rate', ordem: 10, render(el, ctx) {
    const ms = ctx.cache('meses', () => C.meses(ctx.ms));
    el.append(card('Win rate mês a mês', 'Win rate da Geladeira. A linha tracejada marca 50%. O número embaixo de cada mês é a quantidade de partidas.', grafico((g) => barrasWr(g, ms))));
  } });

  GT.registrarBloco({ aba: 'meses', id: 'kd-adr', ordem: 20, render(el, ctx) {
    const ms = ctx.cache('meses', () => C.meses(ctx.ms));
    const serieMes = (campo, fmt) => [{ cor: 'var(--acento)', pontos: true, pts: ms.map((d, i) => ({ x: i, y: d[campo], tip: `${mesNome(d.mes)}: ${fmt(d[campo])} (${pl(d.partidas, 'partida', 'partidas')})` })) }];
    const xm = ms.map((d, i) => ({ x: i, t: mesNome(d.mes) }));
    el.append(h('div', { class: 'grade2' },
      card('K/D do grupo mês a mês', null, grafico((g) => linhas(g, { nome: 'K/D do grupo por mês', fmt: n2, ref: 1, xlabels: xm, series: serieMes('kd', n2) }))),
      card('ADR do grupo mês a mês', null, grafico((g) => linhas(g, { nome: 'ADR do grupo por mês', fmt: (v) => Number(v).toFixed(0), xlabels: xm, series: serieMes('adr', n1) })))));
  } });

  GT.registrarBloco({ aba: 'meses', id: 'acumulados', ordem: 30, render(el, ctx) {
    const ac = C.acumulado(ctx.ms, 10), lab = rotulosMeses(ctx.ms);
    const tipAc = (p, campo, mov, fmt) => `${dataBR(p.d)} (partida ${p.i + 1}): acumulado ${fmt(p[campo])} · últimas 10 ${fmt(p[mov])}`;
    const acum = (campo, mov, fmt, nome) => grafico((g) => linhas(g, { nome, fmt, xlabels: lab,
      series: [{ cor: 'var(--acento)', pts: ac.map((p) => ({ x: p.i, y: p[campo], tip: tipAc(p, campo, mov, fmt) })) }, { cor: 'var(--aviso)', w: 1.8, pts: ac.filter((p) => p.cheia).map((p) => ({ x: p.i, y: p[mov], tip: tipAc(p, campo, mov, fmt) })) }] }));
    const lg = () => h('div', { class: 'legenda' }, h('span', null, h('i', { estilo: 'background:var(--acento)' }), 'acumulado do período'), h('span', null, h('i', { estilo: 'background:var(--aviso)' }), 'média móvel de 10 partidas'));
    el.append(h('div', { class: 'grade2' },
      card('K/D do grupo acumulado', 'Soma de abates dos membros dividida pela soma de mortes até cada partida; a linha amarela usa só as 10 últimas.', acum('kd', 'kdMov', n2, 'K/D acumulado do grupo'), lg()),
      card('ADR do grupo acumulado', 'Soma do dano dividida pela soma das rodadas até cada partida; a linha amarela usa só as 10 últimas.', acum('adr', 'adrMov', n1, 'ADR acumulado do grupo'), lg())));
  } });

  GT.registrarBloco({ aba: 'meses', id: 'tabela', ordem: 40, render(el, ctx) {
    const ms = ctx.cache('meses', () => C.meses(ctx.ms)), temMista = ms.some((m) => m.mistas);
    el.append(card('Todos os números do mês', 'KAST é a parte das rodadas em que o jogador matou, deu assistência, sobreviveu ou foi trocado. "1º abate/rod." é quantos primeiros abates por rodada. K/D, ADR, HS% e KAST somam os membros em campo.',
      tabela([{ t: 'Mês', f: (r) => mesNome(r.mes) }, { t: 'Partidas', f: (r) => r.partidas }, { t: 'V', f: (r) => r.v }, { t: 'D', f: (r) => r.d }, temMista && { t: 'Mistas', f: (r) => r.mistas }, cWr, { t: 'K/D', f: (r) => n2(r.kd) }, { t: 'ADR', f: (r) => n1(r.adr) }, { t: 'HS%', f: (r) => pct(r.hsPct) }, { t: 'KAST', f: (r) => pct(r.kastPct) }, { t: '1º abate/rod.', f: (r) => Number(r.fkRod).toFixed(3) }].filter(Boolean), ms)));
  } });
})();
