// lib/api/response.ts
// Standardized API envelope response utility (§9) — No caching for real-time freshness
import { NextResponse } from 'next/server';

export interface ApiSuccessPayload<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    field?: string;
    details?: unknown;
  };
}

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store',
};

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>, status: number = 200) {
  return NextResponse.json<ApiSuccessPayload<T>>(
    { data, meta },
    {
      status,
      headers: NO_CACHE_HEADERS,
    }
  );
}

export function apiError(
  code: string,
  message: string,
  status: number = 400,
  field?: string,
  details?: unknown
) {
  return NextResponse.json<ApiErrorPayload>(
    {
      error: {
        code,
        message,
        field,
        details,
      },
    },
    {
      status,
      headers: NO_CACHE_HEADERS,
    }
  );
}
