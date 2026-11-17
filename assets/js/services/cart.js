/* ============================================================
   VENDORA — Services: cart, wishlist, compare
   Cart/wishlist persist per owner (guest or customer) in IndexedDB.
   Compare is a transient localStorage list (max 4).
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;

  var CART = { _cache: null, _owner: null };
  var WISH = { _cache: null, _owner: null };

  function currentUser() { return V.state.get('user'); }
  function ownerId() { var u = currentUser(); return u ? u.id : 'guest'; }

  /* ---------------- Cart ---------------- */
  function loadCart(force) {
    var oid = ownerId();
    if (CART._cache && CART._owner === oid && !force) return Promise.resolve(CART._cache);
    return V.db.get('carts', oid).then(function (c) {
      CART._cache = c || { id: oid, items: [], updatedAt: Date.now() };
      CART._owner = oid;
      syncBadge();
      return CART._cache;
    });
  }
  function saveCart() {
    CART._cache.updatedAt = Date.now();
    return V.db.put('carts', CART._cache).then(function () {
      syncBadge(); V.bus.emit('cart:changed', CART._cache); return CART._cache;
    });
  }

  function addToCart(productId, qty) {
    qty = Math.max(1, parseInt(qty, 10) || 1);
    return loadCart().then(function () {
      var p = V.catalog.get(productId);
      if (!p) throw new Error('product_not_found');
      var avail = V.catalog.stockOf(p);
      var line = CART._cache.items.find(function (i) { return i.productId === productId; });
      var already = line ? line.qty : 0;
      var want = already + qty;
      if (avail > 0 && want > avail) want = avail;
      if (want <= 0) throw new Error('out_of_stock');
      if (line) line.qty = want; else CART._cache.items.push({ productId: productId, qty: want, addedAt: Date.now() });
      return saveCart();
    });
  }

  function setQty(productId, qty) {
    qty = parseInt(qty, 10) || 0;
    return loadCart().then(function () {
      CART._cache.items = CART._cache.items.filter(function (i) { return i.productId !== productId; });
      if (qty > 0) {
        var p = V.catalog.get(productId);
        var avail = p ? V.catalog.stockOf(p) : qty;
        if (avail > 0) qty = Math.min(qty, avail);
        CART._cache.items.push({ productId: productId, qty: qty, addedAt: Date.now() });
      }
      return saveCart();
    });
  }
  function removeFromCart(productId) {
    return loadCart().then(function () {
      CART._cache.items = CART._cache.items.filter(function (i) { return i.productId !== productId; });
      return saveCart();
    });
  }
  function clearCart() { return loadCart().then(function () { CART._cache.items = []; return saveCart(); }); }

  function cartLines() {
    var c = CART._cache; if (!c) return [];
    return c.items.map(function (i) {
      var p = V.catalog.get(i.productId);
      var unit = p ? V.catalog.priceOf(p) : 0;
      return { product: p, productId: i.productId, qty: i.qty, unitPrice: unit, lineTotal: unit * i.qty };
    }).filter(function (l) { return l.product; });
  }

  function couponDiscount(coupon, subtotal, market) {
    if (!coupon) return 0;
    if (coupon.type === 'percent') return Math.round(subtotal * (coupon.value / 100) * 100) / 100;
    if (coupon.type === 'fixed') return Math.min(subtotal, (coupon.valuePerMarket && coupon.valuePerMarket[market]) || coupon.value || 0);
    return 0; // freeship handled in shipping
  }

  /* ---------------- Delivery regions & rates (city-aware shipping) ---------------- */
  var DELIV = { regions: null, rates: null };
  function loadDelivery(force) {
    if (DELIV.regions && DELIV.rates && !force) return Promise.resolve(DELIV);
    return Promise.all([V.db.getAll('deliveryRegions'), V.db.getAll('deliveryRates')]).then(function (res) {
      DELIV.regions = res[0] || []; DELIV.rates = res[1] || []; return DELIV;
    });
  }
  function deliveryRegions(market) {
    if (!DELIV.regions) return [];
    return DELIV.regions.filter(function (r) { return r.marketCode === market && r.active !== false; });
  }
  function shippingInfo(market, city, subtotal, coupon) {
    var mk = V.getMarket(market);
    var info = { fee: mk.shippingFlat, freeOver: mk.freeShippingOver, etaMin: null, etaMax: null, city: city || '', codAllowed: true };
    if (DELIV.regions && DELIV.rates && city) {
      var nc = V.utils.normalizeText(city);
      var reg = deliveryRegions(market).filter(function (r) {
        return V.utils.normalizeText(r.city) === nc || (r.cityEn && V.utils.normalizeText(r.cityEn) === nc);
      })[0];
      if (reg) {
        var rate = DELIV.rates.filter(function (rt) { return rt.regionId === reg.id && rt.active !== false; })[0];
        if (rate) {
          info.fee = rate.fee;
          info.freeOver = rate.freeOver != null ? rate.freeOver : mk.freeShippingOver;
          info.etaMin = rate.etaMin != null ? rate.etaMin : null;
          info.etaMax = rate.etaMax != null ? rate.etaMax : null;
          if (rate.codAllowed === false) info.codAllowed = false;
        }
      }
    }
    if ((info.freeOver != null && subtotal >= info.freeOver) || (coupon && coupon.type === 'freeship')) info.fee = 0;
    return info;
  }

  /* --- delivery admin API (regions & rates CRUD) --- */
  function adminRegions(market) {
    return loadDelivery().then(function (d) {
      return (d.regions || []).filter(function (r) { return !market || r.marketCode === market; });
    });
  }
  function adminRates(regionId) {
    return loadDelivery().then(function (d) {
      return (d.rates || []).filter(function (r) { return r.regionId === regionId; });
    });
  }
  function saveRegion(region) {
    var rec = Object.assign({ active: true, isCapital: false }, region);
    if (!rec.id) rec.id = V.utils.uid('drg');
    return V.db.put('deliveryRegions', rec).then(function () {
      // ensure a rate row exists for new regions
      return V.db.getAll('deliveryRates').then(function (rates) {
        if (!rates.some(function (r) { return r.regionId === rec.id; })) {
          var mk = V.getMarket(rec.marketCode);
          return V.db.put('deliveryRates', { id: V.utils.uid('drt'), regionId: rec.id, marketCode: rec.marketCode, fee: (mk && mk.shippingFlat) || 0, freeOver: (mk && mk.freeShippingOver) || null, etaMin: 1, etaMax: 5, codAllowed: true, active: true, updatedAt: Date.now() });
        }
      });
    }).then(function () { return loadDelivery(true); }).then(function () { return rec; });
  }
  function removeRegion(id) {
    return V.db.del('deliveryRegions', id).then(function () {
      return V.db.getAll('deliveryRates').then(function (rates) {
        return Promise.all(rates.filter(function (r) { return r.regionId === id; }).map(function (r) { return V.db.del('deliveryRates', r.id); }));
      });
    }).then(function () { return loadDelivery(true); });
  }
  function saveRate(rate) {
    var rec = Object.assign({ active: true, codAllowed: true }, rate, { updatedAt: Date.now() });
    if (rec.id) return V.db.put('deliveryRates', rec).then(function () { return loadDelivery(true); }).then(function () { return rec; });
    return loadDelivery().then(function (d) {
      var existing = (d.rates || []).filter(function (r) { return r.regionId === rec.regionId; })[0];
      rec.id = (existing && existing.id) || V.utils.uid('drt');
      return V.db.put('deliveryRates', rec).then(function () { return loadDelivery(true); }).then(function () { return rec; });
    });
  }

  function cartTotals(opts) {
    opts = opts || {};
    var market = opts.market || V.state.get('market');
    var mk = V.getMarket(market);
    var lines = cartLines();
    var subtotal = lines.reduce(function (a, l) { return a + l.lineTotal; }, 0);
    var count = lines.reduce(function (a, l) { return a + l.qty; }, 0);
    var coupon = opts.coupon || null;
    var discount = couponDiscount(coupon, subtotal, market);
    var si = shippingInfo(market, opts.city, subtotal, coupon);
    var shipping = si.fee;
    var taxable = Math.max(0, subtotal - discount);
    var tax = Math.round(taxable * (mk.taxRate || 0) * 100) / 100;
    var total = Math.max(0, taxable + shipping + tax);
    return { lines: lines, subtotal: subtotal, discount: discount, shipping: shipping, shippingEta: { min: si.etaMin, max: si.etaMax }, city: si.city, tax: tax, total: total, count: count, market: market };
  }

  /* ---------------- Wishlist ---------------- */
  function loadWish(force) {
    var oid = ownerId();
    if (WISH._cache && WISH._owner === oid && !force) return Promise.resolve(WISH._cache);
    return V.db.get('wishlists', oid).then(function (w) {
      WISH._cache = w || { id: oid, items: [], updatedAt: Date.now() };
      WISH._owner = oid; syncBadge(); return WISH._cache;
    });
  }
  function saveWish() { WISH._cache.updatedAt = Date.now(); return V.db.put('wishlists', WISH._cache).then(function () { syncBadge(); V.bus.emit('wishlist:changed', WISH._cache); return WISH._cache; }); }
  function inWishlist(productId) { return !!(WISH._cache && WISH._cache.items.indexOf(productId) !== -1); }
  function toggleWishlist(productId) {
    return loadWish().then(function () {
      var idx = WISH._cache.items.indexOf(productId);
      if (idx === -1) WISH._cache.items.push(productId); else WISH._cache.items.splice(idx, 1);
      return saveWish();
    });
  }
  function wishCount() { return WISH._cache ? WISH._cache.items.length : 0; }
  function wishProducts() { return (WISH._cache ? WISH._cache.items : []).map(function (id) { return V.catalog.get(id); }).filter(Boolean); }

  /* ---------------- Compare (transient) ---------------- */
  var CMP_KEY = 'compare';
  var MAX_CMP = 4;
  function cmpIds() { return V.ls.get(CMP_KEY, []) || []; }
  function cmpHas(id) { return cmpIds().indexOf(id) !== -1; }
  function cmpToggle(id) {
    var ids = cmpIds(); var idx = ids.indexOf(id);
    if (idx === -1) { if (ids.length >= MAX_CMP) return { full: true, ids: ids }; ids.push(id); }
    else ids.splice(idx, 1);
    V.ls.set(CMP_KEY, ids); syncBadge(); V.bus.emit('compare:changed', ids);
    return { full: false, added: idx === -1, ids: ids };
  }
  function cmpClear() { V.ls.set(CMP_KEY, []); syncBadge(); V.bus.emit('compare:changed', []); }
  function cmpProducts() { return cmpIds().map(function (id) { return V.catalog.get(id); }).filter(Boolean); }

  /* ---------------- Badges ---------------- */
  function syncBadge() {
    V.state.set('cartCount', CART._cache ? CART._cache.items.reduce(function (a, i) { return a + i.qty; }, 0) : 0);
    V.state.set('wishCount', WISH._cache ? WISH._cache.items.length : 0);
    V.state.set('compareCount', cmpIds().length);
  }

  /* ---------------- Owner change (login/logout merge) ---------------- */
  function onOwnerChange() {
    var prevOwner = CART._owner;
    var guestCart = (prevOwner === 'guest') ? V.utils.deepClone(CART._cache) : null;
    var guestWish = (prevOwner === 'guest') ? V.utils.deepClone(WISH._cache) : null;
    CART._cache = null; WISH._cache = null;
    return Promise.all([loadCart(true), loadWish(true)]).then(function () {
      var tasks = [];
      if (guestCart && ownerId() !== 'guest' && guestCart.items.length) {
        guestCart.items.forEach(function (gi) {
          var ex = CART._cache.items.find(function (i) { return i.productId === gi.productId; });
          if (ex) ex.qty = Math.max(ex.qty, gi.qty); else CART._cache.items.push(gi);
        });
        tasks.push(saveCart());
      }
      if (guestWish && ownerId() !== 'guest' && guestWish.items.length) {
        guestWish.items.forEach(function (id) { if (WISH._cache.items.indexOf(id) === -1) WISH._cache.items.push(id); });
        tasks.push(saveWish());
      }
      syncBadge();
      return Promise.all(tasks);
    });
  }

  V.cart = {
    load: loadCart, add: addToCart, setQty: setQty, remove: removeFromCart, clear: clearCart,
    lines: cartLines, totals: cartTotals, count: function () { return CART._cache ? CART._cache.items.reduce(function (a, i) { return a + i.qty; }, 0) : 0; },
    raw: function () { return CART._cache; },
    refresh: function () { return loadCart(true); }
  };
  V.wishlist = {
    load: loadWish, toggle: toggleWishlist, has: inWishlist, count: wishCount, products: wishProducts, refresh: function () { return loadWish(true); }
  };
  V.compare = {
    ids: cmpIds, has: cmpHas, toggle: cmpToggle, clear: cmpClear, products: cmpProducts, max: MAX_CMP
  };
  V.commerce = {
    onOwnerChange: onOwnerChange, syncBadge: syncBadge, couponDiscount: couponDiscount,
    loadDelivery: loadDelivery, deliveryRegions: deliveryRegions, shippingInfo: shippingInfo
  };
  V.delivery = {
    adminRegions: adminRegions, adminRates: adminRates, saveRegion: saveRegion,
    removeRegion: removeRegion, saveRate: saveRate, refresh: function () { return loadDelivery(true); }
  };
})(window);

