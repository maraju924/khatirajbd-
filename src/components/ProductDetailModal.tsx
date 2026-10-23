import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ShoppingBag,
  Star,
  Plus,
  Minus,
  CheckCircle2,
  MessageSquarePlus,
  Truck,
  ShieldCheck,
  RefreshCw,
  PlayCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Layers,
  Tag,
  HelpCircle,
  ListChecks,
  Sparkles,
  PackageCheck,
  Weight,
  Share2,
  Copy,
  Check,
  Heart,
  ArrowLeft,
  Globe,
  Code2,
  Search,
  ExternalLink,
  Maximize2,
  Barcode,
  FileText,
  Award,
} from 'lucide-react';
import {
  Product,
  Language,
  ReviewItem,
  ProductVariantItem,
  SiteSettings,
  ProductCategory,
} from '../types';
import { db } from '../firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ProductImage } from './ProductImage';
import {
  generateSeoSlug,
  analyzeYoastSeo,
  analyzeYoastReadability,
  buildProductSchemaJsonLd,
} from '../utils/yoastSeoEngine';

interface ProductDetailModalProps {
  product: Product | null;
  allProducts?: Product[];
  lang: Language;
  reviews: ReviewItem[];
  siteSettings?: SiteSettings;
  wishlist?: string[];
  onToggleWishlist?: (productId: string, e: React.MouseEvent) => void;
  onNavigateCategory?: (category: ProductCategory) => void;
  onClose: () => void;
  onSelectProduct?: (product: Product) => void;
  onAddToCart: (
    product: Product,
    qty: number,
    variant: string,
    openCheckout?: boolean,
    variantMeta?: {
      variantPrice?: number;
      variantRegularPrice?: number;
      variantSku?: string;
      variantImageUrl?: string;
    }
  ) => void;
}

const CATEGORY_INFO: Record<
  string,
  { bn: string; en: string }
> = {
  honey: { bn: 'খাঁটি মধু ও সুপারফুড', en: 'Pure Honey & Superfoods' },
  ghee_oil: { bn: 'ঘি ও প্রাকৃতিক তেল', en: 'Ghee & Cold-Pressed Oil' },
  superfoods: { bn: 'সুপারফুড ও সিডস', en: 'Superfoods & Seeds' },
  nuts_dates: { bn: 'বাদাম ও খেজুর', en: 'Premium Nuts & Dates' },
  wellness: { bn: 'হেলথ ও ওয়েলনেস', en: 'Health & Wellness' },
  organic_food: { bn: 'অর্গানিক ফুড', en: 'Organic Food' },
  spices: { bn: 'মশলা ও অর্গানিক খাবার', en: 'Spices & Organic Foods' },
  fashion: { bn: 'ফ্যাশন ও লাইফস্টাইল', en: 'Fashion & Apparel' },
  electronics: { bn: 'ইলেকট্রনিক্স ও গ্যাজেট', en: 'Electronics & Gadgets' },
  skincare: { bn: 'বিউটি ও স্কিনকেয়ার', en: 'Beauty & Skincare' },
  kitchen_cutlery: { bn: 'হোম ও কিচেন অ্যাক্সেসরিজ', en: 'Home & Kitchen' },
  home_lifestyle: { bn: 'হোম ও লাইফস্টাইল', en: 'Home & Lifestyle' },
  jewellery: { bn: 'জুয়েলারি ও অর্নামেন্টস', en: 'Jewellery & Ornaments' },
  combo: { bn: 'কম্বো ও গিফট প্যাক', en: 'Combo & Gift Packs' },
};

const FALLBACK_VARIANTS_BY_CATEGORY: Record<string, string[]> = {
  honey: ['500g Jar', '1kg Family Pack', '2kg Saver Pack'],
  ghee_oil: ['500ml Bottle', '1 Litre Saver', '2 Litre Family Pack'],
  superfoods: ['250g Pack', '500g Jar', '1kg Value Pack'],
  nuts_dates: ['500g Box', '1kg Premium Box', '2kg Family Pack'],
  wellness: ['250g Pack', '500g Pack'],
  organic_food: ['500g Pack', '1kg Pack'],
  spices: ['250g Pack', '500g Jar', '1kg Bulk Pack'],
  electronics: ['Standard Edition', 'Combo Pack'],
  fashion: ['Size M', 'Size L', 'Size XL', 'Size XXL'],
  skincare: ['Single Pack', 'Duo Saver Pack'],
  kitchen_cutlery: ['Standard Set', 'Premium Set'],
  home_lifestyle: ['Standard Pack', 'Family Set'],
  combo: ['Regular Combo', 'Family Gift Box'],
  jewellery: ['Standard Size', 'Gift Box Edition'],
};

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  allProducts = [],
  lang,
  reviews,
  siteSettings,
  wishlist = [],
  onToggleWishlist,
  onNavigateCategory,
  onClose,
  onSelectProduct,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantLabel, setSelectedVariantLabel] = useState('');
  const [selectedVariantObj, setSelectedVariantObj] = useState<ProductVariantItem | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activeSectionTab, setActiveSectionTab] = useState<
    'overview' | 'specs' | 'faq' | 'reviews' | 'seo'
  >('overview');
  const [showSeoInspector, setShowSeoInspector] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Review form state
  const [reviewerName, setReviewerName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmittedMsg, setReviewSubmittedMsg] = useState<string | null>(null);

  const containerScrollRef = useRef<HTMLDivElement | null>(null);

  // Build unified gallery items list with SEO altText & captions
  const galleryList = useMemo(() => {
    if (!product) return [];
    const items: Array<{ id: string; url: string; altText: string; caption?: string }> = [];

    if (product.imageUrl) {
      items.push({
        id: 'primary',
        url: product.imageUrl,
        altText: product.imageAltText || product.nameBn,
        caption: product.shortSummaryBn || '',
      });
    }

    if (Array.isArray(product.galleryItems) && product.galleryItems.length > 0) {
      product.galleryItems.forEach((g, idx) => {
        if (g.url && !items.some((x) => x.url === g.url)) {
          items.push({
            id: g.id || `gal-${idx}`,
            url: g.url,
            altText: g.altText || `${product.nameBn} - ছবি ${idx + 2}`,
            caption: g.caption,
          });
        }
      });
    } else if (Array.isArray(product.galleryUrls) && product.galleryUrls.length > 0) {
      product.galleryUrls.forEach((url, idx) => {
        if (url && !items.some((x) => x.url === url)) {
          items.push({
            id: `legacy-gal-${idx}`,
            url,
            altText: `${product.nameBn} - গ্যালারি ছবি ${idx + 2}`,
          });
        }
      });
    }

    if (Array.isArray(product.variants)) {
      product.variants.forEach((v, idx) => {
        if (v.imageUrl && !items.some((x) => x.url === v.imageUrl)) {
          items.push({
            id: `var-img-${v.id || idx}`,
            url: v.imageUrl,
            altText: `${product.nameBn} - ${v.label}`,
            caption: `${v.attrType}: ${v.label}`,
          });
        }
      });
    }

    return items;
  }, [product]);

  // Synchronize URL query/hash when product opens for SEO shareability
  useEffect(() => {
    if (!product) return;
    setQuantity(1);
    setSelectedImageIdx(0);
    setShowVideoPlayer(false);
    setIsLightboxOpen(false);
    setOpenFaqIndex(0);
    setActiveSectionTab('overview');
    setReviewSubmittedMsg(null);

    if (containerScrollRef.current) {
      containerScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (Array.isArray(product.variants) && product.variants.length > 0) {
      const defVar = product.variants[0];
      setSelectedVariantObj(defVar);
      setSelectedVariantLabel(defVar.label);
    } else {
      setSelectedVariantObj(null);
      const defaults = FALLBACK_VARIANTS_BY_CATEGORY[product.category] || [product.unitLabel];
      setSelectedVariantLabel(product.unitLabel || defaults[0]);
    }

    const seoSlug = generateSeoSlug(
      product.slug || product.nameEn || product.nameBn,
      product.id
    );
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('product', seoSlug);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore history errors inside constrained iframes
    }
  }, [product]);

  const handleCloseModal = () => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('product')) {
        url.searchParams.delete('product');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {
      // ignore
    }
    onClose();
  };

  if (!product) return null;

  const hasStructuredVariants =
    Array.isArray(product.variants) && product.variants.length > 0;

  const fallbackVariants: string[] = Array.from(
    new Set([
      product.unitLabel,
      ...(FALLBACK_VARIANTS_BY_CATEGORY[product.category] || []),
    ])
  );

  const baseRegularPrice = selectedVariantObj
    ? selectedVariantObj.regularPrice
    : product.price;
  const baseSalePrice = selectedVariantObj
    ? selectedVariantObj.salePrice < selectedVariantObj.regularPrice
      ? selectedVariantObj.salePrice
      : selectedVariantObj.regularPrice
    : product.salePrice < product.price
    ? product.salePrice
    : product.price;

  // Wholesale tier pricing calculation
  const sortedWholesaleTiers = Array.isArray(product.wholesaleTiers)
    ? [...product.wholesaleTiers].sort((a, b) => b.minQty - a.minQty)
    : [];

  const activeWholesaleTier = sortedWholesaleTiers.find(
    (tier) => quantity >= tier.minQty && tier.discountPercent > 0
  );

  const effectiveUnitPrice = activeWholesaleTier
    ? Math.max(
        1,
        Math.round(baseSalePrice * (1 - activeWholesaleTier.discountPercent / 100))
      )
    : baseSalePrice;

  const activeStock = selectedVariantObj ? selectedVariantObj.stock : product.stock;
  const activeSku =
    selectedVariantObj?.sku ||
    product.schemaSku ||
    `SB-${product.id.slice(0, 6).toUpperCase()}`;
  const activeWeightGrams =
    selectedVariantObj?.weightGrams || product.weightGrams || 0;

  const discountPercent =
    baseRegularPrice > effectiveUnitPrice
      ? Math.round(((baseRegularPrice - effectiveUnitPrice) / baseRegularPrice) * 100)
      : 0;

  // Approved reviews for this product
  const productReviews = reviews.filter(
    (r) => r.productId === product.id && r.status === 'Approved'
  );

  const avgRatingNumber =
    productReviews.length > 0
      ? Number(
          (
            productReviews.reduce((acc, r) => acc + (r.rating || 5), 0) /
            productReviews.length
          ).toFixed(1)
        )
      : 4.9;

  const totalReviewCount = productReviews.length;

  // Rating breakdown (5 to 1 star)
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = productReviews.filter((r) => Math.round(r.rating) === star).length;
    const pct =
      productReviews.length > 0 ? Math.round((count / productReviews.length) * 100) : star === 5 ? 85 : star === 4 ? 15 : 0;
    return { star, count, pct };
  });

  // Upsell / Cross-sell + Related products in same category
  const explicitUpsells =
    Array.isArray(product.upsellProductIds) && product.upsellProductIds.length > 0
      ? allProducts.filter(
          (p) => product.upsellProductIds!.includes(p.id) && p.id !== product.id
        )
      : [];
  const sameCategoryUpsells = allProducts.filter(
    (p) =>
      p.id !== product.id &&
      p.category === product.category &&
      !explicitUpsells.some((u) => u.id === p.id)
  );
  const upsellProducts =
    explicitUpsells.length >= 3
      ? explicitUpsells.slice(0, 4)
      : [...explicitUpsells, ...sameCategoryUpsells].slice(0, 4);

  // Live Yoast SEO & Readability calculation for this product
  const seoSlug = generateSeoSlug(
    product.slug || product.nameEn || product.nameBn,
    product.id
  );
  const canonicalUrl =
    product.canonicalUrl?.trim() ||
    `${typeof window !== 'undefined' ? window.location.origin : 'https://shopbangla.com'}/?product=${encodeURIComponent(seoSlug)}`;

  const yoastSeoAnalysis = analyzeYoastSeo({
    nameBn: product.nameBn,
    nameEn: product.nameEn,
    descriptionBn: product.descriptionBn,
    price: baseRegularPrice,
    salePrice: effectiveUnitPrice,
    stock: activeStock,
    imageUrl: product.imageUrl,
    category: product.category,
    unitLabel: selectedVariantLabel || product.unitLabel,
    siteName: siteSettings?.siteName || 'ShopBangla',
    focusKeyphrase: product.focusKeyphrase || product.nameBn.split(' ').slice(0, 3).join(' '),
    relatedKeyphrases: product.relatedKeyphrases || '',
    seoTitle: product.seoTitle || '',
    slug: seoSlug,
    metaDescription:
      product.metaDescription || product.shortSummaryBn || product.descriptionBn.slice(0, 155),
    canonicalUrl,
    imageAltText: product.imageAltText || product.nameBn,
    isCornerstone: Boolean(product.isCornerstone),
    internalLinksUrl: product.internalLinksUrl || '',
    outboundLinkUrl: product.outboundLinkUrl || '',
    schemaBrand: product.schemaBrand || siteSettings?.siteName || 'ShopBangla',
    schemaSku: activeSku,
    schemaGtin: product.schemaGtin || '',
  });

  const yoastReadability = analyzeYoastReadability({
    descriptionBn: product.descriptionBn,
    isCornerstone: Boolean(product.isCornerstone),
  });

  const liveJsonLd = buildProductSchemaJsonLd(product, siteSettings, reviews);

  const handleSelectStructuredVariant = (v: ProductVariantItem) => {
    setSelectedVariantObj(v);
    setSelectedVariantLabel(v.label);
    if (v.imageUrl) {
      const idx = galleryList.findIndex((g) => g.url === v.imageUrl);
      if (idx !== -1) {
        setSelectedImageIdx(idx);
        setShowVideoPlayer(false);
      }
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      const reviewId = `kr-rev-${Date.now()}`;
      await setDoc(doc(db, 'reviews', reviewId), {
        productId: product.id,
        productName: product.nameBn.slice(0, 160),
        customerName: reviewerName.trim().slice(0, 80),
        rating: Math.min(5, Math.max(1, Number(reviewRating) || 5)),
        comment: reviewComment.trim().slice(0, 1000),
        status: 'Approved',
        adminReply: 'আপনার মূল্যবান মতামতের জন্য অসংখ্য ধন্যবাদ!',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setReviewerName('');
      setReviewComment('');
      setReviewRating(5);
      setReviewSubmittedMsg(
        lang === 'bn'
          ? 'আপনার রিভিউ সফলভাবে প্রকাশিত হয়েছে!'
          : 'Your review has been published!'
      );
    } catch {
      setReviewSubmittedMsg(
        lang === 'bn'
          ? 'রিভিউ জমা দিতে কমপক্ষে ২ অক্ষরের নাম ও মতামত দিন।'
          : 'Please enter at least 2 characters for name and comment.'
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const currentGalleryItem =
    galleryList[selectedImageIdx] ||
    galleryList[0] || {
      id: 'fallback',
      url: product.imageUrl,
      altText: product.imageAltText || product.nameBn,
    };

  const getYoutubeEmbedUrl = (url?: string): string | null => {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const youtubeEmbedUrl = getYoutubeEmbedUrl(product.videoUrl);

  const triggerCartAction = (openCheckout: boolean) => {
    onAddToCart(product, quantity, selectedVariantLabel, openCheckout, {
      variantPrice: effectiveUnitPrice,
      variantRegularPrice: baseRegularPrice,
      variantSku: activeSku,
      variantImageUrl: selectedVariantObj?.imageUrl || currentGalleryItem.url,
    });
    if (openCheckout) {
      handleCloseModal();
    }
  };

  const handleCopyCanonical = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2200);
    } catch {
      // ignore
    }
  };

  const scrollToSection = (
    tab: 'overview' | 'specs' | 'faq' | 'reviews' | 'seo',
    elementId: string
  ) => {
    setActiveSectionTab(tab);
    if (tab === 'seo') {
      setShowSeoInspector(true);
    }
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const isWishlisted = wishlist.includes(product.id);
  const categoryLabel =
    CATEGORY_INFO[product.category]?.[lang] ||
    product.category.replace('_', ' ');

  // Consolidated specifications (dynamic custom specs + core SEO product identifiers)
  const fullSpecificationRows: Array<{ label: string; value: string }> = [];
  if (Array.isArray(product.specifications)) {
    product.specifications.forEach((sp) => {
      if (sp.label && sp.value) fullSpecificationRows.push({ label: sp.label, value: sp.value });
    });
  }
  if (product.schemaBrand) {
    fullSpecificationRows.push({
      label: lang === 'bn' ? 'ব্র্যান্ড (Brand)' : 'Brand',
      value: product.schemaBrand,
    });
  }
  fullSpecificationRows.push({
    label: lang === 'bn' ? 'পণ্য কোড (SKU)' : 'SKU Code',
    value: activeSku,
  });
  fullSpecificationRows.push({
    label: lang === 'bn' ? 'প্যাক সাইজ / ইউনিট' : 'Unit / Pack Size',
    value: selectedVariantLabel || product.unitLabel,
  });
  if (activeWeightGrams > 0) {
    fullSpecificationRows.push({
      label: lang === 'bn' ? 'নেট ওজন (Weight)' : 'Net Weight',
      value: `${activeWeightGrams} গ্রাম (g)`,
    });
  }
  if (product.schemaGtin) {
    fullSpecificationRows.push({
      label: 'GTIN / Barcode',
      value: product.schemaGtin,
    });
  }
  if (product.schemaMpn) {
    fullSpecificationRows.push({
      label: 'MPN Code',
      value: product.schemaMpn,
    });
  }
  fullSpecificationRows.push({
    label: lang === 'bn' ? 'স্টক স্ট্যাটাস' : 'Availability',
    value:
      activeStock > 0
        ? lang === 'bn'
          ? `স্টকে আছে (${activeStock} টি)`
          : `In Stock (${activeStock} units)`
        : lang === 'bn'
        ? 'স্টক আউট'
        : 'Out of Stock',
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0b241c]/75 backdrop-blur-xs flex justify-center overflow-y-auto"
      onClick={handleCloseModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="seo-product-h1"
    >
      {/* Semantic Single Product Page Container with Schema.org Product Microdata */}
      <article
        ref={containerScrollRef}
        itemScope
        itemType="https://schema.org/Product"
        className="relative w-full max-w-4xl bg-[#f8f6f0] min-h-screen sm:min-h-0 sm:my-4 sm:rounded-3xl shadow-2xl border border-[#e3decb] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden Schema.org Microdata Meta Tags for Search Engine Crawlers */}
        <meta itemProp="productID" content={product.id} />
        <meta itemProp="sku" content={activeSku} />
        {product.schemaMpn && <meta itemProp="mpn" content={product.schemaMpn} />}
        {product.schemaGtin && <meta itemProp="gtin" content={product.schemaGtin} />}
        <meta itemProp="category" content={categoryLabel} />
        <div itemProp="brand" itemScope itemType="https://schema.org/Brand" className="hidden">
          <meta
            itemProp="name"
            content={product.schemaBrand || siteSettings?.siteName || 'ShopBangla'}
          />
        </div>

        {/* Sticky Top Navigation & SEO Breadcrumb Header */}
        <header className="sticky top-0 z-30 bg-[#123b2e] text-white px-4 sm:px-6 py-3 border-b border-[#c7a15d]/25 shadow-md">
          <div className="flex items-center justify-between gap-2">
            {/* Back Button + Semantic BreadcrumbList */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer shrink-0"
                aria-label={lang === 'bn' ? 'ফিরে যান' : 'Go Back'}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <nav
                aria-label="Breadcrumb"
                className="min-w-0 overflow-hidden"
              >
                <ol
                  itemScope
                  itemType="https://schema.org/BreadcrumbList"
                  className="flex items-center gap-1 text-[11px] sm:text-xs text-[#dce9df] truncate"
                >
                  <li
                    itemProp="itemListElement"
                    itemScope
                    itemType="https://schema.org/ListItem"
                    className="inline-flex items-center shrink-0"
                  >
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      itemProp="item"
                      className="hover:text-[#c7a15d] transition cursor-pointer font-medium"
                    >
                      <span itemProp="name">
                        {lang === 'bn' ? 'হোম' : 'Home'}
                      </span>
                    </button>
                    <meta itemProp="position" content="1" />
                  </li>

                  <ChevronRight className="w-3 h-3 text-[#c7a15d]/80 shrink-0" />

                  <li
                    itemProp="itemListElement"
                    itemScope
                    itemType="https://schema.org/ListItem"
                    className="inline-flex items-center shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateCategory) {
                          onNavigateCategory(product.category);
                          handleCloseModal();
                        }
                      }}
                      itemProp="item"
                      className="hover:text-[#c7a15d] transition cursor-pointer font-semibold text-[#f3d999]"
                    >
                      <span itemProp="name">{categoryLabel}</span>
                    </button>
                    <meta itemProp="position" content="2" />
                  </li>

                  <ChevronRight className="w-3 h-3 text-[#c7a15d]/80 shrink-0" />

                  <li
                    itemProp="itemListElement"
                    itemScope
                    itemType="https://schema.org/ListItem"
                    className="truncate text-white font-semibold"
                    aria-current="page"
                  >
                    <span itemProp="name">
                      {lang === 'bn' ? product.nameBn : product.nameEn}
                    </span>
                    <meta itemProp="position" content="3" />
                  </li>
                </ol>
              </nav>
            </div>

            {/* Right Actions: Yoast SEO Score Pill, Share, Wishlist, Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => scrollToSection('seo', 'product-seo-inspector')}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-[#c7a15d]/40 text-[11px] font-bold text-[#f3d999] transition cursor-pointer"
                title="View Live Yoast SEO & Schema.org Score"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    yoastSeoAnalysis.overallStatus === 'good'
                      ? 'bg-emerald-400'
                      : yoastSeoAnalysis.overallStatus === 'ok'
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                />
                <span>SEO {yoastSeoAnalysis.overallScore}%</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCanonical}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
                title={lang === 'bn' ? 'পণ্যের লিংক কপি করুন' : 'Copy Product Link'}
              >
                {copiedUrl ? (
                  <Check className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>

              {onToggleWishlist && (
                <button
                  type="button"
                  onClick={(e) => onToggleWishlist(product.id, e)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                    isWishlisted
                      ? 'bg-rose-500 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  aria-label="Toggle Wishlist"
                >
                  <Heart
                    className={`w-4 h-4 ${isWishlisted ? 'fill-white' : ''}`}
                  />
                </button>
              )}

              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-rose-500/80 flex items-center justify-center text-white transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-7 pb-28">
          {/* HERO PRODUCT GRID: Left Interactive Gallery + Right Purchase & Schema Offer Module */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* LEFT COLUMN: SEO Image Gallery & Video Media */}
            <div className="lg:col-span-6 space-y-3 lg:sticky lg:top-4">
              <figure className="relative aspect-square sm:aspect-4/3 w-full rounded-2xl overflow-hidden bg-white border border-[#e2dccb] shadow-sm group">
                {showVideoPlayer && product.videoUrl ? (
                  youtubeEmbedUrl ? (
                    <iframe
                      src={youtubeEmbedUrl}
                      title={product.nameBn}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={product.videoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-contain bg-black"
                    />
                  )
                ) : (
                  <>
                    <link itemProp="image" href={currentGalleryItem.url} />
                    <ProductImage
                      src={currentGalleryItem.url}
                      alt={currentGalleryItem.altText}
                      category={product.category}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </>
                )}

                {/* Top Badges: Discount, Cornerstone, Custom Badge */}
                {!showVideoPlayer && (
                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                    {discountPercent > 0 && (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-mono text-xs font-extrabold shadow-sm">
                        -{discountPercent}% ছাড়
                      </span>
                    )}
                    {product.badgeLabel && (
                      <span className="px-2.5 py-1 rounded-lg bg-[#123b2e] text-[#f3d999] text-[11px] font-bold shadow-sm border border-[#c7a15d]/40">
                        {product.badgeLabel}
                      </span>
                    )}
                    {product.freeDelivery && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-bold shadow-sm inline-flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        {lang === 'bn' ? 'ফ্রি ডেলিভারি' : 'Free Delivery'}
                      </span>
                    )}
                  </div>
                )}

                {/* Lightbox Zoom Button */}
                {!showVideoPlayer && (
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/65 hover:bg-slate-900 text-white flex items-center justify-center transition cursor-pointer"
                    title={lang === 'bn' ? 'ছবি বড় করে দেখুন' : 'Zoom Image'}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}

                {/* Prev / Next Gallery Arrows */}
                {!showVideoPlayer && galleryList.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImageIdx((prev) =>
                          prev === 0 ? galleryList.length - 1 : prev - 1
                        )
                      }
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#123b2e] shadow-md flex items-center justify-center cursor-pointer"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImageIdx((prev) =>
                          prev === galleryList.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#123b2e] shadow-md flex items-center justify-center cursor-pointer"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Image Counter & Alt Text Indicator */}
                {!showVideoPlayer && (
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-950/70 text-white text-[10px] font-medium truncate max-w-[75%]">
                      ALT: {currentGalleryItem.altText}
                    </span>
                    {galleryList.length > 1 && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-950/75 text-white font-mono text-[11px] font-bold shrink-0">
                        {selectedImageIdx + 1}/{galleryList.length}
                      </span>
                    )}
                  </div>
                )}
              </figure>

              {/* Semantic Image Caption */}
              {currentGalleryItem.caption && !showVideoPlayer && (
                <figcaption className="text-xs text-slate-600 bg-white px-3.5 py-2 rounded-xl border border-[#e5dfd0] flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#c7a15d] shrink-0" />
                  <span>{currentGalleryItem.caption}</span>
                </figcaption>
              )}

              {/* Thumbnails Strip + Video Toggle */}
              {(galleryList.length > 1 || product.videoUrl) && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {galleryList.map((imgItem, idx) => (
                    <button
                      key={imgItem.id || idx}
                      type="button"
                      onClick={() => {
                        setSelectedImageIdx(idx);
                        setShowVideoPlayer(false);
                      }}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 bg-white ${
                        !showVideoPlayer && selectedImageIdx === idx
                          ? 'border-[#123b2e] ring-2 ring-[#c7a15d]/60 scale-105'
                          : 'border-[#e2dccb] opacity-75 hover:opacity-100'
                      }`}
                      title={imgItem.altText}
                    >
                      <ProductImage
                        src={imgItem.url}
                        alt={imgItem.altText}
                        category={product.category}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}

                  {product.videoUrl && (
                    <button
                      type="button"
                      onClick={() => setShowVideoPlayer(true)}
                      className={`h-16 px-3.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                        showVideoPlayer
                          ? 'border-[#123b2e] bg-[#123b2e] text-[#f3d999]'
                          : 'border-[#e2dccb] bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      <PlayCircle className="w-4 h-4 text-[#c7a15d]" />
                      <span>{lang === 'bn' ? 'ভিডিও দেখুন' : 'Watch Video'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: H1 Title, Schema Offer, Variants, Wholesale Tiers & Purchase Controls */}
            <div className="lg:col-span-6 space-y-5">
              {/* Top Metadata Strip: Category, Brand, SKU & Stock Badge */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-[#123b2e]/10 text-[#123b2e] font-bold">
                    {categoryLabel}
                  </span>
                  {product.schemaBrand && (
                    <span className="px-2.5 py-1 rounded-full bg-white border border-[#e2dccb] text-slate-700 font-semibold">
                      {product.schemaBrand}
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-slate-500 inline-flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5 text-slate-400" />
                    {activeSku}
                  </span>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                    activeStock > 0
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      activeStock > 0 ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  />
                  {activeStock > 0
                    ? lang === 'bn'
                      ? `স্টকে আছে (${activeStock} টি)`
                      : `In Stock (${activeStock})`
                    : lang === 'bn'
                    ? 'স্টক আউট'
                    : 'Out of Stock'}
                </span>
              </div>

              {/* PRIMARY SEO H1 HEADING */}
              <div>
                <h1
                  id="seo-product-h1"
                  itemProp="name"
                  className="text-xl sm:text-2xl md:text-[26px] font-extrabold text-[#123b2e] leading-snug tracking-tight"
                >
                  {lang === 'bn' ? product.nameBn : product.nameEn}
                </h1>
                {product.nameEn && lang === 'bn' && (
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {product.nameEn}
                  </p>
                )}
              </div>

              {/* Live AggregateRating Microdata Strip */}
              <div
                itemProp="aggregateRating"
                itemScope
                itemType="https://schema.org/AggregateRating"
                className="flex items-center gap-3 flex-wrap text-xs"
              >
                <meta itemProp="ratingValue" content={String(avgRatingNumber)} />
                <meta
                  itemProp="reviewCount"
                  content={String(Math.max(1, totalReviewCount))}
                />
                <meta itemProp="bestRating" content="5" />
                <meta itemProp="worstRating" content="1" />

                <button
                  type="button"
                  onClick={() => scrollToSection('reviews', 'product-reviews-section')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 font-bold cursor-pointer hover:bg-amber-100 transition"
                >
                  <div className="flex items-center text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < Math.round(avgRatingNumber)
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span>{avgRatingNumber}</span>
                  <span className="text-slate-600 font-medium">
                    ({totalReviewCount} {lang === 'bn' ? 'টি রিভিউ' : 'Reviews'})
                  </span>
                </button>

                {activeWeightGrams > 0 && (
                  <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                    <Weight className="w-3.5 h-3.5 text-[#123b2e]" />
                    {activeWeightGrams}g
                  </span>
                )}

                {product.unitLabel && (
                  <span className="text-slate-600 font-semibold">
                    • {selectedVariantLabel || product.unitLabel}
                  </span>
                )}
              </div>

              {/* Short Summary Callout (If present) */}
              {product.shortSummaryBn && (
                <p className="text-xs sm:text-sm font-medium text-slate-700 bg-white border-l-4 border-[#c7a15d] px-3.5 py-2.5 rounded-r-xl shadow-2xs leading-relaxed">
                  {product.shortSummaryBn}
                </p>
              )}

              {/* SCHEMA.ORG OFFER PRICING CARD */}
              <div
                itemProp="offers"
                itemScope
                itemType="https://schema.org/Offer"
                className="p-4 rounded-2xl bg-white border border-[#e2dccb] shadow-2xs space-y-2"
              >
                <meta itemProp="priceCurrency" content="BDT" />
                <meta itemProp="price" content={String(effectiveUnitPrice)} />
                <link itemProp="url" href={canonicalUrl} />
                <link
                  itemProp="availability"
                  href={
                    activeStock > 0
                      ? 'https://schema.org/InStock'
                      : 'https://schema.org/OutOfStock'
                  }
                />
                <link
                  itemProp="itemCondition"
                  href={`https://schema.org/${product.schemaCondition || 'NewCondition'}`}
                />

                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#123b2e] font-mono tabular-nums">
                      ৳{effectiveUnitPrice.toLocaleString('en-BD')}
                    </span>
                    {baseRegularPrice > effectiveUnitPrice && (
                      <>
                        <del className="text-base text-slate-400 font-mono tabular-nums">
                          ৳{baseRegularPrice.toLocaleString('en-BD')}
                        </del>
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-bold">
                          সাশ্রয় ৳{(baseRegularPrice - effectiveUnitPrice).toLocaleString('en-BD')}
                        </span>
                      </>
                    )}
                  </div>

                  <span className="text-[11px] font-semibold text-slate-500">
                    /{selectedVariantLabel || product.unitLabel}
                  </span>
                </div>

                {activeWholesaleTier && (
                  <div className="pt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      পাইকারি বাল্ক ছাড় -{activeWholesaleTier.discountPercent}% স্বয়ংক্রিয়ভাবে যুক্ত হয়েছে!
                    </span>
                  </div>
                )}
              </div>

              {/* ADVANCED MULTI-ATTRIBUTE VARIANT SELECTOR */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#123b2e] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#c7a15d]" />
                    <span>
                      {lang === 'bn'
                        ? 'ভ্যারিয়েন্ট / প্যাক সাইজ নির্বাচন করুন:'
                        : 'Select Variant / Pack Size:'}
                    </span>
                  </label>
                  <span className="text-xs font-bold text-[#123b2e] bg-[#c7a15d]/20 px-2.5 py-0.5 rounded-full">
                    {selectedVariantLabel}
                  </span>
                </div>

                {hasStructuredVariants ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {product.variants!.map((v) => {
                      const isSelected =
                        (selectedVariantObj && selectedVariantObj.id === v.id) ||
                        selectedVariantLabel === v.label;
                      const vEffective =
                        v.salePrice > 0 && v.salePrice < v.regularPrice
                          ? v.salePrice
                          : v.regularPrice;
                      const vDiscount =
                        v.regularPrice > vEffective
                          ? Math.round(
                              ((v.regularPrice - vEffective) / v.regularPrice) * 100
                            )
                          : 0;
                      return (
                        <button
                          key={v.id || v.label}
                          type="button"
                          onClick={() => handleSelectStructuredVariant(v)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                            isSelected
                              ? 'border-[#123b2e] bg-[#123b2e]/5 ring-2 ring-[#123b2e]'
                              : 'border-[#e2dccb] bg-white hover:border-[#123b2e]/50'
                          }`}
                        >
                          {v.imageUrl && (
                            <img
                              src={v.imageUrl}
                              alt={`${product.nameBn} - ${v.label}`}
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {v.label}
                              </span>
                              <span className="text-xs font-mono font-extrabold text-[#123b2e] shrink-0">
                                ৳{vEffective.toLocaleString('en-BD')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                              <span>{v.attrType}</span>
                              {vDiscount > 0 ? (
                                <span className="text-rose-600 font-bold">
                                  -{vDiscount}% (৳{v.regularPrice})
                                </span>
                              ) : (
                                <span>
                                  {v.stock > 0 ? `স্টক: ${v.stock}` : 'স্টক আউট'}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {fallbackVariants.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSelectedVariantLabel(v)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          selectedVariantLabel === v
                            ? 'bg-[#123b2e] text-white border-[#123b2e] shadow-xs'
                            : 'bg-white text-slate-700 border-[#e2dccb] hover:border-[#123b2e]'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* WHOLESALE / BULK TIERED PRICING SELECTOR */}
              {sortedWholesaleTiers.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300/80 space-y-2">
                  <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-700" />
                    <span>
                      {lang === 'bn'
                        ? 'পাইকারি ও বাল্ক ডিসকাউন্ট অফার (ক্লিক করে পরিমাণ নিন):'
                        : 'Bulk / Wholesale Savings Tiers:'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {sortedWholesaleTiers.map((tier, idx) => {
                      const isTierActive = activeWholesaleTier?.minQty === tier.minQty;
                      const tierUnitPrice = Math.max(
                        1,
                        Math.round(baseSalePrice * (1 - tier.discountPercent / 100))
                      );
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setQuantity(tier.minQty)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isTierActive
                              ? 'border-[#123b2e] bg-emerald-50 ring-1 ring-[#123b2e]'
                              : 'border-amber-200 bg-white hover:border-amber-400'
                          }`}
                        >
                          <div className="text-[11px] font-bold text-slate-900">
                            {tier.minQty}+ টি নিলে (-{tier.discountPercent}%)
                          </div>
                          <div className="text-xs font-mono font-extrabold text-[#123b2e]">
                            ৳{tierUnitPrice.toLocaleString('en-BD')}/পিস
                          </div>
                          {tier.labelBn && (
                            <div className="text-[10px] text-slate-500 truncate">
                              {tier.labelBn}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* QUANTITY & PRIMARY CONVERSION BUTTONS */}
              <div className="p-4 rounded-2xl bg-white border border-[#e2dccb] space-y-3.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700">
                      {lang === 'bn' ? 'পরিমাণ:' : 'Quantity:'}
                    </span>
                    <div className="inline-flex items-center border border-[#d8d0bc] rounded-xl bg-[#f8f6f0]">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-9 h-9 flex items-center justify-center text-[#123b2e] hover:bg-[#e9e4d5] rounded-l-xl cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-11 text-center font-mono font-extrabold text-sm tabular-nums text-[#123b2e]">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((q) => Math.min(activeStock || 99, q + 1))
                        }
                        className="w-9 h-9 flex items-center justify-center text-[#123b2e] hover:bg-[#e9e4d5] rounded-r-xl cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">
                      {lang === 'bn' ? 'সর্বমোট মূল্য' : 'Total Payable'}
                    </span>
                    <span className="text-lg font-mono font-extrabold text-[#123b2e]">
                      ৳{(effectiveUnitPrice * quantity).toLocaleString('en-BD')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={activeStock <= 0}
                    onClick={() => triggerCartAction(true)}
                    className="py-3.5 px-5 rounded-xl bg-[#123b2e] hover:bg-[#1b4b3b] disabled:opacity-50 text-[#f3d999] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>
                      {lang === 'bn'
                        ? `এখনই অর্ডার করুন · ৳${(
                            effectiveUnitPrice * quantity
                          ).toLocaleString('en-BD')}`
                        : `Order Now · ৳${(
                            effectiveUnitPrice * quantity
                          ).toLocaleString('en-BD')}`}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={activeStock <= 0}
                    onClick={() => triggerCartAction(false)}
                    className="py-3.5 px-5 rounded-xl border-2 border-[#123b2e] hover:bg-[#123b2e] text-[#123b2e] hover:text-white disabled:opacity-50 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <span>
                      {lang === 'bn' ? '+ কার্টে যোগ করুন' : '+ Add to Cart'}
                    </span>
                  </button>
                </div>
              </div>

              {/* DYNAMIC PRODUCT-SPECIFIC DELIVERY / WARRANTY / RETURN TAGS (Only if configured on this product) */}
              {(product.freeDelivery || product.warrantyText || product.returnPolicyText) && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 space-y-2 text-xs text-slate-700">
                  {product.freeDelivery && (
                    <div className="flex items-center gap-2 font-bold text-[#123b2e]">
                      <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        {lang === 'bn'
                          ? 'এই পণ্যটিতে ফ্রি ডেলিভারি সুবিধা প্রযোজ্য'
                          : 'Free Delivery applicable on this product'}
                      </span>
                    </div>
                  )}
                  {product.warrantyText && (
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{product.warrantyText}</span>
                    </div>
                  )}
                  {product.returnPolicyText && (
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                      <RefreshCw className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{product.returnPolicyText}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* STRUCTURED SEO SECTION JUMP NAV BAR */}
          <nav
            aria-label="Product Information Sections"
            className="flex items-center gap-2 overflow-x-auto py-2 px-3 rounded-2xl bg-white border border-[#e2dccb] shadow-2xs"
          >
            <button
              type="button"
              onClick={() => scrollToSection('overview', 'product-overview-section')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                activeSectionTab === 'overview'
                  ? 'bg-[#123b2e] text-[#f3d999]'
                  : 'text-slate-700 hover:bg-[#f8f6f0]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'বিস্তারিত বিবরণ' : 'Description'}</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('specs', 'product-specs-section')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                activeSectionTab === 'specs'
                  ? 'bg-[#123b2e] text-[#f3d999]'
                  : 'text-slate-700 hover:bg-[#f8f6f0]'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>
                {lang === 'bn'
                  ? `স্পেসিফিকেশন (${fullSpecificationRows.length})`
                  : `Specifications (${fullSpecificationRows.length})`}
              </span>
            </button>

            {Array.isArray(product.faqs) && product.faqs.length > 0 && (
              <button
                type="button"
                onClick={() => scrollToSection('faq', 'product-faq-section')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                  activeSectionTab === 'faq'
                    ? 'bg-[#123b2e] text-[#f3d999]'
                    : 'text-slate-700 hover:bg-[#f8f6f0]'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>
                  {lang === 'bn'
                    ? `প্রশ্নোত্তর FAQ (${product.faqs.length})`
                    : `FAQs (${product.faqs.length})`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => scrollToSection('reviews', 'product-reviews-section')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                activeSectionTab === 'reviews'
                  ? 'bg-[#123b2e] text-[#f3d999]'
                  : 'text-slate-700 hover:bg-[#f8f6f0]'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>
                {lang === 'bn'
                  ? `ক্রেতা রিভিউ (${productReviews.length})`
                  : `Reviews (${productReviews.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('seo', 'product-seo-inspector')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ml-auto ${
                activeSectionTab === 'seo' || showSeoInspector
                  ? 'bg-emerald-800 text-white'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>
                {lang === 'bn'
                  ? `এসইও ও স্কিমা (${yoastSeoAnalysis.overallScore}%)`
                  : `SEO & Schema (${yoastSeoAnalysis.overallScore}%)`}
              </span>
            </button>
          </nav>

          {/* SECTION 1: SEMANTIC H2 PRODUCT DESCRIPTION & KEY HIGHLIGHTS */}
          <section
            id="product-overview-section"
            className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e2dccb] space-y-5"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#ece7d8] pb-3">
              <h2 className="text-base sm:text-lg font-extrabold text-[#123b2e] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#c7a15d]" />
                <span>
                  {lang === 'bn'
                    ? `${product.nameBn} — বিস্তারিত বিবরণ`
                    : `${product.nameEn} — Detailed Description`}
                </span>
              </h2>
              {product.focusKeyphrase && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f8f6f0] border border-[#e2dccb] text-[11px] font-semibold text-slate-600">
                  <Search className="w-3 h-3 text-[#123b2e]" />
                  {product.focusKeyphrase}
                </span>
              )}
            </div>

            {/* Key Highlights Bullet List */}
            {Array.isArray(product.highlights) && product.highlights.length > 0 && (
              <div className="p-4 rounded-xl bg-[#f8f6f0] border border-[#e2dccb] space-y-2.5">
                <h3 className="text-xs sm:text-sm font-bold text-[#123b2e] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#c7a15d]" />
                  <span>
                    {lang === 'bn'
                      ? 'মূল বৈশিষ্ট্য ও বিশেষত্ব (Key Highlights):'
                      : 'Key Product Highlights:'}
                  </span>
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.highlights.map((point, idx) => (
                    <li
                      key={idx}
                      className="text-xs sm:text-sm text-slate-800 flex items-start gap-2 leading-relaxed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Main Rich Copy with itemProp="description" */}
            <div
              itemProp="description"
              className="text-sm text-slate-700 leading-relaxed whitespace-pre-line space-y-3"
            >
              {lang === 'bn' ? product.descriptionBn : product.descriptionEn}
            </div>

            {/* SEO Internal & Outbound Reference Links (if configured on product) */}
            {(product.internalLinksUrl || product.outboundLinkUrl || product.relatedKeyphrases) && (
              <div className="pt-3 border-t border-[#ece7d8] flex flex-wrap items-center justify-between gap-3 text-xs">
                {product.relatedKeyphrases && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-600">
                      {lang === 'bn' ? 'সংশ্লিষ্ট ট্যাগ:' : 'Related Tags:'}
                    </span>
                    {product.relatedKeyphrases
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-full bg-[#f8f6f0] border border-[#e2dccb] text-slate-700 font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {product.internalLinksUrl && (
                    <a
                      href={product.internalLinksUrl}
                      className="inline-flex items-center gap-1 font-bold text-[#123b2e] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'সংশ্লিষ্ট গাইড' : 'Related Guide'}</span>
                    </a>
                  )}
                  {product.outboundLinkUrl && (
                    <a
                      href={product.outboundLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'রেফারেন্স তথ্যসূত্র' : 'Reference Source'}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2: SEMANTIC H2 SPECIFICATIONS TABLE & FAQ ACCORDION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Technical Specifications Table */}
            <section
              id="product-specs-section"
              className={`p-5 sm:p-6 rounded-2xl bg-white border border-[#e2dccb] space-y-4 ${
                Array.isArray(product.faqs) && product.faqs.length > 0
                  ? 'lg:col-span-6'
                  : 'lg:col-span-12'
              }`}
            >
              <h2 className="text-base font-extrabold text-[#123b2e] flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-[#c7a15d]" />
                <span>
                  {lang === 'bn'
                    ? 'পণ্যের স্পেসিফিকেশন ও তথ্য'
                    : 'Technical Specifications'}
                </span>
              </h2>

              <div className="border border-[#e2dccb] rounded-xl overflow-hidden">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <tbody className="divide-y divide-[#ece7d8]">
                    {fullSpecificationRows.map((spec, idx) => (
                      <tr
                        key={idx}
                        itemProp="additionalProperty"
                        itemScope
                        itemType="https://schema.org/PropertyValue"
                        className={idx % 2 === 0 ? 'bg-[#f8f6f0]/70' : 'bg-white'}
                      >
                        <th
                          scope="row"
                          itemProp="name"
                          className="w-2/5 px-3.5 py-2.5 text-left font-semibold text-slate-600 border-r border-[#ece7d8]"
                        >
                          {spec.label}
                        </th>
                        <td
                          itemProp="value"
                          className="w-3/5 px-3.5 py-2.5 font-bold text-slate-900"
                        >
                          {spec.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Product FAQs Accordion with Schema.org Question/Answer Microdata */}
            {Array.isArray(product.faqs) && product.faqs.length > 0 && (
              <section
                id="product-faq-section"
                className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-white border border-[#e2dccb] space-y-4"
              >
                <h2 className="text-base font-extrabold text-[#123b2e] flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-[#c7a15d]" />
                  <span>
                    {lang === 'bn'
                      ? 'সচরাচর জিজ্ঞাসিত প্রশ্ন (Product FAQ)'
                      : 'Frequently Asked Questions'}
                  </span>
                </h2>

                <div className="space-y-2.5">
                  {product.faqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div
                        key={idx}
                        itemScope
                        itemType="https://schema.org/Question"
                        className="border border-[#e2dccb] rounded-xl overflow-hidden bg-[#f8f6f0]/50"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full px-4 py-3 text-left text-xs sm:text-sm font-bold text-[#123b2e] flex items-center justify-between gap-2 hover:bg-[#f8f6f0] cursor-pointer"
                          aria-expanded={isOpen}
                        >
                          <span itemProp="name">{faq.question}</span>
                          <ChevronDown
                            className={`w-4 h-4 text-[#123b2e] transition-transform shrink-0 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        <div
                          itemProp="acceptedAnswer"
                          itemScope
                          itemType="https://schema.org/Answer"
                          className={
                            isOpen
                              ? 'px-4 pb-3.5 pt-1 text-xs sm:text-sm text-slate-700 leading-relaxed border-t border-[#ece7d8] bg-white'
                              : 'hidden'
                          }
                        >
                          <div itemProp="text">{faq.answer}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* SECTION 3: UPSELL / RELATED PRODUCTS WITH INTERNAL SEO LINKS */}
          {upsellProducts.length > 0 && (
            <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e2dccb] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[#123b2e] flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-[#c7a15d]" />
                  <span>
                    {lang === 'bn'
                      ? 'সংশ্লিষ্ট ও একসাথে কেনার মতো পণ্য'
                      : 'Frequently Bought Together & Related Products'}
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {upsellProducts.map((upItem) => {
                  const upPrice =
                    upItem.salePrice < upItem.price
                      ? upItem.salePrice
                      : upItem.price;
                  const upSlug = generateSeoSlug(
                    upItem.slug || upItem.nameEn || upItem.nameBn,
                    upItem.id
                  );
                  return (
                    <div
                      key={upItem.id}
                      className="p-3 rounded-xl border border-[#e2dccb] bg-[#f8f6f0]/60 hover:border-[#123b2e] transition flex flex-col justify-between gap-2.5"
                    >
                      <a
                        href={`?product=${encodeURIComponent(upSlug)}`}
                        onClick={(e) => {
                          e.preventDefault();
                          if (onSelectProduct) onSelectProduct(upItem);
                        }}
                        className="flex items-center gap-3 min-w-0 cursor-pointer"
                      >
                        <img
                          src={upItem.imageUrl}
                          alt={upItem.imageAltText || upItem.nameBn}
                          loading="lazy"
                          className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                            {lang === 'bn' ? upItem.nameBn : upItem.nameEn}
                          </div>
                          <div className="text-xs font-mono font-extrabold text-[#123b2e] mt-1">
                            ৳{upPrice.toLocaleString('en-BD')}
                          </div>
                        </div>
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          onAddToCart(upItem, 1, upItem.unitLabel, false)
                        }
                        className="w-full py-1.5 px-3 rounded-lg bg-[#123b2e] hover:bg-[#1b4b3b] text-[#f3d999] text-[11px] font-bold cursor-pointer transition"
                      >
                        {lang === 'bn' ? '+ কার্টে যোগ করুন' : '+ Add to Cart'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* SECTION 4: VERIFIED CUSTOMER REVIEWS & RATING DISTRIBUTION */}
          <section
            id="product-reviews-section"
            className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e2dccb] space-y-6"
          >
            <h2 className="text-base sm:text-lg font-extrabold text-[#123b2e] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#c7a15d]" />
              <span>
                {lang === 'bn'
                  ? `ক্রেতাদের যাচাইকৃত রিভিউ ও রেটিং (${productReviews.length})`
                  : `Verified Customer Reviews (${productReviews.length})`}
              </span>
            </h2>

            {/* Rating Summary + Submit Form + Reviews List */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Rating Distribution Breakdown & Review List */}
              <div className="lg:col-span-7 space-y-5">
                {/* Summary Box */}
                <div className="p-4 rounded-xl bg-[#f8f6f0] border border-[#e2dccb] grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-4 text-center sm:border-r border-[#e2dccb] sm:pr-4">
                    <div className="text-3xl font-extrabold text-[#123b2e] font-mono">
                      {avgRatingNumber}
                    </div>
                    <div className="flex items-center justify-center gap-0.5 text-amber-500 my-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.round(avgRatingNumber)
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-[11px] text-slate-600 font-semibold">
                      {totalReviewCount}{' '}
                      {lang === 'bn' ? 'টি যাচাইকৃত রেটিং' : 'Verified Ratings'}
                    </div>
                  </div>

                  <div className="sm:col-span-8 space-y-1.5">
                    {ratingBreakdown.map((row) => (
                      <div
                        key={row.star}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="w-9 font-bold text-slate-700 shrink-0">
                          {row.star} ★
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${row.pct}%` }}
                          />
                        </div>
                        <span className="w-9 text-right font-mono text-[11px] text-slate-500 shrink-0">
                          {row.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review Items with Schema.org Review Microdata */}
                {productReviews.length === 0 ? (
                  <div className="p-5 rounded-xl border border-dashed border-[#d8d0bc] text-center text-xs text-slate-500">
                    {lang === 'bn'
                      ? 'এই পণ্যে এখনো কোনো লিখিত রিভিউ নেই। ডানপাশের ফর্ম থেকে প্রথম রিভিউটি আপনিই দিন!'
                      : 'No written reviews yet for this product. Be the first to review!'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productReviews.map((rev) => (
                      <div
                        key={rev.id}
                        itemProp="review"
                        itemScope
                        itemType="https://schema.org/Review"
                        className="p-4 rounded-xl bg-[#f8f6f0]/70 border border-[#e2dccb] space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div
                            itemProp="author"
                            itemScope
                            itemType="https://schema.org/Person"
                            className="font-bold text-[#123b2e] flex items-center gap-1.5"
                          >
                            <span itemProp="name">{rev.customerName}</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                              ✓ Verified
                            </span>
                          </div>
                          <div
                            itemProp="reviewRating"
                            itemScope
                            itemType="https://schema.org/Rating"
                            className="flex items-center gap-0.5 text-amber-500"
                          >
                            <meta
                              itemProp="ratingValue"
                              content={String(rev.rating)}
                            />
                            <meta itemProp="bestRating" content="5" />
                            {Array.from({ length: rev.rating }).map((_, idx) => (
                              <Star
                                key={idx}
                                className="w-3.5 h-3.5 fill-amber-400 text-amber-500"
                              />
                            ))}
                          </div>
                        </div>
                        <p
                          itemProp="reviewBody"
                          className="text-slate-700 leading-relaxed"
                        >
                          {rev.comment}
                        </p>
                        {rev.adminReply && (
                          <div className="mt-2 pt-2 border-t border-[#e2dccb] text-[11px] text-[#123b2e] font-medium">
                            <strong>
                              {siteSettings?.siteName || 'Store'} Reply:
                            </strong>{' '}
                            {rev.adminReply}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Submit Customer Review Form */}
              <form
                onSubmit={handleReviewSubmit}
                className="lg:col-span-5 p-5 rounded-xl bg-[#f8f6f0] border border-[#e2dccb] space-y-3.5"
              >
                <h3 className="text-sm font-bold text-[#123b2e] flex items-center gap-2">
                  <MessageSquarePlus className="w-4 h-4 text-[#c7a15d]" />
                  <span>
                    {lang === 'bn' ? 'আপনার রিভিউ লিখুন' : 'Write a Customer Review'}
                  </span>
                </h3>

                {reviewSubmittedMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{reviewSubmittedMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'bn' ? 'আপনার নাম *' : 'Your Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder={
                      lang === 'bn' ? 'যেমন: তানভীর আহমেদ' : 'e.g. Tanvir Ahmed'
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-[#d8d0bc] rounded-lg focus:outline-none focus:border-[#123b2e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'bn' ? 'রেটিং নির্বাচন করুন' : 'Select Rating'}
                  </label>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#d8d0bc] rounded-lg focus:outline-none focus:border-[#123b2e]"
                  >
                    <option value={5}>★★★★★ (5/5 — অসাধারণ)</option>
                    <option value={4}>★★★★☆ (4/5 — খুব ভালো)</option>
                    <option value={3}>★★★☆☆ (3/5 — ভালো)</option>
                    <option value={2}>★★☆☆☆ (2/5 — মোটামুটি)</option>
                    <option value={1}>★☆☆☆☆ (1/5 — মানসম্মত নয়)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'bn' ? 'আপনার মতামত *' : 'Your Review *'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={
                      lang === 'bn'
                        ? 'পণ্যটির মান ও অভিজ্ঞতা কেমন লেগেছে লিখুন...'
                        : 'Share your experience with this product...'
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-[#d8d0bc] rounded-lg focus:outline-none focus:border-[#123b2e]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#123b2e] hover:bg-[#1b4b3b] text-[#f3d999] text-xs font-bold cursor-pointer transition"
                >
                  {isSubmittingReview
                    ? lang === 'bn'
                      ? 'জমা হচ্ছে...'
                      : 'Submitting...'
                    : lang === 'bn'
                    ? 'রিভিউ জমা দিন'
                    : 'Submit Review'}
                </button>
              </form>
            </div>
          </section>

          {/* SECTION 5: 100% YOAST SEO & GOOGLE RICH RESULT LIVE INSPECTOR */}
          <section
            id="product-seo-inspector"
            className="rounded-2xl bg-white border border-[#e2dccb] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setShowSeoInspector((prev) => !prev)}
              className="w-full px-5 py-4 bg-gradient-to-r from-[#123b2e] to-[#1b4b3b] text-white flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 text-left">
                <Globe className="w-5 h-5 text-[#c7a15d] shrink-0" />
                <div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#f3d999] flex items-center gap-2 flex-wrap">
                    <span>
                      {lang === 'bn'
                        ? '১০০% Yoast SEO, Google Rich Snippet ও Schema.org স্ট্যাটাস'
                        : '100% Yoast SEO, Google Rich Snippet & Schema.org Status'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px]">
                      SEO Score: {yoastSeoAnalysis.overallScore}/100
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[11px]">
                      Readability: {yoastReadability.readabilityScore}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-[#dce9df] mt-0.5">
                    {lang === 'bn'
                      ? 'গুগল সার্চ স্নিপেট, ক্যানোনিকাল ইউআরএল, ওপেনগ্রাফ এবং JSON-LD প্রোডাক্ট স্কিমা লাইভ ভেরিফিকেশন'
                      : 'Live verification of Google SERP snippet, Canonical URL, OpenGraph & JSON-LD Product Schema'}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-[#f3d999] transition-transform shrink-0 ${
                  showSeoInspector ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showSeoInspector && (
              <div className="p-5 sm:p-6 space-y-5 bg-[#f8f6f0]/60">
                {/* Canonical URL Bar */}
                <div className="p-3.5 rounded-xl bg-white border border-[#e2dccb] flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Canonical SEO Permalink URL
                    </span>
                    <code className="text-xs font-mono text-[#123b2e] font-bold break-all">
                      {canonicalUrl}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCanonical}
                    className="px-3 py-1.5 rounded-lg bg-[#123b2e] text-[#f3d999] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>কপি হয়েছে</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>URL কপি করুন</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live Google Search Rich Result Snippet Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-6 p-4 rounded-xl bg-white border border-[#e2dccb] space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Google Mobile Rich Result Preview</span>
                      <span className="text-emerald-700 font-bold">✓ Merchant Listing Ready</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5">
                      <div className="text-[11px] text-slate-600 truncate">
                        {siteSettings?.siteName || 'ShopBangla'} › {categoryLabel} › {seoSlug}
                      </div>
                      <div className="text-sm font-bold text-[#1a0dab] leading-snug line-clamp-2">
                        {yoastSeoAnalysis.resolvedTitle}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-700 flex-wrap">
                        <span className="text-amber-500 font-bold">
                          ★★★★★ {avgRatingNumber}
                        </span>
                        <span>({Math.max(1, totalReviewCount)} reviews)</span>
                        <span>·</span>
                        <span className="font-bold text-slate-900">
                          ৳{effectiveUnitPrice.toLocaleString('en-BD')}
                        </span>
                        <span>·</span>
                        <span className="text-emerald-700 font-semibold">
                          {activeStock > 0 ? 'In stock' : 'Out of stock'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {yoastSeoAnalysis.resolvedDescription}
                      </p>
                    </div>
                  </div>

                  {/* Active SEO Signals Checklist */}
                  <div className="lg:col-span-6 p-4 rounded-xl bg-white border border-[#e2dccb] space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      On-Page Technical SEO Checklist ({yoastSeoAnalysis.checks.filter((c) => c.status === 'good').length}/{yoastSeoAnalysis.checks.length} Passed)
                    </div>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {yoastSeoAnalysis.checks.map((chk) => (
                        <div
                          key={chk.id}
                          className="flex items-start gap-2 text-xs p-1.5 rounded-lg bg-slate-50"
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                              chk.status === 'good'
                                ? 'bg-emerald-500'
                                : chk.status === 'ok'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          <div>
                            <div className="font-bold text-slate-800">{chk.titleBn}</div>
                            <div className="text-[11px] text-slate-600">{chk.detailBn}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Injected JSON-LD Graph Viewer */}
                <details className="rounded-xl bg-slate-900 text-slate-100 border border-slate-800 overflow-hidden">
                  <summary className="px-4 py-2.5 text-xs font-mono font-bold text-emerald-400 cursor-pointer flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <Code2 className="w-4 h-4" />
                      <span>
                        View Live Schema.org JSON-LD (@graph: Product + BreadcrumbList
                        {Array.isArray(product.faqs) && product.faqs.length > 0
                          ? ' + FAQPage'
                          : ''}
                        )
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400">Click to expand</span>
                  </summary>
                  <pre className="p-4 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-60 border-t border-slate-800">
                    {JSON.stringify(liveJsonLd, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </section>
        </div>

        {/* STICKY BOTTOM CONVERSION BAR (Mobile & Desktop) */}
        <footer className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#e2dccb] px-4 sm:px-6 py-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500 truncate">
                {lang === 'bn' ? product.nameBn : product.nameEn} ({selectedVariantLabel})
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-base sm:text-lg font-mono font-extrabold text-[#123b2e]">
                  ৳{(effectiveUnitPrice * quantity).toLocaleString('en-BD')}
                </span>
                {quantity > 1 && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    ({quantity} × ৳{effectiveUnitPrice.toLocaleString('en-BD')})
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={activeStock <= 0}
                onClick={() => triggerCartAction(false)}
                className="px-3.5 py-2.5 rounded-xl border-2 border-[#123b2e] text-[#123b2e] hover:bg-[#123b2e] hover:text-white disabled:opacity-50 text-xs font-bold transition cursor-pointer"
              >
                {lang === 'bn' ? '+ কার্টে যোগ' : '+ Add to Cart'}
              </button>
              <button
                type="button"
                disabled={activeStock <= 0}
                onClick={() => triggerCartAction(true)}
                className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#123b2e] hover:bg-[#1b4b3b] text-[#f3d999] disabled:opacity-50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'এখনই অর্ডার করুন' : 'Order Now'}</span>
              </button>
            </div>
          </div>
        </footer>

        {/* Fullscreen Image Lightbox Modal */}
        {isLightboxOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
              aria-label="Close Zoom"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={currentGalleryItem.url}
              alt={currentGalleryItem.altText}
              className="max-w-full max-h-[82vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="mt-3 text-xs text-white/80 font-medium text-center max-w-lg">
              {currentGalleryItem.altText}
              {currentGalleryItem.caption ? ` — ${currentGalleryItem.caption}` : ''}
            </p>
          </div>
        )}
      </article>
    </div>
  );
};
