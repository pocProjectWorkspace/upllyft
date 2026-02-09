// apps/api/src/search/embedding.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly openaiApiKey: string;
  private readonly embeddingModel = 'text-embedding-3-large';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private prisma: PrismaService,
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.openai.com/v1/embeddings',
          {
            input: text,
            model: this.embeddingModel,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.openaiApiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data.data[0].embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding:', error);
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.openai.com/v1/embeddings',
          {
            input: texts,
            model: this.embeddingModel,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.openaiApiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data.data.map((d: any) => d.embedding);
    } catch (error) {
      this.logger.error('Failed to generate embeddings:', error);
      return texts.map(() => new Array(1536).fill(0));
    }
  }

  async updatePostEmbedding(postId: string, content: string): Promise<void> {
    const embedding = await this.generateEmbedding(content);
    
    // Store embedding in both array and vector column
    // Using parameterized query to avoid SQL injection
    const embeddingJson = JSON.stringify(embedding);
    const vectorString = '[' + embedding.join(',') + ']';
    
    await this.prisma.$executeRawUnsafe(
      `UPDATE "Post" 
       SET embedding = $1::jsonb, 
           embedding_vector = $2::vector 
       WHERE id = $3`,
      embeddingJson,
      vectorString,
      postId
    );
  }
}