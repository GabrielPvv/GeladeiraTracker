// Aba "Adversários": win rate da Geladeira por nível do time adversário, diferença de nível e previsão da GC; adversários que mais se repetem.
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pct, pl, E, card, ranking, tabela, cWr, vazioFiltro } = GT.u;

  GT.registrarAba({ id: 'adversarios', titulo: 'Adversários', ordem: 50,
    rotaLer(resto) { E.adv = resto.join('/') || null; },
    rotaEscrever() { return E.adv ? '/' + encodeURIComponent(E.adv) : ''; } });

  // ---------- ficha de adversário (busca por nick) ----------
  // G.fichas: todos que enfrentaram a Geladeira (sem SteamID). "contra" = números dele nessas partidas. A comparação usa a média
  // dos adversários do mesmo nível (somando abates, mortes, dano e rodadas de todos e dividindo no fim).
  const fichas = () => GT.G.fichas || [];
  const acharFicha = (q) => { const l = String(q || '').trim().toLowerCase(); if (!l) return null; return fichas().find((f) => f.nick.toLowerCase() === l) || fichas().find((f) => f.nick.toLowerCase().includes(l)) || null; };
  const abrirFicha = (nick) => { E.adv = nick; location.hash = '#adversarios/' + encodeURIComponent(nick) + '?' + GT.u.paramsTexto(); };
  GT.abrirFicha = abrirFicha;
  let mediasCache = null;
  function mediasNivel() {
    if (mediasCache) return mediasCache;
    const por = new Map();
    const soma = (acc, c) => { acc.k += c.abates; acc.m += c.mortes; acc.rod += c.rodadas; acc.dano += c.adr * c.rodadas; acc.hs += c.hsPct * c.abates; acc.kast += c.kastPct * c.rodadas; acc.fk += c.fkRod * c.rodadas; };
    const novo = () => ({ k: 0, m: 0, rod: 0, dano: 0, hs: 0, kast: 0, fk: 0 });
    const todos = novo();
    for (const f of fichas()) { const c = f.contra; if (!c || !c.rodadas) continue; soma(todos, c); const nv = f.nivel || 0; if (!por.has(nv)) por.set(nv, novo()); soma(por.get(nv), c); }
    const taxas = (a) => ({ kd: a.k / Math.max(1, a.m), adr: a.dano / Math.max(1, a.rod), hsPct: a.hs / Math.max(1, a.k), kastPct: a.kast / Math.max(1, a.rod), fkRod: a.fk / Math.max(1, a.rod), rod: a.rod });
    mediasCache = { geral: taxas(todos), por: new Map([...por].map(([nv, a]) => [nv, taxas(a)])) };
    return mediasCache;
  }
  // Referência do nível: o próprio nível se tiver 2000 rodadas ou mais; senão junta os vizinhos (±1, ±2) até chegar lá.
  function refNivel(nv) {
    const M = mediasNivel();
    if (!nv) return { ...M.geral, rotulo: 'todos os adversários' };
    for (const r of [0, 1, 2]) {
      const ns = []; for (let x = nv - r; x <= nv + r; x++) if (M.por.has(x)) ns.push(x);
      const rod = ns.reduce((t, x) => t + M.por.get(x).rod, 0);
      if (rod >= 2000) {
        const pesa = (k) => ns.reduce((t, x) => t + M.por.get(x)[k] * M.por.get(x).rod, 0) / rod;
        return { kd: pesa('kd'), adr: pesa('adr'), hsPct: pesa('hsPct'), kastPct: pesa('kastPct'), fkRod: pesa('fkRod'), rotulo: r ? `níveis ${nv - r} a ${nv + r}` : `nível ${nv}` };
      }
    }
    return { ...M.geral, rotulo: 'todos os adversários' };
  }
  const STATS = [
    { k: 'kd', rot: 'K/D', fmt: (x) => x.toFixed(2), cor: 'var(--c1)', forte: 'Mata mais do que morre', fraco: 'Morre mais do que mata' },
    { k: 'adr', rot: 'ADR', fmt: (x) => x.toFixed(1), cor: 'var(--c2)', forte: 'Causa muito dano por rodada', fraco: 'Pouco dano por rodada' },
    { k: 'hsPct', rot: 'HS%', fmt: (x) => Math.round(x * 100) + '%', cor: 'var(--c3)', forte: 'Mira na cabeça acima da média', fraco: 'Pouco tiro na cabeça' },
    { k: 'kastPct', rot: 'KAST', fmt: (x) => Math.round(x * 100) + '%', cor: 'var(--c6)', forte: 'Participa de quase toda rodada', fraco: 'Some de muitas rodadas (KAST baixo)' },
    { k: 'fkRod', rot: '1º abate/rod.', fmt: (x) => x.toFixed(3), cor: 'var(--c4)', forte: 'Costuma abrir a rodada com o primeiro abate', fraco: 'Raramente pega o primeiro abate' },
  ];
  const LIMIAR = 0.12; // 12% acima ou abaixo do nível para virar tendência
  const iniciaisAdv = (n) => (String(n).replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || '?').toUpperCase();
  const fmtV = (v, x) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: x.decimais ?? 1, minimumFractionDigits: x.decimais ?? 1 }) + (x.unidade || ''));

  function fichaAdversario(f) {
    const c = f.contra, ref = refNivel(f.nivel), pequena = f.partidas < 5;
    const wrG = f.v + f.d ? f.v / (f.v + f.d) : null;
    const larg = (v, r) => { const topo = Math.max(v, r) * 1.12 || 1; return (x) => `width:${Math.max(3, Math.min(100, (x / topo) * 100)).toFixed(1)}%`; };
    const tiles = STATS.map((s) => {
      const v = c[s.k], r = ref[s.k], dif = r ? (v - r) / r : null, L = larg(v, r);
      const tipo = dif === null || Math.abs(dif) < 0.02 ? 'neutro' : dif > 0 ? 'ok' : 'bad';
      return h('div', { class: 'rs-kpi', estilo: `--k:${s.cor}` },
        h('div', { class: 'rs-kpi-topo' }, h('span', { class: 'rot' }, s.rot), dif !== null && h('span', { class: 'rs-dif ' + tipo }, tipo === 'neutro' ? 'na média' : `${dif > 0 ? '▲' : '▼'} ${Math.round(Math.abs(dif) * 100)}%`)),
        h('b', { class: 'rs-kpi-v' }, s.fmt(v)),
        h('div', { class: 'rs-cmp' }, h('div', null, h('span', null, 'ele'), h('span', { class: 'rs-trilho' }, h('i', { class: 'eu', estilo: L(v) }))),
          h('div', null, h('span', null, 'nível'), h('span', { class: 'rs-trilho' }, h('i', { class: 'ref', estilo: L(r) }))), h('span', null, `média (${ref.rotulo}): ${s.fmt(r)}`)));
    });
    const tend = STATS.map((s) => ({ s, dif: ref[s.k] ? (c[s.k] - ref[s.k]) / ref[s.k] : 0 }));
    const fortes = tend.filter((t) => t.dif >= LIMIAR).sort((a, b) => b.dif - a.dif);
    const fracos = tend.filter((t) => t.dif <= -LIMIAR).sort((a, b) => a.dif - b.dif);
    const item = (t, tipo) => h('li', { class: 'adv-tend ' + tipo }, h('b', null, tipo === 'forte' ? t.s.forte : t.s.fraco), h('small', null, `${t.s.rot} ${t.s.fmt(c[t.s.k])} contra ${t.s.fmt(ref[t.s.k])} do nível (${Math.round(Math.abs(t.dif) * 100)}% ${t.dif > 0 ? 'acima' : 'abaixo'})`));
    const itemMotor = (x, tipo) => h('li', { class: 'adv-tend ' + tipo }, h('b', null, x.rotulo), h('small', null, `${fmtV(x.valor, x)} contra ${fmtV(x.referencia, x)} do nível (${Math.round(Math.abs(x.dif) * 100)}% ${x.dif > 0 ? 'melhor' : 'pior'}) · GC avançada`));
    const listaF = [...f.fortes.map((x) => itemMotor(x, 'forte')), ...fortes.map((t) => item(t, 'forte'))];
    const listaR = [...f.fracos.map((x) => itemMotor(x, 'fraco')), ...fracos.map((t) => item(t, 'fraco'))];

    const funcao = f.funcao
      ? h('div', { class: 'rs-dest funcao' }, h('span', { class: 'rot' }, 'Posição / função provável'), h('b', null, f.funcao.nome), f.funcao.amostraPequena && h('span', { class: 'selo' }, 'amostra pequena'),
        h('div', { class: 'adv-notas' }, ...f.funcao.notas.map(([nome, nota]) => h('div', null, h('span', null, nome), h('span', { class: 'rs-trilho' }, h('i', { class: 'eu', estilo: `width:${Math.max(3, nota)}%;background:var(--c2)` })), h('em', null, nota)))),
        h('small', null, `Pelas estatísticas avançadas da GC de ${pl(f.base ? f.base.avancadas : 0, 'partida', 'partidas')} dele na base.`))
      : h('div', { class: 'rs-dest funcao' }, h('span', { class: 'rot' }, 'Posição / função provável'), h('b', { class: 'mudo' }, 'Sem dados avançados'),
        h('small', null, c.fkRod && ref.fkRod && c.fkRod / ref.fkRod >= 1.3 ? 'Pelos números básicos, tem cara de entry: pega o primeiro abate bem mais que o nível.' : 'A GC não mostrou estatísticas avançadas das partidas dele com a Geladeira.'));
    const awp = f.awpPct !== null && f.awpPct !== undefined ? h('div', { class: 'rs-dest', estilo: '--k:var(--c4)' }, h('span', { class: 'rot' }, 'AWP'), h('b', null, `${Math.round(f.awpPct * 100)}%`), h('small', null, f.awpPct >= 0.4 ? 'Joga muito de AWP.' : f.awpPct >= 0.15 ? 'Pega a AWP às vezes.' : 'Quase não usa AWP.')) : null;

    return h('section', { class: 'card adv-ficha' },
      h('div', { class: 'adv-cab' },
        h('span', { class: 'avatar adv-av', estilo: '--tam:64px', 'aria-hidden': 'true' }, iniciaisAdv(f.nick)),
        h('div', { class: 'adv-id' }, h('h2', null, f.nick),
          h('div', { class: 'pilulas' },
            f.nivel && h('span', { class: 'pilula', estilo: '--p:var(--c5)' }, h('b', null, f.nivel), 'nível'),
            h('span', { class: 'pilula', estilo: '--p:var(--c1)' }, h('b', null, f.partidas), f.partidas === 1 ? 'partida contra a Geladeira' : 'partidas contra a Geladeira'),
            wrG !== null && h('span', { class: 'pilula', estilo: `--p:${wrG >= 0.5 ? 'var(--ok)' : 'var(--bad)'}` }, h('b', null, `${f.v}–${f.d}`), 'para a Geladeira'),
            h('span', { class: 'pilula', estilo: '--p:var(--c6)' }, h('b', null, GT.u.dataBR(f.ultima)), 'última vez')))),
      pequena && h('p', { class: 'nota aviso' }, `Só ${pl(f.partidas, 'partida', 'partidas')} contra a Geladeira: tudo aqui é indicativo, não conclusão.`),
      h('div', { class: 'rs-destaques' }, funcao, awp,
        f.mapas.length ? h('div', { class: 'rs-dest', estilo: '--k:var(--c6)' }, h('span', { class: 'rot' }, 'Mapas em que enfrentou a Geladeira'), h('div', { class: 'chips-m' }, ...f.mapas.map(([mp, n]) => h('span', { class: 'chip-m adv-mapa' }, `${mp} · ${n}`)))) : null),
      h('h3', { class: 'adv-sub' }, 'Contra a Geladeira, comparado com o mesmo nível'),
      h('div', { class: 'rs-kpis' }, ...tiles),
      h('div', { class: 'grade2' },
        h('div', { class: 'adv-col forte' }, h('h3', null, 'Pontos fortes'), listaF.length ? h('ul', { class: 'adv-lista' }, ...listaF) : h('p', { class: 'nota' }, 'Nada bem acima da média do nível.')),
        h('div', { class: 'adv-col fraco' }, h('h3', null, 'Pontos fracos (onde explorar)'), listaR.length ? h('ul', { class: 'adv-lista' }, ...listaR) : h('p', { class: 'nota' }, 'Nada bem abaixo da média do nível.'))),
      h('p', { class: 'nota' }, `Números dele só nas partidas contra a Geladeira (${pl(c.rodadas, 'rodada', 'rodadas')}). Tendência = 12% ou mais acima ou abaixo da média dos adversários do ${ref.rotulo}. Itens com "GC avançada" vêm do motor da Análise, com todo o histórico dele na base. Não segue os filtros de período e mapa.`));
  }

  GT.registrarBloco({ aba: 'adversarios', id: 'ficha', ordem: 5, render(el) {
    const F = fichas();
    if (!F.length) return;
    const atual = E.adv ? F.find((f) => f.nick === E.adv) || acharFicha(E.adv) : null;
    const lista = h('datalist', { id: 'lista-adv' }, ...F.map((f) => h('option', { value: f.nick }, `nível ${f.nivel || '?'} · ${pl(f.partidas, 'partida', 'partidas')}`)));
    const campo = h('input', { type: 'search', list: 'lista-adv', placeholder: 'Digite o nick do adversário', 'aria-label': 'Nick do adversário', autocomplete: 'off', value: atual ? atual.nick : '' });
    const ir = () => { const f = acharFicha(campo.value); if (f) abrirFicha(f.nick); else GT.u.avisar('Nenhum adversário com esse nick'); };
    campo.addEventListener('change', ir);
    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ir(); } });
    const top = F.slice(0, 12);
    el.append(card('Ficha de adversário', `${pl(F.length, 'jogador já enfrentou', 'jogadores já enfrentaram')} a Geladeira. Busque pelo nick para ver posição provável, pontos fortes e pontos fracos.`,
      h('div', { class: 'adv-busca' }, campo, lista, h('button', { type: 'button', class: 'btn', onclick: ir }, 'Abrir ficha')),
      h('div', { class: 'adv-rapidos' }, h('span', { class: 'rot' }, 'Mais enfrentados'), h('div', { class: 'chips-m' }, ...top.map((f) => h('a', { class: 'chip-m' + (atual && atual.nick === f.nick ? ' ativo' : ''), href: '#adversarios/' + encodeURIComponent(f.nick) + '?' + GT.u.paramsTexto() }, h('span', { class: 'chip-m-nome' }, `${f.nick} · ${f.partidas}`)))))));
    if (E.adv && !atual) el.append(h('p', { class: 'vazio' }, `Nenhum adversário com o nick "${E.adv}".`));
    if (atual) el.append(fichaAdversario(atual));
  } });

  GT.registrarBloco({ aba: 'adversarios', id: 'niveis', ordem: 10, render(el, ctx) {
    const nv = C.niveis(ctx.ms), ok = nv.filter((d) => d.partidas >= 10).sort((a, b) => b.wr - a.wr || b.partidas - a.partidas);
    const barras = (grupo) => ranking(nv.filter((d) => d.grupo === grupo).map((d) => ({ ...d, rotulo: d.faixa })), 'wr', 1, (d) => (d.partidas ? `${pct(d.wr)} · ${pl(d.partidas, 'jogo', 'jogos')}` : '0 jogos'), (d) => `${d.faixa}: ${d.v}V ${d.d}D em ${pl(d.partidas, 'partida', 'partidas')} (${pct(d.wr)})`, 'rank50');
    const G1 = 'Nível médio do time adversário', G2 = 'Diferença de nível (time da Geladeira menos o adversário)', G3 = 'Previsão da GC para o time da Geladeira';
    el.append(card('Adversários da Geladeira', null, h('p', { class: 'nota' }, 'Só partidas sem membros nos dois times; empates ficam fora do win rate. ', ok.length ? ['A faixa com melhor resultado (10 partidas ou mais) foi ', h('b', null, `${ok[0].faixa} (${pct(ok[0].wr)} em ${ok[0].partidas} partidas)`), ', e a pior foi ', h('b', null, `${ok[ok.length - 1].faixa} (${pct(ok[ok.length - 1].wr)} em ${ok[ok.length - 1].partidas} partidas)`), '. '] : 'Nenhuma faixa tem 10 partidas neste filtro. ', 'A linha vertical em cada barra marca 50%, e o número de partidas está ao lado: faixas com poucas partidas variam muito. Respeita os filtros.'),
      C.semMistas(ctx.ms).length ? [
        h('div', { class: 'grade2' }, h('div', { class: 'sub' }, h('strong', null, 'Por nível do time adversário'), barras(G1)), h('div', { class: 'sub' }, h('strong', null, 'Por diferença de nível (Geladeira menos adversário)'), barras(G2))),
        h('div', { class: 'sub' }, h('strong', null, 'Quando a GC dava a Geladeira como azarão / favorita'), barras(G3), h('p', { class: 'nota' }, 'Previsão de vitória que a GC mostrava para o time da Geladeira antes da partida: azarão abaixo de 45%, favorita acima de 55%.'))] : vazioFiltro()));
  } });

  GT.registrarBloco({ aba: 'adversarios', id: 'frequentes', ordem: 20, render(el, ctx) {
    const adv = ctx.D.adversarios, vence = adv.filter((a) => a.wr > 0.5).sort((a, b) => b.wr - a.wr || b.partidas - a.partidas).slice(0, 8), perde = adv.filter((a) => a.wr < 0.5).sort((a, b) => a.wr - b.wr || b.partidas - a.partidas).slice(0, 8);
    const colsAdv = [{ t: 'Jogador', f: (r) => r.jogador, cls: 'quebra' }, { t: 'Nível', f: (r) => r.nivel }, { t: 'Part.', f: (r) => r.partidas }, { t: 'V', f: (r) => r.v }, { t: 'D', f: (r) => r.d }, cWr];
    const dest = (r) => r.jogador === E.destaqueAdv;
    el.append(card('Adversários que mais se repetem', `Só adversários que apareceram 3 vezes ou mais contra a Geladeira em ${E.ano}, em ordem de win rate e depois de partidas. Esta lista é do ano todo e não muda com os filtros. Poucos se repetem: lobbies são aleatórios.`,
      h('div', { class: 'grade2' }, h('div', null, h('h3', { class: 'nota' }, 'MAIS VENCEMOS'), tabela(colsAdv, vence, { destaque: dest, aoClicar: (r) => abrirFicha(r.jogador), dicaClique: 'Abrir a ficha' })), h('div', null, h('h3', { class: 'nota' }, 'MAIS PERDEMOS'), tabela(colsAdv, perde, { destaque: dest, aoClicar: (r) => abrirFicha(r.jogador), dicaClique: 'Abrir a ficha' })))));
  } });
})();
