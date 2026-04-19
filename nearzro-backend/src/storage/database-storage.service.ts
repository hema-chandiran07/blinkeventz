import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

// ─────────────────────────────────────────────────────────────
// Database Storage Service — Rewritten to use File System
// To avoid massive Base64 database memory leaks
// ─────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

@Injectable()
export class DatabaseStorageService {
  private readonly logger = new Logger(DatabaseStorageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // Ensure uploads directory exists at startup
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Store a file heavily optimized on local disk
   * Avoids Base64 memory explosions
   */
  async storeFile(file: Express.Multer.File, folder: string = 'general'): Promise<string> {
    if (!file) throw new BadRequestException('No file provided');

    if (!file.mimetype || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type "${file?.mimetype || 'unknown'}". Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (!file.size || file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size ${file.size ? (file.size / 1024 / 1024).toFixed(2) : 'unknown'} MB exceeds the 50 MB limit`,
      );
    }

    // Ensure folder-specific directory exists
    const targetDir = path.join(this.uploadDir, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || this.fallbackExt(file.mimetype);
    const filename = `${randomUUID()}${ext}`;
    const filePath = path.join(targetDir, filename);

    if (file.buffer) {
      fs.writeFileSync(filePath, file.buffer);
    } else if (file.path) {
      fs.copyFileSync(file.path, filePath);
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        this.logger.warn(`Failed to delete temp file: ${file.path}`);
      }
    } else {
      throw new BadRequestException('No file data available (no buffer or path)');
    }

    this.logger.log(`File stored successfully in ${folder}: ${filename} (${(file.size / 1024).toFixed(2)} KB)`);

    // Return the correct relative path for NextJS and static serving
    return `/api/uploads/${folder}/${filename}`;
  }

  /**
   * Delete a file from the local storage
   */
  async deleteFile(url: string): Promise<void> {
    if (!url || !url.startsWith('/api/uploads/')) return;

    try {
      const relativePath = url.replace('/api/uploads/', '');
      const filePath = path.join(this.uploadDir, relativePath);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`File deleted successfully: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file ${url}: ${error.message}`);
    }
  }

  private fallbackExt(mimetype: string): string {
    if (mimetype === 'image/jpeg') return '.jpg';
    if (mimetype === 'image/png') return '.png';
    if (mimetype === 'image/webp') return '.webp';
    if (mimetype === 'application/pdf') return '.pdf';
    return '.bin';
  }

  async uploadKycDocument(file: Express.Multer.File): Promise<string> {
    return this.storeFile(file, 'kyc');
  }

  async uploadVendorServiceImage(file: Express.Multer.File): Promise<string> {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype}". Allowed: image/jpeg, image/png, image/webp`,
      );
    }
    return this.storeFile(file, 'services');
  }

  validateImageUrl(url: string): boolean {
    if (!url) return false;
    if (url.startsWith('/api/uploads/')) return true;

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
      const hasExtension = imageExtensions.some(ext => parsed.pathname.toLowerCase().endsWith(ext));
      const hasImageParam = parsed.searchParams.has('image') || parsed.searchParams.has('photo');
      return hasExtension || hasImageParam || url.includes('unsplash.com') || url.includes('cloudinary.com');
    } catch {
      return false;
    }
  }
}
