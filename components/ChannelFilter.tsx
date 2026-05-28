"use client";

import Image from "next/image";
import { Channel } from "@/lib/youtube";

interface Props {
  channels: Channel[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export default function ChannelFilter({ channels, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          selected === null
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        Όλα
      </button>
      {channels.map((ch) => (
        <button
          key={ch.id}
          onClick={() => onSelect(selected === ch.id ? null : ch.id)}
          className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selected === ch.id
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {ch.thumbnail && (
            <Image
              src={ch.thumbnail}
              alt={ch.title}
              width={20}
              height={20}
              className="rounded-full"
            />
          )}
          <span className="max-w-[140px] truncate">{ch.title}</span>
        </button>
      ))}
    </div>
  );
}
