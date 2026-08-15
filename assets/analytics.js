/*
 * Useful Work Tools — custom analytics events.
 *
 * The Google tag (gtag.js) itself is loaded by the official snippet in each
 * page's <head>. This file only adds the site-specific events, so there is one
 * place to maintain them rather than a copy per article.
 *
 * Deliberately NOT implemented here: page_view, scroll, outbound click, file
 * download, form interaction. GA4 enhanced measurement already collects those,
 * and duplicating them would double-count.
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
   * Slot name comes from the `<!-- AFFILIATE_SLOT:NAME -->` comment that sits
   * immediately before each affiliate anchor. Falling back to data-affiliate
   * means a new ASP only has to add the attribute to be measured.
   */
  function slotFor(anchor) {
    var node = anchor.previousSibling;
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
    return normalise(anchor.getAttribute("data-affiliate")) || "UNKNOWN";
  }

  /*
   * One delegated listener for the whole document: every current and future
   * `a[data-affiliate]` is covered without touching article markup again.
   */
  function onDocumentClick(event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") { return; }
    var anchor = target.closest("a[data-affiliate]");
    if (!anchor) { return; }

    send("affiliate_cta_click", {
      affiliate_name: anchor.getAttribute("data-affiliate") || "unknown",
      page_path: pagePath(),
      link_url: anchor.href || "",
      link_text: shortText(anchor.textContent),
      slot: slotFor(anchor)
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

  // ------------------------------------------------------------------ init --

  function init() {
    document.addEventListener("click", onDocumentClick);
    watchCalculator();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Exposed for tests and for confirming the ID a page is configured with.
  window.UWTAnalytics = {
    MEASUREMENT_ID: MEASUREMENT_ID,
    pagePath: pagePath,
    slotFor: slotFor
  };
})();
