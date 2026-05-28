"use client";

import { useEffect, useState } from "react";
import { Channel, Video } from "@/lib/youtube";
import VideoCard from "./VideoCard";
import ChannelFilter from "./ChannelFilter";

export default function Dashboard() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subscriptions")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => {
        setChannels(data.channels);
        setVideos(data.videos);
      })
      .catch(() => setError("Αδυναμία φόρτωσης. Δοκίμασε ξανά."))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    selectedChannel
      ? videos.filter((v) => v.channelId === selectedChannel)
      : videos;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">
          Φόρτωση subscriptions... (μπορεί να πάρει λίγα δευτερόλεπτα)
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {filtered.length} videos
          </h2>
          <p className="text-sm text-gray-500">
            από {channels.length} κανάλια
          </p>
        </div>
        <a
          href="/api/subscriptions"
          className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2"
        >
          Refresh
        </a>
      </div>

      <ChannelFilter
        channels={channels}
        selected={selectedChannel}
        onSelect={setSelectedChannel}
      />

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-16">
          Δεν βρέθηκαν videos για αυτό το κανάλι.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
