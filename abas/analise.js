// Aba "Análise": análise individual de um membro (#analise/<nick>), vinda do motor de src\analise (janela fixa dos últimos 6 meses).
// Também exporta GT.cartaoJogador(nick), o cabeçalho "card de jogador" (avatar, função provável, 3 números e radar) usado na página do membro.
// Os dados ficam em window.GELADEIRA.analise (sem SteamID). Nenhuma comparação entre dois membros: a referência é a média do mesmo nível.
(function () {
  'use strict';
  const GT = window.GT, G = GT.G;
  const { h, sv, pl, E, card, avatar, rotuloMembro, infoIcone, dica, barra, dataBR, paramsTexto } = GT.u;

  const A = () => G.analise || null;
  const dadosDe = (nick) => (A() && A().membros && A().membros[nick]) || null;
  const fmt = (v, d = 1) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const val = (v, d, u) => (v === null || v === undefined ? '—' : fmt(v, d ?? 1) + (u || ''));
  const difTexto = (dif) => `${Math.round(Math.abs(dif) * 100)}% ${dif >= 0 ? 'melhor' : 'pior'}`;
  const janelaTexto = () => { const a = A(); return a ? `últimos ${a.janela.meses} meses (de ${dataBR(a.janela.desde)} a ${dataBR(a.geradoEm)})` : ''; };
  const linkAnalise = (nick) => '#analise/' + encodeURIComponent(nick) + '?' + paramsTexto();

  // ---------- radar de 5 eixos ----------
  // Cada eixo compara o número do jogador com a média dos membros (mesma janela, perfil da GC). Média = 50; 30% acima da média = 100; 30% abaixo = 0.
  const FOLGA = 0.3;
  const EIXOS = [
    { id: 'abate', rotulo: 'Abate', campo: 'kpr', d: 3, nota: 'abates por rodada', melhor: 'maior' },
    { id: 'sobrevivencia', rotulo: 'Sobrevivência', campo: 'dpr', d: 3, nota: 'mortes por rodada (menos é melhor)', melhor: 'menor' },
    { id: 'impacto', rotulo: 'Impacto', campo: 'adr', d: 1, nota: 'dano por rodada (ADR)', melhor: 'maior' },
    { id: 'mira', rotulo: 'Mira', campo: 'hsPct', d: 1, nota: '% de abates com tiro na cabeça', melhor: 'maior', u: '%' },
    { id: 'suporte', rotulo: 'Suporte', campo: 'apr', d: 3, nota: 'assistências por rodada', melhor: 'maior' },
  ];
  const MIN_RODADAS = 300;
  function mediaGrupo() {
    const m = A() ? Object.values(A().membros) : [];
    const out = {};
    for (const e of EIXOS) {
      const xs = m.filter((x) => x.perfil.m6 && x.perfil.m6.jogador && x.perfil.m6.amostra.rodadas >= MIN_RODADAS).map((x) => x.perfil.m6.jogador[e.campo]).filter((v) => Number.isFinite(v));
      out[e.campo] = xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;
    }
    return out;
  }
  const pontosEixo = (e, v, ref) => {
    if (!Number.isFinite(v) || !ref) return null;
    const razao = e.melhor === 'menor' ? ref / Math.max(v, 1e-9) : v / ref;
    return Math.max(0, Math.min(100, 50 + ((razao - 1) * 50) / FOLGA));
  };
  const textoEscala = `Cada ponta é um número do perfil da GC nos ${A() ? A().janela.meses : 6} meses: abate (abates por rodada), sobrevivência (mortes por rodada, ao contrário: menos mortes sobe), impacto (ADR), mira (% de abates na cabeça) e suporte (assistências por rodada). A linha tracejada (50) é a média dos membros com amostra suficiente. Cada eixo vai de 0 (30% pior que a média) a 100 (30% melhor que a média); o centro é 0 e a borda é 100.`;

  function radar(nick, d) {
    const ref = mediaGrupo(), J = d.perfil.m6.jogador;
    const pts = EIXOS.map((e) => ({ e, v: J[e.campo], ref: ref[e.campo], p: pontosEixo(e, J[e.campo], ref[e.campo]) }));
    const W = 280, H = 250, cx = W / 2, cy = 126, R = 84;
    const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / EIXOS.length;
    const xy = (i, p) => [cx + ((R * p) / 100) * Math.cos(ang(i)), cy + ((R * p) / 100) * Math.sin(ang(i))];
    const poli = (f) => EIXOS.map((_, i) => xy(i, f(i)).map((n) => n.toFixed(1)).join(',')).join(' ');
    const resumo = pts.map((x) => `${x.e.rotulo} ${x.p === null ? 'sem dado' : Math.round(x.p)}`).join(', ');
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'radar', role: 'img', 'aria-label': `Radar de ${nick} contra a média do grupo (média = 50): ${resumo}` },
      ...[25, 50, 75, 100].map((n) => sv('polygon', { points: poli(() => n), class: n === 50 ? 'radar-media' : 'radar-anel' })),
      ...EIXOS.map((_, i) => { const [x, y] = xy(i, 100); return sv('line', { x1: cx, y1: cy, x2: x.toFixed(1), y2: y.toFixed(1), class: 'radar-eixo' }); }),
      sv('polygon', { points: poli((i) => pts[i].p ?? 0), class: 'radar-area' }),
      ...pts.map((x, i) => {
        const [lx, ly] = xy(i, 100), dx = Math.cos(ang(i)), dy = Math.sin(ang(i));
        const rot = sv('text', { x: (lx + dx * 14).toFixed(1), y: (ly + dy * 12 + 4).toFixed(1), 'text-anchor': Math.abs(dx) < 0.3 ? 'middle' : dx > 0 ? 'start' : 'end', class: 'forte' }, x.e.rotulo);
        if (x.p === null) return rot;
        const [px, py] = xy(i, x.p);
        const c = sv('circle', { cx: px.toFixed(1), cy: py.toFixed(1), r: 5, class: 'radar-ponto', tabindex: '0' });
        dica(c, () => `${x.e.rotulo}: ${val(x.v, x.e.d, x.e.u)} (${x.e.nota}); média do grupo ${val(x.ref, x.e.d, x.e.u)}; pontuação ${Math.round(x.p)} de 100`);
        return [rot, c];
      }).flat());
    return h('figure', { class: 'radar-box' }, svg,
      h('figcaption', { class: 'legenda' }, h('span', null, h('i', { class: 'lg-jogador' }), rotuloMembro(nick)), h('span', null, h('i', { class: 'lg-media' }), 'média do grupo (50)'), infoIcone(textoEscala)));
  }

  // ---------- card de jogador ----------
  const grande = (rot, valor, ref, melhor) => {
    const dif = valor !== null && ref ? (valor - ref) / ref * (melhor === 'menor' ? -1 : 1) : null;
    return h('div', { class: 'jc-num' }, h('span', { class: 'rot' }, rot), h('b', { class: 'grande' }, valor),
      ref !== null && h('small', { class: dif === null ? 'mudo' : dif >= 0 ? 'ok' : 'bad' }, `nível ${ref}`));
  };
  function cartaoJogador(nick, { titulo = 'h1' } = {}) {
    const d = dadosDe(nick);
    const nome = h(titulo, { class: 'jc-nome' }, nick);
    const quem = h('div', { class: 'jc-quem' }, avatar(nick, 76), h('div', { class: 'jc-id' }, nome,
      d && d.nivel && h('span', { class: 'mudo' }, `nível ${d.nivel} na GC`)));
    if (!d || !d.perfil.m6 || !d.perfil.m6.jogador) return h('header', { class: 'cabeca jogador-card' }, quem, h('p', { class: 'nota' }, 'Sem análise: poucas partidas na janela dos últimos 6 meses.'));
    const J = d.perfil.m6.jogador, N = d.perfil.m6.nivel || {};
    const f = d.funcoes, top = f && f.ranking[0];
    const funcao = f && f.sugerida && top
      ? h('div', { class: 'jc-funcao' }, h('span', { class: 'rot' }, 'Função provável'), h('b', null, top.nome), h('small', null, `nota ${top.nota} de 100`), f.amostraPequena && h('span', { class: 'selo' }, 'amostra pequena'),
        infoIcone(`Estimativa pelas estatísticas avançadas da GC (${pl(f.partidasAvancadas, 'partida', 'partidas')}). Veja o porquê na seção "Melhor função" da aba Análise.`))
      : h('div', { class: 'jc-funcao' }, h('span', { class: 'rot' }, 'Função provável'), h('b', { class: 'mudo' }, 'sem dados avançados'));
    return h('header', { class: 'cabeca jogador-card' },
      h('div', { class: 'jc-esq' }, quem, funcao,
        h('div', { class: 'jc-nums' }, grande('K/D', fmt(J.kd, 2), N.kd !== undefined ? fmt(N.kd, 2) : null, 'maior'), grande('ADR', fmt(J.adr, 1), N.adr !== undefined ? fmt(N.adr, 1) : null, 'maior'), grande('Rating aprox.', fmt(J.rating, 2), N.rating !== undefined ? fmt(N.rating, 2) : null, 'maior')),
        h('p', { class: 'nota' }, `${pl(d.base.partidasJanela, 'partida', 'partidas')} nos ${janelaTexto()}. "Nível" é a média de quem jogou no mesmo nível nas mesmas partidas.`)),
      radar(nick, d));
  }
  GT.cartaoJogador = cartaoJogador;
  GT.linkAnalise = linkAnalise;

  // ---------- seções ----------
  const seletor = (atual) => h('nav', { class: 'sel-membros', 'aria-label': 'Escolher membro' },
    ...G.membros.map((m) => h('a', { href: linkAnalise(m.nick), class: 'chip-m' + (m.nick === atual ? ' ativo' : ''), 'aria-current': m.nick === atual ? 'page' : null, title: m.nick }, avatar(m.nick, 20), h('span', { class: 'chip-m-nome' }, rotuloMembro(m.nick)))));

  // Resumo visual: base da amostra, 5 números contra o nível (barra do membro x barra do nível), placar de fortes x fracos e os destaques.
  const KPIS = [
    { rot: 'K/D', campo: 'kd', d: 2, cor: 'var(--c1)' },
    { rot: 'ADR', campo: 'adr', d: 1, cor: 'var(--c2)' },
    { rot: 'HS%', campo: 'hsPct', d: 1, u: '%', cor: 'var(--c3)' },
    { rot: 'KAST', campo: 'kastPct', d: 1, u: '%', cor: 'var(--c6)' },
    { rot: 'Rating aprox.', campo: 'rating', d: 2, cor: 'var(--c4)' },
  ];
  const kpi = (k, J, N) => {
    const v = J[k.campo], ref = N[k.campo];
    const temRef = Number.isFinite(v) && Number.isFinite(ref) && ref > 0;
    const dif = temRef ? (v - ref) / ref : null;
    const tipo = dif === null ? 'neutro' : Math.abs(dif) < 0.02 ? 'neutro' : dif > 0 ? 'ok' : 'bad';
    const topo = temRef ? Math.max(v, ref) * 1.12 : 1;
    const larg = (x) => `width:${Math.max(3, Math.min(100, (x / topo) * 100)).toFixed(1)}%`;
    return h('div', { class: 'rs-kpi', estilo: `--k:${k.cor}` },
      h('div', { class: 'rs-kpi-topo' }, h('span', { class: 'rot' }, k.rot),
        dif !== null && h('span', { class: 'rs-dif ' + tipo }, tipo === 'neutro' ? 'na média' : `${dif > 0 ? '▲' : '▼'} ${Math.round(Math.abs(dif) * 100)}%`)),
      h('b', { class: 'rs-kpi-v' }, val(v, k.d, k.u)),
      temRef && h('div', { class: 'rs-cmp' },
        h('div', null, h('span', null, 'membro'), h('span', { class: 'rs-trilho' }, h('i', { class: 'eu', estilo: larg(v) }))),
        h('div', null, h('span', null, 'nível'), h('span', { class: 'rs-trilho' }, h('i', { class: 'ref', estilo: larg(ref) }))),
        h('span', null, `média do nível: ${val(ref, k.d, k.u)}`)));
  };
  const resumo = (nick, d) => {
    const J = d.perfil.m6.jogador, N = d.perfil.m6.nivel || {}, f = d.funcoes && d.funcoes.sugerida ? d.funcoes.ranking[0] : null;
    const maisForte = d.fortes[0], maisFraco = d.fracos[0];
    const nf = d.fortes.length, nr = d.fracos.length, tot = nf + nr;
    const dest = (tipo, rot, titulo, texto) => h('div', { class: 'rs-dest ' + tipo }, h('span', { class: 'rot' }, rot), h('b', null, titulo), texto && h('small', null, texto));
    return h('div', { class: 'rs' },
      h('div', { class: 'rs-base' },
        h('span', { class: 'pilula', estilo: '--p:var(--c1)' }, h('b', null, d.base.partidasJanela), d.base.partidasJanela === 1 ? 'partida na base' : 'partidas na base'),
        h('span', { class: 'pilula', estilo: '--p:var(--c2)' }, h('b', null, d.base.partidasAvancadas), 'com GC avançada'),
        h('span', { class: 'pilula', estilo: '--p:var(--c6)' }, janelaTexto())),
      h('div', { class: 'rs-kpis' }, ...KPIS.map((k) => kpi(k, J, N))),
      h('div', { class: 'rs-placar', 'aria-label': `${pl(nf, 'ponto forte', 'pontos fortes')} e ${pl(nr, 'ponto fraco', 'pontos fracos')}` },
        h('span', { class: 'ok' }, h('b', null, nf), nf === 1 ? 'ponto forte' : 'pontos fortes'),
        tot > 0 && h('span', { class: 'rs-balanca', 'aria-hidden': 'true' }, h('i', { estilo: `width:${(nf / tot) * 100}%` }), h('i', { estilo: `width:${(nr / tot) * 100}%` })),
        h('span', { class: 'bad' }, h('b', null, nr), nr === 1 ? 'ponto fraco' : 'pontos fracos'),
        infoIcone('Contra a média de quem jogou no mesmo nível nas mesmas partidas; só entram números com amostra suficiente.')),
      h('div', { class: 'rs-destaques' },
        maisForte && dest('forte', 'Maior destaque', maisForte.rotulo, `${difTexto(maisForte.diferencaRelativa)} que o nível · ${val(maisForte.valor, maisForte.decimais, maisForte.unidade)} contra ${val(maisForte.referencia, maisForte.decimais, maisForte.unidade)}`),
        maisFraco && dest('fraco', 'Maior ponto de atenção', maisFraco.rotulo, `${difTexto(maisFraco.diferencaRelativa)} que o nível · ${val(maisFraco.valor, maisFraco.decimais, maisFraco.unidade)} contra ${val(maisFraco.referencia, maisFraco.decimais, maisFraco.unidade)}`),
        f && dest('funcao', 'Função mais provável', f.nome, `nota ${f.nota} de 100${d.funcoes.amostraPequena ? ' · amostra pequena' : ''}`)));
  };

  const itemPonto = (x, tipo) => h('li', { class: 'ponto-item ' + tipo },
    h('div', { class: 'pi-topo' }, h('b', null, x.rotulo), x.info && infoIcone(x.info), h('span', { class: 'selo' }, x.fonte)),
    h('div', { class: 'pi-nums' }, h('span', { class: 'pi-v ' + (tipo === 'forte' ? 'ok' : 'bad') }, val(x.valor, x.decimais, x.unidade)), h('span', { class: 'mudo' }, `nível ${val(x.referencia, x.decimais, x.unidade)}`),
      h('span', { class: 'pi-dif ' + (tipo === 'forte' ? 'ok' : 'bad') }, difTexto(x.diferencaRelativa))),
    h('small', { class: 'mudo' }, `amostra: ${fmt(x.amostra, 0)} (mínimo ${fmt(x.amostraMinima, 0)})`));
  const listaPontos = (itens, tipo, vazio) => (itens.length ? h('ul', { class: 'pontos' }, ...itens.map((x) => itemPonto(x, tipo))) : h('p', { class: 'vazio' }, vazio));

  const recomendacao = (r) => h('article', { class: 'rec' },
    h('h3', null, r.titulo), h('p', null, r.achado), ...(r.outrosAchados || []).map((t) => h('p', { class: 'mudo' }, t)),
    h('div', null, h('span', { class: 'rot' }, 'O que treinar'), h('ul', null, ...r.treinar.map((t) => h('li', null, t)))),
    r.acompanhar && h('p', { class: 'acomp' }, h('b', null, 'Acompanhar: '), `${r.acompanhar.rotulo}, hoje ${fmt(r.acompanhar.atual, r.acompanhar.decimais)}${r.acompanhar.unidade || ''}; meta: ${r.acompanhar.textoMeta}.`));

  function secaoFuncao(d) {
    const f = d.funcoes;
    if (!f) return card('Melhor função', null, h('p', { class: 'vazio' }, 'Sem estatísticas avançadas da GC na janela: não dá para estimar a função.'));
    const top = f.ranking[0];
    const porque = top.componentes.map((c) => h('li', null, h('b', null, c.rotulo), `: ${val(c.valor, c.decimais, c.unidade)} contra ${val(c.referencia, c.decimais, c.unidade)} de referência (${c.pts} pontos, peso ${Math.round(c.pesoReal * 100)}%)`));
    return card('Melhor função', `Nota de 0 a 100 para cada função, só com números do motor de análise. Cada número do jogador é comparado com a média do mesmo nível: igual ao nível vale 50 e o dobro vale 100. A AWP usa a participação da arma (50% ou mais vale 100). ${f.amostraPequena ? `Amostra pequena: só ${pl(f.partidasAvancadas, 'partida', 'partidas')} com estatísticas avançadas (mínimo ${f.minimoPartidas}).` : ''}`,
      h('div', { class: 'rank rank50 funcoes', role: 'list' }, ...f.ranking.map((r, i) => {
        const l = h('div', { role: 'listitem', class: i === 0 && r.nota !== null ? 'topo' : '' }, h('span', { class: 'nome' }, r.nome), barra((r.nota || 0) / 100, i === 0 ? 'bom' : ''), h('em', null, r.nota === null ? 'sem dado' : r.nota));
        dica(l, () => r.descricao);
        return l;
      })),
      f.sugerida && h('div', { class: 'porque' }, h('h3', null, `Por que ${top.nome}`), h('p', { class: 'nota' }, top.descricao), h('ul', null, ...porque)));
  }

  function secaoMapas(d) {
    const MIN = 6;
    const lin = (d.mapas || []).filter((m) => m.jogador).map((m) => {
      const j = m.jogador, n = m.nivel || {};
      const score = n.rating ? (j.rating - n.rating) / n.rating : 0;
      return { mapa: m.mapa, partidas: j.partidas, win: j.vitoriaPct, kd: j.kd, adr: j.adr, rating: j.rating, ratingNivel: n.rating, score };
    });
    const ok = lin.filter((x) => x.partidas >= MIN).sort((a, b) => b.score - a.score), poucos = lin.filter((x) => x.partidas < MIN);
    if (!ok.length) return card('Melhores e piores mapas', null, h('p', { class: 'vazio' }, `Nenhum mapa com ${MIN} partidas ou mais na janela.`));
    const metade = Math.ceil(ok.length / 2), melhores = ok.slice(0, Math.min(3, metade)), piores = ok.slice(metade).slice(-3).reverse();
    const tab = (rows, tipo) => GT.u.tabela([{ t: 'Mapa', f: (r) => r.mapa }, { t: 'Part.', f: (r) => r.partidas }, { t: 'Vitórias', f: (r) => h('span', { class: r.win >= 50 ? 'ok' : 'bad' }, fmt(r.win, 0) + '%') }, { t: 'K/D', f: (r) => fmt(r.kd, 2) },
      { t: 'Rating', f: (r) => h('span', { class: r.score >= 0 ? 'ok' : 'bad' }, fmt(r.rating, 2)) }, { t: 'Nível', f: (r) => fmt(r.ratingNivel, 2) }], rows);
    return h('div', { class: 'bloco-mapas' },
      h('div', { class: 'grade2' },
        card('Melhores mapas', `Pelo rating aproximado contra a média do nível no mesmo mapa (mínimo ${MIN} partidas no mapa).`, tab(melhores)),
        card('Piores mapas', 'Os mapas em que o rating mais ficou abaixo do nível.', piores.length ? tab(piores) : h('p', { class: 'vazio' }, 'Poucos mapas com amostra para separar os piores.'))),
      poucos.length > 0 && h('p', { class: 'nota' }, `Fora da lista por ter menos de ${MIN} partidas: ${poucos.map((x) => `${x.mapa} (${x.partidas})`).join(', ')}.`));
  }

  function secaoDuelos(d) {
    const J = d.avancada && d.avancada.jogador, N = d.avancada && d.avancada.nivel;
    if (!J) return card('Duelos por ordem na rodada', null, h('p', { class: 'vazio' }, 'Sem estatísticas avançadas da GC na janela.'));
    const nomes = { '1': '1º duelo', '2': '2º duelo', '3': '3º duelo', '4+': '4º em diante' };
    const rows = Object.keys(nomes).map((o) => ({ o, ...J.duelos.porOrdem[o], nivel: N && N.duelos.porOrdem[o] ? N.duelos.porOrdem[o].ganhosPct : null }));
    const lado = (l) => J.duelos.primeiroPorLado[l];
    return card('Duelos por ordem na rodada', `Ganhos e perdas de cada duelo na ordem em que acontece na rodada (1º, 2º, 3º...). O número em "Time vence" é o % de rodadas vencidas pelo time quando ele ganha ou perde aquele duelo. ${pl(J.duelos.tentativasPrimeiroDuelo, 'tentativa', 'tentativas')} de 1º duelo em ${pl(d.base.partidasAvancadas, 'partida', 'partidas')}.`,
      h('div', { class: 'rolar' }, GT.u.tabela([{ t: 'Duelo', f: (r) => nomes[r.o] }, { t: 'Ganhou', f: (r) => r.ganhos }, { t: 'Perdeu', f: (r) => r.perdidos },
        { t: '% ganhos', f: (r) => h('span', { class: r.nivel !== null ? (r.ganhosPct >= r.nivel ? 'ok' : 'bad') : '' }, fmt(r.ganhosPct, 0) + '%') }, { t: 'Nível', f: (r) => (r.nivel === null ? '—' : fmt(r.nivel, 0) + '%') },
        { t: 'Time vence ao ganhar', f: (r) => fmt(r.timeVenceAoGanharPct, 0) + '%' }, { t: 'Time vence ao perder', f: (r) => fmt(r.timeVenceAoPerderPct, 0) + '%' }], rows)),
      h('p', { class: 'nota' }, `1º duelo como T: ${lado('T').ganhos} ganhos e ${lado('T').perdidos} perdidos (${fmt(lado('T').ganhosPct, 0)}%); como CT: ${lado('CT').ganhos} e ${lado('CT').perdidos} (${fmt(lado('CT').ganhosPct, 0)}%).`));
  }

  function secaoLimites(d) {
    const b = d.base, av = A();
    return card('Limites desta análise', null, h('ul', { class: 'limites' },
      h('li', null, `Perfil da GC (K/D, ADR, HS%, KAST, rating): ${pl(b.partidasJanela, 'partida', 'partidas')} na janela dos últimos ${av.janela.meses} meses. É a base mais sólida.`),
      h('li', null, `Detalhe avançado (entradas, clutches, trocas, mira, utilitários, economia, duelos): só ${pl(b.partidasAvancadas, 'partida', 'partidas')}. A GC guarda esse detalhe por cerca de uma semana e ele só entra nas partidas coletadas por um assinante; abaixo de 8 partidas os números são indicativos, não conclusões.`),
      h('li', null, `Demos lidas: ${pl(b.partidasDemo, 'partida', 'partidas')} (mínimo de 5 para falar de mortes cego e utilitários da demo).`),
      h('li', null, 'Todas as comparações são contra a média de jogadores do mesmo nível nas mesmas partidas, e só valem quando a amostra chega ao mínimo da métrica. O radar usa a média dos membros do grupo.'),
      h('li', null, 'A função provável é uma estimativa por números, não define como a pessoa joga.'),
      ...d.avisos.map((a) => h('li', { class: 'aviso' }, a.texto))));
  }

  GT.registrarAba({ id: 'analise', titulo: 'Análise', ordem: 65, aceitaVazio: true, apelidos: ['analises'],
    rotaLer(resto) { E.membro = resto.join('/') || null; },
    rotaEscrever() { return E.membro ? '/' + E.membro : ''; },
    render(el, ctx) {
      const filtros = document.getElementById('filtros'); if (filtros) { filtros.replaceChildren(); filtros.hidden = true; } // janela fixa: os filtros de período e mapa não se aplicam
      if (!A()) { el.append(h('p', { class: 'vazio' }, 'Análise não disponível nestes dados. Gere o site de novo com: npm run tracker')); return; }
      const nicks = G.membros.map((m) => m.nick);
      if (!nicks.includes(E.membro)) E.membro = nicks.find((n) => dadosDe(n)) || nicks[0];
      const nick = E.membro, d = dadosDe(nick);
      el.append(h('div', { class: 'cabeca' }, h('h1', null, 'Análise individual'),
        h('p', { class: 'lead' }, `Pontos fortes e fracos de cada membro contra a média de quem joga no mesmo nível, nos ${janelaTexto()}. Os filtros de período e mapa não valem aqui.`)),
        seletor(nick));
      if (!d || !d.perfil.m6 || !d.perfil.m6.jogador) { el.append(cartaoJogador(nick, { titulo: 'h2' }), h('p', { class: 'vazio' }, `${nick} não tem partidas suficientes na janela para a análise.`)); return; }
      el.append(cartaoJogador(nick, { titulo: 'h2' }),
        card('Resumo', null, resumo(nick, d)),
        ...(GT.estilo && ctx ? GT.estilo.secoes(nick, ctx) : []),
        h('div', { class: 'grade2' },
          card('Pontos fortes', 'O que está acima da média do mesmo nível, do que mais se destaca para o que menos.', listaPontos(d.fortes, 'forte', 'Nenhum número passou do limite acima do nível com amostra suficiente.')),
          card('Pontos fracos', 'O que está abaixo da média do mesmo nível, do pior para o menos pior.', listaPontos(d.fracos, 'fraco', 'Nenhum número ficou abaixo do nível com amostra suficiente.'))),
        card('A melhorar', 'Recomendações do catálogo para os pontos fracos, com o que treinar e o número a acompanhar.',
          d.recomendacoes.length ? h('div', { class: 'recs' }, ...d.recomendacoes.map(recomendacao)) : h('p', { class: 'vazio' }, 'Sem recomendações: nenhum ponto fraco com amostra suficiente.')),
        secaoFuncao(d), secaoMapas(d), secaoDuelos(d), secaoLimites(d));
    } });
})();
