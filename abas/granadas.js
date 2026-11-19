// Aba "Granadas": por mapa que a Geladeira joga, duas visões:
//   "Essenciais": seleção curada (execução de bomb, meio, atraso de CT) com link para o csnades.gg (abas\granadas-dados.js);
//   "Dos pros":   ranking "Best" do nades.ai por tipo, tirado de partidas profissionais (abas\granadas-pros.js).
// Cada granada essencial abre numa janela por cima do site: o vídeo do YouTube escolhido para ela (player oficial de incorporação)
// ou, sem vídeo, a página dela no csnades.gg. Os do nades.ai abrem em nova aba. Nenhum vídeo ou imagem de terceiros é copiado para cá.
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pct, pl, UI, card, render, guardar, ler } = GT.u;
  // Mapas novos que os sites de lineup ainda não têm: entram com links de apoio e os lineups do grupo.
  const NOVOS = { cobblestone: { nome: 'Cobblestone', novo: '17/11/2026', total: 0, granadas: [],
    links: [['Callouts da Cobble nova', 'https://skinsmonkey.com/blog/cobblestone-callouts-cs2/'], ['Vídeos de smokes no YouTube', 'https://www.youtube.com/results?search_query=cobblestone+cs2+smokes+lineups']] } };
  const DADOS = () => ({ ...GT.granadas, ...Object.fromEntries(Object.entries(NOVOS).filter(([k]) => !(GT.granadas || {})[k])) });
  const PROS = () => GT.granadasPros || {};
  const BASE = 'https://csnades.gg/', BASE_PROS = 'https://nades.ai/';
  const TIPOS = { smokes: { rot: 'Smoke', ico: '☁', cor: 'var(--c1)', plural: 'Smokes' }, molotovs: { rot: 'Molotov', ico: '🔥', cor: 'var(--c4)', plural: 'Molotovs' }, flashbangs: { rot: 'Flash', ico: '✦', cor: 'var(--c5)', plural: 'Flashes' } };
  const AREAS = ['Bomb A', 'Meio', 'Bomb B'];
  const TIPOS_OK = new Set(Object.keys(TIPOS));
  const doGrupo = (slug) => (GT.granadasGrupo || []).filter((n) => n && n.mapa === slug && TIPOS_OK.has(n.tipo)).map((n) => ({ ...n, grupo: true, area: n.area || 'Meio', lado: n.lado || 'T', de: n.de || '?' }));
  const linkSeguro = (u) => (String(u || '').toLowerCase().startsWith('https://') ? u : null);

  GT.registrarAba({ id: 'granadas', titulo: 'Granadas', ordem: 45, aceitaVazio: true, apelidos: ['nades', 'utilitarios'],
    rotaLer(resto) { UI.granMapa = resto[0] || UI.granMapa || null; if (resto[1] === 'pros' || resto[1] === 'essenciais') UI.granFonte = resto[1]; },
    rotaEscrever() { return UI.granMapa ? '/' + UI.granMapa + (UI.granFonte === 'pros' ? '/pros' : '') : ''; } });

  // ---------- janela do lineup ----------
  // Granada com vídeo do YouTube (campo yt, escolhido em ferramentas\granadas-youtube.json): o vídeo toca aqui, na janela, pelo
  // player oficial de incorporação (youtube-nocookie), mudo e sozinho; o endereço do YouTube fica escrito embaixo, só informativo.
  // Sem yt: a janela mostra a página da granada no csnades.gg. Clicar no cartão nunca abre outra aba nem outra página.
  const YT_EMBED = 'https://www.youtube-nocookie.com/embed/', YT_VER = 'https://www.youtube.com/watch?v=';
  const idYT = (n) => (n && typeof n.yt === 'string' && /^[A-Za-z0-9_-]{11}$/.test(n.yt) ? n.yt : null);
  let janela = null, voltarFoco = null;
  function fecharJanela() { if (!janela) return; janela.remove(); janela = null; document.documentElement.classList.remove('gr-modal-aberto'); if (voltarFoco) voltarFoco.focus(); }
  function abrirJanela(n) {
    fecharJanela(); voltarFoco = document.activeElement;
    // Granada dos pros (n.pro): mesmo player; o link de apoio é a página dela no nades.ai em vez do csnades.gg.
    const site = n.pro ? 'nades.ai' : 'csnades.gg';
    const titulo = `${n.alvo} · de ${n.de} (${TIPOS[n.tipo].rot})`, url = (n.pro ? BASE_PROS : BASE) + n.url, yt = idYT(n);
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
        h('small', { class: 'mudo' }, `Vídeo de ${n.ytCanal || 'um canal'} no YouTube · `, h('a', { class: 'gr-yt-link', href: verYT, target: '_blank', rel: 'noopener noreferrer' }, `youtube.com/watch?v=${yt}${ini ? `&t=${ini}s` : ''}`)),
        h('small', { class: 'mudo' }, n.pro ? 'Lineup do ranking dos pros no ' : 'Lineup listado pelo ', h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, site), '.'))
      : h('p', { class: 'nota gr-credito' }, 'Página e vídeo do csnades.gg. Se não carregar, use "Abrir no csnades.gg".');
    janela = h('div', { class: 'gr-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
      h('div', { class: 'gr-modal-fundo', onclick: fecharJanela }),
      h('div', { class: 'gr-modal-caixa' + (yt ? ' com-yt' : '') },
        h('div', { class: 'gr-modal-topo' }, h('b', null, titulo),
          h('div', { class: 'gr-modal-acoes' },
            yt && h('a', { class: 'btn', href: verYT, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir no YouTube ↗'),
            h('a', { class: 'btn', href: url, target: '_blank', rel: 'noopener noreferrer' }, yt ? `Ver no ${site} ↗` : `Abrir no ${site} ↗`), fechar)),
        corpo, info));
    document.body.append(janela); document.documentElement.classList.add('gr-modal-aberto');
    fechar.focus();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && janela) fecharJanela(); });

  const desc = (n) => {
    if (n.tipo === 'smokes') return n.lado === 'T' ? (n.area === 'Meio' ? `Corta a visão de ${n.alvo} para tomar o meio.` : `Tira a visão de ${n.alvo} na execução do ${n.area.replace('Bomb', 'bomb')}.`) : `Atrasa os T que vêm por ${n.alvo}.`;
    if (n.tipo === 'molotovs') return n.lado === 'T' ? `Limpa ${n.alvo} sem precisar duelar.` : `Segura ${n.alvo} e queima o tempo dos T.`;
    return n.lado === 'T' ? `Cega quem segura ${n.alvo} na hora de entrar.` : `Flash para repicar ou retomar por ${n.alvo}.`;
  };

  const filtroBtn = (chave, valor, rotulo, atual) => h('button', { type: 'button', class: 'gr-filtro' + (atual === valor ? ' ativo' : ''), 'aria-pressed': String(atual === valor),
    onclick: () => { UI[chave] = valor; guardar('geladeira.' + chave, valor); render(); } }, rotulo);
  const topoCartao = (n, extra) => h('div', { class: 'gr-nade-topo' },
    h('span', { class: 'gr-ico', 'aria-hidden': 'true' }, TIPOS[n.tipo].ico), h('span', { class: 'gr-tipo' }, TIPOS[n.tipo].rot),
    n.lado && h('span', { class: 'gr-lado ' + n.lado.toLowerCase() }, n.lado), ...extra);

  // Cartão do csnades.gg (abre na janela) ou do grupo (abre o clipe em nova aba).
  const cartao = (n) => {
    // Cartão de granada: o href só serve ao Ctrl+clique (YouTube ou csnades.gg); o clique normal abre a janela aqui. Do grupo: o clipe, em nova aba.
    const link = n.grupo ? linkSeguro(n.link) : idYT(n) ? YT_VER + idYT(n) + (Number.isInteger(n.ytInicio) && n.ytInicio > 0 ? `&t=${n.ytInicio}s` : '') : BASE + n.url;
    const el = h(link ? 'a' : 'div', { class: 'gr-nade' + (n.grupo ? ' grupo' : ''), href: link, target: link && n.grupo ? '_blank' : null, rel: link ? 'noopener noreferrer' : null, estilo: `--k:${TIPOS[n.tipo].cor}`,
      title: n.grupo ? `Lineup da Geladeira${n.quem ? ' (' + n.quem + ')' : ''}` : `Ver o lineup (${n.alvo} from ${n.de})` },
      topoCartao(n, [n.top && h('span', { class: 'gr-top', title: 'Está no ranking Top do csnades.gg' }, '★ popular'), n.grupo && h('span', { class: 'gr-top gr-grupo' }, '❄ Geladeira')]),
      h('b', { class: 'gr-alvo' }, n.alvo), h('small', { class: 'gr-de' }, `de ${n.de}`),
      h('p', null, desc(n)),
      n.grupo ? h('span', { class: 'gr-ver' }, link ? 'Ver clipe ↗' : 'sem clipe', n.quem && h('small', null, ` · achada por ${n.quem}`))
        : h('span', { class: 'gr-ver' }, idYT(n) ? '▶ Ver vídeo aqui' : '▶ Ver lineup', n.variacoes > 1 && h('small', null, ` · ${n.variacoes} jeitos`)));
    // Clique normal abre a janela; Ctrl/clique do meio continua abrindo a página do csnades.gg em nova aba.
    if (!n.grupo) el.addEventListener('click', (e) => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); abrirJanela(n); });
    return el;
  };
  // Cartão dos pros. Com vídeo do YouTube (yt): o clique abre a mesma janela das essenciais e o vídeo toca aqui (Ctrl+clique abre
  // o YouTube em nova aba). Sem yt: abre a página da granada no nades.ai em nova aba (o vídeo deles fica lá; o site barra a janela).
  const cartaoPro = (n) => {
    const yt = idYT(n), ini = Number.isInteger(n.ytInicio) && n.ytInicio > 0 ? n.ytInicio : 0;
    const el = h('a', { class: 'gr-nade pro', href: yt ? YT_VER + yt + (ini ? `&t=${ini}s` : '') : BASE_PROS + n.url, target: yt ? null : '_blank', rel: 'noopener noreferrer', estilo: `--k:${TIPOS[n.tipo].cor}`,
      title: yt ? `Ver o vídeo do lineup (${n.alvo} from ${n.de})` : `Abrir no nades.ai (${n.alvo} from ${n.de})` },
      topoCartao(n, [h('span', { class: 'gr-rank', title: `${n.rank}º no ranking dos pros no nades.ai` }, `#${n.rank}`)]),
      h('b', { class: 'gr-alvo' }, n.alvo), h('small', { class: 'gr-de' }, `de ${n.de}`),
      n.det && h('p', null, `Arremesso: ${n.det}`),
      h('span', { class: 'gr-ver' }, yt ? '▶ Ver vídeo aqui' : 'Vídeo no nades.ai ↗'));
    if (yt) el.addEventListener('click', (e) => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); abrirJanela({ ...n, pro: true }); });
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
    const mapa = D[UI.granMapa], ms = jogos.get(UI.granMapa) || [];
    const g = ms.length ? C.grupo(ms) : null, P = PROS()[UI.granMapa];
    const link = (s, fonte) => '#granadas/' + s + (fonte === 'pros' ? '/pros' : '') + '?' + GT.u.paramsTexto();

    el.append(h('header', { class: 'cabeca' }, h('h1', null, 'Granadas por mapa'),
      h('p', { class: 'lead' }, 'Essenciais: as granadas que mais valem a pena aprender em cada mapa, com o vídeo do csnades.gg abrindo aqui mesmo. Dos pros: o que os times profissionais mais jogam, pelo nades.ai.')));

    el.append(h('nav', { class: 'gr-mapas', 'aria-label': 'Escolher mapa' }, ...ordem.map((s) => {
      const l = jogos.get(s) || [], gg = l.length ? C.grupo(l) : null;
      return h('a', { class: 'gr-mapa' + (s === UI.granMapa ? ' ativo' : ''), href: link(s, UI.granFonte), 'aria-current': s === UI.granMapa ? 'page' : null },
        h('b', null, D[s].nome, D[s].novo && h('span', { class: 'gr-novo' }, 'novo')), h('small', null, gg ? `${pl(l.length, 'partida', 'partidas')} · ${pct(gg.wr)}` : D[s].novo ? `chegou em ${D[s].novo}` : 'sem partidas no filtro'));
    })));

    const fontes = h('div', { class: 'gr-fontes', role: 'tablist', 'aria-label': 'Fonte das granadas' },
      ...[['essenciais', 'Essenciais', 'csnades.gg'], ['pros', 'Dos pros', 'nades.ai']].map(([id, rot, sub]) => h('a', { role: 'tab', class: 'gr-fonte' + (UI.granFonte === id ? ' ativo' : ''), 'aria-selected': String(UI.granFonte === id),
        href: link(UI.granMapa, id), onclick: () => guardar('geladeira.granFonte', id) }, h('b', null, rot), h('small', null, sub))));

    const resumo = h('div', { class: 'pilulas' },
      h('span', { class: 'pilula', estilo: '--p:var(--c1)' }, h('b', null, ms.length), ms.length === 1 ? 'partida da Geladeira' : 'partidas da Geladeira'),
      g && h('span', { class: 'pilula', estilo: `--p:${g.wr >= 0.5 ? 'var(--ok)' : 'var(--bad)'}` }, h('b', null, pct(g.wr)), 'de vitórias'),
      doGrupo(UI.granMapa).length > 0 && h('span', { class: 'pilula', estilo: '--p:var(--c5)' }, h('b', null, doGrupo(UI.granMapa).length), 'da Geladeira'),
      !mapa.novo && h('a', { class: 'pilula gr-todas', estilo: '--p:var(--c6)', href: BASE + UI.granMapa, target: '_blank', rel: 'noopener noreferrer' }, h('b', null, mapa.total), 'no csnades.gg ↗'),
      P && h('a', { class: 'pilula gr-todas', estilo: '--p:var(--c3)', href: `${BASE_PROS}${UI.granMapa}/smokes`, target: '_blank', rel: 'noopener noreferrer' }, h('b', null, '↗'), 'nades.ai'),
      ...(mapa.links || []).map(([t, u]) => h('a', { class: 'pilula gr-todas', estilo: '--p:var(--c6)', href: u, target: '_blank', rel: 'noopener noreferrer' }, h('b', null, '↗'), t)));
    const avisoNovo = mapa.novo && h('div', { class: 'gr-aviso' }, h('b', null, `Mapa novo (${mapa.novo}).`),
      ' Nenhum site de lineups tem a Cobble nova ainda, e os lineups da antiga não servem: mudou a geometria, entrou neve e o molotov derrete a neve. Até os sites atualizarem, os lineups que o grupo achar entram aqui com o selo "❄ Geladeira". Quando o csnades.gg publicar o mapa, a lista dele passa a aparecer também.');
    const filtros = h('div', { class: 'gr-filtros' },
      h('div', { class: 'gr-grupo-f', role: 'group', 'aria-label': 'Tipo' }, filtroBtn('granTipo', 'todas', 'Todas', UI.granTipo), ...Object.entries(TIPOS).map(([k, t]) => filtroBtn('granTipo', k, `${t.ico} ${t.rot}`, UI.granTipo))),
      h('div', { class: 'gr-grupo-f', role: 'group', 'aria-label': 'Lado' }, filtroBtn('granLado', 'todos', 'T e CT', UI.granLado), filtroBtn('granLado', 'T', 'Só T', UI.granLado), filtroBtn('granLado', 'CT', 'Só CT', UI.granLado)));
    const passa = (n) => (UI.granTipo === 'todas' || n.tipo === UI.granTipo) && (UI.granLado === 'todos' || n.lado === UI.granLado);

    let corpo, nota;
    if (UI.granFonte === 'pros') {
      if (!P) corpo = h('p', { class: 'vazio' }, mapa.novo ? 'Os pros ainda não jogam a Cobble nova em campeonato; quando ela entrar, o nades.ai deve começar a listar.' : `O nades.ai não cobre ${mapa.nome}. Use a visão "Essenciais".`);
      else {
        const colunas = Object.keys(TIPOS).filter((t) => UI.granTipo === 'todas' || t === UI.granTipo)
          .map((t) => ({ t, l: (P[t] || []).map((n) => ({ ...n, tipo: t })).filter(passa) })).filter((c) => c.l.length);
        corpo = colunas.length ? h('div', { class: 'gr-areas' }, ...colunas.map((c) => h('section', { class: 'gr-area' }, h('h3', null, TIPOS[c.t].plural, h('small', null, ` · ${c.l.length}`)), h('div', { class: 'gr-lista' }, ...c.l.map(cartaoPro)))))
          : h('p', { class: 'vazio' }, 'Nenhuma granada com esse filtro.');
      }
      nota = 'Ranking "Best" do nades.ai em cada tipo, montado a partir de partidas profissionais (o número # é a posição nesse ranking; lista lida em 19/11/2026). "▶ Ver vídeo aqui": um vídeo do YouTube do mesmo lineup toca aqui, na janela, com título e canal embaixo. As demais abrem a página da granada no nades.ai, onde fica o vídeo deles.';
    } else {
      const lista = [...doGrupo(UI.granMapa), ...mapa.granadas].filter(passa);
      corpo = lista.length
        ? h('div', { class: 'gr-areas' }, ...AREAS.map((a) => { const da = lista.filter((n) => n.area === a); return da.length ? h('section', { class: 'gr-area' }, h('h3', null, a, h('small', null, ` · ${da.length}`)), h('div', { class: 'gr-lista' }, ...da.map(cartao))) : null; }))
        : h('p', { class: 'vazio' }, mapa.novo && !doGrupo(UI.granMapa).length ? 'Ainda sem lineups da Geladeira neste mapa. Quem achar uma smoke boa manda o clipe no grupo para entrar aqui.' : 'Nenhuma granada com esse filtro.');
      nota = 'Lineups listados pelo csnades.gg. Os vídeos são do YouTube, de cada canal (o nome aparece na janela), e tocam aqui no site pelo player do YouTube; granada sem vídeo do YouTube abre a página dela no csnades.gg. "★ popular" = está no ranking Top do csnades.gg. A divisão por bomb e lado é uma orientação; confira o lineup no vídeo.';
    }
    el.append(card(mapa.nome, null, resumo, avisoNovo, fontes, filtros, corpo, h('p', { class: 'nota' }, nota)));
  } });
})();
