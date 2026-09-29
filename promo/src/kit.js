// Scene factories shared by every variant. Each factory returns (root, ctx) => update(lb, L, t, G)
// where lb is the local beat inside the scene and G is the per-frame global state.
(function () {
  const { clamp, lerp, pr, E, spring, rnd, hitEnv, el, splitChars, scramble, typed, T3, LOGO_SVG, drawLogo, beatSec } = window.B;
  const K = (window.K = {});

  const IC = {
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    pulse: '<path d="M2 12h4l3-8 4 16 3-8h6"/>',
    fn: '<path d="M8 3c-2 0-3 1-3 3v3c0 1.5-1 2.5-2.5 3 1.5.5 2.5 1.5 2.5 3v3c0 2 1 3 3 3M16 3c2 0 3 1 3 3v3c0 1.5 1 2.5 2.5 3-1.5.5-2.5 1.5-2.5 3v3c0 2-1 3-3 3"/>',
    hook: '<path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
    down: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
    browser: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M6.5 6.5h.01M9 6.5h.01"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  };
  K.IC = IC;
  const icon = (name, size = 64, color = '#6ee7c8', sw = 1.6) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${IC[name]}</svg>`;
  K.icon = icon;

  K.APPS_LIVE = [['formforge', 'FormForge'], ['haul', 'Haul'], ['chessduo', 'ChessDuo'], ['split', 'Split Video Parts'], ['blastguide', 'Blast Guide'],
    ['booth', 'Booth'], ['olympus', 'Olympus'], ['barber', 'Studio Barber House']];
  K.APPS_ALL = ['formforge', 'haul', 'chessduo', 'split', 'blastguide', 'booth', 'olympus', 'barber', 'riff', 'heard', 'scribe', 'spot', 'flick',
    'packet', 'cook', 'glasstube', 'glassnav', 'atelier', '13luas', 'metodo-mutante', 'ironmath', 'liveask', 'triage'];
  const iconImg = (id, size, parent, style) => {
    const d = el('div', 'icon', `<img src="assets/icons/${id}.png">`, parent, Object.assign({ width: size + 'px', height: size + 'px' }, style || {}));
    return d;
  };
  K.iconImg = iconImg;

  // popIn: spring based entrance, returns {o, y, s, blur}
  function pop(lb, at, dist = 60, s0 = 1.2, blur0 = 16) {
    const x = (lb - at) * beatSec();
    if (x < 0) return { o: 0, y: dist, s: s0, blur: blur0 };
    const sp = spring(x, 2.6, 0.5), f = E.outCubic(clamp(x / .25));
    return { o: f, y: (1 - sp) * dist, s: lerp(s0, 1, sp), blur: (1 - f) * blur0 };
  }
  K.pop = pop;
  const applyPop = (n, p, extra = '') => {
    n.style.opacity = p.o; n.style.transform = `${extra} translateY(${p.y}px) scale(${p.s})`;
    n.style.filter = p.blur > .3 ? `blur(${p.blur}px)` : 'none';
  };
  K.applyPop = applyPop;

  // big text that punches through camera on exit
  function exitZoom(n, lb, at, len = .45, base = 'translate(-50%,-50%)') {
    const x = E.inExpo(pr(lb, at - len, at));
    if (x <= 0) return 0;
    n.style.transform = `${base} scale(${1 + x * 4})`; n.style.filter = `blur(${x * 30}px)`; n.style.opacity = 1 - x;
    return x;
  }

  // ------------------------------------------------------------------ terminal
  function Terminal(parent, o) {
    const g = el('div', 'glass term' + (o.solid ? ' solid' : ''), null, parent, Object.assign({ width: (o.width || 1000) + 'px', fontSize: (o.font || 26) + 'px' }, o.style || {}));
    el('div', 'bar', `<b></b><b></b><b></b><span>${o.title || 'berth'}</span>`, g);
    const body = el('div', 'body', null, g, { minHeight: (o.minH || 200) + 'px' });
    const rows = o.lines.map(L => {
      const n = el('div', 'ln', '', body);
      return Object.assign({ n }, L);
    });
    if (o.cue) o.lines.forEach(L => {
      if (L.cmd) o.cue(L.at, 'type', { len: L.len || 1.5, chars: L.cmd.length });
      else o.cue(L.at, L.big ? 'ding' : 'blip');
    });
    const update = (lb) => {
      let lastCmd = null;
      rows.forEach((r, i) => {
        if (r.cmd != null) {
          const p = pr(lb, r.at, r.at + (r.len || 1.5));
          if (lb < r.at) { r.n.innerHTML = ''; r.n.style.opacity = 0; return; }
          r.n.style.opacity = 1;
          const next = rows.slice(i + 1).find(q => q.at != null);
          const typing = p < 1 || !next || lb < next.at;
          const blink = Math.floor(lb * 2) % 2 === 0 || p < 1;
          r.n.innerHTML = `<span class="p">${r.prompt || '$'}</span> ${esc(typed(r.cmd, p))}${typing && blink ? '<span class="cur"></span>' : ''}`;
          lastCmd = r;
        } else {
          const p = pr(lb, r.at, r.at + .3);
          r.n.innerHTML = r.out;
          r.n.style.opacity = E.outCubic(p);
          r.n.style.transform = `translateX(${(1 - E.outCubic(p)) * -24}px)`;
          r.n.style.clipPath = `inset(0 ${(1 - E.outQuint(p)) * 100}% 0 0)`;
        }
      });
    };
    return { g, update };
  }
  K.Terminal = Terminal;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // ------------------------------------------------------------------ ignite (logo draw + headline)
  K.ignite = o => (root, ctx) => {
    const k = o.logoEnd, words = o.words, exitAt = o.exitAt;
    const line = el('div', 'abs', null, root, { left: '960px', top: '540px', height: '3px', width: '0', transform: 'translate(-50%,-50%)',
      background: 'linear-gradient(90deg,transparent,#6ee7c8 25%,#fff 50%,#6ee7c8 75%,transparent)', boxShadow: '0 0 30px 3px rgba(110,231,200,.7)' });
    const lw = el('div', 'center', LOGO_SVG(260), root, { filter: 'drop-shadow(0 0 40px rgba(110,231,200,.45))' });
    const svg = lw.querySelector('svg');
    const head = el('div', 'center word', null, root, { fontSize: '176px', textAlign: 'center', fontWeight: 720, whiteSpace: 'normal', width: '1500px', lineHeight: 1.02 });
    const ws = words.map((w, i) => el('span', i === words.length - 1 ? 'grad' : '', w.w, head,
      { display: 'inline-block', marginRight: i < words.length - 1 ? '.24em' : '0', paddingBottom: '.08em' }));
    const tag = el('div', 'center mono', 'BERTH / BACKEND, HOSTED', root, { top: '700px', fontSize: '20px', letterSpacing: '.3em', color: '#a0a8b0' });
    ctx.cue(0, 'swell', { len: k }); ctx.cue(k, 'hit', { size: 1 }); ctx.cue(k - .6, 'whoosh', { len: .6 });
    words.forEach((w, i) => ctx.cue(w.at, i === words.length - 1 ? 'hit' : 'thump', { size: .6 }));
    ctx.cue(exitAt - .5, 'whoosh', { len: .5 });
    return (lb, L, t, G) => {
      const lg = E.outExpo(pr(lb, 0, .4 * k)) * (1 - E.inCubic(pr(lb, .35 * k, .65 * k)));
      line.style.width = (lg * 1300) + 'px'; line.style.opacity = lg;
      drawLogo(svg, E.inOutCubic(pr(lb, .3 * k, .78 * k)), E.outCubic(pr(lb, .55 * k, .8 * k)), E.outCubic(pr(lb, .62 * k, .9 * k)), E.outCubic(pr(lb, .68 * k, .98 * k)));
      const z = E.inExpo(pr(lb, k - .4, k + .12));
      const breathe = 1 + .03 * Math.sin(lb * 1.5);
      lw.style.transform = `translate(-50%,-50%) scale(${breathe * (1 + z * 16)})`;
      lw.style.opacity = 1 - pr(lb, k - .02, k + .15);
      tag.style.opacity = pr(lb, .5 * k, .8 * k) * (1 - pr(lb, k - .5, k - .2));
      tag.textContent = scramble('BERTH / BACKEND, HOSTED', pr(lb, .5 * k, .9 * k), Math.floor(lb * 8));
      G.energy = lerp(.08, .75, E.inCubic(pr(lb, 0, k))) + hitEnv(lb, k, 1.2) * .5;
      G.flash = hitEnv(lb, k, .35) * .85; G.flashColor = '#c8fbef';
      G.warp = z * (1 - pr(lb, k, k + .6)) * .9 + hitEnv(lb, k, .4) * .5;
      G.hud = pr(lb, .2 * k, .6 * k);
      ws.forEach((n, i) => {
        const p = pop(lb, words[i].at, 90, 1.35, 22);
        applyPop(n, p);
      });
      const last = words[words.length - 1].at;
      G.shake = hitEnv(lb, last, .25) * 14 + hitEnv(lb, k, .3) * 10;
      ws[ws.length - 1].style.backgroundPosition = `${100 - pr(lb, last, exitAt) * 100}% 0`;
      head.style.transform = 'translate(-50%,-50%)'; head.style.filter = 'none'; head.style.opacity = 1;
      exitZoom(head, lb, exitAt);
    };
  };

  // ------------------------------------------------------------------ slam (one word per beat)
  K.slam = o => (root, ctx) => {
    const per = o.per || 1;
    const items = o.words.map((w, i) => {
      const wrap = el('div', 'center', null, root, { textAlign: 'center', width: '1800px' });
      const ic = el('div', '', icon(w.icon, 110, '#6ee7c8', 1.4), wrap, { display: 'flex', justifyContent: 'center', marginBottom: '26px', filter: 'drop-shadow(0 0 24px rgba(110,231,200,.6))' });
      const stack = el('div', '', null, wrap, { position: 'relative', height: '250px' });
      const mk = (color, blend) => el('div', 'word', w.w, stack, { position: 'absolute', left: 0, right: 0, fontSize: '250px', color, mixBlendMode: blend || 'normal' });
      const r = mk('#ff3d7f', 'screen'), b = mk('#39d0ff', 'screen'), main = mk('#f3f5f6');
      const sub = el('div', 'mono', w.sub, wrap, { fontSize: '30px', color: '#a0a8b0', marginTop: '34px', letterSpacing: '.02em' });
      const num = el('div', 'mono', `${String(i + 1).padStart(2, '0')} / ${String(o.words.length).padStart(2, '0')}`, root,
        { position: 'absolute', left: '96px', top: '480px', fontSize: '22px', color: '#6ee7c8', letterSpacing: '.2em' });
      ctx.cue(i * per, 'hit', { size: .75, pitch: i });
      return { wrap, ic, r, b, main, sub, num, at: i * per };
    });
    ctx.cue(o.words.length * per - .5, 'whoosh', { len: .5 });
    const bar = el('div', 'abs', null, root, { left: '96px', right: '96px', top: '1000px', height: '2px', background: 'rgba(255,255,255,.12)' });
    const fill = el('div', '', null, bar, { height: '100%', width: '0', background: '#6ee7c8', boxShadow: '0 0 12px #6ee7c8' });
    return (lb, L, t, G) => {
      const idx = clamp(Math.floor(lb / per), 0, items.length - 1);
      items.forEach((it, i) => {
        const on = i === idx;
        it.wrap.style.display = on ? 'block' : 'none'; it.num.style.display = on ? 'block' : 'none';
        if (!on) return;
        const x = (lb - it.at) * beatSec();
        const sp = spring(x, 3.4, .45);
        const s = lerp(1.5, 1, sp) * (1 + .05 * (lb - it.at));
        const bl = (1 - E.outCubic(clamp(x / .12))) * 26;
        it.wrap.style.transform = `translate(-50%,-50%) scale(${s}) rotate(${(i % 2 ? 1 : -1) * (1 - sp) * 4}deg)`;
        it.wrap.style.filter = bl > .3 ? `blur(${bl}px)` : 'none';
        it.wrap.style.opacity = 1;
        const split = hitEnv(lb, it.at, .18) * 22 + 2;
        it.r.style.transform = `translate(${-split}px,${split * .3}px)`; it.b.style.transform = `translate(${split}px,${-split * .3}px)`;
        it.r.style.opacity = it.b.style.opacity = .85;
        it.main.style.fontWeight = String(Math.round(lerp(860, 650, E.outCubic(clamp(x / .35)))));
        it.r.style.fontWeight = it.b.style.fontWeight = it.main.style.fontWeight;
        it.sub.textContent = scramble(o.words[i].sub, pr(lb, it.at + .1, it.at + .6), Math.floor(lb * 12));
        it.ic.style.transform = `translateY(${(1 - sp) * -40}px)`;
      });
      fill.style.width = (clamp(lb / L) * 100) + '%';
      const h = hitEnv(lb % per, 0, .22);
      G.flash = h * .22; G.flashColor = ['#6ee7c8', '#8ab4ff', '#b69cff'][idx % 3];
      G.energy = .55 + h * .6; G.hue = (idx % 3) / 2; G.shake = h * 9; G.warp = h * .35;
      G.focus = [Math.sin(idx * 2.1) * .2, Math.cos(idx * 1.7) * .15];
    };
  };

  // ------------------------------------------------------------------ allofit (collapse into lockup)
  K.allofit = o => (root, ctx) => {
    const drop = o.drop;
    const names = o.names;
    const chips = names.map((n, i) => el('div', 'chip', `<i></i>${n}`, root, { position: 'absolute', left: '960px', top: '540px', fontSize: '30px' }));
    const ring = el('div', 'abs', null, root, { left: '960px', top: '540px', width: '10px', height: '10px', borderRadius: '50%',
      border: '3px solid #6ee7c8', boxShadow: '0 0 40px #6ee7c8, inset 0 0 40px rgba(110,231,200,.5)', transform: 'translate(-50%,-50%)' });
    const lock = el('div', 'center', null, root, { display: 'flex', alignItems: 'center', gap: '48px' });
    const lw = el('div', '', LOGO_SVG(250), lock, { filter: 'drop-shadow(0 0 40px rgba(110,231,200,.5))' });
    const wm = el('div', 'word', 'Berth', lock, { fontSize: '270px', fontWeight: 600, letterSpacing: '-.05em' });
    const sub = el('div', 'center', o.sub, root, { top: '800px', fontSize: '50px', fontWeight: 500, color: '#a0a8b0', letterSpacing: '-.02em', whiteSpace: 'nowrap' });
    const svg = lw.querySelector('svg');
    ctx.cue(0, 'riser', { len: drop }); ctx.cue(drop, 'drop'); ctx.cue(drop, 'hit', { size: 1.3 });
    return (lb, L, t, G) => {
      const c = E.inExpo(pr(lb, 0, drop));
      chips.forEach((n, i) => {
        const a = i / chips.length * Math.PI * 2 + lb * .9;
        const r = lerp(620, 0, c) * (1 + .08 * Math.sin(i * 3 + lb * 2));
        const x = Math.cos(a) * r * 1.35, y = Math.sin(a) * r * .75;
        const intro = E.outBack(pr(lb, i * .08, i * .08 + .6));
        n.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${intro * lerp(1, .3, c)})`;
        n.style.opacity = lb < drop ? 1 : 0;
        n.style.filter = c > .5 ? `blur(${(c - .5) * 20}px)` : 'none';
      });
      const rp = pr(lb, drop, drop + 1.6);
      const rs = E.outExpo(rp) * 3200;
      ring.style.width = ring.style.height = rs + 'px'; ring.style.opacity = lb >= drop ? (1 - rp) : 0;
      const x = (lb - drop) * beatSec();
      const sp = spring(x, 2.2, .5);
      lock.style.opacity = lb >= drop ? 1 : 0;
      lock.style.transform = `translate(-50%,-60%) scale(${lerp(1.6, 1, sp)})`;
      lock.style.filter = lb >= drop ? `blur(${(1 - E.outCubic(clamp(x / .2))) * 30}px)` : 'none';
      drawLogo(svg, 1, 1, 1, 1);
      const sp2 = pop(lb, drop + 1, 30, 1, 10);
      applyPop(sub, sp2, 'translate(-50%,-50%)');
      G.energy = (lb < drop ? lerp(.5, .2, c) : .6) + hitEnv(lb, drop, 2) * .7;
      G.warp = (lb < drop ? c : 0) * 1.1 + hitEnv(lb, drop, .5) * .8;
      G.flash = hitEnv(lb, drop, .4) * .95; G.flashColor = '#ffffff';
      G.shake = hitEnv(lb, drop, .4) * 22;
      G.worldScale = 1 + (lb < drop ? c : 0) * .06;
      G.grid = lb > drop ? E.outCubic(pr(lb, drop, drop + 2)) * .8 : 0;
      exitZoom(lock, lb, L, .45, 'translate(-50%,-60%)');
      if (lb > L - .45) sub.style.opacity = 1 - pr(lb, L - .45, L - .2);
    };
  };

  // ------------------------------------------------------------------ one command (terminal)
  K.command = o => (root, ctx) => {
    const left = el('div', 'abs', null, root, { left: '110px', top: '300px', width: '760px' });
    const h = el('div', 'word', null, left, { fontSize: '128px', fontWeight: 680, lineHeight: .98 });
    const hc = splitChars(h, 'One');
    el('br', '', null, h);
    const hc2 = splitChars(el('span', '', null, h), 'command.');
    hc2.forEach(n => { n.style.color = '#6ee7c8'; n.style.textShadow = '0 0 40px rgba(110,231,200,.45)'; });
    const subs = o.checks.map((c, i) => el('div', '', `${icon('check', 34, '#6ee7c8', 2.2)}<span>${c}</span>`, left,
      { display: 'flex', alignItems: 'center', gap: '16px', fontSize: '36px', fontWeight: 500, marginTop: i ? '14px' : '56px', color: '#e8ecee' }));
    const tw = el('div', 'abs', null, root, { left: '770px', top: '215px', transformStyle: 'preserve-3d' });
    const term = Terminal(tw, { width: 1000, font: 24, title: 'zsh  berth', lines: o.lines, cue: ctx.cue, minH: 520 });
    ctx.cue(0, 'whoosh', { len: .5 });
    return (lb, L, t, G) => {
      [...hc, ...hc2].forEach((n, i) => applyPop(n, pop(lb, .1 + i * .06, 80, 1, 12)));
      subs.forEach((n, i) => applyPop(n, pop(lb, o.checkAt[i], 20, 1, 8)));
      const x = lb * beatSec();
      const sp = spring(x - .1, 1.5, .85);
      const drift = Math.sin(lb * .5) * 2;
      tw.style.transform = `translateX(${(1 - sp) * 900}px) rotateY(${-10 + drift + (1 - sp) * -30}deg) rotateX(${4 + Math.cos(lb * .4) * 1.5}deg)`;
      tw.style.opacity = clamp(sp * 1.5);
      term.g.style.setProperty('--sheen', `${120 - pr(lb, 0, L) * 160}%`);
      term.update(lb);
      G.energy = .6; G.grid = .55; G.gridSpeed = .4; G.focus = [.25, 0];
      o.lines.forEach(l => { if (!l.cmd) G.flash += hitEnv(lb, l.at, .15) * .05; });
      G.flashColor = '#6ee7c8';
      const ex = E.inExpo(pr(lb, L - .5, L));
      G.worldBlur = ex * 20; root.style.opacity = 1 - ex;
      root.style.transform = `scale(${1 + ex * .3})`;
    };
  };

  // ------------------------------------------------------------------ architecture pipeline
  K.arch = o => (root, ctx) => {
    const nodes = [['phone', 'Your app', 'iPhone, Android, web'], ['lock', 'HTTPS', 'api.atberth.com'], ['key', 'Berth API', 'Keys and user tokens'],
      ['shield', 'Policies', 'Row level security'], ['db', 'Postgres', 'One database per app']];
    const plane = el('div', 'abs', null, root, { left: '0', top: '0', width: '1920px', height: '1080px', transformStyle: 'preserve-3d' });
    const title = el('div', 'abs word', 'Keys. Policies. <span class="grad">Postgres.</span>', root, { left: '110px', top: '120px', fontSize: '96px', fontWeight: 650 });
    const W = 318, gap = 52, x0 = (1920 - (5 * W + 4 * gap)) / 2, y0 = 400;
    const priv = el('div', 'abs', '<span class="mono" style="position:absolute;top:-38px;left:0;font-size:18px;letter-spacing:.25em;color:#6ee7c8">PRIVATE</span>', plane,
      { left: (x0 + 3 * (W + gap) - 30) + 'px', top: (y0 - 40) + 'px', width: (2 * W + gap + 60) + 'px', height: '330px', borderRadius: '40px',
        border: '2px dashed rgba(110,231,200,.55)', background: 'rgba(110,231,200,.04)' });
    const wires = [];
    for (let i = 0; i < 4; i++) {
      const w = el('div', 'abs', null, plane, { left: (x0 + i * (W + gap) + W) + 'px', top: (y0 + 125) + 'px', width: gap + 'px', height: '3px',
        background: 'linear-gradient(90deg,rgba(110,231,200,.2),rgba(110,231,200,.9),rgba(110,231,200,.2))', boxShadow: '0 0 12px rgba(110,231,200,.6)' });
      wires.push(w);
    }
    const cards = nodes.map((n, i) => {
      const c = el('div', 'glass card', `<div style="display:flex;justify-content:space-between;align-items:center">${icon(n[0], 56)}<span class="tag">0${i + 1}</span></div><h3 style="margin-top:34px;font-size:40px">${n[1]}</h3><p class="mono" style="font-size:21px">${n[2]}</p>`,
        plane, { left: (x0 + i * (W + gap)) + 'px', top: y0 + 'px', width: W + 'px', height: '260px', padding: '30px' });
      return c;
    });
    const packets = [];
    for (let k = 0; k < 6; k++) packets.push(el('div', 'abs', null, plane, { width: '34px', height: '12px', borderRadius: '8px', background: '#fff',
      boxShadow: '0 0 18px 4px #6ee7c8, -30px 0 30px rgba(110,231,200,.6)', top: (y0 + 120) + 'px', left: '0' }));
    const cap = el('div', 'center', `${icon('lock', 44, '#6ee7c8', 2)}<span>The database is never exposed to the internet.</span>`, root,
      { top: '900px', display: 'flex', alignItems: 'center', gap: '18px', fontSize: '42px', fontWeight: 550, whiteSpace: 'nowrap' });
    const pk = k => o.packetAt + k * 1;
    for (let k = 0; k < 6; k++) ctx.cue(pk(k), 'blip', { pitch: k });
    ctx.cue(o.capAt, 'thump');
    ctx.cue(ctx.len - .5, 'whoosh', { len: .5 });
    return (lb, L, t, G) => {
      const sp = spring(lb * beatSec(), 1.2, .7);
      plane.style.transform = `translateY(${(1 - sp) * 300}px) translateZ(${-60 + sp * 60 + lb * 10}px) rotateX(${lerp(40, 12, sp)}deg) rotateY(${Math.sin(lb * .3) * 4}deg)`;
      plane.style.opacity = clamp(sp * 1.4);
      applyPop(title, pop(lb, .3, 40, 1, 12));
      cards.forEach((c, i) => {
        const p = pop(lb, .4 + i * .25, 60, .9, 10);
        c.style.opacity = p.o; c.style.transform = `translateY(${p.y}px) scale(${p.s})`;
        let glow = 0;
        packets.forEach((_, k) => { glow = Math.max(glow, hitEnv(lb, pk(k) + i * .45, .35)); });
        c.style.borderColor = `rgba(110,231,200,${.16 + glow * .8})`;
        c.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,.3),0 0 ${glow * 60}px rgba(110,231,200,${glow * .5}),0 40px 120px rgba(0,0,0,.55)`;
      });
      wires.forEach((w, i) => { w.style.opacity = pr(lb, .8 + i * .25, 1.3 + i * .25); });
      priv.style.opacity = pr(lb, 2, 3);
      packets.forEach((p, k) => {
        const q = (lb - pk(k)) / 1.8;
        if (q < 0 || q > 1) { p.style.opacity = 0; return; }
        const x = x0 + W / 2 + E.inOutCubic(q) * (4 * (W + gap));
        p.style.left = x + 'px'; p.style.opacity = Math.sin(q * Math.PI) * 1.4;
      });
      applyPop(cap, pop(lb, o.capAt, 30, 1, 10), 'translate(-50%,-50%)');
      G.energy = .45; G.grid = .35; G.gridSpeed = .8; G.hue = .4; G.focus = [0, .1];
      const ex = E.inExpo(pr(lb, L - .5, L));
      root.style.opacity = 1 - ex; G.worldBlur = ex * 18;
    };
  };

  // ------------------------------------------------------------------ bento fly-through
  const BENTO = [
    { tag: 'Postgres', t: 'One database per app', p: 'Filters, cursors, upsert and bulk import.', mini: 'rows' },
    { tag: 'Keys', t: 'bak_ bsk_ bpk_', p: 'Account, secret, publishable.', mini: 'keys' },
    { tag: 'Auth', t: 'End-user sign in', p: 'Email and password, or a code.', mini: 'code' },
    { tag: 'Policies', t: 'Row level security', p: 'Secret, public, signed in, or owner.', mini: 'policy' },
    { tag: 'Realtime', t: 'Row events over SSE', p: 'Resume after a drop.', mini: 'events' },
    { tag: 'Storage', t: 'Buckets and signed URLs', p: 'Size and type limits per bucket.', mini: 'upload' },
    { tag: 'Functions', t: 'TypeScript on Deno', p: 'npm and jsr imports. Cron.', mini: 'fn' },
    { tag: 'Webhooks', t: 'Signed and retried', p: 'With a delivery log.', mini: 'hooks' },
    { tag: 'SQL and export', t: 'SQL and pg_dump', p: 'Read only mode and time limits.', mini: 'sql' },
  ];
  function miniBuild(kind, host) {
    const m = el('div', 'abs mono', null, host, { left: '34px', right: '34px', bottom: '30px', fontSize: '19px', color: '#c9d0d6' });
    const S = {};
    if (kind === 'rows') {
      S.rows = ['hello        false', 'ship it      true', 'buy milk     false', 'call Ana     true'].map(r => el('div', '', `<span style="color:#5a6168">${'•'}</span> ${r}`, m, { padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }));
    } else if (kind === 'keys') {
      S.k = [['bak_', 'laptop'], ['bsk_', 'server'], ['bpk_', 'phone and browser']].map(([k, w]) => el('div', '', `<span style="color:#6ee7c8">${k}</span>•••••••••••  <span style="color:#5a6168">${w}</span>`, m, { padding: '6px 0' }));
    } else if (kind === 'code') {
      const row = el('div', '', null, m, { display: 'flex', gap: '12px' });
      S.d = [...'482913'].map(ch => el('div', '', '', row, { width: '62px', height: '76px', borderRadius: '14px', border: '1.5px solid rgba(255,255,255,.2)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '38px', color: '#f3f5f6', background: 'rgba(255,255,255,.04)' }));
      S.code = '482913';
    } else if (kind === 'policy') {
      const row = el('div', '', null, m, { display: 'flex', gap: '10px', flexWrap: 'wrap' });
      S.c = ['secret', 'public', 'authenticated', 'owner'].map(x => el('div', '', x, row, { padding: '8px 16px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.18)' }));
    } else if (kind === 'events') {
      S.e = [['insert', '#6ee7c8'], ['update', '#8ab4ff'], ['delete', '#ff8fc7'], ['insert', '#6ee7c8']].map(([e, c]) => el('div', '', `<span style="color:${c}">●</span> ${e}  notes`, m, { padding: '4px 0' }));
    } else if (kind === 'upload') {
      el('div', '', 'avatars/ana.png', m);
      const bar = el('div', '', null, m, { height: '8px', borderRadius: '8px', background: 'rgba(255,255,255,.1)', margin: '12px 0' });
      S.f = el('div', '', null, bar, { height: '100%', width: '0', borderRadius: '8px', background: 'linear-gradient(90deg,#6ee7c8,#8ab4ff)' });
      S.u = el('div', '', '', m, { color: '#8ab4ff' });
    } else if (kind === 'fn') {
      el('div', '', '<span style="color:#b69cff">export default</span> async (req) =&gt;', m);
      el('div', '', '&nbsp;&nbsp;new Response(<span style="color:#6ee7c8">"hi"</span>)', m);
      S.s = el('div', 'chip', '<i></i>--schedule @daily', m, { fontSize: '17px', padding: '6px 14px', marginTop: '12px' });
    } else if (kind === 'hooks') {
      S.h = [0, 1, 2].map(i => el('div', '', `POST  <span style="color:#6ee7c8">200</span>  row.insert`, m, { padding: '4px 0' }));
    } else if (kind === 'sql') {
      el('div', '', '<span style="color:#b69cff">select</span> count(*) <span style="color:#b69cff">from</span> notes', m);
      S.r = el('div', '', '', m, { fontSize: '44px', color: '#f3f5f6', margin: '6px 0' });
      S.b = el('div', 'chip', '<i></i>--read-only', m, { fontSize: '17px', padding: '6px 14px' });
    }
    return (x) => { // x = beats since card became active
      if (kind === 'rows') S.rows.forEach((r, i) => { r.style.opacity = pr(x, i * .25, i * .25 + .3); r.style.transform = `translateX(${(1 - pr(x, i * .25, i * .25 + .3)) * 20}px)`; });
      if (kind === 'keys') S.k.forEach((r, i) => { r.style.opacity = pr(x, i * .3, i * .3 + .3); });
      if (kind === 'code') S.d.forEach((d, i) => { const on = x > .2 + i * .18; d.textContent = on ? S.code[i] : ''; d.style.borderColor = on ? '#6ee7c8' : 'rgba(255,255,255,.2)'; });
      if (kind === 'policy') { const k = clamp(Math.floor(x * 2), 0, 3); S.c.forEach((c, i) => { const on = i === k; c.style.background = on ? '#6ee7c8' : 'transparent'; c.style.color = on ? '#08090b' : '#c9d0d6'; }); }
      if (kind === 'events') S.e.forEach((r, i) => { r.style.opacity = pr(x, i * .35, i * .35 + .2); });
      if (kind === 'upload') { const p = E.outCubic(pr(x, .1, 1.1)); S.f.style.width = p * 100 + '%'; S.u.textContent = p >= 1 ? 'signed url, expires 3600s' : Math.round(p * 100) + '%'; }
      if (kind === 'fn') S.s.style.opacity = pr(x, .5, .8);
      if (kind === 'hooks') S.h.forEach((r, i) => { r.style.opacity = pr(x, i * .3, i * .3 + .2); });
      if (kind === 'sql') { S.r.textContent = Math.round(E.outExpo(pr(x, .2, 1.2)) * 1284).toLocaleString('en-US'); S.b.style.opacity = pr(x, .6, .9); }
    };
  }
  K.bento = o => (root, ctx) => {
    const CW = 600, CH = 380, GAP = 44;
    const gw = 3 * CW + 2 * GAP, gh = 3 * CH + 2 * GAP;
    const cam = el('div', 'abs', null, root, { left: '0', top: '0', width: gw + 'px', height: gh + 'px', transformStyle: 'preserve-3d', transformOrigin: '0 0' });
    const cards = BENTO.map((b, i) => {
      const cx = (i % 3) * (CW + GAP), cy = Math.floor(i / 3) * (CH + GAP);
      const c = el('div', 'glass card', `<div style="display:flex;justify-content:space-between"><span class="tag">${b.tag}</span><span class="tag" style="color:#5a6168">0${i + 1}</span></div><h3 style="margin-top:18px;font-size:44px">${b.t}</h3><p>${b.p}</p>`,
        cam, { left: cx + 'px', top: cy + 'px', width: CW + 'px', height: CH + 'px', padding: '32px 34px' });
      return { c, cx: cx + CW / 2, cy: cy + CH / 2, mini: miniBuild(b.mini, c) };
    });
    const head = el('div', 'center', null, root, { textAlign: 'center', width: '1800px' });
    const h1 = el('div', 'word', 'Everything included.', head, { fontSize: '150px', fontWeight: 680 });
    const h2 = el('div', 'grad', 'Nothing to assemble.', head, { fontSize: '64px', fontWeight: 560, letterSpacing: '-.03em', marginTop: '18px', display: 'inline-block' });
    const seq = o.order || [0, 1, 2, 5, 4, 3, 6, 7, 8];
    const t0 = o.focusStart, per = o.per, outAt = t0 + seq.length * per;
    seq.forEach((ci, k) => ctx.cue(t0 + k * per, 'whoosh', { len: .35, soft: true }));
    ctx.cue(outAt, 'hit', { size: .9 });
    return (lb, L, t, G) => {
      // camera target
      let tx, ty, s, rx, ry, rz;
      const over = { x: gw / 2, y: gh / 2, s: .52, rx: 24, ry: 0, rz: -6 };
      if (lb < t0) {
        const p = E.outCubic(pr(lb, 0, t0));
        const c = cards[seq[0]];
        tx = lerp(over.x, c.cx, p); ty = lerp(over.y, c.cy, p); s = lerp(.35, o.focusScale, p); rx = lerp(50, 10, p); ry = 0; rz = lerp(-14, -3, p);
      } else if (lb < outAt) {
        const k = Math.floor((lb - t0) / per), f = (lb - t0) / per - k;
        const a = cards[seq[k]], b = cards[seq[Math.min(k + 1, seq.length - 1)]];
        const m = k + 1 < seq.length ? E.inOutCubic(pr(f, .62, 1)) : 0;
        tx = lerp(a.cx, b.cx, m); ty = lerp(a.cy, b.cy, m); s = o.focusScale * (1 - .12 * Math.sin(m * Math.PI));
        rx = 10 + Math.sin(lb * .7) * 3; ry = Math.sin(lb * .45) * 6; rz = -3 + Math.cos(lb * .5) * 1.5;
      } else {
        const p = E.inOutCubic(pr(lb, outAt, outAt + 1.4));
        const c = cards[seq[seq.length - 1]];
        tx = lerp(c.cx, over.x, p); ty = lerp(c.cy, over.y, p); s = lerp(o.focusScale, over.s, p); rx = lerp(10, over.rx, p); ry = 0; rz = lerp(-3, over.rz, p);
      }
      cam.style.transform = `translate(960px,540px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s}) translate(${-tx}px,${-ty}px)`;
      const active = lb >= t0 && lb < outAt ? seq[Math.floor((lb - t0) / per)] : -1;
      cards.forEach((c, i) => {
        const k = seq.indexOf(i), st = t0 + k * per;
        const on = i === active;
        c.c.style.opacity = lb >= outAt ? .9 : on ? 1 : .42;
        c.c.style.borderColor = on ? 'rgba(110,231,200,.75)' : 'rgba(255,255,255,.16)';
        c.c.style.boxShadow = on ? 'inset 0 1px 0 rgba(255,255,255,.35),0 0 80px rgba(110,231,200,.28),0 40px 120px rgba(0,0,0,.6)' : '';
        c.c.style.setProperty('--sheen', `${130 - clamp((lb - st) / per) * 180}%`);
        c.mini(lb >= st ? (lb - st) * (2 / per) : (lb >= outAt ? 9 : 0));
        if (lb >= outAt) c.mini(9);
      });
      const hp = pr(lb, outAt + .4, outAt + 1.2);
      head.style.opacity = hp;
      head.style.transform = `translate(-50%,-50%) scale(${lerp(1.15, 1, E.outCubic(hp))})`;
      head.style.filter = hp < 1 ? `blur(${(1 - hp) * 14}px)` : 'none';
      h2.style.backgroundPosition = `${100 - pr(lb, outAt, L) * 100}% 0`;
      cam.style.filter = lb > outAt + .4 ? `blur(${pr(lb, outAt + .4, outAt + 1.2) * 6}px) brightness(${1 - .45 * hp})` : 'none';
      G.energy = .55 + hitEnv(lb, outAt, 1) * .4; G.grid = .25; G.hue = .2; G.focus = [Math.sin(lb * .2) * .3, 0];
      G.flash = hitEnv(lb, outAt, .3) * .4; G.flashColor = '#8ab4ff';
      G.shake = hitEnv(lb, outAt, .3) * 8;
      const ex = E.inExpo(pr(lb, L - .45, L)); root.style.opacity = 1 - ex; G.worldBlur = ex * 16;
    };
  };

  // ------------------------------------------------------------------ sites deploy
  K.sites = o => (root, ctx) => {
    const title = el('div', 'abs word', 'Your site, <span class="grad">live.</span>', root, { left: '110px', top: '120px', fontSize: '110px', fontWeight: 660 });
    const tw = el('div', 'abs', null, root, { left: '110px', top: '360px' });
    const term = Terminal(tw, { width: 820, font: 22, title: 'zsh  berth', solid: true, minH: 250, cue: ctx.cue, lines: [
      { cmd: 'berth sites deploy ./dist --site my-site', at: .4, len: 1.6 },
      { out: '<span class="k">uploading changed files</span>  <span class="ok">done</span>', at: 2.4 },
      { out: '<span class="ok">Live:</span> https://my-site.atberth.com', at: 3, big: true },
      { cmd: 'berth sites domains add my-site example.com', at: 4.2, len: 1.5 },
    ] });
    const bw = el('div', 'abs', null, root, { left: '1000px', top: '270px', width: '820px', height: '560px', transformStyle: 'preserve-3d' });
    const br = el('div', 'glass', null, bw, { inset: '0', position: 'absolute', background: 'rgba(14,16,20,.85)' });
    const bar = el('div', 'mono', null, br, { height: '58px', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,.08)' });
    el('b', '', null, bar, { width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(255,255,255,.18)' });
    el('b', '', null, bar, { width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(255,255,255,.18)' });
    const url = el('div', '', '', bar, { marginLeft: '24px', flex: 1, height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center',
      gap: '10px', padding: '0 14px', fontSize: '19px', color: '#e8ecee' });
    const page = el('div', '', null, br, { position: 'absolute', left: 0, right: 0, top: '58px', bottom: 0, overflow: 'hidden',
      background: 'radial-gradient(60% 80% at 80% 10%,rgba(182,156,255,.35),transparent 60%),radial-gradient(50% 60% at 10% 90%,rgba(110,231,200,.3),transparent 60%),#101217' });
    const pc = el('div', '', `<div class="mono" style="font-size:15px;letter-spacing:.2em;color:#a0a8b0">LUMEN BAKERY</div>
      <div style="font-size:66px;font-weight:680;letter-spacing:-.04em;line-height:1;margin-top:28px">Tiny bakery.<br>Big mornings.</div>
      <div style="display:flex;gap:12px;margin-top:30px"><div style="background:#f3f5f6;color:#08090b;border-radius:999px;padding:12px 22px;font-size:19px;font-weight:600">Order ahead</div>
      <div style="border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:12px 22px;font-size:19px">Menu</div></div>`, page, { padding: '54px 56px' });
    const chips = ['Custom domains', 'Automatic HTTPS', 'Preview links', 'Instant rollbacks', 'Cookie-free stats', 'No CORS for /api'];
    const cpos = [[1040, 880], [1360, 880], [1640, 200], [1100, 190], [1550, 960], [1300, 960]];
    const cs = chips.map((c, i) => el('div', 'chip', `<i></i>${c}`, root, { position: 'absolute', left: cpos[i][0] + 'px', top: cpos[i][1] + 'px', fontSize: '22px' }));
    const chipAt = i => 5.2 + i * .45;
    chips.forEach((_, i) => ctx.cue(chipAt(i), 'blip', { pitch: i + 2 }));
    ctx.cue(3, 'whoosh', { len: .5 });
    return (lb, L, t, G) => {
      applyPop(title, pop(lb, .1, 40, 1, 12));
      const tp = pop(lb, .2, 60, 1, 10); applyPop(tw, tp);
      term.update(lb);
      const x = (lb - 3) * beatSec();
      const sp = spring(x, 1.7, .55);
      bw.style.opacity = lb > 3 ? clamp(sp * 1.5) : 0;
      bw.style.transform = `translateZ(${(1 - sp) * -900}px) rotateY(${-16 + (1 - sp) * 40}deg) rotateX(${6 + Math.sin(lb * .4) * 1.5}deg)`;
      const up = pr(lb, 3.1, 4.1);
      url.innerHTML = `${icon('lock', 18, '#6ee7c8', 2.2)}<span>${typed('my-site.atberth.com', up)}</span>`;
      pc.style.opacity = pr(lb, 3.9, 4.4); pc.style.transform = `translateY(${(1 - E.outCubic(pr(lb, 3.9, 4.6))) * 30}px)`;
      cs.forEach((c, i) => applyPop(c, pop(lb, chipAt(i), 30, .7, 8)));
      G.energy = .55; G.grid = .3; G.hue = .7; G.focus = [.3, .1];
      G.flash = hitEnv(lb, 3, .3) * .25; G.flashColor = '#6ee7c8';
      const ex = E.inExpo(pr(lb, L - .45, L)); root.style.opacity = 1 - ex; G.worldBlur = ex * 16;
    };
  };

  // ------------------------------------------------------------------ showcase (icon starfield)
  K.showcase = o => (root, ctx) => {
    root.style.transformStyle = 'flat';
    const fwrap = el('div', 'abs', null, root, { inset: '0', perspective: '1600px' });
    const field = el('div', 'abs', null, fwrap, { left: '960px', top: '540px', transformStyle: 'preserve-3d' });
    el('div', 'abs', null, root, { inset: '0', background: 'radial-gradient(38% 30% at 50% 50%,rgba(8,9,11,.78),transparent 100%)' });
    const N = 46;
    const sprites = [];
    for (let i = 0; i < N; i++) {
      const id = K.APPS_ALL[i % K.APPS_ALL.length];
      let a = rnd(i * 3.1) * Math.PI * 2, r = 380 + rnd(i * 5.7) * 900;
      const d = iconImg(id, 190, field, { position: 'absolute', left: '-95px', top: '-95px' });
      sprites.push({ d, x: Math.cos(a) * r * 1.5, y: Math.sin(a) * r * .9, ph: rnd(i * 9.3), spin: (rnd(i * 2.2) - .5) * 30 });
    }
    const head = el('div', 'center', null, root, { textAlign: 'center', width: '1800px' });
    const h1 = el('div', 'word', null, head, { fontSize: '170px', fontWeight: 700, textShadow: '0 10px 80px rgba(0,0,0,.8)' });
    const ch = splitChars(h1, 'Running on Berth.');
    const sub = el('div', '', o.sub || 'Live today, and more on the way.', head, { fontSize: '44px', color: '#c9d0d6', fontWeight: 500, marginTop: '22px', textShadow: '0 4px 30px rgba(0,0,0,.9)' });
    const tick = el('div', 'abs mono', null, root, { left: 0, top: '960px', whiteSpace: 'nowrap', fontSize: '26px', letterSpacing: '.22em', color: '#6ee7c8' });
    tick.textContent = (K.APPS_LIVE.map(a => a[1].toUpperCase()).join('   ·   ') + '   ·   ').repeat(3);
    ctx.cue(0, 'whoosh', { len: .6 }); ctx.cue(.6, 'hit', { size: .8 });
    return (lb, L, t, G) => {
      const D = 5200;
      sprites.forEach(s => {
        const z = ((s.ph * D + t * 900) % D) - D + 700;
        const o = pr(z, -D + 700, -D + 1600) * (1 - pr(z, 350, 700));
        s.d.style.transform = `translate3d(${s.x}px,${s.y}px,${z}px) rotateZ(${s.spin}deg)`;
        s.d.style.opacity = o;
      });
      ch.forEach((n, i) => applyPop(n, pop(lb, .6 + i * .04, 70, 1.3, 16)));
      applyPop(sub, pop(lb, 1.6, 20, 1, 8));
      head.style.transform = 'translate(-50%,-50%)';
      tick.style.transform = `translateX(${-lb * 60}px)`; tick.style.opacity = pr(lb, 1, 2);
      G.energy = .5 + hitEnv(lb, .6, 1) * .5; G.warp = .35 + hitEnv(lb, .6, .5) * .6; G.hue = .9;
      G.flash = hitEnv(lb, .6, .3) * .5; G.flashColor = '#b69cff';
      const ex = E.inExpo(pr(lb, L - .45, L)); root.style.opacity = 1 - ex; G.worldBlur = ex * 16;
    };
  };

  // ------------------------------------------------------------------ pricing
  K.pricing = o => (root, ctx) => {
    const [aZ, aPro, aCaps] = o.at; // beats: $0, $12, caps
    const lab = el('div', 'center mono', '', root, { top: '250px', fontSize: '26px', letterSpacing: '.3em', color: '#6ee7c8' });
    const big = el('div', 'center word', '', root, { top: '500px', fontSize: '400px', fontWeight: 700, letterSpacing: '-.06em' });
    const per = el('div', 'abs', '/ month', root, { left: '1290px', top: '540px', fontSize: '54px', color: '#a0a8b0', fontWeight: 500 });
    const line1 = el('div', 'center', '', root, { top: '800px', fontSize: '60px', fontWeight: 600, letterSpacing: '-.03em', whiteSpace: 'nowrap' });
    const facts = el('div', 'center', null, root, { top: '905px', display: 'flex', gap: '16px' });
    const fs = (o.facts || ['5 apps', '100,000 rows per app', '10,000 users per app']).map(f => el('div', 'chip', `<i></i>${f}`, facts, { fontSize: '24px' }));
    const badge = el('div', 'center chip', '<i></i>Pro launch price, first 100 customers', root, { top: '905px', fontSize: '26px' });
    const caps = (o.caps || ['Hard caps. No surprise bills.', 'Never paused for being idle.']).map((c, i) =>
      el('div', 'center word', c, root, { top: (430 + i * 190) + 'px', fontSize: '112px', fontWeight: 660, textAlign: 'center' }));
    ctx.cue(aZ, 'hit', { size: .8 }); ctx.cue(aPro, 'hit', { size: .9 }); ctx.cue(aPro - .4, 'whoosh', { len: .4 });
    caps.forEach((_, i) => ctx.cue(aCaps + i * (o.capGap || 1.5), 'thump'));
    return (lb, L, t, G) => {
      const inPro = lb >= aPro, inCaps = lb >= aCaps;
      const vis = !inCaps;
      [lab, big, line1].forEach(n => n.style.display = vis ? 'block' : 'none');
      per.style.display = vis && inPro ? 'block' : 'none';
      facts.style.display = vis && !inPro ? 'flex' : 'none';
      badge.style.display = vis && inPro ? 'inline-flex' : 'none';
      if (!inPro) {
        lab.textContent = 'FREE TO START';
        big.innerHTML = '$0'; line1.innerHTML = 'Open to everyone.';
        const p = pop(lb, aZ, 120, 1.5, 30); applyPop(big, p, 'translate(-50%,-50%)');
        applyPop(line1, pop(lb, aZ + .5, 30, 1, 10), 'translate(-50%,-50%)');
        fs.forEach((f, i) => applyPop(f, pop(lb, aZ + .9 + i * .25, 20, .8, 6)));
      } else {
        lab.textContent = 'PRO';
        const x = pr(lb, aPro, aPro + .6);
        big.innerHTML = x < 1 ? '$' + scramble('12', x, Math.floor(lb * 20)) : '$12';
        const p = pop(lb, aPro, 80, 1.4, 24); applyPop(big, p, 'translate(-50%,-50%) translateX(-60px)');
        applyPop(per, pop(lb, aPro + .3, 20, 1, 8));
        line1.innerHTML = '<span class="grad">Locked for life.</span>';
        line1.firstChild.style.backgroundPosition = `${100 - pr(lb, aPro, aCaps) * 100}% 0`;
        applyPop(line1, pop(lb, aPro + .6, 30, 1, 10), 'translate(-50%,-50%)');
        applyPop(badge, pop(lb, aPro + 1, 20, .8, 6), 'translate(-50%,-50%)');
      }
      caps.forEach((c, i) => {
        c.style.display = inCaps ? 'block' : 'none';
        applyPop(c, pop(lb, aCaps + i * (o.capGap || 1.5), 60, 1.25, 18), 'translate(-50%,-50%)');
      });
      lab.style.opacity = 1; lab.style.transform = 'translate(-50%,-50%)';
      const h = Math.max(hitEnv(lb, aZ, .4), hitEnv(lb, aPro, .4));
      G.energy = .5 + h * .6; G.flash = h * .35; G.flashColor = '#6ee7c8'; G.shake = h * 12; G.grid = .45; G.gridSpeed = 1.2; G.hue = inPro ? .5 : 0;
      caps.forEach((_, i) => { G.shake += hitEnv(lb, aCaps + i * (o.capGap || 1.5), .25) * 8; });
      const ex = E.inExpo(pr(lb, L - .45, L)); root.style.opacity = 1 - ex; G.worldBlur = ex * 16;
    };
  };

  // ------------------------------------------------------------------ end card
  K.endcard = o => (root, ctx) => {
    const lock = el('div', 'center', null, root, { display: 'flex', alignItems: 'center', gap: '44px', top: '440px' });
    const lw = el('div', '', LOGO_SVG(230), lock, { filter: 'drop-shadow(0 0 50px rgba(110,231,200,.55))' });
    const wm = el('div', 'word', 'Berth', lock, { fontSize: '250px', fontWeight: 600, letterSpacing: '-.05em', position: 'relative', paddingBottom: '.06em',
      background: 'linear-gradient(100deg,#f3f5f6 40%,#ffffff 47%,#6ee7c8 50%,#8ab4ff 53%,#f3f5f6 60%)', backgroundSize: '300% 100%',
      WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' });
    const sweep = wm;
    const tag = el('div', 'center', 'Host your app or your site.', root, { top: '680px', fontSize: '66px', fontWeight: 560, letterSpacing: '-.03em', whiteSpace: 'nowrap' });
    const row = el('div', 'center', null, root, { top: '840px', display: 'flex', gap: '22px', alignItems: 'center' });
    const url = el('div', 'glass', '<span style="color:#a0a8b0">https://</span>atberth.com', row, { position: 'relative', padding: '22px 38px', borderRadius: '999px', fontSize: '40px', fontWeight: 550 });
    const btn = el('div', '', 'Start free  →', row, { padding: '24px 40px', borderRadius: '999px', background: '#6ee7c8', color: '#08090b', fontSize: '40px', fontWeight: 650,
      boxShadow: '0 0 60px rgba(110,231,200,.55)' });
    const fine = el('div', 'center mono', o.fine || 'FREE PLAN  ·  PRO $12 A MONTH', root, { top: '960px', fontSize: '22px', letterSpacing: '.25em', color: '#a0a8b0' });
    const ring = el('div', 'abs', null, root, { left: '960px', top: '440px', width: '10px', height: '10px', borderRadius: '50%', border: '3px solid #6ee7c8',
      boxShadow: '0 0 40px #6ee7c8', transform: 'translate(-50%,-50%)' });
    const svg = lw.querySelector('svg');
    ctx.cue(0, 'hit', { size: 1.4 }); ctx.cue(0, 'drop', { final: true });
    ctx.cue(o.tagAt, 'thump'); ctx.cue(o.urlAt, 'blip', { pitch: 5 });
    return (lb, L, t, G) => {
      const x = lb * beatSec();
      const sp = spring(x, 1.8, .55);
      lock.style.transform = `translate(-50%,-50%) scale(${lerp(1.5, 1, sp)})`;
      lock.style.filter = `blur(${(1 - E.outCubic(clamp(x / .25))) * 30}px)`;
      lock.style.opacity = clamp(x / .1);
      drawLogo(svg, E.outCubic(pr(lb, 0, 1)), E.outCubic(pr(lb, .3, 1.1)), E.outCubic(pr(lb, .5, 1.3)), E.outCubic(pr(lb, .6, 1.5)));
      const rp = pr(lb, 0, 1.6); ring.style.width = ring.style.height = (E.outExpo(rp) * 3400) + 'px'; ring.style.opacity = 1 - rp;
      sweep.style.backgroundPosition = `${lerp(110, -10, E.inOutCubic(pr(lb, o.sweepAt, o.sweepAt + 1.6)))}% 0`;
      applyPop(tag, pop(lb, o.tagAt, 30, 1, 12), 'translate(-50%,-50%)');
      applyPop(row, pop(lb, o.urlAt, 30, .9, 10), 'translate(-50%,-50%)');
      applyPop(fine, pop(lb, o.urlAt + .8, 10, 1, 6), 'translate(-50%,-50%)');
      url.style.setProperty('--sheen', `${120 - pr(lb, o.urlAt, L) * 160}%`);
      btn.style.boxShadow = `0 0 ${50 + 30 * Math.sin(lb * Math.PI)}px rgba(110,231,200,.6)`;
      G.energy = .9 - pr(lb, 2, L) * .25 + hitEnv(lb, 0, 1.5) * .6;
      G.flash = hitEnv(lb, 0, .45) * .95; G.flashColor = '#ffffff';
      G.shake = hitEnv(lb, 0, .35) * 18; G.warp = hitEnv(lb, 0, .8) * .9;
      G.hud = .8;
      if (o.harbor) { G.harbor = .9; G.cam = -.34; G.sun = 1; }
    };
  };
})();
