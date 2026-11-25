// Aba "Plano por mapa": dicas para a Geladeira inteira em cada mapa, comparando o time com os adversários nas mesmas partidas
// (totais do placar da GC: 1º abates, assistências de flash, bombas, desarmes, abates, mortes, 3K+) e o resultado com o que
// a GC esperava (previsão de vitória antes da partida). Segue os filtros de período e mapa. Só partidas sem membros nos dois times.
(function () {
  'use strict';
  const GT = window.GT;
  const { h, pct, pl, UI, card, avatar, infoIcone, guardar, render } = GT.u;
  const MIN = 6; // partidas para um mapa ter dicas
  const nome = (m) => GT.u.nomeMapa(m); // grafia única do site ("Dust 2"); a chave interna e a rota continuam "dust2"

  GT.registrarAba({ id: 'plano', titulo: 'Plano por mapa', ordem: 42, aceitaVazio: true, apelidos: ['melhoria', 'mapa-a-mapa'],
    rotaLer(resto) { UI.planoMapa = resto[0] || UI.planoMapa || null; },
    rotaEscrever() { return UI.planoMapa ? '/' + UI.planoMapa : ''; } });

  function estatMapa(ms) {
    const s = { n: 0, v: 0, d: 0, pbS: 0, pbN: 0, saldo: 0, nivel: 0, nivelN: 0, n_: [0, 0, 0, 0, 0, 0, 0, 0], e_: [0, 0, 0, 0, 0, 0, 0, 0] };
    for (const p of ms) {
      if (!p.tn || p.r === 'X') continue;
      s.n++; if (p.r === 'V') s.v++; if (p.r === 'D') s.d++;
      if (Number.isFinite(p.pb)) { s.pbS += p.pb / 100; s.pbN++; }
      s.saldo += p.sn - p.se;
      if (Number.isFinite(p.ln) && Number.isFinite(p.le)) { s.nivel += p.ln - p.le; s.nivelN++; }
      for (let i = 0; i < 8; i++) { s.n_[i] += p.tn[i]; s.e_[i] += p.te[i]; }
    }
    const [fkN, faN, plN, dfN, kN, dN, , mkN] = s.n_, [fkE, faE, plE, dfE, kE, dE, , mkE] = s.e_;
    const n = Math.max(1, s.n);
    return { ...s, wr: s.v / Math.max(1, s.v + s.d), esp: s.pbN ? s.pbS / s.pbN : null, saldoP: s.saldo / n, nivelD: s.nivelN ? s.nivel / s.nivelN : null,
      abertura: fkN / Math.max(1, fkN + fkE), flashN: faN / n, flashE: faE / n, bombaN: plN / n, bombaE: plE / n, desarmeN: dfN / n, desarmeE: dfE / n,
      kdN: kN / Math.max(1, dN), kdE: kE / Math.max(1, dE), mkN: mkN / n, mkE: mkE / n };
  }
  const razao = (a, b) => (b > 0 ? a / b : a > 0 ? 2 : 1);

  // Veto resumido para o Início: mapas do filtro (mais jogados primeiro) com o esperado da GC e os que rendem acima do esperado.
  GT.vetoMapas = (ms) => {
    const mapas = [...new Set(ms.filter((p) => p.tn && p.r !== 'X').map((p) => p.mp))];
    const lista = mapas.map((m) => [m, estatMapa(ms.filter((p) => p.mp === m))]).sort((a, b) => b[1].n - a[1].n);
    const mais = lista.filter(([, s]) => s.esp !== null).map(([m, s]) => ({ m, s, dif: s.wr - s.esp, cl: window.GTCalc.classificarMapa({ n: s.n, wr: s.wr, esp: s.esp }) }))
      .filter((x) => x.cl === 'mais').sort((a, b) => b.dif - a.dif);
    return { lista, mais };
  };

  // Link para a aba Granadas já filtrada (tipo e lado).
  const linkGranadas = (mapa, tipo, lado, texto) => h('a', { class: 'pl-link', href: '#granadas/' + mapa + '?' + GT.u.paramsTexto(),
    onclick: () => { UI.granTipo = tipo; UI.granLado = lado; UI.granFonte = 'essenciais'; guardar('geladeira.granTipo', tipo); guardar('geladeira.granLado', lado); } }, texto, ' →');

  // Dicas do mapa, em ordem de peso. tipo: forte | mais | menos | nade | atencao
  function dicas(mapa, s) {
    const out = [], add = (peso, tipo, titulo, texto, extra) => out.push({ peso, tipo, titulo, texto, extra });
    const pp = (x) => `${x > 0 ? '+' : ''}${Math.round(x * 100)}`;
    if (s.esp !== null) {
      const dif = s.wr - s.esp;
      // Só o lado bom vira dica: render abaixo do esperado aparece no win rate e nas dicas do que melhorar, não como "não jogue".
      if (dif >= 0.06) add(dif * 3, 'mais', 'Explorar mais: rende acima do esperado', `Win rate de ${pct(s.wr)} quando a GC esperava ${pct(s.esp)} (${pp(dif)} pontos). Bom mapa para puxar no veto.`);
    }
    if (s.abertura < 0.47) add((0.5 - s.abertura) * 6, 'atencao', 'Perde a abertura', `A Geladeira pega só ${pct(s.abertura)} dos primeiros abates. Entrar com flash, jogar o 1º duelo em dupla para trocar, e usar smoke para cortar os ângulos de quem segura.`, linkGranadas(mapa, 'smokes', 'T', 'Smokes de TR'));
    else if (s.abertura > 0.53 && s.esp !== null && s.wr < s.esp) add((s.abertura - 0.5) * 4, 'atencao', 'Ganha a abertura, mas não converte', `${pct(s.abertura)} dos primeiros abates são da Geladeira e mesmo assim o resultado fica abaixo do esperado: falta trocar as mortes seguintes e segurar o pós-plant.`, linkGranadas(mapa, 'molotovs', 'T', 'Molotovs de pós-plant'));
    else if (s.abertura > 0.53) add((s.abertura - 0.5) * 2, 'forte', 'Abertura forte', `A Geladeira pega ${pct(s.abertura)} dos primeiros abates. Continuar abrindo com dupla.`);
    const rf = razao(s.flashN, s.flashE);
    if (rf < 0.85) add((1 - rf) * 2, 'nade', 'Falta flash', `${s.flashN.toFixed(1)} assistências de flash por partida contra ${s.flashE.toFixed(1)} do adversário. Aprender 2 ou 3 flashes de entrada do mapa.`, linkGranadas(mapa, 'flashbangs', 'todos', 'Flashes do mapa'));
    else if (rf > 1.3) add((rf - 1) / 3, 'forte', 'Flash bem usada', `${s.flashN.toFixed(1)} assistências de flash por partida contra ${s.flashE.toFixed(1)} do adversário.`);
    const rb = razao(s.bombaN, s.bombaE);
    if (rb < 0.9) add((1 - rb) * 2.5, 'nade', 'Planta menos que o adversário', `A Geladeira planta ${s.bombaN.toFixed(1)} bombas por partida e o adversário ${s.bombaE.toFixed(1)}. Pode ser execução de TR travando ou rodada decidida antes do plant; se o lado TR estiver rendendo menos, treinar as smokes de execução de cada bomb.`, linkGranadas(mapa, 'smokes', 'T', 'Smokes de execução'));
    else if (rb > 1.1) add((rb - 1), 'forte', 'Lado TR chega no bomb', `${s.bombaN.toFixed(1)} bombas plantadas por partida contra ${s.bombaE.toFixed(1)} do adversário.`);
    const rd = razao(s.desarmeN, s.desarmeE);
    if (rd < 0.85) add((1 - rd) * 2, 'nade', 'Retake a treinar', `${s.desarmeN.toFixed(1)} desarmes por partida contra ${s.desarmeE.toFixed(1)} do adversário: quando o bomb cai, a Geladeira retoma menos. Combinar o retake e levar flash e molotov de CT.`, linkGranadas(mapa, 'todas', 'CT', 'Granadas de CT'));
    else if (rd > 1.2) add((rd - 1) / 2, 'forte', 'Retake forte', `${s.desarmeN.toFixed(1)} desarmes por partida contra ${s.desarmeE.toFixed(1)} do adversário.`);
    if (s.nivelD !== null && s.nivelD < -0.4 && s.wr >= 0.5) add(0.3, 'forte', 'Ganha de time de nível maior', `Mesmo com o adversário ${Math.abs(s.nivelD).toFixed(1)} nível acima em média, a Geladeira vence ${pct(s.wr)}.`);
    if (s.mkN < s.mkE * 0.8) add(0.25, 'atencao', 'Pouca rodada virada no individual', `${s.mkN.toFixed(1)} multiabates (3+) por partida contra ${s.mkE.toFixed(1)} do adversário. Jogar com crossfire para que um abate puxe outro.`);
    const ordemTipo = { menos: 0, atencao: 1, nade: 1, mais: 2, forte: 3 };
    return out.sort((a, b) => ordemTipo[a.tipo] - ordemTipo[b.tipo] || b.peso - a.peso);
  }

  // Quem rende mais e menos no mapa (ADR no mapa contra o próprio ADR em todos os mapas do filtro).
  function membrosNoMapa(ctx, mapa) {
    const tudo = new Map(), noMapa = new Map();
    const soma = (M, x) => { const a = M.get(x.n) || { p: 0, dano: 0, rod: 0, k: 0, m: 0 }; a.p++; a.dano += x.dano; a.rod += x.rod; a.k += x.k; a.m += x.m; M.set(x.n, a); };
    for (const p of ctx.ms) for (const x of p.mem) { soma(tudo, x); if (p.mp === mapa) soma(noMapa, x); }
    return [...noMapa].filter(([, a]) => a.p >= 4).map(([n, a]) => { const t = tudo.get(n); const adr = a.dano / Math.max(1, a.rod), adrT = t.dano / Math.max(1, t.rod); return { n, p: a.p, adr, dif: (adr - adrT) / adrT, kd: a.k / Math.max(1, a.m) }; })
      .sort((a, b) => b.dif - a.dif);
  }

  const ICONE = { forte: '+', mais: '↑', menos: '↓', nade: '●', atencao: '!' };
  const kpi = (rot, valor, sub, tipo, cor, info) => h('div', { class: 'rs-kpi', estilo: `--k:${cor}` },
    h('div', { class: 'rs-kpi-topo' }, h('span', { class: 'rot' }, rot, info && infoIcone(info)), tipo && h('span', { class: 'rs-dif ' + tipo }, tipo === 'ok' ? 'acima' : tipo === 'bad' ? 'abaixo' : 'igual')),
    h('b', { class: 'rs-kpi-v' }, valor), h('small', { class: 'mudo' }, sub));
  const comp = (a, b, folga = 0.08) => (a > b * (1 + folga) ? 'ok' : a < b * (1 - folga) ? 'bad' : 'neutro');

  // ---------- por jogador: cada membro nos mapas do filtro (números do próprio jogador, só partidas da Geladeira) ----------
  const vazioAcc = () => ({ p: 0, v: 0, d: 0, rod: 0, k: 0, m: 0, dano: 0, hs: 0, fk: 0, fa: 0, pl: 0, df: 0, rt: 0, rtN: 0, kast: 0 });
  function acumula(a, x) {
    a.p++; a.rod += x.rod; a.k += x.k; a.m += x.m; a.dano += x.dano; a.hs += x.hs || 0; a.fk += x.fk || 0; a.fa += x.fa || 0; a.pl += x.pl || 0; a.df += x.df || 0;
    if (Number.isFinite(x.rt)) { a.rt += x.rt; a.rtN++; }
    a.kast += x.kast || 0; // rodadas com KAST (contagem, não porcentagem)
    if (x.r === 'V') a.v++; else if (x.r === 'D') a.d++;
    return a;
  }
  const adrDe = (a) => a.dano / Math.max(1, a.rod);

  // Combate e utilidade (demos consolidadas do ano, por membro; não seguem o filtro). Sem demo: aviso, nunca erro.
  const pc = (x) => (x === null || x === undefined ? '—' : x + '%');
  const cartaoSemCombate = (titulo) => card(titulo, 'Números das demos do ano.', h('p', { class: 'nota' }, 'Ainda sem demo consolidada do membro neste ano.'));
  function combateBlocos(eu, ctx) {
    const c = ctx.D.combate && ctx.D.combate[eu];
    if (!c) return [h('div', { class: 'pl-duas' }, cartaoSemCombate('Posição e movimento'), cartaoSemCombate('Bomba e economia'))];
    const sub = 'Números das demos consolidadas do ano (não seguem o filtro de período e de mapa).';
    const velocidade = c.velocidade
      ? h('div', { class: 'rs-kpis' },
          kpi('Parado ao atirar', pc(c.velocidade.parado), c.velocidade.tiros + ' tiros com velocidade medida', null, 'var(--c3)', 'Tiros dados com menos de 20 u/s de velocidade.'),
          kpi('Andando ou correndo', pc(c.velocidade.rapido), 'tiros acima de 130 u/s', null, 'var(--c4)'))
      : h('p', { class: 'nota' }, 'Velocidade ao atirar: ainda sem dados (as demos gravadas até agora não trazem a velocidade).');
    const ultimo = c.morte.ultimoVivo || 0;
    const controle = card('Posição e movimento', sub,
      h('div', { class: 'rs-kpis' },
        kpi('Morre longe do time', pc(c.morte.sozinho), 'das ' + c.morte.comColega + ' mortes com colega vivo, sem ninguém a menos de 800 unidades' + (ultimo ? ' · ' + pl(ultimo, 'morte como último vivo fica', 'mortes como último vivo ficam') + ' fora' : ''), null, 'var(--c5)', 'Distância no plano X/Y até o colega vivo mais perto no momento da morte. Mortes como último vivo não entram na conta. Não é a mesma medida do "morreu sozinho" da aba Partidas, que olha se houve troca em até 5 s.'),
        kpi('Até o colega mais perto', c.morte.distMediana !== null ? c.morte.distMediana + ' u' : '—', 'mediana, nas mortes com colega vivo', null, 'var(--c6)')),
      velocidade);
    const bomba = card('Bomba e economia', sub,
      h('div', { class: 'rs-kpis' },
        kpi('Bombas plantadas', String(c.bomba.plantou), c.bomba.desarmada + ' desarmadas · ' + c.bomba.explodiu + ' explodiram', null, 'var(--c1)', 'Bombas que o jogador plantou como TR, com o desfecho na mesma rodada.'),
        kpi('Desarmes como CT', String(c.desarmes.comKit + c.desarmes.semKit), c.desarmes.comKit + ' com kit · ' + c.desarmes.semKit + ' sem kit', null, 'var(--c2)', 'Desarmes feitos pelo jogador. Com kit o desarme leva 5 s; sem kit, 10 s.'),
        kpi('Desarmada nos últimos 10 s', String(c.bomba.perdeuCurto), 'bombas desarmadas com menos de 10 s no relógio', null, 'var(--c3)', 'Relógio da bomba: 40 s a partir do plant. Conta as bombas desarmadas com menos de 10 s restantes.'),
        kpi('Compra certa', pc(c.compra.bem), 'das ' + c.compra.rodadas + ' rodadas com patrimônio para rifle e colete', null, 'var(--c4)', 'Medido no fim do tempo de compra, depois da compra. Conta a rodada em que o patrimônio (saldo mais o valor do equipamento) era de pelo menos 4100 e o jogador estava com rifle e colete. O patrimônio inclui granadas e arma recebida de colega.'),
        kpi('Dano por rodada perdida', c.dano.mediaPerdidas !== null ? c.dano.mediaPerdidas.toFixed(0) : '—', c.dano.rodPerdidas + ' rodadas', null, 'var(--c5)', 'Dano causado a inimigos, média por rodada. Inclui todas as armas.'),
        kpi('Dano por rodada ganha', c.dano.mediaGanhas !== null ? c.dano.mediaGanhas.toFixed(0) : '—', c.dano.rodGanhas + ' rodadas', null, 'var(--c6)'),
        kpi('Diferença', c.dano.diferenca === null ? '—' : (c.dano.diferenca > 0 ? '+' : '') + c.dano.diferenca.toFixed(0), 'ganha menos perdida, por rodada', null, 'var(--c1)')),
      h('p', { class: 'nota' }, 'Premissas: dinheiro, inventário e colete são lidos no fim do tempo de compra (depois da compra); o relógio da bomba é de 40 s.'));
    return [h('div', { class: 'pl-duas' }, controle, bomba)];
  }

  // Mira nos contatos (demos consolidadas do ano; não segue o filtro). Reaproveitada pela aba Combate da página do jogador.
  function miraDe(eu, ctx) {
    // Mira: só das demos consolidadas do ano (não segue o filtro). Ângulos calculados a partir da mira que o próprio evento guarda.
    const mi = ctx.D.mira && ctx.D.mira[eu];
    const nomeLugar = (l) => String(l || '?').replace(/^Bombsite\s*([AB])$/i, 'Bomb $1').replace(/([a-z])of([A-Z])/g, '$1 of $2').replace(/([a-z])([A-Z])/g, '$1 $2');
    const miraBloco = mi ? [
      h('h3', { class: 'adv-sub' }, `Mira nos contatos · ${pl(mi.demos, 'demo', 'demos')}`),
      h('div', { class: 'rs-kpis' },
        kpi('Acertos por tiro', mi.precisao !== null ? mi.precisao + '%' : '—', `${mi.acertos} acertos em ${mi.tiros} tiros com arma`, null, 'var(--c3)', 'Acertos contra inimigos divididos pelos tiros com arma (sem faca, granada e bomba). É aproximado: um tiro pode acertar mais de um inimigo.'),
        kpi('Mira no 1º contato', mi.erroPrimeiroMediano !== null ? mi.erroPrimeiroMediano.toFixed(1) + '°' : '—', `erro mediano em ${mi.contatos} contatos`, null, 'var(--c4)', 'Ângulo entre para onde o membro olhava e o peito do inimigo, no primeiro acerto de cada rodada. Quanto menor, mais direta estava a mira. A medida é tirada no instante do primeiro acerto, por isso o erro é pequeno por construção e serve mais para comparar membros entre si do que como valor absoluto.'),
        kpi('Dentro de 3°', mi.primeiroDentro3 !== null ? mi.primeiroDentro3 + '%' : '—', 'dos primeiros contatos', null, 'var(--c5)'),
        kpi('Dentro de 10°', mi.primeiroDentro10 !== null ? mi.primeiroDentro10 + '%' : '—', 'dos primeiros contatos', null, 'var(--c6)'),
        kpi('Mortes', String(mi.mortes), 'nas demos lidas', null, 'var(--c1)')),
      mi.lugaresMortes.length ? h('div', { class: 'rs-dest', estilo: '--k:var(--c1)' }, h('span', { class: 'rot' }, 'Onde mais morre'),
        ...mi.lugaresMortes.map((x) => h('span', { class: 'pl-membro' }, `${nomeLugar(x.lugar)} · ${x.n}`))) : null,
      h('p', { class: 'nota' }, 'Calculado das demos consolidadas do ano (não segue o filtro de período).'),
    ] : [h('h3', { class: 'adv-sub' }, 'Mira nos contatos'), h('p', { class: 'nota' }, 'Ainda sem demo consolidada do membro neste ano.')];
    return miraBloco;
  }

  function visaoJogador(ctx) {
    const contagem = new Map();
    for (const p of ctx.ms) for (const x of p.mem) contagem.set(x.n, (contagem.get(x.n) || 0) + 1);
    const jogadores = [...contagem].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (!jogadores.length) return h('p', { class: 'vazio' }, 'Nenhum membro com partidas no filtro.');
    if (!UI.planoJogador || !contagem.has(UI.planoJogador)) UI.planoJogador = jogadores[0][0];
    const eu = UI.planoJogador;
    const trocar = (n) => () => { UI.planoJogador = n; GT.u.render(); };
    const seletor = h('div', { class: 'pl-jogs', role: 'group', 'aria-label': 'Escolher jogador' }, ...jogadores.map(([n, c]) => h('button', { type: 'button', class: 'pl-jog' + (n === eu ? ' ativo' : ''), 'aria-pressed': String(n === eu), onclick: trocar(n) },
      avatar(n, 24), h('span', null, n), h('small', null, pl(c, 'partida', 'partidas')))));

    const tot = vazioAcc(), porMapa = new Map();
    for (const p of ctx.ms) for (const x of p.mem) if (x.n === eu) {
      acumula(tot, x);
      if (!porMapa.has(p.mp)) porMapa.set(p.mp, vazioAcc());
      acumula(porMapa.get(p.mp), x);
    }
    const adr = adrDe(tot), kd = tot.k / Math.max(1, tot.m), hsP = tot.hs / Math.max(1, tot.k), kastP = tot.kast / Math.max(1, tot.rod);
    const rating = tot.rtN ? tot.rt / tot.rtN : null; // valor "rating" do placar da GC, sem conversão
    const wr = tot.v / Math.max(1, tot.v + tot.d), abreP = tot.fk / Math.max(1, tot.rod);
    const kpis = h('div', { class: 'rs-kpis pl-kpis8' },
      kpi('ADR', adr.toFixed(1), 'dano por rodada', null, 'var(--c1)', 'Dano médio por rodada, somando todas as partidas do filtro (o mesmo número do placar da GC).'),
      kpi('K/D', kd.toFixed(2), `${tot.k} abates · ${tot.m} mortes`, null, 'var(--c2)'),
      kpi('HS%', pct(hsP), 'abates de cabeça', null, 'var(--c3)'),
      kpi('KAST', pct(kastP), 'rodadas com abate, assistência, sobrevivência ou troca', null, 'var(--c4)'),
      kpi('Rating GC', rating !== null ? Math.round(rating).toString() : '—', 'média das partidas', null, 'var(--c5)', 'Campo "rating" do placar da GC, sem conversão. Não é o rating de 0 a 2 das estatísticas avançadas.'),
      kpi('Vitórias', pct(wr), `${tot.v}V ${tot.d}D`, null, 'var(--c6)'),
      kpi('Primeiro a matar', pct(abreP), 'das rodadas, o membro fez o primeiro abate', null, 'var(--c1)'),
      kpi('Flash e bomba', `${(tot.fa / Math.max(1, tot.p)).toFixed(1)} · ${(tot.pl / Math.max(1, tot.p)).toFixed(1)}`, 'assist. de flash e bombas plantadas, por partida', null, 'var(--c2)'));

    // Mapas com 4 partidas ou mais: comparados com o próprio ADR no geral (mesma régua do "Rendem mais aqui").
    const comMapa = [...porMapa].filter(([, a]) => a.p >= 4).map(([m, a]) => ({ m, a, dif: (adrDe(a) - adr) / Math.max(adr, 0.01) }));
    const dicas = [];
    for (const x of comMapa.filter((y) => y.dif >= 0.08).sort((a, b) => b.dif - a.dif).slice(0, 3))
      dicas.push({ tipo: 'forte', titulo: `Rende acima do normal em ${nome(x.m)}`, texto: `ADR de ${adrDe(x.a).toFixed(1)} neste mapa, contra ${adr.toFixed(1)} no geral (+${Math.round(x.dif * 100)}%). Vale puxar esse mapa no veto e usar as posições que estão funcionando.` });
    for (const x of comMapa.filter((y) => y.dif <= -0.08).sort((a, b) => a.dif - b.dif).slice(0, 3))
      dicas.push({ tipo: 'atencao', titulo: `Em ${nome(x.m)}, o ADR fica abaixo do geral`, texto: `ADR de ${adrDe(x.a).toFixed(1)} neste mapa, contra ${adr.toFixed(1)} no geral (${Math.round(x.dif * 100)}%). Rever as posições de entrada e as granadas do mapa antes do próximo treino.`, extra: linkGranadas(x.m, 'todas', 'todos', 'Granadas do mapa') });
    const abreMapa = comMapa.filter((y) => y.a.fk / Math.max(1, y.a.rod) >= abreP + 0.08).sort((a, b) => b.a.fk / Math.max(1, b.a.rod) - a.a.fk / Math.max(1, a.a.rod))[0];
    if (abreMapa) dicas.push({ tipo: 'forte', titulo: `Abre a rodada bem em ${nome(abreMapa.m)}`, texto: `Primeiro a matar em ${pct(abreMapa.a.fk / Math.max(1, abreMapa.a.rod))} das rodadas do mapa, contra ${pct(abreP)} no geral.` });

    const linhas = [...porMapa].sort((a, b) => b[1].p - a[1].p).map(([m, a]) => h('tr', null, h('td', null, nome(m)), h('td', null, String(a.p)), h('td', null, `${a.v}–${a.d}`),
      h('td', null, adrDe(a).toFixed(1)), h('td', null, (a.k / Math.max(1, a.m)).toFixed(2)), h('td', null, pct(a.hs / Math.max(1, a.k))), h('td', null, pct(a.kast / Math.max(1, a.rod))), h('td', null, pct(a.fk / Math.max(1, a.rod)))));
    const tabela = h('div', { class: 'rolar' }, h('table', { class: 'pl-gr' }, h('thead', null, h('tr', null, h('th', null, 'Mapa'), h('th', null, 'Partidas'), h('th', null, 'V–D'), h('th', null, 'ADR'), h('th', null, 'K/D'), h('th', null, 'HS%'), h('th', null, 'KAST'), h('th', null, '1º abate'))),
      h('tbody', null, ...linhas)));

    const miraBloco = miraDe(eu, ctx);

    return h('div', { class: 'pl-jog-vis' }, seletor,
      card(eu, `${pl(tot.p, 'partida', 'partidas')} com ${eu} no filtro (${tot.v}V ${tot.d}D). Só os números de ${eu}; mapas e partidas seguem o filtro de período e de mapa.`, kpis,
        h('h3', { class: 'adv-sub' }, 'Por mapa'), tabela,
        ...miraBloco,
        h('h3', { class: 'adv-sub' }, 'Pontos fortes e o que trabalhar'), GT.planoDemos ? GT.planoDemos.grupos(dicas, 'Nenhum mapa bem acima do normal do membro ainda.', 'Nenhum mapa bem abaixo do normal do membro.') : null,
        h('p', { class: 'nota' }, 'Comparação feita com o ADR do membro no próprio filtro. Mapas com menos de 4 partidas não entram nas dicas.')), ...combateBlocos(eu, ctx));
  }

  // Aba Combate da página do jogador (#jogadores/<nick>/combate): mira, posição e movimento, bomba e economia.
  GT.combateJogador = (eu, ctx) => [card(null, null, ...miraDe(eu, ctx)), ...combateBlocos(eu, ctx)];
  GT.demosDe = (eu, ctx) => { const c = ctx.D.combate && ctx.D.combate[eu], m = ctx.D.mira && ctx.D.mira[eu]; return Math.max(c ? c.demos || 0 : 0, m ? m.demos || 0 : 0); };

  GT.registrarBloco({ aba: 'plano', id: 'tudo', ordem: 10, render(el, ctx) {
    const mapas = [...new Set(ctx.ms.filter((p) => p.tn && p.r !== 'X').map((p) => p.mp))];
    const E = new Map(mapas.map((m) => [m, estatMapa(ctx.ms.filter((p) => p.mp === m))])).entries();
    const lista = [...E].sort((a, b) => b[1].n - a[1].n);
    el.append(h('header', { class: 'cabeca' }, h('h1', null, 'Plano por mapa'),
      h('p', { class: 'lead' }, 'O que funciona e o que falta para a Geladeira em cada mapa: o time contra os adversários nas mesmas partidas, e o resultado contra o que a GC esperava. Segue os filtros de período e mapa.')));
    if (!lista.length) { el.append(GT.u.vazioFiltro()); return; }

    // Subaba: o time por mapa (padrão) ou cada jogador nos mapas.
    const visao = UI.planoVisao === 'jogador' ? 'jogador' : 'time';
    const trocaVisao = (v) => () => { UI.planoVisao = v; GT.u.render(); };
    el.append(h('div', { class: 'pilulas pl-visao', role: 'group', 'aria-label': 'Visão do plano' },
      h('button', { type: 'button', class: 'pilula' + (visao === 'time' ? ' ativo' : ''), 'aria-pressed': String(visao === 'time'), onclick: trocaVisao('time') }, h('b', null, 'Time'), ' por mapa'),
      h('button', { type: 'button', class: 'pilula' + (visao === 'jogador' ? ' ativo' : ''), 'aria-pressed': String(visao === 'jogador'), onclick: trocaVisao('jogador') }, h('b', null, 'Por jogador'), ' nos mapas')));
    if (visao === 'jogador') { el.append(visaoJogador(ctx)); return; }

    // Veto: jogar mais, jogar menos.
    const comEsp = lista.filter(([, s]) => s.esp !== null).map(([m, s]) => ({ m, s, dif: s.wr - s.esp, cl: window.GTCalc.classificarMapa({ n: s.n, wr: s.wr, esp: s.esp }) }));
    const mais = comEsp.filter((x) => x.cl === 'mais').sort((a, b) => b.dif - a.dif), menos = comEsp.filter((x) => x.cl === 'abaixo').sort((a, b) => a.dif - b.dif);
    const amostra = lista.filter(([, s]) => window.GTCalc.classificarMapa({ n: s.n, wr: s.wr, esp: s.esp }) === 'amostra');
    const itemVeto = (x) => h('a', { class: 'pl-veto-item', href: '#plano/' + x.m + '?' + GT.u.paramsTexto() }, h('b', null, nome(x.m)), h('small', null, `${pct(x.s.wr)} (esperado ${pct(x.s.esp)}) · ${pl(x.s.n, 'partida', 'partidas')}`));
    el.append(card('Veto da Geladeira', `Comparação do win rate com a previsão de vitória que a GC mostrava antes de cada partida (mapas com ${window.GTCalc.MIN_VETO} partidas ou mais no filtro; a margem para destacar um mapa cresce quando há poucas partidas).`,
      h('div', { class: 'pl-veto' },
        h('div', { class: 'pl-veto-col mais' }, h('h3', null, '↑ Jogar mais'), mais.length ? h('div', { class: 'pl-veto-lista' }, ...mais.map(itemVeto)) : h('p', { class: 'nota' }, 'Nenhum mapa bem acima do esperado.')),
        h('div', { class: 'pl-veto-col menos' }, h('h3', null, 'Abaixo do esperado pela GC'), menos.length ? h('div', { class: 'pl-veto-lista' }, ...menos.map(itemVeto)) : h('p', { class: 'nota' }, 'Nenhum mapa bem abaixo do esperado.')),
        h('div', { class: 'pl-veto-col amostra' }, h('h3', null, 'Ainda sem amostra'), amostra.length ? h('div', { class: 'pl-veto-lista' }, ...amostra.map(([m, s]) => h('a', { class: 'pl-veto-item', href: '#plano/' + m + '?' + GT.u.paramsTexto() }, h('b', null, nome(m)), h('small', null, pl(s.n, 'partida', 'partidas') + ' · poucas para comparar')))) : h('p', { class: 'nota' }, 'Todos os mapas têm 10 partidas ou mais.')))));

    const G0 = GT.planoDemos ? GT.planoDemos.geral(ctx) : null; if (G0) el.append(G0);
    if (!UI.planoMapa || !lista.some(([m]) => m === UI.planoMapa)) UI.planoMapa = lista[0][0];
    el.append(h('nav', { class: 'gr-mapas', 'aria-label': 'Escolher mapa' }, ...lista.map(([m, s]) => h('a', { class: 'gr-mapa' + (m === UI.planoMapa ? ' ativo' : ''), href: '#plano/' + m + '?' + GT.u.paramsTexto(), 'aria-current': m === UI.planoMapa ? 'page' : null },
      h('b', null, nome(m)), h('small', null, `${pl(s.n, 'partida', 'partidas')} · ${pct(s.wr)}`)))));

    const m = UI.planoMapa, s = estatMapa(ctx.ms.filter((p) => p.mp === m)), D = s.n >= MIN ? dicas(m, s) : [];
    const kpis = h('div', { class: 'rs-kpis' },
      kpi('Win rate', pct(s.wr), s.esp !== null ? `esperado pela GC: ${pct(s.esp)}` : 'sem previsão da GC', s.esp !== null ? comp(s.wr, s.esp, 0.06) : null, 'var(--c1)', 'Previsão de vitória que a GC mostrava para o time da Geladeira antes da partida, em média.'),
      kpi('Saldo de rodadas', `${s.saldoP > 0 ? '+' : ''}${s.saldoP.toFixed(1)}`, 'por partida', s.saldoP > 0.5 ? 'ok' : s.saldoP < -0.5 ? 'bad' : 'neutro', 'var(--c2)'),
      kpi('Primeiros abates', pct(s.abertura), 'da Geladeira, contra o adversário', s.abertura > 0.52 ? 'ok' : s.abertura < 0.48 ? 'bad' : 'neutro', 'var(--c4)', 'De todos os primeiros abates das rodadas (dos dois times), quantos foram da Geladeira.'),
      kpi('Assist. de flash', `${s.flashN.toFixed(1)} × ${s.flashE.toFixed(1)}`, 'por partida: Geladeira × adversário', comp(s.flashN, s.flashE, 0.12), 'var(--c5)'),
      kpi('Bombas plantadas', `${s.bombaN.toFixed(1)} × ${s.bombaE.toFixed(1)}`, 'por partida: Geladeira × adversário', comp(s.bombaN, s.bombaE), 'var(--c3)', 'Quem planta mais chega mais no bomb como TR; quando o adversário planta mais, a Geladeira de CT está cedendo o bomb.'),
      kpi('Desarmes', `${s.desarmeN.toFixed(1)} × ${s.desarmeE.toFixed(1)}`, 'por partida: Geladeira × adversário', comp(s.desarmeN, s.desarmeE, 0.12), 'var(--c6)', 'Desarmes medem o retake: retomar o bomb depois que o adversário plantou.'),
      kpi('K/D do time', s.kdN.toFixed(2), `adversário: ${s.kdE.toFixed(2)}`, comp(s.kdN, s.kdE, 0.04), 'var(--c1)'),
      s.nivelD !== null && kpi('Nível médio', `${s.nivelD > 0 ? '+' : ''}${s.nivelD.toFixed(1)}`, 'Geladeira menos adversário', null, 'var(--c2)'));
    const lista2 = D.length && GT.planoDemos ? GT.planoDemos.grupos(D)
      : h('p', { class: 'vazio' }, s.n < MIN ? `Só ${pl(s.n, 'partida', 'partidas')} neste mapa no filtro; as dicas aparecem a partir de ${MIN}.` : 'Nada fora do normal neste mapa: os números estão parecidos com os dos adversários.');
    const mb = membrosNoMapa(ctx, m);
    // Só o lado positivo: quem rende acima do próprio ADR neste mapa.
    const destaques = mb.filter((x) => x.dif > 0.03).slice(0, 3);
    const quem = destaques.length ? h('div', { class: 'pl-quem' },
      h('div', { class: 'rs-dest forte' }, h('span', { class: 'rot' }, 'Rendem mais aqui'), ...destaques.map((x) => h('span', { class: 'pl-membro' }, avatar(x.n, 20), ` ${x.n} · ADR ${x.adr.toFixed(1)} (+${Math.round(x.dif * 100)}% do próprio)`))))
      : null;
    el.append(card(nome(m), `${pl(s.n, 'partida', 'partidas')} da Geladeira no filtro (${s.v}V ${s.d}D).`, kpis,
      h('h3', { class: 'adv-sub' }, 'Pontos fortes e o que trabalhar (todas as partidas do filtro)'), lista2,
      ...(GT.planoDemos ? GT.planoDemos.mapa(ctx, m) : []),
      quem && h('h3', { class: 'adv-sub' }, 'Quem rende mais neste mapa'), quem,
      h('p', { class: 'nota' }, 'Números somados do time inteiro da Geladeira (incluindo quem completa a line) e do adversário, nas mesmas partidas. "Rendem mais aqui": ADR do membro neste mapa contra o próprio ADR em todos os mapas do filtro (4 partidas ou mais no mapa).')));
  } });
})();
