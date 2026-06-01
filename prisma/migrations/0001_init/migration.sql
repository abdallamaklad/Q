-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'member', 'viewer');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('instagram', 'tiktok', 'youtube', 'snapchat', 'twitch', 'facebook', 'x', 'pinterest');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('image', 'video', 'reel', 'short', 'story', 'stream', 'post');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'active', 'paused', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "CampaignStage" AS ENUM ('contacted', 'negotiating', 'booked', 'live', 'completed');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('outbound', 'inbound');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('draft', 'approved', 'sent');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'approved', 'paid', 'failed');

-- CreateEnum
CREATE TYPE "ConversionSource" AS ENUM ('shopify', 'stripe', 'ga4', 'manual');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateTable
CREATE TABLE "orgs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'member',

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "creators" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "categoryTags" TEXT[],
    "location" TEXT,
    "country" TEXT,
    "languages" TEXT[],
    "followerTotal" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "growthRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiGeneratedScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "embedding" vector(384),

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_accounts" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "handle" TEXT NOT NULL,
    "url" TEXT,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "growthRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "postsCount" INTEGER NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "history" JSONB NOT NULL DEFAULT '[]',
    "lastRefreshed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audience_reports" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "ageDistribution" JSONB NOT NULL DEFAULT '{}',
    "genderDistribution" JSONB NOT NULL DEFAULT '{}',
    "geoDistribution" JSONB NOT NULL DEFAULT '{}',
    "interestDistribution" JSONB NOT NULL DEFAULT '{}',
    "fakeFollowerScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "audienceQualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "engagementAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "suspectedPod" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audience_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "type" "ContentType" NOT NULL,
    "caption" TEXT,
    "transcript" TEXT,
    "hashtags" TEXT[],
    "mentions" TEXT[],
    "thumbnailUrl" TEXT,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "sentiment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deepfakeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "embedding" vector(384),

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "categoryTags" TEXT[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "embedding" vector(384),

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "brandId" TEXT,
    "name" TEXT NOT NULL,
    "brief" TEXT,
    "goal" TEXT,
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_creators" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "stage" "CampaignStage" NOT NULL DEFAULT 'contacted',
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlists" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlist_items" (
    "id" TEXT NOT NULL,
    "shortlistId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "tags" TEXT[],
    "note" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_threads" (
    "id" TEXT NOT NULL,
    "campaignCreatorId" TEXT NOT NULL,
    "subject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL DEFAULT 'outbound',
    "status" "MessageStatus" NOT NULL DEFAULT 'draft',
    "body" TEXT NOT NULL,
    "sequenceStep" INTEGER NOT NULL DEFAULT 0,
    "generatedBy" TEXT NOT NULL DEFAULT 'mock-llm',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "campaignCreatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "terms" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "signed" BOOLEAN NOT NULL DEFAULT false,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "campaignCreatorId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_performance" (
    "id" TEXT NOT NULL,
    "campaignCreatorId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "url" TEXT,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversion_events" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "campaignCreatorId" TEXT,
    "source" "ConversionSource" NOT NULL DEFAULT 'manual',
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "externalId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversion_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictive_performance" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "expectedReach" INTEGER NOT NULL DEFAULT 0,
    "expectedEngagements" INTEGER NOT NULL DEFAULT 0,
    "expectedCpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "modelVersion" TEXT NOT NULL DEFAULT 'heuristic-v1',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictive_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_claims" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "claimantEmail" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'pending',
    "verificationCode" TEXT NOT NULL,
    "submittedStats" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orgs_slug_key" ON "orgs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "memberships_orgId_idx" ON "memberships"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_userId_orgId_key" ON "memberships"("userId", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "creators_handle_key" ON "creators"("handle");

-- CreateIndex
CREATE INDEX "creators_country_idx" ON "creators"("country");

-- CreateIndex
CREATE INDEX "creators_followerTotal_idx" ON "creators"("followerTotal");

-- CreateIndex
CREATE INDEX "creators_engagementRate_idx" ON "creators"("engagementRate");

-- CreateIndex
CREATE INDEX "platform_accounts_platform_idx" ON "platform_accounts"("platform");

-- CreateIndex
CREATE INDEX "platform_accounts_followers_idx" ON "platform_accounts"("followers");

-- CreateIndex
CREATE UNIQUE INDEX "platform_accounts_creatorId_platform_key" ON "platform_accounts"("creatorId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "audience_reports_accountId_key" ON "audience_reports"("accountId");

-- CreateIndex
CREATE INDEX "content_items_accountId_idx" ON "content_items"("accountId");

-- CreateIndex
CREATE INDEX "content_items_creatorId_idx" ON "content_items"("creatorId");

-- CreateIndex
CREATE INDEX "content_items_postedAt_idx" ON "content_items"("postedAt");

-- CreateIndex
CREATE INDEX "brands_orgId_idx" ON "brands"("orgId");

-- CreateIndex
CREATE INDEX "campaigns_orgId_idx" ON "campaigns"("orgId");

-- CreateIndex
CREATE INDEX "campaign_creators_campaignId_idx" ON "campaign_creators"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_creators_campaignId_creatorId_key" ON "campaign_creators"("campaignId", "creatorId");

-- CreateIndex
CREATE INDEX "shortlists_orgId_idx" ON "shortlists"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "shortlist_items_shortlistId_creatorId_key" ON "shortlist_items"("shortlistId", "creatorId");

-- CreateIndex
CREATE INDEX "outreach_threads_campaignCreatorId_idx" ON "outreach_threads"("campaignCreatorId");

-- CreateIndex
CREATE INDEX "outreach_messages_threadId_idx" ON "outreach_messages"("threadId");

-- CreateIndex
CREATE INDEX "contracts_campaignCreatorId_idx" ON "contracts"("campaignCreatorId");

-- CreateIndex
CREATE INDEX "payments_campaignCreatorId_idx" ON "payments"("campaignCreatorId");

-- CreateIndex
CREATE INDEX "post_performance_campaignCreatorId_idx" ON "post_performance"("campaignCreatorId");

-- CreateIndex
CREATE INDEX "conversion_events_campaignId_idx" ON "conversion_events"("campaignId");

-- CreateIndex
CREATE INDEX "conversion_events_campaignCreatorId_idx" ON "conversion_events"("campaignCreatorId");

-- CreateIndex
CREATE INDEX "predictive_performance_creatorId_idx" ON "predictive_performance"("creatorId");

-- CreateIndex
CREATE INDEX "creator_claims_creatorId_idx" ON "creator_claims"("creatorId");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_accounts" ADD CONSTRAINT "platform_accounts_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audience_reports" ADD CONSTRAINT "audience_reports_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "platform_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "platform_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_creators" ADD CONSTRAINT "campaign_creators_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_creators" ADD CONSTRAINT "campaign_creators_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_items" ADD CONSTRAINT "shortlist_items_shortlistId_fkey" FOREIGN KEY ("shortlistId") REFERENCES "shortlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_items" ADD CONSTRAINT "shortlist_items_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_threads" ADD CONSTRAINT "outreach_threads_campaignCreatorId_fkey" FOREIGN KEY ("campaignCreatorId") REFERENCES "campaign_creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "outreach_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_campaignCreatorId_fkey" FOREIGN KEY ("campaignCreatorId") REFERENCES "campaign_creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_campaignCreatorId_fkey" FOREIGN KEY ("campaignCreatorId") REFERENCES "campaign_creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_performance" ADD CONSTRAINT "post_performance_campaignCreatorId_fkey" FOREIGN KEY ("campaignCreatorId") REFERENCES "campaign_creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_campaignCreatorId_fkey" FOREIGN KEY ("campaignCreatorId") REFERENCES "campaign_creators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictive_performance" ADD CONSTRAINT "predictive_performance_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_claims" ADD CONSTRAINT "creator_claims_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

