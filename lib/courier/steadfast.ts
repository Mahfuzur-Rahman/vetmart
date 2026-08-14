// lib/courier/steadfast.ts
// Steadfast Courier API driver for production (§12)
import { env } from '@/lib/env';
import type { CourierDriver, CreateShipmentInput, ShipmentResult } from './index';

export const steadfastDriver: CourierDriver = {
  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const apiKey = env.STEADFAST_API_KEY;
    const secretKey = env.STEADFAST_SECRET_KEY;
    const baseUrl = env.STEADFAST_BASE_URL;

    if (!apiKey || !secretKey) {
      throw new Error('Steadfast API credentials missing in environment.');
    }

    const payload = {
      invoice: input.invoice,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      cod_amount: Math.round(input.codAmount / 100), // Steadfast expects integer Taka
      note: input.note || '',
      item_description: input.itemDescription || `Order ${input.invoice}`, // Never expose drug names (§12 rule 4)
    };

    const response = await fetch(`${baseUrl}/create_order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Steadfast API error (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    if (json.status !== 200) {
      throw new Error(`Steadfast rejected consignment: ${JSON.stringify(json)}`);
    }

    return {
      consignmentId: String(json.consignment.consignment_id),
      trackingCode: json.consignment.tracking_code,
      status: json.consignment.status,
      raw: json,
    };
  },

  async getStatus(consignmentId: string): Promise<{ status: string; raw: unknown }> {
    const apiKey = env.STEADFAST_API_KEY;
    const secretKey = env.STEADFAST_SECRET_KEY;
    const baseUrl = env.STEADFAST_BASE_URL;

    const response = await fetch(`${baseUrl}/status_by_cid/${consignmentId}`, {
      headers: {
        'Api-Key': apiKey || '',
        'Secret-Key': secretKey || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Steadfast status error: ${response.statusText}`);
    }

    const json = await response.json();
    return {
      status: json.delivery_status || 'unknown',
      raw: json,
    };
  },
};
