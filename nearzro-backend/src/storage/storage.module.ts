import { Module } from '@nestjs/common';
import { DatabaseStorageService } from './database-storage.service';

@Module({
  providers: [DatabaseStorageService],
  exports: [DatabaseStorageService],
})
export class StorageModule {}
