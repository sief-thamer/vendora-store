/* ============================================================
   VENDORA | فيندورا — Core (namespace, config, utils, DOM, state, router)
   Plain ES5/ES2017 vanilla JS. No frameworks, no build step.
   ============================================================ */
(function (global) {
  'use strict';

  var V = global.V = global.V || {};

  /* ---------------- Config ---------------- */
  V.config = {
    APP_NAME: 'VENDORA',
    APP_NAME_AR: 'فيندورا',
    TAGLINE_AR: 'كل ما تحب، في مكان واحد.',
    TAGLINE_EN: 'Everything you love, in one place.',
    VERSION: '1.4.2',
    DB_NAME: 'vendora_db',
    DB_VERSION: 5,
    LS_PREFIX: 'vendora.',
    DEFAULT_LANG: 'ar',
    DEFAULT_MARKET: 'YE',
    DEFAULT_THEME: 'light',
    LOCALES: ['ar', 'en'],
    SEED_TOTAL: 500,
    LOW_STOCK: 8,
    IMG: {
      products: 'assets/images/products/',
      productsReal: 'assets/images/products/real/',
      categories: 'assets/images/categories/',
      banners: 'assets/images/banners/',
      ui: 'assets/images/ui/',
      logo: 'assets/logos/logo.svg',
      logoLight: 'assets/logos/logo-light.svg',
      mark: 'assets/logos/vendora-mark-gold.png',
      placeholder: 'assets/images/ui/placeholder.svg',
      emptyCart: 'assets/images/ui/empty-cart.svg'
    },
    // Gallery images per product: one unique high-res photo per slot,
    // stored as assets/images/products/real/<product-slug>-r<n>.jpg
    // Sums to exactly SEED_TOTAL (500)
    SEED_DISTRIBUTION: [
      { slug: 'electronics', count: 90 },
      { slug: 'fashion', count: 85 },
      { slug: 'perfume', count: 65 },
      { slug: 'home', count: 65 },
      { slug: 'furniture', count: 65 },
      { slug: 'sports', count: 55 },
      { slug: 'stationery', count: 40 },
      { slug: 'kids', count: 35 }
    ]
  };

  /* ---------------- Utils ---------------- */
  var utils = {};

  utils.uid = function (prefix) {
    var t = Date.now().toString(36);
    var r = Math.random().toString(36).slice(2, 8);
    return (prefix ? prefix + '_' : '') + t + r;
  };

  utils.slug = function (s) {
    return String(s || '').trim().toLowerCase()
      .replace(/[^\w\u0600-\u06FF\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  utils.clamp = function (n, min, max) { return Math.min(Math.max(n, min), max); };
  utils.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  utils.debounce = function (fn, wait) {
    var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, wait || 200); };
  };
  utils.throttle = function (fn, wait) {
    var last = 0, t; return function () { var a = arguments, c = this, now = Date.now();
      if (now - last >= wait) { last = now; fn.apply(c, a); }
      else { clearTimeout(t); t = setTimeout(function () { last = Date.now(); fn.apply(c, a); }, wait - (now - last)); } };
  };

  utils.escapeHtml = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  // Arabic-aware normalization for search (unify alef/ya/ta, drop tashkeel/tatweel)
  utils.normalizeArabic = function (s) {
    if (s == null) return '';
    s = String(s).toLowerCase();
    s = s.replace(/[\u064B-\u0652\u0670\u0640]/g, ''); // tashkeel + tatweel
    s = s.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627'); // alef variants -> alef
    s = s.replace(/\u0649/g, '\u064A'); // alef maqsura -> ya
    s = s.replace(/\u0629/g, '\u0647'); // ta marbuta -> ha
    s = s.replace(/\u0624/g, '\u0648'); // waw with hamza -> waw
    s = s.replace(/\u0626/g, '\u064A'); // ya with hamza -> ya
    s = s.replace(/[\u0623\u0625]/g, '\u0627');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  };

  utils.normalizeText = function (s) { return utils.normalizeArabic(s).replace(/[^\w\u0600-\u06FF\s]/g, ' ').replace(/\s+/g, ' ').trim(); };

  utils.deepClone = function (o) {
    if (o == null) return o;
    try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; }
  };

  utils.sum = function (arr, fn) { return (arr || []).reduce(function (a, x) { return a + (fn ? fn(x) : x); }, 0); };
  utils.groupBy = function (arr, fn) {
    return (arr || []).reduce(function (acc, x) { var k = fn(x); (acc[k] = acc[k] || []).push(x); return acc; }, {});
  };
  utils.uniqBy = function (arr, fn) {
    var seen = {}; return (arr || []).filter(function (x) { var k = fn(x); if (seen[k]) return false; seen[k] = 1; return true; });
  };
  utils.range = function (n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; };
  utils.pick = function (obj, keys) { var o = {}; keys.forEach(function (k) { if (k in obj) o[k] = obj[k]; }); return o; };

  // Deterministic PRNG (mulberry32) — used for reproducible seed data
  utils.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  utils.rngInt = function (r, min, max) { return Math.floor(r() * (max - min + 1)) + min; };
  utils.rngPick = function (r, arr) { return arr[Math.floor(r() * arr.length)]; };

  var LOCALE_MAP = { ar: 'ar-u-nu-latn', en: 'en' };
  utils.locale = function (lang) { return LOCALE_MAP[lang] || 'en'; };

  utils.formatNumber = function (n, lang, opts) {
    try { return new Intl.NumberFormat(utils.locale(lang), opts || {}).format(n); }
    catch (e) { return String(n); }
  };

  utils.currencyDecimals = function (code) {
    return (code === 'KWD' || code === 'BHD' || code === 'OMR') ? 3 : 2;
  };

  utils.formatCurrency = function (amount, code, lang) {
    amount = Number(amount) || 0;
    var d = utils.currencyDecimals(code);
    try {
      return new Intl.NumberFormat(utils.locale(lang), { style: 'currency', currency: code, minimumFractionDigits: 0, maximumFractionDigits: d }).format(amount);
    } catch (e) {
      return utils.formatNumber(amount, lang, { minimumFractionDigits: 0, maximumFractionDigits: d }) + ' ' + code;
    }
  };

  utils.formatDate = function (ts, lang, withTime) {
    var d = new Date(ts);
    try {
      return new Intl.DateTimeFormat(utils.locale(lang), {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: withTime ? '2-digit' : undefined, minute: withTime ? '2-digit' : undefined
      }).format(d);
    } catch (e) { return d.toISOString().slice(0, 10); }
  };

  utils.relativeTime = function (ts, lang) {
    var diff = Date.now() - ts, s = Math.round(diff / 1000);
    var ar = lang === 'ar';
    if (s < 60) return ar ? 'الآن' : 'just now';
    var m = Math.round(s / 60); if (m < 60) return ar ? ('قبل ' + m + ' دقيقة') : (m + 'm ago');
    var h = Math.round(m / 60); if (h < 24) return ar ? ('قبل ' + h + ' ساعة') : (h + 'h ago');
    var d = Math.round(h / 24); if (d < 30) return ar ? ('قبل ' + d + ' يوم') : (d + 'd ago');
    return utils.formatDate(ts, lang);
  };

  // Simple non-cryptographic hash for local demo passwords (NOT production secure)
  utils.hashPassword = function (pwd, salt) {
    salt = salt || 'vendora';
    var str = salt + '::' + String(pwd), h = 5381, i = str.length;
    while (i) { h = (h * 33) ^ str.charCodeAt(i--); }
    var h2 = 52711, i2 = str.length;
    while (i2) { h2 = (h2 * 31) ^ str.charCodeAt(i2--); }
    return ('v1$' + ((h >>> 0).toString(16)) + ((h2 >>> 0).toString(16)));
  };

  // CSV / JSON download helpers
  utils.download = function (filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 300);
  };

  utils.toCSV = function (rows, columns) {
    if (!rows || !rows.length) return '';
    columns = columns || Object.keys(rows[0]);
    function esc(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var lines = [columns.join(',')];
    rows.forEach(function (r) { lines.push(columns.map(function (c) { return esc(r[c]); }).join(',')); });
    return '\uFEFF' + lines.join('\n');
  };

  V.utils = utils;

  /* ---------------- DOM helper (h) ---------------- */
  // h('div.card#id', { attrs, on, style, html, text, dataset }, ...children)
  function h(sel, props) {
    var tag = 'div', classes = [], id = null;
    sel = sel || 'div';
    var m = /^([a-zA-Z0-9-]*)((?:[.#][\w-]+)*)$/.exec(sel);
    if (m) {
      if (m[1]) tag = m[1];
      var rest = m[2] || '';
      rest.split(/(?=[.#])/).forEach(function (tok) {
        if (!tok) return;
        if (tok[0] === '.') classes.push(tok.slice(1));
        else if (tok[0] === '#') id = tok.slice(1);
      });
    } else { tag = sel; }
    var node = document.createElement(tag);
    if (classes.length) node.className = classes.join(' ');
    if (id) node.id = id;

    var children = Array.prototype.slice.call(arguments, 2);
    if (props && typeof props === 'object' && !(props instanceof Node) && !Array.isArray(props) && typeof props !== 'string') {
      applyProps(node, props);
    } else if (props != null) {
      children.unshift(props);
    }
    children.forEach(function (c) { appendChild(node, c); });
    return node;
  }

  function applyProps(node, props) {
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class' || k === 'className') node.className = [node.className, v].filter(Boolean).join(' ');
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      else if (k === 'on' && typeof v === 'object') Object.keys(v).forEach(function (ev) { node.addEventListener(ev, v[ev]); });
      else if (k in node && k !== 'list' && typeof v !== 'object') { try { node[k] = v; } catch (e) { node.setAttribute(k, v); } }
      else node.setAttribute(k, v === true ? '' : v);
    });
  }

  function appendChild(node, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) return c.forEach(function (x) { appendChild(node, x); });
    if (c instanceof Node) return node.appendChild(c);
    node.appendChild(document.createTextNode(String(c)));
  }

  V.h = h;
  V.el = function (sel) { return document.querySelector(sel); };
  V.els = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  V.clear = function (node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; };
  V.mount = function (node) { V.clear(node); for (var i = 1; i < arguments.length; i++) appendChild(node, arguments[i]); return node; };

  V.svg = function (name, cls) {
    var paths = V.ICONS || {};
    var d = paths[name] || paths.info || '';
    var span = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    span.setAttribute('viewBox', '0 0 24 24');
    span.setAttribute('class', 'icon ' + (cls || ''));
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = d;
    return span;
  };

  /* ---------------- Event bus ---------------- */
  var listeners = {};
  V.bus = {
    on: function (evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); return function () { V.bus.off(evt, fn); }; },
    off: function (evt, fn) { if (listeners[evt]) listeners[evt] = listeners[evt].filter(function (f) { return f !== fn; }); },
    emit: function (evt, payload) { (listeners[evt] || []).forEach(function (f) { try { f(payload); } catch (e) { console.error('[bus]', evt, e); } }); }
  };

  /* ---------------- Fault monitor (error tracking) ---------------- */
  // Lightweight client-side monitoring: captures runtime errors and rejected
  // promises, keeps the most recent ones, and surfaces counts for the admin.
  var diagLog = [];
  function diagRecord(kind, message, extra) {
    try {
      var rec = { kind: kind, message: String(message || '').slice(0, 400), extra: extra || null, at: Date.now() };
      diagLog.push(rec);
      if (diagLog.length > 50) diagLog.shift();
      console.error('[VENDORA:diag]', kind, rec.message);
      try { localStorage.setItem(V.config.LS_PREFIX + 'errors', JSON.stringify(diagLog.slice(-20))); } catch (e) { }
    } catch (e) { }
  }
  V.diag = {
    record: diagRecord,
    list: function () { return diagLog.slice().reverse(); },
    count: function () { return diagLog.length; },
    clear: function () { diagLog = []; try { localStorage.removeItem(V.config.LS_PREFIX + 'errors'); } catch (e) { } }
  };
  if (global.addEventListener) {
    global.addEventListener('error', function (ev) {
      var msg = ev && ev.message ? ev.message : 'script error';
      var where = ev && ev.filename ? (ev.filename + ':' + (ev.lineno || 0) + ':' + (ev.colno || 0)) : null;
      diagRecord('error', msg, where);
    });
    global.addEventListener('unhandledrejection', function (ev) {
      var r = ev && ev.reason; var msg = (r && (r.message || r)) || 'unhandled rejection';
      diagRecord('rejection', msg, null);
    });
  }

  /* ---------------- App state (preferences + session) ---------------- */
  function lsGet(k, def) {
    try { var v = localStorage.getItem(V.config.LS_PREFIX + k); return v == null ? def : JSON.parse(v); }
    catch (e) { return def; }
  }
  function lsSet(k, v) { try { localStorage.setItem(V.config.LS_PREFIX + k, JSON.stringify(v)); } catch (e) { } }
  function lsDel(k) { try { localStorage.removeItem(V.config.LS_PREFIX + k); } catch (e) { } }

  V.ls = { get: lsGet, set: lsSet, del: lsDel };

  var state = {
    lang: lsGet('lang', V.config.DEFAULT_LANG),
    market: lsGet('market', V.config.DEFAULT_MARKET),
    theme: lsGet('theme', V.config.DEFAULT_THEME),
    user: null,          // session user (customer) — set by auth service
    cartCount: 0,
    wishCount: 0,
    compareCount: 0
  };
  var subs = [];

  V.state = {
    get: function (k) { return k ? state[k] : state; },
    set: function (k, v) {
      var prev = state[k];
      state[k] = v;
      if (k === 'lang' || k === 'market' || k === 'theme') {
        lsSet(k, v);
        if (k === 'lang') applyLang(v);
        if (k === 'theme') applyTheme(v);
        if (k === 'market') { try { V.bus.emit('market:changed', v); } catch (e) {} }
      }
      subs.forEach(function (f) { try { f(k, v, prev); } catch (e) {} });
      V.bus.emit('state:' + k, v);
    },
    subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; }
  };

  function applyLang(lang) {
    var dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('data-lang', lang);
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme || 'light');
  }
  V.applyLang = applyLang; V.applyTheme = applyTheme;

  /* ---------------- SEO (title / meta / canonical / JSON-LD) ---------------- */
  var SITE_NAME = 'VENDORA | فيندورا';
  function metaTag(attr, key) {
    var el = document.head.querySelector('meta[' + attr + '="' + key + '"]');
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
    return el;
  }
  function linkTag(rel) {
    var el = document.head.querySelector('link[rel="' + rel + '"]');
    if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
    return el;
  }
  function jsonLd(data) {
    var el = document.getElementById('vd-jsonld');
    if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = 'vd-jsonld'; document.head.appendChild(el); }
    el.textContent = data ? JSON.stringify(data) : '';
  }
  var V_seo = {
    siteName: SITE_NAME,
    set: function (opts) {
      opts = opts || {};
      var title = opts.title ? (opts.title + ' — ' + (opts.siteName || SITE_NAME)) : SITE_NAME;
      document.title = title;
      metaTag('name', 'description').setAttribute('content', opts.description || '');
      metaTag('property', 'og:title').setAttribute('content', title);
      metaTag('property', 'og:description').setAttribute('content', opts.description || '');
      metaTag('property', 'og:type').setAttribute('content', opts.type || 'website');
      if (opts.image) metaTag('property', 'og:image').setAttribute('content', opts.image);
      linkTag('canonical').setAttribute('href', opts.canonical || (location.origin + location.pathname + (location.hash || '')));
      jsonLd(opts.jsonLd || null);
    },
    reset: function () { this.set({ title: '', description: (document.head.querySelector('meta[name="description"]') || {}).content }); }
  };
  V.seo = V_seo;

  /* ---------------- i18n ---------------- */
  V.i18n = {
    t: function (key, vars) {
      var lang = V.state.get('lang') || 'ar';
      var dict = V.DICT || {};
      var entry = dict[key];
      var str = entry ? (entry[lang] || entry.ar || key) : key;
      if (vars) Object.keys(vars).forEach(function (k) { str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]); });
      return str;
    },
    dir: function () { return V.state.get('lang') === 'ar' ? 'rtl' : 'ltr'; }
  };
  V.t = V.i18n.t;

  // Bilingual field helper: pick name by current lang
  V.loc = function (obj, field) {
    if (!obj) return '';
    var lang = V.state.get('lang') || 'ar';
    var ar = obj[field + 'Ar'] != null ? obj[field + 'Ar'] : obj[field + '_ar'];
    var en = obj[field + 'En'] != null ? obj[field + 'En'] : obj[field + '_en'];
    if (lang === 'en') return en || ar || '';
    return ar || en || '';
  };

  // Money using current market
  V.money = function (amount) {
    var mk = V.getMarket ? V.getMarket(V.state.get('market')) : null;
    var code = mk ? mk.currency : 'USD';
    return utils.formatCurrency(amount, code, V.state.get('lang'));
  };
  V.moneyIn = function (amount, marketCode) {
    var mk = V.getMarket ? V.getMarket(marketCode) : null;
    var code = mk ? mk.currency : 'USD';
    return utils.formatCurrency(amount, code, V.state.get('lang'));
  };

  /* ---------------- Router (hash based) ---------------- */
  var router = {
    routes: [],
    current: null,
    _handler: null,
    add: function (pattern, handler, meta) {
      router.routes.push({ pattern: pattern, handler: handler, meta: meta || {}, re: compile(pattern), keys: keysOf(pattern) });
      return router;
    },
    start: function (routes, opts) {
      if (routes) routes.forEach(function (r) { router.add(r[0], r[1], r[2]); });
      opts = opts || {};
      router._handler = opts.onChange || null;
      window.addEventListener('hashchange', router._resolve);
      router._resolve();
      return router;
    },
    navigate: function (path, opts) {
      opts = opts || {};
      var target = path.indexOf('#') === 0 ? path : '#' + path;
      if (('#' + location.hash.slice(1)) === target) { router._resolve(); return; }
      if (opts.replace) location.replace(target); else location.hash = path;
    },
    _resolve: function () {
      var hash = location.hash.slice(1) || '/';
      var qIndex = hash.indexOf('?');
      var path = qIndex >= 0 ? hash.slice(0, qIndex) : hash;
      var queryStr = qIndex >= 0 ? hash.slice(qIndex + 1) : '';
      var query = {};
      queryStr.split('&').forEach(function (p) { if (!p) return; var kv = p.split('='); query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); });
      path = path.replace(/\/+$/, '') || '/';

      for (var i = 0; i < router.routes.length; i++) {
        var r = router.routes[i];
        var m = r.re.exec(path);
        if (m) {
          var params = {};
          r.keys.forEach(function (k, idx) { params[k] = decodeURIComponent(m[idx + 1]); });
          var ctx = { path: path, params: params, query: query, route: r };
          router.current = ctx;
          if (router._handler) router._handler(ctx);
          else if (typeof r.handler === 'function') r.handler(ctx);
          try { V.bus.emit('route:change', ctx); } catch (e) {}
          // scroll top on navigation
          if (!ctx._keepScroll) window.scrollTo({ top: 0, behavior: 'auto' });
          return ctx;
        }
      }
      if (router._handler) router._handler({ path: path, params: {}, query: query, notFound: true });
      else { location.hash = '/404'; }
      return null;
    }
  };
  function keysOf(pattern) {
    var keys = []; pattern.replace(/:([\w]+)/g, function (_, k) { keys.push(k); return _; }); return keys;
  }
  function compile(pattern) {
    var re = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = re.replace(/:([\w]+)/g, '([^/]+)');
    return new RegExp('^' + re + '$');
  }
  V.router = router;

  /* ---------------- Tiny store helper ---------------- */
  V.store = function (initial) {
    var s = initial;
    var fns = [];
    return {
      get: function () { return s; },
      set: function (v) { s = typeof v === 'function' ? v(s) : v; fns.forEach(function (f) { f(s); }); },
      sub: function (f) { fns.push(f); f(s); return function () { fns = fns.filter(function (x) { return x !== f; }); }; }
    };
  };

  /* ---------------- Boot hooks ---------------- */
  V.ready = function (fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };

  /* ---------------- Image fallback ----------------
     Any <img> whose file is missing (or fails to load) swaps to the
     placeholder once, so the UI never shows a broken-image icon. */
  V.imgFallback = 'assets/images/ui/placeholder.svg';
  if (global.addEventListener) {
    global.addEventListener('error', function (e) {
      var el = e && e.target;
      if (!el || el.tagName !== 'IMG' || el.getAttribute('data-fallback') === '1') return;
      el.setAttribute('data-fallback', '1');
      el.src = V.imgFallback;
    }, true);
  }

})(window);
