// "Sobre os dados" (U7, rota #sobre, fora do menu, com link no rodapé): de onde vêm os números, a escada de cobertura (partidas, rodada a rodada da GC, demos, análise completa)
// e as regras de cálculo. A tabela de membros mora na aba Jogadores (membros.js); as sequências foram para a aba Time (meses.js).
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pct, n1, n2, dataBR, dataCurta, pl, lista, cls, MESES_LONGOS, mesNome, E, dica, infoIcone, card, grafico, sv, heroGrupo, tabelaOrdenavel, linkMembro, chipsMembros,
    nomeResultado, MIN_LINE, AMOSTRA, coberturaTexto } = GT.u;

  GT.registrarAba({ id: 'sobre', titulo: 'Sobre os dados', ordem: 90, oculta: true, filtros: false, aceitaVazio: true });

  GT.registrarBloco({ aba: 'sobre', id: 'cabecalho', ordem: 10, render(el) {
    el.append(h('header', { class: 'cabeca' }, h('h1', null, 'Sobre os dados'), h('p', { class: 'subtitulo' }, `De onde vem cada número do Geladeira Tracker em ${E.ano}, e por que algumas partidas têm mais detalhe que outras.`)));
  } });

  // Escada de cobertura: quanto de cada camada de dado existe, em números que já estão publicados (info, rodadas, contatos, combate, jogos).
  GT.registrarBloco({ aba: 'sobre', id: 'escada', ordem: 20, render(el, ctx) {
    const D = ctx.D, I = ctx.info, geladeira = I.geladeira;
    const rodadas = (D.rodadas && D.rodadas.total && D.rodadas.total.partidas) || 0;
    const demos = Object.values(D.contatos || {}).reduce((t, v) => t + ((v && v.demos) || 0), 0);
    const completa = (D.jogos || []).length;
    const comVel = Math.max(0, ...Object.values(D.combate || {}).filter((c) => c && c.velocidade).map((c) => c.demos || 0));
    const degrau = (cor, valor, de, titulo, texto) => h('li', { class: 'sb-degrau', estilo: `--k:${cor}` },
      h('div', { class: 'sb-topo' }, h('b', { class: 'sb-valor' }, valor), h('span', { class: 'sb-tit' }, titulo)),
      de > 0 ? dica(h('div', { class: 'sb-barra', role: 'img', 'aria-label': `${valor} de ${de}` }, h('i', { estilo: `width:${Math.min(100, (valor / de) * 100)}%` })), () => `${valor} de ${de}`) : null,
      h('p', { class: 'nota' }, texto));
    el.append(card('Quanto detalhe existe em cada camada', 'Cada degrau é um subconjunto do anterior: quanto mais fundo, mais detalhe e menos partidas.',
      h('ul', { class: 'sb-escada' },
        degrau('var(--c6)', geladeira, geladeira, `${pl(geladeira, 'partida', 'partidas')} da Geladeira`, 'Placar, mapa, data e números de cada membro (abates, mortes, dano, headshots). É a base de todas as telas.'),
        degrau('var(--c1)', rodadas, geladeira, `${rodadas === 1 ? 'partida' : 'partidas'} com rodada a rodada da GC`, 'Cada rodada com quem abriu, lado, compra e bomba. Alimenta a abertura, o tempo de rodada e as situações de bomba.'),
        degrau('var(--c3)', demos, geladeira, `${pl(demos, 'demo', 'demos')} lidas`, 'Arquivos de demo dos membros: posição, tiros e contatos. Alimentam o jogo de mira e os lugares de abate.'),
        degrau('var(--c4)', completa, geladeira, `${completa === 1 ? 'partida' : 'partidas'} com análise completa na aba Demos`, 'Demo e rodada a rodada da GC juntas: a página da partida mostra cada rodada, os trechos e o que melhorar.'),
        degrau('var(--c2)', comVel, demos, `${comVel} de ${demos} demos com velocidade de movimento`, comVel ? 'Velocidade ao atirar, medida nas demos que trazem esse dado.' : 'Esse dado ainda não vem nas demos lidas; por isso nenhuma tela mostra velocidade.')),
      h('p', { class: 'nota sb-porque' }, h('b', null, 'Por que só uma parte das partidas tem detalhe? '), 'A GC só guarda a estatística avançada das partidas recentes, e demo só existe para quem mandou o arquivo. As partidas mais antigas ficam só com o placar e os números básicos dos membros.')));
  } });

  GT.registrarBloco({ aba: 'sobre', id: 'origem', ordem: 80, render(el, ctx) {
    const I = ctx.info, cob = ctx.G.cobertura || { arquivosDe: [], outros: [] };
    const fora = Math.max(0, I.totalBase - I.geladeira), mistas = I.mistas || 0, juntas = I.geladeira - mistas;
    const num = (cor, valor, texto) => h('div', { class: 'or-num', estilo: `--k:${cor}` }, h('b', null, valor), h('small', null, texto));
    const fatia = (n, cor, rot) => (n > 0 ? dica(h('i', { estilo: `width:${(n / I.totalBase) * 100}%;background:${cor}` }), () => `${rot}: ${pl(n, 'partida', 'partidas')}`) : null);
    const regra = (cor, ico, forte, texto) => h('li', null, h('span', { class: 'or-ico', estilo: `--k:${cor}`, 'aria-hidden': 'true' }, ico), h('span', null, h('b', null, forte), ' ', texto));
    const membros = (nicks) => h('div', { class: 'chips-m' }, ...nicks.map((n) => GT.u.chipMembro(n, { link: true, avatar: true })));
    el.append(card('De onde vêm as partidas', 'Partidas que entram, partidas que ficam de fora e quem mandou arquivo.',
      h('div', { class: 'or-nums' },
        num('var(--c1)', I.totalBase, `partidas na base de ${E.ano}`),
        num('var(--c6)', I.geladeira, 'da Geladeira (2+ membros no mesmo time)'),
        mistas ? num('var(--c4)', mistas, 'com membros nos dois times') : null,
        num('var(--c2)', fora, 'sem a Geladeira (não entram)')),
      h('div', { class: 'or-proporcao', role: 'img', 'aria-label': `${I.geladeira} de ${I.totalBase} partidas são da Geladeira` },
        fatia(juntas, 'var(--c6)', 'Geladeira'), fatia(mistas, 'var(--c4)', 'Membros nos dois times'), fatia(fora, 'var(--grade)', 'Sem a Geladeira')),
      h('div', { class: 'or-cob' },
        h('div', { class: 'or-grupo cheio' }, h('h3', null, '● Dados completos'), h('p', null, 'Mandaram os arquivos: todas as partidas deles entram.'), membros(cob.arquivosDe)),
        cob.outros.length ? h('div', { class: 'or-grupo parcial' }, h('h3', null, '◐ Dados parciais'), h('p', null, 'Só aparecem nas partidas jogadas com quem mandou arquivo.'), membros(cob.outros)) : null),
      h('ul', { class: 'or-regras' },
        regra('var(--c1)', 'Σ', 'Números do grupo somam os membros em campo', 'e dividem no fim (K/D, ADR, HS% e KAST); taxa nunca é média de médias.'),
        regra('var(--c4)', '⇄', 'Membros nos dois times', 'são partidas da Geladeira, mas ficam fora do win rate do grupo.'),
        regra('var(--c3)', '⊘', 'Jogadores da lista de excluídos', 'tiram a partida inteira de todos os números.'))));
  } });

  // Créditos das imagens (G.imagens.creditos, vindo de img/creditos.json): endereços como texto, sem link (nada abre outra aba).
  GT.registrarBloco({ aba: 'sobre', id: 'imagens', ordem: 85, render(el, ctx) {
    const im = ctx.G.imagens, cr = im && im.creditos;
    if (!cr || (!cr.icones && !(cr.fundos || []).length)) return;
    const itens = [];
    if (cr.icones && im.mapasIcones.length) itens.push(h('li', null, h('b', null, 'Ícones dos mapas:'), ` ${cr.icones.credito || ''}.`, cr.icones.observacao ? ` ${cr.icones.observacao}.` : '', cr.icones.fonte ? h('span', { class: 'mudo' }, ` Fonte: ${cr.icones.fonte}`) : null));
    const grupos = new Map();
    for (const f of cr.fundos || []) { const k = [f.credito, f.licenca, f.repositorio].join('|'); if (!grupos.has(k)) grupos.set(k, { f, mapas: [] }); grupos.get(k).mapas.push(f.mapa); }
    for (const { f, mapas } of grupos.values()) itens.push(h('li', null, h('b', null, 'Fundos dos mapas:'), ` ${f.credito || 'Valve (Counter-Strike 2)'} (${mapas.map(GT.u.nomeMapa).join(', ')}).`, f.licenca ? ` ${f.licenca}.` : '', f.repositorio ? h('span', { class: 'mudo' }, ` Fonte: ${f.repositorio}`) : null));
    if (Object.keys(im.avatares || {}).length) itens.push(h('li', null, h('b', null, 'Fotos dos membros:'), ' as fotos de perfil de cada membro, usadas só nos círculos ao lado do nick.'));
    el.append(card('Imagens', null, h('ul', { class: 'sb-calculo' }, ...itens)));
  } });

  GT.registrarBloco({ aba: 'sobre', id: 'calculo', ordem: 90, render(el) {
    const item = (forte, texto) => h('li', null, h('b', null, forte), ' ', texto);
    const L = MIN_LINE;
    el.append(card('Como é calculado', null,
      h('ul', { class: 'sb-calculo' },
        item('Partida da Geladeira:', '2 ou mais membros no mesmo time. Partidas com membros nos dois times ficam fora do win rate.'),
        item('Mês:', 'entra no gráfico de win rate com 10 partidas decididas ou mais.'),
        item('Line:', `grupo de membros no mesmo time ao mesmo tempo. Mínimo de ${L[5]} partidas para 5 membros, ${L[4]} para 4 e ${L[3]} para 3 ou 2; abaixo de ${AMOSTRA} partidas a amostra é pequena.`),
        item('Ranking das lines:', 'ordena pelo win rate (ou por partidas) entre as lines que passam do mínimo; K/D e ADR são dos membros da line nessas partidas.'),
        item('Números do grupo:', 'K/D, ADR, HS% e KAST somam os membros em campo e dividem no fim; taxa nunca é média de médias.'),
        item('Rating GC:', 'número de ranking da GC na época das partidas, não é o rating de desempenho.'))));
  } });
})();
