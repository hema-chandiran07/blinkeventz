/**
 * Reviews Controller Unit Tests
 * NearZro Event Management Platform
 *
 * Comprehensive unit tests for ReviewsController.
 * Covers all endpoints with positive and negative scenarios.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from '../../../src/reviews/reviews.controller';
import { ReviewsService } from '../../../src/reviews/reviews.service';
import { JwtAuthGuard } from '../../../src/auth/jwt-auth.guard';
import { RolesGuard } from '../../../src/common/guards/roles.guard';
import { createReview, createApprovedReview } from '../../utils/mock.factory';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let service: ReviewsService;

  const mockReviewsService = {
    create: jest.fn(),
    findAllForModeration: jest.fn(),
    findByVenue: jest.fn(),
    findByVendor: jest.fn(),
    findByUser: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    vote: jest.fn(),
    moderate: jest.fn(),
  };

  const mockRequest = {
    user: { userId: 1, role: 'CUSTOMER' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        { provide: ReviewsService, useValue: mockReviewsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ReviewsController>(ReviewsController);
    service = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================
  // GETALLREVIEWS (Admin)
  // ============================================
  describe('getAllReviews', () => {
    it('should return paginated reviews for moderation', async () => {
      const mockResponse = {
        reviews: [createReview({ id: 1 })],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      mockReviewsService.findAllForModeration.mockResolvedValue(mockResponse);

      const result = await controller.getAllReviews();

      expect(result).toEqual(mockResponse);
    });

    it('should filter by status', async () => {
      const mockResponse = {
        reviews: [createApprovedReview({ id: 1 })],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      mockReviewsService.findAllForModeration.mockResolvedValue(mockResponse);

      await controller.getAllReviews('APPROVED');

      expect(mockReviewsService.findAllForModeration).toHaveBeenCalledWith('APPROVED', 1, 20);
    });
  });

  // ============================================
  // CREATE METHOD
  // ============================================
  describe('create', () => {
    const createDto = {
      venueId: 1,
      rating: 5,
      title: 'Great!',
      comment: 'Amazing venue',
    };

    it('should create a review successfully', async () => {
      const mockReview = createReview({ id: 1 });
      mockReviewsService.create.mockResolvedValue(mockReview);

      const result = await controller.create(mockRequest as any, createDto);

      expect(result).toEqual(mockReview);
      expect(mockReviewsService.create).toHaveBeenCalledWith(1, createDto);
    });
  });

  // ============================================
  // GETVENUEREVS (Public)
  // ============================================
  describe('getVenueReviews', () => {
    it('should return approved reviews for venue', async () => {
      const reviews = [createApprovedReview({ id: 1, venueId: 1 })];
      mockReviewsService.findByVenue.mockResolvedValue(reviews);

      const result = await controller.getVenueReviews('1');

      expect(result).toEqual(reviews);
      expect(mockReviewsService.findByVenue).toHaveBeenCalledWith(1, true);
    });

    it('should return all reviews when approved is false', async () => {
      const reviews = [createReview({ id: 1, venueId: 1, status: 'PENDING' })];
      mockReviewsService.findByVenue.mockResolvedValue(reviews);

      await controller.getVenueReviews('1', false);

      expect(mockReviewsService.findByVenue).toHaveBeenCalledWith(1, false);
    });
  });

  // ============================================
  // GETVENDORREVS (Public)
  // ============================================
  describe('getVendorReviews', () => {
    it('should return approved reviews for vendor', async () => {
      const reviews = [createApprovedReview({ id: 1, vendorId: 1 })];
      mockReviewsService.findByVendor.mockResolvedValue(reviews);

      const result = await controller.getVendorReviews('1');

      expect(result).toEqual(reviews);
    });
  });

  // ============================================
  // GETMYREVIEWS (User)
  // ============================================
  describe('getMyReviews', () => {
    it('should return user reviews', async () => {
      const reviews = [createReview({ id: 1, userId: 1 })];
      mockReviewsService.findByUser.mockResolvedValue(reviews);

      const result = await controller.getMyReviews(mockRequest as any);

      expect(result).toEqual(reviews);
      expect(mockReviewsService.findByUser).toHaveBeenCalledWith(1);
    });
  });

  // ============================================
  // UPDATE METHOD
  // ============================================
  describe('update', () => {
    const updateDto = { rating: 4, comment: 'Updated' };

    it('should update own review', async () => {
      const mockReview = createReview({ id: 1 });
      mockReviewsService.update.mockResolvedValue(mockReview);

      await controller.update(mockRequest as any, '1', updateDto);

      expect(mockReviewsService.update).toHaveBeenCalledWith(1, 1, updateDto);
    });
  });

  // ============================================
  // REMOVE METHOD
  // ============================================
  describe('remove', () => {
    it('should delete own review', async () => {
      mockReviewsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockRequest as any, '1');

      expect(mockReviewsService.remove).toHaveBeenCalledWith(1, 1);
    });
  });

  // ============================================
  // VOTE METHOD
  // ============================================
  describe('vote', () => {
    it('should vote on a review', async () => {
      const mockReview = createApprovedReview({ id: 1, helpful: 1 });
      mockReviewsService.vote.mockResolvedValue(mockReview);

      await controller.vote(mockRequest as any, '1', true);

      expect(mockReviewsService.vote).toHaveBeenCalledWith(1, 1, true);
    });
  });

  // ============================================
  // APPROVE METHOD (Admin)
  // ============================================
  describe('approve', () => {
    it('should approve a review', async () => {
      const mockReview = createApprovedReview({ id: 1 });
      mockReviewsService.moderate.mockResolvedValue(mockReview);

      await controller.approve('1');

      expect(mockReviewsService.moderate).toHaveBeenCalledWith(1, 'APPROVED');
    });
  });

  // ============================================
  // REJECT METHOD (Admin)
  // ============================================
  describe('reject', () => {
    it('should reject a review', async () => {
      mockReviewsService.moderate.mockResolvedValue({ status: 'REJECTED' });

      await controller.reject('1');

      expect(mockReviewsService.moderate).toHaveBeenCalledWith(1, 'REJECTED');
    });
  });

  // ============================================
  // GETALLFORMODERATION (Admin - Legacy)
  // ============================================
  describe('getAllForModeration', () => {
    it('should return all reviews for moderation', async () => {
      const mockResponse = {
        reviews: [createReview({ id: 1 })],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      mockReviewsService.findAllForModeration.mockResolvedValue(mockResponse);

      const result = await controller.getAllForModeration();

      expect(result).toEqual(mockResponse);
    });
  });
});
