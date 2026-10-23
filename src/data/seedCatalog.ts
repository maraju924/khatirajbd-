import {
  AbandonedCart,
  BlogPost,
  CategoryItem,
  Coupon,
  DeliveryZone,
  LandingPageItem,
  PaymentGatewayOption,
  Product,
  ReviewItem,
  SiteSettings,
  SliderItem,
} from '../types';

export const KHATIRAJ_LOGO_URL = '/assets/images/icons/khatiraj-logo.webp';
export const HERO_BANNER_SVG = '/uploads/products/khatiraj-hero.jpeg';

export const INSIDE_DHAKA_CHARGE = 60;
export const OUTSIDE_DHAKA_CHARGE = 120;
export const FREE_DELIVERY_THRESHOLD = 3000;

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'Khati Raj BD (খাঁটিরাজ বিডি)',
  logoUrl: KHATIRAJ_LOGO_URL,
  siteTagline: '১০০% খাঁটি ও অর্গানিক পণ্যের বিশ্বস্ত প্রতিষ্ঠান',
  supportPhone: '+880 1711-000000',
  supportEmail: 'support@khatirajbd.com',
  whatsappNumber: '8801711000000',
  insideDhakaCharge: 60,
  outsideDhakaCharge: 120,
  freeDeliveryThreshold: 3000,
  flashSaleTitleBn: 'ফ্ল্যাশ সেল ধামাকা অফার — সীমিত সময়ের জন্য বিশেষ ছাড়!',
  flashSaleEndTime: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
  flashSaleActive: true,
  bkashNumber: '01711-223344 (Personal / Send Money)',
  nagadNumber: '01811-223344 (Personal / Send Money)',
  rocketNumber: '01911-223344 (Personal / Send Money)',
  upayNumber: '01611-223344 (Personal / Send Money)',
  bankDetails: 'City Bank PLC · A/C Name: KhatiRaj BD · A/C No: 1402938475001 · Gulshan Branch',
  steadfastApiKey: 'sf_live_khatirajbd_api_key',
  steadfastSecretKey: 'sf_secret_khatirajbd_key',
  fbPixelId: '108492049182341',
  tiktokPixelId: 'C9K8L2M1N0P3Q4',
  gaMeasurementId: 'G-KHATIRAJ21',
};

export const PAYMENT_GATEWAY_OPTIONS: PaymentGatewayOption[] = [
  {
    id: 'bKash',
    nameBn: 'বিকাশ (bKash)',
    nameEn: 'bKash Personal',
    logoUrl: '/assets/images/payments/bkash.png',
    brandColor: '#e2136e',
    accountNumberKey: 'bkashNumber',
    instructionsBn: 'আপনার বিকাশ অ্যাপ থেকে Send Money অপশনে গিয়ে উপরের নম্বরে টাকা পাঠিয়ে Transaction ID দিন।',
    instructionsEn: 'Open your bKash app, select Send Money to the number above, and enter the Transaction ID.',
  },
  {
    id: 'Nagad',
    nameBn: 'নগদ (Nagad)',
    nameEn: 'Nagad Personal',
    logoUrl: '/assets/images/payments/nagad.png',
    brandColor: '#d12026',
    accountNumberKey: 'nagadNumber',
    instructionsBn: 'আপনার নগদ অ্যাপ থেকে Send Money অপশনে গিয়ে উপরের নম্বরে টাকা পাঠিয়ে Transaction ID দিন।',
    instructionsEn: 'Open your Nagad app, select Send Money to the number above, and enter the Transaction ID.',
  },
  {
    id: 'Rocket',
    nameBn: 'রকেট (Rocket)',
    nameEn: 'DBBL Rocket',
    logoUrl: '/assets/images/payments/rocket.png',
    brandColor: '#8c3494',
    accountNumberKey: 'rocketNumber',
    instructionsBn: 'রকেট অ্যাপ বা *322# ডায়াল করে উপরের নম্বরে Send Money করে Transaction ID দিন।',
    instructionsEn: 'Send Money via Rocket app or *322# to the number above and enter the Transaction ID.',
  },
  {
    id: 'Upay',
    nameBn: 'উপায় (Upay)',
    nameEn: 'Upay Wallet',
    logoUrl: '/assets/images/payments/upay.png',
    brandColor: '#ffc40c',
    accountNumberKey: 'upayNumber',
    instructionsBn: 'উপায় অ্যাপ থেকে Send Money করে আপনার Transaction ID নিচের বক্সে লিখুন।',
    instructionsEn: 'Send Money via Upay app and enter your Transaction ID below.',
  },
  {
    id: 'Bank',
    nameBn: 'ব্যাংক ট্রান্সফার (Bank)',
    nameEn: 'Bank Transfer / NPSB',
    logoUrl: '/assets/images/payments/citybank.png',
    brandColor: '#1a2b3c',
    accountNumberKey: 'bankDetails',
    instructionsBn: 'ব্যাংক অ্যাকাউন্টে NPSB/BEFTN ট্রান্সফার করে রেফারেন্স বা ট্রানজেকশন নম্বরটি দিন।',
    instructionsEn: 'Transfer via NPSB/BEFTN to the bank account and submit your reference ID.',
  },
];

export const PAYMENT_GATEWAYS = PAYMENT_GATEWAY_OPTIONS;

export const SEED_CATEGORIES: CategoryItem[] = [
  {
    id: 'honey',
    nameBn: 'খাঁটি মধু ও অর্গানিক ফুড',
    nameEn: 'Organic Food & Honey',
    imageUrl: '/uploads/categories/organic-food.webp',
    countLabelBn: '১০০% ন্যাচারাল',
    countLabelEn: '100% Natural',
  },
  {
    id: 'skincare',
    nameBn: 'স্কিন কেয়ার ও বিউটি',
    nameEn: 'Skin Care & Beauty',
    imageUrl: '/uploads/categories/skincare.png',
    countLabelBn: 'অথেনটিক কেয়ার',
    countLabelEn: 'Authentic Care',
  },
  {
    id: 'kitchen_cutlery',
    nameBn: 'কিচেন ছুরি ও চাপাতি',
    nameEn: 'Kitchen & Cutlery',
    imageUrl: '/uploads/products/premium-iron-chapati.webp',
    countLabelBn: 'হ্যান্ডক্রাফটেড',
    countLabelEn: 'Handcrafted',
  },
  {
    id: 'combo',
    nameBn: 'ঈদ ও স্পেশাল কম্বো',
    nameEn: 'Special Combo Packs',
    imageUrl: '/uploads/products/eid-special-combo-set.webp',
    countLabelBn: 'বিশেষ ছাড়',
    countLabelEn: 'Combo Deals',
  },
  {
    id: 'electronics',
    nameBn: 'ইলেকট্রনিক্স ও গ্যাজেট',
    nameEn: 'Electronics',
    imageUrl: '/uploads/categories/electronics.png',
    countLabelBn: 'স্মার্ট গ্যাজেট',
    countLabelEn: 'Smart Gadgets',
  },
  {
    id: 'fashion',
    nameBn: 'ফ্যাশন ও লাইফস্টাইল',
    nameEn: 'Fashion & Lifestyle',
    imageUrl: '/uploads/categories/fashion.png',
    countLabelBn: 'প্রিমিয়াম কালেকশন',
    countLabelEn: 'Premium Style',
  },
  {
    id: 'jewellery',
    nameBn: 'জুয়েলারি ও অ্যাক্সেসরিজ',
    nameEn: 'Jewellery',
    imageUrl: '/uploads/categories/jewellery.png',
    countLabelBn: 'এক্সক্লুসিভ',
    countLabelEn: 'Exclusive',
  },
];

export const CATEGORIES = SEED_CATEGORIES;

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'sb-mens-cotton-tshirt',
    nameBn: "Men's Cotton T-Shirt",
    nameEn: "Men's Cotton T-Shirt",
    descriptionBn: 'প্রিমিয়াম ১০০% সুতি কাপড়ের আরামদায়ক টি-শার্ট। প্রতিদিনের ব্যবহারের জন্য আধুনিক ফিট ও টেকসই সেলাই।',
    descriptionEn: 'Premium 100% combed cotton breathable everyday T-shirt with modern tailored fit.',
    category: 'fashion',
    price: 999,
    salePrice: 799,
    isFlashSale: true,
    stock: 120,
    unitLabel: 'M / L / XL',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'sb-everyday-sneakers',
    nameBn: 'Everyday Sneakers',
    nameEn: 'Everyday Sneakers',
    descriptionBn: 'হালকা ও আরামদায়ক কুশনিং সোল যুক্ত প্রিমিয়াম ক্যাজুয়াল স্নিকার্স। দীর্ঘক্ষণ হাঁটা বা প্রতিদিনের স্টাইলে মানানসই।',
    descriptionEn: 'Lightweight cushioned casual sneakers crafted for all-day comfort and street style.',
    category: 'fashion',
    price: 3999,
    salePrice: 3399,
    isFlashSale: true,
    stock: 86,
    unitLabel: 'Size 40 / 41 / 42 / 43',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'sb-smartphone-128gb',
    nameBn: 'Smartphone 128GB',
    nameEn: 'Smartphone 128GB',
    descriptionBn: 'সুপার অ্যামোলেড ডিসপ্লে, ১২৮ জিবি স্টোরেজ ও দীর্ঘস্থায়ী ব্যাটারি লাইফ সমৃদ্ধ অফিসিয়াল ওয়ারেন্টি যুক্ত স্মার্টফোন।',
    descriptionEn: 'High-performance 128GB smartphone featuring crisp display, fast charging, and official warranty.',
    category: 'electronics',
    price: 27999,
    salePrice: 24999,
    isFlashSale: true,
    stock: 45,
    unitLabel: '128GB / Official Warranty',
    imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'sb-face-serum',
    nameBn: 'Face Serum',
    nameEn: 'Face Serum',
    descriptionBn: 'ত্বকের উজ্জ্বলতা ও গভীর ময়েশ্চারাইজিংয়ের জন্য ভিটামিন ও ন্যাচারাল বোটানিক্যাল এক্সট্র্যাক্ট সমৃদ্ধ ফেস সিরাম।',
    descriptionEn: 'Hydrating botanical face serum for radiant, smooth, and nourished skin.',
    category: 'skincare',
    price: 790,
    salePrice: 650,
    isFlashSale: false,
    stock: 90,
    unitLabel: '30ml Dropper Bottle',
    imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'sb-classic-bag',
    nameBn: 'Classic Bag',
    nameEn: 'Classic Bag',
    descriptionBn: 'প্রিমিয়াম ফিনিশিং ও মাল্টি-কম্পার্টমেন্ট ডিজাইনের ক্লাসিক হ্যান্ডব্যাগ। অফিস বা প্রতিদিনের আউটিংয়ের জন্য আদর্শ।',
    descriptionEn: 'Elegant structured classic handbag with spacious compartments and durable hardware.',
    category: 'fashion',
    price: 2200,
    salePrice: 1850,
    isFlashSale: false,
    stock: 50,
    unitLabel: 'Standard Size',
    imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'sb-classic-watch',
    nameBn: 'Classic Watch',
    nameEn: 'Classic Watch',
    descriptionBn: 'মিনিমালিস্ট ডায়াল ও প্রিমিয়াম স্ট্র্যাপের ক্লাসিক রিস্ট ওয়াচ। ফর্মাল ও ক্যাজুয়াল উভয় লুকের সাথে দারুণ মানানসই।',
    descriptionEn: 'Timeless minimalist wrist watch with precision movement and water-resistant casing.',
    category: 'jewellery',
    price: 2600,
    salePrice: 2200,
    isFlashSale: false,
    stock: 64,
    unitLabel: 'Classic Edition',
    imageUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'sb-home-gadget',
    nameBn: 'Home Gadget',
    nameEn: 'Home Gadget',
    descriptionBn: 'আধুনিক ঘর ও ডেইলি লাইফস্টাইল সহজ করার জন্য স্মার্ট ও এনার্জি-সেভিং হোম ইলেকট্রনিক্স গ্যাজেট।',
    descriptionEn: 'Smart everyday home electronics gadget designed for convenience and modern living.',
    category: 'home_lifestyle',
    price: 1550,
    salePrice: 1290,
    isFlashSale: false,
    stock: 72,
    unitLabel: '1 Unit Box',
    imageUrl: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'kr-chak-soho-modhu',
    nameBn: 'প্রাকৃতিক চাক সহ খাঁটি মধু (Raw Honeycomb Honey)',
    nameEn: 'Pure Natural Raw Honeycomb (Chak Soho Modhu)',
    descriptionBn:
      'সম্পূর্ণ প্রাকৃতিক ও অপরিশোধিত মৌচাকসহ খাঁটি মধু। কোনো প্রকার কৃত্রিম চিনি বা কেমিক্যাল ছাড়া সরাসরি চাক থেকে সংগৃহীত। রোগ প্রতিরোধ ক্ষমতা বৃদ্ধিতে ও প্রতিদিনের সুস্বাস্থ্যে অতুলনীয়।',
    descriptionEn:
      '100% raw, unfiltered natural honeycomb honey collected directly from natural hives with zero artificial sugar or additives.',
    category: 'honey',
    price: 1650,
    salePrice: 1290,
    isFlashSale: true,
    stock: 45,
    unitLabel: '১ কেজি / ৫০০ গ্রাম',
    imageUrl: '/uploads/products/chak-soho-modhu.webp',
    galleryUrls: [
      '/uploads/products/chak-soho-modhu.webp',
      '/uploads/products/chak-soho-modhu-2.webp',
    ],
  },
  {
    id: 'kr-black-seed-honey',
    nameBn: 'কালোজিরা ফুলের খাঁটি মধু (Black Seed Flower Honey)',
    nameEn: 'Pure Black Seed Flower Honey (Kalojira Modhu)',
    descriptionBn:
      'ল্যাব-টেস্টেড ১০০% বিশুদ্ধ কালোজিরা ফুলের মধু। সর্দি-কাশি উপশম, হজমশক্তি বৃদ্ধি এবং শরীরের রোগ প্রতিরোধ ক্ষমতা বাড়াতে কালোজিরা ফুলের মধু অত্যন্ত কার্যকরী।',
    descriptionEn:
      'Lab-tested 100% pure Black Seed (Nigella Sativa) flower honey with rich medicinal properties and natural aroma.',
    category: 'honey',
    price: 1450,
    salePrice: 1150,
    isFlashSale: true,
    stock: 60,
    unitLabel: '১ কেজি / ৫০০ গ্রাম',
    imageUrl: '/uploads/products/black-seed-honey.webp',
    galleryUrls: [
      '/uploads/products/black-seed-honey.webp',
      '/uploads/products/black-seed-honey-2.jpg',
    ],
  },
  {
    id: 'kr-eid-special-combo-set',
    nameBn: 'খাঁটিরাজ ঈদ স্পেশাল ফ্যামিলি কম্বো সেট (Eid Special Combo Set)',
    nameEn: 'KhatiRaj Eid Special Family Combo Set',
    descriptionBn:
      'খাঁটিরাজ বিডির সবচেয়ে জনপ্রিয় ঈদ ও ফেস্টিভাল কম্বো প্যাক! প্রিয়জনদের উপহার বা পরিবারের সবার জন্য প্রাকৃতিক ও প্রিমিয়াম পণ্যের সাশ্রয়ী বান্ডেল সেট।',
    descriptionEn:
      'Best-selling festive combo bundle featuring KhatiRaj BD signature natural and household essentials at a special discount.',
    category: 'combo',
    price: 2400,
    salePrice: 1790,
    isFlashSale: true,
    stock: 30,
    unitLabel: 'ফুল কম্বো সেট / রেগুলার প্যাক',
    imageUrl: '/uploads/products/eid-special-combo-set.webp',
    galleryUrls: [
      '/uploads/products/eid-special-combo-set.webp',
      '/uploads/products/eid-special-combo-2.webp',
      '/uploads/products/eid-special-combo.webp',
    ],
  },
  {
    id: 'kr-bihado-gold-snail-gel',
    nameBn: 'Bihado 24K Gold & Snail Soothing Gel — 300ml',
    nameEn: 'Bihado 24K Gold & Snail Soothing Gel - 300ml',
    descriptionBn:
      'ত্বকের উজ্জ্বলতা বৃদ্ধি, গভীর ময়েশ্চারাইজিং এবং বয়সের ছাপ দূর করতে ২৪ ক্যারেট গোল্ড ও স্নেইল এক্সট্র্যাক্ট সমৃদ্ধ সুদিং জেল। সব ধরনের ত্বকের জন্য উপযোগী।',
    descriptionEn:
      'Authentic Bihado 24K Gold & Snail Soothing Gel (300ml) for deep hydration, skin soothing, and natural radiance.',
    category: 'skincare',
    price: 850,
    salePrice: 590,
    isFlashSale: true,
    stock: 50,
    unitLabel: '300ml Jar / Combo 2x',
    imageUrl: '/uploads/products/bihado-gold-snail-gel.webp',
  },
  {
    id: 'kr-manee-gluta-collagen',
    nameBn: 'Manee Gluta Collagen Pink Dietary Supplement — KhatiRaj BD',
    nameEn: 'Manee Gluta Collagen Pink Dietary Supplement',
    descriptionBn:
      ' ভেতর থেকে ত্বক উজ্জ্বল, টানটান ও সতেজ রাখতে প্রিমিয়াম গ্লুটাথায়ন ও মেরিন কোলাজেন সমৃদ্ধ ড্রিঙ্ক সাপ্লিমেন্ট। চুল ও নখের স্বাস্থ্য ভালো রাখতেও সহায়তা করে।',
    descriptionEn:
      'Premium Manee Gluta Collagen Pink dietary supplement for glowing skin, hair, and nail nourishment.',
    category: 'skincare',
    price: 1450,
    salePrice: 1090,
    isFlashSale: false,
    stock: 38,
    unitLabel: '১ প্যাক (৩০ স্যাশে) / ২ প্যাক',
    imageUrl: '/uploads/products/manee-gluta-collagen.webp',
  },
  {
    id: 'kr-saffron-whitening-soap',
    nameBn: 'Premium Saffron Whitening Soap — 100gm (জাফরান ব্রাইটেনিং সোপ)',
    nameEn: 'Premium Saffron Whitening Soap 100gm',
    descriptionBn:
      'আসল কাশ্মীরি জাফরান ও প্রাকৃতিক ভেষজ উপাদানে তৈরি প্রিমিয়াম হোয়াইটেনিং সোপ। রোদে পোড়া দাগ দূর করে ত্বককে করে কোমল ও উজ্জ্বল।',
    descriptionEn:
      'Enriched with real saffron extracts to gently cleanse, brighten complexion, and reduce dark spots.',
    category: 'skincare',
    price: 490,
    salePrice: 320,
    isFlashSale: false,
    stock: 85,
    unitLabel: '100gm Bar / Pack of 2',
    imageUrl: '/uploads/products/saffron-whitening-soap.webp',
  },
  {
    id: 'kr-detox-plum',
    nameBn: 'ন্যাচারাল ডিটক্স প্লাম ওয়েলনেস প্যাক (Natural Detox Plum)',
    nameEn: 'Natural Fermented Detox Plum Wellness Pack',
    descriptionBn:
      'প্রাকৃতিক ফার্মেন্টেড প্লাম ও ভেষজ উপাদানে তৈরি ডিটক্স প্লাম, যা হজমশক্তি উন্নত করে, পেট পরিষ্কার রাখে এবং অতিরিক্ত ওজন নিয়ন্ত্রণে সহায়তা করে।',
    descriptionEn:
      'Natural fermented detox plum for digestive wellness, gut cleansing, and healthy metabolism support.',
    category: 'wellness',
    price: 1200,
    salePrice: 890,
    isFlashSale: true,
    stock: 42,
    unitLabel: '১ বক্স / ২ বক্স কম্বো',
    imageUrl: '/uploads/products/detox-plum.webp',
  },
  {
    id: 'kr-premium-iron-chapati',
    nameBn: 'প্রিমিয়াম হেভি-ডিউটি লোহার চাপাতি (Hand-Forged Iron Cleaver)',
    nameEn: 'Premium Hand-Forged Heavy-Duty Iron Chapati Cleaver',
    descriptionBn:
      'কামারশালায় বিশেষভাবে তৈরি মজবুত ও নিখুঁত ব্যালেন্সড প্রিমিয়াম লোহার চাপাতি। কুরবানি বা প্রতিদিনের বড় মাছ ও মাংস কাটার জন্য দীর্ঘস্থায়ী ধার এবং মজবুত কাঠের হাতল।',
    descriptionEn:
      'Traditional Bangladeshi hand-forged high-carbon iron cleaver (Chapati) with ergonomic hardwood grip.',
    category: 'kitchen_cutlery',
    price: 1150,
    salePrice: 850,
    isFlashSale: true,
    stock: 55,
    unitLabel: 'হেভি ডিউটি ১ পিস / কম্বো সেট',
    imageUrl: '/uploads/products/premium-iron-chapati.webp',
  },
  {
    id: 'kr-multipurpose-sharp-knife',
    nameBn: 'বহুমুখী সুপার-শার্প কিচেন ছুরি (Multipurpose Sharp Chef Knife)',
    nameEn: 'Multipurpose Super-Sharp Kitchen Chef Knife',
    descriptionBn:
      'মাংস স্লাইস করা, সবজি কাটা এবং রান্নাঘরের যেকোনো কাজের জন্য স্টেইনলেস ও হাই-কার্বন স্টিলের বহুমুখী ধারালো ছুরি। আরামদায়ক নন-স্লিপ গ্রিপ।',
    descriptionEn:
      'Ultra-sharp multipurpose kitchen knife designed for effortless slicing, dicing, and meat preparation.',
    category: 'kitchen_cutlery',
    price: 650,
    salePrice: 450,
    isFlashSale: false,
    stock: 70,
    unitLabel: 'মিডিয়াম ৮ ইঞ্চি / লার্জ ১০ ইঞ্চি',
    imageUrl: '/uploads/products/multipurpose-sharp-knife.webp',
  },
  {
    id: 'kr-kitchen-small-knife',
    nameBn: 'রান্নাঘরের ছোট ইউটিলিটি ছুরি (Kitchen Paring & Utility Knife)',
    nameEn: 'Everyday Kitchen Small Utility & Paring Knife',
    descriptionBn:
      'ফল কাটা, পেঁয়াজ-রসুন কুচি ও প্রতিদিনের রান্নাঘরের সূক্ষ্ম কাজের জন্য হালকা ও অত্যন্ত ধারালো ছোট ছুরি।',
    descriptionEn:
      'Compact, razor-sharp kitchen utility knife ideal for peeling fruits, slicing vegetables, and daily prep.',
    category: 'kitchen_cutlery',
    price: 380,
    salePrice: 250,
    isFlashSale: false,
    stock: 95,
    unitLabel: '১ পিস / ২ পিস প্যাক',
    imageUrl: '/uploads/products/kitchen-small-knife.webp',
  },
  {
    id: 'kr-eid-special-combo-2',
    nameBn: 'ঈদ স্পেশাল কিচেন ও মধু মেগা বান্ডেল (Eid Special Combo 2)',
    nameEn: 'Eid Special Honey & Kitchen Cutlery Mega Bundle',
    descriptionBn:
      'চাপাতি, ধারালো ছুরি এবং খাঁটিরাজের বিশেষ ঈদ কম্বো সেট—একসাথে অর্ডার করলেই পাচ্ছেন বিশেষ মূল্যছাড় ও দ্রুত হোম ডেলিভারি।',
    descriptionEn:
      'Complete Eid preparation bundle combining KhatiRaj kitchen cutlery and authentic natural food products.',
    category: 'combo',
    price: 1950,
    salePrice: 1490,
    isFlashSale: true,
    stock: 28,
    unitLabel: 'মেগা বান্ডেল সেট',
    imageUrl: '/uploads/products/eid-special-combo-2.webp',
  },
];

export const SEED_COUPONS: Coupon[] = [
  {
    id: 'coupon-khatiraj10',
    code: 'KHATIRAJ10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 800,
    descriptionBn: 'যেকোনো অর্ডারে ১০% বিশেষ ডিসকাউন্ট (ন্যূনতম ৳৮০০)',
    descriptionEn: '10% OFF on orders over ৳800',
    isActive: true,
  },
  {
    id: 'coupon-eid200',
    code: 'EID200',
    discountType: 'fixed',
    discountValue: 200,
    minOrderAmount: 1500,
    descriptionBn: '৳১,৫০০+ অর্ডারে নগদ ৳২০০ ছাড়!',
    descriptionEn: 'Flat ৳200 OFF on orders over ৳1,500',
    isActive: true,
  },
  {
    id: 'coupon-honey15',
    code: 'HONEY15',
    discountType: 'percentage',
    discountValue: 15,
    minOrderAmount: 2000,
    descriptionBn: 'মধু ও কম্বো প্যাকে ১৫% মেগা ছাড় (৳২,০০০+ অর্ডারে)',
    descriptionEn: '15% OFF on Honey & Combo orders over ৳2,000',
    isActive: true,
  },
];

export const SEED_SLIDERS: SliderItem[] = [
  {
    id: 'slider-hero-1',
    titleBn: 'খাঁটিরাজ বিডি — বিশ্বস্ততার সাথে ১০০% খাঁটি ও প্রিমিয়াম পণ্য',
    titleEn: 'KhatiRaj BD — 100% Authentic Organic Food, Skincare & Kitchen Essentials',
    subtitleBn:
      'কালোজিরা ফুলের মধু, চাক সহ মধু, বিহাডো গোল্ড জেল এবং প্রিমিয়াম কিচেন চাপাতি-ছুরি পাচ্ছেন সারা বাংলাদেশে ক্যাশ অন ডেলিভারিতে!',
    subtitleEn:
      'Shop pure Black Seed Honey, Raw Honeycomb, Authentic Skincare & Hand-Forged Cutlery with nationwide Cash on Delivery.',
    btnTextBn: 'সকল পণ্য দেখুন',
    btnTextEn: 'Shop Now',
    btnLink: '#catalog',
    imageUrl: '/uploads/products/khatiraj-hero.jpeg',
    sliderType: 'hero',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'slider-hero-2',
    titleBn: 'ঈদ ও ফেস্টিভাল স্পেশাল কম্বো অফারে সর্বোচ্চ ৩০% ছাড়!',
    titleEn: 'Up to 30% OFF on Eid Special Combo Packs',
    subtitleBn:
      'অগ্রিম ১ টাকাও দিতে হবে না—পণ্য হাতে পেয়ে দেখে, যাচাই করে ডেলিভারি ম্যানকে মূল্য পরিশোধ করুন অথবা বিকাশ/নগদে পেমেন্ট করুন।',
    subtitleEn:
      'Order with 0৳ advance Cash on Delivery or instant bKash/Nagad/Rocket verification.',
    btnTextBn: 'কম্বো অফার দেখুন',
    btnTextEn: 'Explore Combos',
    btnLink: '#catalog',
    imageUrl: '/uploads/products/eid-special-combo-set.webp',
    sliderType: 'hero',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'slider-promo-1',
    titleBn: '১০০% প্রাকৃতিক চাক সহ মধু ও কালোজিরা ফুলের মধু',
    titleEn: '100% Raw Honeycomb & Black Seed Flower Honey',
    subtitleBn: 'সরাসরি মৌচাক থেকে সংগৃহীত ল্যাব-টেস্টেড খাঁটি মধু এখন বিশেষ মূল্যে',
    subtitleEn: 'Directly harvested pure honey with 7-day easy return guarantee',
    btnTextBn: 'মধু অর্ডার করুন',
    btnTextEn: 'Order Honey',
    btnLink: '#catalog',
    imageUrl: '/uploads/products/chak-soho-modhu.webp',
    sliderType: 'promo',
    isActive: true,
    sortOrder: 3,
  },
];

export const SEED_BLOG_POSTS: BlogPost[] = [
  {
    id: 'blog-1',
    titleBn: 'কালোজিরা ফুলের মধু ও চাক সহ মধু কেনার আগে আসল-নকল চেনার উপায়',
    titleEn: 'How to Identify 100% Pure Black Seed & Raw Honeycomb Honey',
    categoryBn: 'অর্গানিক ফুড ও স্বাস্থ্য',
    excerptBn:
      'খাঁটি কালোজিরা ফুলের মধুর ঘ্রাণ, ঘনত্ব এবং চাক সহ মধুর পুষ্টিগুণ সম্পর্কে বিস্তারিত জানুন খাঁটিরাজ বিডির বিশেষ গাইডে।',
    contentBn:
      'মধু প্রকৃতির অন্যতম সেরা নিয়ামত। বিশেষ করে কালোজিরা ফুলের মধু এবং চাক সহ প্রাকৃতিক মধুতে রয়েছে প্রচুর অ্যান্টিঅক্সিডেন্ট, এনজাইম ও মিনারেল। খাঁটিরাজ বিডি সরাসরি মৌয়াল ও খামার থেকে সংগৃহীত ১০০% ল্যাব-টেস্টেড মধু সরবরাহ করে, যাতে কোনো কৃত্রিম চিনি বা সিরাপ মেশানো হয় না। প্রতিদিন সকালে এক চামচ খাঁটি মধু হালকা গরম পানির সাথে খেলে রোগ প্রতিরোধ ক্ষমতা বহুগুণ বৃদ্ধি পায়।',
    imageUrl: '/uploads/products/black-seed-honey.webp',
    authorName: 'KhatiRaj Health Team',
    isPublished: true,
  },
  {
    id: 'blog-2',
    titleBn: 'ত্বকের যত্নে ২৪ ক্যারেট গোল্ড ও স্নেইল সুদিং জেল এবং জাফরান সোপের উপকারিতা',
    titleEn: 'Skincare Benefits of 24K Gold Snail Gel & Saffron Whitening Soap',
    categoryBn: 'স্কিন কেয়ার টিপস',
    excerptBn:
      'রোদে পোড়া দাগ দূর করতে এবং ত্বকের প্রাকৃতিক আর্দ্রতা ধরে রাখতে Bihado 24K Gold Gel ও Saffron Soap ব্যবহারের সঠিক নিয়ম।',
    contentBn:
      'বাংলাদেশের আবহাওয়ায় ধুলোবালি ও রোদের কারণে ত্বক দ্রুত নিষ্প্রভ হয়ে পড়ে। প্রতিদিন মুখ পরিষ্কার করতে প্রাকৃতিক জাফরান সমৃদ্ধ Premium Saffron Whitening Soap এবং রাতে ঘুমানোর আগে Bihado 24K Gold & Snail Soothing Gel ব্যবহার করলে ত্বক ভেতর থেকে হাইড্রেটেড ও উজ্জ্বল থাকে।',
    imageUrl: '/uploads/products/bihado-gold-snail-gel.webp',
    authorName: 'KhatiRaj Beauty Desk',
    isPublished: true,
  },
  {
    id: 'blog-3',
    titleBn: 'কুরবানি ও রান্নাঘরের জন্য লোহার চাপাতি ও ধারালো ছুরি দীর্ঘদিন নতুনের মতো রাখার উপায়',
    titleEn: 'Care Guide for Hand-Forged Iron Cleavers and Kitchen Knives',
    categoryBn: 'কিচেন ও লাইফস্টাইল',
    excerptBn:
      'লোহার চাপাতি ও স্টিলের ছুরি ব্যবহারের পর মরিচা রোধ করতে এবং ধার বজায় রাখতে এই ৩টি সহজ নিয়ম মেনে চলুন।',
    contentBn:
      'হাই-কার্বন লোহার চাপাতি ও ছুরি অত্যন্ত মজবুত ও দীর্ঘস্থায়ী ধার দেয়। প্রতিবার ব্যবহারের পর পরিষ্কার পানি দিয়ে ধুয়ে শুকনো কাপড় দিয়ে মুছে রাখুন এবং দীর্ঘদিন সংরক্ষণের সময় হালকা সরিষার তেল বা নারিকেল তেল মেখে রাখলে কখনোই মরিচা পড়বে না।',
    imageUrl: '/uploads/products/premium-iron-chapati.webp',
    authorName: 'KhatiRaj Team',
    isPublished: true,
  },
];

export const SEED_LANDING_PAGES: LandingPageItem[] = [
  {
    id: 'lp-chak-modhu',
    slug: 'chak-soho-modhu-offer',
    titleBn: '১০০% প্রাকৃতিক চাক সহ খাঁটি মধু — স্পেশাল ডিসকাউন্ট ক্যাম্পেইন',
    subtitleBn:
      'কোনো অগ্রিম পেমেন্ট ছাড়াই অর্ডার করুন! ডেলিভারি ম্যানের সামনে চাক সহ মধু দেখে ও খেয়ে সন্তুষ্ট হয়ে মূল্য পরিশোধ করুন।',
    productId: 'kr-chak-soho-modhu',
    heroImageUrl: '/uploads/products/chak-soho-modhu.webp',
    bulletPointsSummary:
      '১০০% প্রাকৃতিক ও অপরিশোধিত মৌচাকসহ মধু | কোনো কৃত্রিম চিনি বা কেমিক্যাল নেই | সর্দি-কাশি ও রোগ প্রতিরোধ ক্ষমতা বৃদ্ধিতে অতুলনীয় | সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা',
    specialOfferText: 'আজকে অর্ডার করলেই পাচ্ছেন ৳৩৬০ নগদ মূল্যছাড়!',
    isActive: true,
  },
  {
    id: 'lp-eid-combo',
    slug: 'eid-special-combo',
    titleBn: 'খাঁটিরাজ ঈদ স্পেশাল মেগা কম্বো প্যাক — সীমিত সময়ের অফার',
    subtitleBn:
      'পরিবারের সবার জন্য খাঁটিরাজ বিডির বেস্ট-সেলিং কম্বো প্যাক এখন বিশেষ ছাড়ে!',
    productId: 'kr-eid-special-combo-set',
    heroImageUrl: '/uploads/products/eid-special-combo-set.webp',
    bulletPointsSummary:
      'প্রিমিয়াম কোয়ালিটি গ্যারান্টি | ৭ দিনের সহজ রিটার্ন ও রিপ্লেসমেন্ট সুবিধা | ঢাকায় ২৪-৪৮ ঘণ্টায় দ্রুত ডেলিভারি | ক্যাশ অন ডেলিভারি ও বিকাশ/নগদ পেমেন্ট সুবিধা',
    specialOfferText: 'স্পেশাল কম্বো অফারে ৳৬১০ সাশ্রয়!',
    isActive: true,
  },
];

export const SEED_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    productId: 'kr-chak-soho-modhu',
    productName: 'প্রাকৃতিক চাক সহ খাঁটি মধু (Raw Honeycomb Honey)',
    customerName: 'মোঃ তানভীর আহমেদ (ঢাকা)',
    rating: 5,
    comment:
      'আলহামদুলিল্লাহ, চাক সহ মধুটা একদম অরিজিনাল পেয়েছি। প্যাকিং খুব সুন্দর ছিল এবং স্বাদ ও ঘ্রাণ অসাধারণ।',
    status: 'Approved',
    adminReply: 'অসংখ্য ধন্যবাদ ভাইয়া! খাঁটিরাজ বিডির সাথেই থাকবেন।',
  },
  {
    id: 'rev-2',
    productId: 'kr-black-seed-honey',
    productName: 'কালোজিরা ফুলের খাঁটি মধু (Black Seed Flower Honey)',
    customerName: 'সাদিয়া ইসলাম (চট্টগ্রাম)',
    rating: 5,
    comment:
      'কালোজিরা ফুলের মধুর ঘ্রাণটা একদম আসল। বাচ্চাদের প্রতিদিন সকালে দিচ্ছি, অনেক ভালো মানের মধু।',
    status: 'Approved',
    adminReply: 'আপনার মূল্যবান রিভিউয়ের জন্য ধন্যবাদ আপু!',
  },
  {
    id: 'rev-3',
    productId: 'kr-premium-iron-chapati',
    productName: 'প্রিমিয়াম হেভি-ডিউটি লোহার চাপাতি (Hand-Forged Iron Cleaver)',
    customerName: 'রফিকুল ইসলাম (সিলেট)',
    rating: 5,
    comment:
      'চাপাতিটা বেশ ভারী এবং অনেক ধারালো। হাতলের গ্রিপটাও খুব মজবুত। দাম অনুযায়ী সেরা জিনিস।',
    status: 'Approved',
    adminReply: 'ধন্যবাদ স্যার! আপনার সন্তুষ্টিই আমাদের অনুপ্রেরণা।',
  },
  {
    id: 'rev-4',
    productId: 'kr-bihado-gold-snail-gel',
    productName: 'Bihado 24K Gold & Snail Soothing Gel — 300ml',
    customerName: 'নুসরাত জাহান (রাজশাহী)',
    rating: 5,
    comment:
      'অরিজিনাল সুদিং জেল পেয়েছি, ত্বকে মাখলে অনেক ফ্রেশ লাগে। ডেলিভারিও মাত্র ২ দিনে পেয়েছি।',
    status: 'Approved',
    adminReply: 'অসংখ্য ধন্যবাদ আপু!',
  },
];

export const SEED_ABANDONED_CARTS: AbandonedCart[] = [
  {
    id: 'ab-1001',
    cartCode: 'ab-1001',
    customerName: 'আরিফুল ইসলাম',
    customerPhone: '01712987654',
    district: 'Dhaka',
    address: 'মিরপুর ১০, ঢাকা',
    itemsSummary: '1x প্রাকৃতিক চাক সহ খাঁটি মধু (১ কেজি) @ ৳1290',
    subtotal: 1290,
    recoveryStatus: 'New',
  },
];

export const RECENT_SALES_NOTIFICATIONS = [
  {
    customer: 'মাহমুদুল হাসান (উত্তরা, ঢাকা)',
    product: 'প্রাকৃতিক চাক সহ খাঁটি মধু (১ কেজি)',
    timeAgoBn: '৩ মিনিট আগে অর্ডার করেছেন',
    timeAgoEn: 'Ordered 3 mins ago',
    image: '/uploads/products/chak-soho-modhu.webp',
  },
  {
    customer: 'ফারহানা আক্তার (চট্টগ্রাম)',
    product: 'কালোজিরা ফুলের খাঁটি মধু',
    timeAgoBn: '৭ মিনিট আগে অর্ডার করেছেন',
    timeAgoEn: 'Ordered 7 mins ago',
    image: '/uploads/products/black-seed-honey.webp',
  },
  {
    customer: 'কামরুল ইসলাম (সিলেট)',
    product: 'খাঁটিরাজ ঈদ স্পেশাল কম্বো সেট',
    timeAgoBn: '১২ মিনিট আগে অর্ডার করেছেন',
    timeAgoEn: 'Ordered 12 mins ago',
    image: '/uploads/products/eid-special-combo-set.webp',
  },
  {
    customer: 'তাসনিম জারা (ধানমন্ডি, ঢাকা)',
    product: 'Bihado 24K Gold & Snail Gel',
    timeAgoBn: '১৮ মিনিট আগে অর্ডার করেছেন',
    timeAgoEn: 'Ordered 18 mins ago',
    image: '/uploads/products/bihado-gold-snail-gel.webp',
  },
];

export const BANGLADESH_DISTRICTS: {
  value: string;
  labelBn: string;
  labelEn: string;
  zone: DeliveryZone;
}[] = [
  { value: 'Dhaka', labelBn: 'ঢাকা (Dhaka)', labelEn: 'Dhaka', zone: 'inside_dhaka' },
  { value: 'Gazipur', labelBn: 'গাজীপুর (Gazipur)', labelEn: 'Gazipur', zone: 'outside_dhaka' },
  { value: 'Narayanganj', labelBn: 'নারায়ণগঞ্জ (Narayanganj)', labelEn: 'Narayanganj', zone: 'outside_dhaka' },
  { value: 'Chattogram', labelBn: 'চট্টগ্রাম (Chattogram)', labelEn: 'Chattogram', zone: 'outside_dhaka' },
  { value: 'Sylhet', labelBn: 'সিলেট (Sylhet)', labelEn: 'Sylhet', zone: 'outside_dhaka' },
  { value: 'Rajshahi', labelBn: 'রাজশাহী (Rajshahi)', labelEn: 'Rajshahi', zone: 'outside_dhaka' },
  { value: 'Khulna', labelBn: 'খুলনা (Khulna)', labelEn: 'Khulna', zone: 'outside_dhaka' },
  { value: 'Barishal', labelBn: 'বরিশাল (Barishal)', labelEn: 'Barishal', zone: 'outside_dhaka' },
  { value: 'Rangpur', labelBn: 'রংপুর (Rangpur)', labelEn: 'Rangpur', zone: 'outside_dhaka' },
  { value: 'Mymensingh', labelBn: 'ময়মনসিংহ (Mymensingh)', labelEn: 'Mymensingh', zone: 'outside_dhaka' },
  { value: 'Cumilla', labelBn: 'কুমিল্লা (Cumilla)', labelEn: 'Cumilla', zone: 'outside_dhaka' },
  { value: 'Bogura', labelBn: 'বগুড়া (Bogura)', labelEn: 'Bogura', zone: 'outside_dhaka' },
  { value: 'Jashore', labelBn: 'যশোর (Jashore)', labelEn: 'Jashore', zone: 'outside_dhaka' },
  { value: 'CoxsBazar', labelBn: 'কক্সবাজার (Cox’s Bazar)', labelEn: 'Cox’s Bazar', zone: 'outside_dhaka' },
  { value: 'Noakhali', labelBn: 'নোয়াখালী (Noakhali)', labelEn: 'Noakhali', zone: 'outside_dhaka' },
  { value: 'Feni', labelBn: 'ফেনী (Feni)', labelEn: 'Feni', zone: 'outside_dhaka' },
  { value: 'Tangail', labelBn: 'টাঙ্গাইল (Tangail)', labelEn: 'Tangail', zone: 'outside_dhaka' },
  { value: 'Faridpur', labelBn: 'ফরিদপুর (Faridpur)', labelEn: 'Faridpur', zone: 'outside_dhaka' },
  { value: 'Pabna', labelBn: 'পাবনা (Pabna)', labelEn: 'Pabna', zone: 'outside_dhaka' },
  { value: 'Kushtia', labelBn: 'কুষ্টিয়া (Kushtia)', labelEn: 'Kushtia', zone: 'outside_dhaka' },
  { value: 'Dinajpur', labelBn: 'দিনাজপুর (Dinajpur)', labelEn: 'Dinajpur', zone: 'outside_dhaka' },
];
