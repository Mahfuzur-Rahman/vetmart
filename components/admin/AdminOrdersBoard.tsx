// components/admin/AdminOrdersBoard.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { type MockOrder, type OrderStatus, BOARD_TO_DB_STATUS } from '@/lib/services/order-status';
import { AdminIncompleteOrdersBoard } from './AdminIncompleteOrdersBoard';
import type { CourierFraudReport } from '@/lib/courier/fraud-check';
import { ThermalShippingLabelModal, type ThermalLabelData } from './ThermalShippingLabel';
import { CallLogDrawer, type CallLogEntry, type CallOutcome } from './CallLogDrawer';
import { WhatsAppTemplateModal, type WhatsAppOrderContext } from './WhatsAppTemplateModal';

interface Props {
  locale: string;
}

export interface ExtendedOrder extends MockOrder {
  fraudReport?: CourierFraudReport;
  callLogs?: CallLogEntry[];
}

export function AdminOrdersBoard({ locale }: Props) {
  const isBn = locale === 'bn';
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<ExtendedOrder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modalActionError, setModalActionError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [pendingLeadsCount, setPendingLeadsCount] = useState<number>(0);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal states
  const [printLabelsData, setPrintLabelsData] = useState<ThermalLabelData[] | null>(null);
  const [callDrawerOrder, setCallDrawerOrder] = useState<ExtendedOrder | null>(null);
  const [whatsappContext, setWhatsappContext] = useState<WhatsAppOrderContext | null>(null);

  // Fraud reports cache
  const [fraudCache, setFraudCache] = useState<Record<string, CourierFraudReport>>({});

  // Pending abandoned-cart leads badge. Read from the server: the leads are
  // captured on customers' phones, so a localStorage count was always zero here.
  useEffect(() => {
    let cancelled = false;

    fetch('/api/v1/admin/incomplete-orders?status=incomplete')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json) => {
        if (!cancelled) setPendingLeadsCount(Array.isArray(json.data) ? json.data.length : 0);
      })
      .catch((err) => console.error('Could not load pending lead count:', err));

    return () => {
      cancelled = true;
    };
  }, [activeFilter]);

  /**
   * Load orders from the server.
   */
  const refreshOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/orders?limit=200');
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setOrders(Array.isArray(json.data) ? json.data : []);
      setLoadError(null);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setLoadError(err instanceof Error ? err.message : 'Could not load orders');
    }
  }, []);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  // Compute and cache fraud scores safely via server API
  useEffect(() => {
    const fetchFraudScores = async () => {
      const newReports: Record<string, CourierFraudReport> = {};
      for (const ord of orders) {
        if (ord.customerPhone && !fraudCache[ord.customerPhone]) {
          try {
            const res = await fetch(
              `/api/v1/courier/fraud-check?phone=${encodeURIComponent(ord.customerPhone)}`
            );
            if (res.ok) {
              const json = await res.json();
              if (json.data) newReports[ord.customerPhone] = json.data;
            }
          } catch {
            // Ignore individual failure
          }
        }
      }
      if (Object.keys(newReports).length > 0) {
        setFraudCache((prev) => ({ ...prev, ...newReports }));
      }
    };
    if (orders.length > 0) {
      fetchFraudScores();
    }
  }, [orders]);

  /**
   * Apply a server-confirmed change to the local view.
   *
   * This used to persist the whole board to localStorage, which is what made
   * order state device-local. Mutations now go to the API first and this only
   * reflects the result; refreshOrders() re-reads the authoritative rows.
   */
  const applyLocal = (updated: ExtendedOrder[]) => {
    setOrders(updated);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setActionError(null);
    setModalActionError(null);
    setActionLoadingId(`status-${newStatus}`);
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // The board's vocabulary is coarser than the DB enum; the service layer
        // owns the mapping (lib/services/orders.ts).
        body: JSON.stringify({ status: BOARD_TO_DB_STATUS[newStatus] }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const errMsg = json?.error?.message ?? `Could not update the order (HTTP ${res.status}).`;
        setActionError(errMsg);
        setModalActionError(errMsg);
        return;
      }

      applyLocal(
        orders.map((o) =>
          o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o
        )
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      setToastMessage(
        isBn
          ? `অর্ডার স্ট্যাটাস '${newStatus}' এ পরিবর্তিত হয়েছে`
          : `Order status updated to '${newStatus}'`
      );
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Status change failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Could not update the order';
      setActionError(errMsg);
      setModalActionError(errMsg);
    } finally {
      setActionLoadingId(null);
    }
  };

  /**
   * Book one order with the courier.
   *
   * The consignment id and tracking code used to be invented in the browser
   * with Math.random and stored only in localStorage, so they matched nothing
   * at Steadfast and no other device could see them. The server now books
   * through the courier driver and returns the real identifiers (§12 rule 1).
   */
  const handleDispatchCourier = async (order: ExtendedOrder) => {
    setActionError(null);
    setModalActionError(null);
    setActionLoadingId('dispatch');
    try {
      const res = await fetch(`/api/v1/admin/orders/${order.id}/ship`, { method: 'POST' });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const errMsg = json?.error?.message ?? `Could not dispatch the order (HTTP ${res.status}).`;
        setActionError(errMsg);
        setModalActionError(errMsg);
        return;
      }

      const { consignmentId, trackingCode } = json.data;
      const nowIso = new Date().toISOString();

      applyLocal(
        orders.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: 'dispatched' as OrderStatus,
                courierConsignmentId: consignmentId,
                trackingCode,
                dispatchedAt: nowIso,
                updatedAt: nowIso,
              }
            : o
        )
      );

      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder((prev) =>
          prev
            ? { ...prev, status: 'dispatched', courierConsignmentId: consignmentId, trackingCode, dispatchedAt: nowIso }
            : null
        );
      }

      setToastMessage(
        isBn
          ? `অর্ডার #${order.orderNumber} কুরিয়ারে বুকিং সফল হয়েছে! কনসাইনমেন্ট: #${consignmentId}`
          : `Order #${order.orderNumber} dispatched. Consignment #${consignmentId}`
      );
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Dispatch failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Could not dispatch the order';
      setActionError(errMsg);
      setModalActionError(errMsg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Bulk Dispatch to Steadfast
  const handleBulkDispatch = async () => {
    if (selectedIds.size === 0) return;

    setActionError(null);

    // Booked one at a time so a single courier rejection does not silently
    // mark the rest as dispatched. Failures are reported, not swallowed.
    const targets = orders.filter(
      (o) => selectedIds.has(o.id) && o.status !== 'dispatched' && o.status !== 'delivered'
    );

    const failures: string[] = [];
    let count = 0;

    for (const order of targets) {
      try {
        const res = await fetch(`/api/v1/admin/orders/${order.id}/ship`, { method: 'POST' });
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          failures.push(`${order.orderNumber}: ${json?.error?.message ?? `HTTP ${res.status}`}`);
          continue;
        }
        count++;
      } catch (err) {
        failures.push(`${order.orderNumber}: ${err instanceof Error ? err.message : 'request failed'}`);
      }
    }

    await refreshOrders();
    setSelectedIds(new Set());

    if (failures.length > 0) {
      setActionError(
        (isBn ? 'কিছু অর্ডার বুকিং করা যায়নি: ' : 'Some orders could not be dispatched: ') +
          failures.join('; ')
      );
    }

    if (count > 0) {
      setToastMessage(
        isBn
          ? `সফলভাবে ${count} টি অর্ডার কুরিয়ারে বুকিং সম্পন্ন হয়েছে!`
          : `Successfully dispatched ${count} order${count === 1 ? '' : 's'} to the courier.`
      );
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  // Build Thermal Label Data for Printing
  const openThermalPrint = (ordersToPrint: ExtendedOrder[]) => {
    const labelList: ThermalLabelData[] = ordersToPrint.map((o) => ({
      orderNumber: o.orderNumber,
      consignmentId: o.courierConsignmentId || `SF-PENDING-${o.orderNumber}`,
      trackingCode: o.trackingCode || `TRK-${o.orderNumber}`,
      courierName: 'STEADFAST COURIER',
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      recipientAddress: o.recipientAddress,
      district: o.district,
      division: o.division,
      totalAmount: o.totalAmount,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      items: o.items.map((it) => ({
        productName: isBn ? it.productNameBn : it.productNameEn,
        quantity: it.quantity,
        batchNo: it.batchNo,
      })),
      createdAt: o.createdAt,
    }));
    setPrintLabelsData(labelList);
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  /**
   * Record a COD confirmation call against the order's timeline.
   *
   * This used to live only in the operator's own browser. COD screening is the
   * highest-ROI habit in this market (§12 rule 3), so the record has to be
   * visible to whoever picks the order up next — it is an order_event now.
   */
  const handleAddCallLog = async (orderId: string, entry: CallLogEntry) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: entry.note || entry.outcome, outcome: entry.outcome }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setActionError(json?.error?.message ?? `Could not save the call log (HTTP ${res.status}).`);
        return;
      }

      applyLocal(
        orders.map((o) =>
          o.id === orderId ? { ...o, callLogs: [entry, ...(o.callLogs || [])] } : o
        )
      );
      setToastMessage(isBn ? 'কল রেকর্ড সংরক্ষিত হয়েছে' : 'Call log entry saved');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Call log save failed:', err);
      setActionError(err instanceof Error ? err.message : 'Could not save the call log');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-semibold text-sm shadow-xl flex items-center justify-between animate-fade-in">
          <span>🚀 {toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* A rejected mutation must not look like a successful one. */}
      {actionError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-900 text-sm shadow-sm flex items-start justify-between gap-3"
        >
          <p className="min-w-0 break-words leading-relaxed">{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label={isBn ? 'বন্ধ করুন' : 'Dismiss'}
            className="text-red-700 hover:text-red-900 text-xs shrink-0 min-h-11 min-w-11 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}

      {/* An empty board and a failed request must not look the same. */}
      {loadError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-sm shadow-sm"
        >
          <p className="font-bold">
            {isBn ? 'অর্ডার তালিকা লোড করা যায়নি' : 'Could not load orders'}
          </p>
          <p className="mt-0.5 break-words leading-relaxed">{loadError}</p>
          <button
            type="button"
            onClick={() => refreshOrders()}
            className="mt-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs min-h-11"
          >
            {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-nowrap sm:flex-wrap w-full max-w-full touch-pan-x">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
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
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeFilter === 'pending'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'নতুন অর্ডার' : 'New Orders'} ({orders.filter((o) => o.status === 'pending').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('confirmed')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeFilter === 'confirmed'
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'নিশ্চিতকৃত' : 'Confirmed'} ({orders.filter((o) => o.status === 'confirmed').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('processing')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeFilter === 'processing'
              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'প্রসেসিং' : 'Processing'} ({orders.filter((o) => o.status === 'processing').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('pharmacist_review')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeFilter === 'pharmacist_review'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'Rx রিভিউ' : 'Rx Review'} ({orders.filter((o) => o.status === 'pharmacist_review').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('dispatched')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeFilter === 'dispatched'
              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'ডেসপ্যাচড' : 'Dispatched'} ({orders.filter((o) => o.status === 'dispatched').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('delivered')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeFilter === 'delivered'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'ডেলিভারড' : 'Delivered'} ({orders.filter((o) => o.status === 'delivered').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('cancelled')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeFilter === 'cancelled'
              ? 'bg-zinc-700 text-white border-zinc-700 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'বাতিল' : 'Cancelled'} ({orders.filter((o) => o.status === 'cancelled').length})
        </button>

        {/* Incomplete Orders Lead Recovery Tab */}
        <button
          type="button"
          onClick={() => setActiveFilter('incomplete_leads')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
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

      {/* Bulk Operations Command Bar */}
      {selectedIds.size > 0 && activeFilter !== 'incomplete_leads' && (
        <div className="p-3.5 rounded-2xl bg-zinc-900 text-white flex flex-wrap items-center justify-between gap-3 shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
              {selectedIds.size}
            </span>
            <span className="text-xs font-bold">
              {isBn ? 'অর্ডার নির্বাচিত হয়েছে' : 'orders selected'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkDispatch}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <span>🚀</span>
              <span>{isBn ? 'Steadfast-এ এক ক্লিকে বুকিং' : 'Bulk Dispatch to Steadfast'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const selected = orders.filter((o) => selectedIds.has(o.id));
                openThermalPrint(selected);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-1.5 border border-zinc-700 transition-colors cursor-pointer"
            >
              <span>🖨️</span>
              <span>{isBn ? '৪×৬ থার্মাল লেবেল প্রিন্ট' : 'Print 4x6 Thermal Labels'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* If Incomplete Leads tab active, render dedicated recovery dashboard */}
      {activeFilter === 'incomplete_leads' ? (
        <AdminIncompleteOrdersBoard locale={locale} />
      ) : (
        /* Standard Orders Table */
        <div className="rounded-2xl border border-[#EAEAEA] bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto w-full max-w-full touch-pan-x">
            <table className="min-w-[1000px] w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#787774] uppercase tracking-wider border-b border-[#EAEAEA] bg-[#FBFBFA]">
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredOrders.length > 0 && selectedIds.size === filteredOrders.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3.5 font-semibold">Order #</th>
                  <th className="px-4 py-3.5 font-semibold">{isBn ? 'গ্রাহক ও রিস্ক স্কোর' : 'Customer & Risk'}</th>
                  <th className="px-4 py-3.5 font-semibold">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="px-4 py-3.5 font-semibold">{isBn ? 'কুরিয়ার ট্র্যাকিং' : 'Courier / Consignment'}</th>
                  <th className="px-4 py-3.5 font-semibold">{isBn ? 'পেমেন্ট' : 'Payment'}</th>
                  <th className="px-4 py-3.5 font-semibold text-right">{isBn ? 'মোট' : 'Total (৳)'}</th>
                  <th className="px-4 py-3.5 font-semibold text-right">{isBn ? 'কমান্ড অ্যাকশন' : 'Quick Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA]">
                {filteredOrders.map((ord) => {
                  const fraud = fraudCache[ord.customerPhone];
                  const isSelected = selectedIds.has(ord.id);

                  return (
                    <tr
                      key={ord.id}
                      className={`hover:bg-[#F9F9F8] transition-colors ${
                        isSelected ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(ord.id)}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Order Number */}
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-emerald-700">
                        {ord.orderNumber}
                      </td>

                      {/* Customer Info & Courier Risk Badge */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[#2F3437] text-xs">
                          {ord.customerName}
                        </div>
                        <div className="text-[11px] text-[#787774] font-mono flex items-center gap-1.5 mt-0.5">
                          <span>📱 {ord.customerPhone}</span>
                        </div>

                        {/* Fraud Risk Score Badge */}
                        {fraud ? (
                          <div className="mt-1 flex items-center gap-1">
                            <span
                              className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                                fraud.riskLevel === 'low'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : fraud.riskLevel === 'medium'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                              }`}
                              title={isBn ? fraud.riskReasonBn : fraud.riskReason}
                            >
                              <span>{fraud.riskLevel === 'low' ? '🟢' : fraud.riskLevel === 'medium' ? '🟡' : '🔴'}</span>
                              <span>{fraud.successRate}% Success</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-gray-400 font-mono">Checking score...</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                            ord.status === 'delivered'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : ord.status === 'dispatched'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : ord.status === 'processing'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : ord.status === 'confirmed'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : ord.status === 'pharmacist_review'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : ord.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-[#F7F6F3] text-[#5F6368] border-[#EAEAEA]'
                          }`}
                        >
                          {ord.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Courier Consignment */}
                      <td className="px-4 py-3.5">
                        {ord.courierConsignmentId ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-800 font-mono text-[10px] font-bold">
                              <span>📦</span> {ord.courierConsignmentId}
                            </span>
                            {ord.trackingCode && (
                              <div className="text-[9px] font-mono text-gray-500">
                                Trk: {ord.trackingCode}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#9AA0A6] italic font-mono">
                            {ord.status === 'pending' || ord.status === 'confirmed' || ord.status === 'processing' ? 'Not dispatched' : '—'}
                          </span>
                        )}
                      </td>

                      {/* Payment */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs uppercase font-mono text-[#5F6368]">
                          {ord.paymentMethod} ({ord.paymentStatus})
                        </span>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-[#2F3437] text-xs">
                        ৳{(ord.totalAmount / 100).toFixed(2)}
                      </td>

                      {/* Quick Actions Cockpit */}
                      <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                        {/* Call Drawer Trigger */}
                        <button
                          type="button"
                          onClick={() => setCallDrawerOrder(ord)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                          title={isBn ? 'টেলি-সেলস কল লগ' : 'Open Call Cockpit'}
                        >
                          📞
                        </button>

                        {/* WhatsApp Trigger */}
                        <button
                          type="button"
                          onClick={() =>
                            setWhatsappContext({
                              customerName: ord.customerName,
                              customerPhone: ord.customerPhone,
                              orderNumber: ord.orderNumber,
                              totalAmountTaka: ord.totalAmount / 100,
                              recipientAddress: `${ord.recipientAddress}, ${ord.district}`,
                              itemsSummary: ord.items
                                .map((it) => (isBn ? it.productNameBn : it.productNameEn))
                                .join(', '),
                              trackingCode: ord.trackingCode || ord.courierConsignmentId,
                              courierName: 'Steadfast Courier',
                            })
                          }
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
                          title={isBn ? 'হোয়াটসঅ্যাপ মেসেজ পাঠান' : 'Send WhatsApp Template'}
                        >
                          💬
                        </button>

                        {/* Print 4x6 Label */}
                        <button
                          type="button"
                          onClick={() => openThermalPrint([ord])}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold border border-zinc-200 transition-colors cursor-pointer"
                          title={isBn ? '৪×৬ থার্মাল লেবেল প্রিন্ট' : 'Print 4x6 Thermal Label'}
                        >
                          🖨️
                        </button>

                        {/* Single Dispatch Button */}
                        {(ord.status === 'pending' || ord.status === 'confirmed' || ord.status === 'processing') && (
                          <button
                            type="button"
                            onClick={() => handleDispatchCourier(ord)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            🚀 {isBn ? 'ডেসপ্যাচ' : 'Dispatch'}
                          </button>
                        )}

                        {/* View Details */}
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          className="px-2.5 py-1 rounded-lg bg-[#F7F6F3] hover:bg-emerald-50 hover:text-emerald-700 border border-[#EAEAEA] text-[#2F3437] text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {isBn ? 'বিস্তারিত' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Thermal Label Modal Preview */}
      {printLabelsData && (
        <ThermalShippingLabelModal
          labels={printLabelsData}
          onClose={() => setPrintLabelsData(null)}
        />
      )}

      {/* Call Log Drawer */}
      {callDrawerOrder && (
        <CallLogDrawer
          isOpen={Boolean(callDrawerOrder)}
          onClose={() => setCallDrawerOrder(null)}
          customerName={callDrawerOrder.customerName}
          customerPhone={callDrawerOrder.customerPhone}
          orderNumber={callDrawerOrder.orderNumber}
          deliveryAddress={`${callDrawerOrder.recipientAddress}, ${callDrawerOrder.district}`}
          totalAmountPaisa={callDrawerOrder.totalAmount}
          fraudReport={fraudCache[callDrawerOrder.customerPhone] || null}
          existingLogs={callDrawerOrder.callLogs || []}
          onAddLog={(entry) => handleAddCallLog(callDrawerOrder.id, entry)}
          onUpdateStatus={(outcome: CallOutcome) => {
            if (outcome === 'confirmed') {
              handleStatusChange(callDrawerOrder.id, 'confirmed');
            } else if (outcome === 'cancelled') {
              handleStatusChange(callDrawerOrder.id, 'cancelled');
            }
          }}
          locale={locale}
        />
      )}

      {/* WhatsApp Template Dispatcher */}
      {whatsappContext && (
        <WhatsAppTemplateModal
          isOpen={Boolean(whatsappContext)}
          onClose={() => setWhatsappContext(null)}
          context={whatsappContext}
          locale={locale}
        />
      )}

      {/* Order Detail Modal with Touch-First Mobile Ergonomics */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedOrder(null);
              setModalActionError(null);
            }
          }}
        >
          <div
            className="bg-white border border-[#EAEAEA] rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl animate-fade-in overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Sticky Header */}
            <div className="p-4 sm:p-5 border-b border-[#EAEAEA] flex items-center justify-between bg-white shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-[#2F3437] font-display">
                    Order #{selectedOrder.orderNumber}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                      selectedOrder.status === 'delivered'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : selectedOrder.status === 'dispatched'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : selectedOrder.status === 'processing'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : selectedOrder.status === 'confirmed'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : selectedOrder.status === 'pharmacist_review'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : selectedOrder.status === 'cancelled'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-[#F7F6F3] text-[#5F6368] border-[#EAEAEA]'
                    }`}
                  >
                    {selectedOrder.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-[#787774] mt-0.5">
                  {selectedOrder.customerName} • <span className="font-mono">{selectedOrder.customerPhone}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null);
                  setModalActionError(null);
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-[#787774] hover:text-[#2F3437] hover:bg-[#F7F6F3] text-lg font-bold transition-colors cursor-pointer touch-manipulation"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs overscroll-contain">
              {/* In-Modal Error Notification */}
              {modalActionError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start justify-between gap-2 shadow-xs"
                >
                  <div className="flex items-center gap-1.5 font-medium leading-relaxed">
                    <span>⚠️</span>
                    <span>{modalActionError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalActionError(null)}
                    className="text-rose-700 hover:text-rose-900 font-bold p-1 min-w-[28px] min-h-[28px] flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Delivery Address */}
              <div className="p-3.5 rounded-2xl bg-[#F7F6F3] border border-[#EAEAEA] space-y-1">
                <span className="text-[11px] uppercase font-bold text-[#787774] tracking-wider block">
                  {isBn ? 'ডেলিভারি ঠিকানা' : 'Delivery Address'}
                </span>
                <span className="text-[#2F3437] font-medium leading-relaxed block text-xs">
                  {selectedOrder.recipientAddress}, {selectedOrder.district}, {selectedOrder.division}
                </span>
              </div>

              {/* Fraud Report Banner in Detail */}
              {fraudCache[selectedOrder.customerPhone] && (
                <div
                  className={`p-3.5 rounded-2xl border ${
                    fraudCache[selectedOrder.customerPhone].riskLevel === 'high'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : fraudCache[selectedOrder.customerPhone].riskLevel === 'medium'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  } space-y-1.5`}
                >
                  <div className="flex justify-between items-center font-bold text-xs">
                    <span className="flex items-center gap-1">🛡️ Courier Risk Profile</span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-white/80 border border-black/5">
                      {fraudCache[selectedOrder.customerPhone].successRate}% Delivery Success
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {isBn
                      ? fraudCache[selectedOrder.customerPhone].riskReasonBn
                      : fraudCache[selectedOrder.customerPhone].riskReason}
                  </p>
                </div>
              )}

              {/* Consignment Info */}
              {selectedOrder.courierConsignmentId && (
                <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 space-y-1.5 font-mono">
                  <div className="font-bold flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">📦 Steadfast Consignment:</span>
                    <span className="text-sky-800 font-extrabold text-sm">{selectedOrder.courierConsignmentId}</span>
                  </div>
                  {selectedOrder.trackingCode && (
                    <div className="text-[11px] text-sky-700">
                      Tracking Code: {selectedOrder.trackingCode}
                    </div>
                  )}
                  <div className="text-[10px] text-sky-600">
                    Dispatched at: {new Date(selectedOrder.dispatchedAt || selectedOrder.updatedAt).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2">
                <span className="text-[11px] uppercase font-bold text-[#787774] tracking-wider block">
                  {isBn ? 'পণ্যসমূহ:' : 'Ordered Items:'}
                </span>
                {selectedOrder.items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex justify-between items-center p-3 rounded-xl bg-[#FBFBFA] border border-[#EAEAEA]"
                  >
                    <div>
                      <div className="font-bold text-[#2F3437] text-xs">{item.productNameEn}</div>
                      {item.batchNo && (
                        <div className="text-[10px] text-emerald-600 font-mono mt-0.5">
                          Batch: {item.batchNo}
                        </div>
                      )}
                    </div>
                    <div className="text-right font-mono font-bold text-[#2F3437] text-xs">
                      {item.quantity} x ৳{(item.unitPrice / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total & Payment Summary */}
              <div className="pt-2 border-t border-[#EAEAEA] flex justify-between items-center text-xs">
                <span className="text-[#787774]">
                  Payment: <span className="font-mono font-bold uppercase text-[#2F3437]">{selectedOrder.paymentMethod}</span> ({selectedOrder.paymentStatus})
                </span>
                <div className="text-right">
                  <span className="text-[11px] text-[#787774] block">Total Amount:</span>
                  <span className="text-emerald-700 font-extrabold text-base font-mono">
                    ৳{(selectedOrder.totalAmount / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sticky Bottom Action Bar with Ergonomic Mobile Buttons */}
            <div className="p-4 sm:p-5 border-t border-[#EAEAEA] bg-[#FBFBFA] shrink-0 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#787774]">
                <span>{isBn ? 'স্ট্যাটাস ও কুরিয়ার অ্যাকশন:' : 'Status & Courier Actions:'}</span>
                {actionLoadingId && (
                  <span className="text-emerald-700 animate-pulse font-mono font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    {isBn ? 'প্রসেসিং হচ্ছে...' : 'Processing...'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {selectedOrder.status === 'pending' && (
                  <button
                    type="button"
                    disabled={Boolean(actionLoadingId)}
                    onClick={() => handleStatusChange(selectedOrder.id, 'confirmed')}
                    className="min-h-[44px] px-3 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-98 shadow-xs transition-all flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer disabled:opacity-50"
                  >
                    📞 {isBn ? 'অর্ডার নিশ্চিত' : 'Confirm Order'}
                  </button>
                )}

                {(selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed') && (
                  <button
                    type="button"
                    disabled={Boolean(actionLoadingId)}
                    onClick={() => handleStatusChange(selectedOrder.id, 'processing')}
                    className="min-h-[44px] px-3 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 active:scale-98 shadow-xs transition-all flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer disabled:opacity-50"
                  >
                    ⚙️ {isBn ? 'প্যাক / প্রসেসিং' : 'Process & Pack'}
                  </button>
                )}

                {(selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed' || selectedOrder.status === 'processing') && (
                  <button
                    type="button"
                    disabled={Boolean(actionLoadingId)}
                    onClick={() => handleDispatchCourier(selectedOrder)}
                    className="min-h-[44px] px-3 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 active:scale-98 shadow-xs transition-all flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer disabled:opacity-50"
                  >
                    🚀 {isBn ? 'কুরিয়ার বুকিং' : 'Dispatch Courier'}
                  </button>
                )}

                {(selectedOrder.status === 'dispatched' || selectedOrder.status === 'processing') && (
                  <button
                    type="button"
                    disabled={Boolean(actionLoadingId)}
                    onClick={() => handleStatusChange(selectedOrder.id, 'delivered')}
                    className="min-h-[44px] px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-98 shadow-xs transition-all flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer disabled:opacity-50"
                  >
                    ✓ {isBn ? 'ডেলিভারি সম্পন্ন' : 'Mark Delivered'}
                  </button>
                )}

                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                  <button
                    type="button"
                    disabled={Boolean(actionLoadingId)}
                    onClick={() => {
                      if (window.confirm(isBn ? 'আপনি কি নিশ্চিত এই অর্ডারটি বাতিল করতে চান?' : 'Are you sure you want to cancel this order?')) {
                        handleStatusChange(selectedOrder.id, 'cancelled');
                      }
                    }}
                    className="min-h-[44px] px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 active:scale-98 transition-all flex items-center justify-center gap-1.5 touch-manipulation cursor-pointer disabled:opacity-50"
                  >
                    ✕ {isBn ? 'বাতিল' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
