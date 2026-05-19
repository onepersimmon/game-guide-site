# PoE2 Build Planner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a PoE2 build planner with official trade data dropdowns, live damage recomputation, clickable passive nodes, and international trade jump links.

**Architecture:** Add a cached data pipeline for official trade2 datasets and a browser build-planner module that treats the whole build as a single reactive state object. Keep the UI static and dependency-free so it works on GitHub Pages and file:// previews.

**Tech Stack:** Static HTML, CSS, browser ES modules, Node fetch scripts, node:test.

---

### Task 1: Trade Data Cache

**Files:**
- Create: `scripts/fetch-poe2-trade-data.mjs`
- Create: `tests/trade-data.test.mjs`
- Create: `data/trade2-items.json`
- Create: `data/trade2-static.json`
- Create: `data/trade2-stats.json`

**Step 1: Write the failing test**

Assert the fetch script exists and produces normalized category files with gem, weapon, armour, accessory, jewel, and stat groups.

**Step 2: Run test to verify it fails**

Run: `node --test tests/trade-data.test.mjs`
Expected: FAIL because the script and cached files do not exist yet.

**Step 3: Write minimal implementation**

Fetch the three official endpoints and persist the raw JSON in `data/`.

**Step 4: Run test to verify it passes**

Run: `node --test tests/trade-data.test.mjs`
Expected: PASS.

### Task 2: Planner Engine

**Files:**
- Create: `tools/build-planner.mjs`
- Create: `tests/build-planner.test.mjs`

**Step 1: Write the failing test**

Cover build-state normalization, per-row recomputation, passive-node toggles, and official trade link generation.

**Step 2: Run test to verify it fails**

Run: `node --test tests/build-planner.test.mjs`
Expected: FAIL because the engine does not exist.

**Step 3: Write minimal implementation**

Export pure functions for state updates and damage calculation.

**Step 4: Run test to verify it passes**

Run: `node --test tests/build-planner.test.mjs`
Expected: PASS.

### Task 3: Planner Page

**Files:**
- Create: `tools/build-planner.html`
- Modify: `styles.css`
- Modify: `index.html`
- Modify: `tests/ui-shell.test.mjs`

**Step 1: Write the failing test**

Assert the homepage links to the planner and the planner page contains skill rows, support selects, passive nodes, results, and trade links.

**Step 2: Run test to verify it fails**

Run: `node --test tests/ui-shell.test.mjs`
Expected: FAIL until the page exists.

**Step 3: Write minimal implementation**

Build the static page and wire it to the planner engine.

**Step 4: Run test to verify it passes**

Run: `node --test tests/ui-shell.test.mjs`
Expected: PASS.

### Task 4: Support Files

**Files:**
- Modify: `scripts/generate-static-pages.mjs`
- Modify: `sitemap.xml`
- Modify: `llms.txt`
- Modify: `tests/static-pages.test.mjs`

**Step 1: Write the failing test**

Assert the planner is present in the generated crawl files.

**Step 2: Run test to verify it fails**

Run: `node --test tests/static-pages.test.mjs`
Expected: FAIL until support files are updated.

**Step 3: Write minimal implementation**

Add the planner to the generated URL set and discovery lists.

**Step 4: Run test to verify it passes**

Run: `node --test tests/static-pages.test.mjs`
Expected: PASS.

### Task 5: Verification

**Files:**
- All touched files.

**Step 1: Run full test suite**

Run: `node --test`
Expected: PASS.

**Step 2: Smoke test in browser**

Open the planner in a browser and verify dropdowns, node toggles, and recalculation on desktop and mobile.
