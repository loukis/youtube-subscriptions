"use client";

import Image from "next/image";
import { Video } from "@/lib/youtube";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("el-GR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatViews(count: string) {
  const n = parseInt(count, 10);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} views`;
}

export default function VideoCard({ video }: { video: Video }) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200"
    >
      <div className="relative aspect-video bg-gray-100">
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
      </div>

      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-xs font-semibold text-red-600 truncate">
          {video.channelTitle}
        </p>
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
          {video.title}
        </h3>
        {video.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
            {video.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-auto pt-2 text-xs text-gray-400">
          <span>{formatDate(video.publishedAt)}</span>
          <span>·</span>
          <span>{formatViews(video.viewCount)}</span>
        </div>
      </div>
    </a>
  );
}
