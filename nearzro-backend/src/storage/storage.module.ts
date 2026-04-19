import { Module } from '@nestjs/common';
import { DatabaseStorageService } from './database-storage.service';
import { S3Service } from './s3.service';
import { LocalStorageService } from './local-storage.service';

@Module({
  providers: [DatabaseStorageService, S3Service, LocalStorageService],
  exports: [DatabaseStorageService, S3Service, LocalStorageService],
})
export class StorageModule { }
