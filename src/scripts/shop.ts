// Client-side filtering for shop pages. Cards are server-rendered; this only
// shows/hides and reorders them, and mirrors state into the URL so filtered
// views can be bookmarked and shared.

const LABELS: Record<string, string> = {};

export function initShop() {
  const root = document.querySelector<HTMLElement>('[data-shop]');
  if (!root) return;
  const form = root.querySelector<HTMLFormElement>('[data-filter-form]')!;
  const grid = root.querySelector<HTMLElement>('[data-shop-grid]')!;
  const q = root.querySelector<HTMLInputElement>('[data-shop-q]')!;
  const sort = root.querySelector<HTMLSelectElement>('[data-shop-sort]')!;
  const empty = root.querySelector<HTMLElement>('[data-shop-empty]')!;
  const counts = document.querySelectorAll<HTMLElement>('[data-shop-count]');
  const noun = root.querySelector<HTMLElement>('[data-shop-noun]');
  const activeWrap = root.querySelector<HTMLElement>('[data-active-filters]')!;
  const filterCount = root.querySelector<HTMLElement>('[data-filter-count]');
  const cards = Array.from(grid.querySelectorAll<HTMLElement>('.card'));
  const original = [...cards];

  form.querySelectorAll<HTMLInputElement>('input').forEach((i) => {
    LABELS[`${i.name}:${i.value}`] = i.closest('label')?.textContent?.trim() ?? i.value;
  });

  // Mobile: move the same form into the bottom sheet so there is one source of truth.
  const sheet = document.querySelector<HTMLElement>('[data-sheet]');
  const sheetBody = sheet?.querySelector<HTMLElement>('[data-sheet-body]');
  const aside = form.parentElement!;
  const mq = matchMedia('(min-width: 1024px)');
  const place = () => { if (mq.matches) aside.appendChild(form); else sheetBody?.appendChild(form); };
  place();
  mq.addEventListener('change', place);
  const setSheet = (open: boolean) => {
    sheet?.classList.toggle('open', open);
    sheet?.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  document.querySelectorAll('[data-open-sheet]').forEach((b) => b.addEventListener('click', () => setSheet(true)));
  document.querySelectorAll('[data-close-sheet]').forEach((b) => b.addEventListener('click', () => setSheet(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setSheet(false); });

  // Restore state from the URL.
  const params = new URLSearchParams(location.search);
  form.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((i) => {
    const vals = params.getAll(i.name).flatMap((v) => v.split(','));
    i.checked = vals.includes(i.value);
  });
  q.value = params.get('q') ?? '';
  if (params.get('sort')) sort.value = params.get('sort')!;

  function state() {
    const s: Record<string, string[]> = {};
    form.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked').forEach((i) => (s[i.name] ??= []).push(i.value));
    return s;
  }

  const ATTR: Record<string, string> = { age: 'ages', interest: 'interests', budget: 'budget', occasion: 'occasions', screenfree: 'screenfree', pick: 'pick' };

  function apply(animate = true) {
    const s = state();
    const terms = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const card of cards) {
      let ok = true;
      for (const [key, vals] of Object.entries(s)) {
        const have = (card.dataset[ATTR[key]] ?? '').split(' ');
        // OR within a group, AND across groups.
        if (!vals.some((v) => have.includes(v))) { ok = false; break; }
      }
      if (ok && terms.length) ok = terms.every((t) => (card.dataset.search ?? '').includes(t));
      const was = !card.hidden;
      card.hidden = !ok;
      if (ok) {
        shown++;
        if (animate && !was) { card.classList.remove('enter'); void card.offsetWidth; card.classList.add('enter'); }
      }
    }

    // Sort
    const by = sort.value;
    const sorted = by === 'featured' ? original : [...cards].sort((a, b) => {
      const n = (el: HTMLElement, k: string) => Number(el.dataset[k] ?? 0);
      if (by === 'price-asc') return n(a, 'price') - n(b, 'price');
      if (by === 'price-desc') return n(b, 'price') - n(a, 'price');
      if (by === 'age-asc') return n(a, 'ageMin') - n(b, 'ageMin');
      if (by === 'age-desc') return n(b, 'ageMin') - n(a, 'ageMin');
      return (a.dataset.title ?? '').localeCompare(b.dataset.title ?? '');
    });
    sorted.forEach((c) => grid.appendChild(c));

    counts.forEach((c) => (c.textContent = String(shown)));
    if (noun) noun.textContent = shown === 1 ? 'pick' : 'picks';
    empty.hidden = shown > 0;
    grid.hidden = shown === 0;

    // Active filter chips
    const active = Object.entries(s).flatMap(([k, vs]) => vs.map((v) => ({ k, v })));
    if (filterCount) filterCount.textContent = active.length ? `(${active.length})` : '';
    activeWrap.innerHTML = '';
    for (const { k, v } of active) {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `${LABELS[`${k}:${v}`] ?? v} <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
      b.setAttribute('aria-label', `Remove filter ${LABELS[`${k}:${v}`] ?? v}`);
      b.addEventListener('click', () => {
        const input = form.querySelector<HTMLInputElement>(`input[name="${k}"][value="${v}"]`);
        if (input) input.checked = false;
        apply();
      });
      activeWrap.appendChild(b);
    }
    if (active.length > 1) {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'link-btn';
      c.textContent = 'Clear all';
      c.style.background = 'none';
      c.addEventListener('click', clear);
      activeWrap.appendChild(c);
    }

    // URL
    const next = new URLSearchParams();
    for (const [k, vs] of Object.entries(s)) next.set(k, vs.join(','));
    if (q.value.trim()) next.set('q', q.value.trim());
    if (sort.value !== 'featured') next.set('sort', sort.value);
    const qs = next.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }

  function clear() {
    form.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((i) => (i.checked = false));
    q.value = '';
    sort.value = 'featured';
    apply();
  }

  let t: number | undefined;
  form.addEventListener('change', () => apply());
  q.addEventListener('input', () => { clearTimeout(t); t = window.setTimeout(() => apply(), 120); });
  sort.addEventListener('change', () => apply(false));
  document.querySelectorAll('[data-shop-clear]').forEach((b) => b.addEventListener('click', clear));
  apply(false);
}
