// Extras da aba Time: dia e horário e reação depois de sequência (Evolução), duplas que funcionam (Lines).
// Tudo calculado no navegador a partir de ctx.ms; amostra mínima 8 (GT.u.AMOSTRA): abaixo disso só a contagem e o selo "amostra pequena".
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pct, pl, card, barra, selo, cls, chipsMembros, AMOSTRA, MIN_LINE, num } = GT.u;

  const pp = (x) => `${x >= 0 ? '+' : '−'}${num(Math.abs(x) * 100, 0)} p.p.`;

  // Uma linha de barra: rótulo, barra (cor só com amostra suficiente) e texto.
  function linhaWr(rotulo, d) {
    const texto = d.comResultado
      ? h('em', null, `${d.v}–${d.d}${d.e ? `–${d.e}` : ''} · `, d.amostra ? h('b', { class: cls(d.wr) }, pct(d.wr)) : h('span', null, pl(d.comResultado, 'partida', 'partidas'), selo('amostra pequena')))
      : h('em', null, 'sem partidas');
    return h('div', { role: 'listitem' }, h('span', { class: 'nome' }, rotulo), barra(d.amostra ? d.wr : 0, d.amostra ? (d.wr >= 0.5 ? 'bom' : 'ruim') : ''), texto);
  }
  const lista = (titulo, itens) => h('div', { class: 'te-grupo' }, h('h3', { class: 'rot' }, titulo), h('div', { class: 'rank rank50 te-rank', role: 'list' }, ...itens));

  GT.registrarBloco({ aba: 'time', id: 'dia-horario', ordem: 25, render(el, ctx) {
    const dias = C.diaSemana(ctx.ms), faixas = C.faixaHorario(ctx.ms);
    if (!dias.some((x) => x.comResultado)) return;
    el.append(card('Dia e horário', `Win rate do grupo por dia da semana e por faixa de horário. A linha tracejada marca 50%. Com menos de ${AMOSTRA} partidas com resultado a faixa mostra só a contagem. Partidas com membros nos dois times ficam fora.`,
      h('div', { class: 'te-dois' }, lista('Dia da semana', dias.map((d) => linhaWr(d.nome, d))), lista('Faixa de horário', faixas.map((f) => linhaWr(f.faixa, f))))));
  } });

  GT.registrarBloco({ aba: 'time', id: 'reacao', ordem: 22, render(el, ctx) {
    const R = C.reacaoSequencia(ctx.ms, 2);
    if (R.base.partidas < 3) return;
    const frase = (r, tipo) => {
      const plural = tipo === 'D' ? 'derrotas' : 'vitórias';
      if (!r.ocorrencias) return h('p', { class: 'te-frase' }, `Depois de 2 ${plural} seguidas, não houve partida seguinte com vencedor.`);
      if (!r.amostra) return h('p', { class: 'te-frase' }, `Depois de 2 ${plural} seguidas, o grupo venceu ${r.v} de ${r.ocorrencias}.`, selo('amostra pequena'));
      return h('p', { class: 'te-frase' }, `Depois de 2 ${plural} seguidas, o grupo venceu ${r.v} de ${r.ocorrencias} (`, h('b', { class: cls(r.wr) }, pct(r.wr)), ').');
    };
    el.append(card('Depois de uma sequência', 'Como o grupo se sai na partida seguinte a 2 derrotas ou a 2 vitórias seguidas, em comparação com o win rate geral do período. Toda partida cujas 2 anteriores foram iguais conta; empate quebra a sequência e partidas com membros nos dois times ficam fora.',
      h('div', { class: 'te-reacao' }, frase(R.aposDerrotas, 'D'), frase(R.aposVitorias, 'V'),
        h('p', { class: 'te-base mudo' }, `Para comparar, o win rate geral é ${pct(R.base.wr)} (${R.base.v} vitórias em ${pl(R.base.partidas, 'partida', 'partidas')}).`))));
  } });

  GT.registrarBloco({ aba: 'lines', id: 'duplas', ordem: 30, render(el, ctx) {
    if (!ctx.F.todas.length) return;
    const R = C.duplas(ctx.ms, ctx.membros, MIN_LINE[2], 8);
    const nota = `Pares de membros no mesmo time (mesmo com outros membros junto), com pelo menos ${MIN_LINE[2]} partidas e win rate acima do do grupo no período (${pct(R.base)}). Respeita período e mapa.`;
    if (!R.duplas.length) { el.append(card('Duplas que funcionam', nota, h('p', { class: 'vazio' }, R.elegiveis ? 'Nenhuma dupla com amostra suficiente está acima do win rate do grupo neste filtro.' : `Nenhuma dupla tem ${MIN_LINE[2]} partidas ou mais neste filtro.`))); return; }
    el.append(card('Duplas que funcionam', nota,
      h('div', { class: 'te-duplas', role: 'list' }, ...R.duplas.map((d) => h('div', { class: 'te-dupla', role: 'listitem' },
        chipsMembros(d.nomes, { link: true }),
        h('span', { class: 'te-d-num' }, h('b', { class: 'ok' }, pct(d.wr)), h('small', null, `${d.v}–${d.d} · ${pl(d.partidas, 'partida', 'partidas')} · ${pp(d.dif)} do grupo`)))))));
  } });
})();
