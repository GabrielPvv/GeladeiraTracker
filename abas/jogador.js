// Página do jogador (#jogadores/<nick>/<aba>, U4a). Cabeçalho com 5 números do FILTRO do site, forma (ADR das últimas 15 e 5 últimos resultados)
// e abas: Visão geral, Mapas, Partidas, Análise (últimos 6 meses, não segue o filtro) e Combate (demos, não segue o filtro).
// A rota é lida em membros.js (GT.lerRotaJogador); a aba "Jogadores" chama GT.paginaJogador(el, ctx).
(function () {
  'use strict';
  const GT = window.GT, C = GT.C;
  const { h, pl, E, UI, card, avatar, grafico, barrasWr, tabela, cWr, chipMembro, infoIcone, dica, sparkline, paramsTexto, vazioFiltro, nomeMapa, iconeMapa, selo, dataBR } = GT.u;

  // Formato único: vírgula decimal.
  const num = (v, d = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pc = (v, d = 0) => num(v * 100, d) + '%';
  const linkJog = (nick, aba) => '#jogadores/' + encodeURIComponent(nick) + '/' + aba + '?' + paramsTexto();
  const janela = () => (GT.u.rotJanela ? GT.u.rotJanela() : `Ano ${E.ano}`);
  const ADR_MIN_PART = 4, ADR_FOLGA = 0.08;

  // Linhas { ...x, v, dd } do jogador nas partidas do filtro, com a partida junto (pt; o campo m do jogador são as mortes).
  const linhasDe = (ctx, nick) => ctx.cache('jog-lin:' + nick, () => { const out = []; for (const m of ctx.ms) for (const x of m.mem) if (x.n === nick) out.push({ ...C.linhaMembro(x), pt: m }); return out; });
  const somaDe = (lin, campo) => lin.reduce((s, x) => s + (x[campo] || 0), 0);

  // Nível e Rating GC (a pontuação de ranking da GC) na última partida do ano em que o jogador aparece (identidade; não segue o filtro).
  function nivelPontos(ctx, nick) {
    for (let i = ctx.D.partidas.length - 1; i >= 0; i--) for (const x of ctx.D.partidas[i].mem) if (x.n === nick && (x.lv || x.rt)) return { lv: x.lv, rt: x.rt };
    return null;
  }

  // ---------- cabeçalho (P1) ----------
  // compacto (aba Análise): só avatar, nick, nível e função, sem a faixa de 5 números do filtro, para o mesmo número não aparecer com duas janelas na mesma tela (regra 4.0 item 2).
  function cabecalho(ctx, nick, mb, compacto) {
    const lin = linhasDe(ctx, nick), an = GT.analiseDe ? GT.analiseDe(nick) : null;
    const np = nivelPontos(ctx, nick) || (an && an.nivel ? { lv: an.nivel } : null);
    const f = an && an.funcoes && an.funcoes.sugerida && an.funcoes.ranking[0];
    const sub = h('div', { class: 'pj-sub' },
      np && h('span', { class: 'pj-gc' }, [np.lv ? `nível ${np.lv}` : null, np.rt ? `Rating GC ${np.rt.toLocaleString('pt-BR')}` : null].filter(Boolean).join(' · '),
        infoIcone('Nível e pontos da GC na última partida do ano em que o jogador aparece. Não seguem o filtro.')),
      f && h('span', { class: 'pj-funcao' }, 'Função provável: ', h('b', null, f.nome), selo('6 meses'), an.funcoes.amostraPequena && selo('amostra pequena', 'aviso')));
    const topo = h('div', { class: 'pj-topo' }, avatar(nick, 56), h('div', { class: 'pj-id' }, h('h1', { class: 'pj-nome' }, nick), sub));
    const voltar = h('div', { class: 'cp-barra' }, h('a', { class: 'pj-voltar', href: '#jogadores?' + paramsTexto() }, '← Jogadores'),
      h('span', { class: 'pj-acoes' }, h('a', { class: 'cp-atalho', href: '#jogadores/comparar/' + encodeURIComponent(nick) + '?' + paramsTexto() }, 'Comparar'),
        mb && !compacto ? h('button', { type: 'button', class: 'btn pequeno btn-compartilhar', title: 'Copia um texto curto com o link desta tela', onclick: () => { GT.u.gravarEstado(); GT.u.copiar(C.textoCompartilharJogador({ nick, janela: janela(), wr: mb.wr, kd: mb.kd, adr: mb.adr }, location.href), 'Texto copiado'); } }, 'Compartilhar') : null));
    if (compacto) return h('header', { class: 'card pj-cab compacto' }, voltar, topo);
    if (!mb) return h('header', { class: 'card pj-cab' }, voltar, topo, h('p', { class: 'pj-janela' }, `${janela()} · sem partidas do jogador neste filtro`));

    const numero = (rot, valor, dicaTxt) => h('div', { class: 'pj-num' }, h('span', { class: 'rot' }, rot, dicaTxt && infoIcone(dicaTxt)), h('b', { class: 'pj-v' }, valor));
    const nums = h('div', { class: 'pj-nums', role: 'group', 'aria-label': 'Números do jogador no filtro' },
      numero('Partidas', String(mb.partidas)), numero('Win rate', pc(mb.wr)),
      numero('K/D', num(mb.kd, 2)), numero('ADR', num(mb.adr, 1), 'Dano médio por rodada.'), numero('KAST', pc(mb.kastPct), 'Rodadas com abate, assistência, sobrevivência ou troca.'));

    // Forma: ADR das últimas 15 partidas e os 5 últimos resultados do time do jogador.
    const xs = lin.filter((x) => x.rod).slice(-15), ult5 = lin.filter((x) => x.r === 'V' || x.r === 'D').slice(-5);
    const spark = h('span', { class: 'pj-spark' });
    if (xs.length >= 6) sparkline(spark, xs.map((x) => x.dano / x.rod), { largura: 132, altura: 34, area: true, ponto: true, cor: 'var(--acento)', rotulo: `ADR nas últimas ${xs.length} partidas de ${nick}` });
    const quadros = h('span', { class: 'pj-qs', role: 'img', 'aria-label': 'Últimos resultados: ' + ult5.map((x) => (x.r === 'V' ? 'vitória' : 'derrota')).join(', ') },
      ...ult5.map((x) => dica(h('span', { class: 'pj-q ' + x.r.toLowerCase() }, x.r), () => `${dataBR(x.pt.d)} · ${nomeMapa(x.pt.mp)} · ${x.pt.sn} a ${x.pt.se}`)));
    const forma = h('div', { class: 'pj-forma' }, h('span', { class: 'rot' }, 'Forma', infoIcone('ADR das últimas 15 partidas do jogador no filtro e os 5 últimos resultados do time dele (da mais antiga para a mais recente).')),
      h('div', { class: 'pj-forma-in' }, xs.length >= 6 ? spark : h('small', { class: 'mudo' }, 'poucas partidas'), quadros));
    return h('header', { class: 'card pj-cab' }, voltar, topo,
      h('p', { class: 'pj-janela' }, janela(), ' · ', h('b', null, pl(mb.partidas, 'partida', 'partidas'))), h('div', { class: 'pj-corpo' }, nums, forma));
  }

  function abas(ctx, nick) {
    const nDemos = GT.demosDe ? GT.demosDe(nick, ctx) : 0;
    const item = (id, t, extra) => h('a', { class: 'pj-aba' + (UI.jogAba === id ? ' ativo' : ''), href: linkJog(nick, id), 'aria-current': UI.jogAba === id ? 'page' : null }, t, extra && h('span', { class: 'pj-aba-n' }, ' · ' + extra));
    return h('nav', { class: 'pj-abas', 'aria-label': `Páginas de ${nick}` },
      item('visao', 'Visão geral'), item('mapas', 'Mapas'), item('partidas', 'Partidas'), item('analise', 'Análise', 'últimos 6 meses'), item('combate', 'Combate', nDemos ? pl(nDemos, 'demo', 'demos') : null));
  }

  // ---------- Visão geral ----------
  function visao(ctx, nick, mb) {
    const lin = linhasDe(ctx, nick), p = lin.length, rod = somaDe(lin, 'rod');
    const item = (rot, v, sub, info) => h('div', { class: 'pj-duo-i' }, h('span', { class: 'rot' }, rot, info && infoIcone(info)), h('b', { class: 'pj-v' }, v), h('small', { class: 'mudo' }, sub));
    const abertura = card({ t: 'Abertura e utilidade', selos: [[janela()]] }, null, h('div', { class: 'pj-duo' },
      item('1º abate', pc(somaDe(lin, 'fk') / Math.max(1, rod), 1), 'das rodadas, o jogador fez o primeiro abate'),
      item('Assist. de flash', num(somaDe(lin, 'fa') / Math.max(1, p), 1), 'por partida'),
      item('Bombas plantadas', num(somaDe(lin, 'pl') / Math.max(1, p), 1), 'por partida')));
    const mesesM = C.membrosMes(ctx.ms, [nick]);
    const grafMes = card('Win rate mês a mês', 'O número embaixo de cada mês é a quantidade de partidas do jogador.', grafico((g) => barrasWr(g, mesesM)));
    let par = C.comQuem(ctx.ms, nick); const min = par.some((x) => x.partidas >= 5) ? 5 : 3;
    par = par.filter((x) => x.partidas >= min).sort((a, b) => b.wr - a.wr || b.partidas - a.partidas);
    const com = card('Com quem mais ganha', `Partidas do jogador no mesmo time de cada outro membro (${min} partidas juntos ou mais), do maior win rate para o menor.`,
      par.length ? tabela([{ t: 'Com', f: (r) => chipMembro(r.com, { link: true }) }, { t: 'Part.', f: (r) => r.partidas }, { t: 'V', f: (r) => r.v }, { t: 'D', f: (r) => r.d }, { ...cWr, t: 'WR' }], par)
        : h('p', { class: 'vazio' }, 'Poucas partidas com outros membros neste filtro.'));
    return [formaCard(lin), abertura, grafMes, nivelCard(ctx, nick), com];
  }

  // ---------- Forma com tendência (últimas 10 partidas contra as 10 anteriores) ----------
  const FORMA_ROT = { adr: 'ADR', kast: 'KAST', kd: 'K/D', fk: '1º abate' };
  const FORMA_FMT = { adr: (v) => num(v, 1), kast: (v) => pc(v), kd: (v) => num(v, 2), fk: (v) => pc(v, 1) };
  const FORMA_DIF = { adr: (d) => num(Math.abs(d), 1), kast: (d) => num(Math.abs(d) * 100, 1) + ' p.p.', kd: (d) => num(Math.abs(d), 2), fk: (d) => num(Math.abs(d) * 100, 1) + ' p.p.' };
  const SETA = { sobe: ['▲', 'subindo'], cai: ['▼', 'caindo'], estavel: ['▬', 'estável'] };
  function formaCard(lin) {
    const t = C.tendenciaForma(lin, { n: 10 });
    const titulo = { t: 'Forma: últimas 10 partidas', selos: [[janela()]] };
    if (!t.ok) return card(titulo, null, h('p', { class: 'vazio' }, `Faltam partidas para comparar a forma: são necessárias 20 partidas com rodadas no filtro e há ${t.amostra}.`));
    const itens = t.metricas.map((m) => {
      const [sim, txt] = SETA[m.dir], cl = m.dir === 'sobe' ? 'ok' : m.dir === 'cai' ? 'bad' : 'mudo';
      return h('div', { class: 'pj-duo-i pj-tend' },
        h('span', { class: 'rot' }, FORMA_ROT[m.id]),
        h('b', { class: 'pj-v' }, FORMA_FMT[m.id](m.agora)),
        h('small', { class: 'mudo' }, 'antes ', FORMA_FMT[m.id](m.antes), ' → agora ', FORMA_FMT[m.id](m.agora)),
        h('span', { class: 'pj-seta ' + cl, role: 'img', 'aria-label': txt }, h('span', { 'aria-hidden': 'true' }, sim), ' ', m.dir === 'estavel' ? 'estável' : (m.dir === 'sobe' ? '+' : '−') + FORMA_DIF[m.id](m.dif)));
    });
    return card(titulo, 'Compara as últimas 10 partidas do jogador com as 10 anteriores (somando e dividindo no fim). Só conta como mudança a partir de ADR ±5, KAST ±3 p.p., K/D ±0,10 e 1º abate ±2 p.p.; abaixo disso, estável. Verde e vermelho comparam o jogador com ele mesmo.',
      h('div', { class: 'pj-duo pj-tends' }, ...itens));
  }

  // ---------- Desempenho contra nível do adversário ----------
  function nivelCard(ctx, nick) {
    const fx = C.porNivelAdversario(ctx.ms, nick), total = fx.reduce((s, f) => s + f.partidas, 0);
    const titulo = { t: 'Contra adversários de nível diferente', selos: [[janela()]] };
    const nota = `Compara o nível médio do time adversário com o do time da Geladeira na partida (diferença maior que 0,3 para mais ou para menos; entre os dois é nível parecido). Partidas mistas ficam fora. Faixas com menos de ${C.MIN_NIVEL_ADV} partidas aparecem sem destaque.`;
    if (!total) return card(titulo, nota, h('p', { class: 'vazio' }, 'Sem partidas do jogador com nível dos times neste filtro.'));
    const peq = (r) => r.amostraPequena;
    const cols = [
      { t: 'Adversário', f: (r) => h('span', null, r.rotulo, peq(r) && r.partidas ? [' ', selo('amostra pequena', 'aviso')] : null) },
      { t: 'Part.', f: (r) => r.partidas, cls: 'pj-n' },
      { t: 'V–D', f: (r) => `${r.v}–${r.d}`, cls: 'pj-n' },
      { t: 'WR', f: (r) => (r.partidas ? h('span', { class: peq(r) ? '' : r.wr >= 0.5 ? 'ok' : 'bad' }, pc(r.wr)) : '—'), cls: 'pj-n' },
      { t: 'K/D', f: (r) => (r.partidas ? num(r.kd, 2) : '—'), cls: 'pj-n' },
      { t: 'ADR', f: (r) => (r.partidas ? num(r.adr, 1) : '—'), cls: 'pj-n' }];
    return card(titulo, nota, tabela(cols, fx));
  }

  // ---------- Mapas ----------
  function mapas(ctx, nick, mb) {
    const lin = linhasDe(ctx, nick), por = new Map();
    for (const x of lin) { if (!por.has(x.pt.mp)) por.set(x.pt.mp, []); por.get(x.pt.mp).push(x); }
    const linhas = [...por].map(([mapa, l]) => ({ mapa, ...C.somar(l), fa: somaDe(l, 'fa') })).sort((a, b) => b.partidas - a.partidas);
    if (!linhas.length) return [vazioFiltro(`${nick} não jogou nessas partidas.`)];
    const an = GT.analiseDe ? GT.analiseDe(nick) : null, MIN_AV = 6;
    const av = new Map(((an && an.mapas) || []).filter((m) => m.jogador && m.jogador.partidas >= MIN_AV).map((m) => [m.mapa, m]));
    const adrTot = mb.adr;
    const normal = (r) => {
      if (r.partidas < ADR_MIN_PART || !adrTot) return null;
      const dif = (r.adr - adrTot) / adrTot;
      if (dif >= ADR_FOLGA) return { t: 'acima do normal dele', papel: 'ok', dif };
      if (dif <= -ADR_FOLGA) return { t: 'abaixo do normal dele', papel: '', dif };
      return null;
    };
    const cMapa = { t: 'Mapa', f: (r) => { const n = normal(r), s = n && dica(selo(n.t, n.papel), () => `ADR ${num(r.adr, 1)} neste mapa contra ${num(adrTot, 1)} no geral do filtro (${n.dif > 0 ? '+' : '−'}${Math.round(Math.abs(n.dif) * 100)}%). Mapas com menos de ${ADR_MIN_PART} partidas não entram.`);
      return h('span', { class: 'pj-mapa' }, h('span', { class: 'pj-mapa-l' }, iconeMapa(r.mapa), h('span', null, nomeMapa(r.mapa))), s); } };
    const mais = 'pj-mais';
    const ratingDe = (r) => av.get(r.mapa);
    const cols = [cMapa,
      { t: 'Part.', f: (r) => r.partidas, cls: 'pj-n' },
      { t: 'V–D', f: (r) => `${r.v}–${r.d}`, cls: `pj-n ${mais}` },
      { ...cWr, t: 'WR', cls: 'pj-n' },
      { t: 'K/D', f: (r) => num(r.kd, 2), cls: 'pj-n' },
      { t: 'ADR', f: (r) => num(r.adr, 1), cls: `pj-n ${mais}` },
      { t: 'HS%', f: (r) => pc(r.hsPct), cls: `pj-n ${mais}` },
      { t: 'KAST', f: (r) => pc(r.kastPct), cls: `pj-n ${mais}` },
      { t: '1º abate', f: (r) => pc(r.fkRod, 1), cls: `pj-n ${mais}` },
      { t: 'Rating aprox.', f: (r) => { const a = ratingDe(r); return a ? h('span', { class: a.jogador.rating >= a.nivel.rating ? 'ok' : '' }, num(a.jogador.rating, 2)) : '—'; }, cls: `pj-n pj-av ${mais}` },
      { t: 'Nível', f: (r) => { const a = ratingDe(r); return a ? num(a.nivel.rating, 2) : '—'; }, cls: `pj-n pj-av ${mais}` },
      { t: 'Granadas', f: (r) => h('a', { class: 'pj-gr', href: '#granadas/' + r.mapa + '?' + paramsTexto() }, 'Granadas →'), cls: mais }];
    const t = tabela(cols, linhas);
    const tb = t.querySelector('table'); tb.classList.add('pj-tb');
    tb.querySelectorAll('thead th').forEach((th, i) => { const c = cols[i].cls || ''; if (c) c.split(' ').forEach((k) => th.classList.add(k)); });
    const ths = tb.querySelector('thead tr');
    const grupo = h('tr', { class: 'pj-grupo' }, h('th', { colspan: 1 }), h('th', { colspan: 8, class: 'pj-g-filtro' }, 'No filtro'),
      h('th', { colspan: 2, class: 'pj-g-av' }, selo('GC avançada, 6 meses', 'destaque'), infoIcone('Rating aproximado e média do nível no mesmo mapa, das estatísticas avançadas da GC nos últimos 6 meses (mapas com 6 partidas ou mais na janela). Não segue o filtro.')), h('th', { colspan: 1 }));
    tb.querySelector('thead').insertBefore(grupo, ths);
    tb.querySelectorAll('.pj-av').forEach((c) => { if (c.tagName === 'TH') c.append(infoIcone('GC avançada, últimos 6 meses. Não segue o filtro.')); });
    const caixa = h('div', { class: 'pj-tab' }, t);
    const btn = h('button', { type: 'button', class: 'btn pequeno pj-mais-btn', 'aria-pressed': 'false', onclick: () => { const on = caixa.classList.toggle('aberta'); btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? 'Menos colunas' : 'Mais colunas'; } }, 'Mais colunas');
    return [card({ t: 'Mapas de ' + nick, selos: [[janela()]] }, 'Selo na linha: ADR do jogador no mapa contra o ADR dele no filtro (4 partidas ou mais no mapa, margem de 8%). Rating aprox. e Nível vêm da GC avançada dos últimos 6 meses.', btn, caixa)];
  }

  // ---------- Partidas ----------
  const LOTE = 50;
  function partidas(ctx, nick) {
    const U = GT.partidasUI;
    const lin = [...linhasDe(ctx, nick)].reverse();
    if (!lin.length) return [vazioFiltro(`${nick} não jogou nessas partidas.`)];
    const caixa = h('div', { class: 'pj-lista' });
    let usadas = 0, dia = null, ul = null;
    const linha = (x) => {
      const m = x.pt, j = GT.jogoDe ? GT.jogoDe(m, ctx.D) : null;
      const nums = h('span', { class: 'pl-chips pj-nums-l' }, h('span', null, 'K-D ', h('b', null, `${x.k}-${x.m}`)), h('span', null, 'ADR ', h('b', null, x.rod ? num(x.dano / x.rod, 1) : '—')));
      const base = [h('span', { class: 'pl-hora' }, U.hora(m)), U.mapaCel(m.mp), U.placarNum(m.sn, m.se, m.r), U.vd(m.r), nums];
      const li = h('li', { class: 'pl-item ' + U.classeR(m.r) });
      li.append(j ? h('a', { class: 'pl-linha pj-linha', href: U.linkDemo(j.id), 'aria-label': `Análise completa: ${U.descricao(m.mp, m.sn, m.se, m.d)}` }, ...base, h('span', { class: 'selo pl-analise' }, 'análise completa ›'))
        : h('div', { class: 'pl-linha pj-linha sem', 'aria-label': U.descricao(m.mp, m.sn, m.se, m.d) }, ...base, h('span')));
      return li;
    };
    const mais = h('button', { type: 'button', class: 'btn pj-mais-p' });
    const lote = () => {
      for (const x of lin.slice(usadas, usadas + LOTE)) {
        if (x.pt.d !== dia) { dia = x.pt.d; caixa.append(h('h3', { class: 'pl-dia' }, U.diaExtenso(dia))); ul = h('ul', { class: 'pl-lista', 'aria-label': U.diaExtenso(dia) }); caixa.append(ul); }
        ul.append(linha(x));
      }
      usadas = Math.min(lin.length, usadas + LOTE);
      mais.hidden = usadas >= lin.length; mais.textContent = `Mostrar mais (${lin.length - usadas})`;
    };
    mais.addEventListener('click', lote); lote();
    const nA = lin.filter((x) => GT.jogoDe && GT.jogoDe(x.pt, ctx.D)).length;
    return [card({ t: `Partidas de ${nick} · ${lin.length}`, selos: [[janela()]] }, `Mais recentes primeiro. K-D e ADR são do jogador na partida${nA ? `; ${pl(nA, 'partida tem', 'partidas têm')} análise completa (selo, abre na aba Demos)` : ''}.`, caixa, mais)];
  }

  // ---------- Análise e Combate ----------
  const analise = (ctx, nick) => (GT.analiseJogador ? GT.analiseJogador(nick, ctx) : [h('p', { class: 'vazio' }, 'Análise indisponível.')]);
  // Os cards (mira, posição e movimento, bomba e economia) vêm de combate.js e levam o selo "N demos · não segue o filtro".
  const combate = (ctx, nick) => (GT.combateJogador ? GT.combateJogador(nick, ctx) : [h('p', { class: 'vazio' }, 'Combate indisponível.')]);

  GT.paginaJogador = (el, ctx) => {
    const nick = UI.jogNick, aba = UI.jogAba || 'visao';
    el.append(h('div', { class: 'pj' }));
    const raiz = el.lastChild;
    if (!ctx.membros.includes(nick)) { raiz.append(h('a', { class: 'pj-voltar', href: '#jogadores?' + paramsTexto() }, '← Jogadores'), h('p', { class: 'vazio' }, `"${nick}" não é membro da Geladeira em ${E.ano}.`)); return; }
    const mb = ctx.cache('jog-mb:' + nick, () => C.membros(ctx.ms, [nick])[0] || null);
    raiz.append(cabecalho(ctx, nick, mb, aba === 'analise'), abas(ctx, nick));
    const corpo = h('div', { class: 'pj-conteudo', role: 'region', 'aria-label': 'Conteúdo da página' });
    raiz.append(corpo);
    const semFiltro = aba === 'analise' || aba === 'combate';
    const nos = !mb && !semFiltro ? [vazioFiltro(`${nick} não jogou nessas partidas.`)]
      : aba === 'mapas' ? mapas(ctx, nick, mb) : aba === 'partidas' ? partidas(ctx, nick) : aba === 'analise' ? analise(ctx, nick) : aba === 'combate' ? combate(ctx, nick) : visao(ctx, nick, mb);
    for (const n of nos) corpo.append(n);
  };
})();
