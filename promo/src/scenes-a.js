// Variation A, "Hype": kinetic type cut to a 128 BPM track. Music only.
(function () {
  window.VARIANTS = window.VARIANTS || {};
  const K = window.K;

  const SLAM8 = [
    { w: 'Database', sub: 'Postgres. One per app.', icon: 'db' },
    { w: 'Sign in', sub: 'Email and password, or a code.', icon: 'user' },
    { w: 'Policies', sub: 'Row level security.', icon: 'shield' },
    { w: 'Realtime', sub: 'Row events over SSE.', icon: 'pulse' },
    { w: 'Storage', sub: 'Buckets and signed URLs.', icon: 'box' },
    { w: 'Functions', sub: 'TypeScript on Deno. Cron.', icon: 'fn' },
    { w: 'Webhooks', sub: 'Signed. Retried for hours.', icon: 'hook' },
    { w: 'Hosting', sub: 'Your domain. Automatic HTTPS.', icon: 'globe' },
  ];
  const CREATE = [
    { cmd: 'berth apps create demo', at: 1, len: 1.6 },
    { out: '<span class="ok">✓</span> Postgres database   <span class="v">demo</span>', at: 3 },
    { out: '<span class="ok">✓</span> Database role', at: 3.5 },
    { out: '<span class="ok">✓</span> Secret key         <span class="k">bsk_••••••••••</span>  saved', at: 4 },
    { out: '<span class="ok">✓</span> Publishable key    <span class="k">bpk_••••••••••</span>  saved', at: 4.5 },
  ];

  window.VARIANTS.a60 = function (B) {
    const { TL, add, section } = B;
    TL.bpm = 128; TL.beats = 128; TL.style = 'hype';
    add(8, K.ignite({ logoEnd: 4, exitAt: 8, words: [{ w: 'Every', at: 4.5 }, { w: 'app', at: 5 }, { w: 'needs', at: 5.5 }, { w: 'a', at: 6 }, { w: 'backend.', at: 6.5 }] }));
    add(8, K.slam({ words: SLAM8, per: 1 }));
    add(8, K.allofit({ drop: 4, names: SLAM8.map(w => w.w), sub: 'Your whole backend. Nothing to assemble.' }));
    add(16, K.command({ checks: ['A Postgres database', 'Secret and publishable keys', 'Sign in for your users'], checkAt: [3, 4.3, 9.6],
      lines: CREATE.concat([
        { cmd: 'berth tables create notes title:text done:boolean', at: 6, len: 2 },
        { out: '<span class="ok">✓</span> notes   <span class="k">id  created_at  title  done</span>', at: 8.4 },
        { cmd: 'berth tables policy notes --read owner --write owner', at: 9.4, len: 1.8 },
        { out: '<span class="ok">✓</span> policy   <span class="v">owner / owner</span>', at: 11.6 },
        { cmd: 'berth rows add notes title=hello done=false', at: 12.4, len: 1.5 },
        { out: '<span class="k">{</span> <span class="v">"title"</span>: "hello", <span class="v">"done"</span>: false <span class="k">}</span>', at: 14.2, big: true },
      ]) }));
    add(12, K.arch({ packetAt: 3, capAt: 6.5 }));
    add(24, K.bento({ focusStart: 1.5, per: 2, focusScale: 1.25 }));
    add(12, K.sites({}));
    add(12, K.showcase({}));
    add(14, K.pricing({ at: [0, 4.5, 9], capGap: 2 }));
    add(14, K.endcard({ tagAt: 1.5, urlAt: 3, sweepAt: 4 }));
    // music form, in beats
    section(0, 8, 'intro'); section(8, 8, 'build'); section(16, 4, 'riser'); section(20, 20, 'drop');
    section(40, 8, 'break'); section(48, 4, 'riser'); section(52, 36, 'drop'); section(88, 12, 'break');
    section(100, 10, 'build'); section(110, 4, 'riser'); section(114, 14, 'outro');
  };

  window.VARIANTS.a30 = function (B) {
    const { TL, add, section } = B;
    TL.bpm = 128; TL.beats = 64; TL.style = 'hype';
    add(6, K.ignite({ logoEnd: 2.5, exitAt: 6, words: [{ w: 'Every', at: 3 }, { w: 'app', at: 3.25 }, { w: 'needs', at: 3.5 }, { w: 'a', at: 3.75 }, { w: 'backend.', at: 4 }] }));
    add(6, K.slam({ words: [SLAM8[0], SLAM8[1], SLAM8[3], SLAM8[4], SLAM8[5], SLAM8[7]], per: 1 }));
    add(4, K.allofit({ drop: 2, names: ['Database', 'Sign in', 'Realtime', 'Storage', 'Functions', 'Hosting'], sub: 'Your whole backend. Nothing to assemble.' }));
    add(12, K.command({ checks: ['A Postgres database', 'Secret and publishable keys', 'Sign in for your users'], checkAt: [3, 4.3, 5],
      lines: CREATE.concat([
        { cmd: 'berth tables create notes title:text done:boolean', at: 6.2, len: 1.8 },
        { out: '<span class="ok">✓</span> notes   <span class="k">id  created_at  title  done</span>', at: 8.4 },
        { cmd: 'berth rows add notes title=hello done=false', at: 9, len: 1.4 },
        { out: '<span class="k">{</span> <span class="v">"title"</span>: "hello", <span class="v">"done"</span>: false <span class="k">}</span>', at: 10.8, big: true },
      ]) }));
    add(12, K.bento({ focusStart: .75, per: 1, focusScale: 1.1, order: [0, 2, 3, 4, 5, 6, 7, 8, 1] }));
    add(8, K.showcase({}));
    add(8, K.pricing({ at: [0, 2.5, 5], capGap: 1.3, facts: ['5 apps', '10,000 users per app'], caps: ['No surprise bills.', 'Never paused for idle.'] }));
    add(8, K.endcard({ tagAt: 1, urlAt: 2, sweepAt: 3 }));
    section(0, 6, 'intro'); section(6, 6, 'build'); section(12, 2, 'riser'); section(14, 26, 'drop');
    section(40, 8, 'break'); section(48, 6, 'build'); section(54, 2, 'riser'); section(56, 8, 'outro');
  };
})();
