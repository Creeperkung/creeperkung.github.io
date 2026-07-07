// Pure pity math, kept free of DB imports so it can be unit-tested directly.

export interface SixStarHit {
  operatorName: string;
  pityCost: number; // pulls spent since the previous 6★ (inclusive of this one)
  bannerId: string;
}

export interface PityPull {
  bannerId: string;
  seq: number;
  rarity: number;
  operatorName: string;
}

/** Walk a user's pulls per banner in order and extract 6★ pity costs. */
export function extractSixStarHits(pulls: PityPull[]): {
  hits: SixStarHit[];
  currentPity: Record<string, number>;
} {
  const byBanner = new Map<string, PityPull[]>();
  for (const p of pulls) {
    const list = byBanner.get(p.bannerId) ?? [];
    list.push(p);
    byBanner.set(p.bannerId, list);
  }

  const hits: SixStarHit[] = [];
  const currentPity: Record<string, number> = {};

  for (const [bannerId, list] of byBanner) {
    list.sort((a, b) => a.seq - b.seq);
    let sinceLast = 0;
    for (const p of list) {
      sinceLast++;
      if (p.rarity === 6) {
        hits.push({ operatorName: p.operatorName, pityCost: sinceLast, bannerId });
        sinceLast = 0;
      }
    }
    currentPity[bannerId] = sinceLast;
  }

  return { hits, currentPity };
}
