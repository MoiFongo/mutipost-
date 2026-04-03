import { launchBrowser, loadCookies, buildCaption } from "./base.js";
import type { UploadContext, UploadResult } from "./base.js";

export async function uploadToInstagram(ctx: UploadContext): Promise<UploadResult> {
  const browser = await launchBrowser("instagram", ctx.userId);

  try {
    const page = await browser.newPage();

    // Instagram requires mobile user agent for some upload features
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    );
    await page.setViewport({ width: 430, height: 932, isMobile: true });

    const hasCookies = await loadCookies(page, "instagram", ctx.userId);
    if (!hasCookies) {
      throw new Error(
        "Not logged into Instagram. Please connect your Instagram account first."
      );
    }

    // Navigate to Instagram
    await page.goto("https://www.instagram.com/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait to confirm we're logged in
    await page.waitForTimeout(3000);

    // Click the create/new post button (+ icon)
    const createBtn = await page.$('svg[aria-label="New post"]');
    if (createBtn) {
      await createBtn.click();
    } else {
      // Try alternative selectors
      const navCreate = await page.$('[aria-label="New post"]');
      if (navCreate) await navCreate.click();
      else throw new Error("Could not find create button. Session may be expired.");
    }

    await page.waitForTimeout(2000);

    // Look for file input and upload
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error("Could not find file input on Instagram");
    await fileInput.uploadFile(ctx.videoPath);

    await page.waitForTimeout(5000);

    // Click "Next" to move past cropping
    let nextBtn = await page.$('button:has-text("Next")');
    if (!nextBtn) {
      const buttons = await page.$$("button");
      for (const btn of buttons) {
        const text = await btn.evaluate((el) => el.textContent?.trim());
        if (text === "Next") {
          nextBtn = btn;
          break;
        }
      }
    }
    if (nextBtn) await nextBtn.click();

    await page.waitForTimeout(2000);

    // Click "Next" again (past filters)
    const buttons2 = await page.$$("button");
    for (const btn of buttons2) {
      const text = await btn.evaluate((el) => el.textContent?.trim());
      if (text === "Next") {
        await btn.click();
        break;
      }
    }

    await page.waitForTimeout(2000);

    // Fill in caption
    const fullCaption = buildCaption(ctx.caption, ctx.hashtags);
    const captionArea = await page.$('textarea[aria-label="Write a caption..."]');
    if (captionArea) {
      await captionArea.click();
      await captionArea.type(fullCaption, { delay: 20 });
    }

    // Select "Reels" tab if available
    const reelsTab = await page.$('[role="tab"]:has-text("Reels")');
    if (reelsTab) await reelsTab.click();

    await page.waitForTimeout(1000);

    // Click Share
    const shareButtons = await page.$$("button");
    for (const btn of shareButtons) {
      const text = await btn.evaluate((el) => el.textContent?.trim());
      if (text === "Share") {
        await btn.click();
        break;
      }
    }

    // Wait for upload confirmation
    await page.waitForTimeout(10000);

    return { success: true, url: "https://instagram.com/reels/" };
  } finally {
    await browser.close();
  }
}
