// Deterministic timeline engine. Every visual is a pure function of time t,
// so the renderer can seek to any frame and screenshot it.
(function () {
  const Q = new URLSearchParams(location.search);
  const VARIANT = Q.get('v') || 'a60';

  // ---------- math ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pr = (x, a, b) => clamp((x - a) / (b - a));
  const E = {
    lin: t => t,
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inCubic: t => t * t * t,
    inOutCubic: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuint: t => 1 - Math.pow(1 - t, 5),
    outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    inOutExpo: t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    inBack: t => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
  };
  // damped spring, t in seconds
  function spring(t, f = 3.2, z = 0.42) {
    if (t <= 0) return 0;
    const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  }
  function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  // envelope that pops at `at` and decays
  const hitEnv = (x, at, decay = 0.35) => (x < at ? 0 : Math.exp(-(x - at) / decay));

  // ---------- dom helpers ----------
  function el(tag, cls, html, parent, style) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (style) Object.assign(e.style, style);
    if (parent) parent.appendChild(e);
    return e;
  }
  function splitChars(node, text) {
    node.innerHTML = '';
    return [...text].map(ch => el('span', '', ch === ' ' ? '&nbsp;' : ch, node, { display: 'inline-block' }));
  }
  const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&*+=/<>_';
  function scramble(text, p, seed) {
    const n = Math.floor(text.length * clamp(p));
    let out = text.slice(0, n);
    for (let i = n; i < text.length; i++) {
      const c = text[i];
      out += c === ' ' ? ' ' : GLYPHS[Math.floor(rnd(seed + i * 7.3) * GLYPHS.length)];
    }
    return out;
  }
  function typed(text, p) { return text.slice(0, Math.floor(text.length * clamp(p))); }
  const T3 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) =>
    `translate3d(${x}px,${y}px,${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`;

  // ---------- logo ----------
  const LOGO_SVG = (sz = 200, cls = '') => `
  <svg class="${cls}" width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none">
    <rect class="lg-box" x="1.5" y="1.5" width="21" height="21" rx="6.5" stroke="#f3f5f6" stroke-width="1.6" pathLength="1"/>
    <path class="lg-pier" d="M6 14.5h12" stroke="#f3f5f6" stroke-width="1.6" stroke-linecap="round" pathLength="1"/>
    <path class="lg-post" d="M8.5 14.5v3.5M12 14.5v3.5M15.5 14.5v3.5" stroke="#f3f5f6" stroke-width="1.6" stroke-linecap="round" pathLength="1"/>
    <path class="lg-arc" d="M8 11.2c1.2-2.4 2.5-3.6 4-3.6s2.8 1.2 4 3.6" stroke="#6ee7c8" stroke-width="1.6" stroke-linecap="round" pathLength="1"/>
  </svg>`;
  function drawLogo(svg, pBox, pPier, pPost, pArc) {
    const set = (sel, p) => svg.querySelectorAll(sel).forEach(n => {
      // a finished stroke drops the dash so the path closes without a seam
      n.style.strokeDasharray = p >= .999 ? 'none' : '1 1'; n.style.strokeDashoffset = String(1 - clamp(p));
      n.style.opacity = p > 0.001 ? 1 : 0;
    });
    set('.lg-box', pBox); set('.lg-pier', pPier); set('.lg-post', pPost); set('.lg-arc', pArc);
  }

  // ---------- background shader ----------
  const FRAG = `
  precision highp float;
  uniform vec2 uRes; uniform float uTime, uEnergy, uFlash, uGrid, uWarp, uHarbor, uSun, uCam, uGridSpeed, uHue;
  uniform vec2 uFocus; uniform vec3 uFlashCol;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x), u.y); }
  float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=.5;} return v; }
  vec3 mint=vec3(.431,.906,.784), blue=vec3(.541,.706,1.), violet=vec3(.714,.612,1.);
  vec3 aurora(vec2 p, float t){
    vec2 q = p*1.1 + vec2(fbm(p*1.4+t), fbm(p*1.4-t+3.1));
    float n = fbm(q*1.6 + t*.6);
    vec2 f = uFocus;
    float b1 = smoothstep(1.05,0.,length(p-vec2(.62,.30)-f-.16*vec2(sin(t*2.1),cos(t*1.6))));
    float b2 = smoothstep(1.15,0.,length(p-vec2(-.70,.38)-f*.6-.2*vec2(cos(t*1.3),sin(t*2.2))));
    float b3 = smoothstep(1.0,0.,length(p-vec2(.05,-.62)-.22*vec2(sin(t*1.1),cos(t*.8))));
    vec3 c1 = mix(mint, blue, uHue), c2 = mix(blue, violet, uHue), c3 = mix(violet, mint, uHue);
    vec3 a = c1*b1*(.35+.9*n) + c2*b2*(.3+.9*n) + c3*b3*(.25+.8*n);
    // thin luminous ribbon
    float rib = exp(-abs(p.y - .18*sin(p.x*2.2+t*3.) - .12*fbm(vec2(p.x*2.,t)) + .05)*22.);
    a += mix(mint,blue,.5+.5*sin(p.x*2.+t*2.))*rib*.35;
    return a;
  }
  vec3 floorGrid(vec2 p){
    float hz = -.04;
    float d = hz - p.y;
    if (d <= 0.) return vec3(0.);
    float z = .42/d;
    vec2 g = vec2(p.x*z, z + uTime*uGridSpeed);
    vec2 a = .5 - abs(fract(g)-.5);
    float wx = 1.3*z/uRes.y, wy = 1.3*.42/(uRes.y*d*d);
    float line = max(1.-smoothstep(0., wx, a.x), 1.-smoothstep(0., wy, a.y));
    line += .35*max(1.-smoothstep(0., wx*7., a.x), 1.-smoothstep(0., wy*7., a.y));
    float fade = smoothstep(7.,1.4,z) * smoothstep(0.,.05,d);
    return mix(mint, blue, clamp(p.x+.5,0.,1.)) * line * fade * .55;
  }
  vec3 harbor(vec2 p, float t){
    float hy = uCam;
    float sy = p.y - hy;
    vec3 sky = mix(vec3(.028,.042,.06), vec3(.008,.01,.015), smoothstep(0.,.75,sy));
    float g = exp(-abs(sy)*6.) * exp(-abs(p.x)*1.3);
    sky += mix(mint, blue, .5) * g * (.1 + .45*uSun);
    sky += mint * exp(-abs(sy)*40.) * exp(-abs(p.x)*.9) * .12 * (.4+uSun);
    vec2 sp = floor(p*300.);
    float st = step(.9968, hash(sp)) * smoothstep(.03,.35,sy);
    sky += st * (.55+.45*sin(t*2.5+hash(sp+3.)*30.)) * .7;
    vec3 col = sky;
    if (p.y < hy) {
      float d = hy - p.y; float z = 1./(d+.015);
      vec3 water = vec3(.01,.015,.022) + mix(mint,blue,.5)*exp(-d*5.)*exp(-abs(p.x)*1.5)*(.06+.3*uSun);
      float sh = pow(noise(vec2(p.x*z*4.5, z*14. + t*2.)), 7.);
      float path = exp(-abs(p.x)*(2.2 + d*2.));
      water += mix(mint, blue, .35) * sh * path * (.3 + uSun*1.1) * smoothstep(0.,.015,d);
      water += vec3(.6,.8,.9) * pow(noise(vec2(p.x*z*9., z*30. - t*1.5)), 12.) * .12 * exp(-d*1.2);
      col = water;
    }
    return col;
  }
  void main(){
    vec2 p = (gl_FragCoord.xy - .5*uRes) / uRes.y;
    float t = uTime*.11;
    vec3 col = vec3(.031,.035,.043);
    col += aurora(p, t) * uEnergy * .62;
    col += floorGrid(p) * uGrid;
    if (uHarbor > .001) col = mix(col, harbor(p, uTime), uHarbor);
    if (uWarp > .001) {
      float a = atan(p.y, p.x), r = length(p);
      float s = pow(noise(vec2(a*38., r*1.5 - uTime*9.)), 7.) * smoothstep(.08, .9, r);
      col += mix(mint, vec3(1.), .4) * s * uWarp * 1.3;
    }
    col += uFlashCol * uFlash;
    col += (hash(gl_FragCoord.xy + fract(uTime)*100.) - .5) / 160.;
    gl_FragColor = vec4(col, 1.);
  }`;

  function makeBG(canvas) {
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['uRes', 'uTime', 'uEnergy', 'uFlash', 'uGrid', 'uWarp', 'uHarbor', 'uSun', 'uCam', 'uGridSpeed', 'uHue', 'uFocus', 'uFlashCol']
      .forEach(n => U[n] = gl.getUniformLocation(prog, n));
    return function draw(t, g) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, t); gl.uniform1f(U.uEnergy, g.energy); gl.uniform1f(U.uFlash, g.bgFlash);
      gl.uniform1f(U.uGrid, g.grid); gl.uniform1f(U.uWarp, g.warp); gl.uniform1f(U.uHarbor, g.harbor);
      gl.uniform1f(U.uSun, g.sun); gl.uniform1f(U.uCam, g.cam); gl.uniform1f(U.uGridSpeed, g.gridSpeed); gl.uniform1f(U.uHue, g.hue);
      gl.uniform2f(U.uFocus, g.focus[0], g.focus[1]); gl.uniform3f(U.uFlashCol, ...g.flashCol);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
  }

  // ---------- timeline ----------
  const TL = { variant: VARIANT, bpm: 128, beats: 64, scenes: [], cues: [], sections: [], vo: [] };
  const beatSec = () => 60 / TL.bpm;
  function cue(beat, type, o = {}) { TL.cues.push(Object.assign({ beat, t: beat * beatSec(), type }, o)); }
  function section(beat, len, kind, o = {}) { TL.sections.push(Object.assign({ beat, len, kind }, o)); }
  function vo(beat, id, text, maxBeats, o = {}) { TL.vo.push(Object.assign({ beat, t: beat * beatSec(), id, text, maxBeats, maxSec: maxBeats * beatSec() }, o)); }

  let cursor = 0;
  // add(name, lenBeats, factory, opts) appends a scene at the cursor
  function add(len, factory, o = {}) {
    const start = cursor; cursor += len;
    const root = el('div', 'scene', null, document.getElementById('world'));
    const s = { start, len, root, pre: o.pre || 0, tail: o.tail || 0, z: o.z || 0 };
    root.style.zIndex = String(10 + TL.scenes.length + (o.z || 0));
    s.update = factory(root, { start, len, cue: (b, type, oo) => cue(start + b, type, oo),
      vo: (b, id, text, maxB, oo) => vo(start + b, id, text, maxB, oo), section: (b, l, k, oo) => section(start + b, l, k, oo) });
    TL.scenes.push(s);
    return s;
  }

  const G0 = () => ({ energy: .55, bgFlash: 0, flashCol: [1, 1, 1], grid: 0, gridSpeed: .6, warp: 0, harbor: 0, sun: 0, cam: 0,
    hue: 0, focus: [0, 0], shake: 0, flash: 0, flashColor: '#ffffff', hud: 1, worldBlur: 0, worldScale: 1, rgb: 0, hudText: null });
  let G = G0();
  let drawBG = null, hud = null, flashEl = null, worldEl = null;

  function seek(t) {
    G = G0();
    const b = t / beatSec();
    for (const s of TL.scenes) {
      const on = b >= s.start - s.pre && b < s.start + s.len + s.tail;
      if (on) { s.root.style.display = 'block'; s.update(b - s.start, s.len, t, G); }
      else if (s.root.style.display !== 'none') s.root.style.display = 'none';
    }
    // camera shake
    const sh = G.shake;
    const sx = sh ? (rnd(Math.floor(t * 60) + .1) - .5) * 2 * sh : 0;
    const sy = sh ? (rnd(Math.floor(t * 60) + 7.7) - .5) * 2 * sh : 0;
    worldEl.style.transform = `translate(${sx}px,${sy}px) scale(${G.worldScale})`;
    worldEl.style.filter = G.worldBlur > .05 ? `blur(${G.worldBlur}px)` : 'none';
    flashEl.style.opacity = String(clamp(G.flash));
    flashEl.style.background = G.flashColor;
    hud.style.opacity = String(G.hud);
    if (G.hudText) for (const k in G.hudText) { const n = hud.querySelector('.' + k + ' .tx'); if (n && n.textContent !== G.hudText[k]) n.textContent = G.hudText[k]; }
    const sec = Math.floor(t), fr = Math.floor((t - sec) * 60);
    hud.querySelector('.tc').textContent = `00:${String(sec).padStart(2, '0')}:${String(fr).padStart(2, '0')}`;
    drawBG(t, G);
  }

  window.B = { clamp, lerp, pr, E, spring, rnd, hitEnv, el, splitChars, scramble, typed, T3, LOGO_SVG, drawLogo, TL, add, cue, section, vo, beatSec,
    get cursor() { return cursor; } };

  window.__boot = async function () {
    worldEl = document.getElementById('world'); flashEl = document.getElementById('flash'); hud = document.getElementById('hud');
    const canvas = document.getElementById('bg');
    canvas.width = 960; canvas.height = 540;
    drawBG = makeBG(canvas);
    const build = window.VARIANTS[VARIANT];
    if (!build) throw new Error('unknown variant ' + VARIANT);
    build(window.B);
    TL.duration = TL.beats * beatSec();
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
    window.__seek = seek;
    window.__meta = { variant: VARIANT, bpm: TL.bpm, beats: TL.beats, duration: TL.duration, cues: TL.cues, sections: TL.sections, vo: TL.vo };
    const qt = Q.get('t'); seek(qt ? parseFloat(qt) : 0);
    window.__ready = true;
  };
})();
