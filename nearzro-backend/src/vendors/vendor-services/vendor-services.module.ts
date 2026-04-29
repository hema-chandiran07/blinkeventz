import { Module } from '@nestjs/common';
import { VendorServicesController } from './vendor-services.controller';
import { VendorServicesService } from './vendor-services.service';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [VendorServicesController],
  providers: [VendorServicesService],
  exports: [VendorServicesService],
})
export class VendorServicesModule {}
