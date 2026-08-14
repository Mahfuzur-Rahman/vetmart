// lib/api/response.ts
// Standardized API envelope response utility (§9)
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

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>, status: number = 200) {
  return NextResponse.json<ApiSuccessPayload<T>>({ data, meta }, { status });
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
    { status }
  );
}
