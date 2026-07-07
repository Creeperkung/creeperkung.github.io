import { db } from "../lib/db.js";
import { extractSixStarHits } from "./pity.js";

export async function getUserStats(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const pulls = await db.pull.findMany({
    where: { userId },
    select: { bannerId: true, seq: true, rarity: true, operatorName: true },
  });

  const byRarity: Record<number, number> = { 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const p of pulls) byRarity[p.rarity]++;

  const { hits, currentPity } = extractSixStarHits(pulls);
  const avgPity =
    hits.length > 0 ? hits.reduce((s, h) => s + h.pityCost, 0) / hits.length : null;

  return {
    userId: user.id,
    nickname: user.nickname,
    totalPulls: pulls.length,
    byRarity,
    sixStarRate: pulls.length > 0 ? byRarity[6] / pulls.length : 0,
    avgPullsPerSixStar: avgPity,
    currentPity,
    sixStars: hits,
    luck: avgPity !== null ? await luckPercentile(avgPity) : null,
  };
}

/**
 * Share of the community's 6★ hits that cost MORE pulls than this user's
 * average — i.e. 0.9 means luckier than 90% of recorded hits.
 */
async function luckPercentile(userAvgPity: number): Promise<number | null> {
  const distribution = await communityPityDistribution();
  const total = distribution.reduce((s, b) => s + b.count, 0);
  if (total === 0) return null;
  const worse = distribution.reduce(
    (sum, bucket) => (bucket.pityCost > userAvgPity ? sum + bucket.count : sum),
    0
  );
  return worse / total;
}

/**
 * Pity cost of every 6★ hit across all users, aggregated into counts.
 *
 * Computed entirely in SQL: because `seq` is dense and chronological within
 * (userId, bannerId) — an invariant both import paths maintain — the pity
 * cost of a 6★ is its seq minus the seq of the previous 6★ in the same
 * partition (or -1 when it's the first). This only touches rarity-6 rows
 * instead of loading every pull into memory per request. The window syntax
 * is shared by SQLite (3.25+) and Postgres.
 */
async function communityPityDistribution(): Promise<{ pityCost: number; count: number }[]> {
  const rows = await db.$queryRaw<{ pityCost: number | bigint; count: number | bigint }[]>`
    SELECT "pityCost", COUNT(*) AS "count"
    FROM (
      SELECT "seq" - COALESCE(
        LAG("seq") OVER (PARTITION BY "userId", "bannerId" ORDER BY "seq"),
        -1
      ) AS "pityCost"
      FROM "Pull"
      WHERE "rarity" = 6
    ) AS hits
    GROUP BY "pityCost"
    ORDER BY "pityCost"
  `;
  // COUNT(*) comes back as BigInt on Postgres; normalize.
  return rows.map((r) => ({ pityCost: Number(r.pityCost), count: Number(r.count) }));
}

export async function getCommunityStats() {
  const [users, totalPulls, distribution] = await Promise.all([
    db.user.count(),
    db.pull.count(),
    communityPityDistribution(),
  ]);

  const sixStars = distribution.reduce((s, b) => s + b.count, 0);
  const avgPity =
    sixStars > 0
      ? distribution.reduce((s, b) => s + b.pityCost * b.count, 0) / sixStars
      : null;

  return {
    users,
    totalPulls,
    sixStars,
    observedSixStarRate: totalPulls > 0 ? sixStars / totalPulls : 0,
    avgPullsPerSixStar: avgPity,
    pityDistribution: distribution,
  };
}
