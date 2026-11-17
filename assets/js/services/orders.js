/* ============================================================
   VENDORA — Services: coupons, orders (atomic checkout + full
   lifecycle: order / payment / collection / reservation / return),
   cancellations, returns & exchanges, refunds, shipments.
   Local only — financial steps are simulated and clearly marked.
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var U = V.utils;

  function now() { return Date.now(); }

  // Sensitive order actions are additionally written to the global audit store.
  function audit(entity, action, data) {
    if (!V.audit || !V.audit.log) return Promise.resolve();
    try { return Promise.resolve(V.audit.log(entity, action, data)); } catch (e) { return Promise.resolve(); }
  }

  /* ---------------- Coupons ---------------- */
  function validateCoupon(code, market, subtotal, customerId) {
    code = String(code || '').trim().toUpperCase();
    if (!code) return Promise.resolve({ ok: false, error: 'couponInvalid' });
    return V.db.getOneByIndex('coupons', 'code', code).then(function (c) {
      if (!c || !c.active) return { ok: false, error: 'couponInvalid' };
      if (c.expiresAt && c.expiresAt < Date.now()) return { ok: false, error: 'couponInvalid' };
      if (c.marketCode && c.marketCode !== market) return { ok: false, error: 'couponInvalid' };
      var min = (c.minOrder && c.minOrder[market]) || 0;
      if (subtotal < min) return { ok: false, error: 'couponMin', min: min, coupon: c };
      if (c.usageLimit && c.used >= c.usageLimit) return { ok: false, error: 'couponInvalid' };
      return { ok: true, coupon: c };
    });
  }

  /* ---------------- Order status machine ---------------- */
  var TRANSITIONS = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['READY_TO_SHIP', 'SHIPPED', 'CANCELLED'],
    READY_TO_SHIP: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_FAILED'],
    DELIVERY_FAILED: ['RESCHEDULED', 'RETURNED_TO_WAREHOUSE'],
    RESCHEDULED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED_TO_WAREHOUSE'],
    DELIVERED: ['RETURN_REQUESTED'],
    RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
    RETURNED: ['REFUNDED'],
    RETURNED_TO_WAREHOUSE: ['REFUNDED'],
    CANCELLED: [],
    REFUNDED: []
  };
  function canTransition(from, to) { return (TRANSITIONS[from] || []).indexOf(to) !== -1; }

  // States at/after which stock has left the "temporary reservation" phase.
  function isHeld(order) { return order.reservationStatus === 'temporary'; }
  function isDeducted(order) { return !!order.stockDeducted; }

  function logEvent(store, orderId, type, from, to, note, by) {
    store.put({ id: 'ev_' + U.uid(''), orderId: orderId, type: type, from: from || null, to: to || null, note: note || '', by: by || 'system', at: Date.now() });
  }

  function orderNumber(store) {
    return new Promise(function (resolve) {
      var d = new Date();
      var yy = String(d.getFullYear()).slice(2), mm = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
      var req = store.get('order');
      req.onsuccess = function () {
        var rec = req.result; var seq = rec ? rec.value : 1;
        store.put({ key: 'order', value: seq + 1 });
        resolve('VEN-' + yy + mm + dd + '-' + String(seq).padStart(4, '0'));
      };
      req.onerror = function () { resolve('VEN-' + Date.now()); };
    });
  }

  /* ---------------- Place order (atomic core) ---------------- */
  function placeOrder(input) {
    input = input || {};
    var coupon = input.coupon || null;
    var market = input.market || V.state.get('market');
    var user = V.state.get('user');
    var method = input.paymentMethod || 'cod';

    return V.catalog.load().then(function () {
      var totals = V.cart.totals({ coupon: coupon, market: market, city: input.city });
      if (!totals.lines.length) return Promise.reject(new Error('cart_empty'));

      // stock guard (do not deduct — a temporary reservation is created after saving)
      var issues = [];
      totals.lines.forEach(function (l) {
        var avail = V.catalog.stockOf(l.product, market);
        if (avail <= 0) issues.push({ product: l.product, reason: 'out' });
        else if (l.qty > avail) issues.push({ product: l.product, reason: 'low', avail: avail });
      });
      if (issues.length) return Promise.reject(Object.assign(new Error('stock_issue'), { issues: issues }));

      var items = totals.lines.map(function (l) {
        var p = l.product;
        return {
          productId: p.id, sku: p.sku, slug: p.slug,
          nameAr: p.nameAr, nameEn: p.nameEn,
          brandNameAr: p.brandNameAr, brandNameEn: p.brandNameEn,
          image: p.primaryImage, unitPrice: l.unitPrice, qty: l.qty, lineTotal: l.lineTotal,
          compareAt: V.catalog.compareAtOf(p)
        };
      });

      var order = {
        id: 'ord_' + U.uid(''),
        number: null,
        idempotencyKey: input.idempotencyKey || null,
        customerId: user ? user.id : null,
        contact: {
          name: input.name || (user && user.name) || '', email: input.email || (user && user.email) || '',
          phone: input.phone || (user && user.phone) || ''
        },
        shipping: {
          market: market, city: input.city || '', area: input.area || '', street: input.street || '', notes: input.notes || ''
        },
        items: items,
        pricing: { subtotal: totals.subtotal, discount: totals.discount, shipping: totals.shipping, tax: totals.tax, total: totals.total, couponCode: coupon ? coupon.code : null, currency: V.getMarket(market).currency },
        status: 'PENDING',
        paymentStatus: 'unpaid',
        paymentMethod: method,
        collectionStatus: 'not_collected',
        reservationStatus: 'none',
        returnStatus: null,
        stockDeducted: false,
        stockRestored: false,
        return: null,
        createdAt: Date.now(), updatedAt: Date.now()
      };

      var stores = ['orders', 'orderEvents', 'coupons', 'counters', 'meta'];
      return V.db.tx(stores, 'readwrite', function (s) {
        if (order.idempotencyKey) {
          return getReq(s.meta, 'idem:' + order.idempotencyKey).then(function (m) {
            if (m && m.value) return getReq(s.orders, m.value);
            return writeOrder(s);
          });
        }
        return writeOrder(s);

        function writeOrder(s) {
          return orderNumber(s.counters).then(function (num) {
            order.number = num;
            s.orders.put(order);
            logEvent(s.orderEvents, order.id, 'created', null, 'PENDING', 'order placed', order.customerId || 'guest');
            if (coupon) { coupon.used = (coupon.used || 0) + 1; s.coupons.put(coupon); }
            if (order.idempotencyKey) s.meta.put({ key: 'idem:' + order.idempotencyKey, value: order.id });
            return order;
          });
        }
      });
    }).then(function (saved) {
      if (!saved || saved.id !== undefined && saved.items === undefined) return saved; // idempotent replay
      return afterPlace(saved, market, method);
    }).then(function (saved) {
      return V.cart.clear().then(function () { return saved; });
    });
  }

  function afterPlace(order, market, method) {
    // 1) create the (simulated) payment record
    return V.payments.create(order, method).then(function (pay) {
      order.paymentId = pay.id; order.paymentMethod = pay.method;
      order.updatedAt = now();
      return V.db.put('orders', order).then(function () { return order; });
    }).then(function (order) {
      // 2) hold stock with a temporary reservation
      return V.db.get('settings', 'general').then(function (s) {
        var ttl = (s && s.reservationTtlMinutes) || 60;
        var items = order.items.map(function (i) { return { productId: i.productId, qty: i.qty }; });
        return V.stock.reserve({ items: items, market: market, orderId: order.id, ttlMinutes: ttl }).then(function () {
          order.reservationStatus = 'temporary';
          order.updatedAt = now();
          return V.db.put('orders', order).then(function () { return order; });
        });
      });
    }).then(function (order) {
      // 3) notify the customer
      return V.notify.orderPlaced(order).then(function () { return order; });
    });
  }

  function getReq(store, key) {
    return new Promise(function (resolve, reject) { var r = store.get(key); r.onsuccess = function () { resolve(r.result); }; r.onerror = function () { reject(r.error); }; });
  }

  /* ---------------- Status transition ---------------- */
  function updateStatus(orderId, next, opts) {
    opts = opts || {};
    var target;
    return V.db.tx(['orders', 'orderEvents'], 'readwrite', function (s) {
      return getReq(s.orders, orderId).then(function (order) {
        if (!order) throw new Error('order_not_found');
        if (order.status === next) { target = order; return order; }
        if (!canTransition(order.status, next)) throw new Error('invalid_transition:' + order.status + '->' + next);
        var from = order.status;
        order.status = next; order.updatedAt = Date.now();
        if (next === 'DELIVERED') { order.paymentStatus = order.paymentMethod === 'cod' ? 'paid' : order.paymentStatus; order.collectionStatus = order.paymentMethod === 'cod' ? 'collected' : order.collectionStatus; }
        if (next === 'CANCELLED') order.paymentStatus = (order.paymentStatus === 'paid' ? 'refunded' : 'cancelled');
        if (next === 'REFUNDED') order.paymentStatus = 'refunded';
        if (opts && opts.return) order.return = Object.assign({}, order.return, opts.return);
        s.orders.put(order);
        logEvent(s.orderEvents, order.id, 'status', from, next, (opts && opts.note) || '', (opts && opts.by) || 'staff');
        target = order;
        return order;
      });
    }).then(function (order) {
      if (!order) return order;
      return applyStatusSideEffects(order, next).then(function () { return order; });
    });
  }

  function applyStatusSideEffects(order, next) {
    var market = order.shipping && order.shipping.market;
    var afterStock = Promise.resolve();
    if (next === 'CONFIRMED') {
      if (isHeld(order)) afterStock = V.stock.commit(order.id).then(function () { return setOrderFlag(order.id, { reservationStatus: 'confirmed', stockDeducted: true }); });
      else if (!isDeducted(order)) afterStock = legacyApply(order, -1).then(function () { return setOrderFlag(order.id, { stockDeducted: true }); });
    } else if (next === 'CANCELLED') {
      if (isHeld(order)) afterStock = V.stock.release(order.id, 'order_cancelled').then(function () { return setOrderFlag(order.id, { reservationStatus: 'released' }); });
      else if (isDeducted(order) && !order.stockRestored) afterStock = legacyApply(order, +1).then(function () { return setOrderFlag(order.id, { stockRestored: true }); });
    } else if (next === 'RETURNED') {
      var good = (order.return && order.return.items || []).filter(function (r) { return r.condition === 'good'; });
      if (good.length) afterStock = V.stock.restoreItems(market, good.map(function (r) { return { productId: r.productId, qty: r.qty }; }), 'good', order.id);
    }
    return afterStock.then(function () {
      return V.notify.orderStatus(order, next);
    }).then(function () {
      if (V.catalog && V.catalog.refreshInventory) return V.catalog.refreshInventory();
    });
  }

  function setOrderFlag(orderId, flags) {
    return V.db.get('orders', orderId).then(function (o) { if (!o) return; Object.assign(o, flags); o.updatedAt = now(); return V.db.put('orders', o); });
  }

  // Apply a stock delta across the order's market (updates market + global rows).
  function legacyApply(order, dir) {
    var market = order.shipping && order.shipping.market;
    return order.items.reduce(function (chain, it) {
      return chain.then(function () {
        return V.stock.adjust(it.productId, dir * it.qty, { market: market, reason: 'order_stock', by: 'system' });
      });
    }, Promise.resolve());
  }

  /* ---------------- Cancellation policy ---------------- */
  // Returns { allowed, needsStaff, reason }
  function canCancel(order, role) {
    if (!order) return { allowed: false, reason: 'order_not_found' };
    var manager = role === 'role_admin' || role === 'role_orders';
    if (order.status === 'PENDING' || order.status === 'CONFIRMED') return { allowed: true, needsStaff: false };
    if (order.status === 'PROCESSING' || order.status === 'READY_TO_SHIP') return { allowed: !!manager, needsStaff: true, reason: manager ? '' : 'cancel_needs_staff' };
    return { allowed: false, needsStaff: true, reason: 'cancel_after_shipping' };
  }
  function cancel(orderId, opts) {
    opts = opts || {};
    var user = V.state.get('user');
    return V.db.get('orders', orderId).then(function (order) {
      if (!order) return Promise.reject(new Error('order_not_found'));
      var policy = canCancel(order, user ? user.role : null);
      if (!policy.allowed) return Promise.reject(new Error(policy.reason || 'cancel_not_allowed'));
      return updateStatus(orderId, 'CANCELLED', { note: opts.reason || 'cancelled', by: (user && user.id) || 'customer' }).then(function (o) {
        return audit('orders', 'cancel', { orderId: orderId, number: order.number, reason: opts.reason || '', by: (user && (user.username || user.email || user.id)) || 'customer' }).then(function () { return o; });
      });
    });
  }

  /* ---------------- Returns & exchanges ---------------- */
  function requestReturn(orderId, data) {
    data = data || {};
    return V.db.get('orders', orderId).then(function (order) {
      if (!order) return Promise.reject(new Error('order_not_found'));
      if (order.status !== 'DELIVERED') return Promise.reject(new Error('return_not_delivered'));
      return V.db.get('settings', 'general').then(function (s) {
        var days = (s && s.returnWindowDays) || 3;
        var deliveredAt = order.deliveredAt || order.updatedAt;
        var deadline = deliveredAt + days * 86400000;
        if (now() > deadline) return Promise.reject(new Error('return_window_closed'));
        var items = (data.items && data.items.length ? data.items : order.items.map(function (i) { return { productId: i.productId, qty: i.qty }; }));
        var req = {
          id: 'ret_' + U.uid(''), orderId: orderId, orderNumber: order.number, type: data.type || 'return',
          reason: data.reason || '', note: data.note || '', items: items, status: 'requested',
          customerId: order.customerId, requestedBy: (V.state.get('user') || {}).id || order.customerId || 'guest',
          createdAt: now(), deadline: deadline, history: [{ status: 'requested', at: now() }]
        };
        return V.db.put('returnRequests', req).then(function () {
          order.returnStatus = 'requested'; order.updatedAt = now();
          return V.db.put('orders', order).then(function () {
            return updateStatus(orderId, 'RETURN_REQUESTED', { note: 'return requested', by: req.requestedBy }).then(function () { return req; });
          });
        });
      });
    });
  }

  // decision: 'approved' | 'rejected'
  function reviewReturn(returnId, decision, opts) {
    opts = opts || {};
    return V.db.get('returnRequests', returnId).then(function (req) {
      if (!req) return Promise.reject(new Error('return_not_found'));
      req.status = decision; req.reviewedBy = opts.by || 'staff'; req.reviewedAt = now(); req.reviewNote = opts.note || '';
      req.history.push({ status: decision, at: now(), by: opts.by || 'staff' });
      if (opts.items) req.items = opts.items; // {productId, qty, condition:'good'|'damaged'}
      return V.db.put('returnRequests', req).then(function () {
        return audit('orders', 'return_' + decision, { returnId: returnId, orderId: req.orderId, number: req.orderNumber, by: opts.by || 'staff' }).then(function () {
          return V.db.get('orders', req.orderId).then(function (order) {
            if (!order) return req;
            if (decision === 'approved') {
              order.returnStatus = 'approved'; order.return = { type: req.type, reason: req.reason, items: req.items, approvedAt: now() };
              order.updatedAt = now();
              return V.db.put('orders', order).then(function () {
                return updateStatus(order.id, 'RETURNED', { note: 'return approved', by: req.reviewedBy, return: order.return });
              }).then(function () { return req; });
            }
            order.returnStatus = 'rejected'; order.updatedAt = now();
            return V.db.put('orders', order).then(function () { return req; });
          });
        });
      });
    });
  }
  function requestExchange(orderId, data) {
    return requestReturn(orderId, Object.assign({}, data, { type: 'exchange' }));
  }
  function returns(f) {
    f = f || {};
    var p = f.status ? V.db.getAllByIndex('returnRequests', 'status', f.status) : V.db.getAll('returnRequests');
    return p.then(function (arr) { arr.sort(function (a, b) { return b.createdAt - a.createdAt; }); return arr; });
  }

  /* ---------------- Shipments & delivery attempts ---------------- */
  function createShipment(orderId, data) {
    data = data || {};
    var shp = { id: 'shp_' + U.uid(''), orderId: orderId, carrier: data.carrier || 'VENDORA Express', tracking: data.tracking || ('TRK-' + U.uid('').toUpperCase()), status: 'created', attempts: 0, createdAt: now() };
    return V.db.put('shipments', shp).then(function () { return shp; });
  }
  function addDeliveryAttempt(orderId, data) {
    data = data || {};
    var attempt = { id: 'att_' + U.uid(''), orderId: orderId, result: data.result || 'failed', note: data.note || '', at: now() };
    return V.db.put('deliveryAttempts', attempt).then(function () { return attempt; });
  }
  function shipmentsFor(orderId) { return V.db.getAllByIndex('shipments', 'orderId', orderId); }

  /* ---------------- Reads ---------------- */
  function getOrder(id) {
    return V.db.get('orders', id).then(function (o) {
      if (!o) return null;
      return V.db.getAllByIndex('orderEvents', 'orderId', id).then(function (ev) {
        ev.sort(function (a, b) { return a.at - b.at; });
        o.events = ev; return o;
      });
    });
  }
  function getOrderByNumber(num) { return V.db.getOneByIndex('orders', 'number', num); }
  function listOrders(f) {
    f = f || {};
    var p = f.customerId ? V.db.getAllByIndex('orders', 'customerId', f.customerId)
      : f.status ? V.db.getAllByIndex('orders', 'status', f.status)
        : V.db.getAll('orders');
    return p.then(function (arr) {
      arr.sort(function (a, b) { return b.createdAt - a.createdAt; });
      if (f.status && f.customerId) arr = arr.filter(function (o) { return o.status === f.status; });
      if (f.paymentStatus) arr = arr.filter(function (o) { return o.paymentStatus === f.paymentStatus; });
      return arr;
    });
  }

  /* ---------------- Inventory admin (legacy surface) ---------------- */
  function adjustStock(productId, delta, reason, by) {
    return V.stock.adjust(productId, delta, { reason: reason, by: by }).then(function (inv) {
      return V.audit.log('inventory', 'adjust', { productId: productId, delta: delta, reason: reason || '', by: by || 'staff' }).then(function () { return inv; });
    });
  }
  function setStock(productId, value, reason, by) {
    return V.stock.setOnHand(productId, value, { reason: reason, by: by });
  }
  function inventoryList() { return V.stock.listMarketInventory({ market: V.state.get('market') || V.config.DEFAULT_MARKET }); }

  /* ---------------- Invoice / packing slip (print, offline) ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function printInvoice(order) {
    if (!order) return;
    var ar = (V.state.get('lang') === 'ar');
    var L = function (a, e) { return ar ? a : e; };
    var mk = V.getMarket(order.shipping.market);
    var name = order.contact.name || '-';
    function dt(ms) { try { return new Date(ms).toLocaleString(ar ? 'ar' : 'en-GB'); } catch (e) { return ''; } }
    var rows = order.items.map(function (it) {
      return '<tr><td>' + esc(ar ? it.nameAr : it.nameEn) + '<div class="muted">' + esc(it.sku || '') + '</div></td>' +
        '<td class="c">' + it.qty + '</td>' +
        '<td class="c">' + esc(V.moneyIn(it.unitPrice, order.shipping.market)) + '</td>' +
        '<td class="c">' + esc(V.moneyIn(it.lineTotal, order.shipping.market)) + '</td></tr>';
    }).join('');
    var badge = function (lbl, val) { return '<span class="badge">' + esc(lbl) + ': ' + esc(val) + '</span>'; };
    var html = '<!doctype html><html dir="' + (ar ? 'rtl' : 'ltr') + '" lang="' + (ar ? 'ar' : 'en') + '"><head><meta charset="utf-8">' +
      '<title>' + esc(L('فاتورة', 'Invoice') + ' ' + order.number) + '</title>' +
      '<style>' +
      '*{box-sizing:border-box}body{font-family:' + (ar ? 'Cairo,' : 'Montserrat,') + 'Arial,sans-serif;color:#111;margin:24px;font-size:13px}' +
      '.head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0B192C;padding-bottom:12px;margin-bottom:16px}' +
      '.brand{font-size:22px;font-weight:800;color:#0B192C;letter-spacing:1px}.brand small{display:block;font-size:11px;color:#666;font-weight:500;letter-spacing:0}' +
      '.meta{text-align:end;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:12px}' +
      'th,td{border:1px solid #ccc;padding:7px 9px;text-align:start;vertical-align:top}.c{text-align:center}' +
      'th{background:#f2efe9}.muted{color:#777;font-size:11px}.badge{display:inline-block;border:1px solid #999;border-radius:10px;padding:2px 8px;margin:0 3px 3px 0;font-size:11px}' +
      '.totals{margin-top:12px;margin-inline-start:auto;width:300px}.totals .r{display:flex;justify-content:space-between;padding:4px 0}.totals .t{font-weight:800;border-top:2px solid #0B192C;padding-top:6px}' +
      '.foot{margin-top:22px;border-top:1px solid #ddd;padding-top:10px;color:#777;font-size:11px}' +
      '.cols{display:flex;gap:24px;flex-wrap:wrap}.cols>div{flex:1;min-width:190px}.h{font-weight:700;margin-bottom:4px;color:#0B192C}' +
      '.no-print{margin-bottom:12px}@media print{.no-print{display:none}}' +
      '</style></head><body>' +
      '<div class="no-print"><button onclick="window.print()">🖨️ ' + esc(L('طباعة', 'Print')) + '</button></div>' +
      '<div class="head"><div class="brand">VENDORA<small>' + esc(L('كل ما تحب، في مكان واحد.', 'Everything you love, in one place.')) + '</small></div>' +
      '<div class="meta"><div><strong>' + esc(L('فاتورة', 'INVOICE')) + '</strong></div><div>' + esc(order.number) + '</div><div>' + esc(dt(order.createdAt)) + '</div></div></div>' +
      '<div class="cols">' +
      '<div><div class="h">' + esc(L('بيانات العميل', 'Customer')) + '</div>' + esc(name) + '<br>' + esc(order.contact.phone || '') + '<br>' + esc(order.contact.email || '') + '</div>' +
      '<div><div class="h">' + esc(L('عنوان التوصيل', 'Deliver to')) + '</div>' + esc(order.shipping.city || '') + ' — ' + esc(order.shipping.area || '') + '<br>' + esc(order.shipping.street || '') + '<br>' + esc(mk.flag + ' ' + (ar ? mk.nameAr : mk.nameEn)) + '</div>' +
      '<div><div class="h">' + esc(L('الحالة', 'Status')) + '</div>' +
      badge(L('الطلب', 'Order'), V.t('st_' + order.status) !== 'st_' + order.status ? V.t('st_' + order.status) : order.status) +
      badge(L('الدفع', 'Payment'), V.t('pst_' + order.paymentStatus) !== 'pst_' + order.paymentStatus ? V.t('pst_' + order.paymentStatus) : order.paymentStatus) +
      badge(L('الطريقة', 'Method'), V.t('pm_' + order.paymentMethod)) + '</div></div>' +
      '<table><thead><tr><th>' + esc(L('المنتج', 'Product')) + '</th><th class="c">' + esc(L('الكمية', 'Qty')) + '</th><th class="c">' + esc(L('السعر', 'Price')) + '</th><th class="c">' + esc(L('الإجمالي', 'Total')) + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="totals">' +
      '<div class="r"><span>' + esc(L('المجموع الفرعي', 'Subtotal')) + '</span><span>' + esc(V.moneyIn(order.pricing.subtotal, order.shipping.market)) + '</span></div>' +
      (order.pricing.discount ? '<div class="r"><span>' + esc(L('الخصم', 'Discount')) + (order.pricing.couponCode ? ' (' + esc(order.pricing.couponCode) + ')' : '') + '</span><span>-' + esc(V.moneyIn(order.pricing.discount, order.shipping.market)) + '</span></div>' : '') +
      '<div class="r"><span>' + esc(L('التوصيل', 'Shipping')) + '</span><span>' + esc(V.moneyIn(order.pricing.shipping, order.shipping.market)) + '</span></div>' +
      (order.pricing.tax ? '<div class="r"><span>' + esc(L('الضريبة', 'Tax')) + '</span><span>' + esc(V.moneyIn(order.pricing.tax, order.shipping.market)) + '</span></div>' : '') +
      '<div class="r t"><span>' + esc(L('الإجمالي', 'Total')) + '</span><span>' + esc(V.moneyIn(order.pricing.total, order.shipping.market)) + '</span></div>' +
      '</div>' +
      '<div class="foot">' + esc(L('شكرًا لتسوقك من VENDORA. هذه فاتورة إلكترونية صادرة محليًا (محاكاة).', 'Thank you for shopping at VENDORA. This is a locally generated simulated invoice.')) + '</div>' +
      '</body></html>';
    var w = window.open('', '_blank');
    if (!w) return false;
    w.document.open(); w.document.write(html); w.document.close();
    return true;
  }

  V.coupons = { validate: validateCoupon };
  V.orders = {
    place: placeOrder, get: getOrder, getByNumber: getOrderByNumber, list: listOrders,
    updateStatus: updateStatus, canTransition: canTransition, TRANSITIONS: TRANSITIONS,
    canCancel: canCancel, cancel: cancel,
    requestReturn: requestReturn, reviewReturn: reviewReturn, requestExchange: requestExchange, returns: returns,
    createShipment: createShipment, addDeliveryAttempt: addDeliveryAttempt, shipmentsFor: shipmentsFor,
    printInvoice: printInvoice
  };
  V.inventory = { adjust: adjustStock, set: setStock, list: inventoryList };
})(window);
