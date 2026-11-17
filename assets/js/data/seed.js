/* ============================================================
   VENDORA — Data layer: deterministic seed generator (seed.js)
   Produces the demo catalog (500 products), inventory, staff
   users, demo customer, coupons and settings — idempotently.
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var U = V.utils;
  var IMG = V.config.IMG;

  var SEED = 20260101;          // fixed PRNG seed -> reproducible catalog
  var DAY = 86400000;
  var ANCHOR = Date.UTC(2026, 9, 13); // reference "now" for birthdays (Oct 13 2026)

  function pad(n, len) {
    var s = String(n); while (s.length < (len || 4)) s = '0' + s; return s;
  }

  /* ---------------- Catalog generation (pure) ---------------- */
  function generateCatalog() {
    var r = U.rng(SEED);
    var products = [];
    var inventory = [];
    var catCounts = {};
    var brands = V.brandsSeed;
    var seq = 1;
    var catSeq = {};

    V.config.SEED_DISTRIBUTION.forEach(function (dist) {
      var cat = V.getCategorySeed(dist.slug);
      if (!cat) return;
      var profile = V.getProfile(cat.slug);
      var catBrands = V.brandsForCategory(cat.slug);
      if (!catBrands.length) catBrands = brands;
      catSeq[cat.slug] = 0;
      var featuredQuota = Math.max(2, Math.round(dist.count * 0.08));

      for (var i = 0; i < dist.count; i++) {
        catSeq[cat.slug]++;
        var n = catSeq[cat.slug];

        var brand = catBrands[U.rngInt(r, 0, catBrands.length - 1)];
        var noun = U.rngPick(r, profile.nouns);
        var adj = U.rngPick(r, profile.adjectives);
        var model = U.rngPick(r, profile.models);
        var sub = cat.subcategories.length ? U.rngPick(r, cat.subcategories) : null;

        var modelAr = model.ar ? ' ' + model.ar : '';
        var modelEn = model.en ? ' ' + model.en : '';
        var nameAr = brand.nameAr + ' ' + noun.ar + modelAr;
        var nameEn = brand.nameEn + ' ' + noun.en + modelEn;

        var id = 'pr_' + cat.slug + '_' + pad(n, 4);
        var sku = 'VEN-' + cat.slug.slice(0, 3).toUpperCase() + '-' + pad(seq, 5);
        var slug = U.slug(brand.slug + '-' + noun.en + (model.en ? '-' + model.en : '') + '-' + pad(n, 3));

        // base Yemen price within category range
        var basePrice = U.rngInt(r, profile.priceBase[0], profile.priceBase[1]);
        // round base to a tidy YER figure
        basePrice = basePrice >= 10000 ? Math.round(basePrice / 500) * 500 : Math.round(basePrice / 100) * 100;

        // per-market independent prices (small deterministic jitter)
        var jitter = V.markets.map(function () { return (r() - 0.5) * 0.14; });
        var prices = V.buildPrices(basePrice, jitter);

        // ~32% of products are discounted (compareAt = pre-discount price)
        var hasDiscount = r() < 0.32;
        var discountPct = hasDiscount ? U.rngInt(r, 10, 40) / 100 : 0;
        var compareAt = null;
        if (hasDiscount) {
          compareAt = {};
          V.markets.forEach(function (mk) {
            var full = prices[mk.code] / (1 - discountPct);
            compareAt[mk.code] = V.roundMarketPrice(full, mk.code);
          });
        }

        // rating + popularity
        var rating = Math.round((3.4 + r() * 1.6) * 10) / 10;
        if (rating > 5) rating = 5;
        var ratingCount = U.rngInt(r, 3, 480);
        var sold = U.rngInt(r, 5, 2200);

        // stock: a few low / out-of-stock
        var onHand;
        var roll = r();
        if (roll < 0.06) onHand = 0;
        else if (roll < 0.20) onHand = U.rngInt(r, 1, 7);
        else onHand = U.rngInt(r, 15, 160);

        // images: one unique high-res photo per product slot (assets/images/products/real/<slug>-r<k>.jpg)
        // NOTE: `U.rngInt(r, 3, 5)` must stay exactly as-is (same args) so the
        // deterministic PRNG stream — and every value seeded after this point —
        // remains byte-identical to the original dataset.
        var imgCount = U.rngInt(r, 3, 5);
        var imgs = [];
        for (var k = 0; k < imgCount; k++) {
          imgs.push(IMG.productsReal + slug + '-r' + (k + 1) + '.jpg');
        }

        // specs
        var specs = profile.specs.map(function (sp) {
          var val = U.rngPick(r, sp.v);
          return { keyAr: sp.k.ar, keyEn: sp.k.en, valueAr: val.ar, valueEn: val.en };
        });

        var age = U.rngInt(r, 0, 400);
        var createdAt = ANCHOR - age * DAY;

        products.push({
          id: id, sku: sku, slug: slug,
          nameAr: nameAr, nameEn: nameEn,
          descAr: adj.ar + ' ' + noun.ar + ' من ' + brand.nameAr + '. يجمع بين الجودة والسعر المناسب، مثالي للاستخدام اليومي مع ضمان رسمي وإمكانية الإرجاع خلال المدة المحددة.',
          descEn: adj.en + ' ' + noun.en + ' by ' + brand.nameEn + '. Great value and quality, ideal for everyday use with an official warranty and easy returns.',
          categoryId: cat.id, categorySlug: cat.slug, categoryNameAr: cat.nameAr, categoryNameEn: cat.nameEn,
          subcategoryId: sub ? sub.id : null, subcategorySlug: sub ? sub.slug : null,
          subcategoryNameAr: sub ? sub.nameAr : null, subcategoryNameEn: sub ? sub.nameEn : null,
          brandId: brand.id, brandSlug: brand.slug, brandNameAr: brand.nameAr, brandNameEn: brand.nameEn,
          basePrice: basePrice, prices: prices, compareAt: compareAt,
          rating: rating, ratingCount: ratingCount, sold: sold,
          images: imgs, primaryImage: imgs[0],
          specs: specs,
          colors: profile.colors || [], sizes: profile.sizes || [],
          warrantyAr: profile.warranty.ar, warrantyEn: profile.warranty.en,
    returnPolicyAr: 'إرجاع أو استبدال خلال 3 أيام للمنتج غير المستخدم بحالته الأصلية.',
    returnPolicyEn: 'Return or exchange within 3 days for unused items in original condition.',
          tags: [cat.slug, sub ? sub.slug : '', brand.slug].filter(Boolean),
          isFeatured: i < featuredQuota,
          isNew: age <= 40,
          status: 'published',
          createdAt: createdAt, updatedAt: createdAt
        });

        inventory.push({
          productId: id, onHand: onHand, reserved: 0,
          low: onHand > 0 && onHand <= V.config.LOW_STOCK,
          out: onHand === 0,
          updatedAt: createdAt
        });

        catCounts[cat.slug] = (catCounts[cat.slug] || 0) + 1;
        seq++;
      }
    });

    var categories = V.categoriesSeed.map(function (c) {
      return Object.assign({}, c, { productCount: catCounts[c.slug] || 0 });
    });

    return { products: products, inventory: inventory, categories: categories, brands: V.brandsSeed };
  }

  /* ---------------- Static seeds ---------------- */
  function seedMarkets() { return V.markets.slice(); }

  function seedStaff() {
    function u(id, name, username, pwd, role) {
      return { id: id, name: name, username: username, password: U.hashPassword(pwd, username), role: role, status: 'active', createdAt: ANCHOR - 300 * DAY, lastLogin: null };
    }
    return [
      u('usr_admin', 'مدير النظام', 'admin', 'admin123', 'role_admin'),
      u('usr_products', 'مسؤول المنتجات', 'products', 'products123', 'role_products'),
      u('usr_inventory', 'مسؤول المخزون', 'inventory', 'inventory123', 'role_inventory'),
      u('usr_orders', 'مسؤول الطلبات', 'orders', 'orders123', 'role_orders')
    ];
  }

  function seedCustomers() {
    var r = U.rng(SEED + 3);
    var names = ['أحمد الشامي', 'سارة العلي', 'محمد الحسن', 'نورة القحطاني', 'خالد المنصوري', 'ليلى الإبراهيم', 'عمر الفهد', 'هند الزهراني', 'يوسف الكعبي', 'ريم النعيمي', 'طارق السالم', 'منى العمري'];
    var markets = ['YE', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM'];
    var out = [
      { id: 'cus_demo', name: 'عميل تجريبي', email: 'demo@vendora.local', phone: '+967700000000', password: U.hashPassword('demo1234', 'demo@vendora.local'), market: 'YE', status: 'active', emailVerified: true, createdAt: ANCHOR - 120 * DAY, addresses: [] }
    ];
    names.forEach(function (nm, i) {
      var mk = markets[U.rngInt(r, 0, markets.length - 1)];
      var email = 'customer' + (i + 1) + '@vendora.local';
      out.push({
        id: 'cus_' + pad(i + 1, 3), name: nm, email: email,
        phone: V.getMarket(mk).phoneCode + U.rngInt(r, 50000000, 99999999),
        password: U.hashPassword('demo1234', email), market: mk, status: 'active', emailVerified: true,
        createdAt: ANCHOR - U.rngInt(r, 10, 260) * DAY, addresses: []
      });
    });
    return out;
  }

  /* ---------------- Demo orders (deterministic, historical) ---------------- */
  function generateOrders(products, customers) {
    var r = U.rng(SEED + 7);
    var orders = [];
    var events = [];
    var byCat = {};
    products.forEach(function (p) { (byCat[p.categorySlug] = byCat[p.categorySlug] || []).push(p); });
    var cats = Object.keys(byCat);

    // status distribution for a believable funnel
    var statusPool = [];
    function push(n, s) { for (var i = 0; i < n; i++) statusPool.push(s); }
    push(38, 'DELIVERED'); push(14, 'SHIPPED'); push(16, 'PROCESSING');
    push(18, 'CONFIRMED'); push(22, 'PENDING'); push(14, 'CANCELLED');
    push(4, 'RETURN_REQUESTED'); push(3, 'RETURNED');

    var ORDER_COUNT = statusPool.length; // 129
    var custPool = customers.filter(function (c) { return c.id !== 'cus_demo'; });

    for (var i = 0; i < ORDER_COUNT; i++) {
      var status = statusPool[i];
      var useDemo = r() < 0.18;
      var cust = useDemo ? customers[0] : custPool[U.rngInt(r, 0, custPool.length - 1)];
      var market = cust.market || 'YE';
      var mk = V.getMarket(market);
      var lineCount = U.rngInt(r, 1, 4);
      var items = [];
      var subtotal = 0;
      for (var l = 0; l < lineCount; l++) {
        var cat = cats[U.rngInt(r, 0, cats.length - 1)];
        var p = byCat[cat][U.rngInt(r, 0, byCat[cat].length - 1)];
        if (items.find(function (x) { return x.productId === p.id; })) continue;
        var qty = U.rngInt(r, 1, 3);
        var unit = V.catalog ? 0 : 0; // price from map below
        var price = p.prices[market] || p.basePrice;
        items.push({ productId: p.id, sku: p.sku, slug: p.slug, nameAr: p.nameAr, nameEn: p.nameEn, brandNameAr: p.brandNameAr, brandNameEn: p.brandNameEn, image: p.primaryImage, unitPrice: price, qty: qty, lineTotal: price * qty, compareAt: p.compareAt ? p.compareAt[market] : null });
        subtotal += price * qty;
      }
      if (!items.length) continue;
      var shipping = subtotal >= mk.freeShippingOver ? 0 : mk.shippingFlat;
      var tax = Math.round(subtotal * (mk.taxRate || 0) * 100) / 100;
      var total = subtotal + shipping + tax;
      var created = ANCHOR - U.rngInt(r, 0, 115) * DAY - U.rngInt(r, 0, DAY);
      var paid = status === 'DELIVERED' || status === 'RETURNED';
      var cancelled = status === 'CANCELLED';

      var order = {
        id: 'ord_seed_' + pad(i + 1, 4),
        number: 'VEN-' + numDate(created) + '-' + pad(i + 1, 4),
        customerId: cust.id,
        contact: { name: cust.name, email: cust.email, phone: cust.phone },
        shipping: { market: market, city: (mk.citiesAr[U.rngInt(r, 0, mk.citiesAr.length - 1)]), area: '', street: 'شارع ' + U.rngInt(r, 1, 40), notes: '' },
        items: items,
        pricing: { subtotal: subtotal, discount: 0, shipping: shipping, tax: tax, total: total, couponCode: null, currency: mk.currency },
        status: status,
        paymentStatus: paid ? 'paid' : (cancelled ? 'cancelled' : 'unpaid'),
        collectionStatus: (status === 'DELIVERED' || status === 'RETURNED') ? 'collected' : 'not_collected',
        reservationStatus: cancelled ? 'released' : (status === 'PENDING' ? 'temporary' : 'confirmed'),
        returnStatus: (status === 'RETURN_REQUESTED' ? 'requested' : status === 'RETURNED' ? 'received' : status === 'REFUNDED' ? 'refunded' : 'none'),
        paymentMethod: 'cod',
        stockDeducted: status !== 'PENDING' && !cancelled,
        stockRestored: cancelled,
        return: null,
        createdAt: created, updatedAt: created + U.rngInt(r, 1, 48) * 3600000
      };
      orders.push(order);
      // event trail
      events.push({ id: 'ev_s_' + pad(i + 1, 4) + '_0', orderId: order.id, type: 'created', from: null, to: 'PENDING', note: 'order placed', by: cust.id, at: created });
      var chain = { CONFIRMED: ['CONFIRMED'], PROCESSING: ['CONFIRMED', 'PROCESSING'], SHIPPED: ['CONFIRMED', 'PROCESSING', 'SHIPPED'], DELIVERED: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'], CANCELLED: ['CONFIRMED', 'CANCELLED'], RETURN_REQUESTED: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED'], RETURNED: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED', 'RETURNED'], PENDING: [] }[status] || [];
      var prev = 'PENDING';
      chain.forEach(function (st, idx) {
        events.push({ id: 'ev_s_' + pad(i + 1, 4) + '_' + (idx + 1), orderId: order.id, type: 'status', from: prev, to: st, note: '', by: 'staff', at: created + (idx + 1) * 3600000 * 6 });
        prev = st;
      });
    }
    return { orders: orders, events: events, nextSeq: orders.length + 1 };
  }

  function numDate(ts) {
    var d = new Date(ts);
    return String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }

  function seedCoupons() {
    return [
      { id: 'cpn_welcome', code: 'WELCOME10', type: 'percent', value: 10, minOrder: { YE: 10000, SA: 100, AE: 100, KW: 10, QA: 100, BH: 10, OM: 10 }, usageLimit: 0, used: 0, perCustomer: 1, marketCode: null, active: true, expiresAt: ANCHOR + 180 * DAY, descAr: 'خصم 10% للعملاء الجدد', descEn: '10% off for new customers' },
      { id: 'cpn_freeship', code: 'FREESHIP', type: 'freeship', value: 0, minOrder: { YE: 15000, SA: 150, AE: 150, KW: 15, QA: 150, BH: 15, OM: 15 }, usageLimit: 0, used: 0, perCustomer: 1, marketCode: null, active: true, expiresAt: ANCHOR + 120 * DAY, descAr: 'توصيل مجاني', descEn: 'Free shipping' },
      { id: 'cpn_save', code: 'SAVE50', type: 'percent', value: 15, minOrder: { YE: 20000, SA: 200, AE: 200, KW: 20, QA: 200, BH: 20, OM: 20 }, usageLimit: 200, used: 0, perCustomer: 1, marketCode: null, active: true, expiresAt: ANCHOR + 90 * DAY, descAr: 'خصم 15% على الطلبات المؤهلة', descEn: '15% off eligible orders' }
    ];
  }

  function seedSettings() {
    return {
      key: 'general',
      storeNameAr: 'فيندورا', storeNameEn: 'VENDORA',
      supportEmail: 'support@vendora.local', supportPhone: '+967 700 000 000',
      lowStockThreshold: V.config.LOW_STOCK,
      codEnabled: true,
      requireApproval: false,
      defaultMarket: V.config.DEFAULT_MARKET,
      // --- customer & purchase lifecycle config ---
      emailVerificationRequired: true,   // mock: new accounts must confirm e-mail
      returnWindowDays: 3,               // calendar days from delivery
      epayWindowMinutes: 15,             // electronic payment hold window
      transferReviewMinutes: 120,        // manual-transfer review window (2h)
      reservationTtlMinutes: 60,         // how long a temporary reservation is held
      notifyBackInStock: true,
      // payment methods enabled storefront-wide (availability still filtered per market)
      paymentMethods: [
        { code: 'electronic', enabled: true, labelAr: 'دفع إلكتروني', labelEn: 'Electronic payment',
          providers: [
            { code: 'jeeb', labelAr: 'جيب', labelEn: 'Jeeb', enabled: true, integrated: false },
            { code: 'flow', labelAr: 'فلوسك / Flow', labelEn: 'Flow', enabled: true, integrated: false },
            { code: 'jawali', labelAr: 'جوالي', labelEn: 'Jawali', enabled: true, integrated: false },
            { code: 'alkuraimi', labelAr: 'الكريمي', labelEn: 'Al-Kuraimi', enabled: true, integrated: false },
            { code: 'woncash', labelAr: 'ون كاش', labelEn: 'Won Cash', enabled: true, integrated: false },
            { code: 'yemenwallet', labelAr: 'يمن والت', labelEn: 'Yemen Wallet', enabled: true, integrated: false }
          ] },
        { code: 'transfer', enabled: true, labelAr: 'تحويل بنكي / إيداع يدوي', labelEn: 'Bank transfer / manual deposit' },
        { code: 'cod', enabled: true, labelAr: 'الدفع عند الاستلام', labelEn: 'Cash on delivery' }
      ]
    };
  }

  /* ---------------- Warehouses & per-market inventory ---------------- */
  function seedWarehouses() {
    var out = [];
    V.markets.forEach(function (mk) {
      out.push({
        id: 'wh_' + mk.code + '_main', marketCode: mk.code, nameAr: 'المستودع الرئيسي - ' + mk.nameAr,
        nameEn: 'Main warehouse - ' + mk.nameEn, city: mk.citiesAr[0], active: true, createdAt: ANCHOR - 400 * DAY
      });
    });
    // a second (overflow) warehouse for the largest market
    out.push({ id: 'wh_YE_2', marketCode: 'YE', nameAr: 'مستودع عدن', nameEn: 'Aden warehouse', city: 'عدن', active: true, createdAt: ANCHOR - 300 * DAY });
    return out;
  }

  function seedMarketInventory(products, inventory) {
    var r = U.rng(SEED + 11);
    var rows = [];
    var invById = {};
    inventory.forEach(function (i) { invById[i.productId] = i; });
    products.forEach(function (p) {
      var base = (invById[p.id] && invById[p.id].onHand) || 0;
      V.markets.forEach(function (mk, mi) {
        // YE mirrors the canonical global inventory so the storefront stays consistent
        var onHand;
        if (mk.code === V.config.DEFAULT_MARKET) onHand = base;
        else {
          var factor = 0.5 + r() * 1.6;
          onHand = Math.round(base * factor);
          if (r() < 0.06) onHand = 0;
        }
        var damaged = r() < 0.04 ? U.rngInt(r, 1, 3) : 0;
        if (damaged > onHand) damaged = 0;
        rows.push({
          id: p.id + ':' + mk.code + ':' + ('wh_' + mk.code + '_main'),
          productId: p.id, variantId: null, marketCode: mk.code,
          warehouseId: 'wh_' + mk.code + '_main',
          onHand: onHand, reserved: 0, damaged: damaged,
          low: (onHand - damaged) > 0 && (onHand - damaged) <= V.config.LOW_STOCK,
          out: (onHand - damaged) <= 0,
          updatedAt: ANCHOR
        });
      });
    });
    return rows;
  }

  /* ---------------- Delivery regions & rates ---------------- */
  function seedDelivery() {
    var regions = [], rates = [];
    V.markets.forEach(function (mk) {
      var cities = mk.citiesAr;
      cities.forEach(function (city, i) {
        var rid = 'drg_' + mk.code + '_' + pad(i + 1, 2);
        // base = market flat fee, with small per-city variance (capital first)
        var fee = mk.shippingFlat + (i === 0 ? 0 : U.rngInt(U.rng(SEED + 21 + i), -1, 2) * (mk.shippingFlat > 5 ? 1 : 0));
        if (fee < 0) fee = mk.shippingFlat;
        regions.push({
          id: rid, marketCode: mk.code, city: city, cityEn: mk.citiesEn[i] || city,
          isCapital: i === 0, active: true
        });
        rates.push({
          id: 'drt_' + mk.code + '_' + pad(i + 1, 2), regionId: rid, marketCode: mk.code,
          fee: fee, freeOver: mk.freeShippingOver, etaMin: 1, etaMax: mk.code === 'YE' ? 5 : 7,
          codAllowed: true, active: true, updatedAt: ANCHOR
        });
      });
    });
    return { regions: regions, rates: rates };
  }

  /* ---------------- Promotions ---------------- */
  function seedPromotions() {
    return [
      { id: 'prom_newyear', code: null, type: 'percent', value: 5, marketCode: null, minOrder: null,
        active: true, activeFlag: 1, startsAt: ANCHOR - 30 * DAY, endsAt: ANCHOR + 60 * DAY,
        descAr: 'خصم موسمي 5% تلقائي', descEn: 'Automatic 5% seasonal discount' },
      { id: 'prom_bundle2', code: null, type: 'percent', value: 8, marketCode: null, minOrder: null,
        minQty: 3, active: true, activeFlag: 1, startsAt: ANCHOR - 10 * DAY, endsAt: ANCHOR + 90 * DAY,
        descAr: 'خصم 8% عند شراء 3 قطع أو أكثر', descEn: '8% off when buying 3+ items' }
    ];
  }

  /* ---------------- Notifications (demo) ---------------- */
  function seedNotifications(customers) {
    var demo = customers[0];
    return [
      { id: 'ntf_welcome', customerId: demo.id, audience: 'customer', type: 'account', titleAr: 'مرحبًا بك في فيندورا', titleEn: 'Welcome to VENDORA', bodyAr: 'تم إنشاء حسابك بنجاح.', bodyEn: 'Your account was created successfully.', read: false, at: ANCHOR - 119 * DAY },
      { id: 'ntf_promo', customerId: demo.id, audience: 'customer', type: 'promo', titleAr: 'خصم 10% على أول طلب', titleEn: '10% off your first order', bodyAr: 'استخدم الكود WELCOME10', bodyEn: 'Use code WELCOME10', read: false, at: ANCHOR - 5 * DAY }
    ];
  }

  /* ---------------- Ensure (idempotent) ---------------- */
  var ensurePromise = null;

  function ensure(force) {
    if (ensurePromise && !force) return ensurePromise;
    ensurePromise = V.db.ready().then(function () {
      return V.db.metaGet('seeded', null).then(function (seeded) {
        if (seeded === V.config.VERSION && !force) return { seeded: false, already: true };
        if (seeded && !force) {
          // seed data changed → wipe every store (incl. brands/categories) and rebuild fresh
          return V.db.clearAll([]).then(function () { return ensure(true); });
        }

        var catalog = generateCatalog();
        var customers = seedCustomers();
        var demo = generateOrders(catalog.products, customers);
        var warehouses = seedWarehouses();
        var marketInv = seedMarketInventory(catalog.products, catalog.inventory);
        var delivery = seedDelivery();
        var promotions = seedPromotions();
        var notifications = seedNotifications(customers);
        return V.db.tx(['markets', 'categories', 'brands', 'products', 'inventory', 'users', 'customers', 'coupons', 'settings', 'orders', 'orderEvents', 'counters', 'meta',
          'warehouses', 'marketInventory', 'deliveryRegions', 'deliveryRates', 'promotions', 'notifications', 'reservations', 'stockMovements', 'stockAlerts',
          'payments', 'transferReceipts', 'paymentReviews', 'refundRequests', 'returnRequests', 'returnItems', 'exchanges', 'shipments', 'deliveryAttempts', 'verificationTokens', 'resetTokens', 'productVariants'], 'readwrite', function (s) {
          // static reference data
          seedMarkets().forEach(function (m) { s.markets.put(m); });
          catalog.categories.forEach(function (c) { s.categories.put(c); });
          catalog.brands.forEach(function (b) { s.brands.put(b); });
          catalog.products.forEach(function (p) { s.products.put(p); });
          catalog.inventory.forEach(function (i) { s.inventory.put(i); });
          seedStaff().forEach(function (u) { s.users.put(u); });
          customers.forEach(function (c) { s.customers.put(c); });
          seedCoupons().forEach(function (c) { s.coupons.put(c); });
          s.settings.put(seedSettings());
          demo.orders.forEach(function (o) { s.orders.put(o); });
          demo.events.forEach(function (e) { s.orderEvents.put(e); });
          warehouses.forEach(function (w) { s.warehouses.put(w); });
          marketInv.forEach(function (mi) { s.marketInventory.put(mi); });
          delivery.regions.forEach(function (rg) { s.deliveryRegions.put(rg); });
          delivery.rates.forEach(function (rt) { s.deliveryRates.put(rt); });
          promotions.forEach(function (pr) { s.promotions.put(pr); });
          notifications.forEach(function (n) { s.notifications.put(n); });
          s.counters.put({ key: 'order', value: demo.nextSeq });
          s.meta.put({ key: 'seeded', value: V.config.VERSION });
          s.meta.put({ key: 'seedVersion', value: SEED });
          s.meta.put({ key: 'seededAt', value: ANCHOR });
        }).then(function () {
          try { V.bus.emit('data:seeded', {}); } catch (e) {}
          return { seeded: true, products: catalog.products.length, orders: demo.orders.length };
        });
      });
    });
    return ensurePromise;
  }

  /* ---------------- Reset to fresh demo data ---------------- */
  function resetDemo() {
    ensurePromise = null;
    return V.db.clearAll().then(function () { return ensure(true); });
  }

  V.seed = {
    SEED: SEED,
    generateCatalog: generateCatalog,
    generateOrders: generateOrders,
    seedCustomers: seedCustomers,
    ensure: ensure,
    resetDemo: resetDemo,
    _cache: null
  };
})(window);
