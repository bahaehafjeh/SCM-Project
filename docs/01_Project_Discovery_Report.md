---
title: "SCM — Project Discovery Report (Phase 0)"
product: "سامانه هوشمند زنجیره تأمین کالاهای اساسی"
version: "1.0"
date: "2026-10-31"
status: "Discovery only — no design or code decisions taken"
working_directory: "C:\\Users\\User\\Desktop\\scm.v2 (empty at start of discovery)"
evidence_labels: "VERIFIED (seen in a source) · CONFLICT (sources disagree) · INFERRED (my reading, not stated) · UNKNOWN (no source)"
---

# SCM — Project Discovery Report

> **Scope of this report.** What exists, what each source says, where sources disagree, and what is unknown. No UI, no code, no redesign decisions. Every important finding cites its source using the IDs in §0.

---

## 0. Source inventory and authority

### 0.1 What was found

The working directory `scm.v2` was **empty**. There is **no local source code** for the running product. The project exists as documentation, design tokens, screenshots of a running build, and several earlier AI-generated concepts.

| ID | Source | Type | Date | Authority for this project |
|---|---|---|---|---|
| **IA** | `Downloads/SCM_User_Flows_and_Information_Architecture_FINAL_v1.4.md` | IA + user-flow contract (EN) | 2026-10-31 | **High** for scope decisions (F01–F12), flows, IA principles. **Medium** for page content — it describes screenshots, sometimes inaccurately (see §8). |
| **DI** | `Downloads/Essential_Commodities_Supply_Chain_Intelligence.md` | Data inventory of **v1** screens (EN) | 2026-10-14 | **High** for data semantics, evidence rules, datasets, KG schema. **Outdated** for numbers and layout (describes v1). |
| **LIVE** | `Desktop/screencapture-172-16-4-49-8000-ui-*.png` (9 files) | Full-page captures of the running build at `http://172.16.4.49:8000/ui` | 2026-10-27 | **Highest** for current implementation: real routes, labels, values, states. |
| **PDF** | `Desktop/زنجیره/png2pdf.pdf` (also `Desktop/png2pdf.pdf`) | PDF of the 9 LIVE captures | 2026-10-31 | Same evidence as LIVE. Image sizes match LIVE files 1:1 (1542×2013, ×1171, ×1495, ×1517, ×1609, ×1116, ×1532, ×2496, ×3565). |
| **TOK** | `Desktop/Design-Standards/DesignSystem DesignTokens (1)/*.zip` (11 Figma variable collections) | Design tokens (Figma export, shadcn-based) | 2026-08-24 | **Highest** for visual foundation. |
| **DS-MD** | `Desktop/Design-Standards/CLAUDE.md`, `ux-principles.md`, `nng_ux_guide.md` | Working rules + UX principles | Oct 2026 | Process rules (source-of-truth order, audit-before-change). |
| **KB** | `Downloads/UX_UI_Design_Knowledge_Base_EN.md` | UX knowledge base (NN/g, WCAG 2.2, APG) | 2026-10-07 | Reference guidance; WCAG 2.2 AA as default target. |
| **QA** | `Desktop/Design QA Checklist — چک‌لیست کنترل کیفیت طراحی.png` | 9-section Persian design QA checklist | 2026-10-26 | Acceptance checklist for later phases. |
| **V1** | `Desktop/زنجیره/image 19–33.png`, `Frame 21472308xx.png` | Screens of the **v1** build (teal theme) | 2026-10-14/19 | Historical; superseded by LIVE. Basis of DI. |
| **FIG** | `Downloads/SCM_RTL_Precision_V2.zip` (Figma plugin + `reference/page-1..9.png`), README_FA | Figma RTL-repair plugin for 9 frames in Figma file `VK7dE5TuZF3NoC7xG3n9lo` | 2026-10-28 | Confirms a Figma file exists with 9 `v1` frames; plugin is **untested on the real file** (its own README says so). |
| **CON-1** | `Desktop/زنجیره/داشبورد زنجیره تامین - Claude.html` (+ `_files`) | Saved Claude Design canvas "بازطراحی داشبورد زنجیره تأمین" | 2026-10-24 | **Not authoritative.** Concept built on v1 numbers; uses Vazirmatn, not the token font. |
| **CON-2** | `Desktop/SCM/New folder/SCM.HTML.txt` | Single-file Tailwind-CDN concept, teal palette | 2026-10-24 | **Not authoritative — anti-reference.** Contains fabricated KPIs (e.g. "۹۲٪ سلامت کل زنجیره", steel-ingot shortages, purchase-price index, 63 shipments). |
| — | `Downloads/Modirio_*.md`, `Desktop/Modirio_*.md` | Another product's IA | — | **Out of scope** (different product). |
| — | `Desktop/Screenshot 2026-10-28 120937.png` | Stock "glowing globe" image | — | Mood image only; no product content. |

**Not found anywhere:** frontend source code, `package.json`, routing config, component library, API/data contracts, dataset exports, the Risk Assessment screenshot cited by IA §IA-06, and any screen for Planning & Actions or Knowledge Base.

### 0.2 Authority rule used in this report

1. **Business scope / approved features:** IA (decision ledger §15, §22).
2. **What currently exists and how it is labelled:** LIVE.
3. **What the data means and its limits:** DI semantics + LIVE values (LIVE wins on numbers; DI wins on interpretation rules).
4. **Visual foundation:** TOK. (LIVE is close to TOK but not identical — §6.6.)
5. Concepts CON-1/CON-2 are never used as evidence.

---

## 1. Product overview

| Aspect | Finding | Source |
|---|---|---|
| Product name | سامانه هوشمند زنجیره تأمین کالاهای اساسی; shell subtitle «اتاق کنترل زنجیره تأمین» | LIVE (all), DI §1.1 |
| Positioning | "Trade & Supply Chain Intelligence Platform" for national/sectoral/market-level analysis; large importers/manufacturers are secondary | IA §0, §22 |
| Stated application domains | Food industries, petrochemicals, housing, transport, finance, strategic reserves — **scope statement, not data coverage** | DI §1.1, V1 home |
| Logged-in user example | "bahareh afjeh" · «ذخایر راهبردی» (strategic reserves) | LIVE sidebar footer |
| Core reality | The product today is a **trade-data and data-readiness analytics tool** for essential commodities. Operational supply-chain data (inventory, warehouses, shipments, factories, retail) is **largely not available**. | LIVE requirements table; DI §4.2 |

### 1.1 Primary users (proto-personas, not research-validated)

From IA §1: International Trade Analyst (primary), Trade & Supply-Chain Risk Analyst (primary), Head of Trade Intelligence / Policy Director (decision-maker), Commodity & Market Intelligence Specialist, Data Quality Analyst / Data Steward (supporting), Enterprise Procurement / Logistics Manager (secondary). IA explicitly states these are **not interview-validated**.

### 1.2 Decisions users need to make (from IA flows UF-01…UF-11)

- What changed / what merits investigation (Overview → analysis).
- How a commodity's or country's trade evolved, and with whom.
- Which routes/chokepoints carry relevant trade.
- **Whether the data is fit to support a conclusion** (Data Health → Requirements → Sources) — this is a first-class decision in this product, not a side concern.
- Compare countries/commodities like-for-like (F02, approved, not built).

---

## 2. Complete application architecture

### 2.1 Current implemented navigation (LIVE, 2026-10-27)

```text
[Shell] Logo «زنجیره تأمین / اتاق کنترل زنجیره تأمین» · Global search «جستجوی داده، تحلیل و...» (Ctrl K)
        · Floating «دستیار هوشمند» button · Footer «تاریخ به‌روزرسانی ثبت نشده» · user card
│
├── مرکز کنترل                                  (section label)
│   ├── نمای کلی زنجیره            /ui
│   ├── پایش وضعیت داده‌ها          /ui/data
│   │     └── (drill-down) مواد اولیه و انبار آنها   /ui/data/trade-data
│   │            tabs: نمای کلی داده · کیفیت داده · نمودارهای آماری
│   └── تحلیل تجارت و ریسک (expandable)
│         ├── نقشه مسیرها            /ui/analysis/routes
│         ├── روندها و شاخص‌ها      /ui/analysis/trends/{commodity|performance|production}
│         │      tabs: نمای کلی تجارت کالاها · عملکرد تجارت · مقایسه تولید محصولات
│         └── ارزیابی ریسک           [به‌زودی]
│
└── برنامه‌ریزی و اقدام                          (section label)
    ├── سناریوسازی                   [به‌زودی]
    ├── مدلسازی و پیش‌بینی           [به‌زودی]
    ├── بهینه‌سازی                    [به‌زودی]
    ├── پیشنهادها                    [به‌زودی]
    ├── پایگاه دانش                  [به‌زودی]
    └── دستیار هوشمند                (no badge; also floating button)
```

Routes are **VERIFIED from capture filenames**, e.g. `screencapture-172-16-4-49-8000-ui-analysis-trends-performance-…png`. Tab-to-route mapping for `/ui/data/trade-data` (three tall captures) is INFERRED from matching image heights to the PDF pages.

### 2.2 Approved target capability map (IA §7, §22)

| Domain | Pages | Status per IA |
|---|---|---|
| Overview | KPIs, warnings, chokepoints, shipment summary, trend snapshot, affected commodities | Observed |
| Trade Analytics | Trade Routes (canonical owner), Trends & Indicators (3 views), Commodity/Materials Analytics, **Compare (F02)** | Approved separate domain |
| Risk Monitoring | Risk Assessment landing only (in development); 3 concept cards are **not** routes | Approved separate domain |
| Data & Coverage (specialist) | Data Health, Requirements Coverage, Coverage & Relationship Graph, **Source Transparency (F05)** | Approved |
| Planning & Actions | Scenario Planning, Forecasting, (Optimization), Recommendations — preserve, content unverified | Preserve, in development |
| Cross-cutting, placement **undecided** | Saved Analyses (F01), Report Builder (F03) | Approved, placement TBD |
| Global | Search, AI Assistant (F08), Knowledge Base, account | Observed / approved |

**Scope ledger (IA §15):** approved new = F01, F02, F03, F05, F08 · deferred = F06, F07 · rejected = F04 (alert subscriptions), F09 (new forecasting/scenarios), F10 (concentration scoring), F11 (tariffs), F12 (shipment/company intelligence).

### 2.3 Current vs. approved — the gap

| Area | LIVE has | IA requires | Gap |
|---|---|---|---|
| Domain split | "تحلیل تجارت و ریسک" is **one** group | Trade Analytics and Risk Monitoring are **separate** | Structural change pending |
| Commodity analytics | Lives inside **Data monitor** (`/ui/data/trade-data` → «نمودارهای آماری») | Belongs in **Trade Analytics** | Misplaced analytical content |
| Data area | پایش وضعیت داده‌ها (coverage + KG) and a per-stage drill-down | Data Health / Requirements / Coverage & Graph / Sources as peer pages | Grouping differs |
| F01/F02/F03/F05 | Not present | Approved | Not built |
| F08 AI | Entry visible (2×), capability UNKNOWN | Grounded, cited assistant | Unverified |
| Knowledge Base | Under برنامه‌ریزی و اقدام | Global utility | Mis-grouped |

---

## 3. Supply-chain domain model

### 3.1 Three taxonomies that must not be conflated

| # | Conceptual stage (V1 home, DI §1.4) | Secondary meaning (V1 home) | Data-monitoring domain (LIVE `/ui/data`) | Coverage shown LIVE | Coverage shown V1 (Oct 14) |
|---|---|---|---|---|---|
| 1 | مواد اولیه — Raw Materials | تأمین و شناسایی | **مواد اولیه و انبار آنها** (one domain) | 40٪ | 85.7٪ |
| 2 | انبار — Warehousing | ذخیره و ظرفیت | ↑ merged into domain 1 | — | — |
| 3 | صنایع — Industries | تولید و تبدیل | صنایع | 5٪ | 15.4٪ |
| 4 | بسته‌بندی — Packaging | ظرفیت و انواع | بسته‌بندی | 15٪ | 34.6٪ |
| 5 | توزیع — Distribution | مسیر و حمل‌ونقل | توزیع | 15٪ | ارزیابی نشده |
| 6 | خرده‌فروشی — Retail | عرضه و تقاضا | خرده‌فروشی | 20٪ | ارزیابی نشده |
| 7 | مصرف‌کننده — Consumer | مصرف نهایی | مصرف‌کننده [به‌زودی] | «در انتظار گردآوری داده» | not shown |

- **7 conceptual stages → 6 data domains** (Raw Materials + Warehousing share one). VERIFIED (LIVE `/ui/data`, overview strip numbered ۱–۶).
- The coverage % is defined on screen as *"درصد نیازمندی‌های داده تعریف‌شده که پوشش داده شده‌اند؛ نشان‌دهنده کیفیت داده یا پیشرفت فیزیکی نیست"* (LIVE overview). This is **requirements coverage**, not quality, not completeness, not operational progress.
- Only the **Raw Materials & Warehouses** domain has a drill-down (requirements, quality, charts). Other domains' cards have a chevron but no captured destination — UNKNOWN.
- **CONFLICT:** coverage values changed between V1 (85.7/15.4/34.6) and LIVE (40/5/15/15/20) with no documented methodology change.
- A separate "Iran-specific datasets" group (0٪ progress) existed in V1 (`image 20.png`, DI §3.3) and is **absent from LIVE**. Whether it was removed or relocated is UNKNOWN.

### 3.2 Application modules vs. analytical capabilities

| Concept | Instances |
|---|---|
| Application modules (nav) | Overview, Data Monitor, Trade & Risk Analysis, Planning & Actions (5 coming-soon), AI Assistant |
| Analytical capabilities (built) | Trade trend analysis, commodity composition, chokepoint transit analysis, port-type and alternative-route composition, country import share, bilateral partner analysis, production history (FAOSTAT), requirement coverage, dataset quality profiling, KG schema browsing |
| Analytical capabilities (approved, not built) | Compare (F02), Source transparency (F05), Save (F01), Reports (F03), grounded AI (F08) |
| Claimed but not evidenced | V1 home claims «۷ ماژول تخصصی», «نقشه عملیاتی» (materials, warehouses, factories), «مدل‌سازی و پیش‌بینی» — product claims, not working features (DI §2.1) |

### 3.3 Transport, ports, routes, chokepoints

Represented as **trade-route analytics over a 12-month maritime dataset**, not logistics operations: routes are *computed/assigned* to trade records (only ~41% have one); scenario routes are *alternative-route evaluations*; route lines are "candidate" paths. LIVE trade-performance map states: «خطوط نشان‌دهنده ارتباط تجاری‌اند، نه مسیر واقعی حمل». VERIFIED.

---

## 4. Navigation and page hierarchy — page-by-page inventory (LIVE)

For each page: purpose · primary content · secondary · details · states observed.

### P1. نمای کلی زنجیره — `/ui`
- **Header:** title, subtitle «وضعیت تأمین، موجودی، محموله‌ها و مسائلی را که نیاز به بررسی دارند مرور کنید», «آخرین محاسبه: ۵ آبان ۱۴۰۵، ۱۵:۱۶».
- **KPI row (4):** سلامت زنجیره تأمین «به زودی / در حال بررسی»; هشدارهای بحرانی ۳ (۲ زیاد · ۰ متوسط · ۵ هشدار باز); تعداد کل موجودی ۱۴ قلم; محموله‌های در مسیر ۵۰ (۱۱ با تأخیر · ۴ دچار اختلال). **Three of four are tagged «نمونه طراحی · به‌زودی» (design sample).**
- **Coverage strip:** six domains with %; «میانگین کل فازها: ۱۵٫۸٪».
- **Warnings list** «هشدارهای نیازمند بررسی» (tagged sample): 3 of 5 shown, severity filter chips (همه ۵ / بحرانی ۳ / زیاد ۲ / متوسط ۰), distribution by severity and by type (محموله ۲، موجودی ۳، داده ۰، قیمت ۰), «مشاهده جزئیات» buttons, «نمایش هشدارهای دیگر».
- **Chokepoint status** (NOT tagged sample): top-3 by transit value — Panama 378,423.9 (42٪), Hormuz 262,267.9 (29٪), Gibraltar 254,743.1 (28٪); total 895,435 M USD.
- **Shipment status** (tagged sample): 70٪ on plan; ۳۵ on plan / ۱۱ delayed / ۴ disrupted; CTAs «هشدارهای محموله (۲)», «مسیرها روی نقشه».
- **Commodity trade-value trend:** top-4 (نفت خام، گاز نفتی، زغال‌سنگ، سنگ آهن) sparklines, 6/12-month toggle, change −91.5٪, −93.7٪, −97.5٪, −91.4٪.
- **Below-safety-stock table** (tagged sample): 12 items, warehouse, stock/safety/shortfall (tonnes), pagination.

### P2. پایش وضعیت داده‌ها — `/ui/data` (page title: «پوشش داده‌های زنجیره تأمین»)
- Six domain cards (title, description, coverage %, chevron); consumer card «به‌زودی / در انتظار گردآوری داده».
- **گراف دانش زنجیره تأمین:** «۱۲ نوع گره، ۲۵ رابطه», node-focus dropdown «تمرکز روی یک گره», node search, zoom/fullscreen/reset, footnote: «این نما ساختار تعریف‌شده گراف است، نه رکوردهای زنده پایگاه داده». Nodes shown: Country, Commodity, GlobalTradeFlow, TradeFlow, CommodityGroup, TransportMode, Port, RouteZone, Route, Chokepoint, RouteScenario, TradeRoute.

### P3. مواد اولیه و انبار آنها — `/ui/data/trade-data` (breadcrumb from پایش وضعیت داده‌ها; back arrow)
- **Tab نمای کلی داده:** «وضعیت پوشش نیازمندی‌های داده — ۱۴ نیازمندی تعریف‌شده · پوشش: ۴۰٪», status filter «همه وضعیت‌ها (۱۴)», table (شناسه، نیازمندی، وضعیت پوشش، توضیح). Statuses: پوشش کامل (4) · پوشش جزئی (4) · داده موجود نیست (6). Rows in §5.3.
- **Tab کیفیت داده:** KPIs — میانگین سلامت داده‌ها «به زودی»; مجموعه‌های نیازمند توجه ۲ («حداقل یک مشکل با سهم ۲۰٪ یا بیشتر»); کل رکوردها ۱,۰۸۹,۹۸۶ («۳ مجموعه‌داده دارای گزارش»); آخرین بروزرسانی ۱۴۰۵/۰۶/۰۶ («۶۰ روز پیش»). Three dataset blocks with rule rows (مفقود / نامعتبر chips, % + ring, affected records "X رکورد از Y رکورد بررسی‌شده") and metadata grids. Details in §5.2.
- **Tab نمودارهای آماری:** 9 analytical modules (commodity trade analytics) — §5.4.

### P4. نقشه مسیرها — `/ui/analysis/routes`
- Subtitle «نمایش بنادر، گلوگاه‌های کاندید، مسیرهای اصلی و مسیرهای سناریویی تجارت».
- **Filter panel:** globe/flat toggle; گلوگاه کاندید, روش حمل‌ونقل, کالا, بندر بارگیری, بندر تخلیه, کشور مبدأ, کشور مقصد, کارک ارزش تجارت, بازه زمانی (disabled: «کل دوره داده‌های مسیر»); layer toggles مسیرهای اصلی, مسیرهای سناریویی, بنادر, محدوده گلوگاه; «پاک کردن فیلترها».
- **Map** (Neshan/OSM tiles): zoom, fullscreen, reset layout; empty overlay «مسیر داده نمایش داده شده · ۳,۸۲۷ مسیر اصلی مطابق فیلتر»; legend دریایی/جاده‌ای/ترکیبی/نامشخص/سناریو/گلوگاه.
- **Summary panel:** ارزش تجارت ۲,۱۹۹٫۳۲ میلیارد دلار; تجارت‌ها ۱۶۳,۳۰۵; مسیرها ۳,۸۲۷; وزن معتبر ۶,۷۰۷,۶۰۸٫۴۲ هزار تن; share by candidate chokepoint (کانال مانش/دریای… 22.79٪, Hormuz 7.85٪, Malacca 2.74٪, Gibraltar 2.23٪, Suez 1.75٪, Dardanelles/Bosphorus 1.13٪, Panama 0.07٪); monthly trade-value sparkline 2025-05→2026-04; main countries (importers/exporters toggle): China 245.14, USA 196.99, Canada 147.05, Netherlands 120.11, Saudi Arabia 96.34 B USD.

### P5. روندها و شاخص‌ها — three tabs, global header toggle «بازه داده: ۱۲ ماه میلادی | ۶ سال میلادی»
- **P5a نمای کلی تجارت کالاها** (`/trends/commodity`; subtitle «سهم کشورها از تجارت جهانی هر کالا»): filters (globe/flat, flow import/export, commodity, basis value/weight); choropleth "سهم از ارزش واردات جهانی" (0–100 bins, «بدون داده» hatch); panel «همه کالاها · ارزش کل واردات ۱,۲۴۲٫۸ میلیارد دلار», top-10 countries + «سایر ۲۰۷ کشور ۳۹٫۵٪»; charts: «روند ماهانه ارزش واردات همه کالاها» (value/weight toggle), «رشد ماهانه نسبت به دوره قبل» (bars, April ≈ −100٪).
- **P5b عملکرد تجارت** (`/trends/performance`; subtitle «جریان تجارت یک کشور با شرکای تجاری‌اش»): filters (flow, country=ایران, commodity, period, «نمایش همه شرکا روی نقشه»); globe flow map (15 of 33 partner links); panel: Iran imports 1.36 B USD, 33 partners, «از می 2025 تا آوریل 2026: −۹۹٫۹۶٪»; partners (Pakistan 79.77٪, India 8.22٪, Brazil 5.38٪ …); charts: monthly import trend (falls to ~0 Feb–Apr 2026; note «انتخاب دوره در فیلترها، این روند را محدود نمی‌کند»), bubble scatter «شرکا: سهم در برابر رشد بازار» with «رشد نامشخص» strip.
- **P5c مقایسه تولید محصولات** (`/trends/production`; subtitle «روند و رشد سالانه تولید محصولات کشاورزی و دامی»): filters (شاخص=میزان تولید, کشور=همه, بازه ۱۹۶۱–۲۰۲۴), multi-line chart of 12 products (million tonnes), side list with sparkline + growth since 1961 (e.g. برنج ۲۸۷٫۴۹٪, روغن خام سویا «نامشخص»), select-all/clear; heatmap «رشد سالانه میزان تولید نسبت به سال قبل» (7 bins, ±15٪, blank = unknown/zero base).

### P6–P11. Not captured / not built
Risk Assessment (به‌زودی in nav; IA cites a separate screenshot that is **not in the project files**), Scenario Planning, Modeling & Forecasting, Optimization, Recommendations, Knowledge Base, AI Assistant panel, other domain drill-downs (Industries, Packaging, Distribution, Retail). All **UNKNOWN**.

---

## 5. Dataset inventory

### 5.1 Datasets (VERIFIED in LIVE «کیفیت داده»; dates cross-check DI §5)

| ID | Dataset (fa) | Scope | Grain / classification | Period | Last update (LIVE Jalali = DI Gregorian) | Key metadata |
|---|---|---|---|---|---|---|
| **DS-01** | داده‌های بنادر | Ports in all countries; name, country, geo-location | 1 row = 1 port; 17,506 ports | — | ۱۴۰۵/۰۳/۱۷ = 2026-06-07 | 231 countries |
| **DS-02** | داده‌های جریان تجارت در یک سال میلادی | 14 essential commodities, monthly; value, weight, direction, country, HS4, **predicted** loading/discharge ports, sea route, chokepoints, vessel class, cargo type | 1 row = 1 trade; 281,701 records | 2025/05 → 2026/04 | ۱۴۰۵/۰۳/۱۶ = 2026-06-06 | 231 importers, 78 exporters, 14 commodities, HS4, 11 chokepoints, flow types: export / import / re-export / re-import, route type: maritime, vessel class: bulk carrier / tanker, cargo: bagged-or-container / dry bulk / liquid bulk, mode (unlocated): «احتمالاً دریایی، دریایی + جاده‌ای، احتمالاً جاده‌ای» |
| **DS-03** | داده‌های سری زمانی جریان تجارت | **18** essential commodities, annual; value, weight, direction, country, HS6, year | 1 row = 1 trade; 790,779 records | 2019 → 2024 | ۱۴۰۵/۰۶/۰۶ = 2026-08-28 | 231 importers, 230 exporters, 18 groups, 38 commodities, HS6 (HS2017 + HS2022), export/import |
| **DS-04** | FAOSTAT production (implied) | 12 agri/livestock products; production by country/year | product × country × year | 1961 → 2024 (product-specific last year) | UNKNOWN | Source "FAOSTAT" per DI §11.1; **not listed** in LIVE quality page |
| **DS-05** | Route/scenario derivations | 3,827 main routes; 221,578 alternative routes evaluated; 1 unique transport-mode route type; 2 max alternatives per trade | derived | DS-02 period | Map «آخرین محاسبه» shown in V1 (2026-10-13 18:24) | Methodology UNKNOWN |
| **DS-06** | Industries / Packaging / Distribution / Retail inputs | V1 labels: Industries & Packaging = «فایل CSV» | UNKNOWN | UNKNOWN | UNKNOWN | Not profiled anywhere |
| **DS-07** | Overview operational data (warnings, inventory, shipments, safety stock) | Marked «نمونه طراحی · به‌زودی» | — | — | — | **Mock data**, not a dataset |

Records check: 17,506 + 281,701 + 790,779 = **1,089,986** = LIVE «کل رکوردها». VERIFIED.

### 5.2 Data-quality findings (LIVE, rule-level)

| Dataset | Rule (fa, abbreviated) | Type | % | Affected / checked |
|---|---|---|---|---|
| DS-01 | موقعیت جغرافیایی نامعتبر | مفقود | 25.2٪ | 4,411 / 17,506 |
| DS-01 | بندرهای فاقد داده ترافیک دریایی | مفقود | 99.71٪ | 17,456 / 17,506 |
| DS-01 | کشورهای نامشخص | نامعتبر | 0.14٪ | 24 / 17,506 |
| DS-02 | فاقد وزن محموله | مفقود | 1.16٪ | 3,257 / 281,701 |
| DS-02 | فاقد مسیر پیش‌بینی‌شده | مفقود | 41.24٪ | 116,165 / 281,701 |
| DS-02 | فاقد گلوگاه پیش‌بینی‌شده | مفقود | 41.24٪ | 116,165 / 281,701 |
| DS-02 | فاقد مسافت معتبر در مسیر شناسایی‌شده | مفقود | 1.35٪ | 2,231 / **165,536** |
| DS-02 | فاقد ردهٔ شناور پیش‌بینی‌شده | مفقود | 44.41٪ | 125,094 / 281,701 |
| DS-02 | فاقد نوع مسیر حمل‌ونقل پیش‌بینی‌شده | مفقود | 40.08٪ | 112,896 / 281,701 |
| DS-02 | کشورهای واردکنندهٔ نامشخص | نامعتبر | 9.25٪ | 26,060 / 281,701 |
| DS-03 | فاقد وزن محموله | مفقود | 0.12٪ | 917 / 790,779 |
| DS-03 | کشورهای واردکنندهٔ نامشخص | نامعتبر | 7.62٪ | 60,229 / 790,779 |
| DS-03 | کشورهای صادرکنندهٔ نامشخص | نامعتبر | 11.83٪ | 93,514 / 790,779 |

Notes: denominators differ per rule (e.g. distance rule uses 165,536 = trades with an identified route). LIVE improves on DI by showing numerator/denominator. The "مفقود vs نامعتبر" distinction exists and is valuable.

### 5.3 Requirements matrix — Raw Materials & Warehouses (LIVE, 14 rows)

| # | نیازمندی | Status | Note (abridged) |
|---|---|---|---|
| 1 | طبقه‌بندی کالا و کدهای تعرفه گمرکی (HS) | کامل | HS4 for 14, HS6 for 18; raw-material names and industry classification exist |
| 2 | ارزش و وزن اختصاصی برای هر قلم ماده اولیه | موجود نیست | No per-item price/value series |
| 3 | وضعیت صادرات و واردات | کامل | |
| 4 | کشور مبدأ و مقصد | جزئی | Missing for part of trades |
| 5 | ارزش و حجم واردات و صادرات | کامل | Per trade |
| 6 | تاریخ و زمان دقیق ورود و خروج مواد اولیه | موجود نیست | Only year/month |
| 7 | روندهای شش‌ماهه و یکساله | کامل | 12 consecutive months for 14 commodities |
| 8 | مسیرهای دریایی، بنادر و گلوگاه‌های عبوری | جزئی | ~41% of trades lack a route |
| 9 | مسیرهای هوایی، جاده‌ای و ریلی | موجود نیست | Only maritime |
| 10 | اطلاعات بنادر | جزئی | ~25% of ports lack location; traffic ~unavailable |
| 11 | ظرفیت و موجودی انبارهای بنادر | موجود نیست | |
| 12 | اطلاعات شناورها و کشتی‌ها | موجود نیست | |
| 13 | داده‌های سری زمانی | جزئی | 18-commodity 2019–2024 link to the 14 unclear; production 1961–2024 |
| 14 | داده‌های زنده | موجود نیست | |

**Implication:** the "Warehousing" half of the merged domain has **no data** (rows 11 and the absence of any warehouse dataset). The domain name «مواد اولیه و انبار آنها» overstates what is covered.

### 5.4 Analytical modules and charts (LIVE)

| ID | Location | Title (fa) | Chart form | Dataset | Measures / unit | Period |
|---|---|---|---|---|---|---|
| A-01 | P3 charts | فعالیت ماهانه تجارت | bars + 2 lines, **3 axes** | DS-02 | trade count, value (B USD), weight (M t) | 2025/05–2026/04 |
| A-02 | P3 charts | روند سالانه تجارت جهانی | bars + 2 lines, 3 axes | DS-03 | count, value, weight | 2019–2024 |
| A-03 | P3 charts | سهم هر یک از ۱۴ کالای اساسی | radial/donut, 14 slices; centre 253,469 trades | DS-02 | share of **trade count** with valid value & weight | DS-02 period |
| A-04 | P3 charts | سهم هر گروه کالاهای اساسی از کل تجارت‌های جهانی | radial/donut, 18 slices; centre 637,776; «کل دوره» select | DS-03 | share of trade count | 2019–2024 |
| A-05 | P3 charts | تجارت‌های عبوری از گلوگاه‌های حیاتی | 2 KPI boxes + 3 parallel bar lists × 11 chokepoints | DS-02/05 | count, value (B USD), weight (M t) | DS-02 period |
| A-06 | P3 charts | سناریوهای بررسی‌شده برای تعیین مسیر جایگزین | 3 KPIs + donut (6 scenarios) | DS-05 | share of 221,578 alternative routes | — |
| A-07 | P3 charts | انواع بنادر | 3 KPIs + donut (96٪ دریایی) + 6-item list | DS-01 | port count by type | — |
| A-08 | P3 charts | روند تاریخی تولید | area/line, dual axis; selects (شاخص, کالا, مقدار شاخص) | DS-04 | production (M t) + count of producing countries | 1961–2024 |
| A-09 | P4 | Route map + panel | geo network + bars + sparkline | DS-02/05/01 | value, trades, routes, weight | DS-02 period |
| A-10 | P5a | Country share map + top-10 + 2 charts | choropleth, bars, area, growth bars | DS-02 | import value share; MoM % | DS-02 period |
| A-11 | P5b | Partner flow + KPIs + 2 charts | globe flow map, bars, area, bubble scatter | DS-02 | value, partner share, growth | DS-02 period |
| A-12 | P5c | Production comparison | 12-line chart + list; diverging heatmap | DS-04 | production (M t); YoY % | 1961–2024 |
| A-13 | P1 | Commodity trend sparklines | 4 sparklines | DS-02 | value (M USD), first-vs-last change | 6/12 months |
| A-14 | P1 | Chokepoint status | 3 bars | DS-02/05 | transit value (M USD) | — |
| A-15 | P2 | Knowledge graph | node-link | KG schema | — | — |

### 5.5 Commodity taxonomies (must be kept distinct)

| Set | Members (LIVE labels) | Source |
|---|---|---|
| **14 essential commodities (HS4)** | قهوه، شکر، برنج، کودهای نیتروژنه، ذرت، گاز نفتی، روغن پالم، گندم، سویا، دانه کاکائو، زغال‌سنگ، نفت خام، سنگ آهن، سنگ مس | A-03 legend |
| **18 groups / 38 commodities (HS6)** | روغن خام و RBD پالم، گوشت گوساله، گوشت گاو، گوشت مرغ منجمد، برنج نیمه‌سفید، برنج کاملاً سفیدشده، سایر روغن‌های خوراکی خام، شکر خام نیشکر، ذرت خوراکی دامی، روغن خام سویا، جو، روغن خام کلزا یا کانولا، کنجاله سویا، روغن خام آفتابگردان، گندم، سویا (سایر)، سویای تراریخته، گوشت مرغ تازه یا سرد | A-04 legend |
| **12 FAOSTAT products** | برنج، سویا، گوشت گاو یا گوساله، گوشت مرغ، گندم، جو، ذرت خوراکی دامی، روغن خام سویا، روغن خام آفتابگردان، روغن خام کلزا یا کانولا، سایر روغن‌های خوراکی خام، شکر خام نیشکر | P5c legend |

The 14 HS4 set mixes food, energy (crude oil, petroleum gas, coal) and metal ores; the 18/12 sets are food/agri only. "کالای اساسی" therefore has **no single definition** across the product. No HS4↔HS6↔FAOSTAT mapping is documented (DI V-05, V-18; LIVE requirement 13).

### 5.6 Knowledge-graph schema
12 node types (VERIFIED, LIVE P2). 25 relationship types claimed; ~20 relationship labels legible in V1 (DI §7.3): `IMPORTED_BY, EXPORTED_BY, PRODUCES, COVERS, OF_COMMODITY, PART_OF, LOCATED_IN, USES_GATEWAY, HAS_ALTERNATIVE_MODE, DEPENDS_ON, IN_ROUTE_ZONE, HAS_SCENARIO, HAS_ROUTE_MAPPING, LOADS_AT, DISCHARGES_AT, STARTS_AT, ENDS_AT, USES_ROUTE, PASSES_THROUGH, USES_MODE`. Full edge list, direction and cardinality UNKNOWN. The graph shows **schema**, not instances (stated on screen).

### 5.7 Time references (must not be merged)

| Value | Meaning | Source |
|---|---|---|
| ۵ آبان ۱۴۰۵، ۱۵:۱۶ | Overview «آخرین محاسبه» (computation time) | LIVE P1 |
| ۱۴۰۵/۰۶/۰۶ (۶۰ روز پیش) | Latest dataset update (= DS-03) | LIVE P3 quality |
| ۱۴۰۵/۰۳/۱۷ · ۱۴۰۵/۰۳/۱۶ · ۱۴۰۵/۰۶/۰۶ | Per-dataset updates | LIVE P3 |
| «تاریخ به‌روزرسانی ثبت نشده» | Sidebar footer — global update date not recorded | LIVE shell |
| 2025/05–2026/04 · 2019–2024 · 1961–2024 | Reporting periods (Gregorian) | LIVE |

Calendar mix: dataset metadata in **Jalali**, reporting periods and chart axes in **Gregorian** (month names «مه ۲۵، ژوئن ۲۵…»), page-header date in V1 was Gregorian `2026/10/14`.

---

## 6. Design-system analysis (TOK)

### 6.1 Structure
Figma Variables export (W3C-like `$value/$type` with `com.figma.aliasData`). Three tiers:
1. **Primitives:** `raw colors` (Tailwind-style ramps 50–950 for 22 hues incl. custom `blue (Primary)` and `orange (Secondary)`), `alpha` (black/white 0–100, 14 steps each), `border radius (absolute)`, `spacing (absolute)`.
2. **Brand:** `brand colors` → `brand-neutrals/*` (= neutral ramp), `brand-shades/*` (= blue Primary), `brand-combinations/1|2`.
3. **Semantic (shadcn model):** `semantic colors` in two modes (`shadcn` light, `shadcn-dark`), `border radius` (`rounded-*` aliases), `spacing`, `shadows`, `typography (Persian)` / `typography (English)`.

### 6.2 Colour — key semantic values

| Token | Light | Dark |
|---|---|---|
| general/background | #FFFFFF | #000000 |
| unofficial/body background | #FFFFFF | #0A0A0A |
| general/foreground | #000000 | #FAFAFA |
| card/card · card foreground | #FFFFFF · #0A0A0A | #171717 · #FFFFFF |
| **general/primary** | **#416DFF** (blue/600) | **#F5F5F5** (neutral!) |
| primary hover | #375DD9 (brand-shades/700) | #D4D4D4 |
| general/secondary | #FF4000 (orange/600) | #262626 |
| accent / muted | #F5F5F5 | #171717 |
| muted foreground | #737373 | #A3A3A3 |
| destructive | #DC2626 | #9E4042 (un-aliased) |
| border | #E5E5E5 | #404040 |
| focus/ring | #E5E5E5 | #404040 |
| popover | #000000 / fg #FFFFFF | #FFFFFF / fg #000000 |
| sidebar | #FAFAFA, fg #404040, primary #171717 | #0A0A0A, fg #D4D4D4 |

Plus 20 `unofficial/*` tokens (ghost, outline, accent 0/2/3, border 0–5, destructive border/text/subtle, backdrop 60%).

### 6.3 Typography

| Role | Size / line-height | Weight |
|---|---|---|
| heading 1 | 48 / 72 | DemiBold |
| heading 2 | 30 / 45 | DemiBold |
| heading 3 | 24 / 36 | DemiBold |
| heading 4 | 20 / 30 | DemiBold |
| paragraph x-large / large / regular / small / mini | 20/27 · 18/27 · 16/24 · 14/20 · 12/16 | Regular / Medium / DemiBold / Bold variants |
| caption | 14 / 21 | Regular |
| monospaced | 16 / 24 | Regular |

Persian family: **`Vazir FD-WOL`** for sans, serif, headings, body **and monospace**. English set: Inter, identical metrics. "FD" = Farsi digits; "WOL" = without Latin (INFERRED from the font's naming convention — must be confirmed).

### 6.4 Spacing, radius, shadow
- Spacing (semantic): 0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96. Absolute adds 10, 14, 28, 36, 44, 100–128.
- Radius: none 0 · xs 2 · sm 4 · md 6 · lg 8 · **radius 10 (default)** · xl 12 · 2xl 16 · 3xl 24 · full 1000.
- Shadows 2xs…3xl, all `black/alpha-5`, e.g. md `0 4 10 −2`, lg `0 8 16 −4`.

### 6.5 Token problems found (VERIFIED by computation)

| # | Issue | Evidence | Impact |
|---|---|---|---|
| T1 | **No semantic success / warning / info / chart tokens.** LIVE uses green «پوشش کامل», amber «پوشش جزئی»/«مفقود», red «نامعتبر», and multi-hue chart palettes with no token source. | sem_light/dark lists | Status and chart colours are currently untraceable to the DS — a minimal documented extension will be required. |
| T2 | **Dark mode drops the brand.** `primary` becomes #F5F5F5; `secondary` becomes #262626. | shadcn-dark | Dark theme is a neutral shadcn default, not a brand theme. |
| T3 | **White on primary = 4.32:1** (fails AA 4.5:1 for normal text; passes large text). Primary text on white also 4.32:1. Primary-hover #375DD9 = 5.63:1 passes. | computed | Small primary buttons / links fail AA. |
| T4 | **Focus ring #E5E5E5 on white = 1.26:1** (dark: #404040 on black = 2.03:1). | computed | Fails 1.4.11 / 2.4.7 visibility expectations. |
| T5 | **muted-foreground on muted = 4.35:1** (fails AA); on white 4.74 (pass); on #FAFAFA 4.54 (marginal pass). | computed | Secondary text inside muted panels/chips fails. |
| T6 | White on secondary #FF4000 = 3.51:1. | computed | Orange can only carry large text / non-text. |
| T7 | Ramp anomalies: `blue/50` #EFF6FF and `orange/50` #FFF7ED are Tailwind defaults, while 100–950 are custom → 50 is not on the custom hue. | raw colors | Lightest tints inconsistent. |
| T8 | `shadows/sm` spread = **15** (others ≤0). | shadows | Almost certainly an export error. |
| T9 | Typography `spacing` field is inconsistent (h3 24px → spacing 20; h4 20 → 20); `line height` key naming differs (`line-height` vs `line height`). | typography | Paragraph-spacing semantics unclear; naming needs normalisation in code. |
| T10 | Monospace = Vazir FD-WOL → Latin technical IDs (HS codes, `TradeFlow`) depend on a fallback font if WOL lacks Latin glyphs. | typography | Technical-identifier readability risk. |
| T11 | `popover` is black in light mode (tooltips dark). Shadcn default would be white. | semantic | Intentional choice? Must confirm before building tooltips/menus. |
| T12 | Dark `destructive` #9E4042 and `focus/ring error` #6D2E2F are raw hex, not aliases. | shadcn-dark | Breaks traceability. |
| T13 | `general/border` #E5E5E5 vs white = 1.26:1. Fine for decorative dividers, **insufficient** for input boundaries (1.4.11). | computed | Inputs need a stronger border token (e.g. `border 3/4`). |

### 6.6 LIVE vs TOK
LIVE uses the token blue (#416DFF-like), neutral greys, Vazir-style Persian digits, ~10–16px radii, very light shadows — **broadly consistent** with TOK. It also introduces untokenised colours: amber/green/teal chart bars, orange/blue lines, coral severity bars. V1, CON-1 and CON-2 used a **teal** brand and Vazirmatn — both **inconsistent** with TOK and should not be reused.

---

## 7. Existing frontend architecture

| Question | Answer | Evidence |
|---|---|---|
| Is source code available? | **No.** Only captures of a running server `172.16.4.49:8000` (private LAN). | No repo, no package files anywhere on Desktop/Downloads |
| Framework / build | **UNKNOWN.** The `/ui/...` prefix suggests the UI is served under a sub-path of a backend (INFERRED). | LIVE filenames |
| Routing convention | `/ui`, `/ui/data`, `/ui/data/trade-data`, `/ui/analysis/routes`, `/ui/analysis/trends/{commodity,performance,production}` | LIVE |
| Map stack | Tiles attributed «©Neshan ©OpenStreetMap»; globe + flat projections. Library UNKNOWN. | LIVE P4/P5 |
| Charts | Library UNKNOWN; mixed bar/line/area, radial donuts, heatmap, bubble, small multiples. | LIVE |
| Component library | Looks shadcn-derived (consistent with TOK naming), not confirmed. | INFERRED |
| Earlier concepts | CON-2 = Tailwind CDN single HTML; CON-1 = Claude Design canvas. Neither is the live app. | files |
| Figma | File `VK7dE5TuZF3NoC7xG3n9lo`, node 361-19907, section `v1` with 9 frames. Not accessible from here (Figma MCP did not connect in this session). | FIG README |

**Consequence:** "preserve the existing framework, routing and components" cannot be satisfied by inspection. Before implementation, either (a) the real repository is supplied, or (b) a stack is chosen for `scm.v2` as a new codebase — this is a **decision for the project owner** (see §11, Q1).

---

## 8. Identified UX, IA and data-interpretation problems

Severity is provisional (NN/g 0–4), frequency unobserved. "Status" = hypothesis unless stated as verified on screen.

### 8.1 Data-interpretation (highest priority — trust)

| ID | Problem | Location / evidence | Sev |
|---|---|---|---|
| D1 | **Incomplete final months presented as collapse.** Monthly trends drop sharply in Feb–Apr 2026; KPIs compute first-vs-last change: Iran imports **−99.96٪**, crude oil −91.5٪, MoM growth ≈ −100٪. DS-02 was last updated 2026-06-06, so trailing months are likely lag-incomplete (INFERRED). No "incomplete period" marker. IA global rule 4 is violated. | P1 sparklines, P5a, P5b, P3 A-01 | 4 |
| D2 | **"Not collected" averaged as 0.** «میانگین کل فازها: ۱۵٫۸٪» = (40+5+15+15+20+**0**)/6. Consumer is «در انتظار گردآوری» (not evaluated). Excluding it gives 19٪. | P1 coverage strip (computed) | 3 |
| D3 | **Mock data visually equal to real data.** Overview warnings, inventory, shipments, safety-stock table use the tag «نمونه طراحی · به‌زودی» in small grey, while sitting in the same visual weight as real chokepoint data. Values like «انبار بندرعباس» stock levels contradict requirement 11 («ظرفیت و موجودی انبارهای بنادر: داده موجود نیست»). | P1 | 4 |
| D4 | **Unexplained 40٪ coverage.** 4 complete / 4 partial / 6 none → 28.6٪ (complete only) or 42.9٪ (partial = ½). Neither equals 40٪. Formula undocumented. | P3 overview | 2 |
| D5 | **Chokepoint shares disagree across pages.** Overview: Panama 42٪ of top-3 transit value. Route map: Panama **0.07٪** "share of trade value by candidate chokepoint". Different measures under near-identical labels. | P1 vs P4 | 3 |
| D6 | **Bosphorus and Dardanelles have identical figures** (21,131 trades; 89.39 B USD; 276.37 M t), suggesting the same Turkish-Straits passage counted twice. On-screen note says a trade is counted in every chokepoint it passes, so lists must not be summed. | P3 A-05 | 2 |
| D7 | **Count presented as share of "trade".** Donuts A-03/A-04 show share of *number of trade records*, not value or weight; titles say «سهم … از کل تجارت‌های جهانی». A-04 title says "group" while centre/legend are per commodity. | P3 | 3 |
| D8 | **Three-axis combo charts.** A-01/A-02 put count (two scales!), value and weight on one plot; left axis ticks «هزار ۲۸» while legend says «میلیارد دلار». | P3 | 3 |
| D9 | **Filter scope silently differs.** «انتخاب دوره در فیلترها، این روند را محدود نمی‌کند» — period filter does not affect the adjacent chart. | P5b | 2 |
| D10 | **"Essential commodity" undefined.** Three different sets (14 HS4 incl. oil/coal/ores; 18 HS6 food groups; 12 FAOSTAT products). | §5.5 | 3 |
| D11 | **Domain name over-claims.** «مواد اولیه و انبار آنها» while no warehouse data exists. Its route slug is `trade-data`. | P3, §5.3 | 2 |
| D12 | Overview header «آخرین محاسبه» vs sidebar «تاریخ به‌روزرسانی ثبت نشده» vs dataset dates — three "freshness" signals, one says unknown. | P1 / shell | 2 |
| D13 | Data health KPI «به زودی» sits beside "۲ مجموعه نیازمند توجه" — first card is a placeholder in the primary KPI slot. | P3 quality | 1 |

### 8.2 Information architecture

| ID | Problem | Evidence | Sev |
|---|---|---|---|
| I1 | **Analytical content lives in the data-monitoring area.** «نمودارهای آماری» (trade, chokepoints, routes, ports, production) is under پایش وضعیت داده‌ها → مواد اولیه; overlaps Trends & Route Map. | P3 vs P4/P5 | 3 |
| I2 | **Production history appears twice** (A-08 in P3 and A-12 in P5c) with different controls. | P3/P5c | 2 |
| I3 | **Trade and Risk combined** in nav although IA approved separation; "ریسک" label implies risk analytics that do not exist. | LIVE nav, IA §22 | 2 |
| I4 | **Knowledge Base placed under "Planning & Actions"**; AI Assistant appears in nav and as floating button. | LIVE nav | 1 |
| I5 | **5 of 11 nav items are "coming soon"**, all expanded under one section — high noise in primary navigation. | LIVE nav | 2 |
| I6 | **Seven-stage model invisible** in LIVE (V1 home showed it; LIVE has no home/about). Stages appear only as 6 data domains. | V1 vs LIVE | 2 |
| I7 | **Data & Coverage concept split:** coverage cards + KG on one page, requirements/quality only inside one domain's drill-down. No cross-domain Data Health, no Sources page (F05). | P2/P3 | 3 |
| I8 | **Tabs used for distinct analytical questions** in Trends (share vs bilateral performance vs agricultural production — the last is not "trade" at all). | P5 | 2 |
| I9 | IA doc mislabels LIVE content: IA p.5 "Multi-series Trade Trends & Heatmap" is actually **FAOSTAT production**; IA's "Commodity Analytics" (p.1) is the data-monitor «نمودارهای آماری» tab; IA canonical map omits **Optimization** though nav has it. | IA §7 vs LIVE | 2 |

### 8.3 Interaction / visual / accessibility (observed in captures only)

| ID | Problem | Evidence | Sev |
|---|---|---|---|
| U1 | Pie/radial donuts with 14–18 slices and leader lines; hard to compare. IA UF-07 A1 already recommends ranked bars. | A-03/A-04/A-06 | 2 |
| U2 | Map empty state «مسیر داده نمایش داده شده» while "3,827 routes match" — routes hidden because layer toggles default off (DI §9.2). Confusing default. | P4 | 2 |
| U3 | Disabled period filter on route map without explanation. | P4 | 1 |
| U4 | Small percentage rings next to % values duplicate information (ring adds no precision). | P3 quality | 1 |
| U5 | Focus-ring and primary-button contrast failures inherited from tokens (T3, T4). | TOK | 3 |
| U6 | Mixed Persian/Latin numerals in places (e.g. «از 2025/05 تا 2026/04», «می 2025») and Gregorian month names transliterated inconsistently («مه» vs «می»). | P3, P5b | 1 |
| U7 | Chart colours not tokenised; categorical palettes vary per chart (T1). | LIVE | 2 |
| U8 | Keyboard, screen-reader, responsive, loading/error states: **unverifiable** from screenshots. | — | n/a |

### 8.4 What is good and should be preserved
- Explicit evidence copy: «این نما ساختار تعریف‌شده گراف است، نه رکوردهای زنده»; «خطوط نشان‌دهنده ارتباط تجاری‌اند، نه مسیر واقعی حمل»; definition of coverage %; «مبنای محاسبه» footnotes; «رشد نامشخص» strip in bubble chart; heatmap blank-cell legend.
- Quality rules with numerator/denominator and مفقود vs نامعتبر typing.
- Per-dataset metadata grids (period, HS level/version, counts, update date).
- Requirement matrix with status + plain-language explanation.
- Coming-soon labelling of unbuilt modules (honest), and the «نمونه طراحی» tag (honest, but too weak visually).

---

## 9. Technical constraints

1. No source code, no API, no data exports locally. Any implementation in `scm.v2` must either receive the real repo or start a new codebase with **static, source-traceable data fixtures** transcribed from LIVE (and labelled as such).
2. Live server is on a private network (`172.16.4.49`) — not reachable for runtime verification from here (not attempted).
3. Figma file exists but the Figma connection failed in this session; Figma frames were not inspected.
4. Map tiles (Neshan/OSM) imply licensing/API keys — UNKNOWN.
5. Fonts: `Vazir FD-WOL` files are not in the project; licence and Latin coverage UNKNOWN.
6. Token export is Figma-format JSON; needs transformation into CSS variables (no build pipeline exists yet).
7. RTL + bidi: Latin technical identifiers, HS codes, Gregorian/Jalali dates and Persian digits co-exist.
8. Accessibility target not declared by the project → WCAG 2.2 AA assumed per KB §1.2 (assumption).

---

## 10. Verified facts vs. inferences vs. assumptions

| Class | Examples |
|---|---|
| **Verified (seen in sources)** | Nav labels and routes; dataset names, periods, update dates, record counts, quality rules; 14-row requirement matrix and statuses; 6 domains + coverage %; KG 12 node types; all KPI values on LIVE; token values; F-scope ledger; mock tags on Overview. |
| **Verified by computation** | 1,089,986 = sum of dataset records; 15.83٪ = mean including consumer as 0; 40٪ ≠ any simple formula; top-3 chokepoint shares 42.3/29.3/28.4٪; contrast ratios in §6.5. |
| **Inferred (not stated)** | Trailing-month drop is data lag; PDF = LIVE captures (by matching sizes); tab↔capture mapping for `/ui/data/trade-data`; UI served under a backend sub-path; shadcn-based component library; "WOL" = without Latin. |
| **Assumptions (to confirm)** | WCAG 2.2 AA target; Overview operational widgets are mock until a data source exists; Iran datasets group intentionally removed. |
| **Unknown** | Stack; APIs; coverage formula; route/scenario methodology; full KG edges; Risk/Planning screen contents; AI capability; F01/F03 persistence and formats; other domains' drill-downs; DS-04 provenance details. |

---

## 11. Unresolved questions (need project-owner input)

**Blocking implementation**
1. **Codebase:** Will the real repository behind `172.16.4.49:8000/ui` be provided, or should `scm.v2` be a new frontend? If new: is there a mandated stack?
2. **Data for implementation:** Are dataset extracts / API endpoints available, or should pages use transcribed static fixtures (visibly labelled)?
3. **Which page first?** (Your brief says a page will be named later.)

**Blocking IA freeze (carried from IA §26)**
4. Analysis Workspace placement (Option A top-level vs. B contextual + library).
5. Specialist access to Data & Coverage: role-gated or just emphasis?
6. Risk Assessment "Notify me" behaviour; the referenced Risk screenshot is missing from the files.

**Data semantics**
7. Coverage % formula per domain (40/5/15/15/20) and why it changed from V1 (85.7/15.4/34.6).
8. Are Feb–Apr 2026 values incomplete? What is the publication lag / completeness flag per month?
9. Route-map "candidate chokepoint share" vs Overview "transit value" — definitions.
10. Bosphorus/Dardanelles duplication — intended?
11. Canonical definition of "essential commodity" and HS4↔HS6↔FAOSTAT mapping.
12. Is the "Iran datasets" group removed, deferred or relocated?
13. Should Overview mock widgets stay visible (clearly marked) or be hidden until data exists?

**Design system**
14. Approve a minimal token extension for status (success/warning/info) and a chart palette?
15. Dark mode: keep the shadcn-neutral dark theme, or brand it? Is dark mode in scope?
16. Is the black light-mode popover intentional?
17. Provide `Vazir FD-WOL` font files and confirm Latin fallback for technical IDs.

---

## 12. Project context for subsequent phases (handoff)

- **Sources of truth:** IA (scope) → LIVE (current state) → DI (data semantics) → TOK (visuals). Concepts CON-1/CON-2/V1 are not to be copied (teal/Vazirmatn/fabricated KPIs).
- **Non-negotiables:** no fabricated values; incomplete periods labelled; zero ≠ missing ≠ not collected ≠ not evaluated ≠ coming soon; coverage ≠ quality ≠ completeness ≠ readiness; mock data visually distinct; F04/F09–F12 not introduced; Trade Routes single canonical page; seven stages preserved with Raw Materials + Warehousing sharing one data domain.
- **Reusable data fixtures available for transcription:** §5.1–5.6 tables.
- **Acceptance checklist for each page:** QA (9 sections) + IA §5 checklist + KB §6 accessibility checks.
- **Next step:** owner answers Q1–Q3; then Phase 1 (Product Analysis & Architecture) for the chosen page.
