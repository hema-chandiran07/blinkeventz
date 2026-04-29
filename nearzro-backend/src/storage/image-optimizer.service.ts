import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class ImageOptimizerService {
  async optimize(buffer: Buffer, options?: { maxWidth?: number; quality?: number }): Promise<Buffer> {
    const maxWidth = options?.maxWidth ?? 1920;
    const quality = options?.quality ?? 80;
    return sharp(buffer)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  }

  async generateThumbnail(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize({ width: 400, height: 300, fit: 'cover' })
      .webp({ quality: 70 })
      .toBuffer();
  }
}
