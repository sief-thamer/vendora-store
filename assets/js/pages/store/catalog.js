/* ============================================================
   VENDORA — Page: catalog listings
   Handles /products /category/:slug /brand/:slug /search /offers /new /best
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var h = V.h;
  var ui = V.ui;
  var U = V.utils;
  function t(k, v) { return V.t(k, v); }
  function isAr() { return V.state.get('lang') === 'ar'; }

  function listing(ctx, preset) {
    preset = preset || {};
    var f = Object.assign({ page: 1, perPage: 24, sort: preset.sort || 'relevance' }, preset.filters || {});
    if (ctx.query && ctx.query.q) f.q = ctx.query.q;
    if (ctx.query && ctx.query.sub) f.sub = ctx.query.sub;
    if (ctx.query && ctx.query.page) f.page = parseInt(ctx.query.page, 10) || 1;

    var title = preset.title || t('productsTitle');
    var crumb = preset.crumb || [{ label: t('navHome'), href: '/' }, { label: title }];
    if (V.seo) V.seo.set({ title: title, description: title + ' — VENDORA', type: 'website' });

    var root = h('div.container', { style: { paddingBlock: 'var(--s5)' } });
    root.appendChild(ui.breadcrumb(crumb));
    var metaEl = h('div.muted');
    var head = h('div.section-head.mt-3', h('div', h('h1.section-head__title', title), metaEl));
    root.appendChild(head);

    var layout = h('div.store-layout.mt-4');
    var aside = h('aside.filters');
    var main = h('div.grow');

    var toolbar = h('div.toolbar');
    var subHost = h('div.subcat-bar');
    var gridHost = h('div.mt-4');
    var pagHost = h('div.mt-5');
    main.appendChild(subHost); main.appendChild(toolbar); main.appendChild(gridHost); main.appendChild(pagHost);
    layout.appendChild(aside); layout.appendChild(main);
    root.appendChild(layout);

    function reset() { f.page = 1; f.cat = preset.filters && preset.filters.cat; f.brand = preset.filters && preset.filters.brand; f.sub = null; f.min = null; f.max = null; f.rating = null; f.availability = null; f.sale = preset.filters && preset.filters.sale; f.q = (preset.filters && preset.filters.q) || (ctx.query && ctx.query.q) || null; run(); }

    function setFacet(k, v) { f[k] = (f[k] === v ? null : v); f.page = 1; run(); }

    function run() {
      var res = V.catalog.query(f);
      // meta
      metaEl.textContent = U.formatNumber(res.total, V.state.get('lang')) + ' ' + (isAr() ? 'منتج' : 'products');
      renderFacets(res);
      renderToolbar(res);
      renderGrid(res);
      renderPagination(res);
    }

    function renderFacets(res) {
      V.clear(aside);
      aside.appendChild(h('div.row-between.mb-3', h('strong', t('filter')), h('button.btn.btn-link.btn-sm', { type: 'button' }, t('clearFilters'))));
      aside.querySelector('.btn-link').addEventListener('click', reset);

      // categories & subcategories now live in the top mega-menu / category bar;
      // here we surface the active category's subcategories as a horizontal chip bar.
      var activeCat = f.cat ? V.catalog.category(f.cat) : null;
      V.clear(subHost);
      if (activeCat && activeCat.subcategories && activeCat.subcategories.length) {
        subHost.appendChild(h('div.subcat-bar__head', ui.icon('layers', 'icon-sm'), h('span', t('subcategories'))));
        var chips = h('div.subcat-chips');
        var allChip = h('button', { type: 'button', class: 'chip' + (f.sub ? '' : ' active') }, t('all'));
        allChip.addEventListener('click', function () { f.sub = null; f.page = 1; run(); });
        chips.appendChild(allChip);
        activeCat.subcategories.forEach(function (s) {
          var c = h('button', { type: 'button', class: 'chip' + (f.sub === s.slug ? ' active' : '') }, V.loc(s, 'name'));
          c.addEventListener('click', function () { setFacet('sub', s.slug); });
          chips.appendChild(c);
        });
        subHost.appendChild(chips);
      }

      // brands
      // brands filter removed as requested

      // price
      var minI = h('input.input', { type: 'number', placeholder: isAr() ? 'من' : 'Min', 'aria-label': isAr() ? 'الحد الأدنى للسعر' : 'Minimum price', value: f.min != null ? f.min : '' });
      var maxI = h('input.input', { type: 'number', placeholder: isAr() ? 'إلى' : 'Max', 'aria-label': isAr() ? 'الحد الأعلى للسعر' : 'Maximum price', value: f.max != null ? f.max : '' });
      var apply = h('button.btn.btn-outline.btn-sm.btn-block.mt-2', { type: 'button' }, t('apply'));
      apply.addEventListener('click', function () { f.min = minI.value ? Number(minI.value) : null; f.max = maxI.value ? Number(maxI.value) : null; f.page = 1; run(); });
      aside.appendChild(h('div.filter-block', h('h4', t('price')), h('div.row', minI, maxI), apply));

      // rating
      var rList = h('div.filter-list');
      [4, 3, 2].forEach(function (n) { rList.appendChild(rowItem(n + ' ★ +', f.rating === n, function () { setFacet('rating', n); })); });
      aside.appendChild(h('div.filter-block', h('h4', t('rating')), rList));

      // availability
      var aList = h('div.filter-list');
      aList.appendChild(rowItem(t('inStock'), f.availability === 'in', function () { setFacet('availability', 'in'); }, res.facets.availability, null, 'in'));
      aList.appendChild(rowItem(t('lowStock'), f.availability === 'low', function () { setFacet('availability', 'low'); }, res.facets.availability, null, 'low'));
      aList.appendChild(rowItem(t('outOfStock'), f.availability === 'out', function () { setFacet('availability', 'out'); }, res.facets.availability, null, 'out'));
      aside.appendChild(h('div.filter-block', h('h4', t('availability')), aList));

      // on sale
      var saleRow = h('label.checkbox', h('input', { type: 'checkbox', checked: !!f.sale }), h('span', t('offersTitle')));
      saleRow.querySelector('input').addEventListener('change', function () { f.sale = this.checked || null; f.page = 1; run(); });
      aside.appendChild(h('div.filter-block', saleRow));
    }

    function rowItem(label, active, onClick, counts, key, availKey) {
      var count = null;
      if (counts && key) count = counts[key];
      if (availKey && counts && counts.availability) count = counts.availability[availKey];
      var el = h('label', { style: { cursor: 'pointer', fontWeight: active ? 700 : 400 } },
        h('span', { class: active ? 'chip active' : 'chip', style: { width: '100%', justifyContent: 'space-between' } }, h('span', label), count != null ? h('span.count', String(count)) : null)
      );
      el.addEventListener('click', function (e) { e.preventDefault(); onClick(); });
      return el;
    }

    function renderToolbar(res) {
      V.clear(toolbar);
      var sortSel = h('select.select', { style: { width: 'auto' }, 'aria-label': t('sortBy') });
      [['relevance', t('sortRelevance')], ['newest', t('sortNewest')], ['priceLow', t('sortPriceLow')], ['priceHigh', t('sortPriceHigh')], ['rating', t('sortRating')], ['best', t('sortBest')], ['discount', t('sortBest')]].forEach(function (o) {
        sortSel.appendChild(h('option', { value: o[0], selected: f.sort === o[0] }, o[1]));
      });
      sortSel.addEventListener('change', function () { f.sort = sortSel.value; f.page = 1; run(); });
      var filterBtn = h('button.btn.btn-outline.btn-sm.filters-toggle', { type: 'button' }, ui.icon('filter', 'icon-sm'), t('filter'));
      filterBtn.addEventListener('click', function () { aside.classList.toggle('open'); });
      toolbar.appendChild(h('div.row-between',
        h('span.muted', res.total + ' ' + (isAr() ? 'نتيجة' : 'results')),
        h('div.row', filterBtn, h('span.muted', t('sortBy')), sortSel)
      ));
    }

    function renderGrid(res) {
      V.clear(gridHost);
      if (!res.items.length) { gridHost.appendChild(ui.empty({ icon: 'search', title: t('noResults'), text: isAr() ? 'جرّب تعديل الفلاتر أو كلمة البحث.' : 'Try adjusting filters or search.', action: h('button.btn.btn-primary', { type: 'button' }, t('clearFilters')) })); gridHost.querySelector('.btn').addEventListener('click', reset); return; }
      var g = h('div.product-grid');
      res.items.forEach(function (p) { g.appendChild(ui.pcard(p)); });
      gridHost.appendChild(g);
    }

    function renderPagination(res) {
      V.clear(pagHost);
      var pg = ui.pagination(res.total, res.page, res.pages, function (p) { f.page = p; run(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      if (pg) pagHost.appendChild(pg);
    }

    run();
    return root;
  }

  V.pages = V.pages || {};

  V.pages.products = function () { return listing({}, { title: t('productsTitle') }); };

  V.pages.category = function (ctx) {
    var slug = ctx.params.slug;
    var cat = V.catalog.category(slug);
    if (!cat) return V.pages.notFound(ctx);
    return listing({}, { title: V.loc(cat, 'name'), lockCat: true, filters: { cat: slug }, crumb: [{ label: t('navHome'), href: '/' }, { label: t('navCategories'), href: '/products' }, { label: V.loc(cat, 'name') }] });
  };

  V.pages.brand = function (ctx) {
    var b = V.catalog.brand(ctx.params.slug);
    if (!b) return V.pages.notFound(ctx);
    return listing({}, { title: V.loc(b, 'name'), filters: { brand: b.slug }, crumb: [{ label: t('navHome'), href: '/' }, { label: t('navBrands'), href: '/brands' }, { label: V.loc(b, 'name') }] });
  };

  function chip(label, hash) {
    return h('a.chip', { href: ui.href(hash) }, label);
  }
  function searchChips(q) {
    var recent = (V.searchHistory ? V.searchHistory.list() : []);
    var popular = (V.catalog.categories() || []).slice(0, 8);
    if (!recent.length && !popular.length) return null;
    var wrap = h('div.search-chips.mt-4');
    if (recent.length) {
      var clearBtn = h('button.btn.btn-ghost.btn-sm', { type: 'button' }, t('clearHistory'));
      clearBtn.addEventListener('click', function () { V.searchHistory.clear(); V.router.navigate('/search?q=' + encodeURIComponent(q)); });
      wrap.appendChild(h('div.row-between.mb-2', h('span.f-label', t('recentSearches')), clearBtn));
      var rr = h('div.chip-row');
      recent.forEach(function (x) { rr.appendChild(chip(x, '/search?q=' + encodeURIComponent(x))); });
      wrap.appendChild(rr);
    }
    if (popular.length) {
      wrap.appendChild(h('div.f-label.mt-3.mb-2', t('popularSearches')));
      var pr = h('div.chip-row');
      popular.forEach(function (c) { pr.appendChild(chip(V.loc(c, 'name'), '/category/' + c.slug)); });
      wrap.appendChild(pr);
    }
    return wrap;
  }
  V.pages.search = function (ctx) {
    var q = (ctx.query && ctx.query.q) || '';
    if (q && V.searchHistory) V.searchHistory.add(q);
    var view = listing({ query: ctx.query }, { title: t('searchResultsTitle') + (q ? ': ' + q : ''), filters: { q: q }, crumb: [{ label: t('navHome'), href: '/' }, { label: t('searchResultsTitle') }] });
    var chips = searchChips(q);
    if (chips && view.children && view.children.length >= 2) view.insertBefore(chips, view.children[2] || null);
    return view;
  };

  V.pages.offers = function () { return listing({}, { title: t('offersTitle'), filters: { sale: true }, crumb: [{ label: t('navHome'), href: '/' }, { label: t('offersTitle') }] }); };
  V.pages.newArrivals = function () { return listing({}, { title: t('newArrivalsTitle'), filters: { isNew: true, sort: 'newest' }, crumb: [{ label: t('navHome'), href: '/' }, { label: t('newArrivalsTitle') }] }); };
  V.pages.bestSellers = function () { return listing({}, { title: t('bestSellersTitle'), filters: { sort: 'best' }, crumb: [{ label: t('navHome'), href: '/' }, { label: t('bestSellersTitle') }] }); };

  V.pages.brandsPage = function () {
    var grid = h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', marginTop: 'var(--s5)' } });
    V.catalog.brands().forEach(function (b) {
      var count = V.catalog.products().filter(function (p) { return p.brandSlug === b.slug; }).length;
      grid.appendChild(h('a.card.card-pad', { href: ui.href('/brand/' + b.slug) }, h('div.row', h('span.ti-ico', ui.icon('tag')), h('div', h('h3', V.loc(b, 'name')), h('div.muted', count + ' ' + (isAr() ? 'منتج' : 'items'))))));
    });
    return h('div.container', { style: { paddingBlock: 'var(--s6)' } }, ui.breadcrumb([{ label: t('navHome'), href: '/' }, { label: t('navBrands') }]), h('div.lux-head', h('h1.lux-head__title', t('brandsTitle'))), grid);
  };
})(window);
