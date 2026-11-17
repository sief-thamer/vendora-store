/* ============================================================
   VENDORA — Admin: catalog (products, product edit, categories,
   brands, inventory)
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var h = V.h;
  var ui = V.ui;
  var AU = V.adminUI;
  function t(k, v) { return V.t(k, v); }
  function isAr() { return V.state.get('lang') === 'ar'; }
  function loc(o) { return V.loc(o, 'name'); }
  function money(n) { return V.money(n); }

  function invMap() {
    return V.db.getAll('inventory').then(function (rows) {
      var m = {}; rows.forEach(function (r) { m[r.productId] = r; }); return m;
    });
  }
  function priceGrid(obj, labelPrefix) {
    var wrap = h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--s3)' } });
    var inputs = {};
    V.markets.forEach(function (mk) {
      var inp = h('input.input', { type: 'number', step: 'any', value: obj && obj[mk.code] != null ? obj[mk.code] : '' });
      inputs[mk.code] = inp;
      wrap.appendChild(h('label.field', h('span.f-label', labelPrefix + ' — ' + (isAr() ? mk.nameAr : mk.nameEn) + ' (' + mk.currency + ')'), inp));
    });
    wrap.getValues = function () { var o = {}; V.markets.forEach(function (mk) { var v = parseFloat(inputs[mk.code].value); if (!isNaN(v)) o[mk.code] = v; }); return o; };
    return wrap;
  }
  function select(options, value) {
    var s = h('select.input');
    options.forEach(function (o) {
      var opt = h('option', { value: o.value }, o.label);
      if (String(o.value) === String(value)) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  }

  /* ---------------- Products list ---------------- */
  function products() {
    var state = { q: '', cat: '', status: '', page: 1, per: 12 };
    var view = h('div');
    var listWrap = h('div');
    function reload() {
      Promise.all([V.productsAdmin.list(), invMap(), V.taxonomyAdmin.categories.list()]).then(function (res) {
        var all = res[0], inv = res[1], cats = res[2];
        var catOpts = [{ value: '', label: t('all') }].concat(cats.map(function (c) { return { value: c.slug, label: loc(c) }; }));
        var statusOpts = [{ value: '', label: t('all') }, { value: 'published', label: t('published') }, { value: 'draft', label: t('draft') }];

        var catSel = select(catOpts, state.cat); catSel.addEventListener('change', function () { state.cat = catSel.value; state.page = 1; draw(); });
        var stSel = select(statusOpts, state.status); stSel.addEventListener('change', function () { state.status = stSel.value; state.page = 1; draw(); });
        var search = AU.search(t('search') + '…', function (v) { state.q = v.toLowerCase(); state.page = 1; draw(); });
        var add = h('button.btn.btn-gold', { type: 'button' }, ui.icon('plus', 'icon-sm'), ' ' + t('newProduct'));
        add.addEventListener('click', function () { V.router.navigate('/products/new'); });

        V.mount(view, AU.title(t('products'), h('span.badge.badge-gold', String(all.length))), AU.toolbar(search, catSel, stSel, h('div.spacer'), add), listWrap);

        function draw() {
          var rows = all.filter(function (p) {
            if (state.cat && p.categorySlug !== state.cat) return false;
            if (state.status && p.status !== state.status) return false;
            if (state.q) { var hay = (loc(p) + ' ' + p.sku + ' ' + p.slug).toLowerCase(); if (hay.indexOf(state.q) < 0) return false; }
            return true;
          });
          var pages = Math.max(1, Math.ceil(rows.length / state.per));
          if (state.page > pages) state.page = pages;
          var slice = rows.slice((state.page - 1) * state.per, state.page * state.per);

          var body = AU.table([t('product'), t('sku'), t('category'), t('price'), t('stock'), t('status'), t('actions')],
            slice.map(function (p) {
              var iv = inv[p.id] || { onHand: 0 };
              var stockCls = iv.onHand === 0 ? '.badge-danger' : (iv.onHand <= V.config.LOW_STOCK ? '.badge-gold' : '');
              var edit = h('a.btn.btn-ghost.btn-icon', { href: '#/products/' + p.id, title: t('edit') }, ui.icon('edit', 'icon-sm'));
              var toggle = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: p.status === 'published' ? t('unpublish') : t('publish') }, ui.icon(p.status === 'published' ? 'close' : 'eye', 'icon-sm'));
              toggle.addEventListener('click', function () { V.productsAdmin.setStatus(p.id, p.status === 'published' ? 'draft' : 'published').then(reload); });
              var del = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: t('delete'), style: { color: 'var(--danger)' } }, ui.icon('trash', 'icon-sm'));
              del.addEventListener('click', function () {
                ui.confirm({ title: t('delete'), text: loc(p), confirmLabel: t('delete') }).then(function (ok) { if (ok) V.productsAdmin.remove(p.id).then(reload); });
              });
              return [
                h('div.row', { style: { gap: '10px', alignItems: 'center' } },
                  h('img', { src: p.primaryImage || 'assets/images/ui/placeholder.svg', alt: '', style: { width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' } }),
                  h('div', h('div', { style: { fontWeight: 600 } }, loc(p)), h('div.muted', { style: { fontSize: '.72rem' } }, p.slug))
                ),
                h('span.muted', p.sku),
                (V.catalog.category(p.categorySlug) ? loc(V.catalog.category(p.categorySlug)) : p.categorySlug),
                h('strong', money(V.catalog.priceOf(p))),
                h('span.badge' + stockCls, String(iv.onHand)),
                h('span.badge' + (p.status === 'published' ? '.badge-green' : '.badge-muted'), t(p.status)),
                h('div.row', { style: { gap: '4px' } }, edit, toggle, del)
              ];
            }));
          V.mount(listWrap, body, ui.pagination(rows.length, state.page, pages, function (pg) { state.page = pg; draw(); }));
        }
        draw();
      });
    }
    reload();
    return view;
  }

  /* ---------------- Product edit ---------------- */
  function productEdit(ctx) {
    var id = ctx.params.id;
    var isNew = (id === 'new');
    return Promise.all([isNew ? Promise.resolve(null) : V.productsAdmin.get(id), V.taxonomyAdmin.categories.list(), V.taxonomyAdmin.brands.list()]).then(function (res) {
      var p = res[0] || {};
      var cats = res[1], brands = res[2];

      function catNames(slug) { var c = V.catalog.category(slug); return c ? { categoryNameAr: c.nameAr, categoryNameEn: c.nameEn } : {}; }
      function brandNames(slug) { var b = V.catalog.brand(slug); return b ? { brandNameAr: b.nameAr, brandNameEn: b.nameEn } : {}; }

      var fNameAr = h('input.input', { value: p.nameAr || '', dir: 'rtl' });
      var fNameEn = h('input.input', { value: p.nameEn || '', dir: 'ltr' });
      var fSku = h('input.input', { value: p.sku || '' });
      var fSlug = h('input.input', { value: p.slug || '' });
      var fCat = select([{ value: '', label: '—' }].concat(cats.map(function (c) { return { value: c.slug, label: loc(c) }; })), p.categorySlug || '');
      var fBrand = select([{ value: '', label: '—' }].concat(brands.map(function (b) { return { value: b.slug, label: loc(b) }; })), p.brandSlug || '');
      var fStatus = select([{ value: 'published', label: t('published') }, { value: 'draft', label: t('draft') }], p.status || 'draft');
      var fDescAr = h('textarea.input', { rows: '4', dir: 'rtl' }, p.descAr || '');
      var fDescEn = h('textarea.input', { rows: '4', dir: 'ltr' }, p.descEn || '');
      var fNew = h('input', { type: 'checkbox' }); fNew.checked = !!p.isNew;
      var fFeat = h('input', { type: 'checkbox' }); fFeat.checked = !!p.isFeatured;
      var fStock = h('input.input', { type: 'number', value: (p.onHand != null ? p.onHand : 0) });
      var prices = priceGrid(p.prices || {}, t('price'));
      var comp = priceGrid(p.compareAt || {}, t('compareAt'));

      function collect() {
        var cSlug = fCat.value, bSlug = fBrand.value;
        var slug = fSlug.value.trim() || (fNameEn.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
        return Object.assign({
          id: isNew ? undefined : p.id,
          nameAr: fNameAr.value.trim(), nameEn: fNameEn.value.trim(),
          sku: fSku.value.trim(), slug: slug,
          categorySlug: cSlug, brandSlug: bSlug,
          status: fStatus.value, descAr: fDescAr.value.trim(), descEn: fDescEn.value.trim(),
          isNew: fNew.checked, isFeatured: fFeat.checked,
          prices: prices.getValues(), compareAt: comp.getValues(),
          primaryImage: p.primaryImage || 'assets/images/ui/placeholder.svg',
          images: (p.images && p.images.length) ? p.images : ['assets/images/ui/placeholder.svg'],
          onHand: parseInt(fStock.value, 10) || 0,
          specs: p.specs || [], tags: p.tags || []
        }, catNames(cSlug), brandNames(bSlug));
      }

      var saveBtn = h('button.btn.btn-gold', { type: 'button' }, ui.icon('check', 'icon-sm'), ' ' + t('save'));
      saveBtn.addEventListener('click', function () {
        var data = collect();
        if (!data.nameAr || !data.nameEn) { ui.toast(t('fieldsRequired'), 'error'); return; }
        saveBtn.disabled = true;
        V.productsAdmin.save(data).then(function (saved) {
          ui.toast(t('saved'), 'success');
          if (isNew) V.router.navigate('/products/' + saved.id);
          else V.router.navigate('/products');
        }).catch(function (e) { saveBtn.disabled = false; ui.toast(String(e && e.message || e), 'error'); });
      });
      var cancel = h('a.btn.btn-ghost', { href: '#/products' }, t('back'));
      var del = h('button.btn.btn-outline', { type: 'button', style: { color: 'var(--danger)' } }, ui.icon('trash', 'icon-sm'), ' ' + t('delete'));
      del.addEventListener('click', function () {
        ui.confirm({ title: t('delete'), text: loc(p), confirmLabel: t('delete') }).then(function (ok) { if (ok) V.productsAdmin.remove(p.id).then(function () { V.router.navigate('/products'); }); });
      });

      return h('div',
        AU.title(isNew ? t('newProduct') : t('editProduct'), h('div.row', { style: { gap: '8px' } }, cancel, isNew ? null : del, saveBtn)),
        h('div.card.card-pad',
          h('div.form-grid',
            AU.field(t('nameAr'), fNameAr), AU.field(t('nameEn'), fNameEn),
            AU.field(t('sku'), fSku), AU.field(t('slug'), fSlug),
            AU.field(t('category'), fCat), AU.field(t('brand'), fBrand),
            AU.field(t('status'), fStatus), AU.field(isNew ? t('stock') : t('stock'), fStock),
            h('label.field', h('span.f-label', t('flags')), h('div.row', { style: { gap: '16px', alignItems: 'center', minHeight: '42px' } },
              h('label.row', { style: { gap: '6px', cursor: 'pointer' } }, fNew, h('span', t('new'))),
              h('label.row', { style: { gap: '6px', cursor: 'pointer' } }, fFeat, h('span', t('featured')))
            ))
          )
        ),
        h('div.card.card-pad.mt-4', h('h3', t('price')), prices),
        h('div.card.card-pad.mt-4', h('h3', t('compareAt')), comp),
        h('div.card.card-pad.mt-4',
          h('div.form-grid', h('label.field.full', h('span.f-label', t('descAr')), fDescAr), h('label.field.full', h('span.f-label', t('descEn')), fDescEn))
        ),
        h('div.row.mt-4', { style: { gap: '8px' } }, saveBtn)
      );
    });
  }

  /* ---------------- Categories ---------------- */
  function categories() {
    var wrap = h('div');
    function reload() {
      V.taxonomyAdmin.categories.list().then(function (cats) {
        var addBtn = h('button.btn.btn-gold', { type: 'button' }, ui.icon('plus', 'icon-sm'), ' ' + t('add'));
        addBtn.addEventListener('click', function () { editor(null); });
        var table = AU.table([t('name'), t('slug'), t('subcategories'), t('sort'), t('actions')],
          cats.map(function (c) {
            var edit = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: t('edit') }, ui.icon('edit', 'icon-sm'));
            edit.addEventListener('click', function () { editor(c); });
            var del = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: t('delete'), style: { color: 'var(--danger)' } }, ui.icon('trash', 'icon-sm'));
            del.addEventListener('click', function () { ui.confirm({ title: t('delete'), text: loc(c) }).then(function (ok) { if (ok) V.taxonomyAdmin.categories.remove(c.id).then(reload); }); });
            return [h('strong', loc(c)), h('span.muted', c.slug), String((c.subcategories || []).length), String(c.sort || 0), h('div.row', { style: { gap: '4px' } }, edit, del)];
          }));
        V.mount(wrap, AU.title(t('categories'), addBtn), table);
      });
    }
    function editor(c) {
      var isNew = !c; c = c || {};
      var fAr = h('input.input', { value: c.nameAr || '', dir: 'rtl' });
      var fEn = h('input.input', { value: c.nameEn || '', dir: 'ltr' });
      var fSlug = h('input.input', { value: c.slug || '' });
      var fIcon = h('input.input', { value: c.icon || 'tag' });
      var fSort = h('input.input', { type: 'number', value: c.sort || 0 });
      AU.formModal(isNew ? t('add') : t('edit'),
        h('div', AU.field(t('nameAr'), fAr), AU.field(t('nameEn'), fEn), AU.field(t('slug'), fSlug), AU.field(t('icon'), fIcon), AU.field(t('sort'), fSort)),
        function () {
          var data = Object.assign({}, c, { nameAr: fAr.value.trim(), nameEn: fEn.value.trim(), slug: fSlug.value.trim() || fEn.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'), icon: fIcon.value.trim() || 'tag', sort: parseInt(fSort.value, 10) || 0 });
          return V.taxonomyAdmin.categories.save(data).then(reload);
        });
    }
    reload();
    return wrap;
  }

  /* ---------------- Brands ---------------- */
  function brands() {
    var wrap = h('div');
    function reload() {
      Promise.all([V.taxonomyAdmin.brands.list(), V.taxonomyAdmin.categories.list()]).then(function (res) {
        var list = res[0], cats = res[1];
        var addBtn = h('button.btn.btn-gold', { type: 'button' }, ui.icon('plus', 'icon-sm'), ' ' + t('add'));
        addBtn.addEventListener('click', function () { editor(null, cats); });
        var table = AU.table([t('name'), t('slug'), t('country'), t('categories'), t('actions')],
          list.map(function (b) {
            var edit = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: t('edit') }, ui.icon('edit', 'icon-sm'));
            edit.addEventListener('click', function () { editor(b, cats); });
            var del = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: t('delete'), style: { color: 'var(--danger)' } }, ui.icon('trash', 'icon-sm'));
            del.addEventListener('click', function () { ui.confirm({ title: t('delete'), text: loc(b) }).then(function (ok) { if (ok) V.taxonomyAdmin.brands.remove(b.id).then(reload); }); });
            return [h('strong', loc(b)), h('span.muted', b.slug), b.country || '—', String((b.categories || []).length), h('div.row', { style: { gap: '4px' } }, edit, del)];
          }));
        V.mount(wrap, AU.title(t('brands'), addBtn), table);
      });
    }
    function editor(b, cats) {
      var isNew = !b; b = b || {};
      var fAr = h('input.input', { value: b.nameAr || '', dir: 'rtl' });
      var fEn = h('input.input', { value: b.nameEn || '', dir: 'ltr' });
      var fSlug = h('input.input', { value: b.slug || '' });
      var fCountry = h('input.input', { value: b.country || '' });
      var fDesc = h('input.input', { value: b.descAr || '' });
      var boxes = cats.map(function (c) {
        var cb = h('input', { type: 'checkbox' }); cb.checked = (b.categories || []).indexOf(c.slug) >= 0;
        return { slug: c.slug, el: cb, node: h('label.row', { style: { gap: '6px', cursor: 'pointer', marginBottom: '6px' } }, cb, h('span', loc(c))) };
      });
      var m = AU.formModal(isNew ? t('add') : t('edit'),
        h('div', AU.field(t('nameAr'), fAr), AU.field(t('nameEn'), fEn), AU.field(t('slug'), fSlug), AU.field(t('country'), fCountry), AU.field(t('description'), fDesc), h('div.field', h('span.f-label', t('categories')), h('div', { style: { maxHeight: '160px', overflow: 'auto' } }, boxes.map(function (x) { return x.node; })))),
        function () {
          var data = Object.assign({}, b, {
            nameAr: fAr.value.trim(), nameEn: fEn.value.trim(),
            slug: fSlug.value.trim() || fEn.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            country: fCountry.value.trim(), descAr: fDesc.value.trim(),
            categories: boxes.filter(function (x) { return x.el.checked; }).map(function (x) { return x.slug; })
          });
          return V.taxonomyAdmin.brands.save(data).then(reload);
        });
    }
    reload();
    return wrap;
  }

  /* ---------------- Inventory ---------------- */
  function inventory() {
    var state = { q: '', filter: 'all', page: 1, per: 15, market: V.state.get('market') || V.config.DEFAULT_MARKET };
    var view = h('div'); var listWrap = h('div');
    function reload() {
      Promise.all([V.stock.listMarketInventory({ market: state.market }), V.db.getAll('warehouses')]).then(function (res) {
        var rows = res[0], whs = res[1];
        var inv = {}; rows.forEach(function (r) { inv[r.productId] = r; });
        var products = V.catalog.products();
        var search = AU.search(t('search') + '…', function (v) { state.q = v.toLowerCase(); state.page = 1; draw(); });
        var mSel = h('select.input');
        V.markets.forEach(function (m) { var o = h('option', { value: m.code }, m.flag + ' ' + (loc(m) || m.nameEn)); if (m.code === state.market) o.selected = true; mSel.appendChild(o); });
        mSel.addEventListener('change', function () { state.market = mSel.value; reload(); });
        var fSel = select([{ value: 'all', label: t('all') }, { value: 'low', label: t('low') }, { value: 'out', label: t('out') }], state.filter);
        fSel.addEventListener('change', function () { state.filter = fSel.value; state.page = 1; draw(); });
        var wh = whs.filter(function (w) { return w.marketCode === state.market; })[0];
        V.mount(view, AU.title(t('marketStock') + ' · ' + state.market + (wh ? ' · ' + (wh.nameAr || wh.nameEn || '') : '')), AU.toolbar(search, mSel, fSel), listWrap);

        function draw() {
          var list = products.map(function (p) { return { p: p, iv: inv[p.id] || { productId: p.id, onHand: 0, reserved: 0, damaged: 0 } }; });
          list = list.filter(function (x) {
            var avail = V.stock.available(x.iv);
            if (state.filter === 'low') { if (!(avail > 0 && x.iv.onHand <= V.config.LOW_STOCK)) return false; }
            if (state.filter === 'out') { if (avail > 0) return false; }
            if (state.q) { if (((loc(x.p) + ' ' + x.p.sku).toLowerCase()).indexOf(state.q) < 0) return false; }
            return true;
          });
          var pages = Math.max(1, Math.ceil(list.length / state.per));
          if (state.page > pages) state.page = pages;
          var slice = list.slice((state.page - 1) * state.per, state.page * state.per);
          var table = AU.table([t('product'), t('sku'), t('onHand'), t('reserved'), t('damaged'), t('available'), t('actions')],
            slice.map(function (x) {
              var inp = h('input.input', { type: 'number', value: x.iv.onHand, style: { width: '90px' } });
              var dmg = h('input.input', { type: 'number', value: x.iv.damaged || 0, style: { width: '80px' } });
              function apply(delta) { return V.stock.adjust(x.p.id, delta, { market: state.market, reason: 'admin', by: 'staff' }).then(reload); }
              var minus = h('button.btn.btn-ghost.btn-icon', { type: 'button' }, ui.icon('minus', 'icon-sm'));
              minus.addEventListener('click', function () { apply(-1); });
              var plus = h('button.btn.btn-ghost.btn-icon', { type: 'button' }, ui.icon('plus', 'icon-sm'));
              plus.addEventListener('click', function () { apply(1); });
              var setBtn = h('button.btn.btn-outline.btn-sm', { type: 'button' }, t('save'));
              setBtn.addEventListener('click', function () {
                var target = parseInt(inp.value, 10) || 0;
                V.stock.setOnHand(x.p.id, target, { market: state.market, reason: 'admin', by: 'staff' })
                  .then(function () { return V.stock.setDamaged(x.p.id, parseInt(dmg.value, 10) || 0, { market: state.market, by: 'staff' }); })
                  .then(reload);
              });
              var avail = V.stock.available(x.iv);
              var cls = avail === 0 ? '.badge-danger' : (x.iv.onHand <= V.config.LOW_STOCK ? '.badge-gold' : '.badge-green');
              return [
                h('div', h('div', { style: { fontWeight: 600 } }, loc(x.p)), h('div.muted', { style: { fontSize: '.72rem' } }, x.p.slug)),
                h('span.muted', x.p.sku),
                h('span.badge' + cls, String(x.iv.onHand)),
                h('span.muted', String(x.iv.reserved || 0)),
                dmg,
                h('span.muted', String(avail)),
                h('div.row', { style: { gap: '4px', alignItems: 'center' } }, minus, inp, plus, setBtn)
              ];
            }));
          V.mount(listWrap, table, ui.pagination(list.length, state.page, pages, function (pg) { state.page = pg; draw(); }));
        }
        draw();
      });
    }
    reload();
    return view;
  }

  V.apages.products = products;
  V.apages.productEdit = productEdit;
  V.apages.categories = categories;
  V.apages.brands = brands;
  V.apages.inventory = inventory;
})(window);
