import { Module } from '@nestjs/common';
import { ExpressService } from './express.service';
import { ExpressController } from './express.controller';

@Module({
  providers: [ExpressService],
  controllers: [ExpressController]
})
export class ExpressModule {}
