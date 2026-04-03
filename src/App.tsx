import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { AuthGate } from "./components/AuthGate";
import { VideoDropzone } from "./components/VideoDropzone";
import { MetadataForm } from "./components/MetadataForm";
import { PlatformSelector } from "./components/PlatformSelector";
import { SchedulePicker } from "./components/SchedulePicker";
import { UploadProgress } from "./components/UploadProgress";
import { PostHistory } from "./components/PostHistory";
import { PlatformLogin } from "./components/PlatformLogin";
import type { Platform, PlatformResult } from "@shared/types";
import { io as socketIO, Socket } from "socket.io-client";

type Tab = "publish" | "history" | "accounts";

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("publish");

  // Publish form state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [scheduleDate, setScheduleDate] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState<Record<string, PlatformResult>>({});
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Connect socket when we have a session
  useEffect(() => {
    if (!session) return;

    const s = socketIO({
      auth: { token: session.access_token },
    });

    s.on("publish:progress", (data) => {
      setProgress((prev) => ({
        ...prev,
        [data.platform]: {
          platform: data.platform,
          status: data.status,
          message: data.message,
        },
      }));
    });

    s.on("publish:complete", () => {
      setPublishing(false);
    });

    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500 text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <AuthGate />;
  }

  const token = session.access_token;

  async function handleUploadVideo(file: File) {
    setVideoFile(file);

    const formData = new FormData();
    formData.append("video", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      setVideoPath(data.path);
    } else {
      alert(`Upload failed: ${data.error}`);
      setVideoFile(null);
    }
  }

  async function handlePublish() {
    if (!videoPath || platforms.length === 0) return;

    setPublishing(true);
    setProgress({});

    // Initialize progress for all platforms
    const initial: Record<string, PlatformResult> = {};
    for (const p of platforms) {
      initial[p] = { platform: p, status: "queued" };
    }
    setProgress(initial);

    const hashtagList = hashtags
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((h) => h.replace(/^#/, ""));

    const res = await fetch("/api/publish", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        caption,
        hashtags: hashtagList,
        videoPath,
        platforms,
        scheduledFor: scheduleDate,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(`Publish failed: ${data.error}`);
      setPublishing(false);
    }

    if (scheduleDate) {
      alert("Post scheduled successfully!");
      setPublishing(false);
      resetForm();
    }
  }

  function resetForm() {
    setVideoFile(null);
    setVideoPath(null);
    setTitle("");
    setCaption("");
    setHashtags("");
    setPlatforms([]);
    setScheduleDate(null);
    setProgress({});
  }

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-500 to-purple-400 bg-clip-text text-transparent">
          MultiPost
        </h1>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-gray-500 hover:text-gray-300"
        >
          Sign out
        </button>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 bg-gray-900 rounded-xl p-1 mb-6">
        {(["publish", "history", "accounts"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "bg-gray-800 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* Publish Tab */}
      {tab === "publish" && (
        <div className="space-y-5">
          <VideoDropzone
            file={videoFile}
            uploading={!!videoFile && !videoPath}
            onDrop={handleUploadVideo}
          />

          {videoPath && (
            <>
              <MetadataForm
                title={title}
                caption={caption}
                hashtags={hashtags}
                onTitleChange={setTitle}
                onCaptionChange={setCaption}
                onHashtagsChange={setHashtags}
              />

              <PlatformSelector
                selected={platforms}
                onChange={setPlatforms}
                token={token}
              />

              <SchedulePicker
                value={scheduleDate}
                onChange={setScheduleDate}
              />

              {/* Publish Button */}
              <button
                onClick={handlePublish}
                disabled={publishing || platforms.length === 0}
                className="btn-primary w-full text-lg py-3"
              >
                {publishing
                  ? "Publishing..."
                  : scheduleDate
                  ? "Schedule Post"
                  : `Publish to ${platforms.length} platform${platforms.length !== 1 ? "s" : ""}`}
              </button>
            </>
          )}

          {/* Progress */}
          {Object.keys(progress).length > 0 && (
            <UploadProgress results={progress} />
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && <PostHistory token={token} />}

      {/* Accounts Tab */}
      {tab === "accounts" && <PlatformLogin token={token} />}
    </div>
  );
}
