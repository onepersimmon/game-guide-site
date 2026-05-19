# PoE2 Damage Calculator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a static PoE2 damage calculator with transparent increased/more/crit math and official trade-search links.

**Architecture:** Implement calculation and URL generation as pure exported functions in `tools/damage-calculator.mjs`, then let the same module enhance the browser page. Keep the page static and dependency-free so GitHub Pages can serve it directly.

**Tech Stack:** Static HTML, CSS, browser ES modules, Node `node:test`.

---

### Task 1: Calculation Module

**Files:**
- Create: `tools/damage-calculator.mjs`
- Create: `tests/damage-calculator.test.mjs`

**Step 1: Write the failing test**

Cover additive increased damage, multiplicative more damage, critical expected damage, resistance, and trade URL encoding.

**Step 2: Run test to verify it fails**

Run: `node --test tests/damage-calculator.test.mjs`
Expected: FAIL because `tools/damage-calculator.mjs` does not exist.

**Step 3: Write minimal implementation**

Export `calculateDamage(input)` and `buildTradeSearchUrl(input)`.

**Step 4: Run test to verify it passes**

Run: `node --test tests/damage-calculator.test.mjs`
Expected: PASS.

### Task 2: Static Tool Page

**Files:**
- Create: `tools/damage-calculator.html`
- Modify: `styles.css`
- Modify: `tests/ui-shell.test.mjs`

**Step 1: Write the failing test**

Assert that the homepage links to the calculator and the calculator page contains the expected inputs, results, and script module.

**Step 2: Run test to verify it fails**

Run: `node --test tests/ui-shell.test.mjs`
Expected: FAIL because the page and links are missing.

**Step 3: Write minimal implementation**

Create the page and add styles for calculator layout, form controls, result cards, and trade actions.

**Step 4: Run test to verify it passes**

Run: `node --test tests/ui-shell.test.mjs`
Expected: PASS.

### Task 3: Discovery Files

**Files:**
- Modify: `sitemap.xml`
- Modify: `llms.txt`
- Modify: `tests/site-structure.test.mjs`

**Step 1: Write the failing test**

Assert the calculator page exists and is listed in sitemap/llms.

**Step 2: Run test to verify it fails**

Run: `node --test tests/site-structure.test.mjs`
Expected: FAIL before discovery files are updated.

**Step 3: Write minimal implementation**

Add `/tools/damage-calculator.html` to sitemap and llms.

**Step 4: Run test to verify it passes**

Run: `node --test tests/site-structure.test.mjs`
Expected: PASS.

### Task 4: Verification

**Files:**
- All touched files.

**Step 1: Run full tests**

Run: `node --test`
Expected: PASS.

**Step 2: Visual smoke check**

Serve the site locally and inspect the calculator page at desktop and mobile widths.

**Step 3: Review diff**

Run: `git diff --stat` and inspect changed files.
