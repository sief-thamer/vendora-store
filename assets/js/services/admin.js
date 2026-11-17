/* ============================================================
   VENDORA — Services: admin (settings, reports/KPIs, audit log,
   staff users, coupons CRUD, reviews moderation)
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var U = V.utils;

  /* ---------------- Audit ---------------- */
  function log(entity, action, meta, by) {
    var u = V.state.get('user');
    return V.db.put('audit', {
      id: 'aud_' + U.uid(''), entity: entity, action: action, meta: meta || {},
      by: (by || (u && (u.username || u.email)) || 'system'), at: Date.now()
    });
  }
  function listAudit(f) {
    f = f || {};
    return V.db.getAll('audit').then(function (arr) {
      arr.sort(function (a, b) { return b.at - a.at; });
      if (f.entity) arr = arr.filter(function (a) { return a.entity === f.entity; });
      if (f.limit) arr = arr.slice(0, f.limit);
      return arr;
    });
  }

  /* ---------------- Settings ---------------- */
  function getSettings() {
    return V.db.get('settings', 'general').then(function (s) { return s || {}; });
  }
  function saveSettings(patch) {
    return getSettings().then(function (s) {
      var next = Object.assign({}, s, patch, { key: 'general', updatedAt: Date.now() });
      return V.db.put('settings', next).then(function () { return log('settings', 'update', patch).then(function () { return next; }); });
    });
  }

  /* ---------------- Reports / KPIs ---------------- */
  function dashboard() {
    return V.catalog.load().then(function () {
      return Promise.all([V.db.getAll('orders'), V.db.getAll('products'), V.db.getAll('customers'), V.db.getAll('inventory')]);
    }).then(function (res) {
      var orders = res[0], products = res[1], customers = res[2], inv = res[3];
      var live = orders.filter(function (o) { return o.status !== 'CANCELLED'; });
      var paid = orders.filter(function (o) { return o.paymentStatus === 'paid'; });
      var totalSales = live.reduce(function (a, o) { return a + o.pricing.total; }, 0);
      var lowStock = inv.filter(function (i) { return i.onHand > 0 && i.onHand <= V.config.LOW_STOCK; });
      var outStock = inv.filter(function (i) { return i.onHand === 0; });
      var pending = orders.filter(function (o) { return o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PROCESSING'; });
      var kpis = {
        totalSales: totalSales,
        ordersCount: orders.length,
        paidOrders: paid.length,
        avgOrderValue: live.length ? totalSales / live.length : 0,
        productsCount: products.length,
        customersCount: customers.length,
        lowStockCount: lowStock.length,
        outStockCount: outStock.length,
        pendingCount: pending.length
      };
      return {
        kpis: kpis,
        salesByDay: salesByDay(orders, 30),
        salesByCategory: salesByCategory(orders),
        topProducts: topProducts(orders, 8),
        ordersByStatus: ordersByStatus(orders),
        recentOrders: orders.slice().sort(function (a, b) { return b.createdAt - a.createdAt; }).slice(0, 10),
        lowStock: lowStock.slice(0, 10).map(function (i) { return { inventory: i, product: V.catalog.get(i.productId) }; }),
        market: V.state.get('market')
      };
    });
  }

  function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function salesByDay(orders, days) {
    var out = [];
    var map = {};
    orders.forEach(function (o) { if (o.status === 'CANCELLED') return; var k = dayKey(o.createdAt); map[k] = (map[k] || 0) + o.pricing.total; });
    var now = Date.now();
    for (var i = days - 1; i >= 0; i--) {
      var k = dayKey(now - i * 86400000);
      out.push({ day: k, label: k.slice(5), value: map[k] || 0 });
    }
    return out;
  }
  function salesByCategory(orders) {
    var map = {};
    orders.forEach(function (o) {
      if (o.status === 'CANCELLED') return;
      o.items.forEach(function (it) {
        var p = V.catalog.get(it.productId);
        var slug = p ? p.categorySlug : 'other';
        if (!map[slug]) map[slug] = { slug: slug, value: 0, qty: 0 };
        map[slug].value += it.lineTotal; map[slug].qty += it.qty;
      });
    });
    var arr = Object.keys(map).map(function (k) { var c = V.catalog.category(map[k].slug); map[k].nameAr = c ? c.nameAr : map[k].slug; map[k].nameEn = c ? c.nameEn : map[k].slug; return map[k]; });
    arr.sort(function (a, b) { return b.value - a.value; });
    return arr;
  }
  function topProducts(orders, limit) {
    var map = {};
    orders.forEach(function (o) {
      if (o.status === 'CANCELLED') return;
      o.items.forEach(function (it) {
        if (!map[it.productId]) map[it.productId] = { productId: it.productId, nameAr: it.nameAr, nameEn: it.nameEn, image: it.image, qty: 0, revenue: 0 };
        map[it.productId].qty += it.qty; map[it.productId].revenue += it.lineTotal;
      });
    });
    var arr = Object.keys(map).map(function (k) { return map[k]; });
    arr.sort(function (a, b) { return b.revenue - a.revenue; });
    return arr.slice(0, limit || 8);
  }
  function ordersByStatus(orders) {
    var map = {};
    orders.forEach(function (o) { map[o.status] = (map[o.status] || 0) + 1; });
    return Object.keys(map).map(function (k) { return { status: k, count: map[k] }; });
  }

  /* ---------------- Staff users ---------------- */
  function listUsers() { return V.db.getAll('users'); }
  function saveUser(data) {
    data = Object.assign({}, data);
    if (!data.id) data.id = 'usr_' + U.uid('');
    data.username = String(data.username || '').trim().toLowerCase();
    return V.db.get('users', data.id).then(function (existing) {
      var rec = Object.assign({}, existing || {}, data);
      if (data.password) rec.password = U.hashPassword(data.password, rec.username);
      else if (!existing) rec.password = U.hashPassword('changeme', rec.username);
      rec.status = rec.status || 'active';
      rec.createdAt = rec.createdAt || Date.now();
      return V.db.put('users', rec).then(function () { return log('users', existing ? 'update' : 'create', { username: rec.username, role: rec.role }).then(function () { return rec; }); });
    });
  }
  function deleteUser(id) { return V.db.del('users', id).then(function () { return log('users', 'delete', { id: id }); }); }

  /* ---------------- Coupons CRUD ---------------- */
  function listCoupons() { return V.db.getAll('coupons').then(function (a) { return a.sort(function (x, y) { return (y.createdAt || 0) - (x.createdAt || 0); }); }); }
  function saveCoupon(data) {
    data = Object.assign({}, data);
    data.code = String(data.code || '').trim().toUpperCase();
    if (!data.id) data.id = 'cpn_' + U.uid('');
    return V.db.put('coupons', data).then(function () { return log('coupons', 'save', { code: data.code }).then(function () { return data; }); });
  }
  function deleteCoupon(id) { return V.db.del('coupons', id).then(function () { return log('coupons', 'delete', { id: id }); }); }

  /* ---------------- Reviews ---------------- */
  function listReviews(f) {
    f = f || {};
    var p = f.productId ? V.db.getAllByIndex('reviews', 'productId', f.productId)
      : f.status ? V.db.getAllByIndex('reviews', 'status', f.status)
        : V.db.getAll('reviews');
    return p.then(function (arr) { arr.sort(function (a, b) { return b.createdAt - a.createdAt; }); return arr; });
  }
  function addReview(data) {
    var u = V.state.get('user');
    var rec = {
      id: 'rv_' + U.uid(''), productId: data.productId,
      customerId: u ? u.id : null, author: data.author || (u && u.name) || 'زائر',
      rating: Math.max(1, Math.min(5, parseInt(data.rating, 10) || 5)),
      title: data.title || '', body: data.body || '',
      status: 'pending', createdAt: Date.now()
    };
    return V.db.put('reviews', rec).then(function () { return rec; });
  }
  function moderateReview(id, status) {
    return V.db.get('reviews', id).then(function (rv) {
      if (!rv) throw new Error('not_found');
      rv.status = status; rv.moderatedAt = Date.now();
      return V.db.put('reviews', rv).then(function () { return log('reviews', status, { id: id }).then(function () { return rv; }); });
    });
  }
  function productRating(productId) {
    return V.db.getAllByIndex('reviews', 'productId', productId).then(function (arr) {
      var pub = arr.filter(function (r) { return r.status === 'approved'; });
      var avg = pub.length ? pub.reduce(function (a, r) { return a + r.rating; }, 0) / pub.length : 0;
      return { count: pub.length, avg: Math.round(avg * 10) / 10, all: arr };
    });
  }
  function verifiedPurchase(productId, customerId) {
    if (!customerId) return Promise.resolve(false);
    return V.db.getAllByIndex('orders', 'customerId', customerId).then(function (orders) {
      return (orders || []).some(function (o) {
        var bought = (o.items || []).some(function (it) { return it.productId === productId; });
        var done = o.status === 'DELIVERED' || o.status === 'SHIPPED' || o.paymentStatus === 'paid';
        return bought && done;
      });
    });
  }
  function reportReview(id) {
    return V.db.get('reviews', id).then(function (rv) {
      if (!rv) throw new Error('not_found');
      rv.reported = true; rv.reportedAt = Date.now();
      return V.db.put('reviews', rv).then(function () { return log('reviews', 'report', { id: id }); }).then(function () { return rv; });
    });
  }

  /* ---------------- Products CRUD (admin) ---------------- */
  function listProductsAdmin(f) {
    return V.db.getAll('products').then(function (arr) {
      arr.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      if (f && f.status) arr = arr.filter(function (p) { return p.status === f.status; });
      if (f && f.cat) arr = arr.filter(function (p) { return p.categorySlug === f.cat; });
      return arr;
    });
  }
  function getProduct(id) { return V.db.get('products', id); }
  function saveProduct(data) {
    data = Object.assign({}, data);
    var isNew = !data.id;
    if (isNew) {
      data.id = 'pr_adm_' + U.uid('');
      data.createdAt = Date.now();
      if (data.rating == null) data.rating = 0;
      if (data.ratingCount == null) data.ratingCount = 0;
      if (data.sold == null) data.sold = 0;
    }
    data.updatedAt = Date.now();
    data.sku = String(data.sku || '').trim();
    data.slug = String(data.slug || '').trim();
    data.status = data.status || 'draft';
    return V.db.put('products', data).then(function () {
      var after = isNew
        ? V.db.get('inventory', data.id).then(function (inv) {
            if (inv) return inv;
            return V.db.put('inventory', { productId: data.id, onHand: data.onHand || 0, reserved: 0, low: false, out: (data.onHand || 0) === 0, updatedAt: Date.now() });
          })
        : Promise.resolve();
      return after.then(function () { return V.catalog.load(true); })
        .then(function () { return log('products', isNew ? 'create' : 'update', { id: data.id, sku: data.sku }); })
        .then(function () { return data; });
    });
  }
  function deleteProduct(id) {
    return V.db.del('products', id).then(function () { return V.catalog.load(true); })
      .then(function () { return log('products', 'delete', { id: id }); });
  }
  function setProductStatus(id, status) {
    return V.db.get('products', id).then(function (p) {
      if (!p) throw new Error('not_found');
      p.status = status; p.updatedAt = Date.now();
      return V.db.put('products', p).then(function () { return V.catalog.load(true); })
        .then(function () { return log('products', 'status', { id: id, status: status }); });
    });
  }

  /* ---------------- Taxonomy CRUD (categories / brands) ---------------- */
  function listCategoriesAdmin() { return V.db.getAll('categories').then(function (a) { return a.sort(function (x, y) { return (x.sort || 0) - (y.sort || 0); }); }); }
  function saveCategory(data) {
    data = Object.assign({}, data);
    if (!data.id) data.id = 'cat_' + U.uid('');
    if (!Array.isArray(data.subcategories)) data.subcategories = [];
    return V.db.put('categories', data).then(function () { return V.catalog.load(true); })
      .then(function () { return log('categories', 'save', { slug: data.slug }); }).then(function () { return data; });
  }
  function deleteCategory(id) { return V.db.del('categories', id).then(function () { return V.catalog.load(true); }).then(function () { return log('categories', 'delete', { id: id }); }); }

  function listBrandsAdmin() { return V.db.getAll('brands').then(function (a) { return a.sort(function (x, y) { return (x.nameEn || '').localeCompare(y.nameEn || ''); }); }); }
  function saveBrand(data) {
    data = Object.assign({}, data);
    if (!data.id) data.id = 'br_' + U.uid('');
    if (!Array.isArray(data.categories)) data.categories = [];
    return V.db.put('brands', data).then(function () { return V.catalog.load(true); })
      .then(function () { return log('brands', 'save', { slug: data.slug }); }).then(function () { return data; });
  }
  function deleteBrand(id) { return V.db.del('brands', id).then(function () { return V.catalog.load(true); }).then(function () { return log('brands', 'delete', { id: id }); }); }

  V.audit = { log: log, list: listAudit };
  V.settings = { get: getSettings, save: saveSettings };
  V.reports = { dashboard: dashboard, salesByDay: salesByDay, salesByCategory: salesByCategory, topProducts: topProducts, ordersByStatus: ordersByStatus };
  V.staff = { list: listUsers, save: saveUser, remove: deleteUser };
  V.couponsAdmin = { list: listCoupons, save: saveCoupon, remove: deleteCoupon };
  V.reviews = { list: listReviews, add: addReview, moderate: moderateReview, stats: productRating, verifiedPurchase: verifiedPurchase, report: reportReview };
  V.productsAdmin = { list: listProductsAdmin, get: getProduct, save: saveProduct, remove: deleteProduct, setStatus: setProductStatus };
  V.taxonomyAdmin = {
    categories: { list: listCategoriesAdmin, save: saveCategory, remove: deleteCategory },
    brands: { list: listBrandsAdmin, save: saveBrand, remove: deleteBrand }
  };
})(window);
