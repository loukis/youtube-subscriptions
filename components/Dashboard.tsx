"use client";

import { useEffect, useState } from "react";
import { Channel, Video } from "@/lib/youtube";
import { Category } from "@/lib/categories";
import VideoCard from "./VideoCard";
import ChannelFilter from "./ChannelFilter";
import CategoryTabs from "./CategoryTabs";
import CategoryManager from "./CategoryManager";

export default function Dashboard() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Category>>({});
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [showManager, setShowManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/subscriptions").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([subData, catData]) => {
        if (subData.error) throw new Error(subData.error);
        setChannels(subData.channels);
        setVideos(subData.videos);
        setAssignments(catData);
      })
      .catch(() => setError("Αδυναμία φόρτωσης. Δοκίμασε ξανά."))
      .finally(() => setLoading(false));
  }, []);

  async function saveAssignments(newAssignments: Record<string, Category>) {
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAssignments),
    });
    setAssignments(newAssignments);
  }

  // Κανάλια της επιλεγμένης κατηγορίας
  const categoryChannels =
    selectedCategory
      ? channels.filter((ch) => assignments[ch.id] === selectedCategory)
      : channels;

  // Videos φιλτραρισμένα
  const filtered = videos.filter((v) => {
    const inCategory = selectedCategory
      ? assignments[v.channelId] === selectedCategory
      : true;
    const inChannel = selectedChannel ? v.channelId === selectedChannel : true;
    return inCategory && inChannel;
  });

  // Μετρητές ανά κατηγορία για τα tabs
  const counts: Record<string, number> = { all: videos.length };
  for (const v of videos) {
    const cat = assignments[v.channelId];
    if (cat) counts[cat] = (counts[cat] ?? 0) + 1;
  }

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
    <div className="space-y-4">
      {/* Category tabs + manage button */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex-1 overflow-hidden">
          <CategoryTabs
            selected={selectedCategory}
            onSelect={(cat) => {
              setSelectedCategory(cat);
              setSelectedChannel(null);
            }}
            counts={counts}
          />
        </div>
        <button
          onClick={() => setShowManager(true)}
          className="shrink-0 mb-1 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Κατηγορίες
        </button>
      </div>

      {/* Channel filter (για την επιλεγμένη κατηγορία) */}
      {categoryChannels.length > 0 && (
        <ChannelFilter
          channels={categoryChannels}
          selected={selectedChannel}
          onSelect={setSelectedChannel}
        />
      )}

      {/* Stats */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{filtered.length}</span> videos
          {selectedCategory && (
            <span> στην κατηγορία <span className="font-medium text-gray-700">{selectedCategory}</span></span>
          )}
        </p>
      </div>

      {/* Video grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-gray-400">Δεν βρέθηκαν videos.</p>
          {selectedCategory && Object.values(assignments).every((v) => v !== selectedCategory) && (
            <p className="text-sm text-gray-400">
              Δεν έχεις αναθέσει κανάλια σε αυτή την κατηγορία ακόμα.{" "}
              <button
                onClick={() => setShowManager(true)}
                className="text-red-600 underline underline-offset-2"
              >
                Ανάθεσε τώρα
              </button>
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}

      {/* Category Manager Modal */}
      {showManager && (
        <CategoryManager
          channels={channels}
          assignments={assignments}
          onSave={saveAssignments}
          onClose={() => setShowManager(false)}
        />
      )}
    </div>
  );
}
