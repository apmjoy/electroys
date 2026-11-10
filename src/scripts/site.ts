// Site-wide behavior: header, menus, search, saved list, analytics, motion.
import { wishlist } from './wishlist';
import { compare, COMPARE_MAX } from './compare';
import { initMagazine } from './magazine';
import { initCinema } from './cinema';

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));

/* Header shadow on scroll ------------------------------------------------- */
const header = $('[data-header]');
const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* Mega menus: click to toggle, hover on fine pointers, Esc to close ------- */
const menus = $$('[data-menu]');
const closeMenus = (except?: Element) =>
  menus.forEach((m) => {
    if (m === except) return;
    m.classList.remove('open');
    m.querySelector('button')?.setAttribute('aria-expanded', 'false');
  });
menus.forEach((m) => {
  const btn = m.querySelector('button')!;
  const set = (open: boolean) => {
    closeMenus(m);
    m.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', () => set(!m.classList.contains('open')));
  if (matchMedia('(hover: hover)').matches) {
    let t: number | undefined;
    m.addEventListener('mouseenter', () => { clearTimeout(t); set(true); });
    m.addEventListener('mouseleave', () => { t = window.setTimeout(() => set(false), 160); });
  }
});
document.addEventListener('click', (e) => {
  if (!(e.target as Element).closest('[data-menu]')) closeMenus();
});

/* Mobile drawer ----------------------------------------------------------- */
const drawer = $('[data-drawer]');
const drawerToggle = $('[data-open-drawer]');
let lastFocus: HTMLElement | null = null;
function setDrawer(open: boolean) {
  if (!drawer) return;
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  drawerToggle?.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) { lastFocus = document.activeElement as HTMLElement; $('[data-close-drawer].icon-btn', drawer)?.focus(); }
  else lastFocus?.focus();
}
drawerToggle?.addEventListener('click', () => setDrawer(true));
$$('[data-close-drawer]').forEach((el) => el.addEventListener('click', () => setDrawer(false)));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeMenus(); if (drawer?.classList.contains('open')) setDrawer(false); }
  const typing = (e.target as HTMLElement).closest('input, textarea, select, [contenteditable]');
  if (!typing && (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'))) {
    e.preventDefault();
    openSearch();
  }
});

/* Search ------------------------------------------------------------------- */
type IndexItem = { id: string; t: string; b: string; a: string; i: string; img: string; tl: string; pb: string; u: string; ph: boolean; k: string };
let index: IndexItem[] | null = null;
export async function loadIndex(): Promise<IndexItem[]> {
  if (index) return index;
  try {
    const res = await fetch('/search.json');
    index = (await res.json()) as IndexItem[];
  } catch {
    index = [];
  }
  return index;
}
const dialog = $<HTMLDialogElement>('#search-dialog');
const input = $<HTMLInputElement>('#search-input');
const results = $('#search-results');
let active = 0;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function renderResults(q: string) {
  if (!results || !index) return;
  const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const hits = terms.length ? index.filter((p) => terms.every((t) => p.k.includes(t))).slice(0, 8) : index.filter((_, n) => n % 9 === 0).slice(0, 6);
  active = 0;
  results.innerHTML = hits.length
    ? hits
        .map(
          (p, n) => `<li role="option"><a href="/products/${p.id}/" class="${n === 0 ? 'active' : ''}"><img src="${esc(p.img)}" alt="" loading="lazy" class="${p.ph ? 'is-photo' : ''}"><span><strong>${esc(p.t)}</strong><span>${esc(p.a)} · ${esc(p.i)}${/\d/.test(p.pb) ? ' · ' + esc(p.pb) : ''}</span></span></a></li>`,
        )
        .join('') + (terms.length ? `<li><a href="/shop/?q=${encodeURIComponent(q)}"><span><strong>See all results for “${esc(q)}”</strong><span>Open the full shop with this search</span></span></a></li>` : '')
    : `<li class="search-empty">No matches for “${esc(q)}”. Try an age, a brand or a skill like “robot” or “circuits”.</li>`;
}
async function openSearch() {
  if (!dialog) return;
  dialog.showModal();
  input!.value = '';
  await loadIndex();
  renderResults('');
  input!.focus();
}
$$('[data-open-search]').forEach((b) => b.addEventListener('click', openSearch));
input?.addEventListener('input', () => renderResults(input.value));
input?.addEventListener('keydown', (e) => {
  const links = $$<HTMLAnchorElement>('a', results!);
  if (!links.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    links[active]?.classList.remove('active');
    active = (active + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
    links[active].classList.add('active');
    links[active].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    links[active]?.click();
  }
});
dialog?.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

/* Toast ---------------------------------------------------------------------- */
const toastEl = $('#toast');
let toastTimer: number | undefined;
export function toast(html: string) {
  if (!toastEl) return;
  toastEl.innerHTML = html;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 3200);
}

/* Saved gift list -------------------------------------------------------------- */
const counters = $$('[data-wish-count]');
function syncSaved() {
  const ids = wishlist.all();
  counters.forEach((c) => {
    c.textContent = ids.length ? String(ids.length) : '';
    c.classList.toggle('has', ids.length > 0);
  });
  $$('[data-save]').forEach((b) => b.setAttribute('aria-pressed', String(ids.includes(b.dataset.save!))));
}
document.addEventListener('click', (e) => {
  const btn = (e.target as Element).closest<HTMLElement>('[data-save]');
  if (!btn) return;
  e.preventDefault();
  const id = btn.dataset.save!;
  const saved = wishlist.toggle(id);
  btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
  counters.forEach((c) => { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); });
  toast(saved ? `Saved to your gift list <a href="/wishlist/">View list</a>` : 'Removed from your gift list');
  track('save_to_list', { product_id: id, action: saved ? 'add' : 'remove' });
});
wishlist.subscribe(syncSaved);
document.addEventListener('electroys:sync', syncSaved);
syncSaved();

/* Analytics: outbound product clicks --------------------------------------------- */
const privacyOptOut = (navigator as any).globalPrivacyControl === true || navigator.doNotTrack === '1';
export function track(event: string, params: Record<string, string>) {
  if (privacyOptOut || typeof (window as any).gtag !== 'function') return;
  try { (window as any).gtag('event', event, params); } catch { /* never block navigation */ }
}
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-outbound]');
  if (!a) return;
  let domain = '';
  try { domain = new URL(a.href).hostname; } catch { /* ignore */ }
  track('product_outbound_click', {
    product_id: a.dataset.outbound!,
    product_name: (a.dataset.name ?? '').slice(0, 100),
    surface: a.dataset.surface ?? 'page',
    link_domain: domain,
    outbound: 'true',
  });
});

/* Horizontal rails ------------------------------------------------------------- */
$$('[data-rail]').forEach((wrap) => {
  const rail = $('.rail', wrap)!;
  const prev = $<HTMLButtonElement>('.prev', wrap);
  const next = $<HTMLButtonElement>('.next', wrap);
  const step = () => rail.clientWidth * 0.85;
  const update = () => {
    if (prev) prev.disabled = rail.scrollLeft < 8;
    if (next) next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8;
  };
  prev?.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
  next?.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
  rail.addEventListener('scroll', update, { passive: true });
  update();
});

/* Reveal on scroll: handled by revealWatch() in magazine.ts */

/* Newsletter (posts to the existing Google Apps Script list) ------------------------- */
$$<HTMLFormElement>('[data-newsletter]').forEach((form) => {
  const status = $('.form-status', form)!;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const btn = $<HTMLButtonElement>('button[type=submit]', form)!;
    btn.disabled = true;
    status.className = 'form-status';
    status.textContent = 'Subscribing…';
    try {
      await fetch(form.action, { method: 'POST', mode: 'no-cors', body: new FormData(form) });
      status.className = 'form-status ok';
      status.textContent = 'Thanks! Check your inbox to confirm your subscription.';
      form.reset();
      track('newsletter_signup', { surface: form.dataset.newsletter ?? 'page' });
    } catch {
      status.className = 'form-status err';
      status.textContent = 'Something went wrong. Please try again in a moment.';
    } finally {
      btn.disabled = false;
    }
  });
});

/* Broken photo → fall back to the product's illustration --------------------------- */
document.addEventListener('error', (e) => {
  const img = e.target as HTMLImageElement;
  if (img?.tagName === 'IMG' && img.dataset.fallback && img.src !== new URL(img.dataset.fallback, location.href).href) {
    img.src = img.dataset.fallback;
    img.closest('.is-photo')?.classList.remove('is-photo');
  }
}, true);

/* Compare tray ------------------------------------------------------------------------ */
const tray = $('[data-compare-tray]');
async function syncCompare() {
  const ids = compare.all();
  $$('[data-compare]').forEach((b) => b.setAttribute('aria-pressed', String(ids.includes(b.dataset.compare!))));
  if (!tray) return;
  const onComparePage = location.pathname.startsWith('/compare');
  tray.hidden = ids.length === 0 || onComparePage;
  document.body.classList.toggle('has-compare-tray', !tray.hidden);
  if (tray.hidden) return;
  const index = await loadIndex();
  $('[data-compare-n]', tray)!.textContent = `(${ids.length})`;
  const go = $<HTMLAnchorElement>('[data-compare-go]', tray)!;
  go.href = `/compare/?ids=${ids.join(',')}`;
  go.classList.toggle('is-disabled', ids.length < 2);
  go.setAttribute('aria-disabled', String(ids.length < 2));
  const slots = $('[data-compare-slots]', tray)!;
  slots.innerHTML = Array.from({ length: COMPARE_MAX }, (_, i) => {
    const p = index.find((x) => x.id === ids[i]);
    return p
      ? `<div class="compare-slot"><img src="${esc(p.img)}" alt="" class="${p.ph ? 'is-photo' : ''}"><span>${esc(p.t)}</span><button type="button" data-compare-remove="${p.id}" aria-label="Remove ${esc(p.t)} from compare">×</button></div>`
      : `<div class="compare-slot empty"><span>${i === ids.length ? 'Add another' : ''}</span></div>`;
  }).join('');
}
document.addEventListener('click', (e) => {
  const t = e.target as Element;
  const btn = t.closest<HTMLElement>('[data-compare]');
  if (btn) {
    e.preventDefault();
    const r = compare.toggle(btn.dataset.compare!);
    if (r === 'full') toast(`You can compare up to ${COMPARE_MAX} at a time. Remove one first.`);
    else track('compare_toggle', { product_id: btn.dataset.compare!, action: r });
    return;
  }
  const rm = t.closest<HTMLElement>('[data-compare-remove]');
  if (rm) compare.remove(rm.dataset.compareRemove!);
  if (t.closest('[data-compare-clear]')) compare.clear();
  const go = t.closest<HTMLAnchorElement>('[data-compare-go].is-disabled');
  if (go) { e.preventDefault(); toast('Pick at least two products to compare.'); }
});
compare.subscribe(syncCompare);
document.addEventListener('electroys:sync', syncCompare);
syncCompare();

/* Editorial motion (headline reveals, tilt, magnetic buttons, pinned features) */
initMagazine();

/* Sharing ------------------------------------------------------------------------- */
document.addEventListener('click', async (e) => {
  const t = e.target as Element;
  const ch = t.closest<HTMLElement>('[data-share-channel]');
  const bar = t.closest<HTMLElement>('[data-share-surface]');
  if (ch) track('share', { method: ch.dataset.shareChannel!, surface: bar?.dataset.shareSurface ?? 'page' });
  const native = t.closest<HTMLButtonElement>('[data-share-native]');
  if (!native) return;
  const url = native.dataset.shareUrl!;
  const text = native.dataset.shareText ?? document.title;
  track('share', { method: 'native', surface: bar?.dataset.shareSurface ?? 'page' });
  try {
    if (navigator.share) await navigator.share({ title: document.title, text, url });
    else { await navigator.clipboard.writeText(url); toast('Link copied. Paste it anywhere to share.'); }
  } catch { /* share sheet dismissed */ }
});

/* Living circuit board: loaded only on pages that have one ------------------------ */
const boards = document.querySelectorAll<HTMLCanvasElement>('[data-circuit]');
if (boards.length) import('./circuit-field').then(({ mountCircuitField }) => boards.forEach(mountCircuitField));

/* Cinematic layer (smooth scroll, decoding labels, velocity ticker, cursor ring) */
initCinema();
