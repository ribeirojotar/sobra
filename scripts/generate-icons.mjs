import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const appDir = join(__dirname, '..', 'app');

function svgIcon(size) {
  const r = Math.round(size * 0.18);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${r}" fill="#10b981"/>
    </svg>`
  );
}

async function gen(size, dest) {
  await sharp(svgIcon(size)).png().toFile(dest);
  console.log('  ok', dest);
}

await gen(192, join(publicDir, 'icon-192x192.png'));
await gen(512, join(publicDir, 'icon-512x512.png'));
await gen(180, join(appDir, 'apple-icon.png'));
console.log('Icons generated.');
