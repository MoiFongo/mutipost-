export type Platform = "youtube" | "instagram" | "tiktok" | "facebook";

export type PostStatus =
  | "pending"
  | "uploading"
  | "publishing"
  | "completed"
  | "failed";

export type PlatformStatus =
  | "queued"
  | "uploading"
  | "processing"
  | "done"
  | "failed";

export interface PostConfig {
  title: string;
  caption: string;
  hashtags: string[];
  videoPath: string;
  platforms: Platform[];
  scheduledFor: string | null; // ISO date string or null for immediate
}

export interface PlatformResult {
  platform: Platform;
  status: PlatformStatus;
  message?: string;
  url?: string; // URL of the published post
}

export interface Post {
  id: string;
  user_id: string;
  title: string | null;
  caption: string | null;
  hashtags: string[];
  video_path: string;
  platforms: Platform[];
  status: PostStatus;
  platform_results: Record<Platform, PlatformResult> | null;
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
}

export interface PlatformSession {
  id: string;
  user_id: string;
  platform: Platform;
  is_active: boolean;
  updated_at: string;
}

// Socket.IO event types
export interface ServerToClientEvents {
  "publish:progress": (data: {
    postId: string;
    platform: Platform;
    status: PlatformStatus;
    message?: string;
  }) => void;
  "publish:complete": (data: {
    postId: string;
    results: Record<Platform, PlatformResult>;
  }) => void;
}

export interface ClientToServerEvents {
  "publish:start": (postId: string) => void;
}
