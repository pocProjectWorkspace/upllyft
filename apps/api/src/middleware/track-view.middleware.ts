// apps/api/src/middleware/track-view.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class TrackViewMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) { }

  async use(req: AuthRequest, res: Response, next: NextFunction) {
    if (req.method === 'GET' && req.path.includes('/posts/')) {
      const postId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = req.user?.id;

      if (postId && userId) {
        // Track view asynchronously
        this.prisma.postView.create({
          data: { postId, userId }
        }).catch(console.error);

        // Track engagement event
        this.prisma.engagementEvent.create({
          data: {
            postId,
            userId,
            eventType: 'view'
          }
        }).catch(console.error);
      }
    }
    next();
  }
}