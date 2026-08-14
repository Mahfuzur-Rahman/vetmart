// lib/services/invoice.ts
// Invoice HTML generation with withdrawal period warnings (§11)
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, orderItems, invoices } from '@/lib/db/schema';

export interface InvoiceData {
  invoiceNo: string;
  orderNo: string;
  date: Date;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  items: Array<{
    nameEn: string;
    nameBn: string;
    genericName: string | null;
    batchNo: string;
    expiryDate: Date;
    qty: number;
    unitPrice: number;
    vatRate: string;
    lineTotal: number;
    withdrawalMeatDays?: number;
    withdrawalMilkHours?: number;
  }>;
  subtotal: number;
  discount: number;
  vat: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  hasWithdrawalWarnings: boolean;
}

/**
 * Build invoice data from an order ID.
 */
export async function buildInvoiceData(orderId: string): Promise<InvoiceData | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return null;

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.orderId, orderId))
    .limit(1);

  if (!invoice) return null;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const addr = order.addressSnapshot as any;
  let hasWithdrawalWarnings = false;

  const invoiceItems = items.map((item) => {
    const meatDays = (item as any).withdrawalMeatDays ?? 0;
    const milkHours = (item as any).withdrawalMilkHours ?? 0;
    if (meatDays > 0 || milkHours > 0) hasWithdrawalWarnings = true;

    return {
      nameEn: item.nameSnapshotEn,
      nameBn: item.nameSnapshotBn,
      genericName: item.genericSnapshot,
      batchNo: item.batchNo,
      expiryDate: item.expiryDate,
      qty: item.qty,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      lineTotal: item.lineTotal,
      withdrawalMeatDays: meatDays,
      withdrawalMilkHours: milkHours,
    };
  });

  return {
    invoiceNo: invoice.invoiceNo,
    orderNo: order.orderNo,
    date: order.placedAt,
    customer: {
      name: addr?.recipientName ?? '',
      phone: addr?.phone ?? '',
      address: [addr?.addressLine, addr?.area, addr?.upazila, addr?.district, addr?.division]
        .filter(Boolean)
        .join(', '),
    },
    items: invoiceItems,
    subtotal: order.subtotal,
    discount: order.discount,
    vat: order.vat,
    shipping: order.shipping,
    total: order.total,
    paymentMethod: order.paymentMethod,
    hasWithdrawalWarnings,
  };
}

/**
 * Render invoice HTML for PDF conversion (§11).
 * Includes withdrawal period warnings for food-producing animals.
 */
export function renderInvoiceHtml(data: InvoiceData): string {
  const fmtTk = (paisa: number) => `৳${(paisa / 100).toFixed(2)}`;
  const fmtDate = (d: Date) => new Date(d).toLocaleDateString('en-BD', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  const itemRows = data.items.map((item) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:12px;">
        <strong>${item.nameEn}</strong><br/>
        <span style="color:#6b7280;font-size:11px;">${item.nameBn}</span>
        ${item.genericName ? `<br/><span style="color:#059669;font-size:10px;font-family:monospace;">Gen: ${item.genericName}</span>` : ''}
      </td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:11px;font-family:monospace;">${item.batchNo}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:11px;">${fmtDate(item.expiryDate)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:12px;">${item.qty}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:12px;font-family:monospace;">${fmtTk(item.unitPrice)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:12px;font-family:monospace;font-weight:bold;">${fmtTk(item.lineTotal)}</td>
    </tr>
  `).join('');

  const withdrawalRows = data.items
    .filter((i) => i.withdrawalMeatDays! > 0 || i.withdrawalMilkHours! > 0)
    .map((item) => `
      <tr>
        <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #fde68a;">${item.nameEn}</td>
        <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #fde68a;text-align:center;font-weight:bold;">${item.withdrawalMeatDays} days</td>
        <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #fde68a;text-align:center;font-weight:bold;">${item.withdrawalMilkHours} hours</td>
      </tr>
    `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${data.invoiceNo}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; margin: 0; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .brand { font-size: 24px; font-weight: 800; color: #059669; }
    .brand span { color: #1f2937; }
    table { width: 100%; border-collapse: collapse; }
    .totals td { padding: 6px 8px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand"><span>VetMart</span>BD</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Veterinary E-Commerce Platform</div>
      <div style="font-size:11px;color:#6b7280;">Level 4, VetMart Tower, Uttara, Dhaka-1230</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:800;">INVOICE</div>
      <div style="font-size:13px;font-family:monospace;color:#059669;margin-top:4px;">${data.invoiceNo}</div>
      <div style="font-size:11px;color:#6b7280;">Order: ${data.orderNo}</div>
      <div style="font-size:11px;color:#6b7280;">Date: ${fmtDate(data.date)}</div>
    </div>
  </div>

  <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
    <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Bill To</div>
    <div style="font-size:14px;font-weight:700;">${data.customer.name}</div>
    <div style="font-size:12px;color:#4b5563;">${data.customer.phone}</div>
    <div style="font-size:12px;color:#4b5563;">${data.customer.address}</div>
  </div>

  <table>
    <thead>
      <tr style="background:#f3f4f6;">
        <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;">Product</th>
        <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;">Batch</th>
        <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;">Expiry</th>
        <th style="padding:8px;text-align:center;font-size:11px;text-transform:uppercase;color:#6b7280;">Qty</th>
        <th style="padding:8px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280;">Unit Price</th>
        <th style="padding:8px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-top:16px;">
    <table style="width:280px;" class="totals">
      <tr>
        <td style="color:#6b7280;">Subtotal</td>
        <td style="text-align:right;font-family:monospace;">${fmtTk(data.subtotal)}</td>
      </tr>
      ${data.discount > 0 ? `<tr><td style="color:#059669;">Discount</td><td style="text-align:right;font-family:monospace;color:#059669;">-${fmtTk(data.discount)}</td></tr>` : ''}
      <tr>
        <td style="color:#6b7280;">VAT</td>
        <td style="text-align:right;font-family:monospace;">${fmtTk(data.vat)}</td>
      </tr>
      <tr>
        <td style="color:#6b7280;">Shipping</td>
        <td style="text-align:right;font-family:monospace;">${fmtTk(data.shipping)}</td>
      </tr>
      <tr style="border-top:2px solid #1f2937;">
        <td style="font-weight:800;font-size:15px;padding-top:8px;">Total</td>
        <td style="text-align:right;font-family:monospace;font-weight:800;font-size:15px;padding-top:8px;">${fmtTk(data.total)}</td>
      </tr>
    </table>
  </div>

  <div style="margin-top:16px;font-size:11px;color:#6b7280;">
    Payment Method: <strong>${data.paymentMethod.toUpperCase()}</strong>
  </div>

  ${data.hasWithdrawalWarnings ? `
  <div style="margin-top:32px;border:2px solid #f59e0b;border-radius:8px;padding:16px;background:#fffbeb;">
    <div style="font-weight:800;color:#92400e;font-size:13px;margin-bottom:8px;">
      ⚠️ WITHDRAWAL PERIOD WARNING — Food Safety
    </div>
    <p style="font-size:11px;color:#78350f;margin:0 0 12px 0;">
      The following products have mandatory withdrawal periods. Meat and milk from treated animals 
      must NOT be used for human consumption until the withdrawal period has elapsed. 
      Failure to observe withdrawal periods may result in drug residues harmful to consumers.
    </p>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#fef3c7;">
          <th style="padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#92400e;">Product</th>
          <th style="padding:6px 8px;text-align:center;font-size:10px;text-transform:uppercase;color:#92400e;">Meat Withdrawal</th>
          <th style="padding:6px 8px;text-align:center;font-size:10px;text-transform:uppercase;color:#92400e;">Milk Withdrawal</th>
        </tr>
      </thead>
      <tbody>
        ${withdrawalRows}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center;">
    <p>This is a computer-generated invoice. VetMart BD — DGDA Licensed Veterinary E-Commerce Platform.</p>
    <p>For queries, contact support@vetmart.com.bd | Helpline: 16624</p>
  </div>
</body>
</html>`;
}
