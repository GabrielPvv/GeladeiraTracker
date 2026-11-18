// Visão geral: placar do grupo (vitórias x derrotas com mini gráfico) e destaque da semana. Blocos da aba "visao".
(function () {
  'use strict';
  const GT = window.GT;
  const { h, pct, n1, n2, pl, dataCurta, dataBR, card, grafico, avatar, rotuloMembro, linkMembro, somarDias, E, dica } = GT.u;

  // ---------- placar ----------
  const JANELA = 10, PONTOS = 30;
  // Win rate móvel (janela de 10 partidas decididas) nas últimas 30 partidas decididas do grupo.
  function wrMovel(ms) {
    const dec = ms.filter((m) => m.r === 'V' || m.r === 'D');
    const out = [];
    dec.forEach((m, i) => {
      const jan = dec.slice(Math.max(0, i - JANELA + 1), i + 1);
      if (jan.length >= 5) out.push({ d: m.d, wr: jan.filter((x) => x.r === 'V').length / jan.length });
    });
    return out.slice(-PONTOS);
  }

  GT.registrarBloco({ aba: 'visao', id: 'placar', ordem: 15, render(el, ctx) {
    const A = ctx.cache('grupo', () => ctx.C.grupo(ctx.ms));
    const pts = wrMovel(ctx.ms);
    const graf = grafico((g) => {
      if (pts.length < 2) { g.replaceChildren(h('small', { class: 'mudo' }, 'Poucas partidas para o gráfico')); return; }
      GT.u.sparkline(g, pts.map((p) => p.wr), { altura: 64, area: true, ponto: true, rotulo: 'Win rate móvel das últimas partidas do grupo' });
    }, 'placar-graf');
    if (pts.length >= 2) dica(graf, () => `Win rate móvel (10 partidas): de ${pct(pts[0].wr)} em ${dataCurta(pts[0].d)} a ${pct(pts[pts.length - 1].wr)} em ${dataCurta(pts[pts.length - 1].d)}`);
    el.append(h('section', { class: 'card placar', 'aria-label': 'Placar do grupo' },
      h('div', { class: 'placar-num' },
        h('span', { class: 'rot' }, 'Placar do grupo'),
        h('div', { class: 'placar-valor', role: 'img', 'aria-label': `${pl(A.v, 'vitória', 'vitórias')} e ${pl(A.d, 'derrota', 'derrotas')}` },
          h('b', { class: 'ok' }, A.v), h('span', { class: 'placar-x', 'aria-hidden': 'true' }, '×'), h('b', { class: 'bad' }, A.d)),
        h('small', { class: 'mudo' }, 'vitórias × derrotas', A.e ? ` (e ${pl(A.e, 'empate', 'empates')})` : '', ' · ', pct(A.wr))),
      h('div', { class: 'placar-lado' }, h('span', { class: 'rot' }, pts.length >= 2 ? `Win rate móvel, últimas ${pts.length} partidas` : 'Win rate móvel'), graf,
        pts.length >= 2 && h('small', { class: 'mudo' }, 'média de 10 em 10 partidas; vai de ', h('b', null, pct(pts[0].wr)), ' a ', h('b', null, pct(pts[pts.length - 1].wr))))));
  } });

  // ---------- destaque da semana ----------
  // Semana = os 7 dias até a partida mais recente do conjunto (filtro de mapa, sem o de período).
  function destaqueSemana(partidas) {
    if (!partidas.length) return null;
    const fim = partidas[partidas.length - 1].d, ini = somarDias(fim, -6);
    const sem = partidas.filter((m) => m.d >= ini && m.d <= fim);
    const por = new Map();
    for (const m of sem) for (const x of m.mem) {
      if (!x.rod) continue; // sem rodadas jogadas, não conta
      if (!por.has(x.n)) por.set(x.n, { nick: x.n, partidas: 0, k: 0, m: 0, dano: 0, rod: 0, seq: 0, melhorSeq: 0 });
      const p = por.get(x.n);
      p.partidas++; p.k += x.k; p.m += x.m; p.dano += x.dano; p.rod += x.rod;
      if (x.r === 'V') { p.seq++; p.melhorSeq = Math.max(p.melhorSeq, p.seq); } else p.seq = 0;
    }
    const js = [...por.values()].map((p) => ({ ...p, adr: p.dano / p.rod, kd: p.k / Math.max(1, p.m) }));
    const melhor = (lista, chave) => lista.sort((a, b) => b[chave] - a[chave] || b.partidas - a.partidas || a.nick.localeCompare(b.nick))[0] || null;
    const adr = melhor(js.filter((p) => p.partidas >= 2), 'adr');
    const kd = melhor(js.filter((p) => p.partidas >= 3), 'kd');
    const seq = melhor(js.filter((p) => p.melhorSeq >= 2), 'melhorSeq');
    return { ini, fim, partidas: sem.length, adr, kd, seq };
  }

  const premio = (icone, titulo, p, valor, detalhe) => h('div', { class: 'premio' },
    h('span', { class: 'premio-ico', 'aria-hidden': 'true' }, icone),
    h('div', { class: 'premio-corpo' }, h('span', { class: 'rot' }, titulo),
      h('a', { class: 'premio-quem', href: linkMembro(p.nick) }, avatar(p.nick, 28), h('span', null, rotuloMembro(p.nick))),
      h('div', { class: 'premio-valor' }, valor), h('small', { class: 'mudo' }, detalhe)));

  GT.registrarBloco({ aba: 'visao', id: 'semana', ordem: 17, render(el, ctx) {
    const S = destaqueSemana(ctx.D.partidas.filter((m) => !E.mapa || m.mp === E.mapa));
    const quando = S ? `${dataCurta(S.ini)} a ${dataBR(S.fim)}` : '';
    const nota = S ? `Os 7 dias até a partida mais recente (${quando}), ${pl(S.partidas, 'partida', 'partidas')}${E.mapa ? ` em ${E.mapa}` : ''}. Segue o mapa escolhido e ignora o período.` : null;
    const prem = S ? [
      S.adr && premio('🎯', 'Maior ADR', S.adr, n1(S.adr.adr), `dano por rodada em ${pl(S.adr.partidas, 'partida', 'partidas')}`),
      S.kd && premio('⚔️', 'Melhor K/D', S.kd, n2(S.kd.kd), `${S.kd.k} abates e ${S.kd.m} mortes em ${pl(S.kd.partidas, 'partida', 'partidas')}`),
      S.seq && premio('🔥', 'Maior sequência de vitórias', S.seq, pl(S.seq.melhorSeq, 'vitória seguida', 'vitórias seguidas'), 'jogando, na semana')].filter(Boolean) : [];
    el.append(card('Destaque da semana', nota,
      prem.length ? h('div', { class: 'premios' }, ...prem) : h('p', { class: 'vazio' }, S ? 'A semana teve poucas partidas para escolher destaques (mínimo de 3 partidas por jogador no K/D). Volte depois de mais uns jogos.' : 'Sem partidas para escolher destaques.')));
  } });
})();
