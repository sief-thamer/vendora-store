/* ============================================================
   VENDORA — Pages: account (login, register, dashboard, orders,
   addresses, profile)
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var h = V.h;
  var ui = V.ui;
  var U = V.utils;
  function t(k, v) { return V.t(k, v); }
  function isAr() { return V.state.get('lang') === 'ar'; }

  function customer() { var u = V.state.get('user'); return u && u.type === 'customer' ? u : null; }
  function requireLogin() { if (!customer()) { V.router.navigate('/login'); return false; } return true; }

  /* ---------------- Login ---------------- */
  function renderLogin() {
    var root = h('div.container', { style: { paddingBlock: 'var(--s6)', maxWidth: '440px' } });
    var email = h('input.input', { type: 'email', placeholder: t('email'), autocomplete: 'username' });
    var pass = h('input.input', { type: 'password', placeholder: t('password'), autocomplete: 'current-password' });
    var msg = h('div.muted');
    var btn = h('button.btn.btn-gold.btn-block.btn-lg', { type: 'button' }, t('signIn'));
    btn.addEventListener('click', function () {
      btn.disabled = true;
      V.account.login(email.value, pass.value).then(function (res) {
        if (res && res.pendingVerification) {
          btn.disabled = false;
          ui.toast(t('awaitingVerification'), 'info');
          V.router.navigate('/verify?email=' + encodeURIComponent(res.email));
          return;
        }
        ui.toast(isAr() ? 'مرحبًا بعودتك!' : 'Welcome back!', 'success');
        V.router.navigate('/account');
      }).catch(function (e) { btn.disabled = false; msg.textContent = t((e && e.message) || 'invalidCredentials'); ui.toast(t((e && e.message) || 'invalidCredentials'), 'error'); });
    });
    pass.addEventListener('keydown', function (e) { if (e.key === 'Enter') btn.click(); });
    root.appendChild(h('div.card.card-pad.stack',
      h('h1.page-title', t('signIn')),
      h('label.field', h('span.f-label', t('email')), email),
      h('label.field', h('span.f-label', t('password')), pass),
      msg, btn,
      h('div.muted', { style: { textAlign: 'center' } }, h('a', { href: ui.href('/forgot'), style: { color: 'var(--accent-2)' } }, t('forgotPassword'))),
      h('div.muted', { style: { textAlign: 'center' } }, t('noAccount') + ' ', h('a', { href: ui.href('/register'), style: { color: 'var(--accent-2)' } }, t('createAccount'))),
      h('div.divider'),
      h('a.btn.btn-outline.btn-block', { href: 'admin.html' }, ui.icon('lock', 'icon-sm'), ' ' + t('staffLogin'))
    ));
    root.appendChild(h('div.card.card-pad.mt-4', h('strong', t('demoAccounts')), h('div.muted.mt-2', 'demo@vendora.local / demo1234')));
    return root;
  }

  /* ---------------- Register ---------------- */
  function renderRegister() {
    var root = h('div.container', { style: { paddingBlock: 'var(--s6)', maxWidth: '480px' } });
    var nameI = h('input.input', { placeholder: t('fullName') });
    var emailI = h('input.input', { type: 'email', placeholder: t('email') });
    var phoneI = h('input.input', { placeholder: t('phone') });
    var passI = h('input.input', { type: 'password', placeholder: t('password') });
    var confI = h('input.input', { type: 'password', placeholder: t('confirmPassword') });
    var msg = h('div.muted');
    var btn = h('button.btn.btn-gold.btn-block.btn-lg', { type: 'button' }, t('createAccount'));
    btn.addEventListener('click', function () {
      btn.disabled = true;
      V.account.register({ name: nameI.value, email: emailI.value, phone: phoneI.value, password: passI.value, confirmPassword: confI.value })
        .then(function (res) {
          if (res && res.pendingVerification) {
            ui.toast(t('verifyEmailSent'), 'info');
            V.router.navigate('/verify?email=' + encodeURIComponent(res.email) + (res.devCode ? '&code=' + res.devCode : ''));
            return;
          }
          ui.toast(t('accountCreated'), 'success'); V.router.navigate('/account');
        })
        .catch(function (e) { btn.disabled = false; msg.textContent = t((e && e.message) || 'error'); });
    });
    root.appendChild(h('div.card.card-pad.stack',
      h('h1.page-title', t('createAccount')),
      h('label.field', h('span.f-label', t('fullName')), nameI),
      h('label.field', h('span.f-label', t('email')), emailI),
      h('label.field', h('span.f-label', t('phone')), phoneI),
      h('label.field', h('span.f-label', t('password')), passI),
      h('label.field', h('span.f-label', t('confirmPassword')), confI),
      msg, btn,
      h('div.muted', { style: { textAlign: 'center' } }, t('haveAccount') + ' ', h('a', { href: ui.href('/login'), style: { color: 'var(--accent-2)' } }, t('signIn')))
    ));
    return root;
  }

  /* ---------------- Account shell ---------------- */
  function accountShell(active, content) {
    var u = customer();
    var nav = [
      { key: 'accountOverview', href: '/account', icon: 'user' },
      { key: 'myOrders', href: '/account/orders', icon: 'box' },
      { key: 'notifications', href: '/account/notifications', icon: 'bell' },
      { key: 'addresses', href: '/account/addresses', icon: 'map-pin' },
      { key: 'profile', href: '/account/profile', icon: 'settings' },
      { key: 'wishlist', href: '/wishlist', icon: 'heart' }
    ];
    var side = h('aside.stack');
    side.appendChild(h('div.card.card-pad', h('div.row', h('span.user-avatar', ui.icon('user')), h('div', h('strong', u.name || u.email), h('div.muted', u.email)))));
    var menu = h('div.card.account-menu');
    nav.forEach(function (n) { menu.appendChild(h('a.menu-item' + (active === n.key ? '.active' : ''), { href: ui.href(n.href) }, ui.icon(n.icon, 'icon-sm'), h('span', t(n.key)))); });
    var lo = h('button.menu-item', { type: 'button' }, ui.icon('logout', 'icon-sm'), h('span', t('logout')));
    lo.addEventListener('click', function () { V.account.logout().then(function () { ui.toast(isAr() ? 'تم تسجيل الخروج' : 'Signed out', 'success'); V.router.navigate('/'); }); });
    menu.appendChild(lo);
    side.appendChild(menu);
    return h('div.container', { style: { paddingBlock: 'var(--s6)' } },
      ui.breadcrumb([{ label: t('navHome'), href: '/' }, { label: t('myAccount') }]),
      h('div.lux-head', h('h1.lux-head__title', t('myAccount'))),
      h('div.account-grid.mt-4', side, h('div', content))
    );
  }

  /* ---------------- Overview ---------------- */
  function renderAccount() {
    if (!requireLogin()) return h('div');
    var u = customer();
    var host = h('div.stack');
    V.orders.list({ customerId: u.id }).then(function (orders) {
      var active = orders.filter(function (o) { return ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].indexOf(o.status) !== -1; });
      V.clear(host);
      host.appendChild(h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' } },
        stat(isAr() ? 'إجمالي الطلبات' : 'Total orders', orders.length),
        stat(isAr() ? 'قيد التنفيذ' : 'Active', active.length),
        stat(t('wishlist'), V.wishlist.count()),
        stat(isAr() ? 'قيمة المشتريات' : 'Spent', V.money(orders.filter(function (o) { return o.paymentStatus === 'paid'; }).reduce(function (a, o) { return a + o.pricing.total; }, 0)))
      ));
      host.appendChild(ui.sectionHead(isAr() ? 'أحدث الطلبات' : 'Recent orders', { link: { href: '/account/orders', label: t('all') } }));
      if (!orders.length) host.appendChild(ui.empty({ icon: 'box', title: t('noOrders'), action: h('a.btn.btn-gold', { href: ui.href('/products') }, t('continueShopping')) }));
      else orders.slice(0, 4).forEach(function (o) { host.appendChild(V.pages._orderCard(o, false)); });
    });
    return accountShell('accountOverview', host);
  }
  function stat(label, value) { return h('div.card.card-pad', h('div.muted', label), h('strong', { style: { fontSize: '1.4rem' } }, typeof value === 'number' ? U.formatNumber(value, V.state.get('lang')) : value)); }

  /* ---------------- Orders ---------------- */
  function renderAccountOrders() {
    if (!requireLogin()) return h('div');
    var u = customer();
    var host = h('div.stack');
    V.orders.list({ customerId: u.id }).then(function (orders) {
      V.clear(host);
      if (!orders.length) { host.appendChild(ui.empty({ icon: 'box', title: t('noOrders'), action: h('a.btn.btn-gold', { href: ui.href('/products') }, t('continueShopping')) })); return; }
      orders.forEach(function (o) { host.appendChild(V.pages._orderCard(o, true)); });
    });
    return accountShell('myOrders', host);
  }

  /* ---------------- Addresses ---------------- */
  function renderAddresses() {
    if (!requireLogin()) return h('div');
    var u = customer();
    var host = h('div.stack');
    function load() {
      V.account.addresses(u.id).then(function (list) {
        V.clear(host);
        host.appendChild(h('div.row-between', h('h3', t('addresses')), addBtn()));
        if (!list.length) host.appendChild(ui.empty({ icon: 'pin', title: t('noAddresses') }));
        list.forEach(function (a) {
          host.appendChild(h('div.card.card-pad', h('div.row-between',
            h('div', h('strong', a.name || u.name), h('div.muted', [a.street, a.area, a.city, (isAr() ? V.getMarket(a.market).nameAr : V.getMarket(a.market).nameEn)].filter(Boolean).join(', ')), h('div.muted', a.phone)),
            h('div.row', h('button.btn.btn-ghost.btn-sm', { type: 'button' }, t('edit')), h('button.btn.btn-ghost.btn-sm.btn-icon', { type: 'button' }, ui.icon('trash', 'icon-sm')))
          )));
          var btns = host.lastChild.querySelectorAll('.btn-ghost');
          btns[0].addEventListener('click', function () { form(a); });
          btns[1].addEventListener('click', function () { V.account.deleteAddress(a.id).then(load); });
        });
      });
    }
    function addBtn() { var b = h('button.btn.btn-primary.btn-sm', { type: 'button' }, ui.icon('plus', 'icon-sm'), t('addAddress')); b.addEventListener('click', function () { form(null); }); return b; }
    function form(addr) {
      addr = addr || {};
      var f = h('div.stack');
      var nameI = h('input.input', { placeholder: t('fullName'), value: addr.name || u.name || '' });
      var phoneI = h('input.input', { placeholder: t('phone'), value: addr.phone || '' });
      var marketSel = h('select.select'); V.markets.forEach(function (m) { marketSel.appendChild(h('option', { value: m.code, selected: (addr.market || V.state.get('market')) === m.code }, isAr() ? m.nameAr : m.nameEn)); });
      var citySel = h('select.select');
      function fill() { V.clear(citySel); var mk = V.getMarket(marketSel.value); (isAr() ? mk.citiesAr : mk.citiesEn).forEach(function (c) { citySel.appendChild(h('option', { value: c, selected: addr.city === c }, c)); }); }
      fill(); marketSel.addEventListener('change', fill);
      var areaI = h('input.input', { placeholder: isAr() ? 'الحي' : 'Area', value: addr.area || '' });
      var streetI = h('input.input', { placeholder: t('address'), value: addr.street || '' });
      f.appendChild(nameI); f.appendChild(phoneI);
      f.appendChild(h('div.row', marketSel, citySel)); f.appendChild(areaI); f.appendChild(streetI);
      var m = ui.modal(f, { title: addr.id ? t('edit') : t('addAddress'), footer: h('div.row-between', h('button.btn.btn-ghost', { type: 'button' }, t('cancel')), h('button.btn.btn-primary', { type: 'button' }, t('save'))) });
      m.el.querySelector('.modal-foot .btn-ghost').addEventListener('click', m.close);
      m.el.querySelector('.modal-foot .btn-primary').addEventListener('click', function () {
        V.account.saveAddress(u.id, { id: addr.id, name: nameI.value, phone: phoneI.value, market: marketSel.value, city: citySel.value, area: areaI.value, street: streetI.value }).then(function () { m.close(); ui.toast(t('saved'), 'success'); load(); });
      });
    }
    load();
    return accountShell('addresses', host);
  }

  /* ---------------- Profile ---------------- */
  function renderProfile() {
    if (!requireLogin()) return h('div');
    var u = customer();
    var host = h('div.stack');
    V.account.getCustomer(u.id).then(function (c) {
      c = c || u;
      var nameI = h('input.input', { value: c.name || '' });
      var phoneI = h('input.input', { value: c.phone || '' });
      var marketSel = h('select.select'); V.markets.forEach(function (m) { marketSel.appendChild(h('option', { value: m.code, selected: c.market === m.code }, isAr() ? m.nameAr : m.nameEn)); });
      var saveBtn = h('button.btn.btn-primary', { type: 'button' }, t('save'));
      saveBtn.addEventListener('click', function () { V.account.updateCustomer(u.id, { name: nameI.value, phone: phoneI.value, market: marketSel.value }).then(function () { ui.toast(t('saved'), 'success'); }); });
      V.clear(host);
      host.appendChild(h('div.card.card-pad.stack',
        h('h3', t('profile')),
        h('label.field', h('span.f-label', t('email')), h('input.input', { value: c.email, disabled: true })),
        h('label.field', h('span.f-label', t('fullName')), nameI),
        h('label.field', h('span.f-label', t('phone')), phoneI),
        h('label.field', h('span.f-label', t('market')), marketSel),
        h('div', saveBtn)
      ));
      // password
      var oldP = h('input.input', { type: 'password', placeholder: t('currentPassword') });
      var newP = h('input.input', { type: 'password', placeholder: t('newPassword') });
      var chBtn = h('button.btn.btn-outline', { type: 'button' }, t('changePassword'));
      var pmsg = h('div.muted');
      chBtn.addEventListener('click', function () { V.account.changePassword(u.id, oldP.value, newP.value).then(function () { pmsg.textContent = ''; ui.toast(t('passwordChanged'), 'success'); oldP.value = newP.value = ''; }).catch(function () { pmsg.textContent = t('wrongPassword'); }); });
      host.appendChild(h('div.card.card-pad.stack', h('h3', t('changePassword')), oldP, newP, chBtn, pmsg));
      // danger zone: delete account
      var delBtn = h('button.btn.btn-outline', { type: 'button', style: { color: 'var(--danger)' } }, ui.icon('trash', 'icon-sm'), ' ' + t('deleteAccount'));
      delBtn.addEventListener('click', function () {
        ui.confirm({ title: t('deleteAccount'), text: t('deleteAccountConfirm'), confirmLabel: t('deleteAccount') }).then(function (ok) {
          if (!ok) return;
          V.account.deleteAccount(u.id).then(function () { ui.toast(t('accountDeleted'), 'success'); setTimeout(function () { V.router.navigate('/'); }, 600); });
        });
      });
      host.appendChild(h('div.card.card-pad.stack', { style: { borderColor: 'var(--danger)' } }, h('h3', t('deleteAccount')), h('p.muted', t('deleteAccountDesc')), h('div', delBtn)));
    });
    return accountShell('profile', host);
  }

  /* ---------------- Verify e-mail ---------------- */
  function renderVerify(ctx) {
    var email = (ctx.query && ctx.query.email) || '';
    var devCode = (ctx.query && ctx.query.code) || '';
    var root = h('div.container', { style: { paddingBlock: 'var(--s6)', maxWidth: '460px' } });
    var emailI = h('input.input', { type: 'email', placeholder: t('email'), value: email });
    var codeI = h('input.input', { placeholder: t('verifyCode'), inputmode: 'numeric', maxlength: 6 });
    var hint = h('div.muted.help');
    if (devCode) hint.textContent = t('devCodeNote') + ' ' + devCode;
    var msg = h('div.muted');
    var btn = h('button.btn.btn-gold.btn-block.btn-lg', { type: 'button' }, t('verifyBtn'));
    var resend = h('button.btn.btn-ghost.btn-block', { type: 'button' }, t('resendCode'));
    btn.addEventListener('click', function () {
      btn.disabled = true;
      V.account.verifyEmail(emailI.value, codeI.value).then(function () {
        ui.toast(t('emailVerified'), 'success');
        V.router.navigate('/account');
      }).catch(function (e) { btn.disabled = false; msg.textContent = t((e && e.message) || 'invalidCode'); });
    });
    resend.addEventListener('click', function () {
      V.account.resendVerification(emailI.value).then(function (r) {
        ui.toast(t('codeSent'), 'success'); hint.textContent = t('devCodeNote') + ' ' + r.devCode;
      }).catch(function (e) { msg.textContent = t((e && e.message) || 'notFound'); });
    });
    root.appendChild(h('div.card.card-pad.stack',
      h('h1.page-title', t('verifyEmailTitle')),
      h('p.muted', t('verifyEmailSent')),
      h('label.field', h('span.f-label', t('email')), emailI),
      h('label.field', h('span.f-label', t('verifyCode')), codeI),
      hint, msg, btn, resend,
      h('div.muted', { style: { textAlign: 'center' } }, h('a', { href: ui.href('/login'), style: { color: 'var(--accent-2)' } }, t('backToLogin')))
    ));
    return root;
  }

  /* ---------------- Forgot / reset password ---------------- */
  function renderForgot() {
    var root = h('div.container', { style: { paddingBlock: 'var(--s6)', maxWidth: '460px' } });
    var emailI = h('input.input', { type: 'email', placeholder: t('email') });
    var hint = h('div.muted.help');
    var msg = h('div.muted');
    var btn = h('button.btn.btn-gold.btn-block.btn-lg', { type: 'button' }, t('sendReset'));
    btn.addEventListener('click', function () {
      btn.disabled = true;
      V.account.requestReset(emailI.value).then(function (r) {
        btn.disabled = false;
        ui.toast(t('resetSent'), 'success');
        hint.textContent = t('devCodeNote') + ' ' + r.devCode;
        V.router.navigate('/reset?email=' + encodeURIComponent(r.email) + '&code=' + r.devCode);
      }).catch(function (e) { btn.disabled = false; msg.textContent = t((e && e.message) || 'notFound'); });
    });
    root.appendChild(h('div.card.card-pad.stack',
      h('h1.page-title', t('resetPassword')),
      h('p.muted', t('resetSent')),
      h('label.field', h('span.f-label', t('email')), emailI),
      hint, msg, btn,
      h('div.muted', { style: { textAlign: 'center' } }, h('a', { href: ui.href('/login'), style: { color: 'var(--accent-2)' } }, t('backToLogin')))
    ));
    return root;
  }
  function renderReset(ctx) {
    var root = h('div.container', { style: { paddingBlock: 'var(--s6)', maxWidth: '460px' } });
    var emailI = h('input.input', { type: 'email', placeholder: t('email'), value: (ctx.query && ctx.query.email) || '' });
    var codeI = h('input.input', { placeholder: t('verifyCode'), inputmode: 'numeric', value: (ctx.query && ctx.query.code) || '' });
    var passI = h('input.input', { type: 'password', placeholder: t('newPassword') });
    var confI = h('input.input', { type: 'password', placeholder: t('confirmNewPassword') });
    var msg = h('div.muted');
    var btn = h('button.btn.btn-gold.btn-block.btn-lg', { type: 'button' }, t('resetPassword'));
    btn.addEventListener('click', function () {
      if (passI.value !== confI.value) { msg.textContent = t('passwordMismatch'); return; }
      btn.disabled = true;
      V.account.resetPassword(emailI.value, codeI.value, passI.value).then(function () {
        ui.toast(t('resetDone'), 'success'); V.router.navigate('/login');
      }).catch(function (e) { btn.disabled = false; msg.textContent = t((e && e.message) || 'invalidCode'); });
    });
    root.appendChild(h('div.card.card-pad.stack',
      h('h1.page-title', t('resetPassword')),
      h('label.field', h('span.f-label', t('email')), emailI),
      h('label.field', h('span.f-label', t('verifyCode')), codeI),
      h('label.field', h('span.f-label', t('newPassword')), passI),
      h('label.field', h('span.f-label', t('confirmNewPassword')), confI),
      msg, btn,
      h('div.muted', { style: { textAlign: 'center' } }, h('a', { href: ui.href('/login'), style: { color: 'var(--accent-2)' } }, t('backToLogin')))
    ));
    return root;
  }

  /* ---------------- Notifications center ---------------- */
  function renderNotifications() {
    if (!requireLogin()) return h('div');
    var u = customer();
    var host = h('div.stack');
    function load() {
      V.notify.forCustomer(u.id).then(function (list) {
        V.clear(host);
        host.appendChild(h('div.row-between', h('h3', t('notificationCenter')),
          h('button.btn.btn-ghost.btn-sm', { type: 'button', onclick: function () { V.notify.markAllRead(u.id).then(load); } }, t('markAllRead'))));
        if (!list.length) { host.appendChild(ui.empty({ icon: 'bell', title: t('noNotifications') })); return; }
        list.forEach(function (n) {
          var card = h('div.card.card-pad', { style: { opacity: n.read ? .6 : 1 } },
            h('div.row-between', h('strong', isAr() ? n.titleAr : n.titleEn), n.at ? h('span.muted', U.formatDate(n.at, V.state.get('lang'), true)) : null),
            h('div.muted.mt-2', isAr() ? n.bodyAr : n.bodyEn));
          card.addEventListener('click', function () { if (!n.read) V.notify.markRead(n.id).then(load); });
          host.appendChild(card);
        });
      });
    }
    load();
    return accountShell('notifications', host);
  }

  /* ---------------- Order detail (customer) ---------------- */
  function renderOrderDetail(ctx) {
    if (!requireLogin()) return h('div');
    var u = customer();
    var number = ctx.params.number;
    var host = h('div.stack');
    function load() {
      V.orders.getByNumber(number).then(function (o) {
        V.clear(host);
        if (!o || o.customerId !== u.id) { host.appendChild(ui.alert(t('orderNotFound'), 'danger')); return; }
        // header
        host.appendChild(h('div.card.card-pad',
          h('div.row-between', h('h3.mono', o.number), h('span.badge.badge-gold', V.pages._statusLabel(o.status))),
          h('div.muted.mt-2', t('orderDate') + ': ' + U.formatDate(o.createdAt, V.state.get('lang'), true)),
          V.pages._dualBadges(o)
        ));
        // payment action (electronic pay now / transfer receipt)
        var pa = V.pages._paymentAction(o, load);
        if (pa) host.appendChild(pa);
        // items
        var items = h('div.card.card-pad.stack', h('h3', t('itemsLabel')));
        o.items.forEach(function (it) {
          items.appendChild(h('div.row-between',
            h('span', V.loc(it, 'name') + ' ×' + it.qty),
            h('span', V.moneyIn(it.lineTotal, o.shipping.market))));
        });
        items.appendChild(h('div.summary-row.total', h('span', t('total')), h('strong', V.moneyIn(o.pricing.total, o.shipping.market))));
        host.appendChild(items);
        // shipping
        host.appendChild(h('div.card.card-pad.stack', h('h3', t('shippingTo')),
          h('div', o.contact.name, h('div.muted', o.contact.phone + ' · ' + o.contact.email)),
          h('div.muted', [o.shipping.street, o.shipping.area, o.shipping.city, (V.getMarket(o.shipping.market).nameAr)].filter(Boolean).join(', '))));
        // timeline
        var tl = h('div.card.card-pad.stack', h('h3', t('timeline')));
        (o.events || []).forEach(function (ev) {
          tl.appendChild(h('div.row-between', h('span', (ev.type === 'status' ? (V.pages._statusLabel(ev.from) + ' → ' + V.pages._statusLabel(ev.to)) : ev.type)), h('span.muted', U.formatDate(ev.at, V.state.get('lang'), true))));
        });
        host.appendChild(tl);
        // actions
        var actions = h('div.row.wrap', { style: { gap: '8px' } });
        var printBtn = h('button.btn.btn-ghost', { type: 'button' }, ui.icon('print', 'icon-sm'), ' ' + (isAr() ? 'طباعة الفاتورة' : 'Print invoice'));
        printBtn.addEventListener('click', function () { if (!V.orders.printInvoice(o)) ui.toast(isAr() ? 'يرجى السماح بالنوافذ المنبثقة' : 'Please allow pop-ups', 'warn'); });
        actions.appendChild(printBtn);
        var policy = V.orders.canCancel(o, u.role);
        if (policy.allowed) {
          var cancelBtn = h('button.btn.btn-outline', { type: 'button' }, t('cancelOrder'));
          cancelBtn.addEventListener('click', function () { openCancel(o, cancelBtn, load, policy); });
          actions.appendChild(cancelBtn);
        }
        if (o.status === 'DELIVERED' && (!o.returnStatus || o.returnStatus === 'rejected')) {
          var retBtn = h('button.btn.btn-outline', { type: 'button' }, t('requestReturn'));
          retBtn.addEventListener('click', function () { openReturn(o, retBtn, load); });
          actions.appendChild(retBtn);
          var exBtn = h('button.btn.btn-outline', { type: 'button' }, t('requestExchange'));
          exBtn.addEventListener('click', function () { openReturn(o, exBtn, load, 'exchange'); });
          actions.appendChild(exBtn);
        }
        if (actions.children.length) host.appendChild(h('div.card.card-pad.stack', h('h3', isAr() ? 'إجراءات' : 'Actions'), actions));
      });
    }
    load();
    return accountShell('myOrders', host);
  }

  function openCancel(o, btn, reload, policy) {
    var reasonI = h('input.input', { placeholder: t('cancelReason') });
    var body = h('div.stack', reasonI);
    if (policy.needsStaff) body.appendChild(h('div.muted.help', t('cancelNeedsStaff')));
    var m = ui.modal(body, { title: t('cancelOrder'), footer: h('div.row-between', h('button.btn.btn-ghost', { type: 'button' }, t('cancel')), h('button.btn.btn-danger', { type: 'button' }, t('cancelOrder'))) });
    m.el.querySelector('.modal-foot .btn-ghost').addEventListener('click', m.close);
    m.el.querySelector('.modal-foot .btn-danger').addEventListener('click', function () {
      V.orders.cancel(o.id, { reason: reasonI.value }).then(function () { m.close(); ui.toast(t('orderCancelled'), 'success'); reload(); })
        .catch(function (e) { ui.toast(t((e && e.message) || 'cancelNotAllowed'), 'error'); });
    });
  }

  function openReturn(o, btn, reload, forcedType) {
    var typeSel = h('select.select');
    [['return', t('requestReturn')], ['exchange', t('requestExchange')]].forEach(function (p) { typeSel.appendChild(h('option', { value: p[0], selected: (forcedType || 'return') === p[0] }, p[1])); });
    if (forcedType) typeSel.disabled = true;
    var condSel = h('select.select');
    [['good', t('conditionGood')], ['damaged', t('conditionDamaged')]].forEach(function (p) { condSel.appendChild(h('option', { value: p[0] }, p[1])); });
    var reasonI = h('input.input', { placeholder: t('returnReason') });
    var noteI = h('textarea.textarea', { placeholder: t('returnNote'), rows: 2 });
    var msg = h('div.muted');
    var body = h('div.stack', h('div.muted.help', t('returnWindowNote')), typeSel, h('label.field', h('span.f-label', t('reason')), reasonI), condSel, noteI, msg);
    var m = ui.modal(body, { title: t('requestReturn'), footer: h('div.row-between', h('button.btn.btn-ghost', { type: 'button' }, t('cancel')), h('button.btn.btn-primary', { type: 'button' }, t('submitReceipt'))) });
    m.el.querySelector('.modal-foot .btn-ghost').addEventListener('click', m.close);
    m.el.querySelector('.modal-foot .btn-primary').textContent = t('submitReceipt');
    m.el.querySelector('.modal-foot .btn-primary').addEventListener('click', function () {
      var items = o.items.map(function (i) { return { productId: i.productId, qty: i.qty, condition: condSel.value }; });
      var fn = typeSel.value === 'exchange' ? V.orders.requestExchange : V.orders.requestReturn;
      fn(o.id, { type: typeSel.value, reason: reasonI.value, note: noteI.value, items: items }).then(function () { m.close(); ui.toast(t('returnRequested'), 'success'); reload(); })
        .catch(function (e) { msg.textContent = t((e && e.message) || 'error'); });
    });
  }

  V.pages = V.pages || {};
  V.pages.login = renderLogin;
  V.pages.register = renderRegister;
  V.pages.verify = renderVerify;
  V.pages.forgot = renderForgot;
  V.pages.reset = renderReset;
  V.pages.account = renderAccount;
  V.pages.accountOrders = renderAccountOrders;
  V.pages.accountNotifications = renderNotifications;
  V.pages.orderDetail = renderOrderDetail;
  V.pages.accountAddresses = renderAddresses;
  V.pages.accountProfile = renderProfile;
})(window);
