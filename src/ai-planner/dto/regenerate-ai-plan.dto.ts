import { IsInt, Min } from 'class-validator';

export class RegenerateAIPlanDto {
  @IsInt()
  @Min(1)
  planId: number;
}
