// Aba "Análise · últimos 6 meses" da página do jogador (#jogadores/<nick>/analise; #analise/<nick> abre ela): análise individual vinda do motor de src\analise.
// Ordem na tela: (1) maior destaque e maior ponto de atenção, (2) Pontos fortes | O que trabalhar (contra o nível e contra o grupo), (3) estilo de jogo,
// (4) blocos recolhidos (radar e números contra o nível, perfil completo, momento da morte e lados, melhor função, duelos, limites).
// Os dados ficam em window.GELADEIRA.analise (sem SteamID). Nenhuma comparação entre dois jogadores: a referência é a média do mesmo nível.
(function () {
  'use strict';
  const GT = window.GT, G = GT.G;
  const { h, sv, pl, card, selo, rotuloMembro, infoIcone, dica, barra, dataBR, paramsTexto } = GT.u;

  const A = () => G.analise || null;
  const dadosDe = (nick) => (A() && A().membros && A().membros[nick]) || null;
  const fmt = (v, d = 1) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const val = (v, d, u) => (v === null || v === undefined ? '—' : fmt(v, d ?? 1) + (u || ''));
  const difTexto = (dif) => `${Math.round(Math.abs(dif) * 100)}% ${dif >= 0 ? 'acima' : 'abaixo'}`;
  const janelaTexto = () => { const a = A(); return a ? `últimos ${a.janela.meses} meses (de ${dataBR(a.janela.desde)} a ${dataBR(a.geradoEm)})` : ''; };
  const linkAnalise = (nick) => '#jogadores/' + encodeURIComponent(nick) + '/analise?' + paramsTexto();
  GT.linkAnalise = linkAnalise;

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
  const textoEscala = `Cada ponta é um número do perfil da GC nos ${A() ? A().janela.meses : 6} meses: abate (abates por rodada), sobrevivência (mortes por rodada, ao contrário: menos mortes sobe), impacto (ADR), mira (% de abates na cabeça) e suporte (assistências por rodada). A linha tracejada (50) é a média dos membros com amostra suficiente. Cada eixo vai de 0 (30% abaixo da média) a 100 (30% acima da média); o centro é 0 e a borda é 100.`;

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

  // ---------- topo: destaques; recolhido: números contra o nível ----------
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
        h('div', null, h('span', null, 'jogador'), h('span', { class: 'rs-trilho' }, h('i', { class: 'eu', estilo: larg(v) }))),
        h('div', null, h('span', null, 'nível'), h('span', { class: 'rs-trilho' }, h('i', { class: 'ref', estilo: larg(ref) }))),
        h('span', null, `média do nível: ${val(ref, k.d, k.u)}`)));
  };
  const numerosNivel = (d) => {
    const J = d.perfil.m6.jogador, N = d.perfil.m6.nivel || {};
    const nf = d.fortes.length, nr = d.fracos.length, tot = nf + nr;
    return h('div', { class: 'rs' },
      h('div', { class: 'rs-kpis' }, ...KPIS.map((k) => kpi(k, J, N))),
      h('div', { class: 'rs-placar', 'aria-label': `${pl(nf, 'ponto forte', 'pontos fortes')} e ${pl(nr, 'ponto a trabalhar', 'pontos a trabalhar')}` },
        h('span', { class: 'ok' }, h('b', null, nf), nf === 1 ? 'ponto forte' : 'pontos fortes'),
        tot > 0 && h('span', { class: 'rs-balanca', 'aria-hidden': 'true' }, h('i', { estilo: `width:${(nf / tot) * 100}%` }), h('i', { estilo: `width:${(nr / tot) * 100}%` })),
        h('span', { class: 'bad' }, h('b', null, nr), nr === 1 ? 'ponto a trabalhar' : 'pontos a trabalhar'),
        infoIcone('Contra a média de quem jogou no mesmo nível nas mesmas partidas; só entram números com amostra suficiente.')));
  };
  // Topo da aba: maior destaque e maior ponto de atenção (contra o nível). A função provável fica no cabeçalho da página.
  const destaques = (d) => {
    const maisForte = d.fortes[0], maisFraco = d.fracos[0];
    const dest = (tipo, rot, titulo, texto) => h('div', { class: 'rs-dest ' + tipo }, h('span', { class: 'rot' }, rot), h('b', null, titulo), texto && h('small', null, texto));
    const txt = (x) => `${difTexto(x.diferencaRelativa)} do nível · ${val(x.valor, x.decimais, x.unidade)} contra ${val(x.referencia, x.decimais, x.unidade)}`;
    return h('div', { class: 'rs-destaques' },
      maisForte ? dest('forte', 'Maior destaque', maisForte.rotulo, txt(maisForte)) : dest('forte', 'Maior destaque', 'Nenhum número passou do limite', 'com amostra suficiente'),
      maisFraco ? dest('fraco', 'Maior ponto de atenção', maisFraco.rotulo, txt(maisFraco)) : dest('fraco', 'Maior ponto de atenção', 'Nenhum número abaixo do nível', 'com amostra suficiente'));
  };

  // ---------- duas colunas: Pontos fortes | O que trabalhar ----------
  // Cada item mostra o selo da régua ("contra o nível" ou "contra o grupo") e, nos itens a trabalhar, "o que treinar" embaixo.
  const treino = (itens, acomp) => itens && itens.length ? h('div', { class: 'pi-treino' }, h('span', { class: 'rot' }, 'O que treinar'), h('ul', null, ...itens.map((t) => h('li', null, t))),
    acomp && h('small', { class: 'mudo' }, `Acompanhar: ${acomp.rotulo}, hoje ${fmt(acomp.atual, acomp.decimais)}${acomp.unidade || ''}; meta: ${acomp.textoMeta}.`)) : null;
  const itemPonto = (x, tipo, rec) => h('li', { class: 'ponto-item ' + tipo },
    h('div', { class: 'pi-topo' }, h('b', null, x.rotulo), x.info && infoIcone(`${x.info} Amostra: ${fmt(x.amostra, 0)} (mínimo ${fmt(x.amostraMinima, 0)}).`), selo('contra o nível')),
    h('div', { class: 'pi-nums' }, h('span', { class: 'pi-v ' + (tipo === 'forte' ? 'ok' : 'bad') }, val(x.valor, x.decimais, x.unidade)), h('span', { class: 'mudo' }, `nível ${val(x.referencia, x.decimais, x.unidade)}`),
      h('span', { class: 'pi-dif ' + (tipo === 'forte' ? 'ok' : 'bad') }, difTexto(x.diferencaRelativa))),
    rec && treino(rec.treinar, rec.acompanhar));
  const itemGrupo = (p) => h('li', { class: 'ponto-item trabalhar' },
    h('div', { class: 'pi-topo' }, h('b', null, p.titulo), selo('contra o grupo')),
    h('p', { class: 'mudo pi-porque' }, p.porque), treino(p.treino), h('small', { class: 'mudo' }, 'Meta: ', h('b', null, p.meta)));
  // Mostra os primeiros itens e deixa o resto atrás de "Ver mais" (um details fechado dentro da coluna).
  const lista = (itens, visiveis, vazio) => {
    if (!itens.length) return h('p', { class: 'vazio' }, vazio);
    const ul = (xs) => h('ul', { class: 'pontos' }, ...xs);
    const resto = itens.slice(visiveis);
    return h('div', { class: 'pi-lista' }, ul(itens.slice(0, visiveis)),
      resto.length > 0 && h('details', { class: 'an-mais' }, h('summary', null, `Ver mais ${resto.length}`), ul(resto)));
  };
  // Mesma regra do catálogo (src\analise\catalogo.mjs, tipoDe): qual recomendação cada métrica fraca dispara. A recomendação aparece embaixo da primeira métrica do tipo.
  const TIPO = { hsPct: 'mira_cabeca', accuracy: 'mira_precisao', cegados_por_flash: 'flashes', flash_assist_100: 'flashes', dano_granada_pr: 'granadas', entrada_t_pct: 'entrada_t', entrada_ct_pct: 'entrada_ct',
    duelo_23_pct: 'duelo_troca', kd_t: 'lado_t', kd_ct: 'lado_ct', eco_full_kd: 'compra_cheia', eco_pistol_kd: 'pistol', eco_eco_kd: 'eco_force', eco_force_kd: 'eco_force', clutch_pct: 'clutch',
    morte_antes30_pct: 'morrer_cedo', demo_morte_antes30_pct: 'morrer_cedo', morte_sem_troca_pct: 'sem_troca', demo_morte_sem_troca_pct: 'sem_troca', troca_tempo: 'sem_troca', trocas_100: 'sem_troca',
    mortes_trocadas_pct: 'sem_troca', demo_morte_cego_pct: 'cego', adr: 'dano_rodada', kastPct: 'kast', tendencia_rating: 'tendencia' };
  const tipoDe = (id) => (id.startsWith('mapa:') ? 'mapa_abaixo' : id.startsWith('demo_hs_') ? 'mira_cabeca' : TIPO[id] || null);
  function colunaTrabalhar(d, plano) {
    const usadas = new Set(), recs = d.recomendacoes || [];
    const itens = d.fracos.map((x) => { const t = tipoDe(x.id), rec = t && !usadas.has(t) ? recs.find((r) => r.tipo === t) : null; if (rec) usadas.add(t); return itemPonto(x, 'trabalhar', rec); });
    for (const r of recs) if (!usadas.has(r.tipo)) itens.push(h('li', { class: 'ponto-item trabalhar' }, h('div', { class: 'pi-topo' }, h('b', null, r.titulo), selo('contra o nível')), h('p', { class: 'mudo pi-porque' }, r.achado), treino(r.treinar, r.acompanhar)));
    for (const p of plano || []) itens.push(itemGrupo(p));
    return lista(itens, 3, 'Nenhum número ficou abaixo do nível nem do grupo com amostra suficiente.');
  }

  // Bloco recolhido (details fechado): título com selo, nota de uma linha e o conteúdo.
  const recolhido = (titulo, nota, ...kids) => h('details', { class: 'card an-rec' },
    h('summary', null, h('span', { class: 'card-t' }, titulo.t || titulo), ...((titulo.selos || []).map((x) => selo(x[0], x[1])))), nota && h('p', { class: 'nota' }, nota), ...kids);

  function secaoFuncao(d) {
    const f = d.funcoes;
    if (!f) return recolhido('Melhor função', null, h('p', { class: 'vazio' }, 'Sem estatísticas avançadas da GC na janela: não dá para estimar a função.'));
    const top = f.ranking[0];
    const porque = top.componentes.map((c) => h('li', null, h('b', null, c.rotulo), `: ${val(c.valor, c.decimais, c.unidade)} contra ${val(c.referencia, c.decimais, c.unidade)} de referência (${c.pts} pontos, peso ${Math.round(c.pesoReal * 100)}%)`));
    return recolhido({ t: 'Melhor função', selos: [['GC avançada', 'destaque']] }, `Nota de 0 a 100 para cada função, só com números do motor de análise. Cada número do jogador é comparado com a média do mesmo nível: igual ao nível vale 50 e o dobro vale 100. A AWP usa a participação da arma (50% ou mais vale 100). ${f.amostraPequena ? `Amostra pequena: só ${pl(f.partidasAvancadas, 'partida', 'partidas')} com estatísticas avançadas (mínimo ${f.minimoPartidas}).` : ''}`,
      h('div', { class: 'rank rank50 funcoes', role: 'list' }, ...f.ranking.map((r, i) => {
        const l = h('div', { role: 'listitem', class: i === 0 && r.nota !== null ? 'topo' : '' }, h('span', { class: 'nome' }, r.nome), barra((r.nota || 0) / 100, i === 0 ? 'bom' : ''), h('em', null, r.nota === null ? 'sem dado' : r.nota));
        dica(l, () => r.descricao);
        return l;
      })),
      f.sugerida && h('div', { class: 'porque' }, h('h3', null, `Por que ${top.nome}`), h('p', { class: 'nota' }, top.descricao), h('ul', null, ...porque)));
  }

  function secaoDuelos(d) {
    const J = d.avancada && d.avancada.jogador, N = d.avancada && d.avancada.nivel;
    if (!J) return recolhido('Duelos por ordem na rodada', null, h('p', { class: 'vazio' }, 'Sem estatísticas avançadas da GC na janela.'));
    const nomes = { '1': '1º duelo', '2': '2º duelo', '3': '3º duelo', '4+': '4º em diante' };
    const rows = Object.keys(nomes).map((o) => ({ o, ...J.duelos.porOrdem[o], nivel: N && N.duelos.porOrdem[o] ? N.duelos.porOrdem[o].ganhosPct : null }));
    const lado = (l) => J.duelos.primeiroPorLado[l];
    return recolhido({ t: 'Duelos por ordem na rodada', selos: [['GC avançada', 'destaque']] }, `Ganhos e perdas de cada duelo na ordem em que acontece na rodada (1º, 2º, 3º...). O número em "Time vence" é o % de rodadas vencidas pelo time quando ele ganha ou perde aquele duelo. ${pl(J.duelos.tentativasPrimeiroDuelo, 'tentativa', 'tentativas')} de 1º duelo em ${pl(d.base.partidasAvancadas, 'partida', 'partidas')}.`,
      h('div', { class: 'rolar' }, GT.u.tabela([{ t: 'Duelo', f: (r) => nomes[r.o] }, { t: 'Ganhou', f: (r) => r.ganhos }, { t: 'Perdeu', f: (r) => r.perdidos },
        { t: '% ganhos', f: (r) => h('span', { class: r.nivel !== null ? (r.ganhosPct >= r.nivel ? 'ok' : 'bad') : '' }, fmt(r.ganhosPct, 0) + '%') }, { t: 'Nível', f: (r) => (r.nivel === null ? '—' : fmt(r.nivel, 0) + '%') },
        { t: 'Time vence ao ganhar', f: (r) => fmt(r.timeVenceAoGanharPct, 0) + '%' }, { t: 'Time vence ao perder', f: (r) => fmt(r.timeVenceAoPerderPct, 0) + '%' }], rows)),
      h('p', { class: 'nota' }, `1º duelo como TR: ${lado('T').ganhos} ganhos e ${lado('T').perdidos} perdidos (${fmt(lado('T').ganhosPct, 0)}%); como CT: ${lado('CT').ganhos} e ${lado('CT').perdidos} (${fmt(lado('CT').ganhosPct, 0)}%).`));
  }

  function secaoLimites(d) {
    const b = d.base, av = A();
    return recolhido('Limites desta análise', null, h('ul', { class: 'limites' },
      h('li', null, `Perfil da GC (K/D, ADR, HS%, KAST, rating): ${pl(b.partidasJanela, 'partida', 'partidas')} na janela dos últimos ${av.janela.meses} meses. É a base mais sólida.`),
      h('li', null, `Detalhe avançado (entradas, clutches, trocas, mira, utilitários, economia, duelos): só ${pl(b.partidasAvancadas, 'partida', 'partidas')}. A GC guarda esse detalhe por cerca de uma semana e ele só entra nas partidas coletadas por um assinante; abaixo de 8 partidas os números são indicativos, não conclusões.`),
      h('li', null, `Demos lidas: ${pl(b.partidasDemo, 'partida', 'partidas')} (mínimo de 5 para falar de mortes cego e utilitários da demo).`),
      h('li', null, 'Todas as comparações são contra a média de jogadores do mesmo nível nas mesmas partidas, e só valem quando a amostra chega ao mínimo da métrica. O radar usa a média dos membros do grupo.'),
      h('li', null, 'A função provável é uma estimativa por números, não define como o jogador joga.'),
      ...d.avisos.map((a) => h('li', { class: 'aviso' }, a.texto))));
  }

  // Conteúdo da aba "Análise · últimos 6 meses" da página do jogador (#jogadores/<nick>/analise): devolve uma lista de nós. A janela é fixa e não segue o filtro.
  const SELO_JANELA = [['últimos 6 meses · não segue o filtro', 'aviso']];
  GT.analiseJogador = (nick, ctx) => {
    if (!A()) return [h('p', { class: 'vazio' }, 'Análise não disponível nestes dados. Gere o site de novo com: npm run tracker')];
    const d = dadosDe(nick);
    if (!d || !d.perfil.m6 || !d.perfil.m6.jogador) return [card({ t: 'Análise individual', selos: SELO_JANELA }, null, h('p', { class: 'vazio' }, `${nick} não tem partidas suficientes na janela para a análise.`))];
    let p = null;
    try { p = GT.estilo && ctx ? GT.estilo.partes(nick, ctx) : null; } catch (e) { console.error(e); p = { vazio: card('Estilo de jogo', null, h('p', { class: 'vazio' }, 'Erro ao calcular o estilo deste jogador.')), plano: [] }; }
    const topo = card({ t: 'Análise individual', selos: SELO_JANELA },
      `${pl(d.base.partidasJanela, 'partida', 'partidas')} nos ${janelaTexto()}, contra a média de quem joga no mesmo nível. Os filtros de período e mapa não valem aqui.`, destaques(d));
    const colunas = h('div', { class: 'grade2 an-cols' },
      card('Pontos fortes', 'Acima da média do mesmo nível, do que mais se destaca para o que menos.', lista(d.fortes.map((x) => itemPonto(x, 'forte')), 3, 'Nenhum número passou do limite acima do nível com amostra suficiente.')),
      card('O que trabalhar', 'Abaixo do nível na GC e do grupo, com o que treinar.', colunaTrabalhar(d, p && p.plano)));
    return [topo, colunas, p && (p.estilo || p.vazio),
      recolhido({ t: 'Radar e números contra o nível', selos: [['contra o nível', 'destaque']] }, 'Cinco números dos últimos 6 meses contra a média de quem joga no mesmo nível; o radar compara com a média dos jogadores do grupo.',
        h('div', { class: 'an-radar' }, radar(nick, d), numerosNivel(d))),
      p && p.perfil && recolhido({ t: 'Perfil completo contra o grupo', selos: [['contra o grupo', 'destaque']] }, 'Barra para a direita (verde) = acima da média dos jogadores; para a esquerda (vermelho) = abaixo. Em "mortes por rodada" e "acertos por abate", menos é melhor.', p.perfil),
      p && p.avancadas && recolhido({ t: 'Momento da morte, lados e economia', selos: [['GC avançada', 'destaque']] }, null, p.avancadas),
      secaoFuncao(d), secaoDuelos(d), secaoLimites(d)].filter(Boolean);
  };
  GT.temAnalise = (nick) => !!(A() && dadosDe(nick) && dadosDe(nick).perfil.m6 && dadosDe(nick).perfil.m6.jogador);
  GT.analiseDe = dadosDe;

  // #analise/<nick> (e #analises) abre #jogadores/<nick>/analise: a aba "analise" é só um apelido oculto que redireciona (a rota é lida em membros.js).
  GT.registrarAba({ id: 'analise', titulo: 'Análise', ordem: 65, oculta: true, pai: 'jogadores', aceitaVazio: true, apelidos: ['analises'],
    rotaLer(resto, e) { e.aba = 'jogadores'; if (GT.lerRotaJogador) GT.lerRotaJogador([resto[0] || '', 'analise']); },
    rotaEscrever() { return ''; } });
})();
