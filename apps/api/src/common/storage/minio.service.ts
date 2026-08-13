import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export interface UploadResult {
  objectKey: string;
  bucket: string;
}

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly signedUrlExpirySeconds: number;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT');
    const accessKeyId = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('MINIO_SECRET_KEY');
    const region = this.configService.get<string>('MINIO_REGION', 'us-east-1');

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'MinioService: MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY must be set in environment variables',
      );
    }

    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'business-os');
    this.signedUrlExpirySeconds = Number(
      this.configService.get<string>('MINIO_SIGNED_URL_EXPIRY_SECONDS', '3600'),
    );

    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true, // required for MinIO
    });
  }

  /**
   * Uploads a file buffer to MinIO under a tenant-scoped, namespaced key.
   * Returns ONLY the object key — never a public URL. Callers must store
   * the returned objectKey on the entity (e.g. Product.imageKey) and
   * resolve a signed URL at read time via getSignedReadUrl().
   */
  async uploadFile(params: {
    tenantId: string;
    namespace: 'products' | 'combos';
    buffer: Buffer;
    mimeType: string;
    originalFilename: string;
  }): Promise<UploadResult> {
    const { tenantId, namespace, buffer, mimeType, originalFilename } = params;

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new Error(
        `Unsupported image mime type "${mimeType}". Allowed: ${allowedMimeTypes.join(', ')}`,
      );
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (buffer.length > maxSizeBytes) {
      throw new Error('Image exceeds maximum allowed size of 5MB');
    }

    const extension = this.extensionFromMimeType(mimeType);
    const safeUuid = randomUUID();
    const objectKey = `${namespace}/${tenantId}/${safeUuid}${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          'original-filename':
            this.sanitizeFilenameForMetadata(originalFilename),
          'tenant-id': tenantId,
        },
      }),
    );

    this.logger.log(`Uploaded object ${objectKey} to bucket ${this.bucket}`);

    return { objectKey, bucket: this.bucket };
  }

  /**
   * Resolves a stored object key to a time-limited signed URL for reads.
   * Returns null if objectKey is null/undefined (e.g. product has no image).
   */
  async getSignedReadUrl(
    objectKey: string | null | undefined,
  ): Promise<string | null> {
    if (!objectKey) return null;

    const command = GetObjectCommandSafe(this.bucket, objectKey);

    return getSignedUrl(this.client, command, {
      expiresIn: this.signedUrlExpirySeconds,
    });
  }

  /**
   * Batch-resolves signed URLs for multiple object keys in parallel.
   * Used by the menu resolver endpoint to avoid N sequential round trips.
   */
  async getSignedReadUrls(
    objectKeys: (string | null | undefined)[],
  ): Promise<(string | null)[]> {
    return Promise.all(objectKeys.map((key) => this.getSignedReadUrl(key)));
  }

  async deleteFile(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
    this.logger.log(`Deleted object ${objectKey} from bucket ${this.bucket}`);
  }

  async fileExists(objectKey: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      return true;
    } catch {
      return false;
    }
  }

  private extensionFromMimeType(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      default:
        return '';
    }
  }

  private sanitizeFilenameForMetadata(filename: string): string {
    // S3/MinIO metadata values must be ASCII-safe header values
    return filename.replace(/[^\x20-\x7E]/g, '').slice(0, 200);
  }
}

// Small local wrapper so we only import GetObjectCommand once, keeping
// the top-level import list identical to what's documented above.
import { GetObjectCommand } from '@aws-sdk/client-s3';
function GetObjectCommandSafe(bucket: string, key: string) {
  return new GetObjectCommand({ Bucket: bucket, Key: key });
}
