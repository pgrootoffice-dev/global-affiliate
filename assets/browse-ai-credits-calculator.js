/*
 * Browse AI credit estimator.
 *
 * Self-contained, no dependencies. Everything runs in the visitor's browser:
 * nothing entered here is transmitted, stored, or passed to analytics.
 *
 * Mount it by including the markup with the ids below and loading this file
 * with `defer`. The pure calculation is also exposed as
 * window.BrowseAiCredits.calculate(input) so it can be reused or tested
 * independently of the DOM.
 */
(function (global) {
  "use strict";

  var FREE_ALLOWANCE = 50;

  var LIMITS = {
    rowsPerListPage: { min: 0, max: 10000 },
    listPagesPerRun: { min: 0, max: 1000 },
    detailPagesPerRun: { min: 0, max: 10000 },
    runsPerMonth: { min: 0, max: 3000 },
    screenshotsPerRun: { min: 0, max: 1000 },
    premiumMinCredits: { min: 2, max: 10 }
  };

  function clamp(value, min, max) {
    var v = typeof value === "number" ? value : parseInt(String(value).trim(), 10);
    if (!isFinite(v)) { v = 0; }
    v = Math.trunc(v);
    if (v < min) { v = min; }
    if (v > max) { v = max; }
    return v;
  }

  /*
   * Source of truth for the estimate.
   *
   * Premium classification is a per-run FLOOR, never a surcharge:
   * creditsPerRun = max(baseCreditsPerRun, premiumMinCredits).
   */
  function calculate(raw) {
    var input = {
      rowsPerListPage: clamp(raw.rowsPerListPage, LIMITS.rowsPerListPage.min, LIMITS.rowsPerListPage.max),
      listPagesPerRun: clamp(raw.listPagesPerRun, LIMITS.listPagesPerRun.min, LIMITS.listPagesPerRun.max),
      detailPagesPerRun: clamp(raw.detailPagesPerRun, LIMITS.detailPagesPerRun.min, LIMITS.detailPagesPerRun.max),
      runsPerMonth: clamp(raw.runsPerMonth, LIMITS.runsPerMonth.min, LIMITS.runsPerMonth.max),
      screenshotsPerRun: clamp(raw.screenshotsPerRun, LIMITS.screenshotsPerRun.min, LIMITS.screenshotsPerRun.max),
      isPremiumSite: !!raw.isPremiumSite,
      premiumMinCredits: clamp(raw.premiumMinCredits, LIMITS.premiumMinCredits.min, LIMITS.premiumMinCredits.max)
    };

    // Step 1 — each visited list page costs at least 1 credit; ceil() applies here only.
    var creditsPerListPage = input.rowsPerListPage > 0
      ? Math.max(1, Math.ceil(input.rowsPerListPage / 10))
      : (input.listPagesPerRun > 0 ? 1 : 0);

    var listCost = input.listPagesPerRun * creditsPerListPage;
    var detailCost = input.detailPagesPerRun * 1;
    var screenshotCost = input.screenshotsPerRun * 1;

    var baseCreditsPerRun = listCost + detailCost + screenshotCost;

    var creditsPerRun = input.isPremiumSite
      ? Math.max(baseCreditsPerRun, input.premiumMinCredits)
      : baseCreditsPerRun;

    var creditsPerMonth = creditsPerRun * input.runsPerMonth;
    var creditsPerYear = creditsPerMonth * 12;
    var percentOfFree = (creditsPerMonth / FREE_ALLOWANCE) * 100;

    var state;
    if (creditsPerMonth === 0) { state = "EMPTY"; }
    else if (creditsPerMonth <= 40) { state = "FREE_LIKELY_ENOUGH"; }
    else if (creditsPerMonth <= 50) { state = "FREE_MAY_BE_TIGHT"; }
    else { state = "PAID_LIKELY_NEEDED"; }

    // Personal has three billing options. The two annual plans grant their
    // credits upfront for the whole term and impose no monthly cap; the
    // monthly plan resets at 2,000 credits every cycle.
    var planRec = null;
    if (state === "PAID_LIKELY_NEEDED") {
      if (creditsPerYear <= 12000) { planRec = "ANNUAL_12K"; }
      else if (creditsPerYear <= 24000) { planRec = "ANNUAL_24K"; }
      else if (creditsPerMonth <= 2000) { planRec = "MONTHLY_2K"; }
      else { planRec = "ABOVE_PERSONAL"; }
    }

    return {
      input: input,
      creditsPerListPage: creditsPerListPage,
      listCost: listCost,
      detailCost: detailCost,
      screenshotCost: screenshotCost,
      baseCreditsPerRun: baseCreditsPerRun,
      creditsPerRun: creditsPerRun,
      creditsPerMonth: creditsPerMonth,
      creditsPerYear: creditsPerYear,
      percentOfFree: percentOfFree,
      state: state,
      planRec: planRec
    };
  }

  global.BrowseAiCredits = {
    FREE_ALLOWANCE: FREE_ALLOWANCE,
    LIMITS: LIMITS,
    calculate: calculate
  };

  // ---------------------------------------------------------------- UI ----

  function mount() {
    var form = document.getElementById("calcForm");
    var out = document.getElementById("calcResults");
    if (!form || !out) { return; }

    var els = {};
    Object.keys(LIMITS).forEach(function (name) { els[name] = document.getElementById(name); });
    var premiumToggle = document.getElementById("isPremiumSite");
    var premiumRow = document.getElementById("premiumRow");

    function fmt(n) { return Number(n).toLocaleString("en-US"); }

    function pct(part, whole) { return whole ? Math.round((part / whole) * 100) : 0; }

    function multiplierText(creditsPerMonth) {
      var v = creditsPerMonth / FREE_ALLOWANCE;
      return v >= 10 ? fmt(Math.round(v)) : String(Math.round(v * 10) / 10);
    }

    function readInput() {
      var raw = {
        isPremiumSite: !!(premiumToggle && premiumToggle.checked)
      };
      Object.keys(LIMITS).forEach(function (name) {
        raw[name] = els[name] ? els[name].value : 0;
      });
      return raw;
    }

    function driverMessages(r) {
      var msgs = [];
      var input = r.input;
      var base = r.baseCreditsPerRun;
      var premiumFloorActive = input.isPremiumSite && base < input.premiumMinCredits;

      if (premiumFloorActive) {
        msgs.push("The premium-site minimum is setting this cost, not your data volume. You're paying " +
          fmt(input.premiumMinCredits) + " credits per run for " + fmt(base) + " credits' worth of data.");
      } else if (base > 0) {
        var detailPct = pct(r.detailCost, base);
        var listPct = pct(r.listCost, base);
        var shotPct = pct(r.screenshotCost, base);
        if (detailPct >= 60) {
          var baseWithoutDetail = r.listCost + r.screenshotCost;
          var runWithoutDetail = input.isPremiumSite
            ? Math.max(baseWithoutDetail, input.premiumMinCredits)
            : baseWithoutDetail;
          msgs.push("Detail pages are driving most of this cost. Check whether the fields on those pages are ones you'll actually use — dropping them would cut this to about " +
            fmt(runWithoutDetail * input.runsPerMonth) + " credits/month.");
        } else if (listPct >= 60) {
          msgs.push("Cost is driven by list-page volume. This is the efficient shape — 10 rows per credit.");
        } else if (shotPct >= 60) {
          msgs.push("Screenshots are the main cost. Each one is 1 credit regardless of page size.");
        }
      }

      if (input.runsPerMonth >= 30 && r.creditsPerRun >= 20) {
        msgs.push("Frequency is multiplying an already-expensive run. Halving the schedule would save about " +
          fmt(Math.round(r.creditsPerMonth / 2)) + " credits/month.");
      }

      return msgs.slice(0, 2);
    }

    var UPFRONT_NOTE = "Annual plans grant credits upfront and do not impose a monthly credit cap, " +
      "so an uneven month is fine — but the grant has to last the whole term, " +
      "and this figure is an average month rather than your heaviest one.";

    function planHtml(r) {
      if (r.planRec === "ANNUAL_12K") {
        return '<p class="calc-plan">Personal annual 12k ($228/year, 12,000 credits upfront) covers this with ' +
          fmt(12000 - r.creditsPerYear) + ' credits to spare.</p>' +
          '<p class="calc-plan-note">' + UPFRONT_NOTE + '</p>';
      }
      if (r.planRec === "ANNUAL_24K") {
        return '<p class="calc-plan">This exceeds the 12,000 credits in the annual 12k plan. ' +
          'Personal annual 24k ($456/year, 24,000 credits upfront) covers it with ' +
          fmt(24000 - r.creditsPerYear) + ' credits to spare, and costs less than twelve months of ' +
          'monthly billing ($576) for the same annual capacity.</p>' +
          '<p class="calc-plan-note">' + UPFRONT_NOTE + '</p>';
      }
      if (r.planRec === "MONTHLY_2K") {
        return '<p class="calc-plan">Personal monthly ($48/month, 2,000 credits/month) covers this. ' +
          'Unlike the annual plans, this is a cap on every single month rather than an upfront grant, ' +
          'so a heavy month cannot borrow from a light one.</p>';
      }
      if (r.planRec === "ABOVE_PERSONAL") {
        return '<p class="calc-plan">This exceeds what the Personal plan covers in any of its three forms — ' +
          'annual 12k, annual 24k, and the 2,000 credits/month monthly plan. ' +
          'Before looking at higher tiers, try cutting detail-page extraction or halving the frequency — ' +
          'at this volume, redesigning the workflow usually saves more than changing plans.</p>';
      }
      return "";
    }

    function figure(value, unit, label) {
      return '<div class="calc-figure"><span class="calc-figure-value">' + value +
        '</span> <span class="calc-figure-unit">' + unit +
        '</span><span class="calc-figure-label">' + label + '</span></div>';
    }

    function breakdownHtml(r) {
      if (r.baseCreditsPerRun <= 0) { return ""; }
      var rows = "";
      function row(label, value) {
        rows += '<li><span class="calc-row-label">' + label + '</span><span class="calc-row-value">' +
          fmt(value) + ' credits/run (' + pct(value, r.baseCreditsPerRun) + '%)</span></li>';
      }
      if (r.listCost > 0) { row("List pages", r.listCost); }
      if (r.detailCost > 0) { row("Detail pages", r.detailCost); }
      if (r.screenshotCost > 0) { row("Screenshots", r.screenshotCost); }
      if (!rows) { return ""; }
      return '<div class="calc-breakdown"><h4>Where the cost comes from</h4><ul>' + rows + '</ul></div>';
    }

    function render() {
      var r = calculate(readInput());
      var html = '<h3 class="calc-results-title">Your estimate</h3>';

      if (r.state === "EMPTY") {
        out.innerHTML = html + '<p class="calc-empty">Enter your workflow above to see an estimate.</p>';
        return;
      }

      html += '<div class="calc-figures">' +
        figure(fmt(r.creditsPerRun), "credits", "Per run") +
        figure(fmt(r.creditsPerMonth), "credits", "Per month") +
        figure(fmt(r.creditsPerYear), "credits", "Per year") +
        figure(Math.round(r.percentOfFree) + "%", "", "Of the free allowance") +
        '</div>';

      if (r.state === "FREE_LIKELY_ENOUGH") {
        html += '<div class="calc-verdict calc-verdict--free"><p><strong>Free plan likely enough.</strong> ' +
          'This workflow uses about ' + Math.round(r.percentOfFree) + '% of the 50-credit free allowance. ' +
          'There’s no reason to upgrade based on volume alone — but check the 2-domain limit and the hourly minimum interval, which are separate constraints.</p></div>';
      } else if (r.state === "FREE_MAY_BE_TIGHT") {
        html += '<div class="calc-verdict calc-verdict--tight"><p><strong>Free plan may be tight.</strong> ' +
          'This uses about ' + Math.round(r.percentOfFree) + '% of your 50 monthly credits, leaving little room for test runs or retries. ' +
          'Consider reducing frequency or dropping unused fields before committing to a paid plan.</p></div>';
      } else {
        html += '<div class="calc-verdict calc-verdict--paid"><p><strong>A paid plan is likely needed.</strong> ' +
          'This workflow needs about ' + fmt(r.creditsPerMonth) + ' credits per month (' + fmt(r.creditsPerYear) + ' per year), ' +
          'which is ' + multiplierText(r.creditsPerMonth) + '× the free allowance.</p>' +
          planHtml(r) + '</div>';
      }

      html += breakdownHtml(r);

      var msgs = driverMessages(r);
      if (msgs.length) {
        html += '<div class="calc-drivers"><p>' + msgs.join('</p><p>') + '</p></div>';
      }

      out.innerHTML = html;
    }

    function syncPremium() {
      var on = !!(premiumToggle && premiumToggle.checked);
      if (premiumRow) { premiumRow.hidden = !on; }
      if (els.premiumMinCredits) { els.premiumMinCredits.disabled = !on; }
      render();
    }

    form.addEventListener("input", render);
    form.addEventListener("change", function (event) {
      if (event.target === premiumToggle) { syncPremium(); } else { render(); }
    });
    form.addEventListener("submit", function (event) { event.preventDefault(); });

    Array.prototype.forEach.call(form.querySelectorAll(".calc-chip"), function (chip) {
      chip.addEventListener("click", function () {
        if (els.runsPerMonth) { els.runsPerMonth.value = chip.getAttribute("data-runs"); }
        render();
      });
    });

    syncPremium();
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount);
    } else {
      mount();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
