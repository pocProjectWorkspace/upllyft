// Minimal ambient typing for the `compression` middleware so the API does not
// need @types/compression as a separate devDependency.
declare module 'compression' {
  import type { RequestHandler } from 'express';

  interface CompressionOptions {
    /** Minimum response size in bytes to compress. Default 1024. */
    threshold?: number | string;
    /** zlib compression level (0-9). */
    level?: number;
    filter?: (req: any, res: any) => boolean;
  }

  function compression(options?: CompressionOptions): RequestHandler;
  namespace compression {
    function filter(req: any, res: any): boolean;
  }
  export = compression;
}
