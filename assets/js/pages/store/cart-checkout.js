/* ============================================================
   VENDORA — Pages: cart, checkout, order success, tracking
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var h = V.h;
  var ui = V.ui;
  var U = V.utils;
  function t(k, v) { return V.t(k, v); }
  function isAr() { return V.state.get('lang') === 'ar'; }

  function summaryBox(totals, opts) {
    opts = opts || {};
    var box = h('div.card.card-pad.stack.summary-card',
      h('h3.summary-card__title', t('orderSummary')),
      h('div.summary-row', h('span', t('subtotal')), h('strong', V.money(totals.subtotal))),
      totals.discount ? h('div.summary-row.discount', h('span', t('discount') + (opts.couponCode ? ' (' + opts.couponCode + ')' : '')), h('strong', '-' + V.money(totals.discount))) : null,
      h('div.summary-row', h('span', t('shipping')), h('strong', totals.shipping ? V.money(totals.shipping) : t('trustCod'))),
      totals.tax ? h('div.summary-row', h('span', t('tax')), h('strong', V.money(totals.tax))) : null,
      h('div.summary-total', h('span', t('total')), h('strong', V.money(totals.total)))
    );
    return box;
  }

  /* ---------------- Cart ---------------- */
  function renderCart() {
    var coupon = null;
    var root = h('div.container', { style: { paddingBlock: 'var(--s6)' } });
    root.appendChild(ui.breadcrumb([{ label: t('navHome'), href: '/' }, { label: t('cartTitle') }]));

    var headTitle = h('h1.lux-head__title', '');
    var headSub = h('p.lux-head__sub', '');
    root.appendChild(h('div.lux-head',
      h('div.lux-head__eyebrow', ui.icon('cart', 'icon-sm'), h('span', isAr() ? 'سلة التسوق' : 'Shopping cart')),
      headTitle, headSub
    ));

    var body = h('div.mt-5'); root.appendChild(body);

    function run() {
      var totals = V.cart.totals({ coupon: coupon });
      headTitle.textContent = t('cartTitle') + ' (' + totals.count + ')';
      headSub.textContent = isAr() ? 'راجع منتجاتك، عدّل الكميات، ثم أكمل الدفع بأمان.' : 'Review your items, adjust quantities, then checkout securely.';
      V.clear(body);
      if (!totals.lines.length) {
        body.appendChild(ui.empty({ image: V.config.IMG.emptyCart, title: t('cartEmpty'), text: isAr() ? 'لم تُضف أي منتج بعد.' : 'You have not added any products yet.', action: h('a.btn.btn-gold', { href: ui.href('/products') }, ui.icon('cart', 'icon-sm'), ' ', t('continueShopping')) }));
        return;
      }
      var grid = h('div.cart-grid');
      var lines = h('div.cart-items');
      totals.lines.forEach(function (l) {
        var step = ui.qty(l.qty, function (v) { V.cart.setQty(l.productId, v).then(run); }, V.catalog.stockOf(l.product));
        var rm = h('button.btn.btn-ghost.btn-icon.cart-item__rm', { type: 'button', title: t('remove'), 'aria-label': t('remove') }, ui.icon('trash', 'icon-sm'));
        rm.addEventListener('click', function () { V.cart.remove(l.productId).then(run); });
        var pct = V.catalog.discountPct ? V.catalog.discountPct(l.product) : 0;
        lines.appendChild(h('div.cart-item',
          h('a.cart-item__media', { href: ui.href('/product/' + l.product.slug) }, h('img', { src: l.product.primaryImage, alt: V.loc(l.product, 'name'), loading: 'lazy' })),
          h('div.cart-item__info',
            h('a.cart-item__brand', { href: ui.href('/category/' + l.product.categorySlug) }, V.loc(l.product, 'categoryName')),
            h('a.cart-item__title', { href: ui.href('/product/' + l.product.slug) }, V.loc(l.product, 'name')),
            h('div.cart-item__unit', V.money(l.unitPrice), pct ? h('span.cart-item__save', '-' + pct + '%') : null),
            h('div.cart-item__row', step, h('strong.cart-item__total', V.money(l.lineTotal)))
          ),
          rm
        ));
      });
      var side = h('div.cart-aside');
      // coupon
      var codeI = h('input.input', { placeholder: t('couponCode'), 'aria-label': t('couponCode') });
      var applyBtn = h('button.btn.btn-outline', { type: 'button' }, t('apply'));
      var msg = h('div.muted.help');
      applyBtn.addEventListener('click', function () {
        V.coupons.validate(codeI.value, V.state.get('market'), V.cart.totals().subtotal, (V.state.get('user') || {}).id).then(function (r) {
          if (r.ok) { coupon = r.coupon; msg.textContent = ''; ui.toast(t('couponApplied'), 'success'); run(); }
          else { coupon = null; msg.textContent = t(r.error) + (r.min ? ' (' + V.money(r.min) + ')' : ''); run(); }
        });
      });
      side.appendChild(h('div.card.card-pad.stack.coupon-card', h('h4', ui.icon('percent', 'icon-sm'), ' ', t('couponCode')), h('div.row', codeI, applyBtn), msg));
      side.appendChild(summaryBox(totals, { couponCode: coupon && coupon.code }));
      side.appendChild(h('a.btn.btn-gold.btn-block.btn-lg', { href: ui.href('/checkout') }, ui.icon('check'), t('proceedCheckout')));
      side.appendChild(h('a.btn.btn-ghost.btn-block', { href: ui.href('/products') }, t('continueShopping')));
      side.appendChild(h('div.cart-secure', ui.icon('shield', 'icon-sm'), h('span', t('secureCheckout'))));
      // keep coupon for checkout
      try { V.ls.set('pendingCoupon', coupon ? coupon.code : null); } catch (e) {}
      grid.appendChild(lines); grid.appendChild(side);
      body.appendChild(grid);
    }
    run();
    return root;
  }

  /* ---------------- Checkout ---------------- */
  function renderCheckout() {
    var user = V.state.get('user');
    if (!V.cart.raw() || !V.cart.raw().items.length) { V.router.navigate('/cart'); return h('div'); }
    var market = V.state.get('market');
    var mk = V.getMarket(market);
    var coupon = null;
    var idemKey = U.uid('idem');
    var cities = isAr() ? mk.citiesAr : mk.citiesEn;

    var root = h('div.container', { style: { paddingBlock: 'var(--s6)' } });
    root.appendChild(ui.breadcrumb([{ label: t('navHome'), href: '/' }, { label: t('cartTitle'), href: '/cart' }, { label: t('checkout') }]));
    root.appendChild(h('div.lux-head',
      h('div.lux-head__eyebrow', ui.icon('shield', 'icon-sm'), h('span', isAr() ? 'إتمام الشراء' : 'Checkout')),
      h('h1.lux-head__title', t('checkout')),
      h('p.lux-head__sub', isAr() ? 'أكمل بياناتك وسنتواصل معك لتأكيد الطلب.' : 'Complete your details and we will contact you to confirm the order.')
    ));

    var grid = h('div.cart-grid.mt-4');
    var form = h('div.stack');

    var nameI = h('input.input', { value: (user && user.name) || '', placeholder: t('fullName') });
    var phoneI = h('input.input', { value: (user && user.phone) || '', placeholder: t('phone'), inputmode: 'tel' });
    var emailI = h('input.input', { value: (user && user.email) || '', placeholder: t('email'), type: 'email' });
    var marketSel = h('select.select');
    V.markets.forEach(function (m) { marketSel.appendChild(h('option', { value: m.code, selected: m.code === market }, m.flag + ' ' + (isAr() ? m.nameAr : m.nameEn))); });
    var citySel = h('select.select');
    function fillCities() { V.clear(citySel); (isAr() ? V.getMarket(marketSel.value).citiesAr : V.getMarket(marketSel.value).citiesEn).forEach(function (c) { citySel.appendChild(h('option', { value: c }, c)); }); }
    fillCities();
    marketSel.addEventListener('change', function () { V.state.set('market', marketSel.value); fillCities(); refreshSummary(); loadMethods(); });
    citySel.addEventListener('change', refreshSummary);
    var areaI = h('input.input', { placeholder: isAr() ? 'الحي / المنطقة' : 'Area / district' });
    var streetI = h('input.input', { placeholder: t('address') });
    var notesI = h('textarea.textarea', { placeholder: t('orderNotes'), rows: 2 });

    form.appendChild(h('div.card.card-pad.stack',
      h('h3', t('shippingInfo')),
      field(t('fullName'), nameI), field(t('phone'), phoneI), field(t('email'), emailI),
      h('div.row', field(t('market'), marketSel), field(t('city'), citySel)),
      field(isAr() ? 'الحي / المنطقة' : 'Area', areaI), field(t('address'), streetI), field(t('orderNotes'), notesI)
    ));

    // payment — methods loaded from settings for the selected market
    var payHost = h('div.card.card-pad.stack');
    var payNote = h('div.muted.help');
    var payMethod = 'cod';
    form.appendChild(payHost);
    function payDesc(m) {
      if (m.code === 'electronic') return t('payWindowNote');
      if (m.code === 'transfer') return t('transferNote');
      return t('codNote');
    }
    function updatePayNote() { payNote.textContent = payDesc({ code: payMethod }); }
    function loadMethods() {
      V.payments.methods(marketSel.value).then(function (list) {
        V.clear(payHost);
        payHost.appendChild(h('h3', t('paymentMethod')));
        payHost.appendChild(h('div.muted.help', t('simulatedNotice')));
        if (!list.length) { payHost.appendChild(ui.alert(t('error'), 'danger')); return; }
        payMethod = list[0].code;
        list.forEach(function (m) {
          var radio = h('input', { type: 'radio', name: 'pay', value: m.code, checked: m.code === payMethod });
          radio.addEventListener('change', function () { if (radio.checked) { payMethod = m.code; updatePayNote(); } });
          payHost.appendChild(h('label.pay-opt', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', cursor: 'pointer' } },
            radio, h('div', h('strong', t('pm_' + m.code)), h('div.muted', payDesc(m)))));
        });
        payHost.appendChild(payNote);
        updatePayNote();
      });
    }
    loadMethods();

    // coupon
    var codeI = h('input.input', { placeholder: t('couponCode'), 'aria-label': t('couponCode'), value: V.ls.get('pendingCoupon', '') || '' });
    var applyBtn = h('button.btn.btn-outline.btn-sm', { type: 'button' }, t('apply'));
    var cMsg = h('div.muted');
    form.appendChild(h('div.card.card-pad', h('h3', t('couponCode')), h('div.row.mt-2', codeI, applyBtn), cMsg));
    applyBtn.addEventListener('click', function () {
      V.coupons.validate(codeI.value, marketSel.value, V.cart.totals().subtotal, (user || {}).id).then(function (r) {
        if (r.ok) { coupon = r.coupon; cMsg.textContent = ''; ui.toast(t('couponApplied'), 'success'); refreshSummary(); }
        else { coupon = null; cMsg.textContent = t(r.error) + (r.min ? ' (' + V.moneyIn(r.min, marketSel.value) + ')' : ''); refreshSummary(); }
      });
    });

    // summary side
    var side = h('div.cart-aside');
    var summaryHost = h('div.stack');
    side.appendChild(summaryHost);
    var agree = h('input', { type: 'checkbox', id: 'vd-agree-terms' });
    var agreeBox = h('label.row', { style: { gap: '8px', alignItems: 'flex-start', cursor: 'pointer', margin: '0 0 var(--s3)' } },
      agree, h('span.small', t('agreeTerms'), ' ', h('a', { href: ui.href('/page/terms'), style: { textDecoration: 'underline' } }, t('policies'))));
    var placeBtn = h('button.btn.btn-gold.btn-lg.btn-block', { type: 'button' }, ui.icon('check'), t('placeOrder'));
    placeBtn.disabled = true;
    agree.addEventListener('change', function () { placeBtn.disabled = !agree.checked; });
    side.appendChild(agreeBox);
    side.appendChild(placeBtn);
    side.appendChild(h('div.cart-secure', ui.icon('shield', 'icon-sm'), h('span', t('secureCheckout'))));

    function refreshSummary() {
      V.clear(summaryHost);
      var totals = V.cart.totals({ coupon: coupon, market: marketSel.value, city: citySel.value });
      var mini = h('div.card.card-pad.stack', h('h3', t('yourOrder')));
      totals.lines.forEach(function (l) { mini.appendChild(h('div.summary-row', h('span', V.loc(l.product, 'name').slice(0, 26) + ' ×' + l.qty), h('strong', V.moneyIn(l.lineTotal, marketSel.value)))); });
      summaryHost.appendChild(mini);
      if (totals.shippingEta && (totals.shippingEta.min || totals.shippingEta.max)) {
        mini.appendChild(h('div.muted.help', t('delivery') + ': ' + (totals.shippingEta.min || 1) + '–' + (totals.shippingEta.max || totals.shippingEta.min || 1) + ' ' + (isAr() ? 'يوم' : 'days')));
      }
      summaryHost.appendChild(summaryBox(totals, { couponCode: coupon && coupon.code }));
    }
    refreshSummary();

    placeBtn.addEventListener('click', function () {
      if (!nameI.value.trim() || !phoneI.value.trim()) { ui.toast(t('fieldsRequired'), 'error'); return; }
      placeBtn.disabled = true;
      V.orders.place({
        name: nameI.value, phone: phoneI.value, email: emailI.value,
        market: marketSel.value, city: citySel.value, area: areaI.value, street: streetI.value, notes: notesI.value,
        coupon: coupon, idempotencyKey: idemKey, paymentMethod: payMethod
      }).then(function (order) {
        V.ls.set('pendingCoupon', null);
        ui.toast(t('orderPlaced'), 'success');
        V.router.navigate('/order-success/' + order.number);
      }).catch(function (e) {
        placeBtn.disabled = !agree.checked;
        if (e.message === 'stock_issue') ui.toast(isAr() ? 'بعض المنتجات غير متوفرة بالكمية المطلوبة' : 'Some items are not available in the requested quantity', 'error');
        else if (e.message === 'cart_empty') ui.toast(t('cartEmpty'), 'error');
        else ui.toast(t('error'), 'error');
      });
    });

    grid.appendChild(form); grid.appendChild(side);
    root.appendChild(grid);
    return root;
  }

  function field(label, input) { return h('label.field', h('span.f-label', label), input); }

  /* ---------------- Order success (post-order payment hub) ---------------- */
  function renderSuccess(ctx) {
    var num = ctx.params.number;
    var root = h('div.container', { style: { paddingBlock: 'var(--s6)', maxWidth: '760px' } });
    var host = h('div');
    root.appendChild(host);

    function draw(order) {
      V.clear(host);
      if (!order) { host.appendChild(ui.alert(t('orderNotFound'), 'danger')); return; }
      host.appendChild(h('div.empty',
        h('div.ti-ico', ui.icon('check-circle', 'icon-lg')),
        h('h2', t('orderSuccessTitle')),
        h('p.muted', t('orderSuccessText')),
        h('div.card.card-pad.mt-4',
          h('div.summary-row', h('span', t('orderNumber')), h('strong.mono', order.number)),
          dualBadges(order),
          h('div.summary-row.total.mt-2', h('span', t('total')), h('strong', V.moneyIn(order.pricing.total, order.shipping.market)))
        )
      ));

      var payBox = paymentAction(order, draw);
      if (payBox) host.appendChild(payBox);

      var actions = h('div.row.mt-4', { style: { justifyContent: 'center', flexWrap: 'wrap' } },
        h('a.btn.btn-outline', { href: ui.href('/track?number=' + order.number) }, t('trackOrderTitle')),
        h('a.btn.btn-outline', { href: ui.href('/products') }, t('continueShopping'))
      );
      var u = V.state.get('user');
      if (u && u.type === 'customer' && order.customerId === u.id) actions.appendChild(h('a.btn.btn-primary', { href: ui.href('/account/orders/' + order.number) }, t('viewOrder')));
      host.appendChild(actions);
    }

    V.orders.getByNumber(num).then(draw);
    return root;
  }

  // Payment-specific call-to-action block on the success/order page.
  function paymentAction(order, refresh) {
    var box = h('div.card.card-pad.stack.mt-4');
    if (order.paymentMethod === 'electronic' && order.paymentStatus === 'awaiting_payment') {
      box.appendChild(h('h3', t('pm_electronic')));
      box.appendChild(h('div.muted', t('payWindowNote')));
      box.appendChild(h('div.muted.help', t('simulatedNotice')));
      var payBtn = h('button.btn.btn-gold.btn-block', { type: 'button' }, ui.icon('credit-card', 'icon-sm'), ' ' + t('payNow'));
      payBtn.addEventListener('click', function () {
        payBtn.disabled = true;
        V.payments.confirmElectronic(order.id).then(function () { ui.toast(t('pst_paid'), 'success'); return V.orders.getByNumber(order.number); }).then(refresh)
          .catch(function (e) { payBtn.disabled = false; ui.toast(t(e.message === 'payment_expired' ? 'paymentExpired' : 'paymentFailed'), 'error'); });
      });
      box.appendChild(payBtn);
      return box;
    }
    if (order.paymentMethod === 'transfer' && ['awaiting_transfer', 'under_review'].indexOf(order.paymentStatus) !== -1) {
      box.appendChild(h('h3', t('pm_transfer')));
      box.appendChild(h('div.muted', t('transferNote')));
      box.appendChild(h('div.muted.help', t('simulatedNotice')));
      var refI = h('input.input', { placeholder: t('receiptReference') });
      var bankI = h('input.input', { placeholder: t('receiptBank') });
      var proofI = h('input.input', { placeholder: t('receiptProof') });
      var msg = h('div.muted');
      var sub = h('button.btn.btn-gold.btn-block', { type: 'button' }, t('submitReceipt'));
      sub.addEventListener('click', function () {
        sub.disabled = true;
        V.payments.submitReceipt(order.id, { reference: refI.value, bank: bankI.value, proofName: proofI.value }).then(function () {
          ui.toast(t('receiptSubmitted'), 'success'); return V.orders.getByNumber(order.number);
        }).then(refresh).catch(function (e) { sub.disabled = false; msg.textContent = t(e.message === 'reference_duplicate' ? 'referenceDuplicate' : (e.message === 'reference_required' ? 'referenceRequired' : 'error')); });
      });
      box.appendChild(refI); box.appendChild(bankI); box.appendChild(proofI); box.appendChild(sub); box.appendChild(msg);
      return box;
    }
    if (order.paymentMethod === 'cod' && order.paymentStatus !== 'paid') {
      box.appendChild(h('div.row', ui.icon('truck', 'icon-sm'), h('div', h('strong', t('pm_cod')), h('div.muted', t('codNote')))));
      return box;
    }
    return null;
  }

  function payStateLabel(s) { return t('pst_' + s) !== 'pst_' + s ? t('pst_' + s) : s; }
  function colStateLabel(s) { return t('cst_' + s) !== 'cst_' + s ? t('cst_' + s) : s; }
  function resStateLabel(s) { return t('rst_' + s) !== 'rst_' + s ? t('rst_' + s) : s; }
  function dualBadges(o) {
    var wrap = h('div.row.wrap.mt-2', { style: { gap: '6px' } });
    wrap.appendChild(h('span.badge.badge-gold', t('orderStatus') + ': ' + statusLabel(o.status)));
    if (o.paymentStatus) wrap.appendChild(h('span.badge' + (o.paymentStatus === 'paid' ? '.badge-green' : ''), t('paymentStatus') + ': ' + payStateLabel(o.paymentStatus)));
    if (o.collectionStatus) wrap.appendChild(h('span.badge', t('collectionStatus') + ': ' + colStateLabel(o.collectionStatus)));
    if (o.reservationStatus && o.reservationStatus !== 'none') wrap.appendChild(h('span.badge', t('reservationStatus') + ': ' + resStateLabel(o.reservationStatus)));
    return wrap;
  }

  /* ---------------- Track order ---------------- */
  function renderTrack(ctx) {
    var root = h('div.container', { style: { paddingBlock: 'var(--s6)', maxWidth: '820px' } });
    root.appendChild(ui.breadcrumb([{ label: t('navHome'), href: '/' }, { label: t('trackOrderTitle') }]));
    root.appendChild(h('div.lux-head',
      h('div.lux-head__eyebrow', ui.icon('search', 'icon-sm'), h('span', isAr() ? 'خدمة العملاء' : 'Support')),
      h('h1.lux-head__title', t('trackOrderTitle'))
    ));
    var input = h('input.input', { placeholder: t('orderNumber'), 'aria-label': t('orderNumber'), value: (ctx.query && ctx.query.number) || '' });
    var btn = h('button.btn.btn-primary', { type: 'button' }, ui.icon('search', 'icon-sm'), t('trackOrderBtn'));
    var result = h('div.mt-5');
    btn.addEventListener('click', lookup);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') lookup(); });
    root.appendChild(h('div.row.mt-4', input, btn));
    root.appendChild(result);

    function lookup() {
      var num = input.value.trim(); if (!num) return;
      V.orders.getByNumber(num).then(function (o) {
        V.clear(result);
        if (!o) { result.appendChild(ui.alert(t('orderNotFound'), 'danger')); return; }
        result.appendChild(orderCard(o, true));
      });
    }
    if (input.value) lookup();
    return root;
  }

  function statusLabel(s) { return t('st_' + s); }

  function orderCard(o, withItems) {
    var steps = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    var idx = steps.indexOf(o.status);
    var timeline = h('div.row.wrap.mt-3', { style: { gap: '6px' } });
    steps.forEach(function (s, i) {
      var done = idx >= i && o.status !== 'CANCELLED';
      timeline.appendChild(h('span.badge' + (done ? '.badge-green' : ''), { style: { opacity: done ? 1 : .5 } }, statusLabel(s)));
    });
    if (o.status === 'CANCELLED') timeline = h('div.mt-3', h('span.badge.badge-danger', statusLabel('CANCELLED')));
    var card = h('div.card.card-pad',
      h('div.row-between', h('strong.mono', o.number), h('span.badge.badge-gold', statusLabel(o.status))),
      h('div.muted.mt-2', U.formatDate(o.createdAt, V.state.get('lang'), true)),
      dualBadges(o),
      timeline
    );
    if (withItems) {
      var list = h('div.stack.mt-3');
      o.items.forEach(function (it) { list.appendChild(h('div.row-between', h('span', V.loc(it, 'name') + ' ×' + it.qty), h('span', V.moneyIn(it.lineTotal, o.shipping.market)))); });
      card.appendChild(h('div.divider.mt-3')); card.appendChild(list);
      card.appendChild(h('div.summary-row.total.mt-2', h('span', t('total')), h('strong', V.moneyIn(o.pricing.total, o.shipping.market))));
    }
    var u = V.state.get('user');
    if (u && u.type === 'customer' && o.customerId === u.id) {
      card.appendChild(h('div.row.mt-3', h('a.btn.btn-outline.btn-sm', { href: ui.href('/account/orders/' + o.number) }, t('orderDetail'))));
    }
    return card;
  }

  V.pages = V.pages || {};
  V.pages.cart = renderCart;
  V.pages.checkout = renderCheckout;
  V.pages.orderSuccess = renderSuccess;
  V.pages.track = renderTrack;
  V.pages._orderCard = orderCard;
  V.pages._statusLabel = statusLabel;
  V.pages._dualBadges = dualBadges;
  V.pages._paymentAction = paymentAction;
  V.pages._payStateLabel = payStateLabel;
  V.pages._colStateLabel = colStateLabel;
  V.pages._resStateLabel = resStateLabel;
})(window);
