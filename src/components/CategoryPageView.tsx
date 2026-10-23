import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  Eye,
  Flame,
  Grid,
  Heart,
  Layers,
  List,
  PackageCheck,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  Truck,
  X,
} from 'lucide-react';
import { CategoryId, Language, Product, ReviewItem } from '../types';
import { ProductImage } from './ProductImage';

interface CategoryPageViewProps {
  products: Product[];
  reviews: ReviewItem[];
  wishlist: string[];
  selectedCategory: CategoryId;
  searchQuery: string;
  lang: Language;
  isLoadingProducts: boolean;
  onSelectCategory: (cat: CategoryId) => void;
  onSearchChange: (q: string) => void;
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (
    product: Product,
    qty?: number,
    variantOverride?: string,
    variantMeta?: {
      variantPrice?: number;
      variantRegularPrice?: number;
      variantSku?: string;
      variantImageUrl?: string;
    }
  ) => void;
  onDirectOrder: (
    product: Product,
    qty?: number,
    variantOverride?: string,
    variantMeta?: {
      variantPrice?: number;
      variantRegularPrice?: number;
      variantSku?: string;
      variantImageUrl?: string;
    }
  ) => void;
  onBackToHome: () => void;
}

type SortOption =
  | 'popular'
  | 'price_asc'
  | 'price_desc'
  | 'discount_desc'
  | 'rating_desc'
  | 'newest';

type PriceBracket = 'all' | 'under_500' | '500_1500' | '1500_3000' | 'over_3000';

interface CategoryDef {
  id: CategoryId;
  groupIds: string[];
  nameBn: string;
  nameEn: string;
  descBn: string;
  descEn: string;
  accentColor: string;
  iconSvg: React.ReactNode;
}

const CATEGORY_DEFINITIONS: CategoryDef[] = [
  {
    id: 'all',
    groupIds: [],
    nameBn: 'সকল ক্যাটাগরি',
    nameEn: 'All Categories',
    descBn: 'ডাটাবেসের সকল ভেরিফায়েড পণ্যের সম্পূর্ণ সংগ্রহ',
    descEn: 'Complete collection of all products from database',
    accentColor: '#123b2e',
    iconSvg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.8]">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'honey',
    groupIds: [
      'honey',
      'ghee_oil',
      'superfoods',
      'nuts_dates',
      'wellness',
      'organic_food',
      'spices',
    ],
    nameBn: 'গ্রোসারি ও অর্গানিক',
    nameEn: 'Grocery & Organic',
    descBn: 'মধু, ঘি, তেল, সুপারফুড, বাদাম-খেজুর ও অর্গানিক ফুড',
    descEn: 'Honey, ghee, oils, superfoods, dates & organic essentials',
    accentColor: '#b45309',
    iconSvg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.8]">
        <path d="M3 10h18l-2 11H5L3 10ZM2 10l2-5h16l2 5M8 5V3h8v2M9 14v3M15 14v3" />
      </svg>
    ),
  },
  {
    id: 'fashion',
    groupIds: ['fashion', 'jewellery'],
    nameBn: 'ফ্যাশন ও জুয়েলারি',
    nameEn: 'Fashion & Style',
    descBn: 'পোশাক, ঘড়ি, ব্যাগ, স্নিকার্স ও লাইফস্টাইল অ্যাক্সেসরিজ',
    descEn: 'Apparel, watches, bags, footwear & fashion accessories',
    accentColor: '#0f766e',
    iconSvg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.8]">
        <path d="M7 4 4 6 2.5 11l4 1.5L8 9v12h8V9l1.5 3.5 4-1.5L20 6l-3-2-3 2h-4L7 4Z" />
      </svg>
    ),
  },
  {
    id: 'electronics',
    groupIds: ['electronics'],
    nameBn: 'ইলেকট্রনিক্স ও গ্যাজেট',
    nameEn: 'Electronics',
    descBn: 'স্মার্টফোন, অডিও, হোম গ্যাজেট ও স্মার্ট ডিভাইস',
    descEn: 'Smartphones, smart gadgets & electronic accessories',
    accentColor: '#1d4ed8',
    iconSvg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.8]">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M10 5h4M11 19h2" />
      </svg>
    ),
  },
  {
    id: 'skincare',
    groupIds: ['skincare'],
    nameBn: 'বিউটি ও স্কিনকেয়ার',
    nameEn: 'Beauty & Care',
    descBn: 'ফেস সিরাম, সুদিং জেল, অর্গানিক সোপ ও বিউটি কেয়ার',
    descEn: 'Serums, soothing gels, organic soaps & personal care',
    accentColor: '#be185d',
    iconSvg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.8]">
        <path d="M9 3h6l1 4-2 2v11H10V9L8 7l1-4ZM7 12H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4M17 13h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3" />
      </svg>
    ),
  },
  {
    id: 'kitchen_cutlery',
    groupIds: ['kitchen_cutlery', 'home_lifestyle'],
    nameBn: 'হোম ও কিচেন',
    nameEn: 'Home & Kitchen',
    descBn: 'কিচেন ছুরি, চাপাতি, কুকওয়্যার ও হোম লাইফস্টাইল পণ্য',
    descEn: 'Kitchen cutlery, knives, cleavers & home essentials',
    accentColor: '#4338ca',
    iconSvg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.8]">
        <path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7" />
      </svg>
    ),
  },
  {
    id: 'combo',
    groupIds: ['combo'],
    nameBn: 'কম্বো ও গিফট প্যাক',
    nameEn: 'Combo & Gifts',
    descBn: 'বিশেষ মূল্যছাড়ে ফ্যামিলি কম্বো ও ফেস্টিভাল গিফট বান্ডেল',
    descEn: 'Value family bundles & special gift combo sets',
    accentColor: '#9a3412',
    iconSvg: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.8]">
        <path d="M12 21V9M12 9C7 9 4 6 4 3c5 0 8 2 8 6ZM12 12c0-4 3-7 8-7 0 4-3 7-8 7ZM4 13h16v8H4zM2 10h20v4H2z" />
      </svg>
    ),
  },
];

const SUB_CATEGORY_LABELS: Record<string, { bn: string; en: string }> = {
  honey: { bn: 'খাঁটি মধু', en: 'Pure Honey' },
  ghee_oil: { bn: 'ঘি ও তেল', en: 'Ghee & Oil' },
  superfoods: { bn: 'সুপারফুড', en: 'Superfoods' },
  nuts_dates: { bn: 'বাদাম ও খেজুর', en: 'Nuts & Dates' },
  wellness: { bn: 'ওয়েলনেস', en: 'Wellness' },
  organic_food: { bn: 'অর্গানিক ফুড', en: 'Organic Food' },
  spices: { bn: 'মশলা ও অর্গানিক', en: 'Spices & Herbs' },
  skincare: { bn: 'স্কিনকেয়ার', en: 'Skincare' },
  kitchen_cutlery: { bn: 'কিচেন কাটলারি', en: 'Kitchen Cutlery' },
  home_lifestyle: { bn: 'হোম লাইফস্টাইল', en: 'Home Lifestyle' },
  combo: { bn: 'কম্বো প্যাক', en: 'Combo Pack' },
  fashion: { bn: 'ফ্যাশন', en: 'Fashion' },
  jewellery: { bn: 'জুয়েলারি', en: 'Jewellery' },
  electronics: { bn: 'ইলেকট্রনিক্স', en: 'Electronics' },
};

export const CategoryPageView: React.FC<CategoryPageViewProps> = ({
  products,
  reviews,
  wishlist,
  selectedCategory,
  searchQuery,
  lang,
  isLoadingProducts,
  onSelectCategory,
  onSearchChange,
  onToggleWishlist,
  onSelectProduct,
  onAddToCart,
  onDirectOrder,
  onBackToHome,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Advanced Filter States
  const [selectedSubCat, setSelectedSubCat] = useState<string>('all');
  const [priceBracket, setPriceBracket] = useState<PriceBracket>('all');
  const [onlyFlashSale, setOnlyFlashSale] = useState(false);
  const [onlyFreeDelivery, setOnlyFreeDelivery] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyWholesale, setOnlyWholesale] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [cardVariantSelection, setCardVariantSelection] = useState<Record<string, string>>({});

  // Helper: Check if a product belongs to a CategoryDef
  const matchesCategoryDef = (p: Product, catId: CategoryId): boolean => {
    if (catId === 'all') return true;
    const def = CATEGORY_DEFINITIONS.find((c) => c.id === catId);
    if (def && def.groupIds.length > 0) {
      return def.groupIds.includes(p.category);
    }
    return p.category === catId;
  };

  // Live Review Rating Calculation per Product
  const reviewStatsByProduct = useMemo(() => {
    const map: Record<string, { avg: number; count: number }> = {};
    reviews.forEach((r) => {
      if (r.status !== 'Approved') return;
      if (!map[r.productId]) {
        map[r.productId] = { avg: 0, count: 0 };
      }
      map[r.productId].avg += r.rating || 5;
      map[r.productId].count += 1;
    });
    Object.keys(map).forEach((pid) => {
      if (map[pid].count > 0) {
        map[pid].avg = Number((map[pid].avg / map[pid].count).toFixed(1));
      }
    });
    return map;
  }, [reviews]);

  // Dynamic category counts & minimum starting prices
  const categoryMetrics = useMemo(() => {
    const metrics: Record<
      string,
      { count: number; minPrice: number; maxDiscount: number; inStockCount: number }
    > = {};

    CATEGORY_DEFINITIONS.forEach((def) => {
      const matching = products.filter((p) => matchesCategoryDef(p, def.id));
      const prices = matching.map((p) =>
        p.salePrice && p.salePrice < p.price ? p.salePrice : p.price
      );
      const discounts = matching.map((p) =>
        p.salePrice && p.salePrice < p.price
          ? Math.round(((p.price - p.salePrice) / p.price) * 100)
          : 0
      );
      metrics[def.id] = {
        count: matching.length,
        minPrice: prices.length > 0 ? Math.min(...prices) : 0,
        maxDiscount: discounts.length > 0 ? Math.max(...discounts) : 0,
        inStockCount: matching.filter((p) => p.stock > 0).length,
      };
    });

    return metrics;
  }, [products]);

  // Products in currently selected main category
  const categoryScopedProducts = useMemo(() => {
    return products.filter((p) => matchesCategoryDef(p, selectedCategory));
  }, [products, selectedCategory]);

  // Available sub-categories within the active main category
  const availableSubCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    categoryScopedProducts.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.entries(counts).map(([subId, count]) => ({
      id: subId,
      labelBn: SUB_CATEGORY_LABELS[subId]?.bn || subId,
      labelEn: SUB_CATEGORY_LABELS[subId]?.en || subId,
      count,
    }));
  }, [categoryScopedProducts]);

  // Available dynamic brands from products in this category
  const availableBrands = useMemo(() => {
    const brandSet = new Set<string>();
    categoryScopedProducts.forEach((p) => {
      if (p.schemaBrand && p.schemaBrand.trim()) {
        brandSet.add(p.schemaBrand.trim());
      }
    });
    return Array.from(brandSet);
  }, [categoryScopedProducts]);

  // Active Filter Count
  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (selectedSubCat !== 'all') c++;
    if (priceBracket !== 'all') c++;
    if (onlyFlashSale) c++;
    if (onlyFreeDelivery) c++;
    if (onlyInStock) c++;
    if (onlyWholesale) c++;
    if (selectedBrand !== 'all') c++;
    return c;
  }, [
    selectedSubCat,
    priceBracket,
    onlyFlashSale,
    onlyFreeDelivery,
    onlyInStock,
    onlyWholesale,
    selectedBrand,
  ]);

  const handleResetAllFilters = () => {
    setSelectedSubCat('all');
    setPriceBracket('all');
    setOnlyFlashSale(false);
    setOnlyFreeDelivery(false);
    setOnlyInStock(false);
    setOnlyWholesale(false);
    setSelectedBrand('all');
    onSearchChange('');
  };

  // Filtered and Sorted Products
  const filteredAndSortedProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = categoryScopedProducts.filter((p) => {
      if (selectedSubCat !== 'all' && p.category !== selectedSubCat) {
        return false;
      }

      const effectivePrice =
        p.salePrice && p.salePrice < p.price ? p.salePrice : p.price;

      if (priceBracket === 'under_500' && effectivePrice >= 500) return false;
      if (
        priceBracket === '500_1500' &&
        (effectivePrice < 500 || effectivePrice > 1500)
      )
        return false;
      if (
        priceBracket === '1500_3000' &&
        (effectivePrice < 1500 || effectivePrice > 3000)
      )
        return false;
      if (priceBracket === 'over_3000' && effectivePrice <= 3000) return false;

      if (onlyFlashSale && !p.isFlashSale && !(p.salePrice < p.price)) {
        return false;
      }

      if (onlyFreeDelivery && !p.freeDelivery) {
        return false;
      }

      if (onlyInStock && p.stock <= 0) {
        return false;
      }

      if (
        onlyWholesale &&
        (!Array.isArray(p.wholesaleTiers) || p.wholesaleTiers.length === 0)
      ) {
        return false;
      }

      if (
        selectedBrand !== 'all' &&
        (p.schemaBrand || '').trim() !== selectedBrand
      ) {
        return false;
      }

      if (q) {
        const matchName =
          p.nameBn.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.descriptionBn.toLowerCase().includes(q) ||
          p.descriptionEn.toLowerCase().includes(q) ||
          (p.focusKeyphrase && p.focusKeyphrase.toLowerCase().includes(q)) ||
          (p.schemaBrand && p.schemaBrand.toLowerCase().includes(q));
        if (!matchName) return false;
      }

      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const priceA = a.salePrice && a.salePrice < a.price ? a.salePrice : a.price;
      const priceB = b.salePrice && b.salePrice < b.price ? b.salePrice : b.price;
      const discA =
        a.salePrice < a.price
          ? Math.round(((a.price - a.salePrice) / a.price) * 100)
          : 0;
      const discB =
        b.salePrice < b.price
          ? Math.round(((b.price - b.salePrice) / b.price) * 100)
          : 0;
      const ratingA = reviewStatsByProduct[a.id]?.avg ?? 5.0;
      const ratingB = reviewStatsByProduct[b.id]?.avg ?? 5.0;

      if (sortBy === 'price_asc') return priceA - priceB;
      if (sortBy === 'price_desc') return priceB - priceA;
      if (sortBy === 'discount_desc') return discB - discA;
      if (sortBy === 'rating_desc') return ratingB - ratingA;
      if (sortBy === 'newest') {
        const getSeconds = (val: unknown) => {
          if (val && typeof val === 'object' && 'seconds' in val) {
            return Number((val as { seconds: number }).seconds) || 0;
          }
          return 0;
        };
        const diff = getSeconds(b.createdAt) - getSeconds(a.createdAt);
        if (diff !== 0) return diff;
        return b.id.localeCompare(a.id);
      }
      return (b.isFlashSale ? 1 : 0) - (a.isFlashSale ? 1 : 0);
    });

    return sorted;
  }, [
    categoryScopedProducts,
    selectedSubCat,
    priceBracket,
    onlyFlashSale,
    onlyFreeDelivery,
    onlyInStock,
    onlyWholesale,
    selectedBrand,
    searchQuery,
    sortBy,
    reviewStatsByProduct,
  ]);

  const activeCategoryDef =
    CATEGORY_DEFINITIONS.find((c) => c.id === selectedCategory) ||
    CATEGORY_DEFINITIONS[0];
  const activeMetrics = categoryMetrics[activeCategoryDef.id] || {
    count: 0,
    minPrice: 0,
    maxDiscount: 0,
    inStockCount: 0,
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Category Page Navigation & Hero Header */}
      <div
        className="rounded-2xl p-4 text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0d3025 0%, #174a38 65%, #1e5b45 100%)',
          boxShadow: '0 8px 24px rgba(18, 59, 46, 0.16)',
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/12 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'হোমে ফিরুন' : 'Back to Home'}</span>
          </button>

          <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#c7a15d]/25 text-[#f4e5be] border border-[#c7a15d]/40">
            {lang === 'bn'
              ? `মোট ${filteredAndSortedProducts.length} টি পণ্য`
              : `${filteredAndSortedProducts.length} Products`}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-lg font-extrabold tracking-tight leading-snug text-white">
              {lang === 'bn' ? activeCategoryDef.nameBn : activeCategoryDef.nameEn}
            </h1>
            <p className="text-xs text-emerald-100/85 leading-relaxed">
              {lang === 'bn' ? activeCategoryDef.descBn : activeCategoryDef.descEn}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#f4e5be] text-[#123b2e] flex items-center justify-center shrink-0 shadow-sm">
            {activeCategoryDef.iconSvg}
          </div>
        </div>

        {/* Live Category Metrics Strip */}
        <div className="mt-3.5 pt-3 border-t border-white/12 grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/8 rounded-xl py-1.5 px-2">
            <div className="text-[10px] text-emerald-100/75">
              {lang === 'bn' ? 'শুরু মূল্য' : 'Starting At'}
            </div>
            <div className="text-xs font-mono font-extrabold text-[#f4e5be]">
              {activeMetrics.minPrice > 0
                ? `৳${activeMetrics.minPrice.toLocaleString('en-BD')}`
                : '—'}
            </div>
          </div>
          <div className="bg-white/8 rounded-xl py-1.5 px-2">
            <div className="text-[10px] text-emerald-100/75">
              {lang === 'bn' ? 'সর্বোচ্চ ছাড়' : 'Up To Off'}
            </div>
            <div className="text-xs font-mono font-extrabold text-[#f4e5be]">
              {activeMetrics.maxDiscount > 0 ? `${activeMetrics.maxDiscount}% OFF` : 'Regular'}
            </div>
          </div>
          <div className="bg-white/8 rounded-xl py-1.5 px-2">
            <div className="text-[10px] text-emerald-100/75">
              {lang === 'bn' ? 'রেডি স্টক' : 'In Stock'}
            </div>
            <div className="text-xs font-mono font-extrabold text-[#f4e5be]">
              {lang === 'bn'
                ? `${activeMetrics.inStockCount} টি পণ্য`
                : `${activeMetrics.inStockCount} Items`}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Visual Category Matrix (Horizontal Scrollable Cards) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#123b2e]" />
            {lang === 'bn' ? 'ক্যাটাগরি নির্বাচন করুন' : 'Browse Categories'}
          </span>
          {selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => {
                onSelectCategory('all');
                setSelectedSubCat('all');
              }}
              className="text-[11px] font-bold text-[#123b2e] underline cursor-pointer"
            >
              {lang === 'bn' ? 'সকল ক্যাটাগরি দেখুন' : 'Show All'}
            </button>
          )}
        </div>

        <div className="flex items-stretch gap-2 overflow-x-auto pb-1.5 no-scrollbar">
          {CATEGORY_DEFINITIONS.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const stat = categoryMetrics[cat.id] || { count: 0, minPrice: 0 };
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onSelectCategory(cat.id);
                  setSelectedSubCat('all');
                }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border text-left transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#123b2e] text-white border-[#123b2e] shadow-sm'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-[#123b2e]/40'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-[#f4e5be] text-[#123b2e]'
                      : 'bg-[#f6f3ea] text-[#123b2e]'
                  }`}
                >
                  {cat.iconSvg}
                </div>
                <div className="min-w-0 pr-1">
                  <div className="text-xs font-bold whitespace-nowrap">
                    {lang === 'bn' ? cat.nameBn : cat.nameEn}
                  </div>
                  <div
                    className={`text-[10px] font-mono mt-0.5 whitespace-nowrap ${
                      isSelected ? 'text-[#f4e5be]' : 'text-slate-500'
                    }`}
                  >
                    {stat.count} {lang === 'bn' ? 'টি পণ্য' : 'items'}
                    {stat.minPrice > 0 && ` · ৳${stat.minPrice}+`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Category Chips (When multiple sub-categories exist in current selection) */}
      {availableSubCategories.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedSubCat('all')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedSubCat === 'all'
                ? 'bg-[#c7a15d] text-[#123b2e]'
                : 'bg-[#f8f6f0] text-slate-700 border border-slate-200/80 hover:border-[#c7a15d]'
            }`}
          >
            {lang === 'bn' ? 'সব সাব-ক্যাটাগরি' : 'All Subcategories'} (
            {categoryScopedProducts.length})
          </button>
          {availableSubCategories.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() =>
                setSelectedSubCat((prev) => (prev === sub.id ? 'all' : sub.id))
              }
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedSubCat === sub.id
                  ? 'bg-[#c7a15d] text-[#123b2e]'
                  : 'bg-[#f8f6f0] text-slate-700 border border-slate-200/80 hover:border-[#c7a15d]'
              }`}
            >
              {lang === 'bn' ? sub.labelBn : sub.labelEn} ({sub.count})
            </button>
          ))}
        </div>
      )}

      {/* Control Bar: Filter Button, Quick Sort Dropdown & Grid/List Switcher */}
      <div className="bg-[#f8f6f0] border border-[#e9e8e1] rounded-2xl p-2.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Advanced Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setShowFilterDrawer((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              showFilterDrawer || activeFilterCount > 0
                ? 'bg-[#123b2e] text-white border-[#123b2e]'
                : 'bg-white text-slate-800 border-slate-200/90'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'অ্যাডভান্সড ফিল্টার' : 'Filters'}</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#c7a15d] text-[#123b2e] font-mono text-[10px] font-extrabold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="relative flex-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort products"
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200/90 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#123b2e] cursor-pointer"
              >
                <option value="popular">
                  {lang === 'bn' ? 'সর্ট: জনপ্রিয় পণ্য' : 'Sort: Popular'}
                </option>
                <option value="price_asc">
                  {lang === 'bn' ? 'দাম: কম থেকে বেশি' : 'Price: Low to High'}
                </option>
                <option value="price_desc">
                  {lang === 'bn' ? 'দাম: বেশি থেকে কম' : 'Price: High to Low'}
                </option>
                <option value="discount_desc">
                  {lang === 'bn' ? 'সর্বোচ্চ ডিসকাউন্ট ছাড়' : 'Biggest Discount'}
                </option>
                <option value="rating_desc">
                  {lang === 'bn' ? 'সেরা কাস্টমার রেটিং' : 'Highest Rated'}
                </option>
                <option value="newest">
                  {lang === 'bn' ? 'নতুন যুক্ত হওয়া পণ্য' : 'Newest Arrivals'}
                </option>
              </select>
            </div>

            {/* Grid vs List View Toggle */}
            <div className="inline-flex items-center bg-white border border-slate-200/90 rounded-xl p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#123b2e] text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#123b2e] text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* One-Tap Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setOnlyFlashSale((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap border cursor-pointer transition-colors ${
              onlyFlashSale
                ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <Flame className="w-3 h-3 text-amber-600" />
            <span>{lang === 'bn' ? 'অফার / ফ্ল্যাশ সেল' : 'Flash Deal'}</span>
          </button>

          <button
            type="button"
            onClick={() => setOnlyFreeDelivery((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap border cursor-pointer transition-colors ${
              onlyFreeDelivery
                ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <Truck className="w-3 h-3 text-emerald-700" />
            <span>{lang === 'bn' ? 'ফ্রি ডেলিভারি' : 'Free Delivery'}</span>
          </button>

          <button
            type="button"
            onClick={() => setOnlyInStock((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap border cursor-pointer transition-colors ${
              onlyInStock
                ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <PackageCheck className="w-3 h-3 text-emerald-700" />
            <span>{lang === 'bn' ? 'স্টকে আছে' : 'In Stock'}</span>
          </button>

          <button
            type="button"
            onClick={() => setOnlyWholesale((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap border cursor-pointer transition-colors ${
              onlyWholesale
                ? 'bg-purple-100 border-purple-400 text-purple-950 font-bold'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <Tag className="w-3 h-3 text-purple-700" />
            <span>{lang === 'bn' ? 'পাইকারি ছাড়' : 'Wholesale'}</span>
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap bg-red-50 border border-red-200 text-red-700 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{lang === 'bn' ? 'রিসেট' : 'Reset'}</span>
            </button>
          )}
        </div>

        {/* Expandable Deep Filter Panel */}
        {showFilterDrawer && (
          <div className="pt-2.5 border-t border-slate-200/80 space-y-3 bg-white rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                {lang === 'bn'
                  ? 'মূল্য সীমা ও ব্র্যান্ড ফিল্টার'
                  : 'Price Range & Brand Filter'}
              </span>
              <button
                type="button"
                aria-label="Close filter panel"
                onClick={() => setShowFilterDrawer(false)}
                className="text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Price Brackets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-600 block">
                {lang === 'bn' ? 'দামের রেঞ্জ (Price Range):' : 'Price Range:'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {[
                  { id: 'all', bn: 'সব দামের পণ্য', en: 'All Prices' },
                  { id: 'under_500', bn: '৳৫০০ এর নিচে', en: 'Under ৳500' },
                  { id: '500_1500', bn: '৳৫০০ – ৳১,৫০০', en: '৳500 – ৳1,500' },
                  { id: '1500_3000', bn: '৳১,৫০০ – ৳৩,০০০', en: '৳1,500 – ৳3,000' },
                  { id: 'over_3000', bn: '৳৩,০০০+ প্রিমিয়াম', en: 'Over ৳3,000' },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setPriceBracket(b.id as PriceBracket)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border text-left flex items-center justify-between cursor-pointer ${
                      priceBracket === b.id
                        ? 'border-[#123b2e] bg-emerald-50 text-[#123b2e] font-bold'
                        : 'border-slate-200 bg-slate-50/60 text-slate-700'
                    }`}
                  >
                    <span>{lang === 'bn' ? b.bn : b.en}</span>
                    {priceBracket === b.id && <Check className="w-3 h-3 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Brands Filter (if brands exist in Firestore products) */}
            {availableBrands.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  {lang === 'bn' ? 'ব্র্যান্ড (Brand):' : 'Brand:'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedBrand('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                      selectedBrand === 'all'
                        ? 'bg-[#123b2e] text-white border-[#123b2e]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {lang === 'bn' ? 'সকল ব্র্যান্ড' : 'All Brands'}
                  </button>
                  {availableBrands.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setSelectedBrand(brand)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                        selectedBrand === brand
                          ? 'bg-[#123b2e] text-white border-[#123b2e]'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Listing Area (Grid or List View) */}
      {isLoadingProducts ? (
        <div className="py-12 px-4 text-center rounded-2xl border border-slate-200 bg-white space-y-2">
          <div className="w-8 h-8 border-2 border-[#123b2e] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">
            {lang === 'bn'
              ? 'ডাটাবেস থেকে ক্যাটাগরির পণ্য লোড হচ্ছে...'
              : 'Loading products from database...'}
          </p>
        </div>
      ) : filteredAndSortedProducts.length === 0 ? (
        <div className="py-10 px-5 text-center rounded-2xl border border-slate-200 bg-[#f8f6f0]/60 space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-[#123b2e]/10 text-[#123b2e] flex items-center justify-center mx-auto">
            <Search className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              {lang === 'bn'
                ? 'এই ফিল্টারে কোনো পণ্য পাওয়া যায়নি'
                : 'No matching products found'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'bn'
                ? 'অন্য ক্যাটাগরি নির্বাচন করুন অথবা ফিল্টার রিসেট করে সকল পণ্য দেখুন।'
                : 'Try selecting another category or reset active filters.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectCategory('all');
              handleResetAllFilters();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#123b2e] text-white text-xs font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'সকল পণ্য দেখুন' : 'Reset & View All'}</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* 2-COLUMN ADVANCED GRID VIEW */
        <div className="grid grid-cols-2 gap-2.5">
          {filteredAndSortedProducts.map((product) => {
            const hasStructuredVariants =
              Array.isArray(product.variants) && product.variants.length > 0;
            const chosenVariantLabel =
              cardVariantSelection[product.id] ||
              (hasStructuredVariants
                ? product.variants![0].label
                : product.unitLabel);
            const activeVarObj = hasStructuredVariants
              ? product.variants!.find((v) => v.label === chosenVariantLabel) ||
                product.variants![0]
              : null;

            const regularPrice = activeVarObj
              ? activeVarObj.regularPrice
              : product.price;
            const effectivePrice = activeVarObj
              ? activeVarObj.salePrice < activeVarObj.regularPrice
                ? activeVarObj.salePrice
                : activeVarObj.regularPrice
              : product.salePrice && product.salePrice < product.price
              ? product.salePrice
              : product.price;

            const hasDiscount = effectivePrice < regularPrice;
            const discountPct = hasDiscount
              ? Math.round(((regularPrice - effectivePrice) / regularPrice) * 100)
              : 0;

            const isLiked = wishlist.includes(product.id);
            const rStat = reviewStatsByProduct[product.id] || {
              avg: 5.0,
              count: 0,
            };

            return (
              <article
                key={product.id}
                className="border border-[#efeee8] rounded-2xl p-2.5 bg-white shadow-xs flex flex-col justify-between transition-all hover:border-[#123b2e]/30"
              >
                <div>
                  {/* Image Container */}
                  <div
                    className="relative h-34 rounded-xl bg-[#f7f6f1] overflow-hidden cursor-pointer group"
                    onClick={() => onSelectProduct(product)}
                  >
                    <ProductImage
                      src={
                        (activeVarObj && activeVarObj.imageUrl) || product.imageUrl
                      }
                      alt={lang === 'bn' ? product.nameBn : product.nameEn}
                      category={product.category}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Wishlist Button */}
                    <button
                      type="button"
                      onClick={(e) => onToggleWishlist(product.id, e)}
                      aria-label="Toggle wishlist"
                      className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-xs cursor-pointer ${
                        isLiked
                          ? 'bg-red-50 text-red-600'
                          : 'bg-white/85 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-600' : ''}`}
                      />
                    </button>

                    {/* Discount / Custom Badge */}
                    {hasDiscount && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-[#123b2e] text-[#f7e6be] font-mono text-[10px] font-bold">
                        -{discountPct}%
                      </span>
                    )}

                    {product.freeDelivery && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-[#123b2e]/90 text-[#f4e5be] text-[9px] font-bold inline-flex items-center gap-0.5">
                        <Truck className="w-2.5 h-2.5" />
                        {lang === 'bn' ? 'ফ্রি' : 'FREE'}
                      </span>
                    )}
                  </div>

                  {/* Category & Rating Row */}
                  <div className="mt-2 flex items-center justify-between gap-1 text-[10px] text-slate-500">
                    <span className="truncate font-medium text-[#123b2e]">
                      {SUB_CATEGORY_LABELS[product.category]?.bn || product.category}
                    </span>
                    <span className="inline-flex items-center gap-0.5 font-mono font-semibold text-slate-700 shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                      {rStat.avg.toFixed(1)} ({rStat.count})
                    </span>
                  </div>

                  {/* Product Title */}
                  <h3
                    onClick={() => onSelectProduct(product)}
                    className="mt-1 text-xs font-bold text-slate-900 line-clamp-2 leading-snug cursor-pointer hover:text-[#123b2e] min-h-[32px]"
                  >
                    {lang === 'bn' ? product.nameBn : product.nameEn}
                  </h3>

                  {/* Interactive Variant Mini-Selector (if product has structured variants) */}
                  {hasStructuredVariants && product.variants!.length > 1 ? (
                    <div className="mt-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
                      {product.variants!.slice(0, 3).map((v) => {
                        const isVarActive = chosenVariantLabel === v.label;
                        return (
                          <button
                            key={v.id || v.label}
                            type="button"
                            onClick={() =>
                              setCardVariantSelection((prev) => ({
                                ...prev,
                                [product.id]: v.label,
                              }))
                            }
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border whitespace-nowrap cursor-pointer ${
                              isVarActive
                                ? 'bg-[#123b2e] text-white border-[#123b2e]'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {v.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-1 text-[10px] text-slate-500 truncate">
                      {product.unitLabel}
                    </div>
                  )}
                </div>

                {/* Price & Action Footer */}
                <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-baseline justify-between gap-1">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <strong className="text-sm font-mono font-extrabold text-[#123b2e]">
                        ৳{effectivePrice.toLocaleString('en-BD')}
                      </strong>
                      {hasDiscount && (
                        <del className="text-[10px] font-mono text-slate-600">
                          ৳{regularPrice.toLocaleString('en-BD')}
                        </del>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product)}
                      aria-label={lang === 'bn' ? 'বিস্তারিত দেখুন' : 'Quick View'}
                      className="text-slate-600 hover:text-[#123b2e] p-1 cursor-pointer"
                      title={lang === 'bn' ? 'বিস্তারিত দেখুন' : 'Quick View'}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={(activeVarObj ? activeVarObj.stock : product.stock) <= 0}
                    onClick={() =>
                      onAddToCart(product, 1, chosenVariantLabel, {
                        variantPrice: effectivePrice,
                        variantRegularPrice: regularPrice,
                        variantSku: activeVarObj?.sku || product.schemaSku,
                        variantImageUrl: activeVarObj?.imageUrl || product.imageUrl,
                      })
                    }
                    className="w-full py-2 px-2.5 rounded-xl bg-[#123b2e] hover:bg-[#1b4b3b] disabled:opacity-50 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>
                      {(activeVarObj ? activeVarObj.stock : product.stock) <= 0
                        ? lang === 'bn'
                          ? 'স্টক আউট'
                          : 'Out of Stock'
                        : lang === 'bn'
                        ? 'কার্টে যোগ করুন'
                        : 'Add to Cart'}
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* 1-COLUMN DETAILED LIST VIEW */
        <div className="space-y-2.5">
          {filteredAndSortedProducts.map((product) => {
            const hasStructuredVariants =
              Array.isArray(product.variants) && product.variants.length > 0;
            const chosenVariantLabel =
              cardVariantSelection[product.id] ||
              (hasStructuredVariants
                ? product.variants![0].label
                : product.unitLabel);
            const activeVarObj = hasStructuredVariants
              ? product.variants!.find((v) => v.label === chosenVariantLabel) ||
                product.variants![0]
              : null;

            const regularPrice = activeVarObj
              ? activeVarObj.regularPrice
              : product.price;
            const effectivePrice = activeVarObj
              ? activeVarObj.salePrice < activeVarObj.regularPrice
                ? activeVarObj.salePrice
                : activeVarObj.regularPrice
              : product.salePrice && product.salePrice < product.price
              ? product.salePrice
              : product.price;

            const hasDiscount = effectivePrice < regularPrice;
            const discountPct = hasDiscount
              ? Math.round(((regularPrice - effectivePrice) / regularPrice) * 100)
              : 0;
            const isLiked = wishlist.includes(product.id);
            const rStat = reviewStatsByProduct[product.id] || {
              avg: 5.0,
              count: 0,
            };

            return (
              <article
                key={product.id}
                className="border border-[#efeee8] rounded-2xl p-3 bg-white shadow-xs flex gap-3 items-start"
              >
                {/* Left Thumbnail */}
                <div
                  onClick={() => onSelectProduct(product)}
                  className="relative w-28 h-28 rounded-xl bg-[#f7f6f1] overflow-hidden shrink-0 cursor-pointer"
                >
                  <ProductImage
                    src={
                      (activeVarObj && activeVarObj.imageUrl) || product.imageUrl
                    }
                    alt={lang === 'bn' ? product.nameBn : product.nameEn}
                    category={product.category}
                    className="w-full h-full object-cover"
                  />
                  {hasDiscount && (
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#123b2e] text-[#f7e6be] font-mono text-[9px] font-bold">
                      -{discountPct}%
                    </span>
                  )}
                </div>

                {/* Right Details */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-[#123b2e]">
                      {SUB_CATEGORY_LABELS[product.category]?.bn || product.category}
                      {product.schemaBrand ? ` · ${product.schemaBrand}` : ''}
                    </span>
                    <button
                      type="button"
                      aria-label="Toggle wishlist"
                      onClick={(e) => onToggleWishlist(product.id, e)}
                      className="text-slate-600 hover:text-red-600 cursor-pointer"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isLiked ? 'fill-red-600 text-red-600' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <h3
                    onClick={() => onSelectProduct(product)}
                    className="text-xs font-bold text-slate-900 line-clamp-2 cursor-pointer hover:text-[#123b2e]"
                  >
                    {lang === 'bn' ? product.nameBn : product.nameEn}
                  </h3>

                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {product.shortSummaryBn ||
                      (lang === 'bn'
                        ? product.descriptionBn
                        : product.descriptionEn)}
                  </p>

                  {/* Variant Pills */}
                  {hasStructuredVariants && (
                    <div className="flex flex-wrap gap-1">
                      {product.variants!.map((v) => (
                        <button
                          key={v.id || v.label}
                          type="button"
                          onClick={() =>
                            setCardVariantSelection((prev) => ({
                              ...prev,
                              [product.id]: v.label,
                            }))
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                            chosenVariantLabel === v.label
                              ? 'bg-[#123b2e] text-white border-[#123b2e]'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-baseline gap-1.5">
                      <strong className="text-sm font-mono font-extrabold text-[#123b2e]">
                        ৳{effectivePrice.toLocaleString('en-BD')}
                      </strong>
                      {hasDiscount && (
                        <del className="text-[10px] font-mono text-slate-600">
                          ৳{regularPrice.toLocaleString('en-BD')}
                        </del>
                      )}
                      <span className="text-[10px] text-amber-800 font-mono ml-1">
                        ★ {rStat.avg.toFixed(1)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={(activeVarObj ? activeVarObj.stock : product.stock) <= 0}
                        onClick={() =>
                          onAddToCart(product, 1, chosenVariantLabel, {
                            variantPrice: effectivePrice,
                            variantRegularPrice: regularPrice,
                            variantSku: activeVarObj?.sku || product.schemaSku,
                            variantImageUrl: activeVarObj?.imageUrl || product.imageUrl,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-[#123b2e] text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
                      >
                        {lang === 'bn' ? '+ কার্ট' : '+ Cart'}
                      </button>
                      <button
                        type="button"
                        disabled={(activeVarObj ? activeVarObj.stock : product.stock) <= 0}
                        onClick={() =>
                          onDirectOrder(product, 1, chosenVariantLabel, {
                            variantPrice: effectivePrice,
                            variantRegularPrice: regularPrice,
                            variantSku: activeVarObj?.sku || product.schemaSku,
                            variantImageUrl: activeVarObj?.imageUrl || product.imageUrl,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-[#c7a15d] text-[#123b2e] text-[10px] font-bold cursor-pointer disabled:opacity-50"
                      >
                        {lang === 'bn' ? 'অর্ডার' : 'Buy'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
