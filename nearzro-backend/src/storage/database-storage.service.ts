import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

// ─────────────────────────────────────────────────────────────
// Database Storage Service — Store files as base64 in PostgreSQL
// ─────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class DatabaseStorageService {
  private readonly logger = new Logger(DatabaseStorageService.name);

  /**
   * Store a file as base64 in PostgreSQL
   * Supports both memory storage (buffer) and disk storage (path)
   */
  async storeFile(file: Express.Multer.File): Promise<string> {
    // Validate file object exists
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate MIME type
    if (!file.mimetype || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type "${file?.mimetype || 'unknown'}". Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Validate file size
    if (!file.size || file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size ${file.size ? (file.size / 1024 / 1024).toFixed(2) : 'unknown'} MB exceeds the 5 MB limit`,
      );
    }

    let base64: string;

    if (file.buffer) {
      // Memory storage: convert buffer directly
      base64 = file.buffer.toString('base64');
    } else if (file.path) {
      // Disk storage: read file from disk and convert
      const fileBuffer = fs.readFileSync(file.path);
      base64 = fileBuffer.toString('base64');

      // Clean up the temp file after reading
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        this.logger.warn(`Failed to delete temp file: ${file.path}`);
      }
    } else {
      throw new BadRequestException('No file data available (no buffer or path)');
    }

    const dataUrl = `data:${file.mimetype};base64,${base64}`;

    this.logger.log(`File stored successfully: ${file.originalname} (${(file.size / 1024).toFixed(2)} KB)`);

    return dataUrl;
  }

  /**
   * Upload a KYC document
   * Returns data URL for storage in database
   */
  async uploadKycDocument(file: Express.Multer.File): Promise<string> {
    return this.storeFile(file);
  }

  /**
   * Upload a vendor service image
   * Returns data URL for storage in database
   */
  async uploadVendorServiceImage(file: Express.Multer.File): Promise<string> {
    // Only allow images for vendor services
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype}". Allowed: image/jpeg, image/png, image/webp`,
      );
    }

    return this.storeFile(file);
  }

  /**
   * Validate a URL for external image storage
   * Useful for accepting URLs from Unsplash or other CDN
   */
  validateImageUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Only allow HTTP/HTTPS
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }

      // Check if it looks like an image URL
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
      const hasExtension = imageExtensions.some(ext => parsed.pathname.toLowerCase().endsWith(ext));
      const hasImageParam = parsed.searchParams.has('image') || parsed.searchParams.has('photo');
      
      return hasExtension || hasImageParam || url.includes('unsplash.com') || url.includes('cloudinary.com');
    } catch {
      return false;
    }
  }
}
