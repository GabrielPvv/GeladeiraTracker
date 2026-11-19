// Aba "Home": a vitrine do site. Todos os membros em todas as categorias, lado a lado (não é comparação de 2 membros):
// matriz com cor de calor por coluna, "reis" de cada categoria, pequenos múltiplos, forma recente, cards de perfil com mini radar.
// Números básicos: partidas do filtro (período e mapas). Colunas de GC avançada, funções e radar: window.GELADEIRA.analise (6 meses, sem filtro).
(function () {
  'use strict';
  const GT = window.GT, C = GT.C, G = GT.G;
  const { h, sv, pct, n1, n2, pl, lista, dica, infoIcone, card, avatar, rotuloMembro, linkMembro, paramsTexto, coberturaTexto, sparkline, UI, reduzMov } = GT.u;
  Object.assign(UI, { homeSort: 'partidas', homeDir: -1 });

  GT.registrarAba({ id: 'home', titulo: 'Home', ordem: 5, apelidos: ['inicio'] });

  const MIN_BASE = 5;   // partidas no filtro para os números básicos de um membro contarem na matriz
  const MIN_REI = 10;   // partidas no filtro para concorrer a "rei"
  const MIN = { clutch: 15, entrada: 20, rodadas: 300 }; // mesmos mínimos do motor de análise (src\analise\regras.mjs)
  const ORDEM_FUNCOES = [['entry', 'Entry'], ['suporte', 'Suporte'], ['awp', 'AWP'], ['lurker', 'Lurker'], ['ancora', 'Âncora']];
  const pos = (n) => `${n}º`;

  const analise = (nick) => { const m = G.analise && G.analise.membros && G.analise.membros[nick]; return m || null; };
  const adv = (nick) => { const m = analise(nick); return m && m.avancada && m.avancada.jogador ? m.avancada.jogador : null; };
  const semAdv = 'Sem estatísticas avançadas da GC para este membro (a GC só dá esse detalhe em partidas coletadas por assinantes).';

  // Colunas: val(r) -> { v } (valor numérico) ou { v: null, motivo }. Tudo "maior é melhor".
  const base = (v, r) => (r.partidas >= MIN_BASE ? { v } : { v: null, motivo: `Menos de ${MIN_BASE} partidas no filtro atual.` });
  const COLS = [
    { k: 'partidas', t: 'Partidas', fmt: String, val: (r) => ({ v: r.partidas }), info: 'Partidas da Geladeira em que o membro jogou, dentro do filtro.' },
    { k: 'wr', t: 'Win rate', fmt: pct, val: (r) => base(r.wr, r), info: 'Resultado do time do próprio membro em cada partida.' },
    { k: 'kd', t: 'K/D', fmt: n2, val: (r) => base(r.kd, r) },
    { k: 'adr', t: 'ADR', fmt: n1, val: (r) => base(r.adr, r), info: 'Dano por rodada.' },
    { k: 'hs', t: 'HS%', fmt: pct, val: (r) => base(r.hsPct, r), info: 'Abates com headshot.' },
    { k: 'kast', t: 'KAST', fmt: pct, val: (r) => base(r.kastPct, r), info: 'Rodadas com abate, assistência, sobrevivência ou troca.' },
    { k: 'fk', t: '1º abate/rod.', fmt: (x) => x.toFixed(3), val: (r) => base(r.fkRod, r), info: 'Primeiros abates da rodada, por rodada jogada.' },
    { k: 'mk', t: '3K+/rod.', fmt: (x) => x.toFixed(3), val: (r) => base(r.mkRod, r), info: 'Rodadas com 3 abates ou mais, por rodada jogada.' },
    { k: 'clutch', t: 'Clutch %', fmt: (x) => x.toFixed(0) + '%', av: true, info: 'Clutches ganhos (GC avançada, últimos 6 meses, sem filtro). Mínimo de 15 situações.',
      val: (r) => { const j = adv(r.jogador); if (!j) return { v: null, motivo: semAdv }; return j.clutch.situacoes >= MIN.clutch ? { v: j.clutch.pct, amostra: `${j.clutch.ganhos}/${j.clutch.situacoes}` } : { v: null, motivo: `Só ${j.clutch.situacoes} situações de clutch (mínimo ${MIN.clutch}).` }; } },
    { k: 'entrada', t: 'Entrada %', fmt: (x) => x.toFixed(0) + '%', av: true, info: 'Duelos de entrada ganhos, T e CT (GC avançada, últimos 6 meses, sem filtro). Mínimo de 20 tentativas.',
      val: (r) => { const j = adv(r.jogador); if (!j) return { v: null, motivo: semAdv }; const e = j.entradas.total; return e.tentadas >= MIN.entrada ? { v: e.pct, amostra: `${e.ganhas}/${e.tentadas}` } : { v: null, motivo: `Só ${e.tentadas} tentativas de entrada (mínimo ${MIN.entrada}).` }; } },
    { k: 'flash', t: 'Flash ass./100 rod.', fmt: n1, av: true, info: 'Assistências de flash por 100 rodadas (GC avançada, últimos 6 meses, sem filtro). Mínimo de 300 rodadas.',
      val: (r) => { const j = adv(r.jogador); if (!j) return { v: null, motivo: semAdv }; return j.rodadas >= MIN.rodadas ? { v: j.utilitarios.assistenciasFlashPor100Rodadas, amostra: `${j.rodadas} rod.` } : { v: null, motivo: `Só ${j.rodadas} rodadas com detalhe avançado (mínimo ${MIN.rodadas}).` }; } },
    { k: 'trocas', t: 'Trocas/rod.', fmt: (x) => x.toFixed(3), av: true, info: 'Trocas feitas por rodada (GC avançada, últimos 6 meses, sem filtro). Mínimo de 300 rodadas.',
      val: (r) => { const j = adv(r.jogador); if (!j) return { v: null, motivo: semAdv }; return j.rodadas >= MIN.rodadas ? { v: j.trocas.feitasPorRodada, amostra: `${j.rodadas} rod.` } : { v: null, motivo: `Só ${j.rodadas} rodadas com detalhe avançado (mínimo ${MIN.rodadas}).` }; } },
    { k: 'pts', t: 'Pontos GC', fmt: (x) => String(x), val: (r) => (r.rating ? { v: r.rating } : { v: null, motivo: 'Sem pontos da GC nas partidas do filtro.' }), info: 'Pontos de ranking da GC na época das partidas (média). Não é o rating de desempenho.' },
  ];

  // Dados da página, calculados uma vez por desenho.
  function dadosHome(ctx) {
    return ctx.cache('home', () => {
      const rows = C.membros(ctx.ms, ctx.membros);
      const adrs = new Map(), topo = new Map(), jogou = new Map();
      for (const m of ctx.ms) {
        for (const lado of ['A', 'B']) {
          const noLado = m.mem.filter((x) => x.l === lado);
          if (!noLado.length) continue;
          let melhor = null;
          for (const x of noLado) { const a = x.dano / Math.max(1, x.rod); if (!melhor || a > melhor.a) melhor = { n: x.n, a }; }
          topo.set(melhor.n, (topo.get(melhor.n) || 0) + 1);
        }
        for (const x of m.mem) { (adrs.get(x.n) || adrs.set(x.n, []).get(x.n)).push({ a: x.dano / Math.max(1, x.rod), dano: x.dano, rod: x.rod }); jogou.set(x.n, (jogou.get(x.n) || 0) + 1); }
      }
      const desvio = (xs) => { const m = xs.reduce((s, x) => s + x.a, 0) / xs.length; return Math.sqrt(xs.reduce((s, x) => s + (x.a - m) ** 2, 0) / xs.length); };
      return { rows, adrs, topo, jogou, desvio };
    });
  }

  // Cor de calor: escala própria da coluna; melhor = mais forte. Devolve { v, motivo, t (0..1), pos }.
  function celulas(rows) {
    const out = new Map();
    for (const c of COLS) {
      const cel = rows.map((r) => ({ r, ...c.val(r) }));
      const vs = cel.filter((x) => x.v !== null).map((x) => x.v), lo = Math.min(...vs), hi = Math.max(...vs);
      for (const x of cel) {
        if (x.v === null) { out.set(c.k + '|' + x.r.jogador, x); continue; }
        x.t = hi > lo ? (x.v - lo) / (hi - lo) : 0.5;
        x.pos = 1 + vs.filter((v) => v > x.v).length;
        out.set(c.k + '|' + x.r.jogador, x);
      }
    }
    return out;
  }

  // ---------- 1. matriz ----------
  function matriz(ctx, D) {
    const caixa = h('div', { class: 'home-matriz-caixa' });
    const cel = celulas(D.rows);
    const pintar = () => {
      const col = COLS.find((c) => c.k === UI.homeSort) || COLS[0];
      const ord = [...D.rows].sort((a, b) => {
        const x = cel.get(col.k + '|' + a.jogador).v, y = cel.get(col.k + '|' + b.jogador).v;
        if (x === null && y === null) return a.jogador.localeCompare(b.jogador);
        if (x === null) return 1; if (y === null) return -1;
        return (x - y) * UI.homeDir || a.jogador.localeCompare(b.jogador);
      });
      const cab = h('tr', null, h('th', { class: 'home-fixa' }, 'Membro'), ...COLS.map((c) => {
        const ativo = c.k === col.k;
        return h('th', { 'aria-sort': ativo ? (UI.homeDir < 0 ? 'descending' : 'ascending') : 'none' },
          h('button', { type: 'button', class: 'ordenar' + (ativo ? ' ativo' : ''), 'aria-label': `Ordenar por ${c.t}`, onclick: () => { if (UI.homeSort === c.k) UI.homeDir = -UI.homeDir; else { UI.homeSort = c.k; UI.homeDir = -1; } pintar(); } }, c.t, ativo ? (UI.homeDir < 0 ? ' ▼' : ' ▲') : ''),
          c.info ? infoIcone(c.info) : null);
      }));
      const corpo = ord.map((r, i) => h('tr', { class: 'home-in', estilo: `--d:${i * 35}ms` },
        h('th', { class: 'home-fixa', scope: 'row' }, h('a', { href: linkMembro(r.jogador), class: 'home-membro' }, avatar(r.jogador, 26), h('span', null, rotuloMembro(r.jogador)))),
        ...COLS.map((c) => {
          const x = cel.get(c.k + '|' + r.jogador);
          if (x.v === null) { const td = h('td', { class: 'home-cel home-sem' }, '—'); dica(td, () => x.motivo); return td; }
          const a = Math.round(8 + 47 * x.t);
          const td = h('td', { class: 'home-cel' + (x.pos === 1 ? ' home-top' : ''), estilo: `--calor:${a}%` }, h('b', null, c.fmt(x.v)), h('span', { class: 'home-pos' }, pos(x.pos)));
          dica(td, () => `${rotuloMembro(r.jogador)} · ${c.t}: ${c.fmt(x.v)} (${pos(x.pos)} de ${D.rows.filter((q) => cel.get(c.k + '|' + q.jogador).v !== null).length})${x.amostra ? ` · amostra ${x.amostra}` : ''}${c.av ? ' · GC avançada, 6 meses, sem filtro' : ''}`);
          return td;
        })));
      caixa.replaceChildren(h('div', { class: 'rolar home-rolar' }, h('table', { class: 'home-matriz' }, h('thead', null, cab), h('tbody', null, ...corpo))));
    };
    pintar();
    return caixa;
  }

  GT.registrarBloco({ aba: 'home', id: 'cabecalho', ordem: 10, render(el, ctx) {
    const A = C.grupo(ctx.ms);
    const membros = new Set(ctx.ms.flatMap((m) => m.mem.map((x) => x.n))).size;
    const mapas = new Set(ctx.ms.map((m) => m.mp)).size;
    const ultima = ctx.ms.length ? ctx.ms[ctx.ms.length - 1].d : null;
    const pil = (cor, valor, texto) => h('span', { class: 'pilula', estilo: `--p:${cor}` }, h('b', null, valor), texto);
    el.append(h('header', { class: 'cabeca' }, h('h1', null, 'Geladeira Tracker'),
      h('p', { class: 'subtitulo' }, 'Os membros lado a lado em todas as categorias.'),
      h('div', { class: 'pilulas' },
        pil('var(--c1)', A.partidas, A.partidas === 1 ? 'partida junta' : 'partidas juntas'),
        pil(A.wr >= 0.5 ? 'var(--ok)' : 'var(--bad)', `${(A.wr * 100).toFixed(0)}%`, 'de vitórias'),
        pil('var(--c2)', membros, membros === 1 ? 'membro' : 'membros'),
        pil('var(--c4)', mapas, mapas === 1 ? 'mapa' : 'mapas'),
        ultima && pil('var(--c6)', GT.u.dataBR(ultima), 'última partida'))));
  } });

  GT.registrarBloco({ aba: 'home', id: 'matriz', ordem: 20, render(el, ctx) {
    const D = dadosHome(ctx);
    el.append(card('Matriz de membros', 'Cada coluna tem escala de cor própria: quanto mais forte, melhor a posição do membro naquela categoria (o número pequeno é a posição). Cinza com "—": sem amostra suficiente (passe o mouse ou toque para ver o motivo). Clique no título da coluna para ordenar.',
      D.rows.length ? matriz(ctx, D) : h('p', { class: 'vazio' }, 'Sem membros nesse filtro.'),
      h('p', { class: 'nota' }, 'Partidas, win rate, K/D, ADR, HS%, KAST, 1º abate, 3K+ e pontos GC seguem o período e os mapas escolhidos (mínimo de 5 partidas). Clutch, entrada, flash e trocas vêm da GC avançada dos últimos 6 meses e não seguem o filtro.')));
  } });

  // ---------- 2. reis ----------
  const REIS = [
    { t: 'Rei do ADR', f: n1, un: 'ADR', cand: (r, D) => (r.partidas >= MIN_REI ? r.adr : null) },
    { t: 'Rei do HS', f: pct, un: 'HS%', cand: (r) => (r.partidas >= MIN_REI ? r.hsPct : null) },
    { t: 'Mais clutch', f: (x) => x.toFixed(0) + '%', un: 'clutches ganhos', cand: (r) => { const j = adv(r.jogador); return j && j.clutch.situacoes >= MIN.clutch ? j.clutch.pct : null; }, av: true },
    { t: 'Mais entry', f: (x) => x.toFixed(0) + '%', un: 'entradas ganhas', cand: (r) => { const j = adv(r.jogador); return j && j.entradas.total.tentadas >= MIN.entrada ? j.entradas.total.pct : null; }, av: true },
    { t: 'Suporte do grupo', f: n1, un: 'assist. de flash/100 rod.', cand: (r) => { const j = adv(r.jogador); return j && j.rodadas >= MIN.rodadas ? j.utilitarios.assistenciasFlashPor100Rodadas : null; }, av: true },
    { t: 'Mais constante', f: (x) => '±' + x.toFixed(1), un: 'variação do ADR entre partidas', menor: true, cand: (r, D) => { const xs = D.adrs.get(r.jogador); return xs && xs.length >= MIN_REI ? D.desvio(xs) : null; } },
    { t: 'Carregador', f: (x) => `${x}x`, un: 'vezes com o maior ADR entre os membros do time', cand: (r, D) => (r.partidas >= MIN_REI ? D.topo.get(r.jogador) || 0 : null) },
  ];
  GT.registrarBloco({ aba: 'home', id: 'reis', ordem: 30, render(el, ctx) {
    const D = dadosHome(ctx);
    const cards = REIS.map((R, i) => {
      const c = D.rows.map((r) => ({ nick: r.jogador, v: R.cand(r, D) })).filter((x) => x.v !== null).sort((a, b) => (R.menor ? a.v - b.v : b.v - a.v));
      const corpo = c.length ? [
        h('div', { class: 'rei-topo' }, avatar(c[0].nick, 40), h('div', null, h('div', { class: 'rei-nome' }, rotuloMembro(c[0].nick)), h('div', { class: 'rei-un' }, R.un))),
        h('div', { class: 'rei-valor' }, R.f(c[0].v)),
        c[1] ? h('div', { class: 'rei-2' }, '2º ', avatar(c[1].nick, 16), ' ', rotuloMembro(c[1].nick), ' · ', R.f(c[1].v)) : h('div', { class: 'rei-2' }, 'sem 2º colocado com amostra'),
      ] : [h('div', { class: 'rei-vazio' }, 'Sem amostra suficiente neste filtro.')];
      return h('div', { class: 'rei home-in', estilo: `--d:${i * 50}ms` }, h('span', { class: 'rot' }, R.t, R.av ? h('span', { class: 'selo' }, '6 meses') : null), ...corpo);
    });
    el.append(h('section', { class: 'card' }, h('h2', null, 'Reis de cada categoria'),
      h('p', { class: 'nota' }, `Quem lidera cada categoria (mínimo de ${MIN_REI} partidas no filtro; clutch, entry e suporte usam a GC avançada dos últimos 6 meses). "Carregador" conta as partidas em que o membro teve o maior ADR entre os membros do seu time.`),
      h('div', { class: 'reis' }, ...cards)));
  } });

  // ---------- 3. pequenos múltiplos ----------
  GT.registrarBloco({ aba: 'home', id: 'multiplos', ordem: 40, render(el, ctx) {
    const D = dadosHome(ctx), cel = celulas(D.rows);
    const cards = COLS.filter((c) => c.k !== 'partidas').map((c, i) => {
      const itens = D.rows.map((r) => ({ r, x: cel.get(c.k + '|' + r.jogador) })).sort((a, b) => (a.x.v === null) - (b.x.v === null) || (b.x.v ?? 0) - (a.x.v ?? 0));
      const max = Math.max(...itens.filter((q) => q.x.v !== null).map((q) => q.x.v), 1e-9);
      const linhas = itens.map(({ r, x }) => {
        const barra = h('i', { class: 'mm-barra' + (x.v === null ? ' mm-sem' : ''), estilo: `width:${x.v === null ? 0 : Math.max(2, (x.v / max) * 100)}%` });
        const l = h('div', { class: 'mm-linha' }, h('span', { class: 'mm-nome' }, avatar(r.jogador, 16), h('span', null, rotuloMembro(r.jogador))), h('span', { class: 'mm-trilho' }, barra), h('b', null, x.v === null ? '—' : c.fmt(x.v)));
        dica(l, () => (x.v === null ? x.motivo : `${rotuloMembro(r.jogador)} · ${c.t}: ${c.fmt(x.v)} (${pos(x.pos)})`));
        return l;
      });
      return h('div', { class: 'mm home-in', estilo: `--d:${i * 30}ms` }, h('span', { class: 'rot' }, c.t, c.av ? h('span', { class: 'selo' }, '6 meses') : null), ...linhas);
    });
    el.append(h('section', { class: 'card' }, h('h2', null, 'Ranking por categoria'), h('p', { class: 'nota' }, 'Uma barra por membro em cada categoria, do maior para o menor, para ver a distância entre eles.'), h('div', { class: 'mms' }, ...cards)));
  } });

  // ---------- 4. forma recente ----------
  GT.registrarBloco({ aba: 'home', id: 'forma', ordem: 50, render(el, ctx) {
    const D = dadosHome(ctx);
    const cards = D.rows.map((r, i) => {
      const xs = D.adrs.get(r.jogador) || [], ult = xs.slice(-15);
      const media = (a) => a.reduce((s, x) => s + x.dano, 0) / Math.max(1, a.reduce((s, x) => s + x.rod, 0));
      const spark = h('div', { class: 'forma-spark' });
      let seta = null, txt = 'poucas partidas';
      if (xs.length >= 6) {
        const rec = media(ult), ano = media(xs), dif = rec - ano;
        seta = h('span', { class: 'forma-seta ' + (dif >= 3 ? 'ok' : dif <= -3 ? 'bad' : 'neutra') }, dif >= 3 ? '↑' : dif <= -3 ? '↓' : '→');
        txt = `ADR ${n1(rec)} nas últimas ${ult.length} · média ${n1(ano)}`;
        sparkline(spark, ult.map((x) => x.a), { largura: 120, altura: 30, area: true, ponto: true, cor: dif >= 3 ? 'var(--ok)' : dif <= -3 ? 'var(--bad)' : 'var(--acento)', rotulo: `ADR por partida, últimas ${ult.length}` });
      }
      const c = h('div', { class: 'forma home-in', estilo: `--d:${i * 40}ms` }, h('div', { class: 'forma-topo' }, avatar(r.jogador, 24), h('strong', null, rotuloMembro(r.jogador)), seta), spark, h('small', null, txt));
      dica(c, () => (xs.length >= 6 ? `${rotuloMembro(r.jogador)}: linha = ADR de cada uma das últimas ${ult.length} partidas; seta compara com a média do filtro (±3 de ADR).` : `Menos de 6 partidas no filtro.`));
      return c;
    });
    el.append(h('section', { class: 'card' }, h('h2', null, 'Forma recente'), h('p', { class: 'nota' }, 'ADR em cada uma das últimas 15 partidas do filtro; a seta compara a forma recente com a média do filtro (verde: 3 ou mais acima; vermelho: 3 ou mais abaixo).'), h('div', { class: 'formas' }, ...cards)));
  } });

  // ---------- 5. cards de perfil com mini radar ----------
  function radar(notas) {
    const S = 120, c = 60, R = 42, n = ORDEM_FUNCOES.length;
    const ang = (i) => -Math.PI / 2 + (2 * Math.PI * i) / n, P = (i, f) => [c + R * f * Math.cos(ang(i)), c + R * f * Math.sin(ang(i))];
    const poli = (f) => ORDEM_FUNCOES.map((_, i) => P(i, f).map((v) => v.toFixed(1)).join(',')).join(' ');
    const pts = ORDEM_FUNCOES.map(([id], i) => P(i, Math.max(0.04, (notas[id] ?? 0) / 100)).map((v) => v.toFixed(1)).join(',')).join(' ');
    return sv('svg', { class: 'radar', viewBox: `0 0 ${S} ${S}`, role: 'img', 'aria-label': 'Radar das 5 funções: ' + ORDEM_FUNCOES.map(([id, nome]) => `${nome} ${notas[id] ?? 0}`).join(', ') },
      sv('polygon', { points: poli(1), fill: 'none', stroke: 'var(--grade)' }), sv('polygon', { points: poli(0.5), fill: 'none', stroke: 'var(--grade)' }),
      ...ORDEM_FUNCOES.map((_, i) => sv('line', { x1: c, y1: c, x2: P(i, 1)[0], y2: P(i, 1)[1], stroke: 'var(--grade)' })),
      sv('polygon', { points: pts, fill: 'var(--acento)', 'fill-opacity': 0.28, stroke: 'var(--acento)', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }),
      ...ORDEM_FUNCOES.map(([, nome], i) => { const [x, y] = P(i, 1.3); return sv('text', { x, y: y + 3, 'text-anchor': 'middle', style: 'font-size:8px' }, nome.slice(0, 4)); }));
  }
  GT.registrarBloco({ aba: 'home', id: 'perfis', ordem: 60, render(el, ctx) {
    const cards = ctx.membros.map((nick, i) => {
      const a = analise(nick), f = a && a.funcoes;
      const notas = f ? Object.fromEntries(f.ranking.map((q) => [q.id, q.nota ?? 0])) : null;
      const sug = f && f.sugerida ? f.ranking.find((q) => q.id === f.sugerida) : null;
      const c = h('a', { class: 'perfil home-in', href: `#analise/${encodeURIComponent(nick)}?${paramsTexto()}`, estilo: `--d:${i * 45}ms` },
        h('div', { class: 'perfil-topo' }, avatar(nick, 34), h('div', null, h('strong', null, nick))),
        notas ? radar(notas) : h('div', { class: 'perfil-sem' }, 'sem GC avançada'),
        h('div', { class: 'perfil-funcao' }, h('span', { class: 'rot' }, 'Função provável'), h('b', null, sug ? sug.nome : '—'), f && f.amostraPequena ? h('span', { class: 'selo' }, 'amostra pequena') : null));
      dica(c, () => (f ? `${rotuloMembro(nick)}: ${ORDEM_FUNCOES.map(([id, nome]) => `${nome} ${notas[id]}`).join(' · ')} (${pl(f.partidasAvancadas, 'partida avançada', 'partidas avançadas')}). Clique para abrir a Análise.` : `${semAdv} Clique para abrir a Análise.`));
      return c;
    });
    el.append(h('section', { class: 'card' }, h('h2', null, 'Perfis'), h('p', { class: 'nota' }, 'Radar de 5 eixos com a nota (0 a 100) de cada função: Entry, Suporte, AWP, Lurker e Âncora, pela GC avançada dos últimos 6 meses. Clique num card para abrir a Análise do membro.'), h('div', { class: 'perfis' }, ...cards)));
  } });

  GT.registrarBloco({ aba: 'home', id: 'cobertura', ordem: 70, render(el, ctx) {
    el.append(h('p', { class: 'nota home-cobertura' }, `Base: ${pl(ctx.info.totalBase, 'partida', 'partidas')} de ${ctx.ano}, ${ctx.info.geladeira} da Geladeira. Cobertura: `, h('b', null, coberturaTexto()), '. Os números dos membros que não mandaram arquivo são parciais.'));
  } });
})();
