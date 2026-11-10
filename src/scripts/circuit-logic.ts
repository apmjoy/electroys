// Rules for the "Light it up" circuit puzzle (no DOM, so it can be unit-tested).
//
// Each level is a path of wire tiles from a battery to a bulb, plus decoys.
// Path tiles start rotated wrong; tapping turns a tile 90° clockwise. Current
// flows from the battery through every tile whose ends line up.

// Connection bits, clockwise: N=1, E=2, S=4, W=8.
export const N = 1, E = 2, S = 4, W = 8;
export const DIRS = [
  { bit: N, dr: -1, dc: 0, opp: S },
  { bit: E, dr: 0, dc: 1, opp: W },
  { bit: S, dr: 1, dc: 0, opp: N },
  { bit: W, dr: 0, dc: -1, opp: E },
];
/** Rotate a connection mask clockwise by `r` quarter turns. */
export function rotate(mask: number, r: number): number {
  r = ((r % 4) + 4) % 4;
  return ((mask << r) | (mask >> (4 - r))) & 15;
}

export type Cell = [number, number];
export interface Level { size: [number, number]; path: Cell[] }

// Hand-designed solution paths, battery first, bulb last.
export const LEVELS: Level[] = [
  { size: [3, 3], path: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]] },
  { size: [4, 4], path: [[0, 0], [1, 0], [1, 1], [1, 2], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3]] },
  { size: [5, 5], path: [[2, 0], [2, 1], [1, 1], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [2, 2], [3, 2], [4, 2], [4, 3], [4, 4]] },
  { size: [5, 5], path: [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [2, 1], [1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 4], [4, 4]] },
];

export interface Tile { kind: 'battery' | 'bulb' | 'wire' | 'empty'; base: number; rot: number }

function dirBetween(a: Cell, b: Cell): number {
  const d = DIRS.find((x) => a[0] + x.dr === b[0] && a[1] + x.dc === b[1]);
  if (!d) throw new Error(`cells not adjacent: ${a} → ${b}`);
  return d.bit;
}

/** Build a level: correct masks on the path, decoys elsewhere, path tiles scrambled. */
export function buildLevel(level: Level, rand: () => number = Math.random): Tile[][] {
  const [rows, cols] = level.size;
  const grid: Tile[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ kind: 'empty' as const, base: 0, rot: 0 })));
  level.path.forEach((cell, i) => {
    let mask = 0;
    if (i > 0) mask |= dirBetween(cell, level.path[i - 1]);
    if (i < level.path.length - 1) mask |= dirBetween(cell, level.path[i + 1]);
    const kind = i === 0 ? 'battery' : i === level.path.length - 1 ? 'bulb' : 'wire';
    // Wires get a wrong starting rotation; battery and bulb stay fixed.
    const rot = kind === 'wire' ? 1 + Math.floor(rand() * 3) : 0;
    grid[cell[0]][cell[1]] = { kind, base: mask, rot };
  });
  const decoys = [N | S, N | E, N | E | S, N | E];
  for (const row of grid) for (const t of row) {
    if (t.kind !== 'empty') continue;
    if (rand() < 0.85) { t.kind = 'wire'; t.base = decoys[Math.floor(rand() * decoys.length)]; t.rot = Math.floor(rand() * 4); }
  }
  // Straight wires look the same after a half turn; make sure the puzzle isn't already solved.
  if (powered(grid).has(key(level.path.at(-1)!))) {
    const first = grid[level.path[1][0]][level.path[1][1]];
    first.rot = (first.rot + 1) % 4;
  }
  return grid;
}

export const key = (c: Cell) => `${c[0]},${c[1]}`;
const maskOf = (t: Tile) => (t.kind === 'empty' ? 0 : rotate(t.base, t.rot));

/** Cells reached by current from the battery. */
export function powered(grid: Tile[][]): Set<string> {
  const start = grid.flatMap((row, r) => row.map((t, c) => [t, r, c] as const)).find(([t]) => t.kind === 'battery');
  const on = new Set<string>();
  if (!start) return on;
  const queue: Cell[] = [[start[1], start[2]]];
  on.add(key(queue[0]));
  while (queue.length) {
    const [r, c] = queue.shift()!;
    const m = maskOf(grid[r][c]);
    for (const d of DIRS) {
      if (!(m & d.bit)) continue;
      const nr = r + d.dr, nc = c + d.dc;
      const n = grid[nr]?.[nc];
      if (!n || !(maskOf(n) & d.opp) || on.has(key([nr, nc]))) continue;
      on.add(key([nr, nc]));
      queue.push([nr, nc]);
    }
  }
  return on;
}
