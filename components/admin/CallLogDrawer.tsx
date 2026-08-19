// components/admin/CallLogDrawer.tsx
'use client';

import React, { useState } from 'react';
import type { CourierFraudReport } from '@/lib/courier/fraud-check';

export type CallOutcome =
  | 'confirmed'
  | 'advance_required'
  | 'follow_up'
  | 'invalid_number'
  | 'cancelled';

export interface CallLogEntry {
  id: string;
  timestamp: string;
  operator: string;
  outcome: CallOutcome;
  note: string;
  durationSeconds?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone: string;
  orderNumber?: string;
  deliveryAddress?: string;
  totalAmountPaisa: number;
  fraudReport?: CourierFraudReport | null;
  existingLogs?: CallLogEntry[];
  onAddLog: (entry: CallLogEntry) => void;
  onUpdateStatus?: (outcome: CallOutcome) => void;
  locale: string;
}

const OUTCOMES: { key: CallOutcome; labelEn: string; labelBn: string; color: string }[] = [
  { key: 'confirmed', labelEn: 'Confirmed Order', labelBn: 'অর্ডার নিশ্চিত করেছে', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  { key: 'advance_required', labelEn: 'Advance Fee Required', labelBn: 'অগ্রিম ফি চাওয়া হয়েছে', color: 'bg-amber-50 text-amber-800 border-amber-300' },
  { key: 'follow_up', labelEn: 'Follow-up Needed', labelBn: 'পরে কল করতে হবে', color: 'bg-sky-50 text-sky-700 border-sky-300' },
  { key: 'invalid_number', labelEn: 'No Answer / Invalid', labelBn: 'ফোন ধরেনি / বন্ধ', color: 'bg-purple-50 text-purple-700 border-purple-300' },
  { key: 'cancelled', labelEn: 'Cancelled / Fake', labelBn: 'অর্ডার বাতিল চেয়েছে', color: 'bg-rose-50 text-rose-700 border-rose-300' },
];

export function CallLogDrawer({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  orderNumber,
  deliveryAddress,
  totalAmountPaisa,
  fraudReport,
  existingLogs = [],
  onAddLog,
  onUpdateStatus,
  locale,
}: Props) {
  const isBn = locale === 'bn';
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome>('confirmed');
  const [noteText, setNoteText] = useState('');
  const [isCalling, setIsCalling] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutcome) return;

    const newEntry: CallLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      operator: 'Admin / Tele-Sales',
      outcome: selectedOutcome,
      note: noteText.trim() || (isBn ? 'কল সম্পন্ন হয়েছে' : 'Call completed'),
    };

    onAddLog(newEntry);
    if (onUpdateStatus) {
      onUpdateStatus(selectedOutcome);
    }
    setNoteText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl border-l border-[#EAEAEA] animate-slide-left">
        {/* Header */}
        <div className="p-5 border-b border-[#EAEAEA] flex items-center justify-between bg-[#FBFBFA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-sky-600/20">
              📞
            </div>
            <div>
              <h3 className="font-bold text-base text-[#2F3437]">
                {isBn ? 'টেলি-সেলস ও কল লগ' : 'Tele-Sales Call Cockpit'}
              </h3>
              <p className="text-xs text-[#787774] font-mono">
                {orderNumber ? `Order #${orderNumber}` : customerPhone}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#EAEAEA] text-[#787774] font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Customer & Call Banner */}
          <div className="p-4 rounded-2xl bg-[#F7F6F3] border border-[#EAEAEA] space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#787774] block tracking-wider">
                  {isBn ? 'গ্রাহকের তথ্য' : 'Customer Info'}
                </span>
                <span className="text-sm font-black text-[#2F3437] block mt-0.5">
                  {customerName}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700 block mt-0.5">
                  📱 {customerPhone}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#787774] font-bold uppercase block">
                  {isBn ? 'মোট মূল্য' : 'Order Total'}
                </span>
                <span className="text-sm font-black font-mono text-emerald-800 block">
                  ৳{(totalAmountPaisa / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {deliveryAddress && (
              <div className="text-[11px] text-[#5F6368] pt-2 border-t border-[#EAEAEA]">
                📍 {deliveryAddress}
              </div>
            )}

            {/* Direct Call Trigger */}
            <div className="pt-2">
              <a
                href={`tel:${customerPhone}`}
                onClick={() => setIsCalling(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <span>📞</span>
                <span>{isBn ? 'সরাসরি ফোন কল দিন' : 'Call Customer Now'}</span>
              </a>
            </div>
          </div>

          {/* Fraud Risk Indicator if available */}
          {fraudReport && (
            <div
              className={`p-3.5 rounded-2xl border ${
                fraudReport.riskLevel === 'high'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : fraudReport.riskLevel === 'medium'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              } space-y-1`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <span>{fraudReport.riskLevel === 'high' ? '⚠️' : '🛡️'}</span>
                  <span>{isBn ? 'কুরিয়ার ডেলিভারি সাকসেস রেট' : 'Courier Delivery Record'}</span>
                </span>
                <span className="font-mono text-xs font-black">
                  {fraudReport.successRate}%
                </span>
              </div>
              <p className="text-[11px] font-medium leading-relaxed">
                {isBn ? fraudReport.riskReasonBn : fraudReport.riskReason}
              </p>
              <div className="text-[10px] font-mono text-gray-600 pt-1 flex justify-between">
                <span>Delivered: {fraudReport.deliveredParcels}/{fraudReport.totalParcels}</span>
                <span>Cancelled: {fraudReport.cancelledParcels}</span>
              </div>
            </div>
          )}

          {/* Call Logging Form */}
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <label className="font-bold text-[#2F3437] block mb-2">
                {isBn ? 'কলের ফলাফল নির্বাচন করুন:' : 'Select Call Outcome:'}
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {OUTCOMES.map((oc) => (
                  <button
                    key={oc.key}
                    type="button"
                    onClick={() => setSelectedOutcome(oc.key)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedOutcome === oc.key
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs font-bold text-emerald-900'
                        : 'border-[#EAEAEA] bg-white hover:bg-[#F7F6F3] text-[#5F6368]'
                    }`}
                  >
                    <span className="text-xs font-semibold">
                      {isBn ? oc.labelBn : oc.labelEn}
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        selectedOutcome === oc.key
                          ? 'border-emerald-600 bg-emerald-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedOutcome === oc.key && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#2F3437] block">
                {isBn ? 'অভ্যন্তরীণ নোট বা মন্তব্য:' : 'Internal Call Notes / Remarks:'}
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                placeholder={
                  isBn
                    ? 'যেমন: খামারি আগামী সোমবার পার্সেল রিসিভ করতে চেয়েছেন...'
                    : 'E.g., Customer confirmed 2 packs, requested delivery by Monday morning...'
                }
                className="w-full p-2.5 rounded-xl border border-input text-xs font-medium text-foreground bg-background outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              💾 {isBn ? 'কল লগ সংরক্ষণ করুন' : 'Save Call Log & Update Status'}
            </button>
          </form>

          {/* Past Call History */}
          {existingLogs.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-[#EAEAEA]">
              <span className="font-bold text-[#787774] uppercase text-[10px] tracking-wider block">
                {isBn ? 'পূর্ববর্তী কলের ইতিহাস' : 'Call History Timeline'}
              </span>
              <div className="space-y-2">
                {existingLogs.map((log) => {
                  const matchOutcome = OUTCOMES.find((o) => o.key === log.outcome);
                  return (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-[#FBFBFA] border border-[#EAEAEA] space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase ${
                            matchOutcome?.color || 'bg-gray-100'
                          }`}
                        >
                          {isBn ? matchOutcome?.labelBn : matchOutcome?.labelEn}
                        </span>
                        <span className="text-[10px] text-[#787774] font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-[#2F3437] font-medium leading-tight">
                        {log.note}
                      </p>
                      <span className="text-[9px] text-[#787774] block">
                        by {log.operator}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
