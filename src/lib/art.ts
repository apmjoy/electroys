import { ICONS } from './icons';
import { ageLabel, photoFor, type Product } from './products';
import type { IconName } from './taxonomy';

// Deterministic, original illustration for each product. Same id → same art,
// so cards look consistent between builds while every product stays distinct.

const TONES: Record<string, { solid: string; tint: string; deep: string; ink: string }> = {
  sun:   { solid: '#ffb915', tint: '#fff6dc', deep: '#ffe39a', ink: '#8a5a00' },
  leaf:  { solid: '#2fae5a', tint: '#e6f7eb', deep: '#bfe9cc', ink: '#1b6e38' },
  sky:   { solid: '#2e8bff', tint: '#e7f1ff', deep: '#c3dcff', ink: '#1557b0' },
  grape: { solid: '#7558f0', tint: '#efebff', deep: '#d4cbff', ink: '#4a32b3' },
  flame: { solid: '#f26a1b', tint: '#fff1e7', deep: '#ffd0b0', ink: '#c94d08' },
  coral: { solid: '#ff6b5b', tint: '#ffeceA', deep: '#ffc9c2', ink: '#b8392b' },
  rose:  { solid: '#e2508c', tint: '#fdebf3', deep: '#f8c2d9', ink: '#a32561' },
  night: { solid: '#2b3a8c', tint: '#e8ebfb', deep: '#c6cdf3', ink: '#1e2a6e' },
};
const ACCENTS = ['#ffb915', '#f26a1b', '#2fae5a', '#1d5be0'];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; };
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function pattern(kind: string, r: () => number, color: string): string {
  const out: string[] = [];
  if (kind === 'robotics' || kind === 'electronics') {
    for (let i = 0; i < 7; i++) {
      const y = 60 + r() * 480, x = r() < .5 ? -10 : 810, len = 120 + r() * 200, dir = x < 0 ? 1 : -1;
      const x2 = x + dir * len, y2 = y + (r() < .5 ? -1 : 1) * 60;
      out.push(`<path d="M${x} ${y}H${x2 - dir * 40}L${x2} ${y2}" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".35"/><circle cx="${x2}" cy="${y2}" r="10" fill="${ACCENTS[i % 4]}" opacity=".9"/>`);
    }
  } else if (kind === 'coding') {
    for (let i = 0; i < 14; i++) {
      const x = r() * 760, y = r() * 560, w = 40 + r() * 70;
      out.push(`<rect x="${x}" y="${y}" width="${w}" height="20" rx="10" fill="${i % 3 ? color : ACCENTS[i % 4]}" opacity="${i % 3 ? .22 : .7}"/>`);
    }
  } else if (kind === 'science') {
    for (let i = 0; i < 16; i++) {
      const cx = r() * 800, cy = r() * 600, rad = 8 + r() * 34;
      out.push(`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${i % 4 ? color : ACCENTS[i % 4]}" stroke-width="5" opacity="${i % 4 ? .3 : .75}"/>`);
    }
  } else if (kind === 'space-nature') {
    for (let i = 0; i < 40; i++) {
      const cx = r() * 800, cy = r() * 600, rad = 1.5 + r() * 4;
      out.push(`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${i % 7 ? color : ACCENTS[i % 4]}" opacity="${.3 + r() * .5}"/>`);
    }
    out.push(`<circle cx="${100 + r() * 120}" cy="${420 + r() * 80}" r="46" fill="${ACCENTS[0]}" opacity=".8"/>`);
  } else if (kind === 'puzzles-logic') {
    const s = 34;
    for (let i = 0; i < 9; i++) {
      const x = r() * 740, y = r() * 540, c = i % 3 ? color : ACCENTS[i % 4], o = i % 3 ? .25 : .75;
      const shape = i % 3;
      if (shape === 0) out.push(`<path d="M${x} ${y}h${s * 3}v${s}h${-s}v${s}h${-s}v${-s}h${-s}z" fill="${c}" opacity="${o}"/>`);
      else if (shape === 1) out.push(`<rect x="${x}" y="${y}" width="${s * 2}" height="${s * 2}" rx="6" fill="${c}" opacity="${o}"/>`);
      else out.push(`<path d="M${x} ${y}h${s * 2}v${s}h${s}v${s}h${-s * 2}v${-s}h${-s}z" fill="${c}" opacity="${o}"/>`);
    }
  } else if (kind === 'art-design') {
    for (let i = 0; i < 6; i++) {
      const x = r() * 700, y = r() * 520;
      out.push(`<path d="M${x} ${y}c40 -50 120 -20 140 30s-40 90 -90 70 -90 -50 -50 -100z" fill="${i % 2 ? color : ACCENTS[i % 4]}" opacity="${i % 2 ? .25 : .6}"/>`);
    }
  } else {
    // engineering & building: dotted grid + bolts
    for (let x = 30; x < 800; x += 48) for (let y = 30; y < 600; y += 48) out.push(`<circle cx="${x}" cy="${y}" r="3" fill="${color}" opacity=".22"/>`);
    for (let i = 0; i < 5; i++) out.push(`<circle cx="${r() * 800}" cy="${r() * 600}" r="${14 + r() * 10}" fill="none" stroke="${ACCENTS[i % 4]}" stroke-width="7" opacity=".75"/>`);
  }
  return out.join('');
}

// Each product's first category sets its color, icon and background pattern.
const STYLE: Record<string, { tone: string; icon: IconName; pattern: string }> = {
  Robotics:          { tone: 'sky',   icon: 'robot',     pattern: 'robotics' },
  Coding:            { tone: 'grape', icon: 'code',      pattern: 'coding' },
  Electronics:       { tone: 'flame', icon: 'bolt',      pattern: 'electronics' },
  Science:           { tone: 'leaf',  icon: 'flask',     pattern: 'science' },
  Engineering:       { tone: 'night', icon: 'gear',      pattern: 'engineering' },
  Building:          { tone: 'sun',   icon: 'blocks',    pattern: 'engineering' },
  'Math & Logic':    { tone: 'coral', icon: 'puzzle',    pattern: 'puzzles-logic' },
  'Games & Puzzles': { tone: 'rose',  icon: 'dice',      pattern: 'puzzles-logic' },
  Space:             { tone: 'night', icon: 'telescope', pattern: 'space-nature' },
  Nature:            { tone: 'leaf',  icon: 'leaf',      pattern: 'space-nature' },
  'Art & Design':    { tone: 'rose',  icon: 'palette',   pattern: 'art-design' },
};

export function productArtSvg(p: Product): string {
  const style = STYLE[p.categories[0]] ?? STYLE.Building;
  const t = TONES[style.tone] ?? TONES.sky;
  const r = rng(hash(p.id));
  const iconPaths = ICONS[style.icon];
  const cx = 400 + (r() - .5) * 120;
  const cy = 290 + (r() - .5) * 60;
  const rot = Math.round((r() - .5) * 24);
  const ringR = 150 + r() * 20;
  const brand = esc(p.brand.toUpperCase());
  const age = esc(ageLabel(p).toUpperCase());
  const ageW = 30 + age.length * 11.5;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${esc(p.title)} illustration">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.tint}"/><stop offset="1" stop-color="${t.deep}"/></linearGradient>
<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="${t.ink}" flood-opacity=".28"/></filter>
</defs>
<rect width="800" height="600" fill="url(#bg)"/>
${pattern(style.pattern, r, t.solid)}
<circle cx="${cx}" cy="${cy}" r="${ringR + 70}" fill="url(#glow)"/>
<circle cx="${cx}" cy="${cy}" r="${ringR + 28}" fill="none" stroke="${t.solid}" stroke-width="3" stroke-dasharray="4 14" stroke-linecap="round" opacity=".55"/>
<g filter="url(#sh)"><circle cx="${cx}" cy="${cy}" r="${ringR}" fill="${t.solid}"/></g>
<circle cx="${cx - ringR * .35}" cy="${cy - ringR * .4}" r="${ringR * .5}" fill="#fff" opacity=".12"/>
<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(8.4) translate(-12 -12)" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${iconPaths}</g>
<circle cx="${cx + ringR * .78}" cy="${cy - ringR * .74}" r="20" fill="${ACCENTS[hash(p.id) % 4]}" stroke="#fff" stroke-width="6"/>
<text x="36" y="56" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="3" fill="${t.ink}" opacity=".85">${brand}</text>
<g transform="translate(${764 - ageW} 524)"><rect width="${ageW}" height="44" rx="22" fill="#fff" opacity=".92"/><text x="${ageW / 2}" y="29" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="19" font-weight="700" letter-spacing="1.5" fill="${t.ink}">${age}</text></g>
</svg>`;
}

/** Illustration URL: used when no photo exists, and as the photo fallback. */
export function illustrationUrl(p: Product): string {
  return `/art/${p.id}.svg`;
}

/** Best image for a product: real photo when available, otherwise its illustration. */
export function artUrl(p: Product): string {
  return photoFor(p)?.src ?? illustrationUrl(p);
}
