import { launchBrowser, loadCookies, buildCaption } from "./base.js";
import type { UploadContext, UploadResult } from "./base.js";

export async function uploadToTikTok(ctx: UploadContext): Promise<UploadResult> {
  const browser = await launchBrowser("tiktok", ctx.userId);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const hasCookies = await loadCookies(page, "tiktok", ctx.userId);
    if (!hasCookies) {
      throw new Error(
        "Not logged into TikTok. Please connect your TikTok account first."
      );
    }

    // Navigate to TikTok upload page
    await page.goto("https://www.tiktok.com/upload", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for the upload area to appear
    await page.waitForSelector('input[type="file"]', { timeout: 15000 }).catch(() => {
      throw new Error("TikTok session expired. Please reconnect your TikTok account.");
    });

    // Upload video file
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error("Could not find file input on TikTok");
    await fileInput.uploadFile(ctx.videoPath);

    // Wait for video to process
    await new Promise(r => setTimeout(r, 5000));

    // Fill in caption (TikTok uses a contenteditable div)
    const fullCaption = buildCaption(ctx.caption, ctx.hashtags);
    const captionEditor = await page.$('[data-text="true"]');
    if (captionEditor) {
      await captionEditor.click();
      // Clear existing text
      await page.keyboard.down("Control");
      await page.keyboard.press("a");
      await page.keyboard.up("Control");
      await page.keyboard.type(fullCaption, { delay: 20 });
    }

    // Wait for upload to finish processing
    await new Promise(r => setTimeout(r, 10000));

    // Click Post button
    const postButton = await page.$('button[data-e2e="upload-btn"]');
    if (postButton) {
      await postButton.click();
    } else {
      // Fallback: look for any button with "Post" text
      const buttons = await page.$$("button");
      for (const btn of buttons) {
        const text = await btn.evaluate((el) => el.textContent?.trim());
        if (text === "Post") {
          await btn.click();
          break;
        }
      }
    }

    // Wait for confirmation
    await new Promise(r => setTimeout(r, 5000));

    return { success: true, url: "https://tiktok.com/@" };
  } finally {
    await browser.close();
  }
}
