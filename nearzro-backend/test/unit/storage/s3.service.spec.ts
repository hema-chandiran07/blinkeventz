/**
 *  * Storage (S3) Service Unit Tests
 *  * NearZro Event Management Platform
 *  *
 *  * Comprehensive unit tests for S3Service.
 *  * Uses dependency injection for proper mocking.
 *  */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { S3Service } from '../../../src/storage/s3.service';

// Mock the AWS SDK
const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => {
      return {
        send: mockSend
      };
    }),
    PutObjectCommand: jest.fn().mockImplementation((params) => {
      return { input: params };
    })
  };
});

// Import the mocked module
const { S3Client } = require('@aws-sdk/client-s3');

describe('S3Service', () => {
  let service: S3Service;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    mockSend.mockClear();

    // Set environment variables for the S3Service
    process.env.AWS_S3_BUCKET = 'test-bucket';
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    process.env.AWS_REGION = 'ap-south-1';

    // Reset the S3Client mock
    S3Client.mockClear();
    S3Client.mockImplementation(() => {
      return {
        send: mockSend
      };
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [S3Service],
    }).compile();

    service = module.get<S3Service>(S3Service);
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
      mockSend.mockResolvedValue({
        $metadata: { httpStatusCode: 200 },
      });

      const result = await service.uploadKycDocument(mockFile);

      expect(result).toContain('s3');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should add server-side encryption', async () => {
      mockSend.mockResolvedValue({
        $metadata: { httpStatusCode: 200 },
      });

      await service.uploadKycDocument(mockFile);

      expect(mockSend).toHaveBeenCalled();
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs).toHaveProperty('input');
      expect(callArgs.input).toHaveProperty('ServerSideEncryption', 'AES256');
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
      mockSend.mockResolvedValue({ $metadata: { httpStatusCode: 200 } });

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
      mockSend.mockResolvedValue({ $metadata: { httpStatusCode: 200 } });

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

      mockSend.mockRejectedValue(new Error('AWS Error'));

      await expect(service.uploadKycDocument(file)).rejects.toThrow(BadRequestException);
    });
  });
});
