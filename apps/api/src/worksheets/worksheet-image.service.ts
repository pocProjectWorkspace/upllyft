import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';
import { buildImagePrompt } from './constants/prompts';

export interface GeneratedImage {
  imageUrl: string;
  prompt: string;
  altText: string;
}

@Injectable()
export class WorksheetImageService {
  private readonly logger = new Logger(WorksheetImageService.name);
  private readonly openai: OpenAI;
  private _supabase: SupabaseClient | null = null;
  private readonly bucketName = 'worksheet-images';

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY', ''),
    });
  }

  private get supabase(): SupabaseClient {
    if (!this._supabase) {
      const url = this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL', '');
      const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY', '');
      if (!url || !key) {
        throw new Error(
          'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
        );
      }
      this._supabase = createClient(url, key);
    }
    return this._supabase;
  }

  async generateImage(params: {
    activityImagePrompt: string;
    altText: string;
    interests: string;
    setting: string;
    ageMonths: number;
    colorMode: string;
  }): Promise<GeneratedImage> {
    const prompt = buildImagePrompt({
      activityImagePrompt: params.activityImagePrompt,
      interests: params.interests,
      setting: params.setting,
      ageMonths: params.ageMonths,
      colorMode: params.colorMode,
    });

    this.logger.log(`Generating image: "${params.altText}"`);

    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'natural',
      });

      const imageData = response.data?.[0];
      if (!imageData?.url) {
        throw new Error('No image URL in DALL-E response');
      }

      // Download the image and upload to Supabase
      const imageUrl = await this.uploadToSupabase(imageData.url);

      return {
        imageUrl,
        prompt,
        altText: params.altText,
      };
    } catch (error) {
      this.logger.error(`Image generation failed: ${error.message}`);
      // Return a placeholder rather than failing the entire worksheet
      return {
        imageUrl: '',
        prompt,
        altText: params.altText,
      };
    }
  }

  async generateImagesForWorksheet(params: {
    activities: Array<{
      id: string;
      imagePrompt: string;
      name: string;
    }>;
    interests: string;
    setting: string;
    ageMonths: number;
    colorMode: string;
    maxImages?: number;
  }): Promise<Map<string, GeneratedImage>> {
    const maxImages = params.maxImages ?? 5;
    const activitiesToProcess = params.activities.slice(0, maxImages);
    const results = new Map<string, GeneratedImage>();

    // Generate images sequentially to respect rate limits
    for (const activity of activitiesToProcess) {
      const image = await this.generateImage({
        activityImagePrompt: activity.imagePrompt,
        altText: `Illustration for activity: ${activity.name}`,
        interests: params.interests,
        setting: params.setting,
        ageMonths: params.ageMonths,
        colorMode: params.colorMode,
      });
      results.set(activity.id, image);
    }

    return results;
  }

  private async uploadToSupabase(imageUrl: string): Promise<string> {
    // Download from DALL-E temporary URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const fileName = `${uuid()}.png`;
    const filePath = `generated/${fileName}`;

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }
}
