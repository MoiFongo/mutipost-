import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { supabaseAdmin } from "../lib/supabase.js";
import type { AuthRequest } from "../middleware/auth.js";

const router = Router();

// Temp local storage before uploading to Supabase
const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const ALLOWED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
];
const MAX_SIZE = 500 * 1024 * 1024; // 500MB

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only video files are allowed.`));
    }
  },
});

router.post("/", upload.single("video"), async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.userId!;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No video file provided" });
  }

  try {
    // Upload to Supabase Storage
    const storagePath = `${userId}/${file.filename}`;
    const fileBuffer = fs.readFileSync(file.path);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("videos")
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype,
      });

    // Clean up local temp file
    fs.unlinkSync(file.path);

    if (uploadError) {
      return res.status(500).json({ error: `Storage upload failed: ${uploadError.message}` });
    }

    res.json({
      path: storagePath,
      size: file.size,
      mimetype: file.mimetype,
      originalName: file.originalname,
    });
  } catch (err: any) {
    // Clean up on error
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    res.status(500).json({ error: err.message });
  }
});

export { router as uploadRouter };
