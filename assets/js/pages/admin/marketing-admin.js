/* ============================================================
   VENDORA — Admin: marketing (coupons, content, reviews)
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
  function dt(ts) { return V.utils.formatDate(ts, V.state.get('lang')); }

  function select(options, value) {
    var s = h('select.input');
    options.forEach(function (o) { var opt = h('option', { value: o.value }, o.label); if (String(o.value) === String(value)) opt.selected = true; s.appendChild(opt); });
    return s;
  }
  function marketGrid(obj, labelPrefix) {
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

  /* ---------------- Coupons ---------------- */
  function coupons() {
    var wrap = h('div');
    function reload() {
      V.couponsAdmin.list().then(function (list) {
        var addBtn = h('button.btn.btn-gold', { type: 'button' }, ui.icon('plus', 'icon-sm'), ' ' + t('add'));
        addBtn.addEventListener('click', function () { editor(null); });
        var table = AU.table([t('code'), t('type'), t('value'), t('minOrder'), t('used'), t('expires'), t('status'), t('actions')],
          list.map(function (c) {
            var edit = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: t('edit') }, ui.icon('edit', 'icon-sm'));
            edit.addEventListener('click', function () { editor(c); });
            var toggle = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: c.active ? t('inactive') : t('active') }, ui.icon(c.active ? 'close' : 'check', 'icon-sm'));
            toggle.addEventListener('click', function () { V.couponsAdmin.save(Object.assign({}, c, { active: !c.active })).then(reload); });
            var del = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: t('delete'), style: { color: 'var(--danger)' } }, ui.icon('trash', 'icon-sm'));
            del.addEventListener('click', function () { ui.confirm({ title: t('delete'), text: c.code }).then(function (ok) { if (ok) V.couponsAdmin.remove(c.id).then(reload); }); });
            return [
              h('strong', c.code),
              h('span.badge.badge-muted', t(c.type)),
              c.type === 'percent' ? (c.value + '%') : c.type === 'fixed' ? money(c.value) : '—',
              c.minOrder ? t('from') + ' ' + money(Math.min.apply(null, V.markets.map(function (mk) { return c.minOrder[mk.code] || 0; }))) : '—',
              String(c.used || 0) + (c.usageLimit ? '/' + c.usageLimit : ''),
              c.expiresAt ? dt(c.expiresAt) : '—',
              h('span.badge' + (c.active ? '.badge-green' : '.badge-muted'), c.active ? t('active') : t('inactive')),
              h('div.row', { style: { gap: '4px' } }, edit, toggle, del)
            ];
          }));
        V.mount(wrap, AU.title(t('coupons'), addBtn), table);
      });
    }
    function editor(c) {
      var isNew = !c; c = c || {};
      var fCode = h('input.input', { value: c.code || '' });
      var fType = select([{ value: 'percent', label: t('percent') }, { value: 'fixed', label: t('fixed') }, { value: 'freeship', label: t('freeship') }], c.type || 'percent');
      var fValue = h('input.input', { type: 'number', step: 'any', value: c.value != null ? c.value : 0 });
      var fLimit = h('input.input', { type: 'number', value: c.usageLimit || 0 });
      var fDate = h('input.input', { type: 'date', value: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : '' });
      var fMkt = select([{ value: '', label: t('all') }].concat(V.markets.map(function (mk) { return { value: mk.code, label: (isAr() ? mk.nameAr : mk.nameEn) }; })), c.marketCode || '');
      var fActive = h('input', { type: 'checkbox' }); fActive.checked = c.active !== false;
      var fAr = h('input.input', { value: c.descAr || '', dir: 'rtl' });
      var fEn = h('input.input', { value: c.descEn || '', dir: 'ltr' });
      var minGrid = marketGrid(c.minOrder || {}, t('minOrder'));
      AU.formModal(isNew ? t('add') : t('edit'),
        h('div',
          h('div.form-grid', AU.field(t('code'), fCode), AU.field(t('type'), fType), AU.field(t('value'), fValue), AU.field(t('usageLimit'), fLimit), AU.field(t('expires'), fDate), AU.field(t('market'), fMkt),
            h('label.field', h('span.f-label', t('status')), h('div.row', { style: { minHeight: '42px', alignItems: 'center' } }, h('label.row', { style: { gap: '6px', cursor: 'pointer' } }, fActive, h('span', t('active')))))),
          h('div.card.card-pad.mt-3', h('h4', t('minOrder')), minGrid),
          h('div.form-grid.mt-3', AU.field(t('description') + ' (ع)', fAr), AU.field(t('description') + ' (EN)', fEn))
        ),
        function () {
          var data = Object.assign({}, c, {
            code: fCode.value.trim().toUpperCase(), type: fType.value, value: parseFloat(fValue.value) || 0,
            usageLimit: parseInt(fLimit.value, 10) || 0, expiresAt: fDate.value ? new Date(fDate.value + 'T23:59:59').getTime() : null,
            marketCode: fMkt.value || null, active: fActive.checked, descAr: fAr.value.trim(), descEn: fEn.value.trim(),
            minOrder: minGrid.getValues(), used: c.used || 0, perCustomer: c.perCustomer || 1
          });
          return V.couponsAdmin.save(data).then(reload);
        }, { size: 'lg' });
    }
    reload();
    return wrap;
  }

  /* ---------------- Content ---------------- */
  function content() {
    var wrap = h('div');
    V.settings.get().then(function (s) {
      var f = {
        heroTitleAr: h('input.input', { value: s.heroTitleAr || '', dir: 'rtl' }),
        heroTitleEn: h('input.input', { value: s.heroTitleEn || '', dir: 'ltr' }),
        heroSubAr: h('input.input', { value: s.heroSubAr || '', dir: 'rtl' }),
        heroSubEn: h('input.input', { value: s.heroSubEn || '', dir: 'ltr' }),
        announceAr: h('input.input', { value: s.announceAr || '', dir: 'rtl' }),
        announceEn: h('input.input', { value: s.announceEn || '', dir: 'ltr' }),
        aboutAr: h('textarea.input', { rows: '4', dir: 'rtl' }, s.aboutAr || ''),
        aboutEn: h('textarea.input', { rows: '4', dir: 'ltr' }, s.aboutEn || '')
      };
      var save = h('button.btn.btn-gold', { type: 'button' }, ui.icon('check', 'icon-sm'), ' ' + t('save'));
      save.addEventListener('click', function () {
        var patch = {};
        Object.keys(f).forEach(function (k) { patch[k] = f[k].value.trim(); });
        save.disabled = true;
        V.settings.save(patch).then(function () { save.disabled = false; ui.toast(t('saved'), 'success'); });
      });
      V.mount(wrap,
        AU.title(t('content'), save),
        h('div.card.card-pad',
          h('h3', t('heroTitle')),
          h('div.form-grid', AU.field(t('heroTitle') + ' (ع)', f.heroTitleAr), AU.field(t('heroTitle') + ' (EN)', f.heroTitleEn),
            AU.field(t('subtitle') + ' (ع)', f.heroSubAr), AU.field(t('subtitle') + ' (EN)', f.heroSubEn))
        ),
        h('div.card.card-pad.mt-4',
          h('h3', t('announcement')),
          h('div.form-grid', AU.field(t('announcement') + ' (ع)', f.announceAr), AU.field(t('announcement') + ' (EN)', f.announceEn))
        ),
        h('div.card.card-pad.mt-4',
          h('h3', t('about')),
          h('div.form-grid', h('label.field.full', h('span.f-label', t('about') + ' (ع)'), f.aboutAr), h('label.field.full', h('span.f-label', t('about') + ' (EN)'), f.aboutEn))
        )
      );
    });
    return wrap;
  }

  /* ---------------- Reviews ---------------- */
  function reviews() {
    var state = { status: '', page: 1, per: 15 };
    var view = h('div'); var listWrap = h('div');
    function reload() {
      V.reviews.list().then(function (all) {
        var opts = [{ value: '', label: t('all') }, { value: 'pending', label: t('pendingStatus') }, { value: 'approved', label: t('approvedStatus') }, { value: 'rejected', label: t('rejectedStatus') }];
        var fSel = select(opts, state.status);
        fSel.addEventListener('change', function () { state.status = fSel.value; state.page = 1; draw(); });
        V.mount(view, AU.title(t('reviews'), h('span.badge.badge-gold', String(all.length))), AU.toolbar(fSel), listWrap);
        function draw() {
          var rows = all.filter(function (r) { return !state.status || r.status === state.status; });
          var pages = Math.max(1, Math.ceil(rows.length / state.per));
          if (state.page > pages) state.page = pages;
          var slice = rows.slice((state.page - 1) * state.per, state.page * state.per);
          var table = AU.table([t('product'), t('customer'), t('rating'), t('comment'), t('date'), t('status'), t('actions')],
            slice.map(function (r) {
              var p = V.catalog.get(r.productId);
              var appr = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: t('approve'), style: { color: 'var(--green)' } }, ui.icon('check', 'icon-sm'));
              appr.addEventListener('click', function () { V.reviews.moderate(r.id, 'approved').then(reload); });
              var rej = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: t('reject'), style: { color: 'var(--danger)' } }, ui.icon('close', 'icon-sm'));
              rej.addEventListener('click', function () { V.reviews.moderate(r.id, 'rejected').then(reload); });
              var stBadge = h('span.badge' + (r.status === 'approved' ? '.badge-green' : r.status === 'rejected' ? '.badge-danger' : '.badge-gold'), t(r.status));
              var statusCell = r.reported ? h('div.row', { style: { gap: '4px', alignItems: 'center' } }, stBadge, h('span.badge.badge-danger', t('reportReview'))) : stBadge;
              return [
                p ? h('a', { href: '#/products/' + p.id }, loc(p)) : '—',
                r.author || '—',
                ui.stars(r.rating),
                h('div', { style: { maxWidth: '320px' } }, r.body || r.title || ''),
                h('span.muted', dt(r.createdAt)),
                statusCell,
                h('div.row', { style: { gap: '4px' } }, appr, rej)
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

  V.apages.coupons = coupons;
  V.apages.content = content;
  V.apages.reviews = reviews;
})(window);
