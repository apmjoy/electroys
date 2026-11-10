// Compare list: up to 3 products, kept in localStorage (memory fallback).
const KEY = 'electroys.compare.v1';
export const COMPARE_MAX = 3;
let memory: string[] = [];
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && /^[a-z0-9-]{1,80}$/.test(x)).slice(0, COMPARE_MAX) : [];
  } catch {
    return memory;
  }
}
function write(ids: string[]) {
  memory = ids;
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* memory fallback */ }
  listeners.forEach((l) => l());
}

export const compare = {
  all: read,
  /** Returns 'added' | 'removed' | 'full'. */
  toggle(id: string): 'added' | 'removed' | 'full' {
    const ids = read();
    if (ids.includes(id)) { write(ids.filter((x) => x !== id)); return 'removed'; }
    if (ids.length >= COMPARE_MAX) return 'full';
    write([...ids, id]);
    return 'added';
  },
  remove(id: string) { write(read().filter((x) => x !== id)); },
  clear() { write([]); },
  subscribe(l: () => void) { listeners.add(l); },
};
window.addEventListener('storage', (e) => { if (e.key === KEY) listeners.forEach((l) => l()); });
