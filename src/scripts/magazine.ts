// Editorial motion: headline reveals, tactile cards, magnetic buttons and the
// pinned horizontal "feature" spread. Every effect is skipped when the visitor
// prefers reduced motion, and pointer effects only run on fine (mouse) pointers.

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* Word-by-word headline reveal ---------------------------------------------------- */
// <h2 data-split>…</h2> → each word slides up from behind a mask when it scrolls in.
export function splitHeadlines(root: ParentNode = document) {
  if (reduced) return;
  root.querySelectorAll<HTMLElement>('[data-split]:not([data-split-done])').forEach((el) => {
    el.dataset.splitDone = 'true';
    // Splitting re-flows text. Only do it off-screen, where a reflow can't be seen;
    // headlines already visible get a simple fade instead.
    if (el.getBoundingClientRect().top < window.innerHeight) { el.classList.add('intro-fade'); return; }
    let i = 0;
    const walk = (node: Node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = (child.textContent ?? '').split(/(\s+)/);
          const frag = document.createDocumentFragment();
          for (const part of parts) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
            const mask = document.createElement('span');
            mask.className = 'w';
            const inner = document.createElement('span');
            inner.textContent = part;
            inner.style.setProperty('--i', String(i++));
            mask.appendChild(inner);
            frag.appendChild(mask);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && !(child as Element).matches('svg')) {
          walk(child);
        }
      }
    };
    walk(el);
    el.classList.add('split');
  });
  revealWatch();
}

/* Reveal on scroll ---------------------------------------------------------------- */
// One deterministic checker for .reveal and .split elements: anything that has
// entered the viewport, or that the visitor has already scrolled past (e.g. after
// jumping to an anchor), is revealed. Cheap: rAF-throttled, and elements drop out
// of the pending list once shown, so content can never get stuck invisible.
let pending: HTMLElement[] = [];
let queued = false;
function check() {
  queued = false;
  const limit = window.innerHeight * 0.92;
  pending = pending.filter((el) => {
    if (el.getBoundingClientRect().top < limit) {
      el.classList.add(el.classList.contains('split') ? 'split-in' : 'in');
      return false;
    }
    return true;
  });
  if (!pending.length) window.removeEventListener('scroll', schedule);
}
function schedule() { if (!queued) { queued = true; requestAnimationFrame(check); } }
export function revealWatch(root: ParentNode = document) {
  const fresh = Array.from(root.querySelectorAll<HTMLElement>('.reveal:not(.in), .split:not(.split-in)')).filter((el) => !pending.includes(el));
  if (!fresh.length) return;
  pending.push(...fresh);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  schedule();
  // Belt and braces: if rAF is throttled (background tab, embedded frame), check again shortly.
  setTimeout(check, 600);
}

/* Tactile cards: 3D tilt + moving glare ------------------------------------------------ */
function tilt() {
  if (reduced || !fine) return;
  let active: HTMLElement | null = null;
  document.addEventListener('pointermove', (e) => {
    const card = (e.target as Element).closest<HTMLElement>('[data-tilt], .card');
    if (active && active !== card) { active.style.removeProperty('--rx'); active.style.removeProperty('--ry'); active.classList.remove('tilting'); }
    active = card;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const max = card.matches('.card') ? 5 : 9;
    card.style.setProperty('--rx', `${(0.5 - y) * max}deg`);
    card.style.setProperty('--ry', `${(x - 0.5) * max}deg`);
    card.style.setProperty('--gx', `${x * 100}%`);
    card.style.setProperty('--gy', `${y * 100}%`);
    card.classList.add('tilting');
  }, { passive: true });
}

/* Magnetic buttons ----------------------------------------------------------------- */
function magnetic() {
  if (reduced || !fine) return;
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.18}px ${(e.clientY - r.top - r.height / 2) * 0.28}px`;
    });
    el.addEventListener('pointerleave', () => { el.style.translate = ''; });
  });
}

/* Pinned horizontal feature ---------------------------------------------------------- */
// <section data-hscroll><div class="hs-sticky"><div class="hs-track">…</div></div></section>
// Scrolling down moves the track sideways while the section is pinned.
function horizontalFeatures() {
  document.querySelectorAll<HTMLElement>('[data-hscroll]').forEach((section) => {
    const track = section.querySelector<HTMLElement>('.hs-track')!;
    const bar = section.querySelector<HTMLElement>('.hs-progress i');
    const desktop = matchMedia('(min-width: 900px)');
    let distance = 0;
    const measure = () => {
      const pin = !reduced && desktop.matches;
      section.classList.toggle('is-pinned', pin);
      if (!pin) { section.style.height = ''; track.style.transform = ''; return; }
      distance = Math.max(0, track.scrollWidth - window.innerWidth + 64);
      section.style.height = `${window.innerHeight + distance}px`;
      update();
    };
    const update = () => {
      if (!section.classList.contains('is-pinned')) return;
      const top = section.getBoundingClientRect().top;
      const progress = Math.min(1, Math.max(0, -top / (section.offsetHeight - window.innerHeight || 1)));
      track.style.transform = `translate3d(${-progress * distance}px,0,0)`;
      if (bar) bar.style.transform = `scaleX(${progress})`;
    };
    measure();
    window.addEventListener('resize', measure);
    desktop.addEventListener('change', measure);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('load', measure);
  });
}

/* Count-up numbers ----------------------------------------------------------------- */
function countUps() {
  const els = document.querySelectorAll<HTMLElement>('[data-count]');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target as HTMLElement;
    const end = Number(el.dataset.count);
    el.style.display = 'inline-block';
    el.style.minWidth = `${el.getBoundingClientRect().width}px`; // no width jumps while counting
    if (reduced) { el.textContent = String(end); return; }
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 1100);
      el.textContent = String(Math.round(end * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}

export function initMagazine() {
  splitHeadlines();
  revealWatch();
  tilt();
  magnetic();
  horizontalFeatures();
  countUps();
}
