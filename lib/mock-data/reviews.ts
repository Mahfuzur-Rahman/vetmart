// lib/mock-data/reviews.ts
// Realistic veterinary medicine customer reviews, farmer feedback & DVM ratings

export interface Review {
  id: string;
  productId?: string;
  productSlug?: string;
  authorName: string;
  authorRole: 'dairy_farmer' | 'poultry_farmer' | 'vet_dvm' | 'pet_owner' | 'farmer';
  authorRoleLabelEn: string;
  authorRoleLabelBn: string;
  location: string;
  rating: number; // 1 to 5
  titleEn: string;
  titleBn: string;
  commentEn: string;
  commentBn: string;
  speciesTreated?: string;
  speciesTreatedLabelEn?: string;
  speciesTreatedLabelBn?: string;
  isVerifiedPurchase: boolean;
  isVetRecommended?: boolean;
  helpfulCount: number;
  createdAt: string;
}

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'rev-001',
    productSlug: 'renaflox-100ml',
    authorName: 'ডাঃ তরিকুল ইসলাম (ডিভিএম)',
    authorRole: 'vet_dvm',
    authorRoleLabelEn: 'Registered Veterinarian (DVM)',
    authorRoleLabelBn: 'রেজিস্টার্ড ভেটেরিনারিয়ান (ডিভিএম)',
    location: 'বগুড়া সদর, বগুড়া',
    rating: 5,
    titleEn: 'Highly effective against acute respiratory infections in broilers',
    titleBn: 'ব্রয়লারের শ্বাসকষ্ট ও সিআরডি রোগের ক্ষেত্রে অত্যন্ত কার্যকর',
    commentEn:
      'Renaflox (Enrofloxacin 10%) has proven very dependable for colibacillosis and mycoplasma outbreaks in layer and broiler sheds. Good oral bioavailability and standard withdrawal period.',
    commentBn:
      'রেনাফলক্স (এনরোফ্লক্সাসিন ১০%) পোল্ট্রির সিআরডি ও ই-কোলাই ইনফেকশনে দ্রুত কাজ করে। খামারিদের সঠিক ডোজে ব্যবহারের পরামর্শ দিচ্ছি। ওষুধটি কোল্ড চেইনে সঠিকভাবে সরবরাহ পেয়েছি।',
    speciesTreated: 'poultry',
    speciesTreatedLabelEn: 'Broiler / Layer Poultry',
    speciesTreatedLabelBn: 'ব্রয়লার ও লেয়ার মুরগি',
    isVerifiedPurchase: true,
    isVetRecommended: true,
    helpfulCount: 24,
    createdAt: '2026-08-01T10:30:00Z',
  },
  {
    id: 'rev-002',
    productSlug: 'renaflox-100ml',
    authorName: 'মোঃ মোশাররফ হোসেন',
    authorRole: 'poultry_farmer',
    authorRoleLabelEn: 'Commercial Poultry Farmer (12,000 birds)',
    authorRoleLabelBn: 'বাণিজ্যিক পোল্ট্রি খামারি (১২,০০০ মুরগি)',
    location: 'শ্রীপুর, গাজীপুর',
    rating: 5,
    titleEn: 'Fast recovery within 48 hours for my flock',
    titleBn: '৪৮ ঘণ্টার মধ্যে মুরগির ঘড়ঘড় শব্দ কমে গেছে',
    commentEn:
      'Ordered 10 bottles through VetMart BD. Delivered in refrigerated safety pack within 24 hours. The batch was fresh with late 2027 expiry date.',
    commentBn:
      'ভেটমার্ট থেকে ১০ বোতল অর্ডার করেছিলাম। দ্রুত ডেলিভারি পেয়েছি এবং প্যাকেজিং খুব ভালো ছিল। মুরগির ঠান্ডার সমস্যায় দারুণ ফল পেয়েছি।',
    speciesTreated: 'poultry',
    speciesTreatedLabelEn: 'Layer Poultry',
    speciesTreatedLabelBn: 'লেয়ার মুরগি',
    isVerifiedPurchase: true,
    isVetRecommended: false,
    helpfulCount: 18,
    createdAt: '2026-07-25T14:15:00Z',
  },
  {
    id: 'rev-003',
    productSlug: 'renaflox-100ml',
    authorName: 'ডাঃ মোসাদ্দেকুর রহমান',
    authorRole: 'dairy_farmer',
    authorRoleLabelEn: 'Dairy & Cattle Farm Owner',
    authorRoleLabelBn: 'ডেইরি ও দুগ্ধ খামার মালিক',
    location: 'সিরাজগঞ্জ সদর',
    rating: 4,
    titleEn: 'Good broad spectrum antibiotic for calves',
    titleBn: 'বাছুরের পাতলা পায়খানা ও নিউমোনিয়ায় খুব ভালো কাজ করে',
    commentEn:
      'Effective treatment for bacterial enteritis in young calves. Make sure to adhere to the 7-day meat withdrawal guidelines as indicated.',
    commentBn:
      'বাছুরের ব্যাকটেরিয়াল ডায়রিয়া ও সর্দি-কাশির চিকিৎসায় খুব দ্রুত উন্নতি হয়। প্রত্যাহারের সময়সীমা মেনে চলা জরুরি।',
    speciesTreated: 'cattle',
    speciesTreatedLabelEn: 'Dairy Cattle & Calves',
    speciesTreatedLabelBn: 'দুগ্ধবতী গাভী ও বাছুর',
    isVerifiedPurchase: true,
    isVetRecommended: true,
    helpfulCount: 11,
    createdAt: '2026-07-10T09:00:00Z',
  },
  {
    id: 'rev-004',
    productSlug: 'rena-ws-100g',
    authorName: 'সুলতান মাহমুদ',
    authorRole: 'poultry_farmer',
    authorRoleLabelEn: 'Poultry Farm Owner',
    authorRoleLabelBn: 'পোল্ট্রি খামার মালিক',
    location: 'ময়মনসিংহ',
    rating: 5,
    titleEn: 'Essential water soluble vitamin premix',
    titleBn: 'ভ্যাকসিনের আগে ও পরে ধকল কাটাতে সেরা ভিটামিন',
    commentEn:
      'Rena-WS dissolves completely in drinking water with zero residue. Keeps flock appetite high during hot summer weather.',
    commentBn:
      'পানিতে খুব সহজে মিশে যায়। গরমের সময় মুরগির হিট স্ট্রোক এবং ভ্যাকসিনের পর শারীরিক ধকল কমাতে নিয়মিত ব্যবহার করি।',
    speciesTreated: 'poultry',
    speciesTreatedLabelEn: 'Poultry Flock',
    speciesTreatedLabelBn: 'পোল্ট্রি শেড',
    isVerifiedPurchase: true,
    isVetRecommended: true,
    helpfulCount: 32,
    createdAt: '2026-08-05T16:20:00Z',
  },
  {
    id: 'rev-005',
    productSlug: 'catophos-100ml',
    authorName: 'ডাঃ আরিফুল ইসলাম',
    authorRole: 'vet_dvm',
    authorRoleLabelEn: 'Upazila Livestock Officer & Vet',
    authorRoleLabelBn: 'উপজেলা প্রাণিসম্পদ সার্জন ও ভেট',
    location: 'পাবনা',
    rating: 5,
    titleEn: 'Gold standard metabolic stimulant and recovery booster',
    titleBn: 'গাভীর মেটাবলিজম ও প্রসব পরবর্তী দুর্বলতা দূরীকরণে সেরা',
    commentEn:
      'Catophos (Butaphosphan + B12) is unrivaled for post-calving hypocalcemia recovery and milk yield restoration. 100% genuine cold chain stock from VetMart.',
    commentBn:
      'প্রসব পরবর্তী গাভীর ক্যালসিয়াম ও ফসফরাসের ঘাটতি পূরণে ক্যাটোফসের বিকল্প নেই। দুধের উৎপাদন দ্রুত স্বাভাবিক করে তোলে।',
    speciesTreated: 'cattle',
    speciesTreatedLabelEn: 'Dairy Cattle',
    speciesTreatedLabelBn: 'দুগ্ধবতী গাভী',
    isVerifiedPurchase: true,
    isVetRecommended: true,
    helpfulCount: 45,
    createdAt: '2026-07-18T11:00:00Z',
  },
  {
    id: 'rev-006',
    productSlug: 'paracip-vet-bolus',
    authorName: 'মোঃ বাবুল আক্তার',
    authorRole: 'dairy_farmer',
    authorRoleLabelEn: 'Livestock Farmer',
    authorRoleLabelBn: 'গবাদিপশু খামারি',
    location: 'নাটোর',
    rating: 5,
    titleEn: 'Quick fever reducer and pain relief for cattle',
    titleBn: 'গাভীর জ্বর ও ব্যথায় দ্রুত আরাম দেয়',
    commentEn:
      'Very effective bolus for high fever and joint pain after vaccination or weather changes. High quality packaging.',
    commentBn:
      'ঋতু পরিবর্তনের সময় গাভীর হঠাৎ জ্বরে এই বোলাস খাওয়ালে খুব দ্রুত জ্বর নেমে যায়। দামও সাধ্যের মধ্যে।',
    speciesTreated: 'cattle',
    speciesTreatedLabelEn: 'Cattle & Buffalo',
    speciesTreatedLabelBn: 'গরু ও মহিষ',
    isVerifiedPurchase: true,
    isVetRecommended: false,
    helpfulCount: 9,
    createdAt: '2026-06-29T12:00:00Z',
  },
  {
    id: 'rev-007',
    productSlug: 'general',
    authorName: 'সৈয়দা ফারহানা',
    authorRole: 'pet_owner',
    authorRoleLabelEn: 'Pet Parent (Cats & Dogs)',
    authorRoleLabelBn: 'পোষা প্রাণীর অভিভাবক (বিড়াল ও কুকুর)',
    location: 'গুলশান, ঢাকা',
    rating: 5,
    titleEn: 'Original pharmaceutical grade product',
    titleBn: 'অরিজিনাল ওষুধ এবং দ্রুত হোম ডেলিভারি',
    commentEn:
      'VetMart BD provided genuine medication with clear expiry date and cold storage bag. Super satisfied with customer support.',
    commentBn:
      'বাংলাদেশে জেনুইন পেট মেডিসিন খুঁজে পাওয়া কঠিন ছিল। ভেটমার্ট থেকে নিখুঁত কোল্ড বক্সে ওষুধ পেয়েছি।',
    speciesTreated: 'pet',
    speciesTreatedLabelEn: 'Cats / Dogs',
    speciesTreatedLabelBn: 'বিড়াল ও কুকুর',
    isVerifiedPurchase: true,
    isVetRecommended: false,
    helpfulCount: 15,
    createdAt: '2026-07-22T08:30:00Z',
  },
];

export function getProductReviews(productSlug?: string, productId?: string): Review[] {
  if (!productSlug && !productId) return MOCK_REVIEWS;

  const matches = MOCK_REVIEWS.filter(
    (r) =>
      (productSlug && r.productSlug === productSlug) ||
      (productId && r.productId === productId)
  );

  // If specific product has reviews, return them; otherwise provide relevant seed reviews
  if (matches.length > 0) {
    return matches;
  }

  // Fallback sample reviews tailored for any veterinary item
  return [
    {
      id: `rev-gen-1-${productSlug}`,
      productSlug,
      authorName: 'ডাঃ মোস্তাফিজুর রহমান (ডিভিএম)',
      authorRole: 'vet_dvm',
      authorRoleLabelEn: 'Registered Veterinarian (DVM)',
      authorRoleLabelBn: 'রেজিস্টার্ড ভেটেরিনারিয়ান',
      location: 'গাজীপুর সদর',
      rating: 5,
      titleEn: 'Reliable efficacy and genuine DGDA registered batch',
      titleBn: 'নির্ভরযোগ্য কার্যকারিতা ও ১০০% ডিজিডিএ অনুমোদিত ব্যাচ',
      commentEn:
        'Recommended formulation for livestock treatment. Properly preserved and delivered with authentic batch verification.',
      commentBn:
        'গবাদিপশু ও পোল্ট্রির চিকিৎসায় নিয়মিত এই ফর্মুলেশন ব্যবহার করি। ভেটমার্টের ওষুধের মান ও কোল্ড চেইন নির্ভরযোগ্য।',
      speciesTreated: 'cattle',
      speciesTreatedLabelEn: 'Livestock & Poultry',
      speciesTreatedLabelBn: 'গবাদিপশু ও পোল্ট্রি',
      isVerifiedPurchase: true,
      isVetRecommended: true,
      helpfulCount: 19,
      createdAt: '2026-08-03T10:00:00Z',
    },
    {
      id: `rev-gen-2-${productSlug}`,
      productSlug,
      authorName: 'আনোয়ার হোসেন খন্দকার',
      authorRole: 'dairy_farmer',
      authorRoleLabelEn: 'Dairy Farm Owner (35 cows)',
      authorRoleLabelBn: 'দুগ্ধ খামারি (৩৫টি গাভী)',
      location: 'সাভার, ঢাকা',
      rating: 5,
      titleEn: 'Quick delivery and excellent results',
      titleBn: 'সময়মতো ডেলিভারি পেয়েছি এবং চমৎকার রেজাল্ট',
      commentEn:
        'Good results in farm animals. Original packaging and intact seal.',
      commentBn:
        'খামারের জন্য নিয়মিত প্রয়োজন হয়। অনলাইনে ভেটমার্ট থেকে নিয়ে ঝামেলামুক্ত অভিজ্ঞতা হয়েছে।',
      speciesTreated: 'cattle',
      speciesTreatedLabelEn: 'Dairy Cattle',
      speciesTreatedLabelBn: 'ডেইরি গাভী',
      isVerifiedPurchase: true,
      isVetRecommended: false,
      helpfulCount: 12,
      createdAt: '2026-07-28T15:30:00Z',
    },
    {
      id: `rev-gen-3-${productSlug}`,
      productSlug,
      authorName: 'মোঃ রাশেদুল ইসলাম',
      authorRole: 'poultry_farmer',
      authorRoleLabelEn: 'Poultry Farm Owner',
      authorRoleLabelBn: 'পোল্ট্রি খামার মালিক',
      location: 'নরসিংদী',
      rating: 4,
      titleEn: 'Satisfied with medication performance',
      titleBn: 'ওষুধের মানে সন্তুষ্ট',
      commentEn:
        'Proper storage and standard pricing without retail overcharge.',
      commentBn:
        'ন্যায্য মূল্যে অরিজিনাল ওষুধ পাওয়ার সবচেয়ে ভালো মাধ্যম।',
      speciesTreated: 'poultry',
      speciesTreatedLabelEn: 'Poultry',
      speciesTreatedLabelBn: 'পোল্ট্রি',
      isVerifiedPurchase: true,
      isVetRecommended: false,
      helpfulCount: 7,
      createdAt: '2026-07-15T11:45:00Z',
    },
  ];
}

export function calculateReviewStats(reviews: Review[]) {
  const total = reviews.length;
  if (total === 0) {
    return {
      avgRating: 5.0,
      totalReviews: 0,
      verifiedCount: 0,
      recommendedPct: 100,
      ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
      ratingPercentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
    };
  }

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avgRating = Number((sum / total).toFixed(1));

  const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let verifiedCount = 0;
  let recommendedCount = 0;

  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    ratingCounts[star] = (ratingCounts[star] || 0) + 1;
    if (r.isVerifiedPurchase) verifiedCount++;
    if (r.rating >= 4 || r.isVetRecommended) recommendedCount++;
  });

  const ratingPercentages: Record<number, number> = {
    5: Math.round(((ratingCounts[5] || 0) / total) * 100),
    4: Math.round(((ratingCounts[4] || 0) / total) * 100),
    3: Math.round(((ratingCounts[3] || 0) / total) * 100),
    2: Math.round(((ratingCounts[2] || 0) / total) * 100),
    1: Math.round(((ratingCounts[1] || 0) / total) * 100),
  };

  const recommendedPct = Math.round((recommendedCount / total) * 100);

  return {
    avgRating,
    totalReviews: total,
    verifiedCount,
    recommendedPct,
    ratingCounts,
    ratingPercentages,
  };
}
