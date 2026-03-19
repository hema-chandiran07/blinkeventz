/**
 * NearZro - API Response Utilities
 * 
 * Production-grade utilities for handling API responses, including
 * paginated responses from the NestJS backend.
 * 
 * The backend returns paginated responses in the format:
 * {
 *   data: T[],
 *   page: number,
 *   limit: number,
 *   total: number,
 *   totalPages: number,
 *   hasNext: boolean,
 *   hasPrevious: boolean
 * }
 */

// ==================== TYPE DEFINITIONS ====================

/**
 * Generic paginated response interface from the backend
 */
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * API Response wrapper (when using axios, response is in .data)
 */
export interface ApiResponse<T> {
  data: T | PaginatedResponse<T>;
  status?: number;
  statusText?: string;
}

/**
 * Generic type for any array-like response
 */
export type ArrayOrPaginated<T> = T[] | PaginatedResponse<T>;

// ==================== EXTRACTION UTILITIES ====================

/**
 * Safely extract an array from an API response.
 * Handles both direct arrays and paginated responses.
 * 
 * @param response - The API response (axios response.data or raw response)
 * @returns The extracted array
 * 
 * @example
 * // Direct array response
 * const users = extractArray<User>({ data: [{ id: 1, name: 'John' }] });
 * // Result: [{ id: 1, name: 'John' }]
 * 
 * @example
 * // Paginated response
 * const events = extractArray<Event>({ data: { data: [...], page: 1, total: 10 } });
 * // Result: [...]
 */
export function extractArray<T>(response: unknown): T[] {
  // Handle null/undefined
  if (!response) {
    return [];
  }

  // Handle axios response wrapper (response.data)
  if (typeof response === 'object' && 'data' in response) {
    const responseData = (response as { data: unknown }).data;
    return extractArray<T>(responseData);
  }

  // Already an array
  if (Array.isArray(response)) {
    return response;
  }

  // Paginated response - extract the nested data array
  if (typeof response === 'object' && response !== null && 'data' in response) {
    const data = (response as { data: unknown }).data;
    if (Array.isArray(data)) {
      return data as T[];
    }
    // Nested paginated structure: { data: { data: [...] } }
    if (typeof data === 'object' && data !== null && 'data' in data) {
      const nestedData = (data as { data: unknown }).data;
      if (Array.isArray(nestedData)) {
        return nestedData as T[];
      }
    }
  }

  // Fallback: return empty array for unexpected formats
  console.warn('extractArray: Unable to extract array from response:', response);
  return [];
}

/**
 * Extract pagination metadata from a response.
 * Returns null if the response is not paginated.
 * 
 * @param response - The API response
 * @returns Pagination metadata or null
 */
export function extractPagination<T>(response: unknown): Omit<PaginatedResponse<T>, 'data'> | null {
  if (!response) {
    return null;
  }

  // Handle axios response wrapper
  if (typeof response === 'object' && 'data' in response) {
    const responseData = (response as { data: unknown }).data;
    return extractPagination<T>(responseData);
  }

  // Check for paginated structure
  if (typeof response === 'object' && response !== null) {
    const resp = response as Record<string, unknown>;
    if (
      typeof resp.page === 'number' &&
      typeof resp.limit === 'number' &&
      typeof resp.total === 'number'
    ) {
      return {
        page: resp.page,
        limit: resp.limit,
        total: resp.total,
        totalPages: typeof resp.totalPages === 'number' ? resp.totalPages : Math.ceil(resp.total / resp.limit),
        hasNext: typeof resp.hasNext === 'boolean' ? resp.hasNext : resp.page * resp.limit < resp.total,
        hasPrevious: typeof resp.hasPrevious === 'boolean' ? resp.hasPrevious : resp.page > 1,
      };
    }
  }

  return null;
}

/**
 * Extract the full paginated response with both data and metadata.
 * 
 * @param response - The API response
 * @returns Object with extracted array and pagination metadata
 */
export function extractPaginatedResponse<T>(response: unknown): {
  data: T[];
  pagination: Omit<PaginatedResponse<T>, 'data'> | null;
} {
  return {
    data: extractArray<T>(response),
    pagination: extractPagination<T>(response),
  };
}

// ==================== STATE MANAGEMENT UTILITIES ====================

/**
 * Create a safe initial state for array data loaded from API
 * 
 * @param initialValue - Optional initial value
 * @returns Safe initial state object
 */
export function createArrayState<T>(initialValue: T[] = []): {
  data: T[];
  isLoading: boolean;
  error: string | null;
} {
  return {
    data: initialValue,
    isLoading: false,
    error: null,
  };
}

/**
 * Create safe state updater for API array responses
 * Handles loading, success, and error states
 */
export function createArrayStateActions<T>(
  setState: React.Dispatch<React.SetStateAction<{
    data: T[];
    isLoading: boolean;
    error: string | null;
  }>>
) {
  return {
    startLoading: () => setState(prev => ({ ...prev, isLoading: true, error: null })),
    
    setData: (response: unknown) => {
      const data = extractArray<T>(response);
      setState({ data, isLoading: false, error: null });
    },
    
    setError: (error: string) => setState(prev => ({ 
      ...prev, 
      isLoading: false, 
      error 
    })),
    
    reset: () => setState({ data: [], isLoading: false, error: null }),
  };
}

// ==================== GUARD FUNCTIONS ====================

/**
 * Type guard to check if a response is paginated
 */
export function isPaginatedResponse<T>(response: unknown): response is PaginatedResponse<T> {
  if (typeof response !== 'object' || response === null) {
    return false;
  }

  const resp = response as Record<string, unknown>;
  return (
    Array.isArray(resp.data) &&
    typeof resp.page === 'number' &&
    typeof resp.limit === 'number' &&
    typeof resp.total === 'number'
  );
}

/**
 * Type guard to check if value is a valid array
 */
export function isValidArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

// ==================== DERIVED HELPERS ====================

/**
 * Get the array length safely, handling both array and paginated responses
 */
export function getArrayLength(response: unknown): number {
  const arr = extractArray(response);
  return arr.length;
}

/**
 * Check if response has more pages
 */
export function hasMorePages(response: unknown): boolean {
  const pagination = extractPagination(response);
  return pagination ? pagination.hasNext : false;
}

/**
 * Get current page from response
 */
export function getCurrentPage(response: unknown): number {
  const pagination = extractPagination(response);
  return pagination?.page ?? 1;
}
