# KhatiRaj BD v2.1 — Firestore Security Specification

## 1. Authentication & Roles
- **Storefront Customers**: Public unauthenticated or signed-in visitors. Can browse public catalog (`products`, `coupons`, `sliders`, `blogPosts`, `landingPages`, `reviews`, `siteSettings`), submit orders (`orders` & `orderTracking`), save abandoned carts (`abandonedCarts`), submit product reviews (`reviews` with `status == 'Pending'`), and look up a single order tracking receipt by ID (`orderTracking/{orderCode}`).
- **Store Admins (`isAdmin()`)**: Authenticated users whose email is `maraju921@gmail.com` (verified) or whose UID exists in `/admins/{uid}`. Have full management permissions across all 11 collections.

## 2. Collection Access Matrix
- `/products/{productId}`: Public `get`, `list`. Admin-only `create`, `update`, `delete` with strict schema validation.
- `/coupons/{couponId}`: Public `get`, `list`. Admin-only `create`, `update`, `delete` with strict schema validation.
- `/orders/{orderId}`: Public `create` (with `status == 'Pending'` and valid payment/Steadfast fields). Admin-only `get`, `list`, `update`, `delete` (protects customer PII).
- `/orderTracking/{orderCode}`: Public `get` (single order code lookup only) and `create` (`status == 'Pending'`). Admin-only `list`, `update`, `delete`.
- `/abandonedCarts/{cartId}`: Public `create`, `update` (`recoveryStatus == 'New'`). Admin-only `get`, `list`, `delete`.
- `/sliders/{sliderId}`: Public `get`, `list`. Admin-only `create`, `update`, `delete`.
- `/blogPosts/{postId}`: Public `get`, `list`. Admin-only `create`, `update`, `delete`.
- `/landingPages/{pageId}`: Public `get`, `list`. Admin-only `create`, `update`, `delete`.
- `/reviews/{reviewId}`: Public `get`, `list`, and `create` (`status == 'Pending'`). Admin-only `update`, `delete`.
- `/siteSettings/{settingId}`: Public `get`, `list`. Admin-only `create`, `update`, `delete`.
- `/admins/{adminId}`: Self or Admin `get`, Admin-only `list`, `create`, `update`, `delete`.
