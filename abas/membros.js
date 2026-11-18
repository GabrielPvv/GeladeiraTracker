// Aba "Membros": cards e grade membro × mês. Também a página de um membro (#membro/<nick>), aba oculta do menu.
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pct, n1, n2, pl, mesNome, E, UI, card, grafico, grade, barra, tabela, cWr, barrasWr, heroGrupo, dica, cls, descFiltro, coberturaTexto, linkMembro, paramsTexto, vazioFiltro, avatar, rotuloMembro } = GT.u;

  GT.registrarAba({ id: 'membros', titulo: 'Membros', ordem: 60, apelidos: ['grupo', 'parceiros'] });

  function cartaoMembro(d, href) {
    const c = h('a', { class: 'pc cartao-link', href, role: 'listitem' },
      h('strong', { class: 'pc-nome' }, avatar(d.jogador, 22), h('span', null, d.jogador)), h('div', { class: 'grande ' + cls(d.wr) }, pct(d.wr)), barra(d.wr, d.wr >= 0.5 ? 'bom' : 'ruim'),
      h('div', { class: 'mini' }, h('span', null, 'K/D ', h('b', null, n2(d.kd))), h('span', null, 'ADR ', h('b', null, n1(d.adr)))),
      h('div', { class: 'mini' }, h('span', null, 'HS% ', h('b', null, pct(d.hsPct))), h('span', null, 'KAST ', h('b', null, pct(d.kastPct)))),
      h('div', { class: 'mini' }, h('span', null, `${pl(d.partidas, 'jogo', 'jogos')} · ${d.v}V ${d.d}D`), d.rating && h('span', null, 'Pts GC ', h('b', null, d.rating))));
    return dica(c, () => `${d.jogador}: ${d.v}V ${d.d}D${d.rating ? ` · pontos GC (média) ${d.rating}` : ''} · clique para ver a página dele`);
  }

  GT.registrarBloco({ aba: 'membros', id: 'cards', ordem: 10, render(el, ctx) {
    const mb = ctx.cache('membros', () => C.membros(ctx.ms, ctx.membros).sort((a, b) => b.partidas - a.partidas));
    if (!mb.length) { el.append(vazioFiltro()); return; }
    el.append(card('Membros da Geladeira', `Números de cada membro em todas as partidas da Geladeira de ${E.ano} do filtro em que ele jogou (inclusive as com membros nos dois times). Do que mais jogou para o que menos jogou. Clique para ver a página do membro. ${coberturaTexto().replace(/^./, (s) => s.toUpperCase())}.`,
      h('div', { class: 'pcards gcards', role: 'list' }, ...mb.map((d) => cartaoMembro(d, linkMembro(d.jogador))))));
  } });

  GT.registrarBloco({ aba: 'membros', id: 'grade', ordem: 20, render(el, ctx) {
    const mb = ctx.cache('membros', () => C.membros(ctx.ms, ctx.membros).sort((a, b) => b.partidas - a.partidas));
    if (!mb.length) return;
    const mm = C.membrosMes(ctx.ms, ctx.membros), meses = [...new Set(mm.map((d) => d.mes))].sort();
    const mapa = new Map(mm.map((d) => [`${d.jogador}|${d.mes}`, d])); for (const d of mb) mapa.set(`${d.jogador}|ano`, d);
    const cols = [...meses.map((m) => ({ k: m, t: mesNome(m) })), { k: 'ano', t: 'Total' }];
    el.append(card('Win rate de cada membro, mês a mês', 'Verde é acima de 50%, vermelho abaixo; quanto mais forte a cor, mais longe de 50%. Cada célula mostra o win rate e as partidas dele. A última coluna é o total do filtro.',
      grafico((g) => grade(g, mb.map((d) => d.jogador), cols, (n, k) => mapa.get(`${n}|${k}`)), 'grafico rolar')));
  } });

  // ----- página de um membro: #membro/<nick> -----
  GT.registrarAba({ id: 'membro', titulo: 'Membro', oculta: true, aceitaVazio: true, apelidos: ['jogador'],
    rotaLer(resto) { E.membro = resto.join('/') || null; },
    rotaEscrever() { return '/' + E.membro; } });

  // Dados do membro da página (nulo se ele não jogou no filtro).
  const doMembro = (ctx) => ctx.cache('membro', () => C.membros(ctx.ms, ctx.membros).find((x) => x.jogador === E.membro));
  const voltar = () => h('a', { href: '#membros?' + paramsTexto(), class: 'btn' }, '← Membros');

  GT.registrarBloco({ aba: 'membro', id: 'cabecalho', ordem: 10, render(el, ctx) {
    const nome = E.membro, mb = doMembro(ctx);
    el.append(h('div', { class: 'sec-topo' }, voltar(), GT.linkAnalise && ctx.membros.includes(nome) && h('a', { href: GT.linkAnalise(nome), class: 'btn' }, 'Ver análise')));
    if (!ctx.membros.includes(nome)) { el.append(h('p', { class: 'vazio' }, `"${nome}" não é membro da Geladeira em ${E.ano}.`)); return; }
    if (!mb) { el.append(vazioFiltro(`${nome} não jogou nessas partidas.`)); return; }
    el.append(GT.cartaoJogador ? GT.cartaoJogador(nome) : h('h1', { class: 'titulo-membro' }, avatar(nome, 36), nome), h('header', { class: 'cabeca' }, h('p', { class: 'lead' }, `${descFiltro().replace(/^./, (s) => s.toUpperCase())}: `, h('b', null, mb.partidas), mb.partidas === 1 ? ' partida da Geladeira em que ele jogou' : ' partidas da Geladeira em que ele jogou', mb.rating ? [', média de pontos GC ', h('b', null, mb.rating)] : '', '. Win rate, K/D e demais números são só dele, com o resultado do time dele em cada partida.')));
  } });

  GT.registrarBloco({ aba: 'membro', id: 'resumo', ordem: 20, render(el, ctx) { const mb = doMembro(ctx); if (mb) el.append(heroGrupo({ ...mb, e: 0 }, 'K/D')); } });

  GT.registrarBloco({ aba: 'membro', id: 'meses', ordem: 30, render(el, ctx) {
    if (!doMembro(ctx)) return;
    const mesesM = C.membrosMes(ctx.ms, [E.membro]);
    el.append(card('Win rate mês a mês', 'O número embaixo de cada mês é a quantidade de partidas dele.', grafico((g) => barrasWr(g, mesesM))));
  } });

  GT.registrarBloco({ aba: 'membro', id: 'mapas-companhia', ordem: 40, render(el, ctx) {
    if (!doMembro(ctx)) return;
    const nome = E.membro;
    const por = new Map(); for (const m of ctx.ms) for (const x of m.mem) if (x.n === nome) { if (!por.has(m.mp)) por.set(m.mp, []); por.get(m.mp).push(C.linhaMembro(x)); }
    const mapasM = [...por.entries()].map(([mapa, lin]) => ({ mapa, ...C.somar(lin) })).sort((a, b) => b.partidas - a.partidas);
    let par = C.comQuem(ctx.ms, nome); const min = par.some((x) => x.partidas >= 5) ? 5 : 3;
    par = par.filter((x) => x.partidas >= min).sort((a, b) => b.wr - a.wr || b.partidas - a.partidas);
    el.append(h('div', { class: 'grade2' },
      card('Mapas', null, tabela([{ t: 'Mapa', f: (r) => r.mapa }, { t: 'Part.', f: (r) => r.partidas }, cWr, { t: 'K/D', f: (r) => n2(r.kd) }, { t: 'ADR', f: (r) => n1(r.adr) }], mapasM)),
      card('Com quem mais ganha', `Partidas dele no mesmo time de cada outro membro (${min} partidas juntos ou mais), do melhor win rate para o pior.`,
        par.length ? tabela([{ t: 'Com', f: (r) => h('span', { class: 'chips-m' }, GT.u.chipMembro(r.com, { link: true })) }, { t: 'Part.', f: (r) => r.partidas }, { t: 'V', f: (r) => r.v }, { t: 'D', f: (r) => r.d }, cWr], par) : h('p', { class: 'vazio' }, 'Poucas partidas com outros membros neste filtro.'))));
  } });
})();
