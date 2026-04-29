import { Injectable, Logger } from '@nestjs/common';
import { S3Service } from './s3.service';
import { DatabaseStorageService } from './database-storage.service';

export enum StorageProvider {
  S3 = 'S3',
  LOCAL = 'LOCAL',
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly activeProvider: StorageProvider;
  private readonly s3Configured: boolean;

  constructor(
    private readonly s3Service: S3Service,
    private readonly localStorage: DatabaseStorageService,
  ) {
    this.s3Configured = !!(
      process.env.AWS_S3_BUCKET &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
    );
    this.activeProvider = this.s3Configured ? StorageProvider.S3 : StorageProvider.LOCAL;
    
    this.logger.log({
      event: 'MEDIA_SERVICE_INITIALIZED',
      provider: this.activeProvider,
      s3Configured: this.s3Configured,
    });
  }

  getProvider(): StorageProvider {
    return this.activeProvider;
  }

  getS3Configured(): boolean {
    return this.s3Configured;
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    if (this.activeProvider === StorageProvider.S3) {
      try {
        const result = await this.s3Service.uploadVendorServiceImage(file);
        return result.imageUrl;
      } catch (error) {
        this.logger.error('S3 upload failed, falling back to local storage', error);
        return await this.localStorage.uploadVendorServiceImage(file);
      }
    }
    return await this.localStorage.uploadVendorServiceImage(file);
  }

  async uploadDocument(file: Express.Multer.File): Promise<string> {
    if (this.activeProvider === StorageProvider.S3) {
      try {
        return await this.s3Service.uploadKycDocument(file);
      } catch (error) {
        this.logger.error('S3 upload failed, falling back to local storage', error);
        return await this.localStorage.uploadKycDocument(file);
      }
    }
    return await this.localStorage.uploadKycDocument(file);
  }

  getImageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/api/uploads/') || path.startsWith('/uploads/')) {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      return `${backendUrl}${path}`;
    }
    return path;
  }
}