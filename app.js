(() => {
  const strip = document.getElementById('strip');
  const anchors = [...document.querySelectorAll('[data-band]')];
  const chapters = [...document.querySelectorAll('section.chapter')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const IMG_RATIO = 8628 / 1920; // height / width of the full journey image
  const spine = document.getElementById('spine'), fill = document.getElementById('spine-fill');
  let pts = [], bands = [], ticking = false, lastY = null, lastF = null, S = 0, vh = 0, spTop = 0, spH = 0, spMin = 0;

  // Each section's start lines up with the start of its chapter band in the image,
  // so the backdrop crosses from one world to the next as each section boundary passes mid-screen.
  function layout() {
    vh = innerHeight; S = strip.offsetWidth * IMG_RATIO;
    const maxScroll = document.documentElement.scrollHeight - vh;
    const maxY = Math.max(0, S - vh);
    const clampY = y => Math.min(maxY, Math.max(0, y));
    bands = anchors.map(el => {
      const r = el.getBoundingClientRect(), top = r.top + scrollY;
      const [a, b] = el.dataset.band.split(',').map(v => parseFloat(v) / 100);
      return { top, bottom: top + r.height, a, b };
    });
    pts = [[0, 0]];
    for (const k of bands) if (k.a > 0) pts.push([Math.max(0, Math.min(maxScroll, k.top - vh / 2)), clampY(k.a * S - vh / 2)]);
    pts.push([maxScroll, maxY]);
    pts.sort((p, q) => p[0] - q[0]);
    // One continuous spine: starts just under the strapline, runs to the end of the last chapter.
    // Layout offsets (not rects) so the fade-in transforms and sticky boxes don't skew it.
    const docTop = el => { let t = 0; for (; el; el = el.offsetParent) t += el.offsetTop; return t; };
    const strap = document.querySelector('.strapline'), hero = document.querySelector('.hero');
    const last = chapters[chapters.length - 1];
    spTop = docTop(strap) + strap.offsetHeight + 14;
    spH = Math.max(0, docTop(last) + last.offsetHeight - spTop);
    // Always-visible part: from the strapline into the top of the Imagine box.
    spMin = Math.min(spH, docTop(hero) + hero.offsetHeight + 40 - spTop);
    spine.style.top = spTop + 'px'; spine.style.height = spH + 'px';
    lastF = null;
    update();
  }
  function mapY(s) {
    if (reduce.matches) { // no parallax: hold one still view per chapter
      const c = s + vh / 2;
      const k = bands.find(k => c < k.bottom) || bands[bands.length - 1];
      return Math.min(Math.max(0, S - vh), Math.max(0, (k.a + k.b) / 2 * S - vh / 2));
    }
    for (let i = 1; i < pts.length; i++) {
      const [s0, y0] = pts[i - 1], [s1, y1] = pts[i];
      if (s <= s1) { const t = s1 === s0 ? 1 : (s - s0) / (s1 - s0); return y0 + (y1 - y0) * t; }
    }
    return pts[pts.length - 1][1];
  }
  function update() {
    ticking = false;
    const y = Math.round(mapY(scrollY) * 10) / 10;
    if (y !== lastY) { strip.style.transform = `translate3d(-50%, ${-y}px, 0)`; lastY = y; }
    // Below the always-visible top part, the line draws down with scroll, tip at mid-viewport.
    const f = reduce.matches ? spH : Math.round(Math.min(spH, Math.max(spMin, scrollY + vh * 0.5 - spTop)));
    if (f !== lastF) { fill.style.height = f + 'px'; lastF = f; }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', layout);
  addEventListener('load', layout);
  reduce.addEventListener?.('change', layout);
  layout();

  // Fade text in
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Star-dust trail strength by chapter: bright in chapter 01, nearly gone by The Climb, off in Roots.
  const LEVELS = [1, 0.4, 0.08, 0.02, 0];
  window.__dustLevel = () => {
    const c = scrollY + innerHeight / 2;
    for (let i = 0; i < chapters.length; i++) {
      const r = chapters[i].getBoundingClientRect(), top = r.top + scrollY, h = r.height;
      if (c < top + h || i === chapters.length - 1) {
        if (i === chapters.length - 1 && c >= top) return 0;
        const t = Math.min(1, Math.max(0, (c - top) / h));
        const a = LEVELS[i], b = LEVELS[Math.min(i + 1, LEVELS.length - 1)];
        return a + (b - a) * t;
      }
    }
    return 0;
  };
})();
