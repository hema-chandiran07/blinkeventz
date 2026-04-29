import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
<<<<<<< Updated upstream
import { randomUUID } from 'crypto';
import * as path from 'path';
=======
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import { CircuitBreaker } from '../ai-planner/utils/circuit-breaker';
import { ImageOptimizerService } from './image-optimizer.service';
>>>>>>> Stashed changes

// ─────────────────────────────────────────────────────────────
// AWS S3 Upload Service — KYC Document Storage
// ─────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class S3Service {
<<<<<<< Updated upstream
  private readonly logger = new Logger(S3Service.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor() {
=======
   private readonly logger = new Logger(S3Service.name);
   private readonly s3: S3Client;
   private readonly bucket: string;
   private readonly kycBucket: string;
   private readonly region: string;
   private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly imageOptimizer: ImageOptimizerService,
  ) {
>>>>>>> Stashed changes
    this.region = process.env.AWS_REGION || 'ap-south-1';
    this.bucket = process.env.AWS_S3_BUCKET || '';

    if (!this.bucket) {
      this.logger.warn(
        'AWS_S3_BUCKET is not set — S3 uploads will fail at runtime',
      );
    }

    // Configure S3 client with timeouts via NodeHttpHandler
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 10000, // 10 seconds
        socketTimeout: 30000,    // 30 seconds
      }),
    });

    // Initialize circuit breaker for S3 operations
    this.circuitBreaker = new CircuitBreaker('s3', {
      failureThreshold: 5,
      resetTimeoutSeconds: 30,
      successThreshold: 1,
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
      const fs = require('fs');
      const buffer = file.buffer || fs.readFileSync(file.path);
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: file.mimetype,
          ServerSideEncryption: 'AES256',
          Metadata: {
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
          },
        }),
      );
    } catch (error: any) {
      this.logger.error('S3 upload failed', error);
      throw new BadRequestException(`File upload failed. Please try again. ${error.message || ''}`);
    }

<<<<<<< Updated upstream
    // ── Return public URL ──
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
=======
     // Allowlist check
     if (!ALLOWED_MIME_TYPES.includes(detectedMime)) {
       throw new BadRequestException(
         `Invalid file type "${detectedMime}". Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
       );
     }

      // ── Generate unique key ──
      const ext = path.extname(file.originalname) || this.mimeToExt(detectedMime);
      const key = `kyc/${randomUUID()}${ext}`;

      // ── Upload to private S3 bucket with circuit breaker protection ──
      try {
        await this.circuitBreaker.execute(() =>
          this.s3.send(
            new PutObjectCommand({
              Bucket: this.kycBucket,
              Key: key,
              Body: buffer,
              ContentType: detectedMime,
              ServerSideEncryption: 'AES256',
              // NO ACL - bucket is private, access via presigned URLs only
            }),
          ),
        );
      } catch (error: any) {
        this.logger.error('S3 upload failed', error);
        throw new BadRequestException(`File upload failed. Please try again. ${error.message || ''}`);
      }

     // ── Return presigned GET URL (valid 900 seconds) ──
     return this.getPresignedUrl(key, detectedMime);
   }

   /**
    * Generate a presigned GET URL for a KYC document.
    * URL is valid for 900 seconds (15 minutes).
    */
   async getKycDocumentUrl(key: string): Promise<string> {
     return this.getPresignedUrl(key, 'application/pdf'); // generic, actual type stored in S3
   }

   private async getPresignedUrl(key: string, contentType: string): Promise<string> {
     const command = new GetObjectCommand({
       Bucket: this.kycBucket,
       Key: key,
     });

     const url = await getSignedUrl(this.s3, command, {
       expiresIn: 900, // 15 minutes
     });

     return url;
   }
>>>>>>> Stashed changes

  /**
   * Upload a vendor service image to S3.
   *
   * - Validates MIME type (jpeg, png only for images)
   * - Validates file size (max 5 MB)
   * - Generates a unique filename to prevent collisions
   * - Returns the public URL of the uploaded file
   */
  /**
   * Upload a vendor service image to S3 with optimization.
   *
   * - Validates MIME type (jpeg, png, webp)
   * - Optimizes image and generates thumbnail
   * - Returns both main and thumbnail URLs
   */
  async uploadVendorServiceImage(file: Express.Multer.File): Promise<{ imageUrl: string; thumbnailUrl: string }> {
    // ── Validate MIME type ──
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype}". Allowed: image/jpeg, image/png, image/webp`,
      );
    }

    // ── Validate file size (max 15 MB) ──
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new BadRequestException(
        `File size ${(file.size / 1024 / 1024).toFixed(2)} MB exceeds the 15 MB limit`,
      );
    }

    // ── Get file buffer ──
    const fs = require('fs');
    const buffer = file.buffer || fs.readFileSync(file.path);

    // ── Optimize image and generate thumbnail ──
    const optimizedBuffer = await this.imageOptimizer.optimize(buffer);
    const thumbnailBuffer = await this.imageOptimizer.generateThumbnail(buffer);

    // ── Generate unique keys (WebP format) ──
    const baseName = `${randomUUID()}`;
    const mainKey = `vendor-services/${baseName}.webp`;
    const thumbKey = `vendor-services/${baseName}_thumb.webp`;

    // ── Upload main image ──
    try {
      await this.circuitBreaker.execute(() =>
        this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: mainKey,
            Body: optimizedBuffer,
            ContentType: 'image/webp',
            ServerSideEncryption: 'AES256',
            Metadata: {
              originalName: file.originalname,
              uploadedAt: new Date().toISOString(),
            },
          }),
        ),
      );

      // Upload thumbnail
      await this.circuitBreaker.execute(() =>
        this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: thumbKey,
            Body: thumbnailBuffer,
            ContentType: 'image/webp',
            ServerSideEncryption: 'AES256',
            Metadata: {
              originalName: file.originalname,
              uploadedAt: new Date().toISOString(),
              isThumbnail: 'true',
            },
          }),
        ),
      );
    } catch (error: any) {
      this.logger.error('S3 upload failed', error);
      throw new BadRequestException(`File upload failed. Please try again. ${error.message || ''}`);
    }

    // ── Return URLs ──
    const baseUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    return {
      imageUrl: `${baseUrl}/${mainKey}`,
      thumbnailUrl: `${baseUrl}/${thumbKey}`,
    };
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
