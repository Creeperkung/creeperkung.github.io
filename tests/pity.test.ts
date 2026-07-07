import { describe, expect, it } from "vitest";
import { extractSixStarHits, type PityPull } from "../src/services/pity.js";

function pull(bannerId: string, seq: number, rarity: number, operatorName = `op-${seq}`): PityPull {
  return { bannerId, seq, rarity, operatorName };
}

describe("extractSixStarHits", () => {
  it("computes pity cost as pulls since the previous 6★, inclusive", () => {
    const pulls = [
      pull("b", 0, 3),
      pull("b", 1, 4),
      pull("b", 2, 6, "SilverAsh"), // 3rd pull → pity 3
      pull("b", 3, 3),
      pull("b", 4, 6, "Exusiai"), // 2 pulls after the last 6★ → pity 2
    ];

    const { hits, currentPity } = extractSixStarHits(pulls);

    expect(hits).toEqual([
      { operatorName: "SilverAsh", pityCost: 3, bannerId: "b" },
      { operatorName: "Exusiai", pityCost: 2, bannerId: "b" },
    ]);
    expect(currentPity).toEqual({ b: 0 });
  });

  it("reports trailing pulls without a 6★ as current pity", () => {
    const pulls = [pull("b", 0, 6, "Surtr"), pull("b", 1, 3), pull("b", 2, 4)];

    const { hits, currentPity } = extractSixStarHits(pulls);

    expect(hits).toHaveLength(1);
    expect(currentPity).toEqual({ b: 2 });
  });

  it("tracks pity per banner independently", () => {
    const pulls = [
      pull("a", 0, 3),
      pull("a", 1, 6, "Thorns"),
      pull("b", 0, 3),
      pull("b", 1, 3),
      pull("b", 2, 3),
      pull("b", 3, 6, "Mudrock"),
    ];

    const { hits } = extractSixStarHits(pulls);

    expect(hits).toEqual([
      { operatorName: "Thorns", pityCost: 2, bannerId: "a" },
      { operatorName: "Mudrock", pityCost: 4, bannerId: "b" },
    ]);
  });

  it("sorts by seq before walking, so input order does not matter", () => {
    const ordered = [pull("b", 0, 3), pull("b", 1, 6, "Mlynar"), pull("b", 2, 3)];
    const shuffled = [ordered[2], ordered[0], ordered[1]];

    expect(extractSixStarHits(shuffled)).toEqual(extractSixStarHits(ordered));
  });

  it("returns no hits and full pity when there is no 6★", () => {
    const pulls = [pull("b", 0, 3), pull("b", 1, 4), pull("b", 2, 5)];

    const { hits, currentPity } = extractSixStarHits(pulls);

    expect(hits).toEqual([]);
    expect(currentPity).toEqual({ b: 3 });
  });

  it("handles empty input", () => {
    expect(extractSixStarHits([])).toEqual({ hits: [], currentPity: {} });
  });
});
