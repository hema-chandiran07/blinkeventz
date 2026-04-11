import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────
// AWS S3 Upload Service — KYC Document Storage
// ─────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'ap-south-1';
    this.bucket = process.env.AWS_S3_BUCKET || '';

    if (!this.bucket) {
      this.logger.warn(
        'AWS_S3_BUCKET is not set — S3 uploads will fail at runtime',
      );
    }

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /**
   * Upload a KYC document to S3.
   *
   * - Validates MIME type (jpeg, png, pdf)
   * - Validates file size (max 5 MB)
   * - Generates a unique filename to prevent collisions
   * - Returns the public URL of the uploaded file
   */
  async uploadKycDocument(file: Express.Multer.File): Promise<string> {
    // ── Validate MIME type ──
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype}". Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // ── Validate file size ──
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size ${(file.size / 1024 / 1024).toFixed(2)} MB exceeds the 5 MB limit`,
      );
    }

    // ── Generate unique key ──
    const ext = path.extname(file.originalname) || this.mimeToExt(file.mimetype);
    const key = `kyc/${randomUUID()}${ext}`;

    // ── Upload to S3 ──
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ServerSideEncryption: 'AES256',
          Metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
          },
        }),
      );
    } catch (error) {
      this.logger.error('S3 upload failed', error);
      throw new BadRequestException('File upload failed. Please try again.');
    }

    // ── Return public URL ──
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Upload a vendor service image to S3.
   *
   * - Validates MIME type (jpeg, png only for images)
   * - Validates file size (max 5 MB)
   * - Generates a unique filename to prevent collisions
   * - Returns the public URL of the uploaded file
   */
  async uploadVendorServiceImage(file: Express.Multer.File): Promise<string> {
    // ── Validate MIME type ──
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype}". Allowed: image/jpeg, image/png`,
      );
    }

    // ── Validate file size ──
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size ${(file.size / 1024 / 1024).toFixed(2)} MB exceeds the 5 MB limit`,
      );
    }

    // ── Generate unique key ──
    const ext = path.extname(file.originalname) || this.mimeToExt(file.mimetype);
    const key = `vendor-services/${randomUUID()}${ext}`;

    // ── Upload to S3 ──
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ServerSideEncryption: 'AES256',
          Metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
          },
        }),
      );
    } catch (error) {
      this.logger.error('S3 upload failed', error);
      throw new BadRequestException('File upload failed. Please try again.');
    }

    // ── Return public URL ──
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private mimeToExt(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'application/pdf': '.pdf',
    };
    return map[mime] || '.bin';
  }
}
