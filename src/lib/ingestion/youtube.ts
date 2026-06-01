import { Platform } from "@prisma/client";
import { platformBuckets } from "@/lib/providers/rate-limiter";
import { normalizeYouTube, type RawYouTubeChannel, type RawYouTubeVideo } from "./normalize";
import type { ChannelRef, IngestedBundle, SourceConnector } from "./types";

const API = "https://www.googleapis.com/youtube/v3";
type FetchLike = typeof fetch;

/**
 * YouTube Data API v3 connector. Real, quota-aware:
 *   discover     → search.list (type=channel)        [100 units]
 *   ingestChannel→ channels.list + playlistItems.list + videos.list  [~3 units]
 * Pass an injectable fetch for offline tests.
 */
export class YouTubeConnector implements SourceConnector {
  readonly platform = Platform.youtube;

  constructor(private apiKey: string, private fetchImpl: FetchLike = fetch) {
    if (!apiKey) throw new Error("YOUTUBE_API_KEY is not set");
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const bucket = platformBuckets.youtube;
    if (bucket && !(await bucket.acquire())) throw new Error("YouTube rate limit exceeded; retry later.");
    const qs = new URLSearchParams({ ...params, key: this.apiKey }).toString();
    const res = await this.fetchImpl(`${API}/${path}?${qs}`);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`YouTube ${path} ${res.status}: ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  async discover(query: string, limit: number): Promise<ChannelRef[]> {
    const data = await this.get<{ items?: { id?: { channelId?: string }; snippet?: { channelTitle?: string } }[] }>(
      "search",
      { part: "snippet", type: "channel", maxResults: String(Math.min(limit, 50)), q: query }
    );
    return (data.items ?? [])
      .map((i) => i.id?.channelId)
      .filter((id): id is string => Boolean(id))
      .map((externalId) => ({ externalId }));
  }

  async ingestChannel(ref: ChannelRef): Promise<IngestedBundle | null> {
    // Resolve channel by id (UC…) or by handle.
    const params: Record<string, string> = { part: "snippet,statistics,contentDetails" };
    if (ref.externalId && ref.externalId.startsWith("UC")) {
      params.id = ref.externalId;
    } else {
      params.forHandle = (ref.handle ?? ref.externalId).replace(/^@?/, "@");
    }

    const ch = await this.get<{ items?: YTChannel[] }>("channels", params);
    const item = ch.items?.[0];
    if (!item) return null;

    const channel: RawYouTubeChannel = {
      id: item.id,
      title: item.snippet?.title ?? "Unknown",
      description: item.snippet?.description ?? "",
      handle: item.snippet?.customUrl,
      country: item.snippet?.country,
      thumbnailUrl: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url,
      subscriberCount: Number(item.statistics?.subscriberCount ?? 0),
      viewCount: Number(item.statistics?.viewCount ?? 0),
      videoCount: Number(item.statistics?.videoCount ?? 0),
    };

    // Recent uploads → video ids → video stats.
    const uploads = item.contentDetails?.relatedPlaylists?.uploads;
    let videos: RawYouTubeVideo[] = [];
    if (uploads) {
      const pl = await this.get<{ items?: { contentDetails?: { videoId?: string } }[] }>("playlistItems", {
        part: "contentDetails",
        playlistId: uploads,
        maxResults: "10",
      });
      const ids = (pl.items ?? []).map((i) => i.contentDetails?.videoId).filter((v): v is string => Boolean(v));
      if (ids.length) {
        const vd = await this.get<{ items?: YTVideo[] }>("videos", {
          part: "snippet,statistics",
          id: ids.join(","),
        });
        videos = (vd.items ?? []).map((v) => ({
          id: v.id,
          title: v.snippet?.title ?? "",
          description: v.snippet?.description,
          tags: v.snippet?.tags,
          publishedAt: v.snippet?.publishedAt ?? new Date().toISOString(),
          viewCount: Number(v.statistics?.viewCount ?? 0),
          likeCount: Number(v.statistics?.likeCount ?? 0),
          commentCount: Number(v.statistics?.commentCount ?? 0),
        }));
      }
    }

    return normalizeYouTube(channel, videos);
  }
}

// Minimal typings for the YouTube API response subset we read.
interface YTThumb { url?: string }
interface YTChannel {
  id: string;
  snippet?: { title?: string; description?: string; customUrl?: string; country?: string; thumbnails?: { high?: YTThumb; default?: YTThumb } };
  statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
}
interface YTVideo {
  id: string;
  snippet?: { title?: string; description?: string; tags?: string[]; publishedAt?: string };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
}
