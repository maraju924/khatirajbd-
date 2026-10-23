import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  CheckCircle2,
  Clock,
  LogOut,
  Mail,
  Package,
  Search,
  ShieldCheck,
  Truck,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react';
import {
  db,
  isWhitelistedAdminEmail,
  loginWithEmailPassword,
  registerWithEmailPassword,
  signInWithGoogle,
  signOutUser,
} from '../firebase';
import { Language, Order, OrderStatus, OrderTracking, UserProfile } from '../types';

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  lang: Language;
  recentOrders: Order[];
  onOpenAdminPanel: () => void;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({
  isOpen,
  onClose,
  user,
  userProfile,
  isAdmin,
  lang,
  recentOrders,
  onOpenAdminPanel,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // User's Firestore Order History + Live Courier Tracking
  const [myFirestoreOrders, setMyFirestoreOrders] = useState<Order[]>([]);
  const [trackingCodeInput, setTrackingCodeInput] = useState('');
  const [trackedResult, setTrackedResult] = useState<OrderTracking | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  // Listen to user's personal order history from users/{uid}/orders
  useEffect(() => {
    if (!user) {
      setMyFirestoreOrders([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'orders'),
      (snap) => {
        const list: Order[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Order, 'id'>),
        }));
        setMyFirestoreOrders(list);
      },
      () => {
        setMyFirestoreOrders([]);
      }
    );
    return () => unsub();
  }, [user]);

  if (!isOpen) return null;

  // Combine Firestore orders and local recentOrders (deduplicated by orderCode)
  const combinedMyOrders = (() => {
    const map = new Map<string, Order>();
    myFirestoreOrders.forEach((o) => map.set(o.orderCode, o));
    recentOrders.forEach((o) => {
      if (!map.has(o.orderCode)) {
        map.set(o.orderCode, o);
      }
    });
    return Array.from(map.values());
  })();

  const syncUserDocument = async (
    firebaseUser: User,
    customName?: string,
    customPhone?: string
  ) => {
    const email = (firebaseUser.email || '').trim().toLowerCase();
    const resolvedRole = isWhitelistedAdminEmail(email) ? 'admin' : 'user';
    const userRef = doc(db, 'users', firebaseUser.uid);

    try {
      const existingSnap = await getDoc(userRef);
      if (existingSnap.exists()) {
        const existingData = existingSnap.data();
        await setDoc(
          userRef,
          {
            uid: firebaseUser.uid,
            email: firebaseUser.email || email,
            displayName:
              customName?.trim() ||
              firebaseUser.displayName ||
              existingData.displayName ||
              email.split('@')[0] ||
              'User',
            ...(customPhone?.trim()
              ? { phone: customPhone.trim() }
              : existingData.phone
              ? { phone: existingData.phone }
              : {}),
            role: resolvedRole,
            createdAt: existingData.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email || email,
          displayName:
            customName?.trim() ||
            firebaseUser.displayName ||
            email.split('@')[0] ||
            'Customer',
          ...(customPhone?.trim() ? { phone: customPhone.trim() } : {}),
          role: resolvedRole,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch {
      // handled gracefully
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const cleanEmail = emailInput.trim();
    if (!cleanEmail || passwordInput.length < 6) {
      setAuthError(
        lang === 'bn'
          ? 'সঠিক ইমেইল এবং কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।'
          : 'Please enter a valid email and at least 6-character password.'
      );
      return;
    }

    setIsSubmittingAuth(true);
    try {
      if (authMode === 'register') {
        if (nameInput.trim().length < 2) {
          setAuthError(
            lang === 'bn'
              ? 'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন।'
              : 'Please enter your full name.'
          );
          setIsSubmittingAuth(false);
          return;
        }
        const cred = await registerWithEmailPassword(
          nameInput.trim(),
          cleanEmail,
          passwordInput
        );
        await syncUserDocument(cred.user, nameInput.trim(), phoneInput.trim());
        setAuthSuccess(
          lang === 'bn'
            ? 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!'
            : 'Account registered successfully!'
        );
      } else {
        const cred = await loginWithEmailPassword(cleanEmail, passwordInput);
        await syncUserDocument(cred.user);
        setAuthSuccess(
          lang === 'bn' ? 'সফলভাবে লগইন হয়েছে!' : 'Logged in successfully!'
        );
      }
      setPasswordInput('');
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      if (code.includes('email-already-in-use')) {
        setAuthError(
          lang === 'bn'
            ? 'এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা আছে। লগইন ট্যাবে গিয়ে লগইন করুন।'
            : 'Email is already registered. Please sign in instead.'
        );
      } else if (
        code.includes('invalid-credential') ||
        code.includes('wrong-password') ||
        code.includes('user-not-found')
      ) {
        setAuthError(
          lang === 'bn'
            ? 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। আবার চেক করুন।'
            : 'Invalid email or password.'
        );
      } else {
        setAuthError(
          lang === 'bn'
            ? 'লগইন বা রেজিস্ট্রেশনে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
            : 'Authentication failed. Please try again.'
        );
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthSuccess(null);
    setIsSubmittingAuth(true);
    try {
      const cred = await signInWithGoogle();
      await syncUserDocument(cred.user);
      setAuthSuccess(
        lang === 'bn'
          ? 'Google দিয়ে সফলভাবে লগইন সম্পন্ন হয়েছে!'
          : 'Signed in with Google!'
      );
    } catch {
      setAuthError(
        lang === 'bn'
          ? 'Google সাইন-ইন সম্পন্ন হয়নি। আবার চেষ্টা করুন।'
          : 'Google sign-in was cancelled or failed.'
      );
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleTrackOrder = async (codeToLookup?: string) => {
    const cleanCode = (codeToLookup ?? trackingCodeInput)
      .replace(/^#/, '')
      .trim()
      .toUpperCase();
    if (!cleanCode) return;

    setTrackingCodeInput(cleanCode);
    setTrackingError(null);
    setIsTrackingLoading(true);

    try {
      const snap = await getDoc(doc(db, 'orderTracking', cleanCode));
      if (snap.exists()) {
        setTrackedResult(snap.data() as OrderTracking);
      } else {
        const localMatch = combinedMyOrders.find(
          (o) => o.orderCode.toUpperCase() === cleanCode
        );
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
          setTrackingError(
            lang === 'bn'
              ? `অর্ডার কোড #${cleanCode} পাওয়া যায়নি। সঠিক কোড দিন (যেমন: KR-4821)।`
              : `Order #${cleanCode} not found.`
          );
        }
      }
    } catch {
      setTrackingError(
        lang === 'bn'
          ? 'ট্র্যাকিং তথ্য লোড করতে সমস্যা হয়েছে।'
          : 'Failed to load tracking info.'
      );
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const trackingSteps: { key: OrderStatus; labelBn: string; labelEn: string }[] = [
    { key: 'Pending', labelBn: 'অর্ডার গৃহীত', labelEn: 'Order Placed' },
    { key: 'Confirmed', labelBn: 'ভেরিফায়েড ও প্যাকিং', labelEn: 'Confirmed & Packed' },
    { key: 'Shipped', labelBn: 'কুরিয়ারে প্রেরিত', labelEn: 'Handed to Courier' },
    { key: 'Delivered', labelBn: 'ডেলিভারি সম্পন্ন', labelEn: 'Delivered' },
  ];

  const getStepIdx = (status: OrderStatus) => {
    if (status === 'Cancelled') return -1;
    return trackingSteps.findIndex((s) => s.key === status);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#f8f6f0] rounded-3xl shadow-2xl border border-[#e2dccb] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#123b2e] to-[#1b4b3b] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#c7a15d]/25 border border-[#c7a15d]/50 flex items-center justify-center text-[#f3d999]">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                {user
                  ? lang === 'bn'
                    ? 'আমার অ্যাকাউন্ট ও অর্ডার ট্র্যাকিং'
                    : 'My Account & Order Tracking'
                  : lang === 'bn'
                  ? 'কাস্টমার লগইন ও রেজিস্ট্রেশন'
                  : 'Customer Login & Registration'}
              </h2>
              <p className="text-[11px] text-emerald-100/80">
                {user
                  ? user.email
                  : lang === 'bn'
                  ? 'Google অথবা ইমেইল ও পাসওয়ার্ড দিয়ে অ্যাকাউন্টে প্রবেশ করুন'
                  : 'Sign in with Google or Email & Password'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white cursor-pointer"
            aria-label="Close account modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {!user ? (
            /* AUTHENTICATION CARD (Login / Register with Email+Password & Google) */
            <div className="bg-white rounded-2xl border border-[#e2dccb] p-5 space-y-4 shadow-2xs">
              {/* Mode Switch Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#f8f6f0] border border-[#e2dccb]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-[#123b2e] text-[#f3d999] shadow-2xs'
                      : 'text-slate-700 hover:text-[#123b2e]'
                  }`}
                >
                  {lang === 'bn' ? 'লগইন করুন (Login)' : 'Login'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-[#123b2e] text-[#f3d999] shadow-2xs'
                      : 'text-slate-700 hover:text-[#123b2e]'
                  }`}
                >
                  {lang === 'bn' ? 'নতুন অ্যাকাউন্ট (Register)' : 'Register'}
                </button>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                  {authError}
                </div>
              )}

              {authSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
                  {authSuccess}
                </div>
              )}

              {/* Email & Password Form */}
              <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
                {authMode === 'register' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {lang === 'bn' ? 'আপনার পূর্ণ নাম *' : 'Full Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder={lang === 'bn' ? 'যেমন: রাকিব হাসান' : 'Your Name'}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#d8d0bc] bg-white text-xs focus:outline-none focus:border-[#123b2e]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {lang === 'bn' ? 'মোবাইল নম্বর (ঐচ্ছিক)' : 'Mobile Number'}
                      </label>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="017XXXXXXXX"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#d8d0bc] bg-white text-xs font-mono focus:outline-none focus:border-[#123b2e]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'bn' ? 'ইমেইল ঠিকানা *' : 'Email Address *'}
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#d8d0bc] bg-white text-xs focus:outline-none focus:border-[#123b2e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'bn' ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) *' : 'Password (min 6 chars) *'}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#d8d0bc] bg-white text-xs focus:outline-none focus:border-[#123b2e]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="w-full py-3 px-4 rounded-xl bg-[#123b2e] hover:bg-[#1b4b3b] text-[#f3d999] text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  <span>
                    {isSubmittingAuth
                      ? lang === 'bn'
                        ? 'অপেক্ষা করুন...'
                        : 'Processing...'
                      : authMode === 'register'
                      ? lang === 'bn'
                        ? 'ইমেইল দিয়ে রেজিস্ট্রেশন সম্পন্ন করুন'
                        : 'Create Account with Email'
                      : lang === 'bn'
                      ? 'ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন'
                      : 'Sign In with Email'}
                  </span>
                </button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-[#e2dccb]" />
                <span className="shrink mx-3 text-[11px] font-semibold text-slate-400">
                  {lang === 'bn' ? 'অথবা' : 'OR'}
                </span>
                <div className="grow border-t border-[#e2dccb]" />
              </div>

              {/* Google Sign-In Button */}
              <button
                type="button"
                disabled={isSubmittingAuth}
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-[#d8d0bc] text-xs font-bold flex items-center justify-center gap-2.5 transition cursor-pointer shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>
                  {lang === 'bn'
                    ? 'Google দিয়ে দ্রুত সাইন-ইন / রেজিস্ট্রেশন করুন'
                    : 'Continue with Google'}
                </span>
              </button>
            </div>
          ) : (
            /* LOGGED-IN USER PROFILE BAR */
            <div className="bg-white rounded-2xl border border-[#e2dccb] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#123b2e] text-[#f3d999] font-extrabold text-base flex items-center justify-center">
                  {(userProfile?.displayName || user.displayName || user.email || 'U')
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {userProfile?.displayName ||
                        user.displayName ||
                        user.email?.split('@')[0]}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        isAdmin
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {isAdmin
                        ? lang === 'bn'
                          ? 'ভেরিফায়েড অ্যাডমিন'
                          : 'Verified Admin'
                        : lang === 'bn'
                        ? 'রেজিস্টার্ড ইউজার'
                        : 'Customer Account'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* STRICT RBAC: Only show Admin Panel button if user is one of the 2 allowed admins */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdminPanel();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#123b2e] hover:bg-[#1b4b3b] text-[#f3d999] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {lang === 'bn' ? 'অ্যাডমিন প্যানেল খুলুন' : 'Open Admin Panel'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    await signOutUser();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'লগআউট' : 'Logout'}</span>
                </button>
              </div>
            </div>
          )}

          {/* MY ORDER HISTORY & LIVE COURIER TRACKING SECTION */}
          <div className="bg-white rounded-2xl border border-[#e2dccb] p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2 border-b border-[#ece7d8] pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#123b2e]" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#123b2e]">
                    {lang === 'bn'
                      ? 'আমার অর্ডার হিস্ট্রি ও লাইভ কুরিয়ার ট্র্যাকিং'
                      : 'My Order History & Live Courier Tracking'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'bn'
                      ? 'আপনার অর্ডার কোড দিয়ে বা নিচের অর্ডার তালিকায় ক্লিক করে রিয়েল-টাইম স্ট্যাটাস দেখুন'
                      : 'Click any of your orders below or enter an order code to track'}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#f8f6f0] border border-[#e2dccb] text-[11px] font-mono font-bold text-[#123b2e]">
                {combinedMyOrders.length} {lang === 'bn' ? 'টি অর্ডার' : 'Orders'}
              </span>
            </div>

            {/* Live Order Code Search Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTrackOrder();
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={trackingCodeInput}
                  onChange={(e) => setTrackingCodeInput(e.target.value.toUpperCase())}
                  placeholder={
                    lang === 'bn'
                      ? 'অর্ডার কোড লিখুন (যেমন: KR-4821)'
                      : 'Enter Order Code (e.g. KR-4821)'
                  }
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#d8d0bc] bg-[#f8f6f0] text-xs font-mono uppercase focus:outline-none focus:border-[#123b2e]"
                />
              </div>
              <button
                type="submit"
                disabled={isTrackingLoading}
                className="px-5 py-2.5 rounded-xl bg-[#123b2e] hover:bg-[#1b4b3b] text-[#f3d999] text-xs font-bold cursor-pointer shrink-0"
              >
                {isTrackingLoading
                  ? lang === 'bn'
                    ? 'খোঁজা হচ্ছে...'
                    : 'Checking...'
                  : lang === 'bn'
                  ? 'লাইভ ট্র্যাক করুন'
                  : 'Track Live'}
              </button>
            </form>

            {trackingError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                {trackingError}
              </div>
            )}

            {/* Tracked Order Result Card */}
            {trackedResult && (
              <div className="p-4 rounded-2xl bg-[#f8f6f0] border border-[#d8d0bc] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#e2dccb]">
                  <div>
                    <span className="text-[10px] text-slate-500 block">
                      {lang === 'bn' ? 'অর্ডার কোড' : 'Order ID'}
                    </span>
                    <strong className="text-sm font-mono font-extrabold text-[#123b2e]">
                      #{trackedResult.orderCode}
                    </strong>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                      <Wallet className="w-3.5 h-3.5 text-[#123b2e]" />
                      {trackedResult.paymentMethod} ({trackedResult.paymentStatus})
                    </span>
                    <strong className="font-mono text-sm text-[#123b2e]">
                      ৳{trackedResult.totalPayable.toLocaleString('en-BD')}
                    </strong>
                  </div>
                </div>

                {trackedResult.steadfastConsignmentId &&
                  trackedResult.steadfastConsignmentId !== 'N/A' &&
                  trackedResult.steadfastConsignmentId !== 'NOT_SENT' && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-950">
                        <Truck className="w-4 h-4 text-[#123b2e]" />
                        Steadfast ID: {trackedResult.steadfastConsignmentId}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-emerald-300 font-mono font-bold text-[#123b2e]">
                        {trackedResult.steadfastStatus}
                      </span>
                    </div>
                  )}

                {trackedResult.status === 'Cancelled' ? (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                    {lang === 'bn'
                      ? 'এই অর্ডারটি বাতিল (Cancelled) করা হয়েছে।'
                      : 'This order was cancelled.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {trackingSteps.map((st, idx) => {
                      const activeIdx = getStepIdx(trackedResult.status);
                      const isDone = idx <= activeIdx;
                      return (
                        <div
                          key={st.key}
                          className={`p-2.5 rounded-xl border text-xs ${
                            isDone
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                              : 'bg-white border-slate-200 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[10px]">0{idx + 1}</span>
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-slate-300" />
                            )}
                          </div>
                          <div className="text-[11px]">
                            {lang === 'bn' ? st.labelBn : st.labelEn}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="text-xs text-slate-600 pt-1">
                  <strong>{lang === 'bn' ? 'পণ্যসমূহ:' : 'Items:'}</strong>{' '}
                  {trackedResult.itemsSummary}
                </div>
              </div>
            )}

            {/* User's Saved Order History List */}
            {combinedMyOrders.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-[#d8d0bc] text-xs text-slate-500">
                {lang === 'bn'
                  ? 'আপনার অ্যাকাউন্টে এখনো কোনো অর্ডার নেই। স্টোর থেকে অর্ডার করলে এখানে স্বয়ংক্রিয়ভাবে জমা হবে।'
                  : 'You have not placed any orders yet.'}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {combinedMyOrders.map((ord) => (
                  <div
                    key={ord.orderCode}
                    onClick={() => handleTrackOrder(ord.orderCode)}
                    className="p-3.5 rounded-xl border border-[#e2dccb] bg-[#f8f6f0]/60 hover:border-[#123b2e] transition flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-mono font-extrabold text-[#123b2e]">
                          #{ord.orderCode}
                        </strong>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                          {ord.status}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {ord.paymentMethod} ({ord.paymentStatus})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">
                        {ord.itemsSummary}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-extrabold text-[#123b2e]">
                        ৳{ord.totalPayable.toLocaleString('en-BD')}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 underline">
                        {lang === 'bn' ? 'ট্র্যাক করুন →' : 'Track →'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
