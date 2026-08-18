/* Polygon Realm Board — app layer (private prototype)
 * Every card is rendered from a single data object. No hand-duplicated markup.
 */
(function () {
  'use strict';

  var C = window.PRBCore;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var DAY = 86400000;
  var now = Date.now();

  /* ---------------------------------------------------------------
   * Demo fixtures — the single source of truth for every rendered card.
   * ------------------------------------------------------------- */
  var state = {
    tab: 'sneakers',
    sneakers: [
      {
        id: 's1', type: 'Jogger', quality: 'Rare',
        base: { E: 18.4, L: null, C: 32.9, R: 20.0 },
        sockets: [
          { position: 'tl', type: 'E', horns: 0 },
          { position: 'tr', type: 'L', horns: 1 },
          { position: 'bl', type: 'C', horns: 2 },
          { position: 'br', type: 'R', horns: 3 }
        ],
        skin: 'NO', maxBuyPrice: 3200, expiry: '1W', createdAt: now - 1 * DAY
      },
      {
        id: 's2', type: 'Runner', quality: 'Epic',
        base: { E: 24.0, L: 12.5, C: null, R: 41.2 },
        sockets: [
          { position: 'tl', type: 'E', horns: 4 },
          { position: 'tr', type: 'E', horns: 2 },
          { position: 'bl', type: 'ANY', horns: 'ANY' },
          { position: 'br', type: 'R', horns: 1 }
        ],
        skin: 'YES', maxBuyPrice: 12800, expiry: '2W', createdAt: now - 3 * DAY
      },
      {
        id: 's3', type: 'Walker', quality: 'Uncommon',
        base: { E: null, L: 9.8, C: null, R: null },
        sockets: [
          { position: 'tl', type: 'L', horns: 2 },
          { position: 'tr', type: 'ANY', horns: 'ANY' },
          { position: 'bl', type: 'ANY', horns: 'ANY' },
          { position: 'br', type: 'ANY', horns: 'ANY' }
        ],
        skin: 'ANY', maxBuyPrice: 640, expiry: '3D', createdAt: now - 6 * 3600000
      },
      {
        id: 's4', type: 'Trainer', quality: 'Legendary',
        base: { E: 30.0, L: 30.0, C: 30.0, R: 30.0 },
        sockets: [
          { position: 'tl', type: 'C', horns: 3 },
          { position: 'tr', type: 'R', horns: 4 },
          { position: 'bl', type: 'L', horns: 4 },
          { position: 'br', type: 'E', horns: 0 }
        ],
        skin: 'YES', maxBuyPrice: 41500, expiry: '1M', createdAt: now - 9 * DAY
      },
      {
        id: 's5', type: 'Runner', quality: 'Common',
        base: { E: 8.2, L: null, C: null, R: 6.0 },
        sockets: [
          { position: 'tl', type: 'E', horns: 1 },
          { position: 'tr', type: 'ANY', horns: 0 },
          { position: 'bl', type: 'C', horns: 'ANY' },
          { position: 'br', type: 'ANY', horns: 'ANY' }
        ],
        skin: 'NO', maxBuyPrice: 210, expiry: '1W', createdAt: now - 2 * DAY
      }
    ],
    gems: [
      { id: 'g1', gemType: 'E', level: 7, qty: 1, maxBuyPrice: 9400, expiry: '1W', createdAt: now - 4 * 3600000 },
      { id: 'g2', gemType: 'L', level: 4, qty: 3, maxBuyPrice: 780, expiry: '3D', createdAt: now - 1 * DAY },
      { id: 'g3', gemType: 'C', level: 2, qty: 2, maxBuyPrice: 145, expiry: '2W', createdAt: now - 5 * DAY },
      { id: 'g4', gemType: 'R', level: 9, qty: 1, maxBuyPrice: 62000, expiry: '1M', createdAt: now - 11 * DAY },
      { id: 'g5', gemType: 'L', level: 1, qty: 12, maxBuyPrice: 38, expiry: '1W', createdAt: now - 2 * DAY }
    ]
  };

  /* --------------------------------------------------------------- helpers */
  function num(n) { return Number(n).toLocaleString('en-US'); }
  function dec(n) { return Number(n).toFixed(1); }
  function expiryDays(key) {
    var opt = C.EXPIRY_OPTIONS.filter(function (o) { return o.key === key; })[0];
    return opt ? opt.days : 7;
  }
  function timeLeft(order) {
    var end = order.createdAt + expiryDays(order.expiry) * DAY;
    var ms = end - Date.now();
    if (ms <= 0) return 'EXPIRED';
    var d = Math.floor(ms / DAY);
    if (d >= 1) return d + 'D LEFT';
    return Math.max(1, Math.floor(ms / 3600000)) + 'H LEFT';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
  }); }

  /* ------------------------------------------------------- card fragments */
  function socketGridHTML(sockets, size) {
    var byPos = {};
    sockets.forEach(function (s) { byPos[s.position] = s; });
    return '<div class="sockets">' + C.SOCKET_POSITIONS.map(function (pos) {
      var s = byPos[pos] || { type: 'ANY', horns: 'ANY' };
      return '<span class="sockets__cell">' + C.socketSVG(s.type, s.horns, { size: size || 46 }) + '</span>';
    }).join('') + '</div>';
  }

  function baseStatsHTML(base) {
    return '<div class="statreq">' + C.STAT_ORDER.map(function (k) {
      var v = base[k];
      var any = (v === null || v === undefined || v === '');
      return '<span class="statreq__item" data-stat="' + k + '" style="--sc:' + C.STAT[k].color + '">' +
        '<span class="statreq__ic">' + k + '</span>' +
        '<span class="statreq__val' + (any ? ' is-any' : '') + '">' +
        (any ? 'ANY' : '<span class="op">&ge;</span>' + dec(v)) + '</span></span>';
    }).join('') + '</div>';
  }

  function priceHTML(price) {
    return '<div class="price">' +
      '<span class="price__label">MAX BUY PRICE</span>' +
      '<span class="price__value"><span class="op">&le;</span>' + num(price) +
      '<span class="price__unit">GMT</span></span></div>';
  }

  function sneakerCardHTML(o) {
    return '<article class="card" data-kind="sneaker" data-id="' + o.id + '">' +
      '<div class="card__top">' +
        '<div class="card__ids">' +
          '<span class="q q--' + o.quality.toLowerCase() + '">' + o.quality.toUpperCase() + '</span>' +
          '<span class="card__type">' + o.type.toUpperCase() + '</span>' +
        '</div>' +
        '<span class="chip chip--time">' + timeLeft(o) + '</span>' +
      '</div>' +
      priceHTML(o.maxBuyPrice) +
      '<div class="spec">' + socketGridHTML(o.sockets) + baseStatsHTML(o.base) + '</div>' +
      '<div class="card__meta"><span class="chip">SKIN ' + o.skin + '</span></div>' +
      '<div class="card__actions">' +
        '<button class="btn btn--sell" data-act="sell">I CAN SELL</button>' +
        '<button class="btn" data-act="details">DETAILS</button>' +
      '</div></article>';
  }

  function gemCardHTML(o) {
    return '<article class="card" data-kind="gem" data-id="' + o.id + '">' +
      '<div class="card__top">' +
        '<div class="card__ids">' +
          '<span class="gemtag" style="--sc:' + C.STAT[o.gemType].color + '">' + o.gemType + ' GEM</span>' +
          '<span class="card__type">LV' + o.level + '</span>' +
        '</div>' +
        '<span class="chip chip--time">' + timeLeft(o) + '</span>' +
      '</div>' +
      priceHTML(o.maxBuyPrice) +
      '<div class="spec spec--gem">' +
        '<span class="gembig">' + C.gemSVG(o.level, o.gemType, { size: 62 }) + '</span>' +
        '<div class="gemmeta">' +
          '<span class="gemmeta__lv" style="--sc:' + C.STAT[o.gemType].color + '">LV' + o.level + '</span>' +
          '<span class="chip">QTY &times;' + o.qty + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="card__actions">' +
        '<button class="btn btn--sell" data-act="sell">I CAN SELL</button>' +
        '<button class="btn" data-act="details">DETAILS</button>' +
      '</div></article>';
  }

  /* ------------------------------------------------------------- rendering */
  function render() {
    var sl = $('#list-sneakers'), gl = $('#list-gems');
    sl.innerHTML = state.sneakers.map(sneakerCardHTML).join('');
    gl.innerHTML = state.gems.map(gemCardHTML).join('');
    $('#count-sneakers').textContent = state.sneakers.length;
    $('#count-gems').textContent = state.gems.length;
  }

  function renderKeys() {
    /* socket horn key: shape only, no numbers anywhere */
    $('#socket-key').innerHTML = C.HORN_OPTIONS.map(function (h) {
      return '<span class="key__cell">' + C.socketSVG('E', h, { size: 38 }) + '</span>';
    }).join('');
    /* gem geometry key: Lv1 - Lv9 */
    $('#gem-key').innerHTML = C.GEM_LEVELS.map(function (lv) {
      return '<span class="key__cell key__cell--gem">' + C.gemSVG(lv, 'L', { size: 36 }) +
        '<small>LV' + lv + '</small></span>';
    }).join('');
  }

  /* ------------------------------------------------------------------ tabs */
  function setTab(tab) {
    state.tab = tab;
    $$('.tab').forEach(function (b) {
      var on = b.dataset.tab === tab;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('.panel').forEach(function (p) { p.hidden = p.dataset.tab !== tab; });
    $('#post-cta').textContent = tab === 'gems' ? '+ POST A WANTED · GEM' : '+ POST A WANTED · SNEAKER';
  }

  /* ---------------------------------------------------------------- sheets */
  var lastFocus = null;
  function openSheet(id) {
    lastFocus = document.activeElement;
    var el = document.getElementById(id);
    el.hidden = false;
    document.body.classList.add('is-locked');
    var f = el.querySelector('[data-autofocus]') || el.querySelector('button, input');
    if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
  }
  function closeSheet(el) {
    el = el || $('.sheet:not([hidden])');
    if (!el) return;
    el.hidden = true;
    if (!$('.sheet:not([hidden])')) document.body.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }

  /* --------------------------------------------------------- detail sheets */
  function findOrder(kind, id) {
    var list = kind === 'gem' ? state.gems : state.sneakers;
    return list.filter(function (o) { return o.id === id; })[0];
  }

  function openDetails(kind, id) {
    var o = findOrder(kind, id);
    if (!o) return;
    var body;
    if (kind === 'gem') {
      body = '<div class="card__top"><div class="card__ids">' +
        '<span class="gemtag" style="--sc:' + C.STAT[o.gemType].color + '">' + o.gemType + ' GEM</span>' +
        '<span class="card__type">LV' + o.level + '</span></div>' +
        '<span class="chip chip--time">' + timeLeft(o) + '</span></div>' +
        priceHTML(o.maxBuyPrice) +
        '<div class="spec spec--gem"><span class="gembig">' + C.gemSVG(o.level, o.gemType, { size: 74 }) +
        '</span><div class="gemmeta"><span class="chip">QTY &times;' + o.qty + '</span>' +
        '<span class="chip">EXPIRY ' + (C.EXPIRY_OPTIONS.filter(function (e) { return e.key === o.expiry; })[0] || {}).label + '</span>' +
        '</div></div>';
    } else {
      body = '<div class="card__top"><div class="card__ids">' +
        '<span class="q q--' + o.quality.toLowerCase() + '">' + o.quality.toUpperCase() + '</span>' +
        '<span class="card__type">' + o.type.toUpperCase() + '</span></div>' +
        '<span class="chip chip--time">' + timeLeft(o) + '</span></div>' +
        priceHTML(o.maxBuyPrice) +
        '<div class="spec">' + socketGridHTML(o.sockets, 52) + baseStatsHTML(o.base) + '</div>' +
        '<div class="card__meta"><span class="chip">SKIN ' + o.skin + '</span>' +
        '<span class="chip">EXPIRY ' + (C.EXPIRY_OPTIONS.filter(function (e) { return e.key === o.expiry; })[0] || {}).label + '</span></div>';
    }
    $('#details-body').innerHTML = body;
    $('#details-sheet').dataset.kind = kind;
    $('#details-sheet').dataset.id = id;
    openSheet('details-sheet');
  }

  /* ------------------------------------------------------------ form build */
  function chipRow(name, values, checkedValue, opts) {
    opts = opts || {};
    return '<div class="chips' + (opts.cls ? ' ' + opts.cls : '') + '">' + values.map(function (v, i) {
      var val = (typeof v === 'object') ? v.value : v;
      var lab = (typeof v === 'object') ? v.label : v;
      var id = name + '-' + String(val).toLowerCase().replace(/[^a-z0-9]/g, '');
      var checked = (checkedValue !== undefined) ? String(val) === String(checkedValue) : i === 0;
      return '<input class="vh" type="radio" name="' + name + '" id="' + id + '" value="' + esc(val) + '"' +
        (checked ? ' checked' : '') + '><label class="chip-btn" for="' + id + '">' + lab + '</label>';
    }).join('') + '</div>';
  }

  function posMap(pos) {
    return '<span class="posmap" aria-hidden="true">' + C.SOCKET_POSITIONS.map(function (p) {
      return '<i class="' + (p === pos ? 'on' : '') + '"></i>';
    }).join('') + '</span>';
  }

  function hornChoices(pos, type, current) {
    return C.HORN_OPTIONS.map(function (h) {
      var val = String(h);
      var id = 'horn-' + pos + '-' + val.toLowerCase();
      var checked = String(current) === val;
      return '<input class="vh" type="radio" name="horn-' + pos + '" id="' + id + '" value="' + val + '"' +
        (checked ? ' checked' : '') + '><label class="shape-btn" for="' + id + '" title="' +
        (h === 'ANY' ? 'Any horn layout' : h + ' horn' + (h === 1 ? '' : 's')) + '">' +
        C.socketSVG(type, h === 'ANY' ? 'ANY' : Number(h), { size: 38 }) + '</label>';
    }).join('');
  }

  function buildSneakerForm() {
    var socketBlocks = C.SOCKET_POSITIONS.map(function (pos) {
      return '<div class="sockedit" data-pos="' + pos + '">' +
        '<div class="sockedit__head">' + posMap(pos) +
          '<span class="sockedit__preview" data-preview="' + pos + '">' +
            C.socketSVG('ANY', 'ANY', { size: 40 }) + '</span></div>' +
        chipRow('socktype-' + pos, ['E', 'L', 'C', 'R', 'ANY'], 'ANY', { cls: 'chips--stat' }) +
        '<div class="shapes" data-shapes="' + pos + '">' + hornChoices(pos, 'ANY', 'ANY') + '</div>' +
      '</div>';
    }).join('');

    var statBlocks = C.STAT_ORDER.map(function (k) {
      return '<div class="statedit" data-stat="' + k + '" style="--sc:' + C.STAT[k].color + '">' +
        '<span class="statreq__ic">' + k + '</span>' +
        '<input class="vh" type="checkbox" id="any-' + k + '" name="any-' + k + '" checked>' +
        '<label class="chip-btn chip-btn--any" for="any-' + k + '">ANY</label>' +
        '<span class="statedit__min"><span class="op">&ge;</span>' +
        '<input type="number" step="0.1" min="0" max="9999" inputmode="decimal" ' +
        'name="min-' + k + '" placeholder="0.0" disabled></span></div>';
    }).join('');

    $('#form-sneaker').innerHTML =
      '<div class="field"><span class="field__label">TYPE</span>' +
        chipRow('sk-type', C.SNEAKER_TYPES.map(function (t) { return { value: t, label: t.toUpperCase() }; }), 'Jogger') + '</div>' +
      '<div class="field"><span class="field__label">QUALITY</span>' +
        chipRow('sk-quality', C.QUALITIES.map(function (t) { return { value: t, label: t.toUpperCase() }; }), 'Rare') + '</div>' +
      '<div class="field"><span class="field__label">SOCKETS</span><div class="sockgrid">' + socketBlocks + '</div></div>' +
      '<div class="field"><span class="field__label">BASE STATS</span><div class="statgrid">' + statBlocks + '</div></div>' +
      '<div class="field"><span class="field__label">SKIN</span>' + chipRow('sk-skin', C.SKIN_OPTIONS, 'ANY') + '</div>' +
      '<div class="field"><span class="field__label">MAX BUY PRICE</span>' +
        '<div class="pricefield"><span class="op">&le;</span>' +
        '<input type="number" name="sk-price" min="1" max="9999999" step="1" inputmode="numeric" ' +
        'placeholder="3200" required><span class="pricefield__unit">GMT</span></div></div>' +
      '<div class="field"><span class="field__label">EXPIRY</span>' +
        chipRow('sk-expiry', C.EXPIRY_OPTIONS.map(function (e) { return { value: e.key, label: e.label }; }), '1W') + '</div>' +
      '<div class="formactions"><button type="submit" class="btn btn--post">POST A WANTED</button></div>';
  }

  function buildGemForm() {
    var levelGrid = C.GEM_LEVELS.map(function (lv) {
      var id = 'gem-lv-' + lv;
      return '<input class="vh" type="radio" name="gm-level" id="' + id + '" value="' + lv + '"' +
        (lv === 5 ? ' checked' : '') + '><label class="lvl-btn" for="' + id + '">' +
        '<span data-gempreview="' + lv + '">' + C.gemSVG(lv, 'E', { size: 40 }) + '</span>' +
        '<small>LV' + lv + '</small></label>';
    }).join('');

    $('#form-gem').innerHTML =
      '<div class="field"><span class="field__label">GEM TYPE</span>' +
        chipRow('gm-type', C.STAT_ORDER, 'E', { cls: 'chips--stat' }) + '</div>' +
      '<div class="field"><span class="field__label">GEM LEVEL</span><div class="lvlgrid">' + levelGrid + '</div></div>' +
      '<div class="field"><span class="field__label">QUANTITY</span>' +
        chipRow('gm-qty', [{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' },
          { value: 'custom', label: 'CUSTOM' }], '1') +
        '<div class="pricefield pricefield--qty" data-qty-custom hidden>' +
        '<input type="number" name="gm-qty-custom" min="1" max="999" step="1" inputmode="numeric" placeholder="4"></div></div>' +
      '<div class="field"><span class="field__label">MAX BUY PRICE</span>' +
        '<div class="pricefield"><span class="op">&le;</span>' +
        '<input type="number" name="gm-price" min="1" max="9999999" step="1" inputmode="numeric" ' +
        'placeholder="780" required><span class="pricefield__unit">GMT</span></div></div>' +
      '<div class="field"><span class="field__label">EXPIRY</span>' +
        chipRow('gm-expiry', C.EXPIRY_OPTIONS.map(function (e) { return { value: e.key, label: e.label }; }), '1W') + '</div>' +
      '<div class="formactions"><button type="submit" class="btn btn--post">POST A WANTED</button></div>';
  }

  /* ------------------------------------------------------------ form logic */
  function socketTypeOf(form, pos) {
    var el = form.querySelector('input[name="socktype-' + pos + '"]:checked');
    return el ? el.value : 'ANY';
  }
  function hornOf(form, pos) {
    var el = form.querySelector('input[name="horn-' + pos + '"]:checked');
    if (!el) return 'ANY';
    return el.value === 'ANY' ? 'ANY' : Number(el.value);
  }
  function refreshSocketBlock(form, pos) {
    var type = socketTypeOf(form, pos);
    var horns = hornOf(form, pos);
    form.querySelector('[data-preview="' + pos + '"]').innerHTML = C.socketSVG(type, horns, { size: 40 });
    form.querySelector('[data-shapes="' + pos + '"]').innerHTML = hornChoices(pos, type, horns);
  }
  function refreshGemPreviews(form) {
    var t = form.querySelector('input[name="gm-type"]:checked');
    var type = t ? t.value : 'E';
    $$('[data-gempreview]', form).forEach(function (el) {
      el.innerHTML = C.gemSVG(Number(el.dataset.gempreview), type, { size: 40 });
    });
  }

  function wireSneakerForm() {
    var form = $('#form-sneaker');
    buildSneakerForm();

    form.addEventListener('change', function (e) {
      var n = e.target.name || '';
      if (n.indexOf('socktype-') === 0 || n.indexOf('horn-') === 0) {
        refreshSocketBlock(form, n.split('-')[1]);
      }
      if (n.indexOf('any-') === 0) {
        var k = n.split('-')[1];
        var input = form.querySelector('input[name="min-' + k + '"]');
        input.disabled = e.target.checked;
        if (e.target.checked) input.value = '';
        else input.focus();
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var price = Number(form.querySelector('input[name="sk-price"]').value);
      if (!price || price <= 0) return;
      var base = {};
      C.STAT_ORDER.forEach(function (k) {
        var any = form.querySelector('input[name="any-' + k + '"]').checked;
        var v = Number(form.querySelector('input[name="min-' + k + '"]').value);
        base[k] = (any || !isFinite(v) || form.querySelector('input[name="min-' + k + '"]').value === '') ? null : v;
      });
      var order = {
        id: 's' + Date.now(),
        type: form.querySelector('input[name="sk-type"]:checked').value,
        quality: form.querySelector('input[name="sk-quality"]:checked').value,
        base: base,
        sockets: C.SOCKET_POSITIONS.map(function (pos) {
          return { position: pos, type: socketTypeOf(form, pos), horns: hornOf(form, pos) };
        }),
        skin: form.querySelector('input[name="sk-skin"]:checked').value,
        maxBuyPrice: price,
        expiry: form.querySelector('input[name="sk-expiry"]:checked').value,
        createdAt: Date.now()
      };
      state.sneakers.unshift(order);
      render();
      closeSheet($('#post-sheet'));
      setTab('sneakers');
      flash('WANTED POSTED');
    });
  }

  function wireGemForm() {
    var form = $('#form-gem');
    buildGemForm();

    form.addEventListener('change', function (e) {
      if (e.target.name === 'gm-type') refreshGemPreviews(form);
      if (e.target.name === 'gm-qty') {
        form.querySelector('[data-qty-custom]').hidden = e.target.value !== 'custom';
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var price = Number(form.querySelector('input[name="gm-price"]').value);
      if (!price || price <= 0) return;
      var qtySel = form.querySelector('input[name="gm-qty"]:checked').value;
      var qty = qtySel === 'custom'
        ? Math.max(1, Number(form.querySelector('input[name="gm-qty-custom"]').value) || 1)
        : Number(qtySel);
      state.gems.unshift({
        id: 'g' + Date.now(),
        gemType: form.querySelector('input[name="gm-type"]:checked').value,
        level: Number(form.querySelector('input[name="gm-level"]:checked').value),
        qty: qty,
        maxBuyPrice: price,
        expiry: form.querySelector('input[name="gm-expiry"]:checked').value,
        createdAt: Date.now()
      });
      render();
      closeSheet($('#post-sheet'));
      setTab('gems');
      flash('WANTED POSTED');
    });
  }

  /* ---------------------------------------------------------------- toast */
  var toastTimer = null;
  function flash(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 1800);
  }

  /* ----------------------------------------------------------------- init */
  function init() {
    /* brand linework */
    var hero = $('#hero-neon'), page = $('#page-neon');
    if (hero) hero.innerHTML = C.neonLineworkSVG({ width: 430, height: 300, seed: 4711, rays: 11, tris: 6, nodes: 9 });
    if (page) page.innerHTML = C.neonLineworkSVG({ width: 430, height: 900, seed: 90210, rays: 14, tris: 8, nodes: 12 });

    render();
    renderKeys();
    wireSneakerForm();
    wireGemForm();
    setTab('sneakers');

    /* tabs */
    $$('.tab').forEach(function (b) {
      b.addEventListener('click', function () { setTab(b.dataset.tab); });
    });

    /* post CTA */
    $('#post-cta').addEventListener('click', function () {
      setPostMode(state.tab === 'gems' ? 'gem' : 'sneaker');
      openSheet('post-sheet');
    });
    $$('[data-postmode]').forEach(function (b) {
      b.addEventListener('click', function () { setPostMode(b.dataset.postmode); });
    });

    /* card actions (delegated - survives re-render) */
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!btn) return;
      var card = btn.closest('.card');
      var act = btn.dataset.act;
      if (act === 'details' && card) openDetails(card.dataset.kind, card.dataset.id);
      if (act === 'sell') openSheet('sell-sheet');
      if (act === 'owner') flash(btn.dataset.owner + ' — PROTOTYPE ONLY');
    });

    /* sheet close */
    $$('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { closeSheet(b.closest('.sheet')); });
    });
    $$('.sheet__backdrop').forEach(function (b) {
      b.addEventListener('click', function () { closeSheet(b.closest('.sheet')); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSheet();
    });
  }

  function setPostMode(mode) {
    $$('[data-postmode]').forEach(function (b) {
      b.classList.toggle('is-on', b.dataset.postmode === mode);
      b.setAttribute('aria-selected', b.dataset.postmode === mode ? 'true' : 'false');
    });
    $('#form-sneaker').hidden = mode !== 'sneaker';
    $('#form-gem').hidden = mode !== 'gem';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
