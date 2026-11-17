/* ============================================================
   VENDORA — Admin: dashboard (KPIs, charts, recent activity)
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
  function U_(n) { return V.utils.formatNumber(n, V.state.get('lang')); }

  function statCard(icon, label, value, tone) {
    return h('div.stat-card.sc-' + (tone || 'navy'),
      h('span.sc-ico', ui.icon(icon, 'icon-lg')),
      h('div.sc-value', value),
      h('div.sc-label', label)
    );
  }

  function panel(title, sub, actions, body, flush) {
    return h('div.panel',
      h('div.panel-head',
        h('div', h('div.ph-title', title), sub ? h('div.ph-sub', sub) : null),
        actions ? h('div.row', { style: { gap: '8px' } }, actions) : null
      ),
      h('div.panel-body' + (flush ? '.flush' : ''), body)
    );
  }

  function bars(series) {
    var max = series.reduce(function (a, s) { return Math.max(a, s.value); }, 0) || 1;
    var wrap = h('div.chart-bars');
    series.forEach(function (s) {
      var pct = Math.round((s.value / max) * 100);
      wrap.appendChild(h('div.cb', { title: money(s.value) },
        h('div.barv', { style: { height: Math.max(3, pct) + '%' } }),
        h('div.cbl', s.label)
      ));
    });
    return wrap;
  }

  function donut(catRows) {
    var total = catRows.reduce(function (a, r) { return a + r.value; }, 0) || 1;
    var top = catRows[0] || { name: isAr() ? '—' : '—', value: 0 };
    var pct = Math.round((top.value / total) * 100);
    return h('div.stack', { style: { alignItems: 'center', gap: 'var(--s4)' } },
      h('div.donut', { style: { '--v': pct }, 'data-label': pct + '%' }),
      h('div.muted', { style: { textAlign: 'center' } }, (isAr() ? top.nameAr : top.nameEn) || top.name)
    );
  }

  function render() {
    return V.reports.dashboard().then(function (d) {
      var k = d.kpis;
      var root = h('div');
      var me = V.state.get('user') || {};
      var today = new Date().toLocaleDateString(isAr() ? 'ar-EG' : 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      root.appendChild(h('div.admin-page-header',
        h('div.aph-text',
          h('h1.aph-title', t('dashboard')),
          h('p.aph-sub', (me.name || me.username) ? (t('welcomeBack') + ' ' + (me.name || me.username) + ' • ' + today) : today)
        ),
        h('div.aph-actions',
          h('a.btn.btn-soft', { href: '#/products/new' }, ui.icon('plus', 'icon-sm'), ' ' + t('newProduct')),
          h('a.btn.btn-soft', { href: '#/orders' }, ui.icon('receipt', 'icon-sm'), ' ' + t('orders')),
          h('a.btn.btn-soft', { href: '#/reports' }, ui.icon('trending', 'icon-sm'), ' ' + t('reports'))
        )
      ));

      root.appendChild(h('div.stat-grid',
        statCard('receipt', t('orders'), U_(k.ordersCount), 'navy'),
        statCard('wallet', t('totalSales'), money(k.totalSales), 'gold'),
        statCard('trending', t('avgOrderValue'), money(k.avgOrderValue), 'info'),
        statCard('box', t('products'), U_(k.productsCount), 'green'),
        statCard('users', t('customers'), U_(k.customersCount), 'navy'),
        statCard('alert', t('lowStock'), U_(k.lowStockCount + k.outStockCount), 'danger')
      ));

      // Sales chart + category donut
      root.appendChild(h('div.grid.mt-5', { style: { gridTemplateColumns: 'minmax(0,2fr) minmax(260px,1fr)', gap: '16px' } },
        panel(t('salesLast30'), null, null, bars(d.salesByDay)),
        panel(t('byCategory'), null, null, d.salesByCategory.length ? donut(d.salesByCategory) : h('div.muted', { style: { padding: 'var(--s5)', textAlign: 'center' } }, t('noData')))
      ));

      // Recent orders + top products + low stock
      root.appendChild(h('div.grid.mt-5', { style: { gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' } },
        panel(t('recentOrders'), null, h('a.btn.btn-ghost.btn-sm', { href: '#/orders' }, t('all')),
          AU.table([t('orderNumber'), t('customer'), t('orderStatusCol'), t('total')],
            d.recentOrders.map(function (o) {
              return [
                h('a', { href: '#/orders/' + o.id, style: { fontWeight: 700 } }, o.number),
                (o.contact && o.contact.name) || '—',
                AU.statusBadge(o.status),
                h('strong', money(o.pricing.total))
              ];
            })), true
        ),
        panel(t('topProducts'), null, h('a.btn.btn-ghost.btn-sm', { href: '#/products' }, t('all')),
          AU.table([t('name'), t('stock'), t('revenue')],
            d.topProducts.map(function (p) {
              return [ h('a', { href: '#/products/' + p.productId }, isAr() ? p.nameAr : p.nameEn), U_(p.qty), h('strong', money(p.revenue)) ];
            })), true
        ),
        panel(t('lowStock'), null, h('a.btn.btn-ghost.btn-sm', { href: '#/inventory' }, t('all')),
          AU.table([t('name'), t('stock')],
            d.lowStock.map(function (x) {
              return [ x.product ? h('a', { href: '#/products/' + x.product.id }, loc(x.product)) : '—', h('span.badge.badge-danger', String(x.inventory.onHand)) ];
            })), true
        )
      ));

      // Fault monitoring (system health)
      var errs = (V.diag && V.diag.list) ? V.diag.list() : [];
      var errRows = errs.slice(0, 5).map(function (e) {
        return [ h('span.badge.badge-danger', e.kind), h('span', { title: e.extra || '' }, e.message), V.utils.formatDate(e.at, V.state.get('lang')) ];
      });
      root.appendChild(h('div.mt-5', panel(
        h('span.row', { style: { gap: '8px' } }, V.svg('alert', 'icon-sm'), h('span', t('systemHealth'))),
        null,
        h('div.row', { style: { gap: '8px' } },
          errs.length ? h('span.badge.badge-danger', String(errs.length)) : h('span.badge.badge-green', 'OK'),
          errs.length ? h('button.btn.btn-ghost.btn-sm', { onclick: function () { V.diag.clear(); if (V.router && V.router._resolve) V.router._resolve(); } }, t('clearErrors')) : null
        ),
        errs.length
          ? AU.table([t('type'), t('message'), t('date')], errRows)
          : h('div.muted', { style: { padding: 'var(--s5)', textAlign: 'center' } }, t('noErrors')),
        true
      )));

      return root;
    });
  }

  V.apages.dashboard = render;
})(window);
