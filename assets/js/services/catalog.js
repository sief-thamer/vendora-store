/* ============================================================
   VENDORA — Services: catalog (products, categories, brands,
   search, filtering, facets). In-memory cache over IndexedDB.
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var U = V.utils;

  var _products = [];
  var _categories = [];
  var _brands = [];
  var _inv = {};           // productId -> inventory record (global / default market)
  var _minv = {};          // "market:productId" -> aggregated {onHand,reserved,damaged,available}
  var _bySlug = {};
  var _byId = {};
  var _loaded = false;
  var _loading = null;

  function load(force) {
    if (_loaded && !force) return Promise.resolve(catalog);
    if (_loading && !force) return _loading;
    _loading = V.seed.ensure().then(function () {
      return V.db.tx(['products', 'categories', 'brands', 'inventory', 'marketInventory'], 'readonly', function (s) {
        return Promise.all([
          reqAll(s.products), reqAll(s.categories), reqAll(s.brands), reqAll(s.inventory), reqAll(s.marketInventory)
        ]);
      });
    }).then(function (res) {
      _products = res[0]; _categories = res[1]; _brands = res[2];
      _inv = {};
      res[3].forEach(function (i) { _inv[i.productId] = i; });
      buildMarketInventory(res[4] || []);
      _bySlug = {}; _byId = {};
      _products.forEach(function (p) { _bySlug[p.slug] = p; _byId[p.id] = p; });
      _categories.sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
      _brands.sort(function (a, b) { return (a.nameEn || '').localeCompare(b.nameEn || ''); });
      _loaded = true; _loading = null;
      try { V.bus.emit('catalog:loaded', { count: _products.length }); } catch (e) {}
      return catalog;
    });
    return _loading;
  }

  function reqAll(store) {
    return new Promise(function (resolve, reject) {
      var req = store.getAll(); req.onsuccess = function () { resolve(req.result); }; req.onerror = function () { reject(req.error); };
    });
  }

  function buildMarketInventory(rows) {
    _minv = {};
    rows.forEach(function (r) {
      var k = r.marketCode + ':' + r.productId;
      var a = _minv[k] || (_minv[k] = { onHand: 0, reserved: 0, damaged: 0 });
      a.onHand += (r.onHand || 0); a.reserved += (r.reserved || 0); a.damaged += (r.damaged || 0);
    });
    Object.keys(_minv).forEach(function (k) { var a = _minv[k]; a.available = Math.max(0, a.onHand - a.reserved - a.damaged); });
  }

  function refreshInventory() {
    return V.db.tx(['inventory', 'marketInventory'], 'readonly', function (s) {
      return Promise.all([reqAll(s.inventory), reqAll(s.marketInventory)]);
    }).then(function (res) {
      _inv = {};
      res[0].forEach(function (i) { _inv[i.productId] = i; });
      buildMarketInventory(res[1] || []);
      try { V.bus.emit('inventory:changed', { count: res[1].length }); } catch (e) {}
      return _inv;
    });
  }

  /* ---------------- Price helpers (current market) ---------------- */
  function currentMarket() { return V.state.get('market') || V.config.DEFAULT_MARKET; }

  function priceOf(p, marketCode) {
    if (!p || !p.prices) return 0;
    marketCode = marketCode || currentMarket();
    var v = p.prices[marketCode];
    return typeof v === 'number' ? v : (p.prices[V.config.DEFAULT_MARKET] || 0);
  }
  function compareAtOf(p, marketCode) {
    if (!p || !p.compareAt) return null;
    marketCode = marketCode || currentMarket();
    return p.compareAt[marketCode] != null ? p.compareAt[marketCode] : null;
  }
  function discountPct(p, marketCode) {
    var c = compareAtOf(p, marketCode), pr = priceOf(p, marketCode);
    if (!c || c <= pr) return 0;
    return Math.round((1 - pr / c) * 100);
  }
  function stockOf(p, marketCode) {
    if (!p) return 0;
    var mk = marketCode || (V.state && V.state.get && V.state.get('market')) || V.config.DEFAULT_MARKET;
    var agg = _minv[mk + ':' + p.id];
    if (agg) return agg.available;
    var i = _inv[p.id]; return i ? Math.max(0, (i.onHand || 0) - (i.reserved || 0) - (i.damaged || 0)) : 0;
  }
  function isInStock(p, m) { return stockOf(p, m) > 0; }
  function isLow(p, m) { var s = stockOf(p, m); return s > 0 && s <= V.config.LOW_STOCK; }
  function marketStock(p, m) { return _minv[(m || V.config.DEFAULT_MARKET) + ':' + p.id] || null; }

  /* ---------------- Search / filter ---------------- */
  function haystack(p) {
    if (p._hs == null) {
      p._hs = U.normalizeText([p.nameAr, p.nameEn, p.brandNameAr, p.brandNameEn, p.categoryNameAr, p.categoryNameEn, p.sku, (p.tags || []).join(' ')].join(' '));
    }
    return p._hs;
  }

  function matchesQuery(p, q) {
    if (!q) return true;
    var nq = U.normalizeText(q);
    if (!nq) return true;
    var tokens = nq.split(' ').filter(Boolean);
    var hs = haystack(p);
    for (var i = 0; i < tokens.length; i++) { if (hs.indexOf(tokens[i]) === -1) return false; }
    return true;
  }

  function applyBaseFilter(list, f) {
    return list.filter(function (p) {
      if (p.status !== 'published') return false;
      if (f.cat && p.categorySlug !== f.cat) return false;
      if (f.brand && p.brandSlug !== f.brand) return false;
      if (f.sub && p.subcategorySlug !== f.sub) return false;
      if (f.featured && !p.isFeatured) return false;
      if (f.isNew && !p.isNew) return false;
      if (f.sale && !compareAtOf(p)) return false;
      if (f.q && !matchesQuery(p, f.q)) return false;
      return true;
    });
  }

  function applyPriceRating(list, f, market) {
    return list.filter(function (p) {
      var price = priceOf(p, market);
      if (f.min != null && price < f.min) return false;
      if (f.max != null && price > f.max) return false;
      if (f.rating != null && p.rating < f.rating) return false;
      if (f.availability === 'in' && !isInStock(p)) return false;
      if (f.availability === 'out' && isInStock(p)) return false;
      if (f.availability === 'low' && !isLow(p)) return false;
      return true;
    });
  }

  function sortList(list, sort, market) {
    var arr = list.slice();
    switch (sort) {
      case 'priceLow': arr.sort(function (a, b) { return priceOf(a, market) - priceOf(b, market); }); break;
      case 'priceHigh': arr.sort(function (a, b) { return priceOf(b, market) - priceOf(a, market); }); break;
      case 'rating': arr.sort(function (a, b) { return b.rating - a.rating || b.ratingCount - a.ratingCount; }); break;
      case 'best': arr.sort(function (a, b) { return b.sold - a.sold; }); break;
      case 'discount': arr.sort(function (a, b) { return discountPct(b, market) - discountPct(a, market); }); break;
      case 'newest': arr.sort(function (a, b) { return b.createdAt - a.createdAt; }); break;
      default: arr.sort(function (a, b) { return b.sold - a.sold || b.rating - a.rating; }); break;
    }
    return arr;
  }

  function buildFacets(base, market) {
    var cats = {}, brands = {}, subs = {};
    var min = Infinity, max = 0;
    base.forEach(function (p) {
      cats[p.categorySlug] = (cats[p.categorySlug] || 0) + 1;
      brands[p.brandSlug] = (brands[p.brandSlug] || 0) + 1;
      if (p.subcategorySlug) subs[p.subcategorySlug] = (subs[p.subcategorySlug] || 0) + 1;
      var pr = priceOf(p, market);
      if (pr < min) min = pr; if (pr > max) max = pr;
    });
    var avail = { in: 0, low: 0, out: 0 };
    base.forEach(function (p) { var s = stockOf(p); if (s <= 0) avail.out++; else if (s <= V.config.LOW_STOCK) avail.low++; else avail.in++; });
    return { categories: cats, brands: brands, subcategories: subs, availability: avail, price: { min: min === Infinity ? 0 : min, max: max } };
  }

  function query(f) {
    f = f || {};
    var market = f.market || currentMarket();
    var base = applyBaseFilter(_products, f);
    var facets = buildFacets(base, market);
    var filtered = applyPriceRating(base, f, market);
    var sorted = sortList(filtered, f.sort || 'relevance', market);

    var perPage = f.perPage || 24;
    var page = Math.max(1, f.page || 1);
    var total = sorted.length;
    var pages = Math.max(1, Math.ceil(total / perPage));
    if (page > pages) page = pages;
    var slice = sorted.slice((page - 1) * perPage, page * perPage);

    return { items: slice, total: total, page: page, pages: pages, perPage: perPage, facets: facets, market: market };
  }

  function suggest(q, limit) {
    if (!q) return [];
    var nq = U.normalizeText(q);
    var out = [];
    for (var i = 0; i < _products.length && out.length < (limit || 8); i++) {
      var p = _products[i];
      if (p.status !== 'published') continue;
      if (haystack(p).indexOf(nq) !== -1) out.push(p);
    }
    return out;
  }

  function related(p, limit) {
    if (!p) return [];
    var arr = _products.filter(function (x) {
      return x.id !== p.id && x.status === 'published' && (x.categorySlug === p.categorySlug || x.brandSlug === p.brandSlug);
    });
    arr.sort(function (a, b) {
      var sa = (a.categorySlug === p.categorySlug ? 2 : 0) + (a.brandSlug === p.brandSlug ? 1 : 0);
      var sb = (b.categorySlug === p.categorySlug ? 2 : 0) + (b.brandSlug === p.brandSlug ? 1 : 0);
      return sb - sa || b.sold - a.sold;
    });
    return arr.slice(0, limit || 8);
  }

  var catalog = {
    load: load,
    isLoaded: function () { return _loaded; },
    products: function () { return _products; },
    categories: function () { return _categories; },
    brands: function () { return _brands; },
    inventory: function (productId) { return _inv[productId] || null; },
    refreshInventory: refreshInventory,
    get: function (idOrSlug) { return _byId[idOrSlug] || _bySlug[idOrSlug] || null; },
    getBySlug: function (slug) { return _bySlug[slug] || null; },
    category: function (slug) { for (var i = 0; i < _categories.length; i++) { if (_categories[i].slug === slug) return _categories[i]; } return null; },
    categoryById: function (id) { for (var i = 0; i < _categories.length; i++) { if (_categories[i].id === id) return _categories[i]; } return null; },
    brand: function (slug) { for (var i = 0; i < _brands.length; i++) { if (_brands[i].slug === slug) return _brands[i]; } return null; },
    brandsForCategory: function (catSlug) { return _brands.filter(function (b) { return b.categories && b.categories.indexOf(catSlug) !== -1; }); },

    priceOf: priceOf,
    compareAtOf: compareAtOf,
    discountPct: discountPct,
    stockOf: stockOf,
    marketStock: marketStock,
    isInStock: isInStock,
    isLow: isLow,

    query: query,
    suggest: suggest,
    related: related,

    featured: function (limit) { return sortList(_products.filter(function (p) { return p.status === 'published' && p.isFeatured; }), 'relevance').slice(0, limit || 8); },
    newArrivals: function (limit) { return sortList(_products.filter(function (p) { return p.status === 'published' && p.isNew; }), 'newest').slice(0, limit || 8); },
    bestSellers: function (limit) { return sortList(_products.filter(function (p) { return p.status === 'published'; }), 'best').slice(0, limit || 8); },
    onSale: function (limit) { return sortList(_products.filter(function (p) { return p.status === 'published' && compareAtOf(p); }), 'discount').slice(0, limit || 8); },

    invalidate: function () { _loaded = false; _products = []; }
  };

  V.catalog = catalog;

  // Search history (recent searches) — local, per browser
  V.searchHistory = {
    list: function () { return V.ls.get('recentSearches', []) || []; },
    add: function (q) {
      q = (q || '').trim(); if (!q || q.length > 60) return;
      var a = (V.ls.get('recentSearches', []) || []).filter(function (x) { return String(x).toLowerCase() !== q.toLowerCase(); });
      a.unshift(q); V.ls.set('recentSearches', a.slice(0, 8));
    },
    clear: function () { V.ls.set('recentSearches', []); }
  };
})(window);
