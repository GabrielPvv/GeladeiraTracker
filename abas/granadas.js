// Aba "Granadas": por mapa que a Geladeira joga, duas visões:
//   "Essenciais": seleção curada (execução de bomb, meio, atraso de CT) com link para o csnades.gg (abas\granadas-dados.js);
//   "Vídeos do YouTube": vídeos de lineups que a Geladeira achou no YouTube, por mapa e tipo (abas\granadas-pros.js); tocam na janela.
// Cada granada essencial abre numa janela por cima do site: o vídeo do YouTube escolhido para ela (player oficial de incorporação)
// ou, sem vídeo, a página dela no csnades.gg. Nenhum vídeo ou imagem de terceiros é copiado para cá.
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pct, pl, UI, card, render, guardar, ler } = GT.u;
  // Mapas novos que os sites de lineup ainda não têm: entram com links de apoio e os lineups do grupo.
  const NOVOS = { cobblestone: { nome: 'Cobblestone', novo: '17/11/2026', total: 0, granadas: [],
    links: [['Callouts da Cobble nova', 'https://skinsmonkey.com/blog/cobblestone-callouts-cs2/'], ['Vídeos de smokes no YouTube', 'https://www.youtube.com/results?search_query=cobblestone+cs2+smokes+lineups']] } };
  const DADOS = () => ({ ...GT.granadas, ...Object.fromEntries(Object.entries(NOVOS).filter(([k]) => !(GT.granadas || {})[k])) });
  const PROS = () => GT.granadasPros || {};
  const BASE = 'https://csnades.gg/';
  const TIPOS = { smokes: { rot: 'Smoke', cor: 'var(--c1)', plural: 'Smokes' }, molotovs: { rot: 'Molotov', cor: 'var(--c4)', plural: 'Molotovs' }, flashbangs: { rot: 'Flash', cor: 'var(--c5)', plural: 'Flashes' } };
  const AREAS = ['Bomb A', 'Meio', 'Bomb B'];
  const TIPOS_OK = new Set(Object.keys(TIPOS));
  const doGrupo = (slug) => (GT.granadasGrupo || []).filter((n) => n && n.mapa === slug && TIPOS_OK.has(n.tipo)).map((n) => ({ ...n, grupo: true, yt: n.yt || idYTLink(n.link), area: n.area || 'Meio', lado: n.lado || 'T', de: n.de || '?' }));
  const linkSeguro = (u) => (String(u || '').toLowerCase().startsWith('https://') ? u : null);
  // Clipe do grupo: se o link for do YouTube, devolve o id de 11 caracteres (toca na janela); senão, null (só texto).
  const idYTLink = (u) => { const m = String(u || '').match(/^https:[/][/](?:www[.]|m[.])?(?:youtube(?:-nocookie)?[.]com[/](?:watch[?](?:[^#]*&)?v=|embed[/]|shorts[/]|live[/])|youtu[.]be[/])([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/i); return m ? m[1] : null; };

  GT.registrarAba({ id: 'granadas', titulo: 'Granadas', ordem: 45, aceitaVazio: true, apelidos: ['utilitarios'],
    rotaLer(resto) { UI.granMapa = resto[0] || UI.granMapa || null; if (resto[1] === 'pros' || resto[1] === 'essenciais') UI.granFonte = resto[1]; },
    rotaEscrever() { return UI.granMapa ? '/' + UI.granMapa + (UI.granFonte === 'pros' ? '/pros' : '') : ''; } });

  // ---------- janela do lineup ----------
  // Granada com vídeo do YouTube (campo yt, escolhido em ferramentas\granadas-youtube.json): o vídeo toca aqui, na janela, pelo
  // player oficial de incorporação (youtube-nocookie), mudo e sozinho; o endereço do YouTube fica escrito embaixo, só informativo.
  // Sem yt: a janela mostra a página da granada no csnades.gg. Clicar no cartão nunca abre outra aba nem outra página.
  const YT_EMBED = 'https://www.youtube-nocookie.com/embed/', YT_VER = 'https://www.youtube.com/watch?v=';
  const idYT = (n) => (n && typeof n.yt === 'string' && /^[A-Za-z0-9_-]{11}$/.test(n.yt) ? n.yt : null);
  let janela = null, voltarFoco = null;
  function fecharJanela() { if (!janela) return; janela.remove(); janela = null; document.documentElement.classList.remove('gr-modal-aberto'); const v = voltarFoco; voltarFoco = null; if (v && v.isConnected && v.focus) v.focus(); }
  function abrirJanela(n) {
    const origem = document.activeElement; fecharJanela(); voltarFoco = origem;
    // Vídeo do YouTube achado pela Geladeira (n.pro): só o player e o crédito do canal.
    const site = 'csnades.gg';
    const titulo = n.pro ? n.ytTitulo : `${n.alvo} · de ${n.de} (${TIPOS[n.tipo].rot})`, url = n.grupo || n.pro ? null : BASE + n.url, yt = idYT(n);
    // Compilado: o vídeo começa no capítulo da granada.
    const ini = yt && Number.isInteger(n.ytInicio) && n.ytInicio > 0 ? n.ytInicio : 0;
    const mmss = `${Math.floor(ini / 60)}:${String(ini % 60).padStart(2, '0')}`;
    const verYT = yt ? YT_VER + yt + (ini ? `&t=${ini}s` : '') : null;
    const fechar = h('button', { type: 'button', class: 'btn', onclick: fecharJanela }, 'Fechar');
    const corpo = yt
      ? h('iframe', { class: 'gr-modal-yt', src: `${YT_EMBED}${yt}?autoplay=1&mute=1&playsinline=1&rel=0${ini ? `&start=${ini}` : ''}`, title: `Vídeo do lineup: ${n.ytTitulo || titulo}`,
        allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin', loading: 'eager' })
      : h('iframe', { class: 'gr-modal-frame', src: url, title: `Lineup no csnades.gg: ${titulo}`, loading: 'eager', referrerpolicy: 'no-referrer', allow: 'autoplay; fullscreen' });
    const info = yt
      ? h('div', { class: 'gr-yt-info' },
        h('b', null, n.ytTitulo || titulo),
        ini ? h('small', { class: 'gr-yt-inicio' }, `▶ Começa em ${mmss}${n.ytCapitulo ? ` (capítulo "${n.ytCapitulo}" do vídeo)` : ' (capítulo do vídeo)'}`) : null,
        h('small', { class: 'mudo' }, `Vídeo: ${n.ytCanal || 'um canal'} no YouTube · `, h('a', { class: 'gr-yt-link', href: verYT, target: '_blank', rel: 'noopener noreferrer' }, `youtube.com/watch?v=${yt}${ini ? `&t=${ini}s` : ''}`)),
        n.grupo ? h('small', { class: 'mudo' }, `Lineup da Geladeira${n.quem ? ', achado por ' + n.quem : ''}.`) : n.pro ? null : h('small', { class: 'mudo' }, 'Lineup listado pelo ', h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, site), '.'))
      : h('p', { class: 'nota gr-credito' }, 'Página e vídeo do csnades.gg. Se não carregar, use "Abrir no csnades.gg".');
    janela = h('div', { class: 'gr-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
      h('div', { class: 'gr-modal-fundo', onclick: fecharJanela }),
      h('div', { class: 'gr-modal-caixa' + (yt ? ' com-yt' : '') },
        h('div', { class: 'gr-modal-topo' }, h('b', null, titulo),
          h('div', { class: 'gr-modal-acoes' },
            yt && h('a', { class: 'btn', href: verYT, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir no YouTube ↗'),
            url && h('a', { class: 'btn', href: url, target: '_blank', rel: 'noopener noreferrer' }, yt ? `Ver no ${site} ↗` : `Abrir no ${site} ↗`), fechar)),
        corpo, info));
    document.body.append(janela); document.documentElement.classList.add('gr-modal-aberto');
    fechar.focus();
  }
  // Foco preso na janela: índice do próximo elemento focável (total de n, atual i; -1 = foco fora da janela). Circula nas pontas.
  const proximoFoco = (n, i, voltar) => (n <= 0 ? -1 : i < 0 ? (voltar ? n - 1 : 0) : (i + (voltar ? -1 : 1) + n) % n);
  GT.proximoFoco = proximoFoco;
  const focaveis = () => (janela ? [...janela.querySelectorAll('a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])')] : []);
  document.addEventListener('keydown', (e) => {
    if (!janela) return;
    if (e.key === 'Escape') { fecharJanela(); return; }
    if (e.key !== 'Tab') return;
    const l = focaveis(); if (!l.length) { e.preventDefault(); return; }
    const i = l.indexOf(document.activeElement), j = proximoFoco(l.length, i, e.shiftKey);
    if (i < 0 || j === (e.shiftKey ? l.length - 1 : 0) && i === (e.shiftKey ? 0 : l.length - 1)) { e.preventDefault(); l[j].focus(); }
  });
  // Se o foco escapar (ex.: saindo do iframe do vídeo), volta para o primeiro elemento da janela.
  document.addEventListener('focusin', (e) => { if (janela && !janela.contains(e.target)) { const l = focaveis(); if (l.length) l[0].focus(); } });

  const desc = (n) => {
    if (n.tipo === 'smokes') return n.lado === 'T' ? (n.area === 'Meio' ? `Corta a visão de ${n.alvo} para tomar o meio.` : `Tira a visão de ${n.alvo} na execução do ${n.area.replace('Bomb', 'bomb')}.`) : `Atrasa os T que vêm por ${n.alvo}.`;
    if (n.tipo === 'molotovs') return n.lado === 'T' ? `Limpa ${n.alvo} sem precisar duelar.` : `Segura ${n.alvo} e queima o tempo dos T.`;
    return n.lado === 'T' ? `Cega quem segura ${n.alvo} na hora de entrar.` : `Flash para repicar ou retomar por ${n.alvo}.`;
  };

  const filtroBtn = (chave, valor, rotulo, atual) => h('button', { type: 'button', class: 'gr-filtro' + (atual === valor ? ' ativo' : ''), 'aria-pressed': String(atual === valor),
    onclick: () => { UI[chave] = valor; guardar('geladeira.' + chave, valor); render(); } }, rotulo);
  const topoCartao = (n, extra) => h('div', { class: 'gr-nade-topo' },
    h('span', { class: 'gr-tipo' }, TIPOS[n.tipo].rot),
    n.lado && h('span', { class: 'gr-lado ' + n.lado.toLowerCase() }, n.lado), ...extra);

  // Cartão do csnades.gg ou do grupo com clipe do YouTube: abre na janela. Clipe do grupo de outro lugar: só texto, sem link.
  const cartao = (n) => {
    // Cartão de granada: o href só serve ao Ctrl+clique (YouTube ou csnades.gg); o clique normal abre a janela aqui. Do grupo: o clipe, em nova aba.
    const link = n.grupo ? (idYT(n) ? YT_VER + idYT(n) : null) : idYT(n) ? YT_VER + idYT(n) + (Number.isInteger(n.ytInicio) && n.ytInicio > 0 ? `&t=${n.ytInicio}s` : '') : BASE + n.url;
    const el = h(link ? 'a' : 'div', { class: 'gr-nade' + (n.grupo ? ' grupo' : ''), href: link, target: null, rel: link ? 'noopener noreferrer' : null, estilo: `--k:${TIPOS[n.tipo].cor}`,
      title: n.grupo ? `Lineup da Geladeira${n.quem ? ' (' + n.quem + ')' : ''}` : `Ver o lineup (${n.alvo}, de ${n.de})` },
      topoCartao(n, [n.top && h('span', { class: 'gr-top', title: 'Está no ranking Top do csnades.gg' }, '★ popular'), n.grupo && h('span', { class: 'gr-top gr-grupo' }, 'Geladeira')]),
      h('b', { class: 'gr-alvo' }, n.alvo), h('small', { class: 'gr-de' }, `de ${n.de}`),
      h('p', null, desc(n)),
      n.grupo ? h('span', { class: 'gr-ver' + (link ? '' : ' sem') }, link ? '▶ Ver vídeo aqui' : (n.link ? 'só texto, clipe fora do YouTube' : 'sem clipe'), n.quem && h('small', null, ` · achada por ${n.quem}`))
        : h('span', { class: 'gr-ver' }, idYT(n) ? '▶ Ver vídeo aqui' : '▶ Ver lineup', n.variacoes > 1 && h('small', null, ` · ${n.variacoes} jeitos`)));
    // Clique normal abre a janela; Ctrl/clique do meio continua abrindo a página do csnades.gg em nova aba.
    if (!n.grupo || idYT(n)) el.addEventListener('click', (e) => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); abrirJanela(n); });
    return el;
  };
  // Cartão de vídeo do YouTube: o clique abre a janela e o vídeo toca aqui (Ctrl+clique abre o YouTube em outra aba). Nunca target _blank no cartão.
  const cartaoPro = (n) => {
    const ini = Number.isInteger(n.inicio) && n.inicio > 0 ? n.inicio : 0;
    const v = { ...n, pro: true, ytTitulo: n.titulo, ytCanal: n.canal, ytInicio: ini };
    const el = h('a', { class: 'gr-nade pro', href: YT_VER + n.yt + (ini ? `&t=${ini}s` : ''), rel: 'noopener noreferrer', estilo: `--k:${TIPOS[n.tipo].cor}`,
      title: `Ver o vídeo: ${n.titulo}` },
      topoCartao(n, []),
      h('b', { class: 'gr-alvo' }, n.titulo), h('small', { class: 'gr-de' }, `Canal ${n.canal}`),
      h('span', { class: 'gr-ver' }, '▶ Ver vídeo aqui'));
    el.addEventListener('click', (e) => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); abrirJanela(v); });
    return el;
  };

  GT.registrarBloco({ aba: 'granadas', id: 'lista', ordem: 10, render(el, ctx) {
    const D = DADOS(), slugs = Object.keys(D);
    if (!slugs.length) { el.append(h('p', { class: 'vazio' }, 'Lista de granadas não encontrada.')); return; }
    // Mapas da Geladeira no filtro, do mais jogado para o menos; os que não aparecem no filtro vão para o fim.
    const jogos = new Map(); for (const m of ctx.ms) { const k = m.mp; if (!jogos.has(k)) jogos.set(k, []); jogos.get(k).push(m); }
    const ordem = [...slugs].sort((a, b) => (jogos.get(b) || []).length - (jogos.get(a) || []).length);
    if (!UI.granMapa || !D[UI.granMapa]) UI.granMapa = ordem[0];
    UI.granTipo = UI.granTipo || ler('geladeira.granTipo') || 'todas';
    UI.granLado = UI.granLado || ler('geladeira.granLado') || 'todos';
    UI.granFonte = UI.granFonte || ler('geladeira.granFonte') || 'essenciais';
    const mapa = D[UI.granMapa], P = PROS()[UI.granMapa];
    const link = (s, fonte) => '#granadas/' + s + (fonte === 'pros' ? '/pros' : '') + '?' + GT.u.paramsTexto();

    el.append(h('header', { class: 'cabeca' }, h('h1', null, 'Granadas por mapa'),
      h('p', { class: 'lead' }, 'Essenciais: as granadas que mais valem a pena aprender em cada mapa, com o vídeo do YouTube tocando aqui mesmo. Vídeos do YouTube: vídeos de lineups achados no YouTube, com o crédito do canal em cada cartão; todos tocam aqui, na janela.')));

    el.append(h('nav', { class: 'gr-mapas', 'aria-label': 'Escolher mapa' }, ...ordem.map((s) => {
      return h('a', { class: 'gr-mapa' + (s === UI.granMapa ? ' ativo' : ''), href: link(s, UI.granFonte), 'aria-current': s === UI.granMapa ? 'page' : null },
        h('b', null, D[s].nome, D[s].novo && h('span', { class: 'gr-novo' }, 'novo')));
    })));

    const fontes = h('div', { class: 'gr-fontes', role: 'tablist', 'aria-label': 'Fonte das granadas' },
      ...[['essenciais', 'Essenciais', 'csnades.gg'], ['pros', 'Vídeos do YouTube', 'achados pela Geladeira']].map(([id, rot, sub]) => h('a', { role: 'tab', class: 'gr-fonte' + (UI.granFonte === id ? ' ativo' : ''), 'aria-selected': String(UI.granFonte === id),
        href: link(UI.granMapa, id), onclick: () => guardar('geladeira.granFonte', id) }, h('b', null, rot), h('small', null, sub))));

    const resumo = h('div', { class: 'pilulas' },
      doGrupo(UI.granMapa).length > 0 && h('span', { class: 'pilula', estilo: '--p:var(--c5)' }, h('b', null, doGrupo(UI.granMapa).length), 'da Geladeira'),
      !mapa.novo && h('a', { class: 'pilula gr-todas', estilo: '--p:var(--c6)', href: BASE + UI.granMapa, target: '_blank', rel: 'noopener noreferrer' }, h('b', null, mapa.total), 'no csnades.gg ↗'),
      ...(mapa.links || []).map(([t, u]) => h('a', { class: 'pilula gr-todas', estilo: '--p:var(--c6)', href: u, target: '_blank', rel: 'noopener noreferrer' }, h('b', null, '↗'), t)));
    const avisoNovo = mapa.novo && h('div', { class: 'gr-aviso' }, h('b', null, `Mapa novo (${mapa.novo}).`),
      ' Nenhum site de lineups tem a Cobble nova ainda, e os lineups da antiga não servem: mudou a geometria, entrou neve e o molotov derrete a neve. Até os sites atualizarem, os lineups que o grupo achar entram aqui com o selo "❄ Geladeira". Quando o csnades.gg publicar o mapa, a lista dele passa a aparecer também.');
    const filtros = h('div', { class: 'gr-filtros' },
      h('div', { class: 'gr-grupo-f', role: 'group', 'aria-label': 'Tipo' }, filtroBtn('granTipo', 'todas', 'Todas', UI.granTipo), ...Object.entries(TIPOS).map(([k, t]) => filtroBtn('granTipo', k, t.rot, UI.granTipo))),
      h('div', { class: 'gr-grupo-f', role: 'group', 'aria-label': 'Lado' }, filtroBtn('granLado', 'todos', 'T e CT', UI.granLado), filtroBtn('granLado', 'T', 'Só T', UI.granLado), filtroBtn('granLado', 'CT', 'Só CT', UI.granLado)));
    const passa = (n) => (UI.granTipo === 'todas' || n.tipo === UI.granTipo) && (UI.granLado === 'todos' || n.lado === UI.granLado);

    let corpo, nota;
    if (UI.granFonte === 'pros') {
      if (!P) corpo = h('p', { class: 'vazio' }, mapa.novo ? 'Ainda não há vídeos de lineups da Cobble nova; quando surgirem, entram aqui.' : `Ainda não há vídeos do YouTube de ${mapa.nome}. Use a visão "Essenciais".`);
      else {
        const colunas = Object.keys(TIPOS).filter((t) => UI.granTipo === 'todas' || t === UI.granTipo)
          .map((t) => ({ t, l: (P[t] || []).map((n) => ({ ...n, tipo: t })).filter((n) => idYT(n)).filter(passa) })).filter((c) => c.l.length);
        corpo = colunas.length ? h('div', { class: 'gr-areas' }, ...colunas.map((c) => h('section', { class: 'gr-area' }, h('h3', null, TIPOS[c.t].plural, h('small', null, ` · ${c.l.length}`)), h('div', { class: 'gr-lista' }, ...c.l.map(cartaoPro)))))
          : h('p', { class: 'vazio' }, 'Nenhum vídeo com esse filtro.');
      }
      nota = 'Vídeos de lineups achados no YouTube, de cada canal (o nome aparece no cartão e na janela). Clicar abre o vídeo aqui mesmo, pelo player do YouTube; alguns são compilados e começam no trecho da granada. A divisão por tipo e lado é uma orientação; confira o lineup no vídeo.';
    } else {
      const lista = [...doGrupo(UI.granMapa), ...mapa.granadas].filter(passa);
      corpo = lista.length
        ? h('div', { class: 'gr-areas' }, ...AREAS.map((a) => { const da = lista.filter((n) => n.area === a); return da.length ? h('section', { class: 'gr-area' }, h('h3', null, a, h('small', null, ` · ${da.length}`)), h('div', { class: 'gr-lista' }, ...da.map(cartao))) : null; }))
        : h('p', { class: 'vazio' }, mapa.novo && !doGrupo(UI.granMapa).length ? 'Ainda sem lineups da Geladeira neste mapa. Quem achar uma smoke boa manda o clipe no grupo para entrar aqui.' : 'Nenhuma granada com esse filtro.');
      nota = 'Lineups listados pelo csnades.gg. Os vídeos são do YouTube, de cada canal (o nome aparece na janela), e tocam aqui no site pelo player do YouTube; granada sem vídeo do YouTube mostra a página dela no csnades.gg dentro da janela. "★ popular" = está no ranking Top do csnades.gg. A divisão por bomb e lado é uma orientação; confira o lineup no vídeo.';
    }
    el.append(card(mapa.nome, null, resumo, avisoNovo, h('div', { class: 'gr-barra' }, fontes, filtros), corpo, h('p', { class: 'nota' }, nota)));
  } });
})();
