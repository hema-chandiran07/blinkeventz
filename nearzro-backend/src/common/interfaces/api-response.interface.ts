/**
 * Standardized API Response Interface
 * Used for all successful API responses
 */
export interface ApiResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId: string;
}

/**
 * Standardized Error Response Interface
 * Used for all failed API responses
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
    path?: string;
  };
  timestamp: string;
  requestId: string;
}

/**
 * Paginated Response Interface
 * For endpoints that return lists with pagination
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  message?: string;
  timestamp: string;
  requestId: string;
}

/**
 * Helper function to create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  requestId?: string,
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId(),
  };
}

/**
 * Helper function to create a standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  requestId?: string,
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId(),
  };
}

/**
 * Helper function to create a standardized paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string,
  requestId?: string,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    },
    message,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId(),
  };
}

/**
 * Generate a unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
