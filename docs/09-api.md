# 09 — وثيقة API (واجهات الخدمات الداخلية)

**المشروع:** VENDORA | فيندورا · **الإصدار:** 1.2.0

> ملاحظة: لمّا كان النظام يعمل في المتصفح، فالـ«API» هنا هو **واجهات خدمات JavaScript**
> المتاحة عبر الكائن العام `V`. الأسماء تعكس التوقيع الفعلي في الكود.

---

## 1. `V.catalog`
| الطريقة | الوصف |
|---|---|
| `products()` → array | كل المنتجات (يُحمّل تلقائيًا). |
| `get(id)` / `getBySlug(slug)` | منتج بمُعرّف/رابط. |
| `categories()` / `category(slug)` / `categoryById(id)` | التصنيفات. |
| `brands()` / `brand(slug)` | العلامات. |
| `query(filters)` | فرز/تصفية (cat, brand, q, sale, isNew, sort…). |
| `suggest(q, n)` | اقتراحات بحث. |
| `related(p, n)` | منتجات مشابهة. |
| `stockOf(product, marketCode)` | المتاح في سوق. |
| `priceOf(p)` / `compareAtOf(p)` | السعر/سعر المقارنة. |
| `load()` → Promise | تحميل الكاش. |
| `invalidate()` | إبطال الكاش. |

## 2. `V.cart` + `V.commerce`
| الطريقة | الوصف |
|---|---|
| `V.cart.add(id, qty)` / `remove` / `setQty` / `clear` | إدارة السلة. |
| `V.cart.totals({coupon, market, city})` | `{lines, subtotal, discount, shipping, shippingEta, city, tax, total, count, market}` |
| `V.commerce.loadDelivery()` | تحميل مناطق/رسوم التوصيل. |
| `V.commerce.shippingInfo(market, city, subtotal, coupon)` | `{fee, freeOver, etaMin, etaMax, city, codAllowed}` |
| `V.commerce.couponDiscount(code, subtotal, market)` | قيمة الخصم. |
| `V.commerce.onOwnerChange` / `syncBadge` | تزامن الشارات. |

## 3. `V.orders`
| الطريقة | الوصف |
|---|---|
| `place(input)` → Promise<order> | إنشاء طلب (`paymentMethod`, `coupon`, `city`, `idempotencyKey`…). أخطاء: `cart_empty`, `stock_issue`. |
| `get(id)` / `getByNumber(number)` / `list(f)` | استرجاع. |
| `updateStatus(id, next, {by, note, returnItems})` | تغيير الحالة (تحقق انتقالات). خطأ: `invalid_transition`. |
| `canCancel(order, role)` → {allowed, needsStaff} | فحص الإلغاء. |
| `cancel(id, {reason})` | إلغاء + تحرير الحجز. |
| `requestReturn` / `requestExchange` | طلب إرجاع/استبدال. |
| `reviewReturn(id, 'approved'\|'rejected', {by, items})` | مراجعة الإرجاع. |
| `createShipment` / `shipmentsFor(id)` | الشحنات. |
| `printInvoice(order)` | توليد فاتورة للطباعة. |

## 4. `V.payments`
| الطريقة | الوصف |
|---|---|
| `methods(market)` | طرق الدفع المتاحة للسوق. |
| `confirmElectronic(id)` | تأكيد محاكاة دفع إلكتروني. أخطاء: `payment_expired`, `payment_failed`. |
| `submitReceipt(id, {reference, bank, proofName})` | رفع إيصال تحويل. أخطاء: `reference_duplicate`, `reference_required`. |
| `reviewTransfer(id, 'accepted'\|'rejected'\|'needs_info', {by})` | مراجعة التحويل. |
| `receipts()` | قائمة الإيصالات. |
| `markCollected(id)` | تحصيل. |
| `requestRefund(id, {amount, currency, reason, by})` | طلب استرداد. |
| `decideRefund(id, bool, {note})` | اعتماد/رفض الاسترداد (**المدير فقط**). |
| `refunds()` / `forOrder(id)` | الاستردادات. |

## 5. `V.stock` / `V.inventory`
| الطريقة | الوصف |
|---|---|
| `listMarketInventory({market})` / `getMarketRow(productId, code, variantId)` | قراءة المخزون. |
| `availability(...)` / `available(row)` | الإتاحة. |
| `adjust(productId, delta, {market, variantId, reason, by})` | تعديل + إطلاق تنبيهات التوفّر. |
| `setOnHand` / `setDamaged` / `movements` | ضبط/سجل الحركات. |
| `lowStock` / `outOfStock` | تنبيهات النقص. |
| `addAlert({productId,email,market,variantId,customerId})` | subscribe «أخبرني». |
| `listAlerts({productId})` / `fireAlerts(productId, marketCode)` | إدارة/إطلاق التنبيهات. |

## 6. `V.delivery` (إدارة)
| الطريقة | الوصف |
|---|---|
| `adminRegions(market)` / `adminRates(regionId)` | قراءة. |
| `saveRegion(region)` / `removeRegion(id)` | حفظ/حذف منطقة. |
| `saveRate(rate)` | حفظ رسوم (تحديث-in-place أو إنشاء). |
| `refresh()` | إعادة تحميل الكاش. |

## 7. `V.account`
| الطريقة | الوصف |
|---|---|
| `register(data)` → `{pendingVerification, customerId, devCode}` | تسجيل. أخطاء: `fieldsRequired`, `passwordMismatch`, `emailExists`. |
| `login(email, password)` / `staffLogin` / `logout` | دخول/خروج. خطأ: `invalidCredentials`. |
| `verifyEmail(email, code)` / `resendVerification` | التحقق. |
| `forgotPassword` / `resetPassword` | الاستعادة. |
| `addresses` / `saveAddress` / `deleteAddress` | العناوين. |
| `getCustomer` / `updateCustomer` | البيانات. |
| `changePassword(id, old, new)` | تغيير كلمة المرور. خطأ: `invalidCredentials`. |
| `deleteAccount(id)` | حذف الحساب والبيانات + إنهاء الجلسة. |

## 8. `V.reviews` / `V.notify` / `V.settings` / `V.db` / `V.seo`
- **V.reviews:** `list(f)`, `add(data)`, `moderate(id,status)`, `stats(productId)`,
  `verifiedPurchase(productId,customerId)`, `report(id)`.
- **V.notify:** `push`, `forCustomer(customerId,email)`, `markRead`, `markAllRead`, `orderStatus`.
- **V.settings:** `get()`, `save(patch)` (دمج).
- **V.db:** `get/getAll/put/add/del/clear/getAllByIndex/getOneByIndex/nextId/metaGet/metaSet`,
  `exportAll()`, `importAll(snapshot)`.
- **V.seo:** `set({title,description,canonical,jsonLd,image,type,siteName})`, `reset()`.

## 9. الأخطاء القياسية (Error Codes)
| الرمز | المعنى |
|---|---|
| `fieldsRequired` | حقول ناقصة |
| `passwordMismatch` | كلمتا المرور غير متطابقتين |
| `emailExists` | البريد مسجّل مسبقًا |
| `invalidCredentials` | بيانات دخول خاطئة |
| `not_found` | العنصر غير موجود |
| `cart_empty` | السلة فارغة |
| `stock_issue` | مشكلة توفّر (out/low) |
| `invalid_transition` | انتقال حالة غير مسموح |
| `payment_expired` / `payment_failed` | فشل/انتهاء الدفع |
| `reference_required` / `reference_duplicate` | مرجع التحويل ناقص/مكرر |
| `invalid_backup` | ملف نسخة احتياطية غير صالح |
