/**
 * Reviews Service Unit Tests
 * NearZro Event Management Platform
 *
 * Comprehensive unit tests for ReviewsService.
 * Covers CRUD operations, voting, moderation, and edge cases.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReviewsService } from '../../../src/reviews/reviews.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { createPrismaMock } from '../../mocks/prisma.mock';
import {
  createReview,
  createApprovedReview,
  createRejectedReview,
  createReviewVote,
  createUser,
  createVenue,
} from '../../utils/mock.factory';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // CREATE METHOD
  // ============================================
  describe('create', () => {
    const createDto = {
      venueId: 1,
      rating: 5,
      title: 'Great venue!',
      comment: 'Amazing experience',
    };

    it('should create a review successfully', async () => {
      const mockReview = createReview({ id: 1, rating: 5 });
      const mockUser = createUser({ id: 1 });

      prismaMock.review.findFirst.mockResolvedValue(null);
      prismaMock.review.create.mockResolvedValue({
        ...mockReview,
        user: { id: 1, name: 'Test User' },
      });

      const result = await service.create(1, createDto);

      expect(result).toHaveProperty('user');
      expect(prismaMock.review.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 1,
          venueId: 1,
          rating: 5,
          status: 'PENDING',
        }),
        include: expect.objectContaining({
          user: expect.any(Object),
        }),
      });
    });

    it('should throw BadRequestException when user already reviewed', async () => {
      const existingReview = createReview({ userId: 1, venueId: 1 });
      prismaMock.review.findFirst.mockResolvedValue(existingReview);

      await expect(service.create(1, createDto)).rejects.toThrow(BadRequestException);
    });

    it('should create review for vendor', async () => {
      const mockReview = createReview({ id: 1, vendorId: 1, venueId: null });
      prismaMock.review.findFirst.mockResolvedValue(null);
      prismaMock.review.create.mockResolvedValue({
        ...mockReview,
        user: { id: 1, name: 'Test User' },
      });

      const result = await service.create(1, { vendorId: 1, rating: 4 });

      expect(result).toHaveProperty('user');
    });

    it('should create review for event', async () => {
      const mockReview = createReview({ id: 1, eventId: 1, venueId: null });
      prismaMock.review.findFirst.mockResolvedValue(null);
      prismaMock.review.create.mockResolvedValue({
        ...mockReview,
        user: { id: 1, name: 'Test User' },
      });

      const result = await service.create(1, { eventId: 1, rating: 5 });

      expect(result).toHaveProperty('user');
    });
  });

  // ============================================
  // FINDBYVENUE METHOD
  // ============================================
  describe('findByVenue', () => {
    it('should return approved reviews for a venue', async () => {
      const reviews = [
        createApprovedReview({ id: 1, venueId: 1 }),
        createApprovedReview({ id: 2, venueId: 1 }),
      ];
      prismaMock.review.findMany.mockResolvedValue(reviews);

      const result = await service.findByVenue(1, true);

      expect(result).toHaveLength(2);
      expect(prismaMock.review.findMany).toHaveBeenCalledWith({
        where: { venueId: 1, status: 'APPROVED' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return all reviews when approvedOnly is false', async () => {
      const reviews = [
        createReview({ id: 1, venueId: 1, status: 'PENDING' }),
        createApprovedReview({ id: 2, venueId: 1 }),
      ];
      prismaMock.review.findMany.mockResolvedValue(reviews);

      const result = await service.findByVenue(1, false);

      expect(result).toHaveLength(2);
      expect(prismaMock.review.findMany).toHaveBeenCalledWith({
        where: { venueId: 1 },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no reviews', async () => {
      prismaMock.review.findMany.mockResolvedValue([]);

      const result = await service.findByVenue(999);

      expect(result).toHaveLength(0);
    });
  });

  // ============================================
  // FINDBYVENDOR METHOD
  // ============================================
  describe('findByVendor', () => {
    it('should return approved reviews for a vendor', async () => {
      const reviews = [createApprovedReview({ id: 1, vendorId: 1 })];
      prismaMock.review.findMany.mockResolvedValue(reviews);

      const result = await service.findByVendor(1, true);

      expect(result).toHaveLength(1);
      expect(prismaMock.review.findMany).toHaveBeenCalledWith({
        where: { vendorId: 1, status: 'APPROVED' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ============================================
  // FINDBYUSER METHOD
  // ============================================
  describe('findByUser', () => {
    it('should return all reviews by user', async () => {
      const reviews = [
        createReview({ id: 1, userId: 1 }),
        createReview({ id: 2, userId: 1 }),
      ];
      prismaMock.review.findMany.mockResolvedValue(reviews);

      const result = await service.findByUser(1);

      expect(result).toHaveLength(2);
      expect(prismaMock.review.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: expect.objectContaining({
          venue: true,
          vendor: true,
          event: true,
        }),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ============================================
  // UPDATE METHOD
  // ============================================
  describe('update', () => {
    const updateDto = { rating: 4, comment: 'Updated comment' };

    it('should update own review successfully', async () => {
      const existingReview = createReview({ id: 1, userId: 1 });
      const updatedReview = { ...existingReview, ...updateDto };

      prismaMock.review.findUnique.mockResolvedValue(existingReview);
      prismaMock.review.update.mockResolvedValue(updatedReview);

      const result = await service.update(1, 1, updateDto);

      expect(result.comment).toBe('Updated comment');
    });

    it('should throw NotFoundException when review not found', async () => {
      prismaMock.review.findUnique.mockResolvedValue(null);

      await expect(service.update(999, 1, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when updating another user review', async () => {
      const existingReview = createReview({ id: 1, userId: 2 });
      prismaMock.review.findUnique.mockResolvedValue(existingReview);

      await expect(service.update(1, 1, updateDto)).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // REMOVE METHOD
  // ============================================
  describe('remove', () => {
    it('should delete own review successfully', async () => {
      const existingReview = createReview({ id: 1, userId: 1 });
      prismaMock.review.findUnique.mockResolvedValue(existingReview);
      prismaMock.review.delete.mockResolvedValue(existingReview);

      await service.remove(1, 1);

      expect(prismaMock.review.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when review not found', async () => {
      prismaMock.review.findUnique.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when deleting another user review', async () => {
      const existingReview = createReview({ id: 1, userId: 2 });
      prismaMock.review.findUnique.mockResolvedValue(existingReview);

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // VOTE METHOD
  // ============================================
  describe('vote', () => {
    it('should create a new vote', async () => {
      const review = createApprovedReview({ id: 1, helpful: 0 });
      
      prismaMock.reviewVote.findUnique.mockResolvedValue(null);
      prismaMock.reviewVote.create.mockResolvedValue(createReviewVote({ id: 1 }));
      prismaMock.reviewVote.count.mockResolvedValue(1);
      prismaMock.review.update.mockResolvedValue({ ...review, helpful: 1 });

      const result = await service.vote(1, 1, true);

      expect(result.helpful).toBe(1);
      expect(prismaMock.reviewVote.create).toHaveBeenCalled();
    });

    it('should update existing vote', async () => {
      const existingVote = createReviewVote({ id: 1, helpful: false });
      const review = createApprovedReview({ id: 1, helpful: 1 });

      prismaMock.reviewVote.findUnique.mockResolvedValue(existingVote);
      prismaMock.reviewVote.update.mockResolvedValue({ ...existingVote, helpful: true });
      prismaMock.reviewVote.count.mockResolvedValue(1);
      prismaMock.review.update.mockResolvedValue({ ...review, helpful: 1 });

      const result = await service.vote(1, 1, true);

      expect(prismaMock.reviewVote.update).toHaveBeenCalled();
    });
  });

  // ============================================
  // FINDALLFORMODERATION METHOD
  // ============================================
  describe('findAllForModeration', () => {
    it('should return reviews for moderation with pagination', async () => {
      const reviews = [
        createReview({ id: 1, status: 'PENDING' }),
        createReview({ id: 2, status: 'PENDING' }),
      ];
      
      prismaMock.review.findMany.mockResolvedValue(reviews);
      prismaMock.review.count.mockResolvedValue(2);

      const result = await service.findAllForModeration(undefined, 1, 10);

      expect(result.reviews).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter by status', async () => {
      const reviews = [createApprovedReview({ id: 1 })];
      
      prismaMock.review.findMany.mockResolvedValue(reviews);
      prismaMock.review.count.mockResolvedValue(1);

      await service.findAllForModeration('APPROVED');

      expect(prismaMock.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'APPROVED' }),
        }),
      );
    });
  });

  // ============================================
  // MODERATE METHOD
  // ============================================
  describe('moderate', () => {
    it('should approve a review', async () => {
      const review = createReview({ id: 1, status: 'PENDING' });
      const approvedReview = createApprovedReview({ id: 1 });

      prismaMock.review.update.mockResolvedValue(approvedReview);

      const result = await service.moderate(1, 'APPROVED');

      expect(result.status).toBe('APPROVED');
    });

    it('should reject a review', async () => {
      const review = createReview({ id: 1, status: 'PENDING' });
      const rejectedReview = createRejectedReview({ id: 1 });

      prismaMock.review.update.mockResolvedValue(rejectedReview);

      const result = await service.moderate(1, 'REJECTED');

      expect(result.status).toBe('REJECTED');
    });
  });

  // ============================================
  // CALCULATEAVERAGERATING METHOD
  // ============================================
  describe('calculateAverageRating', () => {
    it('should calculate average rating for venue', async () => {
      prismaMock.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: 10,
      });

      const result = await service.calculateAverageRating('venue', 1);

      expect(result.average).toBe(4.5);
      expect(result.count).toBe(10);
    });

    it('should return 0 for no reviews', async () => {
      prismaMock.review.aggregate.mockResolvedValue({
        _avg: { rating: null },
        _count: 0,
      });

      const result = await service.calculateAverageRating('vendor', 1);

      expect(result.average).toBe(0);
      expect(result.count).toBe(0);
    });
  });
});
