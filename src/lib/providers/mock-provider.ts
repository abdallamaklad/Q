import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { embedText, toPgVector } from "@/lib/embeddings";
import type { CreatorFilters } from "@/lib/search/filters";
import type {
  AudienceReportDTO,
  ContentItemDTO,
  CreatorDetail,
  CreatorSummary,
  DataProvider,
  PlatformAccountDTO,
  SearchResult,
} from "./types";

/**
 * MockProvider — backs the app with the seeded Postgres database, using
 * Postgres full-text search and pgvector similarity. This is the default
 * provider and is fully functional offline. It is the reference implementation
 * of the DataProvider contract.
 */

// Build a `ARRAY[...]::text[]` literal safely from a string array.
function pgTextArray(values: string[]): Prisma.Sql {
  return Prisma.sql`ARRAY[${Prisma.join(values.map((v) => Prisma.sql`${v}`))}]::text[]`;
}

interface CreatorRow {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  bio: string | null;
  categoryTags: string[];
  location: string | null;
  country: string | null;
  languages: string[];
  followerTotal: number;
  engagementRate: number;
  growthRate: number;
  verified: boolean;
  aiGeneratedScore: number;
  source: string | null;
  platforms: string[];
  score: number | null;
}

function rowToSummary(r: CreatorRow): CreatorSummary {
  return {
    id: r.id,
    name: r.name,
    handle: r.handle,
    avatarUrl: r.avatarUrl,
    bio: r.bio,
    categoryTags: r.categoryTags ?? [],
    location: r.location,
    country: r.country,
    languages: r.languages ?? [],
    followerTotal: r.followerTotal,
    engagementRate: r.engagementRate,
    growthRate: r.growthRate,
    verified: r.verified,
    aiGeneratedScore: r.aiGeneratedScore,
    source: r.source,
    platforms: (r.platforms ?? []).filter(Boolean) as CreatorSummary["platforms"],
    score: r.score == null ? undefined : Math.max(0, Math.round(r.score * 1000) / 1000),
  };
}

export class MockProvider implements DataProvider {
  readonly name = "mock";

  private buildConditions(f: CreatorFilters): Prisma.Sql[] {
    const conds: Prisma.Sql[] = [];

    // ── Creator scalar filters ──
    if (f.followersMin != null) conds.push(Prisma.sql`c."followerTotal" >= ${f.followersMin}`);
    if (f.followersMax != null) conds.push(Prisma.sql`c."followerTotal" <= ${f.followersMax}`);
    if (f.engagementMin != null) conds.push(Prisma.sql`c."engagementRate" >= ${f.engagementMin}`);
    if (f.engagementMax != null) conds.push(Prisma.sql`c."engagementRate" <= ${f.engagementMax}`);
    if (f.growthMin != null) conds.push(Prisma.sql`c."growthRate" >= ${f.growthMin}`);
    if (f.growthMax != null) conds.push(Prisma.sql`c."growthRate" <= ${f.growthMax}`);
    if (f.verifiedOnly) conds.push(Prisma.sql`c."verified" = true`);
    if (f.maxAiGeneratedScore != null) conds.push(Prisma.sql`c."aiGeneratedScore" <= ${f.maxAiGeneratedScore}`);

    if (f.categories?.length) conds.push(Prisma.sql`c."categoryTags" && ${pgTextArray(f.categories)}`);
    if (f.languages?.length) conds.push(Prisma.sql`c."languages" && ${pgTextArray(f.languages)}`);
    if (f.countries?.length) conds.push(Prisma.sql`c."country" = ANY(${pgTextArray(f.countries)})`);
    if (f.locations?.length) {
      const likes = f.locations.map((l) => Prisma.sql`c."location" ILIKE ${"%" + l + "%"}`);
      conds.push(Prisma.sql`(${Prisma.join(likes, " OR ")})`);
    }

    // ── Full-text search ──
    if (f.query) conds.push(Prisma.sql`c."search_vector" @@ plainto_tsquery('english', ${f.query})`);

    // ── Content-based filters (hashtags / mentions / keywords / timeframe) ──
    const contentConds: Prisma.Sql[] = [];
    if (f.hashtags?.length) contentConds.push(Prisma.sql`ci."hashtags" && ${pgTextArray(f.hashtags)}`);
    if (f.brandMentions?.length) contentConds.push(Prisma.sql`ci."mentions" && ${pgTextArray(f.brandMentions)}`);
    if (f.keywords?.length) {
      const likes = f.keywords.map((k) => Prisma.sql`ci."caption" ILIKE ${"%" + k + "%"}`);
      contentConds.push(Prisma.sql`(${Prisma.join(likes, " OR ")})`);
    }
    if (f.contentSince) contentConds.push(Prisma.sql`ci."postedAt" >= ${new Date(f.contentSince)}`);
    if (f.contentUntil) contentConds.push(Prisma.sql`ci."postedAt" <= ${new Date(f.contentUntil)}`);
    if (contentConds.length) {
      conds.push(
        Prisma.sql`EXISTS (SELECT 1 FROM "content_items" ci WHERE ci."creatorId" = c.id AND ${Prisma.join(contentConds, " AND ")})`
      );
    }

    // ── Platform + audience filters (per platform account) ──
    const acctConds: Prisma.Sql[] = [];
    if (f.platforms?.length) acctConds.push(Prisma.sql`pa."platform"::text = ANY(${pgTextArray(f.platforms)})`);

    const audConds: Prisma.Sql[] = [];
    if (f.maxFakeFollowerScore != null) audConds.push(Prisma.sql`ar."fakeFollowerScore" <= ${f.maxFakeFollowerScore}`);
    if (f.minAudienceQuality != null) audConds.push(Prisma.sql`ar."audienceQualityScore" >= ${f.minAudienceQuality}`);
    if (f.excludeSuspectedPods) audConds.push(Prisma.sql`ar."suspectedPod" = false`);
    if (f.audienceGender && f.audienceGenderMinShare != null) {
      audConds.push(Prisma.sql`COALESCE((ar."genderDistribution"->>${f.audienceGender})::float, 0) >= ${f.audienceGenderMinShare}`);
    }
    if (f.audienceAgeBuckets?.length && f.audienceAgeMinShare != null) {
      const sum = f.audienceAgeBuckets.map((b) => Prisma.sql`COALESCE((ar."ageDistribution"->>${b})::float, 0)`);
      audConds.push(Prisma.sql`(${Prisma.join(sum, " + ")}) >= ${f.audienceAgeMinShare}`);
    }
    if (f.audienceCountries?.length && f.audienceCountryMinShare != null) {
      const ors = f.audienceCountries.map((c) => Prisma.sql`COALESCE((ar."geoDistribution"->>${c})::float, 0) >= ${f.audienceCountryMinShare}`);
      audConds.push(Prisma.sql`(${Prisma.join(ors, " OR ")})`);
    }
    if (f.audienceInterests?.length && f.audienceInterestMinShare != null) {
      const ors = f.audienceInterests.map((c) => Prisma.sql`COALESCE((ar."interestDistribution"->>${c})::float, 0) >= ${f.audienceInterestMinShare}`);
      audConds.push(Prisma.sql`(${Prisma.join(ors, " OR ")})`);
    }

    if (acctConds.length || audConds.length) {
      const join = audConds.length
        ? Prisma.sql`JOIN "audience_reports" ar ON ar."accountId" = pa.id`
        : Prisma.empty;
      const where = [...acctConds, ...audConds];
      conds.push(
        Prisma.sql`EXISTS (SELECT 1 FROM "platform_accounts" pa ${join} WHERE pa."creatorId" = c.id ${where.length ? Prisma.sql`AND ${Prisma.join(where, " AND ")}` : Prisma.empty})`
      );
    }

    return conds;
  }

  async searchCreators(f: CreatorFilters): Promise<SearchResult> {
    const conds = this.buildConditions(f);
    const where = conds.length ? Prisma.sql`WHERE ${Prisma.join(conds, " AND ")}` : Prisma.empty;
    const offset = (f.page - 1) * f.pageSize;

    const usedVectorSearch = Boolean(f.semantic && f.semantic.trim());
    const usedFullText = Boolean(f.query && f.query.trim());

    // Ranking score expression.
    let scoreSql: Prisma.Sql;
    let orderSql: Prisma.Sql;
    if (usedVectorSearch && f.sortBy === "relevance") {
      const vec = `${toPgVector(embedText(f.semantic!))}`;
      scoreSql = Prisma.sql`(1 - (c."embedding" <=> ${vec}::vector))`;
      orderSql = Prisma.sql`c."embedding" <=> ${vec}::vector ASC`;
    } else {
      const sortCol: Record<string, Prisma.Sql> = {
        followers: Prisma.sql`c."followerTotal"`,
        engagement: Prisma.sql`c."engagementRate"`,
        growth: Prisma.sql`c."growthRate"`,
        relevance: Prisma.sql`c."followerTotal"`,
        audienceQuality: Prisma.sql`c."followerTotal"`,
        fakeFollowers: Prisma.sql`c."followerTotal"`,
      };
      const dir = f.sortDir === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
      scoreSql = usedFullText
        ? Prisma.sql`ts_rank(c."search_vector", plainto_tsquery('english', ${f.query}))`
        : Prisma.sql`NULL::float`;
      orderSql = Prisma.sql`${sortCol[f.sortBy] ?? sortCol.followers} ${dir}`;
    }

    const rows = await prisma.$queryRaw<CreatorRow[]>`
      SELECT c.id, c.name, c.handle, c."avatarUrl", c.bio, c."categoryTags",
             c.location, c.country, c.languages, c."followerTotal", c."engagementRate",
             c."growthRate", c.verified, c."aiGeneratedScore", c.source,
             ARRAY(SELECT DISTINCT pa."platform"::text FROM "platform_accounts" pa WHERE pa."creatorId" = c.id) AS platforms,
             ${scoreSql} AS score
      FROM "creators" c
      ${where}
      ORDER BY ${orderSql}
      LIMIT ${f.pageSize} OFFSET ${offset}`;

    const countRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "creators" c ${where}`;
    const total = Number(countRows[0]?.count ?? 0);

    return {
      creators: rows.map(rowToSummary),
      total,
      page: f.page,
      pageSize: f.pageSize,
      meta: { usedVectorSearch, usedFullText, source: this.name },
    };
  }

  async getCreator(id: string): Promise<CreatorDetail | null> {
    const c = await prisma.creator.findUnique({
      where: { id },
      include: { accounts: { orderBy: { followers: "desc" } } },
    });
    if (!c) return null;
    const accounts: PlatformAccountDTO[] = c.accounts.map((a) => ({
      platform: a.platform,
      handle: a.handle,
      url: a.url,
      followers: a.followers,
      engagementRate: a.engagementRate,
      growthRate: a.growthRate,
      postsCount: a.postsCount,
      lastRefreshed: a.lastRefreshed.toISOString(),
      history: (a.history as PlatformAccountDTO["history"]) ?? [],
    }));
    return {
      id: c.id,
      name: c.name,
      handle: c.handle,
      avatarUrl: c.avatarUrl,
      bio: c.bio,
      categoryTags: c.categoryTags,
      location: c.location,
      country: c.country,
      languages: c.languages,
      followerTotal: c.followerTotal,
      engagementRate: c.engagementRate,
      growthRate: c.growthRate,
      verified: c.verified,
      aiGeneratedScore: c.aiGeneratedScore,
      source: c.source,
      platforms: c.accounts.map((a) => a.platform),
      accounts,
    };
  }

  async getAudienceReport(accountId: string): Promise<AudienceReportDTO | null> {
    const r = await prisma.audienceReport.findUnique({ where: { accountId }, include: { account: true } });
    if (!r) return null;
    return {
      accountId: r.accountId,
      platform: r.account.platform,
      ageDistribution: r.ageDistribution as Record<string, number>,
      genderDistribution: r.genderDistribution as Record<string, number>,
      geoDistribution: r.geoDistribution as Record<string, number>,
      interestDistribution: r.interestDistribution as Record<string, number>,
      fakeFollowerScore: r.fakeFollowerScore,
      audienceQualityScore: r.audienceQualityScore,
      engagementAnomaly: r.engagementAnomaly,
      suspectedPod: r.suspectedPod,
      estimated: r.estimated,
    };
  }

  async getContent(accountId: string, limit = 12): Promise<ContentItemDTO[]> {
    const items = await prisma.contentItem.findMany({
      where: { accountId },
      orderBy: { postedAt: "desc" },
      take: limit,
    });
    return items.map((i) => ({
      id: i.id,
      platform: i.platform,
      type: i.type,
      caption: i.caption,
      thumbnailUrl: i.thumbnailUrl,
      hashtags: i.hashtags,
      mentions: i.mentions,
      metrics: i.metrics as Record<string, number>,
      sentiment: i.sentiment,
      deepfakeScore: i.deepfakeScore,
      postedAt: i.postedAt.toISOString(),
    }));
  }

  async refreshAccount(accountId: string): Promise<{ ok: boolean; message: string }> {
    // MockProvider: refresh simply bumps lastRefreshed. In ApiProvider/IngestionProvider
    // this would enqueue a real fetch job.
    const acct = await prisma.platformAccount.findUnique({ where: { id: accountId } });
    if (!acct) return { ok: false, message: "Account not found" };
    await prisma.platformAccount.update({ where: { id: accountId }, data: { lastRefreshed: new Date() } });
    return { ok: true, message: "Refreshed from seeded data (mock)." };
  }

  private async lookalikeByEmbeddingOf(table: "creators" | "brands", ids: string[], limit: number): Promise<CreatorSummary[]> {
    if (!ids.length) return [];
    const idArr = pgTextArray(ids);
    const excludeClause = table === "creators" ? Prisma.sql`AND c.id <> ALL(${idArr})` : Prisma.empty;
    const rows = await prisma.$queryRaw<CreatorRow[]>`
      WITH centroid AS (
        SELECT AVG(embedding) AS e
        FROM ${Prisma.raw(`"${table}"`)}
        WHERE id = ANY(${idArr}) AND embedding IS NOT NULL
      )
      SELECT c.id, c.name, c.handle, c."avatarUrl", c.bio, c."categoryTags",
             c.location, c.country, c.languages, c."followerTotal", c."engagementRate",
             c."growthRate", c.verified, c."aiGeneratedScore", c.source,
             ARRAY(SELECT DISTINCT pa."platform"::text FROM "platform_accounts" pa WHERE pa."creatorId" = c.id) AS platforms,
             (1 - (c."embedding" <=> centroid.e)) AS score
      FROM "creators" c, centroid
      WHERE c."embedding" IS NOT NULL AND centroid.e IS NOT NULL ${excludeClause}
      ORDER BY c."embedding" <=> centroid.e ASC
      LIMIT ${limit}`;
    return rows.map(rowToSummary);
  }

  lookalikeByCreators(creatorIds: string[], limit: number): Promise<CreatorSummary[]> {
    return this.lookalikeByEmbeddingOf("creators", creatorIds, limit);
  }

  lookalikeByBrands(brandIds: string[], limit: number): Promise<CreatorSummary[]> {
    return this.lookalikeByEmbeddingOf("brands", brandIds, limit);
  }
}
