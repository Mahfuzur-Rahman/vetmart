'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { fmtDate, fmtNumber } from '@/lib/i18n/number';
import { calculateReviewStats, type Review } from '@/lib/mock-data/reviews';
import { ProductReviewForm } from './ProductReviewForm';
import type { Locale } from '@/lib/i18n/config';

interface Props {
  locale: Locale;
  productId: string;
  productSlug: string;
  productName: string;
}

type FilterType = 'all' | '5' | '4' | '3' | 'verified' | 'vet';

export function ProductReviewsSection({ locale, productId, productSlug, productName }: Props) {
  const isBn = locale === 'bn';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showForm, setShowForm] = useState(false);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [justSubmittedSuccess, setJustSubmittedSuccess] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Load reviews from the server.
   *
   * Reviews used to be merged with a per-browser localStorage list under
   * `vetmart_reviews_{slug}`, so a review someone wrote was only ever visible
   * to that person and looked published to them. Reviews are social proof: a
   * review only one device can see is worse than no review at all.
   */
  const loadReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/products/${productSlug}/reviews`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      setReviews(Array.isArray(payload?.data) ? payload.data : []);
      setLoadError(null);
    } catch (err) {
      console.error('Could not load reviews:', err);
      setLoadError(err instanceof Error ? err.message : 'Could not load reviews');
    }
  }, [productSlug]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Review stats
  const stats = useMemo(() => calculateReviewStats(reviews), [reviews]);

  // Handle new review submission
  const handleReviewSubmitted = async (newReview: Review) => {
    setSubmitError(null);

    try {
      const res = await fetch(`/api/v1/products/${productSlug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          authorName: newReview.authorName,
          authorRole: newReview.authorRole,
          location: newReview.location,
          rating: newReview.rating,
          title: newReview.titleEn || newReview.titleBn,
          comment: newReview.commentEn || newReview.commentBn,
          speciesTreated: newReview.speciesTreated,
          isVetRecommended: newReview.isVetRecommended,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setSubmitError(
          json?.error?.message ??
            (isBn ? 'রিভিউ জমা দেওয়া যায়নি।' : 'Could not submit your review.')
        );
        return;
      }

      // Re-read from the server so the list shows exactly what was persisted.
      await loadReviews();

      setShowForm(false);
      setJustSubmittedSuccess(true);
      setTimeout(() => setJustSubmittedSuccess(false), 4000);
    } catch (err) {
      console.error('Review submission failed:', err);
      setSubmitError(
        isBn ? 'সার্ভারের সাথে সংযোগ করা যায়নি।' : 'Could not reach the server.'
      );
    }
  };

  // Upvote helpful review
  const handleToggleHelpful = (reviewId: string) => {
    setUpvotedIds((prev) => {
      const next = new Set(prev);
      const isAlreadyUpvoted = next.has(reviewId);
      if (isAlreadyUpvoted) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }

      setReviews((cur) =>
        cur.map((r) => {
          if (r.id === reviewId) {
            return {
              ...r,
              helpfulCount: isAlreadyUpvoted ? Math.max(0, r.helpfulCount - 1) : r.helpfulCount + 1,
            };
          }
          return r;
        })
      );
      return next;
    });

    // Send helpful count to DB
    try {
      fetch(`/api/v1/reviews/${reviewId}/helpful`, { method: 'POST' }).catch(() => {});
    } catch {
      // ignore
    }
  };

  // Filter reviews
  const filteredReviews = useMemo(() => {
    if (activeFilter === 'all') return reviews;
    if (activeFilter === '5') return reviews.filter((r) => Math.round(r.rating) === 5);
    if (activeFilter === '4') return reviews.filter((r) => Math.round(r.rating) === 4);
    if (activeFilter === '3') return reviews.filter((r) => Math.round(r.rating) <= 3);
    if (activeFilter === 'verified') return reviews.filter((r) => r.isVerifiedPurchase);
    if (activeFilter === 'vet') return reviews.filter((r) => r.authorRole === 'vet_dvm' || r.isVetRecommended);
    return reviews;
  }, [reviews, activeFilter]);

  const getRoleBadgeStyle = (role: Review['authorRole']) => {
    switch (role) {
      case 'vet_dvm':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'dairy_farmer':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'poultry_farmer':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'pet_owner':
        return 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  return (
    <section id="customer-reviews" className="space-y-6 pt-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <span>⭐</span>
            <span>{isBn ? 'ক্রেতাদের মতামত ও রিভিউ' : 'Customer Ratings & Reviews'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {isBn
              ? 'নিবন্ধিত খামারি ও পশু চিকিৎসকদের বাস্তব অভিজ্ঞতার মূল্যায়ন'
              : 'Verified feedback from registered livestock farmers and veterinary doctors'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <span>✍️</span>
          <span>{showForm ? (isBn ? 'ফর্ম বন্ধ করুন' : 'Close Form') : (isBn ? 'রিভিউ লিখুন' : 'Write a Review')}</span>
        </button>
      </div>

      {/* Success Notification */}
      {justSubmittedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <span className="text-xl">🎉</span>
          <span>
            {isBn
              ? 'আপনার রিভিউ সফলভাবে জমা হয়েছে এবং নিচে যুক্ত করা হয়েছে!'
              : 'Thank you! Your verified review has been submitted and added below.'}
          </span>
        </div>
      )}

      {/* A rejected review must not look submitted. */}
      {submitError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs sm:text-sm leading-relaxed"
        >
          {submitError}
        </div>
      )}

      {/* An empty review list and a failed request must not look the same. */}
      {loadError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs sm:text-sm leading-relaxed flex flex-wrap items-center gap-3"
        >
          <span>{isBn ? 'রিভিউ লোড করা যায়নি।' : 'Could not load reviews.'}</span>
          <button
            type="button"
            onClick={() => loadReviews()}
            className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs min-h-11"
          >
            {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
          </button>
        </div>
      )}

      {/* Write Review Form Accordion */}
      {showForm && (
        <ProductReviewForm
          locale={locale}
          productId={productId}
          productSlug={productSlug}
          productName={productName}
          onReviewSubmitted={handleReviewSubmitted}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Ratings Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs">
        {/* Overall Score Box */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-border space-y-2">
          <div className="text-5xl sm:text-6xl font-extrabold text-foreground font-display tracking-tight">
            {stats.avgRating}
          </div>
          <div className="flex items-center gap-1 text-amber-400 text-xl">
            {'★'.repeat(Math.round(stats.avgRating))}
            {'☆'.repeat(5 - Math.round(stats.avgRating))}
          </div>
          <div className="text-xs font-semibold text-muted-foreground">
            {isBn
              ? `মোট ${fmtNumber(stats.totalReviews, locale)} টি ভেরিফায়েড রিভিউ`
              : `Based on ${stats.totalReviews} verified reviews`}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold mt-1">
            <span>✓</span>
            <span>{isBn ? `${fmtNumber(stats.recommendedPct, locale)}% চিকিৎসকদের সুপারিশ` : `${stats.recommendedPct}% recommended`}</span>
          </div>
        </div>

        {/* Star Breakdown Progress Meters */}
        <div className="md:col-span-8 flex flex-col justify-center space-y-2.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.ratingCounts[star] || 0;
            const pct = stats.ratingPercentages[star] || 0;

            return (
              <button
                key={star}
                type="button"
                onClick={() => setActiveFilter(String(star) as FilterType)}
                className="flex items-center gap-3 group text-left w-full hover:opacity-90 transition-opacity cursor-pointer"
              >
                <span className="w-12 text-xs font-bold text-foreground shrink-0 flex items-center gap-0.5">
                  <span>{star}</span>
                  <span className="text-amber-400">★</span>
                </span>

                {/* Progress Bar Track */}
                <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden border border-border/50">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500 group-hover:bg-amber-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <span className="w-16 text-right text-xs font-mono font-medium text-muted-foreground shrink-0">
                  {fmtNumber(count, locale)} ({fmtNumber(pct, locale)}%)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { id: 'all', labelEn: `All (${reviews.length})`, labelBn: `সব রিভিউ (${fmtNumber(reviews.length, locale)})` },
          { id: '5', labelEn: `5 Stars (${stats.ratingCounts[5] || 0})`, labelBn: `৫ স্টার (${fmtNumber(stats.ratingCounts[5] || 0, locale)})` },
          { id: '4', labelEn: `4 Stars (${stats.ratingCounts[4] || 0})`, labelBn: `৪ স্টার (${fmtNumber(stats.ratingCounts[4] || 0, locale)})` },
          { id: 'verified', labelEn: 'Verified Buyers', labelBn: 'ভেরিফায়েড ক্রেতা' },
          { id: 'vet', labelEn: 'Veterinarian (DVM)', labelBn: 'রেজিস্টার্ড ভেট' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id as FilterType)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === tab.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            }`}
          >
            {isBn ? tab.labelBn : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Reviews Cards List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground text-xs sm:text-sm">
            {isBn ? 'এই ক্যাটাগরিতে কোনো রিভিউ পাওয়া যায়নি।' : 'No reviews match the selected filter.'}
          </div>
        ) : (
          filteredReviews.map((rev) => {
            const hasUpvoted = upvotedIds.has(rev.id);
            const initial = rev.authorName.charAt(0) || 'U';

            return (
              <div
                key={rev.id}
                className="p-5 sm:p-6 rounded-2xl border border-border bg-card space-y-3.5 shadow-2xs hover:border-border/90 transition-all"
              >
                {/* Review Header: User Info & Meta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-2xs">
                      {initial}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-foreground">{rev.authorName}</span>
                        {rev.isVerifiedPurchase && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                            <span>✓</span>
                            <span>{isBn ? 'ভেরিফায়েড ক্রেতা' : 'Verified Purchase'}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-0.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getRoleBadgeStyle(rev.authorRole)}`}>
                          {isBn ? rev.authorRoleLabelBn : rev.authorRoleLabelEn}
                        </span>
                        {rev.location && <span>• {rev.location}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Rating & Date */}
                  <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1">
                    <div className="flex items-center gap-0.5 text-amber-400 text-sm">
                      {'★'.repeat(rev.rating)}
                      {'☆'.repeat(5 - rev.rating)}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {fmtDate(new Date(rev.createdAt), locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Species Tag & Recommendation Indicator */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {rev.speciesTreated && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-secondary text-foreground text-[11px] font-semibold flex items-center gap-1">
                      <span>🏷️</span>
                      <span>{isBn ? rev.speciesTreatedLabelBn || rev.speciesTreated : rev.speciesTreatedLabelEn || rev.speciesTreated}</span>
                    </span>
                  )}

                  {rev.isVetRecommended && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                      <span>👍</span>
                      <span>{isBn ? 'প্রয়োগে আশানুরূপ ফল পেয়েছেন' : 'Recommended Efficacy'}</span>
                    </span>
                  )}
                </div>

                {/* Review Title & Comment */}
                <div className="space-y-1">
                  {(isBn ? rev.titleBn : rev.titleEn) && (
                    <h4 className="font-extrabold text-sm sm:text-base text-foreground">
                      {isBn ? rev.titleBn : rev.titleEn}
                    </h4>
                  )}
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {isBn ? rev.commentBn : rev.commentEn}
                  </p>
                </div>

                {/* Helpful Button Bar */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-muted-foreground">
                    {isBn ? 'এই রিভিউটি কি আপনার উপকারে এসেছে?' : 'Was this review helpful?'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleHelpful(rev.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      hasUpvoted
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-secondary/60 hover:bg-secondary text-foreground'
                    }`}
                  >
                    <span>👍</span>
                    <span>{isBn ? 'সহায়ক' : 'Helpful'}</span>
                    <span className="font-mono">({fmtNumber(rev.helpfulCount, locale)})</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
