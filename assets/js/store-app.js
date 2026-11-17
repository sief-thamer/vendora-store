/* ============================================================
   VENDORA — Store app bootstrap (routes + mount)
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var ui = V.ui;
  function t(k) { return V.t(k); }

  var ROUTES = [
    ['/', 'home'],
    ['/products', 'products'],
    ['/categories', 'categories'],
    ['/category/:slug', 'category'],
    ['/brand/:slug', 'brand'],
    ['/brands', 'brandsPage'],
    ['/search', 'search'],
    ['/offers', 'offers'],
    ['/new', 'newArrivals'],
    ['/best', 'bestSellers'],
    ['/product/:slug', 'product'],
    ['/cart', 'cart'],
    ['/checkout', 'checkout'],
    ['/order-success/:number', 'orderSuccess'],
    ['/track', 'track'],
    ['/wishlist', 'wishlist'],
    ['/compare', 'compare'],
    ['/login', 'login'],
    ['/register', 'register'],
    ['/verify', 'verify'],
    ['/forgot', 'forgot'],
    ['/reset', 'reset'],
    ['/account', 'account'],
    ['/account/orders', 'accountOrders'],
    ['/account/orders/:number', 'orderDetail'],
    ['/account/notifications', 'accountNotifications'],
    ['/account/addresses', 'accountAddresses'],
    ['/account/profile', 'accountProfile'],
    ['/guide', 'guide'],
    ['/trust', 'trust'],
    ['/about', 'about'],
    ['/contact', 'contact'],
    ['/faq', 'faq'],
    ['/page/:slug', 'policy'],
    ['/404', 'notFound']
  ];

  function loader(pageKey) {
    return function (ctx) {
      var view = V.el('#view');
      V.clear(view).appendChild(ui.spinner());
      return Promise.resolve().then(function () {
        var fn = V.pages[pageKey];
        if (typeof fn !== 'function') return V.pages.notFound(ctx);
        return fn(ctx);
      }).then(function (node) {
        if (node == null) node = V.pages.notFound(ctx);
        V.mount(view, node);
      }).catch(function (e) {
        console.error('[page error]', pageKey, e);
        V.mount(V.el('#view'), h('div.container', { style: { paddingBlock: 'var(--s6)' } }, ui.alert(t('error') + ': ' + (e && e.message), 'danger')));
      });
    };
  }
  function h(sel, props, kids) { return V.h.apply(null, arguments); }

  function boot() {
    V.applyLang(V.state.get('lang'));
    V.applyTheme(V.state.get('theme'));

    if (!global.indexedDB) {
      V.mount(V.el('#view'), V.h('div.container', { style: { paddingBlock: 'var(--s6)' } }, ui.alert(V.t('noIndexedDB'), 'danger')));
      return;
    }

    var routes = ROUTES.map(function (r) { return [r[0], loader(r[1])]; });

    V.account.restore()
      .then(function () { return V.seed.ensure(); })
      .then(function () { return V.catalog.load(); })
      .then(function () { return Promise.all([V.cart.load(), V.wishlist.load(), V.commerce.loadDelivery()]); })
      .then(function () {
        V.commerce.syncBadge();
        V.layout.mount();
        V.router.start(routes);
        // re-render current view when language or market changes
        V.bus.on('state:lang', function () { setTimeout(function () { V.router._resolve(); }, 0); });
        V.bus.on('market:changed', function () { setTimeout(function () { V.layout.renderHeader(); V.router._resolve(); }, 0); });
      })
      .catch(function (e) {
        console.error('[boot error]', e);
        V.mount(V.el('#view'), V.h('div.container', { style: { paddingBlock: 'var(--s6)' } }, ui.alert(t('error') + ': ' + (e && e.message), 'danger')));
      });
  }

  V.ready(boot);
})(window);
