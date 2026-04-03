import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  accessToken?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing or invalid Authorization header." });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ success: false, error: "Invalid or expired token." });
      return;
    }

    req.userId = data.user.id;
    req.userEmail = data.user.email;
    req.accessToken = token;

    next();
  } catch (err) {
    res.status(401).json({ success: false, error: "Token validation failed." });
  }
}

// Optional auth — sets userId if present but doesn't block the request
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const { data } = await supabaseAdmin.auth.getUser(token);
      if (data.user) {
        req.userId = data.user.id;
        req.userEmail = data.user.email;
        req.accessToken = token;
      }
    } catch {
      // Silently ignore auth errors for optional routes
    }
  }

  next();
}
