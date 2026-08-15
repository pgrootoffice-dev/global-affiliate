# Global Affiliate

## Goal
Reach the first real affiliate revenue, then scale toward ¥30,000+/month.

## Operating rules
- Publish useful assets fast; improve after real data.
- Value first. Never promote a product only because commission is high.
- No fake reviews, fake personal experience, fabricated results, or unsupported claims.
- Clearly disclose affiliate relationships.
- Respect affiliate-program, platform, trademark, copyright, privacy, and advertising rules.
- No large automation before 5–10 useful assets are live.
- Keep AI/tool spend minimal; use existing ChatGPT + Claude plans first.
- Optimize for durable stock content, not disposable AI spam.

## Current experiment
- Market: English-speaking users first; expand internationally based on evidence.
- Distribution: Pinterest + search-friendly web content.
- Candidate offer: Reclaim.ai (must be approved by its affiliate program before monetized links are published).
- First KPI: publish -> impressions -> outbound click -> affiliate click -> first $1.

## Deployment
- Independent domain: `usefulworktools.com`, migrated from the previous GitHub Pages project-path URL.
- Registrar and DNS: Cloudflare. Hosting: GitHub Pages, `main` / repository root, custom domain set via `CNAME`.
- URL migration is complete. Canonical tags, `og:url`, Article JSON-LD, `sitemap.xml`, and `robots.txt` all reference the custom domain, and internal links are root-relative (`/page.html`).
- Google Search Console is configured; verification file is committed at the repository root.

## Article inventory
Published:
- `protect-focus-time.html` — protecting focus time on a busy calendar.
- `choose-ai-work-assistant.html` — choosing an AI assistant for everyday work.
- `automation-readiness-guide.html` — deciding what to automate first.
- `website-data-to-google-sheets-no-code.html` (#001) — website data into Google Sheets without code.
- `browse-ai-credits-calculator.html` (#002) — Browse AI credit estimator plus a plan-selection guide.

In progress:
- `browse-ai-vs-apify.html` (#003) — Browse AI vs Apify, implemented on `feature/browse-ai-vs-apify`, not yet merged or published.

## Affiliate status
- Browse AI: application pending.
- Apify: application pending.
- No affiliate link is live. Provider links point at official URLs and carry `data-affiliate` markers with `rel="nofollow"`; `rel="sponsored"` is withheld until approval.

## Next operational steps
- Obtain affiliate approval before adding any monetized link.
- Recheck provider pricing and free-tier terms against official sources immediately before publishing anything that cites them.
- Add affiliate links only with a nearby disclosure and preserve an ordinary-link fallback.
- Continue publishing useful assets before adding analytics or larger automation.
