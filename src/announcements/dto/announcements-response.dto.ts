import { ReactionType } from "../entities/announcements-reaction.entities";

export interface ReactionCount {
  type: ReactionType;
  count: number;
}

export interface AnnouncementWithStats {
  id: string;
  title: string;
  content: string;
  priority: string;
  isActive: boolean;
  isPinned: boolean;
  enableViews: boolean;
  enableReactions: boolean;
  viewCount: number;
  expiresAt: Date | null;
  author: {
    id: number;
    name: string;
  };
  reactions: ReactionCount[];
  totalReactions: number;
  userReaction?: ReactionType | null; // Current user's reaction
  createdAt: Date;
  updatedAt: Date;
}

export interface ViewerInfo {
  id: number | null;
  name: string | null;
  viewedAt: Date;
}