/* ============================================================
   VENDORA — Components: storefront layout (topbar, header, nav,
   cart drawer, compare bar, footer, search, switchers)
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var h = V.h;
  var U = V.utils;
  var ui = V.ui;

  function t(k, vars) { return V.t(k, vars); }
  function lang() { return V.state.get('lang'); }
  function isAr() { return lang() === 'ar'; }

  var NAV = [
    { href: '/', key: 'navHome' },
    { href: '/offers', key: 'navOffers' },
    { href: '/new', key: 'navNew' },
    { href: '/best', key: 'navBest' },
    { href: '/brands', key: 'navBrands' },
    { href: '/guide', key: 'navGuide' },
    { href: '/trust', key: 'navTrust' }
  ];

  function logo() {
    return h('a.brand', { href: ui.href('/'), 'aria-label': t('appName') },
      h('img.brand-mark', { src: V.config.IMG.mark, alt: '', height: 44 }),
      h('span.brand-txt',
        h('span.bt-en', 'VENDORA'),
        h('span.bt-ar', isAr() ? 'فيندورا' : 'VENDORA')
      )
    );
  }

  /* ---------------- Header tools (market / language / theme) ----------------
     Compact pill controls shown in the header bar and repeated inside the
     mobile drawer. */
  function headerTools() {
    var marketSel = h('select.hd-select', { 'aria-label': t('market'), title: t('market') });
    V.markets.forEach(function (m) { marketSel.appendChild(h('option', { value: m.code, selected: V.state.get('market') === m.code }, m.flag + ' ' + (isAr() ? m.nameAr : m.nameEn) + ' (' + m.currency + ')')); });
    marketSel.addEventListener('change', function () { V.state.set('market', marketSel.value); ui.toast(isAr() ? 'تم تغيير السوق' : 'Market changed', 'success'); });

    var langBtn = h('button.hd-btn', { type: 'button', 'aria-label': t('language'), title: t('language') }, ui.icon('globe', 'icon-sm'), h('span', isAr() ? 'English' : 'عربي'));
    langBtn.addEventListener('click', function () { V.state.set('lang', isAr() ? 'en' : 'ar'); });

    var themeBtn = h('button.hd-btn', { type: 'button', 'aria-label': t('theme'), title: t('theme') }, ui.icon(V.state.get('theme') === 'dark' ? 'sun' : 'moon', 'icon-sm'), h('span', V.state.get('theme') === 'dark' ? (isAr() ? 'فاتح' : 'Light') : (isAr() ? 'داكن' : 'Dark')));
    themeBtn.addEventListener('click', function () { V.state.set('theme', V.state.get('theme') === 'dark' ? 'light' : 'dark'); });

    return h('div.header-tools', marketSel, langBtn, themeBtn);
  }

  /* ---------------- Mega menu (categories) ---------------- */
  function closeMega(root) {
    if (!root) return;
    var p = root.querySelector('.mega-panel'); if (p) p.hidden = true;
    var tr = root.querySelector('.mega-trigger');
    if (tr) { tr.classList.remove('open'); tr.setAttribute('aria-expanded', 'false'); }
  }

  function mega() {
    var cats = (V.catalog.categories && V.catalog.categories()) || V.categoriesSeed || [];
    var panel = h('div.mega-panel', { hidden: true });
    var list = h('ul.mega-cats');
    var detail = h('div.mega-detail');
    var trigger = h('button.mega-trigger', { type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false' },
      ui.icon('grid', 'icon-sm'), h('span', t('navCategories')), ui.icon('chevron-down', 'icon-sm'));
    var root = h('div.mega', trigger, panel);
    var rows = [];

    function paint(idx) {
      rows.forEach(function (r, i) { r.classList.toggle('on', i === idx); });
      V.clear(detail);
      var c = cats[idx]; if (!c) return;
      detail.appendChild(h('div.mega-media', h('img', { src: V.categoryImage(c), alt: V.loc(c, 'name'), loading: 'lazy' })));
      var subs = (c.subcategories || []).map(function (s) {
        return h('a.mega-sub', { href: ui.href('/category/' + c.slug + '?sub=' + s.slug) }, ui.icon('tag', 'icon-sm'), h('span', V.loc(s, 'name')));
      });
      detail.appendChild(h('div.mega-info',
        h('div.mega-info__head', h('h3', V.loc(c, 'name'))),
        h('p.mega-desc', V.loc(c, 'desc')),
        h('div.mega-subs', subs),
        h('a.btn.btn-gold.btn-sm.mega-all', { href: ui.href('/category/' + c.slug) }, t('viewAll'), ui.icon('arrow-' + (isAr() ? 'left' : 'right'), 'icon-sm'))
      ));
    }

    cats.forEach(function (c, i) {
      var row = h('a.mega-cat', { href: ui.href('/category/' + c.slug), style: { '--c': c.color || 'var(--gold)' } },
        h('span.mc-ico', ui.icon(c.icon || 'box', 'icon-sm')),
        h('span.mc-name', V.loc(c, 'name')),
        h('span.mc-count', String((c.subcategories || []).length) + ' ' + (isAr() ? 'فئة' : 'subs')),
        ui.icon('chevron-' + (isAr() ? 'left' : 'right'), 'icon-sm.mc-arrow')
      );
      row.addEventListener('mouseenter', function () { paint(i); });
      row.addEventListener('focus', function () { paint(i); });
      rows.push(row);
      list.appendChild(h('li', row));
    });

    function open() { panel.hidden = false; trigger.classList.add('open'); trigger.setAttribute('aria-expanded', 'true'); paint(0); }
    function close() { closeMega(root); }
    trigger.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (panel.hidden) open(); else close(); });
    root.addEventListener('mouseleave', function () { if (window.innerWidth > 900) close(); });

    panel.appendChild(h('div.container.mega-grid', list, detail));
    panel.appendChild(h('div.container.mega-foot', h('a', { href: ui.href('/products') }, ui.icon('grid', 'icon-sm'), h('span', t('allCategories')))));
    paint(0);
    return root;
  }

  /* ---------------- Header ----------------
     Two-row, fully-designed header:
       • row 1 (.hdr-main): logo • search • market/lang/theme tools • actions
       • row 2 (.hdr-nav) : category mega menu + الرئيسية، العروض، الأحدث،
         الأكثر مبيعًا، العلامات، الدليل، الثقة */
  function header() {
    var path = V.router.current ? V.router.current.path : '/';
    var nav = h('nav.main-nav', { 'aria-label': 'main' });
    nav.appendChild(mega());
    NAV.forEach(function (n) {
      var a = h('a', { href: ui.href(n.href) }, t(n.key));
      if (path === n.href) a.classList.add('active');
      nav.appendChild(a);
    });

    var menuToggle = h('button.menu-toggle', { type: 'button', 'aria-label': t('menu') }, ui.icon('menu'));
    menuToggle.addEventListener('click', openNav);

    var searchWrap = h('div.header-search', searchBox());

    var actions = h('div.header-actions');
    actions.appendChild(accountAction());
    actions.appendChild(hAction('heart', ui.href('/wishlist'), V.state.get('wishCount'), 'wishCount'));
    actions.appendChild(cartAction());

    var tools = h('div.hdr-right', headerTools(), actions, menuToggle);
    return h('div.hdr-inner',
      h('div.hdr-main', h('div.container', logo(), searchWrap, tools)),
      h('div.hdr-nav', h('div.container', nav))
    );
  }

  function hAction(iconName, link, count, badgeKey) {
    var a = h('a.h-action', { href: link, 'aria-label': iconName }, ui.icon(iconName));
    if (count) a.appendChild(h('span.count', { dataset: { badge: badgeKey } }, String(count)));
    return a;
  }

  function cartAction() {
    var btn = h('button.h-action', { type: 'button', 'aria-label': t('cart') }, ui.icon('cart'));
    var count = V.state.get('cartCount');
    if (count) btn.appendChild(h('span.count', { dataset: { badge: 'cartCount' } }, String(count)));
    btn.addEventListener('click', openCart);
    return btn;
  }

  function accountAction() {
    var user = V.state.get('user');
    if (user && user.type === 'customer') {
      var btn = h('button.h-action', { type: 'button', title: user.name }, ui.icon('user'));
      btn.addEventListener('click', function (e) { e.stopPropagation(); accountMenu(btn, user); });
      return btn;
    }
    return h('a.h-action', { href: ui.href('/login'), 'aria-label': t('signIn') }, ui.icon('user'));
  }

  function accountMenu(anchor, user) {
    var items = [
      { label: t('myAccount'), href: '/account' },
      { label: t('myOrders'), href: '/account/orders' },
      { label: t('wishlist'), href: '/wishlist' },
      { label: t('addresses'), href: '/account/addresses' },
      { label: t('logout'), action: 'logout' }
    ];
    var menu = h('div', { style: { position: 'absolute', zIndex: 60, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', minWidth: '190px', padding: '6px' } });
    var rect = anchor.getBoundingClientRect();
    menu.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    menu.style.insetInlineEnd = Math.max(8, (window.innerWidth - rect.right)) + 'px';
    items.forEach(function (it) {
      var b = h('button', { type: 'button', style: { display: 'block', width: '100%', textAlign: 'start', padding: '8px 10px', borderRadius: '8px' } }, it.label);
      b.addEventListener('click', function () {
        menu.remove();
        if (it.action === 'logout') { V.account.logout().then(function () { ui.toast(isAr() ? 'تم تسجيل الخروج' : 'Signed out', 'success'); location.hash = '/'; }); }
        else location.hash = it.href;
      });
      b.addEventListener('mouseenter', function () { b.style.background = 'var(--surface-2)'; });
      b.addEventListener('mouseleave', function () { b.style.background = 'transparent'; });
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    setTimeout(function () {
      function off(ev) { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', off); } }
      document.addEventListener('click', off);
    }, 0);
  }

  /* ---------------- Search ---------------- */
  function searchBox() {
    var input = h('input.input', { type: 'search', placeholder: t('searchPlaceholder'), 'aria-label': t('search'), autocomplete: 'off' });
    var clear = h('button.s-clear', { type: 'button', hidden: true, 'aria-label': t('clearFilters') }, ui.icon('close', 'icon-sm'));
    var wrap = h('div', { style: { position: 'relative', flex: '1 1 auto' } }, ui.icon('search', 'icon-sm s-ico'), input, clear);

    var box = h('div.suggest', { hidden: true });

    function close() { box.hidden = true; }
    function open(list) {
      V.clear(box);
      if (!list.length) { close(); return; }
      list.forEach(function (p) {
        var item = h('div.item', h('img', { src: p.primaryImage, alt: '' }), h('div.grow', h('div', V.loc(p, 'name')), h('div.muted', V.loc(p, 'brandName') + ' · ' + V.money(V.catalog.priceOf(p)))));
        item.addEventListener('click', function () { close(); input.value = ''; clear.hidden = true; location.hash = '/product/' + p.slug; });
        box.appendChild(item);
      });
      box.hidden = false;
    }
    var doSearch = U.debounce(function () {
      var q = input.value.trim();
      clear.hidden = !q;
      if (!q) { close(); return; }
      V.catalog.load().then(function () { open(V.catalog.suggest(q, 8)); });
    }, 160);
    input.addEventListener('input', doSearch);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && input.value.trim()) { close(); if (V.searchHistory) V.searchHistory.add(input.value.trim()); location.hash = '/search?q=' + encodeURIComponent(input.value.trim()); } });
    input.addEventListener('focus', function () { if (input.value.trim()) doSearch(); });
    clear.addEventListener('click', function () { input.value = ''; clear.hidden = true; close(); });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) close(); });
    wrap._input = input;
    return wrap;
  }

  /* ---------------- Category strip ---------------- */
  function catStrip() {
    var strip = h('div.container.row.cs-strip');
    strip.appendChild(h('a.cs-all', { href: ui.href('/products') }, ui.icon('grid', 'icon-sm'), h('span', t('allCategories'))));
    (V.catalog.categories() || []).forEach(function (c) {
      var subs = c.subcategories || [];
      if (!subs.length) {
        strip.appendChild(h('a.cs-cat', { href: ui.href('/category/' + c.slug) }, h('span', V.loc(c, 'name'))));
        return;
      }
      var drop = h('div.cs-drop',
        h('div.cs-drop__head', V.loc(c, 'name')),
        h('div.cs-drop__list', subs.map(function (s) {
          return h('a', { href: ui.href('/category/' + c.slug + '?sub=' + s.slug) }, h('span', V.loc(s, 'name')));
        })),
        h('a.cs-drop__all', { href: ui.href('/category/' + c.slug) }, t('viewAll'), ui.icon('arrow-' + (isAr() ? 'left' : 'right'), 'icon-sm'))
      );
      strip.appendChild(h('div.cs-item',
        h('a.cs-cat', { href: ui.href('/category/' + c.slug) }, h('span', V.loc(c, 'name')), ui.icon('chevron-down', 'icon-sm')),
        drop
      ));
    });
    return strip;
  }

  /* ---------------- Nav drawer ---------------- */
  function navDrawer() {
    var user = V.state.get('user');
    var nav = h('nav');
    NAV.forEach(function (n) { nav.appendChild(h('a', { href: ui.href(n.href) }, t(n.key))); });
    nav.appendChild(h('div.divider'));
    nav.appendChild(h('div.dw-title', t('allCategories')));
    (V.catalog.categories() || []).forEach(function (c) {
      var subs = c.subcategories || [];
      if (!subs.length) {
        nav.appendChild(h('a', { href: ui.href('/category/' + c.slug) }, ui.icon(c.icon || 'box', 'icon-sm'), h('span', V.loc(c, 'name'))));
        return;
      }
      var subWrap = h('div.dw-subs', { hidden: true }, subs.map(function (s) {
        return h('a', { href: ui.href('/category/' + c.slug + '?sub=' + s.slug) }, h('span', V.loc(s, 'name')));
      }));
      var btn = h('button.dw-cat', { type: 'button' },
        ui.icon(c.icon || 'box', 'icon-sm'),
        h('span.grow', V.loc(c, 'name')),
        ui.icon('chevron-down', 'icon-sm')
      );
      btn.addEventListener('click', function () { subWrap.hidden = !subWrap.hidden; btn.classList.toggle('open', !subWrap.hidden); });
      nav.appendChild(btn);
      nav.appendChild(subWrap);
    });
    nav.appendChild(h('div.divider'));
    nav.appendChild(h('a', { href: ui.href('/compare') }, t('navCompare')));
    nav.appendChild(h('a', { href: ui.href('/about') }, t('navAbout')));
    nav.appendChild(h('a', { href: ui.href('/contact') }, t('navContact')));
    if (!user || user.type !== 'customer') nav.appendChild(h('a', { href: ui.href('/login') }, t('signIn')));
    nav.appendChild(h('div.divider'));
    nav.appendChild(h('div.dw-title', t('settings')));
    nav.appendChild(h('div.dw-tools', headerTools()));
    return h('div',
      h('div.d-head.row-between', h('strong', t('appName')), h('button.btn.btn-ghost.btn-icon', { type: 'button', 'aria-label': t('close') }, ui.icon('close'))),
      nav
    );
  }

  function openNav() { var d = V.el('#nav-drawer'), b = V.el('#drawer-backdrop'); if (!d) return; V.clear(d).appendChild(navDrawer()); d.classList.add('open'); b.classList.add('open'); b.hidden = false; }
  function closeNav() { var d = V.el('#nav-drawer'), b = V.el('#drawer-backdrop'); if (d) d.classList.remove('open'); if (b) { b.classList.remove('open'); b.hidden = true; } }

  /* ---------------- Cart drawer ---------------- */
  function cartDrawer() {
    var totals = V.cart.totals();
    var lines = h('div.cart-lines');
    if (!totals.lines.length) {
      lines = ui.empty({ image: V.config.IMG.emptyCart, title: t('cartEmpty'), text: isAr() ? 'تصفّح المنتجات وأضف ما تحب.' : 'Browse products and add what you like.', action: h('a.btn.btn-primary', { href: ui.href('/products') }, t('continueShopping')) });
    } else {
      totals.lines.forEach(function (l) {
        var rm = h('button.btn.btn-ghost.btn-icon', { type: 'button', 'aria-label': t('remove') }, ui.icon('trash', 'icon-sm'));
        rm.addEventListener('click', function () { V.cart.remove(l.productId).then(function () { ui.toast(t('removedFromCart'), 'success'); refreshCartDrawer(); }); });
        var step = ui.qty(l.qty, function (v) { V.cart.setQty(l.productId, v).then(refreshCartDrawer); }, V.catalog.stockOf(l.product));
        lines.appendChild(h('div.cart-line',
          h('img', { src: l.product.primaryImage, alt: '' }),
          h('div.cl-body',
            h('a.cl-title', { href: ui.href('/product/' + l.product.slug) }, V.loc(l.product, 'name')),
            h('div.row-between', step, h('strong', V.money(l.lineTotal)))
          ),
          rm
        ));
      });
    }
    var foot = h('div.cart-foot',
      h('div.summary-row', h('span', t('subtotal')), h('strong', V.money(totals.subtotal))),
      totals.discount ? h('div.summary-row', h('span', t('discount')), h('strong', '-' + V.money(totals.discount))) : null,
      h('div.summary-row', h('span', t('shipping')), h('strong', totals.shipping ? V.money(totals.shipping) : t('trustCod'))),
      h('div.summary-row.total', h('span', t('total')), h('strong', V.money(totals.total))),
      h('div.mt-4.stack',
        h('a.btn.btn-primary.btn-block', { href: ui.href('/checkout') }, t('checkout')),
        h('button.btn.btn-outline.btn-block', { type: 'button' }, t('continueShopping'))
      )
    );
    foot.querySelector('.btn-outline').addEventListener('click', closeCart);
    return h('div',
      h('div.d-head.row-between', h('strong', t('cartTitle') + ' (' + totals.count + ')'), h('button.btn.btn-ghost.btn-icon', { type: 'button', 'aria-label': t('close') }, ui.icon('close'))),
      lines, totals.lines.length ? foot : null
    );
  }
  function refreshCartDrawer() { var d = V.el('#cart-drawer'); if (d && d.classList.contains('open')) { V.clear(d).appendChild(cartDrawer()); wireDrawerClose(d); } updateBadges(); }
  function openCart() { var d = V.el('#cart-drawer'), b = V.el('#drawer-backdrop'); V.clear(d).appendChild(cartDrawer()); wireDrawerClose(d); d.classList.add('open'); b.classList.add('open'); b.hidden = false; }
  function closeCart() { var d = V.el('#cart-drawer'), b = V.el('#drawer-backdrop'); if (d) d.classList.remove('open'); if (b) { b.classList.remove('open'); b.hidden = true; } }
  function wireDrawerClose(host) { var btn = host.querySelector('.d-head .btn'); if (btn) btn.addEventListener('click', closeCart); }

  /* ---------------- Compare bar ---------------- */
  function compareBar() {
    var ids = V.compare.ids();
    var bar = V.el('#compare-bar');
    if (!bar) return;
    if (!ids.length) { bar.classList.remove('open'); return; }
    V.clear(bar);
    var items = h('div.items');
    ids.forEach(function (id) {
      var p = V.catalog.get(id); if (!p) return;
      var rm = ui.icon('close', 'icon-sm');
      var ci = h('div.ci', h('img', { src: p.primaryImage, alt: '' }), h('span.nowrap', V.loc(p, 'name').slice(0, 16)), rm);
      rm.addEventListener('click', function () { V.compare.toggle(id); compareBar(); });
      items.appendChild(ci);
    });
    bar.appendChild(h('div.container.row-between',
      items,
      h('div.row',
        h('a.btn.btn-gold.btn-sm', { href: ui.href('/compare') }, t('compareNow')),
        h('button.btn.btn-ghost.btn-sm', { type: 'button' }, t('clearCompare'))
      )
    ));
    bar.querySelector('.btn-ghost').addEventListener('click', function () { V.compare.clear(); compareBar(); });
    bar.classList.add('open');
  }

  /* ---------------- Footer ---------------- */
  function footer() {
    var social = h('div.footer-social',
      h('a', { href: '#', 'aria-label': 'Facebook', title: 'Facebook' }, ui.icon('facebook')),
      h('a', { href: '#', 'aria-label': 'Instagram', title: 'Instagram' }, ui.icon('instagram')),
      h('a', { href: '#', 'aria-label': 'Twitter', title: 'Twitter' }, ui.icon('twitter')),
      h('a', { href: '#', 'aria-label': 'WhatsApp', title: 'WhatsApp' }, ui.icon('whatsapp'))
    );

    var brand = h('div.footer-brand',
      h('a.brand.footer-brand__logo', { href: ui.href('/'), 'aria-label': t('appName') },
        h('img.brand-mark', { src: V.config.IMG.logoLight, alt: '', height: 46 }),
        h('span.brand-txt', h('span.bt-en', 'VENDORA'), h('span.bt-ar', isAr() ? 'فيندورا' : 'VENDORA'))
      ),
      h('p.footer-about', t('footerAbout')),
      h('div.footer-social__label', t('followUs')),
      social
    );

    var groups = [
      { title: t('quickLinks'), items: [{ l: t('navHome'), h: '/' }, { l: t('navOffers'), h: '/offers' }, { l: t('navNew'), h: '/new' }, { l: t('navBest'), h: '/best' }, { l: t('navBrands'), h: '/brands' }, { l: t('navCategories'), h: '/products' }] },
      { title: t('customerService'), items: [{ l: t('navGuide'), h: '/guide' }, { l: t('navTrust'), h: '/trust' }, { l: t('faqTitle'), h: '/faq' }, { l: t('navContact'), h: '/contact' }, { l: t('trackOrderTitle'), h: '/track' }, { l: t('wishlist'), h: '/wishlist' }] },
      { title: t('policies'), items: [{ l: t('privacyTitle'), h: '/page/privacy' }, { l: t('termsTitle'), h: '/page/terms' }, { l: t('shippingPolicyTitle'), h: '/page/shipping' }, { l: t('returnsPolicyTitle'), h: '/page/returns' }, { l: t('aboutTitle'), h: '/about' }] }
    ];

    var contact = h('div.footer-contact',
      h('h4', t('getInTouch')),
      h('a.fc-row', { href: 'tel:+967700000000' }, h('span.fc-ico', ui.icon('phone', 'icon-sm')), h('span', '+967 700 000 000')),
      h('a.fc-row', { href: 'mailto:support@vendora.local' }, h('span.fc-ico', ui.icon('mail', 'icon-sm')), h('span', 'support@vendora.local')),
      h('div.fc-row', h('span.fc-ico', ui.icon('map-pin', 'icon-sm')), h('span', isAr() ? 'صنعاء، الجمهورية اليمنية' : 'Sanaa, Yemen')),
      h('div.fc-row', h('span.fc-ico', ui.icon('clock', 'icon-sm')), h('span', t('workingHoursValue')))
    );

    var main = h('div.footer-main',
      brand,
      groups.map(function (g) {
        return h('div.footer-col', h('h4', g.title), h('ul', g.items.map(function (it) { return h('li', h('a', { href: ui.href(it.h) }, it.l)); })));
      }),
      contact
    );

    var input = h('input.input', { type: 'email', placeholder: t('enterEmail'), 'aria-label': t('email') });
    var subBtn = h('button.btn.btn-gold', { type: 'button' }, t('subscribe'));
    subBtn.addEventListener('click', function () {
      var v = input.value.trim();
      if (!v || v.indexOf('@') === -1) { ui.toast(t('fieldsRequired'), 'error'); return; }
      input.value = ''; ui.toast(t('subscribed'), 'success');
    });
    var news = h('div.footer-cta',
      h('div.footer-cta__text', h('h3', t('newsletterTitle')), h('p', t('newsletterHint'))),
      h('div.footer-cta__form', input, subBtn)
    );

    var bottom = h('div.footer-bottom.row-between',
      h('span.footer-copy', '© ' + new Date().getFullYear() + ' ' + t('appName') + ' — ' + t('allRights')),
      h('div.footer-pay',
        h('span.badge.badge-green', ui.icon('wallet', 'icon-sm'), t('paymentOnDelivery')),
        h('span.badge.badge-outline', ui.icon('repeat', 'icon-sm'), t('trustReturns'))
      )
    );

    return h('div.footer-inner',
      h('div.container', news),
      h('div.container', main),
      h('div.footer-bottom-wrap', h('div.container', bottom))
    );
  }

  /* ---------------- Badges ---------------- */
  function updateBadges() {
    var vals = { cartCount: V.state.get('cartCount'), wishCount: V.state.get('wishCount') };
    V.els('[data-badge]').forEach(function (el) {
      var v = vals[el.dataset.badge];
      if (v) { el.textContent = String(v); el.hidden = false; } else { el.textContent = ''; el.hidden = true; }
    });
  }

  /* ---------------- Mount / rebuild ---------------- */
  function renderHeader() { var el = V.el('#site-header'); if (el) { V.clear(el); el.appendChild(header()); } }
  function renderTopbar() { renderHeader(); }
  function renderCatStrip() { var el = V.el('#cat-strip'); if (el) { V.clear(el); el.appendChild(catStrip()); } }
  function renderFooter() { var el = V.el('#site-footer'); if (el) { V.clear(el); el.appendChild(footer()); } }

  function renderAll() { renderHeader(); renderCatStrip(); renderFooter(); updateBadges(); compareBar(); }

  function mount() {
    var backdrop = V.el('#drawer-backdrop');
    if (backdrop) backdrop.addEventListener('click', function () { closeNav(); closeCart(); });
    function closeSearchPanel() {
      var panel = V.el('.hdr-search-panel');
      var tg = V.el('.hdr-search-toggle');
      if (panel) panel.hidden = true;
      if (tg) tg.classList.remove('active');
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') { closeSearchPanel(); closeNav(); closeCart(); V.els('.mega').forEach(closeMega); }
    });
    document.addEventListener('click', function (ev) {
      var panel = V.el('.hdr-search-panel');
      if (panel && !panel.hidden) {
        var tg = V.el('.hdr-search-toggle');
        if (!panel.contains(ev.target) && !(tg && tg.contains(ev.target))) closeSearchPanel();
      }
    });
    document.addEventListener('click', function (ev) { V.els('.mega').forEach(function (r) { if (!r.contains(ev.target)) closeMega(r); }); });
    renderAll();
    V.bus.on('cart:changed', function () { updateBadges(); refreshCartDrawer(); });
    V.bus.on('wishlist:changed', updateBadges);
    V.bus.on('compare:changed', compareBar);
    V.bus.on('auth:changed', function () { renderHeader(); });
    V.bus.on('route:change', function () { renderHeader(); renderCatStrip(); });
    V.bus.on('state:lang', function () { renderHeader(); renderCatStrip(); renderFooter(); });
    V.bus.on('state:theme', function () { renderHeader(); });
    V.bus.on('state:market', function () { renderHeader(); });
  }

  V.layout = {
    mount: mount, renderAll: renderAll, renderHeader: renderHeader, renderTopbar: renderTopbar, renderFooter: renderFooter,
    openNav: openNav, closeNav: closeNav, openCart: openCart, closeCart: closeCart, updateBadges: updateBadges, compareBar: compareBar
  };
})(window);
