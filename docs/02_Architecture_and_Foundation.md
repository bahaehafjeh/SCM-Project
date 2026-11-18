---
title: "SCM — Phase 1: Architecture & Foundation"
date: "2026-10-31"
depends_on: "01_Project_Discovery_Report.md"
decision: "Owner chose: start a new frontend in scm.v2 (2026-10-31)"
---

# Phase 1 — Architecture & Foundation

Phase 1 builds the **foundation every page will reuse**, not a full page set: token pipeline, app shell, information architecture, route registry, domain/data configuration, shared components and honest state patterns. One fully sourced page (Supply-Chain Coverage) is implemented as the reference pattern. The page you name next is built on this foundation.

## 1. Technical decisions

| Decision | Choice | Reason |
|---|---|---|
| Stack | Vite + React + TypeScript | No existing repo to preserve (Discovery §7). Typed config keeps domain data separate from presentation. |
| Routing | `react-router-dom` (browser router) | Stable, shareable URLs with nonsensitive context (IA §12). |
| Styling | Plain CSS + CSS custom properties generated from the Figma token JSON | Keeps the existing design system as the source of truth. No Tailwind/shadcn theme layer (brief §9). |
| Icons | `lucide-react` | Line icons matching the live build's icon style; tree-shaken. |
| Fonts | `Vazir FD-WOL` (copied from the locally installed files, OFL) + `@fontsource/inter` | Persian family per token; Inter is the token's English family and covers Latin, which WOL lacks. |
| Charts / maps | **Not added in Phase 1** | Added when the first analytical page is built, chosen against that page's needs. |

## 2. Information architecture (Phase-1 baseline)

> **Superseded** by `03_Information_Architecture_and_UX_Strategy.md` (§9). Kept for history; do not implement this section.

Primary navigation is grouped by **user intent**, following the approved IA v1.4 domains. Changes from the live build are listed with reasons.

```text
نمای کلی                         /                         Overview
تحلیل تجارت                      (domain)                  Trade Analytics
 ├─ نقشه مسیرها                  /trade/routes
 ├─ روندها و شاخص‌ها             /trade/trends             views: سهم کشورها · عملکرد تجارت
 ├─ تحلیل کالاها                 /trade/commodities        (moved out of data monitoring)
 ├─ روند تولید جهانی             /trade/production         (merges two duplicated production charts)
 └─ مقایسه کشورها و کالاها       /trade/compare            F02 — approved, not built
پایش ریسک                        (domain)                  Risk Monitoring
 └─ ارزیابی ریسک                 /risk/assessment          in development (landing only)
داده و پوشش                      (domain)                  Data & Coverage
 ├─ پوشش زنجیره تأمین            /data/coverage            ★ implemented in Phase 1
 ├─ نیازمندی‌های داده            /data/requirements
 ├─ کیفیت داده                   /data/quality
 ├─ گراف دانش                    /data/graph
 └─ منابع داده                   /data/sources             F05 — approved, not built
برنامه‌ریزی و اقدام (collapsed)  (domain)                  Planning & Actions — all in development
 ├─ سناریوسازی · مدلسازی و پیش‌بینی · بهینه‌سازی · پیشنهادها
Utilities (top bar): جستجو · دستیار هوشمند · پایگاه دانش (in development)
Not in navigation: Saved Analyses (F01), Reports (F03) — placement undecided (IA §7, open)
```

### Changes vs. the live build, and why

| Change | Reason (Discovery ref.) |
|---|---|
| «تحلیل تجارت و ریسک» split into **تحلیل تجارت** and **پایش ریسک** | Approved IA decision lock 1; the combined label implies risk analytics that do not exist (I3). |
| «نمودارهای آماری» moved from the data monitor to **تحلیل کالاها** | Trade analysis is not data-readiness monitoring (I1). |
| Production history becomes one page, **روند تولید جهانی** | It appeared twice (I2) and is FAOSTAT production, not trade; it should not sit inside a trade-trends tab (I8). |
| Data monitor becomes **داده و پوشش** with peer pages | Requirements and quality were reachable only inside one domain's drill-down (I7). The coverage cards and the schema graph answer different questions, so they get separate pages. |
| «پایگاه دانش» moved to the utility bar; single AI entry | Wrong group, duplicated entry (I4). |
| «برنامه‌ریزی و اقدام» collapsed by default | Five in-development items crowded primary navigation (I5). |
| Seven-stage model shown on Coverage and Overview | It had disappeared from the live build (I6). |

No live-build destination or label was removed; every one has a home (see `src/config/routes.ts`, field `legacyPath`).

## 3. Route status model

Every destination carries one status, shown consistently in navigation and on the page:

| Status | Meaning | Persian label |
|---|---|---|
| `available` | Built in this codebase with sourced data | — (no badge) |
| `migrating` | Exists in the live build; not yet rebuilt here | «در حال انتقال» |
| `in-development` | "Coming soon" in the live build; no approved content | «به‌زودی» |
| `planned` | Approved new capability (F01–F08), not built | «برنامه‌ریزی‌شده» |

This keeps **application readiness** separate from **data coverage** and **data quality** (brief §6).

## 4. Data-state model

Defined once in `src/domain/states.ts` and rendered by one component. These states are never merged:

`value` · `zero` · `missing` (expected but absent) · `invalid` · `not-collected` · `not-evaluated` · `not-applicable` · `incomplete-period` · `unknown` · `mock` (design sample).

Rule: averages and totals **exclude** `not-collected` / `not-evaluated` / `unknown` and state their denominators. For example, the live Overview's 15.8% average counted Consumer as 0 (Discovery D2).

## 5. Design-token pipeline

`scripts/build-tokens.mjs` reads the Figma exports in `design-tokens/` and writes `src/styles/tokens.css`:

- `:root` gets the primitives, brand tokens, semantic light tokens, radius, spacing, shadow and typography.
- `[data-theme="dark"]` and `prefers-color-scheme: dark` (unless `data-theme="light"`) get the semantic dark tokens.
- Each variable keeps its Figma alias as a `var()` reference, so the token chain stays traceable.

`src/styles/tokens-extension.css` holds the **minimal documented additions**, each built from existing raw ramps:

| Extension | Value source | Why |
|---|---|---|
| `--ext-status-{success,warning,info,danger}-{fg,bg,border}` | emerald / amber / sky / red ramps | No status tokens exist (T1); the live build already uses these meanings. |
| `--ext-focus-ring` = brand-shades/600 | blue Primary 600 | The token ring (#E5E5E5) is 1.26:1 on white (T4). |
| `--ext-primary-strong` = brand-shades/700 | blue Primary 700 | Used for small text and filled buttons, because white on primary/600 is 4.32:1 (T3). |
| `--ext-border-input` = unofficial/border 5 | neutral 500 (measured ≥3:1 in both themes) | Inputs need a visible boundary (T13). |
| `--ext-text-muted-on-muted` = unofficial/mid alt | neutral 600 | muted-fg on muted is 4.35:1 (T5). |
| `--ext-chart-1…8` | raw ramps (blue, orange, emerald, violet, amber, cyan, rose, slate) | No chart palette exists (T1). |

Not changed: dark mode keeps the token set as exported (neutral primary). Branding dark mode is an open owner decision (Discovery Q15).

Font weight: tokens ask for "DemiBold" (600). Vazir FD-WOL ships 300/400/500/700 only, so 600 resolves to the Bold file under CSS weight matching. This is documented, not hidden.

## 6. Code structure

```text
design-tokens/          Figma token exports (copied, unmodified)
scripts/build-tokens.mjs
public/fonts/           Vazir FD-WOL (OFL)
src/
  config/routes.ts      single registry: ids, paths, labels, status, domain, IA source, legacy path
  domain/               supply-chain model (stages, data domains), states, datasets
  data/                 sourced fixtures, each with a SourceRef (dataset, capture, date)
  lib/format.ts         Persian number/percent/date formatting
  components/           shell, layout and data-presentation building blocks
  pages/                page components; one per route id
  styles/               tokens.css (generated), tokens-extension.css, base.css
```

## 7. Phase-1 acceptance checks

- Every live-build destination maps to a registry entry; no dead links.
- Navigation, page header and breadcrumb read from the registry only.
- No number is rendered without a SourceRef; `not-collected` stages are excluded from averages.
- Text and focus pass the contrast pairs in §5; keyboard focus is visible.
- Layout works at 375 px, 768 px and 1440 px with no horizontal page scroll.
- Light and dark themes both render.
