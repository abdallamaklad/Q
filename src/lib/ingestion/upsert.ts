import { prisma } from "@/lib/db";
import { toPgVector } from "@/lib/embeddings";
import { nanoid } from "nanoid";
import type { IngestedBundle } from "./types";

/**
 * Idempotently upsert an ingested creator bundle into the same tables the seed
 * writes (creators / platform_accounts / audience_reports / content_items),
 * plus pgvector embeddings via raw SQL. Dedupe key: (platform, externalId) on
 * platform_accounts — re-ingesting a channel updates the existing rows.
 *
 * Returns the creatorId. Content is replaced (delete+recreate) on refresh so
 * metrics stay current.
 */
export async function upsertCreatorBundle(bundle: IngestedBundle): Promise<string> {
  const g = bundle.creator;
  const acct = g.accounts[0];
  if (!acct) throw new Error("Bundle has no platform account");

  // Resolve an existing account by (platform, externalId) → its creator.
  const existing = await prisma.platformAccount.findUnique({
    where: { platform_externalId: { platform: bundle.platform, externalId: bundle.externalId } },
    select: { id: true, creatorId: true },
  });

  const creatorId = existing?.creatorId ?? `cre_${nanoid(16)}`;
  const accountId = existing?.id ?? `acc_${nanoid(16)}`;

  const creatorScalars = {
    name: g.name,
    avatarUrl: g.avatarUrl,
    bio: g.bio,
    categoryTags: g.categoryTags,
    location: g.location,
    country: g.country,
    languages: g.languages,
    followerTotal: g.followerTotal,
    engagementRate: g.engagementRate,
    growthRate: g.growthRate,
    aiGeneratedScore: g.aiGeneratedScore,
    verified: g.verified,
    source: bundle.source,
  };

  await prisma.$transaction(async (tx) => {
    // ── Creator ──
    if (existing) {
      await tx.creator.update({ where: { id: creatorId }, data: creatorScalars });
    } else {
      await tx.creator.create({
        data: { id: creatorId, handle: await uniqueHandle(tx, g.handle), ...creatorScalars },
      });
    }

    // ── Platform account ──
    const accountData = {
      platform: bundle.platform,
      handle: acct.handle,
      externalId: bundle.externalId,
      url: acct.url,
      followers: acct.followers,
      engagementRate: acct.engagementRate,
      growthRate: acct.growthRate,
      postsCount: acct.postsCount,
      metrics: acct.metrics,
      history: acct.history,
      lastRefreshed: new Date(),
    };
    if (existing) {
      await tx.platformAccount.update({ where: { id: accountId }, data: accountData });
    } else {
      await tx.platformAccount.create({ data: { id: accountId, creatorId, ...accountData } });
    }

    // ── Audience report (estimated) — upsert by accountId ──
    const a = acct.audience;
    const audienceData = {
      ageDistribution: a.ageDistribution,
      genderDistribution: a.genderDistribution,
      geoDistribution: a.geoDistribution,
      interestDistribution: a.interestDistribution,
      fakeFollowerScore: a.fakeFollowerScore,
      audienceQualityScore: a.audienceQualityScore,
      engagementAnomaly: a.engagementAnomaly,
      suspectedPod: a.suspectedPod,
      estimated: bundle.audienceEstimated,
    };
    await tx.audienceReport.upsert({
      where: { accountId },
      create: { id: `aud_${nanoid(16)}`, accountId, ...audienceData },
      update: audienceData,
    });

    // ── Content (replace) ──
    await tx.contentItem.deleteMany({ where: { accountId } });
    if (acct.content.length) {
      await tx.contentItem.createMany({
        data: acct.content.map((c) => ({
          id: `con_${nanoid(16)}`,
          creatorId,
          accountId,
          platform: c.platform,
          type: c.type,
          caption: c.caption,
          transcript: c.transcript,
          hashtags: c.hashtags,
          mentions: c.mentions,
          metrics: c.metrics,
          sentiment: c.sentiment,
          deepfakeScore: c.deepfakeScore,
          postedAt: c.postedAt,
        })),
      });
    }

    // ── Embeddings (raw SQL — pgvector columns are Unsupported in Prisma) ──
    await tx.$executeRaw`UPDATE "creators" SET embedding = ${toPgVector(g.embedding)}::vector WHERE id = ${creatorId}`;
    const contentRows = await tx.contentItem.findMany({ where: { accountId }, select: { id: true } });
    for (let i = 0; i < contentRows.length; i++) {
      const emb = acct.content[i]?.embedding;
      if (emb) {
        await tx.$executeRaw`UPDATE "content_items" SET embedding = ${toPgVector(emb)}::vector WHERE id = ${contentRows[i].id}`;
      }
    }
  });

  return creatorId;
}

/** Ensure a globally-unique creator handle (handle is @unique); suffix on clash. */
async function uniqueHandle(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  base: string
): Promise<string> {
  const clean = base.replace(/^@/, "").toLowerCase() || `creator_${nanoid(6)}`;
  const taken = await tx.creator.findUnique({ where: { handle: clean }, select: { id: true } });
  return taken ? `${clean}-${nanoid(5)}` : clean;
}
