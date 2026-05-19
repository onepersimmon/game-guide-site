# PoE2 Damage Calculator Design

## Goal

Build a lightweight Path of Building-inspired damage tool for the existing static PoE2 guide site. The first version focuses on manual inputs, transparent math, and quick trade-search links instead of full character import.

## Product Shape

The tool lives at `/tools/damage-calculator.html` with a homepage link. It has four areas:

- Skill input: base hit damage, hits per second, and optional enemy resistance.
- Additive buckets: increased damage from gear, passive tree, support gems, and skill effects.
- Multiplicative buckets: one or more `more` multipliers and optional enemy damage-taken multiplier.
- Critical section: critical chance and critical damage multiplier.

The result panel shows average hit, non-critical hit, critical hit, DPS, total increased multiplier, combined more multiplier, and effective resistance multiplier. The UI should label `increased` as additive and `more` as multiplicative so users can see why the same displayed percentage can have different real value.

## Formula

Use a clear first-version hit formula:

```text
increasedMultiplier = 1 + totalIncreasedPercent / 100
moreMultiplier = product(1 + eachMorePercent / 100)
resistanceMultiplier = max(0, 1 - enemyResistancePercent / 100)
baseScaledHit = baseHit * increasedMultiplier * moreMultiplier * resistanceMultiplier * damageTakenMultiplier
critHit = baseScaledHit * critDamageMultiplier
averageHit = baseScaledHit * (1 - critChance) + critHit * critChance
dps = averageHit * hitsPerSecond
```

This does not try to model every PoE2 edge case. It intentionally avoids ailment, conversion, armor, hit chance, skill-specific mechanics, and conditional buffs until the first version is useful and testable.

## Trade Links

The first version builds official trade search URLs from user-entered text:

- Item type keyword, such as `staff`, `bow`, `ring`, or `jewel`.
- Desired stat keywords, such as `spell damage`, `critical hit chance`, or `+ level of all lightning spell skills`.

The generated link opens the official PoE2 trade site query page with the text fields encoded in the URL. If the official trade URL shape changes later, the query builder is isolated in the calculator module.

## UI Direction

Use a quiet tool interface that matches the current site: pale surfaces, compact controls, fixed result cards, and no decorative hero. The calculator should feel closer to a workbench than a landing page.

## Testing

Add focused tests for:

- Additive `increased` buckets stacking together.
- Multiple `more` multipliers multiplying separately.
- Critical expected damage.
- Resistance reducing final damage.
- Trade URL encoding.
- Homepage, sitemap, and llms entries for the new tool.
