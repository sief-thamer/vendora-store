/* ============================================================
   VENDORA — Data layer: IndexedDB wrapper (db.js)
   Single access point. Pages/services never touch IndexedDB directly.
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;

  /* ---------------- Schema ----------------
     Each store: { key, auto, indexes: [{name, keyPath, unique}] } */
  V.DB_SCHEMA = {
    meta: { key: 'key' },
    counters: { key: 'key' },
    settings: { key: 'key' },
    markets: { key: 'code' },
    categories: { key: 'id', indexes: [{ name: 'slug', keyPath: 'slug', unique: true }, { name: 'sort', keyPath: 'sort' }] },
    brands: { key: 'id', indexes: [{ name: 'slug', keyPath: 'slug', unique: true }] },
    products: {
      key: 'id',
      indexes: [
        { name: 'slug', keyPath: 'slug', unique: true },
        { name: 'categoryId', keyPath: 'categoryId' },
        { name: 'brandId', keyPath: 'brandId' },
        { name: 'status', keyPath: 'status' },
        { name: 'isFeatured', keyPath: 'isFeatured' },
        { name: 'isNew', keyPath: 'isNew' },
        { name: 'createdAt', keyPath: 'createdAt' }
      ]
    },
    inventory: { key: 'productId', indexes: [{ name: 'low', keyPath: 'low' }] },
    customers: { key: 'id', indexes: [{ name: 'email', keyPath: 'email', unique: true }, { name: 'status', keyPath: 'status' }] },
    users: { key: 'id', indexes: [{ name: 'username', keyPath: 'username', unique: true }] },
    addresses: { key: 'id', indexes: [{ name: 'customerId', keyPath: 'customerId' }] },
    carts: { key: 'id' },
    wishlists: { key: 'id' },
    orders: {
      key: 'id',
      indexes: [
        { name: 'number', keyPath: 'number', unique: true },
        { name: 'customerId', keyPath: 'customerId' },
        { name: 'status', keyPath: 'status' },
        { name: 'paymentStatus', keyPath: 'paymentStatus' },
        { name: 'reservationStatus', keyPath: 'reservationStatus' },
        { name: 'returnStatus', keyPath: 'returnStatus' },
        { name: 'createdAt', keyPath: 'createdAt' }
      ]
    },
    orderEvents: { key: 'id', indexes: [{ name: 'orderId', keyPath: 'orderId' }] },
    coupons: { key: 'id', indexes: [{ name: 'code', keyPath: 'code', unique: true }] },
    reviews: {
      key: 'id',
      indexes: [
        { name: 'productId', keyPath: 'productId' },
        { name: 'customerId', keyPath: 'customerId' },
        { name: 'status', keyPath: 'status' }
      ]
    },
    audit: { key: 'id', indexes: [{ name: 'at', keyPath: 'at' }, { name: 'entity', keyPath: 'entity' }] },

    /* ---- Customer & purchase lifecycle (schema v2) ---- */
    verificationTokens: { key: 'id', indexes: [{ name: 'customerId', keyPath: 'customerId' }, { name: 'token', keyPath: 'token' }] },
    resetTokens: { key: 'id', indexes: [{ name: 'customerId', keyPath: 'customerId' }, { name: 'token', keyPath: 'token' }] },
    productVariants: { key: 'id', indexes: [{ name: 'productId', keyPath: 'productId' }, { name: 'sku', keyPath: 'sku' }] },
    warehouses: { key: 'id', indexes: [{ name: 'marketCode', keyPath: 'marketCode' }] },
    marketInventory: {
      key: 'id',
      indexes: [
        { name: 'productId', keyPath: 'productId' },
        { name: 'variantId', keyPath: 'variantId' },
        { name: 'marketCode', keyPath: 'marketCode' },
        { name: 'warehouseId', keyPath: 'warehouseId' }
      ]
    },
    reservations: { key: 'id', indexes: [{ name: 'orderId', keyPath: 'orderId' }, { name: 'productId', keyPath: 'productId' }, { name: 'status', keyPath: 'status' }] },
    stockMovements: { key: 'id', indexes: [{ name: 'productId', keyPath: 'productId' }, { name: 'orderId', keyPath: 'orderId' }, { name: 'at', keyPath: 'at' }] },
    stockAlerts: { key: 'id', indexes: [{ name: 'productId', keyPath: 'productId' }, { name: 'email', keyPath: 'email' }, { name: 'status', keyPath: 'status' }] },
    deliveryRegions: { key: 'id', indexes: [{ name: 'marketCode', keyPath: 'marketCode' }, { name: 'city', keyPath: 'city' }] },
    deliveryRates: { key: 'id', indexes: [{ name: 'regionId', keyPath: 'regionId' }, { name: 'marketCode', keyPath: 'marketCode' }] },
    promotions: { key: 'id', indexes: [{ name: 'activeFlag', keyPath: 'activeFlag' }, { name: 'marketCode', keyPath: 'marketCode' }, { name: 'code', keyPath: 'code' }] },
    payments: { key: 'id', indexes: [{ name: 'orderId', keyPath: 'orderId' }, { name: 'status', keyPath: 'status' }, { name: 'method', keyPath: 'method' }] },
    transferReceipts: { key: 'id', indexes: [{ name: 'orderId', keyPath: 'orderId' }, { name: 'status', keyPath: 'status' }, { name: 'reference', keyPath: 'reference' }] },
    paymentReviews: { key: 'id', indexes: [{ name: 'orderId', keyPath: 'orderId' }, { name: 'paymentId', keyPath: 'paymentId' }, { name: 'status', keyPath: 'status' }] },
    refundRequests: { key: 'id', indexes: [{ name: 'orderId', keyPath: 'orderId' }, { name: 'status', keyPath: 'status' }, { name: 'managerApproval', keyPath: 'managerApproval' }] },
    returnRequests: { key: 'id', indexes: [{ name: 'orderId', keyPath: 'orderId' }, { name: 'customerId', keyPath: 'customerId' }, { name: 'status', keyPath: 'status' }] },
    returnItems: { key: 'id', indexes: [{ name: 'returnId', keyPath: 'returnId' }, { name: 'orderId', keyPath: 'orderId' }] },
    exchanges: { key: 'id', indexes: [{ name: 'orderId', keyPath: 'orderId' }, { name: 'status', keyPath: 'status' }] },
    shipments: { key: 'id', indexes: [{ name: 'orderId', keyPath: 'orderId' }, { name: 'status', keyPath: 'status' }] },
    deliveryAttempts: { key: 'id', indexes: [{ name: 'orderId', keyPath: 'orderId' }] },
    notifications: { key: 'id', indexes: [{ name: 'customerId', keyPath: 'customerId' }, { name: 'audience', keyPath: 'audience' }, { name: 'at', keyPath: 'at' }] }
  };

  var _db = null;
  var _opening = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    if (_opening) return _opening;
    _opening = new Promise(function (resolve, reject) {
      var req;
      try { req = indexedDB.open(V.config.DB_NAME, V.config.DB_VERSION); }
      catch (e) { reject(e); return; }

      req.onupgradeneeded = function (ev) {
        var db = req.result;
        var oldVersion = ev.oldVersion || 0;
        Object.keys(V.DB_SCHEMA).forEach(function (name) {
          var def = V.DB_SCHEMA[name];
          var store;
          if (!db.objectStoreNames.contains(name)) {
            store = db.createObjectStore(name, { keyPath: def.key, autoIncrement: !!def.auto });
          } else {
            store = req.transaction.objectStore(name);
          }
          (def.indexes || []).forEach(function (ix) {
            if (!store.indexNames.contains(ix.name)) {
              store.createIndex(ix.name, ix.keyPath, { unique: !!ix.unique });
            }
          });
        });
        // future migrations: if (oldVersion < 2) { ... }
      };

      req.onsuccess = function () { _db = req.result; _opening = null; resolve(_db); };
      req.onerror = function () { _opening = null; reject(req.error); };
      req.onblocked = function () { /* another tab holds an older version */ };
    });
    return _opening;
  }

  function tx(stores, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(stores, mode || 'readonly');
        var result;
        var storesArg = {};
        (Array.isArray(stores) ? stores : [stores]).forEach(function (n) { storesArg[n] = t.objectStore(n); });
        t.oncomplete = function () { resolve(result); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error('aborted')); };
        try {
          var r = fn(storesArg, t);
          if (r && typeof r.then === 'function') {
            r.then(function (v) { result = v; }, function (e) { try { t.abort(); } catch (x) {} reject(e); });
          } else { result = r; }
        } catch (e) { try { t.abort(); } catch (x) {} reject(e); }
      });
    });
  }

  function reqPromise(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  var db = {
    open: open,
    tx: tx,

    ready: function () { return open(); },

    get: function (store, key) { return open().then(function (d) { return reqPromise(d.transaction(store).objectStore(store).get(key)); }); },
    getAll: function (store) { return open().then(function (d) { return reqPromise(d.transaction(store).objectStore(store).getAll()); }); },
    count: function (store) { return open().then(function (d) { return reqPromise(d.transaction(store).objectStore(store).count()); }); },
    getAllByIndex: function (store, index, value) {
      return open().then(function (d) { return reqPromise(d.transaction(store).objectStore(store).index(index).getAll(value)); });
    },
    getOneByIndex: function (store, index, value) {
      return open().then(function (d) { return reqPromise(d.transaction(store).objectStore(store).index(index).get(value)); });
    },
    put: function (store, val) { return tx(store, 'readwrite', function (s) { return reqPromise(s[store].put(val)); }); },
    add: function (store, val) { return tx(store, 'readwrite', function (s) { return reqPromise(s[store].add(val)); }); },
    del: function (store, key) { return tx(store, 'readwrite', function (s) { return reqPromise(s[store].delete(key)); }); },
    clear: function (store) { return tx(store, 'readwrite', function (s) { return reqPromise(s[store].clear()); }); },

    bulkPut: function (store, arr) {
      return tx(store, 'readwrite', function (s) {
        arr.forEach(function (v) { s[store].put(v); });
      });
    },
    bulkAdd: function (store, arr) {
      return tx(store, 'readwrite', function (s) {
        arr.forEach(function (v) { s[store].add(v); });
      });
    },

    /* ---- meta helpers ---- */
    metaGet: function (key, def) {
      return db.get('meta', key).then(function (r) { return r == null ? def : r.value; });
    },
    metaSet: function (key, value) { return db.put('meta', { key: key, value: value }); },

    /* ---- counter (atomic-ish inside a rw tx) ---- */
    nextSeq: function (name, startAt) {
      return tx('counters', 'readwrite', function (s) {
        return reqPromise(s.counters.get(name)).then(function (rec) {
          var next = (rec ? rec.value : (startAt || 1));
          var val = next;
          s.counters.put({ key: name, value: next + 1 });
          return val;
        });
      });
    },

    /* ---- danger: wipe all data stores ---- */
    clearAll: function (keepStores) {
      var keep = keepStores || ['meta', 'counters', 'settings', 'markets', 'categories', 'brands'];
      var names = Object.keys(V.DB_SCHEMA).filter(function (n) { return keep.indexOf(n) === -1; });
      return tx(names, 'readwrite', function (s) { names.forEach(function (n) { s[n].clear(); }); });
    },

    /* ---- destructive full reset (drops DB, then reopens) ---- */
    reset: function () {
      return open().then(function (d) {
        d.close(); _db = null; _opening = null;
        return new Promise(function (resolve, reject) {
          var req = indexedDB.deleteDatabase(V.config.DB_NAME);
          req.onsuccess = function () { resolve(open()); };
          req.onerror = function () { reject(req.error); };
          req.onblocked = function () { resolve(open()); };
        });
      });
    },

    info: function () {
      return open().then(function (d) { return { name: d.name, version: d.version, stores: Array.prototype.slice.call(d.objectStoreNames) }; });
    },

    /* ---- backup / restore (JSON snapshot of every store) ---- */
    exportAll: function () {
      var names = Object.keys(V.DB_SCHEMA);
      var out = { app: 'VENDORA', version: V.config.VERSION, dbVersion: V.config.DB_VERSION, exportedAt: new Date().toISOString(), stores: {} };
      return names.reduce(function (chain, n) {
        return chain.then(function () { return db.getAll(n).then(function (rows) { out.stores[n] = rows || []; }); });
      }, Promise.resolve()).then(function () { return out; });
    },
    importAll: function (snapshot) {
      if (!snapshot || !snapshot.stores) return Promise.reject(new Error('invalid_backup'));
      var names = Object.keys(V.DB_SCHEMA);
      return names.reduce(function (chain, n) {
        return chain.then(function () {
          if (!snapshot.stores[n]) return;
          return db.clear(n).then(function () { return db.bulkPut(n, snapshot.stores[n]); });
        });
      }, Promise.resolve());
    }
  };

  V.db = db;
})(window);
