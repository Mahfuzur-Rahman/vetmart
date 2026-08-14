'use client';

import { useState } from 'react';
import { MOCK_ORDERS, type MockOrder, type OrderStatus } from '@/lib/mock-data/orders';

interface Props {
  locale: string;
}

export function AdminOrdersBoard({ locale }: Props) {
  const isBn = locale === 'bn';
  const [orders, setOrders] = useState<MockOrder[]>(MOCK_ORDERS);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<MockOrder | null>(null);

  const filteredOrders =
    activeFilter === 'all'
      ? orders
      : orders.filter((o) => o.status === activeFilter);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            activeFilter === 'all'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'সকল অর্ডার' : 'All Orders'} ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('pending')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            activeFilter === 'pending'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'নতুন অর্ডার' : 'Pending'} ({orders.filter((o) => o.status === 'pending').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('pharmacist_review')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            activeFilter === 'pharmacist_review'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'Rx রিভিউ' : 'Rx Review'} ({orders.filter((o) => o.status === 'pharmacist_review').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('dispatched')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            activeFilter === 'dispatched'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'ডেসপ্যাচড' : 'Dispatched'} ({orders.filter((o) => o.status === 'dispatched').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('delivered')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            activeFilter === 'delivered'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'ডেলিভারড' : 'Delivered'} ({orders.filter((o) => o.status === 'delivered').length})
        </button>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#787774] uppercase tracking-wider border-b border-[#EAEAEA] bg-[#FBFBFA]">
                <th className="px-5 py-3.5 font-semibold">Order #</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'গ্রাহক' : 'Customer'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'পেমেন্ট' : 'Payment'}</th>
                <th className="px-5 py-3.5 font-semibold text-right">{isBn ? 'মোট' : 'Total (৳)'}</th>
                <th className="px-5 py-3.5 font-semibold text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]">
              {filteredOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-[#F9F9F8] transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs font-bold text-emerald-700">
                    {ord.orderNumber}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-[#2F3437] text-xs">{ord.customerName}</div>
                    <div className="text-[11px] text-[#787774] font-mono">{ord.customerPhone}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                        ord.status === 'delivered'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : ord.status === 'dispatched'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : ord.status === 'pharmacist_review'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-[#F7F6F3] text-[#5F6368] border-[#EAEAEA]'
                      }`}
                    >
                      {ord.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs uppercase font-mono text-[#5F6368]">
                      {ord.paymentMethod} ({ord.paymentStatus})
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-[#2F3437] text-xs">
                    ৳{(ord.totalAmount / 100).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(ord)}
                      className="px-3 py-1 rounded-lg bg-[#F7F6F3] hover:bg-emerald-50 hover:text-emerald-700 border border-[#EAEAEA] text-[#2F3437] text-xs font-semibold transition-colors"
                    >
                      {isBn ? 'বিস্তারিত' : 'View Details'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#2F3437]">
                  Order #{selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-[#787774]">
                  {selectedOrder.customerName} ({selectedOrder.customerPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-[#787774] hover:text-[#2F3437] text-sm font-bold p-1 rounded-lg hover:bg-[#F7F6F3]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] space-y-1">
                <span className="text-[#787774] font-semibold block">Delivery Address:</span>
                <span className="text-[#2F3437]">{selectedOrder.recipientAddress}, {selectedOrder.district}</span>
              </div>

              <div className="space-y-2">
                <span className="text-[#787774] font-bold uppercase block">Items:</span>
                {selectedOrder.items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex justify-between items-center p-2.5 rounded-lg bg-[#FBFBFA] border border-[#EAEAEA]"
                  >
                    <div>
                      <div className="font-bold text-[#2F3437]">{item.productNameEn}</div>
                      <div className="text-[10px] text-emerald-600 font-mono">Batch: {item.batchNo}</div>
                    </div>
                    <div className="text-right font-mono font-bold text-[#2F3437]">
                      {item.quantity} x ৳{(item.unitPrice / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#EAEAEA] flex justify-between font-bold text-sm text-[#2F3437]">
                <span>Total Amount:</span>
                <span className="text-emerald-700">৳{(selectedOrder.totalAmount / 100).toFixed(2)}</span>
              </div>
            </div>

            {/* Quick Status Changers */}
            <div className="space-y-2 pt-2 border-t border-[#EAEAEA]">
              <span className="text-xs text-[#787774] font-semibold block">
                {isBn ? 'স্ট্যাটাস পরিবর্তন করুন:' : 'Update Order Status:'}
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedOrder.id, 'pharmacist_review')}
                  className="px-2.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold hover:bg-amber-100 transition-colors"
                >
                  Rx Review
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedOrder.id, 'dispatched')}
                  className="px-2.5 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-bold hover:bg-sky-100 transition-colors"
                >
                  Dispatched
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedOrder.id, 'delivered')}
                  className="px-2.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                >
                  Delivered
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
