import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * Send a message to the AI chatbot
 */
export class SendMessageDto {
  @ApiProperty({
    example: 'I want to plan a wedding for 300 guests in Mumbai with budget of 5 lakh',
    description: 'User message content',
  })
  @IsString({ message: 'Message must be a string' })
  @MinLength(1, { message: 'Message cannot be empty' })
  @MaxLength(2000, { message: 'Message too long' })
  message: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Conversation ID (create new if not provided)',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Invalid conversation ID' })
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Temporary state from guest session (for resume after login)',
    required: false,
    example: {
      budget: 500000,
      guestCount: 300,
      city: 'Mumbai',
      eventType: 'Wedding',
    },
  })
  @IsOptional()
  tempState?: {
    budget?: number;
    guestCount?: number;
    city?: string;
    area?: string;
    eventType?: string;
  };
}

/**
 * Response from AI chatbot
 */
export class ChatMessageResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Conversation ID',
  })
  conversationId: string;

  @ApiProperty({
    example: 'Great! I have all the information needed. Let me generate your event plan now.',
    description: 'AI response message',
  })
  reply: string;

  @ApiProperty({
    enum: ['COLLECTING', 'READY', 'GENERATING', 'GENERATED', 'MODIFYING', 'ACCEPTED', 'FAILED'],
    example: 'COLLECTING',
    description: 'Current conversation status',
  })
  status: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Plan ID when status is GENERATED or ACCEPTED',
  })
  planId?: number;

  @ApiPropertyOptional({
    description: 'Extracted state from conversation',
  })
  state?: {
    budget?: number;
    guestCount?: number;
    city?: string;
    area?: string;
    eventType?: string;
  };

  @ApiPropertyOptional({
    example: true,
    description: 'Indicates if authentication is required',
  })
  requiresAuth?: boolean;
}

/**
 * Demo response for public preview
 */
export class DemoChatResponseDto {
  @ApiProperty({
    example: 'demo-conversation-id',
    description: 'Demo conversation ID',
  })
  conversationId: string;

  @ApiProperty({
    example: 'Welcome to the AI Event Planner demo! This is a sample response showing what the chatbot can do.',
    description: 'Demo AI response message',
  })
  reply: string;

  @ApiProperty({
    enum: ['COLLECTING', 'READY', 'GENERATING', 'GENERATED', 'MODIFYING', 'ACCEPTED', 'FAILED'],
    example: 'COLLECTING',
    description: 'Demo conversation status',
  })
  status: string;

  @ApiProperty({
    example: false,
    description: 'Indicates this is a demo response',
  })
  isDemo: boolean;

  @ApiPropertyOptional({
    description: 'Sample state from demo',
  })
  state?: {
    budget?: number;
    guestCount?: number;
    city?: string;
    eventType?: string;
  };
}

/**
 * Get conversation history
 */
export class GetConversationDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Conversation ID',
  })
  @IsUUID('4', { message: 'Invalid conversation ID' })
  conversationId: string;
}
