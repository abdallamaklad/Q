import { prisma } from "@/lib/db";
import { ConversionSource } from "@prisma/client";

/**
 * Webhook receiver abstraction (Tracking & ROI). Each external source
 * (Shopify, Stripe, GA4) has its own adapter that:
 *   1. verifies the request signature, and
 *   2. normalizes the payload into a ConversionEvent.
 *
 * Signature verification is stubbed here behind a single function with TODO
 * markers. We NEVER auto-charge or mutate payments from a webhook — these only
 * record attributed conversions/revenue for reporting.
 */

export type WebhookSource = "shopify" | "stripe" | "ga4";

export interface NormalizedConversion {
  campaignId: string;
  campaignCreatorId?: string;
  type: string;
  value: number;
  externalId?: string;
}

/**
 * Verify a webhook signature. Returns true when valid. In dev (no secret set)
 * we accept requests so the demo works, but log that verification was skipped.
 *
 * TODO(security): implement HMAC verification per provider:
 *   - Shopify: HMAC-SHA256 of raw body with SHOPIFY_WEBHOOK_SECRET (X-Shopify-Hmac-Sha256)
 *   - Stripe:  Stripe-Signature header via stripe.webhooks.constructEvent
 *   - GA4:     Measurement Protocol secret comparison
 */
export function verifySignature(source: WebhookSource, _rawBody: string, _headers: Headers): boolean {
  const secretEnv = {
    shopify: process.env.SHOPIFY_WEBHOOK_SECRET,
    stripe: process.env.STRIPE_WEBHOOK_SECRET,
    ga4: process.env.GA4_API_SECRET,
  }[source];
  if (!secretEnv) {
    console.warn(`[webhooks:${source}] no secret configured — signature verification skipped (dev only).`);
    return true;
  }
  // TODO: real verification.
  return true;
}

/** Map a raw provider payload to a normalized conversion. */
export function normalize(source: WebhookSource, payload: Record<string, unknown>): NormalizedConversion | null {
  // Attribution: campaign + creator are carried via order note / metadata / UTM.
  const campaignId =
    (payload.campaignId as string) ??
    ((payload.note_attributes as { name: string; value: string }[] | undefined)?.find((a) => a.name === "campaignId")?.value);
  if (!campaignId) return null;
  const campaignCreatorId =
    (payload.campaignCreatorId as string) ??
    ((payload.note_attributes as { name: string; value: string }[] | undefined)?.find((a) => a.name === "campaignCreatorId")?.value);

  switch (source) {
    case "shopify":
      return { campaignId, campaignCreatorId, type: "purchase", value: Number(payload.total_price ?? 0), externalId: String(payload.id ?? "") };
    case "stripe":
      return { campaignId, campaignCreatorId, type: "purchase", value: Number(payload.amount ?? 0) / 100, externalId: String(payload.id ?? "") };
    case "ga4":
      return { campaignId, campaignCreatorId, type: String(payload.eventName ?? "signup"), value: Number(payload.value ?? 0), externalId: String(payload.clientId ?? "") };
  }
}

/** Persist a normalized conversion, validating the campaign exists. */
export async function recordConversion(source: WebhookSource, n: NormalizedConversion) {
  const campaign = await prisma.campaign.findUnique({ where: { id: n.campaignId }, select: { id: true } });
  if (!campaign) return { ok: false, message: "Unknown campaign" };
  await prisma.conversionEvent.create({
    data: {
      campaignId: n.campaignId,
      campaignCreatorId: n.campaignCreatorId,
      source: source as ConversionSource,
      type: n.type,
      value: n.value,
      externalId: n.externalId,
    },
  });
  return { ok: true, message: "recorded" };
}
