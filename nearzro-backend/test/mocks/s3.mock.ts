/**
 * AWS S3 Service Mock
 * NearZro Event Management Platform
 *
 * Reusable mock for S3Service.
 * Provides comprehensive mocking for AWS S3 operations.
 */

import { jest } from '@jest/globals';

// Types for S3 commands
export interface PutObjectCommandInput {
  Bucket: string;
  Key: string;
  Body: Buffer | Uint8Array | string;
  ContentType?: string;
  ServerSideEncryption?: string;
  Metadata?: Record<string, string>;
}

export interface PutObjectCommandOutput {
  $metadata: {
    httpStatusCode: number;
    requestId?: string;
    attempts?: number;
  };
  Location?: string;
  ETag?: string;
  VersionId?: string;
}

// Mock S3 client
export const createS3Mock = () => ({
  send: jest.fn().mockImplementation(async (command: unknown): Promise<PutObjectCommandOutput> => {
    // Check if it's a PutObjectCommand by checking the command structure
    const cmd = command as { input?: PutObjectCommandInput };
    
    if (cmd.input && cmd.input.Bucket && cmd.input.Key) {
      return {
        $metadata: {
          httpStatusCode: 200,
          requestId: 'mock-request-id',
          attempts: 1,
        },
        Location: `https://${cmd.input.Bucket}.s3.ap-south-1.amazonaws.com/${cmd.input.Key}`,
        ETag: '"mock-etag"',
        VersionId: 'mock-version-id',
      };
    }
    
    throw new Error('Unknown S3 command');
  }),
});

// Mock PutObjectCommand
export const mockPutObjectCommand = jest.fn().mockImplementation((input: PutObjectCommandInput) => ({
  input,
}));

// Default mock instance
export const mockS3Client = createS3Mock();

// Reset function
export const resetS3Mock = () => {
  mockS3Client.send.mockReset();
  mockPutObjectCommand.mockReset();
};

// Export mock for use in tests
export const s3Mock = mockS3Client;
