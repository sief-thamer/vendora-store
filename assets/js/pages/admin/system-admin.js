/* ============================================================
   VENDORA — Admin: system (staff, settings, audit log)
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var h = V.h;
  var ui = V.ui;
  var AU = V.adminUI;
  function t(k, v) { return V.t(k, v); }
  function isAr() { return V.state.get('lang') === 'ar'; }
  function dt(ts) { return V.utils.formatDate(ts, V.state.get('lang'), true); }

  function select(options, value) {
    var s = h('select.input');
    options.forEach(function (o) { var opt = h('option', { value: o.value }, o.label); if (String(o.value) === String(value)) opt.selected = true; s.appendChild(opt); });
    return s;
  }
  function roleOptions() {
    return Object.keys(V.roles).map(function (k) { return { value: k, label: isAr() ? V.roles[k].ar : V.roles[k].en }; });
  }

  /* ---------------- Staff ---------------- */
  function staff() {
    var wrap = h('div');
    function reload() {
      V.staff.list().then(function (users) {
        var me = V.state.get('user');
        var addBtn = h('button.btn.btn-gold', { type: 'button' }, ui.icon('plus', 'icon-sm'), ' ' + t('add'));
        addBtn.addEventListener('click', function () { editor(null); });
        var table = AU.table([t('name'), t('username'), t('role'), t('status'), t('lastLogin'), t('actions')],
          users.map(function (u) {
            var edit = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: t('edit') }, ui.icon('edit', 'icon-sm'));
            edit.addEventListener('click', function () { editor(u); });
            var del = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: t('delete'), style: { color: 'var(--danger)' } }, ui.icon('trash', 'icon-sm'));
            if (me && me.id === u.id) del.disabled = true;
            del.addEventListener('click', function () { ui.confirm({ title: t('delete'), text: u.name || u.username }).then(function (ok) { if (ok) V.staff.remove(u.id).then(reload); }); });
            return [h('strong', u.name || '—'), h('span.muted', u.username), AU.roleName(u.role), h('span.badge' + (u.status === 'active' ? '.badge-green' : '.badge-muted'), t(u.status === 'active' ? 'active' : 'inactive')), h('span.muted', u.lastLogin ? dt(u.lastLogin) : '—'), h('div.row', { style: { gap: '4px' } }, edit, del)];
          }));
        V.mount(wrap, AU.title(t('staff'), addBtn), table);
      });
    }
    function editor(u) {
      var isNew = !u; u = u || {};
      var fName = h('input.input', { value: u.name || '' });
      var fUser = h('input.input', { value: u.username || '', autocomplete: 'off' });
      var fEmail = h('input.input', { value: u.email || '' });
      var fPhone = h('input.input', { value: u.phone || '' });
      var fRole = select(roleOptions(), u.role || 'role_viewer');
      var fStatus = select([{ value: 'active', label: t('active') }, { value: 'suspended', label: t('inactive') }], u.status || 'active');
      var fPass = h('input.input', { type: 'password', value: '', placeholder: isNew ? t('password') : '••••••••' });
      AU.formModal(isNew ? t('add') : t('edit'),
        h('div.form-grid',
          AU.field(t('name'), fName), AU.field(t('username'), fUser),
          AU.field(t('email'), fEmail), AU.field(t('phone'), fPhone),
          AU.field(t('role'), fRole), AU.field(t('status'), fStatus),
          h('label.field.full', h('span.f-label', t('password') + (isNew ? '' : ' (' + t('optional') + ')')), fPass)
        ),
        function () {
          if (!fUser.value.trim()) { ui.toast(t('fieldsRequired'), 'error'); return false; }
          if (isNew && !fPass.value) { ui.toast(t('fieldsRequired'), 'error'); return false; }
          var data = Object.assign({}, u, { name: fName.value.trim(), username: fUser.value.trim(), email: fEmail.value.trim(), phone: fPhone.value.trim(), role: fRole.value, status: fStatus.value });
          if (fPass.value) data.password = fPass.value;
          return V.staff.save(data).then(reload);
        });
    }
    reload();
    return wrap;
  }

  /* ---------------- Settings ---------------- */
  function settings() {
    var wrap = h('div');
    V.settings.get().then(function (s) {
      var fNameAr = h('input.input', { value: s.storeNameAr || '', dir: 'rtl' });
      var fNameEn = h('input.input', { value: s.storeNameEn || '', dir: 'ltr' });
      var fEmail = h('input.input', { value: s.supportEmail || '' });
      var fPhone = h('input.input', { value: s.supportPhone || '' });
      var fLow = h('input.input', { type: 'number', value: s.lowStockThreshold != null ? s.lowStockThreshold : V.config.LOW_STOCK });
      var fMarket = select(V.markets.map(function (mk) { return { value: mk.code, label: (isAr() ? mk.nameAr : mk.nameEn) + ' (' + mk.currency + ')' }; }), s.defaultMarket || V.config.DEFAULT_MARKET);
      var fCod = h('input', { type: 'checkbox' }); fCod.checked = s.codEnabled !== false;
      var fApproval = h('input', { type: 'checkbox' }); fApproval.checked = !!s.requireApproval;
      var fVerify = h('input', { type: 'checkbox' }); fVerify.checked = s.emailVerificationRequired !== false;
      var fNotify = h('input', { type: 'checkbox' }); fNotify.checked = s.notifyBackInStock !== false;
      var fReturn = h('input.input', { type: 'number', value: s.returnWindowDays != null ? s.returnWindowDays : 3 });
      var fEpay = h('input.input', { type: 'number', value: s.epayWindowMinutes != null ? s.epayWindowMinutes : 15 });
      var fTransfer = h('input.input', { type: 'number', value: s.transferReviewMinutes != null ? s.transferReviewMinutes : 120 });
      var fTtl = h('input.input', { type: 'number', value: s.reservationTtlMinutes != null ? s.reservationTtlMinutes : 60 });
      // payment method toggles
      var pmCfg = (s.paymentMethods || [
        { code: 'electronic', enabled: true, providers: [] },
        { code: 'transfer', enabled: true },
        { code: 'cod', enabled: s.codEnabled !== false }
      ]);
      var pmBoxes = {};
      function pmEnabled(code) { var m = pmCfg.filter(function (x) { return x.code === code; })[0]; return m ? m.enabled !== false : (code === 'cod' ? s.codEnabled !== false : true); }
      ['electronic', 'transfer', 'cod'].forEach(function (code) {
        var cb = h('input', { type: 'checkbox' }); cb.checked = pmEnabled(code); pmBoxes[code] = cb;
      });
      function buildPaymentMethods() {
        return ['electronic', 'transfer', 'cod'].map(function (code) {
          var existing = pmCfg.filter(function (x) { return x.code === code; })[0] || { code: code };
          return Object.assign({}, existing, { code: code, enabled: pmBoxes[code].checked });
        });
      }
      var save = h('button.btn.btn-gold', { type: 'button' }, ui.icon('check', 'icon-sm'), ' ' + t('save'));
      save.addEventListener('click', function () {
        save.disabled = true;
        V.settings.save({
          storeNameAr: fNameAr.value.trim(), storeNameEn: fNameEn.value.trim(),
          supportEmail: fEmail.value.trim(), supportPhone: fPhone.value.trim(),
          lowStockThreshold: parseInt(fLow.value, 10) || V.config.LOW_STOCK,
          defaultMarket: fMarket.value, codEnabled: fCod.checked, requireApproval: fApproval.checked,
          emailVerificationRequired: fVerify.checked, notifyBackInStock: fNotify.checked,
          returnWindowDays: parseInt(fReturn.value, 10) || 3,
          epayWindowMinutes: parseInt(fEpay.value, 10) || 15,
          transferReviewMinutes: parseInt(fTransfer.value, 10) || 120,
          reservationTtlMinutes: parseInt(fTtl.value, 10) || 60,
          paymentMethods: buildPaymentMethods()
        }).then(function () { save.disabled = false; ui.toast(t('saved'), 'success'); });
      });
      /* ---- Delivery regions & rates management ---- */
      var dMarket = select(V.markets.map(function (mk) { return { value: mk.code, label: (isAr() ? mk.nameAr : mk.nameEn) + ' (' + mk.currency + ')' }; }), s.defaultMarket || V.config.DEFAULT_MARKET);
      var dHost = h('div.mt-3');
      function numInput(val, min) { var i = h('input.input', { type: 'number', value: val != null ? val : '' }); if (min != null) i.setAttribute('min', min); return i; }
      function regionEditor(region) {
        var isNew = !region; region = region || {};
        var mk = V.getMarket(dMarket.value);
        var fAr = h('input.input', { value: region.city || '', dir: 'rtl' });
        var fEn = h('input.input', { value: region.cityEn || '', dir: 'ltr' });
        var fFee = numInput(region.__fee != null ? region.__fee : (mk.shippingFlat || 0), 0);
        var fFree = numInput(region.__freeOver != null ? region.__freeOver : mk.freeShippingOver, 0);
        var fMin = numInput(region.__etaMin != null ? region.__etaMin : 1, 0);
        var fMax = numInput(region.__etaMax != null ? region.__etaMax : 5, 0);
        var cCap = h('input', { type: 'checkbox' }); cCap.checked = !!region.isCapital;
        var cCod = h('input', { type: 'checkbox' }); cCod.checked = region.__codAllowed !== false;
        var cAct = h('input', { type: 'checkbox' }); cAct.checked = region.active !== false;
        AU.formModal(isNew ? t('addCity') : t('edit'),
          h('div.form-grid',
            AU.field(t('cityAr'), fAr), AU.field(t('cityEn'), fEn),
            AU.field(t('fee'), fFee), AU.field(t('freeOver'), fFree),
            AU.field(t('etaFrom'), fMin), AU.field(t('etaTo'), fMax),
            h('label.field', h('span.f-label', t('capital')), cCap),
            h('label.field', h('span.f-label', t('codAllowed')), cCod),
            h('label.field', h('span.f-label', t('status')), cAct)
          ),
          function () {
            if (!fAr.value.trim()) { ui.toast(t('fieldsRequired'), 'error'); return false; }
            return V.delivery.saveRegion({ id: region.id, marketCode: dMarket.value, city: fAr.value.trim(), cityEn: fEn.value.trim(), isCapital: cCap.checked, active: cAct.checked }).then(function (rec) {
              return V.delivery.adminRates(rec.id).then(function (rs) {
                return V.delivery.saveRate({ id: (rs[0] && rs[0].id) || undefined, regionId: rec.id, marketCode: dMarket.value, fee: parseFloat(fFee.value) || 0, freeOver: fFree.value === '' ? null : parseFloat(fFree.value), etaMin: parseInt(fMin.value, 10) || 0, etaMax: parseInt(fMax.value, 10) || 0, codAllowed: cCod.checked, active: true });
              });
            }).then(reloadD);
          });
      }
      function reloadD() {
        V.delivery.adminRegions(dMarket.value).then(function (regions) {
          Promise.all(regions.map(function (r) { return V.delivery.adminRates(r.id).then(function (rs) { return { region: r, rate: rs[0] || {} }; }); })).then(function (pairs) {
            var addBtn = h('button.btn.btn-ghost', { type: 'button' }, ui.icon('plus', 'icon-sm'), ' ' + t('addCity'));
            addBtn.addEventListener('click', function () { regionEditor(null); });
            var rows = pairs.map(function (p) {
              var r = p.region, rt = p.rate;
              var edit = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: t('edit') }, ui.icon('edit', 'icon-sm'));
              edit.addEventListener('click', function () { regionEditor(Object.assign({}, r, { __fee: rt.fee, __freeOver: rt.freeOver, __etaMin: rt.etaMin, __etaMax: rt.etaMax, __codAllowed: rt.codAllowed, __rateId: rt.id })); });
              var del = h('button.btn.btn-ghost.btn-icon', { type: 'button', title: t('delete'), style: { color: 'var(--danger)' } }, ui.icon('trash', 'icon-sm'));
              del.addEventListener('click', function () { ui.confirm({ title: t('delete'), text: r.city }).then(function (ok) { if (ok) V.delivery.removeRegion(r.id).then(reloadD); }); });
              return [h('span', r.city), h('span.muted', r.cityEn || '—'), h('span', rt.fee != null ? rt.fee : '—'),
                h('span.muted', rt.freeOver != null ? rt.freeOver : '—'),
                h('span.muted', rt.etaMin != null ? (rt.etaMin + '-' + rt.etaMax) : '—'),
                h('span.badge' + (rt.codAllowed === false ? '.badge-muted' : '.badge-green'), rt.codAllowed === false ? t('no') : t('yes')),
                r.isCapital ? h('span.badge.badge-gold', t('capital')) : h('span.muted', '—'),
                h('span.badge' + (r.active !== false ? '.badge-green' : '.badge-muted'), t(r.active !== false ? 'active' : 'inactive')),
                h('div.row', { style: { gap: '4px' } }, edit, del)];
            });
            V.mount(dHost, h('div.row-between.mb-3.wrap', dMarket, addBtn), AU.table([t('city'), t('cityEn'), t('fee'), t('freeOver'), t('eta'), t('codAllowed'), t('capital'), t('status'), t('actions')], rows));
          });
        });
      }
      dMarket.addEventListener('change', reloadD);
      reloadD();

      V.mount(wrap,
        AU.title(t('settings'), save),
        h('div.card.card-pad',
          h('h3', t('storeInfo')),
          h('div.form-grid', AU.field(t('name') + ' (ع)', fNameAr), AU.field(t('name') + ' (EN)', fNameEn), AU.field(t('supportEmail'), fEmail), AU.field(t('phone'), fPhone))
        ),
        h('div.card.card-pad.mt-4',
          h('h3', t('settings')),
          h('div.form-grid', AU.field(t('lowStock'), fLow), AU.field(t('market'), fMarket)),
          h('div.stack.mt-3',
            h('label.row', { style: { gap: '8px', cursor: 'pointer' } }, fCod, h('span', t('codDesc'))),
            h('label.row', { style: { gap: '8px', cursor: 'pointer' } }, fApproval, h('span', t('requireApproval'))),
            h('label.row', { style: { gap: '8px', cursor: 'pointer' } }, fVerify, h('span', t('verifyEmailTitle'))),
            h('label.row', { style: { gap: '8px', cursor: 'pointer' } }, fNotify, h('span', t('backInStockTitle')))
          )
        ),
        h('div.card.card-pad.mt-4',
          h('h3', t('paymentSettings')),
          h('div.stack.mt-3',
            h('label.row', { style: { gap: '8px', cursor: 'pointer' } }, pmBoxes.electronic, h('span', t('pm_electronic'))),
            h('label.row', { style: { gap: '8px', cursor: 'pointer' } }, pmBoxes.transfer, h('span', t('pm_transfer'))),
            h('label.row', { style: { gap: '8px', cursor: 'pointer' } }, pmBoxes.cod, h('span', t('pm_cod')))
          ),
          h('div.muted.help.mt-2', t('simulatedNotice'))
        ),
        h('div.card.card-pad.mt-4',
          h('h3', isAr() ? 'سياسات دورة الحياة' : 'Lifecycle policies'),
          h('div.form-grid', AU.field(t('returnWindowNote'), fReturn), AU.field(t('payWindowNote'), fEpay), AU.field(t('transferNote'), fTransfer), AU.field(t('reservationStatus'), fTtl))
        ),
        h('div.card.card-pad.mt-4',
          h('h3', t('deliveryMgmt')),
          dHost
        ),
        h('div.card.card-pad.mt-4',
          h('h3', t('backup')),
          h('p.muted', t('backupDesc')),
          (function () {
            var expBtn = h('button.btn.btn-outline', { type: 'button' }, ui.icon('download', 'icon-sm'), ' ' + t('export'));
            expBtn.addEventListener('click', function () {
              V.db.exportAll().then(function (snap) {
                var blob = new Blob([JSON.stringify(snap)], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = h('a', { href: url, download: 'vendora-backup-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json' });
                document.body.appendChild(a); a.click(); a.remove();
                setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
                ui.toast(t('backupDone'), 'success');
              });
            });
            var fileInput = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
            fileInput.addEventListener('change', function () {
              var file = fileInput.files && fileInput.files[0]; if (!file) return;
              var reader = new FileReader();
              reader.onload = function () {
                var snap; try { snap = JSON.parse(reader.result); } catch (e) { ui.toast(t('invalidBackup'), 'error'); fileInput.value = ''; return; }
                if (!snap || !snap.stores) { ui.toast(t('invalidBackup'), 'error'); fileInput.value = ''; return; }
                ui.confirm({ title: t('restore'), text: t('restoreConfirm'), confirmLabel: t('restore') }).then(function (ok) {
                  if (!ok) { fileInput.value = ''; return; }
                  V.db.importAll(snap).then(function () { ui.toast(t('restoreDone'), 'success'); setTimeout(function () { location.reload(); }, 800); }, function () { ui.toast(t('invalidBackup'), 'error'); fileInput.value = ''; });
                });
              };
              reader.readAsText(file);
            });
            var resBtn = h('button.btn.btn-outline', { type: 'button' }, ui.icon('refresh', 'icon-sm'), ' ' + t('restore'));
            resBtn.addEventListener('click', function () { fileInput.click(); });
            return h('div.row.wrap', { style: { gap: '8px' } }, expBtn, resBtn, fileInput);
          })()
        ),
        h('div.card.card-pad.mt-4',
          h('h3', t('dangerZone')),
          h('p.muted', t('resetDesc')),
          (function () { var b = h('button.btn.btn-outline', { type: 'button', style: { color: 'var(--danger)' } }, ui.icon('refresh', 'icon-sm'), ' ' + t('resetDemo')); b.addEventListener('click', function () { ui.confirm({ title: t('resetDemo'), text: t('resetDesc'), confirmLabel: t('resetDemo') }).then(function (ok) { if (ok) { V.seed.ensure(true).then(function () { ui.toast(t('saved'), 'success'); setTimeout(function () { location.reload(); }, 600); }); } }); }); return b; })()
        )
      );
    });
    return wrap;
  }

  /* ---------------- Audit ---------------- */
  function audit() {
    var state = { entity: '', page: 1, per: 20 };
    var view = h('div'); var listWrap = h('div');
    function reload() {
      V.audit.list().then(function (all) {
        var entities = [''].concat(Object.keys(all.reduce(function (m, a) { m[a.entity] = 1; return m; }, {})));
        var fSel = select(entities.map(function (e) { return { value: e, label: e || t('all') }; }), state.entity);
        fSel.addEventListener('change', function () { state.entity = fSel.value; state.page = 1; draw(); });
        V.mount(view, AU.title(t('audit'), h('span.badge.badge-gold', String(all.length))), AU.toolbar(fSel), listWrap);
        function draw() {
          var rows = all.filter(function (a) { return !state.entity || a.entity === state.entity; });
          var pages = Math.max(1, Math.ceil(rows.length / state.per));
          if (state.page > pages) state.page = pages;
          var slice = rows.slice((state.page - 1) * state.per, state.page * state.per);
          var table = AU.table([t('date'), t('by'), 'Entity', t('action'), t('details')],
            slice.map(function (a) {
              return [h('span.muted.nowrap', dt(a.at)), h('span', a.by || '—'), h('span.badge.badge-muted', a.entity), h('strong', a.action), h('span.muted', { style: { fontSize: '.74rem', wordBreak: 'break-all' } }, JSON.stringify(a.meta || {}))];
            }));
          V.mount(listWrap, table, ui.pagination(rows.length, state.page, pages, function (pg) { state.page = pg; draw(); }));
        }
        draw();
      });
    }
    reload();
    return view;
  }

  V.apages.staff = staff;
  V.apages.settings = settings;
  V.apages.audit = audit;
})(window);
