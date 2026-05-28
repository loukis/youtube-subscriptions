"use client";

import { useState } from "react";
import Image from "next/image";
import { Channel } from "@/lib/youtube";
import { CATEGORIES, Category } from "@/lib/categories";

interface Props {
  channels: Channel[];
  assignments: Record<string, Category>;
  onSave: (assignments: Record<string, Category>) => Promise<void>;
  onClose: () => void;
}

export default function CategoryManager({ channels, assignments, onSave, onClose }: Props) {
  const [local, setLocal] = useState<Record<string, Category>>({ ...assignments });
  const [saving, setSaving] = useState(false);

  const sorted = [...channels].sort((a, b) => a.title.localeCompare(b.title));

  async function handleSave() {
    setSaving(true);
    await onSave(local);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Κατηγορίες καναλιών</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
          {sorted.map((ch) => (
            <div key={ch.id} className="flex items-center gap-3 px-5 py-3">
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
                    if (e.target.value === "") {
                      delete next[ch.id];
                    } else {
                      next[ch.id] = e.target.value as Category;
                    }
                    return next;
                  })
                }
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">— καμία —</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
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
  );
}
