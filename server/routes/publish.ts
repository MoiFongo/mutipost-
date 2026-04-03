import { Router } from "express";
import type { Server } from "socket.io";
import { supabaseAdmin } from "../lib/supabase.js";
import { publishLimiter } from "../middleware/rateLimit.js";
import { runUploader } from "../uploaders/base.js";
import type { AuthRequest } from "../middleware/auth.js";
import type {
  Platform,
  PostConfig,
  PlatformResult,
  ServerToClientEvents,
  ClientToServerEvents,
} from "../../shared/types.js";

const router = Router();

router.post("/", publishLimiter, async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.userId!;
  const io: Server<ClientToServerEvents, ServerToClientEvents> =
    req.app.get("io");

  const { title, caption, hashtags, videoPath, platforms, scheduledFor } =
    req.body as PostConfig;

  if (!videoPath || !platforms?.length) {
    return res
      .status(400)
      .json({ error: "videoPath and at least one platform are required" });
  }

  // Create post record
  const { data: post, error } = await supabaseAdmin
    .from("posts")
    .insert({
      user_id: userId,
      title,
      caption,
      hashtags: hashtags || [],
      video_path: videoPath,
      platforms,
      status: scheduledFor ? "pending" : "uploading",
      scheduled_for: scheduledFor || null,
    })
    .select()
    .single();

  if (error || !post) {
    return res
      .status(500)
      .json({ error: `Failed to create post: ${error?.message}` });
  }

  // If scheduled, just save and return
  if (scheduledFor) {
    return res.json({ post, message: "Post scheduled successfully" });
  }

  // Publish immediately (async — don't block the response)
  res.json({ post, message: "Publishing started" });

  // Run uploaders in parallel
  const results: Record<string, PlatformResult> = {};

  await Promise.allSettled(
    platforms.map(async (platform: Platform) => {
      io.emit("publish:progress", {
        postId: post.id,
        platform,
        status: "uploading",
        message: `Uploading to ${platform}...`,
      });

      try {
        const result = await runUploader(platform, {
          userId,
          title: title || "",
          caption: caption || "",
          hashtags: hashtags || [],
          videoPath,
        });

        results[platform] = {
          platform,
          status: "done",
          url: result.url,
        };

        io.emit("publish:progress", {
          postId: post.id,
          platform,
          status: "done",
          message: `Published to ${platform}!`,
        });
      } catch (err: any) {
        results[platform] = {
          platform,
          status: "failed",
          message: err.message,
        };

        io.emit("publish:progress", {
          postId: post.id,
          platform,
          status: "failed",
          message: `Failed: ${err.message}`,
        });
      }
    })
  );

  // Update post with results
  const allDone = Object.values(results).every((r) => r.status === "done");
  await supabaseAdmin
    .from("posts")
    .update({
      status: allDone ? "completed" : "failed",
      platform_results: results,
      published_at: new Date().toISOString(),
    })
    .eq("id", post.id);

  io.emit("publish:complete", {
    postId: post.id,
    results: results as Record<Platform, PlatformResult>,
  });
});

export { router as publishRouter };
