// Aba "Início": partidas recentes (lista de resultados), placar do grupo e destaque da semana (visao-topo.js), resumo de jogadores e de mapas.
// Substitui as abas Home e Visão geral (rotas #home e #visao viram apelidos). O que saiu daqui: veja o cabeçalho de visao.js, home.js e estilo.js.
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pct, n1, n2, dataBR, dataCurta, card, avatar, linkMembro, paramsTexto, dica, sparkline, cWr, tabela, nomeMapa, vazioFiltro } = GT.u;

  GT.registrarAba({ id: 'inicio', titulo: 'Início', ordem: 5, apelidos: ['home', 'visao'] });

  // Links montados num lugar só, para a U3 (partidas/demos) e a U5 (mapas) trocarem o destino.
  const linkPartida = (id) => '#demos/' + id + '?' + paramsTexto();   // análise completa: aba Demos (U3a)
  const linkTodasPartidas = () => '#partidas?' + paramsTexto();
  const linkTodosJogadores = () => '#jogadores?' + paramsTexto();
  const linkMapa = (m) => '#mapas/' + m + '?' + paramsTexto();
  const linkTodosMapas = () => '#mapas?' + paramsTexto();

  // A partida da lista tem só a hora cheia do início; a das demos tem hora e minuto do fim. Casa por mapa, placar e até 3 h de diferença.
  const minutos = (d, hh, mm) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10), hh, mm) / 6e4;
  function jogoDe(m, D) {
    return (D.jogos || []).find((j) => j.mp === m.mp && j.sn === m.sn && j.se === m.se
      && Math.abs(minutos(j.d, +j.h.slice(0, 2), +j.h.slice(3, 5)) - minutos(m.d, m.h, 30)) <= 180) || null;
  }
  GT.jogoDe = jogoDe;

  const SELO = { V: ['Vitória', 'ok'], D: ['Derrota', 'bad'], E: ['Empate', ''], X: ['Membros nos 2 times', 'aviso'] };
  const icone = GT.u.iconeMapa; // quadradinho de 2 letras do núcleo
  const hora = (m) => `${String(m.h).padStart(2, '0')}h`;
  const linhaDe = (m) => m.mem.map((x) => x.n);
  const pilha = (m, tam) => h('span', { class: 'in-pilha', role: 'img', 'aria-label': 'Membros: ' + GT.u.lista(linhaDe(m)) }, ...linhaDe(m).map((n) => dica(avatar(n, tam), () => n)));
  const selo = (m) => { const [t, c] = SELO[m.r] || ['', '']; return h('span', { class: 'selo in-selo ' + c }, t); };
  const placarNum = (m) => h('span', { class: 'in-placar ' + (m.r === 'V' ? 'v' : m.r === 'D' ? 'd' : '') }, h('b', null, m.sn), h('i', { 'aria-hidden': 'true' }, '–'), h('span', null, m.se));
  const seloAnalise = (m, D) => { const j = jogoDe(m, D); return j ? h('a', { class: 'selo in-analise', href: linkPartida(j.id), 'aria-label': `Análise completa da partida de ${nomeMapa(m.mp)}, ${m.sn} a ${m.se}` }, 'análise completa ›') : null; };

  function ultima(m, D) {
    const nomes = linhaDe(m);
    return h('article', { class: 'in-ultima r-' + (m.r || 'e').toLowerCase() },
      h('div', { class: 'in-u-mapa' }, icone(m.mp), h('div', null, h('b', null, nomeMapa(m.mp)), h('small', null, `${dataBR(m.d)} · às ${m.h}h`))),
      h('div', { class: 'in-u-meio' }, placarNum(m), selo(m)),
      h('div', { class: 'in-u-line' }, h('span', { class: 'chips-m' }, ...nomes.map((n) => GT.u.chipMembro(n, { link: true, avatar: true }))), seloAnalise(m, D)));
  }
  function linha(m, D) {
    return h('li', { class: 'in-linha r-' + (m.r || 'e').toLowerCase() },
      h('span', { class: 'in-data' }, dataCurta(m.d), h('small', null, hora(m))),
      h('span', { class: 'in-mapa' }, icone(m.mp), h('span', { class: 'in-mapa-nome' }, nomeMapa(m.mp))),
      placarNum(m), h('span', { class: 'in-vd', 'aria-label': (SELO[m.r] || [''])[0] }, h('span', { class: 'in-vd-q ' + (m.r || '').toLowerCase() }, m.r === 'X' ? '±' : m.r)),
      h('span', { class: 'in-extra' }, pilha(m, 20), seloAnalise(m, D)));
  }

  GT.registrarBloco({ aba: 'inicio', id: 'partidas-recentes', ordem: 10, render(el, ctx) {
    const rec = ctx.ms.slice(-9).reverse();
    el.append(h('h1', { class: 'so-leitor' }, 'Geladeira Tracker: início'),
      h('section', { class: 'card in-bloco', 'aria-label': 'Partidas recentes' },
        h('div', { class: 'in-topo' }, h('h2', { class: 'in-titulo' }, 'Partidas recentes'), h('a', { class: 'in-mais', href: linkTodasPartidas() }, 'Todas as partidas →')),
        rec.length ? [ultima(rec[0], ctx.D), rec.length > 1 ? h('ol', { class: 'in-lista', 'aria-label': 'Partidas anteriores' }, ...rec.slice(1).map((m) => linha(m, ctx.D))) : null] : vazioFiltro()));
  } });

  // ---------- jogadores (resumo) ----------
  const NJOG = 8, FORMA = 10;
  function formaMembro(ctx, nick) {
    const xs = [];
    for (const m of ctx.ms) for (const x of m.mem) if (x.n === nick && x.rod) xs.push({ a: x.dano / x.rod, dano: x.dano, rod: x.rod });
    return xs;
  }
  const mediaAdr = (xs) => xs.reduce((s, x) => s + x.dano, 0) / Math.max(1, xs.reduce((s, x) => s + x.rod, 0));
  function celulaForma(ctx, nick) {
    const xs = formaMembro(ctx, nick), ult = xs.slice(-FORMA);
    const td = h('span', { class: 'in-forma' });
    if (xs.length < 6) { td.append(h('small', { class: 'mudo' }, 'poucas partidas')); return td; }
    const dif = mediaAdr(ult) - mediaAdr(xs);
    const cor = dif >= 3 ? 'var(--ok)' : dif <= -3 ? 'var(--bad)' : 'var(--acento)';
    const g = h('span', { class: 'in-spark' });
    sparkline(g, ult.map((x) => x.a), { largura: 64, altura: 22, cor, ponto: true, rotulo: `ADR nas últimas ${ult.length} partidas de ${nick}` });
    const seta = h('span', { class: 'forma-seta ' + (dif >= 3 ? 'ok' : dif <= -3 ? 'bad' : 'neutra'), 'aria-hidden': 'true' }, dif >= 3 ? '↑' : dif <= -3 ? '↓' : '→');
    td.append(g, seta);
    return dica(td, () => `${nick}: ADR das últimas ${ult.length} partidas (${n1(mediaAdr(ult))}) contra ${n1(mediaAdr(xs))} no filtro. Seta: 3 ou mais de diferença.`);
  }
  GT.registrarBloco({ aba: 'inicio', id: 'jogadores', ordem: 30, render(el, ctx) {
    const mb = C.membros(ctx.ms, ctx.membros).sort((a, b) => b.partidas - a.partidas).slice(0, NJOG);
    if (!mb.length) return;
    const cols = [
      { t: 'Jogador', f: (r) => h('a', { class: 'in-nick', href: linkMembro(r.jogador) }, avatar(r.jogador, 20), h('span', null, r.jogador)) },
      { t: 'Partidas', f: (r) => r.partidas, cls: 'so-desk' },
      { ...cWr, t: 'WR' },
      { t: 'K/D', f: (r) => n2(r.kd) },
      { t: 'ADR', f: (r) => n1(r.adr), cls: 'so-desk' },
      { t: 'Forma', f: (r) => celulaForma(ctx, r.jogador) }];
    const t = tabela(cols, mb);
    t.querySelectorAll('thead th').forEach((th, i) => { if (cols[i].cls) th.classList.add(cols[i].cls); });
    el.append(h('section', { class: 'card in-bloco', 'aria-label': 'Jogadores' },
      h('div', { class: 'in-topo' }, h('h2', { class: 'in-titulo' }, 'Jogadores', h('span', { class: 'selo' }, GT.u.rotJanela())), h('a', { class: 'in-mais', href: linkTodosJogadores() }, 'Tabela completa →')),
      t, h('p', { class: 'nota' }, `Os ${Math.min(NJOG, mb.length)} que mais jogaram. Forma: ADR das últimas ${FORMA} partidas do membro.`)));
  } });

  // ---------- mapas (resumo) ----------
  GT.registrarBloco({ aba: 'inicio', id: 'mapas', ordem: 40, render(el, ctx) {
    if (!GT.vetoMapas) return;
    const V = GT.vetoMapas(ctx.ms);
    if (!V.lista.length) return;
    const top = V.lista.slice(0, 3);
    const mais = V.mais.slice(0, 3);
    const veto = h('div', { class: 'in-veto' }, h('span', { class: 'rot' }, '↑ Jogar mais'),
      mais.length ? h('div', { class: 'in-veto-lista' }, ...mais.map((x) => h('a', { class: 'in-veto-item', href: linkMapa(x.m) }, icone(x.m), h('span', null, h('b', null, nomeMapa(x.m)), h('small', null, `${pct(x.s.wr)} (esperado ${pct(x.s.esp)})`)))))
        : h('p', { class: 'nota' }, 'Nenhum mapa bem acima do esperado pela GC.'));
    const tab = tabela([
      { t: 'Mapa', f: ([m]) => h('a', { class: 'in-nick', href: linkMapa(m) }, icone(m), h('span', null, nomeMapa(m))) },
      { t: 'Partidas', f: ([, s]) => s.n }, { t: 'WR', f: ([, s]) => pct(s.wr), wr: ([, s]) => s.wr },
      { t: 'Esperado', f: ([, s]) => (s.esp === null ? '—' : pct(s.esp)) }], top);
    el.append(h('section', { class: 'card in-bloco', 'aria-label': 'Mapas' },
      h('div', { class: 'in-topo' }, h('h2', { class: 'in-titulo' }, 'Mapas', h('span', { class: 'selo' }, GT.u.rotJanela())), h('a', { class: 'in-mais', href: linkTodosMapas() }, 'Todos os mapas →')),
      h('div', { class: 'in-mapas' }, veto, tab),
      h('p', { class: 'nota' }, 'Esperado: previsão de vitória que a GC mostrava antes das partidas (mapas com 10 partidas ou mais entram no "Jogar mais").')));
  } });
})();
