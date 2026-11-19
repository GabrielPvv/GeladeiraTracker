// Estilo de jogo de cada membro (seções da aba Análise e o "Mapa de estilos" da Home).
// Base: os números da GC que existem em TODAS as partidas (abates, mortes, dano, KAST, primeiro abate, assistência de flash,
// acertos e acertos na cabeça, bombas, desarmes, 3K+), somados e divididos no fim. Referência: a média dos membros (mesma conta).
// Onde houver estatísticas avançadas (G.analise), entram também momento da morte, mortes sem troca, lados T/CT e economia.
// Exporta GT.estilo = { secoes(nick, ctx), mapa(ctx, destaque) }.
(function () {
  'use strict';
  const GT = window.GT, G = GT.G;
  const { h, sv, pl, card, avatar, dica, infoIcone, grafico, linkMembro } = GT.u;

  const MIN_ROD = 150; // rodadas para um membro entrar nas comparações
  const desde = () => (G.analise && G.analise.janela ? G.analise.janela.desde : null);
  const partidasJanela = (ctx) => { const d = desde(); return d ? ctx.D.partidas.filter((m) => m.d >= d) : ctx.D.partidas; };

  function somar(linhas) {
    const s = { partidas: 0, v: 0, d: 0, rod: 0, k: 0, m: 0, a: 0, dano: 0, hs: 0, kast: 0, fk: 0, mk: 0, fa: 0, hit: 0, hh: 0, pl: 0, df: 0 };
    for (const { x, r } of linhas) {
      s.partidas++; if (r === 'V') s.v++; if (r === 'D') s.d++;
      s.rod += x.rod; s.k += x.k; s.m += x.m; s.a += x.a; s.dano += x.dano; s.hs += x.hs; s.kast += x.kast; s.fk += x.fk; s.mk += x.mk || 0;
      s.fa += x.fa || 0; s.hit += x.hit || 0; s.hh += x.hh || 0; s.pl += x.pl || 0; s.df += x.df || 0;
    }
    const R = Math.max(1, s.rod);
    return { ...s, wr: s.v / Math.max(1, s.v + s.d), kd: s.k / Math.max(1, s.m), kpr: s.k / R, dpr: s.m / R, adr: s.dano / R, kastP: s.kast / R, hsP: s.hs / Math.max(1, s.k),
      fkR: s.fk / R, mkR: s.mk / R, fa100: (s.fa / R) * 100, apr: s.a / R, hitK: s.hit / Math.max(1, s.k), headHit: s.hh / Math.max(1, s.hit), pl100: (s.pl / R) * 100, df100: (s.df / R) * 100 };
  }
  // Linhas de cada membro (com o resultado da partida para ele) e por mapa.
  function porMembro(ms) {
    const m = new Map();
    for (const p of ms) for (const x of p.mem) { if (!m.has(x.n)) m.set(x.n, []); m.get(x.n).push({ x, r: x.r, mp: p.mp }); }
    return m;
  }
  function dadosEstilo(ctx) {
    return ctx.cache('estilo', () => {
      const ms = partidasJanela(ctx), pm = porMembro(ms);
      const todos = []; for (const l of pm.values()) todos.push(...l);
      const grupo = somar(todos);
      const membros = new Map([...pm].map(([n, l]) => [n, { ...somar(l), linhas: l }]));
      // Índices (50 = média do grupo): exposição = primeiro abate e mortes por rodada; impacto = ADR e KAST.
      const idx = (a, b) => Math.max(0, Math.min(100, 50 + ((a - 1) + (b - 1)) / 2 * 50 / 0.3));
      for (const [n, s] of membros) {
        s.exposicao = idx(s.fkR / grupo.fkR, s.dpr / grupo.dpr);
        // Impacto contra o PRÓPRIO NÍVEL da GC (perfil de 6 meses da Análise), para não punir quem joga num nível mais baixo que a
        // média do grupo; sem perfil, cai para a média do grupo.
        const an = G.analise && G.analise.membros && G.analise.membros[n], J = an && an.perfil && an.perfil.m6 && an.perfil.m6.jogador, N = an && an.perfil && an.perfil.m6 && an.perfil.m6.nivel;
        if (J && N && N.adr && N.kastPct) { s.impacto = idx(J.adr / N.adr, J.kastPct / N.kastPct); s.refImpacto = 'nível'; s.impAdr = [J.adr, N.adr]; s.impKast = [J.kastPct, N.kastPct]; }
        else { s.impacto = idx(s.adr / grupo.adr, s.kastP / grupo.kastP); s.refImpacto = 'grupo'; }
        const fn = an && an.funcoes && an.funcoes.sugerida ? an.funcoes.ranking[0] : null;
        s.funcao = fn ? fn.nome : null;
        s.ok = s.rod >= MIN_ROD;
      }
      return { grupo, membros, partidas: ms.length };
    });
  }

  const QUADS = {
    aa: { t: 'Abre rodada e resolve', d: 'Se expõe mais que o grupo e devolve impacto acima do próprio nível. Continua abrindo rodadas, com o time perto para trocar.' },
    ab: { t: 'Abre rodada, mas se expõe demais', d: 'Toma muito duelo e o impacto fica abaixo do próprio nível. Vale entrar em segundo, esperar flash e buscar troca.' },
    pa: { t: 'Paciente e eficiente', d: 'Se expõe menos que o grupo e mesmo assim rende no próprio nível ou acima: perfil de lurker ou âncora. Pode arriscar mais quando o time precisar de abertura.' },
    pb: { t: 'Paciente, impacto a crescer', d: 'Se expõe menos que o grupo e o impacto fica abaixo do próprio nível. Dá para ganhar espaço com info, utilitário e jogando mais perto da ação.' },
  };
  const quad = (s) => QUADS[(s.exposicao >= 50 ? 'a' : 'p') + (s.impacto >= 50 ? 'a' : 'b')];
  // Quem joga de lurker, âncora ou AWP pega menos primeiro abate por função: o veredito diz isso em vez de tratar como falta.
  const notaFuncao = (s) => (s.funcao && s.exposicao < 50 && /Lurker|Âncora|AWP/.test(s.funcao) ? `Exposição baixa combina com a função provável (${s.funcao}): quem fecha rodada ou segura bomb pega menos primeiro abate.` : null);

  // ---------- mapa de estilos (dispersão) ----------
  function mapaEstilos(ctx, destaque) {
    const D = dadosEstilo(ctx), pts = [...D.membros].filter(([, s]) => s.ok);
    return grafico((el) => {
      const W = Math.max(280, Math.min(el.clientWidth || 560, 720)), H = Math.round(Math.min(380, W * 0.7)), P = 34;
      const X = (v) => P + (v / 100) * (W - 2 * P), Y = (v) => H - P - (v / 100) * (H - 2 * P);
      const zona = (x, y, w, hh, cor) => sv('rect', { x: X(x), y: Y(y + hh), width: X(x + w) - X(x), height: Y(y) - Y(y + hh), fill: cor, opacity: '.10', rx: 6 });
      const rot = (x, y, t, anc) => sv('text', { x, y, 'text-anchor': anc, class: 'est-quad' }, t);
      const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'est-mapa', role: 'img', 'aria-label': 'Mapa de estilos: exposição no eixo horizontal, impacto no vertical; 50 é a média do grupo' },
        zona(50, 50, 50, 50, 'var(--ok)'), zona(50, 0, 50, 50, 'var(--bad)'), zona(0, 50, 50, 50, 'var(--c1)'), zona(0, 0, 50, 50, 'var(--aviso)'),
        sv('line', { x1: X(50), x2: X(50), y1: Y(0), y2: Y(100), class: 'linha-ref' }), sv('line', { x1: X(0), x2: X(100), y1: Y(50), y2: Y(50), class: 'linha-ref' }),
        rot(X(98), Y(96), 'agressivo que resolve', 'end'), rot(X(98), Y(3), 'se expõe demais', 'end'), rot(X(2), Y(96), 'paciente e eficiente', 'start'), rot(X(2), Y(3), 'passivo', 'start'),
        sv('text', { x: W / 2, y: H - 6, 'text-anchor': 'middle' }, 'exposição (1º abate e mortes por rodada) →'),
        sv('text', { x: 12, y: H / 2, 'text-anchor': 'middle', transform: `rotate(-90 12 ${H / 2})` }, 'impacto no próprio nível →'),
        ...(() => { const usados = []; return pts.map(([n, s]) => {
          const eu = n === destaque, cx = X(s.exposicao), cy = Y(s.impacto);
          // Nome acima do ponto; se bater em outro nome já colocado, vai para baixo.
          let ly = cy - (eu ? 15 : 12);
          if (usados.some((u) => Math.abs(u.x - cx) < 70 && Math.abs(u.y - ly) < 13)) ly = cy + (eu ? 25 : 22);
          usados.push({ x: cx, y: ly });
          const g = sv('g', { class: 'est-pt' + (eu ? ' eu' : ''), tabindex: '0' },
            sv('circle', { cx, cy, r: eu ? 11 : 8, class: 'est-bola', fill: 'var(--' + ((avatar(n).className.match(/av\d/) || ['av0'])[0]) + ')' }),
            sv('text', { x: cx, y: ly, 'text-anchor': 'middle', class: 'forte est-nome' }, n));
          dica(g, () => `${n}: ${quad(s).t} · exposição ${Math.round(s.exposicao)}, impacto ${Math.round(s.impacto)} (contra o ${s.refImpacto === 'nível' ? 'próprio nível' : 'grupo'})${s.funcao ? ' · função ' + s.funcao : ''} · 1º abate ${s.fkR.toFixed(3)}/rod., mortes ${s.dpr.toFixed(2)}/rod.`);
          return g;
        }); })());
      el.replaceChildren(svg);
    }, 'grafico est-caixa');
  }

  // ---------- perfil completo contra o grupo ----------
  const ITENS = [
    { k: 'kd', rot: 'K/D', f: (x) => x.toFixed(2), grupo: 'Duelo' },
    { k: 'adr', rot: 'ADR', f: (x) => x.toFixed(1), grupo: 'Duelo' },
    { k: 'kastP', rot: 'KAST', f: (x) => Math.round(x * 100) + '%', grupo: 'Duelo' },
    { k: 'mkR', rot: 'Rodadas com 3+ abates', f: (x) => (x * 100).toFixed(1) + '%', grupo: 'Duelo', info: 'Parte das rodadas em que fez 3 abates ou mais.' },
    { k: 'fkR', rot: '1º abate por rodada', f: (x) => x.toFixed(3), grupo: 'Abertura' },
    { k: 'dpr', rot: 'Mortes por rodada', f: (x) => x.toFixed(2), grupo: 'Abertura', menor: true },
    { k: 'hsP', rot: 'Abates na cabeça', f: (x) => Math.round(x * 100) + '%', grupo: 'Mira' },
    { k: 'headHit', rot: 'Acertos na cabeça', f: (x) => Math.round(x * 100) + '%', grupo: 'Mira', info: 'De todos os tiros que acertam, quantos pegam na cabeça. Baixo = mira na altura do peito.' },
    { k: 'hitK', rot: 'Acertos por abate', f: (x) => x.toFixed(1), grupo: 'Mira', menor: true, info: 'Quantos tiros que acertam ele precisa, em média, para cada abate. Alto = demora para finalizar (spray, tiro em movimento).' },
    { k: 'fa100', rot: 'Assist. de flash / 100 rod.', f: (x) => x.toFixed(1), grupo: 'Time' },
    { k: 'apr', rot: 'Assistências por rodada', f: (x) => x.toFixed(2), grupo: 'Time' },
    { k: 'pl100', rot: 'Bombas plantadas / 100 rod.', f: (x) => x.toFixed(1), grupo: 'Objetivo' },
    { k: 'df100', rot: 'Desarmes / 100 rod.', f: (x) => x.toFixed(1), grupo: 'Objetivo' },
  ];
  function perfil(s, G0) {
    const linha = (it) => {
      const v = s[it.k], r = G0[it.k];
      const dif = r ? ((v - r) / r) * (it.menor ? -1 : 1) : 0;
      const tipo = Math.abs(dif) < 0.05 ? 'neutro' : dif > 0 ? 'ok' : 'bad';
      const pos = Math.max(-1, Math.min(1, dif / 0.4)); // ±40% = ponta da barra
      const el = h('div', { class: 'est-linha' },
        h('span', { class: 'est-rot' }, it.rot, it.info && infoIcone(it.info)),
        h('span', { class: 'est-barra', 'aria-hidden': 'true' }, h('i', { class: tipo, estilo: pos >= 0 ? `left:50%;width:${(pos * 50).toFixed(1)}%` : `left:${(50 + pos * 50).toFixed(1)}%;width:${(-pos * 50).toFixed(1)}%` })),
        h('b', { class: tipo === 'neutro' ? '' : tipo }, it.f(v)), h('small', null, `grupo ${it.f(r)}`));
      return el;
    };
    const grupos = [...new Set(ITENS.map((i) => i.grupo))];
    return h('div', { class: 'est-perfil' }, ...grupos.map((g) => h('div', { class: 'est-grupo' }, h('h3', null, g), ...ITENS.filter((i) => i.grupo === g).map(linha))));
  }

  // ---------- avançadas: morte, lados e economia ----------
  function avancadas(nick) {
    const a = G.analise && G.analise.membros && G.analise.membros[nick], J = a && a.avancada && a.avancada.jogador, N = a && a.avancada && a.avancada.nivel;
    if (!J || !J.mortes || !J.lados) return null;
    const pctTxt = (x) => (x === null || x === undefined ? '—' : Math.round(x) + '%');
    const lado = (id, rot) => { const l = J.lados[id], ln = N && N.lados ? N.lados[id] : null; return h('div', { class: 'rs-kpi', estilo: `--k:${id === 't' ? 'var(--c4)' : 'var(--c1)'}` },
      h('span', { class: 'rot' }, rot), h('b', { class: 'rs-kpi-v' }, l.kd.toFixed(2)), h('small', { class: 'mudo' }, `K/D · ${pctTxt(l.vitoriaPct)} das rodadas ganhas${ln ? ` · nível ${ln.kd.toFixed(2)}` : ''}`)); };
    const eco = J.economia || {};
    const ECO = [['pistol', 'Pistol'], ['eco', 'Eco'], ['force', 'Force'], ['full', 'Compra cheia']];
    const morte = J.mortes, Nm = N && N.mortes;
    const k = (rot, v, ref, menor, cor, info) => { const tipo = ref === null || ref === undefined ? '' : (menor ? v <= ref : v >= ref) ? 'ok' : 'bad';
      return h('div', { class: 'rs-kpi', estilo: `--k:${cor}` }, h('span', { class: 'rot' }, rot, info && infoIcone(info)), h('b', { class: 'rs-kpi-v ' + tipo }, v === null || v === undefined ? '—' : typeof v === 'number' && rot.includes('Segundo') ? Math.round(v) + ' s' : pctTxt(v)),
        ref !== null && ref !== undefined && h('small', { class: 'mudo' }, `nível ${rot.includes('Segundo') ? Math.round(ref) + ' s' : pctTxt(ref)}`)); };
    return h('div', { class: 'est-av' },
      h('div', { class: 'rs-kpis' },
        k('Mortes nos primeiros 30 s', morte.antes30sPct, Nm && Nm.antes30sPct, true, 'var(--c3)', 'Parte das mortes que acontecem nos 30 primeiros segundos da rodada. Alto = joga muito agressivo no começo.'),
        k('Mortes sem troca', morte.semTrocaPct, Nm && Nm.semTrocaPct, true, 'var(--c4)', 'Parte das mortes em que ninguém do time matou o assassino logo depois. Alto = morre longe do time.'),
        k('Segundo da rodada em que morre', morte.segundoMediana, Nm && Nm.segundoMediana, false, 'var(--c6)', 'Mediana do momento da morte. Baixo = morre cedo.'),
        k('Clutches ganhos', J.clutch ? J.clutch.pct : null, N && N.clutch ? N.clutch.pct : null, false, 'var(--c2)', 'Rodadas vencidas sozinho contra 1 ou mais.')),
      h('div', { class: 'rs-kpis' }, lado('t', 'Lado T'), lado('ct', 'Lado CT'),
        ...ECO.filter(([id]) => eco[id] && eco[id].rodadas).map(([id, rot]) => h('div', { class: 'rs-kpi', estilo: '--k:var(--c5)' }, h('span', { class: 'rot' }, rot), h('b', { class: 'rs-kpi-v' }, eco[id].kd.toFixed(2)), h('small', { class: 'mudo' }, `K/D · ${pl(eco[id].rodadas, 'rodada', 'rodadas')} · ${pctTxt(eco[id].vitoriaPct)} ganhas`)))),
      h('p', { class: 'nota' }, `Estatísticas avançadas da GC (${pl(J.partidas, 'partida', 'partidas')}). "Nível" é a média de quem jogou no mesmo nível nas mesmas partidas.`));
  }

  // ---------- o que trabalhar ----------
  function plano(nick, s, G0) {
    const a = G.analise && G.analise.membros && G.analise.membros[nick], J = a && a.avancada && a.avancada.jogador, N = a && a.avancada && a.avancada.nivel;
    const rel = (k, menor) => (G0[k] ? ((s[k] - G0[k]) / G0[k]) * (menor ? -1 : 1) : 0);
    const pctD = (x) => `${Math.round(Math.abs(x) * 100)}%`;
    const out = [];
    const add = (peso, titulo, porque, treino, meta) => out.push({ peso, titulo, porque, treino, meta });
    if (rel('dpr', true) < -0.08 && rel('kastP') < -0.03) add(-rel('dpr', true) - rel('kastP'), 'Morrer menos sem participar da rodada',
      `Morre ${pctD(rel('dpr', true))} mais por rodada que o grupo e o KAST está ${pctD(rel('kastP'))} abaixo.`,
      ['Entrar em segundo, logo atrás de quem abre, para trocar a morte.', 'Não dar peek seco: pedir flash ou esperar info antes.', 'Depois de um abate, reposicionar em vez de repetir o ângulo.'], `KAST ${Math.round(G0.kastP * 100)}% (média do grupo)`);
    if (rel('headHit') < -0.12) add(-rel('headHit'), 'Mira na altura da cabeça',
      `Só ${Math.round(s.headHit * 100)}% dos acertos pegam na cabeça (grupo ${Math.round(G0.headHit * 100)}%).`,
      ['10 min por dia de crosshair placement (mapa de prefire ou Aim Botz), mira sempre na altura da cabeça ao andar.', 'Em DM, só tiro na cabeça (modo HS only).'], `${Math.round(G0.headHit * 100)}% dos acertos na cabeça`);
    if (rel('hitK', true) < -0.12) add(-rel('hitK', true), 'Finalizar duelos com menos tiros',
      `Precisa de ${s.hitK.toFixed(1)} acertos por abate (grupo ${G0.hitK.toFixed(1)}).`,
      ['Parar antes de atirar (counter-strafe) e treinar tap e burst de 2 ou 3 tiros.', 'Spray control de AK e M4 nos primeiros 10 tiros.'], `${G0.hitK.toFixed(1)} acertos por abate`);
    if (rel('fa100') < -0.3) add(-rel('fa100') * 0.7, 'Usar mais flash para o time',
      `${s.fa100.toFixed(1)} assistências de flash por 100 rodadas (grupo ${G0.fa100.toFixed(1)}).`,
      ['Aprender 2 pop-flashes por bomb nos mapas mais jogados.', 'Combinar com quem abre: flash antes do peek dele.'], `${G0.fa100.toFixed(1)} por 100 rodadas`);
    if (s.exposicao >= 55 && s.impacto < 48) add(0.25 + (s.exposicao - 50) / 100, 'Abrir rodada com apoio',
      `Exposição ${Math.round(s.exposicao)} (acima do grupo) com impacto ${Math.round(s.impacto)} (abaixo do próprio nível).`,
      ['Entrar só com flash ou smoke de apoio.', 'Combinar a dupla de entrada: quem abre e quem troca.'], 'impacto 50 ou mais no mapa de estilos');
    if (s.exposicao < 42 && s.impacto < 48 && !notaFuncao(s)) add(0.25 + (50 - s.exposicao) / 100, 'Ganhar mais participação',
      `Exposição ${Math.round(s.exposicao)} e impacto ${Math.round(s.impacto)} (abaixo do próprio nível).`,
      ['Pegar posições de informação e falar no rádio.', 'Jogar perto da dupla principal para trocar e ganhar abates.'], 'KAST e ADR na média do grupo');
    if (rel('mkR') < -0.25) add(-rel('mkR') * 0.6, 'Virar mais rodadas com multiabate',
      `${(s.mkR * 100).toFixed(1)}% das rodadas com 3 ou mais abates (grupo ${(G0.mkR * 100).toFixed(1)}%).`,
      ['Escolher ângulos com rota de saída e crossfire com um colega.', 'Depois do primeiro abate, segurar o ângulo para o próximo em vez de avançar sozinho.'], `${(G0.mkR * 100).toFixed(1)}% das rodadas`);
    if (J && J.mortes && N && N.mortes) {
      if (J.mortes.semTrocaPct - N.mortes.semTrocaPct > 8) add((J.mortes.semTrocaPct - N.mortes.semTrocaPct) / 50, 'Morrer perto do time (com troca)',
        `${Math.round(J.mortes.semTrocaPct)}% das mortes ficam sem troca (nível ${Math.round(N.mortes.semTrocaPct)}%).`,
        ['Jogar a 1 ou 2 segundos de distância de um colega.', 'Avisar a posição antes de dar o peek para o time se preparar.'], `no máximo ${Math.round(N.mortes.semTrocaPct)}% das mortes sem troca`);
      if (J.mortes.antes30sPct - N.mortes.antes30sPct > 8) add((J.mortes.antes30sPct - N.mortes.antes30sPct) / 50, 'Segurar o começo da rodada',
        `${Math.round(J.mortes.antes30sPct)}% das mortes acontecem nos primeiros 30 s (nível ${Math.round(N.mortes.antes30sPct)}%).`,
        ['Nos primeiros 30 s, jogar por informação e utilitário, sem duelo seco.', 'Guardar o peek agressivo para quando o time estiver pronto para trocar.'], `até ${Math.round(N.mortes.antes30sPct)}% das mortes no começo`);
    }
    if (J && J.lados && J.lados.t && J.lados.ct) {
      const t = J.lados.t.kd, ct = J.lados.ct.kd;
      if (Math.abs(t - ct) / Math.max(t, ct) > 0.2) { const fraco = t < ct ? 'T' : 'CT';
        add(Math.abs(t - ct) / Math.max(t, ct), `Melhorar o lado ${fraco}`, `K/D ${t.toFixed(2)} de T e ${ct.toFixed(2)} de CT.`,
          fraco === 'T' ? ['Treinar as execuções de bomb com o time (smoke, flash, entrada).', 'Revisar demos de rodadas de T perdidas.'] : ['Fixar uma posição de CT por mapa e aprender o retake dela.', 'Treinar segurar ângulo com utilitário de atraso (molotov, HE).'], `K/D de ${fraco} perto do outro lado`); }
    }
    return out.sort((x, y) => y.peso - x.peso).slice(0, 4);
  }

  // ---------- mapa a mapa ----------
  function mapaAMapa(s) {
    const por = new Map();
    for (const l of s.linhas) { if (!por.has(l.mp)) por.set(l.mp, []); por.get(l.mp).push(l); }
    const linhas = [...por].map(([mp, l]) => ({ mp, ...somar(l) })).filter((x) => x.partidas >= 3).sort((a, b) => b.partidas - a.partidas);
    if (!linhas.length) return h('p', { class: 'vazio' }, 'Menos de 3 partidas em cada mapa.');
    const cols = [['partidas', 'Part.', (x) => x, null], ['wr', 'Win rate', (x) => Math.round(x * 100) + '%', 'wr'], ['kd', 'K/D', (x) => x.toFixed(2), 'kd'], ['adr', 'ADR', (x) => x.toFixed(1), 'adr'],
      ['fkR', '1º abate/rod.', (x) => x.toFixed(3), 'fkR'], ['kastP', 'KAST', (x) => Math.round(x * 100) + '%', 'kastP'], ['headHit', 'Acerto cabeça', (x) => Math.round(x * 100) + '%', 'headHit']];
    const cel = (l, c) => { if (!c[3]) return h('td', null, c[2](l[c[0]])); const ref = s[c[3]], d = ref ? (l[c[0]] - ref) / ref : 0, a = Math.min(40, Math.round(Math.abs(d) * 120));
      return h('td', { class: 'est-cel', estilo: `--calor:${a}%;--cor:${d >= 0 ? 'var(--ok)' : 'var(--bad)'}` }, c[2](l[c[0]])); };
    const melhor = [...linhas].sort((a, b) => b.wr - a.wr || b.adr - a.adr)[0], pior = [...linhas].sort((a, b) => a.wr - b.wr || a.adr - b.adr)[0];
    return [h('div', { class: 'rs-destaques' },
      h('div', { class: 'rs-dest forte' }, h('span', { class: 'rot' }, 'Melhor mapa'), h('b', null, melhor.mp), h('small', null, `${Math.round(melhor.wr * 100)}% de vitórias · K/D ${melhor.kd.toFixed(2)} · ADR ${melhor.adr.toFixed(1)}`)),
      linhas.length > 1 && h('div', { class: 'rs-dest fraco' }, h('span', { class: 'rot' }, 'Mapa a trabalhar'), h('b', null, pior.mp), h('small', null, `${Math.round(pior.wr * 100)}% de vitórias · K/D ${pior.kd.toFixed(2)} · ADR ${pior.adr.toFixed(1)}`))),
      h('div', { class: 'rolar' }, h('table', { class: 'est-tab' }, h('thead', null, h('tr', null, h('th', null, 'Mapa'), ...cols.map((c) => h('th', null, c[1])))),
        h('tbody', null, ...linhas.map((l) => h('tr', null, h('td', null, h('b', null, l.mp)), ...cols.map((c) => cel(l, c))))))),
      h('p', { class: 'nota' }, 'Verde: acima da média do próprio membro em todos os mapas; vermelho: abaixo. Mapas com 3 partidas ou mais.')];
  }

  function secoes(nick, ctx) {
    const D = dadosEstilo(ctx), s = D.membros.get(nick);
    if (!s || !s.ok) return [card('Estilo de jogo', null, h('p', { class: 'vazio' }, `${nick} tem menos de ${MIN_ROD} rodadas nas partidas da Geladeira da janela; sem estilo calculado.`))];
    const Q = quad(s), P = plano(nick, s, D.grupo), av = avancadas(nick);
    const janela = desde() ? `desde ${GT.u.dataBR(desde())}` : 'no ano';
    return [
      card('Estilo de jogo: agressivo ou paciente?', `Exposição: 1º abate e mortes por rodada nas partidas da Geladeira ${janela} (${pl(s.partidas, 'partida', 'partidas')}), contra a média do grupo. Impacto: ADR e KAST contra a média do próprio nível na GC (perfil dos últimos 6 meses). 50 = na média.`,
        h('div', { class: 'est-topo' },
          h('div', { class: 'est-veredito' },
            h('span', { class: 'rot' }, 'Estilo'), h('b', { class: 'est-tit' }, Q.t), h('p', null, Q.d), notaFuncao(s) && h('p', { class: 'est-funcao' }, notaFuncao(s)),
            s.impAdr && h('p', { class: 'nota' }, `ADR ${s.impAdr[0].toFixed(1)} contra ${s.impAdr[1].toFixed(1)} do nível · KAST ${s.impKast[0].toFixed(1)}% contra ${s.impKast[1].toFixed(1)}%.`),
            h('div', { class: 'est-medidores' },
              medidor('Exposição', s.exposicao, 'quanto se expõe: 1º abate e mortes por rodada', 'var(--c4)'),
              medidor('Impacto', s.impacto, s.refImpacto === 'nível' ? 'ADR e KAST contra a média de quem joga no mesmo nível na GC' : 'ADR e KAST contra a média do grupo (sem perfil de nível)', 'var(--c1)'))),
          mapaEstilos(ctx, nick))),
      card('O que trabalhar', 'Prioridades em ordem, a partir dos números do membro contra o grupo (e contra o nível, quando há estatística avançada).',
        P.length ? h('ol', { class: 'est-plano' }, ...P.map((p, i) => h('li', { class: 'est-item' },
          h('span', { class: 'est-num' }, i + 1),
          h('div', null, h('b', null, p.titulo), h('p', { class: 'mudo' }, p.porque),
            h('ul', null, ...p.treino.map((t) => h('li', null, t))), h('small', { class: 'est-meta' }, 'Meta: ', h('b', null, p.meta))))))
          : h('p', { class: 'vazio' }, 'Nenhum número bem abaixo do grupo. Manter o que está funcionando.')),
      card('Perfil completo contra o grupo', 'Barra para a direita (verde) = melhor que a média dos membros; para a esquerda (vermelho) = pior. Em "mortes por rodada" e "acertos por abate", menos é melhor.', perfil(s, D.grupo)),
      av && card('Momento da morte, lados e economia', null, av),
      card('Mapa a mapa', null, ...[].concat(mapaAMapa(s))),
    ].filter(Boolean);
  }
  const medidor = (rot, v, info, cor) => h('div', { class: 'est-med', estilo: `--k:${cor}` }, h('span', { class: 'rot' }, rot, infoIcone(info)),
    h('span', { class: 'est-med-trilho' }, h('i', { estilo: `width:${Math.round(v)}%` }), h('em', { estilo: 'left:50%' })), h('b', null, Math.round(v)));

  GT.estilo = { secoes, mapa: mapaEstilos, dados: dadosEstilo, quad };

  // Home: mapa de estilos de todo o grupo.
  GT.registrarBloco({ aba: 'home', id: 'estilos', ordem: 45, render(el, ctx) {
    const D = dadosEstilo(ctx);
    const ok = [...D.membros].filter(([, s]) => s.ok);
    if (ok.length < 2) return;
    el.append(card('Mapa de estilos', `Quem joga agressivo e quem joga paciente, e quem devolve impacto. Partidas da Geladeira ${desde() ? 'desde ' + GT.u.dataBR(desde()) : 'do ano'}; 50 é a média do grupo. Clique num membro na Análise para ver o que trabalhar.`,
      mapaEstilos(ctx, null),
      h('div', { class: 'chips-m' }, ...ok.sort((a, b) => b[1].exposicao - a[1].exposicao).map(([n, s]) => h('a', { class: 'chip-m', href: (GT.linkAnalise ? GT.linkAnalise(n) : linkMembro(n)) }, avatar(n, 18), h('span', { class: 'chip-m-nome' }, `${n} · ${quad(s).t.toLowerCase()}`))))));
  } });
})();
