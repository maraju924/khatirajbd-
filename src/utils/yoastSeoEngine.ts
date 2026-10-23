import { Product, ReviewItem, SiteSettings } from '../types';

export type YoastTrafficLight = 'good' | 'ok' | 'bad';

export interface YoastCheckResult {
  id: string;
  titleBn: string;
  detailBn: string;
  status: YoastTrafficLight;
  score: number;
  maxScore: number;
}

export interface YoastSeoAnalysisResult {
  overallScore: number;
  overallStatus: YoastTrafficLight;
  resolvedTitle: string;
  resolvedDescription: string;
  resolvedSlug: string;
  resolvedCanonical: string;
  wordCount: number;
  charCount: number;
  keyphraseCount: number;
  keyphraseDensity: number;
  checks: YoastCheckResult[];
}

export interface YoastReadabilityResult {
  readabilityScore: number;
  readabilityStatus: YoastTrafficLight;
  sentenceCount: number;
  paragraphCount: number;
  avgWordsPerSentence: number;
  transitionWordRatio: number;
  checks: YoastCheckResult[];
}

const BENGALI_TRANSITION_WORDS = [
  'যেমন',
  'কারণ',
  'এছাড়া',
  'এছাড়াও',
  'তাই',
  'ফলে',
  'বিশেষত',
  'সুতরাং',
  'যেহেতু',
  'অর্থাৎ',
  'এমনকি',
  'পাশাপাশি',
  'অন্যদিকে',
  'প্রথমত',
  'দ্বিতীয়ত',
  'সর্বোপরি',
  'নিয়মিত',
  'শতভাগ',
  'প্রাকৃতিক',
  'খাঁটি',
  'সরাসরি',
  'নিশ্চিত',
  'তাছাড়া',
  'অবশ্যই',
  'মূলত',
  'সাধারণত',
  'however',
  'therefore',
  'moreover',
  'furthermore',
  'because',
  'additionally',
  'specifically',
  'especially',
];

const CATEGORY_LABELS_BN: Record<string, string> = {
  honey: 'খাঁটি মধু',
  ghee_oil: 'ঘি ও তেল',
  superfoods: 'সুপারফুডস',
  nuts_dates: 'বাদাম ও খেজুর',
  wellness: 'ভেষজ ও ওয়েলনেস',
  skincare: 'স্কিন ও হেয়ার কেয়ার',
  kitchen_cutlery: 'কিচেন ও হোম',
  combo: 'কম্বো অফার',
  fashion: 'ফ্যাশন',
  electronics: 'ইলেকট্রনিক্স',
  jewellery: 'জুয়েলারি',
  organic_food: 'অর্গানিক ফুড',
  home_lifestyle: 'হোম ও লাইফস্টাইল',
};

export function generateSeoSlug(input: string, fallbackId?: string): string {
  const raw = (input || '').trim().toLowerCase();
  if (!raw) return fallbackId || 'product';
  // Keep Bengali unicode letters/marks, ASCII alphanumeric, and hyphens
  const cleaned = raw
    .replace(/[\s_.,/\\|+|&]+/g, '-')
    .replace(/[^\p{L}\p{N}\p{M}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned.slice(0, 120) || fallbackId || 'product';
}

export function resolveYoastVariables(
  template: string,
  params: {
    nameBn: string;
    nameEn?: string;
    price: number;
    salePrice?: number;
    category: string;
    unitLabel?: string;
    siteName?: string;
  }
): string {
  const effectivePrice =
    params.salePrice && params.salePrice > 0 && params.salePrice <= params.price
      ? params.salePrice
      : params.price;
  const catName = CATEGORY_LABELS_BN[params.category] || params.category;
  const site = params.siteName || 'ShopBangla';
  const raw =
    template && template.trim().length > 0
      ? template
      : '%%title%% %%sep%% সেরা দাম ৳%%price%% %%sep%% %%sitename%%';

  return raw
    .replace(/%%title%%/gi, params.nameBn || params.nameEn || 'পণ্য')
    .replace(/%%sep%%/gi, '—')
    .replace(/%%sitename%%/gi, site)
    .replace(/%%price%%/gi, effectivePrice.toLocaleString('bn-BD'))
    .replace(/%%category%%/gi, catName)
    .replace(/%%unit%%/gi, params.unitLabel || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getTrafficLightColor(status: YoastTrafficLight): {
  bg: string;
  text: string;
  dot: string;
  border: string;
  labelBn: string;
} {
  if (status === 'good') {
    return {
      bg: '#e7f4ec',
      text: '#1b6b3a',
      dot: '#22a45d',
      border: '#b7e1c7',
      labelBn: 'চমৎকার (Good)',
    };
  }
  if (status === 'ok') {
    return {
      bg: '#fef4e4',
      text: '#9c5f0f',
      dot: '#e8931f',
      border: '#f3d5a5',
      labelBn: 'উন্নতি প্রয়োজন (OK)',
    };
  }
  return {
    bg: '#fdebe8',
    text: '#a9352b',
    dot: '#dc3f31',
    border: '#f2bdb8',
    labelBn: 'সমস্যা আছে (Needs Work)',
  };
}

export function analyzeYoastSeo(params: {
  nameBn: string;
  nameEn?: string;
  descriptionBn: string;
  category: string;
  price: number;
  salePrice: number;
  stock: number;
  unitLabel: string;
  imageUrl: string;
  slug: string;
  focusKeyphrase: string;
  relatedKeyphrases: string;
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  imageAltText: string;
  schemaBrand: string;
  schemaSku: string;
  schemaGtin: string;
  isCornerstone: boolean;
  internalLinksUrl: string;
  outboundLinkUrl: string;
  siteName?: string;
}): YoastSeoAnalysisResult {
  const kp = params.focusKeyphrase.trim().toLowerCase();
  const synonyms = params.relatedKeyphrases
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const resolvedTitle = resolveYoastVariables(params.seoTitle, {
    nameBn: params.nameBn,
    nameEn: params.nameEn,
    price: params.price,
    salePrice: params.salePrice,
    category: params.category,
    unitLabel: params.unitLabel,
    siteName: params.siteName,
  });

  const resolvedDescription =
    params.metaDescription.trim() ||
    params.descriptionBn.trim().slice(0, 155);

  const resolvedSlug = generateSeoSlug(params.slug || params.nameEn || params.nameBn);
  const resolvedCanonical =
    params.canonicalUrl.trim() ||
    `https://shopbangla.com/product/${encodeURIComponent(resolvedSlug)}`;

  const bodyText = params.descriptionBn.trim();
  const words = bodyText ? bodyText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const charCount = bodyText.length;

  // Count focus keyphrase & synonym occurrences in description
  let keyphraseCount = 0;
  if (kp) {
    const escapedKp = kp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = bodyText.toLowerCase().match(new RegExp(escapedKp, 'g'));
    keyphraseCount = matches ? matches.length : 0;
  }
  const kpWords = kp ? kp.split(/\s+/).filter(Boolean).length : 1;
  const keyphraseDensity =
    wordCount > 0 && kp ? Number((((keyphraseCount * kpWords) / wordCount) * 100).toFixed(1)) : 0;

  const checks: YoastCheckResult[] = [];

  // 1. Focus Keyphrase Presence & Length
  const kpWordLen = kp ? kp.split(/\s+/).filter(Boolean).length : 0;
  if (!kp) {
    checks.push({
      id: 'keyphrase-length',
      titleBn: 'ফোকাস কিফ্রেজ (Focus Keyphrase)',
      detailBn: 'কোনো ফোকাস কিফ্রেজ সেট করা হয়নি। গুগল র‍্যাঙ্কিংয়ের জন্য মূল কিওয়ার্ড দিন।',
      status: 'bad',
      score: 0,
      maxScore: 10,
    });
  } else if (kpWordLen >= 1 && kpWordLen <= 6) {
    checks.push({
      id: 'keyphrase-length',
      titleBn: 'ফোকাস কিফ্রেজ দৈর্ঘ্য (Keyphrase Length)',
      detailBn: `চমৎকার! আপনার ফোকাস কিফ্রেজ "${params.focusKeyphrase}" (${kpWordLen} শব্দ) আদর্শ দৈর্ঘ্যের।`,
      status: 'good',
      score: 10,
      maxScore: 10,
    });
  } else {
    checks.push({
      id: 'keyphrase-length',
      titleBn: 'ফোকাস কিফ্রেজ দৈর্ঘ্য (Keyphrase Length)',
      detailBn: `ফোকাস কিফ্রেজটি ${kpWordLen} শব্দের। এটি ১ থেকে ৫ শব্দের মধ্যে রাখলে গুগলে দ্রুত র‍্যাঙ্ক করে।`,
      status: 'ok',
      score: 6,
      maxScore: 10,
    });
  }

  // 2. Keyphrase in SEO Title
  const titleLower = resolvedTitle.toLowerCase();
  const hasKpInTitle = kp && titleLower.includes(kp);
  const hasSynInTitle = synonyms.some((s) => titleLower.includes(s));
  if (hasKpInTitle) {
    const startsWithKp = titleLower.indexOf(kp) <= 15;
    checks.push({
      id: 'keyphrase-in-title',
      titleBn: 'এসইও টাইটেলে কিফ্রেজ (Keyphrase in SEO Title)',
      detailBn: startsWithKp
        ? 'অসাধারণ! এসইও টাইটেলের শুরুতেই ফোকাস কিফ্রেজ রয়েছে।'
        : 'এসইও টাইটেলে ফোকাস কিফ্রেজ রয়েছে।',
      status: 'good',
      score: 10,
      maxScore: 10,
    });
  } else if (hasSynInTitle) {
    checks.push({
      id: 'keyphrase-in-title',
      titleBn: 'এসইও টাইটেলে কিফ্রেজ (Keyphrase in SEO Title)',
      detailBn: 'মূল কিফ্রেজ নেই, তবে টাইটেলে সমার্থক কিওয়ার্ড (Synonym) পাওয়া গেছে।',
      status: 'ok',
      score: 6,
      maxScore: 10,
    });
  } else {
    checks.push({
      id: 'keyphrase-in-title',
      titleBn: 'এসইও টাইটেলে কিফ্রেজ (Keyphrase in SEO Title)',
      detailBn: 'এসইও টাইটেলে ফোকাস কিফ্রেজটি পাওয়া যায়নি। টাইটেলে মূল কিওয়ার্ড যোগ করুন।',
      status: 'bad',
      score: 0,
      maxScore: 10,
    });
  }

  // 3. SEO Title Width / Length
  const titleLen = resolvedTitle.length;
  if (titleLen >= 25 && titleLen <= 65) {
    checks.push({
      id: 'title-width',
      titleBn: 'এসইও টাইটেল প্রস্থ (SEO Title Width)',
      detailBn: `এসইও টাইটেলের দৈর্ঘ্য (${titleLen} অক্ষর) গুগল সার্চ রেজাল্টের জন্য একদম পারফেক্ট!`,
      status: 'good',
      score: 9,
      maxScore: 9,
    });
  } else if (titleLen > 65) {
    checks.push({
      id: 'title-width',
      titleBn: 'এসইও টাইটেল প্রস্থ (SEO Title Width)',
      detailBn: `এসইও টাইটেল কিছুটা বড় (${titleLen} অক্ষর)। ৬৫ অক্ষরের মধ্যে রাখলে গুগলে কেটে যাবে না।`,
      status: 'ok',
      score: 5,
      maxScore: 9,
    });
  } else {
    checks.push({
      id: 'title-width',
      titleBn: 'এসইও টাইটেল প্রস্থ (SEO Title Width)',
      detailBn: `এসইও টাইটেল খুব ছোট (${titleLen} অক্ষর)। অন্তত ২৫-৬০ অক্ষর লিখুন।`,
      status: 'bad',
      score: 2,
      maxScore: 9,
    });
  }

  // 4. Keyphrase in Meta Description
  const descLower = resolvedDescription.toLowerCase();
  const hasKpInMeta = kp && descLower.includes(kp);
  const hasSynInMeta = synonyms.some((s) => descLower.includes(s));
  if (hasKpInMeta) {
    checks.push({
      id: 'keyphrase-in-meta',
      titleBn: 'মেটা ডেসক্রিপশনে কিফ্রেজ (Keyphrase in Meta Description)',
      detailBn: 'মেটা ডেসক্রিপশনে ফোকাস কিফ্রেজটি চমৎকারভাবে ব্যবহৃত হয়েছে! গুগল এটি বোল্ড করে দেখাবে।',
      status: 'good',
      score: 9,
      maxScore: 9,
    });
  } else if (hasSynInMeta) {
    checks.push({
      id: 'keyphrase-in-meta',
      titleBn: 'মেটা ডেসক্রিপশনে কিফ্রেজ (Keyphrase in Meta Description)',
      detailBn: 'মেটা ডেসক্রিপশনে রিলেটেড কিফ্রেজ রয়েছে, তবে মূল ফোকাস কিফ্রেজ দিলে আরও ভালো।',
      status: 'ok',
      score: 5,
      maxScore: 9,
    });
  } else {
    checks.push({
      id: 'keyphrase-in-meta',
      titleBn: 'মেটা ডেসক্রিপশনে কিফ্রেজ (Keyphrase in Meta Description)',
      detailBn: 'মেটা ডেসক্রিপশনে ফোকাস কিফ্রেজ নেই। সিটিআর (CTR) বাড়াতে মেটা ডেসক্রিপশনে কিফ্রেজ দিন।',
      status: 'bad',
      score: 0,
      maxScore: 9,
    });
  }

  // 5. Meta Description Length
  const metaLen = resolvedDescription.length;
  if (metaLen >= 90 && metaLen <= 165) {
    checks.push({
      id: 'meta-length',
      titleBn: 'মেটা ডেসক্রিপশন দৈর্ঘ্য (Meta Description Length)',
      detailBn: `মেটা ডেসক্রিপশন দৈর্ঘ্য (${metaLen}/১৬০ অক্ষর) গুগল স্নিপেটের জন্য আদর্শ!`,
      status: 'good',
      score: 9,
      maxScore: 9,
    });
  } else if (metaLen >= 50 && metaLen < 90) {
    checks.push({
      id: 'meta-length',
      titleBn: 'মেটা ডেসক্রিপশন দৈর্ঘ্য (Meta Description Length)',
      detailBn: `মেটা ডেসক্রিপশন (${metaLen} অক্ষর) আরেকটু বড় করলে ভালো (লক্ষ্য: ১০০-১৬০ অক্ষর)।`,
      status: 'ok',
      score: 5,
      maxScore: 9,
    });
  } else {
    checks.push({
      id: 'meta-length',
      titleBn: 'মেটা ডেসক্রিপশন দৈর্ঘ্য (Meta Description Length)',
      detailBn:
        metaLen === 0
          ? 'কোনো মেটা ডেসক্রিপশন লেখা হয়নি!'
          : `মেটা ডেসক্রিপশন দৈর্ঘ্য (${metaLen} অক্ষর) অপ্টিমাল সীমার বাইরে (লক্ষ্য: ১০০-১৬০ অক্ষর)।`,
      status: 'bad',
      score: 1,
      maxScore: 9,
    });
  }

  // 6. Keyphrase in URL Slug
  const slugLower = resolvedSlug.toLowerCase();
  const kpTokens = kp.split(/[\s-]+/).filter((t) => t.length >= 2);
  const slugMatchesKp =
    kp &&
    (slugLower.includes(kp.replace(/\s+/g, '-')) ||
      kpTokens.some((tok) => slugLower.includes(tok)) ||
      (params.nameEn && slugLower.includes(params.nameEn.toLowerCase().split(/\s+/)[0] || '')));
  if (slugMatchesKp && resolvedSlug.length >= 3) {
    checks.push({
      id: 'keyphrase-in-slug',
      titleBn: 'ইউআরএল স্লাগে কিফ্রেজ (Keyphrase in Slug)',
      detailBn: `ইউআরএল স্লাগ "/product/${resolvedSlug}" এসইও-ফ্রেন্ডলি এবং কিফ্রেজ সমৃদ্ধ।`,
      status: 'good',
      score: 8,
      maxScore: 8,
    });
  } else if (resolvedSlug.length >= 4) {
    checks.push({
      id: 'keyphrase-in-slug',
      titleBn: 'ইউআরএল স্লাগ গঠন (URL Slug Structure)',
      detailBn: `স্লাগ "${resolvedSlug}" সক্রিয় আছে, তবে মূল কিফ্রেজ যুক্ত করলে র‍্যাঙ্কিং আরও ভালো হবে।`,
      status: 'ok',
      score: 5,
      maxScore: 8,
    });
  } else {
    checks.push({
      id: 'keyphrase-in-slug',
      titleBn: 'ইউআরএল স্লাগে কিফ্রেজ (Keyphrase in Slug)',
      detailBn: 'পণ্যের জন্য একটি কাস্টম এসইও স্লাগ (URL Slug) সেট করুন।',
      status: 'bad',
      score: 0,
      maxScore: 8,
    });
  }

  // 7. Keyphrase in First Paragraph / Intro
  const firstParagraph = (bodyText.split(/\n+/)[0] || bodyText.slice(0, 180)).toLowerCase();
  if (kp && firstParagraph.includes(kp)) {
    checks.push({
      id: 'keyphrase-in-intro',
      titleBn: 'প্রথম অনুচ্ছেদে কিফ্রেজ (Keyphrase in Introduction)',
      detailBn: 'পণ্যের বিবরণের শুরুতেই (প্রথম অনুচ্ছেদে) ফোকাস কিফ্রেজ পাওয়া গেছে!',
      status: 'good',
      score: 8,
      maxScore: 8,
    });
  } else if (kp && bodyText.toLowerCase().includes(kp)) {
    checks.push({
      id: 'keyphrase-in-intro',
      titleBn: 'প্রথম অনুচ্ছেদে কিফ্রেজ (Keyphrase in Introduction)',
      detailBn: 'বিবরণে কিফ্রেজ আছে, তবে একদম প্রথম লাইনে রাখলে Yoast SEO তে গ্রিন সিগন্যাল পাবেন।',
      status: 'ok',
      score: 5,
      maxScore: 8,
    });
  } else {
    checks.push({
      id: 'keyphrase-in-intro',
      titleBn: 'প্রথম অনুচ্ছেদে কিফ্রেজ (Keyphrase in Introduction)',
      detailBn: 'পণ্যের বিস্তারিত বিবরণের প্রথম বাক্যে ফোকাস কিফ্রেজটি উল্লেখ করুন।',
      status: 'bad',
      score: 0,
      maxScore: 8,
    });
  }

  // 8. Keyphrase Density Check
  if (keyphraseCount >= 1 && keyphraseDensity >= 0.4 && keyphraseDensity <= 4.5) {
    checks.push({
      id: 'keyphrase-density',
      titleBn: 'কিফ্রেজ ডেনসিটি (Keyphrase Density)',
      detailBn: `ফোকাস কিফ্রেজ ${keyphraseCount} বার ব্যবহৃত হয়েছে (ডেনসিটি: ${keyphraseDensity}%) — একদম আদর্শ!`,
      status: 'good',
      score: 8,
      maxScore: 8,
    });
  } else if (keyphraseCount >= 1 && keyphraseDensity > 4.5) {
    checks.push({
      id: 'keyphrase-density',
      titleBn: 'কিফ্রেজ ডেনসিটি (Keyphrase Stuffing Warning)',
      detailBn: `কিফ্রেজ ডেনসিটি ${keyphraseDensity}% (অতিরিক্ত বেশি)। কিওয়ার্ড স্টাফিং এড়াতে স্বাভাবিক বাক্য লিখুন।`,
      status: 'ok',
      score: 4,
      maxScore: 8,
    });
  } else {
    checks.push({
      id: 'keyphrase-density',
      titleBn: 'কিফ্রেজ ডেনসিটি (Keyphrase Density)',
      detailBn: 'পণ্য বিবরণীতে ফোকাস কিফ্রেজটি অন্তত ১-৩ বার ব্যবহার করুন।',
      status: 'bad',
      score: 0,
      maxScore: 8,
    });
  }

  // 9. Product Description Content Depth
  const minWordsTarget = params.isCornerstone ? 60 : 25;
  if (wordCount >= minWordsTarget || charCount >= 180) {
    checks.push({
      id: 'content-length',
      titleBn: 'পণ্য বিবরণের গভীরতা (Product Copy Depth)',
      detailBn: `পণ্য বিবরণে ${wordCount}টি শব্দ (${charCount} অক্ষর) রয়েছে — ই-কমার্স এসইওর জন্য সমৃদ্ধ!`,
      status: 'good',
      score: 8,
      maxScore: 8,
    });
  } else if (wordCount >= 12 || charCount >= 80) {
    checks.push({
      id: 'content-length',
      titleBn: 'পণ্য বিবরণের গভীরতা (Product Copy Depth)',
      detailBn: `পণ্য বিবরণে ${wordCount}টি শব্দ আছে। অন্তত ২৫+ শব্দ লিখলে গুগলে দ্রুত র‍্যাঙ্ক করবে।`,
      status: 'ok',
      score: 5,
      maxScore: 8,
    });
  } else {
    checks.push({
      id: 'content-length',
      titleBn: 'পণ্য বিবরণের গভীরতা (Product Copy Depth)',
      detailBn: 'পণ্যের বিবরণ খুবই সংক্ষিপ্ত। পণ্যের গুণাগুণ, উপকারিতা ও ব্যবহারবিধি বিস্তারিত লিখুন।',
      status: 'bad',
      score: 1,
      maxScore: 8,
    });
  }

  // 10. Image Alt Text SEO Check
  const altLower = params.imageAltText.trim().toLowerCase();
  if (altLower && kp && altLower.includes(kp)) {
    checks.push({
      id: 'image-alt',
      titleBn: 'ইমেজ অল্ট অ্যাট্রিবিউট (Image Alt Text SEO)',
      detailBn: 'পণ্যের ছবির Alt Text-এ ফোকাস কিফ্রেজ রয়েছে! Google Images সার্চে এটি র‍্যাঙ্ক করবে।',
      status: 'good',
      score: 7,
      maxScore: 7,
    });
  } else if (altLower.length >= 4) {
    checks.push({
      id: 'image-alt',
      titleBn: 'ইমেজ অল্ট অ্যাট্রিবিউট (Image Alt Text SEO)',
      detailBn: 'ছবির Alt Text দেওয়া হয়েছে, তবে এতে ফোকাস কিফ্রেজ যুক্ত করলে আরও ভালো।',
      status: 'ok',
      score: 5,
      maxScore: 7,
    });
  } else {
    checks.push({
      id: 'image-alt',
      titleBn: 'ইমেজ অল্ট অ্যাট্রিবিউট (Image Alt Text SEO)',
      detailBn: 'পণ্যের ছবির কোনো SEO Alt Text দেওয়া হয়নি। অন্ধ পাঠক ও Google Image SEO-র জন্য Alt Text দিন।',
      status: 'bad',
      score: 0,
      maxScore: 7,
    });
  }

  // 11. Yoast Premium Related Keyphrases & Synonyms + Internal/Outbound Links
  const hasSynonyms = synonyms.length > 0;
  const hasLinks =
    params.internalLinksUrl.trim().length > 0 || params.outboundLinkUrl.trim().length > 0;
  if (hasSynonyms && hasLinks) {
    checks.push({
      id: 'premium-synonyms-links',
      titleBn: 'Yoast প্রিমিয়াম সিনোনিম ও ইন্টারনাল লিংকিং',
      detailBn: `${synonyms.length}টি রিলেটেড কিফ্রেজ এবং ইন্টারনাল/আউটবাউন্ড লিংক সংযুক্ত করা হয়েছে!`,
      status: 'good',
      score: 7,
      maxScore: 7,
    });
  } else if (hasSynonyms || hasLinks) {
    checks.push({
      id: 'premium-synonyms-links',
      titleBn: 'Yoast প্রিমিয়াম সিনোনিম ও লিংকিং',
      detailBn: hasSynonyms
        ? `${synonyms.length}টি সমার্থক কিওয়ার্ড সেট করা হয়েছে। ইন্টারনাল লিংক যুক্ত করলে ১০০% পূর্ণ হবে।`
        : 'লিংক যুক্ত আছে। মাল্টিপল কিওয়ার্ড র‍্যাঙ্কিংয়ের জন্য Related Keyphrases যোগ করুন।',
      status: 'ok',
      score: 5,
      maxScore: 7,
    });
  } else {
    checks.push({
      id: 'premium-synonyms-links',
      titleBn: 'Yoast প্রিমিয়াম সিনোনিম ও ইন্টারনাল লিংকিং',
      detailBn: 'একাধিক কিওয়ার্ডে র‍্যাঙ্ক করতে সমার্থক কিফ্রেজ (Synonyms) ও ইন্টারনাল লিংক যোগ করুন।',
      status: 'bad',
      score: 1,
      maxScore: 7,
    });
  }

  // 12. E-Commerce Product Schema (Brand, SKU, Price & Availability)
  const hasBrandAndSku =
    params.schemaBrand.trim().length > 0 && params.schemaSku.trim().length > 0;
  if (hasBrandAndSku && params.price > 0) {
    checks.push({
      id: 'ecommerce-schema',
      titleBn: 'Schema.org প্রোডাক্ট রিচ স্নিপেট (Merchant Listing JSON-LD)',
      detailBn: `Brand (${params.schemaBrand}), SKU (${params.schemaSku}), মূল্য ও স্টক স্কিমা ১০০% ভ্যালিড!`,
      status: 'good',
      score: 7,
      maxScore: 7,
    });
  } else if (params.price > 0) {
    checks.push({
      id: 'ecommerce-schema',
      titleBn: 'Schema.org প্রোডাক্ট রিচ স্নিপেট (Product JSON-LD)',
      detailBn: 'মূল্য স্কিমা সক্রিয় আছে, তবে Google Merchant Listing এর জন্য Brand ও SKU কোড পূরণ করুন।',
      status: 'ok',
      score: 4,
      maxScore: 7,
    });
  } else {
    checks.push({
      id: 'ecommerce-schema',
      titleBn: 'Schema.org প্রোডাক্ট রিচ স্নিপেট',
      detailBn: 'পণ্যের সঠিক মূল্য, ব্র্যান্ড ও SKU কোড সেট করুন।',
      status: 'bad',
      score: 0,
      maxScore: 7,
    });
  }

  const totalEarned = checks.reduce((acc, c) => acc + c.score, 0);
  const totalMax = checks.reduce((acc, c) => acc + c.maxScore, 0);
  const overallScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

  const overallStatus: YoastTrafficLight =
    overallScore >= 75 ? 'good' : overallScore >= 45 ? 'ok' : 'bad';

  return {
    overallScore,
    overallStatus,
    resolvedTitle,
    resolvedDescription,
    resolvedSlug,
    resolvedCanonical,
    wordCount,
    charCount,
    keyphraseCount,
    keyphraseDensity,
    checks,
  };
}

export function analyzeYoastReadability(params: {
  descriptionBn: string;
  isCornerstone: boolean;
}): YoastReadabilityResult {
  const text = params.descriptionBn.trim();
  const paragraphs = text
    ? text
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];
  const sentences = text
    ? text
        .split(/[।.!?]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const words = text ? text.split(/\s+/).filter(Boolean) : [];

  const sentenceCount = Math.max(sentences.length, text ? 1 : 0);
  const paragraphCount = Math.max(paragraphs.length, text ? 1 : 0);
  const avgWordsPerSentence =
    sentenceCount > 0 ? Number((words.length / sentenceCount).toFixed(1)) : 0;

  // Transition words check
  const sentencesWithTransition = sentences.filter((s) => {
    const sLower = s.toLowerCase();
    return BENGALI_TRANSITION_WORDS.some((tw) => sLower.includes(tw));
  }).length;

  const transitionWordRatio =
    sentenceCount > 0 ? Math.round((sentencesWithTransition / sentenceCount) * 100) : 0;

  const checks: YoastCheckResult[] = [];

  // 1. Sentence Length
  const longSentences = sentences.filter((s) => s.split(/\s+/).length > 22).length;
  const longSentencePct =
    sentenceCount > 0 ? Math.round((longSentences / sentenceCount) * 100) : 0;

  if (words.length >= 8 && longSentencePct <= 25) {
    checks.push({
      id: 'readability-sentence-len',
      titleBn: 'বাক্যের দৈর্ঘ্য (Sentence Length)',
      detailBn: `গড়ে প্রতি বাক্যে ${avgWordsPerSentence}টি শব্দ রয়েছে — মোবাইল পাঠকদের পড়ার জন্য অত্যন্ত সহজ ও সাবলীল!`,
      status: 'good',
      score: 25,
      maxScore: 25,
    });
  } else if (words.length >= 5 && longSentencePct <= 45) {
    checks.push({
      id: 'readability-sentence-len',
      titleBn: 'বাক্যের দৈর্ঘ্য (Sentence Length)',
      detailBn: `${longSentencePct}% বাক্য কিছুটা দীর্ঘ। বাক্যগুলো ছোট রাখলে ক্রেতারা দ্রুত পড়ে সিদ্ধান্ত নিতে পারেন।`,
      status: 'ok',
      score: 15,
      maxScore: 25,
    });
  } else {
    checks.push({
      id: 'readability-sentence-len',
      titleBn: 'বাক্যের দৈর্ঘ্য (Sentence Length)',
      detailBn:
        words.length < 5
          ? 'রিডেবিলিটি বিশ্লেষণের জন্য অন্তত কয়েকটি পূর্ণাঙ্গ বাক্য লিখুন।'
          : 'অনেকগুলো বাক্য ২০ শব্দের চেয়ে বড়। দাড়ি (।) ব্যবহার করে ছোট ছোট বাক্যে ভাগ করুন।',
      status: 'bad',
      score: 5,
      maxScore: 25,
    });
  }

  // 2. Paragraph Structure
  const hasOverlongParagraph = paragraphs.some((p) => p.split(/\s+/).length > 120);
  if (words.length >= 10 && !hasOverlongParagraph) {
    checks.push({
      id: 'readability-paragraphs',
      titleBn: 'অনুচ্ছেদের দৈর্ঘ্য (Paragraph Structure)',
      detailBn: 'কোনো অনুচ্ছেদই অতিরিক্ত বড় নয়। ক্রেতাদের চোখের জন্য আরামদায়ক!',
      status: 'good',
      score: 25,
      maxScore: 25,
    });
  } else if (hasOverlongParagraph) {
    checks.push({
      id: 'readability-paragraphs',
      titleBn: 'অনুচ্ছেদের দৈর্ঘ্য (Paragraph Structure)',
      detailBn: 'একটি অনুচ্ছেদ অনেক বড় হয়ে গেছে। ২-৩টি প্যারাগ্রাফে ভাগ করুন।',
      status: 'ok',
      score: 14,
      maxScore: 25,
    });
  } else {
    checks.push({
      id: 'readability-paragraphs',
      titleBn: 'অনুচ্ছেদের দৈর্ঘ্য (Paragraph Structure)',
      detailBn: 'পণ্যের বিবরণে অন্তত ১-২টি স্পষ্ট অনুচ্ছেদ যোগ করুন।',
      status: 'bad',
      score: 5,
      maxScore: 25,
    });
  }

  // 3. Transition Words
  if (transitionWordRatio >= 25 || sentencesWithTransition >= 1) {
    checks.push({
      id: 'readability-transitions',
      titleBn: 'সংযোগকারী ও আকর্ষণীয় শব্দ (Transition Words)',
      detailBn: `${sentencesWithTransition}টি বাক্যে সংযোগকারী ও বিশ্বাসযোগ্য শব্দ (যেমন: শতভাগ, প্রাকৃতিক, কারণ, এছাড়া) রয়েছে!`,
      status: 'good',
      score: 25,
      maxScore: 25,
    });
  } else if (words.length >= 10) {
    checks.push({
      id: 'readability-transitions',
      titleBn: 'সংযোগকারী শব্দ (Transition Words)',
      detailBn: 'বাক্যের প্রবাহ বাড়াতে "এছাড়া", "কারণ", "তাই", "বিশেষত" জাতীয় শব্দ ব্যবহার করুন।',
      status: 'ok',
      score: 14,
      maxScore: 25,
    });
  } else {
    checks.push({
      id: 'readability-transitions',
      titleBn: 'সংযোগকারী শব্দ (Transition Words)',
      detailBn: 'বিবরণে কোনো সংযোগকারী শব্দ পাওয়া যায়নি।',
      status: 'bad',
      score: 0,
      maxScore: 25,
    });
  }

  // 4. Scannability / Bullet Points & Formatting
  const hasBulletsOrHighlights = /[•✓✔★\-:]/.test(text) || paragraphs.length >= 2;
  if (hasBulletsOrHighlights && words.length >= 12) {
    checks.push({
      id: 'readability-scannability',
      titleBn: 'স্ক্যানযোগ্যতা ও বুলেট পয়েন্ট (Scannability)',
      detailBn: 'বিবরণটি সুন্দরভাবে সাজানো এবং দ্রুত স্ক্যান করার উপযোগী!',
      status: 'good',
      score: 25,
      maxScore: 25,
    });
  } else if (words.length >= 12) {
    checks.push({
      id: 'readability-scannability',
      titleBn: 'স্ক্যানযোগ্যতা ও বুলেট পয়েন্ট (Scannability)',
      detailBn: 'পণ্যের মূল বৈশিষ্ট্যগুলো তুলে ধরতে বুলেট পয়েন্ট (• বা ✓) বা আলাদা প্যারাগ্রাফ ব্যবহার করুন।',
      status: 'ok',
      score: 15,
      maxScore: 25,
    });
  } else {
    checks.push({
      id: 'readability-scannability',
      titleBn: 'স্ক্যানযোগ্যতা ও ফরম্যাটিং (Scannability)',
      detailBn: 'ক্রেতাদের আকৃষ্ট করতে পণ্যের বৈশিষ্ট্যগুলো পয়েন্ট আকারে লিখুন।',
      status: 'bad',
      score: 4,
      maxScore: 25,
    });
  }

  const earned = checks.reduce((acc, c) => acc + c.score, 0);
  const max = checks.reduce((acc, c) => acc + c.maxScore, 0);
  const readabilityScore = max > 0 ? Math.round((earned / max) * 100) : 0;
  const readabilityStatus: YoastTrafficLight =
    readabilityScore >= 75 ? 'good' : readabilityScore >= 45 ? 'ok' : 'bad';

  return {
    readabilityScore,
    readabilityStatus,
    sentenceCount,
    paragraphCount,
    avgWordsPerSentence,
    transitionWordRatio,
    checks,
  };
}

export function buildProductSchemaJsonLd(
  product: Partial<Product> & {
    nameBn: string;
    descriptionBn: string;
    price: number;
    salePrice: number;
    stock: number;
    imageUrl: string;
    category: string;
    unitLabel: string;
  },
  siteSettings?: SiteSettings,
  productReviews: ReviewItem[] = []
): Record<string, unknown> {
  const siteName = siteSettings?.siteName || 'ShopBangla';
  const slug = generateSeoSlug(product.slug || product.nameEn || product.nameBn, product.id);
  const canonical =
    product.canonicalUrl?.trim() ||
    `https://shopbangla.com/product/${encodeURIComponent(slug)}`;
  const effectivePrice =
    product.salePrice && product.salePrice > 0 && product.salePrice <= product.price
      ? product.salePrice
      : product.price;

  const availability =
    product.schemaAvailability || (product.stock > 0 ? 'InStock' : 'OutOfStock');
  const condition = product.schemaCondition || 'NewCondition';

  const allImages = Array.from(
    new Set([
      product.ogImageUrl || product.imageUrl,
      product.imageUrl,
      ...(product.galleryItems?.map((g) => g.url) || []),
      ...(product.galleryUrls || []),
      ...(product.variants?.map((v) => v.imageUrl).filter(Boolean) as string[] || []),
    ].filter(Boolean))
  );

  const variantsList = product.variants && product.variants.length > 0 ? product.variants : [];
  let offersNode: Record<string, unknown>;

  if (variantsList.length > 1) {
    const prices = variantsList.map((v) =>
      v.salePrice > 0 && v.salePrice <= v.regularPrice ? v.salePrice : v.regularPrice
    );
    const lowPrice = Math.min(...prices, effectivePrice);
    const highPrice = Math.max(...prices, effectivePrice);
    offersNode = {
      '@type': 'AggregateOffer',
      url: canonical,
      priceCurrency: 'BDT',
      lowPrice: String(lowPrice),
      highPrice: String(highPrice),
      offerCount: String(variantsList.length),
      offers: variantsList.map((v) => ({
        '@type': 'Offer',
        name: `${product.nameBn} - ${v.label}`,
        sku: v.sku || product.schemaSku || product.id,
        priceCurrency: 'BDT',
        price: String(
          v.salePrice > 0 && v.salePrice <= v.regularPrice ? v.salePrice : v.regularPrice
        ),
        availability: `https://schema.org/${v.stock > 0 ? 'InStock' : 'OutOfStock'}`,
        itemCondition: `https://schema.org/${condition}`,
      })),
    };
  } else {
    offersNode = {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'BDT',
      price: String(effectivePrice),
      priceValidUntil: '2027-12-31',
      itemCondition: `https://schema.org/${condition}`,
      availability: `https://schema.org/${availability}`,
      seller: {
        '@type': 'Organization',
        name: siteName,
      },
      ...(product.freeDelivery
        ? {
            shippingDetails: {
              '@type': 'OfferShippingDetails',
              shippingRate: {
                '@type': 'MonetaryAmount',
                value: '0',
                currency: 'BDT',
              },
            },
          }
        : {}),
    };
  }

  const schemaObj: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.nameBn,
    description: product.metaDescription?.trim() || product.shortSummaryBn?.trim() || product.descriptionBn,
    image: allImages,
    sku: product.schemaSku?.trim() || product.id || `SB-${slug.slice(0, 12).toUpperCase()}`,
    mpn: product.schemaMpn?.trim() || product.schemaSku?.trim() || product.id || 'SB-001',
    brand: {
      '@type': 'Brand',
      name: product.schemaBrand?.trim() || siteName,
    },
    category: CATEGORY_LABELS_BN[product.category] || product.category,
    offers: offersNode,
  };

  if (product.weightGrams && product.weightGrams > 0) {
    schemaObj.weight = {
      '@type': 'QuantitativeValue',
      value: product.weightGrams,
      unitCode: 'GRM',
    };
  }

  if (product.specifications && product.specifications.length > 0) {
    schemaObj.additionalProperty = product.specifications.map((sp) => ({
      '@type': 'PropertyValue',
      name: sp.label,
      value: sp.value,
    }));
  }

  if (product.schemaGtin?.trim()) {
    schemaObj.gtin = product.schemaGtin.trim();
  }

  const approvedReviews = productReviews.filter((r) => r.status === 'Approved');
  if (approvedReviews.length > 0) {
    const avgRating = (
      approvedReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / approvedReviews.length
    ).toFixed(1);
    schemaObj.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating,
      reviewCount: String(approvedReviews.length),
      bestRating: '5',
      worstRating: '1',
    };
    schemaObj.review = approvedReviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: r.customerName,
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: String(r.rating || 5),
        bestRating: '5',
      },
      reviewBody: r.comment,
    }));
  }

  const breadcrumbSchema: Record<string, unknown> = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: siteName,
        item: typeof window !== 'undefined' ? window.location.origin : 'https://shopbangla.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: CATEGORY_LABELS_BN[product.category] || product.category,
        item: `${typeof window !== 'undefined' ? window.location.origin : 'https://shopbangla.com'}/?category=${encodeURIComponent(product.category)}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.nameBn,
        item: canonical,
      },
    ],
  };

  const graphNodes: Record<string, unknown>[] = [schemaObj, breadcrumbSchema];

  if (product.faqs && product.faqs.length > 0) {
    graphNodes.push({
      '@type': 'FAQPage',
      mainEntity: product.faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graphNodes,
  };
}

function upsertMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string) {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export function syncDocumentSeoHead(params: {
  activeProduct: Product | null;
  siteSettings: SiteSettings;
  reviews: ReviewItem[];
}) {
  if (typeof document === 'undefined') return;
  const { activeProduct, siteSettings, reviews } = params;
  const siteName = siteSettings.siteName || 'Khati Raj BD';

  if (siteSettings.logoUrl) {
    let iconLink = document.head.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.setAttribute('rel', 'icon');
      document.head.appendChild(iconLink);
    }
    iconLink.setAttribute('href', siteSettings.logoUrl);
  }

  if (activeProduct) {
    const resolvedTitle = resolveYoastVariables(activeProduct.seoTitle || '', {
      nameBn: activeProduct.nameBn,
      nameEn: activeProduct.nameEn,
      price: activeProduct.price,
      salePrice: activeProduct.salePrice,
      category: activeProduct.category,
      unitLabel: activeProduct.unitLabel,
      siteName,
    });
    const resolvedDesc =
      activeProduct.metaDescription?.trim() ||
      activeProduct.descriptionBn.slice(0, 160);
    const slug = generateSeoSlug(
      activeProduct.slug || activeProduct.nameEn || activeProduct.nameBn,
      activeProduct.id
    );
    const canonical =
      activeProduct.canonicalUrl?.trim() ||
      `${window.location.origin}/?product=${encodeURIComponent(slug)}`;
    const robots = `${activeProduct.metaRobotsIndex || 'index'}, ${
      activeProduct.metaRobotsFollow || 'follow'
    }`;

    document.title = resolvedTitle;
    upsertMetaTag('name', 'description', resolvedDesc);
    upsertMetaTag('name', 'robots', robots);
    if (activeProduct.focusKeyphrase || activeProduct.relatedKeyphrases) {
      const keywords = [activeProduct.focusKeyphrase, activeProduct.relatedKeyphrases]
        .filter(Boolean)
        .join(', ');
      upsertMetaTag('name', 'keywords', keywords);
    }
    upsertCanonicalLink(canonical);

    // OpenGraph tags
    upsertMetaTag('property', 'og:type', 'product');
    upsertMetaTag('property', 'og:title', activeProduct.ogTitle?.trim() || resolvedTitle);
    upsertMetaTag('property', 'og:description', activeProduct.ogDescription?.trim() || resolvedDesc);
    upsertMetaTag('property', 'og:image', activeProduct.ogImageUrl?.trim() || activeProduct.imageUrl);
    upsertMetaTag('property', 'og:url', canonical);
    upsertMetaTag(
      'property',
      'product:price:amount',
      String(activeProduct.salePrice || activeProduct.price)
    );
    upsertMetaTag('property', 'product:price:currency', 'BDT');

    // Twitter Card tags
    upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    upsertMetaTag('name', 'twitter:title', activeProduct.twitterTitle?.trim() || resolvedTitle);
    upsertMetaTag(
      'name',
      'twitter:description',
      activeProduct.twitterDescription?.trim() || resolvedDesc
    );
    upsertMetaTag(
      'name',
      'twitter:image',
      activeProduct.twitterImageUrl?.trim() ||
        activeProduct.ogImageUrl?.trim() ||
        activeProduct.imageUrl
    );

    // JSON-LD Product Schema
    const prodReviews = reviews.filter((r) => r.productId === activeProduct.id);
    const schemaJson = buildProductSchemaJsonLd(activeProduct, siteSettings, prodReviews);
    let scriptEl = document.getElementById('yoast-schema-jsonld') as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'yoast-schema-jsonld';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(schemaJson);
  } else {
    const defaultTitle = siteSettings.siteTagline
      ? `${siteName} — ${siteSettings.siteTagline}`
      : `${siteName} — প্রিমিয়াম অনলাইন শপিং বাংলাদেশ`;
    const defaultDesc = `${siteName} — বাংলাদেশের বিশ্বস্ত অনলাইন শপিং স্টোর। শতভাগ আসল পণ্য, ক্যাশ অন ডেলিভারি এবং দ্রুত হোম ডেলিভারি।`;
    document.title = defaultTitle;
    upsertMetaTag('name', 'description', defaultDesc);
    upsertMetaTag('name', 'robots', 'index, follow');
    upsertCanonicalLink(window.location.origin);
    upsertMetaTag('property', 'og:type', 'website');
    upsertMetaTag('property', 'og:title', defaultTitle);
    upsertMetaTag('property', 'og:description', defaultDesc);
    if (siteSettings.logoUrl) {
      upsertMetaTag('property', 'og:image', siteSettings.logoUrl);
    }
    upsertMetaTag('name', 'twitter:title', defaultTitle);
    upsertMetaTag('name', 'twitter:description', defaultDesc);

    const webSiteSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'OnlineStore',
      name: siteName,
      url: window.location.origin,
      telephone: siteSettings.supportPhone,
      email: siteSettings.supportEmail,
      priceRange: '৳৳',
    };
    if (siteSettings.logoUrl) {
      webSiteSchema.logo = siteSettings.logoUrl;
    }
    let scriptEl = document.getElementById('yoast-schema-jsonld') as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'yoast-schema-jsonld';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(webSiteSchema);
  }
}
