import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { fileTypeFromBuffer } from 'file-type';

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
   private readonly kycBucket: string;
   private readonly region: string;

   constructor() {
    this.region = process.env.AWS_REGION || 'ap-south-1';
    this.bucket = process.env.AWS_S3_BUCKET || '';
    this.kycBucket = process.env.AWS_S3_KYC_BUCKET || this.bucket;

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
    * - Validates MIME type using file-type library (mime spoofing protection)
    * - Blocks dangerous types (text/html, image/svg+xml)
    * - Validates file size (max 5 MB)
    * - Generates a unique filename to prevent collisions
    * - Stores in private bucket (no public ACL)
    * - Returns a presigned GET URL valid for 900 seconds
    */
   async uploadKycDocument(file: Express.Multer.File): Promise<string> {
     // ── Validate file size ──
     if (file.size > MAX_FILE_SIZE) {
       throw new BadRequestException(
         `File size ${(file.size / 1024 / 1024).toFixed(2)} MB exceeds the 5 MB limit`,
       );
     }

     // ── Get file buffer ──
     const fs = require('fs');
     const buffer = file.buffer || fs.readFileSync(file.path);

     // ── Detect actual MIME type from buffer (prevent mime spoofing) ──
     const detected = await fileTypeFromBuffer(buffer);
     const detectedMime = detected?.mime || file.mimetype;

     // Blocklist check - reject dangerous types
     const BLOCKED_MIMES = ['text/html', 'image/svg+xml'];
     if (BLOCKED_MIMES.includes(detectedMime)) {
       throw new BadRequestException(
         `File type "${detectedMime}" is not allowed for security reasons`,
       );
     }

     // Allowlist check
     if (!ALLOWED_MIME_TYPES.includes(detectedMime)) {
       throw new BadRequestException(
         `Invalid file type "${detectedMime}". Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
       );
     }

     // ── Generate unique key ──
     const ext = path.extname(file.originalname) || this.mimeToExt(detectedMime);
     const key = `kyc/${randomUUID()}${ext}`;

     // ── Upload to private S3 bucket (no public ACL) ──
     try {
       await this.s3.send(
         new PutObjectCommand({
           Bucket: this.kycBucket,
           Key: key,
           Body: buffer,
           ContentType: detectedMime,
           ServerSideEncryption: 'AES256',
           // NO ACL - bucket is private, access via presigned URLs only
         }),
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
