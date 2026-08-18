/* Polygon Realm Board — core
 * Pure, DOM-free. Shared source of truth for:
 *   - functional stat config (E / L / C / R)
 *   - socket geometry (octagon body + corner horn triangles)
 *   - gem geometry (nine distinct silhouettes, Lv1 - Lv9)
 *   - geometric neon linework (brand background system)
 * Loaded by the browser app and by tools/make-banner.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PRBCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ------------------------------------------------------------------
   * 1. FUNCTIONAL DATA LAYER — locked STEPN stat colors.
   *    Brand colors (green / purple / pink) must never appear here.
   * ---------------------------------------------------------------- */
  var STAT = {
    E: { key: 'E', label: 'E', color: '#FFC93C' }, /* Efficiency  - yellow      */
    L: { key: 'L', label: 'L', color: '#59C7F2' }, /* Luck        - light blue  */
    C: { key: 'C', label: 'C', color: '#FF5A52' }, /* Comfort     - red / coral */
    R: { key: 'R', label: 'R', color: '#9B7BFF' }  /* Resilience  - purple      */
  };
  var STAT_ORDER = ['E', 'L', 'C', 'R'];
  var NEUTRAL = '#6C7889'; /* ANY - neutral gray, never a brand color */

  function statColor(type) {
    return (type && STAT[type]) ? STAT[type].color : NEUTRAL;
  }

  var SNEAKER_TYPES = ['Walker', 'Jogger', 'Runner', 'Trainer'];
  var QUALITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  var SOCKET_POSITIONS = ['tl', 'tr', 'bl', 'br'];
  var HORN_OPTIONS = ['ANY', 0, 1, 2, 3, 4];
  var GEM_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  var SKIN_OPTIONS = ['ANY', 'YES', 'NO'];
  var EXPIRY_OPTIONS = [
    { key: '3D', label: '3 DAYS', days: 3 },
    { key: '1W', label: '1 WEEK', days: 7 },
    { key: '2W', label: '2 WEEKS', days: 14 },
    { key: '1M', label: '1 MONTH', days: 30 }
  ];

  /* ------------------------------------------------------------------
   * 2. SOCKET GEOMETRY
   *    Octagonal body + triangular horns attached at the four corners.
   *    Horn count is expressed by SHAPE ONLY - never by text or number.
   *    Horns fill clockwise from the top-left corner: tl, tr, br, bl.
   * ---------------------------------------------------------------- */
  var HORN_DIRS = [225, 315, 45, 135]; /* screen degrees: tl, tr, br, bl */

  function pt(cx, cy, r, deg) {
    var a = deg * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }
  function fmt(p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }
  function poly(points) { return points.map(fmt).join(' '); }

  function octagonPoints(cx, cy, r) {
    var out = [], i;
    for (i = 0; i < 8; i++) out.push(pt(cx, cy, r, 22.5 + i * 45));
    return out;
  }

  /* A horn sits on the octagon edge that straddles a diagonal corner and
     points outward along that diagonal. */
  function hornPoints(cx, cy, r, dir, reach) {
    var a = pt(cx, cy, r, dir - 22.5);
    var b = pt(cx, cy, r, dir + 22.5);
    var tip = pt(cx, cy, r * reach, dir);
    return [a, tip, b];
  }

  /* horns: 'ANY' | 0..4 ; type: 'E'|'L'|'C'|'R'|'ANY'
     Horns are drawn first, then the octagon body is painted opaque on top,
     so each horn reads as a spike attached to the socket rather than a blob.
     The whole SVG is colored through currentColor, so a socket and its
     base-stat block can never drift apart. */
  function socketSVG(type, horns, opts) {
    opts = opts || {};
    var size = opts.size || 46;
    var cx = 50, cy = 50, r = 28, spread = 13, reach = 1.64;
    var isAnyType = !type || type === 'ANY';
    var ghost = (horns === 'ANY' || horns === null || horns === undefined);
    var count = ghost ? 0 : Math.max(0, Math.min(4, horns | 0));
    var i, s = '';

    for (i = 0; i < 4; i++) {
      var d = HORN_DIRS[i];
      var hp = poly([pt(cx, cy, r * 0.98, d - spread),
                     pt(cx, cy, r * reach, d),
                     pt(cx, cy, r * 0.98, d + spread)]);
      if (ghost) {
        s += '<polygon class="prb-horn prb-horn--ghost" points="' + hp +
             '" fill="none" stroke="currentColor" stroke-width="2.6" stroke-opacity=".45" ' +
             'stroke-dasharray="4 4" stroke-linejoin="round"/>';
      } else if (i < count) {
        s += '<polygon class="prb-horn" points="' + hp +
             '" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>';
      }
    }

    var body = poly(octagonPoints(cx, cy, r));
    var core = poly(octagonPoints(cx, cy, r * 0.62));
    s += '<polygon class="prb-socket-body" points="' + body + '" fill="#080C11" ' +
         'stroke="currentColor" stroke-width="6" stroke-linejoin="round"' +
         (isAnyType ? ' stroke-dasharray="6 5" stroke-opacity=".8"' : '') + '/>';
    s += '<polygon points="' + core + '" fill="currentColor" fill-opacity="' +
         (isAnyType ? '.16' : '.92') + '" stroke="none"/>';

    var label = isAnyType ? '' :
      '<text x="50" y="51" text-anchor="middle" dominant-baseline="central" ' +
      'font-size="21" font-weight="800" font-family="ui-sans-serif, -apple-system, Segoe UI, sans-serif" ' +
      'fill="#06090D">' + type + '</text>';

    var title = 'Socket ' + (isAnyType ? 'ANY' : type) + ', ' +
      (ghost ? 'any horn layout' : count + ' horn' + (count === 1 ? '' : 's'));

    return '<svg class="prb-socket" viewBox="0 0 100 100" width="' + size + '" height="' + size +
      '" role="img" aria-label="' + title + '" style="color:' + statColor(type) + '">' +
      s + label + '</svg>';
  }

  /* ------------------------------------------------------------------
   * 3. GEM GEOMETRY — nine distinct silhouettes.
   *    gem(level, type): geometry comes from the level, color from the stat.
   * ---------------------------------------------------------------- */
  function starPoints(cx, cy, n, rOut, rIn, rot) {
    var out = [], i, step = 360 / (n * 2);
    for (i = 0; i < n * 2; i++) {
      out.push(pt(cx, cy, i % 2 === 0 ? rOut : rIn, rot + i * step));
    }
    return out;
  }
  function ringPoints(cx, cy, n, r, rot) {
    var out = [], i;
    for (i = 0; i < n; i++) out.push(pt(cx, cy, r, rot + i * (360 / n)));
    return out;
  }
  function spokes(cx, cy, n, r1, r2, rot) {
    var out = [], i, a;
    for (i = 0; i < n; i++) {
      a = rot + i * (360 / n);
      out.push([pt(cx, cy, r1, a), pt(cx, cy, r2, a)]);
    }
    return out;
  }

  /* Each level: an outline, plus inner facet rings / lines.
     Silhouette and internal structure both change with level. */
  var GEM_GEOMETRY = {
    1: function () { /* small plain diamond */
      return {
        outline: [[50, 28], [68, 50], [50, 72], [32, 50]],
        rings: [],
        lines: [[[50, 28], [50, 72]], [[32, 50], [68, 50]]]
      };
    },
    2: function () { /* hexagon, single table line */
      return {
        outline: [[50, 20], [70, 33], [70, 61], [50, 80], [30, 61], [30, 33]],
        rings: [],
        lines: [[[30, 33], [70, 33]], [[50, 20], [30, 33]], [[50, 20], [70, 33]],
                [[50, 80], [30, 61]], [[50, 80], [70, 61]]]
      };
    },
    3: function () { /* octagon with an octagonal table */
      return {
        outline: ringPoints(50, 50, 8, 30, 22.5),
        rings: [ringPoints(50, 50, 8, 15, 22.5)],
        lines: spokes(50, 50, 4, 15, 30, 22.5)
      };
    },
    4: function () { /* step-cut crown over a deep pavilion point */
      return {
        outline: [[34, 22], [66, 22], [80, 42], [50, 86], [20, 42]],
        rings: [[[40, 34], [60, 34], [68, 46], [50, 66], [32, 46]]],
        lines: [[[34, 22], [40, 34]], [[66, 22], [60, 34]], [[80, 42], [68, 46]],
                [[20, 42], [32, 46]], [[50, 86], [50, 66]], [[32, 46], [50, 66]], [[68, 46], [50, 66]]]
      };
    },
    5: function () { /* shield: shouldered crown, tapered point */
      return {
        outline: [[50, 12], [74, 30], [78, 54], [50, 90], [22, 54], [26, 30]],
        rings: [[[50, 30], [64, 42], [50, 62], [36, 42]]],
        lines: [[[50, 12], [50, 30]], [[74, 30], [64, 42]], [[78, 54], [64, 42]],
                [[22, 54], [36, 42]], [[26, 30], [36, 42]], [[50, 90], [50, 62]]]
      };
    },
    6: function () { /* six horned crown around a hexagonal core */
      return {
        outline: starPoints(50, 50, 6, 40, 26, -90),
        rings: [ringPoints(50, 50, 6, 17, -90)],
        lines: spokes(50, 50, 6, 17, 40, -90)
      };
    },
    7: function () { /* cross-star: four long spikes, four short */
      var o = [];
      var radii = [45, 24, 32, 24, 45, 24, 32, 24];
      for (var i = 0; i < 8; i++) o.push(pt(50, 50, radii[i], -90 + i * 45));
      return {
        outline: o,
        rings: [ringPoints(50, 50, 8, 16, -90)],
        lines: spokes(50, 50, 4, 16, 42, -90)
      };
    },
    8: function () { /* twelve-point sun, double inner ring */
      return {
        outline: starPoints(50, 50, 12, 42, 30, -90),
        rings: [ringPoints(50, 50, 12, 22, -90), ringPoints(50, 50, 6, 11, -90)],
        lines: spokes(50, 50, 12, 22, 42, -90)
      };
    },
    9: function () { /* sixteen-point brilliant, star core, full facet spread */
      return {
        outline: starPoints(50, 50, 16, 45, 30, -90),
        rings: [starPoints(50, 50, 8, 24, 13, -90), ringPoints(50, 50, 4, 8, -90)],
        lines: spokes(50, 50, 16, 24, 45, -90)
      };
    }
  };

  function gemSVG(level, type, opts) {
    opts = opts || {};
    var size = opts.size || 40;
    var lv = Math.max(1, Math.min(9, level | 0));
    var g = GEM_GEOMETRY[lv]();
    var color = statColor(type);
    var s = '';

    s += '<polygon points="' + poly(g.outline) + '" fill="currentColor" fill-opacity=".26" ' +
         'stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>';
    g.rings.forEach(function (ring) {
      s += '<polygon points="' + poly(ring) + '" fill="currentColor" fill-opacity=".5" ' +
           'stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>';
    });
    g.lines.forEach(function (ln) {
      s += '<line x1="' + ln[0][0].toFixed(2) + '" y1="' + ln[0][1].toFixed(2) +
           '" x2="' + ln[1][0].toFixed(2) + '" y2="' + ln[1][1].toFixed(2) +
           '" stroke="currentColor" stroke-width="2" stroke-opacity=".55" stroke-linecap="round"/>';
    });

    return '<svg class="prb-gem" viewBox="0 0 100 100" width="' + size + '" height="' + size +
      '" role="img" aria-label="' + (type || 'ANY') + ' gem level ' + lv +
      '" style="color:' + color + '">' + s + '</svg>';
  }

  /* ------------------------------------------------------------------
   * 4. GEOMETRIC NEON LINEWORK — brand background system.
   *    Thin lines, triangles, angled intersections, layered and
   *    deliberately irregular. Seeded so it stays stable between loads.
   * ---------------------------------------------------------------- */
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  var BRAND = { green: '#00E599', purple: '#8247E5', pink: '#FF2D9E' };

  function neonLineworkSVG(opts) {
    opts = opts || {};
    var w = opts.width || 430, h = opts.height || 320;
    var r = rng(opts.seed || 20260818);
    var palette = [BRAND.green, BRAND.purple, BRAND.pink, BRAND.green, BRAND.pink];
    var s = '';
    var rays = opts.rays || 12, tris = opts.tris || 7, nodes = opts.nodes || 10;
    var i, j;

    function rand(a, b) { return a + r() * (b - a); }
    function pick(arr) { return arr[Math.floor(r() * arr.length) % arr.length]; }
    function line(x1, y1, x2, y2, c, wid, op) {
      s += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) +
           '" y2="' + y2.toFixed(1) + '" stroke="' + c + '" stroke-width="' + wid +
           '" stroke-opacity="' + op + '" stroke-linecap="round"/>';
    }
    function tri(x, y, rr, rot, c, wid, op) {
      var p = [pt(x, y, rr, rot), pt(x, y, rr * rand(0.7, 1.25), rot + rand(105, 140)),
               pt(x, y, rr * rand(0.7, 1.2), rot + rand(220, 255))];
      s += '<polygon points="' + poly(p) + '" fill="none" stroke="' + c + '" stroke-width="' + wid +
           '" stroke-opacity="' + op + '" stroke-linejoin="round"/>';
    }

    /* long structural rays that cross the frame at shallow angles */
    for (i = 0; i < rays; i++) {
      var c = pick(palette);
      var x1 = rand(-w * 0.25, w * 1.1), y1 = rand(-h * 0.1, h * 1.1);
      var ang = pick([rand(-70, -20), rand(20, 70), rand(150, 205)]);
      var len = rand(h * 0.7, w * 1.5);
      var e = pt(x1, y1, len, ang);
      line(x1, y1, e[0], e[1], c, rand(0.6, 1.5).toFixed(2), rand(0.18, 0.5).toFixed(2));
      /* an angled kick-off, so intersections look built rather than random */
      if (r() > 0.45) {
        var m = [x1 + (e[0] - x1) * rand(0.25, 0.75), y1 + (e[1] - y1) * rand(0.25, 0.75)];
        var e2 = pt(m[0], m[1], rand(w * 0.15, w * 0.6), ang + pick([rand(38, 62), rand(-62, -38)]));
        line(m[0], m[1], e2[0], e2[1], pick(palette), rand(0.5, 1.2).toFixed(2), rand(0.16, 0.42).toFixed(2));
      }
    }

    /* abstract architectural triangle clusters */
    for (i = 0; i < tris; i++) {
      var cx = rand(w * 0.02, w * 0.98), cy = rand(h * 0.04, h * 0.96);
      var base = rand(h * 0.08, h * 0.34);
      var col = pick(palette);
      for (j = 0; j < 1 + Math.floor(r() * 2); j++) {
        tri(cx + rand(-14, 14), cy + rand(-14, 14), base * rand(0.55, 1.25), rand(0, 360),
            j === 0 ? col : pick(palette), rand(0.6, 1.4).toFixed(2), rand(0.2, 0.55).toFixed(2));
      }
    }

    /* small nodes at a few intersections */
    for (i = 0; i < nodes; i++) {
      var nx = rand(0, w), ny = rand(0, h), nr = rand(1.2, 3.4);
      s += '<circle cx="' + nx.toFixed(1) + '" cy="' + ny.toFixed(1) + '" r="' + nr.toFixed(1) +
           '" fill="none" stroke="' + pick(palette) + '" stroke-width="0.9" stroke-opacity="' +
           rand(0.25, 0.65).toFixed(2) + '"/>';
    }

    return '<svg class="prb-neon" viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="100%" ' +
      'preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + s + '</svg>';
  }

  return {
    STAT: STAT,
    STAT_ORDER: STAT_ORDER,
    NEUTRAL: NEUTRAL,
    BRAND: BRAND,
    SNEAKER_TYPES: SNEAKER_TYPES,
    QUALITIES: QUALITIES,
    SOCKET_POSITIONS: SOCKET_POSITIONS,
    HORN_OPTIONS: HORN_OPTIONS,
    GEM_LEVELS: GEM_LEVELS,
    SKIN_OPTIONS: SKIN_OPTIONS,
    EXPIRY_OPTIONS: EXPIRY_OPTIONS,
    statColor: statColor,
    socketSVG: socketSVG,
    gemSVG: gemSVG,
    neonLineworkSVG: neonLineworkSVG
  };
});
