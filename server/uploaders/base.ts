import puppeteer, { type Browser, type Page } from "puppeteer";
import path from "path";
import fs from "fs";
import { supabaseAdmin } from "../lib/supabase.js";
import { decrypt } from "../lib/crypto.js";
import type { Platform } from "../../shared/types.js";
import { uploadToYouTube } from "./youtube.js";
import { uploadToTikTok } from "./tiktok.js";
import { uploadToInstagram } from "./instagram.js";
import { uploadToFacebook } from "./facebook.js";

export interface UploadContext {
  userId: string;
  title: string;
  caption: string;
  hashtags: string[];
  videoPath: string; // Supabase storage path
}

export interface UploadResult {
  url?: string;
  success: boolean;
}

const SESSION_DIR = path.resolve("server/session");

// Ensure session directories exist
for (const platform of ["youtube", "instagram", "tiktok", "facebook"]) {
  const dir = path.join(SESSION_DIR, platform);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function launchBrowser(
  platform: Platform,
  userId: string
): Promise<Browser> {
  const userDataDir = path.join(SESSION_DIR, platform, userId);
  if (!fs.existsSync(userDataDir))
    fs.mkdirSync(userDataDir, { recursive: true });

  return puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    userDataDir,
  });
}

export async function loadCookies(
  page: Page,
  platform: Platform,
  userId: string
): Promise<boolean> {
  // Try loading encrypted cookies from Supabase
  const { data } = await supabaseAdmin
    .from("platform_sessions")
    .select("encrypted_cookies")
    .eq("user_id", userId)
    .eq("platform", platform)
    .eq("is_active", true)
    .single();

  if (!data?.encrypted_cookies) return false;

  try {
    const cookiesJson = decrypt(data.encrypted_cookies, userId);
    const cookies = JSON.parse(cookiesJson);
    await page.setCookie(...cookies);
    return true;
  } catch {
    return false;
  }
}

export async function downloadVideo(
  videoPath: string
): Promise<string> {
  // Download from Supabase Storage to temp file
  const { data, error } = await supabaseAdmin.storage
    .from("videos")
    .download(videoPath);

  if (error || !data) {
    throw new Error(`Failed to download video: ${error?.message}`);
  }

  const tempDir = path.resolve("uploads/temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempPath = path.join(tempDir, `${Date.now()}-${path.basename(videoPath)}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync(tempPath, buffer);
  return tempPath;
}

export function buildCaption(caption: string, hashtags: string[]): string {
  const tags = hashtags
    .map((h) => (h.startsWith("#") ? h : `#${h}`))
    .join(" ");
  return caption ? `${caption}\n\n${tags}` : tags;
}

export async function runUploader(
  platform: Platform,
  ctx: UploadContext
): Promise<UploadResult> {
  // Download video to temp file
  const localVideoPath = await downloadVideo(ctx.videoPath);

  try {
    switch (platform) {
      case "youtube":
        return await uploadToYouTube({ ...ctx, videoPath: localVideoPath });
      case "tiktok":
        return await uploadToTikTok({ ...ctx, videoPath: localVideoPath });
      case "instagram":
        return await uploadToInstagram({ ...ctx, videoPath: localVideoPath });
      case "facebook":
        return await uploadToFacebook({ ...ctx, videoPath: localVideoPath });
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  } finally {
    // Clean up temp file
    if (fs.existsSync(localVideoPath)) fs.unlinkSync(localVideoPath);
  }
}
