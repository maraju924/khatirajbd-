export type Language = 'bn' | 'en';

export type ProductCategory =
  | 'honey'
  | 'ghee_oil'
  | 'superfoods'
  | 'nuts_dates'
  | 'wellness'
  | 'skincare'
  | 'kitchen_cutlery'
  | 'combo'
  | 'fashion'
  | 'electronics'
  | 'jewellery'
  | 'organic_food'
  | 'home_lifestyle'
  | 'spices';

export type CategoryId = 'all' | ProductCategory;

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  district?: string;
  address?: string;
  role: UserRole;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type DeliveryZone = 'inside_dhaka' | 'outside_dhaka';

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';

export type PaymentMethodType = 'COD' | 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'Bank';

export type PaymentStatusType = 'Unpaid' | 'Pending Verification' | 'Paid' | 'Rejected';

export interface ProductVariantItem {
  id: string;
  label: string;
  attrType?: string; // e.g. 'ওজন / প্যাক', 'সাইজ', 'কালার'
  regularPrice: number;
  salePrice: number;
  stock: number;
  sku: string;
  weightGrams?: number;
  imageUrl?: string;
}

export interface ProductGalleryItem {
  id: string;
  url: string;
  altText: string;
  caption?: string;
}

export interface ProductSpecItem {
  label: string;
  value: string;
}

export interface ProductFaqItem {
  question: string;
  answer: string;
}

export interface WholesaleTierItem {
  minQty: number;
  discountPercent: number;
  labelBn?: string;
}

export interface Product {
  id: string;
  nameBn: string;
  nameEn: string;
  shortSummaryBn?: string;
  descriptionBn: string;
  descriptionEn: string;
  category: ProductCategory;
  price: number;
  salePrice: number;
  isFlashSale: boolean;
  stock: number;
  unitLabel: string;
  imageUrl: string;
  galleryUrls?: string[];
  // Advanced Gallery & Video Media
  galleryItems?: ProductGalleryItem[];
  videoUrl?: string;
  // Advanced Multi-Attribute Variants
  variants?: ProductVariantItem[];
  // Rich Product Content (Highlights, Specs, FAQs)
  highlights?: string[];
  specifications?: ProductSpecItem[];
  faqs?: ProductFaqItem[];
  // Wholesale Tiered Pricing & Upsell/Combo
  wholesaleTiers?: WholesaleTierItem[];
  upsellProductIds?: string[];
  // Shipping, Weight, Warranty, Return Policy & Custom Badge
  freeDelivery?: boolean;
  weightGrams?: number;
  warrantyText?: string;
  returnPolicyText?: string;
  badgeLabel?: string;
  // Yoast SEO Premium & Technical SEO Fields
  slug?: string;
  focusKeyphrase?: string;
  relatedKeyphrases?: string;
  seoTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  metaRobotsIndex?: 'index' | 'noindex';
  metaRobotsFollow?: 'follow' | 'nofollow';
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImageUrl?: string;
  schemaBrand?: string;
  schemaSku?: string;
  schemaGtin?: string;
  schemaMpn?: string;
  schemaCondition?: 'NewCondition' | 'RefurbishedCondition' | 'UsedCondition';
  schemaAvailability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  imageAltText?: string;
  isCornerstone?: boolean;
  internalLinksUrl?: string;
  outboundLinkUrl?: string;
  redirectOldSlug?: string;
  seoScore?: number;
  readabilityScore?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CategoryItem {
  id: ProductCategory;
  nameBn: string;
  nameEn: string;
  imageUrl: string;
  countLabelBn: string;
  countLabelEn: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant: string;
  variantPrice?: number;
  variantRegularPrice?: number;
  variantSku?: string;
  variantImageUrl?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  descriptionBn: string;
  descriptionEn: string;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Order {
  id?: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  district: string;
  address: string;
  deliveryZone: DeliveryZone;
  itemsSummary: string;
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  couponCode: string;
  deliveryCharge: number;
  totalPayable: number;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatusType;
  transactionId: string;
  senderPhone: string;
  steadfastConsignmentId: string;
  steadfastStatus: string;
  adminNote: string;
  status: OrderStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderTracking {
  orderCode: string;
  itemsSummary: string;
  itemCount: number;
  deliveryZone: DeliveryZone;
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  totalPayable: number;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatusType;
  steadfastConsignmentId: string;
  steadfastStatus: string;
  status: OrderStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AbandonedCart {
  id: string;
  cartCode: string;
  customerName: string;
  customerPhone: string;
  district: string;
  address: string;
  itemsSummary: string;
  subtotal: number;
  recoveryStatus: 'New' | 'Reminded' | 'Recovered';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SliderItem {
  id: string;
  titleBn: string;
  titleEn: string;
  subtitleBn: string;
  subtitleEn: string;
  btnTextBn: string;
  btnTextEn: string;
  btnLink: string;
  imageUrl: string;
  sliderType: 'hero' | 'promo';
  isActive: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BlogPost {
  id: string;
  titleBn: string;
  titleEn: string;
  categoryBn: string;
  excerptBn: string;
  contentBn: string;
  imageUrl: string;
  authorName: string;
  isPublished: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LandingPageItem {
  id: string;
  slug: string;
  titleBn: string;
  subtitleBn: string;
  productId: string;
  heroImageUrl: string;
  bulletPointsSummary: string;
  specialOfferText: string;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ReviewItem {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  rating: number;
  comment: string;
  status: 'Approved' | 'Pending';
  adminReply: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SiteSettings {
  siteName: string;
  logoUrl?: string;
  siteTagline?: string;
  supportPhone: string;
  supportEmail: string;
  whatsappNumber: string;
  insideDhakaCharge: number;
  outsideDhakaCharge: number;
  freeDeliveryThreshold: number;
  flashSaleTitleBn: string;
  flashSaleEndTime: string;
  flashSaleActive: boolean;
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  upayNumber: string;
  bankDetails: string;
  steadfastApiKey: string;
  steadfastSecretKey: string;
  fbPixelId: string;
  tiktokPixelId: string;
  gaMeasurementId: string;
}

export interface PaymentGatewayOption {
  id: PaymentMethodType;
  nameBn: string;
  nameEn: string;
  logoUrl: string;
  brandColor: string;
  accountNumberKey: keyof Pick<
    SiteSettings,
    'bkashNumber' | 'nagadNumber' | 'rocketNumber' | 'upayNumber' | 'bankDetails'
  >;
  instructionsBn: string;
  instructionsEn: string;
}
