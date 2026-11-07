// Builds app/opengraph-image.png (1200×630), the preview picture chat apps and social sites show
// when someone shares a link to the site. Next.js adds the og:image meta tags for it automatically.
// Run: node scripts/build-og-image.mjs   (re-run after changing the home background or the title)
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const W = 1200;
const H = 630;

const background = await sharp(`${root}public/backgrounds/home.webp`)
  .resize(W, H, { fit: "cover", position: "centre" })
  .blur(2)
  .toBuffer();

// Same colors as globals.css: --page #070b14, --series-1 #4cc3eb, --kind-item #b7a0f2, pink #f59ac8
const overlay = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#070b14" stop-opacity="0.45"/>
      <stop offset="0.55" stop-color="#070b14" stop-opacity="0.64"/>
      <stop offset="1" stop-color="#070b14" stop-opacity="0.92"/>
    </linearGradient>
    <linearGradient id="title" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4cc3eb"/>
      <stop offset="0.5" stop-color="#b7a0f2"/>
      <stop offset="0.8" stop-color="#f59ac8"/>
      <stop offset="1" stop-color="#4cc3eb"/>
    </linearGradient>
    <linearGradient id="ruleL" x1="0" x2="1"><stop offset="0" stop-color="#4cc3eb" stop-opacity="0"/><stop offset="1" stop-color="#4cc3eb"/></linearGradient>
    <linearGradient id="ruleR" x1="1" x2="0"><stop offset="0" stop-color="#4cc3eb" stop-opacity="0"/><stop offset="1" stop-color="#4cc3eb"/></linearGradient>
    <filter id="glow" x="-20%" y="-50%" width="140%" height="200%">
      <feGaussianBlur stdDeviation="14" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#fade)"/>
  <!-- hazard band along the top, like the site's top bar -->
  <pattern id="stripes" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="8" height="16" fill="#4cc3eb" fill-opacity="0.6"/>
  </pattern>
  <rect width="100%" height="8" fill="url(#stripes)"/>

  <rect x="${W / 2 - 350}" y="214" width="110" height="2" fill="url(#ruleL)"/>
  <rect x="${W / 2 + 240}" y="214" width="110" height="2" fill="url(#ruleR)"/>
  <text x="50%" y="222" text-anchor="middle" font-family="Consolas, 'Cascadia Mono', monospace" font-size="24"
        letter-spacing="7" fill="#4cc3eb">ARKNIGHTS · DATABASE</text>

  <text x="50%" y="345" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-weight="900"
        font-size="124" letter-spacing="8" fill="url(#title)" filter="url(#glow)">ROSMEOWTIS</text>

  <text x="50%" y="420" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="32"
        fill="#dbe4f0">Integrated Strategies relics, buffs, debuffs &amp; items</text>
  <text x="50%" y="466" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="26"
        fill="#bcc8d8">Every theme, including CN-only · English · 日本語 · 中文</text>

  <text x="50%" y="${H - 44}" text-anchor="middle" font-family="Consolas, 'Cascadia Mono', monospace" font-size="24"
        letter-spacing="3" fill="#8fa0b8">creeperkung.github.io</text>
</svg>`;

await sharp(background)
  .composite([{ input: Buffer.from(overlay) }])
  .png({ compressionLevel: 9 })
  .toFile(`${root}app/opengraph-image.png`);

console.log("wrote app/opengraph-image.png");
