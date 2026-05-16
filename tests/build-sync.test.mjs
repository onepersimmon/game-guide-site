import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBuildIndexState } from "../scripts/fetch-poe2-ninja.mjs";

const indexState = {
  buildLeagues: [
    { url: "vaal", displayName: "Fate of the Vaal", indexed: true },
  ],
};

const buildIndexState = {
  leagueBuilds: [
    {
      leagueName: "Fate of the Vaal",
      leagueUrl: "vaal",
      statistics: [
        { class: "Blood Mage", percentage: 17.194, trend: 1 },
        { class: "Oracle", percentage: 16.014, trend: -1 },
      ],
    },
  ],
};

test("normalizeBuildIndexState creates local card payloads", () => {
  const payload = normalizeBuildIndexState(indexState, buildIndexState);

  assert.equal(payload.leagueName, "Fate of the Vaal");
  assert.equal(payload.builds.length, 2);
  assert.equal(payload.builds[0].id, "vaal-blood-mage");
  assert.equal(payload.builds[0].image, "./assets/images/builds/blood-mage.webp");
  assert.match(payload.builds[0].href, /poe\.ninja\/poe2\/builds\/vaal/);
});
