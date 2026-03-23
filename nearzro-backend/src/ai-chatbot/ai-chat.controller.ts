import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { AIChatService } from './ai-chat.service';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import {
  SendMessageDto,
  ChatMessageResponseDto,
  GetConversationDto,
  DemoChatResponseDto,
} from './dto/chat-message.dto';
import { toFrontendStatus } from './types/conversation-state.type';

/**
 * AI Chat Controller
 * 
 * Provides conversational AI interface for event planning.
 * Public endpoints for demo, authenticated endpoints for actual usage.
 */
@ApiTags('AI Chat')
@UseGuards(ThrottlerGuard)
@Controller('ai-chat')
export class AIChatController {
  constructor(
    private readonly chatService: AIChatService,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * Public demo endpoint
   * 
   * GET /ai-chat/public/demo
   * 
   * Returns sample chatbot payload for unauthenticated users to preview.
   */
  @Public()
  @Get('public/demo')
  @ApiOperation({ summary: 'Demo endpoint - returns sample chatbot response' })
  async getDemo(): Promise<DemoChatResponseDto> {
    return this.chatService.getDemoResponse();
  }

  /**
   * Send a message to the AI chatbot (authenticated)
   * 
   * POST /ai-chat/message
   * 
   * Creates or continues a conversation.
   * Requires authentication and CUSTOMER or ADMIN role.
   * Rate limited: 5 messages per minute per user
   */
  @Throttle({
    default: {
      limit: 20,  // 20 messages per minute per user
      ttl: 60000,
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiBearerAuth()
  @Post('message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send message to AI chatbot (requires auth)' })
  async sendMessage(
    @Req() req: any,
    @Body() dto: SendMessageDto,
  ): Promise<ChatMessageResponseDto> {
    const userId = req.user.userId;
    const requestId = uuidv4();

    if (!dto.message || dto.message.trim().length === 0) {
      throw new BadRequestException('Message cannot be empty');
    }

    const result = await this.chatService.handleMessage(
      userId,
      dto.message,
      dto.conversationId,
      requestId,
    );

    return {
      conversationId: result.conversationId,
      reply: result.reply,
      status: result.status,
      planId: result.planId,
      state: result.state,
      requiresAuth: result.requiresAuth,
      jobId: result.jobId,
    };
  }

  /**
   * Send a message to the AI chatbot (guest/public)
   * 
   * POST /ai-chat/public/message
   * 
   * Guest users can try the chatbot without logging in.
   * Returns tempState that can be used after login.
   * Rate limited: 3 messages per minute (stricter than authenticated)
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: {
      limit: 10,  // 10 messages per minute for guests
      ttl: 60000,
    },
  })
  @Post('public/message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send message as guest (no auth required)' })
  async sendGuestMessage(
    @Body() dto: SendMessageDto,
  ): Promise<ChatMessageResponseDto> {
    if (!dto.message || dto.message.trim().length === 0) {
      throw new BadRequestException('Message cannot be empty');
    }

    // Handle as guest - don't persist, just extract state
    const result = await this.chatService.handleGuestMessage(
      dto.message,
      dto.tempState,
    );

    return {
      conversationId: result.conversationId,
      reply: result.reply,
      status: result.status,
      planId: result.planId,
      state: result.state,
      requiresAuth: result.requiresAuth,
      jobId: result.jobId,
    };
  }

  /**
   * Get conversation status
   * 
   * GET /ai-chat/conversations/:conversationId
   * 
   * Returns current status of a conversation.
   * Requires authentication.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiBearerAuth()
  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get conversation status (requires auth)' })
  async getConversation(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
  ): Promise<{
    id: string;
    status: string;
    planId?: number;
    state?: {
      budget?: number;
      guestCount?: number;
      city?: string;
      area?: string;
      eventType?: string;
    };
  }> {
    const userId = req.user.userId;

    return this.chatService.getConversationStatus(conversationId, userId);
  }

  /**
   * List user's conversations
   * 
   * GET /ai-chat/conversations
   * 
   * Returns list of all conversations for the user.
   * Requires authentication.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiBearerAuth()
  @Get('conversations')
  @ApiOperation({ summary: 'List user conversations (requires auth)' })
  async listConversations(
    @Req() req: any,
  ): Promise<Array<{
    id: string;
    status: string;
    planId?: number;
    createdAt: Date;
  }>> {
    const userId = req.user.userId;

    return this.conversationService.getUserConversations(userId);
  }

  /**
   * Start a new conversation
   * 
   * POST /ai-chat/conversations
   * 
   * Creates a new conversation and returns its ID.
   * Requires authentication.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiBearerAuth()
  @Throttle({
    default: {
      limit: 10,  // 10 new conversations per minute
      ttl: 60000,
    },
  })
  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new conversation (requires auth)' })
  async startConversation(
    @Req() req: any,
  ): Promise<{
    conversationId: string;
    message: string;
  }> {
    const userId = req.user.userId;

    const conversation = await this.conversationService.createConversation(userId);

    return {
      conversationId: conversation.id,
      message: "Hello! I'm your AI event planning assistant. What type of event would you like to plan?",
    };
  }
}
