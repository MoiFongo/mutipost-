import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

export interface AuthRequest extends Request {
  userId?: string;
  userToken?: string;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  const token = authHeader.slice(7);

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.userId = user.id;
    req.userToken = token;
    next();
  } catch {
    return res.status(401).json({ error: "Authentication failed" });
  }
}
