import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KycStatus, KycDocType } from '@prisma/client';

/**
 * Standardized API response wrapper
 */
export class ApiResponse<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  error?: string;

  constructor(data: T, success: boolean = true, message?: string, error?: string) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.error = error;
  }

  static success<T>(data: T, message?: string): ApiResponse<T> {
    return new ApiResponse(data, true, message);
  }

  static error<T>(data: T, error: string): ApiResponse<T> {
    return new ApiResponse(data, false, undefined, error);
  }
}

/**
 * Paginated response wrapper
 */
export class PaginatedResponse<T> {
  @ApiProperty({ type: [Object] })
  data: T[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNext: boolean;

  @ApiProperty()
  hasPrevious: boolean;

  constructor(data: T[], page: number, limit: number, total: number) {
    this.data = data;
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrevious = page > 1;
  }
}

/**
 * KYC Document response DTO
 */
export class KycDocumentResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: KycDocType })
  docType: KycDocType;

  @ApiProperty({ enum: KycStatus })
  status: KycStatus;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  verifiedAt?: Date;

  @ApiPropertyOptional()
  docFileUrl?: string;

  @ApiPropertyOptional()
  userId?: number;
}

/**
 * KYC submission response
 */
export class KycSubmissionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: KycDocType })
  docType: KycDocType;

  @ApiProperty({ enum: KycStatus })
  status: KycStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  message?: string;
}

/**
 * KYC status update response
 */
export class KycStatusUpdateResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: KycStatus })
  status: KycStatus;

  @ApiPropertyOptional()
  verifiedAt?: Date;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiProperty()
  message: string;
}
