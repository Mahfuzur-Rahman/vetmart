// tests/ecomdrive-courier-operations.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeBdPhone, checkCustomerFraudRisk } from '@/lib/courier/fraud-check';
import { bulkDispatchOrders, type DispatchableOrder } from '@/lib/services/courier-booking';

describe('EcomDrive Operations & Courier Suite', () => {
  describe('Phone Normalization & Fraud Scoring', () => {
    it('normalizes various BD phone formats to 11-digit standard', () => {
      expect(normalizeBdPhone('+8801711000000')).toBe('01711000000');
      expect(normalizeBdPhone('8801812998877')).toBe('01812998877');
      expect(normalizeBdPhone('01911223344')).toBe('01911223344');
      expect(normalizeBdPhone('017-1554-4332')).toBe('01715544332');
    });

    it('computes low-risk delivery score for verified trusted customers', async () => {
      const report = await checkCustomerFraudRisk('01711000000');
      expect(report.phone).toBe('01711000000');
      expect(report.successRate).toBeGreaterThanOrEqual(85);
      expect(report.riskLevel).toBe('low');
      expect(report.cancelledParcels).toBeLessThanOrEqual(5);
    });

    it('detects high-risk customers with poor delivery history', async () => {
      const report = await checkCustomerFraudRisk('01715544332');
      expect(report.phone).toBe('01715544332');
      expect(report.riskLevel).toBe('high');
      expect(report.successRate).toBeLessThan(60);
      expect(report.riskReasonBn).toContain('অগ্রিম ডেলিভারি');
    });
  });

  describe('Bulk Courier Dispatching Service', () => {
    it('dispatches multiple orders in batch and generates consignments', async () => {
      const mockOrders: DispatchableOrder[] = [
        {
          id: 'ord-test-1',
          orderNumber: 'VM-TEST-101',
          customerName: 'Dr. Test Vet',
          customerPhone: '01711000000',
          recipientAddress: 'Holding 10, Station Road',
          district: 'Mymensingh',
          division: 'Mymensingh',
          totalAmount: 124000,
          paymentMethod: 'cod',
          paymentStatus: 'unpaid',
          items: [{ productNameEn: 'Renaflox 100ml', quantity: 5 }],
        },
        {
          id: 'ord-test-2',
          orderNumber: 'VM-TEST-102',
          customerName: 'Rahim Dairy',
          customerPhone: '01812998877',
          recipientAddress: 'Joydebpur Road',
          district: 'Gazipur',
          division: 'Dhaka',
          totalAmount: 184000,
          paymentMethod: 'cod',
          paymentStatus: 'unpaid',
          items: [{ productNameEn: 'Rena-WS 100g', quantity: 10 }],
        },
      ];

      const report = await bulkDispatchOrders(mockOrders);

      expect(report.successCount).toBe(2);
      expect(report.failureCount).toBe(0);
      expect(report.dispatched).toHaveLength(2);
      expect(report.dispatched[0].consignmentId).toBeDefined();
      expect(report.dispatched[0].trackingCode).toBeDefined();
      expect(report.dispatched[0].status).toBe('dispatched');
    });
  });
});
