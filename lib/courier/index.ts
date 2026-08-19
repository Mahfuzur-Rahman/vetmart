// lib/courier/index.ts
// Courier driver interface (§4.3, §12)
import { env } from '@/lib/env';

export interface CreateShipmentInput {
  invoice: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number; // in integer paisa (§2 rule 5)
  note?: string;
  itemDescription?: string;
}

export interface ShipmentResult {
  consignmentId: string;
  trackingCode: string;
  status: string;
  raw?: unknown;
}

export interface CourierDriver {
  createShipment(input: CreateShipmentInput): Promise<ShipmentResult>;
  getStatus(consignmentId: string): Promise<{ status: string; raw: unknown }>;
}

import { steadfastDriver } from './steadfast';
import { mockCourierDriver } from './mock';

export function getCourierDriver(): CourierDriver {
  if (env.COURIER_DRIVER === 'steadfast' && env.STEADFAST_API_KEY && env.STEADFAST_SECRET_KEY) {
    return steadfastDriver;
  }
  return mockCourierDriver;
}
