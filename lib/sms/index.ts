// lib/sms/index.ts
// SMS driver interface (§4.3, §8)
import { env } from '@/lib/env';

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsDriver {
  send(phone: string, message: string): Promise<SmsResult>;
}

export function getSmsDriver(): SmsDriver {
  switch (env.SMS_DRIVER) {
    case 'bulksms': {
      const { bulkSmsDriver } = require('./bulksms');
      return bulkSmsDriver;
    }
    case 'mock': {
      const { mockSmsDriver } = require('./mock');
      return mockSmsDriver;
    }
    default:
      throw new Error(`Unsupported SMS_DRIVER: ${env.SMS_DRIVER}`);
  }
}
