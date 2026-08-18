# Polygon Realm Board (P.R.B) — private expert prototype

A STEPN-native WANTED / buy-order board. Private prototype, mobile-first, iPhone Safari
as the primary target (390–430px).

Not affiliated with STEPN or FSL. No wallet connection, no P2P payment, no custody —
trades happen only on the official STEPN Marketplace.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The board. Static shell only; every card is rendered from data. |
| `assets/prb.css` | Two-layer visual system (brand layer / functional data layer). |
| `assets/prb-core.js` | Shared source of truth: stat config, socket geometry, gem geometry, neon linework. DOM-free. |
| `assets/prb-app.js` | Fixtures, card rendering, tabs, sheets, both forms. |
| `assets/prb-x-banner.svg` / `.png` | 1500×500 X banner, generated from the same brand system. |
| `tools/make-banner.mjs` | Regenerates the banner: `node prb/tools/make-banner.mjs`. |
| `tools/check.mjs` | Acceptance checklist as a browser test (see below). |

Open `prb/index.html` directly — no build step, no network requests, no external fonts.

## Checking it

```
npm i playwright            # only dependency, and only for the checker
node prb/tools/check.mjs    # 31 checks at 320 / 390 / 430px, screenshots in prb/.shots
```

The checker drives a real Chromium at iPhone width and asserts the acceptance checklist:
stat-color synchronization, `≥` / `≤` usage, all six horn variants as shapes with zero digit
labels, nine distinct gem geometries, tab switching, both forms posting correctly, sheets
opening and closing three ways, the sticky CTA never covering I CAN SELL, and no horizontal
scroll before or after interaction. Set `CHROMIUM_PATH` to use a preinstalled browser.

## Architecture

`prb-core.js` holds the single `STAT` config:

```
E → #FFC93C (yellow)   L → #59C7F2 (light blue)
C → #FF5A52 (red)      R → #9B7BFF (purple)
```

Every socket, base-stat block, gem and form chip takes its color from that object.
Socket and gem SVGs paint themselves with `currentColor` and the wrapper sets
`color` from `STAT[type].color`, so a socket and its base-stat block cannot drift apart —
there is no second place where a stat color is written down.

A sneaker card is rendered from one object:

```js
{ type: 'Jogger', quality: 'Rare',
  base: { E: 18.4, L: null, C: 32.9, R: 20.0 },
  sockets: [{ position: 'tl', type: 'E', horns: 0 }, ...],
  skin: 'NO', maxBuyPrice: 3200, expiry: '1W', createdAt: ... }
```

`null` base value renders `ANY`; a number renders `≥ 18.4`. Max buy price always renders `≤`.

### Sockets

Octagonal body with triangular horns on the four diagonal corners. Horns are drawn first
and the body is painted opaque on top, so each horn reads as a spike rather than a blob.
Horn count is **shape only** — no digits are emitted anywhere in the socket SVG. Horns fill
clockwise from top-left (1 = TL, 2 = TL+TR, 3 = +BR, 4 = all). `horns: 'ANY'` draws four
dashed ghost horns; `type: 'ANY'` draws a neutral gray dashed body with no letter.

### Gems

`gemSVG(level, type)` — nine hand-defined geometries whose silhouette *and* internal facet
structure change with level (diamond → hexagon → octagon → step cut → shield → six-horn
crown → cross-star → twelve-point sun → sixteen-point brilliant). Geometry comes from the
level, color from the stat type, nothing else.

### Neon linework

`neonLineworkSVG()` is a seeded generator: long structural rays with angled kick-offs,
triangle clusters, and intersection nodes in green / purple / pink over black. Seeded, so
the composition is irregular but identical on every load — not a repeating tile, not filled
shapes. Used for the hero, the page background and the X banner.

## Changelog

- Shared stat config drives all socket / base-stat / gem / chip colors (no hard-coded duplicates).
- Sneaker cards render from a single fixture object; base stats sit beside the socket block,
  icon + value only, no `Efficiency` / `Luck` / `Comfort` / `Resilience` words.
- `≥` for base stat minimums, `≤` for max buy price, used consistently and never mixed.
- Socket geometry rebuilt: octagon + corner horns, opaque body over horn bases, 0–4 and ANY.
- Nine distinct gem geometries with a level key strip (LV1–LV9 all visible without scrolling).
- Sneaker form: shape-only horn pickers that recolor live with the selected socket type.
- Gem form: all nine level previews recolor live with the selected gem type; custom quantity.
- Brand layer: crowned doodle face inline in the HTML (cannot 404), graffiti lockup with
  per-letter jitter and hand-drawn swash, decorative ○ △ ✕ ★ marks, geometric neon background.
- P-AI OPERATOR present as a small strip; never competes with the board.
- Sticky CTA reduced to a centered pill with a 112px board bottom pad, so it never covers
  I CAN SELL on the last card.
- Anonymity copy: PUBLICLY ANONYMOUS / NO WALLET CONNECTION / NO P2P PAYMENT /
  OFFICIAL STEPN MARKETPLACE ONLY. "Fully anonymous" is never used.

## Still approximate

1. **No STEPN reference images were available in this session.** Socket horns, gem level
   geometry and the neon linework were rebuilt from the written spec and from STEPN's visual
   language, not traced from the supplied references. Exact horn angles, gem facet counts per
   level, and gem silhouette proportions should be checked against the real assets.
2. **Graffiti typography is CSS, not lettering.** Heavy system sans with per-letter rotation,
   skew and a purple/pink offset shadow. A real hand-drawn wordmark (SVG paths or a webfont)
   would be rougher. The doodle face itself is hand-drawn SVG with a turbulence filter.
3. **Quality badge colors** (Common gray / Uncommon green / Rare blue / Epic purple /
   Legendary orange) are STEPN-conventional but were not specified; they are kept out of the
   E/L/C/R palette.
4. **State is in memory only.** Posting a WANTED adds a card for the session; a reload resets
   the board. No storage, no backend.
5. **Owner actions are stubs.** EDIT PRICE / RENEW / CLOSE show a toast; expiry is displayed
   and counts down but nothing is enforced server-side.
6. **I CAN SELL has no matching or messaging** — by design for this stage.
7. Level, mint, sneaker gem requirements, polling, moderation and AI analysis are intentionally
   absent.

## Not in this prototype (deliberately)

Marketplace scraping, wallet connect, DMs, payments, escrow, Discord/X integration, push,
reputation, subscription, ads, launch systems, live AI API calls.

## Note on this repository

This prototype is unrelated to the affiliate site that occupies the repository root. It is
self-contained under `prb/` and carries `noindex, nofollow`. It should not be merged to `main`
(which is published to GitHub Pages) without an explicit decision to publish it.
