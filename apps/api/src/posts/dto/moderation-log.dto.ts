// apps/api/src/posts/dto/moderation-log.dto.ts
export class ModerationLogCreateInput {
  moderatorId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string;
  data?: Record<string, any>;
}