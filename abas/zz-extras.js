// Extras visuais (frente D): decora a tabela de membros (mini barras, tendência, medalha), números que contam e modo TV.
// Não registra aba nem bloco: observa o painel e o cabeçalho, sem editar o núcleo nem as outras abas.
(function () {
  'use strict';
  const GT = window.GT;
  if (!GT || !GT.u) return;
  const { h, sv, E, $, pct, n1, n2, pl, dica, infoIcone, miniBarra, reduzMov, avisar, paramsTexto, dados, membrosAno, filtrar, somarDias } = GT.u;
  const C = GT.C;
  const painel = $('#painel');
  if (!painel) return;

  document.documentElement.classList.add('z-extras');

  // ---------- 1. tabela de membros ----------
  const MIN_MEDALHA = 10; // partidas mínimas para concorrer à medalha
  const MIN_TEND = 3; // partidas mínimas nos últimos 30 dias para mostrar tendência
  const METRICAS = {
    'K/D': { c: 'kd', f: n2, lim: 0.05, nome: 'K/D' },
    ADR: { c: 'adr', f: n1, lim: 2, nome: 'ADR' },
    'HS%': { c: 'hsPct', f: pct, lim: 0.02, nome: 'HS%' },
    KAST: { c: 'kastPct', f: pct, lim: 0.015, nome: 'KAST' },
  };
  const TXT_INFO = 'Seta: compara os últimos 30 dias do ano com o ano todo (precisa de 3 partidas ou mais nos 30 dias; sem seta quando a diferença é pequena). Medalha: melhor da coluna entre quem tem 10 partidas ou mais no filtro. A barra usa o maior valor do grupo como escala.';

  function medalha() {
    return sv('svg', { class: 'z-medalha', viewBox: '0 0 16 16', width: 13, height: 13, 'aria-hidden': 'true' },
      sv('path', { d: 'M4 1h3l1 4H5zM12 1H9L8 5h3z', fill: 'var(--acento)' }),
      sv('circle', { cx: 8, cy: 10.5, r: 4.2, fill: 'var(--aviso)' }),
      sv('circle', { cx: 8, cy: 10.5, r: 2.2, fill: 'none', stroke: 'var(--card)', 'stroke-width': 1.1 }));
  }

  function decorarMembros(tabela) {
    tabela.setAttribute('data-z', '1');
    const D = dados();
    const linhasF = C.membros(filtrar().ms, membrosAno());
    const ano = new Map(C.membros(D.partidas, membrosAno()).map((r) => [r.jogador, r]));
    const corte = somarDias(D.info.ultima, -30);
    const rec = new Map(C.membros(D.partidas.filter((m) => m.d >= corte), membrosAno()).map((r) => [r.jogador, r]));
    const idx = {};
    tabela.querySelectorAll('thead th').forEach((th, i) => { const t = (th.querySelector('button') || th).childNodes[0]; const nome = t && t.textContent.trim(); if (METRICAS[nome]) idx[nome] = i; });
    const porNome = new Map(linhasF.map((r) => [r.jogador, r]));
    for (const [nome, i] of Object.entries(idx)) {
      const M = METRICAS[nome];
      const max = Math.max(0, ...linhasF.map((r) => r[M.c]));
      const elegiveis = linhasF.filter((r) => r.partidas >= MIN_MEDALHA);
      const melhor = elegiveis.length ? elegiveis.reduce((a, b) => (b[M.c] > a[M.c] ? b : a)) : null;
      tabela.querySelectorAll('tbody tr').forEach((tr) => {
        const td = tr.children[i], link = tr.querySelector('a');
        const r = link && porNome.get(link.textContent.trim());
        if (!td || !r) return;
        const txt = td.textContent;
        td.classList.add('z-cel');
        const topo = h('span', { class: 'z-v' }, h('span', { class: 'z-num' }, txt));
        const a = ano.get(r.jogador), c30 = rec.get(r.jogador);
        if (a && c30 && c30.partidas >= MIN_TEND) {
          const dif = c30[M.c] - a[M.c];
          if (Math.abs(dif) >= M.lim) {
            const sobe = dif > 0;
            const seta = h('span', { class: 'z-seta ' + (sobe ? 'ok' : 'bad') }, sobe ? '↑' : '↓');
            dica(seta, () => `${M.nome} nos últimos 30 dias: ${M.f(c30[M.c])} (${pl(c30.partidas, 'partida', 'partidas')}), contra ${M.f(a[M.c])} no ano.`);
            topo.append(seta);
          }
        }
        if (melhor && melhor.jogador === r.jogador) {
          const m = h('span', { class: 'z-med' }, medalha());
          dica(m, () => `Melhor ${M.nome} do grupo (mínimo de ${MIN_MEDALHA} partidas).`);
          topo.append(m);
        }
        td.replaceChildren(topo);
        miniBarra(td, r[M.c], max, {});
      });
    }
    const nota = tabela.closest('.card') && tabela.closest('.card').querySelector('.nota');
    if (nota && !nota.querySelector('.z-info')) { const i = infoIcone(TXT_INFO); i.classList.add('z-info'); nota.append(' ', i); }
  }

  function varrerMembros() {
    if (E.aba !== 'visao') return;
    const t = painel.querySelector('[data-bloco="membros"] table:not([data-z])');
    if (t) { try { decorarMembros(t); } catch (e) { console.error(e); } }
  }

  // ---------- 2. números que contam ----------
  const jaContou = new Set();
  function contar() {
    if (reduzMov()) return;
    const chave = E.aba;
    if (jaContou.has(chave)) return;
    const alvos = [...painel.querySelectorAll('.grande, .anel text, .seq b, .dest-nome')].filter((el) => !el.children.length && /^\d+(\.\d+)?/.test(el.textContent.trim()));
    if (!alvos.length) return;
    jaContou.add(chave);
    const itens = alvos.map((el) => { const m = el.textContent.trim().match(/^(\d+(?:\.\d+)?)(.*)$/); return { el, fim: el.textContent, v: parseFloat(m[1]), dec: (m[1].split('.')[1] || '').length, suf: m[2] }; });
    const t0 = performance.now(), DUR = 600;
    const passo = (agora) => {
      const f = Math.min(1, (agora - t0) / DUR), e = 1 - Math.pow(1 - f, 3);
      for (const it of itens) it.el.textContent = f >= 1 ? it.fim : (it.v * e).toFixed(it.dec) + it.suf;
      if (f < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  let agendado = false;
  function aoMudar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => { agendado = false; varrerMembros(); contar(); });
  }
  new MutationObserver(aoMudar).observe(painel, { childList: true, subtree: true });
  aoMudar();

  // ---------- 3. modo TV ----------
  const INTERVALO = 20000;
  let tv = null;
  function abasTv() { return GT.abas.filter((a) => !a.oculta).sort((x, y) => x.ordem - y.ordem); }
  function ir(id) { location.hash = '#' + id + '?' + paramsTexto(); }
  function sairTv() {
    if (!tv) return;
    cancelAnimationFrame(tv.raf); document.removeEventListener('click', tv.clique, true); document.removeEventListener('keydown', tv.tecla, true);
    document.removeEventListener('fullscreenchange', tv.fs);
    tv.barra.remove(); document.documentElement.classList.remove('z-tv');
    const dentro = document.fullscreenElement; tv = null;
    if (dentro && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }
  function ligarTv() {
    if (tv) return;
    const lista = abasTv(), barraEl = h('div', { class: 'z-tv-barra', 'aria-hidden': 'true' }, h('i'));
    document.body.append(barraEl);
    document.documentElement.classList.add('z-tv');
    const est = { barra: barraEl, ini: performance.now(), pos: Math.max(0, lista.findIndex((a) => a.id === E.aba)), pediuTela: false };
    tv = est;
    est.tecla = (e) => { if (e.key === 'Escape') { e.preventDefault(); sairTv(); } };
    est.clique = (e) => { if (performance.now() - est.t0 < 400) return; e.preventDefault(); e.stopPropagation(); sairTv(); };
    est.fs = () => { if (est.pediuTela && !document.fullscreenElement) sairTv(); };
    est.t0 = performance.now();
    document.addEventListener('keydown', est.tecla, true);
    document.addEventListener('click', est.clique, true);
    document.addEventListener('fullscreenchange', est.fs);
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().then(() => { est.pediuTela = true; }, () => { avisar('Tela cheia recusada; o modo TV segue na janela. Esc ou um clique sai.'); });
    else avisar('Tela cheia indisponível; o modo TV segue na janela. Esc ou um clique sai.');
    // Rolagem: um quadro por frame, linear, do topo ao fim da aba dentro dos 20 s (1,5 s parado no topo e 2,5 s no fim).
    // Aba que cabe na tela fica parada; com prefers-reduced-motion não rola (mostra o topo). A altura é medida a cada quadro.
    const ATRASO_TOPO = 1500, ATRASO_FIM = 2500, se = document.scrollingElement || document.documentElement;
    const quadro = (agora) => {
      if (tv !== est) return;
      const f = Math.min(1, (agora - est.ini) / INTERVALO);
      barraEl.firstChild.style.width = (f * 100) + '%';
      const alt = Math.max(0, se.scrollHeight - se.clientHeight);
      if (reduzMov() || alt < 8) { if (se.scrollTop !== 0) se.scrollTop = 0; }
      else { const p = Math.min(1, Math.max(0, (agora - est.ini - ATRASO_TOPO) / (INTERVALO - ATRASO_TOPO - ATRASO_FIM))); se.scrollTop = Math.min(alt, alt * p); }
      if (f >= 1) { est.ini = agora; est.pos = (est.pos + 1) % lista.length; se.scrollTop = 0; ir(lista[est.pos].id); }
      est.raf = requestAnimationFrame(quadro);
    };
    est.ini = performance.now(); est.raf = requestAnimationFrame(quadro);
  }
  const btn = h('button', { type: 'button', id: 'btn-tv', class: 'btn', title: 'Modo TV: tela cheia, passa as abas a cada 20 segundos (Esc ou um clique sai)', onclick: () => { if (tv) sairTv(); else ligarTv(); } }, 'Modo TV');
  const acoes = $('.topo-acoes');
  if (acoes) acoes.prepend(btn);
})();
