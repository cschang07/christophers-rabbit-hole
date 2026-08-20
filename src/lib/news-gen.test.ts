import assert from "node:assert/strict";
import test from "node:test";
import type { ModelReleaseItem } from "@/lib/model-radar";
import { getVerifiedReleasesForMonth } from "@/lib/model-radar";
import { mergeThemeSources, modelReleaseSources } from "@/lib/news-gen";

const grok46: ModelReleaseItem = {
  provider: "xAI",
  name: "Grok 4.6",
  apiId: null,
  releasedAt: "2026-08-12",
  brief: "強化長時間自主完成 coding 與工程工作的能力。",
  availability: "xAI API / Grok Build / Cursor",
  sourceUrl: "https://media.x.ai/v1/website/card-4p6-4cd2dc57.pdf",
};

test("Grok 4.6 is a verified August release", () => {
  const releases = getVerifiedReleasesForMonth("2026-08");
  assert.equal(releases.some((release) => release.name === "Grok 4.6"), true);
});

test("official model releases become first-class AI article sources", () => {
  const sources = modelReleaseSources([grok46]);
  assert.equal(sources[0].title, "Grok 4.6 官方發布");
  assert.match(sources[0].content, /Grok 4\.6/);
  assert.match(sources[0].content, /xAI API/);
});

test("AI source merge keeps official releases first and removes URL duplicates", () => {
  const merged = mergeThemeSources(
    "ai",
    [
      {
        title: "duplicate",
        content: "less authoritative excerpt",
        url: grok46.sourceUrl,
      },
      {
        title: "other AI news",
        content: "other",
        url: "https://example.com/other",
      },
    ],
    [grok46],
  );

  assert.equal(merged.length, 2);
  assert.equal(merged[0].title, "Grok 4.6 官方發布");
});

test("AI source merge preserves sibling models that share one announcement", () => {
  const sharedUrl = "https://example.com/model-family";
  const releases: ModelReleaseItem[] = [
    { ...grok46, name: "Family Pro", sourceUrl: sharedUrl },
    { ...grok46, name: "Family Mini", sourceUrl: sharedUrl },
  ];

  const merged = mergeThemeSources("ai", [], releases);
  assert.deepEqual(
    merged.map((source) => source.title),
    ["Family Pro 官方發布", "Family Mini 官方發布"],
  );
});
