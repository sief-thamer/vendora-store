/* ============================================================
   VENDORA — Services: notifications (customer + guest) and
   audit log. Local only. No real e-mail/SMS is sent; messages
   are stored in-app and clearly labelled as notifications.
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var U = V.utils;

  /* ---------------- Notifications ---------------- */
  function push(n) {
    n = n || {};
    var rec = {
      id: 'ntf_' + U.uid(''), customerId: n.customerId || null, email: (n.email || '').toLowerCase() || null,
      audience: n.audience || (n.customerId ? 'customer' : 'guest'),
      type: n.type || 'system',
      titleAr: n.titleAr || '', titleEn: n.titleEn || n.titleAr || '',
      bodyAr: n.bodyAr || '', bodyEn: n.bodyEn || n.bodyAr || '',
      link: n.link || null, orderId: n.orderId || null, productId: n.productId || null,
      read: false, at: Date.now()
    };
    return V.db.put('notifications', rec).then(function () { return rec; });
  }
  function pushMany(list) { return list.reduce(function (c, n) { return c.then(function (a) { return push(n).then(function (r) { a.push(r); return a; }); }); }, Promise.resolve([])); }

  function forCustomer(customerId, email) {
    return V.db.getAll('notifications').then(function (arr) {
      arr = arr.filter(function (n) {
        return (customerId && n.customerId === customerId) || (email && n.email === String(email).toLowerCase());
      });
      arr.sort(function (a, b) { return b.at - a.at; });
      return arr;
    });
  }
  function unreadCount(customerId, email) {
    return forCustomer(customerId, email).then(function (arr) { return arr.filter(function (n) { return !n.read; }).length; });
  }
  function markRead(id) {
    return V.db.get('notifications', id).then(function (n) { if (!n) return; n.read = true; return V.db.put('notifications', n); });
  }
  function markAllRead(customerId, email) {
    return forCustomer(customerId, email).then(function (arr) {
      return arr.filter(function (n) { return !n.read; }).reduce(function (c, n) { return c.then(function () { return markRead(n.id); }); }, Promise.resolve());
    });
  }
  function list(f) {
    f = f || {};
    return V.db.getAll('notifications').then(function (arr) {
      if (f.audience) arr = arr.filter(function (n) { return n.audience === f.audience; });
      if (f.type) arr = arr.filter(function (n) { return n.type === f.type; });
      arr.sort(function (a, b) { return b.at - a.at; });
      return f.limit ? arr.slice(0, f.limit) : arr;
    });
  }

  /* ---------------- Audit log ---------------- */
  function audit(entity, action, data) {
    data = data || {};
    var user = V.state.get('user');
    var rec = Object.assign({
      id: 'aud_' + U.uid(''), entity: entity, action: action,
      by: data.by || (user ? user.id : 'system'), byName: user ? user.name : 'system',
      at: Date.now()
    }, data);
    return V.db.put('audit', rec).then(function () { return rec; });
  }
  function auditList(f) {
    f = f || {};
    return V.db.getAll('audit').then(function (arr) {
      if (f.entity) arr = arr.filter(function (a) { return a.entity === f.entity; });
      arr.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      return f.limit ? arr.slice(0, f.limit) : arr;
    });
  }

  /* ---------------- Convenience business notifications ---------------- */
  function orderPlaced(order) {
    return push({
      customerId: order.customerId, email: order.contact && order.contact.email, audience: order.customerId ? 'customer' : 'guest',
      type: 'order', orderId: order.id,
      titleAr: 'تم استلام طلبك', titleEn: 'Order received',
      bodyAr: 'طلبك رقم ' + order.number + ' قيد المعالجة.', bodyEn: 'Your order ' + order.number + ' is being processed.',
      link: '#/account/orders/' + order.id
    });
  }
  function orderStatus(order, next) {
    return push({
      customerId: order.customerId, email: order.contact && order.contact.email, audience: order.customerId ? 'customer' : 'guest',
      type: 'order', orderId: order.id,
      titleAr: 'تحديث حالة الطلب', titleEn: 'Order status update',
      bodyAr: 'الطلب ' + order.number + ' أصبح: ' + V.t('st_' + next), bodyEn: 'Order ' + order.number + ' is now: ' + V.t('st_' + next),
      link: '#/account/orders/' + order.id
    });
  }

  V.notify = { push: push, pushMany: pushMany, forCustomer: forCustomer, unreadCount: unreadCount, markRead: markRead, markAllRead: markAllRead, list: list, orderPlaced: orderPlaced, orderStatus: orderStatus };
  V.audit = { log: audit, list: auditList };
})(window);
