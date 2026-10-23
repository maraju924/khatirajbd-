/**
 * Firestore Security Rules Verification Suite (Dirty Dozen Payloads)
 * Validates that all 12 adversarial payloads described in security_spec.md
 * are rejected with PERMISSION_DENIED by firestore.rules.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  auth: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Product Create',
    collection: 'products',
    docId: 'prod-1',
    operation: 'create',
    auth: { uid: 'admin-1', email: 'maraju921@gmail.com', email_verified: true },
    payload: {
      nameBn: 'জামদানি শাড়ি',
      nameEn: 'Jamdani Saree',
      descriptionBn: 'খাঁটি ঢাকাই জামদানি',
      descriptionEn: 'Authentic Dhakai Jamdani',
      category: 'fashion',
      price: 4500,
      salePrice: 3900,
      isFlashSale: true,
      stock: 10,
      unitLabel: '1 Piece',
      imageUrl: 'data:image/svg+xml;utf8,<svg></svg>',
      isFeaturedHack: true, // Unauthorized shadow field
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Email Spoofing Attack (Unverified Admin Email)',
    collection: 'products',
    docId: 'prod-2',
    operation: 'create',
    auth: { uid: 'spoof-1', email: 'maraju921@gmail.com', email_verified: false },
    payload: {
      nameBn: 'পাঞ্জাবি',
      nameEn: 'Panjabi',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'PII Blanket Read on /orders by Non-Admin',
    collection: 'orders',
    docId: 'BH-1001',
    operation: 'get',
    auth: { uid: 'user-regular', email: 'customer@example.com', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'ID Poisoning Attack with Invalid Characters',
    collection: 'orders',
    docId: 'BH-1001$%^&*()',
    operation: 'create',
    auth: null,
    payload: { orderCode: 'BH-1001$%^&*()' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Invalid Bangladeshi Mobile Number Format',
    collection: 'orders',
    docId: 'BH-1002',
    operation: 'create',
    auth: null,
    payload: {
      orderCode: 'BH-1002',
      customerName: 'রহিম উদ্দিন',
      customerPhone: '12345678901', // Must start with 01[3-9]
      district: 'Dhaka',
      address: 'House 12, Dhanmondi',
      deliveryZone: 'inside_dhaka',
      itemsSummary: '1x Jamdani Saree',
      itemCount: 1,
      subtotal: 3900,
      discountAmount: 0,
      couponCode: 'NONE',
      deliveryCharge: 60,
      totalPayable: 3960,
      paymentMethod: 'COD',
      status: 'Pending',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Order Status Shortcutting on Create',
    collection: 'orders',
    docId: 'BH-1003',
    operation: 'create',
    auth: null,
    payload: {
      orderCode: 'BH-1003',
      customerName: 'করিম মিয়া',
      customerPhone: '01712345678',
      district: 'Dhaka',
      address: 'Mirpur 10, Dhaka',
      deliveryZone: 'inside_dhaka',
      itemsSummary: '1x Honey',
      itemCount: 1,
      subtotal: 850,
      discountAmount: 0,
      couponCode: 'NONE',
      deliveryCharge: 60,
      totalPayable: 910,
      paymentMethod: 'COD',
      status: 'Delivered', // Cannot create directly as Delivered
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphaned Order Write Without Atomic OrderTracking Sibling',
    collection: 'orders',
    docId: 'BH-1004',
    operation: 'create',
    auth: null,
    payload: {
      orderCode: 'BH-1004',
      customerName: 'সাবিনা ইয়াসমিন',
      customerPhone: '01812345678',
      district: 'Chattogram',
      address: 'Agrabad, Chattogram',
      deliveryZone: 'outside_dhaka',
      itemsSummary: '1x Earbuds',
      itemCount: 1,
      subtotal: 1850,
      discountAmount: 0,
      couponCode: 'NONE',
      deliveryCharge: 120,
      totalPayable: 1970,
      paymentMethod: 'COD',
      status: 'Pending',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Timestamp Forgery on Order Create',
    collection: 'orders',
    docId: 'BH-1005',
    operation: 'create',
    auth: null,
    payload: {
      orderCode: 'BH-1005',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immutable Field Mutation on Order Update',
    collection: 'orders',
    docId: 'BH-1001',
    operation: 'update',
    auth: { uid: 'admin-1', email: 'maraju921@gmail.com', email_verified: true },
    payload: {
      orderCode: 'BH-9999-MUTATED',
      status: 'Confirmed',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Value Poisoning on Status Update',
    collection: 'orders',
    docId: 'BH-1001',
    operation: 'update',
    auth: { uid: 'admin-1', email: 'maraju921@gmail.com', email_verified: true },
    payload: {
      status: 'INVALID_STATUS_ENUM',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Denial of Wallet String Overflow on Address',
    collection: 'orders',
    docId: 'BH-1006',
    operation: 'create',
    auth: null,
    payload: {
      orderCode: 'BH-1006',
      address: 'A'.repeat(5000),
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Self-Assigned Admin Privilege Escalation',
    collection: 'admins',
    docId: 'attacker-uid',
    operation: 'create',
    auth: { uid: 'attacker-uid', email: 'attacker@example.com', email_verified: true },
    payload: {
      uid: 'attacker-uid',
      email: 'attacker@example.com',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
