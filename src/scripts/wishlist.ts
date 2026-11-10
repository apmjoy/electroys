// Saved gift list. Lives in localStorage when available, in memory otherwise,
// and stays in sync across tabs.

const KEY = 'electroys.giftlist.v1';
type Listener = () => void;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string' && /^[a-z0-9-]{1,80}$/.test(x)).slice(0, 200) : [];
  } catch {
    return memory;
  }
}
let memory: string[] = [];
const listeners = new Set<Listener>();

function write(ids: string[]) {
  memory = ids;
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* memory fallback */ }
  listeners.forEach((l) => l());
}

export const wishlist = {
  all: (): string[] => read(),
  has: (id: string) => read().includes(id),
  toggle(id: string): boolean {
    const ids = read();
    const has = ids.includes(id);
    write(has ? ids.filter((x) => x !== id) : [...ids, id]);
    return !has;
  },
  set(ids: string[]) { write(ids); },
  clear() { write([]); },
  subscribe(l: Listener) { listeners.add(l); },
};

window.addEventListener('storage', (e) => { if (e.key === KEY) listeners.forEach((l) => l()); });
