/**
 * Qulture seed script.
 *
 * Populates a fully demonstrable dataset:
 *   - 1 demo org + 3 users (admin / member / viewer)
 *   - brands (with embeddings) for lookalike-by-brand
 *   - ~5,000 creators across 8 platforms, each with platform accounts,
 *     audience reports, fraud signals, and recent content (all with embeddings)
 *   - a demo campaign spanning every stage, outreach drafts, contracts,
 *     pending payments, post performance, conversion events
 *   - a shortlist, predictive-performance rows, and a creator-claim example
 *
 * Creator count is configurable via SEED_CREATORS (default 5000) to speed up
 * local iterations. Embeddings are written with raw SQL because pgvector
 * columns are Unsupported() in Prisma Client.
 */
import "dotenv/config";
import { PrismaClient, Prisma, CampaignStage, MessageRole, MessageStatus, PaymentStatus, ConversionSource, ClaimStatus, CampaignStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { generateCreator, CATEGORIES } from "../src/lib/providers/mock-data";
import { embedText, toPgVector } from "../src/lib/embeddings";
import { predictPerformance } from "../src/lib/scoring";

const prisma = new PrismaClient();
const TOTAL = Number(process.env.SEED_CREATORS ?? 5000);
const SEED = 1337;
const CHUNK = 250;

async function clear() {
  // Delete in FK-safe order. Cheap on an empty DB; idempotent on reseed.
  await prisma.$transaction([
    prisma.conversionEvent.deleteMany(),
    prisma.postPerformance.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.contract.deleteMany(),
    prisma.outreachMessage.deleteMany(),
    prisma.outreachThread.deleteMany(),
    prisma.campaignCreator.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.shortlistItem.deleteMany(),
    prisma.shortlist.deleteMany(),
    prisma.creatorClaim.deleteMany(),
    prisma.predictivePerformance.deleteMany(),
    prisma.contentItem.deleteMany(),
    prisma.audienceReport.deleteMany(),
    prisma.platformAccount.deleteMany(),
    prisma.creator.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.campaign.deleteMany(),
  ]);
  await prisma.$transaction([
    prisma.account.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
    prisma.org.deleteMany(),
  ]);
}

async function updateEmbeddings(table: string, rows: { id: string; embedding: number[] }[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const values = batch.map((r) => Prisma.sql`(${r.id}, ${toPgVector(r.embedding)}::vector)`);
    await prisma.$executeRaw`
      UPDATE ${Prisma.raw(`"${table}"`)} AS t
      SET embedding = data.emb
      FROM (VALUES ${Prisma.join(values)}) AS data(id, emb)
      WHERE t.id = data.id`;
  }
}

async function main() {
  console.log(`Seeding Qulture with ${TOTAL} creators (seed=${SEED})…`);
  await clear();

  // ── Org + users ────────────────────────────────────────────────────────────
  const org = await prisma.org.create({ data: { name: "Qulture Demo", slug: "demo" } });
  const pass = await bcrypt.hash("demo1234", 10);
  const users = await Promise.all(
    [
      { email: "demo@qulture.dev", name: "Demo Admin", role: "admin" as const },
      { email: "member@qulture.dev", name: "Demo Member", role: "member" as const },
      { email: "viewer@qulture.dev", name: "Demo Viewer", role: "viewer" as const },
    ].map((u) =>
      prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          passwordHash: pass,
          emailVerified: new Date(),
          memberships: { create: { orgId: org.id, role: u.role } },
        },
      })
    )
  );
  console.log(`Created org + ${users.length} users (login: demo@qulture.dev / demo1234)`);

  // ── Brands ───────────────────────────────────────────────────────────────────
  const brandDefs = [
    { name: "PeakForm", categoryTags: ["fitness", "wellness", "sports"], description: "Performance apparel for everyday athletes." },
    { name: "GreenPlate", categoryTags: ["vegan", "food", "cooking"], description: "Plant-based meal kits delivered weekly." },
    { name: "Lumina Beauty", categoryTags: ["beauty", "skincare", "fashion"], description: "Clean skincare and cosmetics." },
    { name: "NovaTech", categoryTags: ["tech", "gaming", "education"], description: "Smart gadgets and productivity tools." },
    { name: "Wanderlust Co", categoryTags: ["travel", "outdoor", "lifestyle"], description: "Gear and guides for modern explorers." },
  ];
  const brands = [];
  for (const b of brandDefs) {
    const brand = await prisma.brand.create({ data: { orgId: org.id, ...b } });
    brands.push(brand);
  }
  await updateEmbeddings(
    "brands",
    brands.map((b, i) => ({ id: b.id, embedding: embedText(`${b.name} ${brandDefs[i].categoryTags.join(" ")} ${brandDefs[i].description}`) }))
  );
  console.log(`Created ${brands.length} brands`);

  // ── Creators (chunked) ─────────────────────────────────────────────────────
  const demoCreatorIds: string[] = []; // first ~40 used in campaign/shortlist
  let done = 0;
  for (let start = 0; start < TOTAL; start += CHUNK) {
    const n = Math.min(CHUNK, TOTAL - start);
    const creatorsData: Prisma.CreatorCreateManyInput[] = [];
    const accountsData: Prisma.PlatformAccountCreateManyInput[] = [];
    const audienceData: Prisma.AudienceReportCreateManyInput[] = [];
    const contentData: Prisma.ContentItemCreateManyInput[] = [];
    const creatorEmb: { id: string; embedding: number[] }[] = [];
    const contentEmb: { id: string; embedding: number[] }[] = [];

    for (let i = 0; i < n; i++) {
      const g = generateCreator(SEED, start + i);
      const creatorId = `cre_${nanoid(16)}`;
      if (demoCreatorIds.length < 40) demoCreatorIds.push(creatorId);
      creatorsData.push({
        id: creatorId,
        name: g.name,
        handle: `${g.handle}_${start + i}`,
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
        source: "mock",
      });
      creatorEmb.push({ id: creatorId, embedding: g.embedding });

      for (const a of g.accounts) {
        const accountId = `acc_${nanoid(16)}`;
        accountsData.push({
          id: accountId,
          creatorId,
          platform: a.platform,
          handle: a.handle,
          url: a.url,
          followers: a.followers,
          engagementRate: a.engagementRate,
          growthRate: a.growthRate,
          postsCount: a.postsCount,
          metrics: a.metrics,
          history: a.history,
        });
        audienceData.push({
          id: `aud_${nanoid(16)}`,
          accountId,
          ageDistribution: a.audience.ageDistribution,
          genderDistribution: a.audience.genderDistribution,
          geoDistribution: a.audience.geoDistribution,
          interestDistribution: a.audience.interestDistribution,
          fakeFollowerScore: a.audience.fakeFollowerScore,
          audienceQualityScore: a.audience.audienceQualityScore,
          engagementAnomaly: a.audience.engagementAnomaly,
          suspectedPod: a.audience.suspectedPod,
        });
        for (const c of a.content) {
          const contentId = `con_${nanoid(16)}`;
          contentData.push({
            id: contentId,
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
          });
          contentEmb.push({ id: contentId, embedding: c.embedding });
        }
      }
    }

    await prisma.creator.createMany({ data: creatorsData });
    await prisma.platformAccount.createMany({ data: accountsData });
    await prisma.audienceReport.createMany({ data: audienceData });
    await prisma.contentItem.createMany({ data: contentData });
    await updateEmbeddings("creators", creatorEmb);
    await updateEmbeddings("content_items", contentEmb);

    done += n;
    process.stdout.write(`\r  creators: ${done}/${TOTAL}`);
  }
  process.stdout.write("\n");

  // ── Predictive performance for demo creators ────────────────────────────────
  const demoCreators = await prisma.creator.findMany({
    where: { id: { in: demoCreatorIds } },
    include: { accounts: { include: { audienceReport: true } } },
  });
  for (const c of demoCreators) {
    const aq = c.accounts[0]?.audienceReport?.audienceQualityScore ?? 50;
    const p = predictPerformance({ followers: c.followerTotal, engagementRate: c.engagementRate, audienceQualityScore: aq });
    await prisma.predictivePerformance.create({
      data: { creatorId: c.id, expectedReach: p.expectedReach, expectedEngagements: p.expectedEngagements, expectedCpm: p.expectedCpm, confidence: p.confidence },
    });
  }

  // ── Campaign with creators across every stage ────────────────────────────────
  const campaign = await prisma.campaign.create({
    data: {
      orgId: org.id,
      brandId: brands[0].id,
      name: "Spring Performance Launch",
      brief: "Promote the new PeakForm training line with authentic creators in fitness & wellness.",
      goal: "drive 5,000 trackable signups",
      budget: 75_000,
      status: CampaignStatus.active,
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 3600 * 1000),
    },
  });
  const stages: CampaignStage[] = [CampaignStage.contacted, CampaignStage.negotiating, CampaignStage.booked, CampaignStage.live, CampaignStage.completed];
  const campaignCreatorIds: string[] = [];
  for (let i = 0; i < 15 && i < demoCreators.length; i++) {
    const stage = stages[i % stages.length];
    const rate = 500 + i * 250;
    const deliverables = stage === CampaignStage.contacted ? null : "1 reel + 2 stories";
    const cc = await prisma.campaignCreator.create({
      data: {
        campaignId: campaign.id,
        creatorId: demoCreators[i].id,
        stage,
        rate,
        deliverables,
        notes: i % 3 === 0 ? "Great audience fit." : null,
      },
    });
    campaignCreatorIds.push(cc.id);

    // Seed a little negotiation history for negotiating-stage creators so the
    // rate/deliverables history is demonstrable immediately.
    if (stage === CampaignStage.negotiating) {
      await prisma.negotiationHistory.createMany({
        data: [
          { campaignCreatorId: cc.id, rate, deliverables: "1 reel", changedById: users[0].id, createdAt: new Date(Date.now() - 3 * 86400000) },
          { campaignCreatorId: cc.id, rate: rate + 250, deliverables, changedById: users[0].id, createdAt: new Date(Date.now() - 1 * 86400000) },
        ],
      });
    }

    // Outreach thread with a draft first message + draft follow-ups (never sent).
    const thread = await prisma.outreachThread.create({ data: { campaignCreatorId: cc.id, subject: `Collab: ${campaign.name}` } });
    await prisma.outreachMessage.create({
      data: { threadId: thread.id, role: MessageRole.outbound, status: stage === CampaignStage.contacted ? MessageStatus.draft : MessageStatus.sent, sequenceStep: 0, body: `Hi ${demoCreators[i].name}, we'd love to work with you on ${campaign.name}.`, sentAt: stage === CampaignStage.contacted ? null : new Date() },
    });
    if (stage === CampaignStage.contacted) {
      await prisma.outreachMessage.create({ data: { threadId: thread.id, role: MessageRole.outbound, status: MessageStatus.draft, sequenceStep: 1, body: `Just following up on my note about ${campaign.name}!` } });
    }

    // Booked+ get contracts, pending payments, posts, conversions.
    if (i % 5 >= 2) {
      await prisma.contract.create({ data: { campaignCreatorId: cc.id, title: "Influencer Agreement", amount: cc.rate, terms: "1 reel + 2 stories", signed: stage === CampaignStage.completed, signedAt: stage === CampaignStage.completed ? new Date() : null } });
      await prisma.payment.create({ data: { campaignCreatorId: cc.id, amount: cc.rate, status: stage === CampaignStage.completed ? PaymentStatus.paid : PaymentStatus.pending } });
    }
    if (stage === CampaignStage.live || stage === CampaignStage.completed) {
      const reach = Math.round(demoCreators[i].followerTotal * 0.3);
      await prisma.postPerformance.create({ data: { campaignCreatorId: cc.id, platform: demoCreators[i].accounts[0]?.platform ?? "instagram", reach, impressions: Math.round(reach * 1.4), likes: Math.round(reach * 0.08), comments: Math.round(reach * 0.004), shares: Math.round(reach * 0.01), clicks: Math.round(reach * 0.02) } });
      await prisma.conversionEvent.createMany({
        data: Array.from({ length: 8 }).map((_, k) => ({
          campaignId: campaign.id,
          campaignCreatorId: cc.id,
          source: [ConversionSource.shopify, ConversionSource.stripe, ConversionSource.ga4][k % 3],
          type: ["purchase", "signup", "lead"][k % 3],
          value: [89, 0, 0][k % 3] + Math.round(Math.random() * 40),
          occurredAt: new Date(Date.now() - k * 24 * 3600 * 1000),
        })),
      });
    }
  }

  // ── Shortlist ────────────────────────────────────────────────────────────────
  const shortlist = await prisma.shortlist.create({ data: { orgId: org.id, name: "Q2 Fitness Shortlist", notes: "Top fitness & wellness prospects." } });
  for (let i = 0; i < 12 && i < demoCreators.length; i++) {
    await prisma.shortlistItem.create({ data: { shortlistId: shortlist.id, creatorId: demoCreators[i].id, tags: i % 2 ? ["priority"] : ["backup"], note: i === 0 ? "Reached out, awaiting reply." : null } });
  }

  // ── Creator-claim example (roadmap flow) ─────────────────────────────────────
  await prisma.creatorClaim.create({
    data: { creatorId: demoCreators[0].id, claimantEmail: "creator@example.com", status: ClaimStatus.pending, verificationCode: nanoid(8).toUpperCase(), submittedStats: { selfReportedFollowers: demoCreators[0].followerTotal + 2000 } },
  });

  console.log(`Seed complete: campaign "${campaign.name}" (${campaignCreatorIds.length} creators), shortlist, ${CATEGORIES.length} categories represented.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
