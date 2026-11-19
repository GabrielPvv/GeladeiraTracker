// Geladeira Tracker: núcleo. Estado (dados, filtros, tema), utilitários (DOM, formatação, plural, tooltip, gráficos, chips de membro,
// avatar) e o registro de abas e blocos. As abas ficam em abas\<id>.js e se registram aqui; veja COMO-ESTENDER.md.
// Script simples (sem módulos ES) para abrir direto por file://. Expõe window.GT.
(function () {
  'use strict';
  const G = window.GELADEIRA, C = window.GTCalc;
  const $ = (s, el = document) => el.querySelector(s);
  const GT = (window.GT = { G, C, abas: [], blocos: [], ganchosAno: [] });

  // ---------- DOM ----------
  const NS = 'http://www.w3.org/2000/svg';
  function pôr(el, kids) { for (const k of kids.flat(9)) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k))); return el; }
  function criar(el, a, kids) {
    for (const [k, v] of Object.entries(a || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.setAttribute('class', v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'estilo') el.setAttribute('style', v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    return pôr(el, kids);
  }
  const h = (tag, a, ...kids) => criar(document.createElement(tag), a, kids);
  const sv = (tag, a, ...kids) => criar(document.createElementNS(NS, tag), a, kids);

  // ---------- formatação ----------
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mesNome = (m) => MESES[Number(String(m).slice(5, 7)) - 1] || m;
  const pct = (x) => (Number(x) * 100).toFixed(0) + '%';
  const n2 = (x) => Number(x).toFixed(2);
  const n1 = (x) => Number(x).toFixed(1);
  const dataBR = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
  const dataCurta = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  const cls = (wr) => (Number(wr) >= 0.5 ? 'ok' : 'bad'); // classe semântica de win rate: verde / vermelho
  const pl = (n, s, p) => `${n} ${n === 1 ? s : p}`; // plural: "1 partida", "2 partidas"
  const lista = (xs) => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1]);
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
  const ler = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const reduzMov = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const depois = (f) => requestAnimationFrame(() => requestAnimationFrame(f));
  const nomeResultado = (r) => (r === 'V' ? 'vitória' : r === 'D' ? 'derrota' : r === 'E' ? 'empate' : 'membros nos dois times (fora do win rate)');
  const MIN_LINE = { 5: 3, 4: 5, 3: 8, 2: 8 }, AMOSTRA = 8; // mínimos de partidas das lines; abaixo de AMOSTRA é "amostra pequena"

  // ---------- tooltip ----------
  const tip = $('#dica');
  function mostrarDica(ev, texto) {
    tip.textContent = texto; tip.hidden = false;
    const w = tip.offsetWidth, hh = tip.offsetHeight;
    let x = ev.clientX + 12, y = ev.clientY + 16;
    if (x + w > innerWidth - 6) x = Math.max(6, innerWidth - w - 6);
    if (y + hh > innerHeight - 6) y = Math.max(6, ev.clientY - hh - 10);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  const esconderDica = () => { tip.hidden = true; };
  // Liga um tooltip a qualquer elemento: f() devolve o texto. Funciona com mouse e com toque.
  function dica(el, f) {
    el.setAttribute('data-dica', '1');
    el.addEventListener('pointerenter', (e) => mostrarDica(e, f()));
    el.addEventListener('pointermove', (e) => mostrarDica(e, f()));
    el.addEventListener('pointerdown', (e) => mostrarDica(e, f()));
    el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') esconderDica(); });
    return el;
  }
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest || !e.target.closest('[data-dica]')) esconderDica(); });
  addEventListener('scroll', esconderDica, { passive: true });
  // Ícone ⓘ com tooltip (também por foco de teclado).
  function infoIcone(texto) {
    const el = h('span', { class: 'info', tabindex: '0', role: 'img', 'aria-label': texto }, 'ⓘ');
    dica(el, () => texto);
    el.addEventListener('focus', () => { const r = el.getBoundingClientRect(); mostrarDica({ clientX: r.left, clientY: r.bottom }, texto); });
    el.addEventListener('blur', esconderDica);
    return el;
  }
  function avisar(t) { const a = $('#aviso'); a.textContent = t; a.hidden = false; clearTimeout(avisar.t); avisar.t = setTimeout(() => { a.hidden = true; }, 2200); }

  // ---------- estado e filtros ----------
  // E: estado global (ano, período, mapa, aba atual). UI: estado local das abas (cada aba usa os seus campos).
  const E = { per: 'ano', n: 20, mapas: [], ano: G && G.anos ? G.anos[G.anos.length - 1] : '', aba: 'visao', membro: null, destaqueAdv: null };
  const UI = { sort: 'partidas', dir: -1 };
  const lista_ = (s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []);
  // E.mapas: lista de mapas escolhidos (vazia = todos). E.mapa (texto "a + b") existe só para exibir; atribuir uma string aceita "a,b" (formato antigo: um mapa).
  Object.defineProperty(E, 'mapa', { get: () => E.mapas.join(' + '), set: (v) => { E.mapas = lista_(String(v || '')); }, enumerable: false });
  const passaMapa = (mp) => !E.mapas.length || E.mapas.includes(mp); // para quem filtra partidas por conta própria
  const dados = () => G.porAno[E.ano];
  const membrosAno = () => dados().info.membros;

  function aplicarParams(p) {
    if (p.get('ano') && G.anos.includes(p.get('ano'))) E.ano = p.get('ano');
    if (['ano', '6m', '30d', 'n'].includes(p.get('per'))) E.per = p.get('per');
    if (Number(p.get('n')) >= 1) E.n = Math.min(999, Math.floor(Number(p.get('n'))));
    if (p.has('mapa')) E.mapas = lista_(p.get('mapa'));
    // "com" e "sem" de links antigos são ignorados (o filtro com/sem existe só no montador da aba Lines).
  }
  const paramsAtuais = () => {
    const p = new URLSearchParams();
    p.set('ano', E.ano);
    if (E.per !== 'ano') p.set('per', E.per);
    if (E.per === 'n') p.set('n', E.n);
    if (E.mapas.length) p.set('mapa', E.mapas.join(','));
    return p;
  };
  const paramsTexto = () => paramsAtuais().toString().replace(/%2C/g, ',');
  const abaAtual = () => GT.abas.find((a) => a.id === E.aba);
  function lerHash() {
    const [caminho, q = ''] = decodeURIComponent(location.hash.replace(/^#/, '')).split('?');
    aplicarParams(new URLSearchParams(q));
    const [rota, ...resto] = caminho.split('/');
    const a = GT.abas.find((x) => x.id === rota || (x.apelidos || []).includes(rota)) || GT.abas.find((x) => x.id === 'home') || GT.abas.find((x) => x.id === 'visao') || GT.abas[0];
    E.aba = a.id; if (a.id !== 'membro') E.membro = null;
    if (a.rotaLer) a.rotaLer(resto, E);
  }
  function gravarEstado() {
    guardar('geladeira.filtros', JSON.stringify({ ano: E.ano, per: E.per, n: E.n, mapa: E.mapas.join(',') }));
    const a = abaAtual();
    try { history.replaceState(null, '', '#' + E.aba + (a && a.rotaEscrever ? a.rotaEscrever(E) : '') + '?' + paramsTexto()); } catch { /* file:// em alguns navegadores */ }
  }
  try { const s = JSON.parse(ler('geladeira.filtros') || '{}'); aplicarParams(new URLSearchParams(Object.entries(s).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v]))); } catch { /* ignora */ }

  const somarDias = (d, dias) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) + dias * 864e5).toISOString().slice(0, 10);
  const menosMeses = (d, m) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1 - m, +d.slice(8, 10))).toISOString().slice(0, 10);
  // Período e mapa. `todas` e `ms` são iguais (o filtro com/sem existe só no montador); `ms` é o que as abas usam.
  function filtrar() {
    const D = dados(); let ms = D.partidas;
    if (E.mapas.length) ms = ms.filter((m) => E.mapas.includes(m.mp));
    if (E.per === '6m') { const c = menosMeses(D.info.ultima, 6); ms = ms.filter((m) => m.d >= c); }
    else if (E.per === '30d') { const c = somarDias(D.info.ultima, -30); ms = ms.filter((m) => m.d >= c); }
    const todas = E.per === 'n' ? ms.slice(-E.n) : ms;
    return { todas, ms: todas };
  }
  function descFiltro() {
    const p = { ano: `em ${E.ano}`, '6m': `nos últimos 6 meses de ${E.ano}`, '30d': `nos últimos 30 dias de ${E.ano}`, n: E.n === 1 ? `na última partida de ${E.ano}` : `nas últimas ${E.n} partidas de ${E.ano}` }[E.per];
    return [p, E.mapas.length && `em ${E.mapas.join(' + ')}`].filter(Boolean).join(', ');
  }
  const filtrado = () => E.per !== 'ano' || E.mapas.length > 0;
  function limparFiltros() { Object.assign(E, { per: 'ano', mapas: [] }); render(); }
  function coberturaTexto() {
    const c = G.cobertura || { arquivosDe: [], outros: [] };
    return `dados de ${lista(c.arquivosDe)}; ${c.outros.length ? `os outros membros (${lista(c.outros)}) só aparecem nas partidas ${c.arquivosDe.length === 3 ? 'desses três' : 'desses arquivos'}` : 'todos os membros mandaram arquivo'}`;
  }

  // ---------- membros: apelido, avatar, chips, links ----------
  const rotuloMembro = (n) => { const m = (G.membros || []).find((x) => x.nick === n); return (m && m.apelidos && m.apelidos[0]) || n; };
  const linkMembro = (n) => '#membro/' + encodeURIComponent(n) + '?' + paramsTexto();
  const hashNick = (s) => { let x = 2166136261; for (const c of String(s)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; } return x; };
  const iniciais = (nome) => { const p = String(nome).split(/[\s_\-.]+/).filter(Boolean); return (p.length > 1 ? p[0][0] + p[1][0] : String(nome).replace(/[^A-Za-z0-9]/g, '').slice(0, 2)).toUpperCase() || '?'; };
  // Círculo com as iniciais do apelido (ou do nick) e uma cor fixa por membro (8 cores em --av0..--av7, texto branco AA).
  function avatar(nick, tamanho = 24) {
    return h('span', { class: `avatar av${hashNick(nick) % 8}`, estilo: `--tam:${tamanho}px`, 'aria-hidden': 'true', title: nick }, iniciais(rotuloMembro(nick)));
  }
  // Chip de membro (pílula com avatar e apelido). opcoes: { link: true (leva à página do membro), avatar: true, tamanho }.
  function chipMembro(nick, opcoes = {}) {
    const { link = false, avatar: av = true, tamanho = 18 } = opcoes;
    return h(link ? 'a' : 'span', { class: 'chip-m', href: link ? linkMembro(nick) : null, title: nick }, av && avatar(nick, tamanho), h('span', { class: 'chip-m-nome' }, rotuloMembro(nick)));
  }
  const chipsMembros = (nomes, opcoes) => h('span', { class: 'chips-m' }, ...nomes.map((n) => chipMembro(n, opcoes)));

  // ---------- peças ----------
  const card = (titulo, nota, ...kids) => h('section', { class: 'card' }, titulo && h('h2', null, titulo), nota && h('p', { class: 'nota' }, nota), ...kids);
  const vazioFiltro = (extra) => h('p', { class: 'vazio' }, (E.mapas.length ? 'Nenhuma partida nesses mapas no período escolhido. ' : 'Sem partidas nesse filtro. '), extra, ' ', h('button', { class: 'btn pequeno', type: 'button', onclick: limparFiltros }, 'Limpar filtros'));
  const desenhos = [];
  // Área de gráfico: fn(el) roda depois que o elemento está na página (para medir a largura) e de novo a cada mudança de largura.
  const grafico = (fn, cl = 'grafico') => { const el = h('div', { class: cl }); desenhos.push(() => fn(el)); return el; };

  function anel(frac, texto, marca, titulo, textoDica) {
    const S = 160, c = 80, R = 64, sw = 14, circ = 2 * Math.PI * R, f = Math.max(0, Math.min(1, frac));
    const cor = marca != null && f < marca ? 'var(--bad)' : 'var(--ok)';
    const arco = sv('circle', { class: 'arco', cx: c, cy: c, r: R, fill: 'none', stroke: cor, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-dasharray': circ, 'stroke-dashoffset': reduzMov() ? circ * (1 - f) : circ, transform: `rotate(-90 ${c} ${c})` });
    const ang = 2 * Math.PI * (marca ?? 0) - Math.PI / 2;
    const el = h('div', { class: 'anel', role: 'img', 'aria-label': `${titulo}: ${texto}` },
      sv('svg', { viewBox: `0 0 ${S} ${S}` },
        sv('circle', { cx: c, cy: c, r: R, fill: 'none', stroke: 'var(--grade)', 'stroke-width': sw }), arco,
        marca != null && sv('line', { x1: c + (R - sw) * Math.cos(ang), y1: c + (R - sw) * Math.sin(ang), x2: c + (R + sw) * Math.cos(ang), y2: c + (R + sw) * Math.sin(ang), stroke: 'var(--fg)', 'stroke-width': 2 }),
        sv('text', { x: c, y: c + 10, 'text-anchor': 'middle', style: 'font-size:30px' }, texto)));
    if (!reduzMov()) depois(() => arco.setAttribute('stroke-dashoffset', circ * (1 - f)));
    return dica(el, () => textoDica);
  }
  function barra(frac, tipo) {
    const i = h('i', { class: tipo || '' });
    const w = `${Math.max(0, Math.min(100, frac * 100))}%`;
    if (reduzMov()) i.style.width = w; else depois(() => { i.style.width = w; });
    return h('div', { class: 'barra', 'aria-hidden': 'true' }, i);
  }
  // Mini barra horizontal dentro de `el`: valor de 0 a max. opcoes: { tipo: 'bom' | 'ruim' | '' }.
  function miniBarra(el, valor, max, opcoes = {}) {
    el.append(barra(max > 0 ? valor / max : 0, opcoes.tipo));
    return el;
  }
  // Sparkline em SVG dentro de `el`. valores: números em ordem. opcoes: { largura, altura, cor, area, ponto (marca o último), min, max, rotulo }.
  function sparkline(el, valores, opcoes = {}) {
    const vs = valores.filter((v) => Number.isFinite(v));
    const W = opcoes.largura || Math.max(60, el.clientWidth || 100), H = opcoes.altura || 24, cor = opcoes.cor || 'var(--acento)', p = 3;
    if (vs.length < 2) { el.replaceChildren(); return el; }
    const lo = opcoes.min ?? Math.min(...vs), hi = opcoes.max ?? Math.max(...vs), span = hi - lo || 1;
    const X = (i) => p + (i / (vs.length - 1)) * (W - 2 * p), Y = (v) => H - p - ((v - lo) / span) * (H - 2 * p);
    const d = vs.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
    const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opcoes.rotulo || 'Tendência', class: 'spark' },
      opcoes.area && sv('path', { d: `${d}L${X(vs.length - 1)},${H - p}L${X(0)},${H - p}Z`, fill: cor, opacity: 0.15 }),
      sv('path', { d, fill: 'none', stroke: cor, 'stroke-width': 1.8, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
      opcoes.ponto && sv('circle', { cx: X(vs.length - 1), cy: Y(vs[vs.length - 1]), r: 2.8, fill: cor }));
    el.replaceChildren(svg);
    return el;
  }
  function tabela(colunas, linhas, opcoes = {}) {
    const corpo = h('tbody');
    for (const r of linhas) {
      const tr = h('tr', { class: [opcoes.destaque && opcoes.destaque(r) ? 'destaque' : '', opcoes.aoClicar ? 'clicavel' : ''].filter(Boolean).join(' '), tabindex: opcoes.aoClicar ? '0' : null, title: opcoes.aoClicar ? (opcoes.dicaClique || 'Clique para abrir') : null });
      if (opcoes.aoClicar) { tr.addEventListener('click', () => opcoes.aoClicar(r)); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') opcoes.aoClicar(r); }); }
      for (const c of colunas) {
        const td = h('td', { class: [c.cls, c.wr ? 'wrcel' : ''].filter(Boolean).join(' ') }, c.f(r));
        if (c.wr) { const w = c.wr(r), cor = w >= 0.5 ? 'var(--ok)' : 'var(--bad)'; td.classList.add(cls(w)); td.style.backgroundImage = `linear-gradient(${cor},${cor})`; td.style.backgroundSize = `${Math.round(w * 100)}% 3px`; }
        tr.append(td);
      }
      corpo.append(tr);
    }
    return h('div', { class: 'rolar' }, h('table', null, h('thead', null, h('tr', null, ...colunas.map((c) => h('th', null, c.t)))), corpo));
  }
  const cWr = { t: 'Win rate', f: (r) => pct(r.wr), wr: (r) => r.wr };
  // Tabela com cabeçalhos clicáveis (ordenar). col.k = chave, col.v = valor para ordenar, col.info = texto do ⓘ do cabeçalho.
  function tabelaOrdenavel(colunas, linhas) {
    const caixa = h('div', { class: 'cabeca' });
    const pintar = () => {
      const col = colunas.find((c) => c.k === UI.sort) || colunas[1];
      const ord = [...linhas].sort((a, b) => { const x = col.v(a), y = col.v(b); return (typeof x === 'string' ? x.localeCompare(y) : (x ?? -1) - (y ?? -1)) * UI.dir; });
      const t = tabela(colunas, ord);
      t.querySelectorAll('th').forEach((th, i) => {
        const c = colunas[i], ativo = c.k === col.k;
        const b = h('button', { type: 'button', class: 'ordenar' + (ativo ? ' ativo' : ''), 'aria-label': `Ordenar por ${c.t}`, onclick: () => { if (UI.sort === c.k) UI.dir = -UI.dir; else { UI.sort = c.k; UI.dir = typeof c.v(ord[0] || {}) === 'string' ? 1 : -1; } pintar(); } }, c.t, ativo ? (UI.dir < 0 ? ' ▼' : ' ▲') : '');
        th.replaceChildren(...[b, c.info ? infoIcone(c.info) : null].filter(Boolean)); th.setAttribute('aria-sort', ativo ? (UI.dir < 0 ? 'descending' : 'ascending') : 'none');
      });
      caixa.replaceChildren(t);
    };
    pintar();
    return caixa;
  }

  // ---------- gráficos ----------
  function ticks(lo, hi, n = 4) {
    const span = hi - lo || 1, raw = span / n, mag = 10 ** Math.floor(Math.log10(raw)), f = raw / mag;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag, out = [];
    for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  // Barras de win rate (uma por linha de `rows`: { mes, wr, v, d, kd, partidas }).
  function barrasWr(el, rows, rotulo = (d) => mesNome(d.mes)) {
    const W = Math.max(280, el.clientWidth), H = 230, m = { t: 22, r: 8, b: 40, l: 40 };
    const bw = (W - m.l - m.r) / rows.length, larg = Math.min(46, bw * 0.75);
    const y = (v) => m.t + (1 - v) * (H - m.t - m.b);
    const svg = sv('svg', { width: '100%', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Win rate por mês' });
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      svg.append(sv('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t === 0.5 ? 'linha-ref' : 'linha-grade' }), sv('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end' }, pct(t)));
    }
    rows.forEach((d, i) => {
      const cx = m.l + bw * i + bw / 2, alt = (H - m.b) - y(d.wr);
      const r = sv('rect', { class: 'alvo', x: cx - larg / 2, width: larg, y: y(d.wr), height: Math.max(1, alt), rx: 3, fill: d.wr >= 0.5 ? 'var(--ok)' : 'var(--bad)', 'fill-opacity': 0.85 });
      dica(r, () => `${rotulo(d)}: ${pct(d.wr)} · ${d.v}V ${d.d}D · K/D ${n2(d.kd)}`);
      svg.append(r);
      if (bw > 30) svg.append(sv('text', { class: 'forte', x: cx, y: y(d.wr) - 5, 'text-anchor': 'middle' }, pct(d.wr)));
      svg.append(sv('text', { x: cx, y: H - m.b + 16, 'text-anchor': 'middle' }, rotulo(d)), sv('text', { x: cx, y: H - m.b + 30, 'text-anchor': 'middle', 'fill-opacity': 0.7 }, d.partidas));
    });
    el.replaceChildren(svg);
  }
  // Gráfico de linhas genérico: series [{pts:[{x,y,tip}], cor, w, dash, pontos}], rótulos do eixo x [{x,t}].
  function linhas(el, { series, xlabels, ref, fmt, h: H = 210, nome }) {
    const W = Math.max(260, el.clientWidth), m = { t: 16, r: 14, b: 26, l: 42 };
    const todos = series.flatMap((s) => s.pts.map((p) => p.y)).concat(ref == null ? [] : [ref]);
    if (!todos.length) return el.replaceChildren(h('p', { class: 'vazio' }, 'Sem dados.'));
    const tk = ticks(Math.min(...todos), Math.max(...todos)), lo = tk[0], hi = tk[tk.length - 1] || lo + 1;
    const xs = series.flatMap((s) => s.pts.map((p) => p.x)), x0 = Math.min(...xs), x1 = Math.max(...xs);
    const X = (v) => (x1 === x0 ? (m.l + W - m.r) / 2 : m.l + ((v - x0) / (x1 - x0)) * (W - m.l - m.r));
    const Y = (v) => m.t + (1 - (v - lo) / (hi - lo || 1)) * (H - m.t - m.b);
    const svg = sv('svg', { width: '100%', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': nome });
    for (const t of tk) svg.append(sv('line', { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: 'linha-grade' }), sv('text', { x: m.l - 6, y: Y(t) + 4, 'text-anchor': 'end' }, fmt(t)));
    if (ref != null) svg.append(sv('line', { x1: m.l, x2: W - m.r, y1: Y(ref), y2: Y(ref), class: 'linha-ref' }));
    let ultimoX = -1e9;
    for (const l of xlabels) { const px = X(l.x); if (px - ultimoX < 38) continue; ultimoX = px; svg.append(sv('text', { x: px, y: H - 6, 'text-anchor': 'middle' }, l.t)); }
    for (const s of series) {
      svg.append(sv('path', { d: s.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(''), fill: 'none', stroke: s.cor, 'stroke-width': s.w || 2, 'stroke-dasharray': s.dash || null, 'stroke-linejoin': 'round' }));
      if (s.pontos) for (const p of s.pts) svg.append(sv('circle', { cx: X(p.x), cy: Y(p.y), r: 3.5, fill: s.cor }));
    }
    const marcas = series.map((s) => sv('circle', { r: 5, fill: s.cor, stroke: 'var(--card)', 'stroke-width': 2, visibility: 'hidden' }));
    const guia = sv('line', { y1: m.t, y2: H - m.b, stroke: 'var(--ref)', visibility: 'hidden' });
    svg.append(guia, ...marcas);
    const base = series[0].pts;
    const cap = sv('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent', style: 'touch-action:pan-y' });
    cap.addEventListener('pointermove', (ev) => {
      const r = svg.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W;
      let melhor = 0, dist = 1e9; base.forEach((p, i) => { const d = Math.abs(X(p.x) - px); if (d < dist) { dist = d; melhor = i; } });
      guia.setAttribute('x1', X(base[melhor].x)); guia.setAttribute('x2', X(base[melhor].x)); guia.setAttribute('visibility', 'visible');
      series.forEach((s, j) => { const p = s.pts[melhor]; if (p) { marcas[j].setAttribute('cx', X(p.x)); marcas[j].setAttribute('cy', Y(p.y)); marcas[j].setAttribute('visibility', 'visible'); } });
      mostrarDica(ev, base[melhor].tip);
    });
    cap.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') { esconderDica(); guia.setAttribute('visibility', 'hidden'); marcas.forEach((c) => c.setAttribute('visibility', 'hidden')); } });
    cap.setAttribute('data-dica', '1');
    svg.append(cap);
    el.replaceChildren(svg);
  }
  const rotulosMeses = (ms) => { const v = new Set(), out = []; ms.forEach((m, i) => { const k = C.mesDe(m); if (!v.has(k)) { v.add(k); out.push({ x: i, t: mesNome(k) }); } }); return out; };
  // Grade (heatmap): linhas × colunas com win rate e partidas. celula(nome, chaveColuna) -> { wr, v, d, kd, adr, partidas } ou null.
  function grade(el, nomes, cols, celula, rotL = 120) {
    const cw = 52, ch = 36, topo = 22;
    const W = Math.max(el.clientWidth, rotL + cols.length * cw + 8), H = topo + nomes.length * ch + 4, cw2 = (W - rotL - 8) / cols.length;
    const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Grade de win rate' });
    cols.forEach((c, i) => svg.append(sv('text', { x: rotL + i * cw2 + cw2 / 2, y: 14, 'text-anchor': 'middle' }, c.t)));
    nomes.forEach((nome, li) => {
      const yy = topo + li * ch;
      svg.append(sv('text', { class: 'forte', x: 0, y: yy + ch / 2 + 4 }, nome.length > 16 ? nome.slice(0, 15) + '…' : nome));
      cols.forEach((c, i) => {
        const d = celula(nome, c.k), xx = rotL + i * cw2;
        if (!d) { svg.append(sv('rect', { x: xx + 2, y: yy + 2, width: cw2 - 4, height: ch - 4, rx: 4, fill: 'var(--grade)', opacity: 0.35 })); return; }
        const r = sv('rect', { class: 'alvo', x: xx + 2, y: yy + 2, width: cw2 - 4, height: ch - 4, rx: 4, fill: d.wr >= 0.5 ? 'var(--ok)' : 'var(--bad)', 'fill-opacity': Math.min(1, 0.18 + Math.abs(d.wr - 0.5) * 2.4), stroke: c.k === 'ano' ? 'var(--mudo)' : 'none' });
        dica(r, () => `${nome} · ${c.t}: ${pct(d.wr)} (${d.v}V ${d.d}D) · K/D ${n2(d.kd)} · ADR ${n1(d.adr)}`);
        svg.append(r, sv('text', { class: 'forte', x: xx + cw2 / 2, y: yy + ch / 2 + 1, 'text-anchor': 'middle', 'pointer-events': 'none' }, pct(d.wr)), sv('text', { x: xx + cw2 / 2, y: yy + ch / 2 + 13, 'text-anchor': 'middle', 'pointer-events': 'none', style: 'font-size:10px' }, d.partidas));
      });
    });
    el.replaceChildren(svg);
  }
  // Ranking em barras: linhasR [{ rotulo, ...campos }], campo = chave numérica da barra (max = valor da barra cheia).
  function ranking(linhasR, campo, max, textoLinha, dicaLinha, cl = '') {
    const box = h('div', { class: 'rank ' + cl, role: 'list' });
    for (const d of linhasR) {
      const frac = Math.max(0.02, Number(d[campo]) / max);
      const l = h('div', { role: 'listitem' }, h('span', { class: 'nome' }, d.rotulo), barra(frac, campo === 'wr' ? (d.wr >= 0.5 ? 'bom' : 'ruim') : ''), h('em', null, textoLinha(d)));
      dica(l, () => dicaLinha(d));
      box.append(l);
    }
    return box;
  }
  // Cinco cards de resumo (win rate e K/D em anel; ADR, HS% e KAST em barra) a partir de C.grupo(...) ou de um membro.
  const heroGrupo = (A, tituloKd = 'K/D') => h('section', { class: 'hero', 'aria-label': 'Resumo' },
    h('div', { class: 'card' }, h('span', { class: 'rot' }, 'Win rate'), anel(A.wr, pct(A.wr), 0.5, 'Win rate', `${pl(A.v, 'vitória', 'vitórias')} e ${pl(A.d, 'derrota', 'derrotas')}${A.e ? ` e ${pl(A.e, 'empate', 'empates')}` : ''} (marca em 50%)`),
      h('div', { class: 'mini' }, h('span', null, h('b', null, A.partidas), A.partidas === 1 ? ' partida' : ' partidas'), h('span', null, h('b', { class: 'ok' }, A.v), A.v === 1 ? ' vitória' : ' vitórias'), h('span', null, h('b', { class: 'bad' }, A.d), A.d === 1 ? ' derrota' : ' derrotas'))),
    h('div', { class: 'card' }, h('span', { class: 'rot' }, tituloKd), anel(A.kd / 2, n2(A.kd), 0.5, 'K/D', `K/D ${n2(A.kd)} (anel cheio = 2,00; marca em 1,00)`),
      h('div', { class: 'mini' }, h('span', null, h('b', null, A.k.toLocaleString('pt-BR')), ' abates'), h('span', null, h('b', null, A.mortes.toLocaleString('pt-BR')), ' mortes'))),
    h('div', { class: 'card' }, h('span', { class: 'rot' }, 'ADR'), h('div', { class: 'grande' }, n1(A.adr)), barra(A.adr / 100), h('div', { class: 'mini' }, 'dano por rodada')),
    h('div', { class: 'card' }, h('span', { class: 'rot' }, 'HS%'), h('div', { class: 'grande' }, pct(A.hsPct)), barra(A.hsPct), h('div', { class: 'mini' }, 'abates com headshot')),
    h('div', { class: 'card' }, h('span', { class: 'rot' }, 'KAST'), h('div', { class: 'grande' }, pct(A.kastPct)), barra(A.kastPct), h('div', { class: 'mini' }, 'rodadas com impacto')));

  // ---------- registro de abas e blocos ----------
  // registrarAba({ id, titulo, ordem, oculta, aceitaVazio, apelidos, render(el, ctx), rotaLer(resto, E), rotaEscrever(E) })
  //   Sem render, a aba é só a soma dos seus blocos. oculta: fora do menu (ex.: a página de um membro).
  //   aceitaVazio: renderiza mesmo sem partidas no filtro. rotaLer/rotaEscrever: o que vem depois de "#id/" no link.
  // registrarBloco({ aba, id, ordem, render(el, ctx) }): render coloca o conteúdo em `el` (ou devolve nó/lista de nós).
  GT.registrarAba = (a) => { GT.abas = GT.abas.filter((x) => x.id !== a.id).concat([{ ordem: 100, ...a }]); };
  GT.registrarBloco = (b) => { GT.blocos = GT.blocos.filter((x) => !(x.aba === b.aba && x.id === b.id)).concat([{ ordem: 100, ...b }]); };
  GT.aoMudarAno = (f) => GT.ganchosAno.push(f); // f() roda quando o usuário troca o ano (limpar estado local da aba)

  GT.u = { passaMapa, $, h, sv, pôr, MESES, MESES_LONGOS, mesNome, pct, n1, n2, dataBR, dataCurta, cls, pl, lista, guardar, ler, reduzMov, depois, nomeResultado, MIN_LINE, AMOSTRA,
    dica, mostrarDica, esconderDica, infoIcone, avisar, E, UI, dados, membrosAno, filtrar, descFiltro, filtrado, limparFiltros, coberturaTexto, paramsTexto, gravarEstado,
    rotuloMembro, linkMembro, avatar, chipMembro, chipsMembros, card, vazioFiltro, grafico, anel, barra, miniBarra, sparkline, tabela, cWr, tabelaOrdenavel,
    ticks, barrasWr, linhas, rotulosMeses, grade, ranking, heroGrupo, render: () => render(), lista_, somarDias, menosMeses };

  // ---------- render ----------
  const painel = $('#painel');
  function criarCtx(F) {
    const memo = new Map();
    return { E, UI, F, ms: F.ms, todas: F.todas, D: dados(), ano: E.ano, info: dados().info, membros: membrosAno(), C, G, u: GT.u,
      cache: (chave, fn) => { if (!memo.has(chave)) memo.set(chave, fn()); return memo.get(chave); } };
  }
  function montarAba(aba, ctx) {
    const nos = [];
    if (aba.render) { const w = h('div', { class: 'bloco', 'data-bloco': 'aba' }); try { const r = aba.render(w, ctx); if (r) pôr(w, [r]); } catch (e) { console.error(e); w.append(h('p', { class: 'vazio' }, 'Erro ao desenhar esta aba.')); } nos.push(w); }
    for (const b of GT.blocos.filter((x) => x.aba === aba.id).sort((x, y) => x.ordem - y.ordem)) {
      const w = h('div', { class: 'bloco', 'data-bloco': b.id });
      try { const r = b.render(w, ctx); if (r) pôr(w, [r]); } catch (e) { console.error(e); w.append(h('p', { class: 'vazio' }, `Erro ao desenhar o bloco "${b.id}".`)); }
      nos.push(w);
    }
    return nos;
  }

  // Seleção múltipla de mapas: botão com resumo + lista de caixinhas ("Todos" no topo). No celular a lista abre como folha por baixo.
  function resumoMapas() { const n = E.mapas.length; return n === 0 ? 'Todos' : n <= 2 ? E.mapas.join(' + ') : `${n} mapas`; }
  function seletorMapas(mapas) {
    const aberto = !!UI.mapasAberto;
    const alternar = (nome) => { E.mapas = E.mapas.includes(nome) ? E.mapas.filter((x) => x !== nome) : [...E.mapas, nome].sort(); if (E.mapas.length === mapas.length) E.mapas = []; UI.mapasFoco = 'mapa:' + nome; render(); };
    const caixa = (id, rotulo, marcado, onchange) => h('label', { class: 'multi-op' }, h('input', { type: 'checkbox', 'data-foco': id, checked: marcado, onchange }), h('span', null, rotulo));
    const lista = h('div', { class: 'multi-lista', role: 'group', 'aria-label': 'Mapas' },
      h('div', { class: 'multi-folha-topo' }, h('strong', null, 'Mapas'), h('button', { type: 'button', class: 'btn pequeno', onclick: () => { UI.mapasAberto = false; render(); } }, 'Fechar')),
      caixa('todos', 'Todos', E.mapas.length === 0, () => { E.mapas = []; UI.mapasFoco = 'todos'; render(); }),
      ...mapas.map((m) => caixa('mapa:' + m, m, E.mapas.includes(m), () => alternar(m))));
    const btn = h('button', { type: 'button', class: 'btn multi-btn', 'aria-haspopup': 'true', 'aria-expanded': String(aberto), onclick: () => { UI.mapasAberto = !UI.mapasAberto; UI.mapasFoco = null; render(); } }, resumoMapas(), h('span', { class: 'multi-seta', 'aria-hidden': 'true' }, '▾'));
    return h('div', { class: 'multi-caixa' }, btn, aberto && h('div', { class: 'multi-fundo', onclick: () => { UI.mapasAberto = false; render(); } }), aberto && lista);
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && UI.mapasAberto) { UI.mapasAberto = false; render(); } });
  function barraFiltros(F) {
    const box = $('#filtros'); box.replaceChildren(); box.hidden = false;
    const D = dados(), mapas = [...new Set(D.partidas.map((m) => m.mp))].sort();
    E.mapas = E.mapas.filter((m) => mapas.includes(m));
    const opt = (v, t, atual) => h('option', { value: v, selected: v === atual }, t);
    box.append(...[
      h('label', null, 'Período', h('select', { onchange: (e) => { E.per = e.target.value; render(); } }, opt('ano', `Ano todo (${E.ano})`, E.per), opt('6m', 'Últimos 6 meses', E.per), opt('30d', 'Últimos 30 dias', E.per), opt('n', 'Últimas X partidas', E.per))),
      E.per === 'n' && h('label', null, 'X', h('input', { type: 'number', min: 1, max: 999, value: E.n, onchange: (e) => { E.n = Math.max(1, Math.floor(Number(e.target.value)) || 20); render(); } })),
      h('div', { class: 'multi' }, h('span', { class: 'multi-rot' }, 'Mapa'), seletorMapas(mapas)),
      filtrado() && h('button', { class: 'btn pequeno', type: 'button', onclick: limparFiltros }, 'Limpar filtros'),
      h('span', { class: 'conta' }, `${F.ms.length} de ${pl(D.info.geladeira, 'partida', 'partidas')} da Geladeira`)].filter(Boolean));
  }
  function render() {
    desenhos.length = 0; esconderDica();
    if (!G.anos.includes(E.ano)) E.ano = G.anos[G.anos.length - 1];
    const F = filtrar();
    gravarEstado();
    $('#sel-ano').value = E.ano;
    const aba = abaAtual();
    for (const a of document.querySelectorAll('#abas a')) { const at = a.dataset.aba === E.aba || (E.aba === 'membro' && a.dataset.aba === 'membros'); if (at) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); a.href = '#' + a.dataset.aba + '?' + paramsTexto(); }
    barraFiltros(F);
    if (UI.mapasAberto && UI.mapasFoco) { const f = [...document.querySelectorAll('.multi-lista input')].find((i) => i.getAttribute('data-foco') === UI.mapasFoco); if (f) f.focus(); }
    let conteudo;
    if (!dados().partidas.length) conteudo = [h('p', { class: 'vazio' }, `Sem partidas da Geladeira em ${E.ano}.`)];
    else if (!F.ms.length && !(aba && aba.aceitaVazio)) conteudo = [h('header', { class: 'cabeca' }, h('h1', null, 'Geladeira Tracker')), vazioFiltro()];
    else conteudo = montarAba(aba, criarCtx(F));
    painel.replaceChildren(...conteudo);
    desenhos.forEach((f) => f());
    // Cada card ganha uma cor da paleta (--c1 a --c6), em sequência na página.
    painel.querySelectorAll('.card').forEach((c, i) => c.style.setProperty('--cor', `var(--c${(i % 6) + 1})`));
    const I = dados().info, gerado = G.geradoEm ? `${dataBR(G.geradoEm.slice(0, 10))} ${G.geradoEm.slice(11)}` : '—';
    $('#rodape').textContent = `Geladeira Tracker · gerado em ${gerado} · base: ${pl(I.totalBase, 'partida', 'partidas')} de ${E.ano}, ${I.geladeira} da Geladeira (${F.ms.length} nesta visão) · ${coberturaTexto()}`;
    document.title = E.aba === 'membro' ? `${E.membro} · Geladeira Tracker` : 'Geladeira Tracker';
  }

  // ---------- cabeçalho: menu, ano, link, tema, busca ----------
  function iniciar() {
    if (!G || !C || !G.anos || !G.anos.length) { painel.replaceChildren(h('p', { class: 'vazio' }, 'Dados não encontrados. Gere o site com: npm run tracker')); return; }
    // Menu: uma aba por registro (menos as ocultas), em ordem.
    $('#abas').replaceChildren(...GT.abas.filter((a) => !a.oculta).sort((x, y) => x.ordem - y.ordem).map((a) => h('a', { href: '#' + a.id, 'data-aba': a.id }, a.titulo)));
    const selAno = $('#sel-ano');
    selAno.replaceChildren(...[...G.anos].reverse().map((a) => h('option', { value: a }, a)));
    selAno.addEventListener('change', () => { E.ano = selAno.value; E.mapas = []; E.destaqueAdv = null; GT.ganchosAno.forEach((f) => f()); render(); });
    $('#btn-link').addEventListener('click', () => {
      gravarEstado();
      const url = location.href;
      const fallback = () => { const t = h('textarea', { estilo: 'position:fixed;opacity:0' }, url); document.body.append(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch { /* sem cópia */ } t.remove(); avisar(ok ? 'Link copiado' : 'Não foi possível copiar; copie da barra de endereço'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => avisar('Link copiado'), fallback); else fallback();
    });
    // Botão de tema com texto: mostra para qual tema ele leva ("Modo claro" quando o site está escuro e vice-versa).
    const temaAtual = () => document.documentElement.getAttribute('data-tema') || (matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'escuro');
    const btnTema = $('#btn-tema');
    const rotularTema = () => {
      const claro = temaAtual() === 'claro';
      btnTema.replaceChildren(h('span', { class: 'tema-ico', 'aria-hidden': 'true' }, claro ? '☾' : '☀'), h('span', { class: 'tema-txt' }, claro ? 'Modo escuro' : 'Modo claro'));
      btnTema.setAttribute('aria-label', claro ? 'Mudar para o modo escuro' : 'Mudar para o modo claro');
      btnTema.title = btnTema.getAttribute('aria-label');
    };
    const aplicarTema = (t) => { if (t) document.documentElement.setAttribute('data-tema', t); else document.documentElement.removeAttribute('data-tema'); rotularTema(); };
    aplicarTema(ler('geladeira.tema'));
    btnTema.classList.add('btn-tema');
    btnTema.addEventListener('click', () => { const novo = temaAtual() === 'claro' ? 'escuro' : 'claro'; aplicarTema(novo); guardar('geladeira.tema', novo); });
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', rotularTema);
    // Voltar ao topo: aparece depois de rolar uma tela.
    const voltar = h('button', { type: 'button', class: 'voltar-topo', 'aria-label': 'Voltar ao topo', title: 'Voltar ao topo', onclick: () => window.scrollTo({ top: 0, behavior: reduzMov() ? 'auto' : 'smooth' }) }, '↑');
    document.body.append(voltar);
    window.addEventListener('scroll', () => voltar.classList.toggle('ver', window.scrollY > window.innerHeight * 0.8), { passive: true });
    // Busca de membro ou adversário (com apelidos de tracker\grupo.json).
    const busca = $('#busca'), res = $('#busca-res');
    const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    function buscar(q) {
      q = semAcento(q.trim()); if (!q) return [];
      const D = dados(), ap = G.apelidos || {}, out = new Map();
      const alvos = [...membrosAno().map((nick) => ({ nick, tipo: 'membro' })), ...D.adversarios.map((a) => ({ nick: a.jogador, tipo: 'adversário' }))];
      for (const t of alvos) {
        if (out.has(t.nick)) continue;
        const via = Object.entries(ap).find(([k, v]) => v === t.nick && semAcento(k).includes(q));
        if (semAcento(t.nick).includes(q) || via) out.set(t.nick, { ...t, via: via && !semAcento(t.nick).includes(q) ? via[0] : null });
      }
      return [...out.values()].slice(0, 12);
    }
    function irPara(r) {
      res.hidden = true; busca.value = '';
      if (r.tipo === 'membro') location.hash = '#membro/' + encodeURIComponent(r.nick) + '?' + paramsTexto();
      else { E.destaqueAdv = r.nick; location.hash = '#adversarios?' + paramsTexto(); render(); }
    }
    busca.addEventListener('input', () => {
      if (!busca.value.trim()) { res.hidden = true; return; }
      const rs = buscar(busca.value);
      res.replaceChildren(...(rs.length ? rs.map((r) => h('button', { type: 'button', role: 'option', onclick: () => irPara(r) }, h('span', null, r.tipo === 'membro' ? avatar(r.nick, 18) : null, ' ', r.nick, r.via && h('small', null, ` (${r.via})`)), h('small', null, r.tipo))) : [h('p', null, 'Ninguém com esse nome neste ano.')]));
      res.hidden = false;
    });
    busca.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const rs = buscar(busca.value); if (rs[0]) irPara(rs[0]); } if (e.key === 'Escape') { res.hidden = true; busca.blur(); } });
    document.addEventListener('click', (e) => { if (!e.target.closest('.busca')) res.hidden = true; });
    let larguraAnterior = innerWidth, tRes = 0;
    addEventListener('resize', () => { clearTimeout(tRes); tRes = setTimeout(() => { if (innerWidth !== larguraAnterior) { larguraAnterior = innerWidth; render(); } }, 160); });
    addEventListener('hashchange', () => { lerHash(); render(); window.scrollTo(0, 0); });
    lerHash();
    render();
  }
  // As abas (abas\*.js) carregam depois deste arquivo; o site começa quando todos os scripts já se registraram.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
