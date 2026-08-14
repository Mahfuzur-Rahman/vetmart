// lib/courier/mock.ts
// Mock courier driver for demo and development (§4.2)
import type { CourierDriver, CreateShipmentInput, ShipmentResult } from './index';

let mockCounter = 1000;

export const mockCourierDriver: CourierDriver = {
  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const id = `MOCK-CID-${++mockCounter}`;
    console.log(`[MockCourier] Consignment created: ${id} for ${input.recipientName} (COD: ৳${(input.codAmount / 100).toFixed(2)})`);
    return {
      consignmentId: id,
      trackingCode: `TRK-${id}`,
      status: 'in_review',
      raw: { mock: true, createdAt: new Date().toISOString() },
    };
  },

  async getStatus(consignmentId: string): Promise<{ status: string; raw: unknown }> {
    return {
      status: 'in_transit',
      raw: { consignmentId, mock: true, updatedAt: new Date().toISOString() },
    };
  },
};
