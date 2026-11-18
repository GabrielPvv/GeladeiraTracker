// Aba "Lines": quadro de lineup arrastável (banco, 5 vagas do time e "Fora") com resultado ao vivo, e o ranking das lines.
// O quadro vai para o link: #lines/time=a,b,c/fora=x,y. Pointer Events (mouse e toque) e menu por teclado como alternativa ao arrastar.
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { $, h, pct, n1, n2, dataBR, pl, lista, cls, E, UI, dados, membrosAno, card, tabela, cWr, rotuloMembro, avatar, chipsMembros, vazioFiltro, reduzMov, esconderDica, gravarEstado, render, lista_, AMOSTRA, nomeResultado } = GT.u;
  Object.assign(UI, { ordem: 'wr', tam: 0, min: 8, time: [null, null, null, null, null], fora: [], arrastouEm: 0 });

  GT.registrarAba({ id: 'lines', titulo: 'Lines', ordem: 30, aceitaVazio: true,
    rotaLer(resto) {
      const ms = membrosAno();
      for (const seg of resto) {
        const [k, v = ''] = seg.split('=');
        const nomes = lista_(v).filter((x) => ms.includes(x));
        if (k === 'time') { UI.time = [...nomes.slice(0, 5), null, null, null, null, null].slice(0, 5); UI.fora = UI.fora.filter((x) => !nomes.includes(x)); }
        if (k === 'fora') UI.fora = nomes.filter((x) => !UI.time.includes(x));
      }
    },
    rotaEscrever() { return (UI.time.some(Boolean) ? '/time=' + UI.time.filter(Boolean).join(',') : '') + (UI.fora.length ? '/fora=' + UI.fora.join(',') : ''); } });
  GT.aoMudarAno(() => { UI.time = Array(5).fill(null); UI.fora = []; });

  // ----- lines: quadro de lineup arrastável -----
  const VAGAS = 5;
  let caixaLineup = null, caixaRanking = null, ultimoF = null, menuAberto = null;
  const noTime = () => UI.time.filter(Boolean);
  const livre = () => membrosAno().filter((n) => !UI.time.includes(n) && !UI.fora.includes(n));
  const localDe = (n) => { const i = UI.time.indexOf(n); return i >= 0 ? { z: 'slot', i } : UI.fora.includes(n) ? { z: 'fora' } : { z: 'banco' }; };
  // Região aria-live fora do quadro (o quadro é redesenhado a cada mudança): o leitor de tela anuncia a mudança.
  const vivo = h('div', { class: 'so-leitor', id: 'lineup-live', role: 'status', 'aria-live': 'polite' }); document.body.append(vivo);
  function anunciar(t) { vivo.textContent = ''; setTimeout(() => { vivo.textContent = t; }, 30); }
  const tabelaLines = (ls) => tabela([{ t: 'Membros', f: (r) => chipsMembros(r.nomes), cls: 'quebra' }, { t: 'Part.', f: (r) => r.partidas }, { t: 'V', f: (r) => r.v }, { t: 'D', f: (r) => r.d }, cWr, { t: 'K/D', f: (r) => n2(r.kd) }, { t: 'ADR', f: (r) => n1(r.adr) }], ls, { aoClicar: (r) => carregarLine(r.nomes), dicaClique: 'Carregar esta line no quadro' });

  function mover(n, dest) {
    const orig = localDe(n);
    if (orig.z === 'slot') UI.time[orig.i] = null;
    UI.fora = UI.fora.filter((x) => x !== n);
    if (dest.z === 'slot') {
      const outro = UI.time[dest.i]; UI.time[dest.i] = n;
      if (outro) { if (orig.z === 'slot') UI.time[orig.i] = outro; else if (orig.z === 'fora') UI.fora.push(outro); }
      anunciar(`${n} no time, vaga ${dest.i + 1}${outro ? `; ${outro} saiu da vaga` : ''}`);
    } else if (dest.z === 'fora') { UI.fora.push(n); anunciar(`${n} fora: só partidas sem ele`); }
    else anunciar(`${n} de volta ao banco`);
  }
  function carregarLine(nomes) {
    UI.time = [...nomes.slice(0, VAGAS), ...Array(VAGAS).fill(null)].slice(0, VAGAS); UI.fora = [];
    gravarEstado(); desenharLineup();
    caixaLineup.scrollIntoView({ behavior: reduzMov() ? 'auto' : 'smooth', block: 'start' });
    anunciar(`Line carregada no quadro: ${lista(nomes)}`);
  }
  function zonaEm(x, y) {
    const el = document.elementFromPoint(x, y), z = el && el.closest && el.closest('[data-zona]');
    if (!z) return null;
    const v = z.dataset.zona; return v.startsWith('slot:') ? { z: 'slot', i: Number(v.slice(5)), el: z } : { z: v, el: z };
  }
  function iniciarArrasto(ev, n, chip) {
    if (ev.button > 0) return;
    const x0 = ev.clientX, y0 = ev.clientY; let arrastando = false, ghost = null, alvo = null;
    try { chip.setPointerCapture(ev.pointerId); } catch { /* sem captura */ }
    const andar = (e) => {
      if (!arrastando && Math.hypot(e.clientX - x0, e.clientY - y0) > 6) {
        arrastando = true; fecharMenu(); esconderDica();
        ghost = chip.cloneNode(true); ghost.classList.add('fantasma'); ghost.style.width = chip.offsetWidth + 'px'; document.body.append(ghost); chip.classList.add('arrastando');
      }
      if (!arrastando) return;
      ghost.style.left = e.clientX - ghost.offsetWidth / 2 + 'px'; ghost.style.top = e.clientY - ghost.offsetHeight / 2 + 'px';
      const novo = zonaEm(e.clientX, e.clientY);
      if (!alvo || !novo || alvo.el !== novo.el) { if (alvo) alvo.el.classList.remove('sobre'); if (novo) novo.el.classList.add('sobre'); }
      alvo = novo;
    };
    const fim = () => {
      chip.removeEventListener('pointermove', andar); chip.removeEventListener('pointerup', fim); chip.removeEventListener('pointercancel', fim);
      if (!arrastando) return;
      ghost.remove(); if (alvo) alvo.el.classList.remove('sobre');
      UI.arrastouEm = performance.now();
      if (alvo) { mover(n, alvo); gravarEstado(); } desenharLineup();
    };
    chip.addEventListener('pointermove', andar); chip.addEventListener('pointerup', fim); chip.addEventListener('pointercancel', fim);
  }
  function fecharMenu(devolverFoco) {
    if (!menuAberto) return;
    const { el, chip } = menuAberto; menuAberto = null; el.remove();
    if (devolverFoco && chip.isConnected) chip.focus();
  }
  function abrirMenu(n, chip) {
    fecharMenu();
    const org = localDe(n), vaga = UI.time.indexOf(null);
    const itens = [
      ['Pôr no time', () => { mover(n, { z: 'slot', i: vaga }); }, vaga < 0 || org.z === 'slot'],
      ['Pôr fora', () => mover(n, { z: 'fora' }), org.z === 'fora'],
      ['Voltar ao banco', () => mover(n, { z: 'banco' }), org.z === 'banco']];
    const menu = h('div', { class: 'menu-chip', role: 'menu', 'aria-label': `Ações para ${n}` }, ...itens.map(([t, f, off]) => h('button', { type: 'button', role: 'menuitem', disabled: off,
      onclick: () => { menuAberto = null; menu.remove(); f(); gravarEstado(); desenharLineup(); const novo = caixaLineup.querySelector(`[data-nick="${CSS.escape(n)}"]`); if (novo) novo.focus(); } }, t)));
    const cr = chip.getBoundingClientRect(), br = caixaLineup.getBoundingClientRect();
    menu.style.top = cr.bottom - br.top + 4 + 'px'; menu.style.left = Math.max(0, Math.min(cr.left - br.left, br.width - 170)) + 'px';
    menu.addEventListener('keydown', (e) => {
      const bs = [...menu.querySelectorAll('button:not([disabled])')], i = bs.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); fecharMenu(true); }
      else if (e.key === 'Tab') fecharMenu();
    });
    caixaLineup.append(menu); menuAberto = { el: menu, chip };
    const primeiro = menu.querySelector('button:not([disabled])'); if (primeiro) primeiro.focus();
  }
  document.addEventListener('pointerdown', (e) => { if (menuAberto && !e.target.closest('.menu-chip') && !e.target.closest('.mchip')) fecharMenu(); });

  function chipArrastavel(n, geral) {
    const ap = rotuloMembro(n), w = geral.get(n);
    const chip = h('button', { type: 'button', class: 'mchip', 'data-nick': n, 'aria-haspopup': 'menu', 'aria-label': `${n}${ap !== n ? ` (${ap})` : ''}${w ? `, win rate geral ${pct(w.wr)}` : ''}. Enter abre o menu; arraste para mover.` },
      h('span', { class: 'mchip-topo' }, avatar(n, 20), h('span', { class: 'mchip-nome' }, ap)), ap !== n && h('span', { class: 'mchip-nick' }, n), w && h('span', { class: 'mchip-wr ' + cls(w.wr) }, pct(w.wr)));
    chip.addEventListener('pointerdown', (e) => iniciarArrasto(e, n, chip));
    chip.addEventListener('click', (e) => { if (e.detail > 0 && performance.now() - (UI.arrastouEm || -1e9) < 350) return; abrirMenu(n, chip); });
    return chip;
  }

  // Resultado ao vivo do quadro.
  function resultadoLineup(F) {
    const time = noTime(), fora = UI.fora;
    if (!time.length && !fora.length) return [h('p', { class: 'vazio' }, 'Arraste membros do banco para as vagas do time (ou para "Fora") para ver o resultado. Também dá para tocar num membro e escolher no menu.')];
    const base = F.todas, sel = C.comSem(base, time, fora);
    const titulo = time.length === VAGAS ? 'Line exata' : time.length ? `Partidas com ${lista(time)}${fora.length ? `, sem ${lista(fora)}` : ''}` : `Partidas sem ${lista(fora)}`;
    if (!sel.length) return [h('h3', { class: 'rot' }, titulo), h('p', { class: 'vazio' }, 'Sem partidas com essa combinação no período e mapa escolhidos.')];
    const a = C.grupo(sel), k = C.somarMembros(sel, time);
    const caixa = (rotulo, v, c) => h('div', { class: 'seq' }, h('span', { class: 'rot' }, rotulo), h('b', { class: c || '' }, v));
    const out = [h('h3', { class: 'rot' }, titulo),
      h('p', { class: 'frase' }, h('b', null, pl(a.partidas, 'partida', 'partidas')), ` · ${a.v}-${a.d} · `, h('b', { class: cls(a.wr) }, pct(a.wr))),
      h('div', { class: 'resultado' }, caixa('Partidas', a.partidas), caixa('V - D', `${a.v} - ${a.d}`), caixa('Win rate', pct(a.wr), cls(a.wr)), caixa('K/D', n2(k.kd)), caixa('ADR', n1(k.adr))),
      h('p', { class: 'nota' }, `K/D e ADR são ${time.length ? `de ${lista(time)}` : 'dos membros em campo'} nessas partidas.${a.mistas ? ` ${pl(a.mistas, 'partida', 'partidas')} com membros nos dois times ficam fora do win rate.` : ''}`)];
    if (time.length >= 1 && time.length < VAGAS) {
      const linhasC = livre().map((m) => { const g = C.grupo(C.comSem(base, [...time, m], fora)); return { m, g }; }).filter((x) => x.g.partidas > 0);
      linhasC.sort((x, y) => ((y.g.partidas >= AMOSTRA) - (x.g.partidas >= AMOSTRA)) || y.g.wr - x.g.wr || y.g.partidas - x.g.partidas);
      out.push(h('h3', { class: 'rot' }, 'Quem completa melhor'));
      out.push(linhasC.length ? h('div', { class: 'completa' }, ...linhasC.map(({ m, g }) => h('button', { type: 'button', class: 'comp-linha', title: `Pôr ${m} no time`, onclick: () => { const v = UI.time.indexOf(null); if (v >= 0) { mover(m, { z: 'slot', i: v }); gravarEstado(); desenharLineup(); } } },
        h('span', { class: 'comp-nome' }, rotuloMembro(m)), h('b', { class: 'comp-wr ' + cls(g.wr) }, pct(g.wr)), h('small', null, `${g.v}-${g.d} · ${pl(g.partidas, 'partida', 'partidas')}`, g.partidas < AMOSTRA && h('span', { class: 'selo' }, 'amostra pequena')))))
        : h('p', { class: 'vazio' }, 'Nenhum membro do banco jogou junto com essa seleção.'));
      out.push(h('p', { class: 'nota' }, 'Win rate se o membro entrar no time, com as mesmas partidas do período e mapa. Quem tem 8 partidas ou mais vem primeiro; clique para pôr no time.'));
    }
    return out;
  }

  function desenharLineup() {
    fecharMenu();
    const F = ultimoF, geral = new Map(C.membros(F.todas, membrosAno()).map((r) => [r.jogador, r]));
    const slots = UI.time.map((n, i) => h('div', { class: 'slot' + (n ? ' cheio' : ''), 'data-zona': `slot:${i}` }, h('span', { class: 'slot-n' }, `Vaga ${i + 1}`), n ? chipArrastavel(n, geral) : h('span', { class: 'slot-vazio' }, 'vazia')));
    const banco = h('div', { class: 'zona banco', 'data-zona': 'banco', 'aria-label': 'Banco' }, ...livre().map((n) => chipArrastavel(n, geral)), !livre().length && h('span', { class: 'slot-vazio' }, 'banco vazio'));
    const fora = h('div', { class: 'zona fora', 'data-zona': 'fora', 'aria-label': 'Fora' }, ...UI.fora.map((n) => chipArrastavel(n, geral)), !UI.fora.length && h('span', { class: 'slot-vazio' }, 'arraste para cá: só partidas sem eles'));
    caixaLineup.replaceChildren(
      h('div', { class: 'quadro' },
        h('div', null, h('h3', { class: 'rot' }, 'Banco'), banco),
        h('div', null, h('h3', { class: 'rot' }, `Time (${noTime().length}/${VAGAS})`), h('div', { class: 'slots' }, ...slots)),
        h('div', null, h('h3', { class: 'rot' }, 'Fora'), fora),
        h('div', { class: 'controles' }, h('button', { class: 'btn', type: 'button', onclick: () => { UI.time = Array(VAGAS).fill(null); UI.fora = []; gravarEstado(); desenharLineup(); anunciar('Quadro limpo'); } }, 'Limpar'))),
      h('div', { class: 'lineup-res' }, ...resultadoLineup(F)));
  }

  function atualizarRanking() {
    let ls = C.combos(ultimoF.ms, membrosAno()).filter((c) => (!UI.tam || c.tamanho === UI.tam) && c.partidas >= UI.min);
    ls = ls.sort({ wr: (x, y) => y.wr - x.wr || y.partidas - x.partidas, wrmenor: (x, y) => x.wr - y.wr || y.partidas - x.partidas, partidas: (x, y) => y.partidas - x.partidas || y.wr - x.wr }[UI.ordem]);
    caixaRanking.replaceChildren(ls.length ? tabelaLines(ls.slice(0, 15)) : h('p', { class: 'vazio' }, 'Nenhuma line com esse mínimo de partidas. Baixe o mínimo ou mude o tamanho.'), ls.length > 15 && h('p', { class: 'nota' }, `Mostrando 15 de ${ls.length} lines.`));
  }

  GT.registrarBloco({ aba: 'lines', id: 'montador', ordem: 10, render(el, ctx) {
    ultimoF = ctx.F;
    if (!ctx.F.todas.length) { el.append(vazioFiltro()); return; }
    caixaLineup = h('div', { class: 'lineup' });
    desenharLineup();
    el.append(card('Montador de line', 'Arraste os membros do banco para as 5 vagas do time e para "Fora" (só partidas sem eles), ou toque num membro e escolha no menu. Usa o período e o mapa dos filtros. Só partidas sem membros nos dois times entram no win rate.', caixaLineup));
  } });

  GT.registrarBloco({ aba: 'lines', id: 'ranking', ordem: 20, render(el, ctx) {
    ultimoF = ctx.F;
    if (!ctx.F.todas.length) return;
    caixaRanking = h('div', { class: 'cabeca' });
    const ctrl = h('div', { class: 'controles' },
      h('label', null, 'Ordenar por', h('select', { onchange: (e) => { UI.ordem = e.target.value; atualizarRanking(); } }, ...[['wr', 'Win rate (maior)'], ['wrmenor', 'Win rate (menor)'], ['partidas', 'Partidas']].map(([v, t]) => h('option', { value: v, selected: UI.ordem === v }, t)))),
      h('label', null, 'Tamanho', h('select', { onchange: (e) => { UI.tam = Number(e.target.value); atualizarRanking(); } }, ...[['0', 'Todos'], ['2', 'Duplas'], ['3', 'Trios'], ['4', '4 membros'], ['5', 'Time fechado (5)']].map(([v, t]) => h('option', { value: v, selected: String(UI.tam) === v }, t)))),
      h('label', null, 'Mínimo de partidas', h('input', { type: 'number', min: 2, max: 60, step: 1, value: UI.min, onchange: (e) => { UI.min = Math.max(2, Number(e.target.value) || 8); atualizarRanking(); } })));
    atualizarRanking();
    el.append(card('Ranking das lines', 'Cada linha é um grupo de membros que estava no mesmo time ao mesmo tempo. Clique numa linha para carregá-la no quadro acima. K/D e ADR são dos membros da line. Respeita período e mapa.', ctrl, caixaRanking));
  } });
})();