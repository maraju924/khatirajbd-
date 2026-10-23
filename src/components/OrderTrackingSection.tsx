import React, { useState } from 'react';
import { CheckCircle2, Clock, Search, Truck, Wallet } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Language, Order, OrderStatus, OrderTracking } from '../types';

interface OrderTrackingSectionProps {
  lang: Language;
  recentOrders: Order[];
}

export const OrderTrackingSection: React.FC<OrderTrackingSectionProps> = ({
  lang,
  recentOrders,
}) => {
  const [trackingInput, setTrackingInput] = useState('');
  const [trackedResult, setTrackedResult] = useState<OrderTracking | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLookup = async (codeOverride?: string) => {
    const cleanCode = (codeOverride ?? trackingInput).replace(/^#/, '').trim().toUpperCase();
    if (!cleanCode) return;
    setTrackingInput(cleanCode);
    setLookupError(null);
    setIsLoading(true);

    try {
      const snap = await getDoc(doc(db, 'orderTracking', cleanCode));
      if (snap.exists()) {
        setTrackedResult(snap.data() as OrderTracking);
      } else {
        const localMatch = recentOrders.find((o) => o.orderCode.toUpperCase() === cleanCode);
        if (localMatch) {
          setTrackedResult({
            orderCode: localMatch.orderCode,
            itemsSummary: localMatch.itemsSummary,
            itemCount: localMatch.itemCount,
            deliveryZone: localMatch.deliveryZone,
            subtotal: localMatch.subtotal,
            discountAmount: localMatch.discountAmount,
            deliveryCharge: localMatch.deliveryCharge,
            totalPayable: localMatch.totalPayable,
            paymentMethod: localMatch.paymentMethod,
            paymentStatus: localMatch.paymentStatus,
            steadfastConsignmentId: localMatch.steadfastConsignmentId,
            steadfastStatus: localMatch.steadfastStatus,
            status: localMatch.status,
          });
        } else {
          setTrackedResult(null);
          setLookupError(
            lang === 'bn'
              ? `অর্ডার কোড #${cleanCode} পাওয়া যায়নি। অনুগ্রহ করে সঠিক অর্ডার কোড দিন (যেমন: KR-4821)।`
              : `Order #${cleanCode} not found. Please check your order code.`
          );
        }
      }
    } catch {
      setLookupError(
        lang === 'bn'
          ? 'অর্ডার তথ্য লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
          : 'Unable to fetch order tracking status right now.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const steps: { key: OrderStatus; labelBn: string; labelEn: string }[] = [
    { key: 'Pending', labelBn: 'অর্ডার গৃহীত', labelEn: 'Order Placed' },
    { key: 'Confirmed', labelBn: 'ভেরিফায়েড ও প্যাকিং', labelEn: 'Confirmed & Packed' },
    { key: 'Shipped', labelBn: 'কুরিয়ারে প্রেরিত', labelEn: 'Handed to Courier' },
    { key: 'Delivered', labelBn: 'ডেলিভারি সম্পন্ন', labelEn: 'Delivered' },
  ];

  const getStepIndex = (status: OrderStatus): number => {
    if (status === 'Cancelled') return -1;
    return steps.findIndex((s) => s.key === status);
  };

  return (
    <section id="order-tracking" className="py-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#FAF6F0] border border-stone-200/90 rounded-2xl p-5 md:p-7 space-y-5">
          <div className="space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-[#1B4332]">
              {lang === 'bn' ? 'লাইভ অর্ডার ও কুরিয়ার ট্র্যাকার' : 'Live Order & Courier Tracker'}
            </div>
            <h2 className="text-xl font-bold text-zinc-900">
              {lang === 'bn'
                ? 'আপনার অর্ডারের বর্তমান অবস্থান ও পেমেন্ট স্ট্যাটাস জানুন'
                : 'Track Your Parcel & Payment Status'}
            </h2>
            <p className="text-xs text-zinc-600">
              {lang === 'bn'
                ? 'অর্ডার সম্পন্ন করার পর প্রাপ্ত কোডটি (যেমন: KR-4821) নিচে লিখে সার্চ করুন।'
                : 'Enter the order code from your confirmation receipt (e.g., KR-4821) to view real-time status.'}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
                placeholder={lang === 'bn' ? 'অর্ডার কোড লিখুন (যেমন: KR-4821)' : 'Enter Order Code (e.g. KR-4821)'}
                className="w-full pl-10 pr-4 py-3 text-sm font-mono uppercase bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-[#1B4332]"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-[#1B4332] hover:bg-[#143325] text-white text-sm font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {isLoading
                ? lang === 'bn'
                  ? 'খোঁজা হচ্ছে...'
                  : 'Checking...'
                : lang === 'bn'
                ? 'অর্ডার ট্র্যাক করুন'
                : 'Track Order'}
            </button>
          </form>

          {recentOrders.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
              <span>{lang === 'bn' ? 'আপনার সাম্প্রতিক অর্ডার:' : 'Your Recent Orders:'}</span>
              {recentOrders.slice(0, 4).map((o) => (
                <button
                  key={o.orderCode}
                  type="button"
                  onClick={() => handleLookup(o.orderCode)}
                  className="px-2.5 py-1 rounded-md font-mono font-bold bg-white border border-stone-300 hover:border-[#1B4332] text-[#1B4332] cursor-pointer"
                >
                  #{o.orderCode}
                </button>
              ))}
            </div>
          )}

          {lookupError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {lookupError}
            </div>
          )}

          {trackedResult && (
            <div className="p-5 rounded-xl bg-white border border-stone-200 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200">
                <div>
                  <span className="text-xs text-zinc-500 block">
                    {lang === 'bn' ? 'অর্ডার ট্র্যাকিং কোড' : 'Order Tracking ID'}
                  </span>
                  <span className="text-lg font-bold font-mono text-zinc-900 tabular-nums">
                    #{trackedResult.orderCode}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-zinc-500 block">
                      {lang === 'bn' ? 'পেমেন্ট মেথড ও স্ট্যাটাস' : 'Payment Method & Status'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                      <Wallet className="w-3.5 h-3.5 text-[#1B4332]" />
                      {trackedResult.paymentMethod || 'COD'} ·{' '}
                      <span
                        className={
                          trackedResult.paymentStatus === 'Paid'
                            ? 'text-emerald-700'
                            : trackedResult.paymentStatus === 'Rejected'
                            ? 'text-red-600'
                            : 'text-amber-700'
                        }
                      >
                        {trackedResult.paymentStatus || 'Unpaid'}
                      </span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-500 block">
                      {lang === 'bn' ? 'মোট বিল' : 'Total Amount'}
                    </span>
                    <span className="text-lg font-bold font-mono text-[#1B4332] tabular-nums">
                      ৳{trackedResult.totalPayable.toLocaleString('en-BD')}
                    </span>
                  </div>
                </div>
              </div>

              {trackedResult.steadfastConsignmentId &&
                trackedResult.steadfastConsignmentId !== 'N/A' && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-emerald-950">
                      <Truck className="w-4 h-4 text-[#1B4332]" />
                      <span>
                        Consignment ID:{' '}
                        <strong className="font-mono">{trackedResult.steadfastConsignmentId}</strong>
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-white border border-emerald-300 font-mono font-bold text-[#1B4332]">
                      {trackedResult.steadfastStatus}
                    </span>
                  </div>
                )}

              {trackedResult.status === 'Cancelled' ? (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  {lang === 'bn'
                    ? 'এই অর্ডারটি বাতিল (Cancelled) করা হয়েছে।'
                    : 'This order has been cancelled.'}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {steps.map((s, idx) => {
                    const currentIdx = getStepIndex(trackedResult.status);
                    const isDone = idx <= currentIdx;
                    return (
                      <div
                        key={s.key}
                        className={`p-3 rounded-xl border text-xs ${
                          isDone
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                            : 'bg-stone-50 border-stone-200 text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold">0{idx + 1}</span>
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-[#1B4332]" />
                          ) : (
                            <Clock className="w-4 h-4 text-zinc-300" />
                          )}
                        </div>
                        <div className="font-semibold">
                          {lang === 'bn' ? s.labelBn : s.labelEn}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="text-xs text-zinc-600 space-y-1 pt-2 border-t border-stone-200/80">
                <div className="font-semibold text-zinc-800">
                  {lang === 'bn' ? 'অর্ডারকৃত পণ্যের তালিকা:' : 'Items Summary:'}
                </div>
                <p>{trackedResult.itemsSummary}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
