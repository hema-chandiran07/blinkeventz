import { Module } from '@nestjs/common';
import { DatabaseStorageService } from './database-storage.service';
import { S3Service } from './s3.service';
import { LocalStorageService } from './local-storage.service';
import { ImageOptimizerService } from './image-optimizer.service';

@Module({
  providers: [DatabaseStorageService, S3Service, LocalStorageService, ImageOptimizerService],
  exports: [DatabaseStorageService, S3Service, LocalStorageService, ImageOptimizerService],
})
export class StorageModule { }
