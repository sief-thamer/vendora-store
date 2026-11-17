/* ============================================================
   VENDORA — Admin: sales (orders, order detail, returns,
   customers)
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var h = V.h;
  var ui = V.ui;
  var AU = V.adminUI;
  function t(k, v) { return V.t(k, v); }
  function isAr() { return V.state.get('lang') === 'ar'; }
  function money(n) { return V.money(n); }
  function dt(ts) { var V2 = V; return V2.utils.formatDate(ts, V.state.get('lang')); }

  var STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'RESCHEDULED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'RETURNED_TO_WAREHOUSE', 'REFUNDED'];

  /* ---------------- Orders ---------------- */
  function orders() {
    var state = { q: '', status: '', page: 1, per: 15 };
    var view = h('div'); var listWrap = h('div');
    function reload() {
      V.orders.list().then(function (all) {
        var search = AU.search(t('search') + '…', function (v) { state.q = v.toLowerCase(); state.page = 1; draw(); });
        var statusOpts = [{ value: '', label: t('all') }].concat(STATUSES.map(function (s) { return { value: s, label: t('st_' + s) }; }));
        var fSel = h('select.input');
        statusOpts.forEach(function (o) { var opt = h('option', { value: o.value }, o.label); if (o.value === state.status) opt.selected = true; fSel.appendChild(opt); });
        fSel.addEventListener('change', function () { state.status = fSel.value; state.page = 1; draw(); });
        V.mount(view, AU.title(t('orders'), h('span.badge.badge-gold', String(all.length))), AU.toolbar(search, fSel), listWrap);

        function draw() {
          var rows = all.filter(function (o) {
            if (state.status && o.status !== state.status) return false;
            if (state.q) { var hay = (o.number + ' ' + ((o.contact && o.contact.name) || '') + ' ' + ((o.contact && o.contact.email) || '')).toLowerCase(); if (hay.indexOf(state.q) < 0) return false; }
            return true;
          });
          var pages = Math.max(1, Math.ceil(rows.length / state.per));
          if (state.page > pages) state.page = pages;
          var slice = rows.slice((state.page - 1) * state.per, state.page * state.per);
          var table = AU.table([t('orderNumber'), t('customer'), t('market'), t('date'), t('items'), t('orderStatusCol'), t('total'), ''],
            slice.map(function (o) {
              var view2 = h('a.btn.btn-ghost.btn-sm', { href: '#/orders/' + o.id }, ui.icon('eye', 'icon-sm'), ' ' + t('details'));
              return [
                h('a', { href: '#/orders/' + o.id, style: { fontWeight: 700 } }, o.number),
                h('div', h('div', (o.contact && o.contact.name) || '—'), h('div.muted', { style: { fontSize: '.72rem' } }, (o.contact && o.contact.email) || '')),
                h('span.badge.badge-muted', o.pricing.currency),
                h('span.muted', dt(o.createdAt)),
                String((o.items || []).reduce(function (a, i) { return a + i.qty; }, 0)),
                AU.statusBadge(o.status),
                h('strong', money(o.pricing.total)),
                view2
              ];
            }));
          V.mount(listWrap, table, ui.pagination(rows.length, state.page, pages, function (pg) { state.page = pg; draw(); }));
        }
        draw();
      });
    }
    reload();
    return view;
  }

  function stateBadge(label, value, good) {
    if (!value) return null;
    var lbl = t(label) + ': ' + (t(value) !== value ? t(value) : value);
    return h('span.badge' + (good ? '.badge-green' : '.badge-muted'), { style: { marginInlineEnd: '6px' } }, lbl);
  }

  /* ---------------- Order detail ---------------- */
  function orderDetail(ctx) {
    var wrap = h('div');
    function reload() {
      V.orders.get(ctx.params.id).then(function (o) {
        if (!o) { V.mount(wrap, ui.empty({ icon: 'receipt', title: t('orderNotFound') })); return; }
        var role = (V.state.get('user') || {}).role;

        var actions = h('div.row.wrap', { style: { gap: '8px' } });
        var printBtn = h('button.btn.btn-ghost.btn-sm', { type: 'button' }, ui.icon('print', 'icon-sm'), ' ' + t('print'));
        printBtn.addEventListener('click', function () { if (!V.orders.printInvoice(o)) ui.toast(t('error'), 'warn'); });
        actions.appendChild(printBtn);
        (V.orders.TRANSITIONS[o.status] || []).forEach(function (next) {
          if (next === 'RETURNED' || next === 'REFUNDED') return; // handled via returns/refunds
          var b = h('button.btn.btn-sm' + (next === 'CANCELLED' ? '.btn-outline' : '.btn-primary'), { type: 'button' }, t('st_' + next));
          if (next === 'CANCELLED') b.style.color = 'var(--danger)';
          b.addEventListener('click', function () {
            b.disabled = true;
            V.orders.updateStatus(o.id, next, { by: 'staff' }).then(function () { ui.toast(t('saved'), 'success'); reload(); })
              .catch(function (e) { b.disabled = false; ui.toast(String((e && e.message) || e), 'error'); });
          });
          actions.appendChild(b);
        });

        var itemRows = (o.items || []).map(function (i) {
          return [
            h('div.row', { style: { gap: '10px', alignItems: 'center' } },
              h('img', { src: i.image || 'assets/images/ui/placeholder.svg', alt: '', style: { width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' } }),
              h('div', h('div', { style: { fontWeight: 600 } }, isAr() ? i.nameAr : i.nameEn), h('div.muted', { style: { fontSize: '.72rem' } }, i.sku || ''))),
            String(i.qty),
            money(i.unitPrice),
            h('strong', money(i.lineTotal))
          ];
        });

        var timeline = h('div.timeline', (o.events || []).map(function (ev) {
          return h('div.tl-item', h('div.tl-time', dt(ev.at)), h('div', h('strong', (ev.from ? t('st_' + ev.from) + ' → ' : '') + (ev.to ? t('st_' + ev.to) : ev.type)), h('div.muted', { style: { fontSize: '.78rem' } }, (ev.note || '') + (ev.by ? ' · ' + ev.by : ''))));
        }));

        var statusRow = h('div.row.wrap.mb-3', { style: { gap: '6px' } });
        [stateBadge('orderStatus', 'st_' + o.status),
         stateBadge('paymentStatus', 'pst_' + o.paymentStatus, o.paymentStatus === 'paid'),
         stateBadge('collectionStatus', 'cst_' + o.collectionStatus),
         (o.reservationStatus && o.reservationStatus !== 'none') ? stateBadge('reservationStatus', 'rst_' + o.reservationStatus) : null,
         o.returnStatus ? stateBadge('returnStatus', 'ret_' + o.returnStatus) : null
        ].forEach(function (b) { if (b) statusRow.appendChild(b); });

        // payment panel (transfer review / mark collected)
        var payPanel = h('div.card.card-pad.mt-4', h('h3', t('payment')), statusRow);
        payPanel.appendChild(h('div.muted', t('pm_' + (o.paymentMethod || 'cod'))));
        var payActions = h('div.row.wrap.mt-3', { style: { gap: '8px' } });
        V.payments.forOrder(o.id).then(function (pays) {
          var pay = pays[0];
          if (pay && pay.method === 'transfer') {
            V.payments.receipts().then(function (recs) {
              var rec = recs.filter(function (r) { return r.orderId === o.id && r.status === 'awaiting_review'; })[0];
              if (rec) {
                payPanel.appendChild(h('div.muted.mt-2', t('receiptReference') + ': ' + rec.reference + (rec.bank ? ' · ' + rec.bank : '')));
                [['accepted', 'acceptLabel', '.btn-primary'], ['rejected', 'rejectLabel', '.btn-outline'], ['needs_info', 'needsInfo', '.btn-ghost']].forEach(function (dt2) {
                  var b = h('button.btn.btn-sm' + dt2[2], { type: 'button' }, t(dt2[1]));
                  b.addEventListener('click', function () { b.disabled = true; V.payments.reviewTransfer(rec.id, dt2[0], { by: 'staff' }).then(function () { ui.toast(t('saved'), 'success'); reload(); }); });
                  payActions.appendChild(b);
                });
              }
            });
          }
          if (o.paymentMethod === 'cod' && o.collectionStatus === 'not_collected' && ['DELIVERED', 'OUT_FOR_DELIVERY'].indexOf(o.status) !== -1) {
            var col = h('button.btn.btn-primary.btn-sm', { type: 'button' }, t('markCollected'));
            col.addEventListener('click', function () { col.disabled = true; V.payments.markCollected(o.id).then(function () { ui.toast(t('saved'), 'success'); reload(); }); });
            payActions.appendChild(col);
          }
          if (payActions.children.length) payPanel.appendChild(payActions);
        });

        // return / refund panel
        var retPanel = h('div.card.card-pad.mt-4', h('h3', t('returns')));
        V.orders.returns().then(function (reqs) {
          var mine = reqs.filter(function (r) { return r.orderId === o.id; })[0];
          if (!mine) { retPanel.appendChild(h('div.muted', t('noData'))); return; }
          retPanel.appendChild(h('div.muted', (mine.type === 'exchange' ? t('requestExchange') : t('requestReturn')) + ' · ' + t('ret_' + mine.status) + (mine.reason ? ' · ' + mine.reason : '')));
          if (mine.status === 'requested') {
            var ab = h('button.btn.btn-primary.btn-sm.mt-2', { type: 'button' }, t('approveReturn'));
            ab.addEventListener('click', function () {
              ab.disabled = true;
              var items = (mine.items || []).map(function (i) { return { productId: i.productId, qty: i.qty, condition: i.condition || 'good' }; });
              V.orders.reviewReturn(mine.id, 'approved', { by: 'staff', items: items }).then(function () { ui.toast(t('saved'), 'success'); reload(); });
            });
            var rb = h('button.btn.btn-ghost.btn-sm.mt-2', { type: 'button' }, t('rejectReturn'));
            rb.addEventListener('click', function () { V.orders.reviewReturn(mine.id, 'rejected', { by: 'staff' }).then(function () { reload(); }); });
            retPanel.appendChild(h('div.row.mt-2', { style: { gap: '8px' } }, ab, rb));
          }
          if (o.status === 'RETURNED' || o.status === 'RETURNED_TO_WAREHOUSE') {
            var reqB = h('button.btn.btn-outline.btn-sm.mt-2', { type: 'button' }, t('requestRefund'));
            reqB.addEventListener('click', function () { V.payments.requestRefund(o.id, { amount: o.pricing.total, currency: o.pricing.currency, reason: 'return', by: 'staff' }).then(function () { ui.toast(t('saved'), 'success'); reload(); }); });
            retPanel.appendChild(reqB);
          }
        });
        V.payments.refunds().then(function (rds) {
          var rd = rds.filter(function (r) { return r.orderId === o.id && r.status === 'pending'; })[0];
          if (!rd) return;
          var mgr = V.perms.can(role, 'settings.edit');
          var ap = h('button.btn.btn-primary.btn-sm.mt-2', { type: 'button', disabled: !mgr, title: mgr ? '' : t('managerOnly') }, t('approveRefund'));
          if (!mgr) ap.style.opacity = .5;
          ap.addEventListener('click', function () {
            if (!mgr) { ui.toast(t('managerOnly'), 'error'); return; }
            ap.disabled = true;
            V.payments.decideRefund(rd.id, true, { note: 'approved' }).then(function () { ui.toast(t('refundApproved'), 'success'); reload(); })
              .catch(function (e) { ap.disabled = false; ui.toast(t((e && e.message) || 'error'), 'error'); });
          });
          retPanel.appendChild(h('div.row.mt-2', { style: { gap: '8px' } }, ap,
            h('button.btn.btn-ghost.btn-sm', { type: 'button', onclick: function () { V.payments.decideRefund(rd.id, false, { note: 'rejected' }).then(reload); } }, t('rejectLabel'))));
        });

        // shipments
        var shipPanel = h('div.card.card-pad.mt-4', h('h3', t('shipments')));
        V.orders.shipmentsFor(o.id).then(function (shps) {
          shps.forEach(function (s) { shipPanel.appendChild(h('div.row-between.mt-2', h('span', s.carrier), h('span.mono.muted', s.tracking))); });
          var mk = h('button.btn.btn-outline.btn-sm.mt-2', { type: 'button' }, t('createShipment'));
          mk.addEventListener('click', function () { mk.disabled = true; V.orders.createShipment(o.id, {}).then(function () { ui.toast(t('saved'), 'success'); reload(); }); });
          shipPanel.appendChild(mk);
        });

        V.mount(wrap,
          AU.title(t('orderNumber') + ' ' + o.number, h('a.btn.btn-ghost', { href: '#/orders' }, ui.icon('arrow-right', 'icon-sm'), ' ' + t('back'))),
          h('div.grid', { style: { gridTemplateColumns: 'minmax(0,2fr) minmax(280px,1fr)', gap: 'var(--s4)' } },
            h('div',
              h('div.card.card-pad',
                h('div.row-between.wrap.mb-3', { style: { gap: '8px' } }, AU.statusBadge(o.status), actions),
                AU.table([t('product'), t('qty'), t('price'), t('total')], itemRows)
              ),
              payPanel, retPanel, shipPanel,
              h('div.card.card-pad.mt-4', h('h3', t('timeline')), timeline)
            ),
            h('div',
              h('div.card.card-pad',
                h('h3', t('summary')),
                h('div.row-between', h('span', t('subtotal')), h('span', money(o.pricing.subtotal))),
                h('div.row-between', h('span', t('discount')), h('span', '-' + money(o.pricing.discount))),
                h('div.row-between', h('span', t('shipping')), h('span', money(o.pricing.shipping))),
                h('div.row-between', h('span', t('tax')), h('span', money(o.pricing.tax))),
                h('hr'),
                h('div.row-between', h('strong', t('total')), h('strong', money(o.pricing.total))),
                o.pricing.couponCode ? h('div.muted.mt-2', t('couponCode') + ': ' + o.pricing.couponCode) : null
              ),
              h('div.card.card-pad.mt-4',
                h('h3', t('customer')),
                h('div', (o.contact && o.contact.name) || '—'),
                h('div.muted', (o.contact && o.contact.phone) || ''),
                h('div.muted', (o.contact && o.contact.email) || '')
              ),
              h('div.card.card-pad.mt-4',
                h('h3', t('shipping')),
                o.shipping ? h('div',
                  h('div', (o.shipping.city || '') + (o.shipping.area ? ' — ' + o.shipping.area : '')),
                  h('div.muted', o.shipping.street || ''),
                  o.shipping.notes ? h('div.muted.mt-2', t('orderNotes') + ': ' + o.shipping.notes) : null
                ) : h('div.muted', t('noData'))
              )
            )
          )
        );
      });
    }
    reload();
    return wrap;
  }

  /* ---------------- Returns / transfers / refunds ---------------- */
  function returns() {
    var wrap = h('div');
    var body = h('div');
    var tab = 'returns';
    var tabs;
    function reload() {
      Promise.all([V.orders.returns(), V.payments.receipts(), V.payments.refunds()]).then(function (res) {
        var reqs = res[0], recs = res[1], rds = res[2];
        tabs = h('div.row.wrap.mb-4', { style: { gap: '6px' } });
        [['returns', t('returns'), reqs.length], ['transfers', t('transferReceipt'), recs.length], ['refunds', t('refund'), rds.length]].forEach(function (tb) {
          var b = h('button.btn.btn-sm' + (tab === tb[0] ? '.btn-primary' : '.btn-outline'), { type: 'button' }, tb[1] + ' (' + tb[2] + ')');
          b.addEventListener('click', function () { tab = tb[0]; reload(); });
          tabs.appendChild(b);
        });
        V.mount(wrap, AU.title(t('returns')), tabs, body);
        if (tab === 'returns') drawReturns(reqs);
        else if (tab === 'transfers') drawTransfers(recs);
        else drawRefunds(rds);
      });
    }
    function drawReturns(reqs) {
      var table = AU.table([t('orderNumber'), t('reason'), t('returnStatus'), t('actions')],
        reqs.map(function (r) {
          var actions = h('div.row', { style: { gap: '4px' } });
          if (r.status === 'requested') {
            var approve = h('button.btn.btn-primary.btn-sm', { type: 'button' }, t('approveReturn'));
            approve.addEventListener('click', function () {
              var items = (r.items || []).map(function (i) { return { productId: i.productId, qty: i.qty, condition: i.condition || 'good' }; });
              V.orders.reviewReturn(r.id, 'approved', { by: 'staff', items: items }).then(function () { ui.toast(t('saved'), 'success'); reload(); });
            });
            var reject = h('button.btn.btn-ghost.btn-sm', { type: 'button' }, t('rejectReturn'));
            reject.addEventListener('click', function () { V.orders.reviewReturn(r.id, 'rejected', { by: 'staff' }).then(reload); });
            actions.appendChild(approve); actions.appendChild(reject);
          }
          actions.appendChild(h('a.btn.btn-ghost.btn-sm', { href: '#/orders/' + r.orderId }, t('details')));
          return [h('a', { href: '#/orders/' + r.orderId, style: { fontWeight: 700 } }, r.orderNumber), r.reason || '—', h('span.badge.badge-muted', t('ret_' + r.status)), actions];
        }));
      V.mount(body, table);
    }
    function drawTransfers(recs) {
      var table = AU.table([t('orderNumber'), t('receiptReference'), t('receiptBank'), t('amount'), t('actions')],
        recs.map(function (r) {
          var actions = h('div.row', { style: { gap: '4px' } });
          if (r.status === 'awaiting_review') {
            [['accepted', 'acceptLabel', '.btn-primary'], ['rejected', 'rejectLabel', '.btn-outline'], ['needs_info', 'needsInfo', '.btn-ghost']].forEach(function (d) {
              var b = h('button.btn.btn-sm' + d[2], { type: 'button' }, t(d[1]));
              b.addEventListener('click', function () { b.disabled = true; V.payments.reviewTransfer(r.id, d[0], { by: 'staff' }).then(function () { ui.toast(t('saved'), 'success'); reload(); }); });
              actions.appendChild(b);
            });
          } else actions.appendChild(h('span.badge.badge-muted', t('ret_' + r.status) !== 'ret_' + r.status ? t('ret_' + r.status) : r.status));
          return [h('a', { href: '#/orders/' + r.orderId, style: { fontWeight: 700 } }, r.orderNumber), h('span.mono', r.reference), r.bank || '—', money(r.amount), actions];
        }));
      V.mount(body, table);
    }
    function drawRefunds(rds) {
      var role = (V.state.get('user') || {}).role;
      var mgr = V.perms.can(role, 'settings.edit');
      var table = AU.table([t('orderNumber'), t('refundAmount'), t('reason'), t('status'), t('actions')],
        rds.map(function (r) {
          var actions = h('div.row', { style: { gap: '4px' } });
          if (r.status === 'pending') {
            var ap = h('button.btn.btn-primary.btn-sm', { type: 'button', disabled: !mgr, title: mgr ? '' : t('managerOnly') }, t('approveRefund'));
            if (!mgr) ap.style.opacity = .5;
            ap.addEventListener('click', function () {
              ap.disabled = true;
              V.payments.decideRefund(r.id, true, { note: 'approved' }).then(function () { ui.toast(t('refundApproved'), 'success'); reload(); })
                .catch(function (e) { ap.disabled = false; ui.toast(t((e && e.message) || 'error'), 'error'); });
            });
            var rj = h('button.btn.btn-ghost.btn-sm', { type: 'button' }, t('rejectLabel'));
            rj.addEventListener('click', function () { V.payments.decideRefund(r.id, false, { note: 'rejected' }).then(reload); });
            actions.appendChild(ap); actions.appendChild(rj);
          } else actions.appendChild(h('span.badge.badge-muted', r.status));
          return [h('a', { href: '#/orders/' + r.orderId, style: { fontWeight: 700 } }, r.orderId), money(r.amount), r.reason || '—', r.status, actions];
        }));
      V.mount(body, table);
    }
    reload();
    return wrap;
  }

  /* ---------------- Customers ---------------- */
  function customers() {
    var state = { q: '' };
    var wrap = h('div'); var listWrap = h('div');
    function reload() {
      Promise.all([V.db.getAll('customers'), V.orders.list()]).then(function (res) {
        var custs = res[0], orders = res[1];
        var byCust = {}; orders.forEach(function (o) { if (o.customerId) { byCust[o.customerId] = byCust[o.customerId] || { n: 0, spend: 0 }; byCust[o.customerId].n++; byCust[o.customerId].spend += o.pricing.total; } });
        var search = AU.search(t('search') + '…', function (v) { state.q = v.toLowerCase(); draw(); });
        V.mount(wrap, AU.title(t('customers'), h('span.badge.badge-gold', String(custs.length))), AU.toolbar(search), listWrap);
        function draw() {
          var rows = custs.filter(function (c) { if (!state.q) return true; return ((c.name || '') + ' ' + (c.email || '') + ' ' + (c.phone || '')).toLowerCase().indexOf(state.q) >= 0; });
          var table = AU.table([t('name'), t('email'), t('phone'), t('market'), t('status'), t('orders'), t('totalSales'), ''],
            rows.map(function (c) {
              var stat = byCust[c.id] || { n: 0, spend: 0 };
              var b = h('button.btn.btn-ghost.btn-sm', { type: 'button' }, t('details'));
              b.addEventListener('click', function () { showCustomer(c, orders.filter(function (o) { return o.customerId === c.id; })); });
              var vStat = c.emailVerified ? h('span.badge.badge-green', t('emailVerified')) : h('span.badge.badge-muted', t('awaitingVerification'));
              return [h('strong', c.name || '—'), h('span.muted', c.email || '—'), h('span.muted', c.phone || '—'), h('span.badge.badge-muted', c.market || '—'), vStat, String(stat.n), money(stat.spend), b];
            }));
          V.mount(listWrap, table);
        }
        draw();
      });
    }
    function showCustomer(c, orders) {
      var body = h('div',
        h('div', h('strong', c.name || '—'), h('div.muted', c.email || '')),
        h('div.mt-3', AU.table([t('orderNumber'), t('date'), t('orderStatusCol'), t('total')],
          orders.map(function (o) { return [h('a', { href: '#/orders/' + o.id }, o.number), dt(o.createdAt), AU.statusBadge(o.status), money(o.pricing.total)]; })))
      );
      ui.modal(body, { title: t('customer'), size: 'lg' });
    }
    reload();
    return wrap;
  }

  V.apages.orders = orders;
  V.apages.orderDetail = orderDetail;
  V.apages.returns = returns;
  V.apages.customers = customers;
})(window);
