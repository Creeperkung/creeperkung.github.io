import { describe, expect, it } from "vitest";
import {
  dedupeWithinPaste,
  defaultNickname,
  ImportFormatError,
  mergeBannerPulls,
  parseExport,
  type NormalizedPull,
  type StoredPull,
} from "../src/services/jsonImport.js";

// A realistic Account Center page (the confirmed real shape).
function accountCenterPage(rows: Record<string, unknown>[]) {
  return { code: 0, data: { rows, count: rows.length } };
}

const row = (over: Record<string, unknown> = {}) => ({
  charName: "Ambriel",
  star: "4星",
  poolId: "LIMITED_EN_39_0_1",
  poolName: "Wanted: Blood Prevails",
  type: "Limited Headhunting",
  at: 1777289675771,
  ...over,
});

describe("parseExport", () => {
  it("parses the real Account Center page shape", () => {
    const pulls = parseExport(
      accountCenterPage([row(), row({ charName: "Wis'adel", star: "6星", at: 1777289675772 })])
    );

    expect(pulls).toHaveLength(2);
    expect(pulls[0]).toMatchObject({
      operatorName: "Ambriel",
      rarity: 4,
      bannerId: "import-limited-en-39-0-1",
      bannerName: "Wanted: Blood Prevails",
      bannerType: "Limited Headhunting",
      allowDuplicates: false,
    });
    expect(pulls[0].pulledAt.getTime()).toBe(1777289675771);
    expect(pulls[1].rarity).toBe(6);
  });

  it("flattens an array of page responses", () => {
    const pulls = parseExport([
      accountCenterPage([row()]),
      accountCenterPage([row({ charName: "Gravel", at: 1777289675999 })]),
    ]);

    expect(pulls.map((p) => p.operatorName)).toEqual(["Ambriel", "Gravel"]);
  });

  it("accepts a flat array of pulls", () => {
    const pulls = parseExport([row(), row({ charName: "Jaye", at: 1777289676000 })]);
    expect(pulls).toHaveLength(2);
  });

  it("parses the grouped legacy shape and marks it duplicate-safe", () => {
    const pulls = parseExport({
      data: {
        list: [
          {
            ts: 1700000000, // unix seconds — must be scaled to ms
            pool: "Legacy Banner",
            chars: [
              { name: "Kroos", rarity: 2 },
              { name: "Kroos", rarity: 2 },
              { name: "SilverAsh", rarity: 5 },
            ],
          },
        ],
      },
    });

    expect(pulls).toHaveLength(3);
    expect(pulls.every((p) => p.allowDuplicates)).toBe(true);
    expect(pulls[0].pulledAt.getTime()).toBe(1700000000 * 1000);
    // Numeric rarities 2/5 mean 0-indexed game data → stored as 3/6.
    expect(pulls.map((p) => p.rarity)).toEqual([3, 3, 6]);
  });

  it("keeps 1-indexed numeric rarity as-is when the payload contains a 6", () => {
    const pulls = parseExport([
      row({ star: undefined, rarity: 3 }),
      row({ star: undefined, rarity: 6, charName: "Surtr", at: 1777289676001 }),
    ]);

    expect(pulls.map((p) => p.rarity)).toEqual([3, 6]);
  });

  it("rejects unrecognized shapes", () => {
    expect(() => parseExport({ hello: "world" })).toThrow(ImportFormatError);
    expect(() => parseExport("not json-shaped")).toThrow(ImportFormatError);
  });

  it("rejects payloads whose rows all lack required fields", () => {
    expect(() => parseExport(accountCenterPage([{ nonsense: true }]))).toThrow(
      ImportFormatError
    );
  });

  it("rejects out-of-range rarities", () => {
    expect(() => parseExport([row({ star: "9星" })])).toThrow(/Rarity out of range/);
  });
});

function normalized(over: Partial<NormalizedPull> = {}): NormalizedPull {
  return {
    bannerId: "import-test",
    bannerName: "Test Banner",
    bannerType: "IMPORTED",
    rarity: 4,
    operatorName: "Ambriel",
    pulledAt: new Date(1777289675771),
    allowDuplicates: false,
    ...over,
  };
}

describe("dedupeWithinPaste", () => {
  it("drops identical flat rows (overlapping pages) but keeps grouped repeats", () => {
    const flat = normalized();
    const grouped = normalized({ allowDuplicates: true, operatorName: "Kroos" });

    const { byBanner, skipped } = dedupeWithinPaste([flat, flat, grouped, grouped]);

    expect(skipped).toBe(1); // one flat duplicate dropped
    expect(byBanner.get("import-test")).toHaveLength(3);
  });

  it("groups pulls by banner", () => {
    const { byBanner } = dedupeWithinPaste([
      normalized({ bannerId: "import-a" }),
      normalized({ bannerId: "import-b", pulledAt: new Date(1777289675772) }),
    ]);

    expect([...byBanner.keys()].sort()).toEqual(["import-a", "import-b"]);
  });
});

describe("defaultNickname", () => {
  it("derives from the hash only — the typed account string must never leak", () => {
    expect(defaultNickname("abcdef0123456789")).toBe("Doctor-abcdef");
  });
});

describe("mergeBannerPulls", () => {
  const stored = (over: Partial<StoredPull> = {}): StoredPull => ({
    rarity: 4,
    operatorName: "Ambriel",
    pulledAt: new Date(1000),
    ...over,
  });

  it("is idempotent: re-importing the same pulls imports nothing", () => {
    const existing = [stored(), stored({ operatorName: "Jaye", pulledAt: new Date(2000) })];
    const incoming = existing.map((p) => normalized({ ...p }));

    const result = mergeBannerPulls(existing, incoming);

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(2);
    expect(result.merged).toHaveLength(2);
  });

  it("inserts pulls older than stored history in chronological position", () => {
    const existing = [stored({ pulledAt: new Date(5000) })];
    const incoming = [normalized({ operatorName: "Myrtle", pulledAt: new Date(1000) })];

    const { merged, imported } = mergeBannerPulls(existing, incoming);

    expect(imported).toBe(1);
    expect(merged.map((p) => p.operatorName)).toEqual(["Myrtle", "Ambriel"]);
  });

  it("treats duplicates as a multiset: keeps max(existing, incoming) per key", () => {
    // A ten-pull that contained Kroos twice at one shared timestamp; the
    // store currently has only one copy.
    const existing = [stored({ operatorName: "Kroos", pulledAt: new Date(1000) })];
    const incoming = [
      normalized({ operatorName: "Kroos", pulledAt: new Date(1000), allowDuplicates: true }),
      normalized({ operatorName: "Kroos", pulledAt: new Date(1000), allowDuplicates: true }),
    ];

    const result = mergeBannerPulls(existing, incoming);

    expect(result.imported).toBe(1); // second occurrence is genuinely new
    expect(result.skipped).toBe(1); // first occurrence already stored
    expect(result.merged).toHaveLength(2);
  });

  it("does not lose stored pulls missing from the paste (90-day window)", () => {
    const existing = [
      stored({ operatorName: "Old Pull", pulledAt: new Date(1000) }),
      stored({ operatorName: "Recent", pulledAt: new Date(9000) }),
    ];
    const incoming = [normalized({ operatorName: "Recent", pulledAt: new Date(9000) })];

    const { merged, imported } = mergeBannerPulls(existing, incoming);

    expect(imported).toBe(0);
    expect(merged.map((p) => p.operatorName)).toEqual(["Old Pull", "Recent"]);
  });
});
