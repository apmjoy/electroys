// Social share images (1200×630 JPEG) rendered at build time with sharp.
// These are what people see in WhatsApp / Facebook before they tap a link,
// so each product and guide gets its own: real photo, name, age, price, brand.
import sharp from 'sharp';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const W = 1200, H = 630;
const PUBLIC = join(process.cwd(), 'public');
const FONT = "'Helvetica Neue', Helvetica, 'Liberation Sans', 'DejaVu Sans', Arial, sans-serif";
const SERIF = "Georgia, 'Liberation Serif', 'DejaVu Serif', serif";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Greedy word wrap by an approximate character budget. */
function wrap(text: string, max: number, lines: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/)) {
    if ((cur + ' ' + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  if (out.length > lines) { out.length = lines; out[lines - 1] = out[lines - 1].replace(/\s*\S*$/, '') + '…'; }
  return out;
}

function background(): string {
  // Static echo of the live circuit board: traces, pads and a few glowing pulses.
  let traces = '';
  const rnd = (i: number) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
  for (let i = 0; i < 26; i++) {
    const y = 40 + Math.floor(rnd(i) * 14) * 40, x = Math.floor(rnd(i + 99) * 28) * 40, len = 80 + Math.floor(rnd(i + 7) * 5) * 40;
    const c = ['#ffb915', '#f26a1b', '#2fae5a', '#3f8cff'][i % 4];
    traces += `<path d="M${x} ${y}h${len}l40 40" stroke="#1d3a78" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>`;
    traces += `<circle cx="${x + len + 40}" cy="${y + 40}" r="7" fill="#1d3a78"/>`;
    if (i % 3 === 0) traces += `<path d="M${x + len * 0.4} ${y}h${len * 0.3}" stroke="${c}" stroke-width="5" stroke-linecap="round" opacity=".9"/>`;
  }
  return `<defs>
    <radialGradient id="g1" cx=".85" cy=".1" r=".7"><stop offset="0" stop-color="#1d3f8f" stop-opacity=".9"/><stop offset="1" stop-color="#050b17" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx=".1" cy="1" r=".6"><stop offset="0" stop-color="#f26a1b" stop-opacity=".25"/><stop offset="1" stop-color="#050b17" stop-opacity="0"/></radialGradient>
    <linearGradient id="sun" x1="0" x2="1"><stop offset="0" stop-color="#ffb915"/><stop offset=".6" stop-color="#ff8a3d"/><stop offset="1" stop-color="#ff5e9c"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#050b17"/>${traces}
  <rect width="${W}" height="${H}" fill="url(#g1)"/><rect width="${W}" height="${H}" fill="url(#g2)"/>`;
}

function brandRow(y: number): string {
  return `<text x="640" y="${y}" font-family="${FONT}" font-size="30" font-weight="800" fill="#ffffff" letter-spacing="-0.5">Electr<tspan fill="#f26a1b">o</tspan>ys</text>
  <text x="790" y="${y}" font-family="${FONT}" font-size="22" fill="#9fb3d8">· electroys.com</text>`;
}

async function cardImage(src: Buffer, w: number, h: number, pad = 34): Promise<Buffer> {
  const inner = await sharp(src).flatten({ background: '#ffffff' }).resize(w - pad * 2, h - pad * 2, { fit: 'contain', background: '#ffffff' }).toBuffer();
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="34" fill="#fff"/></svg>`);
  return sharp({ create: { width: w, height: h, channels: 4, background: '#ffffff' } })
    .composite([{ input: inner, left: pad, top: pad }, { input: mask, blend: 'dest-in' }])
    .png().toBuffer();
}

export function readImage(publicPath: string): Buffer | null {
  const file = join(PUBLIC, publicPath.replace(/^\//, ''));
  return existsSync(file) ? readFileSync(file) : null;
}

interface ProductOg { title: string; kicker: string; price?: string | null; image: Buffer }

export async function productOg(o: ProductOg): Promise<Buffer> {
  // ~520px of room: at 50px bold that's roughly 17 characters per line.
  const lines = wrap(o.title, 17, 3);
  const titleY = 236 - (lines.length - 1) * 28;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${background()}
    <text x="640" y="${titleY - 70}" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="3" fill="#ffb915">${esc(o.kicker.toUpperCase())}</text>
    ${lines.map((l, i) => `<text x="640" y="${titleY + i * 58}" font-family="${FONT}" font-size="50" font-weight="800" letter-spacing="-1.2" fill="#ffffff">${esc(l)}</text>`).join('')}
    ${o.price ? `<rect x="640" y="${titleY + lines.length * 58 + 8}" width="${40 + o.price.length * 17}" height="58" rx="29" fill="url(#sun)"/>
      <text x="660" y="${titleY + lines.length * 58 + 47}" font-family="${FONT}" font-size="30" font-weight="800" fill="#0b1b33">${esc(o.price)}</text>` : ''}
    <text x="640" y="532" font-family="${SERIF}" font-size="30" font-style="italic" fill="#c9d5ea">Gifts that spark big ideas.</text>
    ${brandRow(580)}
  </svg>`;
  const card = await cardImage(o.image, 520, 520);
  return sharp(Buffer.from(svg))
    .composite([{ input: card, left: 64, top: 55 }])
    .jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

interface CollectionOg { title: string; kicker: string; count: number; images: Buffer[] }

export async function collectionOg(o: CollectionOg): Promise<Buffer> {
  const lines = wrap(o.title, 17, 3);
  const titleY = 240 - (lines.length - 1) * 30;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${background()}
    <text x="640" y="${titleY - 70}" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="3" fill="#ffb915">${esc(o.kicker.toUpperCase())}</text>
    ${lines.map((l, i) => `<text x="640" y="${titleY + i * 58}" font-family="${FONT}" font-size="50" font-weight="800" letter-spacing="-1.2" fill="#ffffff">${esc(l)}</text>`).join('')}
    <text x="640" y="${titleY + lines.length * 58 + 30}" font-family="${SERIF}" font-size="34" font-style="italic" fill="#ffb915">${o.count} hand-picked gifts</text>
    ${brandRow(580)}
  </svg>`;
  const imgs = o.images.slice(0, 4);
  const comps: sharp.OverlayOptions[] = [];
  const pos = [[64, 55], [324, 55], [64, 315], [324, 315]];
  for (let i = 0; i < imgs.length; i++) comps.push({ input: await cardImage(imgs[i], 250, 250, 16), left: pos[i][0], top: pos[i][1] });
  return sharp(Buffer.from(svg)).composite(comps).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}
