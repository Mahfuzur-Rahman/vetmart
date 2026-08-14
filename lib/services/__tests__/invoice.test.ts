// lib/services/__tests__/invoice.test.ts
import { describe, it, expect } from 'vitest';
import { renderInvoiceHtml, type InvoiceData } from '../invoice';

const SAMPLE_INVOICE: InvoiceData = {
  invoiceNo: 'INV-2608-4321',
  orderNo: 'ORD-2608-1234',
  date: new Date('2026-08-11'),
  customer: {
    name: 'Abdur Rahman',
    phone: '01712345678',
    address: 'Farm Road, House 12, Bogura Sadar, Bogura, Rajshahi',
  },
  items: [
    {
      nameEn: 'Enroflox Vet Oral Solution',
      nameBn: 'এনরোফ্লক্স ভেট ওরাল সলিউশন',
      genericName: 'Enrofloxacin',
      batchNo: 'BN-2026-001',
      expiryDate: new Date('2027-06-30'),
      qty: 2,
      unitPrice: 35000, // ৳350
      vatRate: '0',
      lineTotal: 70000,
      withdrawalMeatDays: 14,
      withdrawalMilkHours: 72,
    },
    {
      nameEn: 'Vitamin AD3E Injection',
      nameBn: 'ভিটামিন AD3E ইনজেকশন',
      genericName: null,
      batchNo: 'BN-2026-002',
      expiryDate: new Date('2027-12-31'),
      qty: 1,
      unitPrice: 25000, // ৳250
      vatRate: '0',
      lineTotal: 25000,
      withdrawalMeatDays: 0,
      withdrawalMilkHours: 0,
    },
  ],
  subtotal: 95000,
  discount: 5000,
  vat: 0,
  shipping: 13000,
  total: 103000,
  paymentMethod: 'cod',
  hasWithdrawalWarnings: true,
};

describe('Invoice HTML Renderer (§11)', () => {
  it('generates valid HTML with invoice number and order number', () => {
    const html = renderInvoiceHtml(SAMPLE_INVOICE);
    expect(html).toContain('INV-2608-4321');
    expect(html).toContain('ORD-2608-1234');
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('includes customer details in the invoice', () => {
    const html = renderInvoiceHtml(SAMPLE_INVOICE);
    expect(html).toContain('Abdur Rahman');
    expect(html).toContain('01712345678');
    expect(html).toContain('Bogura');
  });

  it('renders product line items with batch and expiry', () => {
    const html = renderInvoiceHtml(SAMPLE_INVOICE);
    expect(html).toContain('Enroflox Vet Oral Solution');
    expect(html).toContain('BN-2026-001');
    expect(html).toContain('Enrofloxacin');
    expect(html).toContain('Vitamin AD3E Injection');
  });

  it('renders the withdrawal period warning block when hasWithdrawalWarnings is true', () => {
    const html = renderInvoiceHtml(SAMPLE_INVOICE);
    expect(html).toContain('WITHDRAWAL PERIOD WARNING');
    expect(html).toContain('14 days');
    expect(html).toContain('72 hours');
    expect(html).toContain('drug residues harmful to consumers');
  });

  it('omits the withdrawal warning block when no items have withdrawal periods', () => {
    const noWarningInvoice: InvoiceData = {
      ...SAMPLE_INVOICE,
      hasWithdrawalWarnings: false,
      items: [SAMPLE_INVOICE.items[1]], // Only the vitamin with 0 withdrawal
    };
    const html = renderInvoiceHtml(noWarningInvoice);
    expect(html).not.toContain('WITHDRAWAL PERIOD WARNING');
  });

  it('formats monetary values in ৳ paisa-to-taka format', () => {
    const html = renderInvoiceHtml(SAMPLE_INVOICE);
    expect(html).toContain('৳950.00');  // subtotal
    expect(html).toContain('৳50.00');   // discount
    expect(html).toContain('৳130.00');  // shipping
    expect(html).toContain('৳1030.00'); // total
  });

  it('includes VetMart branding and footer', () => {
    const html = renderInvoiceHtml(SAMPLE_INVOICE);
    expect(html).toContain('VetMart');
    expect(html).toContain('BD');
    expect(html).toContain('support@vetmart.com.bd');
    expect(html).toContain('16624');
  });
});
