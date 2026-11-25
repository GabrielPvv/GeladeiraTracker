// Aba "Time" (U7): junta Evolução (esta tela) e Lines (lines.js) em duas subabas do mesmo item do menu.
// Evolução: resumo de 7 números do grupo, win rate mês a mês e maiores sequências; K/D e ADR por mês, acumulados e a tabela do mês ficam recolhidos.
// Links antigos: #meses abre esta tela (apelido); #lines continua sendo a subaba Lines (aba oculta com pai "time").
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pct, n1, n2, dataBR, dataCurta, pl, mesNome, card, grafico, barrasWr, linhas, rotulosMeses, tabela, cWr, paramsTexto, cls, descFiltro } = GT.u;

  GT.registrarAba({ id: 'time', titulo: 'Time', ordem: 30, apelidos: ['meses', 'evolucao'] });

  // Subabas Evolução e Lines (a mesma barra nas duas telas).
  GT.u.subabasTime = (ativa) => {
    const item = (id, t) => h('a', { class: 'pl-sub' + (ativa === id ? ' ativo' : ''), href: '#' + id + '?' + paramsTexto(), 'aria-current': ativa === id ? 'page' : null }, t);
    return h('nav', { class: 'pl-subabas', 'aria-label': 'Time' }, item('time', 'Evolução'), item('lines', 'Lines'));
  };

  GT.registrarBloco({ aba: 'time', id: 'subabas', ordem: 1, render(el) { el.append(h('h1', { class: 'so-leitor' }, 'Geladeira Tracker: time'), GT.u.subabasTime('time')); } });

  // Resumo do grupo numa linha só, sem anéis.
  GT.registrarBloco({ aba: 'time', id: 'resumo', ordem: 5, render(el, ctx) {
    const A = ctx.cache('grupo', () => C.grupo(ctx.ms));
    const it = (rot, valor, c) => h('div', { class: 'tm-num' }, h('span', { class: 'rot' }, rot), h('b', { class: c || '' }, valor));
    el.append(h('section', { class: 'card tm-resumo', 'aria-label': 'Resumo do grupo' },
      h('div', { class: 'tm-nums' },
        it('Partidas', A.partidas), it('V - D', `${A.v} - ${A.d}`), it('Win rate', pct(A.wr), cls(A.wr)),
        it('K/D', n2(A.kd)), it('ADR', n1(A.adr)), it('HS%', pct(A.hsPct)), it('KAST', pct(A.kastPct))),
      h('small', { class: 'mudo' }, `${descFiltro()}. K/D, ADR, HS% e KAST somam os membros em campo.`)));
  } });

  GT.registrarBloco({ aba: 'time', id: 'win-rate', ordem: 10, render(el, ctx) {
    const ms = ctx.cache('meses', () => C.meses(ctx.ms));
    el.append(card('Win rate mês a mês', 'Win rate da Geladeira. A linha tracejada marca 50%. O número embaixo de cada mês é a quantidade de partidas.', grafico((g) => barrasWr(g, ms))));
  } });

  GT.registrarBloco({ aba: 'time', id: 'sequencias', ordem: 20, render(el, ctx) {
    const sq = C.sequencias(ctx.ms);
    const plural = (n, tipo) => (tipo === 'V' ? (n === 1 ? 'vitória' : 'vitórias') : (n === 1 ? 'derrota' : 'derrotas'));
    const seq = (titulo, s, tipo) => h('div', { class: 'seq' }, h('span', { class: 'rot' }, titulo), h('b', { class: tipo === 'V' ? 'ok' : 'bad' }, s.n || 0), h('small', null, s.n ? (s.de === s.ate ? dataBR(s.de) : `${dataCurta(s.de)} a ${dataCurta(s.ate)}`) : 'nenhuma'));
    const atual = sq.atual.n ? h('div', { class: 'seq' }, h('span', { class: 'rot' }, 'Sequência atual'), h('b', { class: sq.atual.tipo === 'V' ? 'ok' : 'bad' }, `${sq.atual.n} ${plural(sq.atual.n, sq.atual.tipo)}`), h('small', null, `até ${dataBR(sq.atual.ate)}`))
      : h('div', { class: 'seq' }, h('span', { class: 'rot' }, 'Sequência atual'), h('b', null, '—'), h('small', null, 'a última partida foi empate'));
    el.append(card('Sequências de vitórias e derrotas', 'Do time da Geladeira, em ordem de data; empate quebra a sequência e partidas com membros nos dois times não entram.',
      h('div', { class: 'seqs' }, seq('Maior sequência de vitórias', sq.melhor, 'V'), seq('Maior sequência de derrotas', sq.pior, 'D'), atual)));
  } });

  // Seção recolhida: o conteúdo só é montado quando abre (aí os gráficos já medem a largura).
  function recolhida(titulo, resumo, montar) {
    const corpo = h('div', { class: 'tm-rec-corpo' });
    let feito = false;
    const d = h('details', { class: 'tm-rec' }, h('summary', null, h('span', { class: 'tm-rec-t' }, titulo), h('small', { class: 'mudo' }, resumo)), corpo);
    d.addEventListener('toggle', () => { if (d.open && !feito) { feito = true; corpo.append(montar()); } });
    return d;
  }

  GT.registrarBloco({ aba: 'time', id: 'kd-adr', ordem: 30, render(el, ctx) {
    el.append(recolhida('K/D e ADR mês a mês', 'dois gráficos', () => {
      const ms = ctx.cache('meses', () => C.meses(ctx.ms));
      const serieMes = (campo, fmt) => [{ cor: 'var(--acento)', pontos: true, pts: ms.map((d, i) => ({ x: i, y: d[campo], tip: `${mesNome(d.mes)}: ${fmt(d[campo])} (${pl(d.partidas, 'partida', 'partidas')})` })) }];
      const xm = ms.map((d, i) => ({ x: i, t: mesNome(d.mes) }));
      const g1 = h('div', { class: 'grafico' }), g2 = h('div', { class: 'grafico' });
      setTimeout(() => {
        linhas(g1, { nome: 'K/D do grupo por mês', fmt: n2, ref: 1, xlabels: xm, series: serieMes('kd', n2) });
        linhas(g2, { nome: 'ADR do grupo por mês', fmt: (v) => GT.u.num(v, 0), xlabels: xm, series: serieMes('adr', n1) });
      }, 0);
      return h('div', { class: 'grade2' }, card('K/D do grupo mês a mês', null, g1), card('ADR do grupo mês a mês', null, g2));
    }));
  } });

  GT.registrarBloco({ aba: 'time', id: 'acumulados', ordem: 40, render(el, ctx) {
    el.append(recolhida('K/D e ADR acumulados', 'com média móvel de 10 partidas', () => {
      const ac = C.acumulado(ctx.ms, 10), lab = rotulosMeses(ctx.ms);
      const tipAc = (p, campo, mov, fmt) => `${dataBR(p.d)} (partida ${p.i + 1}): acumulado ${fmt(p[campo])} · últimas 10 ${fmt(p[mov])}`;
      const lg = () => h('div', { class: 'legenda' }, h('span', null, h('i', { estilo: 'background:var(--acento)' }), 'acumulado do período'), h('span', null, h('i', { estilo: 'background:var(--aviso)' }), 'média móvel de 10 partidas'));
      const gk = h('div', { class: 'grafico' }), ga = h('div', { class: 'grafico' });
      const desenhar = (g, campo, mov, fmt, nome) => linhas(g, { nome, fmt, xlabels: lab,
        series: [{ cor: 'var(--acento)', pts: ac.map((p) => ({ x: p.i, y: p[campo], tip: tipAc(p, campo, mov, fmt) })) }, { cor: 'var(--aviso)', w: 1.8, pts: ac.filter((p) => p.cheia).map((p) => ({ x: p.i, y: p[mov], tip: tipAc(p, campo, mov, fmt) })) }] });
      setTimeout(() => { desenhar(gk, 'kd', 'kdMov', n2, 'K/D acumulado do grupo'); desenhar(ga, 'adr', 'adrMov', n1, 'ADR acumulado do grupo'); }, 0);
      return h('div', { class: 'grade2' },
        card('K/D do grupo acumulado', 'Soma de abates dos membros dividida pela soma de mortes até cada partida; a linha amarela usa só as 10 últimas.', gk, lg()),
        card('ADR do grupo acumulado', 'Soma do dano dividida pela soma das rodadas até cada partida; a linha amarela usa só as 10 últimas.', ga, lg()));
    }));
  } });

  GT.registrarBloco({ aba: 'time', id: 'tabela', ordem: 50, render(el, ctx) {
    el.append(recolhida('Todos os números do mês', 'tabela', () => {
      const ms = ctx.cache('meses', () => C.meses(ctx.ms)), temMista = ms.some((m) => m.mistas);
      return card(null, 'KAST: rodadas com abate, assistência, sobrevivência ou troca. "1º abate/rod." é quantos primeiros abates por rodada. K/D, ADR, HS% e KAST somam os membros em campo.',
        tabela([{ t: 'Mês', f: (r) => mesNome(r.mes) }, { t: 'Partidas', f: (r) => r.partidas }, { t: 'V', f: (r) => r.v }, { t: 'D', f: (r) => r.d }, temMista && { t: 'Mistas', f: (r) => r.mistas }, cWr, { t: 'K/D', f: (r) => n2(r.kd) }, { t: 'ADR', f: (r) => n1(r.adr) }, { t: 'HS%', f: (r) => pct(r.hsPct) }, { t: 'KAST', f: (r) => pct(r.kastPct) }, { t: '1º abate/rod.', f: (r) => GT.u.num(r.fkRod, 3) }].filter(Boolean), ms));
    }));
  } });
})();
