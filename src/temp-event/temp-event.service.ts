import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTempEventDto } from './dto/create-temp-event.dto';

@Injectable()
export class TempEventService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTempEventDto) {
    return this.prisma.tempEvent.create({
      data: {
        userId: dto.userId,
        eventDate: new Date(dto.eventDate),
        city: dto.city,
        area: dto.area,
      },
    });
  }

  findById(id: number) {
    return this.prisma.tempEvent.findUnique({
      where: { id },
      include: { expressRequest: true },
    });
  }
}
