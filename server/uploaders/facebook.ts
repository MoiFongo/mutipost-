import { launchBrowser, loadCookies, buildCaption } from "./base.js";
import type { UploadContext, UploadResult } from "./base.js";

export async function uploadToFacebook(ctx: UploadContext): Promise<UploadResult> {
  const browser = await launchBrowser("facebook", ctx.userId);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const hasCookies = await loadCookies(page, "facebook", ctx.userId);
    if (!hasCookies) {
      throw new Error(
        "Not logged into Facebook. Please connect your Facebook account first."
      );
    }

    // Navigate to Facebook Reels create page
    await page.goto("https://www.facebook.com/reels/create", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await new Promise(r => setTimeout(r, 3000));

    // Check if logged in
    const loginForm = await page.$('#loginbutton');
    if (loginForm) {
      throw new Error("Facebook session expired. Please reconnect your Facebook account.");
    }

    // Upload video file
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      // Try clicking the upload area first
      const uploadArea = await page.$('[role="button"]:has-text("Upload")');
      if (uploadArea) await uploadArea.click();
      await new Promise(r => setTimeout(r, 2000));

      const fileInput2 = await page.$('input[type="file"]');
      if (!fileInput2) throw new Error("Could not find file input on Facebook Reels");
      await fileInput2.uploadFile(ctx.videoPath);
    } else {
      await fileInput.uploadFile(ctx.videoPath);
    }

    // Wait for video to process
    await new Promise(r => setTimeout(r, 8000));

    // Fill in description
    const fullCaption = buildCaption(ctx.caption, ctx.hashtags);
    const descInput = await page.$('[contenteditable="true"]');
    if (descInput) {
      await descInput.click();
      await descInput.type(fullCaption, { delay: 20 });
    }

    await new Promise(r => setTimeout(r, 2000));

    // Click "Publish" or "Share" button
    const buttons = await page.$$('div[role="button"]');
    for (const btn of buttons) {
      const text = await btn.evaluate((el) => el.textContent?.trim());
      if (
        text === "Publish" ||
        text === "Share" ||
        text === "Share Reel" ||
        text === "Publish Reel"
      ) {
        await btn.click();
        break;
      }
    }

    // Wait for confirmation
    await new Promise(r => setTimeout(r, 8000));

    return { success: true, url: "https://facebook.com/reels/" };
  } finally {
    await browser.close();
  }
}
