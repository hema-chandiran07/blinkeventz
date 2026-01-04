import { Controller } from '@nestjs/common';
import{ApiTags} from '@nestjs/swagger';
@ApiTags('Events')
@Controller('events')
export class EventsController {}
