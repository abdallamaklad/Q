import crypto from "node:crypto";
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

/** Constant-time string comparison to avoid timing attacks. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Verify a webhook signature per provider. Returns true only when the request
 * is authentic.
 *
 *   - Shopify: HMAC-SHA256(rawBody, secret) base64, compared to X-Shopify-Hmac-Sha256
 *   - Stripe:  Stripe-Signature `t=…,v1=…`; HMAC-SHA256(`${t}.${rawBody}`, secret) hex,
 *              with a 5-minute timestamp tolerance to block replays
 *   - GA4:     Measurement Protocol authenticates via a shared api_secret (no body
 *              HMAC); we compare an X-GA4-Secret header to GA4_API_SECRET
 *
 * Fails CLOSED in production when a secret is not configured; allows in
 * development so the local demo works without secrets.
 */
export function verifySignature(source: WebhookSource, rawBody: string, headers: Headers): boolean {
  const secret = {
    shopify: process.env.SHOPIFY_WEBHOOK_SECRET,
    stripe: process.env.STRIPE_WEBHOOK_SECRET,
    ga4: process.env.GA4_API_SECRET,
  }[source];

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(`[webhooks:${source}] no secret configured — rejecting request in production.`);
      return false;
    }
    console.warn(`[webhooks:${source}] no secret configured — verification skipped (development only).`);
    return true;
  }

  try {
    switch (source) {
      case "shopify": {
        const provided = headers.get("x-shopify-hmac-sha256") ?? "";
        const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
        return safeEqual(provided, digest);
      }
      case "stripe": {
        const header = headers.get("stripe-signature") ?? "";
        const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
        const t = parts["t"];
        const v1 = parts["v1"];
        if (!t || !v1) return false;
        if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false; // replay window
        const digest = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`, "utf8").digest("hex");
        return safeEqual(v1, digest);
      }
      case "ga4": {
        const provided = headers.get("x-ga4-secret") ?? "";
        return safeEqual(provided, secret);
      }
    }
  } catch {
    return false;
  }
  return false;
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
