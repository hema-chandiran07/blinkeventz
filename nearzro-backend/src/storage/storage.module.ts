import { Module } from '@nestjs/common';
import { DatabaseStorageService } from './database-storage.service';
import { S3Service } from './s3.service';

@Module({
  providers: [DatabaseStorageService, S3Service],
  exports: [DatabaseStorageService, S3Service],
})
export class StorageModule {}
