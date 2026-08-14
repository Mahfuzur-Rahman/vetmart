'use client';

import { useState } from 'react';
import { MOCK_PRESCRIPTIONS, type MockPrescription } from '@/lib/mock-data/prescriptions';

interface Props {
  locale: string;
}

export function AdminPrescriptionsQueue({ locale }: Props) {
  const isBn = locale === 'bn';
  const [prescriptions, setPrescriptions] = useState<MockPrescription[]>(MOCK_PRESCRIPTIONS);
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
              reviewedBy: 'Registered Pharmacist (pharmacist@vetmart.bd)',
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
              reviewedBy: 'Registered Pharmacist (pharmacist@vetmart.bd)',
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
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'পেন্ডিং রিভিউ' : 'Pending Review'} ({prescriptions.filter((r) => r.status === 'pending').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('approved')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            activeTab === 'approved'
              ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'অনুমোদিত' : 'Approved'} ({prescriptions.filter((r) => r.status === 'approved').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rejected')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            activeTab === 'rejected'
              ? 'bg-rose-600 text-white font-bold border-rose-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'প্রত্যাখ্যাত' : 'Rejected'} ({prescriptions.filter((r) => r.status === 'rejected').length})
        </button>
      </div>

      {/* Prescriptions Table */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#787774] uppercase tracking-wider border-b border-[#EAEAEA] bg-[#FBFBFA]">
                <th className="px-5 py-3.5 font-semibold">Order #</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'গ্রাহক' : 'Customer'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'ভেটেরিনারি সার্জন' : 'Vet Surgeon'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'BVC নম্বর' : 'BVC Reg. No'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'প্রজাতি' : 'Species'}</th>
                <th className="px-5 py-3.5 font-semibold text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]">
              {filtered.length > 0 ? (
                filtered.map((rx) => (
                  <tr key={rx.id} className="hover:bg-[#F9F9F8] transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-emerald-700">
                      #{rx.orderNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-[#2F3437] text-xs">{rx.customerName}</div>
                      <div className="text-[11px] text-[#787774] font-mono">{rx.customerPhone}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#2F3437] font-medium">
                      {rx.vetName}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-emerald-800 font-bold">
                      {rx.bvcRegNo}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#787774]">
                      {rx.species}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedRx(rx)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs"
                      >
                        {isBn ? 'রিভিউ করুন 🔍' : 'Review Rx 🔍'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[#787774] text-xs">
                    <div className="space-y-2">
                      <div className="text-3xl">✅</div>
                      <p>{isBn ? 'এই ক্যাটাগরিতে কোনো প্রেসক্রিপশন নেই' : 'No prescriptions found in this tab'}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prescription Review Lightbox Modal */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#2F3437]">
                  Order #{selectedRx.orderNumber} — Prescription Review
                </h3>
                <p className="text-xs text-emerald-700 font-mono">
                  {selectedRx.vetName} ({selectedRx.bvcRegNo})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRx(null)}
                className="text-[#787774] hover:text-[#2F3437] text-sm font-bold p-1 rounded-lg hover:bg-[#F7F6F3]"
              >
                ✕
              </button>
            </div>

            {/* Prescription Document Preview */}
            <div className="w-full h-80 rounded-2xl bg-[#F7F6F3] border border-[#EAEAEA] overflow-hidden relative p-2">
              <img
                src={selectedRx.rxImageUrl}
                alt="Uploaded Prescription"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Approval Controls */}
            {selectedRx.status === 'pending' ? (
              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={() => handleReject(selectedRx.id)}
                  className="px-5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs transition-all"
                >
                  ✕ {isBn ? 'বাতিল করুন' : 'Reject Prescription'}
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(selectedRx.id)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  ✓ {isBn ? 'অনুমোদন করুন' : 'Approve Prescription'}
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] text-xs text-[#2F3437] font-mono">
                Status: <span className="font-bold uppercase text-emerald-700">{selectedRx.status}</span> | Reviewed by {selectedRx.reviewedBy}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
