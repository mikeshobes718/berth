// Variation B, "Harbor": cinematic, voiced. The logo is a pier with a sun arc over the water,
// so the film opens on that landscape and pulls back into the mark.
(function () {
  window.VARIANTS = window.VARIANTS || {};
  const { clamp, lerp, pr, E, spring, rnd, hitEnv, el, splitChars, scramble, typed, LOGO_SVG, drawLogo, beatSec } = window.B;
  const K = window.K;
  const P = 1800; // manual perspective
  const proj = (x, y, z) => { const s = P / (P - z); return { x: 960 + x * s, y: 540 + y * s, s }; };

  // ------------------------------------------------------------------ harbor landscape -> logo
  const harbor = o => (root, ctx) => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
    svg.style.position = 'absolute'; svg.style.overflow = 'visible';
    svg.innerHTML = `
      <defs>
        <clipPath id="above"><rect x="-100" y="-100" width="224" height="111.2"/></clipPath>
        <clipPath id="below"><rect x="-100" y="11.2" width="224" height="100"/></clipPath>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".35"/></filter>
        <linearGradient id="fadeR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ee7c8" stop-opacity=".5"/><stop offset="1" stop-color="#6ee7c8" stop-opacity="0"/></linearGradient>
      </defs>
      <rect class="lg-box" x="1.5" y="1.5" width="21" height="21" rx="6.5" stroke="#f3f5f6" pathLength="1"/>
      <g clip-path="url(#above)"><path class="arc" d="M8 11.2c1.2-2.4 2.5-3.6 4-3.6s2.8 1.2 4 3.6" stroke="#6ee7c8" stroke-linecap="round"/></g>
      <g clip-path="url(#below)" opacity=".45" filter="url(#soft)"><path class="arcr" d="M8 11.2c1.2-2.4 2.5-3.6 4-3.6s2.8 1.2 4 3.6" stroke="#6ee7c8" stroke-linecap="round"/></g>
      <path class="lg-pier" d="M6 14.5h12" stroke="#f3f5f6" stroke-linecap="round" pathLength="1"/>
      <path class="lg-post" d="M8.5 14.5v3.5M12 14.5v3.5M15.5 14.5v3.5" stroke="#f3f5f6" stroke-linecap="round" pathLength="1"/>
      <path class="hz" d="M-60 11.2h144" stroke="#8ab4ff" stroke-opacity=".35"/>`;
    root.appendChild(svg);
    const arc = svg.querySelector('.arc'), arcr = svg.querySelector('.arcr'), box = svg.querySelector('.lg-box'), hz = svg.querySelector('.hz');
    const pier = svg.querySelector('.lg-pier'), post = svg.querySelector('.lg-post');
    const title = el('div', 'center mono', '', root, { top: '96px', fontSize: '22px', letterSpacing: '.45em', color: 'rgba(243,245,246,.7)' });
    const black = el('div', 'abs', null, root, { inset: '0', background: '#000' });
    const { rise, pier: pierAt, pull, len } = o;
    ctx.cue(0, 'swell', { len: rise[1] + 1 }); ctx.cue(pull[0], 'riser', { len: pull[1] - pull[0] }); ctx.cue(pull[1], 'hit', { size: .8 });
    const HZ_Y = 520; // horizon on screen in the wide shot
    return (lb, L, t, G) => {
      const pp = E.inOutCubic(pr(lb, pull[0], pull[1]));
      const push = 1 + .08 * E.inOutCubic(pr(lb, 0, pull[0]));
      const S = lerp(92 * push, 11, E.inOutExpo(pr(lb, pull[0], pull[1])));
      // screen position of logo unit (12,12): wide shot keeps the horizon at HZ_Y
      const cy = lerp(HZ_Y + .8 * 92 * push, 540, pp);
      svg.setAttribute('width', 24 * S); svg.setAttribute('height', 24 * S);
      svg.style.left = (960 - 12 * S) + 'px'; svg.style.top = (cy - 12 * S) + 'px';
      const sw = lerp(4.5, 1.6 * S, pp) / S;
      [arc, arcr, box, pier, post].forEach(n => n.setAttribute('stroke-width', sw));
      hz.setAttribute('stroke-width', 1.5 / S); hz.style.opacity = 1 - pp;
      const r = E.outCubic(pr(lb, rise[0], rise[1]));
      arc.setAttribute('transform', `translate(0 ${(1 - r) * 4})`);
      arcr.setAttribute('transform', `translate(0 22.4) scale(1 -1) translate(0 ${(1 - r) * 4})`);
      arcr.parentNode.style.opacity = 1 - pp;
      const pd = E.inOutCubic(pr(lb, pierAt[0], pierAt[1]));
      const po = E.outCubic(pr(lb, pierAt[0] + .6, pierAt[1] + .6));
      pier.style.strokeDasharray = pd >= .999 ? 'none' : '1 1'; pier.style.strokeDashoffset = 1 - pd;
      post.style.strokeDasharray = po >= .999 ? 'none' : '1 1'; post.style.strokeDashoffset = 1 - po;
      const bx = E.inOutCubic(pr(lb, pull[0] + .4 * (pull[1] - pull[0]), pull[1]));
      box.style.strokeDasharray = bx >= .999 ? 'none' : '1 1'; box.style.strokeDashoffset = 1 - bx;
      box.style.opacity = bx > .001 ? 1 : 0;
      svg.style.filter = `drop-shadow(0 0 ${lerp(18, 30, pp)}px rgba(110,231,200,${.35 + .3 * r}))`;
      title.textContent = scramble(o.caption || 'A PLACE TO DOCK', pr(lb, 1, 3), Math.floor(lb * 10));
      title.style.opacity = pr(lb, 1, 2) * (1 - pr(lb, pull[0] - 1, pull[0]));
      black.style.opacity = 1 - E.outCubic(pr(lb, 0, 1.6));
      // shader: horizon in shader units = (540 - screenY)/1080
      const hzScreen = cy - .8 * S;
      G.harbor = 1 - E.inCubic(pr(lb, pull[0] + .3 * (pull[1] - pull[0]), pull[1]));
      G.cam = (540 - hzScreen) / 1080;
      G.sun = r; G.energy = pp * .7; G.hud = pr(lb, pull[1] - .5, pull[1]) * .6;
      G.flash = hitEnv(lb, pull[1], .3) * .4; G.flashColor = '#6ee7c8';
      G.warp = E.inExpo(pr(lb, pull[0] + .5, pull[1])) * .4 * (1 - pr(lb, pull[1], pull[1] + .5));
      root.style.opacity = 1 - pr(lb, L - .02, L);
    };
  };

  // ------------------------------------------------------------------ fragments -> lockup
  const fragments = o => (root, ctx) => {
    const names = [['db', 'Database'], ['user', 'Sign in'], ['box', 'File storage'], ['pulse', 'Realtime'], ['fn', 'Functions'], ['hook', 'Webhooks'],
      ['key', 'API keys'], ['lock', 'HTTPS'], ['globe', 'Hosting'], ['table', 'SQL'], ['shield', 'Policies'], ['down', 'Backups']];
    const lines = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    lines.setAttribute('width', 1920); lines.setAttribute('height', 1080); lines.style.position = 'absolute'; lines.style.left = lines.style.top = '0';
    root.appendChild(lines);
    const pairs = []; for (let i = 0; i < 16; i++) pairs.push([Math.floor(rnd(i * 3.3) * 12), Math.floor(rnd(i * 7.1 + 1) * 12)]);
    const paths = pairs.map(() => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('fill', 'none');
      p.setAttribute('stroke', 'rgba(243,245,246,.28)'); p.setAttribute('stroke-width', '1.5'); p.setAttribute('stroke-dasharray', '6 8'); lines.appendChild(p); return p; });
    const chips = names.map(([ic, n], i) => {
      const c = el('div', 'chip', `${K.icon(ic, 30, '#6ee7c8', 1.8)}<span>${n}</span>`, root, { position: 'absolute', left: '0', top: '0', fontSize: '30px', padding: '16px 26px' });
      const a = i / names.length * Math.PI * 2 + rnd(i) * .5;
      return { c, x: Math.cos(a) * (520 + rnd(i * 2.7) * 320), y: Math.sin(a) * (260 + rnd(i * 4.1) * 170), z: -500 + rnd(i * 5.3) * 800, ph: rnd(i * 9.9) * 6 };
    });
    const lock = el('div', 'center', null, root, { display: 'flex', alignItems: 'center', gap: '46px' });
    const lw = el('div', '', LOGO_SVG(264), lock, { filter: 'drop-shadow(0 0 40px rgba(110,231,200,.5))' });
    drawLogo(lw.querySelector('svg'), 1, 1, 1, 1);
    const wm = el('div', 'word', 'Berth', lock, { fontSize: '260px', fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap' });
    const sub = el('div', 'center', o.sub, root, { top: '790px', fontSize: '52px', fontWeight: 540, color: '#c9d0d6', whiteSpace: 'nowrap', letterSpacing: '-.02em' });
    const snap = o.snap;
    ctx.cue(snap - 1.5, 'riser', { len: 1.5 }); ctx.cue(snap, 'hit', { size: 1 }); ctx.cue(snap, 'drop');
    return (lb, L, t, G) => {
      const c = E.inExpo(pr(lb, snap - .9, snap));
      const pts = chips.map((ch, i) => {
        const intro = E.outCubic(pr(lb, i * .07, i * .07 + 1.2));
        const x = lerp(0, ch.x + Math.sin(lb * .6 + ch.ph) * 30, intro * (1 - c));
        const y = lerp(0, ch.y + Math.cos(lb * .5 + ch.ph) * 20, intro * (1 - c));
        const z = lerp(0, ch.z + Math.sin(lb * .3 + ch.ph) * 60, (1 - c));
        const p = proj(x, y, z);
        const blur = Math.abs(z) / 90;
        ch.c.style.transform = `translate(-50%,-50%) translate(${p.x}px,${p.y}px) scale(${p.s * lerp(.6, 1, intro) * (1 - c * .7)})`;
        ch.c.style.filter = blur > .4 ? `blur(${blur}px)` : 'none';
        ch.c.style.opacity = lb < snap ? intro * clamp(.35 + .65 * p.s) : 0;
        ch.c.style.zIndex = String(Math.round(z + 1000));
        return p;
      });
      paths.forEach((pa, i) => {
        const [a, b] = pairs[i]; const A = pts[a], Bp = pts[b];
        const mx = (A.x + Bp.x) / 2 + Math.sin(i * 4 + lb) * 160, my = (A.y + Bp.y) / 2 + Math.cos(i * 3 + lb * .8) * 140;
        pa.setAttribute('d', `M${A.x} ${A.y} Q${mx} ${my} ${Bp.x} ${Bp.y}`);
        pa.setAttribute('stroke-dashoffset', String(-lb * 20));
      });
      lines.style.opacity = pr(lb, .5, 1.5) * (1 - c) * (lb < snap ? 1 : 0);
      // logo sits in the middle the whole time, then the wordmark opens beside it
      const x = (lb - snap) * beatSec();
      const open = lb < snap ? 0 : E.outExpo(clamp(x / .9));
      wm.style.maxWidth = (open * 720) + 'px'; wm.style.opacity = open;
      lock.style.gap = (open * 46) + 'px';
      const pulse = 1 + .06 * Math.sin(lb * Math.PI) * (1 - c) + c * .12 - hitEnv(lb, snap, .3) * .1;
      lock.style.transform = `translate(-50%,-50%) scale(${lb < snap ? pulse : lerp(1.12, 1, spring(x, 2, .6))})`;
      applyPop(sub, K.pop(lb, snap + 1.2, 30, 1, 10), 'translate(-50%,-50%)');
      G.energy = .35 + (lb >= snap ? .45 : c * .3) + hitEnv(lb, snap, 1.2) * .5; G.hue = .3;
      G.flash = hitEnv(lb, snap, .35) * .55; G.flashColor = '#e9fff8'; G.shake = hitEnv(lb, snap, .35) * 16;
      G.warp = c * .6 + hitEnv(lb, snap, .5) * .5; G.hud = .6;
      const ex = E.inExpo(pr(lb, L - .5, L)); root.style.opacity = 1 - ex; G.worldBlur = ex * 16;
    };
  };
  const applyPop = (n, p, extra) => K.applyPop(n, p, extra);

  // ------------------------------------------------------------------ four steps
  const steps = o => (root, ctx) => {
    const S = [['Install and sign in', 'curl, then a code by email'], ['Create an app', 'Postgres, a role, two keys'],
      ['Add tables and policies', 'Who may read and write'], ['Ship the publishable key', 'Your app calls the API']];
    const col = el('div', 'abs', null, root, { left: '120px', top: '250px', width: '640px' });
    const rail = el('div', 'abs', null, col, { left: '27px', top: '30px', width: '2px', height: '540px', background: 'rgba(255,255,255,.12)' });
    const railF = el('div', '', null, rail, { width: '100%', height: '0', background: '#6ee7c8', boxShadow: '0 0 12px #6ee7c8' });
    const items = S.map(([h, s], i) => {
      const row = el('div', '', null, col, { display: 'flex', gap: '28px', alignItems: 'flex-start', height: '180px', position: 'relative' });
      const n = el('div', 'mono', String(i + 1), row, { width: '56px', height: '56px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.25)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '24px', flex: 'none', background: '#0b0d10' });
      const tx = el('div', '', `<div style="font-size:44px;font-weight:620;letter-spacing:-.025em">${h}</div><div class="mono" style="font-size:22px;color:#a0a8b0;margin-top:8px">${s}</div>`, row);
      return { row, n, tx };
    });
    const stage = el('div', 'abs', null, root, { left: '840px', top: '170px', width: '960px', height: '760px' });
    const panels = [0, 1, 2, 3].map(() => el('div', 'abs', null, stage, { inset: '0' }));
    const per = o.len / 4;
    const at = i => i * per;
    // panel 1: install + code
    const t1 = K.Terminal(panels[0], { width: 960, font: 23, title: 'zsh', minH: 330, cue: ctx.cue, lines: [
      { cmd: 'curl -fsSL https://atberth.com/install.sh | sh', at: at(0) + .3, len: per * .22 },
      { out: '<span class="ok">✓</span> berth installed to <span class="k">~/.local/bin</span>', at: at(0) + .3 + per * .26 },
      { cmd: 'berth signup --email you@example.com', at: at(0) + .3 + per * .32, len: per * .18 },
      { out: '<span class="k">code sent to</span> you@example.com', at: at(0) + .3 + per * .55 },
    ] });
    const codeRow = el('div', '', null, panels[0], { position: 'absolute', left: '0', top: '470px', display: 'flex', gap: '18px' });
    const digits = [...'482913'].map(() => el('div', 'glass', '', codeRow, { position: 'relative', width: '120px', height: '146px', borderRadius: '24px', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: '76px', fontWeight: 600 }));
    const signed = el('div', '', `${K.icon('check', 40, '#6ee7c8', 2.4)}<span>Signed in</span>`, panels[0], { position: 'absolute', left: '0', top: '650px', display: 'flex', gap: '14px', alignItems: 'center', fontSize: '40px', fontWeight: 600, color: '#6ee7c8' });
    const codeAt = at(0) + .3 + per * .6;
    // panel 2: apps create
    const t2 = K.Terminal(panels[1], { width: 960, font: 25, title: 'zsh', minH: 420, cue: ctx.cue, lines: [
      { cmd: 'berth apps create demo', at: at(1) + .3, len: per * .2 },
      { out: '<span class="ok">✓</span> Postgres database   <span class="v">demo</span>', at: at(1) + .3 + per * .26 },
      { out: '<span class="ok">✓</span> Database role       <span class="v">own role</span>', at: at(1) + .3 + per * .34 },
      { out: '<span class="ok">✓</span> Secret key          <span class="k">bsk_••••••••</span>', at: at(1) + .3 + per * .42 },
      { out: '<span class="ok">✓</span> Publishable key     <span class="k">bpk_••••••••</span>', at: at(1) + .3 + per * .5 },
      { out: '<span class="k">keys saved to</span> ~/.config/berth', at: at(1) + .3 + per * .62 },
    ] });
    // panel 3: policies
    const p3 = el('div', 'glass', null, panels[2], { position: 'absolute', left: '0', top: '0', width: '960px', height: '620px', padding: '44px 50px' });
    el('div', '', `<div style="display:flex;justify-content:space-between;align-items:center"><div style="display:flex;gap:16px;align-items:center">${K.icon('table', 40)}<span style="font-size:48px;font-weight:620">notes</span></div><span class="mono" style="color:#a0a8b0;font-size:20px">id · created_at · title · done</span></div>`, p3);
    const polRows = [['read', ['secret', 'public', 'authenticated', 'owner']], ['write', ['secret', 'authenticated', 'owner']]].map(([lab, opts], r) => {
      const row = el('div', '', null, p3, { marginTop: r ? '40px' : '70px' });
      el('div', 'mono', lab.toUpperCase(), row, { fontSize: '19px', letterSpacing: '.25em', color: '#a0a8b0', marginBottom: '16px' });
      const wrap = el('div', '', null, row, { display: 'flex', gap: '14px' });
      return opts.map(x => el('div', 'chip', x, wrap, { fontSize: '28px', padding: '14px 26px' }));
    });
    const pcode = el('div', 'mono', '', p3, { position: 'absolute', left: '50px', bottom: '44px', fontSize: '23px', color: '#c9d0d6' });
    // panel 4: phone + keys
    const phone = el('div', 'abs', null, panels[3], { left: '40px', top: '0', width: '370px', height: '760px', borderRadius: '58px', background: '#050607',
      border: '10px solid #1b1f25', boxShadow: '0 0 0 2px rgba(255,255,255,.12),0 60px 140px rgba(0,0,0,.7)', overflow: 'hidden' });
    el('div', '', null, phone, { position: 'absolute', left: '50%', top: '14px', width: '110px', height: '32px', borderRadius: '20px', background: '#000', transform: 'translateX(-50%)' });
    const scr = el('div', '', null, phone, { position: 'absolute', inset: '0', padding: '84px 26px 26px',
      background: 'radial-gradient(90% 50% at 80% 0%,rgba(110,231,200,.22),transparent 70%),#0c0e12' });
    el('div', '', '<div class="mono" style="font-size:14px;color:#a0a8b0;letter-spacing:.15em">SIGNED IN · ANA</div><div style="font-size:46px;font-weight:680;letter-spacing:-.03em;margin-top:8px">Notes</div>', scr);
    const notes = ['hello', 'ship it', 'buy milk', 'call Rui', 'book flights'].map(n => el('div', '', `<span style="width:22px;height:22px;border-radius:50%;border:2px solid #6ee7c8;display:inline-block"></span><span>${n}</span>`, scr,
      { display: 'flex', gap: '14px', alignItems: 'center', fontSize: '24px', padding: '18px 16px', marginTop: '12px', borderRadius: '18px', background: 'rgba(255,255,255,.06)' }));
    const kA = el('div', 'glass', `<div class="mono" style="font-size:18px;letter-spacing:.2em;color:#6ee7c8">IN YOUR APP</div><div class="mono" style="font-size:34px;margin-top:10px">bpk_••••••••</div><div style="font-size:22px;color:#a0a8b0;margin-top:8px">Publishable. Policies decide the rest.</div>`, panels[3],
      { left: '460px', top: '150px', width: '500px', padding: '30px 34px' });
    const kB = el('div', 'glass', `<div class="mono" style="font-size:18px;letter-spacing:.2em;color:#8ab4ff">ON YOUR SERVER</div><div class="mono" style="font-size:34px;margin-top:10px">bsk_••••••••</div><div style="font-size:22px;color:#a0a8b0;margin-top:8px">The secret key never ships.</div>`, panels[3],
      { left: '460px', top: '400px', width: '500px', padding: '30px 34px' });
    for (let i = 0; i < 4; i++) ctx.cue(at(i), 'whoosh', { len: .4, soft: true });
    [...'482913'].forEach((_, i) => ctx.cue(codeAt + i * .22, 'blip', { pitch: i }));
    ctx.cue(codeAt + 1.5, 'ding');
    notes.forEach((_, i) => ctx.cue(at(3) + 1 + i * .45, 'blip', { pitch: i + 3 }));
    return (lb, L, t, G) => {
      const cur = clamp(Math.floor(lb / per), 0, 3);
      railF.style.height = (clamp((lb - .3) / (L - .6)) * 540) + 'px';
      items.forEach((it, i) => {
        const on = i === cur, done = i < cur;
        const intro = K.pop(lb, i * .15, 30, 1, 8);
        it.row.style.opacity = intro.o * (on ? 1 : done ? .55 : .3);
        it.row.style.transform = `translateY(${intro.y}px) translateX(${on ? 10 : 0}px)`;
        it.n.style.background = on || done ? '#6ee7c8' : '#0b0d10'; it.n.style.color = on || done ? '#08090b' : '#f3f5f6';
        it.n.style.borderColor = on || done ? '#6ee7c8' : 'rgba(255,255,255,.25)';
        it.n.style.boxShadow = on ? '0 0 30px rgba(110,231,200,.7)' : 'none';
      });
      panels.forEach((p, i) => {
        const inn = E.outCubic(pr(lb, at(i), at(i) + .6)), out = i < 3 ? E.inCubic(pr(lb, at(i + 1) - .35, at(i + 1))) : 0;
        p.style.display = lb >= at(i) - .01 && (i === 3 || lb < at(i + 1)) ? 'block' : 'none';
        p.style.opacity = inn * (1 - out);
        p.style.transform = `translateY(${(1 - inn) * 80 - out * 60}px) scale(${lerp(.96, 1, inn)})`;
        p.style.filter = (1 - inn) + out > .02 ? `blur(${((1 - inn) + out) * 14}px)` : 'none';
      });
      t1.update(lb); t2.update(lb);
      digits.forEach((d, i) => { const on = lb > codeAt + i * .22; d.textContent = on ? '482913'[i] : ''; d.style.borderColor = on ? 'rgba(110,231,200,.8)' : ''; });
      codeRow.style.opacity = pr(lb, codeAt - .4, codeAt);
      applyPop(signed, K.pop(lb, codeAt + 1.5, 20, .9, 8));
      const pk = pr(lb, at(2) + .8, at(2) + per * .7);
      polRows.forEach((opts, r) => {
        const target = opts.length - 1, k = Math.min(target, Math.floor(pk * (target + 1) + r * .5));
        opts.forEach((c, j) => { const on = j === k; c.style.background = on ? '#6ee7c8' : ''; c.style.color = on ? '#08090b' : ''; c.style.boxShadow = on ? '0 0 30px rgba(110,231,200,.5)' : ''; });
      });
      const code = 'berth tables policy notes --read owner --write owner';
      pcode.innerHTML = `<span style="color:#6ee7c8">$</span> ${typed(code, pr(lb, at(2) + per * .45, at(2) + per * .8))}`;
      notes.forEach((n, i) => { const p = K.pop(lb, at(3) + 1 + i * .45, 30, .9, 8); n.style.opacity = p.o; n.style.transform = `translateY(${p.y}px)`;
        n.style.boxShadow = `0 0 ${hitEnv(lb, at(3) + 1 + i * .45, .4) * 40}px rgba(110,231,200,.6)`; });
      applyPop(kA, K.pop(lb, at(3) + .6, 30, .9, 10)); applyPop(kB, K.pop(lb, at(3) + 1.2, 30, .9, 10));
      const ph = K.pop(lb, at(3) + .1, 120, .9, 14); phone.style.opacity = ph.o; phone.style.transform = `translateY(${ph.y}px) rotate(${(1 - ph.o) * -4}deg)`;
      G.energy = .5; G.grid = .3; G.gridSpeed = .3; G.hue = .25 * cur; G.focus = [.3, .05]; G.hud = .6;
      G.flash = [0, 1, 2, 3].reduce((a, i) => a + hitEnv(lb, at(i), .25) * .12, 0); G.flashColor = '#6ee7c8';
      const ex = E.inExpo(pr(lb, L - .45, L)); root.style.opacity = 1 - ex; G.worldBlur = ex * 16;
    };
  };

  // ------------------------------------------------------------------ feature orbit
  const orbit = o => (root, ctx) => {
    const F = [['pulse', 'Realtime', 'Row events over SSE'], ['box', 'Storage', 'Buckets, signed URLs'], ['clock', 'Functions', 'Deno, on a cron'],
      ['hook', 'Webhooks', 'Signed, retried'], ['globe', 'Sites', 'Your domain, HTTPS'], ['user', 'Sign in', 'Password or code'],
      ['table', 'SQL', 'Joins and reports'], ['down', 'Export', 'pg_dump any time']];
    const core = el('div', 'center', null, root, { width: '320px', height: '320px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 35%,rgba(110,231,200,.35),rgba(8,9,11,.9) 70%)', border: '1.5px solid rgba(110,231,200,.6)',
      boxShadow: '0 0 120px rgba(110,231,200,.35), inset 0 0 60px rgba(110,231,200,.25)' });
    el('div', '', K.icon('db', 96, '#6ee7c8', 1.3), core);
    el('div', '', 'Postgres', core, { fontSize: '40px', fontWeight: 620, marginTop: '10px' });
    el('div', 'mono', 'ONE PER APP', core, { fontSize: '16px', letterSpacing: '.25em', color: '#6ee7c8', marginTop: '6px' });
    const rings = [0, 1, 2].map(() => el('div', 'abs', null, root, { left: '960px', top: '540px', borderRadius: '50%', border: '1.5px solid rgba(110,231,200,.5)', transform: 'translate(-50%,-50%)' }));
    const cards = F.map(([ic, h, s]) => el('div', 'glass card', `<div style="display:flex;gap:16px;align-items:center">${K.icon(ic, 44)}<h3 style="font-size:40px">${h}</h3></div><p class="mono" style="font-size:20px;margin-top:14px">${s}</p>`,
      root, { left: '0', top: '0', width: '380px', padding: '28px 30px' }));
    const label = el('div', 'center mono', 'EVERY APP INCLUDES', root, { top: '130px', fontSize: '22px', letterSpacing: '.45em', color: 'rgba(243,245,246,.7)' });
    const kf = o.keys; // [[beat, index], ...]
    kf.forEach(([b]) => ctx.cue(b, 'whoosh', { len: .35, soft: true }));
    ctx.cue(0, 'swell', { len: 2 });
    return (lb, L, t, G) => {
      let idx = kf[0][1];
      for (let i = 0; i < kf.length; i++) {
        const [b, k] = kf[i];
        if (lb >= b) { const nb = kf[i + 1]; idx = nb ? lerp(k, nb[1], E.inOutCubic(pr(lb, nb[0] - .7, nb[0]))) : k; }
      }
      const base = -idx * (Math.PI * 2 / F.length) + lb * .02;
      const intro = E.outCubic(pr(lb, 0, 2));
      cards.forEach((c, i) => {
        const a = base + i * Math.PI * 2 / F.length;
        const R = lerp(300, 1,  intro) * 0 + lerp(200, 780, intro);
        const x = Math.sin(a) * R, z = Math.cos(a) * 520 - 220, y = Math.cos(a) * 250 + 20;
        const p = proj(x, y, z);
        const front = Math.cos(a);
        c.style.transform = `translate(-50%,-50%) translate(${p.x}px,${p.y}px) scale(${p.s * .95})`;
        c.style.zIndex = String(Math.round(z + 1000));
        c.style.opacity = intro * clamp(.25 + .75 * (front * .5 + .5));
        c.style.filter = front < .6 ? `blur(${(.6 - front) * 7}px)` : 'none';
        const hl = clamp((front - .9) * 10);
        c.style.borderColor = `rgba(110,231,200,${.16 + hl * .7})`;
        c.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,.3),0 0 ${hl * 80}px rgba(110,231,200,${hl * .35}),0 40px 120px rgba(0,0,0,.55)`;
      });
      core.style.zIndex = '1000';
      core.style.transform = `translate(-50%,-50%) scale(${(.6 + .4 * spring(lb * beatSec(), 1.4, .5)) * (1 + .03 * Math.sin(lb * Math.PI))})`;
      rings.forEach((r, i) => { const q = ((lb + i * .66) % 2) / 2; r.style.width = r.style.height = (320 + q * 700) + 'px'; r.style.opacity = (1 - q) * .6; });
      label.textContent = scramble('EVERY APP INCLUDES', pr(lb, .3, 1.5), Math.floor(lb * 10)); label.style.transform = 'translate(-50%,-50%)';
      G.energy = .55; G.hue = .15; G.grid = .2; G.gridSpeed = .2; G.hud = .6;
      const ex = E.inExpo(pr(lb, L - .45, L)); root.style.opacity = 1 - ex; G.worldBlur = ex * 16;
    };
  };

  // ------------------------------------------------------------------ apps docking at the pier
  const dock = o => (root, ctx) => {
    const HZ = 520, PIER = 800;
    const title = el('div', 'center word', 'Running on <span class="grad">Berth.</span>', root, { top: '190px', fontSize: '120px', fontWeight: 660 });
    const sub = el('div', 'center', 'In production today. On the App Store and the web.', root, { top: '300px', fontSize: '38px', color: '#c9d0d6', whiteSpace: 'nowrap' });
    const pier = el('div', 'abs', null, root, { left: '130px', top: PIER + 'px', height: '5px', width: '1660px', borderRadius: '4px', background: '#f3f5f6',
      boxShadow: '0 0 24px rgba(110,231,200,.8)', transformOrigin: '50% 50%' });
    const posts = [...Array(9)].map((_, i) => el('div', 'abs', null, root, { left: (130 + i * 1660 / 8 - 2) + 'px', top: PIER + 'px', width: '5px', height: '120px', borderRadius: '4px',
      background: 'linear-gradient(#f3f5f6,rgba(243,245,246,0))' }));
    const far = K.APPS_ALL.slice(8).map((id, i) => K.iconImg(id, 60, root, { position: 'absolute', left: (300 + rnd(i * 3.7) * 1320) + 'px', top: (HZ - 40 + rnd(i * 1.9) * 30) + 'px', opacity: 0, filter: 'blur(2px)' }));
    const ships = K.APPS_LIVE.map(([id, name], i) => {
      const d = K.iconImg(id, 140, root, { position: 'absolute', left: '0', top: '0' });
      const nm = el('div', 'mono', name.toUpperCase(), root, { position: 'absolute', top: (PIER + 34) + 'px', fontSize: '17px', letterSpacing: '.1em', color: '#6ee7c8', whiteSpace: 'nowrap', textAlign: 'center', width: '200px' });
      const slot = 130 + (i + .5) * 1660 / 8;
      nm.style.left = (slot - 100) + 'px';
      const ring = el('div', 'abs', null, root, { left: slot + 'px', top: (PIER - 80) + 'px', borderRadius: '50%', border: '2px solid #6ee7c8', transform: 'translate(-50%,-50%)' });
      return { d, nm, ring, slot, sx: 960 + (rnd(i * 6.1) - .5) * 700, at: o.first + i * o.gap };
    });
    ships.forEach(s => ctx.cue(s.at + o.travel, 'blip', { pitch: ships.indexOf(s) + 2 }));
    ctx.cue(0, 'swell', { len: 2 });
    return (lb, L, t, G) => {
      G.harbor = 1; G.cam = (540 - HZ) / 1080; G.sun = 1; G.energy = 0; G.hud = .6;
      const pd = E.inOutCubic(pr(lb, .2, 1.4));
      pier.style.transform = `scaleX(${pd})`;
      posts.forEach((p, i) => { p.style.opacity = pr(lb, 1 + i * .06, 1.4 + i * .06); });
      applyPop(title, K.pop(lb, .4, 30, 1, 12), 'translate(-50%,-50%)');
      applyPop(sub, K.pop(lb, 1, 20, 1, 8), 'translate(-50%,-50%)');
      title.querySelector('.grad').style.backgroundPosition = `${100 - pr(lb, 0, L) * 100}% 0`;
      far.forEach((f, i) => { f.style.opacity = pr(lb, .5 + i * .1, 1.5 + i * .1) * .35; f.style.transform = `translateX(${Math.sin(lb * .4 + i) * 20}px)`; });
      ships.forEach((s, i) => {
        const q = E.outCubic(pr(lb, s.at, s.at + o.travel));
        const x = lerp(s.sx, s.slot, q), y = lerp(HZ + 10, PIER - 80, E.inCubic(pr(lb, s.at, s.at + o.travel)) * .4 + q * .6);
        const sc = lerp(.18, 1, q);
        s.d.style.transform = `translate(${x - 70}px,${y - 70}px) scale(${sc})`;
        s.d.style.opacity = lb < s.at ? 0 : clamp((lb - s.at) * 3);
        s.d.style.boxShadow = `0 0 ${hitEnv(lb, s.at + o.travel, .5) * 60}px rgba(110,231,200,.8),0 20px 60px rgba(0,0,0,.6)`;
        const rp = pr(lb, s.at + o.travel, s.at + o.travel + 1.2);
        s.ring.style.width = s.ring.style.height = (140 + E.outCubic(rp) * 160) + 'px'; s.ring.style.opacity = lb > s.at + o.travel ? (1 - rp) : 0;
        s.nm.style.opacity = pr(lb, s.at + o.travel, s.at + o.travel + .4);
      });
      const ex = E.inExpo(pr(lb, L - .45, L)); root.style.opacity = 1 - ex; G.worldBlur = ex * 12;
    };
  };

  // ------------------------------------------------------------------ variants
  window.VARIANTS.b60 = function (Bn) {
    const { TL, add, section } = Bn;
    TL.bpm = 96; TL.beats = 96; TL.style = 'cinema';
    add(12, harbor({ rise: [.5, 5], pier: [2.5, 5.5], pull: [9, 11.6], len: 12 }));
    add(12, fragments({ snap: 6, sub: 'Your whole backend. One place.' }));
    add(28, steps({ len: 28 }));
    add(16, orbit({ keys: [[0, 0], [3.3, 1], [5.3, 2], [8.2, 3], [10.3, 4], [14.5, 5]] }));
    add(12, dock({ first: 1.2, gap: .75, travel: 2 }));
    add(10, K.pricing({ at: [.3, 2.4, 7.2], capGap: 1.4, caps: ['Hard caps.', 'No surprise bills.'] }));
    add(6, K.endcard({ tagAt: .8, urlAt: 1.6, sweepAt: 2, harbor: true }));
    section(0, 12, 'intro'); section(12, 4, 'build'); section(16, 2, 'riser'); section(18, 34, 'drop');
    section(52, 16, 'break'); section(68, 12, 'break2'); section(80, 6, 'build'); section(86, 4, 'riser'); section(90, 6, 'outro');
    const vo = [[1.5, 'h1'], [5.5, 'h2'], [12.5, 'f1'], [18.4, 'f2'], [24.6, 's1'], [31.6, 's2'], [38.6, 's3'], [45.4, 's4'], [52.8, 'o1'],
      [69, 'd1'], [80.4, 'p1'], [90.5, 'e1']];
    VO(Bn, vo);
  };
  window.VARIANTS.b30 = function (Bn) {
    const { TL, add, section } = Bn;
    TL.bpm = 96; TL.beats = 48; TL.style = 'cinema';
    add(6, harbor({ rise: [.2, 2.6], pier: [1, 3], pull: [3.8, 5.8], len: 6 }));
    add(6, fragments({ snap: 2, sub: 'Your whole backend. One place.' }));
    add(13, steps({ len: 13 }));
    add(8, orbit({ keys: [[0, 0], [1.6, 1], [2.8, 2], [4, 4], [7, 5]] }));
    add(6, dock({ first: .4, gap: .3, travel: 1.4 }));
    add(5, K.pricing({ at: [.2, 1.8, 99], caps: [] }));
    add(4, K.endcard({ tagAt: .6, urlAt: 1.2, sweepAt: 1.4, harbor: true }));
    section(0, 6, 'intro'); section(6, 2, 'riser'); section(8, 17, 'drop'); section(25, 14, 'break'); section(39, 3, 'build'); section(42, 2, 'riser'); section(44, 4, 'outro');
    VO(Bn, [[.8, 'h1'], [8.4, 'x1'], [12.4, 'x2'], [25.5, 'x3'], [33.4, 'x5'], [39.3, 'x4'], [44.3, 'e1']]);
  };
  // VO lines, placed in absolute beats. Text lives here so the audio build can read it.
  const TEXT = {
    h1: 'Every app needs a place to dock.', h2: 'A home for its data, its users, and its files.',
    f1: 'Usually, that means stitching services together.', f2: 'Berth gives you all of it, in one place.',
    s1: 'Install the CLI, and sign in with a code.', s2: 'Create an app. You get your own Postgres database, and keys.',
    s3: 'Decide who can read and write each row.', s4: 'Then ship. Your app signs users in, and calls the API.',
    o1: 'Realtime changes. File storage. Functions on a schedule. Signed webhooks. And hosting for your site, on your own domain.',
    d1: 'Real apps already run on Berth. On the App Store, and on the web.',
    p1: 'Start free. Pro is twelve dollars a month, and the launch price is locked for life.',
    e1: 'Berth. Host your app, or your site.',
    x1: 'Berth runs your whole backend, in one place.',
    x2: 'One command gives you a database, keys, and sign in. Set who reads each row. Then ship.',
    x3: 'Realtime, storage, functions, and hosting. All included.',
    x4: 'Start free. Pro is twelve dollars a month.',
    x5: 'Real apps already run on Berth.',
  };
  function VO(Bn, list) {
    const sorted = list.slice().sort((a, b) => a[0] - b[0]);
    sorted.forEach(([b, id], i) => {
      const next = sorted[i + 1] ? sorted[i + 1][0] : Bn.TL.beats;
      Bn.vo(b, id, TEXT[id], next - b - .15);
    });
  }
})();
