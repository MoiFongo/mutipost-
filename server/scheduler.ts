import cron from "node-cron";
import type { Server } from "socket.io";
import { supabaseAdmin } from "./lib/supabase.js";
import { runUploader } from "./uploaders/base.js";
import type {
  Platform,
  PlatformResult,
  ServerToClientEvents,
  ClientToServerEvents,
} from "../shared/types.js";

export function startScheduler(
  io: Server<ClientToServerEvents, ServerToClientEvents>
) {
  // Check for scheduled posts every minute
  cron.schedule("* * * * *", async () => {
    const now = new Date().toISOString();

    // Find posts that are due
    const { data: duePosts, error } = await supabaseAdmin
      .from("posts")
      .select("*")
      .eq("status", "pending")
      .not("scheduled_for", "is", null)
      .lte("scheduled_for", now);

    if (error || !duePosts?.length) return;

    for (const post of duePosts) {
      // Mark as uploading
      await supabaseAdmin
        .from("posts")
        .update({ status: "uploading" })
        .eq("id", post.id);

      const results: Record<string, PlatformResult> = {};

      // Run uploaders
      await Promise.allSettled(
        post.platforms.map(async (platform: string) => {
          io.emit("publish:progress", {
            postId: post.id,
            platform: platform as Platform,
            status: "uploading",
            message: `Uploading to ${platform}...`,
          });

          try {
            const result = await runUploader(platform as Platform, {
              userId: post.user_id,
              title: post.title || "",
              caption: post.caption || "",
              hashtags: post.hashtags || [],
              videoPath: post.video_path,
            });

            results[platform] = {
              platform: platform as Platform,
              status: "done",
              url: result.url,
            };

            io.emit("publish:progress", {
              postId: post.id,
              platform: platform as Platform,
              status: "done",
            });
          } catch (err: any) {
            results[platform] = {
              platform: platform as Platform,
              status: "failed",
              message: err.message,
            };

            io.emit("publish:progress", {
              postId: post.id,
              platform: platform as Platform,
              status: "failed",
              message: err.message,
            });
          }
        })
      );

      const allDone = Object.values(results).every((r) => r.status === "done");
      await supabaseAdmin
        .from("posts")
        .update({
          status: allDone ? "completed" : "failed",
          platform_results: results,
          published_at: new Date().toISOString(),
        })
        .eq("id", post.id);
    }
  });

  console.log("Scheduler started — checking for due posts every minute");
}
