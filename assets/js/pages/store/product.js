/* ============================================================
   VENDORA — Page: product detail
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var h = V.h;
  var ui = V.ui;
  var U = V.utils;
  function t(k, v) { return V.t(k, v); }
  function isAr() { return V.state.get('lang') === 'ar'; }

  function render(ctx) {
    var p = V.catalog.getBySlug(ctx.params.slug) || V.catalog.get(ctx.params.slug);
    if (!p) return V.pages.notFound(ctx);

    var out = !V.catalog.isInStock(p);
    var low = V.catalog.isLow(p);
    var stock = V.catalog.stockOf(p);

    var root = h('div.container', { style: { paddingBlock: 'var(--s5)' } });
    root.appendChild(ui.breadcrumb([
      { label: t('navHome'), href: '/' },
      { label: V.loc(p, 'categoryName'), href: '/category/' + p.categorySlug },
      { label: V.loc(p, 'name') }
    ]));

    /* gallery */
    var mainImg = h('img', { src: p.images[0], alt: V.loc(p, 'name') });
    var main = h('div.pdp-media', mainImg);
    var thumbs = h('div.pdp-thumbs');
    p.images.forEach(function (src, i) {
      var th = h('img.pdp-thumb' + (i === 0 ? '.is-active' : ''), { src: src, alt: '', loading: 'lazy' });
      th.addEventListener('click', function () {
        mainImg.src = src;
        Array.prototype.forEach.call(thumbs.children, function (c) { c.classList.remove('is-active'); });
        th.classList.add('is-active');
      });
      thumbs.appendChild(th);
    });

    /* info */
    var discount = V.catalog.discountPct(p);
    var badges = h('div.row.wrap.mb-2');
    if (p.isNew) badges.appendChild(h('span.badge.badge-gold', t('navNew')));
    if (discount) badges.appendChild(h('span.badge.badge-danger', '-' + discount + '%'));
    if (out) badges.appendChild(h('span.badge.badge-navy', t('outOfStock')));
    else if (low) badges.appendChild(h('span.badge.badge-warn', t('lowStock') + (stock ? ' (' + stock + ')' : '')));
    else badges.appendChild(h('span.badge.badge-green', t('inStock')));

    var qtyStep = ui.qty(1, null, out ? 1 : stock);
    var addBtn = h('button.btn.btn-primary.btn-lg', { type: 'button', disabled: out }, ui.icon('cart'), h('span', t('addToCart')));
    var buyBtn = h('button.btn.btn-gold.btn-lg', { type: 'button', disabled: out }, ui.icon('zap') , h('span', t('buyNow')));
    var wishBtn = h('button.btn.btn-outline.btn-lg', { type: 'button' }, ui.icon('heart'), h('span', V.wishlist.has(p.id) ? t('inWishlist') : t('addToWishlist')));
    var cmpBtn = h('button.btn.btn-outline.btn-lg', { type: 'button' }, ui.icon('scales'), h('span', V.compare.has(p.id) ? t('compare') : t('addToCompare')));

    addBtn.addEventListener('click', function () {
      V.cart.add(p.id, qtyStep.getValue()).then(function () { ui.toast(t('addedToCart'), 'success'); }).catch(function (e) { ui.toast(t(e.message === 'out_of_stock' ? 'outOfStock' : 'error'), 'error'); });
    });
    buyBtn.addEventListener('click', function () {
      V.cart.add(p.id, qtyStep.getValue()).then(function () { location.hash = '/checkout'; }).catch(function (e) { ui.toast(t(e.message === 'out_of_stock' ? 'outOfStock' : 'error'), 'error'); });
    });
    wishBtn.addEventListener('click', function () {
      V.wishlist.toggle(p.id).then(function () { var on = V.wishlist.has(p.id); wishBtn.querySelector('span').textContent = on ? t('inWishlist') : t('addToWishlist'); ui.toast(on ? t('addedToWishlist') : t('removedFromWishlist'), 'success'); });
    });
    cmpBtn.addEventListener('click', function () {
      var r = V.compare.toggle(p.id);
      if (r.full) return ui.toast(t('compareFull'), 'warn');
      cmpBtn.querySelector('span').textContent = V.compare.has(p.id) ? t('compare') : t('addToCompare');
      ui.toast(V.compare.has(p.id) ? t('addedToCompare') : t('removedFromCart'), 'success');
    });

    var notifyBox = null;
    if (out) {
      var nEmail = h('input.input', { type: 'email', placeholder: t('email'), value: (V.state.get('user') && V.state.get('user').email) || '' });
      var nBtn = h('button.btn.btn-gold', { type: 'button' }, ui.icon('bell', 'icon-sm'), h('span', t('notifyMe')));
      var nMsg = h('div.muted.help');
      nBtn.addEventListener('click', function () {
        var email = nEmail.value.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { nMsg.textContent = t('emailInvalid'); return; }
        nBtn.disabled = true;
        var u = V.state.get('user');
        V.stock.addAlert({ productId: p.id, email: email, market: V.state.get('market'), customerId: (u && u.id) || null }).then(function (r) {
          nBtn.disabled = false;
          nMsg.textContent = r.duplicate ? t('notifyAlready') : t('notifyAdded');
          if (!r.duplicate) ui.toast(t('notifyAdded'), 'success');
        }).catch(function () { nBtn.disabled = false; nMsg.textContent = t('error'); });
      });
      notifyBox = h('div.card.card-pad', { style: { marginTop: 'var(--s3)' } },
        h('strong', ui.icon('bell', 'icon-sm'), ' ' + t('backInStockTitle')),
        h('div.muted.help.mb-2', t('notifyMe') + ' — ' + (isAr() ? 'سنراسلك عند توفر المنتج.' : 'We will email you when it is back.')),
        h('div.row', { style: { gap: '8px' } }, nEmail, nBtn), nMsg);
    }

    var meta = h('div.stack', { style: { gap: 'var(--s2)' } },
      metaRow('tag', t('brand'), h('a', { href: ui.href('/brand/' + p.brandSlug), style: { color: 'var(--accent-2)' } }, V.loc(p, 'brandName'))),
      metaRow('box', t('sku'), h('span.mono', p.sku)),
      metaRow('shield', t('warranty'), h('span', isAr() ? p.warrantyAr : p.warrantyEn)),
      metaRow('repeat', t('returnPolicy'), h('span', isAr() ? p.returnPolicyAr : p.returnPolicyEn))
    );

    var info = h('div.pdp-info',
      h('a.pdp-brand', { href: ui.href('/brand/' + p.brandSlug) }, V.loc(p, 'brandName')),
      h('h1.pdp-title.mt-2', V.loc(p, 'name')),
      h('div.mt-2', ui.stars(p.rating, p.ratingCount)),
      badges,
      h('div.pdp-price.mt-3', ui.price(p)),
      h('p.pdp-desc.muted.mt-3', V.loc(p, 'desc').split('. ')[0] + '.'),
      colorBlock(p),
      sizeBlock(p),
      h('div.pdp-actions', qtyStep, addBtn, buyBtn),
      notifyBox,
      h('div.row.wrap.mt-3', wishBtn, cmpBtn),
      h('div.divider.mt-5'),
      meta
    );

    var top = h('div.pdp-grid', h('div.pdp-gallery', main, thumbs), info);
    root.appendChild(top);

    /* tabs */
    var descPanel = h('div', h('p', V.loc(p, 'desc')), h('ul.stack.mt-3', p.specs.slice(0, 4).map(function (s) { return h('li', h('span.muted', isAr() ? s.keyAr : s.keyEn) + ': ' + (isAr() ? s.valueAr : s.valueEn)); })));
    var specPanel = h('div.table-wrap', h('table.data-table', h('tbody', p.specs.map(function (s) { return h('tr', h('td', { style: { fontWeight: 600, width: '40%' } }, isAr() ? s.keyAr : s.keyEn), h('td', isAr() ? s.valueAr : s.valueEn)); }))));
    var reviewPanel = h('div');
    var polPanel = h('div.stack', h('p', isAr() ? p.returnPolicyAr : p.returnPolicyEn), h('p', isAr() ? p.warrantyAr : p.warrantyEn));
    var tabs = ui.tabs([
      { label: t('description'), panel: descPanel },
      { label: t('specifications'), panel: specPanel },
      { label: t('reviews'), panel: reviewPanel },
      { label: t('returnPolicy'), panel: polPanel }
    ]);
    root.appendChild(h('div.mt-6', tabs));

    /* reviews */
    V.reviews.load ? null : null;
    renderReviews(reviewPanel, p);

    /* related */
    var rel = V.catalog.related(p, 8);
    if (rel.length) {
      var g = h('div.product-grid');
      rel.forEach(function (x) { g.appendChild(ui.pcard(x)); });
      root.appendChild(h('section.section', h('div.container', ui.sectionHead(t('relatedProducts')), g)));
    }

    if (V.seo) {
      var desc = V.loc(p, 'desc') || '';
      if (desc.length > 160) desc = desc.slice(0, 157) + '…';
      var inStock = V.catalog.isInStock(p);
      V.seo.set({
        title: V.loc(p, 'name'),
        description: desc,
        type: 'product',
        image: p.images && p.images[0],
        jsonLd: {
          '@context': 'https://schema.org', '@type': 'Product',
          name: V.loc(p, 'name'), description: desc, sku: p.sku,
          image: p.images || [], brand: { '@type': 'Brand', name: V.loc(p, 'brandName') },
          offers: {
            '@type': 'Offer', price: p.price, priceCurrency: (V.getMarket(V.state.get('market')) || {}).currency || 'YER',
            availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
          },
          aggregateRating: (p.ratingCount ? { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.ratingCount } : undefined)
        }
      });
    }
    return root;
  }

  function metaRow(icon, label, value) {
    return h('div.row', h('span', ui.icon(icon, 'icon-sm')), h('span.muted', label + ':'), h('span.grow', value));
  }

  /* ---------------- Colour & size selectors (UI only) ---------------- */
  function loc2(o) { return isAr() ? o.ar : o.en; }

  var COLOR_HEX = {
    'black': '#1b1b1b', 'white': '#ffffff', 'gray': '#9aa3ad', 'grey': '#9aa3ad',
    'silver': '#c0c4c9', 'blue': '#2f6fb3', 'navy': '#1f2b46', 'red': '#c0392b',
    'beige': '#d8c8a8', 'brown': '#6b4a2b', 'off-white': '#f3efe6', 'gold': '#c69a45',
    'green': '#2e7d4f', 'pink': '#d98ba6', 'orange': '#d9822b', 'purple': '#6b4c9a',
    'yellow': '#e0c341', 'rose gold': '#b76e79'
  };
  function colorHex(c) {
    var key = (c && (c.en || '')).toString().trim().toLowerCase();
    return COLOR_HEX[key] || '#cfd6df';
  }

  function colorBlock(p) {
    if (!p.colors || !p.colors.length) return null;
    var pick = h('span.opt-pick', loc2(p.colors[0]));
    var row = h('div.swatch-row');
    p.colors.forEach(function (c, i) {
      var sw = h('button.swatch' + (i === 0 ? '.active' : ''), { type: 'button', title: loc2(c), 'aria-label': loc2(c) },
        h('span.sw-dot', { style: { background: colorHex(c) } }));
      sw.addEventListener('click', function () {
        Array.prototype.forEach.call(row.children, function (x) { x.classList.remove('active'); });
        sw.classList.add('active');
        pick.textContent = loc2(c);
      });
      row.appendChild(sw);
    });
    return h('div.pdp-opt', h('div.opt-head', h('span.opt-label', t('color')), pick), row);
  }

  function sizeBlock(p) {
    if (!p.sizes || !p.sizes.length) return null;
    var pick = h('span.opt-pick', loc2(p.sizes[0]));
    var row = h('div.size-row');
    p.sizes.forEach(function (s, i) {
      var ch = h('button.size-chip' + (i === 0 ? '.active' : ''), { type: 'button' }, loc2(s));
      ch.addEventListener('click', function () {
        Array.prototype.forEach.call(row.children, function (x) { x.classList.remove('active'); });
        ch.classList.add('active');
        pick.textContent = loc2(s);
      });
      row.appendChild(ch);
    });
    return h('div.pdp-opt', h('div.opt-head', h('span.opt-label', t('size')), pick), row);
  }

  function renderReviews(host, p) {
    V.reviews.stats(p.id).then(function (stats) {
      V.clear(host);
      var left = h('div', { style: { minWidth: '220px' } },
        h('div.row', h('strong', { style: { fontSize: '2rem' } }, stats.avg || p.rating), h('div', ui.stars(stats.avg || p.rating, null, { showNum: false }), h('div.muted', stats.count + ' ' + (isAr() ? 'مراجعة' : 'reviews')))),
        h('div.mt-3', ui.ratingBars({ count: stats.count, breakdown: breakdown(stats.all) }))
      );
      var list = h('div.grow.stack');
      var approved = stats.all.filter(function (r) { return r.status === 'approved'; });
      if (!approved.length) list.appendChild(h('p.muted', isAr() ? 'لا توجد مراجعات بعد. كن أول من يقيّم هذا المنتج.' : 'No reviews yet. Be the first to review.'));
      approved.slice(0, 6).forEach(function (r) {
        var repBtn = h('button.btn.btn-ghost.btn-icon.btn-sm', { type: 'button', title: t('reportReview'), 'aria-label': t('reportReview') }, ui.icon('alert', 'icon-sm'));
        repBtn.addEventListener('click', function () { V.reviews.report(r.id).then(function () { ui.toast(t('reported'), 'success'); repBtn.disabled = true; }); });
        var card = h('div.card.card-pad',
          h('div.row-between', h('div.row', { style: { gap: '6px', alignItems: 'center' } }, h('strong', r.author), h('span.badge.badge-green.vb-badge', t('verifiedBuyer'))), h('div.row', { style: { gap: '6px', alignItems: 'center' } }, h('span.muted', U.relativeTime(r.createdAt, V.state.get('lang'))), repBtn)),
          ui.stars(r.rating, null, { showNum: false }), r.body ? h('p.mt-2', r.body) : null);
        card.querySelector('.vb-badge').hidden = true;
        V.reviews.verifiedPurchase(p.id, r.customerId).then(function (ok) { if (ok) card.querySelector('.vb-badge').hidden = false; });
        list.appendChild(card);
      });
      // form
      var starsInput = ui.starsInput(5);
      var bodyI = h('textarea.textarea', { placeholder: t('yourReview'), 'aria-label': t('yourReview'), rows: 3 });
      var submit = h('button.btn.btn-primary', { type: 'button' }, t('submitReview'));
      submit.addEventListener('click', function () {
        V.reviews.add({ productId: p.id, rating: starsInput.getValue(), body: bodyI.value }).then(function () {
          ui.toast(isAr() ? 'تم إرسال المراجعة وستظهر بعد المراجعة' : 'Review submitted and pending moderation', 'success');
          bodyI.value = '';
        });
      });
      list.appendChild(h('div.card.card-pad.mt-3', h('h3', t('writeReview')), h('div.mt-2', starsInput), h('div.mt-2', bodyI), h('div.mt-2', submit)));

      host.appendChild(h('div.reviews-grid', left, list));
    });
  }

  function breakdown(all) {
    var b = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    all.filter(function (r) { return r.status === 'approved'; }).forEach(function (r) { b[r.rating] = (b[r.rating] || 0) + 1; });
    return b;
  }

  V.pages = V.pages || {};
  V.pages.product = render;
})(window);
