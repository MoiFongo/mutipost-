import { launchBrowser, loadCookies, buildCaption } from "./base.js";
import type { UploadContext, UploadResult } from "./base.js";

export async function uploadToYouTube(ctx: UploadContext): Promise<UploadResult> {
  const browser = await launchBrowser("youtube", ctx.userId);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Load saved session cookies
    const hasCookies = await loadCookies(page, "youtube", ctx.userId);
    if (!hasCookies) {
      throw new Error(
        "Not logged into YouTube. Please connect your YouTube account first."
      );
    }

    // Navigate to YouTube Studio upload
    await page.goto("https://studio.youtube.com/channel/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Check if we're logged in by looking for the upload button
    await page.waitForSelector("#upload-icon", { timeout: 10000 }).catch(() => {
      throw new Error(
        "YouTube session expired. Please reconnect your YouTube account."
      );
    });

    // Click upload button
    await page.click("#upload-icon");

    // Wait for upload dialog
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });

    // Upload video file
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error("Could not find file input on YouTube Studio");
    await fileInput.uploadFile(ctx.videoPath);

    // Wait for upload to start processing
    await page.waitForSelector("#textbox", { timeout: 30000 });

    // Set title
    const titleInput = await page.$("#textbox");
    if (titleInput) {
      await titleInput.click({ clickCount: 3 }); // Select all existing text
      await titleInput.type(ctx.title || "Untitled");
    }

    // Set description with hashtags
    const fullCaption = buildCaption(ctx.caption, ctx.hashtags);
    const descriptionBox = await page.$$(
      "#textbox"
    );
    if (descriptionBox.length > 1) {
      await descriptionBox[1].click();
      await descriptionBox[1].type(fullCaption);
    }

    // Select "No, it's not Made for Kids"
    const notForKids = await page.$('tp-yt-paper-radio-button[name="NOT_MADE_FOR_KIDS"]');
    if (notForKids) await notForKids.click();

    // Click through to "Visibility" step
    // Click "Next" 3 times (Details → Video Elements → Checks → Visibility)
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(1000);
      const nextBtn = await page.$("#next-button");
      if (nextBtn) await nextBtn.click();
    }

    // Set as Public
    await page.waitForTimeout(1000);
    const publicRadio = await page.$('tp-yt-paper-radio-button[name="PUBLIC"]');
    if (publicRadio) await publicRadio.click();

    // Click "Publish"
    await page.waitForTimeout(1000);
    const publishBtn = await page.$("#done-button");
    if (publishBtn) await publishBtn.click();

    // Wait for confirmation
    await page.waitForTimeout(5000);

    return { success: true, url: "https://youtube.com/shorts/" };
  } finally {
    await browser.close();
  }
}
