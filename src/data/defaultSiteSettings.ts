import { PaymentGatewayOption, SiteSettings } from '../types';

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
  flashSaleEndTime: '2026-12-31T23:59:59.000Z',
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
    instructionsBn:
      'আপনার বিকাশ অ্যাপ থেকে Send Money অপশনে গিয়ে উপরের নম্বরে টাকা পাঠিয়ে Transaction ID দিন।',
    instructionsEn:
      'Open your bKash app, select Send Money to the number above, and enter the Transaction ID.',
  },
  {
    id: 'Nagad',
    nameBn: 'নগদ (Nagad)',
    nameEn: 'Nagad Personal',
    logoUrl: '/assets/images/payments/nagad.png',
    brandColor: '#d12026',
    accountNumberKey: 'nagadNumber',
    instructionsBn:
      'আপনার নগদ অ্যাপ থেকে Send Money অপশনে গিয়ে উপরের নম্বরে টাকা পাঠিয়ে Transaction ID দিন।',
    instructionsEn:
      'Open your Nagad app, select Send Money to the number above, and enter the Transaction ID.',
  },
  {
    id: 'Rocket',
    nameBn: 'রকেট (Rocket)',
    nameEn: 'DBBL Rocket',
    logoUrl: '/assets/images/payments/rocket.png',
    brandColor: '#8c3494',
    accountNumberKey: 'rocketNumber',
    instructionsBn:
      'রকেট অ্যাপ বা *322# ডায়াল করে উপরের নম্বরে Send Money করে Transaction ID দিন।',
    instructionsEn:
      'Send Money via Rocket app or *322# to the number above and enter the Transaction ID.',
  },
  {
    id: 'Upay',
    nameBn: 'উপায় (Upay)',
    nameEn: 'Upay Wallet',
    logoUrl: '/assets/images/payments/upay.png',
    brandColor: '#ffc40c',
    accountNumberKey: 'upayNumber',
    instructionsBn:
      'উপায় অ্যাপ থেকে Send Money করে আপনার Transaction ID নিচের বক্সে লিখুন।',
    instructionsEn:
      'Send Money via Upay app and enter your Transaction ID below.',
  },
  {
    id: 'Bank',
    nameBn: 'ব্যাংক ট্রান্সফার (Bank)',
    nameEn: 'Bank Transfer / NPSB',
    logoUrl: '/assets/images/payments/citybank.png',
    brandColor: '#1a2b3c',
    accountNumberKey: 'bankDetails',
    instructionsBn:
      'ব্যাংক অ্যাকাউন্টে NPSB/BEFTN ট্রান্সফার করে রেফারেন্স বা ট্রানজেকশন নম্বরটি দিন।',
    instructionsEn:
      'Transfer via NPSB/BEFTN to the bank account and submit your reference ID.',
  },
];
