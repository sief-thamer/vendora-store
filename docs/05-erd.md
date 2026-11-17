# 05 — وثيقة ERD (الكيانات والعلاقات)

**المشروع:** VENDORA | فيندورا · **قاعدة البيانات:** IndexedDB `vendora_db` (v4) — 39 مخزنًا

---

## 1. الكيانات الأساسية (Core Entities)

### customers
| الحقل | النوع | ملاحظات |
|---|---|---|
| id | string (PK) | مركّز على `id` |
| name, email (unique), phone | string | |
| password | string | تجزئة (Demo غير تشفيري) |
| status | string | active/inactive |
| emailVerified | bool | |
| createdAt | number | |

### users (موظفو الإدارة)
| id (PK) | username (unique) | role | status |
|---|---|---|---|
| `role_admin`, `role_products`, `role_inventory`, `role_orders`, `role_marketing`, `role_support`, `role_accountant`, `role_viewer` | | | |

### products
| حقل | نوع | فهرس |
|---|---|---|
| id (PK) | string | |
| slug | string | unique |
| categoryId, brandId | string | مفهرس |
| status (published/draft), isFeatured, isNew | — | مفهرس |
| price, compareAt | number | |
| nameAr/nameEn, brandNameAr/En, primaryImage | string | |
| createdAt | number | مفهرس |

### categories / brands
- `id (PK)`, `slug (unique)`, `nameAr/nameEn`, `parentId` (للتصنيفات)، `sort`، `color/icon`.

## 2. المخزون (Inventory Sub-system)
- **inventory** (توافق قديم): `productId (PK)`, `low`.
- **marketInventory**: `productId`, `variantId`, `marketCode`, `warehouseId` → `onHand, reserved, unavailable`.
- **warehouses**: `id (PK)`, `marketCode`, `city`, `active`.
- **productVariants**: `id (PK)`, `productId`, `sku`.
- **reservations**: `orderId`, `productId`, `status` (temporary/confirmed/released).
- **stockMovements**: `productId`, `orderId`, `at` (سجل كل حركة).
- **stockAlerts**: `productId`, `email`, `status` (تنبيهات التوفّر).

المتاح = `onHand − reserved − unavailable`.

## 3. الطلبات والمدفوعات
### orders
| حقل | فهرس |
|---|---|
| id (PK) | |
| number (unique), customerId, status, paymentStatus, reservationStatus, returnStatus, createdAt | مفهرسة |
| pricing { subtotal, discount, shipping, tax, total, currency }, items[] (snapshot), address (snapshot), market | |

### الجداول المرتبطة
- **orderEvents**: `orderId` (سجل الزمن/الحالة).
- **payments**: `orderId`, `status`, `method`.
- **transferReceipts**: `orderId`, `status`, `reference` (رقم عملية فريد).
- **paymentReviews**: `orderId`, `paymentId`, `status`.
- **refundRequests**: `orderId`, `status`, `managerApproval`.
- **returnRequests / returnItems / exchanges**: `orderId`, `customerId`, `status`.
- **shipments / deliveryAttempts**: `orderId`, `status`.

## 4. التوصيل والعروض
- **deliveryRegions**: `id (PK)`, `marketCode`, `city`, `isCapital`, `active`.
- **deliveryRates**: `id (PK)`, `regionId`, `marketCode`, `fee`, `freeOver`, `etaMin/etaMax`, `codAllowed`.
- **coupons**: `id (PK)`, `code (unique)`, `amount/percent`, `min`, `usageLimit`, `expiresAt`, `markets`.
- **promotions**: `activeFlag`, `marketCode`, `code`.

## 5. أخرى
- **customers / addresses**: `addresses.customerId` → علاقة 1..n.
- **carts / wishlists**: `id (PK)` (محلي).
- **reviews**: `productId`, `customerId`, `status` (+`reported`).
- **notifications**: `customerId`, `audience`, `at`.
- **verificationTokens / resetTokens**: `customerId`, `token`.
- **audit**: `at`, `entity` (سجل العمليات الإداري).
- **settings**, **meta**, **counters**, **markets**.

## 6. العلاقات الرئيسية (Relationships)
```
customers 1 ──< addresses
customers 1 ──< orders 1 ──< orderEvents
orders    1 ──1 payments ──< paymentReviews
orders    1 ──< transferReceipts / refundRequests / returnRequests / shipments
orders    1 ──< reservations >── 1 marketInventory
products  1 ──< productVariants / reviews / stockMovements / stockAlerts
markets   1 ──< warehouses / deliveryRegions / deliveryRates / marketInventory
categories 1 ──< products >── 1 brands
```

## 7. ملاحظة التصميم
- كل طلب يحتفظ بـ **snapshot** للأصناف والسعر والعنوان لحظة الشراء (لا يتأثر بتغيّر المنتج لاحقًا).
- فصل الحالات: `status` / `paymentStatus` / `collectionStatus` / `reservationStatus` / `returnStatus`.
