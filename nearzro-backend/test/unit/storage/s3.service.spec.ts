/**
 * Storage (S3) Service Unit Tests
 * NearZro Event Management Platform
 *
 * Comprehensive unit tests for S3Service.
 * Uses dependency injection for proper mocking.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { S3Service } from '../../../src/storage/s3.service';

describe('S3Service', () => {
  let service: S3Service;

  // Create mock S3Client
  const mockS3Send = jest.fn();

  beforeEach(async () => {
    // Mock the AWS SDK module
    jest.doMock('@aws-sdk/client-s3', () => ({
      S3Client: jest.fn().mockImplementation(() => ({
        send: mockS3Send,
      })),
      PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [S3Service],
    }).compile();

    service = module.get<S3Service>(S3Service);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // SUCCESS CASES
  // ============================================
  describe('uploadKycDocument - Success', () => {
    const mockFile = {
      buffer: Buffer.from('test content'),
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
      size: 1024 * 1024, // 1MB
      fieldname: 'file',
      encoding: '7bit',
      destination: '/tmp',
      filename: 'test.pdf',
      path: '/tmp/test.pdf',
      stream: null as unknown as Express.Multer.File['stream'],
    } as unknown as Express.Multer.File;

    it('should upload a valid PDF file', async () => {
      mockS3Send.mockResolvedValue({
        $metadata: { httpStatusCode: 200 },
      });

      const result = await service.uploadKycDocument(mockFile);

      expect(result).toContain('s3');
      expect(mockS3Send).toHaveBeenCalled();
    });

    it('should add server-side encryption', async () => {
      mockS3Send.mockResolvedValue({
        $metadata: { httpStatusCode: 200 },
      });

      await service.uploadKycDocument(mockFile);

      expect(mockS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ServerSideEncryption: 'AES256',
          }),
        }),
      );
    });
  });

  // ============================================
  // VALIDATION FAILURES
  // ============================================
  describe('uploadKycDocument - Validation', () => {
    it('should throw for invalid file type', async () => {
      const invalidFile = {
        buffer: Buffer.from('text'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1024,
        fieldname: 'file',
        encoding: '7bit',
        destination: '/tmp',
        filename: 'test.txt',
        path: '/tmp/test.txt',
        stream: null as unknown as Express.Multer.File['stream'],
      } as unknown as Express.Multer.File;

      await expect(service.uploadKycDocument(invalidFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw for oversized file', async () => {
      const oversizedFile = {
        buffer: Buffer.alloc(10 * 1024 * 1024),
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: 10 * 1024 * 1024,
        fieldname: 'file',
        encoding: '7bit',
        destination: '/tmp',
        filename: 'large.pdf',
        path: '/tmp/large.pdf',
        stream: null as unknown as Express.Multer.File['stream'],
      } as unknown as Express.Multer.File;

      await expect(service.uploadKycDocument(oversizedFile)).rejects.toThrow(
        new BadRequestException('File size 10.00 MB exceeds the 5 MB limit'),
      );
    });

    it('should accept JPEG images', async () => {
      mockS3Send.mockResolvedValue({ $metadata: { httpStatusCode: 200 } });

      const jpegFile = {
        buffer: Buffer.from('image'),
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        fieldname: 'file',
        encoding: '7bit',
        destination: '/tmp',
        filename: 'photo.jpg',
        path: '/tmp/photo.jpg',
        stream: null as unknown as Express.Multer.File['stream'],
      } as unknown as Express.Multer.File;

      const result = await service.uploadKycDocument(jpegFile);
      expect(result).toBeDefined();
    });

    it('should accept PNG images', async () => {
      mockS3Send.mockResolvedValue({ $metadata: { httpStatusCode: 200 } });

      const pngFile = {
        buffer: Buffer.from('image'),
        originalname: 'photo.png',
        mimetype: 'image/png',
        size: 1024,
        fieldname: 'file',
        encoding: '7bit',
        destination: '/tmp',
        filename: 'photo.png',
        path: '/tmp/photo.png',
        stream: null as unknown as Express.Multer.File['stream'],
      } as unknown as Express.Multer.File;

      const result = await service.uploadKycDocument(pngFile);
      expect(result).toBeDefined();
    });
  });

  // ============================================
  // EXCEPTION PATHS
  // ============================================
  describe('uploadKycDocument - Errors', () => {
    it('should throw when S3 upload fails', async () => {
      const file = {
        buffer: Buffer.from('test'),
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        fieldname: 'file',
        encoding: '7bit',
        destination: '/tmp',
        filename: 'test.pdf',
        path: '/tmp/test.pdf',
        stream: null as unknown as Express.Multer.File['stream'],
      } as unknown as Express.Multer.File;

      mockS3Send.mockRejectedValue(new Error('AWS Error'));

      await expect(service.uploadKycDocument(file)).rejects.toThrow(BadRequestException);
    });
  });
});
