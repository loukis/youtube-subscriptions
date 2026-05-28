import { google } from "googleapis";

const youtube = google.youtube("v3");

export interface Channel {
  id: string;
  title: string;
  thumbnail: string;
  uploadsPlaylistId: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  categoryId: string;
  viewCount: string;
  duration: string;
}

function getOAuthClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

// Βήμα 1: Φέρνει όλα τα subscriptions (με pagination)
export async function getSubscriptions(accessToken: string): Promise<Channel[]> {
  const auth = getOAuthClient(accessToken);
  const channels: Channel[] = [];
  let pageToken: string | undefined;

  do {
    const res = await youtube.subscriptions.list({
      auth,
      part: ["snippet"],
      mine: true,
      maxResults: 50,
      pageToken,
    });

    for (const item of res.data.items ?? []) {
      const channelId = item.snippet?.resourceId?.channelId;
      if (!channelId) continue;
      channels.push({
        id: channelId,
        title: item.snippet?.title ?? "Unknown",
        thumbnail: item.snippet?.thumbnails?.default?.url ?? "",
        uploadsPlaylistId: "",
      });
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return channels;
}

// Βήμα 2: Παίρνει uploads playlist ID για κάθε κανάλι (batched 50)
export async function enrichChannelsWithPlaylistIds(
  accessToken: string,
  channels: Channel[]
): Promise<Channel[]> {
  const auth = getOAuthClient(accessToken);
  const enriched: Channel[] = [];

  for (let i = 0; i < channels.length; i += 50) {
    const batch = channels.slice(i, i + 50);

    const res = await youtube.channels.list({
      auth,
      part: ["contentDetails", "snippet"],
      id: batch.map((c) => c.id),
      maxResults: 50,
    });

    for (const item of res.data.items ?? []) {
      const original = batch.find((c) => c.id === item.id);
      if (!original) continue;
      enriched.push({
        ...original,
        thumbnail: item.snippet?.thumbnails?.default?.url ?? original.thumbnail,
        uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? "",
      });
    }
  }

  return enriched;
}

// Βήμα 3: Φέρνει ΟΛΑ τα video IDs από ένα uploads playlist (πλήρης pagination)
export async function getAllVideoIds(
  accessToken: string,
  uploadsPlaylistId: string
): Promise<string[]> {
  const auth = getOAuthClient(accessToken);
  const videoIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const res = await youtube.playlistItems.list({
      auth,
      part: ["contentDetails"],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken,
    });

    const ids = (res.data.items ?? [])
      .map((item) => item.contentDetails?.videoId ?? "")
      .filter(Boolean);

    videoIds.push(...ids);
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return videoIds;
}

// Βήμα 4: Φέρνει λεπτομέρειες videos (batched 50)
export async function getVideoDetails(
  accessToken: string,
  videoIds: string[]
): Promise<Video[]> {
  if (videoIds.length === 0) return [];
  const auth = getOAuthClient(accessToken);
  const videos: Video[] = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);

    const res = await youtube.videos.list({
      auth,
      part: ["snippet", "statistics", "contentDetails"],
      id: batch,
    });

    for (const item of res.data.items ?? []) {
      videos.push({
        id: item.id ?? "",
        title: item.snippet?.title ?? "",
        description: (item.snippet?.description ?? "").slice(0, 300),
        thumbnail: item.snippet?.thumbnails?.medium?.url ?? "",
        channelId: item.snippet?.channelId ?? "",
        channelTitle: item.snippet?.channelTitle ?? "",
        publishedAt: item.snippet?.publishedAt ?? "",
        categoryId: item.snippet?.categoryId ?? "",
        viewCount: item.statistics?.viewCount ?? "0",
        duration: item.contentDetails?.duration ?? "",
      });
    }
  }

  return videos;
}

// Τρέχει async tasks σε batches για να αποφύγουμε rate limiting
async function runInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));
  }
}

// Κεντρική συνάρτηση: φέρνει ΟΛΑ τα videos από ΟΛΕΣ τις subscriptions
export async function getAllSubscriptionVideos(
  accessToken: string
): Promise<{ channels: Channel[]; videos: Video[] }> {
  const rawChannels = await getSubscriptions(accessToken);
  console.log(`[sync] ${rawChannels.length} subscriptions found`);

  const channels = await enrichChannelsWithPlaylistIds(accessToken, rawChannels);
  console.log(`[sync] enriched ${channels.length} channels`);

  const allVideoIds: string[] = [];
  let done = 0;

  // 10 κανάλια τη φορά για να αποφύγουμε rate limiting
  await runInBatches(channels, 10, async (channel) => {
    if (!channel.uploadsPlaylistId) return;
    const ids = await getAllVideoIds(accessToken, channel.uploadsPlaylistId);
    allVideoIds.push(...ids);
    done++;
    if (done % 10 === 0) console.log(`[sync] ${done}/${channels.length} channels processed`);
  });

  console.log(`[sync] ${allVideoIds.length} video IDs collected — fetching details...`);
  const videos = await getVideoDetails(accessToken, allVideoIds);

  videos.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return { channels, videos };
}
