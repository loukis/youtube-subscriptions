"use client";

import { useEffect, useState } from "react";
import { Channel, Video } from "@/lib/youtube";
import { Category } from "@/lib/category-config";
import VideoCard from "./VideoCard";
import ChannelFilter from "./ChannelFilter";
import CategoryTabs from "./CategoryTabs";
import CategoryManager from "./CategoryManager";

interface CacheData {
  channels: Channel[];
  videos: Video[];
  syncedAt: string | null;
  stale?: boolean;
}

export default function Dashboard() {
  const [cache, setCache] = useState<CacheData>({ channels: [], videos: [], syncedAt: null });
  const [assignments, setAssignments] = useState<Record<string, Category>>({});
  const [watched, setWatched] = useState<Record<string, true>>({});
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showWatched, setShowWatched] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/subscriptions").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/watched").then((r) => r.json()),
    ])
      .then(([subData, catData, watchedData]) => {
        if (subData.error) throw new Error(subData.error);
        setCache(subData);
        setAssignments(catData);
        setWatched(watchedData);

        if (subData.stale) {
          setSyncing(true);
          fetch("/api/sync", { method: "POST" })
            .then((r) => r.json())
            .then(async () => {
              const fresh = await fetch("/api/subscriptions").then((r) => r.json());
              setCache(fresh);
            })
            .finally(() => setSyncing(false));
        }
      })
      .catch(() => setError("Αδυναμία φόρτωσης. Δοκίμασε ξανά."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const subData = await fetch("/api/subscriptions").then((r) => r.json());
      setCache(subData);
    } catch {
      alert("Sync απέτυχε. Δοκίμασε ξανά.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggleWatched(videoId: string) {
    const res = await fetch("/api/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    });
    const data = await res.json();
    setWatched((prev) => {
      const next = { ...prev };
      if (data.watched) next[videoId] = true;
      else delete next[videoId];
      return next;
    });
  }

  async function saveAssignments(newAssignments: Record<string, Category>) {
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAssignments),
    });
    setAssignments(newAssignments);
  }

  const { channels, videos, syncedAt } = cache;
  const q = searchQuery.toLowerCase().trim();

  // Κανάλια που ταιριάζουν με το search
  const searchedChannelIds = q
    ? new Set(channels.filter((ch) => ch.title.toLowerCase().includes(q)).map((ch) => ch.id))
    : null;

  // Κανάλια για το channel filter (category + search)
  const visibleChannels = channels.filter((ch) => {
    const inCategory = selectedCategory ? assignments[ch.id] === selectedCategory : true;
    const inSearch = searchedChannelIds ? searchedChannelIds.has(ch.id) : true;
    return inCategory && inSearch;
  });

  // Videos φιλτραρισμένα
  const filtered = videos.filter((v) => {
    const inCategory = selectedCategory ? assignments[v.channelId] === selectedCategory : true;
    const inChannel = selectedChannel ? v.channelId === selectedChannel : true;
    const inSearch = searchedChannelIds ? searchedChannelIds.has(v.channelId) : true;
    const inWatched = showWatched ? true : !watched[v.id];
    return inCategory && inChannel && inSearch && inWatched;
  });

  const watchedCount = videos.filter((v) => watched[v.id]).length;
  const unwatchedCount = videos.length - watchedCount;

  const counts: Record<string, number> = {
    all: videos.filter((v) => {
      const inSearch = searchedChannelIds ? searchedChannelIds.has(v.channelId) : true;
      return inSearch && (showWatched || !watched[v.id]);
    }).length,
  };
  for (const v of videos) {
    if (!showWatched && watched[v.id]) continue;
    if (searchedChannelIds && !searchedChannelIds.has(v.channelId)) continue;
    const cat = assignments[v.channelId];
    if (cat) counts[cat] = (counts[cat] ?? 0) + 1;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Φόρτωση...</p>
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

  if (videos.length === 0 && !syncedAt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Δεν υπάρχουν δεδομένα ακόμα</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            Κάνε Sync για να φορτωθούν όλα τα videos από τα subscriptions σου.
            Η πρώτη φορά μπορεί να πάρει 1-3 λεπτά.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-red-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          {syncing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync τώρα
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar: search + controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            placeholder="Αναζήτηση καναλιού..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedChannel(null); }}
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowManager(true)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Categories
          </button>
          <span className="text-gray-200">|</span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50 transition-colors"
            title={cache.stale ? "Auto-sync (cache > 24h)" : "Manual sync"}
          >
            <svg className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {/* Category tabs (κρύβονται κατά τη διάρκεια search) */}
      {!q && (
        <CategoryTabs
          selected={selectedCategory}
          onSelect={(cat) => { setSelectedCategory(cat); setSelectedChannel(null); }}
          counts={counts}
        />
      )}

      {/* Search results label */}
      {q && (
        <p className="text-sm text-gray-500">
          Αποτελέσματα για <span className="font-semibold text-gray-800">"{searchQuery}"</span>
          {" "}— {visibleChannels.length} κανάλια, {filtered.length} videos
        </p>
      )}

      {/* Channel filter pills */}
      {visibleChannels.length > 0 && (
        <ChannelFilter
          channels={visibleChannels}
          selected={selectedChannel}
          onSelect={setSelectedChannel}
        />
      )}

      {/* Stats + watched toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{filtered.length}</span> videos
          {syncedAt && !q && (
            <span className="ml-2 text-xs text-gray-400">
              · synced {new Date(syncedAt).toLocaleDateString("el-GR")}
            </span>
          )}
        </p>
        <button
          onClick={() => setShowWatched((v) => !v)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
            showWatched
              ? "bg-green-100 text-green-700 hover:bg-gray-100 hover:text-gray-600"
              : "bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={showWatched
                ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              }
            />
          </svg>
          {showWatched ? `Hide watched (${watchedCount})` : `Show watched (${watchedCount})`}
        </button>
      </div>

      {/* Video grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-gray-400">
            {q
              ? `Δεν βρέθηκαν κανάλια για "${searchQuery}".`
              : unwatchedCount === 0 && !showWatched
              ? "Τα έχεις δει όλα!"
              : "Δεν βρέθηκαν videos."}
          </p>
          {unwatchedCount === 0 && !showWatched && !q && (
            <button
              onClick={() => setShowWatched(true)}
              className="text-sm text-red-600 underline underline-offset-2"
            >
              Δες τα watched videos
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              watched={!!watched[video.id]}
              onToggleWatched={handleToggleWatched}
            />
          ))}
        </div>
      )}

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
