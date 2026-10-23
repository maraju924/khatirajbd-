import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Minus,
  Plus,
  Printer,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import { doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  CartItem,
  Coupon,
  DeliveryZone,
  Language,
  Order,
  PaymentMethodType,
  SiteSettings,
  UserProfile,
} from '../types';
import {
  BANGLADESH_DISTRICTS,
  DEFAULT_SITE_SETTINGS,
  KHATIRAJ_LOGO_URL,
  PAYMENT_GATEWAY_OPTIONS,
} from '../data/seedCatalog';
import { ProductImage } from './ProductImage';

interface CartDrawerProps {
  isOpen: boolean;
  initialStep?: 'cart' | 'checkout';
  startInCheckout?: boolean;
  lang: Language;
  cart: CartItem[];
  coupons: Coupon[];
  siteSettings?: SiteSettings;
  user?: User | null;
  userProfile?: UserProfile | null;
  onClose: () => void;
  onUpdateQuantity?: (productId: string, selectedVariant: string, delta: number) => void;
  onUpdateQty?: (productId: string, selectedVariant: string, delta: number) => void;
  onRemoveItem?: (productId: string, selectedVariant: string) => void;
  onRemove?: (productId: string, selectedVariant: string) => void;
  onClearCart: () => void;
  onOrderCreated: (order: Order) => void;
}

function getEffectiveCartItemUnitPrice(item: CartItem): number {
  let baseUnit =
    typeof item.variantPrice === 'number' && item.variantPrice > 0
      ? item.variantPrice
      : item.product.salePrice < item.product.price
      ? item.product.salePrice
      : item.product.price;

  if (Array.isArray(item.product.variants) && item.product.variants.length > 0) {
    const matchedVar = item.product.variants.find(
      (v) => v.label === item.selectedVariant
    );
    if (matchedVar) {
      baseUnit =
        matchedVar.salePrice < matchedVar.regularPrice
          ? matchedVar.salePrice
          : matchedVar.regularPrice;
    }
  }

  if (
    Array.isArray(item.product.wholesaleTiers) &&
    item.product.wholesaleTiers.length > 0
  ) {
    const activeTier = [...item.product.wholesaleTiers]
      .sort((a, b) => a.minQty - b.minQty)
      .reverse()
      .find((t) => item.quantity >= t.minQty);
    if (activeTier && activeTier.discountPercent > 0) {
      return Math.max(
        1,
        Math.round(baseUnit * (1 - activeTier.discountPercent / 100))
      );
    }
  }

  return baseUnit;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  initialStep,
  startInCheckout = false,
  lang,
  cart,
  coupons,
  siteSettings = DEFAULT_SITE_SETTINGS,
  user,
  userProfile,
  onClose,
  onUpdateQuantity,
  onUpdateQty,
  onRemoveItem,
  onRemove,
  onClearCart,
  onOrderCreated,
}) => {
  const resolvedInitialStep = initialStep || (startInCheckout ? 'checkout' : 'cart');
  const handleQtyChange = onUpdateQuantity || onUpdateQty || (() => {});
  const handleRemove = onRemoveItem || onRemove || (() => {});

  const [step, setStep] = useState<'cart' | 'checkout' | 'online_payment' | 'receipt'>(
    resolvedInitialStep
  );
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>('inside_dhaka');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [address, setAddress] = useState('');
  const [paymentChoice, setPaymentChoice] = useState<'COD' | 'ONLINE'>('COD');
  const [selectedGateway, setSelectedGateway] = useState<PaymentMethodType>('bKash');
  const [transactionId, setTransactionId] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [copiedAccount, setCopiedAccount] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Pre-fill customer name & phone if user is signed in
  useEffect(() => {
    if (userProfile?.displayName && !customerName) {
      setCustomerName(userProfile.displayName);
    } else if (user?.displayName && !customerName) {
      setCustomerName(user.displayName);
    }
    if (userProfile?.phone && !customerPhone) {
      setCustomerPhone(userProfile.phone);
    }
  }, [user, userProfile]);

  useEffect(() => {
    if (isOpen && step !== 'receipt' && step !== 'online_payment') {
      setStep(resolvedInitialStep);
    }
  }, [isOpen, resolvedInitialStep]);

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => {
    const unitPrice = getEffectiveCartItemUnitPrice(item);
    return sum + unitPrice * item.quantity;
  }, 0);

  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const hasFreeDeliveryProduct = cart.some((item) => item.product.freeDelivery === true);

  let discountAmount = 0;
  if (appliedCoupon && appliedCoupon.isActive && subtotal >= appliedCoupon.minOrderAmount) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = Math.round((subtotal * appliedCoupon.discountValue) / 100);
    } else {
      discountAmount = appliedCoupon.discountValue;
    }
    discountAmount = Math.min(discountAmount, subtotal);
  }

  const insideFee = siteSettings.insideDhakaCharge ?? 60;
  const outsideFee = siteSettings.outsideDhakaCharge ?? 120;
  const freeThreshold = siteSettings.freeDeliveryThreshold ?? 3000;

  const baseShipping = deliveryZone === 'inside_dhaka' ? insideFee : outsideFee;
  const deliveryCharge =
    hasFreeDeliveryProduct || subtotal >= freeThreshold || subtotal === 0
      ? 0
      : baseShipping;
  const totalPayable = Math.max(0, subtotal - discountAmount + deliveryCharge);

  const activeCoupons = coupons.filter((c) => c.isActive);

  const handleApplyCoupon = (codeToTry?: string) => {
    const targetCode = (codeToTry ?? couponInput).trim().toUpperCase();
    if (!targetCode) return;
    setCouponInput(targetCode);

    const found = activeCoupons.find((c) => c.code.toUpperCase() === targetCode);
    if (!found) {
      setAppliedCoupon(null);
      setCouponMessage({
        type: 'error',
        text: lang === 'bn' ? 'কুপন কোডটি সঠিক নয় বা মেয়াদ শেষ হয়েছে' : 'Invalid or expired coupon code',
      });
      return;
    }

    if (subtotal < found.minOrderAmount) {
      setAppliedCoupon(null);
      setCouponMessage({
        type: 'error',
        text:
          lang === 'bn'
            ? `এই কুপন ব্যবহার করতে ন্যূনতম ৳${found.minOrderAmount.toLocaleString('en-BD')} অর্ডার প্রয়োজন`
            : `Minimum order of ৳${found.minOrderAmount.toLocaleString('en-BD')} required for ${found.code}`,
      });
      return;
    }

    setAppliedCoupon(found);
    setCouponMessage({
      type: 'success',
      text:
        lang === 'bn'
          ? `${found.code} কুপন প্রযোজ্য হয়েছে!`
          : `Coupon ${found.code} applied!`,
    });
  };

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    const districtObj = BANGLADESH_DISTRICTS.find((d) => d.value === newDistrict);
    if (districtObj) {
      setDeliveryZone(districtObj.zone);
    }
  };

  // Save Abandoned Cart lead when customer types valid phone number
  const handleSaveAbandonedCart = async () => {
    const cleanPhone = customerPhone.replace(/[\s\-+88]/g, '').trim();
    if (!/^01[3-9][0-9]{8}$/.test(cleanPhone) || cart.length === 0) return;

    const cartCode = `ab-${cleanPhone}`;
    const itemsSummary = cart
      .map((item) => {
        const unitPrice = getEffectiveCartItemUnitPrice(item);
        return `${item.quantity}x ${item.product.nameBn} (${item.selectedVariant}) @ ৳${unitPrice}`;
      })
      .join(' | ')
      .slice(0, 1950);

    try {
      await setDoc(doc(db, 'abandonedCarts', cartCode), {
        cartCode,
        customerName: (customerName.trim() || 'Guest Customer').slice(0, 100),
        customerPhone: cleanPhone,
        district: district.slice(0, 60),
        address: (address.trim() || 'Incomplete Address').slice(0, 400),
        itemsSummary,
        subtotal,
        recoveryStatus: 'New',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Silent capture for abandoned cart lead
    }
  };

  const validateCustomerFields = (): { cleanName: string; cleanPhone: string; cleanAddress: string } | null => {
    setFormError(null);
    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.replace(/[\s\-+88]/g, '').trim();
    const cleanAddress = address.trim();

    if (cleanName.length < 2) {
      setFormError(
        lang === 'bn'
          ? 'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন (ন্যূনতম ২ অক্ষর)'
          : 'Please enter your full name (at least 2 characters)'
      );
      return null;
    }

    if (!/^01[3-9][0-9]{8}$/.test(cleanPhone)) {
      setFormError(
        lang === 'bn'
          ? 'সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)'
          : 'Please enter a valid 11-digit Bangladesh mobile number (e.g., 01712345678)'
      );
      return null;
    }

    if (cleanAddress.length < 4) {
      setFormError(
        lang === 'bn'
          ? 'অনুগ্রহ করে বিস্তারিত ডেলিভারি ঠিকানা লিখুন (বাসা/রোড/এলাকা)'
          : 'Please enter your complete delivery address (House/Road/Area)'
      );
      return null;
    }

    return { cleanName, cleanPhone, cleanAddress };
  };

  const handleCheckoutContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const validated = validateCustomerFields();
    if (!validated) return;

    if (paymentChoice === 'ONLINE') {
      await handleSaveAbandonedCart();
      setStep('online_payment');
      return;
    }

    await finalizeOrderSubmission('COD', 'Unpaid', 'COD-NA', validated.cleanPhone);
  };

  const handleVerifyOnlinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const validated = validateCustomerFields();
    if (!validated) return;

    const cleanTrx = transactionId.trim().toUpperCase();
    if (cleanTrx.length < 4) {
      setFormError(
        lang === 'bn'
          ? 'অনুগ্রহ করে সঠিক Transaction ID (TrxID) লিখুন'
          : 'Please enter your valid Transaction ID (TrxID)'
      );
      return;
    }

    const cleanSender = (senderPhone.trim() || validated.cleanPhone).slice(0, 20);
    await finalizeOrderSubmission(selectedGateway, 'Pending Verification', cleanTrx, cleanSender);
  };

  const finalizeOrderSubmission = async (
    finalPaymentMethod: PaymentMethodType,
    finalPaymentStatus: 'Unpaid' | 'Pending Verification',
    finalTrxId: string,
    finalSenderPhone: string
  ) => {
    const validated = validateCustomerFields();
    if (!validated || cart.length === 0) return;

    setIsSubmitting(true);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `KR-${randomSuffix}`;

    const itemsSummary = cart
      .map((item) => {
        const unitPrice = getEffectiveCartItemUnitPrice(item);
        return `${item.quantity}x ${item.product.nameBn} (${item.selectedVariant}) @ ৳${unitPrice}`;
      })
      .join(' | ')
      .slice(0, 1950);

    const orderPayload = {
      orderCode,
      customerName: validated.cleanName.slice(0, 100),
      customerPhone: validated.cleanPhone,
      district: district.slice(0, 60),
      address: validated.cleanAddress.slice(0, 400),
      deliveryZone,
      itemsSummary,
      itemCount: totalUnits,
      subtotal,
      discountAmount,
      couponCode: appliedCoupon ? appliedCoupon.code : 'NONE',
      deliveryCharge,
      totalPayable,
      paymentMethod: finalPaymentMethod,
      paymentStatus: finalPaymentStatus,
      transactionId: finalTrxId.slice(0, 80),
      senderPhone: finalSenderPhone.slice(0, 20),
      steadfastConsignmentId: 'NOT_SENT',
      steadfastStatus: 'Not Dispatched',
      adminNote: 'New order received',
      status: 'Pending' as const,
    };

    const trackingPayload = {
      orderCode,
      itemsSummary,
      itemCount: totalUnits,
      deliveryZone,
      subtotal,
      discountAmount,
      deliveryCharge,
      totalPayable,
      paymentMethod: finalPaymentMethod,
      paymentStatus: finalPaymentStatus,
      steadfastConsignmentId: 'NOT_SENT',
      steadfastStatus: 'Not Dispatched',
      status: 'Pending' as const,
    };

    try {
      const batch = writeBatch(db);
      const orderRef = doc(db, 'orders', orderCode);
      const trackingRef = doc(db, 'orderTracking', orderCode);

      batch.set(orderRef, {
        ...orderPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(trackingRef, {
        ...trackingPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (user?.uid) {
        const userOrderRef = doc(db, 'users', user.uid, 'orders', orderCode);
        batch.set(userOrderRef, {
          ...orderPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      const completedOrder: Order = {
        id: orderCode,
        ...orderPayload,
        createdAt: new Date().toISOString(),
      };

      setConfirmedOrder(completedOrder);
      onOrderCreated(completedOrder);
      onClearCart();
      setStep('receipt');
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, `orders/${orderCode}`);
      } catch {
        setFormError(
          lang === 'bn'
            ? 'অর্ডার সংরক্ষণে সমস্যা হয়েছে। অনুগ্রহ করে আপনার তথ্য যাচাই করে আবার চেষ্টা করুন।'
            : 'Could not save order to database. Please verify your inputs and try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeGatewayObj =
    PAYMENT_GATEWAY_OPTIONS.find((g) => g.id === selectedGateway) || PAYMENT_GATEWAY_OPTIONS[0];
  const activeRecipientAccount = siteSettings[activeGatewayObj.accountNumberKey] || '01711-223344';

  const handleCopyAccount = () => {
    const rawNum = activeRecipientAccount.split(' ')[0];
    navigator.clipboard?.writeText(rawNum);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white h-full flex flex-col justify-between shadow-2xl border-l border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-[#f0fdf4]">
          <div className="flex items-center gap-2.5">
            <img
              src={siteSettings.logoUrl || KHATIRAJ_LOGO_URL}
              alt={siteSettings.siteName}
              className="w-7 h-7 rounded-md object-contain bg-white border border-emerald-200"
            />
            <h2 className="text-base font-bold text-slate-900">
              {step === 'cart' && (lang === 'bn' ? 'আপনার অর্ডার ব্যাগ' : 'Your Order Bag')}
              {step === 'checkout' && (lang === 'bn' ? 'অর্ডার ও ডেলিভারি তথ্য' : 'Checkout & Delivery')}
              {step === 'online_payment' &&
                (lang === 'bn' ? 'নিরাপদ অনলাইন পেমেন্ট ভেরিফিকেশন' : 'Online Payment Verification')}
              {step === 'receipt' && (lang === 'bn' ? 'অর্ডার কনফার্মেশন ইনভয়েস' : 'Order Invoice Receipt')}
            </h2>
          </div>
          <button
            onClick={() => {
              setStep('cart');
              onClose();
            }}
            className="w-8 h-8 rounded-full hover:bg-emerald-100 flex items-center justify-center text-slate-600 cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'receipt' && confirmedOrder ? (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[#15803d] mx-auto" />
                <h3 className="text-lg font-bold text-slate-900">
                  {lang === 'bn'
                    ? 'আলহামদুলিল্লাহ! আপনার অর্ডার সফলভাবে গৃহীত হয়েছে'
                    : 'Thank You! Your Order is Confirmed'}
                </h3>
                <p className="text-xs text-slate-600">
                  {confirmedOrder.paymentMethod === 'COD'
                    ? lang === 'bn'
                      ? 'নিচের অর্ডার ট্র্যাকিং কোডটি সংরক্ষণ করুন। পণ্য হাতে পেয়ে ডেলিভারি ম্যানকে মূল্য পরিশোধ করবেন।'
                      : 'Save your order tracking code below. Pay Cash on Delivery when your parcel arrives.'
                    : lang === 'bn'
                    ? `আপনার ${confirmedOrder.paymentMethod} পেমেন্ট (TrxID: ${confirmedOrder.transactionId}) ভেরিফিকেশনের জন্য গৃহীত হয়েছে।`
                    : `Your ${confirmedOrder.paymentMethod} payment (TrxID: ${confirmedOrder.transactionId}) has been submitted for verification.`}
                </p>
                <div className="pt-2">
                  <span className="inline-block px-4 py-1.5 rounded-lg bg-white border border-emerald-300 font-mono font-bold text-base text-[#15803d] tabular-nums">
                    #{confirmedOrder.orderCode}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl p-5 space-y-2.5 text-xs bg-slate-50/70">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">{lang === 'bn' ? 'ক্রেতার নাম' : 'Customer Name'}</span>
                  <span className="font-semibold text-slate-900">{confirmedOrder.customerName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">{lang === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number'}</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {confirmedOrder.customerPhone}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">{lang === 'bn' ? 'ডেলিভারি ঠিকানা' : 'Delivery Address'}</span>
                  <span className="font-medium text-slate-900 text-right max-w-[240px]">
                    {confirmedOrder.address}, {confirmedOrder.district}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">{lang === 'bn' ? 'পেমেন্ট মেথড' : 'Payment Method'}</span>
                  <span className="font-bold text-[#15803d]">
                    {confirmedOrder.paymentMethod} ({confirmedOrder.paymentStatus})
                  </span>
                </div>
                {confirmedOrder.transactionId !== 'COD-NA' && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Transaction ID</span>
                    <span className="font-mono font-bold text-slate-900">
                      {confirmedOrder.transactionId}
                    </span>
                  </div>
                )}
                <div className="py-1 border-b border-slate-200">
                  <span className="text-slate-500 block mb-1">{lang === 'bn' ? 'পণ্যের বিবরণ' : 'Ordered Items'}</span>
                  <p className="text-xs text-slate-800 leading-relaxed">{confirmedOrder.itemsSummary}</p>
                </div>
                <div className="flex justify-between pt-2 text-sm font-bold text-slate-900">
                  <span>{lang === 'bn' ? 'সর্বমোট বিল' : 'Total Amount'}</span>
                  <span className="font-mono text-[#15803d] tabular-nums">
                    ৳{confirmedOrder.totalPayable.toLocaleString('en-BD')}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-100 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'ইনভয়েস প্রিন্ট করুন' : 'Print Receipt'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('cart');
                    onClose();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#15803d] hover:bg-[#14532d] text-white text-xs font-semibold cursor-pointer"
                >
                  {lang === 'bn' ? 'কেনাকাটা চালিয়ে যান' : 'Continue Shopping'}
                </button>
              </div>
            </div>
          ) : step === 'online_payment' ? (
            /* Exact KhatiRaj v2.1 Online Payment Gateway Verification View (from payment-gateway.php) */
            <form onSubmit={handleVerifyOnlinePayment} className="space-y-5">
              <div className="text-center space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#15803d]">
                  {lang === 'bn' ? 'মোবাইল ব্যাংকিং ও ব্যাংক ট্রান্সফার' : 'Mobile Banking & Bank Transfer'}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'bn'
                    ? 'পেমেন্ট করতে আপনার পছন্দের মাধ্যম নির্বাচন করুন'
                    : 'Select Your Preferred Payment Method'}
                </h3>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {formError}
                </div>
              )}

              {/* Wallet Method Selector Grid (bKash, Nagad, Rocket, Upay, Bank) */}
              <div className="grid grid-cols-5 gap-2">
                {PAYMENT_GATEWAY_OPTIONS.map((method) => {
                  const isSelected = selectedGateway === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedGateway(method.id)}
                      className={`p-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1.5 ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50 shadow-sm scale-[1.03]'
                          : 'border-slate-200 bg-white opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 p-1.5 flex items-center justify-center">
                        <img
                          src={method.logoUrl}
                          alt={method.nameEn}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 leading-tight">
                        {method.id}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Branded Instruction & Transaction ID Card (Matches #brand-card in payment-gateway.php) */}
              <div
                className="rounded-2xl p-5 text-white space-y-4 shadow-lg transition-colors"
                style={{ backgroundColor: activeGatewayObj.brandColor }}
              >
                <div className="text-center space-y-2">
                  <h4 className="text-sm font-bold">
                    {lang === 'bn'
                      ? `${activeGatewayObj.nameBn} ট্রানজেকশন আইডি (TrxID) দিন`
                      : `Enter ${activeGatewayObj.nameEn} Transaction ID`}
                  </h4>
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                    placeholder={lang === 'bn' ? 'ট্রানজেকশন আইডি দিন (যেমন: BKA8291XYZ)' : 'Enter Transaction ID'}
                    className="w-full px-4 py-3 rounded-xl bg-white text-slate-950 font-mono font-bold text-center text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-2.5 text-xs bg-black/15 p-4 rounded-xl">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/20">
                    <div>
                      <span className="text-white/80 block text-[11px]">
                        {lang === 'bn' ? 'প্রাপক নম্বর (Send Money):' : 'Recipient Account:'}
                      </span>
                      <span className="font-mono font-extrabold text-sm">
                        {activeRecipientAccount}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      className="px-3 py-1.5 rounded-lg bg-white text-slate-900 font-bold text-xs inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedAccount ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-white/90">
                      {lang === 'bn' ? 'প্রদেয় টাকার পরিমাণ:' : 'Payable Amount:'}
                    </span>
                    <span className="font-mono font-extrabold text-base text-amber-300 tabular-nums">
                      ৳{totalPayable.toLocaleString('en-BD')}
                    </span>
                  </div>

                  <p className="text-white/90 leading-relaxed">
                    {lang === 'bn' ? activeGatewayObj.instructionsBn : activeGatewayObj.instructionsEn}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/90 mb-1">
                    {lang === 'bn'
                      ? 'যে নম্বর থেকে টাকা পাঠিয়েছেন (ঐচ্ছিক)'
                      : 'Sender Mobile Number (Optional)'}
                  </label>
                  <input
                    type="tel"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/15 border border-white/25 text-white placeholder:text-white/60 font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('checkout')}
                  className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  {lang === 'bn' ? '← পেছনে যান' : '← Back'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-[#d12026] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {isSubmitting
                    ? lang === 'bn'
                      ? 'ভেরিফাই হচ্ছে...'
                      : 'Verifying...'
                    : lang === 'bn'
                    ? `VERIFY & CONFIRM ORDER · ৳${totalPayable.toLocaleString('en-BD')}`
                    : `VERIFY & CONFIRM · ৳${totalPayable.toLocaleString('en-BD')}`}
                </button>
              </div>
            </form>
          ) : cart.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'bn' ? 'আপনার অর্ডার ব্যাগ খালি' : 'Your order bag is empty'}
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {lang === 'bn'
                    ? 'চাক সহ মধু, কালোজিরা ফুলের মধু, স্কিন কেয়ার বা কিচেন পণ্য কার্টে যোগ করে অর্ডার করুন।'
                    : 'Explore our authentic honey, skincare, and kitchen cutlery collection.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#15803d] text-white text-xs font-semibold hover:bg-[#14532d] transition-colors cursor-pointer"
              >
                {lang === 'bn' ? 'সকল পণ্য দেখুন' : 'Browse Products'}
              </button>
            </div>
          ) : step === 'cart' ? (
            <>
              {/* Free Delivery Progress Bar */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-medium mb-2">
                  <Truck className="w-4 h-4 text-[#15803d] shrink-0" />
                  {hasFreeDeliveryProduct || subtotal >= freeThreshold ? (
                    <span className="text-[#15803d] font-semibold">
                      {lang === 'bn'
                        ? 'অভিনন্দন! আপনি সারা বাংলাদেশে ফ্রি ডেলিভারি পাচ্ছেন।'
                        : 'Congratulations! Your order qualifies for FREE nationwide delivery.'}
                    </span>
                  ) : (
                    <span>
                      {lang === 'bn'
                        ? `আর মাত্র ৳${(freeThreshold - subtotal).toLocaleString('en-BD')} যোগ করলে ফ্রি ডেলিভারি!`
                        : `Add ৳${(freeThreshold - subtotal).toLocaleString('en-BD')} more for FREE delivery!`}
                    </span>
                  )}
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#15803d] transition-all duration-200"
                    style={{
                      width: `${
                        hasFreeDeliveryProduct
                          ? 100
                          : Math.min(100, (subtotal / freeThreshold) * 100)
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Cart Items List */}
              <div className="divide-y divide-slate-200">
                {cart.map((item) => {
                  const unitPrice = getEffectiveCartItemUnitPrice(item);
                  return (
                    <div
                      key={`${item.product.id}-${item.selectedVariant}`}
                      className="py-4 flex gap-3.5 items-start"
                    >
                      <div className="w-20 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <ProductImage
                          src={item.variantImageUrl || item.product.imageUrl}
                          alt={lang === 'bn' ? item.product.nameBn : item.product.nameEn}
                          category={item.product.category}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">
                          {lang === 'bn' ? item.product.nameBn : item.product.nameEn}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-slate-500">{item.selectedVariant}</span>
                          {item.product.freeDelivery && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-[#15803d] text-[10px] font-bold">
                              ফ্রি ডেলিভারি
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2.5">
                          <div className="flex items-center border border-slate-300 rounded-md bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                handleQtyChange(item.product.id, item.selectedVariant, -1)
                              }
                              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-mono font-semibold tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleQtyChange(item.product.id, item.selectedVariant, 1)
                              }
                              className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                              ৳{(unitPrice * item.quantity).toLocaleString('en-BD')}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemove(item.product.id, item.selectedVariant)
                              }
                              className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Delivery Zone Selector */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">
                  {lang === 'bn' ? 'ডেলিভারি এরিয়া নির্বাচন করুন' : 'Select Delivery Area'}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryZone('inside_dhaka')}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      deliveryZone === 'inside_dhaka'
                        ? 'border-[#15803d] bg-emerald-50/70 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-semibold">
                      {lang === 'bn' ? 'ঢাকার ভেতরে' : 'Inside Dhaka'}
                    </div>
                    <div className="text-xs font-mono font-bold text-[#15803d] tabular-nums mt-0.5">
                      ৳{insideFee}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryZone('outside_dhaka')}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      deliveryZone === 'outside_dhaka'
                        ? 'border-[#15803d] bg-emerald-50/70 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-semibold">
                      {lang === 'bn' ? 'ঢাকার বাইরে (সারা দেশ)' : 'Outside Dhaka'}
                    </div>
                    <div className="text-xs font-mono font-bold text-[#15803d] tabular-nums mt-0.5">
                      ৳{outsideFee}
                    </div>
                  </button>
                </div>
              </div>

              {/* Coupon Code Input */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  {lang === 'bn' ? 'প্রোমো বা ডিসকাউন্ট কোড' : 'Promo / Coupon Code'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder={lang === 'bn' ? 'যেমন: KHATIRAJ10' : 'e.g. KHATIRAJ10'}
                    className="flex-1 px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#15803d]"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    className="px-4 py-2 bg-[#15803d] hover:bg-[#14532d] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {lang === 'bn' ? 'প্রয়োগ করুন' : 'Apply'}
                  </button>
                </div>

                {couponMessage && (
                  <p
                    className={`text-xs font-medium ${
                      couponMessage.type === 'success' ? 'text-[#15803d]' : 'text-red-600'
                    }`}
                  >
                    {couponMessage.text}
                  </p>
                )}

                {activeCoupons.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <span className="text-[11px] text-slate-500 block">
                      {lang === 'bn' ? 'উপলব্ধ কুপনসমূহ (ক্লিক করে ব্যবহার করুন):' : 'Available Coupons (Click to apply):'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeCoupons.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleApplyCoupon(c.code)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-white border border-slate-300 hover:border-[#15803d] text-slate-800 cursor-pointer"
                        >
                          <Tag className="w-3 h-3 text-[#15803d]" />
                          <span>{c.code}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Step 2: KhatiRaj v2.1 Checkout Form (COD + Online Payment Choice) */
            <form id="cod-checkout-form" onSubmit={handleCheckoutContinue} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  {lang === 'bn' ? 'আপনার পূর্ণ নাম *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: মাহমুদুল হাসান' : 'e.g. Mahmudul Hasan'}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#15803d]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  {lang === 'bn' ? 'মোবাইল নম্বর (১১ ডিজিট) *' : 'Bangladesh Mobile Number (11 Digits) *'}
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  onBlur={handleSaveAbandonedCart}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#15803d]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    {lang === 'bn' ? 'জেলা নির্বাচন করুন *' : 'Select District *'}
                  </label>
                  <select
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#15803d]"
                  >
                    {BANGLADESH_DISTRICTS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {lang === 'bn' ? d.labelBn : d.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    {lang === 'bn' ? 'ডেলিভারি জোন চার্জ' : 'Delivery Zone Fee'}
                  </label>
                  <select
                    value={deliveryZone}
                    onChange={(e) => setDeliveryZone(e.target.value as DeliveryZone)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#15803d]"
                  >
                    <option value="inside_dhaka">
                      {lang === 'bn' ? `ঢাকার ভেতরে (৳${insideFee})` : `Inside Dhaka (৳${insideFee})`}
                    </option>
                    <option value="outside_dhaka">
                      {lang === 'bn' ? `ঢাকার বাইরে (৳${outsideFee})` : `Outside Dhaka (৳${outsideFee})`}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  {lang === 'bn' ? 'থানা ও বিস্তারিত ঠিকানা (বাসা/রোড/এলাকা) *' : 'Detailed Street / Area Address *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={
                    lang === 'bn'
                      ? 'যেমন: বাসা নং ১২, রোড ৫, মিরপুর ১০, ঢাকা'
                      : 'e.g. House 12, Road 5, Mirpur 10, Dhaka'
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#15803d]"
                />
              </div>

              {/* Payment Method Selector (COD vs Online Payment bKash/Nagad/Rocket/Upay) */}
              <div className="space-y-2.5 pt-1">
                <label className="block text-xs font-bold text-slate-800">
                  {lang === 'bn' ? 'পেমেন্ট পদ্ধতি নির্বাচন করুন *' : 'Select Payment Method *'}
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentChoice('COD')}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      paymentChoice === 'COD'
                        ? 'border-[#15803d] bg-emerald-50/70'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-[#15803d] shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {lang === 'bn'
                            ? 'ক্যাশ অন ডেলিভারি (Cash on Delivery)'
                            : 'Cash on Delivery (COD)'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {lang === 'bn'
                            ? 'পণ্য হাতে পেয়ে ডেলিভারি ম্যানকে নগদ মূল্য পরিশোধ করুন'
                            : 'Pay cash at your doorstep when receiving the parcel'}
                        </div>
                      </div>
                    </div>
                    <span className="w-4 h-4 rounded-full border border-[#15803d] flex items-center justify-center">
                      {paymentChoice === 'COD' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]" />
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentChoice('ONLINE')}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      paymentChoice === 'ONLINE'
                        ? 'border-[#15803d] bg-emerald-50/70'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-[#e2136e] shrink-0" />
                        <span className="text-xs font-bold text-slate-900">
                          {lang === 'bn'
                            ? 'অনলাইন পেমেন্ট (বিকাশ / নগদ / রকেট / উপায় / ব্যাংক)'
                            : 'Online Payment (bKash / Nagad / Rocket / Upay)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        {PAYMENT_GATEWAY_OPTIONS.map((g) => (
                          <img
                            key={g.id}
                            src={g.logoUrl}
                            alt={g.id}
                            className="h-5 w-auto object-contain rounded bg-white px-1 border border-slate-200"
                          />
                        ))}
                      </div>
                    </div>
                    <span className="w-4 h-4 rounded-full border border-[#15803d] flex items-center justify-center shrink-0">
                      {paymentChoice === 'ONLINE' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]" />
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Drawer Footer Totals & Primary CTA */}
        {cart.length > 0 && step !== 'receipt' && step !== 'online_payment' && (
          <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>
                  {lang === 'bn' ? `মোট পণ্য (${totalUnits} টি)` : `Subtotal (${totalUnits} items)`}
                </span>
                <span className="font-mono font-medium tabular-nums">
                  ৳{subtotal.toLocaleString('en-BD')}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#15803d] font-medium">
                  <span>
                    {lang === 'bn' ? 'কুপন ছাড়' : 'Coupon Discount'} ({appliedCoupon?.code})
                  </span>
                  <span className="font-mono tabular-nums">
                    -৳{discountAmount.toLocaleString('en-BD')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>
                  {lang === 'bn' ? 'ডেলিভারি চার্জ' : 'Delivery Charge'} (
                  {deliveryZone === 'inside_dhaka'
                    ? lang === 'bn'
                      ? 'ঢাকার ভেতরে'
                      : 'Inside Dhaka'
                    : lang === 'bn'
                    ? 'ঢাকার বাইরে'
                    : 'Outside Dhaka'}
                  )
                </span>
                <span className="font-mono font-medium tabular-nums">
                  {deliveryCharge === 0
                    ? lang === 'bn'
                      ? 'ফ্রি (৳০)'
                      : 'FREE (৳0)'
                    : `৳${deliveryCharge}`}
                </span>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-slate-300 text-base font-bold text-slate-900">
                <span>{lang === 'bn' ? 'সর্বমোট প্রদেয়' : 'Net Payable'}</span>
                <span className="font-mono text-[#15803d] tabular-nums">
                  ৳{totalPayable.toLocaleString('en-BD')}
                </span>
              </div>
            </div>

            {step === 'cart' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3.5 px-5 rounded-xl bg-[#15803d] hover:bg-[#14532d] text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                {lang === 'bn'
                  ? 'চেকআউট ও অর্ডার কনফার্ম করুন →'
                  : 'Proceed to Checkout →'}
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  {lang === 'bn' ? '← ব্যাগে ফিরুন' : '← Back'}
                </button>
                <button
                  type="submit"
                  form="cod-checkout-form"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-5 rounded-xl bg-[#15803d] hover:bg-[#14532d] text-white font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isSubmitting
                    ? lang === 'bn'
                      ? 'অর্ডার প্রসেস হচ্ছে...'
                      : 'Confirming...'
                    : paymentChoice === 'ONLINE'
                    ? lang === 'bn'
                      ? `পেমেন্ট গেটওয়েতে যান · ৳${totalPayable.toLocaleString('en-BD')} →`
                      : `Proceed to Online Payment · ৳${totalPayable.toLocaleString('en-BD')} →`
                    : lang === 'bn'
                    ? `অর্ডার সম্পন্ন করুন (COD) · ৳${totalPayable.toLocaleString('en-BD')}`
                    : `Confirm COD Order · ৳${totalPayable.toLocaleString('en-BD')}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
