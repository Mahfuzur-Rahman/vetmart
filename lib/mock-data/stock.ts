// lib/mock-data/stock.ts

export interface StockLedgerEntry {
  id: string;
  productId: string;
  productNameEn: string;
  productNameBn: string;
  batchId: string;
  batchNo: string;
  delta: number;
  reason: 'purchase' | 'customer_order' | 'adjustment' | 'expiry_damage';
  refType: 'initial_seed' | 'order_fulfill' | 'manual_audit';
  refId: string;
  createdAt: string;
  createdByName: string;
}

export const MOCK_STOCK_LEDGER: StockLedgerEntry[] = [
  {
    id: 'stk-1',
    productId: 'prod-1',
    productNameEn: 'Renaflox 100ml Oral Solution',
    productNameBn: 'রেনাফ্লক্স ১০০মি.লি. ওরাল সলিউশন',
    batchId: 'btch-01',
    batchNo: 'B-REN-8912',
    delta: 500,
    reason: 'purchase',
    refType: 'initial_seed',
    refId: 'PO-REN-2026-01',
    createdAt: '2026-08-01T09:00:00Z',
    createdByName: 'Inventory Manager',
  },
  {
    id: 'stk-2',
    productId: 'prod-1',
    productNameEn: 'Renaflox 100ml Oral Solution',
    productNameBn: 'রেনাফ্লক্স ১০০মি.লি. ওরাল সলিউশন',
    batchId: 'btch-01',
    batchNo: 'B-REN-8912',
    delta: -5,
    reason: 'customer_order',
    refType: 'order_fulfill',
    refId: 'VM-BD-98214',
    createdAt: '2026-08-11T14:35:00Z',
    createdByName: 'Order Operations',
  },
  {
    id: 'stk-3',
    productId: 'prod-2',
    productNameEn: 'Rena-WS 100g Soluble Powder',
    productNameBn: 'রেনা-ডব্লিউএস ১০০গ্রাম পাউডার',
    batchId: 'btch-02',
    batchNo: 'B-RWS-4410',
    delta: 1000,
    reason: 'purchase',
    refType: 'initial_seed',
    refId: 'PO-RWS-2026-02',
    createdAt: '2026-08-02T10:00:00Z',
    createdByName: 'Inventory Manager',
  },
  {
    id: 'stk-4',
    productId: 'prod-2',
    productNameEn: 'Rena-WS 100g Soluble Powder',
    productNameBn: 'রেনা-ডব্লিউএস ১০০গ্রাম পাউডার',
    batchId: 'btch-02',
    batchNo: 'B-RWS-4410',
    delta: -10,
    reason: 'customer_order',
    refType: 'order_fulfill',
    refId: 'VM-BD-98213',
    createdAt: '2026-08-11T11:00:00Z',
    createdByName: 'Order Operations',
  },
  {
    id: 'stk-5',
    productId: 'prod-3',
    productNameEn: 'Acimec 1% Injection 10ml',
    productNameBn: 'এসিমেক ১% ইনজেকশন ১০মি.লি.',
    batchId: 'btch-03',
    batchNo: 'B-ACM-2201',
    delta: 350,
    reason: 'purchase',
    refType: 'initial_seed',
    refId: 'PO-ACM-2026-01',
    createdAt: '2026-08-01T11:00:00Z',
    createdByName: 'Inventory Manager',
  },
];
