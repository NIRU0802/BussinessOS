import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket =
      this.configService.get<string>('MINIO_BUCKET') ??
      'business-os-menu-images';

    this.s3 = new S3Client({
      endpoint: this.configService.get<string>('MINIO_ENDPOINT'),
      region: this.configService.get<string>('MINIO_REGION') ?? 'us-east-1',
      credentials: {
        accessKeyId: this.configService.get<string>('MINIO_ACCESS_KEY') ?? '',
        secretAccessKey:
          this.configService.get<string>('MINIO_SECRET_KEY') ?? '',
      },
      forcePathStyle: true, // required for MinIO (non-AWS S3-compatible endpoints)
    });
  }

  /**
   * Uploads a menu item image. Returns the object key (NOT a public URL) —
   * store this key on MenuItem.imageKey; resolve to a temporary signed URL
   * only when actually reading/displaying the image.
   */
  async uploadMenuImage(
    tenantId: string,
    fileBuffer: Buffer,
    originalFilename: string,
    contentType: string,
  ): Promise<string> {
    const ext = originalFilename.split('.').pop() ?? 'jpg';
    const key = `tenants/${tenantId}/menu-items/${crypto.randomUUID()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      }),
    );

    return key;
  }

  /**
   * Generates a short-lived signed URL for reading a private object.
   * Images are never served via a permanent public URL — every read
   * goes through this method with a bounded expiry.
   */
  async getSignedReadUrl(
    key: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }
}
