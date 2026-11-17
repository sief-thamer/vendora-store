/* ============================================================
   VENDORA — Pages: wishlist & compare
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var h = V.h;
  var ui = V.ui;
  function t(k, v) { return V.t(k, v); }
  function isAr() { return V.state.get('lang') === 'ar'; }

  /* ---------------- Wishlist ---------------- */
  function renderWishlist() {
    var products = V.wishlist.products();
    var root = h('div.container', { style: { paddingBlock: 'var(--s6)' } });
    root.appendChild(ui.breadcrumb([{ label: t('navHome'), href: '/' }, { label: t('wishlist') }]));
    root.appendChild(h('div.lux-head.row-between', h('h1.lux-head__title', t('wishlist') + ' (' + products.length + ')'),
      products.length ? clearBtn() : null));
    function clearBtn() { var b = h('button.btn.btn-ghost.btn-sm', { type: 'button' }, ui.icon('trash', 'icon-sm'), t('clearAll')); b.addEventListener('click', function () { ui.confirm({ text: isAr() ? 'إزالة كل المنتجات من المفضلة؟' : 'Remove all items from wishlist?' }).then(function (ok) { if (ok) { products.forEach(function (p) { V.wishlist.toggle(p.id); }); ui.toast(t('saved'), 'success'); V.router.navigate('/wishlist'); } }); }); return b; }
    root.appendChild(products.length ? productGrid(products) : h('div.mt-4', ui.empty({ icon: 'heart', title: t('wishlistEmpty'), text: isAr() ? 'احفظ المنتجات التي تعجبك للرجوع إليها لاحقًا.' : 'Save products you like to find them later.', action: h('a.btn.btn-gold', { href: ui.href('/products') }, t('continueShopping')) })));
    return root;
  }
  function productGrid(list) { var g = h('div.product-grid.mt-4'); list.forEach(function (p) { g.appendChild(ui.pcard(p)); }); return g; }

  /* ---------------- Compare ---------------- */
  function renderCompare() {
    var list = V.compare.products();
    var root = h('div.container', { style: { paddingBlock: 'var(--s6)' } });
    root.appendChild(ui.breadcrumb([{ label: t('navHome'), href: '/' }, { label: t('compare') }]));
    root.appendChild(h('div.lux-head.row-between', h('h1.lux-head__title', t('compareTitle')), list.length ? clearBtn() : null));
    function clearBtn() { var b = h('button.btn.btn-ghost.btn-sm', { type: 'button' }, ui.icon('trash', 'icon-sm'), t('clearCompare')); b.addEventListener('click', function () { V.compare.clear(); V.router.navigate('/compare'); }); return b; }

    if (!list.length) { root.appendChild(h('div.mt-4', ui.empty({ icon: 'scales', title: t('compareEmpty'), text: isAr() ? 'أضف منتجات للمقارنة من صفحات المنتجات.' : 'Add products to compare from product pages.', action: h('a.btn.btn-gold', { href: ui.href('/products') }, t('continueShopping')) }))); return root; }

    // build spec union by keyAr
    var specKeys = [];
    var seen = {};
    list.forEach(function (p) { p.specs.forEach(function (s) { var k = s.keyAr; if (!seen[k]) { seen[k] = 1; specKeys.push(k); } }); });

    function headerCell(p) {
      var rm = h('button.btn.btn-ghost.btn-sm.btn-icon', { type: 'button' }, ui.icon('close', 'icon-sm'));
      rm.addEventListener('click', function () { V.compare.toggle(p.id); V.router.navigate('/compare'); });
      return h('th', h('div.stack', { style: { alignItems: 'center', gap: '6px' } },
        rm, h('img', { src: p.primaryImage, alt: '', style: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px' } }),
        h('a', { href: ui.href('/product/' + p.slug), style: { fontWeight: 700 } }, V.loc(p, 'name'))
      ));
    }
    function specVal(p, key) { var s = p.specs.find(function (x) { return x.keyAr === key; }); return s ? (isAr() ? s.valueAr : s.valueEn) : '—'; }

    var table = h('table.data-table.compare-table');
    table.appendChild(h('thead', h('tr', h('th', ''), list.map(headerCell))));
    var body = h('tbody');
    function row(label, fn) { body.appendChild(h('tr', h('th', label), list.map(function (p) { return h('td', fn(p)); }))); }
    row(t('price'), function (p) { return ui.price(p); });
    row(t('rating'), function (p) { return ui.stars(p.rating, p.ratingCount); });
    row(t('brand'), function (p) { return h('a', { href: ui.href('/brand/' + p.brandSlug) }, V.loc(p, 'brandName')); });
    row(t('navCategories'), function (p) { return V.loc(p, 'categoryName'); });
    row(t('availability'), function (p) { return V.catalog.isInStock(p) ? h('span.badge.badge-green', t('inStock')) : h('span.badge.badge-navy', t('outOfStock')); });
    row(t('warranty'), function (p) { return isAr() ? p.warrantyAr : p.warrantyEn; });
    specKeys.forEach(function (k) { var s = list.find(function (p) { return p.specs.some(function (x) { return x.keyAr === k; }); }); var sp = s.specs.find(function (x) { return x.keyAr === k; }); row(isAr() ? sp.keyAr : sp.keyEn, function (p) { return specVal(p, k); }); });
    row('', function (p) { return h('button.btn.btn-gold.btn-sm', { type: 'button' }, ui.icon('cart', 'icon-sm'), t('addToCart')); });
    table.appendChild(body);

    // wire add buttons
    setTimeout(function () { V.els('.compare-table tbody tr:last-child button').forEach(function (b, i) { b.addEventListener('click', function () { V.cart.add(list[i].id, 1).then(function () { ui.toast(t('addedToCart'), 'success'); }); }); }); }, 0);

    root.appendChild(h('div.table-wrap.mt-4', table));
    return root;
  }

  /* ---------------- All categories ---------------- */
  function renderCategories() {
    var cats = V.catalog.categories() || [];
    if (V.seo) V.seo.set({ title: t('navCategories'), description: (isAr() ? 'تصفح جميع أقسام VENDORA.' : 'Browse all VENDORA departments.') });
    var root = h('div.container', { style: { paddingBlock: 'var(--s6)' } });
    root.appendChild(ui.breadcrumb([{ label: t('navHome'), href: '/' }, { label: t('navCategories') }]));
    root.appendChild(h('div.lux-head', h('h1.lux-head__title', t('navCategories')),
      h('p.lux-head__sub', isAr() ? 'تصفح جميع الأقسام والفئات في VENDORA.' : 'Browse all departments and categories in VENDORA.')));
    var grid = h('div.cat-grid.mt-4');
    cats.slice().sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); }).forEach(function (c) {
      grid.appendChild(ui.catTile(c));
    });
    root.appendChild(grid);
    return root;
  }

  V.pages = V.pages || {};
  V.pages.wishlist = renderWishlist;
  V.pages.compare = renderCompare;
  V.pages.categories = renderCategories;
})(window);
