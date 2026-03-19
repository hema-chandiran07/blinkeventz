import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, AIConversationStatus } from '@prisma/client';
import { ConversationState } from './types/conversation-state.type';

/**
 * Conversation Service
 * 
 * Handles CRUD operations for AI conversations.
 * All state is persisted to PostgreSQL.
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new conversation
   */
  async createConversation(userId: number): Promise<{
    id: string;
    state: ConversationState;
    status: string;
  }> {
    this.logger.log(`Creating new conversation for user ${userId}`);

    const conversation = await this.prisma.aIConversation.create({
      data: {
        userId,
        state: {} as Prisma.InputJsonValue,
        status: AIConversationStatus.COLLECTING,
      },
    });

    this.logger.log(`Created conversation ${conversation.id} for user ${userId}`);

    return {
      id: conversation.id,
      state: conversation.state as ConversationState,
      status: conversation.status,
    };
  }

  /**
   * Get conversation by ID
   */
  async getConversation(
    id: string,
    userId: number,
  ): Promise<{
    id: string;
    state: ConversationState;
    status: string;
    planId?: number;
  }> {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    return {
      id: conversation.id,
      state: conversation.state as ConversationState,
      status: conversation.status,
      planId: conversation.planId ?? undefined,
    };
  }

  /**
   * Get conversation by ID without user check (internal use)
   */
  async getConversationById(id: string): Promise<{
    id: string;
    userId: number;
    state: ConversationState;
    status: string;
    planId?: number;
  } | null> {
    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return null;
    }

    return {
      id: conversation.id,
      userId: conversation.userId,
      state: conversation.state as ConversationState,
      status: conversation.status,
      planId: conversation.planId ?? undefined,
    };
  }

  /**
   * Update conversation state
   */
  async updateState(
    id: string,
    state: Partial<ConversationState>,
    userId: number,
  ): Promise<{
    id: string;
    state: ConversationState;
    status: string;
  }> {
    // Get current state
    const conversation = await this.getConversation(id, userId);
    
    // Merge with existing state
    const newState = {
      ...conversation.state,
      ...state,
    };

    const updated = await this.prisma.aIConversation.update({
      where: { id },
      data: {
        state: newState as Prisma.InputJsonValue,
      },
    });

    this.logger.debug(`Updated conversation ${id} state`);

    return {
      id: updated.id,
      state: updated.state as ConversationState,
      status: updated.status,
    };
  }

  /**
   * Update conversation status
   */
  async updateStatus(
    id: string,
    status: AIConversationStatus,
    userId: number,
  ): Promise<void> {
    await this.prisma.aIConversation.update({
      where: { id },
      data: { status },
    });

    this.logger.debug(`Updated conversation ${id} status to ${status}`);
  }

  /**
   * Attach a plan to the conversation
   */
  async attachPlan(
    id: string,
    planId: number,
    userId: number,
  ): Promise<void> {
    await this.prisma.aIConversation.update({
      where: { id },
      data: {
        planId,
        status: AIConversationStatus.GENERATED,
      },
    });

    this.logger.log(`Attached plan ${planId} to conversation ${id}`);
  }

  /**
   * Check if plan is already accepted (for idempotency)
   */
  async isPlanAccepted(planId: number): Promise<boolean> {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: {
        planId,
        status: AIConversationStatus.ACCEPTED,
      },
    });

    return !!conversation;
  }

  /**
   * Get conversations for a user
   */
  async getUserConversations(
    userId: number,
    limit: number = 10,
  ): Promise<Array<{
    id: string;
    status: string;
    planId?: number;
    createdAt: Date;
  }>> {
    const conversations = await this.prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        planId: true,
        createdAt: true,
      },
    });

    return conversations.map((c) => ({
      id: c.id,
      status: c.status,
      planId: c.planId ?? undefined,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Delete conversation (cleanup)
   */
  async deleteConversation(id: string, userId: number): Promise<void> {
    await this.prisma.aIConversation.deleteMany({
      where: {
        id,
        userId,
      },
    });

    this.logger.log(`Deleted conversation ${id}`);
  }
}
