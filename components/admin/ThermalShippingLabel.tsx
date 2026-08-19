// components/admin/ThermalShippingLabel.tsx
'use client';

import React from 'react';

export interface LabelOrderItem {
  productName: string;
  quantity: number;
  batchNo?: string;
}

export interface ThermalLabelData {
  orderNumber: string;
  consignmentId: string;
  trackingCode: string;
  courierName?: string;
  customerName: string;
  customerPhone: string;
  recipientAddress: string;
  district: string;
  division: string;
  totalAmount: number; // in integer paisa
  paymentMethod: string;
  paymentStatus: string;
  items: LabelOrderItem[];
  createdAt?: string;
}

interface Props {
  labels: ThermalLabelData[];
  onClose?: () => void;
}

/**
 * Generates deterministic SVG Barcode bars for Code 128 simulation
 */
function SimpleBarcode({ value }: { value: string }) {
  // Generate consistent bar widths from string characters
  const bars: { width: number; isSpace: boolean }[] = [];
  const cleanVal = (value || 'VM-000000').toUpperCase().replace(/[^A-Z0-9-]/g, '');

  for (let i = 0; i < cleanVal.length; i++) {
    const code = cleanVal.charCodeAt(i);
    bars.push({ width: (code % 3) + 1.5, isSpace: false });
    bars.push({ width: (code % 2) + 1.2, isSpace: true });
    bars.push({ width: ((code * 3) % 4) + 1.5, isSpace: false });
    bars.push({ width: 1.5, isSpace: true });
  }

  // Calculate total width
  const totalWidth = bars.reduce((acc, b) => acc + b.width, 0);

  let currentX = 10;
  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${totalWidth + 20} 55`}
        className="w-full h-14"
        preserveAspectRatio="none"
      >
        {bars.map((bar, idx) => {
          const x = currentX;
          currentX += bar.width;
          if (bar.isSpace) return null;
          return (
            <rect
              key={idx}
              x={x}
              y="0"
              width={bar.width}
              height="55"
              fill="#000000"
            />
          );
        })}
      </svg>
      <span className="font-mono text-xs font-black tracking-widest mt-0.5 text-black">
        *{cleanVal}*
      </span>
    </div>
  );
}

export function ThermalShippingLabelModal({ labels, onClose }: Props) {
  const handlePrint = () => {
    window.print();
  };

  if (!labels || labels.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 overflow-y-auto">
      {/* Modal Actions Bar (hidden on print) */}
      <div className="w-full max-w-2xl bg-white border border-[#EAEAEA] rounded-2xl p-4 mb-4 flex items-center justify-between shadow-2xl print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            🖨️
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#2F3437]">
              Thermal Shipping Labels (4" × 6" / 100mm × 150mm)
            </h3>
            <p className="text-xs text-[#787774]">
              {labels.length} {labels.length === 1 ? 'label' : 'labels'} ready for thermal printing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>🖨️</span> Print Labels
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-[#F7F6F3] hover:bg-[#EAEAEA] text-[#2F3437] text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="max-h-[85vh] overflow-y-auto p-4 space-y-6 print:p-0 print:m-0 print:max-h-none print:overflow-visible">
        {labels.map((label, index) => {
          const isPrepaid = label.paymentStatus === 'paid' && label.paymentMethod !== 'cod';
          const codTaka = isPrepaid ? 0 : label.totalAmount / 100;

          return (
            <div
              key={index}
              className="thermal-label-container w-[100mm] min-h-[150mm] bg-white border-2 border-dashed border-black p-4 text-black font-sans text-xs flex flex-col justify-between mx-auto shadow-xl print:shadow-none print:border-2 print:border-solid print:border-black print:page-break-after-always print:m-0"
              style={{
                width: '100mm',
                minHeight: '148mm',
                boxSizing: 'border-box',
              }}
            >
              {/* Header: Brand & Courier Tag */}
              <div>
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <div>
                    <span className="font-extrabold text-base tracking-tight block">
                      VetMart<span className="underline">BD</span>
                    </span>
                    <span className="text-[9px] font-semibold uppercase block tracking-wider">
                      Veterinary Health Care
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 border-2 border-black font-black text-xs uppercase bg-black text-white">
                      {label.courierName || 'STEADFAST'}
                    </span>
                    <span className="text-[9px] font-mono block mt-0.5 font-bold">
                      Helpline: 01700-000000
                    </span>
                  </div>
                </div>

                {/* Primary Barcode */}
                <div className="py-2 border-b-2 border-black text-center">
                  <SimpleBarcode value={label.trackingCode || label.consignmentId || label.orderNumber} />
                  <div className="flex justify-between text-[10px] font-mono font-bold mt-1 px-1">
                    <span>CID: {label.consignmentId || 'SF-MOCK-CID'}</span>
                    <span>INV: {label.orderNumber}</span>
                  </div>
                </div>

                {/* Prominent COD Amount Box */}
                <div className="my-2 p-2 border-2 border-black bg-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider block">
                      Cash on Delivery (COD)
                    </span>
                    <span className="text-[9px] font-bold text-gray-700">
                      {isPrepaid ? 'FULLY PREPAID' : `Payable via ${label.paymentMethod.toUpperCase()}`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black font-mono block leading-none">
                      ৳{codTaka.toFixed(2)}
                    </span>
                    {isPrepaid && (
                      <span className="text-[9px] font-black uppercase text-white bg-black px-1 rounded-xs">
                        COLLECT ৳0
                      </span>
                    )}
                  </div>
                </div>

                {/* Recipient Information */}
                <div className="border-2 border-black p-2 space-y-1 mb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600 block">
                        Deliver To:
                      </span>
                      <span className="text-sm font-black block leading-tight">
                        {label.customerName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-black border border-black px-1.5 py-0.5 bg-black text-white rounded-xs">
                        📞 {label.customerPhone}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-semibold leading-snug pt-1">
                    {label.recipientAddress}
                  </p>
                  <div className="text-[10px] font-bold font-mono pt-0.5 text-gray-800">
                    District: <span className="underline">{label.district}</span> | Division: {label.division}
                  </div>
                </div>

                {/* Item Summary Checklist (Warehouse DGDA verification) */}
                <div className="border border-black p-1.5 space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider block border-b border-black pb-0.5">
                    Package Contents ({label.items.length} SKUs):
                  </span>
                  <div className="space-y-0.5 max-h-24 overflow-hidden">
                    {label.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-[10px] leading-tight font-medium">
                        <span className="truncate max-w-[70%]">
                          [ ] <span className="font-bold">{it.quantity}x</span> {it.productName}
                        </span>
                        <span className="font-mono text-[9px] font-bold text-gray-700">
                          {it.batchNo || 'LOT-2026'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer: Sender & Return Instructions */}
              <div className="border-t-2 border-black pt-1.5 mt-2 flex justify-between items-end text-[8px] font-mono">
                <div>
                  <span className="font-bold block">Return / Fulfillment Hub:</span>
                  <span>VetMart Central Warehouse, Tejgaon I/A, Dhaka-1208</span>
                </div>
                <div className="text-right font-bold">
                  <span>Standard Thermal 4x6</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Global CSS for Clean Thermal Printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .thermal-label-container,
          .thermal-label-container * {
            visibility: visible;
          }
          .thermal-label-container {
            position: relative;
            left: 0;
            top: 0;
            page-break-after: always;
            break-after: page;
          }
          @page {
            size: 100mm 150mm;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
