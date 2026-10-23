import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, isWhitelistedAdminEmail } from './firebase';
import {
  BlogPost,
  CartItem,
  CategoryId,
  Coupon,
  LandingPageItem,
  Language,
  Order,
  Product,
  ReviewItem,
  SiteSettings,
  SliderItem,
  UserProfile,
} from './types';
import { DEFAULT_SITE_SETTINGS } from './data/seedCatalog';
import { CartDrawer } from './components/CartDrawer';
import { ProductDetailModal } from './components/ProductDetailModal';
import { OrderTrackingSection } from './components/OrderTrackingSection';
import { AdminDashboard } from './components/AdminDashboard';
import { CategoryPageView } from './components/CategoryPageView';
import { UserAccountModal } from './components/UserAccountModal';
import { generateSeoSlug, syncDocumentSeoHead } from './utils/yoastSeoEngine';

const CART_STORAGE_KEY = 'khatiraj_cart_v21';
const RECENT_ORDERS_STORAGE_KEY = 'khatiraj_recent_orders_v21';
const WISHLIST_STORAGE_KEY = 'shopbangla_wishlist_v1';

export function App() {
  const [lang, setLang] = useState<Language>('bn');

  // 100% Dynamic Firestore-backed states (Zero static/dummy fallback arrays)
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [sliders, setSliders] = useState<SliderItem[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPageItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllPopular, setShowAllPopular] = useState(false);
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  const [showTrackerSection, setShowTrackerSection] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState<
    'home' | 'categories' | 'wishlist' | 'account' | 'more'
  >('home');
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  // Active Single-Product Campaign Landing Page
  const [activeLandingPage, setActiveLandingPage] = useState<LandingPageItem | null>(null);

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  // Cart starts empty unless user added items
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [recentOrders, setRecentOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_ORDERS_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Order[]) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [openCartInCheckout, setOpenCartInCheckout] = useState(false);
  const [activeProductModal, setActiveProductModal] = useState<Product | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    } catch {
      // ignore storage errors
    }
  }, [wishlist]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_ORDERS_STORAGE_KEY, JSON.stringify(recentOrders));
    } catch {
      // ignore storage errors
    }
  }, [recentOrders]);

  // Auth listener & automatic Firestore users/{uid} registration/sync
  useEffect(() => {
    let unsubUserProfile: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubUserProfile) {
        unsubUserProfile();
        unsubUserProfile = null;
      }

      setUser(currentUser);
      if (!currentUser) {
        setIsAdmin(false);
        setUserProfile(null);
        setIsAdminOpen(false);
        return;
      }

      const whitelistedAdmin = isWhitelistedAdminEmail(currentUser.email);
      let resolvedAdmin = whitelistedAdmin;

      if (!resolvedAdmin) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          resolvedAdmin = adminDoc.exists();
        } catch {
          resolvedAdmin = false;
        }
      }
      setIsAdmin(resolvedAdmin);

      // Ensure every logged-in or registered user has a record in `users/{uid}`
      // maraju921@gmail.com and maraju924@gmail.com get role: 'admin', all others get role: 'user'
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(userRef);
        const assignedRole = resolvedAdmin ? 'admin' : 'user';
        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: (currentUser.email || '').trim().toLowerCase(),
            displayName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Customer'),
            phone: currentUser.phoneNumber || '',
            address: '',
            role: assignedRole,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          });
        } else if (snap.data()?.role !== assignedRole) {
          await setDoc(
            userRef,
            {
              role: assignedRole,
              lastLoginAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      } catch {
        // Ignore transient offline errors
      }

      unsubUserProfile = onSnapshot(
        doc(db, 'users', currentUser.uid),
        (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          }
        },
        () => {}
      );
    });

    return () => {
      unsub();
      if (unsubUserProfile) unsubUserProfile();
    };
  }, []);

  // 100% Live Firestore real-time listeners (No dummy data fallback)
  useEffect(() => {
    setIsLoadingProducts(true);
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        const loaded: Product[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Product, 'id'>),
        }));
        setProducts(loaded);
        setIsLoadingProducts(false);
      },
      () => {
        setProducts([]);
        setIsLoadingProducts(false);
      }
    );

    const unsubCoupons = onSnapshot(
      collection(db, 'coupons'),
      (snap) => {
        const loaded: Coupon[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Coupon, 'id'>),
        }));
        setCoupons(loaded);
      },
      () => setCoupons([])
    );

    const unsubSliders = onSnapshot(
      collection(db, 'sliders'),
      (snap) => {
        const loaded: SliderItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SliderItem, 'id'>),
        }));
        setSliders(
          loaded
            .filter((s) => s.isActive !== false)
            .sort((a, b) => (a.sortOrder || 1) - (b.sortOrder || 1))
        );
      },
      () => setSliders([])
    );

    const unsubBlogs = onSnapshot(
      collection(db, 'blogPosts'),
      (snap) => {
        const loaded: BlogPost[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<BlogPost, 'id'>),
        }));
        setBlogPosts(loaded);
      },
      () => setBlogPosts([])
    );

    const unsubLanding = onSnapshot(
      collection(db, 'landingPages'),
      (snap) => {
        const loaded: LandingPageItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<LandingPageItem, 'id'>),
        }));
        setLandingPages(loaded);
      },
      () => setLandingPages([])
    );

    const unsubReviews = onSnapshot(
      collection(db, 'reviews'),
      (snap) => {
        const loaded: ReviewItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ReviewItem, 'id'>),
        }));
        setReviews(loaded);
      },
      () => setReviews([])
    );

    const unsubSettings = onSnapshot(
      doc(db, 'siteSettings', 'global'),
      (snap) => {
        if (snap.exists()) {
          setSiteSettings({
            ...DEFAULT_SITE_SETTINGS,
            ...(snap.data() as Partial<SiteSettings>),
          });
        }
      },
      () => {}
    );

    return () => {
      unsubProducts();
      unsubCoupons();
      unsubSliders();
      unsubBlogs();
      unsubLanding();
      unsubReviews();
      unsubSettings();
    };
  }, []);

  // Auto-rotate dynamic sliders
  useEffect(() => {
    const count = sliders.length || Math.min(products.length, 4);
    if (count <= 1) return;
    const timer = setInterval(() => {
      setActiveSlideIdx((prev) => (prev + 1) % count);
    }, 5000);
    return () => clearInterval(timer);
  }, [sliders.length, products.length]);

  // Synchronize live Yoast SEO <head> meta tags, OpenGraph, Twitter Cards & Schema.org JSON-LD
  useEffect(() => {
    syncDocumentSeoHead({
      activeProduct: activeProductModal,
      siteSettings,
      reviews,
    });
  }, [activeProductModal, siteSettings, reviews]);

  // Support Yoast SEO Permalink Slugs & 301 Redirect Old Slugs (?product=slug)
  useEffect(() => {
    if (products.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const requestedSlug = params.get('product');
    if (!requestedSlug) return;
    const matched = products.find(
      (p) =>
        p.id === requestedSlug ||
        p.slug === requestedSlug ||
        p.redirectOldSlug === requestedSlug ||
        generateSeoSlug(p.nameEn || p.nameBn) === requestedSlug
    );
    if (matched) {
      setActiveProductModal(matched);
    }
  }, [products]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      showToast(
        exists
          ? lang === 'bn'
            ? 'পছন্দের তালিকা থেকে সরানো হয়েছে'
            : 'Removed from wishlist'
          : lang === 'bn'
          ? 'পছন্দের তালিকায় যুক্ত হয়েছে ♥'
          : 'Added to wishlist ♥'
      );
      return next;
    });
  };

  const handleAddToCart = (
    product: Product,
    qty = 1,
    variantOverride?: string,
    openCheckoutImmediately?: boolean,
    variantMeta?: {
      variantPrice?: number;
      variantRegularPrice?: number;
      variantSku?: string;
      variantImageUrl?: string;
    }
  ) => {
    const firstStructuredVar =
      Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants[0]
        : null;
    const chosenVariant =
      variantOverride ||
      (firstStructuredVar ? firstStructuredVar.label : product.unitLabel);

    const matchedVar =
      Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.find((v) => v.label === chosenVariant) || firstStructuredVar
        : null;

    const resolvedVariantPrice =
      variantMeta?.variantPrice ??
      (matchedVar
        ? matchedVar.salePrice < matchedVar.regularPrice
          ? matchedVar.salePrice
          : matchedVar.regularPrice
        : product.salePrice < product.price
        ? product.salePrice
        : product.price);

    const resolvedVariantRegularPrice =
      variantMeta?.variantRegularPrice ??
      (matchedVar ? matchedVar.regularPrice : product.price);

    const resolvedVariantSku =
      variantMeta?.variantSku ?? (matchedVar?.sku || product.schemaSku || '');

    const resolvedVariantImage =
      variantMeta?.variantImageUrl ?? (matchedVar?.imageUrl || product.imageUrl);

    const maxStock = matchedVar ? matchedVar.stock : product.stock;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedVariant === chosenVariant
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        const nextQty = Math.min(maxStock || 99, updated[existingIndex].quantity + qty);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: nextQty,
          variantPrice: resolvedVariantPrice,
          variantRegularPrice: resolvedVariantRegularPrice,
          variantSku: resolvedVariantSku,
          variantImageUrl: resolvedVariantImage,
        };
        return updated;
      }
      return [
        ...prev,
        {
          product,
          quantity: Math.min(maxStock || 99, qty),
          selectedVariant: chosenVariant,
          variantPrice: resolvedVariantPrice,
          variantRegularPrice: resolvedVariantRegularPrice,
          variantSku: resolvedVariantSku,
          variantImageUrl: resolvedVariantImage,
        },
      ];
    });

    if (openCheckoutImmediately) {
      setActiveProductModal(null);
      setOpenCartInCheckout(true);
      setIsCartOpen(true);
      return;
    }

    showToast(
      lang === 'bn'
        ? `"${product.nameBn}" কার্টে যোগ করা হয়েছে`
        : `"${product.nameEn}" added to cart`
    );
  };

  const handleDirectOrder = (
    product: Product,
    qty = 1,
    variantOverride?: string,
    variantMeta?: {
      variantPrice?: number;
      variantRegularPrice?: number;
      variantSku?: string;
      variantImageUrl?: string;
    }
  ) => {
    handleAddToCart(product, qty, variantOverride, true, variantMeta);
  };

  const handleUpdateQty = (productId: string, selectedVariant: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId || item.selectedVariant !== selectedVariant) return item;
          const next = item.quantity + delta;
          if (next <= 0) return null;
          const matchedVar =
            Array.isArray(item.product.variants) && item.product.variants.length > 0
              ? item.product.variants.find((v) => v.label === item.selectedVariant)
              : null;
          const maxStock = matchedVar ? matchedVar.stock : item.product.stock;
          return { ...item, quantity: Math.min(maxStock || 99, next) };
        })
        .filter((x): x is CartItem => x !== null)
    );
  };

  const handleRemoveCartItem = (productId: string, selectedVariant: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.product.id === productId && item.selectedVariant === selectedVariant)
      )
    );
  };

  const handleOrderCreated = (newOrder: Order) => {
    setRecentOrders((prev) => [newOrder, ...prev.slice(0, 9)]);
  };

  // Category filter handler — opens dedicated Advanced Category Page
  const handleSelectShopBanglaCategory = (catGroup: string) => {
    setShowWishlistOnly(false);
    setShowAllPopular(true);
    setActiveNavTab('categories');
    if (catGroup === 'fashion') {
      setSelectedCategory('fashion');
    } else if (catGroup === 'electronics') {
      setSelectedCategory('electronics');
    } else if (catGroup === 'beauty') {
      setSelectedCategory('skincare');
    } else if (catGroup === 'home') {
      setSelectedCategory('kitchen_cutlery');
    } else if (catGroup === 'grocery') {
      setSelectedCategory('honey');
    } else if (catGroup === 'gifts') {
      setSelectedCategory('combo');
    } else {
      setSelectedCategory('all');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 100% Dynamic Popular Products from Firestore
  const popularProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (showWishlistOnly && !wishlist.includes(p.id)) return false;
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'honey') {
          const isGrocery = [
            'honey',
            'ghee_oil',
            'superfoods',
            'nuts_dates',
            'wellness',
            'organic_food',
            'spices',
          ].includes(p.category);
          if (!isGrocery) return false;
        } else if (selectedCategory === 'kitchen_cutlery') {
          const isHome = ['kitchen_cutlery', 'home_lifestyle'].includes(p.category);
          if (!isHome) return false;
        } else if (selectedCategory === 'fashion') {
          const isFashion = ['fashion', 'jewellery'].includes(p.category);
          if (!isFashion) return false;
        } else if (p.category !== selectedCategory) {
          return false;
        }
      }
      if (q) {
        return (
          p.nameBn.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.descriptionBn.toLowerCase().includes(q) ||
          p.descriptionEn.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery, showWishlistOnly, wishlist]);

  // 100% Dynamic New Arrivals from Firestore
  const newArrivalProducts = useMemo(() => {
    if (products.length === 0) return [];
    return [...products].reverse().slice(0, 4);
  }, [products]);

  // 100% Dynamic Today's Deal Product from Firestore
  const dealProduct = useMemo(() => {
    return products.find((p) => p.isFlashSale) || products[0] || null;
  }, [products]);

  // 100% Dynamic Hero Slides from Firestore sliders collection (or derived from live Firestore products)
  const dynamicHeroSlides = useMemo(() => {
    if (sliders.length > 0) {
      return sliders.map((s) => ({
        id: s.id,
        eyebrow: 'SPECIAL OFFER',
        titleBn: s.titleBn,
        titleEn: s.titleEn || s.titleBn,
        descBn: s.subtitleBn,
        descEn: s.subtitleEn || s.subtitleBn,
        priceLineBn: s.btnTextBn || 'নতুন কালেকশন',
        priceLineEn: s.btnTextEn || 'New Collection',
        imageUrl: s.imageUrl,
      }));
    }
    if (products.length > 0) {
      return products.slice(0, 4).map((p) => ({
        id: p.id,
        eyebrow: p.isFlashSale ? 'FLASH SALE' : 'FEATURED',
        titleBn: p.nameBn,
        titleEn: p.nameEn,
        descBn: p.descriptionBn.slice(0, 65) + '...',
        descEn: p.descriptionEn.slice(0, 65) + '...',
        priceLineBn: `৳ ${(p.salePrice ?? p.price).toLocaleString('en-BD')}`,
        priceLineEn: `৳ ${(p.salePrice ?? p.price).toLocaleString('en-BD')}`,
        imageUrl: p.imageUrl,
      }));
    }
    return [];
  }, [sliders, products]);

  // Live Review Rating Calculation per Product from Firestore reviews collection
  const getLiveProductReviewStats = (productId: string) => {
    const prodReviews = reviews.filter(
      (r) => r.productId === productId && r.status === 'Approved'
    );
    if (prodReviews.length === 0) {
      return { rating: '5.0', count: 0 };
    }
    const avg =
      prodReviews.reduce((acc, item) => acc + (item.rating || 5), 0) / prodReviews.length;
    return {
      rating: avg.toFixed(1),
      count: prodReviews.length,
    };
  };

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const currentHero =
    dynamicHeroSlides[activeSlideIdx % Math.max(1, dynamicHeroSlides.length)] || null;

  if (isAdminOpen && isAdmin) {
    return (
      <AdminDashboard
        isOpen={true}
        onClose={() => {
          setIsAdminOpen(false);
          setActiveNavTab('home');
        }}
        user={user}
        isAdmin={isAdmin}
        products={products}
        coupons={coupons}
        sliders={sliders}
        blogPosts={blogPosts}
        landingPages={landingPages}
        reviews={reviews}
        siteSettings={siteSettings}
        lang={lang}
        onPreviewLandingPage={(lp) => {
          setActiveLandingPage(lp);
          setIsAdminOpen(false);
        }}
      />
    );
  }

  return (
    <>
      <div className="sb-app" id="top">
        {/* Toast Feedback */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 45,
              background: '#123b2e',
              color: '#fff',
              padding: '9px 16px',
              borderRadius: 30,
              fontSize: 12,
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
              border: '1px solid #c7a15d',
              whiteSpace: 'nowrap',
            }}
          >
            {toastMessage}
          </div>
        )}

        {/* SINGLE-LINE HEADER (.sb-top) */}
        <header className="sb-top">
          <div className="sb-header">
            {/* Left: Dynamic Logo */}
            <button
              type="button"
              className="sb-brandmark"
              aria-label={siteSettings.siteName || 'Home'}
              title={siteSettings.siteName}
              onClick={() => {
                setActiveNavTab('home');
                setSelectedCategory('all');
                setSearchQuery('');
                setShowWishlistOnly(false);
                setShowAllPopular(false);
                setActiveLandingPage(null);
              }}
            >
              {siteSettings.logoUrl ? (
                <img
                  src={siteSettings.logoUrl}
                  alt={siteSettings.siteName}
                />
              ) : (
                <span>
                  {(siteSettings.siteName || 'K').trim().charAt(0).toUpperCase()}
                </span>
              )}
            </button>

            {/* Middle: Search Box */}
            <div className="sb-search" role="search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7.5" />
                <path d="m16.5 16.5 4 4" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim()) {
                    setShowAllPopular(true);
                  }
                }}
                placeholder={
                  lang === 'bn' ? 'পণ্য খুঁজুন...' : 'Search products...'
                }
              />
              {searchQuery && (
                <button
                  type="button"
                  className="sb-search-clear"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Right: Language Switch & Notification */}
            <div className="sb-head-actions">
              <button
                type="button"
                className="sb-lang"
                onClick={() => setLang((l) => (l === 'bn' ? 'en' : 'bn'))}
              >
                {lang === 'bn' ? (
                  <>
                    <b>BN</b> | EN
                  </>
                ) : (
                  <>
                    BN | <b>EN</b>
                  </>
                )}
              </button>

              <a
                className="sb-iconbtn"
                href="#offers"
                aria-label="Notifications"
                onClick={() => {
                  setShowAllPopular(true);
                }}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                </svg>
                {coupons.length > 0 && <i className="sb-dot" />}
              </a>
            </div>
          </div>
        </header>

        {/* MAIN (.main) */}
        <main className="sb-main">
          {activeNavTab === 'categories' ? (
            <CategoryPageView
              products={products}
              reviews={reviews}
              wishlist={wishlist}
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              lang={lang}
              isLoadingProducts={isLoadingProducts}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              onSearchChange={(q) => setSearchQuery(q)}
              onToggleWishlist={toggleWishlist}
              onSelectProduct={(prod) => setActiveProductModal(prod)}
              onAddToCart={(prod, qty = 1, variant, variantMeta) =>
                handleAddToCart(prod, qty, variant, false, variantMeta)
              }
              onDirectOrder={(prod, qty = 1, variant, variantMeta) =>
                handleDirectOrder(prod, qty, variant, variantMeta)
              }
              onBackToHome={() => {
                setActiveNavTab('home');
                setSelectedCategory('all');
              }}
            />
          ) : (
            <>
              {/* Dynamic Campaign Landing Page View */}
              {activeLandingPage && (
                <section
                  style={{
                    marginBottom: 15,
                    padding: 16,
                    borderRadius: 17,
                    background: 'linear-gradient(135deg, #123b2e, #1b4b3b)',
                    color: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="sb-eyebrow" style={{ background: '#c7a15d', color: '#123b2e' }}>
                      CAMPAIGN OFFER
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveLandingPage(null)}
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        color: '#fff',
                        border: 0,
                        borderRadius: 20,
                        padding: '4px 10px',
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                    >
                      ✕ বন্ধ করুন
                    </button>
                  </div>
                  <h2 style={{ fontSize: 18, margin: '10px 0 4px', fontWeight: 700 }}>
                    {activeLandingPage.titleBn}
                  </h2>
                  <p style={{ fontSize: 11, color: '#dce9df', margin: '0 0 10px' }}>
                    {activeLandingPage.subtitleBn}
                  </p>
                  <button
                    type="button"
                    className="sb-deal-btn"
                    onClick={() => {
                      const prod =
                        products.find((p) => p.id === activeLandingPage.productId) || products[0];
                      if (prod) handleDirectOrder(prod, 1);
                    }}
                  >
                    এখনই অর্ডার করুন &nbsp; →
                  </button>
                </section>
              )}

              {/* DYNAMIC HERO SLIDER (.hero) */}
              {currentHero && (
            <section className="sb-hero" aria-label="Special offer">
              <img
                className="sb-hero-img"
                src={currentHero.imageUrl}
                alt={currentHero.titleBn}
                fetchPriority="high"
              />
              <div className="sb-hero-copy">
                <span className="sb-eyebrow">{currentHero.eyebrow}</span>
                <h1 style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {lang === 'bn' ? currentHero.titleBn : currentHero.titleEn}
                </h1>
                <p style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {lang === 'bn' ? currentHero.descBn : currentHero.descEn}
                </p>
                <div className="sb-price-line">
                  <strong>
                    {lang === 'bn' ? currentHero.priceLineBn : currentHero.priceLineEn}
                  </strong>
                </div>
                <a
                  className="sb-cta"
                  href="#popular"
                  onClick={() => setShowAllPopular(true)}
                >
                  {lang === 'bn' ? 'এখনই কিনুন' : 'Shop Now'} <span>→</span>
                </a>
              </div>
              <div className="sb-discount">
                UP TO
                <small> SPECIAL</small>
              </div>
              {dynamicHeroSlides.length > 1 && (
                <div className="sb-dots" aria-hidden="true">
                  {dynamicHeroSlides.map((s, i) => (
                    <i
                      key={s.id}
                      className={i === activeSlideIdx % dynamicHeroSlides.length ? 'active' : ''}
                      onClick={() => setActiveSlideIdx(i)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 6 CATEGORIES (.categories) */}
          <nav className="sb-categories" id="categories" aria-label="Product categories">
            <button
              type="button"
              className={`sb-cat ${selectedCategory === 'fashion' ? 'active' : ''}`}
              onClick={() => handleSelectShopBanglaCategory('fashion')}
            >
              <span className="sb-cat-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M7 4 4 6 2.5 11l4 1.5L8 9v12h8V9l1.5 3.5 4-1.5L20 6l-3-2-3 2h-4L7 4Z" />
                </svg>
              </span>
              <strong>Fashion</strong>
              <small>ফ্যাশন</small>
            </button>

            <button
              type="button"
              className={`sb-cat ${selectedCategory === 'electronics' ? 'active' : ''}`}
              onClick={() => handleSelectShopBanglaCategory('electronics')}
            >
              <span className="sb-cat-icon">
                <svg viewBox="0 0 24 24">
                  <rect x="7" y="2" width="10" height="20" rx="2" />
                  <path d="M10 5h4M11 19h2" />
                </svg>
              </span>
              <strong>Electronics</strong>
              <small>ইলেকট্রনিক্স</small>
            </button>

            <button
              type="button"
              className={`sb-cat ${selectedCategory === 'skincare' ? 'active' : ''}`}
              onClick={() => handleSelectShopBanglaCategory('beauty')}
            >
              <span className="sb-cat-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M9 3h6l1 4-2 2v11H10V9L8 7l1-4ZM7 12H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4M17 13h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3" />
                  <path d="M9 6h6" />
                </svg>
              </span>
              <strong>Beauty</strong>
              <small>বিউটি</small>
            </button>

            <button
              type="button"
              className={`sb-cat ${selectedCategory === 'kitchen_cutlery' ? 'active' : ''}`}
              onClick={() => handleSelectShopBanglaCategory('home')}
            >
              <span className="sb-cat-icon">
                <svg viewBox="0 0 24 24">
                  <path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7" />
                </svg>
              </span>
              <strong>Home</strong>
              <small>হোম</small>
            </button>

            <button
              type="button"
              className={`sb-cat ${selectedCategory === 'honey' ? 'active' : ''}`}
              onClick={() => handleSelectShopBanglaCategory('grocery')}
            >
              <span className="sb-cat-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M3 10h18l-2 11H5L3 10ZM2 10l2-5h16l2 5M8 5V3h8v2M9 14v3M15 14v3" />
                </svg>
              </span>
              <strong>Grocery</strong>
              <small>গ্রোসারি</small>
            </button>

            <button
              type="button"
              className={`sb-cat ${selectedCategory === 'combo' ? 'active' : ''}`}
              onClick={() => handleSelectShopBanglaCategory('gifts')}
            >
              <span className="sb-cat-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M12 21V9M12 9C7 9 4 6 4 3c5 0 8 2 8 6ZM12 12c0-4 3-7 8-7 0 4-3 7-8 7ZM4 13h16v8H4zM2 10h20v4H2z" />
                </svg>
              </span>
              <strong>Gifts</strong>
              <small>গিফট</small>
            </button>
          </nav>

          {/* DYNAMIC TODAY'S DEAL (.deal#offers) */}
          {dealProduct && (
            <section className="sb-deal" id="offers">
              <img
                className="sb-deal-img"
                src={dealProduct.imageUrl}
                alt={dealProduct.nameBn}
                loading="lazy"
              />
              <div className="sb-deal-label">
                <span className="sb-bolt">ϟ</span> TODAY&apos;S DEAL
              </div>
              <h2 style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {lang === 'bn' ? dealProduct.nameBn : dealProduct.nameEn}
              </h2>
              <p>
                ৳ {(dealProduct.salePrice ?? dealProduct.price).toLocaleString('en-BD')} ·{' '}
                {dealProduct.unitLabel}
              </p>
              <button
                type="button"
                className="sb-deal-btn"
                onClick={() => setActiveProductModal(dealProduct)}
              >
                Shop Now &nbsp; →
              </button>
            </section>
          )}

          {/* DYNAMIC POPULAR PRODUCTS (.section#popular) */}
          <section className="sb-section" id="popular">
            <div className="sb-section-head">
              <h2 className="sb-section-title">
                {showWishlistOnly
                  ? 'পছন্দের তালিকা'
                  : selectedCategory !== 'all'
                  ? 'বাছাইকৃত পণ্য'
                  : 'জনপ্রিয় পণ্য'}
              </h2>
              <span className="sb-section-en">
                {showWishlistOnly
                  ? 'Wishlist'
                  : selectedCategory !== 'all'
                  ? 'Filtered Items'
                  : 'Popular Products'}
              </span>
              <button
                type="button"
                className="sb-seeall"
                onClick={() => {
                  if (selectedCategory !== 'all' || showWishlistOnly || searchQuery) {
                    setSelectedCategory('all');
                    setShowWishlistOnly(false);
                    setSearchQuery('');
                    setShowAllPopular(false);
                  } else {
                    setShowAllPopular((prev) => !prev);
                  }
                }}
              >
                {selectedCategory !== 'all' || showWishlistOnly || searchQuery
                  ? 'সব রিসেট'
                  : showAllPopular
                  ? 'সংক্ষিপ্ত ভিউ'
                  : 'সব দেখুন'}{' '}
                <span>→</span>
              </button>
            </div>

            {isLoadingProducts ? (
              <div
                style={{
                  padding: '28px 16px',
                  textAlign: 'center',
                  border: '1px solid #efeee8',
                  borderRadius: 15,
                  fontSize: 12,
                  color: '#68746b',
                }}
              >
                ডাটাবেস থেকে পণ্য লোড হচ্ছে...
              </div>
            ) : popularProducts.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  border: '1px solid #efeee8',
                  borderRadius: 15,
                  fontSize: 12,
                  color: '#68746b',
                }}
              >
                {products.length === 0 ? (
                  <>
                    ডাটাবেসে এখনো কোনো পণ্য যোগ করা হয়নি।{' '}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsAdminOpen(true)}
                        style={{
                          color: '#123b2e',
                          fontWeight: 700,
                          background: 'transparent',
                          border: 0,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                        }}
                      >
                        অ্যাডমিন প্যানেল থেকে পণ্য যোগ বা সিঙ্ক করুন
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    এই ফিল্টারে কোনো পণ্য পাওয়া যায়নি।{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        setShowWishlistOnly(false);
                        setSearchQuery('');
                      }}
                      style={{
                        color: '#123b2e',
                        fontWeight: 700,
                        background: 'transparent',
                        border: 0,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      সকল পণ্য দেখুন
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div
                className={
                  showAllPopular || selectedCategory !== 'all' || searchQuery || showWishlistOnly
                    ? 'sb-products-grid'
                    : 'sb-products'
                }
              >
                {popularProducts.map((product) => {
                  const effectivePrice = product.salePrice ?? product.price;
                  const hasDiscount = effectivePrice < product.price;
                  const discountPct = hasDiscount
                    ? Math.round(((product.price - effectivePrice) / product.price) * 100)
                    : 0;
                  const isLiked = wishlist.includes(product.id);
                  const stats = getLiveProductReviewStats(product.id);

                  return (
                    <article key={product.id} className="sb-product">
                      <div
                        className="sb-product-image"
                        onClick={() => setActiveProductModal(product)}
                      >
                        <img
                          src={product.imageUrl}
                          alt={lang === 'bn' ? product.nameBn : product.nameEn}
                          loading="lazy"
                        />
                        <button
                          type="button"
                          className={`sb-heart ${isLiked ? 'liked' : ''}`}
                          aria-label="Add to wishlist"
                          onClick={(e) => toggleWishlist(product.id, e)}
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                          </svg>
                        </button>
                        {hasDiscount && <span className="sb-sale">-{discountPct}%</span>}
                      </div>

                      <div
                        className="sb-product-name"
                        onClick={() => setActiveProductModal(product)}
                      >
                        {lang === 'bn' ? product.nameBn : product.nameEn}
                      </div>

                      <div className="sb-product-price">
                        <strong>৳ {effectivePrice.toLocaleString('en-BD')}</strong>
                        {hasDiscount && <del>৳ {product.price.toLocaleString('en-BD')}</del>}
                      </div>

                      <div className="sb-rating">
                        <span className="sb-star">★</span> {stats.rating}{' '}
                        <span>({stats.count})</span>
                      </div>

                      <button
                        type="button"
                        className="sb-add"
                        onClick={() => handleAddToCart(product, 1)}
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M2 3h2l2.5 12h12L21 7H5M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
                        </svg>
                        {lang === 'bn' ? 'কার্টে যোগ করুন' : 'Add to Cart'}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* DYNAMIC NEW ARRIVALS (.section#new) */}
          {newArrivalProducts.length > 0 && (
            <section className="sb-section" id="new">
              <div className="sb-section-head">
                <h2 className="sb-section-title">নতুন পণ্যসমূহ</h2>
                <span className="sb-section-en">New Arrivals</span>
                <button
                  type="button"
                  className="sb-seeall"
                  onClick={() => setShowAllPopular(true)}
                >
                  সব দেখুন <span>→</span>
                </button>
              </div>
              <div className="sb-new-products">
                {newArrivalProducts.map((item) => {
                  const effectivePrice = item.salePrice ?? item.price;
                  return (
                    <article
                      key={item.id}
                      className="sb-new-card"
                      onClick={() => setActiveProductModal(item)}
                    >
                      <span className="sb-new-tag">NEW</span>
                      <img
                        src={item.imageUrl}
                        alt={lang === 'bn' ? item.nameBn : item.nameEn}
                        loading="lazy"
                      />
                      <strong>{lang === 'bn' ? item.nameBn : item.nameEn}</strong>
                      <small>৳ {effectivePrice.toLocaleString('en-BD')}</small>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

              {/* Live Order & Steadfast Courier Tracker */}
              {showTrackerSection && (
                <div id="tracker-section" style={{ marginTop: 18 }}>
                  <OrderTrackingSection lang={lang} recentOrders={recentOrders} />
                </div>
              )}
            </>
          )}
        </main>

        {/* FOOTER (.footer) */}
        <footer className="sb-footer" id="footer">
          <div
            className="sb-footer-brand"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {siteSettings.logoUrl && (
              <img
                src={siteSettings.logoUrl}
                alt={siteSettings.siteName}
                style={{
                  width: 24,
                  height: 24,
                  objectFit: 'contain',
                  borderRadius: 6,
                  background: '#fff',
                  padding: 2,
                }}
              />
            )}
            <span>{siteSettings.siteName}</span>
          </div>
          <p>
            {siteSettings.siteName} — হটলাইন: {siteSettings.supportPhone} · ইমেইল:{' '}
            {siteSettings.supportEmail}
          </p>
          <div className="sb-footer-links">
            <a href="#popular" onClick={() => setShowAllPopular(true)}>
              আমাদের সম্পর্কে
            </a>
            <a href="#offers">অফার</a>
            <button
              type="button"
              onClick={() => setShowTrackerSection((prev) => !prev)}
            >
              অর্ডার ট্র্যাকিং
            </button>
            <button
              type="button"
              onClick={() => {
                setOpenCartInCheckout(false);
                setIsCartOpen(true);
              }}
            >
              শপিং কার্ট ({totalCartItems})
            </button>
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
            >
              {user
                ? isAdmin
                  ? 'অ্যাডমিন প্রোফাইল'
                  : 'আমার অ্যাকাউন্ট'
                : 'লগইন / রেজিস্ট্রেশন'}
            </button>
            {isAdmin && (
              <button type="button" onClick={() => setIsAdminOpen(true)}>
                অ্যাডমিন প্যানেল
              </button>
            )}
          </div>
          <div className="sb-copyright">
            © {new Date().getFullYear()} {siteSettings.siteName}. All rights reserved.
          </div>
        </footer>

        {/* FIXED 5-ITEM BOTTOM NAV (.bottom-nav) */}
        <nav className="sb-bottom-nav" aria-label="Main navigation">
          <a
            className={`sb-nav-item ${activeNavTab === 'home' ? 'active' : ''}`}
            href="#top"
            aria-label="Home"
            onClick={() => {
              setActiveNavTab('home');
              setSelectedCategory('all');
              setShowWishlistOnly(false);
              setShowAllPopular(false);
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z" />
            </svg>
            <span>হোম</span>
          </a>

          <button
            type="button"
            className={`sb-nav-item ${activeNavTab === 'categories' ? 'active' : ''}`}
            aria-label="Categories"
            onClick={() => {
              setActiveNavTab('categories');
              setShowWishlistOnly(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <svg viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>ক্যাটাগরি</span>
          </button>

          <a
            className={`sb-nav-item ${activeNavTab === 'wishlist' ? 'active' : ''}`}
            href="#popular"
            aria-label="Wishlist"
            onClick={() => {
              setActiveNavTab('wishlist');
              setShowWishlistOnly((prev) => !prev);
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
            </svg>
            <span>পছন্দের তালিকা</span>
          </a>

          <button
            type="button"
            className={`sb-nav-item ${activeNavTab === 'account' ? 'active' : ''}`}
            aria-label="Account"
            onClick={() => {
              setActiveNavTab('account');
              setIsAccountModalOpen(true);
            }}
          >
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
            </svg>
            <span>{user ? 'অ্যাকাউন্ট' : 'লগইন'}</span>
          </button>

          {isAdmin ? (
            <button
              type="button"
              className={`sb-nav-item ${activeNavTab === 'more' ? 'active' : ''}`}
              aria-label="Admin Panel"
              onClick={() => {
                setActiveNavTab('more');
                setIsAdminOpen(true);
              }}
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3Z" />
              </svg>
              <span>অ্যাডমিন</span>
            </button>
          ) : (
            <button
              type="button"
              className={`sb-nav-item ${showTrackerSection ? 'active' : ''}`}
              aria-label="Order Tracking"
              onClick={() => {
                setActiveNavTab('home');
                setShowTrackerSection((prev) => {
                  const next = !prev;
                  if (next) {
                    setTimeout(() => {
                      document.getElementById('tracker-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }
                  return next;
                });
              }}
            >
              <svg viewBox="0 0 24 24">
                <path d="M3 7h12v10H3zM15 10h4l2 3v4h-6zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
              </svg>
              <span>ট্র্যাকিং</span>
            </button>
          )}
        </nav>
      </div>

      {/* Product Detail & Review Modal */}
      <ProductDetailModal
        product={activeProductModal}
        allProducts={products}
        lang={lang}
        reviews={reviews}
        siteSettings={siteSettings}
        wishlist={wishlist}
        onToggleWishlist={toggleWishlist}
        onNavigateCategory={(cat) => {
          setSelectedCategory(cat);
          setActiveNavTab('categories');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onClose={() => {
          setActiveProductModal(null);
          if (window.location.search.includes('product=')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
        onSelectProduct={(nextProd) => setActiveProductModal(nextProd)}
        onAddToCart={handleAddToCart}
      />

      {/* User Account, Login/Registration & Order History Modal */}
      <UserAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          if (activeNavTab === 'account') setActiveNavTab('home');
        }}
        user={user}
        userProfile={userProfile}
        isAdmin={isAdmin}
        lang={lang}
        recentOrders={recentOrders}
        onOpenAdmin={() => {
          if (isAdmin) {
            setIsAccountModalOpen(false);
            setIsAdminOpen(true);
          }
        }}
      />

      {/* Cart & Online Payment Gateway Drawer (COD + bKash/Nagad/Rocket) */}
      <CartDrawer
        isOpen={isCartOpen}
        startInCheckout={openCartInCheckout}
        onClose={() => {
          setIsCartOpen(false);
          setOpenCartInCheckout(false);
        }}
        cart={cart}
        coupons={coupons}
        siteSettings={siteSettings}
        onUpdateQty={handleUpdateQty}
        onRemove={handleRemoveCartItem}
        onClearCart={() => setCart([])}
        lang={lang}
        onOrderCreated={handleOrderCreated}
        user={user}
        userProfile={userProfile}
      />
    </>
  );
}

export default App;
