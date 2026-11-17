/* ============================================================
   VENDORA — Components: shared UI kit
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var h = V.h;
  var U = V.utils;

  function icon(name, cls) { return V.svg(name, cls); }
  function t(k, vars) { return V.t(k, vars); }

  function href(path) { return '#' + path; }
  function go(path) { location.hash = path; }

  /* ---------------- Stars ---------------- */
  function stars(rating, count, opts) {
    opts = opts || {};
    var wrap = h('span.rating', { title: rating + ' / 5' });
    for (var i = 1; i <= 5; i++) {
      var s = icon('star', 'icon-sm star' + (i <= Math.round(rating) ? ' on' : ''));
      wrap.appendChild(s);
    }
    if (opts.showNum !== false) wrap.appendChild(h('span.num', String(rating || 0)));
    if (count != null) wrap.appendChild(h('span.muted', '(' + U.formatNumber(count, V.state.get('lang')) + ')'));
    return wrap;
  }

  function starsInput(value, onChange) {
    var wrap = h('span.stars-input');
    var current = value || 5;
    function paint(v) { V.els('.star', wrap); Array.prototype.forEach.call(wrap.children, function (c, idx) { c.classList.toggle('on', idx < v); }); }
    for (var i = 1; i <= 5; i++) {
      (function (n) {
        var s = icon('star', 'icon-lg star' + (n <= current ? ' on' : ''));
        s.setAttribute('role', 'radio');
        s.addEventListener('click', function () { current = n; paint(n); if (onChange) onChange(n); });
        wrap.appendChild(s);
      })(i);
    }
    wrap.getValue = function () { return current; };
    return wrap;
  }

  /* ---------------- Price ---------------- */
  function price(p) {
    var now = V.catalog.priceOf(p);
    var old = V.catalog.compareAtOf(p);
    var isSale = old && old > now;
    var box = h('span.price' + (isSale ? '.sale' : ''));
    box.appendChild(h('span.now', V.money(now)));
    if (isSale) box.appendChild(h('span.old', V.money(old)));
    return box;
  }

  function discountBadge(p) {
    var pct = V.catalog.discountPct(p);
    if (!pct) return null;
    return h('span.badge.badge-danger', '-' + pct + '%');
  }

  /* ---------------- Product card ---------------- */
  function pcard(p, opts) {
    opts = opts || {};
    var out = !V.catalog.isInStock(p);
    var low = V.catalog.isLow(p);
    var wish = V.wishlist.has(p.id);

    var badges = h('div.pcard-badges');
    if (out) badges.appendChild(h('span.badge.badge-navy', t('outOfStock')));
    else if (p.isNew) badges.appendChild(h('span.badge.badge-gold', t('navNew')));
    else if (low) badges.appendChild(h('span.badge.badge-warn', t('lowStock')));
    var db = discountBadge(p); if (db) badges.appendChild(db);

    var wishBtn = h('button.pcard-wish' + (wish ? '.active' : ''), { type: 'button', title: t('addToWishlist'), 'aria-label': t('addToWishlist') }, icon('heart', 'icon-sm'));
    wishBtn.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      V.wishlist.toggle(p.id).then(function () {
        var on = V.wishlist.has(p.id);
        wishBtn.classList.toggle('active', on);
        toast(on ? t('addedToWishlist') : t('removedFromWishlist'), 'success');
      });
    });

    var quick = h('div.pcard-quick',
      h('button.btn.btn-gold.btn-sm', { type: 'button' }, icon('cart', 'icon-sm'), h('span', t('addToCart')))
    );
    quick.firstChild.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); quickAdd(p, quick.firstChild); });

    var media = h('a.pcard-media', { href: href('/product/' + p.slug) },
      h('img', { src: p.primaryImage, alt: V.loc(p, 'name'), loading: 'lazy' }),
      badges, wishBtn, quick, out ? h('div.pcard-media__out') : null
    );

    var body = h('div.pcard-body',
      h('a.pcard-cat', { href: href('/category/' + p.categorySlug) }, V.loc(p, 'categoryName')),
      h('a.pcard-title', { href: href('/product/' + p.slug) }, V.loc(p, 'name')),
      stars(p.rating, p.ratingCount),
      h('div.pcard-foot', price(p),
        h('button.btn.btn-outline.btn-sm.btn-icon', { type: 'button', title: t('addToCart'), 'aria-label': t('addToCart'), disabled: out },
          icon('cart', 'icon-sm'))
      )
    );
    body.querySelector('.pcard-foot .btn').addEventListener('click', function () { quickAdd(p, this); });

    var card = h('article.pcard', { dataset: { id: p.id } }, media, body);
    return card;
  }

  function quickAdd(p, btn) {
    V.cart.add(p.id, 1).then(function () {
      toast(t('addedToCart'), 'success');
      if (btn) { var old = btn.innerHTML; btn.classList.add('added'); }
    }).catch(function (e) { toast(t(e.message === 'out_of_stock' ? 'outOfStock' : 'error'), 'error'); });
  }

  /* ---------------- Category tile ---------------- */
  function catTile(c, counts) {
    var n = counts && counts[c.slug] != null ? counts[c.slug] : c.productCount;
    return h('a.cat-tile', { href: href('/category/' + c.slug), style: { '--accent': c.color || 'var(--gold)' } },
      h('img', { src: V.categoryImage(c), alt: V.loc(c, 'name'), loading: 'lazy' }),
      h('div.ct-name', V.loc(c, 'name')),
      n != null ? h('div.muted', U.formatNumber(n, V.state.get('lang')) + ' ' + (V.state.get('lang') === 'ar' ? 'منتج' : 'items')) : null
    );
  }

  /* ---------------- Breadcrumb ---------------- */
  function breadcrumb(items) {
    var nav = h('nav.breadcrumb', { 'aria-label': 'breadcrumb' });
    items.forEach(function (it, i) {
      if (i > 0) nav.appendChild(h('span.sep', '/'));
      if (it.href) nav.appendChild(h('a', { href: href(it.href) }, it.label));
      else nav.appendChild(h('span', it.label));
    });
    return nav;
  }

  /* ---------------- Pagination ---------------- */
  function pagination(total, page, pages, onGo) {
    if (pages <= 1) return null;
    var wrap = h('div.pagination');
    function btn(label, p, opts) {
      opts = opts || {};
      var b = h('button', { type: 'button' }, label);
      if (opts.active) b.className = 'active';
      if (opts.disabled) b.disabled = true;
      b.addEventListener('click', function () { if (!opts.disabled && !opts.active) onGo(p); });
      return b;
    }
    wrap.appendChild(btn('‹', page - 1, { disabled: page <= 1 }));
    var start = Math.max(1, page - 2), end = Math.min(pages, start + 4);
    start = Math.max(1, end - 4);
    if (start > 1) { wrap.appendChild(btn('1', 1, { active: page === 1 })); if (start > 2) wrap.appendChild(h('span.muted', '…')); }
    for (var i = start; i <= end; i++) wrap.appendChild(btn(String(i), i, { active: i === page }));
    if (end < pages) { if (end < pages - 1) wrap.appendChild(h('span.muted', '…')); wrap.appendChild(btn(String(pages), pages, { active: page === pages })); }
    wrap.appendChild(btn('›', page + 1, { disabled: page >= pages }));
    return wrap;
  }

  /* ---------------- Empty state ---------------- */
  function empty(opts) {
    opts = opts || {};
    return h('div.empty',
      opts.image ? h('img', { src: opts.image, alt: '' }) : (opts.icon ? icon(opts.icon, 'icon-lg') : null),
      h('h3', opts.title || t('noData')),
      opts.text ? h('p.muted', opts.text) : null,
      opts.action ? h('div.mt-4', opts.action) : null
    );
  }

  /* ---------------- Section head ---------------- */
  function sectionHead(title, opts) {
    opts = opts || {};
    var head = h('div.section-head',
      h('div', opts.eyebrow ? h('div.eyebrow', opts.eyebrow) : null, h('h2', title)),
      opts.link ? h('a.btn.btn-ghost', { href: href(opts.link.href) }, opts.link.label, icon('arrow-right', 'icon-sm')) : null
    );
    return head;
  }

  /* ---------------- Spinner / skeleton ---------------- */
  function spinner(label) { return h('div.empty', h('div.spinner'), h('p.muted', label || t('loading'))); }
  function skeleton(n) {
    var wrap = h('div.product-grid');
    for (var i = 0; i < (n || 8); i++) wrap.appendChild(h('div.pcard', h('div.skeleton', { style: { height: '230px' } }), h('div.pcard-body', h('div.skeleton', { style: { height: '14px', margin: '8px 0' } }), h('div.skeleton', { style: { height: '14px', width: '60%' } }))));
    return wrap;
  }

  /* ---------------- Qty stepper ---------------- */
  function qty(value, onChange, max) {
    var input = h('input', { type: 'text', inputmode: 'numeric', 'aria-label': t('qty'), value: String(value || 1) });
    function clampVal(v) { v = parseInt(v, 10) || 1; if (v < 1) v = 1; if (max != null && v > max) v = max; return v; }
    function set(v) { v = clampVal(v); input.value = v; if (onChange) onChange(v); }
    var dec = h('button', { type: 'button', 'aria-label': '-' }, icon('minus', 'icon-sm'));
    var inc = h('button', { type: 'button', 'aria-label': '+' }, icon('plus', 'icon-sm'));
    dec.addEventListener('click', function () { set((parseInt(input.value, 10) || 1) - 1); });
    inc.addEventListener('click', function () { set((parseInt(input.value, 10) || 1) + 1); });
    input.addEventListener('change', function () { set(input.value); });
    var wrap = h('div.qty', dec, input, inc);
    wrap.setValue = set; wrap.getValue = function () { return parseInt(input.value, 10) || 1; };
    return wrap;
  }

  /* ---------------- Tabs ---------------- */
  function tabs(items) {
    var nav = h('div.tabs');
    var panels = [];
    items.forEach(function (it, i) {
      var b = h('button.tab' + (i === 0 ? '.active' : ''), { type: 'button' }, it.label);
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(nav.children, function (c) { c.classList.remove('active'); });
        b.classList.add('active');
        panels.forEach(function (p, idx) { p.classList.toggle('hidden', idx !== i); });
      });
      nav.appendChild(b);
      panels.push(it.panel);
    });
    var body = h('div.mt-4'); panels.forEach(function (p) { body.appendChild(p); });
    return h('div', nav, body);
  }

  /* ---------------- Accordion ---------------- */
  function accordion(items) {
    var wrap = h('div');
    items.forEach(function (it, i) {
      var item = h('div.acc-item' + (i === 0 ? '.open' : ''));
      var head = h('button.acc-head', { type: 'button' }, h('span', it.q), icon('chevron-down', 'icon-sm'));
      var body = h('div.acc-body', it.a);
      head.addEventListener('click', function () { item.classList.toggle('open'); });
      item.appendChild(head); item.appendChild(body); wrap.appendChild(item);
    });
    return wrap;
  }

  /* ---------------- Alert ---------------- */
  function alert(msg, type) {
    return h('div.alert' + (type ? '.alert-' + type : '.alert-info'), { role: 'alert' }, icon(type === 'danger' ? 'alert' : type === 'success' ? 'check-circle' : 'info', 'icon-sm'), h('span', msg));
  }

  /* ---------------- Toast ---------------- */
  function toastHost() { var el = V.el('#toast-host'); if (!el) { el = h('div.toast-host'); el.id = 'toast-host'; document.body.appendChild(el); } return el; }
  function toast(msg, type, title) {
    var host = toastHost();
    var el = h('div.toast' + (type ? '.' + type : ''),
      h('div.t-title', title || (type === 'error' ? t('error') : type === 'success' ? t('success') : t('appName'))),
      h('div.t-msg', msg)
    );
    host.appendChild(el);
    setTimeout(function () { el.classList.add('hide'); setTimeout(function () { el.remove(); }, 350); }, 3200);
    return el;
  }

  /* ---------------- Modal ---------------- */
  function modalHost() { var el = V.el('#modal-host'); if (!el) { el = h('div.modal-host', { hidden: true }); el.id = 'modal-host'; document.body.appendChild(el); } return el; }
  function modal(content, opts) {
    opts = opts || {};
    var host = modalHost();
    var box = h('div.modal' + (opts.size ? '.' + opts.size : ''),
      opts.title ? h('div.modal-head', h('h3', opts.title), h('button.btn.btn-ghost.btn-icon', { type: 'button', 'aria-label': t('close') }, icon('close', 'icon-sm'))) : null,
      h('div.modal-body', content),
      opts.footer ? h('div.modal-foot', opts.footer) : null
    );
    var backdrop = h('div.backdrop');
    V.clear(host); host.appendChild(backdrop); host.appendChild(box); host.hidden = false;
    function close() { host.hidden = true; V.clear(host); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    backdrop.addEventListener('click', close);
    var closeBtn = box.querySelector('.modal-head .btn'); if (closeBtn) closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    return { el: box, close: close };
  }

  function confirm(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var foot = h('div.row-between',
        h('button.btn.btn-ghost', { type: 'button' }, t('cancel')),
        h('button.btn.btn-danger', { type: 'button' }, opts.confirmLabel || t('confirm'))
      );
      var m = modal(h('p', opts.text || t('confirmDelete')), { title: opts.title || t('confirm'), size: 'sm', footer: foot });
      foot.children[0].addEventListener('click', function () { m.close(); resolve(false); });
      foot.children[1].addEventListener('click', function () { m.close(); resolve(true); });
    });
  }

  /* ---------------- Rating bars ---------------- */
  function ratingBars(stats) {
    var wrap = h('div.stack');
    for (var s = 5; s >= 1; s--) {
      var c = (stats.breakdown && stats.breakdown[s]) || 0;
      var pct = stats.count ? Math.round((c / stats.count) * 100) : 0;
      wrap.appendChild(h('div.row', h('span.nowrap', s + ' ★'), h('div.bar.grow', h('span', { style: { width: pct + '%' } })), h('span.muted.nowrap', String(c))));
    }
    return wrap;
  }

  V.ui = {
    icon: icon, href: href, go: go, stars: stars, starsInput: starsInput, price: price, discountBadge: discountBadge,
    pcard: pcard, catTile: catTile, breadcrumb: breadcrumb, pagination: pagination, empty: empty,
    sectionHead: sectionHead, spinner: spinner, skeleton: skeleton, qty: qty, tabs: tabs, accordion: accordion,
    alert: alert, toast: toast, modal: modal, confirm: confirm, ratingBars: ratingBars
  };
})(window);
