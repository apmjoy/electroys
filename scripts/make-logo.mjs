// Renders every raster logo file from the master vector logo (public/logo.svg):
// favicons (16/32/48/192 + .ico), favicon.svg and logo-96.webp.
// Run after changing the logo, then: node scripts/make-app-icons.mjs && node scripts/make-og-image.mjs
import sharp from 'sharp';
import { copyFileSync, writeFileSync } from 'node:fs';

const pub = (name) => new URL(`../public/${name}`, import.meta.url).pathname;
const src = pub('logo.svg');
const png = (size) => sharp(src, { density: 1200 }).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer();

for (const size of [16, 32, 48, 192]) {
  writeFileSync(pub(`favicon-${size}.png`), await png(size));
  console.log(`wrote public/favicon-${size}.png`);
}
await sharp(src, { density: 1200 }).resize(96, 96).webp({ quality: 92 }).toFile(pub('logo-96.webp'));
console.log('wrote public/logo-96.webp');
copyFileSync(src, pub('favicon.svg'));
console.log('wrote public/favicon.svg');

// .ico = a small header + directory, then the PNGs themselves (supported everywhere since Vista).
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e); header.writeUInt8(s, e + 1); header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(images[i].length, e + 8); header.writeUInt32LE(offset, e + 12);
  offset += images[i].length;
});
writeFileSync(pub('favicon.ico'), Buffer.concat([header, ...images]));
console.log('wrote public/favicon.ico');
