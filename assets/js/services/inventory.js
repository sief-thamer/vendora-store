/* ============================================================
   VENDORA — Services: inventory (per-market/warehouse stock,
   reservations, movements, damaged goods, notify-when-available)
   Available = onHand − reserved − damaged.  Independent per market.
   IndexedDB only. No network.
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var U = V.utils;

  function req(store, key) {
    return new Promise(function (resolve, reject) { var r = store.get(key); r.onsuccess = function () { resolve(r.result); }; r.onerror = function () { reject(r.error); }; });
  }
  function nowIso() { return Date.now(); }
  function market() { return V.state.get('market') || V.config.DEFAULT_MARKET; }

  function mainWarehouseId(code) { return 'wh_' + (code || market()) + '_main'; }
  function miId(productId, code, variantId) {
    code = code || market();
    var base = variantId ? (productId + '|' + variantId) : productId;
    return base + ':' + code + ':' + mainWarehouseId(code);
  }

  /* ---------------- Warehouses ---------------- */
  function warehouses(f) {
    return V.db.getAll('warehouses').then(function (arr) {
      arr.sort(function (a, b) { return (a.marketCode || '').localeCompare(b.marketCode || ''); });
      if (f && f.market) arr = arr.filter(function (w) { return w.marketCode === f.market; });
      return arr;
    });
  }
  function warehouseForMarket(code) {
    code = code || market();
    return V.db.getAllByIndex('warehouses', 'marketCode', code).then(function (arr) { return arr[0] || null; });
  }
  function saveWarehouse(data) {
    data = Object.assign({}, data);
    if (!data.id) data.id = 'wh_' + U.uid('');
    data.updatedAt = Date.now();
    return V.db.put('warehouses', data);
  }

  /* ---------------- Market inventory reads ---------------- */
  function getMarketRow(productId, code, variantId) {
    return V.db.get('marketInventory', miId(productId, code, variantId));
  }
  function listMarketInventory(f) {
    f = f || {};
    var p = f.market ? V.db.getAllByIndex('marketInventory', 'marketCode', f.market)
      : f.productId ? V.db.getAllByIndex('marketInventory', 'productId', f.productId)
        : V.db.getAll('marketInventory');
    return p.then(function (arr) {
      if (f.productId && f.market) arr = arr.filter(function (r) { return r.productId === f.productId; });
      return arr;
    });
  }
  function available(row) {
    if (!row) return 0;
    return Math.max(0, (row.onHand || 0) - (row.reserved || 0) - (row.damaged || 0));
  }
  // availability for a product in the current (or given) market — falls back to global inventory
  function availability(productId, code, variantId) {
    code = code || market();
    return getMarketRow(productId, code, variantId).then(function (row) {
      if (row) return { onHand: row.onHand || 0, reserved: row.reserved || 0, damaged: row.damaged || 0, available: available(row), low: available(row) > 0 && available(row) <= V.config.LOW_STOCK, out: available(row) <= 0, market: code };
      return V.db.get('inventory', productId).then(function (inv) {
        var a = inv ? Math.max(0, (inv.onHand || 0) - (inv.reserved || 0)) : 0;
        return { onHand: inv ? inv.onHand : 0, reserved: inv ? (inv.reserved || 0) : 0, damaged: 0, available: a, low: a > 0 && a <= V.config.LOW_STOCK, out: a <= 0, market: code, fallback: true };
      });
    });
  }

  /* ---------------- Movement log ---------------- */
  function movement(s, data) {
    s.stockMovements.put(Object.assign({ id: 'mov_' + U.uid(''), at: nowIso() }, data));
  }

  /* ---------------- Internal: mutate a market row (+ mirror to global for default market) ---------------- */
  function mutate(s, productId, code, variantId, fn) {
    var id = miId(productId, code, variantId);
    return req(s.marketInventory, id).then(function (row) {
      function finish() {
        row.onHand = Math.max(0, row.onHand || 0);
        row.reserved = Math.max(0, row.reserved || 0);
        row.damaged = Math.max(0, row.damaged || 0);
        row.low = available(row) > 0 && available(row) <= V.config.LOW_STOCK;
        row.out = available(row) <= 0;
        row.updatedAt = Date.now();
        s.marketInventory.put(row);
        // mirror the default market onto the legacy global inventory store
        if (code === V.config.DEFAULT_MARKET) {
          s.inventory.put({ productId: productId, onHand: row.onHand, reserved: row.reserved, damaged: row.damaged, low: row.low, out: row.out, updatedAt: row.updatedAt });
        }
        return row;
      }
      if (!row) {
        row = { id: id, productId: productId, variantId: variantId || null, marketCode: code, warehouseId: mainWarehouseId(code), onHand: 0, reserved: 0, damaged: 0, created: true };
        // defensive: seed a missing default-market row from the global inventory
        if (code === V.config.DEFAULT_MARKET && !variantId) {
          return req(s.inventory, productId).then(function (inv) {
            if (inv) { row.onHand = inv.onHand || 0; row.reserved = inv.reserved || 0; row.damaged = inv.damaged || 0; }
            fn(row); return finish();
          });
        }
      }
      fn(row);
      return finish();
    });
  }

  /* ---------------- Reservations ---------------- */
  // Hold stock at checkout. Does NOT deduct onHand; increments reserved.
  function reserve(opts) {
    opts = opts || {};
    var code = opts.market || market();
    var items = opts.items || [];
    var orderId = opts.orderId;
    var ttl = opts.ttlMinutes;
    if (ttl == null) ttl = 60;
    return V.db.tx(['marketInventory', 'inventory', 'reservations', 'stockMovements'], 'readwrite', function (s) {
      return items.reduce(function (chain, it) {
        return chain.then(function () {
          return mutate(s, it.productId, code, it.variantId, function (row) {
            row.reserved = (row.reserved || 0) + it.qty;
          }).then(function (row) {
            s.reservations.put({
              id: 'rsv_' + U.uid(''), orderId: orderId, productId: it.productId, variantId: it.variantId || null,
              marketCode: code, warehouseId: mainWarehouseId(code), qty: it.qty, status: 'temporary',
              createdAt: Date.now(), expiresAt: Date.now() + ttl * 60000
            });
            movement(s, { productId: it.productId, marketCode: code, type: 'reserve', qty: it.qty, orderId: orderId, by: 'system' });
          });
        });
      }, Promise.resolve());
    }).then(function () { return refresh(); });
  }

  // Release temporary reservations (cancel / expiry / failure). Decrements reserved exactly once.
  function release(orderId, reason) {
    return V.db.tx(['marketInventory', 'inventory', 'reservations', 'stockMovements'], 'readwrite', function (s) {
      return allByIndex(s.reservations, 'orderId', orderId).then(function (list) {
        return list.filter(function (r) { return r.status === 'temporary'; }).reduce(function (chain, r) {
          return chain.then(function () {
            return mutate(s, r.productId, r.marketCode, r.variantId, function (row) {
              row.reserved = (row.reserved || 0) - r.qty;
            }).then(function () {
              r.status = 'released'; r.releasedAt = Date.now(); r.reason = reason || '';
              s.reservations.put(r);
              movement(s, { productId: r.productId, marketCode: r.marketCode, type: 'release', qty: r.qty, orderId: orderId, reason: reason || '', by: 'system' });
            });
          });
        }, Promise.resolve());
      });
    }).then(function () { return refresh(); });
  }

  // Commit temporary reservations to a real sale: reserved→0 and onHand−qty. Deducts once.
  function commit(orderId) {
    return V.db.tx(['marketInventory', 'inventory', 'reservations', 'stockMovements'], 'readwrite', function (s) {
      return allByIndex(s.reservations, 'orderId', orderId).then(function (list) {
        return list.filter(function (r) { return r.status === 'temporary'; }).reduce(function (chain, r) {
          return chain.then(function () {
            return mutate(s, r.productId, r.marketCode, r.variantId, function (row) {
              row.reserved = (row.reserved || 0) - r.qty;
              row.onHand = (row.onHand || 0) - r.qty;
            }).then(function () {
              r.status = 'confirmed'; r.confirmedAt = Date.now();
              s.reservations.put(r);
              movement(s, { productId: r.productId, marketCode: r.marketCode, type: 'sale', qty: -r.qty, orderId: orderId, by: 'system' });
            });
          });
        }, Promise.resolve());
      });
    }).then(function () { return refresh(); });
  }

  function releaseReservation(id) {
    return V.db.tx(['marketInventory', 'inventory', 'reservations', 'stockMovements'], 'readwrite', function (s) {
      return req(s.reservations, id).then(function (r) {
        if (!r || r.status !== 'temporary') return;
        return mutate(s, r.productId, r.marketCode, r.variantId, function (row) { row.reserved = (row.reserved || 0) - r.qty; }).then(function () {
          r.status = 'released'; r.releasedAt = Date.now(); s.reservations.put(r);
          movement(s, { productId: r.productId, marketCode: r.marketCode, type: 'release', qty: r.qty, by: 'system' });
        });
      });
    }).then(function () { return refresh(); });
  }

  /* ---------------- Restore (returns / cancellation of deducted stock) ---------------- */
  // disposition: 'good' → back to onHand, 'damaged' → moved to damaged (unsellable)
  function restoreItems(marketCode, items, disposition, orderId) {
    return V.db.tx(['marketInventory', 'inventory', 'stockMovements'], 'readwrite', function (s) {
      return items.reduce(function (chain, it) {
        return chain.then(function () {
          return mutate(s, it.productId, marketCode, it.variantId, function (row) {
            if (disposition === 'damaged') row.damaged = (row.damaged || 0) + it.qty;
            else row.onHand = (row.onHand || 0) + it.qty;
          }).then(function () {
            movement(s, { productId: it.productId, marketCode: marketCode, type: disposition === 'damaged' ? 'damage' : 'return', qty: it.qty, orderId: orderId || null, by: 'system' });
          });
        });
      }, Promise.resolve());
    }).then(function () { return refresh(); });
  }

  /* ---------------- Admin adjust / damage ---------------- */
  function adjust(productId, delta, opts) {
    opts = opts || {};
    var code = opts.market || market();
    return V.db.tx(['marketInventory', 'inventory', 'stockMovements'], 'readwrite', function (s) {
      return mutate(s, productId, code, opts.variantId, function (row) { row.onHand = (row.onHand || 0) + delta; }).then(function (row) {
        movement(s, { productId: productId, marketCode: code, type: 'adjust', qty: delta, reason: opts.reason || '', by: opts.by || 'staff' });
        return row;
      });
    }).then(function (row) {
      return refresh().then(function () {
        if (delta > 0 && V.settings && V.settings.get) {
          return V.settings.get().then(function (st) {
            if (st && st.notifyBackInStock === false) return row;
            return fireAlerts(productId, code).then(function () { return row; }, function () { return row; });
          });
        }
        return row;
      });
    });
  }
  function setOnHand(productId, value, opts) {
    opts = opts || {};
    var code = opts.market || market();
    return getMarketRow(productId, code, opts.variantId).then(function (row) {
      var cur = row ? row.onHand || 0 : 0;
      return adjust(productId, value - cur, opts);
    });
  }
  function setDamaged(productId, value, opts) {
    opts = opts || {};
    var code = opts.market || market();
    return V.db.tx(['marketInventory', 'inventory', 'stockMovements'], 'readwrite', function (s) {
      return mutate(s, productId, code, opts.variantId, function (row) { row.damaged = value; }).then(function () {
        movement(s, { productId: productId, marketCode: code, type: 'damage-set', qty: value, reason: opts.reason || '', by: opts.by || 'staff' });
      });
    }).then(function () { return refresh(); });
  }

  /* ---------------- Movements / reservations reads ---------------- */
  function movements(f) {
    f = f || {};
    var p = f.productId ? V.db.getAllByIndex('stockMovements', 'productId', f.productId)
      : f.orderId ? V.db.getAllByIndex('stockMovements', 'orderId', f.orderId)
        : V.db.getAll('stockMovements');
    return p.then(function (arr) { arr.sort(function (a, b) { return b.at - a.at; }); return f.limit ? arr.slice(0, f.limit) : arr; });
  }
  function reservationsFor(orderId) { return V.db.getAllByIndex('reservations', 'orderId', orderId); }
  function lowStock(f) {
    f = f || {};
    var code = f.market || market();
    return listMarketInventory({ market: code }).then(function (arr) {
      return arr.filter(function (r) { return available(r) > 0 && available(r) <= V.config.LOW_STOCK; });
    });
  }
  function outOfStock(f) {
    f = f || {};
    var code = f.market || market();
    return listMarketInventory({ market: code }).then(function (arr) { return arr.filter(function (r) { return available(r) <= 0; }); });
  }

  /* ---------------- Notify when available (stock alerts) ---------------- */
  function addAlert(opts) {
    opts = opts || {};
    var email = String(opts.email || '').trim().toLowerCase();
    var productId = opts.productId;
    var variance = (opts.variantId || '') + '@' + (opts.market || market());
    return V.db.getAllByIndex('stockAlerts', 'productId', productId).then(function (arr) {
      var exists = arr.some(function (a) { return a.email === email && (a.variantId || '') === (opts.variantId || '') && a.marketCode === (opts.market || market()); });
      if (exists) return { ok: true, duplicate: true };
      var rec = { id: 'alt_' + U.uid(''), productId: productId, variantId: opts.variantId || null, marketCode: opts.market || market(), email: email, customerId: opts.customerId || null, status: 'waiting', createdAt: Date.now(), _k: variance };
      return V.db.put('stockAlerts', rec).then(function () { return { ok: true, alert: rec }; });
    });
  }
  function listAlerts(f) {
    f = f || {};
    var p = f.productId ? V.db.getAllByIndex('stockAlerts', 'productId', f.productId) : V.db.getAll('stockAlerts');
    return p.then(function (arr) { arr.sort(function (a, b) { return b.createdAt - a.createdAt; }); return arr; });
  }
  // Called by the inventory service after stock increases: turns waiting alerts into notifications.
  function fireAlerts(productId, marketCode) {
    return V.db.getAllByIndex('stockAlerts', 'productId', productId).then(function (arr) {
      var waiting = arr.filter(function (a) { return a.status === 'waiting' && a.marketCode === marketCode; });
      if (!waiting.length) return 0;
      return V.db.tx(['stockAlerts', 'notifications'], 'readwrite', function (s) {
        waiting.forEach(function (a) {
          a.status = 'notified'; a.notifiedAt = Date.now(); s.stockAlerts.put(a);
          var p = V.catalog.get(productId);
          s.notifications.put({
            id: 'ntf_' + U.uid(''), customerId: a.customerId || null, email: a.email, audience: a.customerId ? 'customer' : 'guest',
            type: 'restock', titleAr: 'توفر المنتج من جديد', titleEn: 'Back in stock',
            bodyAr: ((p && p.nameAr) || productId) + ' متوفر الآن.', bodyEn: ((p && p.nameEn) || productId) + ' is available now.',
            productId: productId, read: false, at: Date.now()
          });
        });
      }).then(function () { return waiting.length; });
    });
  }

  function refresh() {
    if (V.catalog && V.catalog.refreshInventory) return V.catalog.refreshInventory();
    return Promise.resolve();
  }

  function allByIndex(store, index, value) {
    return new Promise(function (resolve, reject) { var r = store.index(index).getAll(value); r.onsuccess = function () { resolve(r.result); }; r.onerror = function () { reject(r.error); }; });
  }

  var API = {
    warehouses: warehouses, warehouseForMarket: warehouseForMarket, saveWarehouse: saveWarehouse,
    getMarketRow: getMarketRow, listMarketInventory: listMarketInventory, availability: availability, available: available,
    reserve: reserve, release: release, releaseReservation: releaseReservation, commit: commit, restoreItems: restoreItems,
    adjust: adjust, setOnHand: setOnHand, setDamaged: setDamaged,
    movements: movements, reservationsFor: reservationsFor, lowStock: lowStock, outOfStock: outOfStock,
    addAlert: addAlert, listAlerts: listAlerts, fireAlerts: fireAlerts, mainWarehouseId: mainWarehouseId, miId: miId
  };

  // merge with the legacy V.inventory (adjust/set/list) defined by orders.js
  var legacy = V.inventory || {};
  V.inventory = Object.assign({}, legacy, API);
  V.stock = API;
})(window);
