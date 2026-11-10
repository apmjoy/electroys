// "Light it up": rendering and input for the tap-to-rotate circuit puzzle.
// The rules live in circuit-logic.ts.
import { buzz } from './site';
import { DIRS, LEVELS, N, E, S, W, buildLevel, key, powered, type Tile } from './circuit-logic';

/* ─── Rendering ─────────────────────────────────────────────────────────── */
const ARM: Record<number, string> = { [N]: 'M50 50V0', [E]: 'M50 50H100', [S]: 'M50 50V100', [W]: 'M50 50H0' };
function tileSvg(t: Tile): string {
  if (t.kind === 'empty') return '';
  const arms = DIRS.filter((d) => t.base & d.bit).map((d) => ARM[d.bit]).join('');
  let center = '<circle cx="50" cy="50" r="9" class="node"/>';
  if (t.kind === 'battery') center = '<rect x="26" y="30" width="48" height="40" rx="8" class="cell"/><path d="M40 50h20M50 40v20" class="plus"/>';
  if (t.kind === 'bulb') center = '<circle cx="50" cy="50" r="24" class="bulb"/><path d="M42 50q8-10 16 0" class="filament"/>';
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${arms}" class="wire-bg"/><path d="${arms}" class="wire"/>${center}</svg>`;
}

export function mountCircuitGame(root: HTMLElement) {
  const board = root.querySelector<HTMLElement>('[data-board]')!;
  const levelEl = root.querySelector<HTMLElement>('[data-level]')!;
  const tapsEl = root.querySelector<HTMLElement>('[data-taps]')!;
  const win = root.querySelector<HTMLElement>('[data-win]')!;
  const winText = root.querySelector<HTMLElement>('[data-win-text]')!;
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-next]')!;
  let li = 0, grid: Tile[][] = [], taps = 0, solved = false;

  const start = (n: number) => {
    li = n; taps = 0; solved = false;
    grid = buildLevel(LEVELS[li]);
    const cols = LEVELS[li].size[1];
    board.style.setProperty('--cols', String(cols));
    board.innerHTML = '';
    grid.forEach((row, r) => row.forEach((t, c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `tile tile-${t.kind}`;
      b.dataset.r = String(r); b.dataset.c = String(c);
      b.innerHTML = tileSvg(t);
      b.style.setProperty('--rot', `${t.rot * 90}deg`);
      b.setAttribute('aria-label', t.kind === 'wire' ? `Wire, row ${r + 1} column ${c + 1}. Tap to rotate.` : t.kind === 'battery' ? 'Battery' : t.kind === 'bulb' ? 'Bulb' : 'Empty');
      if (t.kind !== 'wire') b.disabled = true;
      board.appendChild(b);
    }));
    levelEl.textContent = `Level ${li + 1} of ${LEVELS.length}`;
    tapsEl.textContent = '0 taps';
    win.hidden = true;
    root.classList.remove('is-won');
    refresh();
  };

  const refresh = () => {
    const on = powered(grid);
    board.querySelectorAll<HTMLElement>('.tile').forEach((el) => el.classList.toggle('on', on.has(`${el.dataset.r},${el.dataset.c}`)));
    const bulb = LEVELS[li].path.at(-1)!;
    if (on.has(key(bulb)) && !solved) {
      solved = true;
      root.classList.add('is-won');
      buzz([20, 50, 20, 50, 80]);
      const last = li === LEVELS.length - 1;
      winText.textContent = last ? `You lit every bulb. Circuit master! ⚡` : `Lit in ${taps} tap${taps === 1 ? '' : 's'}!`;
      nextBtn.textContent = last ? 'Play again' : 'Next level →';
      window.setTimeout(() => { win.hidden = false; }, 650);
      (window as any).gtag?.('event', 'circuit_level_complete', { level: String(li + 1), taps: String(taps) });
    }
  };

  board.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('.tile-wire');
    if (!b || solved) return;
    const t = grid[Number(b.dataset.r)][Number(b.dataset.c)];
    t.rot += 1; // keep counting up so the CSS rotation always turns clockwise
    b.style.setProperty('--rot', `${t.rot * 90}deg`);
    taps++;
    tapsEl.textContent = `${taps} tap${taps === 1 ? '' : 's'}`;
    buzz(6);
    refresh();
  });
  nextBtn.addEventListener('click', () => start(li === LEVELS.length - 1 ? 0 : li + 1));
  root.querySelector('[data-reset]')?.addEventListener('click', () => start(li));
  start(0);
}
