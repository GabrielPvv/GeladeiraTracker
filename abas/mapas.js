// Aba "Mapas" (U5): veto e tabela do pool de mapas (#mapas) e a página de cada mapa (#mapas/<mapa>[/<aba>]) com as abas
// Resumo (Geladeira × adversário), Primeiro contato (demos), Membros e o link para Granadas. "Todos os mapas" (#mapas/todos) mostra o bloco geral de
// rodada a rodada. #plano e #plano/<mapa> (a antiga aba "Plano por mapa") são apelidos desta aba. As contas estão em plano-mapa.js e plano-demos.js.
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pct, pl, mesNome, E, UI, card, grafico, grade, tabela, tabelaOrdenavel, cWr, avatar, linkMembro, paramsTexto, nomeMapa, iconeMapa, selo, infoIcone, vazioFiltro } = GT.u;
  Object.assign(UI, { minMapa: 10 });
  const ABAS = ['resumo', 'contato', 'membros'];
  const MIN_VETO = () => window.GTCalc.MIN_VETO;

  // Formato único: vírgula decimal. sinal: "+0,4" / "−0,4" (menos de verdade).
  const num = (v, d = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const sinal = (v, d = 1) => { const t = num(Math.abs(v), d); return Number(v.toFixed(d)) === 0 ? t : (v > 0 ? '+' : '−') + t; };
  const janela = () => (GT.u.rotJanela ? GT.u.rotJanela() : `Ano ${E.ano}`);
  const link = (mapa, aba) => '#mapas/' + mapa + (aba && aba !== 'resumo' && mapa !== 'todos' ? '/' + aba : '') + '?' + paramsTexto();

  GT.registrarAba({ id: 'mapas', titulo: 'Mapas', ordem: 40, aceitaVazio: true, apelidos: ['plano', 'melhoria', 'mapa-a-mapa'],
    rotaLer(resto) { UI.mapaSel = resto[0] ? String(resto[0]).toLowerCase() : null; UI.mapaAba = ABAS.includes(resto[1]) ? resto[1] : 'resumo'; },
    rotaEscrever() { return UI.mapaSel ? '/' + UI.mapaSel + (UI.mapaAba && UI.mapaAba !== 'resumo' && UI.mapaSel !== 'todos' ? '/' + UI.mapaAba : '') : ''; },
    render(el, ctx) { if (UI.mapaSel) pagina(el, ctx, UI.mapaSel); else lista(el, ctx); } });

  // Bloco recolhido (details fechado): título, resumo de uma linha e o conteúdo.
  const recolhido = (titulo, resumo, ...corpo) => h('details', { class: 'card mp-rec' }, h('summary', null, h('span', { class: 'mp-rec-t' }, titulo), resumo && h('small', { class: 'mudo' }, resumo)), ...corpo);

  // ---------- lista: veto + pool ----------
  const vetoItem = (m, linha, sub) => h('a', { class: 'pl-veto-item', href: link(m) }, h('span', { class: 'mp-vi' }, iconeMapa(m), h('b', null, nomeMapa(m))), h('small', null, sub));
  function veto(V) {
    const { mais, menos, amostra } = V;
    const par = (x) => `${pct(x.s.wr)} (esperado ${pct(x.s.esp)}) · ${pl(x.s.n, 'partida', 'partidas')}`;
    const col = (cl, titulo, itens, vazio) => h('div', { class: 'pl-veto-col ' + cl }, h('h3', null, titulo), itens.length ? h('div', { class: 'pl-veto-lista' }, ...itens) : h('p', { class: 'nota' }, vazio));
    return card({ t: 'Veto da Geladeira', selos: [`mapas com ${MIN_VETO()}+ partidas`, janela()] },
      'Win rate contra a previsão de vitória que a GC mostrava antes de cada partida. A margem para destacar um mapa cresce quando há poucas partidas.',
      h('div', { class: 'pl-veto' },
        col('mais', '↑ Jogar mais', mais.map((x) => vetoItem(x.m, x, par(x))), 'Nenhum mapa bem acima do esperado.'),
        col('menos', 'Abaixo do esperado pela GC', menos.map((x) => vetoItem(x.m, x, par(x))), 'Nenhum mapa bem abaixo do esperado.'),
        col('amostra', 'Ainda sem amostra', amostra.map(([m, s]) => vetoItem(m, null, pl(s.n, 'partida', 'partidas') + ' · poucas para comparar')), `Todos os mapas têm ${MIN_VETO()} partidas ou mais.`)));
  }

  // Diferença para o esperado, em pontos: ▲/▼ e número (a cor nunca sozinha); abaixo de 2 pontos fica neutra.
  function difCel(d, est) {
    if (!est || est.esp === null) return '—';
    const pts = Math.round((d.wr - est.esp) * 100), t = (pts > 0 ? '+' : pts < 0 ? '−' : '') + Math.abs(pts);
    if (Math.abs(d.wr - est.esp) < 0.02) return h('span', { class: 'mudo' }, t);
    return h('span', { class: pts > 0 ? 'ok' : 'bad' }, (pts > 0 ? '▲ ' : '▼ ') + t);
  }

  function pool(ctx, mp, V) {
    const EST = new Map(V.lista);
    const linhas = mp.map((d) => ({ ...d, est: EST.get(d.mapa) || null }));
    const mais = 'mp-mais';
    const cols = [
      { t: 'Mapa', f: (r) => h('a', { class: 'mp-nome', href: link(r.mapa) }, iconeMapa(r.mapa), h('span', null, nomeMapa(r.mapa))) },
      { t: 'Part.', f: (r) => r.partidas, cls: 'mp-n' },
      { t: 'V–D', f: (r) => `${r.v}–${r.d}`, cls: `mp-n ${mais}` },
      { ...cWr, t: 'WR', cls: 'mp-n' },
      { t: 'Esperado GC', f: (r) => (r.est && r.est.esp !== null ? pct(r.est.esp) : '—'), cls: `mp-n ${mais}` },
      { t: 'Dif.', f: (r) => difCel(r, r.est), cls: 'mp-n' },
      { t: 'Saldo/partida', f: (r) => (r.est ? sinal(r.est.saldoP) : '—'), cls: `mp-n ${mais}` },
      { t: '1º abates', f: (r) => (r.est ? pct(r.est.abertura) : '—'), cls: `mp-n ${mais}` }];
    const info = { 'Esperado GC': 'Previsão de vitória que a GC mostrava para a Geladeira antes de cada partida, em média.', 'Dif.': 'Win rate menos o esperado pela GC, em pontos percentuais. Abaixo de 2 pontos fica sem cor.',
      'Saldo/partida': 'Rodadas da Geladeira menos as do adversário, em média por partida.', '1º abates': 'De todos os primeiros abates das rodadas (dos dois times), quantos foram da Geladeira.' };
    const t = tabela(cols, linhas, { aoClicar: (r) => { location.hash = link(r.mapa); }, dicaClique: 'Abrir a página do mapa' });
    const tb = t.querySelector('table'); tb.classList.add('mp-tb');
    tb.querySelectorAll('thead th').forEach((th, i) => {
      (cols[i].cls || '').split(' ').filter(Boolean).forEach((k) => th.classList.add(k));
      if (info[cols[i].t]) th.append(infoIcone(info[cols[i].t]));
    });
    const caixa = h('div', { class: 'mp-tab' }, t);
    const btn = h('button', { type: 'button', class: 'btn pequeno mp-mais-btn', 'aria-pressed': 'false', onclick: () => { const on = caixa.classList.toggle('aberta'); btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? 'Menos colunas' : 'Mais colunas'; } }, 'Mais colunas');
    return card({ t: 'Pool de mapas', selos: [janela()] }, 'Clique numa linha para abrir a página do mapa.', btn, caixa);
  }

  function lista(el, ctx) {
    el.append(h('header', { class: 'cabeca' }, h('h1', null, 'Mapas'), h('p', { class: 'lead' }, `${janela()} · ${pl(ctx.ms.length, 'partida', 'partidas')}`)));
    const mp = ctx.cache('mapas', () => C.mapas(ctx.ms));
    if (!mp.length) { el.append(vazioFiltro()); return; }
    const V = ctx.cache('veto', () => GT.vetoMapas(ctx.ms));
    el.append(veto(V), pool(ctx, mp, V));

    const meses = [...new Set(ctx.ms.map(C.mesDe))].sort();
    const porMes = new Map(); for (const [mapa, ps] of C.agrupar(ctx.ms, (m) => m.mp)) for (const [mes, qs] of C.agrupar(ps, C.mesDe)) porMes.set(`${mapa}|${mes}`, C.grupo(qs));
    for (const d of mp) porMes.set(`${d.mapa}|ano`, d);
    const cols = [...meses.map((m) => ({ k: m, t: mesNome(m) })), { k: 'ano', t: 'Total' }];
    el.append(
      recolhido('Mapa × mês', 'win rate de cada mapa em cada mês', h('p', { class: 'nota' }, 'Win rate da Geladeira em cada mapa em cada mês (verde acima de 50%, vermelho abaixo); o número pequeno é a quantidade de partidas.'),
        grafico((g) => grade(g, mp.map((d) => d.mapa), cols, (n, k) => porMes.get(`${n}|${k}`), 90, nomeMapa), 'grafico rolar')),
      recolhido('Horário da partida', 'win rate por faixa de horário', tabela([{ t: 'Faixa', f: (r) => r.faixa }, { t: 'Part.', f: (r) => r.partidas }, cWr, { t: 'K/D', f: (r) => num(r.kd, 2) }, { t: 'ADR', f: (r) => num(r.adr, 1) }], C.horario(ctx.ms))),
      recolhido('Como é calculado', null,
        h('p', { class: 'nota' }, `Veto: só entram mapas com ${MIN_VETO()} partidas ou mais no filtro. "Jogar mais" e "Abaixo do esperado pela GC" comparam o win rate com a previsão de vitória da GC; a margem é de 5 pontos ou o erro típico da amostra, o que for maior (por isso cresce quando há poucas partidas). Os demais mapas ficam em "Ainda sem amostra".`),
        h('p', { class: 'nota' }, 'Esperado GC, saldo por partida e 1º abates vêm do placar da GC, só de partidas sem membros nos dois times. Os números seguem o filtro de período e de mapa.')));
  }

  // ---------- página do mapa ----------
  function seletor(ctx, atual) {
    const mp = ctx.cache('mapas', () => C.mapas(ctx.ms));
    const aba = ABAS.includes(UI.mapaAba) ? UI.mapaAba : 'resumo';
    const item = (id, rotulo, extra) => h('a', { class: 'mp-pil' + (id === atual ? ' ativo' : ''), href: link(id, id === 'todos' ? null : aba), 'aria-current': id === atual ? 'page' : null }, rotulo, extra);
    return h('nav', { class: 'mp-sel', 'aria-label': 'Escolher mapa' }, item('todos', 'Todos os mapas'),
      ...mp.map((d) => item(d.mapa, [iconeMapa(d.mapa), h('b', null, nomeMapa(d.mapa)), h('small', null, String(d.partidas))])));
  }

  // Linha da comparação: número em cada ponta, barras espelhadas a partir do centro (esquerda --nos, direita --eles).
  function linhaCmp(rot, sub, a, b, fmt, info) {
    const max = Math.max(a, b) || 1;
    const larg = (v) => `width:${Math.max(2, (v / max) * 100).toFixed(1)}%`;
    return h('tr', null,
      h('td', null, h('div', { class: 'mp-met' }, h('span', null, rot, info && infoIcone(info)), sub && h('small', { class: 'mudo' }, sub))),
      h('td', { class: 'mp-lado nos' }, h('div', { class: 'mp-in' }, h('b', null, fmt(a)), h('span', { class: 'mp-trilho', 'aria-hidden': 'true' }, h('i', { estilo: larg(a) })))),
      h('td', { class: 'mp-lado eles' }, h('div', { class: 'mp-in' }, h('span', { class: 'mp-trilho', 'aria-hidden': 'true' }, h('i', { estilo: larg(b) })), h('b', null, fmt(b)))));
  }

  function resumo(ctx, m, s, d) {
    const linhas = [
      linhaCmp('1º abates', 'parte das rodadas', s.abertura, 1 - s.abertura, (v) => pct(v), 'De todos os primeiros abates das rodadas (dos dois times), quantos foram de cada lado.'),
      linhaCmp('Assist. de flash', 'por partida', s.flashN, s.flashE, (v) => num(v, 1)),
      linhaCmp('Bombas plantadas', 'por partida', s.bombaN, s.bombaE, (v) => num(v, 1), 'Quem planta mais chega mais no bomb como TR; quando o adversário planta mais, a Geladeira de CT está cedendo o bomb.'),
      linhaCmp('Desarmes', 'por partida', s.desarmeN, s.desarmeE, (v) => num(v, 1), 'Desarmes medem o retake: retomar o bomb depois que o adversário plantou.'),
      linhaCmp('K/D do time', null, s.kdN, s.kdE, (v) => num(v, 2)),
      linhaCmp('Multiabates (3+)', 'por partida', s.mkN, s.mkE, (v) => num(v, 1))];
    const tab = h('table', { class: 'mp-cmp' }, h('thead', null, h('tr', null, h('th', null, 'Métrica'),
      h('th', { class: 'mp-h nos' }, h('i', { class: 'mp-sw', 'aria-hidden': 'true' }), 'Geladeira'), h('th', { class: 'mp-h eles' }, 'Adversário', h('i', { class: 'mp-sw', 'aria-hidden': 'true' })))), h('tbody', null, ...linhas));
    const comp = card({ t: 'Geladeira × adversário', selos: [janela()] },
      `Totais do placar da GC nas ${pl(s.n, 'partida', 'partidas')} do mapa: o time inteiro da Geladeira contra os adversários.`, h('div', { class: 'mp-cmp-caixa' }, tab));
    const D = s.n >= GT.planoMapa.MIN ? GT.planoMapa.dicas(m, s) : [];
    const dicas = D.length ? GT.planoDemos.grupos(D, undefined, undefined, 'Está dando certo')
      : h('p', { class: 'vazio' }, s.n < GT.planoMapa.MIN ? `Só ${pl(s.n, 'partida', 'partidas')} neste mapa no filtro; as dicas aparecem a partir de ${GT.planoMapa.MIN}.` : 'Nada fora do normal neste mapa: os números estão parecidos com os dos adversários.');
    return [comp, card({ t: 'Pontos fortes e o que trabalhar', selos: [janela()] }, 'Comparação com os adversários nas mesmas partidas.', dicas)];
  }

  function membros(ctx, m) {
    const mb = GT.planoMapa.membrosNoMapa(ctx, m);
    if (mb.length < 1) return [card('Membros neste mapa', null, h('p', { class: 'vazio' }, 'Nenhum membro com 4 partidas ou mais neste mapa no filtro.'))];
    if (!['mb-n', 'mb-p', 'mb-adr', 'mb-dif', 'mb-fk'].includes(UI.sort)) { UI.sort = 'mb-dif'; UI.dir = -1; }
    const cols = [
      { k: 'mb-n', t: 'Membro', v: (r) => r.n, f: (r) => h('a', { class: 'mp-mb', href: linkMembro(r.n) }, avatar(r.n, 20), h('span', null, r.n)) },
      { k: 'mb-p', t: 'Part.', v: (r) => r.p, f: (r) => r.p },
      { k: 'mb-adr', t: 'ADR no mapa', v: (r) => r.adr, f: (r) => num(r.adr, 1), info: 'Dano médio por rodada neste mapa, nas partidas do filtro.' },
      { k: 'mb-dif', t: 'Dif. do ADR', v: (r) => r.dif, f: (r) => h('span', { class: 'mudo' }, sinal(r.dif * 100, 0) + '%'), info: 'ADR neste mapa contra o ADR do próprio membro em todos os mapas do filtro.' },
      { k: 'mb-fk', t: '1º abates/rod.', v: (r) => r.fkRod, f: (r) => num(r.fkRod, 2), info: 'Primeiros abates por rodada jogada neste mapa (placar da GC).' }];
    return [card({ t: 'Membros neste mapa', selos: [janela()] }, 'Membros com 4 partidas ou mais no mapa. Clique no cabeçalho para ordenar; a diferença compara cada um com ele mesmo.', h('div', { class: 'mp-membros' }, tabelaOrdenavel(cols, mb)))];
  }

  function paginaMapa(el, ctx, m) {
    const ms = ctx.ms.filter((p) => p.mp === m);
    if (!ms.length) { el.append(card(nomeMapa(m), null, vazioFiltro(`Sem partidas de ${nomeMapa(m)} neste filtro.`))); return; }
    const d = C.mapas(ms)[0], s = GT.planoMapa.estatMapa(ms), aba = ABAS.includes(UI.mapaAba) ? UI.mapaAba : 'resumo';
    const numero = (rot, valor, info) => h('div', { class: 'mp-num' }, h('span', { class: 'rot' }, rot, info && infoIcone(info)), h('b', { class: 'mp-v' }, valor));
    const nums = s.n ? h('div', { class: 'mp-nums', role: 'group', 'aria-label': 'Números do mapa' },
      numero('Saldo/partida', sinal(s.saldoP), 'Rodadas da Geladeira menos as do adversário, em média por partida.'),
      numero('1º abates', pct(s.abertura), 'De todos os primeiros abates das rodadas (dos dois times), quantos foram da Geladeira.'),
      numero('K/D do time', num(s.kdN, 2), 'Abates sobre mortes do time inteiro da Geladeira, somados nas partidas do mapa.'),
      s.nivelD !== null && numero('Nível médio', sinal(s.nivelD), 'Nível da Geladeira menos o do adversário, em média.')) : null;
    const nDemos = GT.planoDemos.demosDe(ctx, m);
    const aItem = (id, t, extra) => h('a', { class: 'mp-aba' + (aba === id ? ' ativo' : ''), href: link(m, id), 'aria-current': aba === id ? 'page' : null }, t, extra && h('span', { class: 'mp-aba-n' }, ' · ' + extra));
    const temFundo = ((GT.G.imagens || {}).mapasFundo || []).includes(m);
    const cab = h('header', { class: 'card mp-cab' + (temFundo ? ' fundo-mapa' : ''), 'data-mapa': temFundo ? m : null },
      h('a', { class: 'mp-voltar', href: '#mapas?' + paramsTexto() }, '← Mapas'),
      h('div', { class: 'mp-topo' }, iconeMapa(m), h('div', { class: 'mp-id' }, h('h1', { class: 'mp-nome-h' }, nomeMapa(m)),
        h('p', { class: 'mp-resumo' }, h('b', null, pl(d.partidas, 'partida', 'partidas')), ` · ${d.v}V ${d.d}D · WR `, h('b', null, pct(d.wr)), s.esp !== null && ` (esperado ${pct(s.esp)})`))),
      nums, !s.n && h('p', { class: 'nota' }, 'Sem os totais do placar da GC para este mapa no filtro.'));
    const abas = h('nav', { class: 'mp-abas', 'aria-label': `Páginas de ${nomeMapa(m)}` },
      aItem('resumo', 'Resumo'), aItem('contato', 'Primeiro contato', nDemos ? pl(nDemos, 'demo', 'demos') : null), aItem('membros', 'Membros'),
      h('a', { class: 'mp-aba mp-aba-link', href: '#granadas/' + m + '?' + paramsTexto() }, 'Granadas →'));
    const corpo = aba === 'contato' ? GT.planoDemos.contato(ctx, m) : aba === 'membros' ? membros(ctx, m) : s.n ? resumo(ctx, m, s, d) : [card('Resumo', null, h('p', { class: 'vazio' }, 'Sem os totais do placar da GC para comparar o time com os adversários neste mapa.'))];
    el.append(cab, abas, h('div', { class: 'mp-conteudo' }, ...corpo));
  }

  function paginaTodos(el, ctx) {
    const G0 = GT.planoDemos.geral(ctx);
    el.append(h('header', { class: 'card mp-cab' }, h('a', { class: 'mp-voltar', href: '#mapas?' + paramsTexto() }, '← Mapas'),
      h('div', { class: 'mp-topo' }, h('div', { class: 'mp-id' }, h('h1', { class: 'mp-nome-h' }, 'Todos os mapas'), h('p', { class: 'mp-resumo' }, 'Rodada a rodada, somando todos os mapas com estatística avançada da GC.')))),
      h('div', { class: 'mp-conteudo' }, G0 || card('Primeiro abate e rodada', null, h('p', { class: 'vazio' }, 'Ainda sem partidas com estatística avançada da GC neste ano.'))));
  }

  function pagina(el, ctx, sel) {
    if (sel !== 'todos' && !ctx.ms.length) { el.append(vazioFiltro()); return; }
    el.append(seletor(ctx, sel));
    if (sel === 'todos') paginaTodos(el, ctx); else paginaMapa(el, ctx, sel);
  }
})();
