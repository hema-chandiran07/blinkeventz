import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('data:')) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('blob:')) return path;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const apiBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  // Clean up the incoming path: remove leading slash to avoid // in URL
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  return `${apiBase}/${cleanPath}`;
}

/**
 * Centralized utility to extract readable error messages from backend responses
 * Handles NestJS/Axios error structures including class-validator arrays
 */
export function extractErrorMessage(error: any): string {
  if (typeof error === 'string') return error;

  const data = error?.response?.data;

  // 1. Handle NestJS class-validator arrays
  if (data?.message && Array.isArray(data.message)) {
    return data.message[0]; // Take the first validation error
  }

  // 2. Handle standard message fields
  if (data?.message) return data.message;
  if (data?.error?.message) return data.error.message;

  // 3. Handle Axios top-level error message
  if (error.message) {
    if (error.message.includes('Network Error') || error.message.includes('timeout')) {
      return "Network synchronization failure. Please verify your connection.";
    }
    return error.message;
  }

  return "An unexpected protocol error occurred. Please retry.";
}
