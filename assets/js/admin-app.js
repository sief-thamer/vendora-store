/* ============================================================
   VENDORA — Admin app bootstrap (auth gate + routes + mount)
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var ui = V.ui;
  var A = V.ashell;
  function t(k) { return V.t(k); }

  var ROUTES = [
    ['/', 'dashboard', 'dashboard'],
    ['/products', 'products', 'products'],
    ['/products/:id', 'productEdit', 'products'],
    ['/categories', 'categories', 'categories'],
    ['/brands', 'brands', 'brands'],
    ['/inventory', 'inventory', 'inventory'],
    ['/orders', 'orders', 'orders'],
    ['/orders/:id', 'orderDetail', 'orders'],
    ['/returns', 'returns', 'returns'],
    ['/customers', 'customers', 'customers'],
    ['/coupons', 'coupons', 'coupons'],
    ['/content', 'content', 'content'],
    ['/reviews', 'reviews', 'reviews'],
    ['/staff', 'staff', 'staff'],
    ['/settings', 'settings', 'settings'],
    ['/audit', 'audit', 'audit']
  ];

  var PERM = {
    dashboard: 'dashboard',
    products: 'products.view', productEdit: 'products.edit',
    categories: 'categories.edit', brands: 'brands.edit',
    inventory: 'inventory.view',
    orders: 'orders.view', orderDetail: 'orders.view',
    returns: 'returns.edit', customers: 'customers.view',
    coupons: 'coupons.edit', content: 'content.edit',
    reviews: 'reviews.moderate',
    staff: 'staff.edit', settings: 'settings.edit', audit: 'audit.view'
  };

  function forbidden() {
    return V.h('div.container', { style: { paddingBlock: 'var(--s6)' } },
      V.h('div.empty', ui.icon('lock', 'icon-lg'), V.h('h2', t('forbidden')), V.h('p.muted', t('forbiddenText')),
        V.h('div.mt-4', V.h('a.btn.btn-primary', { href: '#/' }, t('dashboard')))));
  }

  function loader(key, perm, titleKey) {
    return function (ctx) {
      var view = V.el('#admin-view');
      var user = V.state.get('user');
      if (!user || user.type !== 'staff') { mountApp(); return; }
      if (!view) return;
      A.setActive(ctx.path);
      A.setTitle(t(titleKey || key));
      if (perm && !V.perms.can(user.role, perm)) { V.mount(view, forbidden()); return; }
      V.clear(view).appendChild(ui.spinner());
      Promise.resolve().then(function () {
        var fn = V.apages[key];
        if (typeof fn !== 'function') throw new Error('missing_page:' + key);
        return fn(ctx);
      }).then(function (node) {
        V.mount(view, node || V.h('div', t('noData')));
      }).catch(function (e) {
        console.error('[admin page error]', key, e);
        V.mount(view, ui.alert(t('error') + ': ' + (e && e.message), 'danger'));
      });
    };
  }

  var _routesReady = false;
  function registerRoutes() {
    if (_routesReady) return;
    ROUTES.forEach(function (r) { V.router.add(r[0], loader(r[1], PERM[r[1]], r[2])); });
    window.addEventListener('hashchange', V.router._resolve);
    _routesReady = true;
  }

  // Known admin route patterns (used to reject unknown hashes such as #/login)
  var ROUTE_RES = ROUTES.map(function (r) {
    return new RegExp('^' + r[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:[\w]+/g, '[^/]+') + '$');
  });
  function isAdminPath(path) {
    for (var i = 0; i < ROUTE_RES.length; i++) { if (ROUTE_RES[i].test(path)) return true; }
    return false;
  }
  function currentPath() {
    var hash = location.hash.slice(1).split('?')[0].replace(/\/+$/, '');
    return hash || '/';
  }

  function mountApp() {
    var user = V.state.get('user');
    if (!user || user.type !== 'staff') { A.mountLogin(); return; }
    registerRoutes();
    A.mountShell();
    // Any unknown admin hash (e.g. #/login, #/404, stale links) falls back to the dashboard
    if (!isAdminPath(currentPath())) { location.hash = '/'; return; }
    V.router._resolve();
  }

  function boot() {
    V.applyLang(V.state.get('lang'));
    V.applyTheme(V.state.get('theme'));

    if (!global.indexedDB) {
      V.mount(V.el('#admin-root'), ui.alert(V.t('noIndexedDB'), 'danger'));
      return;
    }

    V.account.restore()
      .then(function () { return V.seed.ensure(); })
      .then(function () { return V.catalog.load(); })
      .then(function () {
        V.bus.on('auth:changed', function () { setTimeout(mountApp, 0); });
        V.bus.on('state:lang', function () { setTimeout(mountApp, 0); });
        mountApp();
      })
      .catch(function (e) {
        console.error('[admin boot error]', e);
        V.mount(V.el('#admin-root'), ui.alert(t('error') + ': ' + (e && e.message), 'danger'));
      });
  }

  V.adminApp = { refresh: mountApp };
  V.ready(boot);
})(window);
