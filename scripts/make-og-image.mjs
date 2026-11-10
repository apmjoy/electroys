// Renders the default social-share image (public/og-default.png).
// Run once after changing branding: node scripts/make-og-image.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const icon = readFileSync(new URL('../public/favicon-192.png', import.meta.url)).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf9f5"/><stop offset="1" stop-color="#e8effd"/></linearGradient>
  <radialGradient id="b" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#2e8bff" stop-opacity=".35"/><stop offset="1" stop-color="#2e8bff" stop-opacity="0"/></radialGradient>
  <radialGradient id="o" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#f26a1b" stop-opacity=".28"/><stop offset="1" stop-color="#f26a1b" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="630" fill="url(#g)"/>
<circle cx="1040" cy="120" r="320" fill="url(#b)"/>
<circle cx="980" cy="560" r="260" fill="url(#o)"/>
<g stroke="#1d5be0" stroke-width="6" fill="none" stroke-linecap="round" opacity=".18">
  <path d="M760 200H930L980 250"/><path d="M800 300H1010L1060 350"/><path d="M780 400H900L950 450"/>
</g>
<circle cx="980" cy="250" r="14" fill="#ffb915"/><circle cx="1060" cy="350" r="14" fill="#2fae5a"/><circle cx="950" cy="450" r="14" fill="#f26a1b"/>
<image href="data:image/png;base64,${icon}" x="80" y="80" width="96" height="96"/>
<text x="196" y="148" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="54" font-weight="800" fill="#123e9c" letter-spacing="-1">Electr<tspan fill="#f26a1b">o</tspan>ys</text>
<text x="80" y="330" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="76" font-weight="800" fill="#0b1b33" letter-spacing="-2">Gifts that spark</text>
<text x="80" y="420" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="76" font-weight="800" fill="#1d5be0" letter-spacing="-2">big ideas.</text>
<text x="80" y="500" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="30" fill="#33435c">Hand-picked STEM kits &amp; gifts for ages 3 to 18+</text>
</svg>`;
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(new URL('../public/og-default.png', import.meta.url).pathname);
console.log('wrote public/og-default.png');
