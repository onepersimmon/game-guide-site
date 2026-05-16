import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGggNews } from "../scripts/fetch-ggg-news.mjs";

test("normalizeGggNews creates compact official announcement items", () => {
  const payload = normalizeGggNews({
    context: {
      news: [
        {
          title: "Fate of the Vaal as Core Path of Exile 2 Mechanic",
          leadIn: "Details about Atziri's Temple.",
          date: "2026-05-15T21:00:00+00:00",
          href: "https://www.pathofexile.com/forum/view-thread/3931686",
          thumb: "https://web.poecdn.com/public/news/example.jpg",
        },
      ],
    },
  });

  assert.equal(payload.source.name, "Path of Exile 2 Official News");
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].category, "Blue Post");
  assert.equal(payload.items[0].localized.zh.category, "GGG 蓝贴");
  assert.match(payload.items[0].href, /pathofexile\.com\/forum\/view-thread/);
});
