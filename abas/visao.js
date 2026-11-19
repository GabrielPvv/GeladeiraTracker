// Aba "Visão geral": cabeçalho, destaques (melhor/pior mês e lines), resumo em anéis, tabela de membros, meses, sequências, linha do tempo.
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pct, n1, n2, dataBR, dataCurta, pl, lista, cls, MESES_LONGOS, mesNome, E, dica, infoIcone, card, grafico, sv, heroGrupo, tabelaOrdenavel, linkMembro, chipsMembros,
    nomeResultado, MIN_LINE, AMOSTRA, coberturaTexto } = GT.u;

  GT.registrarAba({ id: 'visao', titulo: 'Visão geral', ordem: 10 });

  // Linha do tempo: uma coluna por dia jogado, vitórias para cima e derrotas para baixo (mistas e empates em cinza, em cima).
  function linhaTempo(el, ms) {
    const dias = [...new Set(ms.map((m) => m.d))];
    const W = Math.max(el.clientWidth, dias.length * 12 + 40), mL = 16, passo = dias.length > 1 ? (W - 2 * mL) / (dias.length - 1) : 0, g = 11;
    const por = new Map(dias.map((d) => [d, { c: 0, b: 0 }]));
    const pos = ms.map((m) => { const s = por.get(m.d); return m.r === 'D' ? ++s.b : ++s.c; });
    const maxC = Math.max(1, ...[...por.values()].map((s) => s.c)), maxB = Math.max(0, ...[...por.values()].map((s) => s.b));
    const y0 = 12 + maxC * g, H = y0 + maxB * g + 30;
    const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Linha do tempo das partidas da Geladeira: vitórias em cima e derrotas embaixo' });
    svg.append(sv('line', { x1: mL, x2: W - mL, y1: y0 + 3, y2: y0 + 3, class: 'linha-grade' }));
    let mesAnt = '';
    dias.forEach((d, i) => { const k = d.slice(0, 7); if (k !== mesAnt) { mesAnt = k; svg.append(sv('text', { x: mL + i * passo, y: H - 6, 'text-anchor': 'start' }, mesNome(k))); } });
    ms.forEach((m, i) => {
      const cx = mL + dias.indexOf(m.d) * passo, baixo = m.r === 'D';
      const cy = baixo ? y0 + 3 + pos[i] * g - 3 : y0 - (pos[i] - 1) * g - 4;
      const c = sv('circle', { class: 'ponto', cx, cy, r: 4.5, fill: m.r === 'V' ? 'var(--ok)' : baixo ? 'var(--bad)' : 'var(--mudo)' });
      dica(c, () => `${dataBR(m.d)} ${m.h}h · ${m.mp} · ${m.sn} a ${m.se} · ${nomeResultado(m.r)} · ${lista(m.mem.map((x) => x.n))}`);
      svg.append(c);
    });
    el.replaceChildren(svg);
  }

  // Line mais vencedora e mais perdedora: tenta 5 membros e, se não houver partidas suficientes, desce de tamanho (e diz isso).
  // `confiavel`: a de maior tamanho com 8 partidas ou mais, como referência.
  function destaquesLine(ms, membros) {
    const todos = C.combos(ms, membros);
    const ordenar = (ls) => ls.sort((a, b) => b.wr - a.wr || b.partidas - a.partidas);
    const extremos = (ls) => (ls.length ? { melhor: ls[0], pior: ls.length > 1 ? ls[ls.length - 1] : null } : null);
    let principal = null, confiavel = null;
    for (const k of [5, 4, 3, 2]) {
      const ls = ordenar(todos.filter((c) => c.tamanho === k && c.partidas >= MIN_LINE[k]));
      if (!principal && ls.length) principal = { k, min: MIN_LINE[k], ...extremos(ls) };
      const ok = ordenar(todos.filter((c) => c.tamanho === k && c.partidas >= AMOSTRA));
      if (!confiavel && ok.length) confiavel = { k, ...extremos(ok) };
    }
    return { principal, confiavel };
  }

  // Cartão de destaque: rótulo pequeno, valor grande, detalhe pequeno.
  const cartaoDestaque = (rotulo, corpo, tom) => h('div', { class: `dest ${tom || ''}` }, h('span', { class: 'rot' }, rotulo), ...corpo);
  function cartaoMes(rotulo, d, tom) {
    if (!d) return cartaoDestaque(rotulo, [h('div', { class: 'dest-nome' }, '—'), h('small', null, 'nenhum mês com 10 partidas decididas')], tom);
    return cartaoDestaque(rotulo, [h('div', { class: 'dest-nome' }, MESES_LONGOS[Number(d.mes.slice(5, 7)) - 1]), h('div', { class: 'grande ' + cls(d.wr) }, pct(d.wr)), h('small', null, `${d.v}-${d.d} · ${pl(d.comResultado, 'partida', 'partidas')}`)], tom);
  }
  function cartaoLine(rotulo, c, tom, ref) {
    if (!c) return cartaoDestaque(rotulo, [h('div', { class: 'dest-nome' }, '—'), h('small', null, 'sem line com partidas suficientes')], tom);
    return cartaoDestaque(rotulo, [chipsMembros(c.nomes, { link: true }), h('div', { class: 'grande ' + cls(c.wr) }, pct(c.wr)),
      h('small', null, `${c.v}-${c.d} · ${pl(c.partidas, 'partida', 'partidas')} · ${c.tamanho} membros`, c.partidas < AMOSTRA && h('span', { class: 'selo', title: 'Menos de 8 partidas: o resultado varia muito' }, 'amostra pequena')),
      ref && h('div', { class: 'dest-ref' }, h('span', { class: 'rot' }, `${ref.rotulo} (8+ partidas)`), chipsMembros(ref.c.nomes, { link: true }), h('small', null, h('b', { class: cls(ref.c.wr) }, pct(ref.c.wr)), ` · ${ref.c.v}-${ref.c.d} · ${pl(ref.c.partidas, 'partida', 'partidas')} · ${ref.c.tamanho} membros`))], tom);
  }

  GT.registrarBloco({ aba: 'visao', id: 'cabecalho', ordem: 10, render(el, ctx) {
    const A = ctx.cache('grupo', () => C.grupo(ctx.ms));
    const per = { ano: E.ano, '6m': `últimos 6 meses de ${E.ano}`, '30d': `últimos 30 dias de ${E.ano}`, n: E.n === 1 ? `última partida de ${E.ano}` : `últimas ${E.n} partidas de ${E.ano}` }[E.per];
    const subtitulo = h('p', { class: 'subtitulo' }, [per, E.mapa].filter(Boolean).join(' · '), ' · ', h('b', null, A.partidas), A.partidas === 1 ? ' partida junta · ' : ' partidas juntas · ', h('b', null, pct(A.wr)), ' de vitórias',
      A.mistas ? [' · ', h('b', null, A.mistas), ' fora do win rate'] : '', ' ',
      infoIcone('Partida da Geladeira: 2 ou mais membros no mesmo time. Partidas com membros nos dois times ficam fora do win rate. Mês: mínimo de 10 partidas decididas. Line de 5 membros: mínimo de 3 partidas (se não houver, desce de tamanho); abaixo de 8 partidas é amostra pequena.'));
    el.append(h('header', { class: 'cabeca' }, h('h1', null, 'Geladeira Tracker'), subtitulo));
  } });

  GT.registrarBloco({ aba: 'visao', id: 'destaques', ordem: 20, render(el, ctx) {
    const meses = ctx.cache('meses', () => C.meses(ctx.ms));
    const grande = meses.filter((m) => m.comResultado >= 10).sort((x, y) => y.wr - x.wr);
    const dl = destaquesLine(ctx.ms, ctx.membros), P = dl.principal, Cf = dl.confiavel;
    const refDe = (rotulo, atual, ref) => (ref && (!atual || ref.combinacao !== atual.combinacao) ? { rotulo, c: ref } : null);
    el.append(h('section', { class: 'destaques', 'aria-label': 'Destaques' },
      cartaoMes('Melhor mês', grande.length > 1 ? grande[0] : null, 'bom'),
      cartaoMes('Pior mês', grande.length > 1 ? grande[grande.length - 1] : null, 'alerta'),
      cartaoLine(P ? (P.k === 5 ? 'Line mais vencedora' : `Line mais vencedora (${P.k} membros)`) : 'Line mais vencedora', P && P.melhor, 'bom', Cf && refDe('Mais vencedora', P && P.melhor, Cf.melhor)),
      cartaoLine(P ? (P.k === 5 ? 'Line mais perdedora' : `Line mais perdedora (${P.k} membros)`) : 'Line mais perdedora', P && P.pior, 'alerta', Cf && refDe('Mais perdedora', P && P.pior, Cf.pior))));
  } });

  GT.registrarBloco({ aba: 'visao', id: 'resumo', ordem: 30, render(el, ctx) { el.append(heroGrupo(ctx.cache('grupo', () => C.grupo(ctx.ms)), 'K/D do grupo')); } });

  GT.registrarBloco({ aba: 'visao', id: 'membros', ordem: 40, render(el, ctx) {
    const mb = C.membros(ctx.ms, ctx.membros);
    const cols = [
      { k: 'jogador', t: 'Membro', v: (r) => r.jogador.toLowerCase(), f: (r) => h('a', { href: linkMembro(r.jogador) }, r.jogador), cls: '' },
      { k: 'partidas', t: 'Partidas', v: (r) => r.partidas, f: (r) => r.partidas },
      { k: 'wr', t: 'Win rate', v: (r) => r.wr, f: (r) => pct(r.wr), wr: (r) => r.wr },
      { k: 'kd', t: 'K/D', v: (r) => r.kd, f: (r) => n2(r.kd) }, { k: 'adr', t: 'ADR', v: (r) => r.adr, f: (r) => n1(r.adr) },
      { k: 'hs', t: 'HS%', v: (r) => r.hsPct, f: (r) => pct(r.hsPct) }, { k: 'kast', t: 'KAST', v: (r) => r.kastPct, f: (r) => pct(r.kastPct) },
      { k: 'rating', t: 'Pontos GC', info: 'Pontos de ranking da GC na época das partidas (média das partidas do filtro). Não é o rating de desempenho.', v: (r) => r.rating, f: (r) => (r.rating ? r.rating : '—') }];
    el.append(card('Membros', 'Números de cada membro em todas as partidas da Geladeira do filtro (inclusive as com membros nos dois times). Clique no título da coluna para ordenar e no nome para ver a página do membro. Pontos GC são os pontos de ranking da GC na época das partidas (média), não o rating de desempenho.',
      mb.length ? tabelaOrdenavel(cols, mb) : h('p', { class: 'vazio' }, 'Sem membros nesse filtro.')));
  } });

  GT.registrarBloco({ aba: 'visao', id: 'meses', ordem: 50, render(el, ctx) {
    const ms = ctx.cache('meses', () => C.meses(ctx.ms));
    el.append(card('Meses', 'Ponto verde: win rate de 50% ou mais no mês. Vermelho: abaixo de 50%.',
      h('div', { class: 'faixa', role: 'img', 'aria-label': 'Resultado de cada mês' }, ...ms.map((d) => dica(h('div', { class: 'mes' + (d.wr >= 0.5 ? '' : ' perde') }, h('span', null, mesNome(d.mes)), h('i'), h('b', null, pct(d.wr)), h('span', null, pl(d.partidas, 'jogo', 'jogos'))), () => `${mesNome(d.mes)}: ${d.v}V ${d.d}D · K/D ${n2(d.kd)} · ADR ${n1(d.adr)}`)))));
  } });

  GT.registrarBloco({ aba: 'visao', id: 'sequencias', ordem: 60, render(el, ctx) {
    const sq = C.sequencias(ctx.ms);
    const seq = (titulo, s, tipo) => h('div', { class: 'seq' }, h('span', { class: 'rot' }, titulo), h('b', { class: tipo === 'V' ? 'ok' : 'bad' }, s.n || 0), h('small', null, s.n ? (s.de === s.ate ? dataBR(s.de) : `${dataCurta(s.de)} a ${dataCurta(s.ate)}`) : 'nenhuma'));
    const atual = sq.atual.n ? h('div', { class: 'seq' }, h('span', { class: 'rot' }, 'Sequência atual'), h('b', { class: sq.atual.tipo === 'V' ? 'ok' : 'bad' }, `${sq.atual.n} ${sq.atual.tipo === 'V' ? (sq.atual.n === 1 ? 'vitória' : 'vitórias') : (sq.atual.n === 1 ? 'derrota' : 'derrotas')}`), h('small', null, `até ${dataBR(sq.atual.ate)}`))
      : h('div', { class: 'seq' }, h('span', { class: 'rot' }, 'Sequência atual'), h('b', null, '—'), h('small', null, 'a última partida foi empate'));
    el.append(card('Sequências de vitórias e derrotas', 'Do time da Geladeira, em ordem de data; empate quebra a sequência e partidas com membros nos dois times não entram.',
      h('div', { class: 'seqs' }, seq('Maior sequência de vitórias', sq.melhor, 'V'), seq('Maior sequência de derrotas', sq.pior, 'D'), atual)));
  } });

  GT.registrarBloco({ aba: 'visao', id: 'linha-tempo', ordem: 70, render(el, ctx) {
    el.append(card('Linha do tempo das partidas', 'Cada ponto é uma partida da Geladeira: verde em cima é vitória, vermelho embaixo é derrota (cinza: empate ou membros nos dois times). Passe o dedo ou o mouse para ver o placar e quem jogou.',
      grafico((g) => linhaTempo(g, ctx.ms), 'grafico rolar'), h('div', { class: 'legenda' }, h('span', null, h('i', { estilo: 'background:var(--ok)' }), 'vitória'), h('span', null, h('i', { estilo: 'background:var(--bad)' }), 'derrota'))));
  } });

  GT.registrarBloco({ aba: 'visao', id: 'origem', ordem: 80, render(el, ctx) {
    const I = ctx.info, cob = ctx.G.cobertura || { arquivosDe: [], outros: [] };
    const fora = Math.max(0, I.totalBase - I.geladeira), mistas = I.mistas || 0, juntas = I.geladeira - mistas;
    const num = (cor, valor, texto) => h('div', { class: 'or-num', estilo: `--k:${cor}` }, h('b', null, valor), h('small', null, texto));
    const fatia = (n, cor, rot) => (n > 0 ? dica(h('i', { estilo: `width:${(n / I.totalBase) * 100}%;background:${cor}` }), () => `${rot}: ${pl(n, 'partida', 'partidas')}`) : null);
    const regra = (cor, ico, forte, texto) => h('li', null, h('span', { class: 'or-ico', estilo: `--k:${cor}`, 'aria-hidden': 'true' }, ico), h('span', null, h('b', null, forte), ' ', texto));
    const membros = (nicks) => h('div', { class: 'chips-m' }, ...nicks.map((n) => GT.u.chipMembro(n, { link: true, avatar: true })));
    el.append(card('De onde vêm os números', null,
      h('div', { class: 'or-nums' },
        num('var(--c1)', I.totalBase, `partidas na base de ${E.ano}`),
        num('var(--c6)', I.geladeira, 'da Geladeira (2+ membros no mesmo time)'),
        mistas ? num('var(--c4)', mistas, 'com membros nos dois times') : null,
        num('var(--c2)', fora, 'sem a Geladeira (não entram)')),
      h('div', { class: 'or-proporcao', role: 'img', 'aria-label': `${I.geladeira} de ${I.totalBase} partidas são da Geladeira` },
        fatia(juntas, 'var(--c6)', 'Geladeira'), fatia(mistas, 'var(--c4)', 'Membros nos dois times'), fatia(fora, 'var(--grade)', 'Sem a Geladeira')),
      h('div', { class: 'or-cob' },
        h('div', { class: 'or-grupo cheio' }, h('h3', null, '● Dados completos'), h('p', null, 'Mandaram os arquivos: todas as partidas deles entram.'), membros(cob.arquivosDe)),
        cob.outros.length ? h('div', { class: 'or-grupo parcial' }, h('h3', null, '◐ Dados parciais'), h('p', null, 'Só aparecem nas partidas jogadas com quem mandou arquivo.'), membros(cob.outros)) : null),
      h('ul', { class: 'or-regras' },
        regra('var(--c1)', 'Σ', 'Números do grupo somam os membros em campo', 'e dividem no fim (K/D, ADR, HS% e KAST); taxa nunca é média de médias.'),
        regra('var(--c4)', '⇄', 'Membros nos dois times', 'são partidas da Geladeira, mas ficam fora do win rate do grupo.'),
        regra('var(--c3)', '⊘', 'Jogadores da lista de excluídos', 'tiram a partida inteira de todos os números.'))));
  } });
})();
