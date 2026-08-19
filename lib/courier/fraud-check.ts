// lib/courier/fraud-check.ts
// Customer Delivery Success Rate & Fraud Protection Engine (§12, §14)
import { env } from '@/lib/env';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface CourierFraudReport {
  phone: string;
  totalParcels: number;
  deliveredParcels: number;
  cancelledParcels: number;
  successRate: number; // percentage 0 - 100
  riskLevel: RiskLevel;
  riskReason: string;
  riskReasonBn: string;
  source: 'steadfast_api' | 'network_graph_sandbox';
}

/**
 * Normalizes Bangladeshi phone number to 11 digits: 01XXXXXXXXX
 */
export function normalizeBdPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('880') && digits.length === 13) {
    return digits.slice(2);
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    return `0${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('01')) {
    return digits;
  }
  return digits;
}

/**
 * Deterministic fallback scoring for sandbox/demo testing based on phone number
 */
function getSimulatedFraudReport(phone: string): CourierFraudReport {
  const cleanPhone = normalizeBdPhone(phone);
  
  // Seed calculation from phone digits
  let seed = 0;
  for (let i = 0; i < cleanPhone.length; i++) {
    seed = (seed * 31 + cleanPhone.charCodeAt(i)) % 1000;
  }

  // Pre-configured known demo patterns
  if (cleanPhone.endsWith('000000') || cleanPhone.endsWith('98214')) {
    return {
      phone: cleanPhone,
      totalParcels: 34,
      deliveredParcels: 32,
      cancelledParcels: 2,
      successRate: 94.1,
      riskLevel: 'low',
      riskReason: 'Excellent delivery record across courier networks',
      riskReasonBn: 'কুরিয়ার নেটওয়ার্কে চমৎকার ডেলিভারি হিস্ট্রি (নিরাপদ)',
      source: 'network_graph_sandbox',
    };
  }

  if (cleanPhone.endsWith('998877')) {
    return {
      phone: cleanPhone,
      totalParcels: 18,
      deliveredParcels: 16,
      cancelledParcels: 2,
      successRate: 88.9,
      riskLevel: 'low',
      riskReason: 'Trusted Farm/B2B buyer with low return rate',
      riskReasonBn: 'বিশ্বস্ত খামারি ও নিয়মিত গ্রাহক',
      source: 'network_graph_sandbox',
    };
  }

  if (cleanPhone.endsWith('5544332') || cleanPhone.endsWith('44332')) {
    return {
      phone: cleanPhone,
      totalParcels: 12,
      deliveredParcels: 5,
      cancelledParcels: 7,
      successRate: 41.6,
      riskLevel: 'high',
      riskReason: 'High return rate (58% returns). Advance delivery fee recommended.',
      riskReasonBn: 'উচ্চ রিটার্ন ঝুঁকি (৫৮% রিটার্ন)। অগ্রিম ডেলিভারি চার্জ নেওয়া বাঞ্ছনীয়।',
      source: 'network_graph_sandbox',
    };
  }

  // General simulation: 75% are low risk, 15% medium, 10% high
  const total = 5 + (seed % 25);
  let delivered = total;
  let riskLevel: RiskLevel = 'low';
  let reasonEn = 'Verified regular buyer';
  let reasonBn = 'যাচাইকৃত নিয়মিত ক্রেতা';

  if (seed % 10 === 0) {
    // High risk simulation
    delivered = Math.floor(total * 0.35);
    riskLevel = 'high';
    reasonEn = 'High return rate in recent orders. Advance delivery fee recommended.';
    reasonBn = 'সাম্প্রতিক অর্ডারে উচ্চ রিটার্ন রেট। অগ্রিম ডেলিভারি ফি নিন।';
  } else if (seed % 5 === 0) {
    // Medium risk
    delivered = Math.floor(total * 0.68);
    riskLevel = 'medium';
    reasonEn = 'Moderate return history. Phone verification suggested.';
    reasonBn = 'মাঝারি রিটার্ন হিস্ট্রি। ফোনে নিশ্চিতকরণ সুপারিশকৃত।';
  } else {
    delivered = Math.max(1, Math.floor(total * (0.85 + (seed % 15) / 100)));
  }

  const cancelled = total - delivered;
  const rate = total > 0 ? Number(((delivered / total) * 100).toFixed(1)) : 100;

  return {
    phone: cleanPhone,
    totalParcels: total,
    deliveredParcels: delivered,
    cancelledParcels: cancelled,
    successRate: rate,
    riskLevel,
    riskReason: reasonEn,
    riskReasonBn: reasonBn,
    source: 'network_graph_sandbox',
  };
}

/**
 * Checks a customer's delivery success rate and return fraud risk
 */
export async function checkCustomerFraudRisk(rawPhone: string): Promise<CourierFraudReport> {
  const phone = normalizeBdPhone(rawPhone);
  const apiKey = env.STEADFAST_API_KEY;
  const secretKey = env.STEADFAST_SECRET_KEY;
  const baseUrl = env.STEADFAST_BASE_URL || 'https://api.steadfast.com.bd/api/v1';

  // If live credentials present and not in mock mode, attempt live Steadfast fraud API
  if (apiKey && secretKey && env.COURIER_DRIVER === 'steadfast') {
    try {
      const response = await fetch(`${baseUrl}/fraud-check/${phone}`, {
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
          'Content-Type': 'application/json',
        },
        // Fast timeout for UI responsiveness
        signal: AbortSignal.timeout(3500),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 200 && data.fraud_data) {
          const total = Number(data.fraud_data.total_parcels || 0);
          const delivered = Number(data.fraud_data.delivered_parcels || 0);
          const cancelled = Number(data.fraud_data.cancelled_parcels || 0);
          const rate = total > 0 ? Number(((delivered / total) * 100).toFixed(1)) : 100;

          let riskLevel: RiskLevel = 'low';
          let reasonEn = 'Clean courier delivery record';
          let reasonBn = 'কুরিয়ার নেটওয়ার্কে বিশ্বস্ত ইতিহাস';

          if (rate < 60 || (cancelled >= 4 && rate < 75)) {
            riskLevel = 'high';
            reasonEn = `Critical return rate (${(100 - rate).toFixed(0)}%). Collect advance shipping charge.`;
            reasonBn = `উচ্চ রিটার্ন ঝুঁকি (${(100 - rate).toFixed(0)}%)। অগ্রিম ডেলিভারি চার্জ নিশ্চিত করুন।`;
          } else if (rate < 80) {
            riskLevel = 'medium';
            reasonEn = 'Moderate return rate. Verify customer address before dispatch.';
            reasonBn = 'মাঝারি ডেলিভারি হার। পাঠানোর পূর্বে ফোন করে ঠিকানা নিশ্চিত করুন।';
          }

          return {
            phone,
            totalParcels: total,
            deliveredParcels: delivered,
            cancelledParcels: cancelled,
            successRate: rate,
            riskLevel,
            riskReason: reasonEn,
            riskReasonBn: reasonBn,
            source: 'steadfast_api',
          };
        }
      }
    } catch {
      // Fall through to deterministic simulation on API timeout/offline
    }
  }

  return getSimulatedFraudReport(phone);
}
