import type { PlatformResult, PlatformStatus } from "@shared/types";

const STATUS_LABELS: Record<PlatformStatus, string> = {
  queued: "Queued",
  uploading: "Uploading...",
  processing: "Processing...",
  done: "Published!",
  failed: "Failed",
};

const STATUS_ICONS: Record<PlatformStatus, string> = {
  queued: "...",
  uploading: "...",
  processing: "...",
  done: "OK",
  failed: "X",
};

const PLATFORM_NAMES: Record<string, string> = {
  youtube: "YouTube Shorts",
  instagram: "Instagram Reels",
  tiktok: "TikTok",
  facebook: "Facebook Reels",
};

interface Props {
  results: Record<string, PlatformResult>;
}

export function UploadProgress({ results }: Props) {
  return (
    <div className="card space-y-3">
      <label className="label">Progress</label>

      {Object.entries(results).map(([platform, result]) => (
        <div
          key={platform}
          className="flex items-center gap-3 p-3 rounded-xl bg-gray-800"
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold status-${result.status}`}
          >
            {STATUS_ICONS[result.status]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {PLATFORM_NAMES[platform] || platform}
            </p>
            <p className="text-xs text-gray-500">
              {result.message || STATUS_LABELS[result.status]}
            </p>
          </div>
          {result.status === "uploading" && (
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      ))}
    </div>
  );
}
