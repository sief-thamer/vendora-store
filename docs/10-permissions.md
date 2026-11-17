# 10 — وثيقة الصلاحيات (Roles & Permissions)

**المشروع:** VENDORA | فيندورا · **الإصدار:** 1.2.0

> تُنفَّذ الصلاحيات عبر `V.perms.can(role, perm)` و`V.perms.list(role)`،
> ويُربط كل مسار إداري بصلاحية في `admin-app.js` (`PERM`).

---

## 1. الأدوار (Roles) و الصلاحيات
| الدور | الاسم | الصلاحيات |
|---|---|---|
| `role_admin` | مدير النظام | `*` (كل شيء) |
| `role_products` | مسؤول المنتجات | `dashboard, products.view, products.edit, categories.edit, brands.edit, inventory.view, reviews.moderate, content.edit, marketing.edit` |
| `role_inventory` | مسؤول المخزون | `dashboard, products.view, inventory.view, inventory.edit` |
| `role_orders` | مسؤول الطلبات | `dashboard, orders.view, orders.edit, returns.edit, customers.view, reports.view` |
| `role_marketing` | مسؤول التسويق | `dashboard, content.edit, marketing.edit, coupons.edit, reports.view` |
| `role_support` | خدمة العملاء | `dashboard, orders.view, customers.view, reviews.moderate` |
| `role_accountant` | المحاسب | `dashboard, reports.view, orders.view, audit.view` |
| `role_viewer` | مدقّق (قراءة فقط) | `dashboard, reports.view` |

## 2. ربط المسارات بالصلاحيات (Admin Route → Permission)
| المسار | الصلاحية المطلوبة |
|---|---|
| `/` (لوحة التحكم) | dashboard |
| `/products`, `/products/:id` | products.view / products.edit |
| `/categories` | categories.edit |
| `/brands` | brands.edit |
| `/inventory` | inventory.view / inventory.edit |
| `/orders`, `/orders/:id` | orders.view / orders.edit |
| `/returns` | returns.edit |
| `/customers` | customers.view |
| `/coupons` | coupons.edit |
| `/content` | content.edit |
| `/reviews` | reviews.moderate |
| `/staff` | staff.edit |
| `/settings` | settings.edit |
| `/audit` | audit.view |

## 3. صلاحيات حسّاسة (Sensitive Actions)
| العملية | القاعدة |
|---|---|
| اعتماد استرداد (`decideRefund`) | **`role_admin` فقط** (`settings.edit`) — مفروضة في الخدمة لا الواجهة فقط. |
| تعديل المرتجعات | `returns.edit` |
| مراجعة التحويلات | مسؤول الطلبات/المدير (`orders.edit`) |
| إدارة الموظفين | `staff.edit` |
| الإعدادات والنسخ الاحتياطي/الاستعادة | `settings.edit` |
| سجل العمليات | `audit.view` |

## 4. مصفوفة مبسّطة (Matrix)
| الوظيفة \\ الدور | admin | products | inventory | orders | marketing | support | accountant | viewer |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| لوحة التحكم | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| المنتجات/التصنيفات | ✔ | ✔ | قراءة | – | – | – | – | – |
| المخزون | ✔ | قراءة | ✔ | – | – | – | – | – |
| الطلبات/المرتجعات | ✔ | – | – | ✔ | – | قراءة | قراءة | – |
| الكوبونات/المحتوى | ✔ | تعديل محتوى | – | – | ✔ | – | – | – |
| المراجعات | ✔ | ✔ | – | – | – | ✔ | – | – |
| العملاء | ✔ | – | – | قراءة | – | قراءة | – | – |
| الاعتماد المالي/الاسترداد | ✔ | – | – | – | – | – | – | – |
| الإعدادات/الموظفون | ✔ | – | – | – | – | – | – | – |
| التقارير | ✔ | – | – | ✔ | ✔ | – | ✔ | ✔ |
| سجل العمليات | ✔ | – | – | – | – | – | ✔ | – |

## 5. فرض الصلاحيات (Enforcement)
- عند دخول مسار إداري: `if (!V.perms.can(user.role, perm)) → صفحة «ممنوع»`.
- العملية الحسّاسة (اعتماد الاسترداد) تُتحقق داخل خدمة الدفع نفسها.
- لا يعتمد الحجب على إخفاء الزر فقط.
