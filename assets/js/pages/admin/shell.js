/* ============================================================
   VENDORA — Admin: shell (login, sidebar, topbar, helpers)
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var h = V.h;
  var ui = V.ui;
  var U = V.utils;

  function t(k, v) { return V.t(k, v); }
  function isAr() { return V.state.get('lang') === 'ar'; }

  var APAGES = V.apages = V.apages || {};

  /* ---------------- Navigation ---------------- */
  var NAV = [
    { group: 'overview', items: [
      { to: '/', label: 'dashboard', icon: 'dashboard', perm: 'dashboard' }
    ]},
    { group: 'catalog', items: [
      { to: '/products', label: 'products', icon: 'box', perm: 'products.view' },
      { to: '/categories', label: 'categories', icon: 'tag', perm: 'categories.edit' },
      { to: '/brands', label: 'brands', icon: 'store', perm: 'brands.edit' },
      { to: '/inventory', label: 'inventory', icon: 'layers', perm: 'inventory.view' },
      { to: '/reviews', label: 'reviews', icon: 'star', perm: 'reviews.moderate' }
    ]},
    { group: 'sales', items: [
      { to: '/orders', label: 'orders', icon: 'receipt', perm: 'orders.view' },
      { to: '/returns', label: 'returns', icon: 'refresh', perm: 'returns.edit' },
      { to: '/customers', label: 'customers', icon: 'users', perm: 'customers.view' }
    ]},
    { group: 'marketing', items: [
      { to: '/coupons', label: 'coupons', icon: 'percent', perm: 'coupons.edit' },
      { to: '/content', label: 'content', icon: 'edit', perm: 'content.edit' }
    ]},
    { group: 'system', items: [
      { to: '/staff', label: 'staff', icon: 'key', perm: 'staff.edit' },
      { to: '/settings', label: 'settings', icon: 'settings', perm: 'settings.edit' },
      { to: '/audit', label: 'audit', icon: 'clock', perm: 'audit.view' }
    ]}
  ];

  function permittedItems(role) {
    return NAV.map(function (g) {
      return { group: g.group, items: g.items.filter(function (it) { return V.perms.can(role, it.perm); }) };
    }).filter(function (g) { return g.items.length; });
  }

  /* ---------------- Shared helpers ---------------- */
  function field(label, input) { return h('label.field', h('span.f-label', label), input); }
  function statusBadge(status) {
    var map = { PENDING: 'badge-gold', CONFIRMED: 'badge-green', PROCESSING: 'badge-green', SHIPPED: 'badge-green', DELIVERED: 'badge-green', CANCELLED: 'badge-danger', RETURN_REQUESTED: 'badge-gold', RETURNED: 'badge-danger', REFUNDED: 'badge-danger' };
    return h('span.badge' + (map[status] ? '.' + map[status] : ''), t('st_' + status));
  }
  function roleName(role) { var r = V.roles[role]; return r ? (isAr() ? r.ar : r.en) : role; }

  var adminUI = {
    field: field,
    statusBadge: statusBadge,
    roleName: roleName,
    title: function (text, actions) {
      return h('div.admin-page.row-between.wrap', { style: { gap: 'var(--s3)' } }, h('h2.ap-title', { style: { margin: 0 } }, text), actions ? h('div.row', { style: { gap: '8px' } }, actions) : null);
    },
    table: function (head, rows) {
      var thead = h('thead', h('tr', head.map(function (c) { return h('th', c); })));
      var tbody = h('tbody');
      if (!rows.length) tbody.appendChild(h('tr', h('td', { colspan: head.length }, h('div.muted', { style: { padding: 'var(--s4)', textAlign: 'center' } }, t('noData')))));
      else rows.forEach(function (r) { tbody.appendChild(h('tr', r.map(function (c) { return h('td', c); }))); });
      return h('div.table-wrap', h('table.data-table', thead, tbody));
    },
    toolbar: function (kids) { return h('div.admin-toolbar', kids); },
    search: function (placeholder, onInput) {
      var i = h('input.input.search', { placeholder: placeholder || t('search'), type: 'search' });
      i.addEventListener('input', function () { onInput(i.value); });
      return i;
    },
    formModal: function (title, content, onSubmit, opts) {
      opts = opts || {};
      var save = h('button.btn.btn-gold', { type: 'button' }, opts.saveLabel || t('save'));
      var cancel = h('button.btn.btn-ghost', { type: 'button' }, t('cancel'));
      var m = ui.modal(content, { title: title, size: opts.size, footer: h('div.row-between', cancel, save) });
      cancel.addEventListener('click', function () { m.close(); });
      save.addEventListener('click', function () {
        var r = onSubmit();
        if (r === false || r == null) return;
        if (r && typeof r.then === 'function') { save.disabled = true; r.then(function () { m.close(); }, function () { save.disabled = false; }); }
        else m.close();
      });
      return m;
    }
  };
  V.adminUI = adminUI;

  /* ---------------- Login ---------------- */
  function mountLogin() {
    var root = V.el('#admin-root');
    var userI = h('input.input', { placeholder: t('username'), autocomplete: 'username' });
    var passI = h('input.input', { type: 'password', placeholder: t('password'), autocomplete: 'current-password' });
    var msg = h('div.muted', { style: { minHeight: '18px', color: 'var(--danger)' } });
    var btn = h('button.btn.btn-gold.btn-block.btn-lg.mt-2', { type: 'button' }, ui.icon('login', 'icon-sm'), ' ' + t('staffLogin'));

    function submit() {
      if (!userI.value.trim()) { msg.textContent = t('fieldsRequired'); return; }
      btn.disabled = true; msg.textContent = '';
      V.account.staffLogin(userI.value, passI.value).then(function () {
        // auth:changed → app.refresh()
      }).catch(function () { btn.disabled = false; msg.textContent = t('invalidCredentials'); });
    }
    btn.addEventListener('click', submit);
    passI.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    userI.addEventListener('keydown', function (e) { if (e.key === 'Enter') passI.focus(); });

    var card = h('div.login-card',
      h('div.brand', h('img.brand-mark', { src: 'assets/logos/vendora-mark-navy.png', alt: 'VENDORA' }), h('span', 'VENDORA')),
      h('h2.mt-3', t('staffLogin')),
      h('p.muted', t('staffArea')),
      h('div.mt-4', field(t('username'), userI), field(t('password'), passI), msg, btn),
      h('div.alert.alert-info.mt-4', ui.icon('info', 'icon-sm'), h('span', t('demoAccounts') + ':  admin / admin123')),
      h('div.mt-4', { style: { textAlign: 'center' } }, h('a.btn.btn-ghost', { href: 'index.html' }, ui.icon('store', 'icon-sm'), ' ' + t('backToStore')))
    );
    V.mount(root, h('div.login-wrap', card));
    setTimeout(function () { userI.focus(); }, 60);
  }

  /* ---------------- Shell ---------------- */
  function brandBlock() {
    return h('div.as-brand',
      h('span.as-mark', h('img', { src: 'assets/logos/vendora-mark-gold.png', alt: 'VENDORA' })),
      h('div', h('div.as-name', 'VENDORA'), h('div.as-tag', t('staffArea')))
    );
  }

  function navBlock(role) {
    var nav = h('nav.as-nav');
    permittedItems(role).forEach(function (g) {
      nav.appendChild(h('div.as-group', t(g.group)));
      g.items.forEach(function (it) {
        var a = h('a', { href: '#' + it.to, 'data-route': it.to }, ui.icon(it.icon, 'icon-sm'), h('span', t(it.label)));
        nav.appendChild(a);
      });
    });
    return nav;
  }

  function footBlock(user) {
    var foot = h('div.as-foot');
    foot.appendChild(h('div.as-user',
      h('span.avatar', (user.name || user.username || '?').slice(0, 1).toUpperCase()),
      h('div.grow', h('div.as-user-name', user.name || user.username), h('div.as-user-role', roleName(user.role)))
    ));
    var out = h('button.as-logout', { type: 'button' }, ui.icon('logout', 'icon-sm'), t('logout'));
    out.addEventListener('click', function () {
      V.account.logout().then(function () {
        try { if (location.hash) location.hash = ''; } catch (e) {}
        mountLogin();
      });
    });
    foot.appendChild(out);
    return foot;
  }

  function switchers() {
    var lang = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: 'Language', 'aria-label': 'Language' }, ui.icon('globe', 'icon-sm'));
    lang.addEventListener('click', function () { V.state.set('lang', isAr() ? 'en' : 'ar'); });
    var theme = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: 'Theme', 'aria-label': 'Theme' }, ui.icon(V.state.get('theme') === 'dark' ? 'sun' : 'moon', 'icon-sm'));
    theme.addEventListener('click', function () { V.state.set('theme', V.state.get('theme') === 'dark' ? 'light' : 'dark'); });
    var store = h('a.btn.btn-outline.btn-sm.admin-store-link', { href: 'index.html' }, ui.icon('store', 'icon-sm'), ' ' + t('viewStore'));
    return h('div.admin-switchers', store, lang, theme);
  }

  function mountShell() {
    var user = V.state.get('user');
    if (!user || user.type !== 'staff') { mountLogin(); return; }
    var root = V.el('#admin-root');

    var side = h('aside.admin-side', { id: 'admin-side' }, brandBlock(), navBlock(user.role), footBlock(user));

    var toggle = h('button.btn.btn-ghost.btn-icon.admin-side-toggle', { type: 'button', 'aria-label': 'menu' }, ui.icon('menu'));
    toggle.addEventListener('click', function () { side.classList.toggle('open'); });
    side.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (a) side.classList.remove('open');
    });

    var titleEl = h('div.page-title', { id: 'admin-page-title' }, t('dashboard'));
    var top = h('header.admin-top', toggle,
      h('div.at-lead', h('div.at-eyebrow', t('staffArea')), titleEl),
      h('div.spacer'),
      h('div.at-actions', switchers(),
        h('div.admin-user',
          h('span.avatar', (user.name || user.username || '?').slice(0, 1).toUpperCase()),
          h('div.admin-user-meta', h('div', user.name || user.username), h('div.muted', { style: { fontSize: '.74rem' } }, roleName(user.role)))
        )
      )
    );
    var content = h('div.admin-content', { id: 'admin-view' });
    V.mount(root, h('div.admin-shell', side, h('div.admin-main', top, content)));
  }

  function setActive(path) {
    var links = document.querySelectorAll('.as-nav a[data-route]');
    Array.prototype.forEach.call(links, function (a) {
      var route = a.getAttribute('data-route');
      var active = route === '/' ? path === '/' : (path === route || path.indexOf(route + '/') === 0);
      a.classList.toggle('active', active);
    });
  }
  function setTitle(text) { var el = V.el('#admin-page-title'); if (el) el.textContent = text; }

  V.ashell = { mountLogin: mountLogin, mountShell: mountShell, setActive: setActive, setTitle: setTitle, NAV: NAV, permittedItems: permittedItems, APAGES: APAGES };
})(window);
