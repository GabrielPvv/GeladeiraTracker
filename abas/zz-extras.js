// Extras visuais (frente D): números que contam e modo TV. Não registra aba nem bloco: observa o painel e o cabeçalho, sem editar o núcleo nem as outras abas.
// U6: a decoração da tabela de membros (mini barras, setas de 30 dias, medalha) saiu; a tabela de Jogadores (membros.js) marca o líder e a forma por conta própria. Decoração futura de tabela deve achar a coluna pelo data-col do th, nunca pelo texto do cabeçalho (A7).
(function () {
  'use strict';
  const GT = window.GT;
  if (!GT || !GT.u) return;
  const { h, E, $, reduzMov, avisar, paramsTexto } = GT.u;
  const painel = $('#painel');
  if (!painel) return;

  document.documentElement.classList.add('z-extras');

  // ---------- 1. números que contam ----------
  const jaContou = new Set();
  function contar() {
    if (reduzMov()) return;
    const chave = E.aba;
    if (jaContou.has(chave)) return;
    const alvos = [...painel.querySelectorAll('.grande, .anel text, .seq b, .dest-nome')].filter((el) => !el.children.length && /^\d+(?:[.]\d{3})*(?:,\d+)?/.test(el.textContent.trim()));
    if (!alvos.length) return;
    jaContou.add(chave);
    const itens = alvos.map((el) => { const m = el.textContent.trim().match(/^(\d+(?:[.]\d{3})*(?:,\d+)?)(.*)$/); return { el, fim: el.textContent, v: parseFloat(m[1].replace(/[.]/g, '').replace(',', '.')), dec: (m[1].split(',')[1] || '').length, suf: m[2] }; });
    const t0 = performance.now(), DUR = 600;
    const passo = (agora) => {
      const f = Math.min(1, (agora - t0) / DUR), e = 1 - Math.pow(1 - f, 3);
      for (const it of itens) it.el.textContent = f >= 1 ? it.fim : GT.u.num(it.v * e, it.dec) + it.suf;
      if (f < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  let agendado = false;
  function aoMudar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => { agendado = false; contar(); });
  }
  new MutationObserver(aoMudar).observe(painel, { childList: true, subtree: true });
  aoMudar();

  // ---------- 2. modo TV ----------
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
