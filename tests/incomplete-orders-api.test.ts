// tests/incomplete-orders-api.test.ts
import { describe, it, expect } from 'vitest';
import { isValidBdPhone, sanitizeBdPhone, INITIAL_MOCK_INCOMPLETE_ORDERS } from '@/lib/mock-data/incomplete-orders';

describe('Incomplete Orders Business Logic & Payload Processing', () => {
  it('validates lead creation payload requirements', () => {
    const validPayload = {
      phone: '01711223344',
      name: 'Dr. Rafiqul Islam',
      items: [
        {
          productId: 'prod-1',
          productSlug: 'renaflox-100ml',
          productNameEn: 'Renaflox 100ml Oral Solution',
          productNameBn: 'রেনাফ্লক্স ১০০মি.লি. ওরাল সলিউশন',
          quantity: 2,
          unitPrice: 16500,
          totalPrice: 33000,
        },
      ],
      subtotal: 33000,
      deliveryFee: 7000,
      totalAmount: 40000,
      utmSource: 'facebook',
      utmCampaign: 'poultry_boost',
    };

    expect(isValidBdPhone(validPayload.phone)).toBe(true);
    expect(validPayload.items.length).toBeGreaterThan(0);
    expect(validPayload.totalAmount).toBe(validPayload.subtotal + validPayload.deliveryFee);
  });

  it('correctly formats WhatsApp message links in Bengali and English', () => {
    const phone = sanitizeBdPhone('01712984512');
    const customerName = 'Dr. Tariqul Islam';
    const productName = 'Renaflox 100ml';

    const bnMsg = `আসসালামু আলাইকুম ${customerName}, আপনি VetMart থেকে ${productName} অর্ডার শুরু করেছিলেন। আপনার অর্ডারটি কনফার্ম করতে বা কোনো পরামর্শের প্রয়োজন হলে আমাদের জানান। ধন্যবাদ!`;
    const encodedBn = encodeURIComponent(bnMsg);
    const waUrl = `https://wa.me/88${phone}?text=${encodedBn}`;

    expect(waUrl).toContain('wa.me/8801712984512');
    expect(waUrl).toContain(encodeURIComponent('VetMart'));
  });

  it('contains valid mock initial incomplete orders for demo experience', () => {
    expect(INITIAL_MOCK_INCOMPLETE_ORDERS.length).toBeGreaterThan(0);
    INITIAL_MOCK_INCOMPLETE_ORDERS.forEach((lead) => {
      expect(isValidBdPhone(lead.phone)).toBe(true);
      expect(lead.items.length).toBeGreaterThan(0);
      expect(lead.totalAmount).toBeGreaterThan(0);
      expect(['incomplete', 'contacted', 'converted', 'discarded']).toContain(lead.status);
    });
  });
});
