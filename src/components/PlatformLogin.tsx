import { useState, useEffect } from "react";
import type { Platform } from "@shared/types";

interface PlatformInfo {
  id: Platform;
  name: string;
  icon: string;
  color: string;
  domain: string;
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: "youtube",
    name: "YouTube",
    icon: "YT",
    color: "text-red-400",
    domain: "youtube.com",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "IG",
    color: "text-pink-400",
    domain: "instagram.com",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "TT",
    color: "text-cyan-400",
    domain: "tiktok.com",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "FB",
    color: "text-blue-400",
    domain: "facebook.com",
  },
];

interface Props {
  token: string;
}

export function PlatformLogin({ token }: Props) {
  const [status, setStatus] = useState<
    Record<Platform, { connected: boolean; updatedAt: string | null }>
  >({
    youtube: { connected: false, updatedAt: null },
    instagram: { connected: false, updatedAt: null },
    tiktok: { connected: false, updatedAt: null },
    facebook: { connected: false, updatedAt: null },
  });
  const [cookieInput, setCookieInput] = useState<{
    platform: Platform;
    value: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [token]);

  async function loadStatus() {
    const res = await fetch("/api/platforms", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setStatus(await res.json());
    }
  }

  async function saveCookies(platform: Platform, cookiesJson: string) {
    setSaving(true);
    try {
      const cookies = JSON.parse(cookiesJson);
      const res = await fetch(`/api/platforms/${platform}/cookies`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cookies }),
      });

      if (res.ok) {
        setCookieInput(null);
        await loadStatus();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert("Invalid JSON. Please paste the exported cookies as JSON.");
    }
    setSaving(false);
  }

  async function disconnect(platform: Platform) {
    await fetch(`/api/platforms/${platform}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadStatus();
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-medium mb-1">Connect Your Accounts</h2>
        <p className="text-sm text-gray-500 mb-4">
          Export cookies from your browser using an extension like "EditThisCookie" or "Cookie-Editor", then paste them here.
        </p>
      </div>

      {PLATFORMS.map((p) => {
        const s = status[p.id];
        const isEditing = cookieInput?.platform === p.id;

        return (
          <div key={p.id} className="card">
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-xl font-bold ${p.color}`}>{p.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-xs text-gray-500">{p.domain}</p>
              </div>
              {s.connected ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-400 font-medium">
                    Connected
                  </span>
                  <button
                    onClick={() => disconnect(p.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() =>
                    setCookieInput(
                      isEditing ? null : { platform: p.id, value: "" }
                    )
                  }
                  className="btn-secondary text-sm py-1.5 px-3"
                >
                  {isEditing ? "Cancel" : "Connect"}
                </button>
              )}
            </div>

            {isEditing && (
              <div className="space-y-2">
                <textarea
                  value={cookieInput.value}
                  onChange={(e) =>
                    setCookieInput({ ...cookieInput, value: e.target.value })
                  }
                  className="input min-h-[100px] text-xs font-mono resize-y"
                  placeholder='Paste exported cookies JSON here...\n[\n  { "name": "...", "value": "...", "domain": "..." }\n]'
                />
                <button
                  onClick={() => saveCookies(p.id, cookieInput.value)}
                  disabled={saving || !cookieInput.value.trim()}
                  className="btn-primary w-full text-sm"
                >
                  {saving ? "Saving..." : "Save Cookies"}
                </button>
              </div>
            )}

            {s.connected && s.updatedAt && (
              <p className="text-xs text-gray-600">
                Last updated:{" "}
                {new Date(s.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
