// components/admin/AdminReconciliationBoard.tsx
'use client';

import React, { useState } from 'react';
import { fmtMoney } from '@/lib/i18n/number';
import type { Locale } from '@/lib/i18n/config';

export type SettlementStatus = 'settled_in_bank' | 'pending_courier' | 'discrepancy';

export interface CourierSettlementRecord {
  id: string;
  orderNumber: string;
  consignmentId: string;
  courierName: string;
  customerName: string;
  customerPhone: string;
  bookedCodPaisa: number;
  collectedCodPaisa: number;
  deliveryFeePaisa: number;
  productCogsPaisa: number; // Cost of Goods Sold
  netDisbursementExpectedPaisa: number;
  settlementStatus: SettlementStatus;
  disbursementDate?: string;
  bankTrxId?: string;
  notes?: string;
}

const INITIAL_RECONCILIATION_DATA: CourierSettlementRecord[] = [
  {
    id: 'rec-1',
    orderNumber: 'VM-BD-98212',
    consignmentId: 'SF-449102-DH',
    courierName: 'Steadfast Courier',
    customerName: 'Tanvir Ahmed',
    customerPhone: '01911223344',
    bookedCodPaisa: 96000,
    collectedCodPaisa: 96000,
    deliveryFeePaisa: 7000,
    productCogsPaisa: 52000,
    netDisbursementExpectedPaisa: 89000, // ৳960 - ৳70 = ৳890
    settlementStatus: 'settled_in_bank',
    disbursementDate: '2026-08-12T11:30:00Z',
    bankTrxId: 'EBL-TRX-9921448',
    notes: 'Disbursed to EBL Corporate Account',
  },
  {
    id: 'rec-2',
    orderNumber: 'VM-BD-98213',
    consignmentId: 'SF-881290-DH',
    courierName: 'Steadfast Courier',
    customerName: 'Rahim Poultry & Dairy Farm',
    customerPhone: '01812998877',
    bookedCodPaisa: 184000,
    collectedCodPaisa: 184000,
    deliveryFeePaisa: 10000,
    productCogsPaisa: 115000,
    netDisbursementExpectedPaisa: 174000, // ৳1840 - ৳100 = ৳1740
    settlementStatus: 'pending_courier',
    notes: 'In Transit / Delivered, awaiting weekly Steadfast bank cycle',
  },
  {
    id: 'rec-3',
    orderNumber: 'VM-BD-98209',
    consignmentId: 'SF-119283-DH',
    courierName: 'Steadfast Courier',
    customerName: 'Dr. Rafiqul Islam',
    customerPhone: '01712334455',
    bookedCodPaisa: 245000,
    collectedCodPaisa: 245000,
    deliveryFeePaisa: 13000,
    productCogsPaisa: 160000,
    netDisbursementExpectedPaisa: 232000,
    settlementStatus: 'settled_in_bank',
    disbursementDate: '2026-08-10T14:00:00Z',
    bankTrxId: 'BKASH-CORP-48201',
  },
  {
    id: 'rec-4',
    orderNumber: 'VM-BD-98205',
    consignmentId: 'SF-662910-DH',
    courierName: 'Steadfast Courier',
    customerName: 'Alamgir Agro',
    customerPhone: '01611002233',
    bookedCodPaisa: 142000,
    collectedCodPaisa: 0, // Customer returned
    deliveryFeePaisa: 13000, // Return shipping loss charged by courier
    productCogsPaisa: 80000,
    netDisbursementExpectedPaisa: -13000, // Loss of return delivery fee
    settlementStatus: 'settled_in_bank',
    disbursementDate: '2026-08-09T16:00:00Z',
    notes: 'Customer refused parcel. Restocked in batch. Courier return charge deducted.',
  },
  {
    id: 'rec-5',
    orderNumber: 'VM-BD-98198',
    consignmentId: 'SF-773821-DH',
    courierName: 'Steadfast Courier',
    customerName: 'Motiur Dairy Farm',
    customerPhone: '01719887766',
    bookedCodPaisa: 195000,
    collectedCodPaisa: 175000, // Discrepancy: Courier collected ৳200 less
    deliveryFeePaisa: 13000,
    productCogsPaisa: 120000,
    netDisbursementExpectedPaisa: 162000,
    settlementStatus: 'discrepancy',
    notes: 'Discrepancy: Courier collection less than invoice. Ticket SF-TICK-881 opened.',
  },
];

interface Props {
  locale: string;
}

export function AdminReconciliationBoard({ locale }: Props) {
  const isBn = locale === 'bn';
  const [records, setRecords] = useState<CourierSettlementRecord[]>(INITIAL_RECONCILIATION_DATA);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<CourierSettlementRecord | null>(null);
  const [bankTrxInput, setBankTrxInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Financial aggregates
  const totalBookedCodPaisa = records.reduce((sum, r) => sum + r.bookedCodPaisa, 0);
  const totalCollectedCodPaisa = records.reduce((sum, r) => sum + r.collectedCodPaisa, 0);
  const totalDeliveryFeesPaisa = records.reduce((sum, r) => sum + r.deliveryFeePaisa, 0);
  const totalCogsPaisa = records.reduce((sum, r) => sum + r.productCogsPaisa, 0);
  
  // Pending disbursement from courier
  const pendingDisbursementPaisa = records
    .filter((r) => r.settlementStatus === 'pending_courier')
    .reduce((sum, r) => sum + r.netDisbursementExpectedPaisa, 0);

  // Total Settled in Bank
  const totalSettledPaisa = records
    .filter((r) => r.settlementStatus === 'settled_in_bank')
    .reduce((sum, r) => sum + r.netDisbursementExpectedPaisa, 0);

  // Estimated Net Profit = Collected COD - Delivery Fees - COGS
  const totalNetProfitPaisa = totalCollectedCodPaisa - totalDeliveryFeesPaisa - totalCogsPaisa;

  const handleUpdateStatus = (recordId: string, status: SettlementStatus, trxId?: string) => {
    const updated = records.map((r) => {
      if (r.id === recordId) {
        return {
          ...r,
          settlementStatus: status,
          bankTrxId: trxId || r.bankTrxId,
          disbursementDate: status === 'settled_in_bank' ? new Date().toISOString() : r.disbursementDate,
        };
      }
      return r;
    });

    setRecords(updated);
    if (selectedRecord && selectedRecord.id === recordId) {
      setSelectedRecord((prev) => (prev ? { ...prev, settlementStatus: status, bankTrxId: trxId || prev.bankTrxId } : null));
    }

    setToastMessage(
      isBn
        ? `কনসাইনমেন্ট #${recordId} স্ট্যাটাস '${status}' এ আপডেট হয়েছে`
        : `Settlement status updated to '${status}'`
    );
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredRecords =
    filterStatus === 'all'
      ? records
      : records.filter((r) => r.settlementStatus === filterStatus);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-semibold text-sm shadow-xl flex items-center justify-between animate-fade-in">
          <span>💰 {toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Executive Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Booked vs Collected COD */}
        <div className="p-5 rounded-2xl bg-white border border-[#EAEAEA] shadow-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-[#787774] uppercase tracking-wider">
              {isBn ? 'মোট বুকড বনাম সংগৃহীত সিওডি' : 'Booked vs Collected COD'}
            </span>
            <span className="text-xs">📦</span>
          </div>
          <div className="text-2xl font-black text-[#2F3437] font-display">
            {fmtMoney(totalCollectedCodPaisa, locale as Locale)}
          </div>
          <p className="text-[11px] text-[#787774] font-mono">
            Booked: {fmtMoney(totalBookedCodPaisa, locale as Locale)}
          </p>
        </div>

        {/* Pending Courier Payout */}
        <div className="p-5 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              {isBn ? 'কুরিয়ারে বকেয়া পাওনা' : 'Pending Courier Payout'}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-900 font-display">
            {fmtMoney(pendingDisbursementPaisa, locale as Locale)}
          </div>
          <p className="text-[11px] text-[#787774]">
            {isBn ? 'Steadfast থেকে ব্যাংক ট্রান্সফার বাকি' : 'Awaiting Steadfast disbursement'}
          </p>
        </div>

        {/* Settled in Bank */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            {isBn ? 'ব্যাংকে জমা হয়েছে' : 'Settled in Bank'}
          </span>
          <div className="text-2xl font-black text-emerald-900 font-display">
            {fmtMoney(totalSettledPaisa, locale as Locale)}
          </div>
          <p className="text-[11px] text-[#787774]">
            {isBn ? 'যাচাইকৃত নেট পেমেন্ট' : 'Verified net corporate bank deposits'}
          </p>
        </div>

        {/* Net Profit per Delivered Orders */}
        <div className="p-5 rounded-2xl bg-zinc-900 text-white shadow-xl space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              {isBn ? 'প্রকৃত নেট লাভ (COGS বাদে)' : 'True Net Profit (After COGS)'}
            </span>
            <span className="text-xs">📈</span>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-display">
            {fmtMoney(totalNetProfitPaisa, locale as Locale)}
          </div>
          <p className="text-[11px] text-zinc-400 font-mono">
            Fees: {fmtMoney(totalDeliveryFeesPaisa, locale as Locale)} | COGS: {fmtMoney(totalCogsPaisa, locale as Locale)}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-nowrap sm:flex-wrap w-full max-w-full touch-pan-x">
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'সকল রিকনসিলিয়েশন' : 'All Disbursements'} ({records.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('pending_courier')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            filterStatus === 'pending_courier'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
          }`}
        >
          {isBn ? '⏳ কুরিয়ারে বকেয়া' : '⏳ Pending Courier'} ({records.filter((r) => r.settlementStatus === 'pending_courier').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('settled_in_bank')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            filterStatus === 'settled_in_bank'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          {isBn ? '✓ ব্যাংকে জমাকৃত' : '✓ Settled in Bank'} ({records.filter((r) => r.settlementStatus === 'settled_in_bank').length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('discrepancy')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            filterStatus === 'discrepancy'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50'
          }`}
        >
          {isBn ? '⚠️ গরমিল / ডিসক্রিপেন্সি' : '⚠️ Discrepancy Alert'} ({records.filter((r) => r.settlementStatus === 'discrepancy').length})
        </button>
      </div>

      {/* Reconciliation Table */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full max-w-full touch-pan-x">
          <table className="min-w-[1000px] w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#787774] uppercase tracking-wider border-b border-[#EAEAEA] bg-[#FBFBFA]">
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'অর্ডার ও কনসাইনমেন্ট' : 'Order & Consignment'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'গ্রাহক' : 'Customer'}</th>
                <th className="px-5 py-3.5 font-semibold text-right">{isBn ? 'বুকড সিওডি' : 'Booked COD'}</th>
                <th className="px-5 py-3.5 font-semibold text-right">{isBn ? 'কুরিয়ার কালেকশন' : 'Collected COD'}</th>
                <th className="px-5 py-3.5 font-semibold text-right">{isBn ? 'কুরিয়ার চার্জ' : 'Courier Fee'}</th>
                <th className="px-5 py-3.5 font-semibold text-right">{isBn ? 'প্রত্যাশিত নেট পাওনা' : 'Net Expected'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'সেটেলমেন্ট স্ট্যাটাস' : 'Settlement Status'}</th>
                <th className="px-5 py-3.5 font-semibold text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-[#F9F9F8] transition-colors">
                  {/* Order & Consignment */}
                  <td className="px-5 py-3.5">
                    <div className="font-mono text-xs font-bold text-emerald-700">
                      {rec.orderNumber}
                    </div>
                    <div className="inline-flex items-center gap-1 text-[10px] font-mono text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded-sm mt-0.5">
                      <span>📦</span> {rec.consignmentId}
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-xs text-[#2F3437]">{rec.customerName}</div>
                    <div className="text-[11px] font-mono text-[#787774]">{rec.customerPhone}</div>
                  </td>

                  {/* Booked COD */}
                  <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-gray-600">
                    ৳{(rec.bookedCodPaisa / 100).toFixed(2)}
                  </td>

                  {/* Collected COD */}
                  <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-[#2F3437]">
                    ৳{(rec.collectedCodPaisa / 100).toFixed(2)}
                  </td>

                  {/* Courier Fee */}
                  <td className="px-5 py-3.5 text-right font-mono text-xs text-rose-700 font-semibold">
                    -৳{(rec.deliveryFeePaisa / 100).toFixed(2)}
                  </td>

                  {/* Net Expected */}
                  <td className="px-5 py-3.5 text-right font-mono text-xs font-extrabold text-emerald-800">
                    ৳{(rec.netDisbursementExpectedPaisa / 100).toFixed(2)}
                  </td>

                  {/* Status Badge */}
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                        rec.settlementStatus === 'settled_in_bank'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : rec.settlementStatus === 'pending_courier'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                      }`}
                    >
                      <span>
                        {rec.settlementStatus === 'settled_in_bank'
                          ? '✓'
                          : rec.settlementStatus === 'pending_courier'
                          ? '⏳'
                          : '⚠️'}
                      </span>
                      <span>
                        {rec.settlementStatus === 'settled_in_bank'
                          ? 'Settled in Bank'
                          : rec.settlementStatus === 'pending_courier'
                          ? 'Pending Courier'
                          : 'Discrepancy'}
                      </span>
                    </span>
                    {rec.bankTrxId && (
                      <div className="text-[9px] font-mono text-gray-500 mt-0.5">
                        Trx: {rec.bankTrxId}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                    {rec.settlementStatus !== 'settled_in_bank' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecord(rec);
                          setBankTrxInput('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        ✓ {isBn ? 'সেটেল করুন' : 'Settle'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(rec)}
                      className="px-2.5 py-1 rounded-lg bg-[#F7F6F3] hover:bg-[#EAEAEA] border border-[#EAEAEA] text-[#2F3437] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {isBn ? 'বিস্তারিত' : 'Details'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settlement Detail & Action Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#2F3437]">
                  {isBn ? 'কুরিয়ার পেমেন্ট রিকনসিলিয়েশন' : 'Courier Reconciliation Details'}
                </h3>
                <p className="text-xs text-[#787774] font-mono">
                  Invoice #{selectedRecord.orderNumber} ({selectedRecord.consignmentId})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-[#787774] hover:text-[#2F3437] text-sm font-bold p-1 rounded-lg hover:bg-[#F7F6F3] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Financial Math Breakdown */}
              <div className="p-4 rounded-2xl bg-[#F7F6F3] border border-[#EAEAEA] space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-[#787774]">Booked COD Value:</span>
                  <span className="font-bold text-[#2F3437]">৳{(selectedRecord.bookedCodPaisa / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#787774]">Courier Collected Amount:</span>
                  <span className="font-bold text-[#2F3437]">৳{(selectedRecord.collectedCodPaisa / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Steadfast Delivery Fee:</span>
                  <span>-৳{(selectedRecord.deliveryFeePaisa / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Product COGS (Cost):</span>
                  <span>-৳{(selectedRecord.productCogsPaisa / 100).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-[#EAEAEA] flex justify-between font-bold text-sm text-emerald-800">
                  <span>Net Profit Contribution:</span>
                  <span>
                    ৳{((selectedRecord.collectedCodPaisa - selectedRecord.deliveryFeePaisa - selectedRecord.productCogsPaisa) / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedRecord.notes && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  <span className="font-bold block text-[10px] uppercase">Notes / Auditor Remarks:</span>
                  <p className="text-xs mt-0.5">{selectedRecord.notes}</p>
                </div>
              )}

              {/* Settlement Trx Form */}
              <div className="space-y-2 pt-2 border-t border-[#EAEAEA]">
                <label className="font-bold text-[#2F3437] block">
                  {isBn ? 'ব্যাংক ট্রান্সফার রেফারেন্স / TrxID:' : 'Bank Transfer Reference / TrxID:'}
                </label>
                <input
                  type="text"
                  value={bankTrxInput}
                  onChange={(e) => setBankTrxInput(e.target.value)}
                  placeholder="e.g. EBL-DEP-994812 or BKASH-CORP-4481"
                  className="w-full p-2.5 rounded-xl border border-input text-xs font-mono bg-background outline-hidden"
                />
              </div>

              {/* Quick Status Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedRecord.id, 'settled_in_bank', bankTrxInput)}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  ✓ Mark Settled
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedRecord.id, 'pending_courier')}
                  className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  ⏳ Set Pending
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedRecord.id, 'discrepancy')}
                  className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  ⚠️ Discrepancy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
