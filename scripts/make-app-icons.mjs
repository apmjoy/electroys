// Renders the installable-app icons from the logo: deep-navy tile, soft glow,
// logo centered inside the 80% "safe zone" so Android's masked shapes (circle,
// squircle) never crop it. Run after changing the logo: node scripts/make-app-icons.mjs
import sharp from 'sharp';

const logo = new URL('../public/favicon-192.png', import.meta.url).pathname;
const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname;

async function icon(size, file) {
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <radialGradient id="g" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#1b3a7a"/><stop offset=".55" stop-color="#0b1b33"/><stop offset="1" stop-color="#050b17"/></radialGradient>
      <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#2e8bff" stop-opacity=".35"/><stop offset="1" stop-color="#2e8bff" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.42}" fill="url(#glow)"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.36}" fill="none" stroke="#ffb915" stroke-opacity=".35" stroke-width="${Math.max(1, size * 0.008)}" stroke-dasharray="${size * 0.012} ${size * 0.03}" stroke-linecap="round"/>
  </svg>`);
  const inner = Math.round(size * 0.7);
  const mark = await sharp(logo).resize(inner, inner, { kernel: 'lanczos3' }).png().toBuffer();
  await sharp(bg).composite([{ input: mark, gravity: 'center' }]).png({ compressionLevel: 9 }).toFile(out(file));
  console.log(`wrote public/${file}`);
}

await icon(512, 'icon-512.png');
await icon(192, 'icon-192.png');
await icon(180, 'apple-touch-icon.png');
