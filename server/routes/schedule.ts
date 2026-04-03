import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import type { AuthRequest } from "../middleware/auth.js";

const router = Router();

// Get all scheduled posts for user
router.get("/", async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.userId!;

  const { data, error } = await supabaseAdmin
    .from("posts")
    .select("*")
    .eq("user_id", userId)
    .not("scheduled_for", "is", null)
    .eq("status", "pending")
    .order("scheduled_for", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Cancel a scheduled post
router.delete("/:id", async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.userId!;

  const { error } = await supabaseAdmin
    .from("posts")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", userId)
    .eq("status", "pending");

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export { router as scheduleRouter };
