// Aba "Granadas": as granadas essenciais de cada mapa que a Geladeira joga (execução de bomb, meio e atraso de CT),
// com link para o lineup no csnades.gg. A lista vem de abas\granadas-dados.js (gerada do sitemap público deles: só nome e link).
// Os mapas aparecem na ordem dos mais jogados pela Geladeira no filtro, com win rate.
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pct, pl, E, UI, card, render, guardar, ler } = GT.u;
  // Mapas novos que os sites de lineup ainda não têm: entram com links de apoio e os lineups do grupo.
  const NOVOS = { cobblestone: { nome: 'Cobblestone', novo: '17/11/2026', total: 0, granadas: [],
    links: [['Callouts da Cobble nova', 'https://skinsmonkey.com/blog/cobblestone-callouts-cs2/'], ['Vídeos de smokes no YouTube', 'https://www.youtube.com/results?search_query=cobblestone+cs2+smokes+lineups']] } };
  const PROS = new Set(['dust2', 'mirage', 'inferno', 'ancient', 'nuke', 'anubis', 'cache']); // mapas que o nades.ai cobre (lineups de partidas pro)
  const DADOS = () => ({ ...GT.granadas, ...Object.fromEntries(Object.entries(NOVOS).filter(([k]) => !(GT.granadas || {})[k])) });
  const BASE = 'https://csnades.gg/';
  const TIPOS = { smokes: { rot: 'Smoke', ico: '☁', cor: 'var(--c1)' }, molotovs: { rot: 'Molotov', ico: '🔥', cor: 'var(--c4)' }, flashbangs: { rot: 'Flash', ico: '✦', cor: 'var(--c5)' } };
  const AREAS = ['Bomb A', 'Meio', 'Bomb B'];
  const TIPOS_OK = new Set(Object.keys(TIPOS));
  const doGrupo = (slug) => (GT.granadasGrupo || []).filter((n) => n && n.mapa === slug && TIPOS_OK.has(n.tipo)).map((n) => ({ ...n, grupo: true, area: n.area || 'Meio', lado: n.lado || 'T', de: n.de || '?' }));
  const linkSeguro = (u) => (String(u || '').toLowerCase().startsWith('https://') ? u : null);

  GT.registrarAba({ id: 'granadas', titulo: 'Granadas', ordem: 45, aceitaVazio: true, apelidos: ['nades', 'utilitarios'],
    rotaLer(resto) { UI.granMapa = resto[0] || UI.granMapa || null; },
    rotaEscrever() { return UI.granMapa ? '/' + UI.granMapa : ''; } });

  const desc = (n) => {
    if (n.tipo === 'smokes') return n.lado === 'T' ? (n.area === 'Meio' ? `Corta a visão de ${n.alvo} para tomar o meio.` : `Tira a visão de ${n.alvo} na execução do ${n.area.replace("Bomb", "bomb")}.`) : `Atrasa os T que vêm por ${n.alvo}.`;
    if (n.tipo === 'molotovs') return n.lado === 'T' ? `Limpa ${n.alvo} sem precisar duelar.` : `Segura ${n.alvo} e queima o tempo dos T.`;
    return n.lado === 'T' ? `Cega quem segura ${n.alvo} na hora de entrar.` : `Flash para repicar ou retomar por ${n.alvo}.`;
  };

  const filtroBtn = (chave, valor, rotulo, atual) => h('button', { type: 'button', class: 'gr-filtro' + (atual === valor ? ' ativo' : ''), 'aria-pressed': String(atual === valor),
    onclick: () => { UI[chave] = valor; guardar('geladeira.' + chave, valor); render(); } }, rotulo);

  const cartao = (n) => { const link = n.grupo ? linkSeguro(n.link) : BASE + n.url;
    return h(link ? 'a' : 'div', { class: 'gr-nade' + (n.grupo ? ' grupo' : ''), href: link, target: link ? '_blank' : null, rel: link ? 'noopener noreferrer' : null, estilo: `--k:${TIPOS[n.tipo].cor}`,
    title: n.grupo ? `Lineup da Geladeira${n.quem ? ' (' + n.quem + ')' : ''}` : `Abrir o lineup no csnades.gg (${n.alvo} from ${n.de})` },
    h('div', { class: 'gr-nade-topo' },
      h('span', { class: 'gr-ico', 'aria-hidden': 'true' }, TIPOS[n.tipo].ico),
      h('span', { class: 'gr-tipo' }, TIPOS[n.tipo].rot),
      h('span', { class: 'gr-lado ' + n.lado.toLowerCase() }, n.lado),
      n.top && h('span', { class: 'gr-top', title: 'Está no ranking Top do csnades.gg' }, '★ popular'),
      n.grupo && h('span', { class: 'gr-top gr-grupo' }, '❄ Geladeira')),
    h('b', { class: 'gr-alvo' }, n.alvo), h('small', { class: 'gr-de' }, `de ${n.de}`),
    h('p', null, desc(n)),
    n.grupo ? h('span', { class: 'gr-ver' }, link ? 'Ver clipe ↗' : 'sem clipe', n.quem && h('small', null, ` · achada por ${n.quem}`))
      : h('span', { class: 'gr-ver' }, 'Ver lineup ↗', n.variacoes > 1 && h('small', null, ` · ${n.variacoes} jeitos`))); };

  GT.registrarBloco({ aba: 'granadas', id: 'lista', ordem: 10, render(el, ctx) {
    const D = DADOS(), slugs = Object.keys(D);
    if (!slugs.length) { el.append(h('p', { class: 'vazio' }, 'Lista de granadas não encontrada.')); return; }
    // Mapas da Geladeira no filtro, do mais jogado para o menos; os que não aparecem no filtro vão para o fim.
    const jogos = new Map(); for (const m of ctx.ms) { const k = m.mp; if (!jogos.has(k)) jogos.set(k, []); jogos.get(k).push(m); }
    const ordem = [...slugs].sort((a, b) => (jogos.get(b) || []).length - (jogos.get(a) || []).length);
    if (!UI.granMapa || !D[UI.granMapa]) UI.granMapa = ordem[0];
    UI.granTipo = UI.granTipo || ler('geladeira.granTipo') || 'todas';
    UI.granLado = UI.granLado || ler('geladeira.granLado') || 'todos';
    const mapa = D[UI.granMapa], ms = jogos.get(UI.granMapa) || [];
    const g = ms.length ? C.grupo(ms) : null;

    el.append(h('header', { class: 'cabeca' }, h('h1', null, 'Granadas por mapa'),
      h('p', { class: 'lead' }, 'As granadas que mais valem a pena aprender em cada mapa: smokes e flashes da execução de cada bomb, controle do meio e o atraso de CT. Clique numa granada para ver o lineup em vídeo no csnades.gg.')));

    el.append(h('nav', { class: 'gr-mapas', 'aria-label': 'Escolher mapa' }, ...ordem.map((s) => {
      const l = jogos.get(s) || [], gg = l.length ? C.grupo(l) : null;
      return h('a', { class: 'gr-mapa' + (s === UI.granMapa ? ' ativo' : ''), href: '#granadas/' + s + '?' + GT.u.paramsTexto(), 'aria-current': s === UI.granMapa ? 'page' : null },
        h('b', null, D[s].nome, D[s].novo && h('span', { class: 'gr-novo' }, 'novo')), h('small', null, gg ? `${pl(l.length, 'partida', 'partidas')} · ${pct(gg.wr)}` : D[s].novo ? `chegou em ${D[s].novo}` : 'sem partidas no filtro'));
    })));

    const lista = [...doGrupo(UI.granMapa), ...mapa.granadas].filter((n) => (UI.granTipo === 'todas' || n.tipo === UI.granTipo) && (UI.granLado === 'todos' || n.lado === UI.granLado));
    const resumo = h('div', { class: 'pilulas' },
      h('span', { class: 'pilula', estilo: '--p:var(--c1)' }, h('b', null, ms.length), ms.length === 1 ? 'partida da Geladeira' : 'partidas da Geladeira'),
      g && h('span', { class: 'pilula', estilo: `--p:${g.wr >= 0.5 ? 'var(--ok)' : 'var(--bad)'}` }, h('b', null, pct(g.wr)), 'de vitórias'),
      mapa.granadas.length > 0 && h('span', { class: 'pilula', estilo: '--p:var(--c2)' }, h('b', null, mapa.granadas.length), 'essenciais aqui'),
      doGrupo(UI.granMapa).length > 0 && h('span', { class: 'pilula', estilo: '--p:var(--c5)' }, h('b', null, doGrupo(UI.granMapa).length), 'da Geladeira'),
      !mapa.novo && h('a', { class: 'pilula gr-todas', estilo: '--p:var(--c6)', href: BASE + UI.granMapa, target: '_blank', rel: 'noopener noreferrer' }, h('b', null, mapa.total), 'no csnades.gg ↗'),
      PROS.has(UI.granMapa) && h('a', { class: 'pilula gr-todas', estilo: '--p:var(--c3)', href: `https://nades.ai/${UI.granMapa}/smokes`, target: '_blank', rel: 'noopener noreferrer', title: 'Lineups tirados de partidas profissionais, com quantas vezes cada um foi jogado' }, h('b', null, 'pros'), 'o que eles jogam (nades.ai) ↗'),
      ...(mapa.links || []).map(([t, u]) => h('a', { class: 'pilula gr-todas', estilo: '--p:var(--c6)', href: u, target: '_blank', rel: 'noopener noreferrer' }, h('b', null, '↗'), t)));
    const avisoNovo = mapa.novo && h('div', { class: 'gr-aviso' }, h('b', null, `Mapa novo (${mapa.novo}).`),
      ' Nenhum site de lineups tem a Cobble nova ainda, e os lineups da antiga não servem: mudou a geometria, entrou neve e o molotov derrete a neve. Até os sites atualizarem, os lineups que o grupo achar entram aqui com o selo "❄ Geladeira". Quando o csnades.gg publicar o mapa, a lista dele passa a aparecer também.');

    el.append(card(mapa.nome, null, resumo, avisoNovo,
      h('div', { class: 'gr-filtros' },
        h('div', { class: 'gr-grupo-f', role: 'group', 'aria-label': 'Tipo' }, filtroBtn('granTipo', 'todas', 'Todas', UI.granTipo), ...Object.entries(TIPOS).map(([k, t]) => filtroBtn('granTipo', k, `${t.ico} ${t.rot}`, UI.granTipo))),
        h('div', { class: 'gr-grupo-f', role: 'group', 'aria-label': 'Lado' }, filtroBtn('granLado', 'todos', 'T e CT', UI.granLado), filtroBtn('granLado', 'T', 'Só T', UI.granLado), filtroBtn('granLado', 'CT', 'Só CT', UI.granLado))),
      lista.length
        ? h('div', { class: 'gr-areas' }, ...AREAS.map((a) => { const da = lista.filter((n) => n.area === a); return da.length ? h('section', { class: 'gr-area' }, h('h3', null, a, h('small', null, ` · ${da.length}`)), h('div', { class: 'gr-lista' }, ...da.map(cartao))) : null; }))
        : h('p', { class: 'vazio' }, mapa.novo && !doGrupo(UI.granMapa).length ? 'Ainda sem lineups da Geladeira neste mapa. Quem achar uma smoke boa manda o clipe no grupo para entrar aqui.' : 'Nenhuma granada com esse filtro.'),
      h('p', { class: 'nota' }, 'Lineups e vídeos: csnades.gg (cada granada abre a página dela lá). "★ popular" = está no ranking Top do csnades.gg. A divisão por bomb e lado é uma orientação; confira o lineup no vídeo.')));
  } });
})();
