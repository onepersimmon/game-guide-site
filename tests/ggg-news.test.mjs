import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGggNews } from "../scripts/fetch-ggg-news.mjs";

test("normalizeGggNews creates compact official announcement items", () => {
  const payload = normalizeGggNews({
    context: {
      news: [
        {
          title: "Older News",
          leadIn: "Older item.",
          date: "2026-05-01T21:00:00+00:00",
          href: "https://www.pathofexile.com/forum/view-thread/1",
        },
        {
          title: "Fate of the Vaal as Core Path of Exile 2 Mechanic",
          leadIn: "Details about Atziri's Temple.",
          date: "2026-05-15T21:00:00+00:00",
          href: "https://www.pathofexile.com/forum/view-thread/3931686",
          thumb: "https://web.poecdn.com/public/news/example.jpg",
        },
        {
          title: "Newest News",
          leadIn: "Newest item.",
          date: "2026-05-16T21:00:00+00:00",
          href: "https://www.pathofexile.com/forum/view-thread/2",
        },
        {
          title: "Fourth News",
          leadIn: "This should be trimmed.",
          date: "2026-04-30T21:00:00+00:00",
          href: "https://www.pathofexile.com/forum/view-thread/3",
        },
      ],
    },
  });

  assert.equal(payload.source.name, "Path of Exile 2 Official News");
  assert.equal(payload.items.length, 3);
  assert.deepEqual(payload.items.map((item) => item.title), [
    "Newest News",
    "Fate of the Vaal as Core Path of Exile 2 Mechanic",
    "Older News",
  ]);
  assert.equal(payload.items[1].category, "Blue Post");
  assert.equal(payload.items[1].localized.zh.category, "GGG 蓝贴");
  assert.match(payload.items[1].href, /pathofexile\.com\/forum\/view-thread/);
});
