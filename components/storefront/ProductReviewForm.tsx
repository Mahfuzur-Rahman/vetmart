'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import type { Review } from '@/lib/mock-data/reviews';

interface Props {
  locale: Locale;
  productId: string;
  productSlug: string;
  productName: string;
  onReviewSubmitted: (newReview: Review) => void;
  onCancel?: () => void;
}

const ROLES = [
  { value: 'dairy_farmer', labelEn: 'Dairy & Cattle Farmer', labelBn: 'ডেইরি ও দুগ্ধ খামারি' },
  { value: 'poultry_farmer', labelEn: 'Commercial Poultry Farmer', labelBn: 'বাণিজ্যিক পোল্ট্রি খামারি' },
  { value: 'vet_dvm', labelEn: 'Registered Veterinarian (DVM)', labelBn: 'রেজিস্টার্ড ভেটেরিনারিয়ান (ডিভিএম)' },
  { value: 'pet_owner', labelEn: 'Pet Parent (Cat / Dog)', labelBn: 'পোষা প্রাণীর অভিভাবক (বিড়াল/কুকুর)' },
  { value: 'farmer', labelEn: 'General Livestock Farmer', labelBn: 'সাধারণ গবাদিপশু খামারি' },
] as const;

const SPECIES_OPTIONS = [
  { value: 'cattle', labelEn: 'Dairy Cattle & Buffalo', labelBn: 'গাভী ও মহিষ' },
  { value: 'poultry', labelEn: 'Broiler & Layer Poultry', labelBn: 'ব্রয়লার ও লেয়ার মুরগি' },
  { value: 'goat', labelEn: 'Goat & Sheep', labelBn: 'ছাগল ও ভেড়া' },
  { value: 'aqua', labelEn: 'Fish & Aqua Culture', labelBn: 'মাছ ও চিংড়ি' },
  { value: 'pet', labelEn: 'Pets (Dogs, Cats, Birds)', labelBn: 'পোষা প্রাণী (কুকুর, বিড়াল)' },
] as const;

const RATING_LABELS = {
  en: ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent / Highly Recommended'],
  bn: ['', 'খারাপ', 'মোটামুটি', 'ভালো', 'খুব ভালো', 'চমৎকার / অত্যন্ত সুপারিশকৃত'],
};

export function ProductReviewForm({
  locale,
  productId,
  productSlug,
  productName,
  onReviewSubmitted,
  onCancel,
}: Props) {
  const isBn = locale === 'bn';

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState<Review['authorRole']>('dairy_farmer');
  const [location, setLocation] = useState('');
  const [speciesTreated, setSpeciesTreated] = useState('cattle');
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isVetRecommended, setIsVetRecommended] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentHoverOrRating = hoverRating || rating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim()) {
      setErrorMsg(isBn ? 'আপনার নাম লিখুন' : 'Please enter your name');
      return;
    }
    if (!comment.trim() || comment.trim().length < 8) {
      setErrorMsg(isBn ? 'কমপক্ষে ৮ অক্ষরের মতামত লিখুন' : 'Please write at least 8 characters of feedback');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const selectedRole = ROLES.find((r) => r.value === authorRole) || ROLES[0];
    const selectedSpecies = SPECIES_OPTIONS.find((s) => s.value === speciesTreated) || SPECIES_OPTIONS[0];

    const newReview: Review = {
      id: `rev-user-${Date.now()}`,
      productId,
      productSlug,
      authorName: authorName.trim(),
      authorRole,
      authorRoleLabelEn: selectedRole.labelEn,
      authorRoleLabelBn: selectedRole.labelBn,
      location: location.trim() || (isBn ? 'বাংলাদেশ' : 'Bangladesh'),
      rating,
      titleEn: title.trim() || (isBn ? 'ভালো ফলাফল পেয়েছি' : 'Effective formulation'),
      titleBn: title.trim() || 'ভালো ফলাফল পেয়েছি',
      commentEn: comment.trim(),
      commentBn: comment.trim(),
      speciesTreated,
      speciesTreatedLabelEn: selectedSpecies.labelEn,
      speciesTreatedLabelBn: selectedSpecies.labelBn,
      isVerifiedPurchase: true,
      isVetRecommended,
      helpfulCount: 0,
      createdAt: new Date().toISOString(),
    };

    setTimeout(() => {
      onReviewSubmitted(newReview);
      setSubmitting(false);
    }, 300);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-emerald-500/30 bg-card p-6 sm:p-8 space-y-6 shadow-md transition-all animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h3 className="font-extrabold text-lg sm:text-xl text-foreground flex items-center gap-2">
            <span>✍️</span>
            <span>{isBn ? 'আপনার মতামত ও অভিজ্ঞতা লিখুন' : 'Write a Verified Review'}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isBn
              ? `${productName}-এর কার্যকারিতা সম্পর্কে আপনার মূল্যবান মতামত জানান`
              : `Share your clinical or farm experience with ${productName}`}
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary transition-colors cursor-pointer text-xs font-bold"
          >
            ✕ {isBn ? 'বাতিল' : 'Cancel'}
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Star Rating Picker */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
          {isBn ? 'সামগ্রিক রেটিং (স্টার নির্বাচন করুন)' : 'Overall Rating (Click Stars)'} *
        </label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-2xl sm:text-3xl transition-transform hover:scale-115 active:scale-95 cursor-pointer focus:outline-none"
                aria-label={`${star} star`}
              >
                <span className={star <= currentHoverOrRating ? 'text-amber-400 drop-shadow-xs' : 'text-muted/40'}>
                  ★
                </span>
              </button>
            ))}
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-lg">
            {RATING_LABELS[locale][currentHoverOrRating]}
          </span>
        </div>
      </div>

      {/* 2. Reviewer Name & Role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground block">
            {isBn ? 'আপনার নাম / উপাধি' : 'Your Name / Title'} *
          </label>
          <input
            type="text"
            required
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder={isBn ? 'যেমন: ডাঃ তরিকুল ইসলাম / মোঃ কামাল' : 'e.g. Dr. Tariqul Islam (DVM) / Kamal Hossain'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground block">
            {isBn ? 'আপনার পেশা / খামারের ধরন' : 'Your Role / Farm Type'} *
          </label>
          <select
            value={authorRole}
            onChange={(e) => setAuthorRole(e.target.value as any)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {isBn ? r.labelBn : r.labelEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Location & Species Treated */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground block">
            {isBn ? 'জেলা / উপজেলা (অবস্থান)' : 'Location / District'}
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={isBn ? 'যেমন: বগুড়া সদর / গাজীপুর' : 'e.g. Bogura / Gazipur / Dhaka'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground block">
            {isBn ? 'কোন প্রাণীর চিকিৎসায় প্রয়োগ করেছেন?' : 'Species Treated'}
          </label>
          <select
            value={speciesTreated}
            onChange={(e) => setSpeciesTreated(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer"
          >
            {SPECIES_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {isBn ? s.labelBn : s.labelEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Review Headline & Detailed Feedback */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground block">
          {isBn ? 'রিভিউ শিরোনাম (সংক্ষেপ)' : 'Review Headline'}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isBn ? 'যেমন: সিআরডি ও ঠান্ডার সমস্যায় খুব দ্রুত ফল পেয়েছি' : 'e.g. Highly effective recovery within 48 hours'}
          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground block">
          {isBn ? 'বিস্তারিত অভিজ্ঞতা ও ফলাফল' : 'Detailed Review / Clinical Feedback'} *
        </label>
        <textarea
          required
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            isBn
              ? 'ওষুধটির কার্যকারিতা, ডোজ, পার্শ্বপ্রতিক্রিয়া বা ফলাফল কেমন ছিল বিস্তারিত লিখুন...'
              : 'Describe the medication dosage, recovery timeframe, or flock response...'
          }
          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs sm:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none"
        />
      </div>

      {/* 5. Recommendation Toggle */}
      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary/40 border border-border">
        <input
          type="checkbox"
          id="vetRecommend"
          checked={isVetRecommended}
          onChange={(e) => setIsVetRecommended(e.target.checked)}
          className="w-4 h-4 text-emerald-600 rounded-md border-border focus:ring-emerald-500 cursor-pointer accent-emerald-600"
        />
        <label htmlFor="vetRecommend" className="text-xs font-semibold text-foreground cursor-pointer select-none">
          {isBn
            ? '✓ আমি অন্যান্য খামারি ও পশু চিকিৎসকদের এই ওষুধটি ব্যবহারের সুপারিশ করছি'
            : '✓ I recommend this veterinary medication to other farmers and clinicians'}
        </label>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{isBn ? 'জমা হচ্ছে...' : 'Submitting...'}</span>
            </>
          ) : (
            <>
              <span>✓</span>
              <span>{isBn ? 'রিভিউ জমা দিন' : 'Submit Review'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
