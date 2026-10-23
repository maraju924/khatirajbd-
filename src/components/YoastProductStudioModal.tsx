import React, { useMemo, useState } from 'react';
import {
  Product,
  ProductCategory,
  ProductFaqItem,
  ProductGalleryItem,
  ProductSpecItem,
  ProductVariantItem,
  ReviewItem,
  SiteSettings,
  WholesaleTierItem,
} from '../types';
import { CATEGORIES } from '../data/seedCatalog';
import {
  analyzeYoastReadability,
  analyzeYoastSeo,
  buildProductSchemaJsonLd,
  generateSeoSlug,
  getTrafficLightColor,
} from '../utils/yoastSeoEngine';

export interface YoastProductFormValues {
  nameBn: string;
  nameEn: string;
  shortSummaryBn: string;
  descriptionBn: string;
  descriptionEn: string;
  category: ProductCategory;
  price: number;
  salePrice: number;
  isFlashSale: boolean;
  stock: number;
  unitLabel: string;
  imageUrl: string;
  galleryUrls: string[];
  galleryItems: ProductGalleryItem[];
  videoUrl: string;
  variants: ProductVariantItem[];
  highlights: string[];
  specifications: ProductSpecItem[];
  faqs: ProductFaqItem[];
  wholesaleTiers: WholesaleTierItem[];
  upsellProductIds: string[];
  freeDelivery: boolean;
  weightGrams: number;
  warrantyText: string;
  returnPolicyText: string;
  badgeLabel: string;
  slug: string;
  focusKeyphrase: string;
  relatedKeyphrases: string;
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  metaRobotsIndex: 'index' | 'noindex';
  metaRobotsFollow: 'follow' | 'nofollow';
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImageUrl: string;
  schemaBrand: string;
  schemaSku: string;
  schemaGtin: string;
  schemaMpn: string;
  schemaCondition: 'NewCondition' | 'RefurbishedCondition' | 'UsedCondition';
  schemaAvailability: 'InStock' | 'OutOfStock' | 'PreOrder';
  imageAltText: string;
  isCornerstone: boolean;
  internalLinksUrl: string;
  outboundLinkUrl: string;
  redirectOldSlug: string;
  seoScore: number;
  readabilityScore: number;
}

interface YoastProductStudioModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  allProducts?: Product[];
  siteSettings: SiteSettings;
  reviews: ReviewItem[];
  onClose: () => void;
  onSave: (values: YoastProductFormValues, editingId: string | null) => Promise<void>;
  onDelete?: (productId: string) => Promise<void>;
}

type StudioTab =
  | 'general'
  | 'gallery_media'
  | 'variants_wholesale'
  | 'specs_faq_policy'
  | 'yoast_seo'
  | 'readability_social'
  | 'schema_tech';

const QUICK_PRODUCT_IMAGES = [
  { label: 'চাকসহ মধু', url: '/uploads/products/chak-soho-modhu.webp' },
  { label: 'কালোজিরা মধু', url: '/uploads/products/kalojira-modhu.jpg' },
  { label: 'সরিষা ফুলের মধু', url: '/uploads/products/sorisha-modhu.jpg' },
  { label: 'সুন্দরবনের মধু', url: '/uploads/products/sundarban-modhu.webp' },
  { label: 'খাঁটি গাওয়া ঘি', url: '/uploads/products/ghee.webp' },
  { label: 'কাঠঘানি সরিষার তেল', url: '/uploads/products/mustard-oil.webp' },
  { label: 'হানি নাটস কম্বো', url: '/uploads/products/honey-nuts.webp' },
  { label: 'অর্গানিক চিয়া সিড', url: '/uploads/products/chia-seeds.webp' },
  { label: 'জাফরান ও বাদাম', url: '/uploads/products/saffron.webp' },
];

// Client-side image compressor for direct file upload (keeps Data URL compact for Firestore)
async function compressImageFileToDataUrl(file: File, maxWidth = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(ev.target?.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.78));
      };
      img.onerror = reject;
      img.src = String(ev.target?.result || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const YoastProductStudioModal: React.FC<YoastProductStudioModalProps> = ({
  isOpen,
  editingProduct,
  allProducts = [],
  siteSettings,
  reviews,
  onClose,
  onSave,
  onDelete,
}) => {
  const [studioTab, setStudioTab] = useState<StudioTab>('general');
  const [serpMode, setSerpMode] = useState<'mobile' | 'desktop'>('mobile');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);

  // 1. Core Product & Highlights State
  const [nameBn, setNameBn] = useState(editingProduct?.nameBn || '');
  const [nameEn, setNameEn] = useState(editingProduct?.nameEn || '');
  const [shortSummaryBn, setShortSummaryBn] = useState(
    editingProduct?.shortSummaryBn || ''
  );
  const [category, setCategory] = useState<ProductCategory>(
    editingProduct?.category || 'honey'
  );
  const [price, setPrice] = useState(String(editingProduct?.price ?? 1200));
  const [salePrice, setSalePrice] = useState(
    String(editingProduct?.salePrice ?? editingProduct?.price ?? 990)
  );
  const [stock, setStock] = useState(String(editingProduct?.stock ?? 45));
  const [unitLabel, setUnitLabel] = useState(
    editingProduct?.unitLabel || '৫০০ গ্রাম / ১ কেজি'
  );
  const [isFlashSale, setIsFlashSale] = useState(editingProduct?.isFlashSale ?? true);
  const [badgeLabel, setBadgeLabel] = useState(
    editingProduct?.badgeLabel || 'বেস্ট সেলার'
  );
  const [descriptionBn, setDescriptionBn] = useState(
    editingProduct?.descriptionBn || ''
  );
  const [highlights, setHighlights] = useState<string[]>(
    editingProduct?.highlights && editingProduct.highlights.length > 0
      ? editingProduct.highlights
      : [
          '১০০% খাঁটি ও প্রাকৃতিক উপাদান — কোনো কৃত্রিম প্রিজারভেটিভ নেই',
          'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি (পণ্য হাতে পেয়ে মূল্য পরিশোধ)',
          'ল্যাব পরীক্ষিত ও স্বাস্থ্যসম্মত ফুড-গ্রেড প্যাকিং',
        ]
  );
  const [newHighlightInput, setNewHighlightInput] = useState('');

  // 2. Gallery & Video Media State
  const [imageUrl, setImageUrl] = useState(
    editingProduct?.imageUrl || '/uploads/products/chak-soho-modhu.webp'
  );
  const [imageAltText, setImageAltText] = useState(
    editingProduct?.imageAltText || editingProduct?.nameBn || ''
  );
  const [galleryItems, setGalleryItems] = useState<ProductGalleryItem[]>(() => {
    if (editingProduct?.galleryItems && editingProduct.galleryItems.length > 0) {
      return editingProduct.galleryItems;
    }
    if (editingProduct?.galleryUrls && editingProduct.galleryUrls.length > 0) {
      return editingProduct.galleryUrls.map((u, idx) => ({
        id: `gal-${idx}`,
        url: u,
        altText: `${editingProduct.nameBn} - ছবি ${idx + 1}`,
        caption: `অ্যাঙ্গেল ভিউ ${idx + 1}`,
      }));
    }
    return [];
  });
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [newGalleryAlt, setNewGalleryAlt] = useState('');
  const [newGalleryCaption, setNewGalleryCaption] = useState('');
  const [videoUrl, setVideoUrl] = useState(editingProduct?.videoUrl || '');

  // 3. Advanced Multi-Attribute Variants & Wholesale Tiers State
  const [variantAttrType, setVariantAttrType] = useState('ওজন / প্যাক সাইজ');
  const [variants, setVariants] = useState<ProductVariantItem[]>(() => {
    if (editingProduct?.variants && editingProduct.variants.length > 0) {
      return editingProduct.variants;
    }
    return [];
  });
  const [wholesaleTiers, setWholesaleTiers] = useState<WholesaleTierItem[]>(
    editingProduct?.wholesaleTiers && editingProduct.wholesaleTiers.length > 0
      ? editingProduct.wholesaleTiers
      : []
  );

  // 4. Specifications, FAQs, Shipping, Warranty & Upsells State
  const [specifications, setSpecifications] = useState<ProductSpecItem[]>(
    editingProduct?.specifications && editingProduct.specifications.length > 0
      ? editingProduct.specifications
      : []
  );
  const [faqs, setFaqs] = useState<ProductFaqItem[]>(
    editingProduct?.faqs && editingProduct.faqs.length > 0 ? editingProduct.faqs : []
  );
  const [freeDelivery, setFreeDelivery] = useState(
    editingProduct?.freeDelivery ?? false
  );
  const [weightGrams, setWeightGrams] = useState(
    String(editingProduct?.weightGrams ?? 1000)
  );
  const [warrantyText, setWarrantyText] = useState(
    editingProduct?.warrantyText || '১০০% আসল ও বিশুদ্ধ পণ্যের গ্যারান্টি'
  );
  const [returnPolicyText, setReturnPolicyText] = useState(
    editingProduct?.returnPolicyText ||
      'ডেলিভারি ম্যানের সামনে পণ্য দেখে গ্রহণ করার সুবিধা ও ৭ দিনের সহজ রিপ্লেসমেন্ট'
  );
  const [upsellProductIds, setUpsellProductIds] = useState<string[]>(
    editingProduct?.upsellProductIds || []
  );

  // 5. Yoast SEO Premium State
  const [focusKeyphrase, setFocusKeyphrase] = useState(
    editingProduct?.focusKeyphrase || editingProduct?.nameBn || ''
  );
  const [relatedKeyphrases, setRelatedKeyphrases] = useState(
    editingProduct?.relatedKeyphrases || ''
  );
  const [seoTitle, setSeoTitle] = useState(
    editingProduct?.seoTitle ||
      '%%title%% %%sep%% সেরা দাম ৳%%price%% %%sep%% %%sitename%%'
  );
  const [slug, setSlug] = useState(
    editingProduct?.slug ||
      generateSeoSlug(editingProduct?.nameEn || editingProduct?.nameBn || '')
  );
  const [metaDescription, setMetaDescription] = useState(
    editingProduct?.metaDescription || ''
  );
  const [isCornerstone, setIsCornerstone] = useState(
    editingProduct?.isCornerstone ?? false
  );
  const [internalLinksUrl, setInternalLinksUrl] = useState(
    editingProduct?.internalLinksUrl || '/#popular'
  );
  const [outboundLinkUrl, setOutboundLinkUrl] = useState(
    editingProduct?.outboundLinkUrl || ''
  );

  // 6. Social Cards (OpenGraph & Twitter)
  const [ogTitle, setOgTitle] = useState(editingProduct?.ogTitle || '');
  const [ogDescription, setOgDescription] = useState(
    editingProduct?.ogDescription || ''
  );
  const [ogImageUrl, setOgImageUrl] = useState(editingProduct?.ogImageUrl || '');
  const [twitterTitle, setTwitterTitle] = useState(editingProduct?.twitterTitle || '');
  const [twitterDescription, setTwitterDescription] = useState(
    editingProduct?.twitterDescription || ''
  );
  const [twitterImageUrl, setTwitterImageUrl] = useState(
    editingProduct?.twitterImageUrl || ''
  );

  // 7. Schema.org & Technical SEO
  const [schemaBrand, setSchemaBrand] = useState(
    editingProduct?.schemaBrand || siteSettings.siteName || 'ShopBangla'
  );
  const [schemaSku, setSchemaSku] = useState(
    editingProduct?.schemaSku ||
      (editingProduct?.id
        ? editingProduct.id.toUpperCase()
        : `SB-${Math.floor(1000 + Math.random() * 9000)}`)
  );
  const [schemaGtin, setSchemaGtin] = useState(
    editingProduct?.schemaGtin || '8941193000128'
  );
  const [schemaMpn, setSchemaMpn] = useState(
    editingProduct?.schemaMpn || 'KR-BD-2026'
  );
  const [schemaCondition, setSchemaCondition] = useState<
    'NewCondition' | 'RefurbishedCondition' | 'UsedCondition'
  >(editingProduct?.schemaCondition || 'NewCondition');
  const [schemaAvailability, setSchemaAvailability] = useState<
    'InStock' | 'OutOfStock' | 'PreOrder'
  >(
    editingProduct?.schemaAvailability ||
      (Number(editingProduct?.stock ?? 45) > 0 ? 'InStock' : 'OutOfStock')
  );
  const [canonicalUrl, setCanonicalUrl] = useState(editingProduct?.canonicalUrl || '');
  const [metaRobotsIndex, setMetaRobotsIndex] = useState<'index' | 'noindex'>(
    editingProduct?.metaRobotsIndex || 'index'
  );
  const [metaRobotsFollow, setMetaRobotsFollow] = useState<'follow' | 'nofollow'>(
    editingProduct?.metaRobotsFollow || 'follow'
  );
  const [redirectOldSlug, setRedirectOldSlug] = useState(
    editingProduct?.redirectOldSlug || ''
  );

  // Sync primary price, salePrice, stock & unitLabel with variants if variants are defined
  const numericPrice = useMemo(() => {
    if (variants.length > 0) {
      return Math.max(0, Number(variants[0].regularPrice) || 0);
    }
    return Math.max(0, Number(price) || 0);
  }, [variants, price]);

  const numericSalePrice = useMemo(() => {
    if (variants.length > 0) {
      const v0 = variants[0];
      return v0.salePrice > 0 && v0.salePrice <= v0.regularPrice
        ? Number(v0.salePrice)
        : Number(v0.regularPrice);
    }
    const rawP = Math.max(0, Number(price) || 0);
    const rawS = Number(salePrice) || 0;
    return rawS > 0 && rawS <= rawP ? rawS : rawP;
  }, [variants, price, salePrice]);

  const numericStock = useMemo(() => {
    if (variants.length > 0) {
      return variants.reduce((sum, v) => sum + Math.max(0, Math.floor(Number(v.stock) || 0)), 0);
    }
    return Math.max(0, Math.floor(Number(stock) || 0));
  }, [variants, stock]);

  const effectiveUnitLabel = useMemo(() => {
    if (variants.length > 0) {
      return variants.map((v) => v.label.trim()).filter(Boolean).join(' / ');
    }
    return unitLabel.trim() || 'Standard';
  }, [variants, unitLabel]);

  // Real-time Yoast SEO Analysis
  const seoAnalysis = useMemo(
    () =>
      analyzeYoastSeo({
        nameBn,
        nameEn,
        descriptionBn,
        category,
        price: numericPrice,
        salePrice: numericSalePrice,
        stock: numericStock,
        unitLabel: effectiveUnitLabel,
        imageUrl,
        slug,
        focusKeyphrase,
        relatedKeyphrases,
        seoTitle,
        metaDescription,
        canonicalUrl,
        imageAltText,
        schemaBrand,
        schemaSku,
        schemaGtin,
        isCornerstone,
        internalLinksUrl,
        outboundLinkUrl,
        siteName: siteSettings.siteName,
      }),
    [
      nameBn,
      nameEn,
      descriptionBn,
      category,
      numericPrice,
      numericSalePrice,
      numericStock,
      effectiveUnitLabel,
      imageUrl,
      slug,
      focusKeyphrase,
      relatedKeyphrases,
      seoTitle,
      metaDescription,
      canonicalUrl,
      imageAltText,
      schemaBrand,
      schemaSku,
      schemaGtin,
      isCornerstone,
      internalLinksUrl,
      outboundLinkUrl,
      siteSettings.siteName,
    ]
  );

  // Real-time Yoast Readability Analysis
  const readabilityAnalysis = useMemo(
    () =>
      analyzeYoastReadability({
        descriptionBn,
        isCornerstone,
      }),
    [descriptionBn, isCornerstone]
  );

  // Prominent Words / Keyword Cloud
  const prominentWords = useMemo(() => {
    const rawWords = descriptionBn
      .toLowerCase()
      .replace(/[।.,!?;:()[\]"'•✓✔★\-/]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);
    const freq = new Map<string, number>();
    rawWords.forEach((w) => {
      freq.set(w, (freq.get(w) || 0) + 1);
    });
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [descriptionBn]);

  // Live Schema.org JSON-LD Preview (includes Variants AggregateOffer + FAQPage + Specs)
  const liveSchemaJson = useMemo(() => {
    const prodReviews = editingProduct
      ? reviews.filter((r) => r.productId === editingProduct.id)
      : [];
    return buildProductSchemaJsonLd(
      {
        id: editingProduct?.id || 'kr-new-product',
        nameBn: nameBn || 'নতুন পণ্য',
        nameEn: nameEn || nameBn || 'New Product',
        shortSummaryBn,
        descriptionBn: descriptionBn || nameBn || 'পণ্যের বিবরণ',
        price: numericPrice,
        salePrice: numericSalePrice,
        stock: numericStock,
        imageUrl,
        galleryItems,
        variants,
        specifications,
        faqs,
        freeDelivery,
        weightGrams: Number(weightGrams) || 0,
        category,
        unitLabel: effectiveUnitLabel,
        slug: seoAnalysis.resolvedSlug,
        metaDescription: seoAnalysis.resolvedDescription,
        canonicalUrl: seoAnalysis.resolvedCanonical,
        ogImageUrl: ogImageUrl || imageUrl,
        schemaBrand,
        schemaSku,
        schemaGtin,
        schemaMpn,
        schemaCondition,
        schemaAvailability,
      },
      siteSettings,
      prodReviews
    );
  }, [
    editingProduct,
    reviews,
    nameBn,
    nameEn,
    shortSummaryBn,
    descriptionBn,
    numericPrice,
    numericSalePrice,
    numericStock,
    imageUrl,
    galleryItems,
    variants,
    specifications,
    faqs,
    freeDelivery,
    weightGrams,
    category,
    effectiveUnitLabel,
    seoAnalysis.resolvedSlug,
    seoAnalysis.resolvedDescription,
    seoAnalysis.resolvedCanonical,
    ogImageUrl,
    schemaBrand,
    schemaSku,
    schemaGtin,
    schemaMpn,
    schemaCondition,
    schemaAvailability,
    siteSettings,
  ]);

  // Variant Management Helpers
  const handleAddBlankVariant = () => {
    const idx = variants.length + 1;
    setVariants((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}-${idx}`,
        label: idx === 1 ? '৫০০ গ্রাম' : idx === 2 ? '১ কেজি' : `ভ্যারিয়েন্ট ${idx}`,
        attrType: variantAttrType,
        regularPrice: Number(price) || 1200,
        salePrice: Number(salePrice) || 990,
        stock: 25,
        sku: `${schemaSku || 'SB'}-V${idx}`,
        weightGrams: idx === 1 ? 500 : 1000,
        imageUrl: imageUrl,
      },
    ]);
  };

  const handleApplyVariantPreset = (presetType: 'weight' | 'size' | 'combo') => {
    const baseP = Number(price) || 1200;
    const baseS = Number(salePrice) || 990;
    if (presetType === 'weight') {
      setVariantAttrType('ওজন / প্যাক সাইজ');
      setVariants([
        {
          id: `var-w-250`,
          label: '২৫০ গ্রাম ট্রায়াল প্যাক',
          attrType: 'ওজন / প্যাক সাইজ',
          regularPrice: Math.round(baseP * 0.32),
          salePrice: Math.round(baseS * 0.32),
          stock: 30,
          sku: `${schemaSku}-250G`,
          weightGrams: 250,
          imageUrl,
        },
        {
          id: `var-w-500`,
          label: '৫০০ গ্রাম রেগুলার প্যাক',
          attrType: 'ওজন / প্যাক সাইজ',
          regularPrice: Math.round(baseP * 0.58),
          salePrice: Math.round(baseS * 0.58),
          stock: 45,
          sku: `${schemaSku}-500G`,
          weightGrams: 500,
          imageUrl,
        },
        {
          id: `var-w-1000`,
          label: '১ কেজি ফ্যামিলি প্যাক',
          attrType: 'ওজন / প্যাক সাইজ',
          regularPrice: baseP,
          salePrice: baseS,
          stock: 60,
          sku: `${schemaSku}-1KG`,
          weightGrams: 1000,
          imageUrl,
        },
        {
          id: `var-w-2000`,
          label: '২ কেজি মেগা সেভার কম্বো',
          attrType: 'ওজন / প্যাক সাইজ',
          regularPrice: baseP * 2,
          salePrice: Math.round(baseS * 1.85),
          stock: 20,
          sku: `${schemaSku}-2KG`,
          weightGrams: 2000,
          imageUrl,
        },
      ]);
    } else if (presetType === 'size') {
      setVariantAttrType('সাইজ (Size)');
      setVariants(
        ['M (Medium)', 'L (Large)', 'XL (Extra Large)', 'XXL'].map((sz, i) => ({
          id: `var-sz-${i}`,
          label: sz,
          attrType: 'সাইজ (Size)',
          regularPrice: baseP,
          salePrice: baseS,
          stock: 20,
          sku: `${schemaSku}-${sz.split(' ')[0]}`,
          weightGrams: 400,
          imageUrl,
        }))
      );
    } else {
      setVariantAttrType('প্যাক ভ্যারিয়েশন');
      setVariants([
        {
          id: `var-c-1`,
          label: 'সিঙ্গেল প্যাক (১টি)',
          attrType: 'প্যাক ভ্যারিয়েশন',
          regularPrice: baseP,
          salePrice: baseS,
          stock: 40,
          sku: `${schemaSku}-1PC`,
          weightGrams: 1000,
          imageUrl,
        },
        {
          id: `var-c-2`,
          label: 'টুইন কম্বো প্যাক (২টি — অতিরিক্ত ছাড়)',
          attrType: 'প্যাক ভ্যারিয়েশন',
          regularPrice: baseP * 2,
          salePrice: Math.round(baseS * 1.85),
          stock: 25,
          sku: `${schemaSku}-2PC`,
          weightGrams: 2000,
          imageUrl,
        },
      ]);
    }
  };

  const handleUpdateVariantField = (
    id: string,
    field: keyof ProductVariantItem,
    val: string | number
  ) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: val } : v))
    );
  };

  // 1-Click Auto-Optimize Everything (Variants + Gallery + Specs + FAQs + Wholesale + 100% Yoast SEO)
  const handleAutoOptimizeSeo = () => {
    const baseTitle = nameBn.trim() || 'সুন্দরবনের খাঁটি খলিশা ফুলের মধু';
    if (!nameBn.trim()) setNameBn(baseTitle);

    const autoKp = focusKeyphrase.trim() || baseTitle;
    setFocusKeyphrase(autoKp);

    const catObj = CATEGORIES.find((c) => c.id === category);
    const catLabel = catObj ? catObj.nameBn : 'প্রিমিয়াম অর্গানিক পণ্য';

    if (!nameEn.trim()) {
      setNameEn(generateSeoSlug(baseTitle).replace(/-/g, ' '));
    }

    const generatedSlug = generateSeoSlug(nameEn.trim() || autoKp);
    setSlug(generatedSlug);

    if (!shortSummaryBn.trim()) {
      setShortSummaryBn(
        `সরাসরি উৎস থেকে সংগৃহীত শতভাগ খাঁটি ও প্রাকৃতিক ${baseTitle}। কোনো প্রকার কৃত্রিম চিনি বা কেমিক্যাল মুক্ত, ল্যাব পরীক্ষিত প্রিমিয়াম কোয়ালিটি।`
      );
    }

    // Ensure Gallery has rich multi-angle images with SEO Alt Text
    if (galleryItems.length === 0) {
      setGalleryItems([
        {
          id: 'gal-auto-1',
          url: imageUrl,
          altText: `${autoKp} - প্রিমিয়াম প্যাকিং ভিউ`,
          caption: 'ফুড-গ্রেড এয়ারটাইট জার প্যাকিং',
        },
        {
          id: 'gal-auto-2',
          url: '/uploads/products/sundarban-modhu.webp',
          altText: `${autoKp} - বিশুদ্ধ ঘনত্ব ও টেক্সচার`,
          caption: '১০০% প্রাকৃতিক ঘনত্ব ও আসল রঙ',
        },
        {
          id: 'gal-auto-3',
          url: '/uploads/products/honey-nuts.webp',
          altText: `${autoKp} - পুষ্টিগুণ ও স্বাস্থ্য উপকারিতা`,
          caption: 'পরিবারের প্রতিদিনের রোগ প্রতিরোধ ক্ষমতা বৃদ্ধিতে সহায়ক',
        },
      ]);
    }

    // Ensure Advanced Variants are populated if empty
    if (variants.length === 0) {
      handleApplyVariantPreset('weight');
    }

    // Ensure Wholesale Tiers are populated if empty
    if (wholesaleTiers.length === 0) {
      setWholesaleTiers([
        { minQty: 2, discountPercent: 5, labelBn: '২+ পিস কিনলে ৫% পাইকারি ছাড়' },
        { minQty: 5, discountPercent: 10, labelBn: '৫+ পিস কিনলে ১০% স্পেশাল ছাড়' },
      ]);
    }

    // Ensure Specifications Table is populated if empty
    if (specifications.length === 0) {
      setSpecifications([
        { label: 'পণ্যের ধরন', value: catLabel },
        { label: 'বিশুদ্ধতা ও মান', value: '১০০% প্রাকৃতিক, র (Raw) ও আনপ্রসেসড' },
        { label: 'প্রিজারভেটিভ / কেমিক্যাল', value: 'সম্পূর্ণ মুক্ত (0% Artificial Additives)' },
        { label: 'প্যাকেজিং', value: 'হাইজেনিক ফুড-গ্রেড শকপ্রুফ কন্টেইনার' },
        { label: 'মেয়াদ (Shelf Life)', value: 'উৎপাদন থেকে ২৪ মাস' },
      ]);
    }

    // Ensure Product FAQs are populated if empty
    if (faqs.length === 0) {
      setFaqs([
        {
          question: `${baseTitle} কি ১০০% খাঁটি এবং প্রাকৃতিক?`,
          answer: `হ্যাঁ, আমাদের ${baseTitle} সরাসরি বিশ্বস্ত উৎস থেকে সংগ্রহ করা হয় এবং কোনো কৃত্রিম চিনি বা কেমিক্যাল মেশানো হয় না।`,
        },
        {
          question: 'ডেলিভারি পাওয়ার পর পণ্য দেখে টাকা পরিশোধ করা যাবে কি?',
          answer:
            'জি! সারা বাংলাদেশে আমাদের সম্পূর্ণ ক্যাশ অন ডেলিভারি সুবিধা রয়েছে। ডেলিভারি ম্যানের সামনে পার্সেল খুলে দেখে মূল্য পরিশোধ করতে পারবেন।',
        },
      ]);
    }

    setRelatedKeyphrases(
      `${autoKp} দাম, আসল ${autoKp}, ${catLabel}, অনলাইন শপিং বাংলাদেশ, খাঁটি ${autoKp}`
    );

    setSeoTitle(
      `%%title%% (%%unit%%) %%sep%% সেরা দাম ৳%%price%% %%sep%% %%sitename%%`
    );

    const autoMeta = `${autoKp} কিনুন সবচেয়ে সেরা অফার দামে মাত্র ৳${numericSalePrice} টাকায়! শতভাগ খাঁটি ও প্রাকৃতিক ${catLabel}। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা।`.slice(
      0,
      158
    );
    setMetaDescription(autoMeta);

    setImageAltText(`${autoKp} - ${effectiveUnitLabel} - ${siteSettings.siteName}`);

    if (descriptionBn.trim().length < 180 || !descriptionBn.includes(autoKp)) {
      const richDesc = `${autoKp} আমাদের স্টোরের অন্যতম সেরা এবং শতভাগ প্রাকৃতিক ও খাঁটি মানের একটি পণ্য। সরাসরি উৎস থেকে সংগৃহীত হওয়ায় এর পুষ্টিগুণ, স্বাদ এবং ঘ্রাণ থাকে সম্পূর্ণ অটুট।\n\nএছাড়াও ${autoKp} নিয়মিত ব্যবহারে আপনি পাবেন সর্বোচ্চ স্বাস্থ্য সুরক্ষা এবং প্রিমিয়াম কোয়ালিটির নিশ্চয়তা। কারণ আমরা কোনো প্রকার কৃত্রিম রং বা প্রিজারভেটিভ ছাড়াই সম্পূর্ণ স্বাস্থ্যসম্মত উপায়ে এটি প্যাকিং করে থাকি।\n\n✓ মূল বৈশিষ্ট্যসমূহ:\n• শতভাগ আসল ও ল্যাব পরীক্ষিত ${autoKp}\n• প্যাক ভ্যারিয়েন্ট: ${effectiveUnitLabel} (অফার মূল্য মাত্র ৳${numericSalePrice})\n• তাই সারা বাংলাদেশে দ্রুত হোম ডেলিভারি এবং পণ্য হাতে পেয়ে মূল্য পরিশোধের (Cash on Delivery) সুবিধা রয়েছে।`;
      setDescriptionBn(richDesc);
    }

    setOgTitle(`${baseTitle} — মাত্র ৳${numericSalePrice} | ${siteSettings.siteName}`);
    setOgDescription(autoMeta);
    setOgImageUrl(imageUrl);
    setTwitterTitle(`${baseTitle} — মাত্র ৳${numericSalePrice}`);
    setTwitterDescription(autoMeta);
    setTwitterImageUrl(imageUrl);

    if (!schemaBrand.trim()) setSchemaBrand(siteSettings.siteName || 'ShopBangla');
    if (!schemaSku.trim()) setSchemaSku(`SB-${Date.now().toString().slice(-5)}`);
    if (!schemaGtin.trim()) setSchemaGtin('8941193000128');
    if (!internalLinksUrl.trim()) setInternalLinksUrl('/#popular');
    if (!outboundLinkUrl.trim()) setOutboundLinkUrl('https://bsti.gov.bd');
    setIsCornerstone(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameBn.trim()) {
      setStudioTab('general');
      return;
    }
    setIsSaving(true);
    try {
      const cleanGalleryItems = galleryItems
        .filter((g) => g.url.trim().length > 0)
        .slice(0, 20);
      const cleanGalleryUrls = Array.from(
        new Set([imageUrl.trim(), ...cleanGalleryItems.map((g) => g.url.trim())])
      ).slice(0, 20);

      await onSave(
        {
          nameBn: nameBn.trim().slice(0, 160),
          nameEn: (nameEn.trim() || nameBn.trim()).slice(0, 160),
          shortSummaryBn: shortSummaryBn.trim().slice(0, 600),
          descriptionBn: (descriptionBn.trim() || nameBn.trim()).slice(0, 8000),
          descriptionEn: (descriptionBn.trim() || nameBn.trim()).slice(0, 8000),
          category,
          price: numericPrice,
          salePrice: numericSalePrice,
          isFlashSale,
          stock: numericStock,
          unitLabel: effectiveUnitLabel.slice(0, 120),
          imageUrl: imageUrl.trim().slice(0, 250000),
          galleryUrls: cleanGalleryUrls,
          galleryItems: cleanGalleryItems,
          videoUrl: videoUrl.trim().slice(0, 1000),
          variants: variants.slice(0, 40),
          highlights: highlights.filter((h) => h.trim().length > 0).slice(0, 25),
          specifications: specifications
            .filter((s) => s.label.trim() && s.value.trim())
            .slice(0, 30),
          faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()).slice(0, 20),
          wholesaleTiers: wholesaleTiers
            .filter((w) => w.minQty >= 2 && w.discountPercent > 0)
            .slice(0, 15),
          upsellProductIds: upsellProductIds.slice(0, 15),
          freeDelivery,
          weightGrams: Math.max(0, Number(weightGrams) || 0),
          warrantyText: warrantyText.trim().slice(0, 300),
          returnPolicyText: returnPolicyText.trim().slice(0, 300),
          badgeLabel: badgeLabel.trim().slice(0, 80),
          slug: seoAnalysis.resolvedSlug.slice(0, 200),
          focusKeyphrase: (focusKeyphrase.trim() || nameBn.trim()).slice(0, 200),
          relatedKeyphrases: relatedKeyphrases.trim().slice(0, 500),
          seoTitle: seoTitle.trim().slice(0, 250),
          metaDescription: seoAnalysis.resolvedDescription.slice(0, 500),
          canonicalUrl: canonicalUrl.trim().slice(0, 500),
          metaRobotsIndex,
          metaRobotsFollow,
          ogTitle: (ogTitle.trim() || seoAnalysis.resolvedTitle).slice(0, 250),
          ogDescription: (ogDescription.trim() || seoAnalysis.resolvedDescription).slice(
            0,
            500
          ),
          ogImageUrl: (ogImageUrl.trim() || imageUrl.trim()).slice(0, 250000),
          twitterTitle: (twitterTitle.trim() || seoAnalysis.resolvedTitle).slice(0, 250),
          twitterDescription: (
            twitterDescription.trim() || seoAnalysis.resolvedDescription
          ).slice(0, 500),
          twitterImageUrl: (twitterImageUrl.trim() || imageUrl.trim()).slice(0, 250000),
          schemaBrand: (
            schemaBrand.trim() ||
            siteSettings.siteName ||
            'ShopBangla'
          ).slice(0, 150),
          schemaSku: (schemaSku.trim() || 'SB-001').slice(0, 120),
          schemaGtin: schemaGtin.trim().slice(0, 120),
          schemaMpn: schemaMpn.trim().slice(0, 120),
          schemaCondition,
          schemaAvailability,
          imageAltText: (imageAltText.trim() || nameBn.trim()).slice(0, 300),
          isCornerstone,
          internalLinksUrl: internalLinksUrl.trim().slice(0, 500),
          outboundLinkUrl: outboundLinkUrl.trim().slice(0, 500),
          redirectOldSlug: redirectOldSlug.trim().slice(0, 250),
          seoScore: seoAnalysis.overallScore,
          readabilityScore: readabilityAnalysis.readabilityScore,
        },
        editingProduct?.id || null
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const seoBadge = getTrafficLightColor(seoAnalysis.overallStatus);
  const readBadge = getTrafficLightColor(readabilityAnalysis.readabilityStatus);

  const insertYoastVariable = (variable: string) => {
    setSeoTitle((prev) => `${prev.trim()} ${variable}`.trim());
  };

  const appendTransitionPhrase = (phrase: string) => {
    setDescriptionBn((prev) =>
      prev.trim() ? `${prev.trim()} ${phrase}` : `${phrase} `
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(11, 28, 21, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <form
        onSubmit={handleFormSubmit}
        style={{
          width: 'min(100%, 600px)',
          maxHeight: '95vh',
          background: '#f7f6f1',
          borderRadius: '26px 26px 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 -16px 48px rgba(0,0,0,0.38)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================
            STICKY STUDIO HEADER + LIVE YOAST TRAFFIC LIGHT SCORES
           ============================================================ */}
        <div
          style={{
            background: 'linear-gradient(145deg, #0d2e22 0%, #164836 100%)',
            color: '#fff',
            padding: '14px 15px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg,#dfbe7f,#b5893e)',
                  color: '#10281e',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                PRO
              </span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 14, color: '#fff' }}>
                    {editingProduct
                      ? 'অ্যাডভান্সড পণ্য ও Yoast SEO সম্পাদনা'
                      : 'নতুন পণ্য যোগ করুন (Pro Studio)'}
                  </strong>
                  <span
                    style={{
                      background: '#dfbe7f',
                      color: '#10281e',
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 6,
                    }}
                  >
                    VARIANTS + GALLERY + YOAST SEO
                  </span>
                </div>
                <small style={{ fontSize: 10, color: '#b8d0c4', display: 'block' }}>
                  গ্যালারি, মাল্টি-ভ্যারিয়েন্ট, পাইকারি ছাড়, স্পেসিফিকেশন, FAQ ও ১০০% Yoast SEO
                </small>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                borderRadius: 20,
                padding: '5px 11px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✕ বন্ধ
            </button>
          </div>

          {/* LIVE SCORE BAR & 1-CLICK AUTO SETUP */}
          <div
            style={{
              marginTop: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              flexWrap: 'wrap',
              background: 'rgba(0,0,0,0.24)',
              padding: '7px 10px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <div
                onClick={() => setStudioTab('yoast_seo')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: seoBadge.bg,
                  color: seoBadge.text,
                  padding: '3px 8px',
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: seoBadge.dot,
                  }}
                />
                <span>SEO: {seoAnalysis.overallScore}/100</span>
              </div>

              <div
                onClick={() => setStudioTab('readability_social')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: readBadge.bg,
                  color: readBadge.text,
                  padding: '3px 8px',
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: readBadge.dot,
                  }}
                />
                <span>Readability: {readabilityAnalysis.readabilityScore}%</span>
              </div>

              <span style={{ fontSize: 10, color: '#cfe3d8', fontWeight: 700 }}>
                • ভ্যারিয়েন্ট: {variants.length || 1}টি · গ্যালারি: {galleryItems.length + 1}টি ছবি
              </span>
            </div>

            <button
              type="button"
              onClick={handleAutoOptimizeSeo}
              style={{
                border: 0,
                background: 'linear-gradient(135deg,#e4c687,#c39648)',
                color: '#10281e',
                borderRadius: 18,
                padding: '5px 10px',
                fontSize: 10,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ⚡ ১-ক্লিকে ভ্যারিয়েন্ট + গ্যালারি + ১০০% SEO সেটআপ
            </button>
          </div>

          {/* 7 HORIZONTAL SCROLLABLE STUDIO TABS */}
          <div
            style={{
              marginTop: 9,
              display: 'flex',
              gap: 5,
              overflowX: 'auto',
              paddingBottom: 2,
              scrollbarWidth: 'none',
            }}
          >
            {[
              { id: 'general', label: '১. সাধারণ ও হাইলাইটস' },
              {
                id: 'gallery_media',
                label: `২. গ্যালারি ও ভিডিও (${galleryItems.length + 1})`,
              },
              {
                id: 'variants_wholesale',
                label: `৩. ভ্যারিয়েন্ট ও পাইকারি (${variants.length || 1})`,
              },
              {
                id: 'specs_faq_policy',
                label: `৪. স্পেক, FAQ ও ডেলিভারি`,
              },
              { id: 'yoast_seo', label: `৫. Yoast SEO (${seoAnalysis.overallScore}%)` },
              { id: 'readability_social', label: '৬. রিডেবিলিটি ও সোশ্যাল' },
              { id: 'schema_tech', label: '৭. Schema ও টেকনিক্যাল' },
            ].map((t) => {
              const active = studioTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStudioTab(t.id as StudioTab)}
                  style={{
                    border: 0,
                    borderRadius: 9,
                    padding: '6px 10px',
                    fontSize: 10,
                    fontWeight: active ? 800 : 600,
                    background: active ? '#fff' : 'rgba(255,255,255,0.12)',
                    color: active ? '#123b2e' : '#d8e6de',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================
            SCROLLABLE STUDIO CONTENT AREA
           ============================================================ */}
        <div
          style={{
            padding: '13px 15px',
            overflowY: 'auto',
            display: 'grid',
            gap: 12,
            flex: 1,
          }}
        >
          {/* ============================================================
              TAB 1: GENERAL INFO, BADGE, SHORT SUMMARY & KEY HIGHLIGHTS
             ============================================================ */}
          {studioTab === 'general' && (
            <div style={{ display: 'grid', gap: 11 }}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 9,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                  📦 পণ্যের নাম, ক্যাটাগরি ও মূল মূল্যমান
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                    পণ্যের নাম (বাংলা) *
                  </label>
                  <input
                    type="text"
                    required
                    value={nameBn}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNameBn(val);
                      if (!focusKeyphrase) setFocusKeyphrase(val);
                      if (!slug) setSlug(generateSeoSlug(val));
                      if (!imageAltText) setImageAltText(val);
                    }}
                    placeholder="যেমন: সুন্দরবনের খাঁটি খলিশা ফুলের মধু"
                    style={{
                      width: '100%',
                      marginTop: 3,
                      padding: '9px 11px',
                      borderRadius: 10,
                      border: '1px solid #dcded6',
                      fontSize: 12,
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                      ইংরেজি নাম / SEO Permalink Name
                    </label>
                    <input
                      type="text"
                      value={nameEn}
                      onChange={(e) => {
                        setNameEn(e.target.value);
                        setSlug(generateSeoSlug(e.target.value || nameBn));
                      }}
                      placeholder="Pure Sundarban Khalisha Honey"
                      style={{
                        width: '100%',
                        marginTop: 3,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid #dcded6',
                        fontSize: 11.5,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                      কাস্টম ব্যাজ স্টিকার (Badge)
                    </label>
                    <input
                      type="text"
                      value={badgeLabel}
                      onChange={(e) => setBadgeLabel(e.target.value)}
                      placeholder="বেস্ট সেলার / ১০০% অর্গানিক"
                      style={{
                        width: '100%',
                        marginTop: 3,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid #dcded6',
                        fontSize: 11.5,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                      ক্যাটাগরি *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ProductCategory)}
                      style={{
                        width: '100%',
                        marginTop: 3,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid #dcded6',
                        fontSize: 12,
                        background: '#fff',
                      }}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameBn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                      ডিফল্ট ইউনিট লেবেল (ভ্যারিয়েন্ট থাকলে অটো-সিঙ্ক হয়)
                    </label>
                    <input
                      type="text"
                      required
                      value={effectiveUnitLabel}
                      onChange={(e) => setUnitLabel(e.target.value)}
                      placeholder="৫০০ গ্রাম / ১ কেজি"
                      style={{
                        width: '100%',
                        marginTop: 3,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid #dcded6',
                        fontSize: 11.5,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                      রেগুলার মূল্য (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      value={variants.length > 0 ? numericPrice : price}
                      onChange={(e) => setPrice(e.target.value)}
                      style={{
                        width: '100%',
                        marginTop: 3,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid #dcded6',
                        fontSize: 12,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                      অফার মূল্য (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      value={variants.length > 0 ? numericSalePrice : salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      style={{
                        width: '100%',
                        marginTop: 3,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid #dcded6',
                        fontSize: 12,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                      মোট স্টক *
                    </label>
                    <input
                      type="number"
                      required
                      value={variants.length > 0 ? numericStock : stock}
                      onChange={(e) => setStock(e.target.value)}
                      style={{
                        width: '100%',
                        marginTop: 3,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid #dcded6',
                        fontSize: 12,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#1b4332',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isFlashSale}
                      onChange={(e) => setIsFlashSale(e.target.checked)}
                    />
                    <span>⚡ ফ্ল্যাশ সেল / আজকের স্পেশাল ডিলে দেখান</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#1b4332',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={freeDelivery}
                      onChange={(e) => setFreeDelivery(e.target.checked)}
                    />
                    <span>🚚 এই পণ্যে সম্পূর্ণ ফ্রি ডেলিভারি</span>
                  </label>
                </div>
              </div>

              {/* Short Summary & Key Highlights Bullet Builder */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 9,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                  ✨ সংক্ষিপ্ত সারসংক্ষেপ ও কী-ফিচার বুলেট পয়েন্টস (Key Highlights)
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                    সংক্ষিপ্ত সারসংক্ষেপ (Short Summary — প্রোডাক্ট টাইটেলের নিচে দেখাবে)
                  </label>
                  <textarea
                    rows={2}
                    value={shortSummaryBn}
                    onChange={(e) => setShortSummaryBn(e.target.value)}
                    placeholder="১-২ লাইনে পণ্যের মূল আকর্ষণ লিখুন..."
                    style={{
                      width: '100%',
                      marginTop: 3,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #dcded6',
                      fontSize: 11.5,
                    }}
                  />
                </div>

                {/* Key Highlights List */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                    কী-ফিচার বুলেট পয়েন্টস ({highlights.length}টি)
                  </label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <input
                      type="text"
                      value={newHighlightInput}
                      onChange={(e) => setNewHighlightInput(e.target.value)}
                      placeholder="নতুন বৈশিষ্ট্য লিখুন (যেমন: ১০০% BSTI অনুমোদিত)"
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 9,
                        border: '1px solid #dcded6',
                        fontSize: 11.5,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newHighlightInput.trim()) return;
                        setHighlights((prev) => [...prev, newHighlightInput.trim()]);
                        setNewHighlightInput('');
                      }}
                      style={{
                        border: 0,
                        background: '#123b2e',
                        color: '#fff',
                        borderRadius: 9,
                        padding: '0 12px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + যোগ
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: 5, marginTop: 7 }}>
                    {highlights.map((hl, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          background: '#f7f6f1',
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid #e6e8e0',
                          fontSize: 11,
                        }}
                      >
                        <span>✓ {hl}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setHighlights((prev) => prev.filter((_, i) => i !== idx))
                          }
                          style={{
                            border: 0,
                            background: '#fae9e6',
                            color: '#b24a41',
                            borderRadius: 6,
                            padding: '2px 7px',
                            fontSize: 10,
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Long-form SEO Product Description */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                    📝 পণ্যের বিস্তারিত বিবরণ (SEO Long Description)
                  </span>
                  <span style={{ fontSize: 10, color: '#526157', fontWeight: 700 }}>
                    {seoAnalysis.wordCount} শব্দ · ডেনসিটি: {seoAnalysis.keyphraseDensity}%
                  </span>
                </div>

                <textarea
                  rows={5}
                  value={descriptionBn}
                  onChange={(e) => setDescriptionBn(e.target.value)}
                  placeholder="প্রথম প্যারাগ্রাফে ফোকাস কিফ্রেজ রেখে পণ্যের বিস্তারিত গুণাগুণ, উপকারিতা ও ব্যবহারবিধি লিখুন..."
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    borderRadius: 10,
                    border: '1px solid #dcded6',
                    fontSize: 12,
                    lineHeight: 1.55,
                  }}
                />
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 2: PRODUCT GALLERY IMAGES, FILE UPLOAD, ALT SEO & VIDEO
             ============================================================ */}
          {studioTab === 'gallery_media' && (
            <div style={{ display: 'grid', gap: 12 }}>
              {/* Primary Cover Image + Direct Device File Upload */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                  🖼️ মূল কভার ছবি (Main Cover Image) ও ফাইল আপলোড
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <img
                    src={imageUrl}
                    alt={imageAltText || nameBn || 'Cover'}
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 12,
                      objectFit: 'cover',
                      border: '2px solid #123b2e',
                      background: '#f5f4ef',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                    <input
                      type="text"
                      required
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="কভার ছবির URL বা নিচের বাটন থেকে আপলোড করুন"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 9,
                        border: '1px solid #dcded6',
                        fontSize: 11,
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <label
                        style={{
                          background: '#123b2e',
                          color: '#fff',
                          borderRadius: 8,
                          padding: '6px 11px',
                          fontSize: 10.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-block',
                        }}
                      >
                        📤 ডিভাইস থেকে কভার ছবি আপলোড
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const dataUrl = await compressImageFileToDataUrl(file);
                            setImageUrl(dataUrl);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                    কভার ছবির SEO Alt Text (Google Images র‍্যাঙ্কিংয়ের জন্য ফোকাস কিফ্রেজ দিন) *
                  </label>
                  <input
                    type="text"
                    value={imageAltText}
                    onChange={(e) => setImageAltText(e.target.value)}
                    placeholder="যেমন: সুন্দরবনের খাঁটি খলিশা ফুলের মধু ১ কেজি"
                    style={{
                      width: '100%',
                      marginTop: 3,
                      padding: '8px 10px',
                      borderRadius: 9,
                      border: '1px solid #dcded6',
                      fontSize: 11.5,
                    }}
                  />
                </div>
              </div>

              {/* MULTI-IMAGE PRODUCT GALLERY MANAGER */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                      📸 মাল্টি-ইমেজ প্রোডাক্ট গ্যালারি ({galleryItems.length}টি অতিরিক্ত ছবি)
                    </div>
                    <small style={{ fontSize: 10, color: '#647067' }}>
                      প্রোডাক্ট ডিটেইল পেজে ক্রেতারা থাম্বনেইল স্লাইডার ও জুম ভিউতে সব ছবি দেখবেন
                    </small>
                  </div>

                  {/* Direct Multi-File Upload to Gallery */}
                  <label
                    style={{
                      background: '#e7f4ec',
                      color: '#123b2e',
                      border: '1px solid #b7e1c7',
                      borderRadius: 9,
                      padding: '6px 10px',
                      fontSize: 10.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    + ফাইল আপলোড (একাধিক ছবি)
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const files: File[] = e.target.files
                          ? Array.from(e.target.files)
                          : [];
                        if (files.length === 0) return;
                        const uploaded: ProductGalleryItem[] = [];
                        for (let i = 0; i < files.length; i++) {
                          const dataUrl = await compressImageFileToDataUrl(files[i]);
                          uploaded.push({
                            id: `gal-up-${Date.now()}-${i}`,
                            url: dataUrl,
                            altText: `${focusKeyphrase || nameBn || 'পণ্য'} - গ্যালারি ছবি ${
                              galleryItems.length + i + 1
                            }`,
                            caption: files[i].name.replace(/\.[^/.]+$/, ''),
                          });
                        }
                        setGalleryItems((prev) => [...prev, ...uploaded]);
                      }}
                    />
                  </label>
                </div>

                {/* Add Gallery Image by URL + SEO Alt Text */}
                <div
                  style={{
                    background: '#f7f6f1',
                    padding: 10,
                    borderRadius: 11,
                    border: '1px solid #e6e8e0',
                    display: 'grid',
                    gap: 7,
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#123b2e' }}>
                    নতুন গ্যালারি ছবি যোগ করুন (URL ও আলাদা SEO Alt Text সহ):
                  </div>
                  <input
                    type="text"
                    value={newGalleryUrl}
                    onChange={(e) => setNewGalleryUrl(e.target.value)}
                    placeholder="গ্যালারি ছবির URL (যেমন: /uploads/products/sundarban-modhu.webp)"
                    style={{
                      padding: '7px 9px',
                      borderRadius: 8,
                      border: '1px solid #dcded6',
                      fontSize: 11,
                    }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6 }}>
                    <input
                      type="text"
                      value={newGalleryAlt}
                      onChange={(e) => setNewGalleryAlt(e.target.value)}
                      placeholder="ছবির SEO Alt Text"
                      style={{
                        padding: '7px 9px',
                        borderRadius: 8,
                        border: '1px solid #dcded6',
                        fontSize: 11,
                      }}
                    />
                    <input
                      type="text"
                      value={newGalleryCaption}
                      onChange={(e) => setNewGalleryCaption(e.target.value)}
                      placeholder="ক্যাপশন (ঐচ্ছিক)"
                      style={{
                        padding: '7px 9px',
                        borderRadius: 8,
                        border: '1px solid #dcded6',
                        fontSize: 11,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newGalleryUrl.trim()) return;
                        setGalleryItems((prev) => [
                          ...prev,
                          {
                            id: `gal-${Date.now()}`,
                            url: newGalleryUrl.trim(),
                            altText:
                              newGalleryAlt.trim() ||
                              `${focusKeyphrase || nameBn || 'পণ্য'} গ্যালারি ছবি`,
                            caption: newGalleryCaption.trim(),
                          },
                        ]);
                        setNewGalleryUrl('');
                        setNewGalleryAlt('');
                        setNewGalleryCaption('');
                      }}
                      style={{
                        border: 0,
                        background: '#123b2e',
                        color: '#fff',
                        borderRadius: 8,
                        padding: '0 12px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + গ্যালারিতে যোগ
                    </button>
                  </div>

                  {/* Quick 1-Click Add from Catalog Images */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
                    {QUICK_PRODUCT_IMAGES.map((qImg) => (
                      <button
                        key={qImg.url}
                        type="button"
                        onClick={() => {
                          setGalleryItems((prev) => [
                            ...prev,
                            {
                              id: `gal-q-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                              url: qImg.url,
                              altText: `${focusKeyphrase || nameBn || qImg.label} - ${qImg.label}`,
                              caption: qImg.label,
                            },
                          ]);
                        }}
                        style={{
                          border: '1px solid #d5dbd6',
                          background: '#fff',
                          color: '#123b2e',
                          borderRadius: 7,
                          padding: '3px 7px',
                          fontSize: 9.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        + {qImg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gallery Items List with Reorder & Editable Alt Text */}
                {galleryItems.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: 14,
                      fontSize: 11,
                      color: '#7a847c',
                      background: '#f9f9f6',
                      borderRadius: 10,
                    }}
                  >
                    কোনো অতিরিক্ত গ্যালারি ছবি যোগ করা হয়নি। উপরে ফাইল আপলোড বা প্রিসেট বাটনে ক্লিক করে গ্যালারি সাজান।
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {galleryItems.map((item, idx) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          gap: 9,
                          alignItems: 'center',
                          background: '#f7f6f1',
                          padding: 8,
                          borderRadius: 11,
                          border: '1px solid #e2e4dc',
                        }}
                      >
                        <img
                          src={item.url}
                          alt={item.altText}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 9,
                            objectFit: 'cover',
                            flexShrink: 0,
                            background: '#fff',
                          }}
                        />
                        <div style={{ flex: 1, display: 'grid', gap: 4 }}>
                          <input
                            type="text"
                            value={item.altText}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGalleryItems((prev) =>
                                prev.map((g, i) =>
                                  i === idx ? { ...g, altText: val } : g
                                )
                              );
                            }}
                            placeholder="SEO Alt Text..."
                            style={{
                              padding: '5px 8px',
                              borderRadius: 7,
                              border: '1px solid #dcded6',
                              fontSize: 10.5,
                              background: '#fff',
                            }}
                          />
                          <input
                            type="text"
                            value={item.caption || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGalleryItems((prev) =>
                                prev.map((g, i) =>
                                  i === idx ? { ...g, caption: val } : g
                                )
                              );
                            }}
                            placeholder="ছবির ক্যাপশন..."
                            style={{
                              padding: '4px 8px',
                              borderRadius: 7,
                              border: '1px solid #dcded6',
                              fontSize: 10,
                              background: '#fff',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <button
                            type="button"
                            title="কভার ছবি করুন"
                            onClick={() => setImageUrl(item.url)}
                            style={{
                              border: 0,
                              background: '#e7f4ec',
                              color: '#123b2e',
                              borderRadius: 6,
                              padding: '3px 6px',
                              fontSize: 9.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            কভার
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setGalleryItems((prev) => prev.filter((_, i) => i !== idx))
                            }
                            style={{
                              border: 0,
                              background: '#fae9e6',
                              color: '#b24a41',
                              borderRadius: 6,
                              padding: '3px 6px',
                              fontSize: 9.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            ডিলিট
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PRODUCT VIDEO URL */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                  🎬 প্রোডাক্ট ভিডিও লিংক (YouTube / MP4 Video URL)
                </div>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="যেমন: https://www.youtube.com/watch?v=... বা MP4 লিংক"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid #dcded6',
                    fontSize: 11.5,
                  }}
                />
                <small style={{ fontSize: 10, color: '#647067' }}>
                  ভিডিও লিংক দিলে প্রোডাক্ট ডিটেইল পেজের গ্যালারিতে ক্রেতারা সরাসরি ভিডিও প্লে করতে পারবেন।
                </small>
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 3: ADVANCED MULTI-ATTRIBUTE VARIANTS & WHOLESALE TIERS
             ============================================================ */}
          {studioTab === 'variants_wholesale' && (
            <div style={{ display: 'grid', gap: 12 }}>
              {/* Advanced Variant Matrix Builder */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                      🎛️ অ্যাডভান্সড প্রোডাক্ট ভ্যারিয়েন্ট ইঞ্জিন ({variants.length}টি ভ্যারিয়েন্ট)
                    </div>
                    <small style={{ fontSize: 10, color: '#647067' }}>
                      প্রতিটি ভ্যারিয়েন্টের আলাদা দাম, অফার দাম, স্টক, SKU, ওজন ও ভ্যারিয়েন্ট ছবি সেট করুন
                    </small>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBlankVariant}
                    style={{
                      border: 0,
                      background: '#123b2e',
                      color: '#fff',
                      borderRadius: 9,
                      padding: '6px 11px',
                      fontSize: 10.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    + নতুন ভ্যারিয়েন্ট যোগ
                  </button>
                </div>

                {/* 1-Click Variant Preset Generators */}
                <div
                  style={{
                    background: '#f2f8f4',
                    border: '1px solid #cfe0d5',
                    borderRadius: 10,
                    padding: '8px 10px',
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#123b2e' }}>
                    ⚡ ১-ক্লিকে রেডিমেড ভ্যারিয়েন্ট টেমপ্লেট জেনারেট করুন:
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleApplyVariantPreset('weight')}
                      style={{
                        border: '1px solid #123b2e',
                        background: '#fff',
                        color: '#123b2e',
                        borderRadius: 8,
                        padding: '4px 9px',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ⚖️ ওজন ভ্যারিয়েন্ট (২৫০ গ্রাম, ৫০০ গ্রাম, ১ কেজি, ২ কেজি)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyVariantPreset('size')}
                      style={{
                        border: '1px solid #123b2e',
                        background: '#fff',
                        color: '#123b2e',
                        borderRadius: 8,
                        padding: '4px 9px',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      👕 ফ্যাশন সাইজ (M, L, XL, XXL)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyVariantPreset('combo')}
                      style={{
                        border: '1px solid #123b2e',
                        background: '#fff',
                        color: '#123b2e',
                        borderRadius: 8,
                        padding: '4px 9px',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      🎁 কম্বো প্যাক (সিঙ্গেল ও টুইন সেভার)
                    </button>
                  </div>
                </div>

                {/* Variant Cards List */}
                {variants.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: 14,
                      fontSize: 11,
                      color: '#7a847c',
                      background: '#f9f9f6',
                      borderRadius: 10,
                    }}
                  >
                    কোনো কাস্টম ভ্যারিয়েন্ট তৈরি করা হয়নি। উপরের প্রিসেট বাটনে বা &quot;+ নতুন ভ্যারিয়েন্ট যোগ&quot; বাটনে ক্লিক করুন।
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {variants.map((v, idx) => {
                      const disc =
                        v.regularPrice > v.salePrice
                          ? Math.round(
                              ((v.regularPrice - v.salePrice) / v.regularPrice) * 100
                            )
                          : 0;
                      return (
                        <div
                          key={v.id}
                          style={{
                            background: '#f7f6f1',
                            border: '1px solid #dcded6',
                            borderRadius: 12,
                            padding: 10,
                            display: 'grid',
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span
                                style={{
                                  background: '#123b2e',
                                  color: '#fff',
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: 6,
                                }}
                              >
                                ভ্যারিয়েন্ট #{idx + 1}
                              </span>
                              {disc > 0 && (
                                <span
                                  style={{
                                    background: '#fef4e4',
                                    color: '#9c5f0f',
                                    fontSize: 9.5,
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: 6,
                                  }}
                                >
                                  -{disc}% ছাড়
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setVariants((prev) => prev.filter((item) => item.id !== v.id))
                              }
                              style={{
                                border: 0,
                                background: '#fae9e6',
                                color: '#b24a41',
                                borderRadius: 6,
                                padding: '3px 8px',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ✕ ডিলিট
                            </button>
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1.4fr 1fr 1fr',
                              gap: 6,
                            }}
                          >
                            <div>
                              <label style={{ fontSize: 9.5, color: '#526157', fontWeight: 600 }}>
                                ভ্যারিয়েন্টের নাম *
                              </label>
                              <input
                                type="text"
                                value={v.label}
                                onChange={(e) =>
                                  handleUpdateVariantField(v.id, 'label', e.target.value)
                                }
                                placeholder="যেমন: ১ কেজি প্যাক"
                                style={{
                                  width: '100%',
                                  marginTop: 2,
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border: '1px solid #dcded6',
                                  fontSize: 11,
                                  background: '#fff',
                                  fontWeight: 700,
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 9.5, color: '#526157', fontWeight: 600 }}>
                                রেগুলার দাম (৳)
                              </label>
                              <input
                                type="number"
                                value={v.regularPrice}
                                onChange={(e) =>
                                  handleUpdateVariantField(
                                    v.id,
                                    'regularPrice',
                                    Number(e.target.value)
                                  )
                                }
                                style={{
                                  width: '100%',
                                  marginTop: 2,
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border: '1px solid #dcded6',
                                  fontSize: 11,
                                  background: '#fff',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 9.5, color: '#526157', fontWeight: 600 }}>
                                অফার দাম (৳) *
                              </label>
                              <input
                                type="number"
                                value={v.salePrice}
                                onChange={(e) =>
                                  handleUpdateVariantField(
                                    v.id,
                                    'salePrice',
                                    Number(e.target.value)
                                  )
                                }
                                style={{
                                  width: '100%',
                                  marginTop: 2,
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border: '1px solid #123b2e',
                                  fontSize: 11,
                                  background: '#fff',
                                  fontWeight: 700,
                                }}
                              />
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr 1fr 1.4fr',
                              gap: 6,
                            }}
                          >
                            <div>
                              <label style={{ fontSize: 9.5, color: '#526157', fontWeight: 600 }}>
                                স্টক সংখ্যা
                              </label>
                              <input
                                type="number"
                                value={v.stock}
                                onChange={(e) =>
                                  handleUpdateVariantField(
                                    v.id,
                                    'stock',
                                    Number(e.target.value)
                                  )
                                }
                                style={{
                                  width: '100%',
                                  marginTop: 2,
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border: '1px solid #dcded6',
                                  fontSize: 11,
                                  background: '#fff',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 9.5, color: '#526157', fontWeight: 600 }}>
                                SKU কোড
                              </label>
                              <input
                                type="text"
                                value={v.sku}
                                onChange={(e) =>
                                  handleUpdateVariantField(v.id, 'sku', e.target.value)
                                }
                                style={{
                                  width: '100%',
                                  marginTop: 2,
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border: '1px solid #dcded6',
                                  fontSize: 10.5,
                                  background: '#fff',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 9.5, color: '#526157', fontWeight: 600 }}>
                                ওজন (গ্রাম)
                              </label>
                              <input
                                type="number"
                                value={v.weightGrams || 0}
                                onChange={(e) =>
                                  handleUpdateVariantField(
                                    v.id,
                                    'weightGrams',
                                    Number(e.target.value)
                                  )
                                }
                                style={{
                                  width: '100%',
                                  marginTop: 2,
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border: '1px solid #dcded6',
                                  fontSize: 10.5,
                                  background: '#fff',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 9.5, color: '#526157', fontWeight: 600 }}>
                                ভ্যারিয়েন্ট ছবি URL
                              </label>
                              <input
                                type="text"
                                value={v.imageUrl || ''}
                                onChange={(e) =>
                                  handleUpdateVariantField(v.id, 'imageUrl', e.target.value)
                                }
                                placeholder={imageUrl}
                                style={{
                                  width: '100%',
                                  marginTop: 2,
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border: '1px solid #dcded6',
                                  fontSize: 10.5,
                                  background: '#fff',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Wholesale / Bulk Quantity Tiered Pricing */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 9,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                      🏷️ পাইকারি ও বাল্ক কোয়ান্টিটি ডিসকাউন্ট (Wholesale Tier Pricing)
                    </div>
                    <small style={{ fontSize: 10, color: '#647067' }}>
                      ক্রেতা নির্দিষ্ট পরিমাণের বেশি অর্ডার করলে স্বয়ংক্রিয়ভাবে অতিরিক্ত ছাড় পাবেন
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setWholesaleTiers([
                        { minQty: 2, discountPercent: 5, labelBn: '২+ পিসে ৫% ছাড়' },
                        { minQty: 4, discountPercent: 10, labelBn: '৪+ পিসে ১০% ছাড়' },
                        { minQty: 10, discountPercent: 15, labelBn: '১০+ পিসে ১৫% পাইকারি ছাড়' },
                      ])
                    }
                    style={{
                      border: '1px solid #123b2e',
                      background: '#f2f8f4',
                      color: '#123b2e',
                      borderRadius: 8,
                      padding: '5px 9px',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + অটো পাইকারি টিয়ার যোগ
                  </button>
                </div>

                {wholesaleTiers.map((tier, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1.6fr auto',
                      gap: 6,
                      alignItems: 'center',
                      background: '#f7f6f1',
                      padding: 7,
                      borderRadius: 9,
                    }}
                  >
                    <input
                      type="number"
                      value={tier.minQty}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setWholesaleTiers((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, minQty: val } : t))
                        );
                      }}
                      placeholder="কমপক্ষে পিস"
                      style={{
                        padding: '6px 8px',
                        borderRadius: 7,
                        border: '1px solid #dcded6',
                        fontSize: 11,
                        background: '#fff',
                      }}
                    />
                    <input
                      type="number"
                      value={tier.discountPercent}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setWholesaleTiers((prev) =>
                          prev.map((t, i) =>
                            i === idx ? { ...t, discountPercent: val } : t
                          )
                        );
                      }}
                      placeholder="ছাড় %"
                      style={{
                        padding: '6px 8px',
                        borderRadius: 7,
                        border: '1px solid #dcded6',
                        fontSize: 11,
                        background: '#fff',
                      }}
                    />
                    <input
                      type="text"
                      value={tier.labelBn || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWholesaleTiers((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, labelBn: val } : t))
                        );
                      }}
                      placeholder="লেবেল (যেমন: ৩+ পিসে ৫% ছাড়)"
                      style={{
                        padding: '6px 8px',
                        borderRadius: 7,
                        border: '1px solid #dcded6',
                        fontSize: 11,
                        background: '#fff',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setWholesaleTiers((prev) => prev.filter((_, i) => i !== idx))
                      }
                      style={{
                        border: 0,
                        background: '#fae9e6',
                        color: '#b24a41',
                        borderRadius: 7,
                        padding: '6px 8px',
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 4: SPECIFICATIONS TABLE, FAQS, SHIPPING, WARRANTY & UPSELL
             ============================================================ */}
          {studioTab === 'specs_faq_policy' && (
            <div style={{ display: 'grid', gap: 12 }}>
              {/* Specifications Table Builder */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 9,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                    📋 টেকনিক্যাল স্পেসিফিকেশন টেবিল ({specifications.length}টি)
                  </span>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button
                      type="button"
                      onClick={() =>
                        setSpecifications([
                          { label: 'উৎস / Origin', value: 'সুন্দরবন / প্রাকৃতিক খামার' },
                          { label: 'বিশুদ্ধতা', value: '১০০% খাঁটি ও ল্যাব পরীক্ষিত' },
                          { label: 'প্রিজারভেটিভ', value: 'নেই (Chemical Free)' },
                          { label: 'মেয়াদ', value: '২৪ মাস' },
                        ])
                      }
                      style={{
                        border: '1px solid #cfe0d5',
                        background: '#f2f8f4',
                        color: '#123b2e',
                        borderRadius: 7,
                        padding: '4px 8px',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + প্রিসেট স্পেক
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSpecifications((prev) => [...prev, { label: '', value: '' }])
                      }
                      style={{
                        border: 0,
                        background: '#123b2e',
                        color: '#fff',
                        borderRadius: 7,
                        padding: '4px 9px',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + নতুন সারি
                    </button>
                  </div>
                </div>

                {specifications.map((sp, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1.4fr auto',
                      gap: 6,
                    }}
                  >
                    <input
                      type="text"
                      value={sp.label}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSpecifications((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, label: val } : s))
                        );
                      }}
                      placeholder="বৈশিষ্ট্য (যেমন: উৎস)"
                      style={{
                        padding: '7px 9px',
                        borderRadius: 8,
                        border: '1px solid #dcded6',
                        fontSize: 11,
                      }}
                    />
                    <input
                      type="text"
                      value={sp.value}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSpecifications((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, value: val } : s))
                        );
                      }}
                      placeholder="মান (যেমন: ১০০% প্রাকৃতিক)"
                      style={{
                        padding: '7px 9px',
                        borderRadius: 8,
                        border: '1px solid #dcded6',
                        fontSize: 11,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSpecifications((prev) => prev.filter((_, i) => i !== idx))
                      }
                      style={{
                        border: 0,
                        background: '#fae9e6',
                        color: '#b24a41',
                        borderRadius: 8,
                        padding: '0 9px',
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Product FAQs Builder (Generates Google FAQPage Schema!) */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 9,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                      ❓ প্রোডাক্ট FAQ ও Google FAQPage Rich Snippet ({faqs.length}টি)
                    </div>
                    <small style={{ fontSize: 10, color: '#647067' }}>
                      প্রোডাক্ট পেজে প্রশ্নোত্তর দেখাবে এবং গুগল সার্চে FAQ ড্রপডাউন তৈরি করবে
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFaqs((prev) => [...prev, { question: '', answer: '' }])
                    }
                    style={{
                      border: 0,
                      background: '#123b2e',
                      color: '#fff',
                      borderRadius: 8,
                      padding: '5px 10px',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + প্রশ্ন যোগ
                  </button>
                </div>

                {faqs.map((fq, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#f7f6f1',
                      padding: 9,
                      borderRadius: 10,
                      border: '1px solid #e2e4dc',
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        value={fq.question}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFaqs((prev) =>
                            prev.map((f, i) =>
                              i === idx ? { ...f, question: val } : f
                            )
                          );
                        }}
                        placeholder="প্রশ্ন (যেমন: এটি কি ১০০% খাঁটি?)"
                        style={{
                          flex: 1,
                          padding: '7px 9px',
                          borderRadius: 8,
                          border: '1px solid #dcded6',
                          fontSize: 11,
                          background: '#fff',
                          fontWeight: 700,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFaqs((prev) => prev.filter((_, i) => i !== idx))
                        }
                        style={{
                          border: 0,
                          background: '#fae9e6',
                          color: '#b24a41',
                          borderRadius: 8,
                          padding: '0 9px',
                          fontSize: 10,
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={fq.answer}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFaqs((prev) =>
                          prev.map((f, i) => (i === idx ? { ...f, answer: val } : f))
                        );
                      }}
                      placeholder="উত্তর লিখুন..."
                      style={{
                        width: '100%',
                        padding: '7px 9px',
                        borderRadius: 8,
                        border: '1px solid #dcded6',
                        fontSize: 11,
                        background: '#fff',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Delivery, Weight, Warranty & Return Policy */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 9,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                  🚚 ডেলিভারি, ওজন, ওয়ারেন্টি ও রিটার্ন পলিসি সেটিংস
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                      পণ্যের ওজন (গ্রাম)
                    </label>
                    <input
                      type="number"
                      value={weightGrams}
                      onChange={(e) => setWeightGrams(e.target.value)}
                      style={{
                        width: '100%',
                        marginTop: 3,
                        padding: '8px 10px',
                        borderRadius: 9,
                        border: '1px solid #dcded6',
                        fontSize: 11.5,
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        background: freeDelivery ? '#e7f4ec' : '#f7f6f1',
                        border: '1px solid #cfe0d5',
                        padding: '8px 10px',
                        borderRadius: 9,
                        width: '100%',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#123b2e',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={freeDelivery}
                        onChange={(e) => setFreeDelivery(e.target.checked)}
                      />
                      <span>ফ্রি হোম ডেলিভারি ব্যাজ</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                    ওয়ারেন্টি / বিশুদ্ধতা গ্যারান্টি টেক্সট
                  </label>
                  <input
                    type="text"
                    value={warrantyText}
                    onChange={(e) => setWarrantyText(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: 3,
                      padding: '8px 10px',
                      borderRadius: 9,
                      border: '1px solid #dcded6',
                      fontSize: 11.5,
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                    রিটার্ন ও রিপ্লেসমেন্ট পলিসি টেক্সট
                  </label>
                  <input
                    type="text"
                    value={returnPolicyText}
                    onChange={(e) => setReturnPolicyText(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: 3,
                      padding: '8px 10px',
                      borderRadius: 9,
                      border: '1px solid #dcded6',
                      fontSize: 11.5,
                    }}
                  />
                </div>
              </div>

              {/* Upsell & Cross-Sell Product Selector */}
              {allProducts.length > 0 && (
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 14,
                    padding: 12,
                    border: '1px solid #e6e8e0',
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                    🤝 আপসেল ও কম্বো প্রোডাক্ট সিলেক্টর (Frequently Bought Together)
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {allProducts
                      .filter((p) => p.id !== editingProduct?.id)
                      .slice(0, 12)
                      .map((p) => {
                        const selected = upsellProductIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              setUpsellProductIds((prev) =>
                                selected
                                  ? prev.filter((id) => id !== p.id)
                                  : [...prev, p.id]
                              )
                            }
                            style={{
                              border: selected
                                ? '1.5px solid #123b2e'
                                : '1px solid #dcded6',
                              background: selected ? '#e7f4ec' : '#f7f6f1',
                              color: '#123b2e',
                              borderRadius: 9,
                              padding: '5px 9px',
                              fontSize: 10.5,
                              fontWeight: selected ? 800 : 600,
                              cursor: 'pointer',
                            }}
                          >
                            {selected ? '✓ ' : '+ '}
                            {p.nameBn}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TAB 5: YOAST SEO PREMIUM (FOCUS KEYPHRASE, SERP, 12 CHECKS)
             ============================================================ */}
          {studioTab === 'yoast_seo' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 9,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                    🎯 ফোকাস কিফ্রেজ ও সিনোনিম (Yoast SEO Premium)
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: seoBadge.bg,
                      color: seoBadge.text,
                      fontWeight: 700,
                    }}
                  >
                    {seoBadge.labelBn}
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                    প্রাইমারি ফোকাস কিফ্রেজ (Focus Keyphrase) *
                  </label>
                  <input
                    type="text"
                    value={focusKeyphrase}
                    onChange={(e) => setFocusKeyphrase(e.target.value)}
                    placeholder="যেমন: সুন্দরবনের খাঁটি মধু"
                    style={{
                      width: '100%',
                      marginTop: 3,
                      padding: '8px 11px',
                      borderRadius: 10,
                      border: '1px solid #123b2e',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                    👑 Yoast Premium: সমার্থক ও অতিরিক্ত কিফ্রেজ (Synonyms — কমা দিয়ে লিখুন)
                  </label>
                  <input
                    type="text"
                    value={relatedKeyphrases}
                    onChange={(e) => setRelatedKeyphrases(e.target.value)}
                    placeholder="যেমন: খলিশা ফুলের মধু, আসল মধু দাম, pure honey bd"
                    style={{
                      width: '100%',
                      marginTop: 3,
                      padding: '8px 11px',
                      borderRadius: 10,
                      border: '1px solid #dcded6',
                      fontSize: 11,
                    }}
                  />
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isCornerstone ? '#fef8ec' : '#f7f6f1',
                    border: isCornerstone ? '1px solid #e2c285' : '1px solid #e6e8e0',
                    padding: '8px 10px',
                    borderRadius: 10,
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#123b2e' }}>
                      ⭐ কর্নারস্টোন কন্টেন্ট (Cornerstone Product Content)
                    </div>
                    <div style={{ fontSize: 9.5, color: '#647067' }}>
                      স্টোরের সবচেয়ে গুরুত্বপূর্ণ ফ্ল্যাগশিপ পণ্য হিসেবে গুগলকে সিগন্যাল দেয়
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isCornerstone}
                    onChange={(e) => setIsCornerstone(e.target.checked)}
                  />
                </label>
              </div>

              {/* GOOGLE SERP SNIPPET PREVIEW */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                    🔍 Google Search স্নিপেট প্রিভিউ (SERP Preview)
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setSerpMode('mobile')}
                      style={{
                        border: 0,
                        borderRadius: 8,
                        padding: '4px 8px',
                        fontSize: 10,
                        fontWeight: 700,
                        background: serpMode === 'mobile' ? '#123b2e' : '#eff0ea',
                        color: serpMode === 'mobile' ? '#fff' : '#4a554d',
                        cursor: 'pointer',
                      }}
                    >
                      📱 মোবাইল
                    </button>
                    <button
                      type="button"
                      onClick={() => setSerpMode('desktop')}
                      style={{
                        border: 0,
                        borderRadius: 8,
                        padding: '4px 8px',
                        fontSize: 10,
                        fontWeight: 700,
                        background: serpMode === 'desktop' ? '#123b2e' : '#eff0ea',
                        color: serpMode === 'desktop' ? '#fff' : '#4a554d',
                        cursor: 'pointer',
                      }}
                    >
                      💻 ডেস্কটপ
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #dfe1e5',
                    borderRadius: 12,
                    padding: serpMode === 'mobile' ? '12px' : '14px 18px',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: '#123b2e',
                        color: '#dfbe7f',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      S
                    </div>
                    <div style={{ lineHeight: 1.25 }}>
                      <div style={{ fontSize: 12, color: '#202124', fontWeight: 600 }}>
                        {siteSettings.siteName}
                      </div>
                      <div style={{ fontSize: 11, color: '#4d5156' }}>
                        https://shopbangla.com › product › {seoAnalysis.resolvedSlug}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: serpMode === 'mobile' ? 15 : 17,
                      color: '#1a0dab',
                      fontWeight: 500,
                      lineHeight: 1.3,
                      marginBottom: 4,
                    }}
                  >
                    {seoAnalysis.resolvedTitle}
                  </div>

                  <div
                    style={{
                      fontSize: 11.5,
                      color: '#70757a',
                      marginBottom: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ color: '#fbbc04' }}>★★★★★</span>
                    <span>৫.০</span>
                    <span>·</span>
                    <strong style={{ color: '#188038' }}>
                      ৳{numericSalePrice.toLocaleString('bn-BD')}
                    </strong>
                    {variants.length > 1 && <span>({variants.length}টি ভ্যারিয়েন্ট)</span>}
                    <span>·</span>
                    <span style={{ color: numericStock > 0 ? '#188038' : '#d93025' }}>
                      {numericStock > 0 ? 'In stock' : 'Out of stock'}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: 12, color: '#4d5156', lineHeight: 1.45 }}>
                    {seoAnalysis.resolvedDescription || 'পণ্যের মেটা ডেসক্রিপশন এখানে দেখা যাবে...'}
                  </p>
                </div>

                {/* SEO Title & Variable Inserters */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                      এসইও টাইটেল (SEO Title)
                    </label>
                    <span style={{ fontSize: 10, color: '#526157', fontWeight: 700 }}>
                      {seoAnalysis.resolvedTitle.length}/৬৫ অক্ষর
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', margin: '4px 0' }}>
                    {[
                      { tag: '%%title%%', label: '+ নাম' },
                      { tag: '%%price%%', label: '+ দাম' },
                      { tag: '%%unit%%', label: '+ ভ্যারিয়েন্ট' },
                      { tag: '%%sep%%', label: '+ (—)' },
                      { tag: '%%sitename%%', label: '+ সাইট নাম' },
                    ].map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => insertYoastVariable(v.tag)}
                        style={{
                          border: '1px solid #cfe0d5',
                          background: '#f2f8f4',
                          color: '#123b2e',
                          borderRadius: 6,
                          padding: '2px 7px',
                          fontSize: 9.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #dcded6',
                      fontSize: 11.5,
                    }}
                  />
                </div>

                {/* URL Slug & Meta Description */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                    ইউআরএল স্লাগ (URL Slug)
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(generateSeoSlug(e.target.value))}
                    style={{
                      width: '100%',
                      marginTop: 3,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #dcded6',
                      fontSize: 11.5,
                    }}
                  />
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <label style={{ fontSize: 10, fontWeight: 600, color: '#526157' }}>
                      মেটা ডেসক্রিপশন (Meta Description)
                    </label>
                    <span style={{ fontSize: 10, color: '#526157', fontWeight: 700 }}>
                      {seoAnalysis.resolvedDescription.length}/১৬০ অক্ষর
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: 3,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #dcded6',
                      fontSize: 11.5,
                    }}
                  />
                </div>
              </div>

              {/* 12-POINT LIVE YOAST SEO CHECKLIST */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 7,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                  🚦 Yoast SEO ১২-পয়েন্ট লাইভ অ্যানালাইসিস রিপোর্ট ({seoAnalysis.overallScore}%)
                </div>
                {seoAnalysis.checks.map((chk) => {
                  const colors = getTrafficLightColor(chk.status);
                  return (
                    <div
                      key={chk.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: colors.dot,
                          marginTop: 3,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#1b2820',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>{chk.titleBn}</span>
                          <span style={{ fontSize: 10, color: colors.text }}>
                            +{chk.score}/{chk.maxScore}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: '#425247', marginTop: 2 }}>
                          {chk.detailBn}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 6: READABILITY & SOCIAL CARDS (FB OPENGRAPH & X/TWITTER)
             ============================================================ */}
          {studioTab === 'readability_social' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 9,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                  📖 Yoast Readability ও ট্রানজিশন শব্দ ({readabilityAnalysis.readabilityScore}%)
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[
                    'এছাড়াও শতভাগ প্রাকৃতিক ও খাঁটি।',
                    'কারণ এটি সরাসরি উৎস থেকে সংগৃহীত।',
                    'বিশেষত পরিবারের সুস্বাস্থ্যের জন্য অত্যন্ত উপকারী।',
                    'তাই আজই অর্ডার করুন ক্যাশ অন ডেলিভারিতে।',
                  ].map((ph, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => appendTransitionPhrase(ph)}
                      style={{
                        border: '1px solid #cfe0d5',
                        background: '#f2f8f4',
                        color: '#123b2e',
                        borderRadius: 8,
                        padding: '4px 8px',
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      + {ph}
                    </button>
                  ))}
                </div>
                {readabilityAnalysis.checks.map((chk) => {
                  const colors = getTrafficLightColor(chk.status);
                  return (
                    <div
                      key={chk.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: colors.dot,
                          marginTop: 3,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>{chk.titleBn}</div>
                        <div style={{ fontSize: 10, color: '#425247' }}>{chk.detailBn}</div>
                      </div>
                    </div>
                  );
                })}
                {prominentWords.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                    {prominentWords.map(([w, c]) => (
                      <span
                        key={w}
                        style={{
                          background: '#f3f2eb',
                          borderRadius: 14,
                          padding: '3px 8px',
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {w} ({c})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Facebook OpenGraph & X/Twitter Cards */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                  📘 Facebook OpenGraph ও X (Twitter) সোশ্যাল কার্ড
                </div>
                <input
                  type="text"
                  value={ogTitle}
                  onChange={(e) => setOgTitle(e.target.value)}
                  placeholder="Facebook OpenGraph Title"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: '1px solid #dcded6',
                    fontSize: 11.5,
                  }}
                />
                <input
                  type="text"
                  value={ogDescription}
                  onChange={(e) => setOgDescription(e.target.value)}
                  placeholder="Facebook OpenGraph Description"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: '1px solid #dcded6',
                    fontSize: 11.5,
                  }}
                />
                <input
                  type="text"
                  value={twitterTitle}
                  onChange={(e) => setTwitterTitle(e.target.value)}
                  placeholder="X / Twitter Title"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: '1px solid #dcded6',
                    fontSize: 11.5,
                  }}
                />
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 7: SCHEMA.ORG JSON-LD, ROBOTS & TECHNICAL SEO
             ============================================================ */}
          {studioTab === 'schema_tech' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 12,
                  border: '1px solid #e6e8e0',
                  display: 'grid',
                  gap: 9,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#123b2e' }}>
                  🏷️ Schema.org প্রোডাক্ট, ব্র্যান্ড, SKU ও ইনডেক্সিং
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    type="text"
                    value={schemaBrand}
                    onChange={(e) => setSchemaBrand(e.target.value)}
                    placeholder="Brand Name"
                    style={{
                      padding: '8px 10px',
                      borderRadius: 9,
                      border: '1px solid #dcded6',
                      fontSize: 11.5,
                    }}
                  />
                  <input
                    type="text"
                    value={schemaSku}
                    onChange={(e) => setSchemaSku(e.target.value)}
                    placeholder="Master SKU"
                    style={{
                      padding: '8px 10px',
                      borderRadius: 9,
                      border: '1px solid #dcded6',
                      fontSize: 11.5,
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <select
                    value={metaRobotsIndex}
                    onChange={(e) =>
                      setMetaRobotsIndex(e.target.value as 'index' | 'noindex')
                    }
                    style={{
                      padding: '8px 10px',
                      borderRadius: 9,
                      border: '1px solid #dcded6',
                      fontSize: 11.5,
                      background: '#fff',
                    }}
                  >
                    <option value="index">index (গুগলে ইনডেক্স হবে)</option>
                    <option value="noindex">noindex</option>
                  </select>
                  <select
                    value={metaRobotsFollow}
                    onChange={(e) =>
                      setMetaRobotsFollow(e.target.value as 'follow' | 'nofollow')
                    }
                    style={{
                      padding: '8px 10px',
                      borderRadius: 9,
                      border: '1px solid #dcded6',
                      fontSize: 11.5,
                      background: '#fff',
                    }}
                  >
                    <option value="follow">follow</option>
                    <option value="nofollow">nofollow</option>
                  </select>
                </div>

                <input
                  type="text"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="Canonical URL (ঐচ্ছিক)"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: '1px solid #dcded6',
                    fontSize: 11.5,
                  }}
                />
                <input
                  type="text"
                  value={redirectOldSlug}
                  onChange={(e) => setRedirectOldSlug(e.target.value)}
                  placeholder="301 Redirect Old Slug (ঐচ্ছিক)"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: '1px solid #dcded6',
                    fontSize: 11.5,
                  }}
                />
              </div>

              <div
                style={{
                  background: '#0f241c',
                  color: '#d9ede3',
                  borderRadius: 14,
                  padding: 12,
                  display: 'grid',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#dfbe7f' }}>
                    {'{ }'} লাইভ Schema.org JSON-LD (Product + AggregateOffer + FAQPage)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(JSON.stringify(liveSchemaJson, null, 2));
                      setCopiedSchema(true);
                      setTimeout(() => setCopiedSchema(false), 1800);
                    }}
                    style={{
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      borderRadius: 7,
                      padding: '3px 8px',
                      fontSize: 9.5,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedSchema ? '✓ কপি হয়েছে' : 'কপি JSON-LD'}
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    fontSize: 10,
                    lineHeight: 1.4,
                    maxHeight: 160,
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    color: '#a7e8c3',
                  }}
                >
                  {JSON.stringify(liveSchemaJson, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================
            STICKY ACTION FOOTER
           ============================================================ */}
        <div
          style={{
            padding: '11px 15px 14px',
            background: '#fff',
            borderTop: '1px solid #e6e8e0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <button
            type="submit"
            disabled={isSaving}
            style={{
              flex: 1,
              padding: '11px 14px',
              borderRadius: 12,
              border: 0,
              background: '#123b2e',
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {isSaving
              ? 'ডাটাবেসে সেভ হচ্ছে...'
              : editingProduct
              ? `✓ আপডেট ও Yoast SEO সেভ করুন (SEO: ${seoAnalysis.overallScore}%)`
              : `✓ নতুন পণ্য ও Yoast SEO সেভ করুন (SEO: ${seoAnalysis.overallScore}%)`}
          </button>

          {editingProduct && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(editingProduct.id)}
              style={{
                padding: '11px 14px',
                borderRadius: 12,
                border: 0,
                background: '#fae9e6',
                color: '#b24a41',
                fontSize: 11.5,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ডিলিট
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
