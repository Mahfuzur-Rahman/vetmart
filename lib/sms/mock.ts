// lib/sms/mock.ts
// Mock SMS driver for development & demo environment (§4.2, §20)
import type { SmsDriver, SmsResult } from './index';

export const mockSmsDriver: SmsDriver = {
  async send(phone: string, message: string): Promise<SmsResult> {
    console.log(`\n================== [MOCK SMS] ==================`);
    console.log(`To: ${phone}`);
    console.log(`Message: ${message}`);
    console.log(`================================================\n`);
    return {
      success: true,
      messageId: `mock-msg-${Date.now()}`,
    };
  },
};
