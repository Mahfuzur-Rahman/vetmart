// lib/courier/webhook.ts
// One verified entry point for courier status callbacks (§12 rule 2).
//
// There are two registered webhook paths (`/api/webhooks/courier/steadfast` and
// `/api/v1/webhook/steadfast`) because the courier portal already points at one
// of them. Both delegate here so the authentication and the status mapping
// cannot drift apart — previously one path had an empty `if` block where the
// signature check should have been, and the other had no check at all, so any
// caller could move an order to `delivered` or `returned`.
import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { processSteadfastWebhook } from '@/lib/services/fulfillment';

/** Constant-time compare so the secret cannot be recovered by timing. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type WebhookAuthResult =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string };

/**
 * Authenticate a courier callback.
 *
 * Accepts the secret as an `x-courier-webhook-secret` header or a `token` query
 * parameter, because courier portals frequently only let you configure a URL.
 *
 * With no secret configured this allows the request in development and the
 * mock-driver demo (§4.3 `COURIER_DRIVER=mock` fires simulated callbacks), and
 * refuses it in production — where `lib/env.ts` also makes the variable
 * mandatory for the live driver, so this branch is a defence in depth.
 */
export function authenticateCourierWebhook(req: NextRequest): WebhookAuthResult {
  const expected = env.COURIER_WEBHOOK_SECRET;

  if (!expected) {
    if (env.NODE_ENV === 'production') {
      console.error(
        '[courier webhook] Refused: COURIER_WEBHOOK_SECRET is not configured in production.'
      );
      return {
        ok: false,
        status: 503,
        code: 'WEBHOOK_NOT_CONFIGURED',
        message: 'Courier webhook secret is not configured.',
      };
    }
    return { ok: true };
  }

  const header = req.headers.get('x-courier-webhook-secret');
  if (header && secretMatches(header, expected)) return { ok: true };

  const token = new URL(req.url).searchParams.get('token');
  if (token && secretMatches(token, expected)) return { ok: true };

  return {
    ok: false,
    status: 401,
    code: 'WEBHOOK_UNAUTHORIZED',
    message: 'Invalid courier webhook credentials.',
  };
}

export interface CourierWebhookOutcome {
  /** True when a shipment row was found and updated. */
  applied: boolean;
  consignmentId: string;
  trackingCode?: string;
  courierStatus: string;
  error?: string;
}

/**
 * Normalise a Steadfast callback body and apply it.
 *
 * Returns rather than throws for an unknown consignment: the courier retries on
 * a non-2xx, and retrying a payload we will never match is pointless noise.
 */
export async function handleCourierWebhookPayload(
  payload: unknown
): Promise<{ ok: boolean; outcome?: CourierWebhookOutcome; error?: string }> {
  const body = (payload ?? {}) as Record<string, unknown>;

  const consignmentIdRaw = body.consignment_id ?? body.consignmentId;
  const trackingCodeRaw = body.tracking_code ?? body.trackingCode;
  const statusRaw = body.status;

  const consignmentId = consignmentIdRaw ? String(consignmentIdRaw) : '';
  const trackingCode = trackingCodeRaw ? String(trackingCodeRaw) : undefined;
  const courierStatus = String(statusRaw ?? '').toLowerCase().trim();

  if (!consignmentId && !trackingCode) {
    return { ok: false, error: 'Missing consignment_id and tracking_code.' };
  }

  if (!courierStatus) {
    return { ok: false, error: 'Missing status.' };
  }

  const result = await processSteadfastWebhook({
    consignmentId: consignmentId || trackingCode!,
    trackingCode,
    status: courierStatus,
    raw: payload,
  });

  return {
    ok: true,
    outcome: {
      applied: result.success,
      consignmentId: consignmentId || trackingCode!,
      trackingCode,
      courierStatus,
      error: result.error,
    },
  };
}
