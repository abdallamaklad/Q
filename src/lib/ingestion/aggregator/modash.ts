import type { Platform } from "@prisma/client";
import type { Distribution } from "@/lib/embeddings";
import type { AggregatorAdapter, AggregatorCreator, AggregatorSearchHit } from "./types";

const BASE = "https://api.modash.io/v1";
type FetchLike = typeof fetch;

/**
 * Modash Discovery + Reports reference adapter.
 *
 * ⚠️ VERIFY-AGAINST-LIVE: exact endpoint paths and response field names below
 * follow Modash's documented shapes but MUST be confirmed against your account's
 * API docs once you have a key — vendors tweak these. Parsing is intentionally
 * defensive (optional chaining + fallbacks) so minor shape differences degrade
 * gracefully rather than crash. The aggregator abstraction means only this file
 * changes if you pick a different vendor.
 *
 * Notable upside vs public APIs: Modash returns REAL audience demographics +
 * a credibility/fake-follower signal, so ingested IG creators get real audience
 * data (not estimated).
 */
export class ModashAdapter implements AggregatorAdapter {
  readonly vendor = "modash";

  constructor(private apiKey: string, private fetchImpl: FetchLike = fetch) {
    if (!apiKey) throw new Error("AGGREGATOR_API_KEY (Modash) is not set");
  }

  private async call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const res = await this.fetchImpl(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Modash ${path} ${res.status}: ${t.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  async search(query: string, platform: Platform, limit: number): Promise<AggregatorSearchHit[]> {
    // Discovery search. Modash filters are rich; for a plain keyword we pass it
    // as relevance/keywords and sort by followers.
    const data = await this.call<any>("POST", `/${platform}/search`, {
      page: 0,
      sort: { field: "followers", direction: "desc" },
      filter: { influencer: { keywords: query } },
    });
    const items: any[] = data?.results ?? data?.directs ?? data?.lookalikes ?? data?.accounts ?? [];
    return items
      .map((it) => ({
        externalId: String(it.userId ?? it.profile?.userId ?? it.username ?? it.profile?.username ?? ""),
        handle: String(it.profile?.username ?? it.username ?? "").replace(/^@/, ""),
      }))
      .filter((h) => h.handle)
      .slice(0, limit);
  }

  async report(idOrHandle: string, platform: Platform): Promise<AggregatorCreator | null> {
    const handle = idOrHandle.replace(/^@/, "");
    // Report by profile url (Modash also supports /{platform}/profile/{userId}/report).
    const data = await this.call<any>(
      "GET",
      `/${platform}/profile/report?url=${encodeURIComponent(`https://www.${platform}.com/${handle}`)}`
    );
    const p = data?.profile ?? data?.report?.profile ?? data;
    if (!p) return null;
    const aud = data?.audience ?? data?.report?.audience;

    const toDist = (arr: any[] | undefined, keyField: string): Distribution | undefined => {
      if (!Array.isArray(arr)) return undefined;
      const d: Distribution = {};
      for (const x of arr) {
        const k = x?.[keyField] ?? x?.code ?? x?.name;
        const w = Number(x?.weight ?? x?.value ?? 0);
        if (k != null) d[String(k)] = w;
      }
      return Object.keys(d).length ? d : undefined;
    };

    const credibility = Number(aud?.credibility ?? aud?.audienceCredibility ?? NaN);
    return {
      externalId: String(p.userId ?? p.id ?? handle),
      handle: String(p.username ?? handle).replace(/^@/, ""),
      fullName: p.fullname ?? p.fullName ?? p.name,
      platform,
      followers: Number(p.followers ?? p.followersCount ?? 0),
      engagementRate: p.engagementRate != null ? Number(p.engagementRate) * (Number(p.engagementRate) <= 1 ? 100 : 1) : undefined,
      avgLikes: p.avgLikes != null ? Number(p.avgLikes) : undefined,
      avgComments: p.avgComments != null ? Number(p.avgComments) : undefined,
      fakeFollowerRate: Number.isFinite(credibility) ? Math.round((1 - credibility) * 100) : undefined,
      country: p.country ?? p.city ?? undefined,
      categories: Array.isArray(p.interests) ? p.interests.map((i: any) => String(i.name ?? i)) : undefined,
      bio: p.bio ?? p.biography,
      avatarUrl: p.picture ?? p.profilePicture,
      verified: Boolean(p.isVerified ?? p.verified),
      audience: aud
        ? {
            age: toDist(aud.ages, "code"),
            gender: toDist(aud.genders, "code"),
            geo: toDist(aud.geoCountries ?? aud.countries, "name"),
            interests: toDist(aud.interests, "name"),
          }
        : undefined,
      recentPosts: Array.isArray(data?.recentPosts ?? p.recentPosts)
        ? (data?.recentPosts ?? p.recentPosts).map((m: any) => ({
            caption: m.text ?? m.caption,
            likes: Number(m.likes ?? 0),
            comments: Number(m.comments ?? 0),
            postedAt: m.created ?? m.timestamp,
            type: m.type,
            hashtags: m.hashtags,
            mentions: m.mentions,
          }))
        : undefined,
    };
  }
}
