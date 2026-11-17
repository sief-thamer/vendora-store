/* ============================================================
   VENDORA — Services: accounts (customer + staff auth, roles,
   permissions, addresses, session persistence)
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var U = V.utils;

  /* ---------------- Roles & permissions ---------------- */
  V.roles = {
    role_admin: { ar: 'مدير النظام', en: 'System admin', perms: ['*'] },
    role_products: { ar: 'مسؤول المنتجات', en: 'Products manager', perms: ['dashboard', 'products.view', 'products.edit', 'categories.edit', 'brands.edit', 'inventory.view', 'reviews.moderate', 'content.edit', 'marketing.edit'] },
    role_inventory: { ar: 'مسؤول المخزون', en: 'Inventory manager', perms: ['dashboard', 'products.view', 'inventory.view', 'inventory.edit'] },
    role_orders: { ar: 'مسؤول الطلبات', en: 'Orders manager', perms: ['dashboard', 'orders.view', 'orders.edit', 'returns.edit', 'customers.view', 'reports.view'] },
    role_marketing: { ar: 'مسؤول التسويق', en: 'Marketing manager', perms: ['dashboard', 'content.edit', 'marketing.edit', 'coupons.edit', 'reports.view'] },
    role_support: { ar: 'خدمة العملاء', en: 'Support agent', perms: ['dashboard', 'orders.view', 'customers.view', 'reviews.moderate'] },
    role_accountant: { ar: 'المحاسب', en: 'Accountant', perms: ['dashboard', 'reports.view', 'orders.view', 'audit.view'] },
    role_viewer: { ar: 'مدقّق (قراءة فقط)', en: 'Viewer', perms: ['dashboard', 'reports.view'] }
  };
  V.perms = {
    can: function (role, perm) {
      var r = V.roles[role]; if (!r) return false;
      return r.perms.indexOf('*') !== -1 || r.perms.indexOf(perm) !== -1;
    },
    list: function (role) { var r = V.roles[role]; return r ? r.perms : []; }
  };

  var SESSION_KEY = 'session';

  /* ---------------- Session ---------------- */
  function restoreSession() {
    var s = V.ls.get(SESSION_KEY, null);
    if (s && s.id) { V.state.set('user', s); return Promise.resolve(s); }
    V.state.set('user', null);
    return Promise.resolve(null);
  }
  function setSession(user) {
    V.state.set('user', user);
    if (user) V.ls.set(SESSION_KEY, user); else V.ls.del(SESSION_KEY);
    return V.commerce.onOwnerChange().then(function () { V.bus.emit('auth:changed', user); return user; });
  }

  function sixDigit() { return String(Math.floor(100000 + Math.random() * 900000)); }

  /* ---------------- Email verification ---------------- */
  // Creates a 6-digit verification code (SIMULATED e-mail — code is returned for the UI to display).
  function createVerification(customer, ttlMinutes) {
    var code = sixDigit();
    var rec = { id: 'vtk_' + U.uid(''), customerId: customer.id, email: customer.email, token: code, type: 'email', used: false, expiresAt: Date.now() + (ttlMinutes || 30) * 60000, createdAt: Date.now() };
    return V.db.put('verificationTokens', rec).then(function () { return code; });
  }
  function verifyEmail(email, code) {
    email = String(email || '').trim().toLowerCase();
    code = String(code || '').trim();
    return V.db.getOneByIndex('customers', 'email', email).then(function (c) {
      if (!c) throw new Error('not_found');
      if (c.emailVerified) return c;
      return V.db.getAllByIndex('verificationTokens', 'customerId', c.id).then(function (list) {
        var tk = list.filter(function (t) { return !t.used && t.token === code && t.expiresAt > Date.now(); })[0];
        if (!tk) throw new Error('invalidCode');
        tk.used = true;
        return V.db.put('verificationTokens', tk).then(function () {
          c.emailVerified = true; c.status = 'active';
          return V.db.put('customers', c).then(function () {
            return setSession({ type: 'customer', id: c.id, name: c.name, email: c.email, phone: c.phone, market: c.market }).then(function () { return c; });
          });
        });
      });
    });
  }
  function resendVerification(email) {
    email = String(email || '').trim().toLowerCase();
    return V.db.getOneByIndex('customers', 'email', email).then(function (c) {
      if (!c) throw new Error('not_found');
      return createVerification(c).then(function (code) { return { email: c.email, devCode: code }; });
    });
  }

  /* ---------------- Password reset ---------------- */
  function requestReset(email) {
    email = String(email || '').trim().toLowerCase();
    return V.db.getOneByIndex('customers', 'email', email).then(function (c) {
      if (!c) throw new Error('not_found');
      var code = sixDigit();
      var rec = { id: 'rtk_' + U.uid(''), customerId: c.id, email: c.email, token: code, used: false, expiresAt: Date.now() + 30 * 60000, createdAt: Date.now() };
      return V.db.put('resetTokens', rec).then(function () { return { email: c.email, devCode: code }; });
    });
  }
  function resetPassword(email, code, newPassword) {
    email = String(email || '').trim().toLowerCase();
    code = String(code || '').trim();
    if (!newPassword) throw new Error('fieldsRequired');
    return V.db.getOneByIndex('customers', 'email', email).then(function (c) {
      if (!c) throw new Error('not_found');
      return V.db.getAllByIndex('resetTokens', 'customerId', c.id).then(function (list) {
        var tk = list.filter(function (t) { return !t.used && t.token === code && t.expiresAt > Date.now(); })[0];
        if (!tk) throw new Error('invalidCode');
        tk.used = true;
        return V.db.put('resetTokens', tk).then(function () {
          c.password = U.hashPassword(newPassword, c.email);
          return V.db.put('customers', c).then(function () { return V.notify.push({ customerId: c.id, email: c.email, type: 'account', titleAr: 'تم تغيير كلمة المرور', titleEn: 'Password changed', bodyAr: 'تم تحديث كلمة مرور حسابك.', bodyEn: 'Your account password was updated.' }).then(function () { return c; }); });
        });
      });
    });
  }

  /* ---------------- Customer auth ---------------- */
  function register(data) {
    data = data || {};
    var email = String(data.email || '').trim().toLowerCase();
    if (!email || !data.password) return Promise.reject(new Error('fieldsRequired'));
    if (data.password !== data.confirmPassword) return Promise.reject(new Error('passwordMismatch'));
    return V.db.getOneByIndex('customers', 'email', email).then(function (existing) {
      if (existing) throw new Error('emailExists');
      return V.db.get('settings', 'general').then(function (s) {
        var needVerify = !s || s.emailVerificationRequired !== false;
        var c = {
          id: 'cus_' + U.uid(''), name: data.name || '', email: email, phone: data.phone || '',
          password: U.hashPassword(data.password, email), market: V.state.get('market'),
          status: needVerify ? 'pending' : 'active', emailVerified: !needVerify, createdAt: Date.now(), addresses: []
        };
        return V.db.put('customers', c).then(function () {
          var session = { type: 'customer', id: c.id, name: c.name, email: c.email, phone: c.phone, market: c.market };
          if (needVerify) return createVerification(c).then(function (code) { return { pendingVerification: true, customerId: c.id, email: c.email, devCode: code, verifyRequired: true }; });
          return setSession(session).then(function () { return session; });
        });
      });
    });
  }

  function login(email, password) {
    email = String(email || '').trim().toLowerCase();
    return V.db.getOneByIndex('customers', 'email', email).then(function (c) {
      if (!c) throw new Error('invalidCredentials');
      if (c.password !== U.hashPassword(password, email)) throw new Error('invalidCredentials');
      if (c.status !== 'active') {
        if (!c.emailVerified) return { pendingVerification: true, customerId: c.id, email: c.email };
        throw new Error('accountInactive');
      }
      return setSession({ type: 'customer', id: c.id, name: c.name, email: c.email, phone: c.phone, market: c.market });
    });
  }

  /* ---------------- Staff auth ---------------- */
  function staffLogin(username, password) {
    username = String(username || '').trim().toLowerCase();
    return V.db.getOneByIndex('users', 'username', username).then(function (u) {
      if (!u || u.status !== 'active') throw new Error('invalidCredentials');
      if (u.password !== U.hashPassword(password, username)) throw new Error('invalidCredentials');
      return V.db.put('users', Object.assign({}, u, { lastLogin: Date.now() })).then(function () {
        return setSession({ type: 'staff', id: u.id, name: u.name, username: u.username, role: u.role });
      });
    });
  }

  function logout() { return setSession(null); }

  /* ---------------- Addresses ---------------- */
  function addresses(customerId) { return V.db.getAllByIndex('addresses', 'customerId', customerId); }
  function saveAddress(customerId, addr) {
    addr = Object.assign({ id: addr.id || ('adr_' + U.uid('')), customerId: customerId, createdAt: addr.createdAt || Date.now() }, addr);
    return V.db.put('addresses', addr);
  }
  function deleteAddress(id) { return V.db.del('addresses', id); }

  /* ---------------- Customer profile ---------------- */
  function getCustomer(id) { return V.db.get('customers', id); }
  function updateCustomer(id, patch) {
    return V.db.get('customers', id).then(function (c) {
      if (!c) throw new Error('not_found');
      var next = Object.assign({}, c, patch);
      return V.db.put('customers', next).then(function () {
        var sess = V.state.get('user');
        if (sess && sess.id === id) return setSession(Object.assign({}, sess, { name: next.name, phone: next.phone }));
        return next;
      });
    });
  }
  function changePassword(id, oldPwd, newPwd) {
    return V.db.get('customers', id).then(function (c) {
      if (!c || c.password !== U.hashPassword(oldPwd, c.email)) throw new Error('invalidCredentials');
      c.password = U.hashPassword(newPwd, c.email);
      return V.db.put('customers', c);
    });
  }
  function deleteAccount(id) {
    return V.db.get('customers', id).then(function (c) {
      if (!c) throw new Error('not_found');
      return addresses(id).then(function (list) {
        return Promise.all(list.map(function (a) { return V.db.del('addresses', a.id); })).then(function () { return V.db.del('customers', id); });
      }).then(function () { return setSession(null); });
    });
  }
  function listCustomers() { return V.db.getAll('customers').then(function (a) { return a.sort(function (x, y) { return y.createdAt - x.createdAt; }); }); }

  /* ---------------- Guard helper ---------------- */
  function requirePerm(perm) {
    var u = V.state.get('user');
    if (!u || u.type !== 'staff' || !V.perms.can(u.role, perm)) throw new Error('forbidden');
    return u;
  }

  V.account = {
    restore: restoreSession,
    register: register, login: login, staffLogin: staffLogin, logout: logout,
    verifyEmail: verifyEmail, resendVerification: resendVerification,
    requestReset: requestReset, resetPassword: resetPassword,
    setSession: setSession,
    addresses: addresses, saveAddress: saveAddress, deleteAddress: deleteAddress,
    getCustomer: getCustomer, updateCustomer: updateCustomer, changePassword: changePassword, deleteAccount: deleteAccount,
    listCustomers: listCustomers,
    requirePerm: requirePerm
  };
})(window);
