# PoE2 Build Planner Design

## Goal

Build a Path of Exile 2 build planner that lets the player select a class, multiple skill setups, support gems, passive nodes, and gear, then recompute final damage live and jump to the official international trade site.

## Scope

The first release will support:

- One active character build per page.
- Multiple skill rows, each with skill level and support gem slots.
- Equipment slots with base-type dropdowns and mod value inputs.
- A passive-tree panel with clickable nodes that update the build state.
- Live recalculation whenever any skill, support, gear, or passive changes.
- Official trade search links for the international server only.

## Data Sources

Use the official trade2 endpoints for dropdown data:

- `/api/trade2/data/items` for gem, armor, weapon, accessory, jewel, flask, and currency base lists.
- `/api/trade2/data/static` for uncut gems, lineage support gems, and other static trade categories.
- `/api/trade2/data/stats` for explicit / implicit / skill affix groups and stat filters.

Use poe.ninja public build pages and search APIs for passive-tree heatmap data when available. If the tree API is incomplete, fall back to a locally cached notable-node catalog so the UI still supports clicking nodes and recalculation.

## Architecture

Implement the planner as a static page with one browser module and one data cache layer. The module owns:

- build-state normalization
- damage calculation
- trade query generation
- tree-node toggle logic
- rendering helpers for rows, chips, and result cards

The cached JSON files are written by a scheduled fetch script so the page can load fast and work under GitHub Pages without runtime backend calls.

## Calculation Model

Use a modifier-bucket engine rather than a single formula. Each selected source contributes to one of these buckets:

- base skill damage
- flat added damage
- increased damage
- more damage
- critical strike chance
- critical strike multiplier
- enemy resistance / penetration
- skill-specific conversion and support multipliers

Whenever the user changes any input, recompute the whole state from scratch so the result stays deterministic.

## UI Direction

Make the interface feel like a build workbench:

- compact but dense
- clear row-based skill editor
- left-side build configuration
- right-side live result panel
- tree nodes rendered as clickable chips or heatmap cells

No landing page, no marketing language, just the tool.

## Testing

Add tests for:

- official trade data normalization
- skill row state updates
- node toggles affecting damage
- trade URL generation
- page entry points and support-file discovery
