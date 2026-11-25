// Aba "Combate · N demos" da página do jogador (#jogadores/<nick>/combate): mira, posição e movimento, bomba e economia.
// Vem das demos consolidadas do ano (ctx.D.combate e ctx.D.mira); NÃO segue o filtro de período e mapa. Cada card leva o selo "N demos" e
// "não segue o filtro", e "amostra pequena" quando a base é curta (menos de 8 demos ou poucos eventos de bomba). Exporta GT.combateJogador e GT.demosDe.
(function () {
  'use strict';
  const GT = window.GT;
  const { h, pl, card, infoIcone } = GT.u;
  const DEMOS_MIN = 8, EVENTOS_MIN = 15; // abaixo disso o card avisa "amostra pequena" (N10 do plano técnico)

  const kpi = (rot, valor, sub, tipo, cor, info) => h('div', { class: 'rs-kpi', estilo: `--k:${cor}` },
    h('div', { class: 'rs-kpi-topo' }, h('span', { class: 'rot' }, rot, info && infoIcone(info)), tipo && h('span', { class: 'rs-dif ' + tipo }, tipo === 'ok' ? 'acima' : tipo === 'bad' ? 'abaixo' : 'igual')),
    h('b', { class: 'rs-kpi-v' }, valor), h('small', { class: 'mudo' }, sub));
  const titulo = (t, n, pequena) => ({ t, selos: [[pl(n, 'demo', 'demos'), 'destaque'], ['não segue o filtro', 'aviso'], (pequena || n < DEMOS_MIN) && ['amostra pequena', 'aviso']].filter(Boolean) });

  // Combate e utilidade (demos consolidadas do ano, por membro; não seguem o filtro). Sem demo: aviso, nunca erro.
  const pc = (x) => (x === null || x === undefined ? '—' : x + '%');
  const cartaoSemCombate = (titulo) => card(titulo, 'Números das demos do ano.', h('p', { class: 'nota' }, 'Ainda sem demo consolidada do jogador neste ano.'));
  function combateBlocos(eu, ctx, n) {
    const c = ctx.D.combate && ctx.D.combate[eu];
    if (!c) return [h('div', { class: 'cb-duas' }, cartaoSemCombate('Posição e movimento'), cartaoSemCombate('Bomba e economia'))];
    const sub = 'Números das demos consolidadas do ano, lidos das partidas com demo gravada.';
    const velocidade = c.velocidade
      ? h('div', { class: 'rs-kpis' },
          kpi('Parado ao atirar', pc(c.velocidade.parado), c.velocidade.tiros + ' tiros com velocidade medida', null, 'var(--c3)', 'Tiros dados com menos de 20 u/s de velocidade.'),
          kpi('Andando ou correndo', pc(c.velocidade.rapido), 'tiros acima de 130 u/s', null, 'var(--c4)'))
      : h('p', { class: 'nota' }, 'Velocidade ao atirar: ainda sem dados (as demos gravadas até agora não trazem a velocidade).');
    const ultimo = c.morte.ultimoVivo || 0;
    const eventos = c.bomba.plantou + c.desarmes.comKit + c.desarmes.semKit; // poucos eventos: o card avisa amostra pequena (N10)
    const controle = card(titulo('Posição e movimento', n, false), sub,
      h('div', { class: 'rs-kpis' },
        kpi('Morre longe do time', pc(c.morte.sozinho), 'das ' + c.morte.comColega + ' mortes com colega vivo, sem ninguém a menos de 800 unidades' + (ultimo ? ' · ' + pl(ultimo, 'morte como último vivo fica', 'mortes como último vivo ficam') + ' fora' : ''), null, 'var(--c5)', 'Distância no plano X/Y até o colega vivo mais perto no momento da morte. Mortes como último vivo não entram na conta. Não é a mesma medida do "morreu sozinho" da aba Partidas, que olha se houve troca em até 5 s.'),
        kpi('Até o colega mais perto', c.morte.distMediana !== null ? c.morte.distMediana + ' u' : '—', 'mediana, nas mortes com colega vivo', null, 'var(--c6)')),
      velocidade);
    const bomba = card(titulo('Bomba e economia', n, eventos < EVENTOS_MIN), sub,
      h('div', { class: 'rs-kpis' },
        kpi('Bombas plantadas', String(c.bomba.plantou), c.bomba.desarmada + ' desarmadas · ' + c.bomba.explodiu + ' explodiram', null, 'var(--c1)', 'Bombas que o jogador plantou como TR, com o desfecho na mesma rodada.'),
        kpi('Desarmes como CT', String(c.desarmes.comKit + c.desarmes.semKit), c.desarmes.comKit + ' com kit · ' + c.desarmes.semKit + ' sem kit', null, 'var(--c2)', 'Desarmes feitos pelo jogador. Com kit o desarme leva 5 s; sem kit, 10 s.'),
        kpi('Desarmada nos últimos 10 s', String(c.bomba.perdeuCurto), 'bombas desarmadas com menos de 10 s no relógio', null, 'var(--c3)', 'Relógio da bomba: 40 s a partir do plant. Conta as bombas desarmadas com menos de 10 s restantes.'),
        kpi('Compra certa', pc(c.compra.bem), 'das ' + c.compra.rodadas + ' rodadas com patrimônio para rifle e colete', null, 'var(--c4)', 'Medido no fim do tempo de compra, depois da compra. Conta a rodada em que o patrimônio (saldo mais o valor do equipamento) era de pelo menos 4100 e o jogador estava com rifle e colete. O patrimônio inclui granadas e arma recebida de colega.'),
        kpi('Dano por rodada perdida', c.dano.mediaPerdidas !== null ? GT.u.num(c.dano.mediaPerdidas, 0) : '—', c.dano.rodPerdidas + ' rodadas', null, 'var(--c5)', 'Dano causado a inimigos, média por rodada. Inclui todas as armas.'),
        kpi('Dano por rodada ganha', c.dano.mediaGanhas !== null ? GT.u.num(c.dano.mediaGanhas, 0) : '—', c.dano.rodGanhas + ' rodadas', null, 'var(--c6)'),
        kpi('Diferença', c.dano.diferenca === null ? '—' : (c.dano.diferenca > 0 ? '+' : '') + GT.u.num(c.dano.diferenca, 0), 'ganha menos perdida, por rodada', null, 'var(--c1)')),
      h('p', { class: 'nota' }, 'Premissas: dinheiro, inventário e colete são lidos no fim do tempo de compra (depois da compra); o relógio da bomba é de 40 s.'));
    return [h('div', { class: 'cb-duas' }, controle, bomba)];
  }

  // Mira nos contatos (demos consolidadas do ano; não segue o filtro). Reaproveitada pela aba Combate da página do jogador.
  function miraDe(eu, ctx, n) {
    const mi = ctx.D.mira && ctx.D.mira[eu];
    const nomeLugar = (l) => String(l || '?').replace(/^Bombsite\s*([AB])$/i, 'Bomb $1').replace(/([a-z])of([A-Z])/g, '$1 of $2').replace(/([a-z])([A-Z])/g, '$1 $2');
    const miraBloco = mi ? [
      h('div', { class: 'rs-kpis' },
        kpi('Acertos por tiro', mi.precisao !== null ? mi.precisao + '%' : '—', `${mi.acertos} acertos em ${mi.tiros} tiros com arma`, null, 'var(--c3)', 'Acertos contra inimigos divididos pelos tiros com arma (sem faca, granada e bomba). É aproximado: um tiro pode acertar mais de um inimigo.'),
        kpi('Mira no 1º contato', mi.erroPrimeiroMediano !== null ? GT.u.num(mi.erroPrimeiroMediano, 1) + '°' : '—', `erro mediano em ${mi.contatos} contatos`, null, 'var(--c4)', 'Ângulo entre para onde o membro olhava e o peito do inimigo, no primeiro acerto de cada rodada. Quanto menor, mais direta estava a mira. A medida é tirada no instante do primeiro acerto, por isso o erro é pequeno por construção e serve mais para comparar membros entre si do que como valor absoluto.'),
        kpi('Dentro de 3°', mi.primeiroDentro3 !== null ? mi.primeiroDentro3 + '%' : '—', 'dos primeiros contatos', null, 'var(--c5)'),
        kpi('Dentro de 10°', mi.primeiroDentro10 !== null ? mi.primeiroDentro10 + '%' : '—', 'dos primeiros contatos', null, 'var(--c6)'),
        kpi('Mortes', String(mi.mortes), 'nas demos lidas', null, 'var(--c1)')),
      mi.lugaresMortes.length ? h('div', { class: 'rs-dest', estilo: '--k:var(--c1)' }, h('span', { class: 'rot' }, 'Onde mais morre'),
        ...mi.lugaresMortes.map((x) => h('span', { class: 'cb-lugar' }, `${nomeLugar(x.lugar)} · ${x.n}`))) : null,
    ] : [h('p', { class: 'nota' }, 'Ainda sem demo consolidada do jogador neste ano.')];
    return card(titulo('Mira nos contatos', mi ? mi.demos : n, false), 'Calculado das demos consolidadas do ano, lidas das partidas com demo gravada.', ...miraBloco);
  }

  // Número de demos do jogador (a maior contagem entre os dois conjuntos de eventos).
  const demosDe = (eu, ctx) => { const c = ctx.D.combate && ctx.D.combate[eu], m = ctx.D.mira && ctx.D.mira[eu]; return Math.max(c ? c.demos || 0 : 0, m ? m.demos || 0 : 0); };
  GT.demosDe = demosDe;
  GT.combateJogador = (eu, ctx) => { const n = demosDe(eu, ctx); return [miraDe(eu, ctx, n), ...combateBlocos(eu, ctx, n)]; };
})();
