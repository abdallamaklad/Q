import { NextResponse } from "next/server";
import { verifySignature, normalize, recordConversion, type WebhookSource } from "@/lib/webhooks";

const SOURCES: WebhookSource[] = ["shopify", "stripe", "ga4"];

/**
 * Public webhook receiver for conversion tracking (Shopify / Stripe / GA4).
 * Verifies the signature, normalizes the payload, and records a ConversionEvent.
 * Never charges or mutates payments. See src/lib/webhooks.ts.
 */
export async function POST(req: Request, { params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  if (!SOURCES.includes(source as WebhookSource)) {
    return NextResponse.json({ error: "Unknown source" }, { status: 404 });
  }
  const src = source as WebhookSource;

  const raw = await req.text();
  if (!verifySignature(src, raw, req.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const normalized = normalize(src, payload);
  if (!normalized) return NextResponse.json({ error: "Missing campaign attribution" }, { status: 422 });

  const result = await recordConversion(src, normalized);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
