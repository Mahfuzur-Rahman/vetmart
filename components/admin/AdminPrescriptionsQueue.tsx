'use client';

import { useState } from 'react';

export interface MockPrescription {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  vetName: string;
  bvcRegNo: string;
  species: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  rxImageUrl: string;
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

interface Props {
  locale: string;
  initialPrescriptions?: MockPrescription[];
}

export function AdminPrescriptionsQueue({ locale, initialPrescriptions = [] }: Props) {
  const isBn = locale === 'bn';
  const [prescriptions, setPrescriptions] = useState<MockPrescription[]>(initialPrescriptions);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRx, setSelectedRx] = useState<MockPrescription | null>(null);

  const filtered = prescriptions.filter((rx) => rx.status === activeTab);

  const handleApprove = (id: string) => {
    setPrescriptions((prev) =>
      prev.map((rx) =>
        rx.id === id
          ? {
              ...rx,
              status: 'approved',
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'Registered Pharmacist',
            }
          : rx
      )
    );
    setSelectedRx(null);
  };

  const handleReject = (id: string) => {
    setPrescriptions((prev) =>
      prev.map((rx) =>
        rx.id === id
          ? {
              ...rx,
              status: 'rejected',
              rejectionReason: 'Invalid BVC registration number or signature seal missing',
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'Registered Pharmacist',
            }
          : rx
      )
    );
    setSelectedRx(null);
  };

  return (
    <div className="space-y-6">
      {/* Review Status Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-600 text-white font-bold border-amber-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:bg-[#F7F6F3]'
          }`}
        >
          ⏱️ {isBn ? 'রিভিউ পেন্ডিং' : 'Pending Review'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('approved')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            activeTab === 'approved'
              ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:bg-[#F7F6F3]'
          }`}
        >
          ✅ {isBn ? 'অনুমোদিত' : 'Approved'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rejected')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            activeTab === 'rejected'
              ? 'bg-rose-600 text-white font-bold border-rose-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:bg-[#F7F6F3]'
          }`}
        >
          ❌ {isBn ? 'বাতিলকৃত' : 'Rejected'}
        </button>
      </div>

      {/* Prescription Queue List */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAEAEA] bg-[#FBFBFA] flex items-center justify-between">
          <h2 className="font-bold text-sm text-[#2F3437]">
            {isBn ? 'প্রেসক্রিপশন ভেরিফিকেশন কিউ' : 'Prescription Verification Queue'}
          </h2>
          <span className="text-xs text-amber-700 font-mono font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            Rx §5.5
          </span>
        </div>

        <div className="divide-y divide-[#EAEAEA]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#787774]">
              {isBn ? 'এই ক্যাটাগরিতে কোনো প্রেসক্রিপশন নেই।' : 'No prescriptions in this queue.'}
            </div>
          ) : (
            filtered.map((rx) => (
              <div key={rx.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#F9F9F8] transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-700">{rx.orderNumber}</span>
                    <span className="text-xs font-bold text-[#2F3437]">{rx.customerName}</span>
                    <span className="text-xs text-[#787774]">({rx.customerPhone})</span>
                  </div>
                  <div className="text-xs text-[#5F6368] flex items-center gap-2">
                    <span>👨‍⚕️ {rx.vetName}</span>
                    <span className="font-mono text-[11px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {rx.bvcRegNo}
                    </span>
                    <span>🐾 {rx.species}</span>
                  </div>
                  <div className="text-[11px] text-[#9AA0A6]">
                    {new Date(rx.uploadedAt).toLocaleString(isBn ? 'bn-BD' : 'en-BD')}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedRx(rx)}
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-[#F7F6F3] hover:bg-[#EAEAEA] text-[#2F3437] text-xs font-semibold border border-[#EAEAEA] transition-colors cursor-pointer"
                  >
                    🔍 {isBn ? 'ছবি দেখুন' : 'View Rx'}
                  </button>
                  {rx.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(rx.id)}
                        className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        ✅ {isBn ? 'অনুমোদন' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(rx.id)}
                        className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
                      >
                        ❌ {isBn ? 'বাতিল' : 'Reject'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Preview */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
              <h3 className="font-bold text-sm text-[#2F3437]">
                {isBn ? 'প্রেসক্রিপশন পর্যালোচনা' : 'Review Prescription'} — {selectedRx.orderNumber}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRx(null)}
                className="text-[#787774] hover:text-[#2F3437] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#F7F6F3] border border-[#EAEAEA]">
              <img
                src={selectedRx.rxImageUrl}
                alt="Prescription"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRx(null)}
                className="px-4 py-2 rounded-xl border border-[#EAEAEA] text-xs font-semibold text-[#5F6368] hover:bg-[#F7F6F3]"
              >
                {isBn ? 'বন্ধ করুন' : 'Close'}
              </button>
              {selectedRx.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleReject(selectedRx.id)}
                    className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100"
                  >
                    {isBn ? 'বাতিল করুন' : 'Reject Rx'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedRx.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
                  >
                    {isBn ? 'অনুমোদন দিন' : 'Approve Rx'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
