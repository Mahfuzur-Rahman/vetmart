'use client';

import { useState, useEffect } from 'react';
import { MOCK_ORDERS, type MockOrder, type OrderStatus } from '@/lib/mock-data/orders';
import { AdminIncompleteOrdersBoard } from './AdminIncompleteOrdersBoard';
import { getStoredIncompleteOrders } from '@/lib/mock-data/incomplete-orders';

interface Props {
  locale: string;
}

interface ExtendedOrder extends MockOrder {
  courierConsignmentId?: string;
  dispatchedAt?: string;
}

const ORDERS_STORAGE_KEY = 'vetmart_mock_orders';

export function AdminOrdersBoard({ locale }: Props) {
  const isBn = locale === 'bn';
  const [orders, setOrders] = useState<ExtendedOrder[]>(MOCK_ORDERS);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<ExtendedOrder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingLeadsCount, setPendingLeadsCount] = useState<number>(0);

  // Sync with local storage and check incomplete leads
  useEffect(() => {
    try {
      const storedLeads = getStoredIncompleteOrders();
      const count = storedLeads.filter((l) => l.status === 'incomplete').length;
      setPendingLeadsCount(count);
    } catch {
      // Ignore
    }
  }, [activeFilter]);


  // Sync with local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (stored) {
        const customOrders = JSON.parse(stored);
        if (Array.isArray(customOrders) && customOrders.length > 0) {
          // Merge custom orders at the front, deduplicating by ID
          const customIds = new Set(customOrders.map((o: ExtendedOrder) => o.id));
          const rest = MOCK_ORDERS.filter((o) => !customIds.has(o.id));
          setOrders([...customOrders, ...rest]);
        }
      }
    } catch (e) {
      console.error('Failed to load orders from storage', e);
    }
  }, []);

  const saveOrders = (updated: ExtendedOrder[]) => {
    setOrders(updated);
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Storage save error', err);
    }
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return { ...o, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return o;
    });
    saveOrders(updated);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    setToastMessage(isBn ? `অর্ডার #${orderId} স্ট্যাটাস '${newStatus}' এ পরিবর্তিত হয়েছে` : `Order status updated to '${newStatus}'`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDispatchCourier = (order: ExtendedOrder) => {
    const consignmentId = `SF-${Math.floor(100000 + Math.random() * 900000)}-DH`;
    const nowIso = new Date().toISOString();
    const updated = orders.map((o) => {
      if (o.id === order.id) {
        return {
          ...o,
          status: 'dispatched' as OrderStatus,
          courierConsignmentId: consignmentId,
          dispatchedAt: nowIso,
          updatedAt: nowIso,
        };
      }
      return o;
    });

    saveOrders(updated);
    if (selectedOrder && selectedOrder.id === order.id) {
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              status: 'dispatched',
              courierConsignmentId: consignmentId,
              dispatchedAt: nowIso,
            }
          : null
      );
    }

    setToastMessage(
      isBn
        ? `অর্ডার #${order.orderNumber} Steadfast কুরিয়ারে কনসাইনমেন্ট #${consignmentId} সহ সফলভাবে ডেসপ্যাচ হয়েছে!`
        : `Order #${order.orderNumber} dispatched via Steadfast Courier with Consignment #${consignmentId}!`
    );
    setTimeout(() => setToastMessage(null), 5000);
  };

  const filteredOrders =
    activeFilter === 'all'
      ? orders
      : orders.filter((o) => o.status === activeFilter);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-semibold text-sm shadow-xl flex items-center justify-between animate-fade-in">
          <span>🚀 {toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

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

        {/* Incomplete Orders Lead Recovery Tab */}
        <button
          type="button"
          onClick={() => setActiveFilter('incomplete_leads')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
            activeFilter === 'incomplete_leads'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>{isBn ? 'অসম্পূর্ণ অর্ডার (Leads)' : 'Incomplete Leads'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-rose-200 text-rose-900 text-[10px] font-black">
            {pendingLeadsCount}
          </span>
        </button>
      </div>

      {/* If Incomplete Leads tab active, render dedicated recovery dashboard */}
      {activeFilter === 'incomplete_leads' ? (
        <AdminIncompleteOrdersBoard locale={locale} />
      ) : (
        /* Standard Orders Table */
        <div className="rounded-2xl border border-[#EAEAEA] bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#787774] uppercase tracking-wider border-b border-[#EAEAEA] bg-[#FBFBFA]">

                <th className="px-5 py-3.5 font-semibold">Order #</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'গ্রাহক' : 'Customer'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'কুরিয়ার ট্র্যাকিং' : 'Courier / Consignment'}</th>
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
                    {ord.courierConsignmentId ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-800 font-mono text-[11px] font-bold">
                        <span>📦</span> {ord.courierConsignmentId}
                      </span>
                    ) : (
                      <span className="text-xs text-[#9AA0A6] italic font-mono">
                        {ord.status === 'pending' ? 'Not dispatched' : '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs uppercase font-mono text-[#5F6368]">
                      {ord.paymentMethod} ({ord.paymentStatus})
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-[#2F3437] text-xs">
                    ৳{(ord.totalAmount / 100).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right flex items-center justify-end gap-2">
                    {ord.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleDispatchCourier(ord)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        🚀 {isBn ? 'ডেসপ্যাচ' : 'Dispatch'}
                      </button>
                    )}
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
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
                <span className="text-[#2F3437]">{selectedOrder.recipientAddress}, {selectedOrder.district}, {selectedOrder.division}</span>
              </div>

              {selectedOrder.courierConsignmentId && (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 space-y-1 font-mono">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>📦 Steadfast Courier Consignment:</span>
                    <span className="text-sky-700 font-extrabold">{selectedOrder.courierConsignmentId}</span>
                  </div>
                  <div className="text-[11px] text-sky-700">
                    Dispatched at: {new Date(selectedOrder.dispatchedAt || selectedOrder.updatedAt).toLocaleString()}
                  </div>
                </div>
              )}

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

            {/* Quick Status Changers & Dispatch Action */}
            <div className="space-y-2 pt-2 border-t border-[#EAEAEA]">
              <span className="text-xs text-[#787774] font-semibold block">
                {isBn ? 'ডেসপ্যাচ ও স্ট্যাটাস অ্যাকশন:' : 'Dispatch & Status Actions:'}
              </span>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedOrder.id, 'pending')}
                  className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-100 transition-colors"
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedOrder.id, 'pharmacist_review')}
                  className="px-2.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold hover:bg-amber-100 transition-colors"
                >
                  Rx Review
                </button>
                <button
                  type="button"
                  onClick={() => handleDispatchCourier(selectedOrder)}
                  className="px-2.5 py-2 rounded-xl bg-sky-600 text-white text-[11px] font-bold hover:bg-sky-700 shadow-xs transition-colors"
                >
                  🚀 Dispatch
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedOrder.id, 'delivered')}
                  className="px-2.5 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 shadow-xs transition-colors"
                >
                  ✓ Delivered
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

