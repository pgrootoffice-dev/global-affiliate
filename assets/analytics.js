/*
 * Useful Work Tools — custom analytics events.
 *
 * The Google tag (gtag.js) itself is loaded by the official snippet in each
 * page's <head>. This file only adds the site-specific events, so there is one
 * place to maintain them rather than a copy per article.
 *
 * Deliberately NOT implemented here: page_view, outbound click, file download,
 * form interaction. GA4 enhanced measurement already collects those, and
 * duplicating them would double-count.
 *
 * scroll_depth is the one deliberate overlap. Enhanced measurement's `scroll`
 * only reports the 90% mark, which cannot show where readers actually stop.
 * Ours is a separate event name, so the two coexist without double-counting.
 *
 * Privacy rules for everything below:
 *   - never read or send the value of any form field
 *   - never send anything a visitor typed
 *   - no names, emails, IDs, or free-text beyond a link's own visible label
 *   - page_path is location.pathname only, so query strings never travel here
 */
(function () {
  "use strict";

  var MEASUREMENT_ID = "G-71C3QTR85H";
  var TEXT_LIMIT = 100;

  function send(eventName, params) {
    // gtag may be missing if the tag is blocked or still loading. Stay silent.
    if (typeof window.gtag !== "function") { return false; }
    try {
      window.gtag("event", eventName, params);
      return true;
    } catch (err) {
      return false;
    }
  }

  // Path only — never location.search, so query parameters cannot leak in.
  function pagePath() {
    return window.location.pathname;
  }

  function shortText(value) {
    var t = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    return t.length > TEXT_LIMIT ? t.slice(0, TEXT_LIMIT) : t;
  }

  function normalise(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  // ------------------------------------------------------------- affiliate --

  /*
   * Slot identity is read from DOM structure, never from the href.
   *
   * Order: an explicit data-slot attribute, then the
   * `<!-- AFFILIATE_SLOT:NAME -->` comment already present before each CTA,
   * then the data-affiliate value. This keeps working unchanged when an
   * official URL is swapped for an approved affiliate URL.
   */
  function slotFor(element) {
    var explicit = element.getAttribute("data-slot");
    if (explicit) { return normalise(explicit); }

    var node = element.previousSibling;
    var hops = 0;
    while (node && hops < 4) {
      if (node.nodeType === 8) {
        var match = /AFFILIATE_SLOT:\s*([A-Za-z0-9_-]+)/.exec(node.nodeValue || "");
        if (match) { return normalise(match[1]); }
      } else if (node.nodeType === 1) {
        break;
      }
      node = node.previousSibling;
      hops++;
    }
    return normalise(element.getAttribute("data-affiliate")) || "UNKNOWN";
  }

  // Resolved at click time, so a later href swap is reported automatically.
  function linkUrlFor(element) {
    if (element.href) { return element.href; }
    var anchor = element.querySelector ? element.querySelector("a[href]") : null;
    if (!anchor) { anchor = element.closest ? element.closest("a[href]") : null; }
    return anchor ? anchor.href : "";
  }

  /*
   * One delegated listener for the whole document, keyed on the
   * [data-affiliate] attribute and nothing else. The href is never a matching
   * condition, so replacing an official URL with an approved affiliate URL
   * needs no change here. Any future ASP is measured by adding the attribute.
   */
  function onDocumentClick(event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") { return; }
    var element = target.closest("[data-affiliate]");
    if (!element) { return; }

    send("affiliate_cta_click", {
      affiliate_name: element.getAttribute("data-affiliate") || "unknown",
      page_path: pagePath(),
      link_url: linkUrlFor(element),
      link_text: shortText(element.textContent),
      slot: slotFor(element)
    });
  }

  // ------------------------------------------------------------ calculator --

  /*
   * Fires at most once per page view, on the first real interaction. We record
   * that the tool was used and nothing about what was entered — no field
   * values, no results, no counts.
   */
  function watchCalculator() {
    var form = document.getElementById("calcForm");
    if (!form) { return; }

    var sent = false;

    function report() {
      if (sent) { return; }
      sent = true;
      send("calculator_use", {
        calculator_name: "browse_ai_credits",
        page_path: pagePath()
      });
      form.removeEventListener("input", report);
      form.removeEventListener("change", report);
      form.removeEventListener("click", onChipClick);
    }

    function onChipClick(event) {
      var target = event.target;
      if (target && typeof target.closest === "function" && target.closest(".calc-chip")) {
        report();
      }
    }

    // Listeners are additive; the calculator's own handlers are untouched.
    form.addEventListener("input", report);
    form.addEventListener("change", report);
    form.addEventListener("click", onChipClick);
  }

  // ---------------------------------------------------------- scroll depth --

  var SCROLL_THRESHOLDS = [25, 50, 75, 90];

  /*
   * Reports how far down a page readers actually get, so Design v2 can see
   * where attention stops rather than only who reached 90%.
   *
   * Each threshold sends at most once per page view. State is plain closure
   * variables, so an ordinary navigation on this static site starts clean —
   * there is no SPA router to reset around.
   *
   * Skipped on noindex pages (404 and friends), which are not content we are
   * trying to improve.
   */
  function watchScrollDepth() {
    if (document.querySelector('meta[name="robots"][content*="noindex"]')) { return; }

    var pending = SCROLL_THRESHOLDS.slice();
    var ticking = false;

    function viewedPercent() {
      var doc = document.documentElement;
      var body = document.body;
      var viewport = window.innerHeight || doc.clientHeight || 0;
      var full = Math.max(
        doc.scrollHeight || 0,
        doc.offsetHeight || 0,
        body ? body.scrollHeight || 0 : 0
      );
      // A page that cannot scroll reports nothing: "reached 75%" should always
      // mean the reader scrolled there, never that the page was simply short.
      if (full - viewport <= 0) { return -1; }
      var top = window.pageYOffset || doc.scrollTop || 0;
      return ((top + viewport) / full) * 100;
    }

    function measure() {
      ticking = false;
      var percent = viewedPercent();
      if (percent < 0) { return; }
      // Fire every threshold passed, lowest first, so 25 >= 50 >= 75 >= 90
      // stays true even when an anchor jump skips ahead.
      while (pending.length && percent >= pending[0]) {
        var depth = pending.shift();
        send("scroll_depth", { page_path: pagePath(), depth_percent: depth });
      }
      if (!pending.length) { teardown(); }
    }

    function onScroll() {
      if (ticking) { return; }
      ticking = true;
      window.requestAnimationFrame(measure);
    }

    function teardown() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    measure();
  }

  // ------------------------------------------------------------------ init --

  function init() {
    document.addEventListener("click", onDocumentClick);
    watchCalculator();
    watchScrollDepth();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Exposed for tests and for confirming the ID a page is configured with.
  window.UWTAnalytics = {
    MEASUREMENT_ID: MEASUREMENT_ID,
    SCROLL_THRESHOLDS: SCROLL_THRESHOLDS,
    pagePath: pagePath,
    slotFor: slotFor
  };
})();
