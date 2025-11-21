import { createSupabaseClient } from "./supabase";

interface CreateSignedUrlOptions {
  bucket: string;
  expiresInSeconds?: number;
  log?: {
    warn?: (message: string, meta?: Record<string, unknown>) => void;
    error?: (message: string, meta?: Record<string, unknown>) => void;
  };
}

/**
 * Generates a signed URL for a Supabase storage object when given either a public URL
 * produced by `getPublicUrl` or a raw storage path. Falls back to the original URL on failure.
 */
export async function createSignedStorageUrl(
  originalUrlOrPath: string,
  { bucket, expiresInSeconds = 60, log }: CreateSignedUrlOptions
): Promise<string | null> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      log?.warn?.("Supabase environment variables missing, skipping signed URL generation", {
        bucket,
        originalUrlOrPath,
      });
      return null;
    }

    let objectPath = originalUrlOrPath;

    if (originalUrlOrPath.startsWith("http")) {
      const parsedUrl = new URL(originalUrlOrPath);
      const pathname = decodeURIComponent(parsedUrl.pathname);
      const bucketPrefix = `/storage/v1/object/public/${bucket}/`;

      const prefixIndex = pathname.indexOf(bucketPrefix);
      if (prefixIndex === -1) {
        log?.warn?.("Attachment URL does not match expected Supabase public path", {
          bucket,
          originalUrlOrPath,
        });
        return originalUrlOrPath;
      }

      objectPath = pathname.slice(prefixIndex + bucketPrefix.length);
    }

    if (!objectPath) {
      log?.warn?.("Missing object path for signed URL generation", {
        bucket,
        originalUrlOrPath,
      });
      return null;
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      log?.warn?.("Failed to create signed URL for storage object", {
        bucket,
        objectPath,
        error: error?.message ?? error,
      });
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    log?.warn?.("Error generating signed URL for storage object", {
      bucket,
      originalUrlOrPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

