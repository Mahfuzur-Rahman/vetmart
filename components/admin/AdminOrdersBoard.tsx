// components/admin/AdminOrdersBoard.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { type MockOrder, type OrderStatus, BOARD_TO_DB_STATUS } from '@/lib/services/order-status';
import { AdminIncompleteOrdersBoard } from './AdminIncompleteOrdersBoard';
import { checkCustomerFraudRisk, type CourierFraudReport } from '@/lib/courier/fraud-check';
import { ThermalShippingLabelModal, type ThermalLabelData } from './ThermalShippingLabel';
import { CallLogDrawer, type CallLogEntry, type CallOutcome } from './CallLogDrawer';
import { WhatsAppTemplateModal, type WhatsAppOrderContext } from './WhatsAppTemplateModal';

interface Props {
  locale: string;
}

export interface ExtendedOrder extends MockOrder {
  courierConsignmentId?: string;
  trackingCode?: string;
  dispatchedAt?: string;
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
   *
   * Orders used to be read from localStorage ('vetmart_mock_orders'), so an
   * order placed on a customer's phone never appeared here, and a status change
   * made on one admin device was invisible on another. They are database rows
   * now and this is the only read path.
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

  // Compute and cache fraud scores for all orders
  useEffect(() => {
    const fetchFraudScores = async () => {
      const newReports: Record<string, CourierFraudReport> = {};
      for (const ord of orders) {
        if (!fraudCache[ord.customerPhone]) {
          try {
            const report = await checkCustomerFraudRisk(ord.customerPhone);
            newReports[ord.customerPhone] = report;
          } catch {
            // Ignore individual failure
          }
        }
      }
      if (Object.keys(newReports).length > 0) {
        setFraudCache((prev) => ({ ...prev, ...newReports }));
      }
    };
    fetchFraudScores();
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
        setActionError(json?.error?.message ?? `Could not update the order (HTTP ${res.status}).`);
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
      setActionError(err instanceof Error ? err.message : 'Could not update the order');
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
    try {
      const res = await fetch(`/api/v1/admin/orders/${order.id}/ship`, { method: 'POST' });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setActionError(json?.error?.message ?? `Could not dispatch the order (HTTP ${res.status}).`);
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
      setActionError(err instanceof Error ? err.message : 'Could not dispatch the order');
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
          {isBn ? 'নতুন অর্ডার' : 'Pending'} ({orders.filter((o) => o.status === 'pending').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('pharmacist_review')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
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
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
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
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
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
                              : ord.status === 'pharmacist_review'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
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
                            {ord.status === 'pending' ? 'Not dispatched' : '—'}
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
                        {ord.status === 'pending' && (
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
            if (outcome === 'confirmed' && callDrawerOrder.status === 'pending') {
              handleStatusChange(callDrawerOrder.id, 'pending');
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

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-fade-in">
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
                className="text-[#787774] hover:text-[#2F3437] text-sm font-bold p-1 rounded-lg hover:bg-[#F7F6F3] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Delivery Address */}
              <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#EAEAEA] space-y-1">
                <span className="text-[#787774] font-semibold block">Delivery Address:</span>
                <span className="text-[#2F3437]">
                  {selectedOrder.recipientAddress}, {selectedOrder.district}, {selectedOrder.division}
                </span>
              </div>

              {/* Fraud Report Banner in Detail */}
              {fraudCache[selectedOrder.customerPhone] && (
                <div
                  className={`p-3 rounded-xl border ${
                    fraudCache[selectedOrder.customerPhone].riskLevel === 'high'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : fraudCache[selectedOrder.customerPhone].riskLevel === 'medium'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  } space-y-1`}
                >
                  <div className="flex justify-between font-bold">
                    <span>🛡️ Courier Risk Score:</span>
                    <span className="font-mono">{fraudCache[selectedOrder.customerPhone].successRate}% Delivery Rate</span>
                  </div>
                  <p className="text-[11px]">
                    {isBn
                      ? fraudCache[selectedOrder.customerPhone].riskReasonBn
                      : fraudCache[selectedOrder.customerPhone].riskReason}
                  </p>
                </div>
              )}

              {/* Consignment Info */}
              {selectedOrder.courierConsignmentId && (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 space-y-1 font-mono">
                  <div className="font-bold flex items-center justify-between">
                    <span>📦 Steadfast Consignment:</span>
                    <span className="text-sky-700 font-extrabold">{selectedOrder.courierConsignmentId}</span>
                  </div>
                  <div className="text-[11px] text-sky-700">
                    Dispatched at: {new Date(selectedOrder.dispatchedAt || selectedOrder.updatedAt).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Items List */}
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
                  className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedOrder.id, 'pharmacist_review')}
                  className="px-2.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  Rx Review
                </button>
                <button
                  type="button"
                  onClick={() => handleDispatchCourier(selectedOrder)}
                  className="px-2.5 py-2 rounded-xl bg-sky-600 text-white text-[11px] font-bold hover:bg-sky-700 shadow-xs transition-colors cursor-pointer"
                >
                  🚀 Dispatch
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedOrder.id, 'delivered')}
                  className="px-2.5 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
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
