/* Acceptance checklist, run in a real browser at iPhone widths.
 *
 *   npm i playwright        (browsers already present in this environment)
 *   node prb/tools/check.mjs [screenshotDir]
 *
 * Walks the checklist end to end: colors, >= / <=, horn shapes, gem geometry,
 * tab switching, both forms, sheet open/close, sticky CTA overlap, overflow.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const URL = 'file://' + path.resolve(here, '..', 'index.html');
const SHOTS = process.argv[2] || path.resolve(here, '..', '.shots');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const ok = (name, pass, extra = '') => { results.push([pass ? 'PASS' : 'FAIL', name, extra]); };

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

await page.goto(URL);
await page.waitForTimeout(300);

ok('no console/page errors', errors.length === 0, errors.join(' | '));

/* --- layout --- */
const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
ok('no horizontal scroll (390px)', noHScroll,
   await page.evaluate(() => document.documentElement.scrollWidth + ' vs ' + window.innerWidth));

const doodle = await page.evaluate(() => {
  const el = document.querySelector('.doodle');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), paths: el.querySelectorAll('path,circle').length };
});
ok('crowned doodle face renders', !!doodle && doodle.w > 60 && doodle.paths > 8, JSON.stringify(doodle));

const neon = await page.evaluate(() => ({
  hero: document.querySelectorAll('#hero-neon svg line, #hero-neon svg polygon').length,
  page: document.querySelectorAll('#page-neon svg line, #page-neon svg polygon').length
}));
ok('geometric neon linework present', neon.hero > 20 && neon.page > 20, JSON.stringify(neon));

/* --- sneaker cards --- */
const cards = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('#list-sneakers .card').forEach(c => {
    out.push({
      sockets: c.querySelectorAll('.sockets .prb-socket').length,
      socketColors: [...c.querySelectorAll('.sockets .prb-socket')].map(s => s.style.color),
      socketLabels: [...c.querySelectorAll('.sockets .prb-socket text')].map(t => t.textContent),
      statColors: [...c.querySelectorAll('.statreq__item')].map(i => i.getAttribute('style')),
      statText: [...c.querySelectorAll('.statreq__val')].map(v => v.textContent),
      price: c.querySelector('.price__value').textContent.trim()
    });
  });
  return out;
});
ok('every sneaker card has 4 sockets', cards.every(c => c.sockets === 4), JSON.stringify(cards.map(c => c.sockets)));
ok('no digits inside socket graphics', cards.every(c => c.socketLabels.every(t => /^[ELCR]$/.test(t))),
   JSON.stringify(cards.map(c => c.socketLabels)));
ok('base stats use >= or ANY', cards.every(c => c.statText.every(t => t === 'ANY' || /^≥\d+\.\d$/.test(t))),
   JSON.stringify(cards[0].statText));
ok('max buy price uses <=', cards.every(c => c.price.startsWith('≤')), cards.map(c => c.price).join(' / '));

/* socket color <-> base stat color sync, driven by shared config */
const sync = await page.evaluate(() => {
  const STAT = window.PRBCore.STAT;
  const bad = [];
  document.querySelectorAll('#list-sneakers .card').forEach((c, ci) => {
    c.querySelectorAll('.sockets .prb-socket').forEach(s => {
      const label = s.querySelector('text');
      if (!label) return;
      const want = STAT[label.textContent].color.toLowerCase();
      const got = s.style.color.replace(/\s/g, '');
      const rgb = want.match(/\w\w/g).map(h => parseInt(h, 16));
      if (got !== `rgb(${rgb.join(',')})` && got !== want) bad.push(`card${ci} ${label.textContent} ${got} != ${want}`);
    });
    c.querySelectorAll('.statreq__item').forEach(i => {
      const k = i.dataset.stat;
      if (!i.getAttribute('style').includes(STAT[k].color)) bad.push(`card${ci} stat ${k} color drift`);
    });
  });
  return bad;
});
ok('socket / base-stat colors synchronized from shared config', sync.length === 0, sync.join(' | '));

/* --- socket key: horn variants 0-4 are shape only --- */
const horns = await page.evaluate(() =>
  [...document.querySelectorAll('#socket-key .key__cell')].map(c => ({
    solid: c.querySelectorAll('.prb-horn:not(.prb-horn--ghost)').length,
    ghost: c.querySelectorAll('.prb-horn--ghost').length
  })));
ok('horn variants ANY/0/1/2/3/4 all render', JSON.stringify(horns.map(h => h.solid)) === '[0,0,1,2,3,4]' && horns[0].ghost === 4,
   JSON.stringify(horns));
const anyDigits = await page.evaluate(() =>
  [...document.querySelectorAll('.prb-socket text')].filter(t => /\d/.test(t.textContent)).length);
ok('no horn numbers anywhere', anyDigits === 0, 'digit labels: ' + anyDigits);

await page.screenshot({ path: SHOTS + '/01-board-sneakers.png', fullPage: false });
await page.screenshot({ path: SHOTS + '/01b-board-sneakers-full.png', fullPage: true });

/* --- CTA must not cover I CAN SELL --- */
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(200);
const overlap = await page.evaluate(() => {
  const bar = document.querySelector('.cta-bar .cta').getBoundingClientRect();
  const btns = [...document.querySelectorAll('#list-sneakers .btn--sell')].map(b => b.getBoundingClientRect());
  const last = btns[btns.length - 1];
  return { covered: last.bottom > bar.top, lastBottom: Math.round(last.bottom), barTop: Math.round(bar.top) };
});
ok('sticky CTA does not cover I CAN SELL', !overlap.covered, JSON.stringify(overlap));
await page.screenshot({ path: SHOTS + '/02-bottom.png' });

/* --- GEMS tab --- */
await page.evaluate(() => window.scrollTo(0, 0));
await page.click('.tab[data-tab="gems"]');
await page.waitForTimeout(200);
const gemsOpen = await page.evaluate(() => ({
  visible: !document.querySelector('.panel[data-tab="gems"]').hidden,
  cards: document.querySelectorAll('#list-gems .card').length,
  keyCells: document.querySelectorAll('#gem-key .key__cell').length
}));
ok('GEMS tab opens', gemsOpen.visible && gemsOpen.cards === 5 && gemsOpen.keyCells === 9, JSON.stringify(gemsOpen));

const gemGeo = await page.evaluate(() =>
  [...document.querySelectorAll('#gem-key .prb-gem')].map(s => s.querySelector('polygon').getAttribute('points')));
ok('Lv1-Lv9 geometries all distinct', new Set(gemGeo).size === 9, 'distinct: ' + new Set(gemGeo).size);

const gemColors = await page.evaluate(() => {
  const STAT = window.PRBCore.STAT;
  return [...document.querySelectorAll('#list-gems .card')].map(c => {
    const tag = c.querySelector('.gemtag').textContent.trim()[0];
    const svg = c.querySelector('.prb-gem');
    return { tag, want: STAT[tag].color, got: svg.style.color };
  });
});
const colorOk = gemColors.every(g => {
  const rgb = g.want.match(/\w\w/g).map(h => parseInt(h, 16));
  return g.got.replace(/\s/g, '') === `rgb(${rgb.join(',')})` || g.got.toLowerCase() === g.want.toLowerCase();
});
ok('gem colors follow E/L/C/R type', colorOk, JSON.stringify(gemColors));
await page.screenshot({ path: SHOTS + '/03-board-gems.png' });
await page.screenshot({ path: SHOTS + '/03b-board-gems-full.png', fullPage: true });

/* --- POST A WANTED: gem --- */
await page.click('#post-cta');
await page.waitForTimeout(250);
ok('POST A WANTED opens', await page.isVisible('#post-sheet .sheet__panel'));
ok('gem form auto-selected on GEMS tab', await page.isVisible('#form-gem'));
await page.screenshot({ path: SHOTS + '/04-form-gem.png' });

/* recolor check: switch gem type to C and confirm all 9 previews recolor */
await page.click('label[for="gm-type-c"]');
await page.waitForTimeout(150);
const recolor = await page.evaluate(() =>
  [...document.querySelectorAll('#form-gem [data-gempreview] .prb-gem')].map(s => s.style.color));
ok('gem level previews recolor with type', recolor.length === 9 && new Set(recolor).size === 1 && recolor[0].includes('255, 90, 82'),
   recolor[0]);

await page.click('label[for="gem-lv-9"]');
await page.click('label[for="gm-qty-custom"]');
await page.fill('input[name="gm-qty-custom"]', '7');
await page.fill('input[name="gm-price"]', '54321');
await page.screenshot({ path: SHOTS + '/04b-form-gem-filled.png' });
await page.click('#form-gem button[type="submit"]');
await page.waitForTimeout(300);
const gemPosted = await page.evaluate(() => {
  const c = document.querySelector('#list-gems .card');
  return {
    sheetClosed: document.querySelector('#post-sheet').hidden,
    tab: document.querySelector('.tab.is-on').dataset.tab,
    tag: c.querySelector('.gemtag').textContent.trim(),
    lv: c.querySelector('.card__type').textContent.trim(),
    qty: c.querySelector('.gemmeta .chip').textContent.trim(),
    price: c.querySelector('.price__value').textContent.trim(),
    count: document.querySelectorAll('#list-gems .card').length
  };
});
ok('gem WANTED posts correctly + sheet closes',
   gemPosted.sheetClosed && gemPosted.tab === 'gems' && gemPosted.tag === 'C GEM' &&
   gemPosted.lv === 'LV9' && gemPosted.qty.includes('7') && gemPosted.price === '≤54,321GMT' && gemPosted.count === 6,
   JSON.stringify(gemPosted));
await page.screenshot({ path: SHOTS + '/05-gem-posted.png' });

/* --- POST A WANTED: sneaker --- */
await page.click('.tab[data-tab="sneakers"]');
await page.click('#post-cta');
await page.waitForTimeout(200);
ok('sneaker form auto-selected on SNEAKERS tab', await page.isVisible('#form-sneaker'));
await page.click('label[for="socktype-tl-c"]');
await page.waitForTimeout(120);
const hornRecolor = await page.evaluate(() =>
  [...document.querySelectorAll('[data-shapes="tl"] .prb-socket')].map(s => s.style.color));
ok('horn pickers recolor with socket type', hornRecolor.length === 6 && hornRecolor.every(c => c.includes('255, 90, 82')), hornRecolor[0]);
await page.click('label[for="horn-tl-4"]');
await page.click('label[for="socktype-br-r"]');
await page.waitForTimeout(100);
await page.click('label[for="horn-br-0"]');
await page.click('label[for="any-E"]');           /* turn ANY off for E */
await page.fill('input[name="min-E"]', '19.7');
await page.click('label[for="sk-type-walker"]');
await page.click('label[for="sk-quality-legendary"]');
await page.click('label[for="sk-skin-yes"]');
await page.fill('input[name="sk-price"]', '7777');
await page.screenshot({ path: SHOTS + '/06-form-sneaker.png', fullPage: true });
await page.click('#form-sneaker button[type="submit"]');
await page.waitForTimeout(300);
const skPosted = await page.evaluate(() => {
  const c = document.querySelector('#list-sneakers .card');
  return {
    sheetClosed: document.querySelector('#post-sheet').hidden,
    q: c.querySelector('.q').textContent,
    type: c.querySelector('.card__type').textContent,
    price: c.querySelector('.price__value').textContent.trim(),
    stats: [...c.querySelectorAll('.statreq__val')].map(v => v.textContent),
    skin: c.querySelector('.card__meta .chip').textContent,
    tlHorns: c.querySelectorAll('.sockets__cell:nth-child(1) .prb-horn:not(.prb-horn--ghost)').length,
    brHorns: c.querySelectorAll('.sockets__cell:nth-child(4) .prb-horn:not(.prb-horn--ghost)').length,
    count: document.querySelectorAll('#list-sneakers .card').length
  };
});
ok('sneaker WANTED posts correctly',
   skPosted.sheetClosed && skPosted.q === 'LEGENDARY' && skPosted.type === 'WALKER' &&
   skPosted.price === '≤7,777GMT' && skPosted.stats[0] === '≥19.7' && skPosted.skin === 'SKIN YES' &&
   skPosted.tlHorns === 4 && skPosted.brHorns === 0 && skPosted.count === 6,
   JSON.stringify(skPosted));
await page.screenshot({ path: SHOTS + '/07-sneaker-posted.png' });

/* --- details + close paths --- */
await page.click('#list-sneakers .card [data-act="details"]');
await page.waitForTimeout(200);
ok('DETAILS opens', await page.isVisible('#details-sheet .sheet__panel'));
const ownerBtns = await page.evaluate(() => [...document.querySelectorAll('.owner__btns .btn')].map(b => b.textContent));
ok('owner actions present (EDIT PRICE / RENEW / CLOSE)',
   JSON.stringify(ownerBtns) === '["EDIT PRICE","RENEW","CLOSE"]', JSON.stringify(ownerBtns));
await page.screenshot({ path: SHOTS + '/08-details.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
ok('Escape closes sheet', await page.evaluate(() => document.querySelector('#details-sheet').hidden &&
   !document.body.classList.contains('is-locked')));

await page.click('#list-sneakers .card [data-act="sell"]');
await page.waitForTimeout(200);
ok('I CAN SELL opens', await page.isVisible('#sell-sheet .sheet__panel'));
await page.screenshot({ path: SHOTS + '/09-sell.png' });
await page.click('#sell-sheet .sheet__backdrop');
await page.waitForTimeout(200);
ok('backdrop closes sheet', await page.evaluate(() => document.querySelector('#sell-sheet').hidden));

/* re-check horizontal overflow after all interactions */
ok('still no horizontal scroll after interactions',
   await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

/* wider iPhone */
await page.setViewportSize({ width: 430, height: 932 });
await page.waitForTimeout(200);
ok('no horizontal scroll at 430px',
   await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
await page.screenshot({ path: SHOTS + '/10-430.png' });

await page.setViewportSize({ width: 320, height: 700 });
await page.waitForTimeout(200);
ok('no horizontal scroll at 320px',
   await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
   await page.evaluate(() => document.documentElement.scrollWidth + ' vs ' + window.innerWidth));

ok('no errors after full run', errors.length === 0, errors.join(' | '));

await browser.close();

let fails = 0;
for (const [s, n, x] of results) { if (s === 'FAIL') fails++; console.log(`${s}  ${n}${x ? '   [' + x + ']' : ''}`); }
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
