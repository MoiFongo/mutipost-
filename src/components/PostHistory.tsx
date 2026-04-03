import { useState, useEffect } from "react";
import type { Post } from "@shared/types";

interface Props {
  token: string;
}

export function PostHistory({ token }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use Supabase client-side to fetch posts (RLS scoped to user)
    import("../lib/supabase").then(({ supabase }) => {
      supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data }) => {
          setPosts((data as Post[]) || []);
          setLoading(false);
        });
    });
  }, [token]);

  if (loading) {
    return (
      <div className="card text-center text-gray-500 py-8">Loading...</div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500 mb-1">No posts yet</p>
        <p className="text-gray-600 text-sm">
          Published videos will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div key={post.id} className="card">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">
                {post.title || post.caption || "Untitled"}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(post.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <span
              className={`shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium ${
                post.status === "completed"
                  ? "status-done"
                  : post.status === "failed"
                  ? "status-failed"
                  : post.status === "publishing" || post.status === "uploading"
                  ? "status-uploading"
                  : "status-queued"
              }`}
            >
              {post.status}
            </span>
          </div>

          {/* Platform results */}
          {post.platform_results && (
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(post.platform_results).map(
                ([platform, result]: [string, any]) => (
                  <span
                    key={platform}
                    className={`text-xs px-2 py-0.5 rounded-md ${
                      result.status === "done"
                        ? "status-done"
                        : "status-failed"
                    }`}
                  >
                    {platform}
                  </span>
                )
              )}
            </div>
          )}

          {/* Platforms (if no results yet) */}
          {!post.platform_results && (
            <div className="flex gap-1.5 flex-wrap">
              {post.platforms.map((p) => (
                <span
                  key={p}
                  className="text-xs px-2 py-0.5 rounded-md bg-gray-800 text-gray-400"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
