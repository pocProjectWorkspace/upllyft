// apps/api/src/common/storage/storage.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Thin wrapper over Supabase Storage for user uploads (avatars, verification
 * documents). Files used to be written to the API's local disk under
 * ./uploads with no static handler, so every stored URL 404'd
 * (PERFORMANCE_AUDIT.md #32). Buckets are created on first use.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private _client: SupabaseClient | null = null;
  private readonly ensuredBuckets = new Set<string>();

  constructor(private readonly config: ConfigService) {}

  private get client(): SupabaseClient {
    if (!this._client) {
      const url = this.config.get<string>('NEXT_PUBLIC_SUPABASE_URL', '');
      const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY', '');
      if (!url || !key) {
        throw new InternalServerErrorException(
          'Supabase storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
        );
      }
      this._client = createClient(url, key, { auth: { persistSession: false } });
    }
    return this._client;
  }

  private async ensureBucket(bucket: string, isPublic: boolean) {
    if (this.ensuredBuckets.has(bucket)) return;
    const { data } = await this.client.storage.getBucket(bucket);
    if (!data) {
      const { error } = await this.client.storage.createBucket(bucket, { public: isPublic });
      // Another instance may have created it between the two calls.
      if (error && !/already exists/i.test(error.message)) {
        throw new InternalServerErrorException(`Could not create storage bucket "${bucket}": ${error.message}`);
      }
    }
    this.ensuredBuckets.add(bucket);
  }

  /** Upload to a public bucket and return the permanent public URL. */
  async uploadPublic(
    bucket: string,
    path: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.ensureBucket(bucket, true);
    const { error } = await this.client.storage
      .from(bucket)
      .upload(path, body, { contentType, upsert: false });
    if (error) {
      this.logger.error(`Upload to ${bucket}/${path} failed: ${error.message}`);
      throw new InternalServerErrorException(`Upload failed: ${error.message}`);
    }
    return this.client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  /** Upload to a private bucket and return the storage path (not a URL). */
  async uploadPrivate(
    bucket: string,
    path: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.ensureBucket(bucket, false);
    const { error } = await this.client.storage
      .from(bucket)
      .upload(path, body, { contentType, upsert: false });
    if (error) {
      this.logger.error(`Upload to ${bucket}/${path} failed: ${error.message}`);
      throw new InternalServerErrorException(`Upload failed: ${error.message}`);
    }
    return path;
  }

  /** Time-limited URL for an object in a private bucket. */
  async signedUrl(bucket: string, path: string, expiresInSeconds = 3600): Promise<string | null> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);
    if (error) {
      this.logger.warn(`Signed URL for ${bucket}/${path} failed: ${error.message}`);
      return null;
    }
    return data.signedUrl;
  }

  /** True when a stored value is a storage path rather than an absolute or legacy URL. */
  static isStoragePath(value: string | null | undefined): value is string {
    return !!value && !value.startsWith('/') && !/^https?:\/\//i.test(value);
  }
}
