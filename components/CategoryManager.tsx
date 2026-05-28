"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Channel } from "@/lib/youtube";
import { CATEGORIES, Category } from "@/lib/category-config";

interface Props {
  channels: Channel[];
  assignments: Record<string, Category>;
  onSave: (assignments: Record<string, Category>) => Promise<void>;
  onClose: () => void;
}

type FilterMode = "all" | "unassigned";

export default function CategoryManager({ channels, assignments, onSave, onClose }: Props) {
  const [local, setLocal] = useState<Record<string, Category>>({ ...assignments });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  const unassignedCount = channels.filter((ch) => !local[ch.id]).length;

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return channels
      .filter((ch) => {
        const matchesSearch = q ? ch.title.toLowerCase().includes(q) : true;
        const matchesFilter = filter === "unassigned" ? !local[ch.id] : true;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        // Unassigned πρώτα, μετά αλφαβητικά
        const aAssigned = !!local[a.id];
        const bAssigned = !!local[b.id];
        if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
        return a.title.localeCompare(b.title);
      });
  }, [channels, local, search, filter]);

  async function handleSave() {
    setSaving(true);
    await onSave(local);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Κατηγορίες καναλιών</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search + filter */}
        <div className="px-5 py-3 border-b border-gray-100 space-y-2">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              placeholder="Αναζήτηση καναλιού..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filter === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Όλα ({channels.length})
            </button>
            <button
              onClick={() => setFilter("unassigned")}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filter === "unassigned"
                  ? "bg-orange-500 text-white"
                  : "bg-orange-50 text-orange-600 hover:bg-orange-100"
              }`}
            >
              Χωρίς κατηγορία ({unassignedCount})
            </button>
          </div>
        </div>

        {/* Channel list */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
          {visible.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">
              {filter === "unassigned" ? "Όλα τα κανάλια έχουν κατηγορία!" : "Δεν βρέθηκαν αποτελέσματα."}
            </p>
          ) : (
            visible.map((ch) => (
              <div key={ch.id} className="flex items-center gap-3 px-5 py-2.5">
                {ch.thumbnail && (
                  <Image
                    src={ch.thumbnail}
                    alt={ch.title}
                    width={32}
                    height={32}
                    className="rounded-full shrink-0"
                  />
                )}
                <span className="flex-1 text-sm text-gray-800 truncate">{ch.title}</span>
                <select
                  value={local[ch.id] ?? ""}
                  onChange={(e) =>
                    setLocal((prev) => {
                      const next = { ...prev };
                      if (e.target.value === "") delete next[ch.id];
                      else next[ch.id] = e.target.value as Category;
                      return next;
                    })
                  }
                  className={`text-sm border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    local[ch.id]
                      ? "border-gray-200 text-gray-700"
                      : "border-orange-200 text-orange-500 bg-orange-50"
                  }`}
                >
                  <option value="">— καμία —</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {visible.length} από {channels.length} κανάλια
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Ακύρωση
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Αποθήκευση..." : "Αποθήκευση"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
