// Aba "Partidas" (U3a). Duas subabas dentro do mesmo item do menu:
//  - #partidas: TODAS as partidas da Geladeira do ano (D.partidas), agrupadas por dia, seguindo o filtro de período e mapa.
//    A que tem análise completa (demo + rodada a rodada da GC, ctx.D.jogos) leva a #demos/<id>; a outra expande na própria linha com os números dos membros.
//  - #demos: as partidas com análise completa (gerada por src/tracker/jogos.mjs). Não segue o filtro. #demos/<id> é a página da partida.
// O id da partida é o id da partida na GC (texto numérico). Rotas antigas: #partidas/<id> abre #demos/<id>.
// Página da partida (U3b): cabeçalho de e-sports, faixa de rodadas e 4 abas internas (Placar, Rodadas, Jogadores, Análise).
// Rota: #demos/<id>[/rodadas/<n> | /jogadores/<nick> | /analise]. Só a rodada escolhida é desenhada.
(function () {
  'use strict';
  const GT = window.GT, GTCalc = window.GTCalc;
  const { h, card, pl, E, UI, avatar, rotuloMembro, infoIcone, pct, n1, nomeMapa, iconeMapa, chipMembro, tabela, vazioFiltro, paramsTexto, dica, sv, lista: listaNomes, nomeResultado, MESES_LONGOS, mesNome } = GT.u;

  const dataBR = (d) => (d ? GT.u.dataBR(d) : ''); // sempre com ano
  const diaExtenso = (d) => `${+d.slice(8, 10)} de ${MESES_LONGOS[+d.slice(5, 7) - 1].toLowerCase()} de ${d.slice(0, 4)}`;
  const link = (rota) => '#' + rota + '?' + paramsTexto();
  const linkDemo = (id) => '#demos/' + id + '?' + paramsTexto();

  // ---------- registro: duas rotas, um item no menu ----------
  GT.registrarAba({ id: 'partidas', titulo: 'Partidas', ordem: 62, aceitaVazio: true, apelidos: ['jogos', 'partida'],
    // Link antigo (#partidas/<id>, inclusive os do relatório do bot) abre a mesma partida em #demos.
    rotaLer(resto, e) { UI.jogo = null; if (resto[0]) { e.aba = 'demos'; lerPartida(resto); } },
    rotaEscrever() { return ''; },
    render(el, ctx) { el.append(...todas(ctx)); } });
  GT.registrarAba({ id: 'demos', titulo: 'Demos', oculta: true, pai: 'partidas', filtros: false, aceitaVazio: true,
    rotaLer(resto) { lerPartida(resto); },
    rotaEscrever() { return UI.jogo ? caminhoPartida(UI.jogo, UI.pAba, UI.pAba === 'rodadas' ? UI.pRod : UI.pAba === 'jogadores' ? UI.jogoJog : null) : ''; },
    render(el, ctx) { el.append(...demos(ctx)); } });

  // ---------- rota da partida (X7): aba e rodada/jogador escolhidos ficam no endereço ----------
  const ABAS_P = ['placar', 'rodadas', 'jogadores', 'analise'];
  function lerPartida(resto) {
    UI.jogo = resto[0] || null;
    UI.pAba = ABAS_P.includes(resto[1]) ? resto[1] : 'placar';
    UI.pRod = UI.pAba === 'rodadas' && Number(resto[2]) >= 1 ? Math.floor(Number(resto[2])) : null;
    UI.jogoJog = UI.pAba === 'jogadores' && resto[2] ? resto[2] : null;
  }
  function caminhoPartida(id, aba, extra) {
    let s = '/' + id;
    if (aba && aba !== 'placar') { s += '/' + aba; if (extra) s += '/' + encodeURIComponent(extra); }
    return s;
  }
  const linkP = (id, aba, extra) => '#demos' + caminhoPartida(id, aba, extra) + '?' + paramsTexto();

  function subabas(ativa, D) {
    const item = (id, t, n) => h('a', { class: 'pl-sub' + (ativa === id ? ' ativo' : ''), href: link(id), 'aria-current': ativa === id ? 'page' : null }, t, h('span', { class: 'pl-sub-n' }, ` · ${n}`));
    return h('nav', { class: 'pl-subabas', 'aria-label': 'Partidas' }, item('partidas', 'Todas as partidas', D.partidas.length), item('demos', 'Demos', (D.jogos || []).length));
  }

  // ---------- peças da linha (a mesma nas duas listas) ----------
  const hora = (m) => `${String(m.h).padStart(2, '0')}h`;
  const classeR = (r) => 'r-' + (String(r || 'e').toLowerCase());
  const placarNum = (sn, se, r) => h('span', { class: 'pl-placar ' + (r === 'V' ? 'v' : r === 'D' ? 'd' : '') }, h('b', null, sn), h('i', { 'aria-hidden': 'true' }, '–'), h('span', null, se));
  const vd = (r) => h('span', { class: 'pl-vd', role: 'img', 'aria-label': nomeResultado(r) }, h('span', { class: 'pl-vd-q ' + String(r || '').toLowerCase() }, r === 'X' ? '±' : r));
  const chips = (nomes) => h('span', { class: 'chips-m pl-chips' }, ...nomes.map((n) => chipMembro(n, { avatar: true, tamanho: 16 })));
  const mapaCel = (mp) => h('span', { class: 'pl-mapa' }, iconeMapa(mp), h('span', { class: 'pl-mapa-nome' }, nomeMapa(mp)));
  const descricao = (mp, sn, se, d) => `${nomeMapa(mp)}, ${sn} a ${se}, ${dataBR(d)}`;
  // Peças da linha de partida para outras telas (aba Partidas da página do jogador).
  GT.partidasUI = { hora, classeR, placarNum, vd, mapaCel, descricao, diaExtenso, linkDemo };

  // ---------- #partidas: todas, por dia ----------
  UI.plAbertas = UI.plAbertas || new Set();
  function detalhe(m) {
    const cols = [
      { t: 'Membro', f: (r) => h('a', { href: GT.u.linkMembro(r.n) }, r.n) },
      { t: 'K-D', f: (r) => `${r.k}-${r.m}` },
      { t: 'ADR', f: (r) => (r.rod ? n1(r.dano / r.rod) : '—') },
      { t: 'KAST', f: (r) => (r.rod ? pct(r.kast / r.rod) : '—') },
      { t: 'HS%', f: (r) => (r.k ? pct(r.hs / r.k) : '—') }];
    return h('div', { class: 'pl-det-in' }, tabela(cols, m.mem), h('p', { class: 'nota' }, 'Sem demo nem rodada a rodada da GC: só o placar e os números de cada membro.'));
  }
  function linhaSem(m, i) {
    const aberta = UI.plAbertas.has(i), idDet = 'pl-det-' + i;
    const det = h('div', { class: 'pl-det', id: idDet, hidden: !aberta });
    if (aberta) det.append(detalhe(m));
    const btn = h('button', { type: 'button', class: 'pl-linha', 'aria-expanded': String(aberta), 'aria-controls': idDet, 'aria-label': descricao(m.mp, m.sn, m.se, m.d) + ': mostrar os números dos membros' },
      h('span', { class: 'pl-hora' }, hora(m)), mapaCel(m.mp), placarNum(m.sn, m.se, m.r), vd(m.r), chips(m.mem.map((x) => x.n)), h('span', { class: 'pl-seta', 'aria-hidden': 'true' }, '▸'));
    btn.addEventListener('click', () => {
      const abrir = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(abrir)); det.hidden = !abrir; btn.parentNode.classList.toggle('aberta', abrir);
      if (abrir) { UI.plAbertas.add(i); if (!det.firstChild) det.append(detalhe(m)); } else UI.plAbertas.delete(i);
    });
    return h('li', { class: 'pl-item ' + classeR(m.r) + (aberta ? ' aberta' : '') }, btn, det);
  }
  // Faixa fina de rodadas da lista: um quadradinho por rodada (verde vitória, vermelho derrota da Geladeira), separador na troca de lado. Decorativa; o resumo vai no aria-label da linha.
  function faixaMiniEl(j) {
    const f = GTCalc.faixaMini(j);
    if (!f.itens.length) return null;
    const filhos = [];
    f.itens.forEach((x) => { if (x.sep) filhos.push(h('i', { class: 'pl-fx-sep' })); filhos.push(h('i', { class: 'pl-fx ' + (x.v ? 'v' : 'd') })); });
    return h('span', { class: 'pl-faixa', 'aria-hidden': 'true', title: `Rodadas: ${f.v} ${f.v === 1 ? 'vencida' : 'vencidas'}, ${f.d} ${f.d === 1 ? 'perdida' : 'perdidas'}` }, ...filhos);
  }
  function linhaCom(m, j) {
    const f = GTCalc.faixaMini(j), resumo = f.itens.length ? `; rodadas: ${f.v} ${f.v === 1 ? 'vencida' : 'vencidas'}, ${f.d} ${f.d === 1 ? 'perdida' : 'perdidas'}` : '';
    return h('li', { class: 'pl-item ' + classeR(m.r) },
      h('a', { class: 'pl-linha' + (f.itens.length ? ' com-faixa' : ''), href: linkDemo(j.id), 'aria-label': `Análise completa: ${descricao(m.mp, m.sn, m.se, m.d)}${resumo}` },
        h('span', { class: 'pl-hora' }, hora(m)), mapaCel(m.mp), placarNum(m.sn, m.se, m.r), vd(m.r), chips(m.mem.map((x) => x.n)), h('span', { class: 'selo pl-analise' }, 'análise completa ›'), faixaMiniEl(j)));
  }

  // Linha do tempo: uma coluna por dia jogado, vitórias para cima e derrotas para baixo (mistas e empates em cinza, em cima).
  function linhaTempo(el, ms) {
    const dias = [...new Set(ms.map((m) => m.d))];
    const W = Math.max(el.clientWidth, dias.length * 12 + 40), mL = 16, passo = dias.length > 1 ? (W - 2 * mL) / (dias.length - 1) : 0, g = 11;
    const por = new Map(dias.map((d) => [d, { c: 0, b: 0 }]));
    const pos = ms.map((m) => { const s = por.get(m.d); return m.r === 'D' ? ++s.b : ++s.c; });
    const maxC = Math.max(1, ...[...por.values()].map((s) => s.c)), maxB = Math.max(0, ...[...por.values()].map((s) => s.b));
    const y0 = 12 + maxC * g, H = y0 + maxB * g + 30;
    const svg = sv('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Linha do tempo das partidas da Geladeira: vitórias em cima e derrotas embaixo' });
    svg.append(sv('line', { x1: mL, x2: W - mL, y1: y0 + 3, y2: y0 + 3, class: 'linha-grade' }));
    let mesAnt = '';
    dias.forEach((d, i) => { const k = d.slice(0, 7); if (k !== mesAnt) { mesAnt = k; svg.append(sv('text', { x: mL + i * passo, y: H - 6, 'text-anchor': 'start' }, mesNome(k))); } });
    ms.forEach((m, i) => {
      const cx = mL + dias.indexOf(m.d) * passo, baixo = m.r === 'D';
      const cy = baixo ? y0 + 3 + pos[i] * g - 3 : y0 - (pos[i] - 1) * g - 4;
      const c = sv('circle', { class: 'ponto', cx, cy, r: 4.5, fill: m.r === 'V' ? 'var(--ok)' : baixo ? 'var(--bad)' : 'var(--mudo)' });
      dica(c, () => `${dataBR(m.d)} ${m.h}h · ${nomeMapa(m.mp)} · ${m.sn} a ${m.se} · ${nomeResultado(m.r)} · ${listaNomes(m.mem.map((x) => x.n))}`);
      svg.append(c);
    });
    el.replaceChildren(svg);
  }
  function anoEmPontos(ms) {
    const g = h('div', { class: 'grafico rolar' });
    const d = h('details', { class: 'card pl-pontos', open: !!UI.plPontos },
      h('summary', null, h('span', { class: 'pl-pontos-t' }, 'Ano em pontos'), h('small', { class: 'mudo' }, ' · um ponto por partida: vitória em cima, derrota embaixo')),
      h('p', { class: 'nota' }, 'Cada ponto é uma partida da Geladeira: verde em cima é vitória, vermelho embaixo é derrota (cinza: empate ou membros nos dois times). Passe o dedo ou o mouse para ver o placar e quem jogou.'),
      g, h('div', { class: 'legenda' }, h('span', null, h('i', { estilo: 'background:var(--ok)' }), 'vitória'), h('span', null, h('i', { estilo: 'background:var(--bad)' }), 'derrota')));
    const desenhar = () => { if (d.open) linhaTempo(g, ms); };
    d.addEventListener('toggle', () => { UI.plPontos = d.open; desenhar(); });
    GT.u.depois(desenhar);
    return d;
  }

  function todas(ctx) {
    const D = ctx.D, ms = ctx.ms, topo = [h('h1', { class: 'so-leitor' }, 'Geladeira Tracker: partidas'), subabas('partidas', D)];
    if (!ms.length) return [...topo, vazioFiltro()];
    const idx = new Map(D.partidas.map((m, i) => [m, i]));
    let itens = [...ms].reverse().map((m) => ({ m, i: idx.get(m), j: GT.jogoDe ? GT.jogoDe(m, D) : null }));
    const nAnalise = itens.filter((x) => x.j).length;
    if (UI.soAnalise) itens = itens.filter((x) => x.j);
    const corpo = [];
    let dia = null, ul = null;
    for (const x of itens) {
      if (x.m.d !== dia) {
        dia = x.m.d;
        corpo.push(h('h3', { class: 'pl-dia' }, diaExtenso(dia)));
        ul = h('ul', { class: 'pl-lista', 'aria-label': diaExtenso(dia) }); corpo.push(ul);
      }
      ul.append(x.j ? linhaCom(x.m, x.j) : linhaSem(x.m, x.i));
    }
    const sw = h('label', { class: 'pl-so' }, h('input', { type: 'checkbox', checked: !!UI.soAnalise, onchange: (e) => { UI.soAnalise = e.target.checked; GT.u.render(); } }), h('span', null, `Só com análise completa (${nAnalise})`));
    const cab = h('section', { class: 'card pl-cab', 'aria-label': 'Lista de partidas' },
      h('div', { class: 'in-topo' }, h('h2', { class: 'in-titulo' }, `Partidas · ${itens.length} no filtro`), sw),
      h('p', { class: 'nota' }, 'Mais recentes primeiro. Toque numa partida sem análise para ver os números dos membros; a com selo abre a análise completa na aba Demos.'),
      itens.length ? corpo : h('p', { class: 'vazio' }, 'Nenhuma partida com análise completa nesse filtro.'));
    return [...topo, anoEmPontos(ms), cab];
  }

  // ---------- #demos: lista das com análise completa e página da partida ----------
  function demos(ctx) {
    const D = ctx.D, L = [...(D.jogos || [])].sort((a, b) => (b.d + b.h).localeCompare(a.d + a.h));
    const topo = [h('h1', { class: 'so-leitor' }, 'Geladeira Tracker: demos'), subabas('demos', D)];
    if (!L.length) return [...topo, card('Demos', null, h('p', { class: 'nota' }, 'Nenhuma partida com demo analisada neste ano.'))];
    if (UI.jogo) {
      const j = L.find((x) => x.id === UI.jogo);
      if (!j) return [...topo, card({ t: 'Essa partida não tem análise completa', selos: [['sem demo ou sem rodada a rodada', 'aviso']] },
        'A análise completa só existe para as partidas com demo e rodada a rodada da GC.',
        h('p', { class: 'pl-links' }, h('a', { href: link('demos') }, `Ver as ${pl(L.length, 'partida com análise', 'partidas com análise')} →`), h('a', { href: link('partidas') }, 'Todas as partidas →')))];
      const i = L.indexOf(j), nova = L[i - 1], antiga = L[i + 1];
      const vizinha = (x, rotulo, aria) => (x ? h('a', { class: 'pl-viz', href: linkDemo(x.id), 'aria-label': `${aria}: ${descricao(x.mp, x.sn, x.se, x.d)}` }, rotulo) : null);
      return [h('div', { class: 'pl-voltar-l' }, h('a', { class: 'pl-voltar', href: link('demos') }, '← Demos'),
        h('span', { class: 'pl-vizinhas' }, vizinha(antiga, '‹ Mais antiga', 'Partida anterior'), vizinha(nova, 'Mais recente ›', 'Próxima partida'))), ...partida(j, ctx)];
    }
    const aviso = card({ t: 'Demos: a análise completa das partidas', selos: [[pl(L.length, 'demo', 'demos'), 'destaque'], ['não segue o filtro', 'aviso']] }, null,
      h('p', { class: 'pl-aviso' }, 'É a análise feita a partir das demos e do rodada a rodada da GC. Só existem estas porque a GC só guarda a estatística avançada das partidas recentes e o grupo só tem as demos delas.'));
    const ul = h('ul', { class: 'pl-lista', 'aria-label': 'Partidas com análise completa' }, ...L.map((j) =>
      h('li', { class: 'pl-item ' + classeR(j.r) },
        h('a', { class: 'pl-linha pl-demo', href: linkDemo(j.id), 'aria-label': `Abrir a análise: ${descricao(j.mp, j.sn, j.se, j.d)}` },
          h('span', { class: 'pl-hora' }, dataBR(j.d), h('small', null, j.h)), mapaCel(j.mp), placarNum(j.sn, j.se, j.r), vd(j.r),
          chips((j.jogadores || []).map((p) => p.n)), h('span', { class: 'selo pl-analise' }, 'abrir ›')))));
    return [...topo, aviso, h('section', { class: 'card pl-cab', 'aria-label': 'Partidas com análise completa' }, ul)];
  }


  // =====================================================================
  // Página da partida (U3b)
  // =====================================================================
  const RES = { V: ['Vitória', 'ok'], D: ['Derrota', 'bad'], E: ['Empate', ''] };
  const CAT = {
    refem: ['refém', 'Já estava em desvantagem clara (2 ou mais a menos, ou CT atrás com a bomba plantada): a rodada já estava decidida.'],
    abertura: ['abertura perdida', 'Primeira morte da rodada, sem troca.'],
    sozinho: ['morreu sozinho', 'Ninguém trocou a morte em até 5 s.'],
    trocada: ['trocada', 'Um companheiro matou quem matou em até 5 s.'],
  };
  const ECON = { pistol: 'pistol', full: 'compra cheia', force: 'force', eco: 'eco', semi: 'meia compra' };
  const FIMS = { 'bomba explodiu': 'explodiu', 'bomba desarmada': 'desarmada', 'eliminação': 'eliminação', time_expired: 'tempo', 'tempo acabou': 'tempo' };
  const nome = (n) => (rotuloMembro ? rotuloMembro(n) : n);
  const num = (v, d = 1) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const sinal = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');
  const mobile = () => window.innerWidth <= 640;
  const nomeFim = (r) => ({ explodiu: 'bomba explodiu', desarmada: 'bomba desarmada', eliminação: 'eliminação', tempo: 'tempo acabou' }[FIMS[r.fim]] || r.fim || '');

  // Explicações curtas (dica + leitor de tela, não só title).
  const LEGENDA_PESO = 'Peso: medida da GC de quanto o jogador mexeu na rodada. ▲ a favor do time dele, ▼ contra. É um índice, não uma porcentagem, e pode passar de 100.';
  const LEGENDA_LANCE = 'Variação por abate: quanto a chance de a Geladeira ganhar a rodada mudou com aquele abate, em pontos percentuais (+20% aumentou 20 pontos; −15% diminuiu 15).';
  const catSpan = (c) => {
    const [rot, expl] = CAT[c] || [c, ''];
    const el = h('span', { class: 'pt-cat ' + c, tabindex: '0' }, rot, h('span', { class: 'so-leitor' }, ': ' + expl));
    return dica(el, () => expl);
  };
  const th = (t, info, cls) => h('th', { class: cls || null }, t, info ? infoIcone(info) : null);

  function lista(itens, vazio) {
    return itens && itens.length ? h('ul', { class: 'pt-ul' }, ...itens.map((t) => h('li', null, t))) : h('p', { class: 'nota' }, vazio);
  }
  const mescla = (...ls) => { const v = new Set(); for (const l of ls) for (const t of l || []) v.add(t); return [...v]; };

  // ---------- ícones do desfecho (8 px) ----------
  function iconeFim(r) {
    const k = FIMS[r.fim];
    const a = { width: 8, height: 8, viewBox: '0 0 8 8', 'aria-hidden': 'true', class: 'pt-ico' };
    if (k === 'explodiu') return sv('svg', a, sv('path', { d: 'M4 0.5 L7.5 4 L4 7.5 L0.5 4 Z', fill: 'currentColor' }));
    if (k === 'desarmada') return sv('svg', a, sv('path', { d: 'M1 4.2 L3.2 6.3 L7 1.5', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6 }));
    if (k === 'tempo') return sv('svg', a, sv('circle', { cx: 4, cy: 4, r: 2.9, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4 }));
    return sv('svg', a, sv('path', { d: 'M1.3 1.3 L6.7 6.7 M6.7 1.3 L1.3 6.7', stroke: 'currentColor', 'stroke-width': 1.5 }));
  }

  // ---------- faixa de rodadas (P4) ----------
  function faixaRodadas(j) {
    const rs = j.rodadas || [];
    if (!rs.length) return null;
    const filhos = [];
    rs.forEach((r, i) => {
      if (i > 0 && rs[i - 1].lado !== r.lado) filhos.push(h('span', { class: 'pt-sep', 'aria-hidden': 'true' }));
      const sel = UI.pAba === 'rodadas' && UI.pRod === r.n;
      const lado = String(r.lado).toLowerCase();
      const txt = `Rodada ${r.n}, ${GT.u.nomeLado(r.lado)}, ${r.v ? 'vitória' : 'derrota'} da Geladeira (${r.placar})${nomeFim(r) ? ', ' + nomeFim(r) : ''}`;
      const a = h('a', { class: 'pt-q ' + (r.v ? 'v' : 'd') + (sel ? ' sel' : ''), href: linkP(j.id, 'rodadas', r.n), 'aria-label': txt, 'aria-current': sel ? 'true' : null, 'data-r': String(r.n) },
        h('span', { class: 'pt-q-r' }, iconeFim(r)), h('span', { class: 'pt-q-l ' + lado }, lado === 't' ? 'T' : 'C'));
      a.addEventListener('click', () => { UI.rolarRod = true; });
      dica(a, () => `R${r.n} · ${GT.u.nomeLado(r.lado)} · ${r.v ? 'vitória' : 'derrota'} (${r.placar})${nomeFim(r) ? ' · ' + nomeFim(r) : ''}`);
      filhos.push(a);
    });
    const faixa = h('div', { class: 'pt-faixa' }, ...filhos);
    const w = h('div', { class: 'pt-faixa-w', role: 'group', 'aria-label': `Rodadas: ${rs.length}. Toque numa rodada para abrir.` }, faixa);
    GT.u.depois(() => { const s = faixa.querySelector('.sel'); if (s) w.scrollLeft = Math.max(0, s.offsetLeft - w.clientWidth / 2 + 9); });
    return w;
  }

  // ---------- cabeçalho (7.8 item 1) ----------
  function cabecalho(j) {
    const [rot, cls] = RES[j.r] || ['', ''];
    const ven = (a, b) => (a > b ? 'ven' : a < b ? 'per' : 'ven');
    const membros = (j.jogadores || []).map((p) => p.n);
    const placar = h('div', { class: 'pt-placar-g' },
      h('div', { class: 'pt-placar-n', role: 'img', 'aria-label': `Placar: Geladeira ${j.sn}, adversário ${j.se}` },
        h('span', { class: ven(j.sn, j.se) }, String(j.sn)), h('i', { 'aria-hidden': 'true' }, '–'), h('span', { class: ven(j.se, j.sn) }, String(j.se))),
      rot ? GT.u.selo(rot, cls) : null);
    const temFundo = ((GT.G.imagens || {}).mapasFundo || []).includes(j.mp);
    return h('section', { class: 'card pt-cab2' + (temFundo ? ' fundo-mapa' : ''), 'data-mapa': temFundo ? j.mp : null, 'aria-label': 'Partida' },
      h('div', { class: 'pt-times' },
        h('div', { class: 'pt-ft nos' }, h('span', { class: 'pt-ft-n' }, 'Geladeira'),
          membros.length ? h('span', { class: 'pt-ft-chips' }, ...membros.map((n) => chipMembro(n, { avatar: true, tamanho: 20 }))) : null),
        placar,
        h('div', { class: 'pt-ft eles' }, h('span', { class: 'pt-ft-n' }, 'Adversário'))),
      h('p', { class: 'pt-meta' }, iconeMapa(j.mp), h('b', null, nomeMapa(j.mp)), h('span', { class: 'mudo pt-m' }, `· ${dataBR(j.d)} · ${j.h}`),
        j.virada ? h('span', { class: 'pt-virada pt-m' }, '· ' + j.virada) : null,
        h('button', { type: 'button', class: 'btn pequeno btn-compartilhar pt-comp', title: 'Copia um texto curto com o link desta tela', onclick: () => { GT.u.gravarEstado(); GT.u.copiar(GTCalc.textoCompartilharPartida(j, location.href, nomeMapa), 'Texto copiado'); } }, 'Compartilhar'),
        h('a', { class: 'pt-gc', href: 'https://gamersclub.com.br/lobby/partida/' + j.id, target: '_blank', rel: 'noopener' }, 'ver na GC ↗')),
      faixaRodadas(j));
  }

  function abasInternas(j) {
    const itens = [['placar', 'Placar', null], ['rodadas', 'Rodadas', (j.rodadas || []).length], ['jogadores', 'Jogadores', (j.jogadores || []).length], ['analise', 'Análise', null]];
    return h('nav', { class: 'pt-abas', 'aria-label': 'Partes da partida' }, ...itens.map(([id, t, n]) =>
      h('a', { class: 'pt-aba' + (UI.pAba === id ? ' ativo' : ''), href: linkP(j.id, id), 'aria-current': UI.pAba === id ? 'page' : null }, t, n ? h('span', { class: 'pt-aba-n' }, ' ' + n) : null)));
  }

  // ---------- Placar (P3) ----------
  const ratingOk = (x) => (x !== null && x !== undefined && Number.isFinite(Number(x)) && x >= 0 && x <= 5 ? Number(x) : null);
  function blocoPlacar(j, nos) {
    const P = (j.placar || []).filter((x) => !!x.nos === nos);
    const rating = (x) => { const v = ratingOk(x.rt); if (v !== null) return v; const p = (j.jogadores || []).find((y) => y.n === x.n); return p ? ratingOk(p.rating) : null; };
    const L = P.map((x) => ({ x, rt: rating(x) })).sort((a, b) => (b.rt ?? -1) - (a.rt ?? -1) || b.x.k - a.x.k);
    const sec = 'pt-sec';
    const cab = h('tr', null, th('Jogador'), th('K-D'), th('+/-', 'Abates menos mortes.', sec), th('ADR', 'Dano médio por rodada.'),
      th('KAST', 'Parte das rodadas em que o jogador abateu, ajudou, sobreviveu ou teve a morte trocada.', sec), th('HS%', 'Parte dos abates que foi tiro na cabeça.', sec),
      th('1º abate', 'Primeiros abates da rodada feitos pelo jogador.', sec), th('Rating', 'Rating de desempenho do jogador nesta partida, da GC (em torno de 1,00). Não são pontos de ranking.'));
    const linha = ({ x, rt }) => {
      const sa = x.k - x.d;
      return h('tr', { class: x.membro ? 'pt-membro' : null },
        h('td', null, h('div', { class: 'pt-jn' }, x.membro ? avatar(x.n, 20) : null, h('span', { class: 'pt-jn-t' }, nome(x.n)))),
        h('td', null, `${x.k}-${x.d}`),
        h('td', { class: sec + ' ' + (sa > 0 ? 'mais' : sa < 0 ? 'menos' : '') }, sa === 0 ? '0' : sinal(sa) + Math.abs(sa)),
        h('td', null, num(x.adr)),
        h('td', { class: sec }, x.kast == null ? '—' : x.kast + '%'),
        h('td', { class: sec }, x.hs == null ? '—' : x.hs + '%'),
        h('td', { class: sec }, String(x.fk ?? '—')),
        h('td', { class: 'pt-rt' }, rt === null ? '—' : num(rt, 2)));
    };
    const tw = h('div', { class: 'pt-tw' }, h('table', { class: 'pt-tab pt-tab-placar' }, h('thead', null, cab), h('tbody', null, ...L.map(linha))));
    const mais = h('button', { type: 'button', class: 'btn pequeno pt-mais', 'aria-expanded': 'false', onclick: (e) => {
      const abre = !tw.classList.contains('pt-mostra'); tw.classList.toggle('pt-mostra', abre); e.currentTarget.setAttribute('aria-expanded', String(abre)); e.currentTarget.textContent = abre ? 'menos colunas' : 'mais colunas'; } }, 'mais colunas');
    const n = nos ? j.sn : j.se, outro = nos ? j.se : j.sn;
    return h('section', { class: 'card pt-bp ' + (nos ? 'nos' : 'eles'), 'aria-label': nos ? 'Placar da Geladeira' : 'Placar do adversário' },
      h('div', { class: 'pt-bp-cab' }, h('h2', null, nos ? 'Geladeira' : 'Adversário'), h('span', { class: 'pt-bp-n ' + (n >= outro ? 'ven' : 'per') }, h('span', { class: 'mudo' }, 'rodadas '), String(n)), mais),
      L.length ? tw : h('p', { class: 'nota' }, 'Sem jogadores neste time.'));
  }
  function abaPlacar(j) {
    if (!(j.placar || []).length) return [card('Placar', null, h('p', { class: 'nota' }, 'Sem placar desta partida.'))];
    return [blocoPlacar(j, true), blocoPlacar(j, false)];
  }

  // ---------- Rodadas ----------
  const pesoTxt = (x) => { const r = Math.round(x); return `${r > 0 ? '▲ +' : '▼ −'}${Math.abs(r)}`; };
  function peso(x, nos) {
    if (x === null || x === undefined || Math.round(x) === 0) return h('span', { class: 'mudo' }, '—');
    const el = h('span', { class: 'pt-imp ' + (nos ? (x > 0 ? 'mais' : 'menos') : 'neutro'), tabindex: '0' }, pesoTxt(x),
      h('span', { class: 'so-leitor' }, x > 0 ? ' pesou a favor do time' : ' pesou contra o time'));
    return dica(el, () => LEGENDA_PESO);
  }
  const impLance = (x) => (x == null ? null : h('span', { class: 'pt-imp ' + (x > 0 ? 'mais' : x < 0 ? 'menos' : '') }, ` ${x > 0 ? '▲ +' : x < 0 ? '▼ −' : ''}${Math.abs(x)}%`));

  function tabelaRodadaJogadores(r) {
    const P = r.jogadores || [];
    if (!P.length) return null;
    const linha = (x) => h('tr', { class: x.nos ? 'pt-nos' : 'pt-eles' },
      h('td', null, nome(x.n)), h('td', null, `${x.k}-${x.d}`), h('td', null, peso(x.imp, x.nos)),
      h('td', { class: 'pt-sec' }, x.ab ? 'abriu' : x.mp ? 'morreu primeiro' : '—'), h('td', { class: 'pt-sec' }, x.vivo ? 'sim' : 'não'));
    const bloco = (titulo, l) => (l.length ? [h('tr', { class: 'pt-cab-time' }, h('th', { colspan: '5' }, titulo)), ...l.map(linha)] : []);
    return h('div', { class: 'pt-tw' }, h('table', { class: 'pt-tab pt-tab-rod' },
      h('thead', null, h('tr', null, th('Jogador'), th('K-D'), th('Peso', LEGENDA_PESO), th('Abertura', null, 'pt-sec'), th('Vivo no fim', null, 'pt-sec'))),
      h('tbody', null, ...bloco('Geladeira', P.filter((x) => x.nos)), ...bloco('Adversário', P.filter((x) => !x.nos)))));
  }
  function secundariasMobile(r) {
    const P = r.jogadores || [];
    const ab = P.filter((x) => x.ab).map((x) => nome(x.n)), mp = P.filter((x) => x.mp).map((x) => nome(x.n)), vivos = P.filter((x) => x.vivo && x.nos).map((x) => nome(x.n));
    return h('p', { class: 'nota pt-sec-m' }, `Abriu: ${ab.length ? listaNomes(ab) : '—'}. Morreu primeiro: ${mp.length ? listaNomes(mp) : '—'}. Vivos da Geladeira no fim: ${vivos.length ? listaNomes(vivos) : 'nenhum'}.`);
  }
  function rodada(r, j) {
    const N = r.narr || { resumo: '', certo: [], errado: [] };
    const ant = (j.rodadas || []).find((x) => x.n === r.n - 1), prox = (j.rodadas || []).find((x) => x.n === r.n + 1);
    const nav = h('span', { class: 'pt-rod-nav' },
      ant ? h('a', { href: linkP(j.id, 'rodadas', ant.n), 'aria-label': `Rodada ${ant.n}`, onclick: () => { UI.rolarRod = true; } }, `‹ R${ant.n}`) : null,
      prox ? h('a', { href: linkP(j.id, 'rodadas', prox.n), 'aria-label': `Rodada ${prox.n}`, onclick: () => { UI.rolarRod = true; } }, `R${prox.n} ›`) : null);
    const ev = (r.ev || []).map((x) => (x.t === 'p'
      ? h('li', { class: 'plant' }, `${x.s} s · Bomba: ${x.nos ? 'Geladeira plantou' : 'adversário plantou'}${x.site ? ' no ' + x.site : ''}`)
      : h('li', { class: x.nos ? 'nos' : 'eles' }, `${x.s} s · ${x.q} → ${x.v}${x.local ? ' (' + x.local + ')' : ''} · vivos ${x.vivos}`, impLance(x.imp), x.cat ? catSpan(x.cat) : null)));
    return h('section', { class: 'card pt-rod ' + (r.v ? 'v' : 'd'), id: 'pt-rod-' + r.n, 'aria-label': `Rodada ${r.n}` },
      h('div', { class: 'pt-rod-cab' },
        h('h2', null, `R${r.n}`, ' ', h('span', { class: 'pt-lado ' + String(r.lado).toLowerCase() }, GT.u.nomeLado(r.lado)), ' ', GT.u.selo(r.v ? 'Vitória' : 'Derrota', r.v ? 'ok' : 'bad'), h('span', { class: 'pt-rod-pl' }, ` ${r.placar}`)),
        nav),
      h('p', { class: 'pt-rod-res' }, N.resumo || nomeFim(r)),
      h('p', { class: 'pt-econ mudo' }, `Economia: Geladeira ${ECON[r.econ?.nos] || r.econ?.nos || '—'} x adversário ${ECON[r.econ?.eles] || r.econ?.eles || '—'}`),
      tabelaRodadaJogadores(r),
      h('div', { class: 'pt-blocos' },
        h('div', { class: 'pt-bloco bom' }, h('h3', null, 'Deu certo'), lista(N.certo, '—')),
        h('div', { class: 'pt-bloco ruim' }, h('h3', null, 'Para rever'), lista(N.errado, '—'))),
      h('details', { class: 'pt-lance', open: !mobile() }, h('summary', null, mobile() ? 'Lance a lance e detalhes' : 'Lance a lance'),
        secundariasMobile(r), h('ol', { class: 'pt-ev' }, ...ev)));
  }
  function abaRodadas(j) {
    const rs = j.rodadas || [];
    if (!rs.length) return [card('Rodadas', null, h('p', { class: 'nota' }, 'Sem rodada a rodada desta partida.'))];
    const trechos = card('Como foi', 'A partida em trechos: sequências de vitórias ou derrotas no mesmo lado.',
      h('ol', { class: 'pt-trechos' }, ...(j.trechos || []).map((t) => h('li', { class: t.v ? 'v' : 'd' },
        h('a', { class: 'pt-r', href: linkP(j.id, 'rodadas', t.de), onclick: () => { UI.rolarRod = true; } }, `R${t.de}${t.ate > t.de ? '–' + t.ate : ''}`),
        h('span', { class: 'pt-lado ' + String(t.lado).toLowerCase() }, GT.u.nomeLado(t.lado)), h('b', null, t.placar), h('span', { class: 'pt-trecho-t' }, t.texto)))));
    const legenda = h('p', { class: 'nota pt-legenda' }, h('b', null, 'Como ler os números. '), LEGENDA_PESO, ' ', LEGENDA_LANCE,
      h('span', { class: 'pt-leg-f' }, ' Faixa de rodadas: cheio é rodada da Geladeira, só contorno é do adversário; C = CT, T = TR; ◆ bomba explodiu, ✓ desarmada, ✕ eliminação, ○ tempo.'));
    const r = rs.find((x) => x.n === UI.pRod);
    const sel = r ? rodada(r, j) : h('section', { class: 'card pt-rod-vazio' }, h('p', { class: 'nota' }, 'Toque numa rodada da faixa lá em cima, ou num trecho de “Como foi”, para abrir os detalhes dela. Só a rodada escolhida é desenhada.'));
    if (r && UI.rolarRod) { UI.rolarRod = false; GT.u.depois(() => { const e = document.getElementById('pt-rod-' + r.n); if (e) e.scrollIntoView({ block: 'start', behavior: 'auto' }); }); }
    return [sel, legenda, trechos];
  }

  // ---------- Jogadores ----------
  function abaJogadores(j) {
    const L = j.jogadores || [];
    if (!L.length) return [card('Jogadores', null, h('p', { class: 'nota' }, 'Sem jogadores da Geladeira nesta partida.'))];
    if (!UI.jogoJog || !L.some((p) => p.n === UI.jogoJog)) UI.jogoJog = L[0].n;
    const eu = L.find((p) => p.n === UI.jogoJog);
    const seletor = h('nav', { class: 'pt-pils', 'aria-label': 'Escolher jogador da Geladeira' }, ...L.map((p) =>
      h('a', { class: 'pt-pil' + (p.n === eu.n ? ' ativo' : ''), href: linkP(j.id, 'jogadores', p.n), 'aria-current': p.n === eu.n ? 'true' : null }, avatar(p.n, 22), h('span', null, nome(p.n)))));
    return [h('section', { class: 'card pt-jog' }, h('h2', { class: 'so-leitor' }, 'Jogador'), seletor, quadroJogador(eu, j))];
  }
  function quadroJogador(p, j) {
    const stat = (rot, v, info) => h('div', { class: 'pt-stat' }, h('dt', null, rot, info ? infoIcone(info) : null), h('dd', null, v));
    const stats = h('dl', { class: 'pt-stats' },
      stat('Rating', p.rating != null ? num(p.rating, 2) : '—', 'Rating de desempenho da GC nesta partida (em torno de 1,00). Não são pontos de ranking.'),
      stat('K-D', `${p.k}-${p.m}`), stat('ADR', num(p.adr, 0), 'Dano médio por rodada.'),
      stat('Entrada', `${p.ent.g}/${p.ent.t}`, 'Primeiros contatos da rodada ganhos sobre os disputados.'),
      stat('Clutch', `${p.clutch.g}/${p.clutch.t}`, 'Rodadas em que ficou em desvantagem numérica e ganhou, sobre as disputadas.'),
      stat('Utilitária', `${p.util.flashes} flashes`, `Cegou ${p.util.cegou} adversários e causou ${p.util.dano} de dano com granada.`));
    const d = p.decisoes || {};
    const funcionou = mescla(d.acertos, p.fortes);
    const rever = mescla(d.erros, p.melhorar);
    const prior = mescla(p.priorizar, d.pensar);
    const grupo = (t, cls, corpo) => h('div', { class: 'pt-bloco ' + cls }, h('h3', null, t), corpo);
    const g1 = grupo('Lances que funcionaram', 'bom', lista(funcionou, 'Nenhum lance de destaque nesta partida.'));
    const g2 = grupo('Para rever', 'ruim', h('div', null,
      lista(rever, 'Nenhuma morte evitável: as outras foram trocadas ou de refém.'),
      prior.length ? [h('p', { class: 'pt-sublab' }, 'Prioridade para treinar'), lista(prior, '—')] : null,
      (p.naoPriorizar || []).length ? [h('p', { class: 'pt-sublab' }, 'Sem se cobrar'), lista(p.naoPriorizar, '—')] : null));
    const rods = (j.rodadas || []).map((r) => ({ r, x: (r.jogadores || []).find((y) => y.n === p.n) })).filter((o) => o.x);
    const tab = rods.length ? h('div', { class: 'pt-tw' }, h('table', { class: 'pt-tab' },
      h('thead', null, h('tr', null, th('Rodada'), th('Lado'), th('Resultado'), th('K-D'), th('Peso', LEGENDA_PESO), th('Abertura', null, 'pt-sec'), th('Vivo no fim', null, 'pt-sec'))),
      h('tbody', null, ...rods.map(({ r, x }) => h('tr', { class: r.v ? 'pt-nos' : 'pt-eles' },
        h('td', null, h('a', { href: linkP(j.id, 'rodadas', r.n) }, `R${r.n}`)), h('td', null, GT.u.nomeLado(r.lado)), h('td', null, r.v ? 'vitória' : 'derrota'),
        h('td', null, `${x.k}-${x.d}`), h('td', null, peso(x.imp, true)),
        h('td', { class: 'pt-sec' }, x.ab ? 'abriu' : x.mp ? 'morreu primeiro' : '—'), h('td', { class: 'pt-sec' }, x.vivo ? 'sim' : 'não')))))) : h('p', { class: 'nota' }, 'Sem rodada a rodada desta partida.');
    return h('div', { class: 'pt-quadro' },
      h('div', { class: 'pt-jog-topo' }, avatar(p.n, 28), h('b', null, nome(p.n)), p.arma ? h('small', { class: 'mudo' }, ' · ' + p.arma) : null),
      stats,
      h('div', { class: 'pt-blocos' }, g1, g2),
      (p.mortes || []).length ? h('details', { class: 'pt-mortes' }, h('summary', null, `Mortes com contexto (${p.mortes.length})`),
        h('ul', null, ...p.mortes.map((m) => h('li', null, catSpan(m.cat),
          ` R${m.r} ${GT.u.nomeLado(m.lado)} · ${m.s} s · ${m.local || 'local ?'} · por ${m.matador} · vivos antes ${m.vivos}`)))) : null,
      h('details', { class: 'pt-mortes' }, h('summary', null, `Tabela por rodada (${rods.length})`), tab));
  }

  // ---------- Análise ----------
  function abaAnalise(j) {
    const T = j.times || { nos: { fortes: j.decidiu, fracos: j.melhorar }, eles: { fortes: [], fracos: [] } };
    const par = (t, vF, vN) => h('div', { class: 'pt-blocos' },
      h('div', { class: 'pt-bloco bom' }, h('h3', null, 'Pontos fortes'), lista(t.fortes, vF)),
      h('div', { class: 'pt-bloco ruim' }, h('h3', null, 'O que trabalhar'), lista(t.fracos, vN)));
    const geral = card('Análise da Geladeira', null, par(T.nos, 'Nada se destacou.', 'Nada claro a corrigir.'));
    const lados = card('Por lado', null, h('div', { class: 'pt-lados2' },
      h('div', { class: 'pt-lado-b ct' }, h('h3', null, 'Geladeira de CT'), lista(j.lados?.CT, '—')),
      h('div', { class: 'pt-lado-b tr' }, h('h3', null, 'Geladeira de TR'), lista(j.lados?.T, '—'))));
    const eles = (T.eles && ((T.eles.fortes || []).length || (T.eles.fracos || []).length))
      ? h('details', { class: 'card pt-eles-d' }, h('summary', null, 'O que o adversário mostrou'), par(T.eles, '—', '—')) : null;
    return [geral, lados, eles];
  }

  // ---------- a página ----------
  function partida(j) {
    const aba = ABAS_P.includes(UI.pAba) ? UI.pAba : 'placar';
    UI.pAba = aba;
    const corpo = aba === 'rodadas' ? abaRodadas(j) : aba === 'jogadores' ? abaJogadores(j) : aba === 'analise' ? abaAnalise(j) : abaPlacar(j);
    return [h('h1', { class: 'so-leitor' }, `Geladeira Tracker: ${nomeMapa(j.mp)}, ${j.sn} a ${j.se}, ${dataBR(j.d)}`), cabecalho(j), abasInternas(j), h('div', { class: 'pt-corpo', 'data-aba': aba }, ...corpo)];
  }
})();
