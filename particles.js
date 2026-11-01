// Star-dust cursor trail. Self-contained, no dependencies.
(() => {
  const cv = document.getElementById('dust');
  if (!cv) return;
  const noHover = matchMedia('(hover: none), (pointer: coarse)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (noHover.matches || reduce.matches) { cv.remove(); return; }

  const ctx = cv.getContext('2d');
  const MAX = 120;
  const COLOURS = [[232, 194, 122], [232, 194, 122], [240, 210, 150], [232, 194, 122], [232, 194, 122], [120, 214, 206], [168, 146, 232]];
  const ps = [];
  let dpr = 1, raf = 0, last = 0, mx = 0, my = 0, px = null, py = null, carry = 0;

  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size(); addEventListener('resize', size);

  function spawn(x, y, level) {
    if (ps.length >= MAX) ps.shift();
    const c = COLOURS[(Math.random() * COLOURS.length) | 0];
    const a = Math.random() * Math.PI * 2, sp = 0.15 + Math.random() * 0.5;
    ps.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.15, r: 0.6 + Math.random() * 1.4,
      life: 0, max: 450 + Math.random() * 450, c, o: level * (0.45 + Math.random() * 0.5) });
  }

  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    const level = window.__dustLevel ? window.__dustLevel() : 1;
    if (level < 0.01) { px = mx; py = my; return; }
    if (px === null) { px = mx; py = my; }
    const d = Math.hypot(mx - px, my - py);
    carry += d * 0.12 * Math.max(0.35, level); // fewer motes as the trail fades
    let n = Math.min(6, Math.floor(carry)); carry -= n;
    for (let i = 0; i < n; i++) { const t = (i + 1) / n; spawn(px + (mx - px) * t + (Math.random() - .5) * 6, py + (my - py) * t + (Math.random() - .5) * 6, level); }
    px = mx; py = my;
    if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }, { passive: true });

  function tick(now) {
    const dt = Math.min(50, now - last); last = now;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life += dt;
      if (p.life >= p.max) { ps.splice(i, 1); continue; }
      p.x += p.vx * dt * 0.06; p.y += p.vy * dt * 0.06; p.vx *= 0.985; p.vy *= 0.985;
      const k = 1 - p.life / p.max, a = p.o * k * k;
      const [r, g, b] = p.c, R = p.r * 4;
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
      grd.addColorStop(0, `rgba(${r},${g},${b},${a})`);
      grd.addColorStop(0.35, `rgba(${r},${g},${b},${a * 0.35})`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    raf = ps.length && !document.hidden ? requestAnimationFrame(tick) : 0; // idle when nothing to draw
    if (!raf) ctx.clearRect(0, 0, innerWidth, innerHeight);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; ps.length = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  });
  reduce.addEventListener?.('change', () => { if (reduce.matches) { cancelAnimationFrame(raf); raf = 0; cv.remove(); } });
  window.__dustCount = () => ps.length;
})();
