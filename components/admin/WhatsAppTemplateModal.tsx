// components/admin/WhatsAppTemplateModal.tsx
'use client';

import React, { useState } from 'react';
import { normalizeBdPhone } from '@/lib/courier/fraud-check';

export interface WhatsAppOrderContext {
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  totalAmountTaka: number;
  recipientAddress: string;
  itemsSummary: string;
  trackingCode?: string;
  courierName?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  context: WhatsAppOrderContext;
  locale: string;
}

type TemplateType = 'confirmation' | 'advance_fee' | 'dispatched' | 'recovery';

export function WhatsAppTemplateModal({ isOpen, onClose, context, locale }: Props) {
  const isBn = locale === 'bn';
  const cleanPhone = normalizeBdPhone(context.customerPhone);
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>('confirmation');

  // Pre-configured message generators
  const getTemplateMessage = (type: TemplateType): string => {
    const name = context.customerName || (isBn ? 'গ্রাহক' : 'Customer');
    const orderNo = context.orderNumber;
    const total = context.totalAmountTaka.toFixed(2);
    const tracking = context.trackingCode || 'SF-TRACK-PENDING';

    switch (type) {
      case 'confirmation':
        return isBn
          ? `আসসালামু আলাইকুম ${name},\nVetMart BD থেকে আপনার অর্ডারটি (#${orderNo}) গ্রহণ করা হয়েছে।\n\n📦 পণ্য: ${context.itemsSummary}\n💰 মোট প্রদেয় (COD): ৳${total}\n📍 ডেলিভারি ঠিকানা: ${context.recipientAddress}\n\nআপনার ঠিকানা ও অর্ডারটি সঠিক থাকলে অনুগ্রহ করে 'হ্যাঁ/Confirm' লিখে রিপ্লাই দিন। ধন্যবাদ!\n- VetMart হেল্পলাইন: 01700-000000`
          : `Hello ${name},\nThank you for placing your order (#${orderNo}) with VetMart BD.\n\n📦 Items: ${context.itemsSummary}\n💰 Total COD: ৳${total}\n📍 Delivery Address: ${context.recipientAddress}\n\nPlease reply with 'YES' to confirm dispatch. Thank you!\n- VetMart Care Team`;

      case 'advance_fee':
        return isBn
          ? `আসসালামু আলাইকুম ${name},\nVetMart BD-তে আপনার অর্ডার (#${orderNo}) নিশ্চিতকরণের জন্য ডেলিভারি চার্জ বাবদ ৳১৩০ অগ্রিম প্রদান করতে হবে।\n\n📲 বিকাশ/নগদ মার্চেন্ট নম্বর: 01700-000000 (Make Payment)\nরেফারেন্সে আপনার অর্ডার নম্বর (${orderNo}) লিখুন।\n\nপেমেন্ট সম্পন্ন করে TrxID পাঠালে পার্সেলটি কুরিয়ারে দ্রুত বুকিং করে দেওয়া হবে। ধন্যবাদ!`
          : `Hello ${name},\nTo confirm order (#${orderNo}) for shipping outside Dhaka, an advance delivery charge of ৳130 is required.\n\n📲 bKash/Nagad Merchant: 01700-000000 (Payment)\nReference: ${orderNo}\n\nPlease share your TrxID after payment to dispatch immediately. Thank you!`;

      case 'dispatched':
        return isBn
          ? `আসসালামু আলাইকুম ${name},\nআপনার VetMart অর্ডার (#${orderNo}) Steadfast কুরিয়ারে হ্যান্ডওভার করা হয়েছে!\n\n📦 ট্র্যাকিং কোড: ${tracking}\n🔍 লাইভ ট্র্যাক করুন: https://steadfast.com.bd/tracking?code=${tracking}\n\nআগামী ২৪-৪৮ ঘণ্টার মধ্যে কুরিয়ার ডেলিভারিম্যান আপনার সাথে যোগাযোগ করবেন।\n- VetMart লজিস্টিকস`
          : `Hello ${name},\nYour VetMart order (#${orderNo}) has been dispatched via Steadfast Courier!\n\n📦 Tracking Code: ${tracking}\n🔍 Track Live: https://steadfast.com.bd/tracking?code=${tracking}\n\nThe delivery agent will contact you soon. Thank you!`;

      case 'recovery':
        return isBn
          ? `আসসালামু আলাইকুম ${name},\nআপনি VetMart-এ (${context.itemsSummary}) অর্ডার শুরু করেছিলেন। অর্ডারটি কনফার্ম করতে বা প্রেসক্রিপশন সহায়তার জন্য কোনো তথ্য প্রয়োজন হলে জানান। ধন্যবাদ!`
          : `Hello ${name},\nWe noticed you started ordering (${context.itemsSummary}) on VetMart. Let us know if you need any assistance completing your delivery details!`;
    }
  };

  const [customMessage, setCustomMessage] = useState(getTemplateMessage('confirmation'));

  // Update text when template tab changes
  const handleSelectTemplate = (type: TemplateType) => {
    setActiveTemplate(type);
    setCustomMessage(getTemplateMessage(type));
  };

  if (!isOpen) return null;

  const waLink = `https://wa.me/88${cleanPhone}?text=${encodeURIComponent(customMessage)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              💬
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#2F3437]">
                {isBn ? 'হোয়াটসঅ্যাপ মেসেজ টেমপ্লেট' : 'WhatsApp Dispatch Hub'}
              </h3>
              <p className="text-xs text-[#787774] font-mono">
                📱 {cleanPhone} ({context.customerName})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#787774] hover:text-[#2F3437] text-sm font-bold p-1 rounded-lg hover:bg-[#F7F6F3]"
          >
            ✕
          </button>
        </div>

        {/* Template Selector Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F7F6F3] rounded-xl border border-[#EAEAEA] text-xs">
          <button
            type="button"
            onClick={() => handleSelectTemplate('confirmation')}
            className={`py-2 px-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
              activeTemplate === 'confirmation'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-[#5F6368] hover:text-[#2F3437]'
            }`}
          >
            {isBn ? '১. অর্ডার কনফার্ম' : '1. Confirmation'}
          </button>
          <button
            type="button"
            onClick={() => handleSelectTemplate('advance_fee')}
            className={`py-2 px-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
              activeTemplate === 'advance_fee'
                ? 'bg-white text-amber-800 shadow-xs'
                : 'text-[#5F6368] hover:text-[#2F3437]'
            }`}
          >
            {isBn ? '২. অগ্রিম ফি রিকোয়েস্ট' : '2. Advance Fee (bKash)'}
          </button>
          <button
            type="button"
            onClick={() => handleSelectTemplate('dispatched')}
            className={`py-2 px-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
              activeTemplate === 'dispatched'
                ? 'bg-white text-sky-800 shadow-xs'
                : 'text-[#5F6368] hover:text-[#2F3437]'
            }`}
          >
            {isBn ? '৩. কুরিয়ার ট্র্যাকিং' : '3. Dispatched & Track'}
          </button>
          <button
            type="button"
            onClick={() => handleSelectTemplate('recovery')}
            className={`py-2 px-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
              activeTemplate === 'recovery'
                ? 'bg-white text-purple-800 shadow-xs'
                : 'text-[#5F6368] hover:text-[#2F3437]'
            }`}
          >
            {isBn ? '৪. কার্ট রিকভারি' : '4. Abandoned Recovery'}
          </button>
        </div>

        {/* Message Editor */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <label className="font-bold text-[#2F3437] block">
              {isBn ? 'মেসেজ প্রিভিউ ও এডিট:' : 'Message Preview & Edit:'}
            </label>
            <span className="text-[10px] text-[#787774]">
              {customMessage.length} characters
            </span>
          </div>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={7}
            className="w-full p-3 rounded-2xl border border-emerald-200 bg-emerald-50/20 text-xs font-sans text-[#2F3437] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-hidden leading-relaxed"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#EAEAEA]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#F7F6F3] hover:bg-[#EAEAEA] text-[#5F6368] text-xs font-bold transition-colors cursor-pointer"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </button>

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <span>💬</span>
            <span>{isBn ? 'হোয়াটসঅ্যাপে পাঠান' : 'Open in WhatsApp'}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
