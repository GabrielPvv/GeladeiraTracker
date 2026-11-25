// Aba "Partidas": análise de cada partida que tem demo (ctx.D.jogos, gerado por src/tracker/jogos.mjs).
// Como foi, o que decidiu, o que melhorar, padrões por lado, um quadro por jogador (fortes, melhoria, priorizar,
// não priorizar, mortes com contexto) e a linha do tempo de cada rodada. Não segue o filtro de período (são poucas).
(function () {
  'use strict';
  const GT = window.GT;
  const { h, card, pl, E, UI, avatar, rotuloMembro, infoIcone } = GT.u;

  GT.registrarAba({ id: 'partidas', titulo: 'Partidas', ordem: 62, aceitaVazio: true, apelidos: ['jogos', 'partida'],
    rotaLer(resto) { UI.jogo = resto[0] || null; },
    rotaEscrever() { return UI.jogo ? '/' + UI.jogo : ''; },
    render(el, ctx) {
      const L = (ctx.D && ctx.D.jogos) || [];
      if (!L.length) return card('Partidas', null, h('p', { class: 'nota' }, 'Nenhuma partida com demo analisada neste ano.'));
      const atual = L.find((j) => j.id === UI.jogo) || L[0];
      el.append(seletor(L, atual), ...partida(atual, ctx));
    } });

  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const dataBR = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '');
  const RES = { V: ['Vitória', 'ok'], D: ['Derrota', 'bad'], E: ['Empate', ''] };
  const CAT = {
    refem: ['refém', 'Já estava em desvantagem clara (2 ou mais a menos, ou CT atrás com a bomba plantada): a rodada já estava perdida.'],
    abertura: ['abertura perdida', 'Primeira morte da rodada, sem troca.'],
    sozinho: ['morreu sozinho', 'Ninguém trocou a morte em até 5 s.'],
    trocada: ['trocada', 'Um companheiro matou quem matou em até 5 s.'],
  };
  const nome = (n) => (rotuloMembro ? rotuloMembro(n) : n);
  const sel = (id) => { UI.jogo = id; GT.u.gravarEstado && GT.u.gravarEstado(); GT.u.render(); };

  function seletor(L, atual) {
    return h('div', { class: 'pt-lista', role: 'list' }, ...L.map((j) => {
      const [rot, cls] = RES[j.r] || ['', ''];
      return h('button', { class: 'pt-item' + (j.id === atual.id ? ' ativo' : ''), role: 'listitem', 'aria-pressed': j.id === atual.id ? 'true' : 'false', onclick: () => sel(j.id) },
        h('span', { class: 'pt-mapa' }, cap(j.mp)), h('b', { class: cls }, `${j.sn} x ${j.se}`), h('small', { class: 'mudo' }, `${dataBR(j.d)} · ${rot}`));
    }));
  }

  function lista(itens, vazio) {
    return itens && itens.length ? h('ul', { class: 'pt-ul' }, ...itens.map((t) => h('li', null, t))) : h('p', { class: 'nota' }, vazio);
  }

  function partida(j, ctx) {
    const [rot, cls] = RES[j.r] || ['', ''];
    const topo = card(`${cap(j.mp)} · ${j.sn} x ${j.se}`, `${dataBR(j.d)} às ${j.h}`,
      h('p', { class: 'pt-topo' }, h('b', { class: cls }, rot), j.virada ? h('span', { class: 'pt-virada' }, ' · ' + j.virada) : null, ' · ',
        h('a', { href: 'https://gamersclub.com.br/lobby/partida/' + j.id, target: '_blank', rel: 'noopener' }, 'ver na GC ↗')));
    const comoFoi = card('Como foi', 'A partida em trechos: sequências de vitórias ou derrotas no mesmo lado.',
      h('ol', { class: 'pt-trechos' }, ...j.trechos.map((t) => h('li', { class: t.v ? 'v' : 'd' },
        h('span', { class: 'pt-r' }, `R${t.de}${t.ate > t.de ? '–' + t.ate : ''}`), h('span', { class: 'pt-lado ' + t.lado.toLowerCase() }, t.lado),
        h('b', null, t.placar), h('span', null, t.texto)))));
    const T = j.times || { nos: { fortes: j.decidiu, fracos: j.melhorar }, eles: { fortes: [], fracos: [] } };
    const time = (titulo, t, vazioF, vazioN) => h('div', { class: 'pt-time' }, h('h4', null, titulo),
      h('div', { class: 'pt-blocos' },
        h('div', { class: 'pt-bloco bom' }, h('h5', null, '✔ Pontos fortes'), lista(t.fortes, vazioF)),
        h('div', { class: 'pt-bloco ruim' }, h('h5', null, '✖ Pontos negativos'), lista(t.fracos, vazioN))));
    const geral = card('Análise geral da Geladeira', null,
      time('🧊 Geladeira', T.nos, 'Nada se destacou.', 'Nada claro a corrigir.'),
      h('div', { class: 'pt-duas pt-lados' }, h('div', null, h('h5', null, 'Geladeira de CT'), lista(j.lados.CT, '—')), h('div', null, h('h5', null, 'Geladeira de TR'), lista(j.lados.T, '—'))));
    const jog = card('Jogadores da Geladeira', 'Mortes em desvantagem clara contam como "refém" e não entram nos pontos de melhoria.',
      h('div', { class: 'pt-jogs' }, ...j.jogadores.map(jogador)));
    const rods = card('Rodada a rodada', null,
      h('p', { class: 'nota' }, 'O número entre parênteses é o impacto do lance: quanto a chance de a Geladeira ganhar a rodada mudou com aquele abate, segundo a GC. ', infoIcone ? infoIcone('Ex.: +20% = o abate aumentou em 20 pontos a chance de vitória na rodada; -15% = diminuiu 15 pontos.') : null),
      h('div', { class: 'pt-rods' }, ...j.rodadas.map(rodada)));
    return [topo, geral, comoFoi, jog, rods];
  }

  function jogador(p) {
    const num = [`rating ${p.rating != null ? p.rating.toFixed(2) : '—'}`, `${p.k}/${p.m}`, `ADR ${p.adr}`, `entrada ${p.ent.g}/${p.ent.t}`,
      `clutch ${p.clutch.g}/${p.clutch.t}`, `${p.util.flashes} flashes, cegou ${p.util.cegou}`, `${p.util.dano} de dano com granada`];
    const bloco = (titulo, cls, itens, vazio) => h('div', { class: 'pt-bloco ' + cls }, h('h5', null, titulo), lista(itens, vazio));
    return h('div', { class: 'pt-jog' },
      h('div', { class: 'pt-jog-topo' }, avatar ? avatar(p.n, 28) : null, h('b', null, nome(p.n)), p.arma ? h('small', { class: 'mudo' }, ' · ' + p.arma) : null),
      h('p', { class: 'pt-num mudo' }, num.join(' · ')),
      p.decisoes ? h('div', { class: 'pt-decisoes' },
        h('div', { class: 'pt-blocos' },
          bloco('✔ Onde acertou', 'bom', p.decisoes.acertos, 'Nenhum lance de destaque.'),
          bloco('✖ Onde errou', 'ruim', p.decisoes.erros, 'Nenhuma morte evitável: as outras foram trocadas ou de refém.')),
        bloco('🧠 O que pensar melhor', 'pri', p.decisoes.pensar, '—')) : null,
      h('h5', { class: 'pt-sub' }, 'Resumo'),
      h('div', { class: 'pt-blocos' },
        bloco('✔ Pontos fortes', 'bom', p.fortes, 'Nada acima do normal nesta partida.'),
        bloco('⚙ Pontos de melhoria', 'ruim', p.melhorar, 'Nada claro: as mortes foram trocadas ou de refém.'),
        bloco('🎯 Priorizar', 'pri', p.priorizar, 'Manter o que está fazendo.'),
        bloco('💤 Não priorizar', 'nao', p.naoPriorizar, '—')),
      p.mortes.length ? h('details', { class: 'pt-mortes' }, h('summary', null, `Mortes com contexto (${p.mortes.length})`),
        h('ul', null, ...p.mortes.map((m) => h('li', null,
          h('span', { class: 'pt-cat ' + m.cat, title: CAT[m.cat][1] }, CAT[m.cat][0]),
          ` R${m.r} ${m.lado} · ${m.s} s · ${m.local || 'local ?'} · por ${m.matador} · vivos antes ${m.vivos}`)))) : null);
  }

  const ECON = { pistol: 'pistol', full: 'compra cheia', force: 'force', eco: 'eco', semi: 'meia compra' };
  const imp = (x) => (x == null ? null : h('span', { class: 'pt-imp ' + (x > 0 ? 'mais' : x < 0 ? 'menos' : '') }, ` ${x > 0 ? '+' : ''}${x}%`));
  function rodada(r) {
    const N = r.narr || { resumo: '', certo: [], errado: [] };
    const titulo = h('summary', null, h('b', null, `R${r.n} `), h('span', { class: 'pt-lado ' + r.lado.toLowerCase() }, r.lado === 'T' ? 'TR' : 'CT'),
      ` ${r.v ? '✅' : '❌'} ${r.placar} · ${N.resumo || r.fim}`);
    return h('details', { class: 'pt-rod ' + (r.v ? 'v' : 'd') }, titulo,
      h('p', { class: 'pt-econ mudo' }, `Economia: Geladeira ${ECON[r.econ.nos] || r.econ.nos} x adversário ${ECON[r.econ.eles] || r.econ.eles}`),
      h('div', { class: 'pt-blocos' },
        h('div', { class: 'pt-bloco bom' }, h('h5', null, '✔ Deu certo'), lista(N.certo, '—')),
        h('div', { class: 'pt-bloco ruim' }, h('h5', null, '✖ Deu errado'), lista(N.errado, '—'))),
      h('h5', { class: 'pt-sub' }, 'Lance a lance'),
      h('ol', { class: 'pt-ev' }, ...r.ev.map((x) => x.t === 'p'
        ? h('li', { class: 'plant' }, `${x.s} s · 💣 ${x.nos ? 'Geladeira plantou' : 'adversário plantou'}${x.site ? ' no ' + x.site : ''}`)
        : h('li', { class: x.nos ? 'nos' : 'eles' }, `${x.s} s · ${x.q} → ${x.v}${x.local ? ' (' + x.local + ')' : ''} · vivos ${x.vivos}`, imp(x.imp),
          x.cat ? h('span', { class: 'pt-cat ' + x.cat, title: CAT[x.cat][1] }, CAT[x.cat][0]) : null))));
  }
})();
