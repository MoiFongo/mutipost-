import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { encrypt } from "../lib/crypto.js";
import type { AuthRequest } from "../middleware/auth.js";
import type { Platform } from "../../shared/types.js";

const router = Router();

// Get connection status for all platforms
router.get("/", async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.userId!;

  const { data, error } = await supabaseAdmin
    .from("platform_sessions")
    .select("platform, is_active, updated_at")
    .eq("user_id", userId);

  if (error) return res.status(500).json({ error: error.message });

  const platforms: Record<Platform, { connected: boolean; updatedAt: string | null }> = {
    youtube: { connected: false, updatedAt: null },
    instagram: { connected: false, updatedAt: null },
    tiktok: { connected: false, updatedAt: null },
    facebook: { connected: false, updatedAt: null },
  };

  for (const session of data || []) {
    const p = session.platform as Platform;
    if (platforms[p]) {
      platforms[p] = {
        connected: session.is_active,
        updatedAt: session.updated_at,
      };
    }
  }

  res.json(platforms);
});

// Save platform cookies (from browser extension export)
router.post("/:platform/cookies", async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.userId!;
  const platform = req.params.platform as Platform;
  const { cookies } = req.body;

  if (!cookies) {
    return res.status(400).json({ error: "cookies field is required" });
  }

  const validPlatforms: Platform[] = ["youtube", "instagram", "tiktok", "facebook"];
  if (!validPlatforms.includes(platform)) {
    return res.status(400).json({ error: "Invalid platform" });
  }

  const encrypted = encrypt(JSON.stringify(cookies), userId);

  const { error } = await supabaseAdmin
    .from("platform_sessions")
    .upsert(
      {
        user_id: userId,
        platform,
        encrypted_cookies: encrypted,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" }
    );

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, platform, connected: true });
});

// Disconnect a platform
router.delete("/:platform", async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.userId!;
  const platform = req.params.platform;

  const { error } = await supabaseAdmin
    .from("platform_sessions")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("platform", platform);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export { router as platformsRouter };
