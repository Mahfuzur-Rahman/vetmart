// lib/sms/bulksms.ts
// Bulk SMS BD live gateway driver (§4.3)
import { env } from '@/lib/env';
import type { SmsDriver, SmsResult } from './index';

export const bulkSmsDriver: SmsDriver = {
  async send(phone: string, message: string): Promise<SmsResult> {
    const apiKey = env.SMS_API_KEY;
    const senderId = env.SMS_SENDER_ID;

    if (!apiKey) {
      throw new Error('SMS_API_KEY is not configured.');
    }

    try {
      const url = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&number=${encodeURIComponent(phone)}&senderid=${encodeURIComponent(senderId || '')}&message=${encodeURIComponent(message)}`;
      const res = await fetch(url);
      const data = await res.json();
      return {
        success: data.response_code === 202,
        messageId: String(data.message_id || ''),
        error: data.error_message,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error',
      };
    }
  },
};
