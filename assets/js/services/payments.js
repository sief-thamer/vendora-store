/* ============================================================
   VENDORA — Services: payments (electronic / manual transfer / COD),
   15-minute electronic window, 2-hour manual-transfer review,
   collection tracking, and manager-approved refunds.
   All financial actions are SIMULATED and clearly marked. Local only.
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var U = V.utils;

  function t(key) { return V.t(key); }
  function now() { return Date.now(); }

  // Sensitive financial actions are always written to the audit store.
  function audit(entity, action, data) {
    data = data || {};
    var user = V.state.get('user');
    var by = data.by || (user ? (user.username || user.email || user.id) : 'system');
    return V.db.put('audit', Object.assign({
      id: 'aud_' + U.uid(''), entity: entity, action: action,
      by: by, byName: user ? user.name : 'system', at: now()
    }, data));
  }

  var E_PAYMENT_STATES = ['pending', 'authorized', 'paid', 'failed', 'expired', 'cancelled'];
  var TRANSFER_STATES = ['awaiting_receipt', 'awaiting_review', 'under_review', 'accepted', 'rejected', 'needs_info', 'expired'];
  var COLLECTION_STATES = ['not_collected', 'partial', 'collected', 'failed', 'refunded'];

  function settings() { return V.db.get('settings', 'general'); }

  /* ---------------- Methods available for a market ---------------- */
  function methods(marketCode) {
    return settings().then(function (s) {
      var cfg = (s && s.paymentMethods) || [
        { code: 'electronic', enabled: true, providers: [] },
        { code: 'transfer', enabled: true },
        { code: 'cod', enabled: s ? s.codEnabled !== false : true }
      ];
      return cfg.filter(function (m) { return m.enabled !== false; }).map(function (m) {
        return {
          code: m.code, labelAr: m.labelAr, labelEn: m.labelEn,
          providers: (m.providers || []).filter(function (p) { return p.enabled !== false; }),
          simulated: m.code === 'electronic' ? true : (m.code === 'transfer' ? true : false),
          requiresProof: m.code === 'transfer'
        };
      });
    });
  }
  function methodLabel(code) {
    return { electronic: 'electronic', transfer: 'transfer', cod: 'cod' }[code] || code;
  }

  /* ---------------- Create a payment for an order ---------------- */
  // Simulation is explicit: no real gateway is contacted.
  function create(order, methodCode, opts) {
    opts = opts || {};
    methodCode = methodCode || order.paymentMethod || 'cod';
    return settings().then(function (s) {
      var epayMin = (s && s.epayWindowMinutes) || 15;
      var reviewMin = (s && s.transferReviewMinutes) || 120;
      var pay = {
        id: 'pay_' + U.uid(''), orderId: order.id, orderNumber: order.number,
        method: methodCode, provider: opts.provider || null,
        amount: order.pricing.total, currency: order.pricing.currency,
        simulated: methodCode !== 'cod',
        status: 'pending', collectionStatus: 'not_collected',
        createdAt: now(), updatedAt: now(),
        history: [{ status: 'created', at: now(), note: 'payment initiated (simulated)' }]
      };
      if (methodCode === 'electronic') {
        pay.status = 'pending'; pay.expiresAt = now() + epayMin * 60000;
        order.paymentStatus = 'awaiting_payment'; order.collectionStatus = 'not_collected';
      } else if (methodCode === 'transfer') {
        pay.status = 'awaiting_receipt'; pay.expiresAt = now() + reviewMin * 60000;
        order.paymentStatus = 'awaiting_transfer'; order.collectionStatus = 'not_collected';
      } else {
        pay.status = 'pending'; // COD: settle at delivery
        order.paymentStatus = 'unpaid'; order.collectionStatus = 'not_collected';
      }
      pay.history.push({ status: pay.status, at: now() });
      return V.db.put('payments', pay).then(function () { return pay; });
    });
  }

  function get(id) { return V.db.get('payments', id); }
  function forOrder(orderId) {
    return V.db.getAllByIndex('payments', 'orderId', orderId).then(function (arr) {
      arr.sort(function (a, b) { return b.createdAt - a.createdAt; }); return arr;
    });
  }
  function list(f) {
    f = f || {};
    var p = f.status ? V.db.getAllByIndex('payments', 'status', f.status) : V.db.getAll('payments');
    return p.then(function (arr) { arr.sort(function (a, b) { return b.createdAt - a.createdAt; }); return arr; });
  }

  function transition(pay, status, note) {
    pay.status = status; pay.updatedAt = now();
    pay.history = pay.history || []; pay.history.push({ status: status, at: now(), note: note || '' });
    return V.db.put('payments', pay).then(function () { return pay; });
  }

  /* ---------------- Electronic payment ---------------- */
  // Simulated instant success (used by the mock gateway screen).
  function confirmElectronic(orderId, opts) {
    opts = opts || {};
    return forOrder(orderId).then(function (arr) {
      var pay = arr.filter(function (p) { return p.method === 'electronic'; })[0];
      if (!pay) return Promise.reject(new Error('payment_not_found'));
      if (pay.status === 'paid') return pay;
      if (pay.expiresAt && pay.expiresAt < now()) return Promise.reject(new Error('payment_expired'));
      return transition(pay, 'paid', 'simulated charge approved').then(function (p) {
        return V.db.get('orders', orderId).then(function (o) {
          o.paymentStatus = 'paid'; o.collectionStatus = 'collected'; o.updatedAt = now();
          return V.db.put('orders', o).then(function () {
            return audit('payments', 'electronic_confirmed', { orderId: orderId, amount: p.amount, method: 'electronic', by: opts.by }).then(function () { return p; });
          });
        });
      });
    });
  }
  function failElectronic(orderId, reason) {
    return forOrder(orderId).then(function (arr) {
      var pay = arr.filter(function (p) { return p.method === 'electronic'; })[0];
      if (!pay) return Promise.reject(new Error('payment_not_found'));
      return transition(pay, 'failed', reason || '').then(function (p) {
        return V.db.get('orders', orderId).then(function (o) { o.paymentStatus = 'failed'; o.updatedAt = now(); return V.db.put('orders', o).then(function () { return p; }); });
      });
    });
  }
  // Expire overdue electronic payments: release reservation + cancel unpaid order.
  function sweepExpired(nowTs) {
    nowTs = nowTs || now();
    return list({ status: 'pending' }).then(function (arr) {
      var overdue = arr.filter(function (p) { return p.method === 'electronic' && p.expiresAt && p.expiresAt < nowTs; });
      return overdue.reduce(function (chain, pay) {
        return chain.then(function () {
          return transition(pay, 'expired', 'payment window elapsed').then(function () {
            return V.db.get('orders', pay.orderId).then(function (o) {
              if (!o) return;
              o.paymentStatus = 'expired'; o.updatedAt = now();
              if (o.status === 'PENDING') { o.status = 'CANCELLED'; o.cancelReason = 'payment_timeout'; }
              return V.db.put('orders', o).then(function () {
                if (V.stock) return V.stock.release(o.id, 'payment_timeout');
              });
            });
          });
        });
      }, Promise.resolve()).then(function () { return overdue.length; });
    });
  }

  /* ---------------- Manual transfer ---------------- */
  function submitReceipt(orderId, data) {
    data = data || {};
    var ref = String(data.reference || '').trim();
    if (!ref) return Promise.reject(new Error('reference_required'));
    return V.db.getAllByIndex('transferReceipts', 'reference', ref).then(function (dupes) {
      var dup = dupes.filter(function (r) { return r.status !== 'rejected'; })[0];
      if (dup) return Promise.reject(new Error('reference_duplicate'));
      return forOrder(orderId).then(function (arr) {
        var pay = arr.filter(function (p) { return p.method === 'transfer'; })[0];
        if (!pay) return Promise.reject(new Error('payment_not_found'));
        var rec = {
          id: 'rcp_' + U.uid(''), paymentId: pay.id, orderId: orderId, orderNumber: pay.orderNumber,
          reference: ref, amount: Number(data.amount) || pay.amount, currency: pay.currency,
          bank: data.bank || '', proofName: data.proofName || '', note: data.note || '',
          status: 'awaiting_review', submittedBy: data.by || 'customer',
          submittedAt: now(), history: [{ status: 'awaiting_review', at: now(), note: 'receipt submitted' }]
        };
        return V.db.put('transferReceipts', rec).then(function () {
          return transition(pay, 'awaiting_review', 'receipt submitted').then(function () {
            return V.db.get('orders', orderId).then(function (o) {
              o.paymentStatus = 'under_review'; o.updatedAt = now();
              return V.db.put('orders', o).then(function () {
                return audit('payments', 'receipt_submitted', { orderId: orderId, receiptId: rec.id, reference: ref }).then(function () { return rec; });
              });
            });
          });
        });
      });
    });
  }

  // decision: 'accepted' | 'rejected' | 'needs_info'
  function reviewTransfer(receiptId, decision, opts) {
    opts = opts || {};
    return V.db.get('transferReceipts', receiptId).then(function (rec) {
      if (!rec) return Promise.reject(new Error('receipt_not_found'));
      return get(rec.paymentId).then(function (pay) {
        rec.status = decision; rec.reviewedBy = opts.by || 'staff'; rec.reviewedAt = now(); rec.reviewNote = opts.note || '';
        rec.history.push({ status: decision, at: now(), note: opts.note || '', by: opts.by || 'staff' });
        return V.db.put('transferReceipts', rec).then(function () {
          var payStatus = decision === 'accepted' ? 'paid' : (decision === 'rejected' ? 'failed' : 'awaiting_review');
            return transition(pay, payStatus, 'transfer ' + decision).then(function () {
              return V.db.get('orders', rec.orderId).then(function (o) {
                o.paymentStatus = decision === 'accepted' ? 'paid' : (decision === 'rejected' ? 'failed' : 'under_review');
                if (decision === 'accepted') o.collectionStatus = 'collected';
                o.updatedAt = now();
                return V.db.put('orders', o).then(function () {
                  return audit('payments', 'transfer_' + decision, { orderId: rec.orderId, receiptId: receiptId, reference: rec.reference, amount: rec.amount, note: opts.note || '', by: opts.by }).then(function () { return rec; });
                });
              });
            });
        });
      });
    });
  }
  function receipts(f) {
    f = f || {};
    var p = f.status ? V.db.getAllByIndex('transferReceipts', 'status', f.status) : V.db.getAll('transferReceipts');
    return p.then(function (arr) { arr.sort(function (a, b) { return b.submittedAt - a.submittedAt; }); return arr; });
  }

  /* ---------------- Collection ---------------- */
  function markCollected(orderId, opts) {
    opts = opts || {};
    return V.db.get('orders', orderId).then(function (o) {
      if (!o) return Promise.reject(new Error('order_not_found'));
      o.collectionStatus = opts.partial ? 'partial' : 'collected';
      if (!opts.partial) o.paymentStatus = 'paid';
      o.updatedAt = now();
      return V.db.put('orders', o).then(function () {
        return forOrder(orderId).then(function (arr) {
          var pay = arr[0];
          return (pay ? transition(pay, 'paid', 'collected ' + (opts.partial ? 'partially' : 'in full')) : o).then(function (r) {
            return audit('payments', 'collected', { orderId: orderId, partial: !!opts.partial, by: opts.by }).then(function () { return r; });
          });
        });
      });
    });
  }

  /* ---------------- Refunds (manager approval only) ---------------- */
  function requestRefund(orderId, opts) {
    opts = opts || {};
    var req = {
      id: 'rfd_' + U.uid(''), orderId: orderId, amount: Number(opts.amount) || 0,
      currency: opts.currency || null, reason: opts.reason || '', status: 'pending',
      requestedBy: opts.by || 'staff', managerApprovedBy: null,
      createdAt: now(), history: [{ status: 'pending', at: now() }]
    };
    return V.db.put('refundRequests', req).then(function () {
      return audit('payments', 'refund_requested', { refundId: req.id, orderId: orderId, amount: req.amount, reason: req.reason, by: opts.by }).then(function () { return req; });
    });
  }
  // Only a manager (role_admin) may approve. Enforced here, not just in UI.
  function decideRefund(refundId, approve, opts) {
    opts = opts || {};
    var user = V.state.get('user');
    if (!user || !V.perms.can(user.role, 'settings.edit')) return Promise.reject(new Error('manager_only'));
    return V.db.get('refundRequests', refundId).then(function (req) {
      if (!req) return Promise.reject(new Error('refund_not_found'));
      req.status = approve ? 'approved' : 'rejected';
      req.managerApprovedBy = user.id; req.decidedAt = now(); req.decisionNote = opts.note || '';
      req.history.push({ status: req.status, at: now(), by: user.id });
      return V.db.put('refundRequests', req).then(function () {
        return audit('payments', 'refund_' + (approve ? 'approved' : 'rejected'), { refundId: refundId, orderId: req.orderId, amount: req.amount, by: user.id, note: opts.note || '' }).then(function () {
          if (!approve) return req;
          return V.db.get('orders', req.orderId).then(function (o) {
            if (!o) return req;
            o.paymentStatus = 'refunded'; o.collectionStatus = 'refunded'; o.updatedAt = now();
            return V.db.put('orders', o).then(function () {
              return forOrder(o.id).then(function (arr) {
                var pay = arr[0];
                if (pay) return transition(pay, 'refunded', 'manager approved refund');
                return req;
              }).then(function () { return req; });
            });
          });
        });
      });
    });
  }
  function refunds(f) {
    f = f || {};
    var p = f.status ? V.db.getAllByIndex('refundRequests', 'status', f.status) : V.db.getAll('refundRequests');
    return p.then(function (arr) { arr.sort(function (a, b) { return b.createdAt - a.createdAt; }); return arr; });
  }

  V.payments = {
    methods: methods, create: create, get: get, forOrder: forOrder, list: list,
    confirmElectronic: confirmElectronic, failElectronic: failElectronic, sweepExpired: sweepExpired,
    submitReceipt: submitReceipt, reviewTransfer: reviewTransfer, receipts: receipts,
    markCollected: markCollected, requestRefund: requestRefund, decideRefund: decideRefund, refunds: refunds,
    E_PAYMENT_STATES: E_PAYMENT_STATES, TRANSFER_STATES: TRANSFER_STATES, COLLECTION_STATES: COLLECTION_STATES
  };
})(window);
