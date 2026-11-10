// Cinematic layer: inertial scrolling, decoding labels, a scroll-velocity
// ticker and an electric cursor ring. Desktop-only effects stay off touch
// devices, and everything is skipped for prefers-reduced-motion.
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* Inertial smooth scrolling (desktop) --------------------------------------------- */
let velocity = 0;
function smoothScroll() {
  if (reduced || !fine) return null;
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, anchors: { offset: -80 }, autoRaf: true });
  lenis.on('scroll', (l: Lenis) => { velocity = l.velocity; });
  // Let dialogs, drawers and sheets scroll natively.
  document.querySelectorAll('.drawer-panel, .sheet-body, .search-results, .filters').forEach((el) => el.setAttribute('data-lenis-prevent', ''));
  return lenis;
}

/* Decoding labels: circuit glyphs resolve into text, left to right ----------------- */
const GLYPHS = '01<>/\\{}[]#*+=⌁▮▯';
function scramble(el: HTMLElement) {
  const text = el.dataset.text ?? el.textContent ?? '';
  el.dataset.text = text;
  // Lock the width so changing glyphs never nudge neighboring content.
  const w = el.getBoundingClientRect().width;
  el.style.width = `${w}px`;
  el.style.whiteSpace = 'nowrap';
  el.style.overflow = 'hidden';
  const start = performance.now();
  const dur = Math.min(900, 300 + text.length * 22);
  const tick = (now: number) => {
    const k = Math.min(1, (now - start) / dur);
    const solved = Math.floor(text.length * k);
    let out = text.slice(0, solved);
    for (let i = solved; i < text.length; i++) out += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    el.textContent = out;
    if (k < 1) requestAnimationFrame(tick);
    else { el.textContent = text; el.style.width = el.style.whiteSpace = el.style.overflow = ''; }
  };
  requestAnimationFrame(tick);
}
function scrambleLabels() {
  if (reduced) return;
  // Only plain-text labels (no child elements) so markup is never disturbed.
  let pending = Array.from(document.querySelectorAll<HTMLElement>('.eyebrow, .cover-kicker, .masthead span:not(.masthead-rule)'))
    .filter((el) => el.children.length === 0 && (el.textContent ?? '').trim().length > 2);
  if (!pending.length) return;
  pending.forEach((el) => el.setAttribute('aria-label', el.textContent!.trim()));
  let queued = false;
  const check = () => {
    queued = false;
    const limit = innerHeight * 0.9;
    pending = pending.filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < limit && r.bottom > 0) { scramble(el); return false; }
      return r.bottom > 0; // already scrolled past: leave as is
    });
    if (!pending.length) removeEventListener('scroll', schedule);
  };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(check); } };
  addEventListener('scroll', schedule, { passive: true });
  schedule();
}

/* Ticker that reacts to scroll speed ----------------------------------------------- */
function velocityTicker() {
  const track = document.querySelector<HTMLElement>('.ticker-track');
  if (!track || reduced) return;
  track.classList.add('is-js');
  let x = 0, skew = 0, lastY = scrollY, lastT = performance.now(), onScreen = true, raf = 0;
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen && !raf) { lastT = performance.now(); raf = requestAnimationFrame(step); }
  }).observe(track.parentElement!);
  const step = (now: number) => {
    if (!onScreen) { raf = 0; return; }
    const dt = Math.min(64, now - lastT); lastT = now;
    const v = velocity || (scrollY - lastY) / Math.max(1, dt) * 16; // px per frame
    lastY = scrollY;
    const half = track.scrollWidth / 2;
    x -= (0.6 + Math.min(18, Math.abs(v) * 0.35)) * (dt / 16);
    if (half > 0 && -x > half) x += half;
    skew += (Math.max(-12, Math.min(12, v * 0.5)) - skew) * 0.12;
    track.style.transform = `translate3d(${x}px,0,0) skewX(${-skew}deg)`;
    raf = requestAnimationFrame(step);
  };
}

/* Electric cursor ring (desktop) ----------------------------------------------------- */
function cursorRing() {
  if (reduced || !fine) return;
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.innerHTML = '<span class="cursor-label"></span>';
  document.body.appendChild(ring);
  const label = ring.firstElementChild as HTMLElement;
  let tx = -100, ty = -100, x = -100, y = -100, shown = false;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    if (!shown) { shown = true; x = tx; y = ty; ring.classList.add('on'); }
    const t = e.target as Element;
    const view = t.closest('.card, .spread, .stage, .chapter, .shortlist-grid li, [data-cursor="view"]');
    const link = t.closest('a, button, [role="button"], input, select, label');
    // Buttons inside a card get the "link" ring, not the big "View" bubble.
    const onControl = Boolean(t.closest('.btn, .save-btn, .compare-btn, .share-btn, .sc-view'));
    const isView = Boolean(view) && !onControl;
    ring.classList.toggle('is-view', isView);
    ring.classList.toggle('is-link', Boolean(link) && !isView);
    label.textContent = isView ? (view!.matches('.stage') ? 'Play' : 'View') : '';
  }, { passive: true });
  document.addEventListener('pointerleave', () => { shown = false; ring.classList.remove('on'); });
  addEventListener('pointerdown', () => ring.classList.add('press'));
  addEventListener('pointerup', () => ring.classList.remove('press'));
  let moving = false;
  const step = () => {
    x += (tx - x) * 0.2; y += (ty - y) * 0.2;
    ring.style.transform = `translate3d(${x}px,${y}px,0)`;
    if (Math.abs(tx - x) + Math.abs(ty - y) > 0.3) requestAnimationFrame(step);
    else moving = false;
  };
  addEventListener('pointermove', () => { if (!moving) { moving = true; requestAnimationFrame(step); } }, { passive: true });
}

export function initCinema() {
  smoothScroll();
  scrambleLabels();
  velocityTicker();
  cursorRing();
}
