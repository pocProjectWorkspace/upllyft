// src/common/validators/supabase-url-validator.ts
/**
 * Validates that a URL is from the configured Supabase storage
 * This prevents users from submitting arbitrary URLs
 */
export function isValidSupabaseUrl(url: string, bucket?: string): boolean {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl || !url) {
        return false;
    }

    // Check if URL starts with the Supabase storage URL pattern
    const storagePattern = `${supabaseUrl}/storage/v1/object/public/`;

    if (!url.startsWith(storagePattern)) {
        return false;
    }

    // If bucket is specified, verify it matches
    if (bucket) {
        const bucketPattern = `${storagePattern}${bucket}/`;
        return url.startsWith(bucketPattern);
    }

    return true;
}

/**
 * Extract bucket name from Supabase URL
 */
export function extractBucketFromUrl(url: string): string | null {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
        return null;
    }

    const storagePattern = `${supabaseUrl}/storage/v1/object/public/`;

    if (!url.startsWith(storagePattern)) {
        return null;
    }

    const remainingPath = url.substring(storagePattern.length);
    const bucketName = remainingPath.split('/')[0];

    return bucketName || null;
}

/**
 * Validate image URL for community or event
 */
export function validateImageUrl(url: string | undefined, bucket: string): boolean {
    if (!url) {
        return true; // Optional field
    }

    return isValidSupabaseUrl(url, bucket);
}
