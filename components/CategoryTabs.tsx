"use client";

import { CATEGORIES, Category } from "@/lib/categories";

interface Props {
  selected: Category | null;
  onSelect: (cat: Category | null) => void;
  counts: Record<string, number>;
}

export default function CategoryTabs({ selected, onSelect, counts }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-gray-100 pb-0">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
          selected === null
            ? "border-red-600 text-red-600"
            : "border-transparent text-gray-500 hover:text-gray-800"
        }`}
      >
        Όλα
        {counts["all"] !== undefined && (
          <span className="ml-1.5 text-xs text-gray-400">{counts["all"]}</span>
        )}
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(selected === cat ? null : cat)}
          className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            selected === cat
              ? "border-red-600 text-red-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          {cat}
          {counts[cat] !== undefined && (
            <span className="ml-1.5 text-xs text-gray-400">{counts[cat]}</span>
          )}
        </button>
      ))}
    </div>
  );
}
