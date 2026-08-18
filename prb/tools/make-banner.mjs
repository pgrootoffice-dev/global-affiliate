/* Builds prb/assets/prb-x-banner.svg (1500x500) from the same brand system
 * the board uses: geometric neon linework + crowned doodle face + graffiti lockup.
 * Run:  node prb/tools/make-banner.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const C = require(path.join(here, '..', 'assets', 'prb-core.js'));

const W = 1500, H = 500;

const neon = C.neonLineworkSVG({ width: W, height: H, seed: 31337, rays: 26, tris: 14, nodes: 20 })
  .replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

const DOODLE = `
<g transform="translate(1075 78) scale(2.35)">
  <g filter="url(#rough)" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M25 52 L31 14 L49 36 L66 8 L82 35 L101 17 L104 55" stroke="#00E599" stroke-width="5"/>
    <circle cx="66" cy="6" r="3.4" fill="#FF2D9E" stroke="none"/>
    <path d="M24 66 C21 42, 42 30, 64 31 C 88 32, 108 42, 106 68 C 104 96, 86 114, 62 112 C 38 110, 27 92, 24 66 Z" stroke="#F2F6FA" stroke-width="5"/>
    <path d="M42 66 C42 58, 50 55, 55 60 C 60 65, 55 74, 48 73 C 44 72, 42 70, 42 66 Z" stroke="#F2F6FA" stroke-width="4"/>
    <circle cx="50" cy="66" r="3.6" fill="#8247E5" stroke="none"/>
    <path d="M76 57 L92 71 M92 57 L76 71" stroke="#F2F6FA" stroke-width="4.6"/>
    <path d="M42 88 C 50 98, 60 96, 68 89 C 76 82, 86 86, 90 94" stroke="#FF2D9E" stroke-width="4.6"/>
    <path d="M62 92 L65 99 L69 92" stroke="#F2F6FA" stroke-width="3"/>
    <path d="M34 124 C 52 116, 70 130, 92 120" stroke="#00E599" stroke-width="3.2" stroke-opacity=".85"/>
  </g>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="120" cy="30" r="7" stroke="#FF2D9E" stroke-width="2.6"/>
    <path d="M12 108 L22 92 L30 110 Z" stroke="#8247E5" stroke-width="2.6"/>
    <path d="M112 96 L124 108 M124 96 L112 108" stroke="#00E599" stroke-width="2.8"/>
  </g>
</g>`;

/* graffiti lockup: per-letter jitter, same rhythm as the web wordmark */
const JITTER = [-4, 2.5, -1.5, 3.5, -2.5, 1.5, -3, 2, -2, 3];
function graffiti(word, x, y, size, fill) {
  let cursor = x, out = '';
  [...word].forEach((ch, i) => {
    const rot = JITTER[i % JITTER.length];
    const dy = (i % 2 ? -1 : 1) * (size * 0.03);
    out += `<text x="${cursor.toFixed(1)}" y="${(y + dy).toFixed(1)}" font-size="${size}" fill="${fill}" ` +
      `font-family="Helvetica, Arial, sans-serif" font-weight="900" letter-spacing="-2" ` +
      `transform="rotate(${rot} ${cursor.toFixed(1)} ${y.toFixed(1)})">${ch}</text>`;
    cursor += size * (ch === 'I' ? 0.34 : ch === 'L' ? 0.6 : 0.68);
  });
  return out;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <filter id="rough" x="-25%" y="-25%" width="150%" height="150%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <radialGradient id="glowG" cx="18%" cy="20%" r="70%">
      <stop offset="0%" stop-color="#00E599" stop-opacity=".10"/>
      <stop offset="100%" stop-color="#00E599" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowP" cx="88%" cy="80%" r="60%">
      <stop offset="0%" stop-color="#8247E5" stop-opacity=".14"/>
      <stop offset="100%" stop-color="#8247E5" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#05070A"/>
  <rect width="${W}" height="${H}" fill="url(#glowG)"/>
  <rect width="${W}" height="${H}" fill="url(#glowP)"/>
  <g opacity=".85">${neon}</g>

  ${graffiti('POLYGON', 300, 152, 100, '#FFFFFF')}
  ${graffiti('REALM', 328, 252, 100, '#00E599')}
  ${graffiti('BOARD', 310, 352, 100, '#FFFFFF')}

  <path d="M302 386 C 450 362, 610 406, 755 374 C 850 354, 930 382, 1000 366"
        fill="none" stroke="#FF2D9E" stroke-width="9" stroke-linecap="round"/>
  <path d="M320 406 C 460 388, 590 424, 730 398"
        fill="none" stroke="#00E599" stroke-width="5" stroke-linecap="round" stroke-opacity=".75"/>

  <text x="302" y="452" font-size="25" fill="#8492A3" font-family="Helvetica, Arial, sans-serif"
        font-weight="700" letter-spacing="6">STEPN WANTED BOARD · BUY ORDERS · PUBLICLY ANONYMOUS</text>

  ${DOODLE}

  <g fill="none" stroke-linecap="round">
    <path d="M960 120 L1000 160 M1000 120 L960 160" stroke="#FF2D9E" stroke-width="5"/>
    <circle cx="930" cy="330" r="16" stroke="#00E599" stroke-width="4"/>
    <path d="M1400 400 L1432 356 L1458 404 Z" stroke="#8247E5" stroke-width="4" stroke-linejoin="round"/>
    <path d="M1440 96 l7 15 16 2 -12 11 3 16 -14-8 -14 8 3-16 -12-11 16-2 Z" stroke="#FF2D9E" stroke-width="3.4" stroke-linejoin="round"/>
  </g>
</svg>
`;

const out = path.join(here, '..', 'assets', 'prb-x-banner.svg');
fs.writeFileSync(out, svg);
console.log('wrote', out, svg.length, 'bytes');
