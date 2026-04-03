import { useState, useEffect } from "react";
import type { Platform } from "@shared/types";

interface PlatformInfo {
  id: Platform;
  name: string;
  icon: string;
  color: string;
}

const PLATFORMS: PlatformInfo[] = [
  { id: "youtube", name: "YouTube Shorts", icon: "YT", color: "text-red-400" },
  { id: "instagram", name: "Instagram Reels", icon: "IG", color: "text-pink-400" },
  { id: "tiktok", name: "TikTok", icon: "TT", color: "text-cyan-400" },
  { id: "facebook", name: "Facebook Reels", icon: "FB", color: "text-blue-400" },
];

interface Props {
  selected: Platform[];
  onChange: (platforms: Platform[]) => void;
  token: string;
}

export function PlatformSelector({ selected, onChange, token }: Props) {
  const [connectionStatus, setConnectionStatus] = useState<
    Record<Platform, boolean>
  >({
    youtube: false,
    instagram: false,
    tiktok: false,
    facebook: false,
  });

  useEffect(() => {
    fetch("/api/platforms", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const status: Record<Platform, boolean> = {
          youtube: false,
          instagram: false,
          tiktok: false,
          facebook: false,
        };
        for (const [k, v] of Object.entries(data)) {
          status[k as Platform] = (v as any).connected;
        }
        setConnectionStatus(status);
      })
      .catch(() => {});
  }, [token]);

  function toggle(platform: Platform) {
    if (selected.includes(platform)) {
      onChange(selected.filter((p) => p !== platform));
    } else {
      onChange([...selected, platform]);
    }
  }

  return (
    <div className="card">
      <label className="label mb-3">Platforms</label>
      <div className="grid grid-cols-2 gap-2">
        {PLATFORMS.map((p) => {
          const isSelected = selected.includes(p.id);
          const isConnected = connectionStatus[p.id];

          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`platform-chip ${isSelected ? "selected" : "unselected"}`}
            >
              <span className={`text-lg font-bold ${p.color}`}>{p.icon}</span>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className={`text-xs ${isConnected ? "text-green-500" : "text-gray-600"}`}>
                  {isConnected ? "Connected" : "Not connected"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selected.some((p) => !connectionStatus[p]) && (
        <p className="text-xs text-yellow-500 mt-3">
          Some selected platforms aren't connected yet. Go to Accounts tab to connect them.
        </p>
      )}
    </div>
  );
}
