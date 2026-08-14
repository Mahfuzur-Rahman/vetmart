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

export function getCourierDriver(): CourierDriver {
  switch (env.COURIER_DRIVER) {
    case 'steadfast': {
      const { steadfastDriver } = require('./steadfast');
      return steadfastDriver;
    }
    case 'mock': {
      const { mockCourierDriver } = require('./mock');
      return mockCourierDriver;
    }
    default:
      throw new Error(`Unsupported COURIER_DRIVER: ${env.COURIER_DRIVER}`);
  }
}
