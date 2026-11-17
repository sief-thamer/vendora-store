# 08 — وثيقة المعمارية (System Architecture)

**المشروع:** VENDORA | فيندورا · **الإصدار:** 1.2.0

---

## 1. نظرة عامة (Overview)
تطبيق ويب **بلا خادم أعمال (Serverless/Offline-first)** يعمل بالكامل في المتصفح:
HTML5 + CSS3 + Vanilla JavaScript (ES5-safe)، مع **IndexedDB** للبيانات و**localStorage**
للتفضيلات. ثلاثة مداخل: المتجر (`index.html`)، الإدارة (`admin.html`)، الاختبارات (`tests.html`).

```
┌──────────────────────────────────────────────────────────────┐
│                        المتصفح (Client)                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │ store-app  │  │ admin-app  │  │ tests.html │              │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘              │
│        └───────────────┼───────────────┘                     │
│                 ┌──────┴───────┐                             │
│                 │  Router/State │                             │
│                 └──────┬───────┘                             │
│    ┌───────────────────┼───────────────────────────────┐    │
│    │                 Services Layer                       │    │
│    │ account catalog cart orders inventory payments     │    │
│    │ notifications admin delivery(commerce)              │    │
│    └───────────────────┬───────────────────────────────┘    │
│    ┌───────────────────┼───────────────┐                    │
│    │  Components (ui, layout)          │                    │
│    └───────────────────────────────────┘                    │
│    ┌───────────────────┼───────────────┐                    │
│    │  Data (db.js, seed.js, markets)   │                    │
│    └─────────┬─────────────┬───────────┘                    │
│         IndexedDB       localStorage                        │
│        vendora_db       vendora.* / vendora.session         │
└──────────────────────────────────────────────────────────────┘
```

## 2. المكوّنات (Components)
| الطبقة | الملفات | المسؤولية |
|---|---|---|
| Core | `core.js`, `i18n.js` | تهيئة `V`, utils, i18n, SEO, صياغة العملة/الأرقام |
| Data | `db.js`, `seed.js`, `markets.js` | IndexedDB، المخطط، البذر، بيانات الأسواق |
| Services | `account, catalog, cart, orders, inventory, payments, notifications, admin` | منطق الأعمال |
| Components | `ui.js`, `layout.js` | مكوّنات واجهة + ترويسة/تذييل |
| Pages | `pages/store/*`, `pages/admin/*` | صفحات العرض |
| Apps | `store-app.js`, `admin-app.js` | التوجيه (Router) + الحراسة (Auth/permissions) |

## 3. التقنيات (Tech Stack)
- **اللغة:** JavaScript (Vanilla، بلا إطارات، أساس ES5 لضمان التوافق).
- **التنسيق:** CSS خام + Design Tokens (متغيّرات CSS) + RTL/LTR.
- **التخزين:** IndexedDB (`vendora_db`, v4، 39 مخزنًا) + localStorage.
- **الأيقونات:** SVG مضمّنة (`V.ICONS`).
- **الصور:** ملفات محلية تحت `assets/images/`.
- **التشغيل:** خادم ملفات بسيط اختياري (`nodeserve`) أو فتح مباشر للملفات.

## 4. التدفق (Boot Sequence)
1. تحميل `core.js` → تهيئة `V` والثوابت والإعدادات.
2. تحميل `db.js` → فتح/ترحيل قاعدة البيانات.
3. تحميل `markets.js` + `seed.js` → التحقق من نسخة البذرة وبذر البيانات إن لزم.
4. تحميل الخدمات ثم المكوّنات ثم الصفحات.
5. `store-app.js`/`admin-app.js` → تسجيل المسارات، تحميل `V.commerce.loadDelivery()`.
6. التوجيه حسب `location.hash` وحراسة الإدارة بالصلاحيات.

## 5. التكاملات (Integrations)
- لا تكاملات خارجية فعلية (Offline).
- محاكاة الدفع الإلكتروني محليًا؛ التحويل البنكي يدوي.
- جاهزية لإضافة بوابة دفع/خادم حقيقي عبر استبدال طبقة الخدمات فقط.

## 6. قرارات معمارية (Decisions)
- **فصل الطبقات:** لا تتصل الصفحات مباشرة بـ IndexedDB بل عبر الخدمات.
- **Snapshot للطلبات:** حماية البيانات التاريخية.
- **Idempotency:** مفتاح لكل محاولة دفع/طلب لمنع التكرار.
- **Design Tokens:** تمكين الثيمات وتغيير الهوية دون لمس الكود.
- **Seeding بـ VERSION:** ترحيل/بذر آمن عند تغيّر البيانات.

## 7. النشر (Deployment)
- تسليم ZIP يعمل محليًا بنقر مزدوج (بدون تبعيات).
- لا يحتاج قاعدة بيانات خارجية أو إنترنت.
- سكربتات التشغيل: `START_VENDORA.bat` / `STOP_VENDORA.bat`.
