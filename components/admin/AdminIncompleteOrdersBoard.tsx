// components/admin/AdminIncompleteOrdersBoard.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  type IncompleteOrder,
  type IncompleteOrderStatus,
} from '@/lib/mock-data/incomplete-orders';
import { fmtMoney } from '@/lib/i18n/number';
import type { Locale } from '@/lib/i18n/config';
import { checkCustomerFraudRisk, type CourierFraudReport } from '@/lib/courier/fraud-check';
import { CallLogDrawer, type CallLogEntry } from './CallLogDrawer';
import { WhatsAppTemplateModal, type WhatsAppOrderContext } from './WhatsAppTemplateModal';

interface Props {
  locale: string;
}

export function AdminIncompleteOrdersBoard({ locale }: Props) {
  const isBn = locale === 'bn';
  const [leads, setLeads] = useState<IncompleteOrder[]>([]);
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<IncompleteOrder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals state
  const [callDrawerLead, setCallDrawerLead] = useState<IncompleteOrder | null>(null);
  const [whatsappContext, setWhatsappContext] = useState<WhatsAppOrderContext | null>(null);
  const [fraudCache, setFraudCache] = useState<Record<string, CourierFraudReport>>({});

  /**
   * Load abandoned-cart leads from the server.
   *
   * These used to be read from localStorage, so a lead captured on a customer's
   * phone was invisible to the operator meant to call them back — which defeats
   * the entire point of capturing it.
   */
  const loadLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/incomplete-orders');
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setLeads(Array.isArray(json.data) ? json.data : []);
      setLoadError(null);
    } catch (err) {
      console.error('Failed to load incomplete leads:', err);
      setLoadError(err instanceof Error ? err.message : 'Could not load leads');
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Compute fraud scores for leads
  useEffect(() => {
    const fetchFraud = async () => {
      const newMap: Record<string, CourierFraudReport> = {};
      for (const lead of leads) {
        if (!fraudCache[lead.phone]) {
          try {
            const report = await checkCustomerFraudRisk(lead.phone);
            newMap[lead.phone] = report;
          } catch {
            // Ignore
          }
        }
      }
      if (Object.keys(newMap).length > 0) {
        setFraudCache((prev) => ({ ...prev, ...newMap }));
      }
    };
    fetchFraud();
  }, [leads]);

  /**
   * Persist a lead's status/notes on the server, then reflect it locally.
   * This used to write the whole list to localStorage, which is what made lead
   * state device-local.
   */
  const persistLead = async (
    leadId: string,
    patch: { status: IncompleteOrderStatus; adminNotes?: string }
  ): Promise<boolean> => {
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/admin/incomplete-orders/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setActionError(json?.error?.message ?? `Could not update the lead (HTTP ${res.status}).`);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Lead update failed:', err);
      setActionError(err instanceof Error ? err.message : 'Could not update the lead');
      return false;
    }
  };

  /**
   * Convert a recovered lead into a real order.
   *
   * This used to invent an order number with Math.random and push the order
   * into localStorage, so the "recovered" order existed only in the operator's
   * browser: no stock was allocated, no ledger row was written, and nobody else
   * could see it. It now goes through the same guest-order endpoint the
   * storefront uses, which allocates batches FEFO and writes the stock ledger.
   */
  const handleConvertLeadToOrder = async (lead: IncompleteOrder) => {
    setActionError(null);

    // Stable per lead, so a double click cannot create two orders (§9).
    const key = `lead-recovery-${lead.id}`;

    try {
      const res = await fetch('/api/v1/orders/express', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
        },
        body: JSON.stringify({
          items: lead.items.map((i) => ({ productId: i.productId, slug: i.productSlug, qty: i.quantity })),
          recipientName: lead.name || 'Recovered Customer',
          phone: lead.phone,
          division: lead.division || 'Dhaka',
          district: lead.district || 'Dhaka',
          upazila: lead.upazila || undefined,
          addressLine: lead.address || '',
          paymentMethod: 'cod',
          note: 'Recovered from an abandoned cart by phone follow-up.',
          sourceChannel: 'incomplete_lead_recovery',
          utmSource: lead.utmSource || undefined,
          utmCampaign: lead.utmCampaign || undefined,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setActionError(
          json?.error?.message ??
            (isBn ? 'লিডটি অর্ডারে রূপান্তর করা যায়নি।' : 'Could not convert this lead into an order.')
        );
        return;
      }

      const orderNo = json.data.orderNo;

      if (await persistLead(lead.id, { status: 'converted' })) {
        await loadLeads();
        if (selectedLead && selectedLead.id === lead.id) {
          setSelectedLead((prev) => (prev ? { ...prev, status: 'converted' } : null));
        }
      }

      setToastMessage(
        isBn
          ? `অসম্পূর্ণ লিড সফলভাবে সক্রিয় অর্ডারে #${orderNo} রূপান্তরিত হয়েছে!`
          : `Lead successfully converted to confirmed order #${orderNo}!`
      );
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.error('Lead conversion failed:', err);
      setActionError(err instanceof Error ? err.message : 'Could not convert this lead');
    }
  };

  // Change lead status (contacted, discarded, etc.)
  const handleStatusChange = async (leadId: string, newStatus: IncompleteOrderStatus) => {
    if (!(await persistLead(leadId, { status: newStatus }))) return;

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, status: newStatus, updatedAt: new Date().toISOString() } : l
      )
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    setToastMessage(isBn ? `লিড স্ট্যাটাস '${newStatus}' এ পরিবর্তিত হয়েছে` : `Lead status updated to '${newStatus}'`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Save notes
  const handleSaveNotes = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    if (!(await persistLead(leadId, { status: lead.status, adminNotes: editingNotes }))) return;

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, adminNotes: editingNotes, updatedAt: new Date().toISOString() } : l
      )
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, adminNotes: editingNotes } : null));
    }
    setToastMessage(isBn ? 'নোট সংরক্ষিত হয়েছে' : 'Admin notes updated');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Metrics summary
  const pendingCount = leads.filter((l) => l.status === 'incomplete').length;
  const contactedCount = leads.filter((l) => l.status === 'contacted').length;
  const convertedCount = leads.filter((l) => l.status === 'converted').length;
  const potentialRevenuePaisa = leads
    .filter((l) => l.status === 'incomplete' || l.status === 'contacted')
    .reduce((sum, l) => sum + l.totalAmount, 0);

  const filteredLeads =
    activeStatusFilter === 'all' ? leads : leads.filter((l) => l.status === activeStatusFilter);

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

      {/* A rejected update must not look like it succeeded. */}
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
            className="text-red-700 hover:text-red-900 text-xs shrink-0 min-h-11 min-w-11 flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* "No leads" and "could not load leads" must not look identical. */}
      {loadError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-sm shadow-sm"
        >
          <p className="font-bold">
            {isBn ? 'লিড তালিকা লোড করা যায়নি' : 'Could not load leads'}
          </p>
          <p className="mt-0.5 break-words leading-relaxed">{loadError}</p>
          <button
            type="button"
            onClick={() => loadLeads()}
            className="mt-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs min-h-11 cursor-pointer"
          >
            {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
          </button>
        </div>
      )}

      {/* Recovery Executive Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              {isBn ? 'পেন্ডিং অসম্পূর্ণ লিড' : 'Pending Leads'}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-rose-900 font-display">{pendingCount}</div>
          <p className="text-[11px] text-[#787774]">
            {isBn ? 'গ্রাহক ফোন নম্বর দিয়ে থেমে গেছেন' : 'Phone entered, dropped before checkout'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
            {isBn ? 'সম্ভাব্য বিক্রয় মূল্য' : 'Potential Value'}
          </span>
          <div className="text-2xl font-black text-amber-900 font-display">
            {fmtMoney(potentialRevenuePaisa, locale as Locale)}
          </div>
          <p className="text-[11px] text-[#787774]">
            {isBn ? 'রিকভারিযোগ্য মোট টাকার পরিমাণ' : 'Unrecovered potential cart revenue'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-sky-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-sky-800 uppercase tracking-wider block">
            {isBn ? 'যোগাযোগ চলমান' : 'Contacted / In Talk'}
          </span>
          <div className="text-2xl font-black text-sky-900 font-display">{contactedCount}</div>
          <p className="text-[11px] text-[#787774]">
            {isBn ? 'কল বা হোয়াটসঅ্যাপে আলোচনা চলছে' : 'WhatsApp / Call initiated'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
            {isBn ? 'সফল রিকভারি' : 'Recovered & Placed'}
          </span>
          <div className="text-2xl font-black text-emerald-900 font-display">{convertedCount}</div>
          <p className="text-[11px] text-[#787774]">
            {isBn ? 'সরাসরি অর্ডারে রূপান্তর হয়েছে' : 'Converted to confirmed orders'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-nowrap sm:flex-wrap w-full max-w-full touch-pan-x">
        <button
          type="button"
          onClick={() => setActiveStatusFilter('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeStatusFilter === 'all'
              ? 'bg-zinc-800 text-white border-zinc-800 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:text-[#2F3437] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'সকল অসম্পূর্ণ অর্ডার' : 'All Leads'} ({leads.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveStatusFilter('incomplete')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeStatusFilter === 'incomplete'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
          }`}
        >
          {isBn ? '🔴 পেন্ডিং' : '🔴 Incomplete'} ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveStatusFilter('contacted')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeStatusFilter === 'contacted'
              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
              : 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50'
          }`}
        >
          {isBn ? '💬 যোগাযোগকৃত' : '💬 Contacted'} ({contactedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveStatusFilter('converted')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeStatusFilter === 'converted'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          {isBn ? '✓ কনভার্টেড' : '✓ Converted'} ({convertedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveStatusFilter('discarded')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
            activeStatusFilter === 'discarded'
              ? 'bg-zinc-600 text-white border-zinc-600 shadow-xs'
              : 'bg-white text-[#5F6368] border-[#EAEAEA] hover:bg-[#F7F6F3]'
          }`}
        >
          {isBn ? 'বাতিল' : 'Discarded'} ({leads.filter((l) => l.status === 'discarded').length})
        </button>
      </div>

      {/* Leads Table */}
      <div className="rounded-2xl border border-[#EAEAEA] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full max-w-full touch-pan-x">
          <table className="min-w-[950px] w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#787774] uppercase tracking-wider border-b border-[#EAEAEA] bg-[#FBFBFA]">
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'গ্রাহক ও রিস্ক স্কোর' : 'Customer & Risk'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'কার্টের ওষুধ' : 'Cart Items'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'সম্ভাব্য মূল্য' : 'Estimated Total'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'ক্যাম্পেইন সোর্স' : 'Campaign Source'}</th>
                <th className="px-5 py-3.5 font-semibold">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="px-5 py-3.5 font-semibold text-right">{isBn ? 'টেলি-সেলস কমান্ড' : 'Quick Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-[#787774]">
                    {isBn ? 'কোনো অসম্পূর্ণ লিড পাওয়া যায়নি।' : 'No incomplete leads found.'}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const fraud = fraudCache[lead.phone];

                  return (
                    <tr key={lead.id} className="hover:bg-[#F9F9F8] transition-colors">
                      {/* Customer Info */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-[#2F3437] text-xs">
                          {lead.name || (isBn ? 'নাম প্রকাশ করেনি' : 'Unspecified Customer')}
                        </div>
                        <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
                          📱 {lead.phone}
                        </div>
                        {lead.district && (
                          <div className="text-[11px] text-[#787774] mt-0.5">
                            📍 {lead.district}, {lead.division}
                          </div>
                        )}
                        {/* Fraud Risk Indicator */}
                        {fraud && (
                          <div className="mt-1">
                            <span
                              className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                                fraud.riskLevel === 'low'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : fraud.riskLevel === 'medium'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                              }`}
                            >
                              <span>{fraud.riskLevel === 'low' ? '🟢' : fraud.riskLevel === 'medium' ? '🟡' : '🔴'}</span>
                              <span>{fraud.successRate}% Courier Success</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Items in Cart */}
                      <td className="px-5 py-3.5 max-w-[220px]">
                        {lead.items.map((item, idx) => (
                          <div key={idx} className="text-xs font-medium text-[#2F3437] truncate">
                            <span className="font-bold">{item.quantity}x</span> {isBn ? item.productNameBn : item.productNameEn}
                          </div>
                        ))}
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-3.5 font-mono font-extrabold text-[#2F3437] text-xs">
                        {fmtMoney(lead.totalAmount, locale as Locale)}
                      </td>

                      {/* Campaign & Timing */}
                      <td className="px-5 py-3.5">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-800 text-[10px] font-bold uppercase">
                          <span>📣</span> {lead.utmSource || 'Direct'}
                        </div>
                        <div className="text-[10px] text-[#787774] mt-1">
                          {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border ${
                            lead.status === 'converted'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : lead.status === 'contacted'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : lead.status === 'discarded'
                              ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>

                      {/* Instant Recovery Actions */}
                      <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {/* Call Cockpit Action */}
                        <button
                          type="button"
                          onClick={() => {
                            setCallDrawerLead(lead);
                            handleStatusChange(lead.id, 'contacted');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-colors cursor-pointer"
                          title={isBn ? 'কল রেকর্ড ও ড্যাশবোর্ড' : 'Open Call Log Cockpit'}
                        >
                          <span>📞</span> {isBn ? 'কল লগ' : 'Call'}
                        </button>

                        {/* WhatsApp Recovery Action */}
                        <button
                          type="button"
                          onClick={() => {
                            handleStatusChange(lead.id, 'contacted');
                            setWhatsappContext({
                              customerName: lead.name || '',
                              customerPhone: lead.phone,
                              orderNumber: `LEAD-${lead.id.slice(-5)}`,
                              totalAmountTaka: lead.totalAmount / 100,
                              recipientAddress: `${lead.address || ''}, ${lead.district || ''}`,
                              itemsSummary: lead.items
                                .map((it) => (isBn ? it.productNameBn : it.productNameEn))
                                .join(', '),
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 transition-colors cursor-pointer"
                          title={isBn ? 'হোয়াটসঅ্যাপে প্রি-ফিল্ড মেসেজ পাঠান' : 'Send WhatsApp Recovery Template'}
                        >
                          <span>💬</span> WhatsApp
                        </button>

                        {/* Convert to Order Action */}
                        {lead.status !== 'converted' && (
                          <button
                            type="button"
                            onClick={() => handleConvertLeadToOrder(lead)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                            title={isBn ? 'সরাসরি কনফার্মড অর্ডারে রূপান্তর করুন' : 'Convert to Placed Order'}
                          >
                            <span>⚡</span> {isBn ? 'অর্ডার করুন' : 'Convert'}
                          </button>
                        )}

                        {/* Details & Notes */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLead(lead);
                            setEditingNotes(lead.adminNotes || '');
                          }}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-xl bg-[#F7F6F3] hover:bg-[#EAEAEA] text-[#2F3437] font-semibold text-xs border border-[#EAEAEA] transition-colors cursor-pointer"
                        >
                          {isBn ? 'নোট' : 'Notes'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call Log Drawer */}
      {callDrawerLead && (
        <CallLogDrawer
          isOpen={Boolean(callDrawerLead)}
          onClose={() => setCallDrawerLead(null)}
          customerName={callDrawerLead.name || 'Unspecified Lead'}
          customerPhone={callDrawerLead.phone}
          orderNumber={`LEAD-${callDrawerLead.id.slice(-6)}`}
          deliveryAddress={`${callDrawerLead.address || ''}, ${callDrawerLead.district || ''}`}
          totalAmountPaisa={callDrawerLead.totalAmount}
          fraudReport={fraudCache[callDrawerLead.phone] || null}
          onAddLog={async (entry: CallLogEntry) => {
            // The call outcome is persisted as the lead's admin note so the
            // next operator to pick up this lead can see it.
            const note = `[${entry.outcome.toUpperCase()}] ${entry.note}`;
            if (!(await persistLead(callDrawerLead.id, { status: callDrawerLead.status, adminNotes: note }))) {
              return;
            }
            setLeads((prev) =>
              prev.map((l) =>
                l.id === callDrawerLead.id
                  ? { ...l, adminNotes: note, updatedAt: new Date().toISOString() }
                  : l
              )
            );
          }}
          locale={locale}
        />
      )}

      {/* WhatsApp Template Modal */}
      {whatsappContext && (
        <WhatsAppTemplateModal
          isOpen={Boolean(whatsappContext)}
          onClose={() => setWhatsappContext(null)}
          context={whatsappContext}
          locale={locale}
        />
      )}

      {/* Lead Details & Notes Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#2F3437]">
                  {isBn ? 'অসম্পূর্ণ লিড বিস্তারিত' : 'Incomplete Lead Details'}
                </h3>
                <p className="text-xs text-[#787774] font-mono">ID: {selectedLead.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="text-[#787774] hover:text-[#2F3437] text-sm font-bold p-1 rounded-lg hover:bg-[#F7F6F3] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Customer summary */}
              <div className="p-3.5 rounded-2xl bg-[#F7F6F3] border border-[#EAEAEA] space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-[#787774]">Customer:</span>
                  <span className="font-bold text-[#2F3437]">{selectedLead.name || 'Unspecified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#787774]">Phone:</span>
                  <span className="font-bold text-emerald-700">{selectedLead.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#787774]">Location:</span>
                  <span className="font-bold text-[#2F3437]">
                    {selectedLead.address || '—'}, {selectedLead.district || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#787774]">Campaign:</span>
                  <span className="font-bold text-purple-700">
                    {selectedLead.utmSource || 'Direct'} ({selectedLead.utmCampaign || 'None'})
                  </span>
                </div>
              </div>

              {/* Items in cart */}
              <div className="space-y-2">
                <span className="font-bold text-[#2F3437] uppercase block">Abandoned Items:</span>
                {selectedLead.items.map((it, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 rounded-xl bg-[#FBFBFA] border border-[#EAEAEA]">
                    <div>
                      <div className="font-bold text-[#2F3437]">{isBn ? it.productNameBn : it.productNameEn}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">Pack: {it.packSize || 'Standard'}</div>
                    </div>
                    <div className="font-mono font-bold text-emerald-700">
                      {it.quantity} x {fmtMoney(it.unitPrice, locale as Locale)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Admin Notes editor */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#2F3437] block">
                  {isBn ? 'অ্যাডমিন কল ও ফলোআপ নোট:' : 'Admin Call & Follow-up Notes:'}
                </label>
                <textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  rows={3}
                  placeholder={isBn ? 'খামারির সাথে কথোপকথনের নোট লিখুন...' : 'Write notes from phone call...'}
                  className="w-full p-2.5 rounded-xl border border-input text-xs font-medium text-foreground bg-background outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => handleSaveNotes(selectedLead.id)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  {isBn ? 'নোট সেভ করুন' : 'Save Notes'}
                </button>
              </div>

              {/* Actions in modal */}
              <div className="pt-3 border-t border-[#EAEAEA] flex flex-wrap gap-2 justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedLead.id, 'contacted')}
                    className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold hover:bg-sky-100"
                  >
                    Mark Contacted
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedLead.id, 'discarded')}
                    className="px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-700 border border-zinc-300 text-xs font-bold hover:bg-zinc-200"
                  >
                    Discard Lead
                  </button>
                </div>

                {selectedLead.status !== 'converted' && (
                  <button
                    type="button"
                    onClick={() => handleConvertLeadToOrder(selectedLead)}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    ⚡ Convert to Order
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
