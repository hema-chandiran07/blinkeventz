import { Controller, Get } from '@nestjs/common';
import{ApiTags} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return {
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
