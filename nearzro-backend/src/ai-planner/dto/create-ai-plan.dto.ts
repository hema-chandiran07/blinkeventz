import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  INPUT_LIMITS,
  BUDGET_CONFIG,
  ERROR_MESSAGES,
} from '../constants/ai-planner.constants';

export class CreateAIPlanDto {
  @ApiProperty({
    example: 500000,
    description: 'Total budget for the event in INR',
    minimum: BUDGET_CONFIG.MIN_BUDGET,
    maximum: BUDGET_CONFIG.MAX_BUDGET,
  })
  @IsInt({ message: 'Budget must be an integer' })
  @Min(BUDGET_CONFIG.MIN_BUDGET, {
    message: ERROR_MESSAGES.INVALID_BUDGET,
  })
  @Max(BUDGET_CONFIG.MAX_BUDGET, {
    message: ERROR_MESSAGES.INVALID_BUDGET,
  })
  @Transform(({ value }) => parseInt(value, 10))
  budget: number;

  @ApiProperty({
    example: 'Wedding',
    description: 'Type of event',
  })
  @IsString({ message: 'Event type must be a string' })
  @IsNotEmpty({ message: 'Event type is required' })
  @MaxLength(INPUT_LIMITS.EVENT_TYPE_MAX_LENGTH, {
    message: `Event type must not exceed ${INPUT_LIMITS.EVENT_TYPE_MAX_LENGTH} characters`,
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  eventType: string;

  @ApiProperty({
    example: 'Chennai',
    description: 'City where the event will be held',
  })
  @IsString({ message: 'City must be a string' })
  @IsNotEmpty({ message: 'City is required' })
  @MaxLength(INPUT_LIMITS.CITY_MAX_LENGTH, {
    message: `City must not exceed ${INPUT_LIMITS.CITY_MAX_LENGTH} characters`,
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  city: string;

  @ApiProperty({
    example: 'Velachery',
    description: 'Area/locality within the city',
  })
  @IsString({ message: 'Area must be a string' })
  @IsNotEmpty({ message: 'Area is required' })
  @MaxLength(INPUT_LIMITS.AREA_MAX_LENGTH, {
    message: `Area must not exceed ${INPUT_LIMITS.AREA_MAX_LENGTH} characters`,
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  area: string;

  @ApiProperty({
    example: 300,
    description: 'Expected number of guests',
    minimum: INPUT_LIMITS.GUEST_COUNT_MIN,
    maximum: INPUT_LIMITS.GUEST_COUNT_MAX,
  })
  @IsInt({ message: 'Guest count must be an integer' })
  @Min(INPUT_LIMITS.GUEST_COUNT_MIN, {
    message: ERROR_MESSAGES.INVALID_GUEST_COUNT,
  })
  @Max(INPUT_LIMITS.GUEST_COUNT_MAX, {
    message: ERROR_MESSAGES.INVALID_GUEST_COUNT,
  })
  @Transform(({ value }) => parseInt(value, 10))
  guestCount: number;

  @ApiProperty({
    example: 1,
    description: 'Optional event ID to associate with the plan',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Event ID must be an integer' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  eventId?: number;

  @ApiProperty({
    example: 'abc-123-def',
    description: 'Conversation ID to link with plan (required for atomic linking)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Conversation ID must be a string' })
  conversationId?: string;
}
