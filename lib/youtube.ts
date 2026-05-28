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

// Βήμα 1: Φέρνει όλα τα subscriptions του λογαριασμού (με pagination)
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

    const items = res.data.items ?? [];
    for (const item of items) {
      const channelId = item.snippet?.resourceId?.channelId;
      if (!channelId) continue;
      channels.push({
        id: channelId,
        title: item.snippet?.title ?? "Unknown",
        thumbnail: item.snippet?.thumbnails?.default?.url ?? "",
        uploadsPlaylistId: "", // συμπληρώνεται στο επόμενο βήμα
      });
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return channels;
}

// Βήμα 2: Για κάθε κανάλι παίρνει το uploads playlist ID (batched ανά 50)
export async function enrichChannelsWithPlaylistIds(
  accessToken: string,
  channels: Channel[]
): Promise<Channel[]> {
  const auth = getOAuthClient(accessToken);
  const enriched: Channel[] = [];

  for (let i = 0; i < channels.length; i += 50) {
    const batch = channels.slice(i, i + 50);
    const ids = batch.map((c) => c.id);

    const res = await youtube.channels.list({
      auth,
      part: ["contentDetails", "snippet"],
      id: ids,
      maxResults: 50,
    });

    for (const item of res.data.items ?? []) {
      const original = batch.find((c) => c.id === item.id);
      if (!original) continue;
      enriched.push({
        ...original,
        thumbnail:
          item.snippet?.thumbnails?.default?.url ?? original.thumbnail,
        uploadsPlaylistId:
          item.contentDetails?.relatedPlaylists?.uploads ?? "",
      });
    }
  }

  return enriched;
}

// Βήμα 3: Φέρνει τα N πιο πρόσφατα video IDs από το uploads playlist κάθε καναλιού
export async function getRecentVideoIds(
  accessToken: string,
  uploadsPlaylistId: string,
  maxResults = 5
): Promise<string[]> {
  const auth = getOAuthClient(accessToken);

  const res = await youtube.playlistItems.list({
    auth,
    part: ["contentDetails"],
    playlistId: uploadsPlaylistId,
    maxResults,
  });

  return (res.data.items ?? [])
    .map((item) => item.contentDetails?.videoId ?? "")
    .filter(Boolean);
}

// Βήμα 4: Φέρνει λεπτομέρειες videos (batched ανά 50)
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

// Κεντρική συνάρτηση: φέρνει όλα τα πρόσφατα videos από όλα τα subscriptions
export async function getAllSubscriptionVideos(
  accessToken: string,
  videosPerChannel = 3
): Promise<{ channels: Channel[]; videos: Video[] }> {
  const rawChannels = await getSubscriptions(accessToken);
  const channels = await enrichChannelsWithPlaylistIds(accessToken, rawChannels);

  const allVideoIds: string[] = [];

  // Για κάθε κανάλι φέρνουμε τα πρόσφατα video IDs
  await Promise.all(
    channels.map(async (channel) => {
      if (!channel.uploadsPlaylistId) return;
      const ids = await getRecentVideoIds(
        accessToken,
        channel.uploadsPlaylistId,
        videosPerChannel
      );
      allVideoIds.push(...ids);
    })
  );

  const videos = await getVideoDetails(accessToken, allVideoIds);

  // Ταξινόμηση: νεότερα πρώτα
  videos.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return { channels, videos };
}