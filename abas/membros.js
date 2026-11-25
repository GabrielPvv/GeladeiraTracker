// Aba "Jogadores" (#jogadores). Sem nick: a lista (U6), UMA tabela com uma linha por membro do filtro, em dois grupos de colunas
// ("No filtro" e "GC avançada, 6 meses"), líder de cada coluna destacado (sem medalha, sem "reis", sem calor de cor), e abaixo, recolhidos:
// Mapa de estilos (estilo.js), Win rate mês a mês e Como é calculado. Os blocos da lista são registrados com aba 'membros' (id interno da lista).
// Com nick (#jogadores/<nick>/<aba>): a página do jogador, desenhada em jogador.js (cabeçalho com 5 números do filtro e abas Visão geral, Mapas, Partidas, Análise e Combate).
// Apelidos: membros, membro, jogador, grupo, parceiros. Os links antigos #membro/<nick> e #analise/<nick> abrem a página nova (a segunda via analise.js).
(function () {
  'use strict';
  const GT = window.GT, C = GT.C, G = GT.G;
  const { h, pct, n1, n2, pl, mesNome, E, UI, card, grafico, grade, dica, infoIcone, selo, cls, linkMembro, vazioFiltro, avatar, sparkline, paramsTexto } = GT.u;

  const ABAS = ['visao', 'mapas', 'partidas', 'analise', 'combate'];
  // Lê o que vem depois de #jogadores/ (também chamada por analise.js): [nick, aba].
  GT.lerRotaJogador = (resto) => {
    // #jogadores/comparar[/<nickA>[/<nickB>]]: comparação de dois jogadores (comparar.js).
    UI.jogCmp = resto[0] === 'comparar';
    if (UI.jogCmp) { UI.cmpA = resto[1] || null; UI.cmpB = resto[2] || null; UI.jogNick = null; UI.jogAba = 'visao'; E.membro = null; return; }
    let nick = resto[0] || null;
    const aba = ABAS.includes(resto[1]) ? resto[1] : 'visao';
    if (!nick && aba === 'analise') nick = (GT.G.membros.find((m) => GT.temAnalise && GT.temAnalise(m.nick)) || GT.G.membros[0] || {}).nick || null;
    UI.jogNick = nick; UI.jogAba = aba; E.membro = nick;
  };
  GT.abasJogador = ABAS;

  GT.registrarAba({ id: 'jogadores', titulo: 'Jogadores', ordem: 60, aceitaVazio: true, apelidos: ['membros', 'membro', 'jogador', 'grupo', 'parceiros'],
    rotaLer(resto) { GT.lerRotaJogador(resto); },
    rotaEscrever() { if (UI.jogCmp) return '/comparar' + (UI.cmpA ? '/' + encodeURIComponent(UI.cmpA) + (UI.cmpB ? '/' + encodeURIComponent(UI.cmpB) : '') : ''); return UI.jogNick ? '/' + encodeURIComponent(UI.jogNick) + '/' + (UI.jogAba || 'visao') : ''; },
    render(el, ctx) {
      if (UI.jogCmp) { GT.paginaComparar(el, ctx); return; }
      if (UI.jogNick) { GT.paginaJogador(el, ctx); return; }
      el.append(h('h1', { class: 'so-leitor' }, 'Geladeira Tracker: jogadores'));
      el.append(h('p', { class: 'cp-link' }, h('a', { class: 'cp-atalho', href: GT.linkComparar() }, 'Comparar jogadores')));
      for (const b of GT.blocos.filter((x) => x.aba === 'membros').sort((x, y) => x.ordem - y.ordem)) {
        const w = h('div', { class: 'bloco', 'data-bloco': b.id });
        try { const r = b.render(w, ctx); if (r) GT.u.pôr(w, [r]); } catch (e) { console.error(e); w.append(h('p', { class: 'vazio' }, `Erro ao desenhar o bloco "${b.id}".`)); }
        el.append(w);
      }
    } });

  // Bloco recolhido da lista (details fechado): título com selo e o conteúdo. Também usado pelo mapa de estilos (estilo.js).
  GT.recolhidoLista = (titulo, ...kids) => h('details', { class: 'card jl-rec' },
    h('summary', null, h('span', { class: 'card-t' }, titulo.t || titulo), ...((titulo.selos || []).map((x) => selo(x[0], x[1])))), ...kids);

  const MIN_BASE = 5;   // partidas no filtro para os números básicos de um membro aparecerem
  const MIN_LIDER = 10; // partidas no filtro para concorrer a líder da coluna
  const MIN = { clutch: 15, entrada: 20, rodadas: 300 }; // mesmos mínimos do motor de análise (src\analise\regras.mjs)
  const MIN_FORMA = 6;  // partidas no filtro para calcular a forma
  const semAdv = 'Sem estatísticas avançadas da GC para este membro (a GC só dá esse detalhe em partidas coletadas por assinantes).';
  const num = (x, d) => x.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

  const adv = (nick) => { const m = G.analise && G.analise.membros && G.analise.membros[nick]; return m && m.avancada && m.avancada.jogador ? m.avancada.jogador : null; };

  // Colunas. val(r, D) -> { v } ou { v: null, motivo }. Todas "maior é melhor" (o líder é o maior valor).
  const base = (v, r) => (r.partidas >= MIN_BASE ? { v } : { v: null, motivo: `Menos de ${MIN_BASE} partidas no filtro atual.` });
  const COLS = [
    { k: 'partidas', t: 'Partidas', g: 'filtro', fmt: String, val: (r) => ({ v: r.partidas }), info: null },
    { k: 'wr', t: 'WR', g: 'filtro', fmt: pct, wr: true, val: (r) => base(r.wr, r), info: 'Win rate: resultado do time do próprio jogador em cada partida.' },
    { k: 'kd', t: 'K/D', g: 'filtro', fmt: n2, val: (r) => base(r.kd, r) },
    { k: 'adr', t: 'ADR', g: 'filtro', fmt: n1, val: (r) => base(r.adr, r), info: 'Dano por rodada.' },
    { k: 'kast', t: 'KAST', g: 'filtro', fmt: pct, val: (r) => base(r.kastPct, r), info: 'Rodadas com abate, assistência, sobrevivência ou troca.' },
    { k: 'hs', t: 'HS%', g: 'filtro', fmt: pct, val: (r) => base(r.hsPct, r), info: 'Abates com headshot.' },
    { k: 'fk', t: '1º abate/rod.', g: 'filtro', fmt: (x) => num(x, 3), val: (r) => base(r.fkRod, r), info: 'Primeiros abates da rodada, por rodada jogada.' },
    { k: 'rating', ic: true, t: 'Rating GC', g: 'filtro', fmt: (x) => x.toLocaleString('pt-BR'), val: (r, D) => (D.gc.get(r.jogador) && D.gc.get(r.jogador).rt ? { v: D.gc.get(r.jogador).rt } : { v: null, motivo: 'Sem Rating GC nas partidas do filtro.' }),
      info: 'É o número de ranking da GC (os pontos do ranking), não uma medida de desempenho. Vale na última partida do filtro em que o jogador aparece.' },
    { k: 'nivel', t: 'Nível GC', g: 'filtro', fmt: String, val: (r, D) => (D.gc.get(r.jogador) && D.gc.get(r.jogador).lv ? { v: D.gc.get(r.jogador).lv } : { v: null, motivo: 'Sem nível da GC nas partidas do filtro.' }),
      info: 'Nível da GC na última partida do filtro em que o jogador aparece.' },
    { k: 'forma', ic: true, t: 'Forma', g: 'filtro', sem: true, val: (r, D) => { const f = D.forma.get(r.jogador); return f ? { v: f.dif, f } : { v: null, motivo: `Menos de ${MIN_FORMA} partidas no filtro.` }; },
      info: `ADR em cada uma das últimas 15 partidas do filtro. A seta compara com a média do filtro: ↑ são 3 pontos de ADR ou mais acima, ↓ 3 ou mais abaixo, → na média. Ordena pela diferença.` },
    { k: 'clutch', t: 'Clutch', g: 'av', fmt: (x) => Math.round(x) + '%', info: 'Clutches ganhos. Mínimo de 15 situações.',
      val: (r) => { const j = adv(r.jogador); if (!j) return { v: null, motivo: semAdv }; return j.clutch.situacoes >= MIN.clutch ? { v: j.clutch.pct, amostra: `${j.clutch.ganhos}/${j.clutch.situacoes}` } : { v: null, motivo: `Só ${j.clutch.situacoes} situações de clutch (mínimo ${MIN.clutch}).` }; } },
    { k: 'entrada', t: 'Entrada', g: 'av', fmt: (x) => Math.round(x) + '%', info: 'Duelos de entrada ganhos, TR e CT. Mínimo de 20 tentativas.',
      val: (r) => { const j = adv(r.jogador); if (!j) return { v: null, motivo: semAdv }; const e = j.entradas.total; return e.tentadas >= MIN.entrada ? { v: e.pct, amostra: `${e.ganhas}/${e.tentadas}` } : { v: null, motivo: `Só ${e.tentadas} tentativas de entrada (mínimo ${MIN.entrada}).` }; } },
    { k: 'flash', t: 'Flash', g: 'av', fmt: (x) => num(x, 1), info: 'Assistências de flash por 100 rodadas. Mínimo de 300 rodadas.',
      val: (r) => { const j = adv(r.jogador); if (!j) return { v: null, motivo: semAdv }; return j.rodadas >= MIN.rodadas ? { v: j.utilitarios.assistenciasFlashPor100Rodadas, amostra: `${j.rodadas} rod.` } : { v: null, motivo: `Só ${j.rodadas} rodadas com detalhe avançado (mínimo ${MIN.rodadas}).` }; } },
    { k: 'trocas', t: 'Trocas', g: 'av', fmt: (x) => num(x, 3), info: 'Trocas feitas por rodada. Mínimo de 300 rodadas.',
      val: (r) => { const j = adv(r.jogador); if (!j) return { v: null, motivo: semAdv }; return j.rodadas >= MIN.rodadas ? { v: j.trocas.feitasPorRodada, amostra: `${j.rodadas} rod.` } : { v: null, motivo: `Só ${j.rodadas} rodadas com detalhe avançado (mínimo ${MIN.rodadas}).` }; } },
  ];
  UI.jlMostra = UI.jlMostra || 'wr';
  const COLS_CELULAR = COLS.filter((c) => !c.sem); // opções do seletor "Ordenar e mostrar"

  // Dados da lista, calculados uma vez por desenho: Rating e nível da última partida do filtro, forma (ADR das últimas 15).
  function dadosLista(ctx) {
    return ctx.cache('lista-jogadores', () => {
      const rows = C.membros(ctx.ms, ctx.membros);
      const gc = new Map(), adrs = new Map();
      for (let i = ctx.ms.length - 1; i >= 0; i--) for (const x of ctx.ms[i].mem) if (!gc.has(x.n) && (x.lv || x.rt)) gc.set(x.n, { lv: x.lv, rt: x.rt });
      for (const m of ctx.ms) for (const x of m.mem) (adrs.get(x.n) || adrs.set(x.n, []).get(x.n)).push({ a: x.dano / Math.max(1, x.rod), dano: x.dano, rod: x.rod });
      const forma = new Map(), media = (a) => a.reduce((s, x) => s + x.dano, 0) / Math.max(1, a.reduce((s, x) => s + x.rod, 0));
      for (const [n, xs] of adrs) if (xs.length >= MIN_FORMA) { const ult = xs.slice(-15), rec = media(ult), ano = media(xs); forma.set(n, { ult, rec, ano, dif: rec - ano }); }
      return { rows, gc, forma };
    });
  }

  // Valor de cada célula (uma vez) e líder de cada coluna (maior valor entre quem tem MIN_LIDER partidas; empate marca todos).
  function celulas(D) {
    const cel = new Map();
    for (const c of COLS) {
      const col = D.rows.map((r) => [r, c.val(r, D)]);
      let lider = null;
      if (!c.sem) { const vs = col.filter(([r, x]) => x.v !== null && (r.partidas >= MIN_LIDER || c.k === 'partidas')).map(([, x]) => x.v); lider = vs.length ? Math.max(...vs) : null; }
      for (const [r, x] of col) cel.set(c.k + '|' + r.jogador, { ...x, lider: lider !== null && x.v !== null && x.v === lider && (r.partidas >= MIN_LIDER || c.k === 'partidas') });
    }
    return cel;
  }

  const POS = { ok: '↑', bad: '↓', neutra: '→' };
  function celulaForma(f) {
    const tom = f.dif >= 3 ? 'ok' : f.dif <= -3 ? 'bad' : 'neutra';
    const spark = h('span', { class: 'jl-spark' });
    sparkline(spark, f.ult.map((x) => x.a), { largura: 48, altura: 22, ponto: true, cor: tom === 'ok' ? 'var(--ok)' : tom === 'bad' ? 'var(--bad)' : 'var(--acento)', rotulo: `ADR por partida, últimas ${f.ult.length}` });
    return h('span', { class: 'jl-forma' }, spark, h('b', { class: 'jl-seta ' + tom, 'aria-label': tom === 'ok' ? 'forma acima da média' : tom === 'bad' ? 'forma abaixo da média' : 'forma na média' }, POS[tom]));
  }

  function tabelaJogadores(ctx, D) {
    const cel = celulas(D), caixa = h('div', { class: 'jl-caixa' });
    if (!COLS.some((c) => c.k === UI.jlSort) && UI.jlSort !== 'jogador') { UI.jlSort = 'partidas'; UI.jlDir = -1; }
    const pintar = () => {
      const col = COLS.find((c) => c.k === UI.jlSort) || { k: 'jogador' };
      const ord = [...D.rows].sort((a, b) => {
        if (col.k === 'jogador') return a.jogador.localeCompare(b.jogador) * UI.jlDir;
        const x = cel.get(col.k + '|' + a.jogador).v, y = cel.get(col.k + '|' + b.jogador).v;
        if (x === null && y === null) return a.jogador.localeCompare(b.jogador);
        if (x === null) return 1; if (y === null) return -1;
        return (x - y) * UI.jlDir || a.jogador.localeCompare(b.jogador);
      });
      const ordenar = (k, primeiro) => { if (UI.jlSort === k) UI.jlDir = -UI.jlDir; else { UI.jlSort = k; UI.jlDir = primeiro; } if (k !== 'jogador' && k !== 'forma') UI.jlMostra = k; pintar(); };
      const cab = (c) => {
        const ativo = c.k === col.k;
        const th = h('th', { 'data-col': c.k, scope: 'col', 'aria-sort': ativo ? (UI.jlDir < 0 ? 'descending' : 'ascending') : 'none', class: c.k === 'jogador' ? 'jl-nick' : '' },
          h('button', { type: 'button', class: 'ordenar' + (ativo ? ' ativo' : ''), 'aria-label': `Ordenar por ${c.t}`, onclick: () => ordenar(c.k, c.k === 'jogador' ? 1 : -1) }, c.t, ativo ? (UI.jlDir < 0 ? ' ▼' : ' ▲') : ''),
          c.info && c.ic ? infoIcone(c.info) : null);
        return th;
      };
      const nF = COLS.filter((c) => c.g === 'filtro').length, nA = COLS.filter((c) => c.g === 'av').length;
      const grupos = h('tr', { class: 'jl-grupo' }, h('th', { 'data-col': 'jogador', class: 'jl-nick' }),
        h('th', { colspan: nF, class: 'jl-g-filtro', scope: 'colgroup' }, 'No filtro'),
        h('th', { colspan: nA, class: 'jl-g-av', scope: 'colgroup' }, selo('GC avançada, 6 meses', 'destaque'), infoIcone('Clutch, entrada, flash e trocas vêm da GC avançada dos últimos 6 meses e não seguem o filtro de período e de mapa.')));
      const corpo = ord.map((r) => {
        const tr = h('tr', null, h('td', { 'data-col': 'jogador', class: 'jl-nick' }, h('a', { href: linkMembro(r.jogador), class: 'jl-membro' }, avatar(r.jogador, 20), h('span', null, r.jogador))));
        for (const c of COLS) {
          const x = cel.get(c.k + '|' + r.jogador);
          const td = h('td', { 'data-col': c.k, class: [c.k === col.k ? 'col-ord' : '', c.k === UI.jlMostra || c.k === 'partidas' || c.k === 'forma' ? 'jl-vis' : ''].filter(Boolean).join(' ') });
          if (x.v === null) { td.classList.add('jl-sem'); td.append('—'); dica(td, () => x.motivo); }
          else if (c.k === 'forma') {
            td.append(celulaForma(x.f));
            dica(td, () => `${r.jogador}: ADR ${n1(x.f.rec)} nas últimas ${x.f.ult.length} partidas, contra ${n1(x.f.ano)} na média do filtro.`);
          } else {
            td.append(h('span', { class: x.lider ? 'jl-lider' : '' }, c.fmt(x.v)));
            if (c.wr) { const cor = x.v >= 0.5 ? 'var(--ok)' : 'var(--bad)'; td.classList.add('wrcel', cls(x.v)); td.style.backgroundImage = `linear-gradient(${cor},${cor})`; td.style.backgroundSize = `${Math.round(x.v * 100)}% 3px`; }
            if (x.amostra || x.lider) dica(td, () => `${r.jogador} · ${c.t}: ${c.fmt(x.v)}${x.lider ? ' · líder da coluna' : ''}${x.amostra ? ` · amostra ${x.amostra}` : ''}${c.g === 'av' ? ' · GC avançada, 6 meses, sem filtro' : ''}`);
          }
          tr.append(td);
        }
        return tr;
      });
      const mostra = COLS.find((c) => c.k === UI.jlMostra) || COLS[1];
      const sel = h('select', { 'aria-label': 'Ordenar e mostrar a coluna', onchange: (e) => { UI.jlMostra = e.target.value; UI.jlSort = e.target.value; UI.jlDir = -1; pintar(); } },
        ...COLS_CELULAR.map((c) => h('option', { value: c.k, selected: c.k === mostra.k }, c.t)));
      const tabela = h('table', { class: 'jl-tab', 'data-mostra': mostra.k }, h('thead', null, grupos, h('tr', null, cab({ k: 'jogador', t: 'Jogador' }), ...COLS.map(cab))), h('tbody', null, ...corpo));
      // No celular só aparecem Jogador, Partidas, a coluna escolhida e a Forma (o resto fica escondido por CSS, pela classe jl-vis nas células e pelo data-mostra nos cabeçalhos).
      tabela.querySelectorAll('thead tr:last-child th').forEach((th) => { const k = th.getAttribute('data-col'); if (k === mostra.k || k === 'partidas' || k === 'forma' || k === 'jogador') th.classList.add('jl-vis'); });
      caixa.replaceChildren(h('label', { class: 'jl-seletor' }, 'Ordenar e mostrar: ', sel), h('div', { class: 'rolar jl-rolar' }, tabela));
    };
    pintar();
    return caixa;
  }

  GT.registrarBloco({ aba: 'membros', id: 'tabela', ordem: 10, render(el, ctx) {
    const D = dadosLista(ctx);
    if (!D.rows.length) { el.append(card('Jogadores', null, vazioFiltro())); return; }
    el.append(card('Jogadores', `${pl(ctx.ms.length, 'partida', 'partidas')} da Geladeira ${GT.u.descFiltro()}. Clique no título da coluna para ordenar e no nick para abrir a página do jogador. O líder de cada coluna tem o número em negrito e um ponto.`,
      tabelaJogadores(ctx, D)));
  } });

  GT.registrarBloco({ aba: 'membros', id: 'grade', ordem: 50, render(el, ctx) {
    const mb = ctx.cache('membros', () => C.membros(ctx.ms, ctx.membros).sort((a, b) => b.partidas - a.partidas));
    if (!mb.length) return;
    const mm = C.membrosMes(ctx.ms, ctx.membros), meses = [...new Set(mm.map((d) => d.mes))].sort();
    const mapa = new Map(mm.map((d) => [`${d.jogador}|${d.mes}`, d])); for (const d of mb) mapa.set(`${d.jogador}|ano`, d);
    const cols = [...meses.map((m) => ({ k: m, t: mesNome(m) })), { k: 'ano', t: 'Total' }];
    el.append(GT.recolhidoLista('Win rate mês a mês',
      h('p', { class: 'nota' }, 'Verde é acima de 50%, vermelho abaixo; quanto mais forte a cor, mais longe de 50%. Cada célula mostra o win rate e as partidas do jogador. A última coluna é o total do filtro.'),
      grafico((g) => grade(g, mb.map((d) => d.jogador), cols, (n, k) => mapa.get(`${n}|${k}`)), 'grafico rolar')));
  } });

  // "Como é calculado": a nota de método da lista, uma vez só, no fim (P9).
  GT.registrarBloco({ aba: 'membros', id: 'calculo', ordem: 90, render(el) {
    const item = (forte, ...texto) => h('li', null, h('b', null, forte), ' ', ...texto);
    el.append(GT.recolhidoLista('Como é calculado', h('ul', { class: 'sb-calculo' },
      item('No filtro:', `partidas, win rate, K/D, ADR, KAST, HS% e 1º abate por rodada contam as partidas da Geladeira do período e dos mapas escolhidos, inclusive as com membros nos dois times. Com menos de ${MIN_BASE} partidas o número fica em "—".`),
      item('Líder da coluna:', `o maior valor entre quem tem ${MIN_LIDER} partidas ou mais no filtro (empate marca todos). Não vale como nota: é só um ponto de partida para comparar.`),
      item('Forma:', `ADR em cada uma das últimas 15 partidas do filtro (mínimo de ${MIN_FORMA}); a seta compara com a média do filtro e só sai de → com diferença de 3 pontos de ADR ou mais.`),
      item('Rating GC e Nível GC:', 'número de ranking da GC e nível na última partida do filtro em que o jogador aparece. Não é o rating de desempenho.'),
      item('GC avançada, 6 meses:', `clutch, entrada, flash e trocas vêm da estatística avançada da GC e não seguem o filtro. Mínimos: ${MIN.clutch} situações de clutch, ${MIN.entrada} tentativas de entrada e ${MIN.rodadas} rodadas.`),
      item('Dados parciais:', 'quem não mandou arquivo só aparece nas partidas jogadas com quem mandou. Veja o detalhe em ', h('a', { href: '#sobre?' + paramsTexto() }, 'Sobre os dados'), '.'))));
  } });
})();
