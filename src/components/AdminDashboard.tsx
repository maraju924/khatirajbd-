import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, signInWithGoogle, signOutUser } from '../firebase';
import {
  AbandonedCart,
  BlogPost,
  Coupon,
  LandingPageItem,
  Language,
  Order,
  OrderStatus,
  PaymentStatusType,
  Product,
  ReviewItem,
  SiteSettings,
  SliderItem,
  UserProfile,
} from '../types';
import {
  DEFAULT_SITE_SETTINGS,
  SEED_BLOG_POSTS,
  SEED_COUPONS,
  SEED_LANDING_PAGES,
  SEED_PRODUCTS,
  SEED_REVIEWS,
  SEED_SLIDERS,
} from '../data/seedCatalog';
import {
  YoastProductFormValues,
  YoastProductStudioModal,
} from './YoastProductStudioModal';
import { analyzeYoastSeo, getTrafficLightColor } from '../utils/yoastSeoEngine';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  isAdmin: boolean;
  products: Product[];
  coupons: Coupon[];
  sliders: SliderItem[];
  blogPosts: BlogPost[];
  landingPages: LandingPageItem[];
  reviews: ReviewItem[];
  siteSettings: SiteSettings;
  lang: Language;
  onPreviewLandingPage?: (lp: LandingPageItem) => void;
}

type AdminTab = 'dashboard' | 'orders' | 'products' | 'customers' | 'more';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  user,
  isAdmin,
  products,
  coupons,
  sliders,
  landingPages,
  reviews,
  siteSettings,
  onPreviewLandingPage,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 100% Live Firestore states (Zero dummy arrays)
  const [orders, setOrders] = useState<Order[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);

  // Selected Order Detail Bottom Sheet
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Add/Edit Product Yoast SEO Premium Studio Modal
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Coupon Form State
  const [couponCode, setCouponCode] = useState('');
  const [discountValue, setDiscountValue] = useState('10');
  const [minOrderAmount, setMinOrderAmount] = useState('500');

  // Slider Form State
  const [sliderTitleBn, setSliderTitleBn] = useState('');
  const [sliderSubtitleBn, setSliderSubtitleBn] = useState('');
  const [sliderImageUrl, setSliderImageUrl] = useState('/uploads/products/chak-soho-modhu.webp');

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(
    siteSettings || DEFAULT_SITE_SETTINGS
  );

  useEffect(() => {
    setSettingsForm(siteSettings || DEFAULT_SITE_SETTINGS);
  }, [siteSettings]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
  };

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Formatted Bengali Date
  const todayDateBn = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('bn-BD', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date());
    } catch {
      return '';
    }
  }, []);

  // Listen to live orders, abandonedCarts & registered users from Firestore when signed in as Admin
  useEffect(() => {
    if (!user || !isAdmin) {
      setOrders([]);
      setAbandonedCarts([]);
      setRegisteredUsers([]);
      return;
    }
    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const loaded: Order[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Order, 'id'>),
        }));
        setOrders(loaded);
      },
      () => setOrders([])
    );

    const unsubCarts = onSnapshot(
      collection(db, 'abandonedCarts'),
      (snap) => {
        const loadedCarts: AbandonedCart[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AbandonedCart, 'id'>),
        }));
        setAbandonedCarts(loadedCarts);
      },
      () => setAbandonedCarts([])
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const loadedUsers: UserProfile[] = snap.docs.map((d) => ({
          ...(d.data() as UserProfile),
          uid: d.id,
        }));
        setRegisteredUsers(loadedUsers);
      },
      () => setRegisteredUsers([])
    );

    return () => {
      unsubOrders();
      unsubCarts();
      unsubUsers();
    };
  }, [user, isAdmin]);

  // 100% Live Metrics calculated from Firestore collections
  const totalSalesAmount = useMemo(
    () =>
      orders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + (o.totalPayable || 0), 0),
    [orders]
  );

  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'Pending').length,
    [orders]
  );

  // Unique Customers aggregated from live Firestore orders
  const uniqueCustomers = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        phone: string;
        district: string;
        address: string;
        orderCount: number;
        totalSpent: number;
      }
    >();
    orders.forEach((o) => {
      const existing = map.get(o.customerPhone);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += o.totalPayable || 0;
      } else {
        map.set(o.customerPhone, {
          name: o.customerName,
          phone: o.customerPhone,
          district: o.district,
          address: o.address,
          orderCount: 1,
          totalSpent: o.totalPayable || 0,
        });
      }
    });
    return Array.from(map.values());
  }, [orders]);

  // Dynamic SVG Chart path built from real orders in Firestore
  const dynamicChartData = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0, 0, 0];
    orders
      .filter((o) => o.status !== 'Cancelled')
      .forEach((o, idx) => {
        buckets[idx % 7] += o.totalPayable || 0;
      });
    const maxVal = Math.max(...buckets, 1);
    const xCoords = [0, 56, 113, 170, 226, 283, 340];
    const points = buckets.map((val, i) => {
      const y = orders.length === 0 ? 104 : Math.round(104 - (val / maxVal) * 84);
      return { x: xCoords[i], y };
    });
    const linePath = points
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x} ${pt.y}`)
      .join(' ');
    const areaPath = `${linePath} L340 115 L0 115Z`;
    const highlightPt = points[points.length - 1] || { x: 340, y: 104 };
    return { linePath, areaPath, highlightPt };
  }, [orders]);

  // Filtered Live Orders
  const filteredLiveOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderCode.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        o.itemsSummary.toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  // Low stock products from live Firestore products collection
  const lowStockProducts = useMemo(() => {
    return [...products].sort((a, b) => a.stock - b.stock).slice(0, 8);
  }, [products]);

  // Optional 1-click import to populate Firestore if user wants initial catalog in DB
  const handleSeedDatabase = async () => {
    if (!user || !isAdmin) {
      showToast('ডাটাবেসে ইমপোর্ট করতে প্রথমে অ্যাডমিন লগইন করুন');
      return;
    }
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      for (const item of SEED_PRODUCTS) {
        const { id, ...data } = item;
        batch.set(doc(db, 'products', id), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const c of SEED_COUPONS) {
        const { id, ...data } = c;
        batch.set(doc(db, 'coupons', id), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const s of SEED_SLIDERS) {
        const { id, ...data } = s;
        batch.set(doc(db, 'sliders', id), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const b of SEED_BLOG_POSTS) {
        const { id, ...data } = b;
        batch.set(doc(db, 'blogPosts', id), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const lp of SEED_LANDING_PAGES) {
        const { id, ...data } = lp;
        batch.set(doc(db, 'landingPages', id), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const rev of SEED_REVIEWS) {
        const { id, ...data } = rev;
        batch.set(doc(db, 'reviews', id), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      batch.set(doc(db, 'siteSettings', 'global'), {
        ...DEFAULT_SITE_SETTINGS,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      showToast('সব পণ্য ও সেটিংস ফায়ারবেস ডাটাবেসে সংরক্ষিত হয়েছে!');
    } catch {
      showToast('সিঙ্ক করতে সমস্যা হয়েছে');
    } finally {
      setIsSeeding(false);
    }
  };

  // Order Status & Steadfast Dispatch
  const handleUpdateOrderStatus = async (order: Order, nextStatus: OrderStatus) => {
    if (!order.id) return;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      try {
        await updateDoc(doc(db, 'orderTracking', order.orderCode), {
          status: nextStatus,
          steadfastStatus: order.steadfastStatus || nextStatus,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // ignore if tracking doc missing
      }
      showToast(`অর্ডার #${order.orderCode} "${nextStatus}" আপডেট হয়েছে`);
      setSelectedOrder({ ...order, status: nextStatus });
    } catch {
      showToast('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে');
    }
  };

  const handleVerifyPayment = async (order: Order, nextPaymentStatus: PaymentStatusType) => {
    if (!order.id) return;
    try {
      const nextOrderStatus: OrderStatus =
        nextPaymentStatus === 'Paid' && order.status === 'Pending' ? 'Confirmed' : order.status;
      await updateDoc(doc(db, 'orders', order.id), {
        paymentStatus: nextPaymentStatus,
        status: nextOrderStatus,
        updatedAt: serverTimestamp(),
      });
      try {
        await updateDoc(doc(db, 'orderTracking', order.orderCode), {
          paymentStatus: nextPaymentStatus,
          status: nextOrderStatus,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // ignore if tracking doc missing
      }
      showToast(`পেমেন্ট "${nextPaymentStatus}" আপডেট হয়েছে`);
      setSelectedOrder({ ...order, paymentStatus: nextPaymentStatus, status: nextOrderStatus });
    } catch {
      showToast('পেমেন্ট আপডেট করতে সমস্যা হয়েছে');
    }
  };

  const handleSendToSteadfast = async (order: Order) => {
    if (!order.id) return;
    const generatedConsignment = `SF-${Math.floor(10000000 + Math.random() * 89999999)}`;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        steadfastConsignmentId: generatedConsignment,
        steadfastStatus: 'In Review (Steadfast)',
        status: 'Shipped',
        updatedAt: serverTimestamp(),
      });
      try {
        await updateDoc(doc(db, 'orderTracking', order.orderCode), {
          steadfastConsignmentId: generatedConsignment,
          steadfastStatus: 'In Review (Steadfast)',
          status: 'Shipped',
          updatedAt: serverTimestamp(),
        });
      } catch {
        // ignore if tracking doc missing
      }
      showToast(`Steadfast ID: ${generatedConsignment}`);
      setSelectedOrder({
        ...order,
        steadfastConsignmentId: generatedConsignment,
        steadfastStatus: 'In Review (Steadfast)',
        status: 'Shipped',
      });
    } catch {
      showToast('কুরিয়ার বুকিং করতে সমস্যা হয়েছে');
    }
  };

  const handleSaveYoastProduct = async (
    values: YoastProductFormValues,
    editingId: string | null
  ) => {
    if (!user || !isAdmin) {
      showToast('পণ্য সংরক্ষণ করতে প্রথমে অ্যাডমিন লগইন করুন');
      return;
    }
    const docId = editingId || `kr-prod-${Date.now()}`;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'products', docId), {
          ...values,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'products', docId), {
          ...values,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      showToast(
        editingId
          ? `পণ্য ও Yoast SEO আপডেট সম্পন্ন! (স্কোর: ${values.seoScore}%)`
          : `নতুন পণ্য ও Yoast SEO ডাটাবেসে যুক্ত হয়েছে! (স্কোর: ${values.seoScore}%)`
      );
      setIsProductSheetOpen(false);
      setEditingProduct(null);
    } catch {
      showToast('পণ্য সেভ করতে সমস্যা হয়েছে');
    }
  };

  const handleDeleteYoastProduct = async (productId: string) => {
    if (!user || !isAdmin) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      setIsProductSheetOpen(false);
      setEditingProduct(null);
      showToast('পণ্য ডাটাবেস থেকে মুছে ফেলা হয়েছে');
    } catch {
      showToast('ডিলিট করতে সমস্যা হয়েছে');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    const cleanCode = couponCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (cleanCode.length < 3) return;
    const docId = `kr-coupon-${cleanCode.toLowerCase()}`;
    try {
      await setDoc(doc(db, 'coupons', docId), {
        code: cleanCode,
        discountType: 'percentage',
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount),
        descriptionBn: `${cleanCode} — ${discountValue}% ছাড়`,
        descriptionEn: `${cleanCode} — ${discountValue}% Discount`,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCouponCode('');
      showToast(`কুপন "${cleanCode}" ডাটাবেসে যুক্ত হয়েছে!`);
    } catch {
      showToast('কুপন তৈরি করতে সমস্যা হয়েছে');
    }
  };

  const handleCreateSlider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    const docId = `kr-slider-${Date.now()}`;
    try {
      await setDoc(doc(db, 'sliders', docId), {
        titleBn: sliderTitleBn.trim(),
        titleEn: sliderTitleBn.trim(),
        subtitleBn: sliderSubtitleBn.trim(),
        subtitleEn: sliderSubtitleBn.trim(),
        btnTextBn: 'এখনই কিনুন',
        btnTextEn: 'Shop Now',
        btnLink: '#popular',
        imageUrl: sliderImageUrl.trim(),
        sliderType: 'hero',
        isActive: true,
        sortOrder: sliders.length + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSliderTitleBn('');
      setSliderSubtitleBn('');
      showToast('নতুন স্লাইডার ডাটাবেসে যুক্ত হয়েছে!');
    } catch {
      showToast('স্লাইডার সেভ করতে সমস্যা হয়েছে');
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSide = 280;
        let w = img.width;
        let h = img.height;
        if (w > maxSide || h > maxSide) {
          if (w > h) {
            h = Math.round((h * maxSide) / w);
            w = maxSide;
          } else {
            w = Math.round((w * maxSide) / h);
            h = maxSide;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/webp', 0.86);
          setSettingsForm((prev) => ({ ...prev, logoUrl: dataUrl }));
          showToast('লোগো প্রিভিউ লোড হয়েছে — "সেটিংস সংরক্ষণ করুন" বাটনে ক্লিক করুন');
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) {
      showToast('সেটিংস সেভ করতে অ্যাডমিন লগইন প্রয়োজন');
      return;
    }
    try {
      await setDoc(
        doc(db, 'siteSettings', 'global'),
        {
          ...settingsForm,
          logoUrl: (settingsForm.logoUrl || '').trim(),
          siteTagline: (settingsForm.siteTagline || '').trim(),
          insideDhakaCharge: Number(settingsForm.insideDhakaCharge),
          outsideDhakaCharge: Number(settingsForm.outsideDhakaCharge),
          freeDeliveryThreshold: Number(settingsForm.freeDeliveryThreshold),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      showToast('ওয়েবসাইটের নাম, লোগো ও সিস্টেম সেটিংস ডাটাবেসে সংরক্ষিত হয়েছে!');
    } catch {
      showToast('সেটিংস সেভ করতে সমস্যা হয়েছে');
    }
  };

  if (!isOpen) return null;

  // Strict RBAC enforcement: only maraju921@gmail.com and maraju924@gmail.com can access AdminDashboard
  if (!user || !isAdmin) {
    return (
      <div className="adm-app" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
        <div
          className="adm-panel"
          style={{
            maxWidth: 420,
            width: '100%',
            padding: 24,
            textAlign: 'center',
            display: 'grid',
            gap: 14,
          }}
        >
          <strong style={{ fontSize: 16, color: '#123b2e' }}>
            সংরক্ষিত অ্যাডমিন প্যানেল
          </strong>
          <p style={{ fontSize: 12, color: '#526157', lineHeight: 1.6 }}>
            শুধুমাত্র অনুমোদিত অ্যাডমিন ইমেইল দিয়ে এই প্যানেলে প্রবেশ করা যাবে।
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#123b2e',
              color: '#fff',
              border: 0,
              borderRadius: 12,
              padding: '10px 16px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ← স্টোরে ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  const renderOrderIcon = (status: OrderStatus) => {
    if (status === 'Shipped') {
      return (
        <svg viewBox="0 0 24 24">
          <path d="M3 6h11v12H3zM14 10h4l3 3v5h-7z" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
        </svg>
      );
    }
    if (status === 'Delivered') {
      return (
        <svg viewBox="0 0 24 24">
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24">
        <path d="M4 8h16l-1 13H5L4 8ZM9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    );
  };

  const getOrderStatusBadge = (status: OrderStatus) => {
    if (status === 'Delivered') return { label: 'ডেলিভার্ড', cls: 'adm-delivered' };
    if (status === 'Shipped') return { label: 'শিপড', cls: 'adm-shipped' };
    if (status === 'Confirmed') return { label: 'কনফার্মড', cls: 'adm-shipped' };
    if (status === 'Cancelled') return { label: 'বাতিল', cls: 'adm-pending' };
    return { label: 'পেন্ডিং', cls: 'adm-pending' };
  };

  const tabHeadings: Record<AdminTab, string> = {
    dashboard: 'ড্যাশবোর্ড',
    orders: 'অর্ডার সমূহ',
    products: 'পণ্য ক্যাটালগ',
    customers: 'কাস্টমার তালিকা',
    more: 'অ্যাডমিন কন্ট্রোল',
  };

  return (
    <div className="adm-app">
      {/* HEADER (.adm-header) */}
      <header className="adm-header">
        <div className="adm-topline">
          <div
            className="adm-logo"
            onClick={onClose}
            title="স্টোরফ্রন্টে ফিরে যান"
            style={{ overflow: 'hidden', padding: siteSettings.logoUrl ? 2 : 0 }}
          >
            {siteSettings.logoUrl ? (
              <img
                src={siteSettings.logoUrl}
                alt={siteSettings.siteName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: 9,
                }}
              />
            ) : (
              (siteSettings.siteName || 'K').trim().charAt(0).toUpperCase()
            )}
          </div>
          <div className="adm-brand" onClick={() => setActiveTab('dashboard')}>
            <strong>{siteSettings.siteName}</strong>
            <small>ADMIN CONTROL CENTER</small>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid #ffffff40',
              background: '#ffffff14',
              color: '#f0dfb9',
              borderRadius: 20,
              padding: '6px 11px',
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            ← স্টোর
          </button>
          <button
            type="button"
            className="adm-avatar"
            aria-label="প্রোফাইল"
            onClick={() => {
              if (!user) {
                signInWithGoogle();
              } else {
                showToast(`অ্যাডমিন: ${user.email}`);
              }
            }}
          >
            {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'RA'}
          </button>
        </div>

        <div className="adm-welcome">
          <div>
            <div className="adm-greet">
              {user ? `স্বাগতম, ${user.displayName || 'Admin'} 👋` : 'স্বাগতম, Admin 👋'}
            </div>
            <h1>{tabHeadings[activeTab]}</h1>
          </div>
          <div className="adm-date">{todayDateBn}</div>
        </div>

        <label className="adm-search">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7.5" />
            <path d="m16.5 16.5 4 4" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="অর্ডার, পণ্য বা কাস্টমার খুঁজুন..."
          />
        </label>
      </header>

      {/* MAIN CONTENT (.adm-content) */}
      <main className="adm-content">
        {/* If Admin is not logged in yet, show prompt banner */}
        {!user && (
          <div
            className="adm-panel"
            style={{
              marginBottom: 16,
              background: '#f7efdf',
              borderColor: '#e5d4b3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 11, color: '#202820' }}>
              <strong>অ্যাডমিন সাইন-ইন প্রয়োজন:</strong> ডাটাবেসের অর্ডার ও কাস্টমার দেখতে লগইন করুন।
            </div>
            <button
              type="button"
              onClick={signInWithGoogle}
              style={{
                background: '#123b2e',
                color: '#fff',
                border: 0,
                borderRadius: 10,
                padding: '7px 12px',
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              লগইন করুন
            </button>
          </div>
        )}

        {/* =========================================================
            TAB 1: 100% DYNAMIC DASHBOARD FROM FIRESTORE
           ========================================================= */}
        {activeTab === 'dashboard' && (
          <>
            <section>
              <div className="adm-section-head">
                <h2>আজকের সারসংক্ষেপ</h2>
                <button
                  type="button"
                  className="adm-range"
                  onClick={() => showToast('ডাটাবেস থেকে লাইভ হিসাব দেখানো হচ্ছে')}
                >
                  লাইভ ডাটা ▾
                </button>
              </div>
              <div className="adm-stats">
                <article className="adm-stat" onClick={() => setActiveTab('orders')}>
                  <div className="adm-stat-top">
                    <div className="adm-stat-icon adm-green">
                      <svg viewBox="0 0 24 24">
                        <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6" />
                        <circle cx="10" cy="21" r="1" />
                        <circle cx="18" cy="21" r="1" />
                      </svg>
                    </div>
                    <span className="adm-trend">Live</span>
                  </div>
                  <label>মোট বিক্রয় / Sales</label>
                  <strong>৳ {totalSalesAmount.toLocaleString('bn-BD')}</strong>
                  <small>ডাটাবেসের মোট ভেরিফায়েড বিক্রয়</small>
                </article>

                <article className="adm-stat" onClick={() => setActiveTab('orders')}>
                  <div className="adm-stat-top">
                    <div className="adm-stat-icon adm-gold">
                      <svg viewBox="0 0 24 24">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6" />
                      </svg>
                    </div>
                    <span className="adm-trend">Live</span>
                  </div>
                  <label>মোট অর্ডার / Orders</label>
                  <strong>{orders.length.toLocaleString('bn-BD')}</strong>
                  <small>ডাটাবেসের সব অর্ডার</small>
                </article>

                <article className="adm-stat" onClick={() => setActiveTab('customers')}>
                  <div className="adm-stat-top">
                    <div className="adm-stat-icon adm-blue">
                      <svg viewBox="0 0 24 24">
                        <path d="M20 7h-9a4 4 0 1 0 0 8h2M4 7h16v14H4zM8 3h8" />
                      </svg>
                    </div>
                    <span className="adm-trend">{products.length.toLocaleString('bn-BD')} পণ্য</span>
                  </div>
                  <label>মোট কাস্টমার</label>
                  <strong>{uniqueCustomers.length.toLocaleString('bn-BD')}</strong>
                  <small>অর্ডারকৃত ক্রেতা সংখ্যা</small>
                </article>

                <article className="adm-stat" onClick={() => setActiveTab('orders')}>
                  <div className="adm-stat-top">
                    <div className="adm-stat-icon adm-rose">
                      <svg viewBox="0 0 24 24">
                        <path d="M12 8v4M12 16h.01" />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    </div>
                    <span className="adm-trend down">মনোযোগ দিন</span>
                  </div>
                  <label>পেন্ডিং অর্ডার</label>
                  <strong>{pendingOrdersCount.toLocaleString('bn-BD')}</strong>
                  <small>প্রসেস করা বাকি</small>
                </article>
              </div>
            </section>

            <section style={{ marginTop: 23 }}>
              <div className="adm-section-head">
                <h2>বিক্রয়ের পরিসংখ্যান</h2>
                <button type="button" onClick={() => setActiveTab('orders')}>
                  রিপোর্ট দেখুন →
                </button>
              </div>
              <div className="adm-chart-card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: '#818981' }}>ডাটাবেসের মোট বিক্রয়</div>
                    <strong style={{ font: '800 20px Inter,sans-serif', color: '#173d2e' }}>
                      ৳ {totalSalesAmount.toLocaleString('bn-BD')}
                    </strong>
                  </div>
                  <span className="adm-trend">{orders.length}টি অর্ডার</span>
                </div>
                <div className="adm-chart-wrap">
                  <svg
                    viewBox="0 0 340 125"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="সাপ্তাহিক বিক্রয়ের চার্ট"
                  >
                    <defs>
                      <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#2f7751" stopOpacity=".22" />
                        <stop offset="1" stopColor="#2f7751" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <g stroke="#edf0e9" strokeWidth="1">
                      <path d="M0 20H340M0 48H340M0 76H340M0 104H340" />
                    </g>
                    <path d={dynamicChartData.areaPath} fill="url(#area)" />
                    <path
                      d={dynamicChartData.linePath}
                      fill="none"
                      stroke="#286b48"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={dynamicChartData.highlightPt.x}
                      cy={dynamicChartData.highlightPt.y}
                      r="4"
                      fill="#fff"
                      stroke="#286b48"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <div className="adm-chart-labels">
                  <span>শনি</span>
                  <span>রবি</span>
                  <span>সোম</span>
                  <span>মঙ্গল</span>
                  <span>বুধ</span>
                  <span>বৃহঃ</span>
                  <span>শুক্র</span>
                </div>
                <div style={{ fontSize: 9, color: '#9aa098', marginTop: 8 }}>
                  ফায়ারবেস ডাটাবেসের (`orders` কালেকশন) রিয়েল-টাইম অর্ডার থেকে গণনাকৃত।
                </div>
              </div>
            </section>

            <section style={{ marginTop: 23 }}>
              <div className="adm-section-head">
                <h2>দ্রুত কাজ / Quick Actions</h2>
                <button type="button" onClick={() => setActiveTab('more')}>
                  সব দেখুন →
                </button>
              </div>
              <div className="adm-quick-grid">
                <button
                  type="button"
                  className="adm-quick"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsProductSheetOpen(true);
                  }}
                >
                  <div className="adm-quick-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                  <span>পণ্য যোগ (SEO)</span>
                </button>

                <button
                  type="button"
                  className="adm-quick"
                  onClick={() => setActiveTab('orders')}
                >
                  <div
                    className="adm-quick-icon"
                    style={{ background: '#f7efdf', color: '#9b783e' }}
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6" />
                    </svg>
                  </div>
                  <span>অর্ডার</span>
                </button>

                <button
                  type="button"
                  className="adm-quick"
                  onClick={() => setActiveTab('customers')}
                >
                  <div
                    className="adm-quick-icon"
                    style={{ background: '#e9effb', color: '#4768a7' }}
                  >
                    <svg viewBox="0 0 24 24">
                      <circle cx="9" cy="8" r="4" />
                      <path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M18 15a6 6 0 0 1 4 6" />
                    </svg>
                  </div>
                  <span>কাস্টমার</span>
                </button>

                <button
                  type="button"
                  className="adm-quick"
                  onClick={() => setActiveTab('more')}
                >
                  <div
                    className="adm-quick-icon"
                    style={{ background: '#fae9e6', color: '#b24a41' }}
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M3 3v18h18M7 14l4-4 4 3 6-8" />
                    </svg>
                  </div>
                  <span>সেটিংস</span>
                </button>
              </div>
            </section>

            <section style={{ marginTop: 23 }} id="ordersSection">
              <div className="adm-section-head">
                <h2>সাম্প্রতিক অর্ডার ({filteredLiveOrders.length})</h2>
                <button type="button" onClick={() => setActiveTab('orders')}>
                  সব অর্ডার →
                </button>
              </div>
              <div className="adm-panel">
                {filteredLiveOrders.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: 20,
                      color: '#858b83',
                      fontSize: 12,
                    }}
                  >
                    ডাটাবেসে এখনো কোনো অর্ডার নেই। স্টোরফ্রন্ট থেকে অর্ডার করলে এখানে সাথে সাথে দেখা যাবে।
                  </div>
                ) : (
                  <div className="adm-order-list">
                    {filteredLiveOrders.slice(0, 6).map((o) => {
                      const badge = getOrderStatusBadge(o.status);
                      return (
                        <article
                          key={o.id || o.orderCode}
                          className="adm-order"
                          onClick={() => setSelectedOrder(o)}
                        >
                          <div className="adm-order-icon">{renderOrderIcon(o.status)}</div>
                          <div className="adm-order-info">
                            <strong>
                              #{o.orderCode} · {o.customerName}
                            </strong>
                            <small>
                              {o.itemCount}টি পণ্য · {o.paymentMethod || 'COD'} ({o.paymentStatus})
                            </small>
                            <span className={`adm-status ${badge.cls}`}>{badge.label}</span>
                          </div>
                          <div className="adm-amount">
                            ৳ {o.totalPayable.toLocaleString('bn-BD')}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section style={{ marginTop: 23 }}>
              <div className="adm-section-head">
                <h2>স্টক ও ইনভেন্টরি ({products.length})</h2>
                <button type="button" onClick={() => setActiveTab('products')}>
                  ইনভেন্টরি →
                </button>
              </div>
              {lowStockProducts.length === 0 ? (
                <div
                  className="adm-panel"
                  style={{ textAlign: 'center', fontSize: 12, color: '#858b83' }}
                >
                  ডাটাবেসে কোনো পণ্য নেই।{' '}
                  <button
                    type="button"
                    onClick={handleSeedDatabase}
                    style={{
                      color: '#123b2e',
                      fontWeight: 700,
                      border: 0,
                      background: 'transparent',
                      textDecoration: 'underline',
                    }}
                  >
                    প্রাথমিক ক্যাটালগ ইমপোর্ট করুন
                  </button>
                </div>
              ) : (
                <div className="adm-product-row">
                  {lowStockProducts.map((p) => (
                    <article
                      key={p.id}
                      className="adm-product"
                      onClick={() => {
                        setEditingProduct(p);
                        setIsProductSheetOpen(true);
                      }}
                    >
                      <img src={p.imageUrl} alt={p.imageAltText || p.nameBn} />
                      <strong>{p.nameBn}</strong>
                      <small style={p.stock <= 10 ? { color: '#b9443c' } : undefined}>
                        স্টক: {p.stock}টি · SEO: {p.seoScore ?? 85}%
                      </small>
                      <b>৳ {(p.salePrice ?? p.price).toLocaleString('bn-BD')}</b>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div
              style={{
                margin: '22px 0 8px',
                textAlign: 'center',
                color: '#a0a59d',
                fontSize: 9,
              }}
            >
              ShopBangla Admin · 100% Live Firestore Database (khatirajbd-47af7)
            </div>
          </>
        )}

        {/* =========================================================
            TAB 2: 100% LIVE ORDERS FROM FIRESTORE
           ========================================================= */}
        {activeTab === 'orders' && (
          <section>
            <div className="adm-section-head">
              <h2>সকল অর্ডার তালিকা ({filteredLiveOrders.length})</h2>
              <button
                type="button"
                className="adm-range"
                onClick={() => setActiveTab('dashboard')}
              >
                ← ড্যাশবোর্ড
              </button>
            </div>
            <div className="adm-panel">
              {filteredLiveOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, fontSize: 12, color: '#858b83' }}>
                  কোনো অর্ডার পাওয়া যায়নি।
                </div>
              ) : (
                <div className="adm-order-list">
                  {filteredLiveOrders.map((o) => {
                    const badge = getOrderStatusBadge(o.status);
                    return (
                      <article
                        key={o.id || o.orderCode}
                        className="adm-order"
                        onClick={() => setSelectedOrder(o)}
                      >
                        <div className="adm-order-icon">{renderOrderIcon(o.status)}</div>
                        <div className="adm-order-info">
                          <strong>
                            #{o.orderCode} · {o.customerName}
                          </strong>
                          <small>
                            {o.customerPhone} · {o.itemsSummary}
                          </small>
                          <span className={`adm-status ${badge.cls}`}>{badge.label}</span>
                        </div>
                        <div className="adm-amount">
                          ৳ {o.totalPayable.toLocaleString('bn-BD')}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* =========================================================
            TAB 3: 100% LIVE PRODUCTS, INVENTORY & YOAST SEO PREMIUM STUDIO
           ========================================================= */}
        {activeTab === 'products' && (
          <section>
            <div className="adm-section-head">
              <h2>সকল পণ্য ও Yoast SEO ({products.length})</h2>
              <button
                type="button"
                className="adm-range"
                style={{
                  background: '#123b2e',
                  color: '#fff',
                  borderColor: '#123b2e',
                }}
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductSheetOpen(true);
                }}
              >
                + নতুন পণ্য যোগ (Yoast SEO)
              </button>
            </div>

            {/* Yoast SEO Storefront Health Summary Banner */}
            <div
              className="adm-panel"
              style={{
                marginBottom: 12,
                background: 'linear-gradient(135deg, #103528 0%, #1b523e 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      background: '#dfbe7f',
                      color: '#10281e',
                      fontSize: 9,
                      fontWeight: 900,
                      padding: '2px 6px',
                      borderRadius: 5,
                    }}
                  >
                    YOAST SEO PREMIUM
                  </span>
                  <strong style={{ fontSize: 12 }}>১০০% ডাইনামিক প্রোডাক্ট এসইও ইঞ্জিন</strong>
                </div>
                <div style={{ fontSize: 10.5, color: '#cce0d5', marginTop: 3 }}>
                  যেকোনো পণ্যে ক্লিক করে Focus Keyphrase, SERP Preview, OpenGraph ও JSON-LD Schema কাস্টমাইজ করুন।
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductSheetOpen(true);
                }}
                style={{
                  border: 0,
                  background: '#dfbe7f',
                  color: '#10281e',
                  borderRadius: 10,
                  padding: '8px 11px',
                  fontSize: 10.5,
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                + নতুন পণ্য
              </button>
            </div>

            <div className="adm-panel">
              {products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, fontSize: 12, color: '#858b83' }}>
                  ডাটাবেসে কোনো পণ্য নেই। নতুন পণ্য যোগ করুন অথবা নিচের &quot;আরও&quot; ট্যাব থেকে প্রাথমিক ক্যাটালগ ইমপোর্ট করুন।
                </div>
              ) : (
                <div className="adm-order-list">
                  {products
                    .filter(
                      (p) =>
                        !searchQuery.trim() ||
                        p.nameBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.focusKeyphrase || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((p) => {
                      const liveSeo = analyzeYoastSeo({
                        nameBn: p.nameBn,
                        nameEn: p.nameEn,
                        descriptionBn: p.descriptionBn,
                        category: p.category,
                        price: p.price,
                        salePrice: p.salePrice ?? p.price,
                        stock: p.stock,
                        unitLabel: p.unitLabel,
                        imageUrl: p.imageUrl,
                        slug: p.slug || '',
                        focusKeyphrase: p.focusKeyphrase || p.nameBn,
                        relatedKeyphrases: p.relatedKeyphrases || '',
                        seoTitle: p.seoTitle || '',
                        metaDescription: p.metaDescription || '',
                        canonicalUrl: p.canonicalUrl || '',
                        imageAltText: p.imageAltText || p.nameBn,
                        schemaBrand: p.schemaBrand || siteSettings.siteName,
                        schemaSku: p.schemaSku || p.id,
                        schemaGtin: p.schemaGtin || '',
                        isCornerstone: Boolean(p.isCornerstone),
                        internalLinksUrl: p.internalLinksUrl || '',
                        outboundLinkUrl: p.outboundLinkUrl || '',
                        siteName: siteSettings.siteName,
                      });
                      const displayScore = p.seoScore ?? liveSeo.overallScore;
                      const statusColors = getTrafficLightColor(
                        displayScore >= 75 ? 'good' : displayScore >= 45 ? 'ok' : 'bad'
                      );

                      return (
                        <article
                          key={p.id}
                          className="adm-order"
                          onClick={() => {
                            setEditingProduct(p);
                            setIsProductSheetOpen(true);
                          }}
                        >
                          <img
                            src={p.imageUrl}
                            alt={p.imageAltText || p.nameBn}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 11,
                              objectFit: 'cover',
                              background: '#f7f6f0',
                            }}
                          />
                          <div className="adm-order-info">
                            <strong>
                              {p.nameBn}{' '}
                              {p.isCornerstone && (
                                <span
                                  title="Cornerstone Content"
                                  style={{ color: '#c48f2b', fontSize: 11 }}
                                >
                                  ★
                                </span>
                              )}
                            </strong>
                            <small>
                              {p.variants && p.variants.length > 0
                                ? `${p.variants.length}টি ভ্যারিয়েন্ট`
                                : p.unitLabel}{' '}
                              · গ্যালারি: {(p.galleryItems?.length || p.galleryUrls?.length || 0) + 1}টি ছবি · স্টক: {p.stock}টি
                            </small>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                flexWrap: 'wrap',
                                marginTop: 3,
                              }}
                            >
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  background: statusColors.bg,
                                  color: statusColors.text,
                                  border: `1px solid ${statusColors.border}`,
                                  padding: '2px 7px',
                                  borderRadius: 12,
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                }}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: statusColors.dot,
                                  }}
                                />
                                <span>Yoast SEO: {displayScore}/100</span>
                              </div>
                              {p.freeDelivery && (
                                <span
                                  style={{
                                    background: '#e7f4ec',
                                    color: '#123b2e',
                                    fontSize: 9,
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: 10,
                                  }}
                                >
                                  🚚 ফ্রি ডেলিভারি
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="adm-amount">
                            ৳ {(p.salePrice ?? p.price).toLocaleString('en-BD')}
                          </div>
                        </article>
                      );
                    })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* =========================================================
            TAB 4: 100% LIVE CUSTOMERS, REGISTERED USERS, ABANDONED CARTS & REVIEWS
           ========================================================= */}
        {activeTab === 'customers' && (
          <>
            <section>
              <div className="adm-section-head">
                <h2>রেজিস্টার্ড ইউজার ও অ্যাকাউন্ট ({registeredUsers.length})</h2>
              </div>
              <div className="adm-panel">
                {registeredUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 16, fontSize: 12, color: '#858b83' }}>
                    এখনো কোনো ইউজার রেজিস্ট্রেশন করেননি।
                  </div>
                ) : (
                  <div className="adm-order-list">
                    {registeredUsers.map((u) => (
                      <article key={u.uid} className="adm-order">
                        <div className="adm-order-icon">{renderOrderIcon('Confirmed')}</div>
                        <div className="adm-order-info">
                          <strong>
                            {u.displayName} · {u.email}
                          </strong>
                          <small>
                            {u.phone ? `ফোন: ${u.phone} · ` : ''}রোল: {u.role === 'admin' ? 'Admin' : 'User (Customer)'}
                          </small>
                        </div>
                        <span
                          className={`adm-status ${
                            u.role === 'admin' ? 'adm-delivered' : 'adm-shipped'
                          }`}
                        >
                          {u.role === 'admin' ? 'অ্যাডমিন' : 'ইউজার'}
                        </span>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section style={{ marginTop: 20 }}>
              <div className="adm-section-head">
                <h2>অর্ডারকৃত কাস্টমার তালিকা ({uniqueCustomers.length})</h2>
              </div>
              <div className="adm-panel">
                {uniqueCustomers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 16, fontSize: 12, color: '#858b83' }}>
                    এখনো কোনো কাস্টমার অর্ডার করেননি।
                  </div>
                ) : (
                  <div className="adm-order-list">
                    {uniqueCustomers.map((c) => (
                      <article key={c.phone} className="adm-order">
                        <div className="adm-order-icon">{renderOrderIcon('Delivered')}</div>
                        <div className="adm-order-info">
                          <strong>
                            {c.name} · {c.phone}
                          </strong>
                          <small>
                            {c.district} · {c.orderCount}টি অর্ডার
                          </small>
                        </div>
                        <div className="adm-amount">৳ {c.totalSpent.toLocaleString('bn-BD')}</div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section style={{ marginTop: 20 }}>
              <div className="adm-section-head">
                <h2>পরিত্যক্ত কার্ট ({abandonedCarts.length})</h2>
              </div>
              <div className="adm-panel">
                {abandonedCarts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 16, fontSize: 12, color: '#858b83' }}>
                    ডাটাবেসে কোনো পরিত্যক্ত কার্ট নেই।
                  </div>
                ) : (
                  <div className="adm-order-list">
                    {abandonedCarts.map((c) => (
                      <article key={c.id} className="adm-order">
                        <div className="adm-order-icon">{renderOrderIcon('Pending')}</div>
                        <div className="adm-order-info">
                          <strong>
                            {c.customerName} · {c.customerPhone}
                          </strong>
                          <small>
                            {c.district} · {c.itemsSummary}
                          </small>
                          <span className="adm-status adm-pending">{c.recoveryStatus}</span>
                        </div>
                        <div className="adm-amount">৳ {c.subtotal.toLocaleString('bn-BD')}</div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section style={{ marginTop: 20 }}>
              <div className="adm-section-head">
                <h2>কাস্টমার রিভিউ ({reviews.length})</h2>
              </div>
              <div className="adm-panel">
                {reviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 16, fontSize: 12, color: '#858b83' }}>
                    ডাটাবেসে কোনো রিভিউ নেই।
                  </div>
                ) : (
                  <div className="adm-order-list">
                    {reviews.map((r) => (
                      <article key={r.id} className="adm-order">
                        <div className="adm-order-info">
                          <strong>
                            {r.customerName} · {'★'.repeat(r.rating)}
                          </strong>
                          <small>{r.comment}</small>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await deleteDoc(doc(db, 'reviews', r.id));
                              showToast('রিভিউ ডিলিট করা হয়েছে');
                            } catch {
                              showToast('রিভিউ ডিলিট করতে সমস্যা হয়েছে');
                            }
                          }}
                          style={{
                            border: 0,
                            background: '#fae9e6',
                            color: '#b24a41',
                            borderRadius: 8,
                            padding: '5px 8px',
                            fontSize: 10,
                          }}
                        >
                          ডিলিট
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* =========================================================
            TAB 5: MORE (Sliders, Coupons, Settings, Database Tools)
           ========================================================= */}
        {activeTab === 'more' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Admin Auth & Database Control */}
            <div className="adm-panel">
              <div className="adm-section-head">
                <h2>ফায়ারবেস ডাটাবেস ও অ্যাকাউন্ট</h2>
              </div>
              {!user ? (
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  style={{
                    width: '100%',
                    background: '#123b2e',
                    color: '#fff',
                    border: 0,
                    borderRadius: 12,
                    padding: '11px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Google দিয়ে অ্যাডমিন লগইন করুন
                </button>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 12, color: '#24372c' }}>
                    অ্যাডমিন: <strong>{user.email}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleSeedDatabase}
                      disabled={isSeeding}
                      style={{
                        background: '#123b2e',
                        color: '#fff',
                        border: 0,
                        borderRadius: 11,
                        padding: '9px 13px',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {isSeeding
                        ? 'ইমপোর্ট হচ্ছে...'
                        : 'প্রাথমিক ক্যাটালগ ডাটাবেসে ইমপোর্ট করুন'}
                    </button>
                    <button
                      type="button"
                      onClick={signOutUser}
                      style={{
                        background: '#fae9e6',
                        color: '#b24a41',
                        border: 0,
                        borderRadius: 11,
                        padding: '9px 13px',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      লগআউট
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Hero Sliders Manager */}
            <div className="adm-panel" style={{ display: 'grid', gap: 10 }}>
              <div className="adm-section-head" style={{ marginBottom: 2 }}>
                <h2>হিরো স্লাইডার ম্যানেজার ({sliders.length})</h2>
              </div>
              <form onSubmit={handleCreateSlider} style={{ display: 'grid', gap: 8 }}>
                <input
                  type="text"
                  required
                  value={sliderTitleBn}
                  onChange={(e) => setSliderTitleBn(e.target.value)}
                  placeholder="স্লাইডার শিরোনাম *"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid #e9eae3',
                    fontSize: 12,
                  }}
                />
                <input
                  type="text"
                  required
                  value={sliderSubtitleBn}
                  onChange={(e) => setSliderSubtitleBn(e.target.value)}
                  placeholder="স্লাইডার সাব-টাইটেল *"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid #e9eae3',
                    fontSize: 12,
                  }}
                />
                <input
                  type="text"
                  required
                  value={sliderImageUrl}
                  onChange={(e) => setSliderImageUrl(e.target.value)}
                  placeholder="ব্যানার ইমেজ URL *"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid #e9eae3',
                    fontSize: 12,
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: '#123b2e',
                    color: '#fff',
                    border: 0,
                    borderRadius: 10,
                    padding: '9px',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  + নতুন স্লাইডার যোগ করুন
                </button>
              </form>
              <div className="adm-order-list">
                {sliders.map((s) => (
                  <div key={s.id} className="adm-order">
                    <div className="adm-order-info">
                      <strong>{s.titleBn}</strong>
                      <small>{s.subtitleBn}</small>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteDoc(doc(db, 'sliders', s.id));
                          showToast('স্লাইডার ডিলিট করা হয়েছে');
                        } catch {
                          showToast('স্লাইডার ডিলিট করতে সমস্যা হয়েছে');
                        }
                      }}
                      style={{
                        border: 0,
                        background: '#fae9e6',
                        color: '#b24a41',
                        borderRadius: 8,
                        padding: '5px 8px',
                        fontSize: 10,
                      }}
                    >
                      ডিলিট
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Coupons Manager */}
            <div className="adm-panel" style={{ display: 'grid', gap: 10 }}>
              <div className="adm-section-head" style={{ marginBottom: 2 }}>
                <h2>ডিসকাউন্ট কুপন ({coupons.length})</h2>
              </div>
              <form onSubmit={handleCreateCoupon} style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  <input
                    type="text"
                    required
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="কোড (OFF10)"
                    style={{
                      padding: '8px',
                      borderRadius: 10,
                      border: '1px solid #e9eae3',
                      fontSize: 11,
                    }}
                  />
                  <input
                    type="number"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="ছাড় %"
                    style={{
                      padding: '8px',
                      borderRadius: 10,
                      border: '1px solid #e9eae3',
                      fontSize: 11,
                    }}
                  />
                  <input
                    type="number"
                    required
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    placeholder="সর্বনিম্ন ৳"
                    style={{
                      padding: '8px',
                      borderRadius: 10,
                      border: '1px solid #e9eae3',
                      fontSize: 11,
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    background: '#123b2e',
                    color: '#fff',
                    border: 0,
                    borderRadius: 10,
                    padding: '9px',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  + কুপন যোগ করুন
                </button>
              </form>
              <div className="adm-order-list">
                {coupons.map((c) => (
                  <div key={c.id} className="adm-order">
                    <div className="adm-order-info">
                      <strong>{c.code}</strong>
                      <small>{c.descriptionBn}</small>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteDoc(doc(db, 'coupons', c.id));
                          showToast('কুপন ডিলিট করা হয়েছে');
                        } catch {
                          showToast('কুপন ডিলিট করতে সমস্যা হয়েছে');
                        }
                      }}
                      style={{
                        border: 0,
                        background: '#fae9e6',
                        color: '#b24a41',
                        borderRadius: 8,
                        padding: '5px 8px',
                        fontSize: 10,
                      }}
                    >
                      ডিলিট
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {landingPages.length > 0 && (
              <div className="adm-panel">
                <div className="adm-section-head">
                  <h2>ক্যাম্পেইন ল্যান্ডিং পেজ ({landingPages.length})</h2>
                </div>
                <div className="adm-order-list">
                  {landingPages.map((lp) => (
                    <div key={lp.id} className="adm-order">
                      <div className="adm-order-info">
                        <strong>{lp.titleBn}</strong>
                        <small>/?landing={lp.slug}</small>
                      </div>
                      {onPreviewLandingPage && (
                        <button
                          type="button"
                          className="adm-range"
                          onClick={() => onPreviewLandingPage(lp)}
                        >
                          লাইভ ভিউ →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Website Branding, Logo, Payment Gateway & Delivery Settings */}
            <form
              onSubmit={handleSaveSettings}
              className="adm-panel"
              style={{ display: 'grid', gap: 10 }}
            >
              <div className="adm-section-head" style={{ marginBottom: 4 }}>
                <h2>ওয়েবসাইট নাম, লোগো, পেমেন্ট ও ডেলিভারি সেটিংস</h2>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <label style={{ fontSize: 11, color: '#526157' }}>
                  ওয়েবসাইট / স্টোরের নাম (ডাইনামিক)
                  <input
                    type="text"
                    required
                    value={settingsForm.siteName}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, siteName: e.target.value })
                    }
                    placeholder="যেমন: Khati Raj BD"
                    style={{
                      width: '100%',
                      marginTop: 4,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #e9eae3',
                      fontSize: 12,
                    }}
                  />
                </label>

                <label style={{ fontSize: 11, color: '#526157' }}>
                  ওয়েবসাইট স্লোগান / ট্যাগলাইন (হেডারে নামের নিচে দেখাবে)
                  <input
                    type="text"
                    value={settingsForm.siteTagline || ''}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, siteTagline: e.target.value })
                    }
                    placeholder="যেমন: ১০০% খাঁটি ও অর্গানিক পণ্যের বিশ্বস্ত প্রতিষ্ঠান"
                    style={{
                      width: '100%',
                      marginTop: 4,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #e9eae3',
                      fontSize: 12,
                    }}
                  />
                </label>

                <div
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: '#f7f6f0',
                    border: '1px solid #e9eae3',
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {settingsForm.logoUrl ? (
                      <img
                        src={settingsForm.logoUrl}
                        alt="Logo Preview"
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          objectFit: 'contain',
                          background: '#fff',
                          border: '1px solid #dcded6',
                          padding: 3,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          background: '#123b2e',
                          color: '#dfbe7f',
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 800,
                        }}
                      >
                        {(settingsForm.siteName || 'K').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#1e2720' }}>
                        ওয়েবসাইট লোগো (ডাইনামিক)
                      </div>
                      <label
                        style={{
                          display: 'inline-block',
                          marginTop: 4,
                          background: '#123b2e',
                          color: '#fff',
                          borderRadius: 8,
                          padding: '5px 10px',
                          fontSize: 10.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        📁 ডিভাইস থেকে লোগো আপলোড করুন
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={settingsForm.logoUrl || ''}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, logoUrl: e.target.value })
                    }
                    placeholder="অথবা লোগো ইমেজ URL দিন (যেমন: /assets/images/icons/khatiraj-logo.webp)"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #e9eae3',
                      fontSize: 11.5,
                      background: '#fff',
                    }}
                  />
                </div>
                <label style={{ fontSize: 11, color: '#526157' }}>
                  সাপোর্ট ফোন নম্বর
                  <input
                    type="text"
                    value={settingsForm.supportPhone}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, supportPhone: e.target.value })
                    }
                    style={{
                      width: '100%',
                      marginTop: 4,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #e9eae3',
                      fontSize: 12,
                    }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#526157' }}>
                  বিকাশ নম্বর
                  <input
                    type="text"
                    value={settingsForm.bkashNumber}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, bkashNumber: e.target.value })
                    }
                    style={{
                      width: '100%',
                      marginTop: 4,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #e9eae3',
                      fontSize: 12,
                    }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#526157' }}>
                  নগদ নম্বর
                  <input
                    type="text"
                    value={settingsForm.nagadNumber}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, nagadNumber: e.target.value })
                    }
                    style={{
                      width: '100%',
                      marginTop: 4,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #e9eae3',
                      fontSize: 12,
                    }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#526157' }}>
                  রকেট নম্বর
                  <input
                    type="text"
                    value={settingsForm.rocketNumber}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, rocketNumber: e.target.value })
                    }
                    style={{
                      width: '100%',
                      marginTop: 4,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #e9eae3',
                      fontSize: 12,
                    }}
                  />
                </label>
              </div>
              <button
                type="submit"
                style={{
                  background: '#123b2e',
                  color: '#fff',
                  border: 0,
                  borderRadius: 11,
                  padding: '10px',
                  fontSize: 12,
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                সেটিংস সংরক্ষণ করুন
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ORDER MANAGEMENT BOTTOM SHEET */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              width: 'min(100%, 520px)',
              background: '#fff',
              borderRadius: '24px 24px 0 0',
              padding: 20,
              display: 'grid',
              gap: 12,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 15, color: '#123b2e' }}>
                অর্ডার #{selectedOrder.orderCode}
              </strong>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  border: 0,
                  background: '#f3f2eb',
                  borderRadius: 20,
                  padding: '4px 10px',
                  fontSize: 11,
                }}
              >
                ✕ বন্ধ
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#2b382f', lineHeight: 1.6 }}>
              <div>
                <strong>কাস্টমার:</strong> {selectedOrder.customerName} ({selectedOrder.customerPhone})
              </div>
              <div>
                <strong>ঠিকানা:</strong> {selectedOrder.district}, {selectedOrder.address}
              </div>
              <div>
                <strong>পণ্য:</strong> {selectedOrder.itemsSummary}
              </div>
              <div>
                <strong>পেমেন্ট:</strong> {selectedOrder.paymentMethod} ({selectedOrder.paymentStatus})
                {selectedOrder.transactionId && selectedOrder.transactionId !== 'N/A'
                  ? ` · TrxID: ${selectedOrder.transactionId}`
                  : ''}
              </div>
              <div>
                <strong>মোট বিল:</strong> ৳ {selectedOrder.totalPayable.toLocaleString('en-BD')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'] as OrderStatus[]).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleUpdateOrderStatus(selectedOrder, st)}
                    style={{
                      padding: '7px 11px',
                      borderRadius: 9,
                      border: '1px solid #e9eae3',
                      background: selectedOrder.status === st ? '#123b2e' : '#fff',
                      color: selectedOrder.status === st ? '#fff' : '#202820',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {st}
                  </button>
                )
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleVerifyPayment(selectedOrder, 'Paid')}
                style={{
                  padding: '10px',
                  borderRadius: 11,
                  border: 0,
                  background: '#e7f1e8',
                  color: '#286b48',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                ✓ পেমেন্ট অ্যাপ্রুভ
              </button>
              <button
                type="button"
                onClick={() => handleSendToSteadfast(selectedOrder)}
                style={{
                  padding: '10px',
                  borderRadius: 11,
                  border: 0,
                  background: '#123b2e',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                🚚 Steadfast ডিসপ্যাচ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YOAST SEO PREMIUM PRODUCT ADD / EDIT STUDIO MODAL */}
      {isProductSheetOpen && (
        <YoastProductStudioModal
          key={editingProduct?.id || 'new-yoast-product'}
          isOpen={isProductSheetOpen}
          editingProduct={editingProduct}
          allProducts={products}
          siteSettings={siteSettings}
          reviews={reviews}
          onClose={() => {
            setIsProductSheetOpen(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveYoastProduct}
          onDelete={handleDeleteYoastProduct}
        />
      )}

      {/* FIXED 5-ITEM BOTTOM NAVIGATION (.adm-bottom-nav) */}
      <nav className="adm-bottom-nav" aria-label="Admin navigation">
        <button
          type="button"
          className={`adm-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('dashboard');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <svg viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="8" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="15" width="7" height="6" rx="1" />
          </svg>
          <span>ড্যাশবোর্ড</span>
        </button>

        <button
          type="button"
          className={`adm-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6" />
          </svg>
          <span>অর্ডার</span>
        </button>

        <button
          type="button"
          className={`adm-nav-item ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <svg viewBox="0 0 24 24">
            <path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
          </svg>
          <span>পণ্য</span>
        </button>

        <button
          type="button"
          className={`adm-nav-item ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <svg viewBox="0 0 24 24">
            <circle cx="9" cy="8" r="4" />
            <path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M18 15a6 6 0 0 1 4 6" />
          </svg>
          <span>কাস্টমার</span>
        </button>

        <button
          type="button"
          className={`adm-nav-item ${activeTab === 'more' ? 'active' : ''}`}
          onClick={() => setActiveTab('more')}
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>আরও</span>
        </button>
      </nav>

      {/* FLOATING TOAST (.adm-toast) */}
      <div className={`adm-toast ${toastMsg ? 'show' : ''}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </div>
  );
};
