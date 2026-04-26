import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir = join(process.cwd(), 'uploads');

  constructor() {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      this.logger.log(`Creating upload directory at ${this.uploadDir}`);
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save a file to the local filesystem
   * Returns a relative URL path (e.g., /uploads/abcd-123.jpg)
   */
  async saveFile(file: Express.Multer.File, folder: string = 'general'): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided for local storage');
    }

    // Create subfolder if specified
    const targetFolder = join(this.uploadDir, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(file.originalname) || this.mimeToExt(file.mimetype);
    const fileName = `${randomUUID()}${ext}`;
    const filePath = join(targetFolder, fileName);

    try {
      // Handle both buffer (MemoryStorage) and path (DiskStorage)
      const buffer = file.buffer || fs.readFileSync(file.path);
      fs.writeFileSync(filePath, buffer);

      this.logger.log(`File saved locally: ${folder}/${fileName}`);

      // Return relative URL for storage in database
      return `/uploads/${folder}/${fileName}`;
    } catch (error: any) {
      this.logger.error(`Local file save failed: ${error.message}`);
      throw new BadRequestException(`Failed to save file locally: ${error.message}`);
    }
  }

  /**
   * Delete a file from the local filesystem
   * @param relativeUrl (e.g., /uploads/kyc/abc.jpg)
   */
  async deleteFile(relativeUrl: string): Promise<void> {
    if (!relativeUrl || !relativeUrl.startsWith('/uploads/')) return;

    // Convert relative URL to absolute file path
    const relativePath = relativeUrl.replace('/uploads/', '');
    const fullPath = join(this.uploadDir, relativePath);

    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        this.logger.log(`Deleted local file: ${fullPath}`);
      }
    } catch (error: any) {
      this.logger.warn(`Failed to delete local file ${fullPath}: ${error.message}`);
    }
  }

  private mimeToExt(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
    };
    return map[mime] || '.bin';
  }
}
