/* ============================================================
   VENDORA — Pages: content (guide, trust, about, contact, faq,
   policies, 404)
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var h = V.h;
  var ui = V.ui;
  function t(k, v) { return V.t(k, v); }
  function isAr() { return V.state.get('lang') === 'ar'; }
  function T(ar, en) { return isAr() ? ar : en; }

  function pageWrap(crumb, title, body) {
    return h('div.container', { style: { paddingBlock: 'var(--s6)', maxWidth: '960px' } },
      ui.breadcrumb(crumb || [{ label: t('navHome'), href: '/' }, { label: title }]),
      h('div.lux-head', h('h1.lux-head__title', title)), body);
  }

  /* ---------------- Guide ---------------- */
  function renderGuide() {
    var steps = [
      { i: 'search', ar: 'ابحث أو تصفّح', en: 'Search or browse', dar: 'استخدم البحث أو تنقّل بين الفئات والعروض للعثور على ما تريد.', den: 'Use search or browse categories and offers to find what you need.' },
      { i: 'cart', ar: 'أضف إلى السلة', en: 'Add to cart', dar: 'اختر الخيار المتاح وأضف المنتج إلى سلتك.', den: 'Pick the available option and add the product to your cart.' },
      { i: 'check-circle', ar: 'راجع وأكمل', en: 'Review & checkout', dar: 'تأكد من الكميات وأكمل بيانات الشحن والدفع عند الاستلام.', den: 'Confirm quantities and complete shipping details with cash on delivery.' },
      { i: 'truck', ar: 'تتبّع طلبك', en: 'Track your order', dar: 'تابع حالة الطلب من صفحة تتبّع الطلب برقم الطلب.', den: 'Follow your order status from the tracking page using your order number.' }
    ];

    var stepCards = h('div.info-steps', steps.map(function (s, i) {
      return h('div.card.card-pad.info-step',
        h('span.info-step__num', '0' + (i + 1)),
        h('span.ti-ico', ui.icon(s.i, 'icon-sm')),
        h('h3.mt-3', T(s.ar, s.en)),
        h('p.muted', T(s.dar, s.den)));
    }));

    var cats = (V.catalog.categories && V.catalog.categories()) || [];
    var catLinks = h('div.info-links', cats.map(function (c) {
      return h('a.btn.btn-outline.btn-sm', { href: ui.href('/category/' + c.slug) }, ui.icon(c.icon || 'box', 'icon-sm'), h('span', V.loc(c, 'name')));
    }));

    var promises = h('div.info-strip',
      h('div.info-strip__item', ui.icon('truck'), h('div', h('strong', T('توصيل سريع', 'Fast delivery')), h('div.muted', T('2–5 أيام عمل في كل الأسواق', '2–5 business days across markets')))),
      h('div.info-strip__item', ui.icon('wallet'), h('div', h('strong', T('دفع عند الاستلام', 'Cash on delivery')), h('div.muted', T('ادفع فقط عند وصول طلبك', 'Pay only when your order arrives')))),
      h('div.info-strip__item', ui.icon('headset'), h('div', h('strong', T('دعم قبل وبعد الشراء', 'Support before & after')), h('div.muted', T('فريق جاهز لمساعدتك دائمًا', 'A team always ready to help'))))
    );

    var tips = h('div', ui.sectionHead(T('نصائح الشراء', 'Buying tips')),
      ui.accordion([
        { q: T('كيف أختار المقاس المناسب؟', 'How do I pick the right size?'), a: T('راجع جدول القياسات في صفحة المنتج، وعند الشك اختر المقاس الأكبر.', 'Check the size guide on the product page; when in doubt choose the larger size.') },
        { q: T('كيف أستخدم كود الخصم؟', 'How do I use a coupon?'), a: T('أدخل الكود في صفحة السلة أو الدفع ثم اضغط تطبيق.', 'Enter the code on the cart or checkout page then press apply.') },
        { q: T('هل الأسعار تختلف بين الدول؟', 'Do prices differ per country?'), a: T('نعم، لكل سوق أسعار وعملة مستقلة.', 'Yes, each market has independent prices and currency.') }
      ]));

    return h('div.container', { style: { paddingBlock: 'var(--s6)', maxWidth: '1040px' } },
      ui.breadcrumb([{ label: t('navHome'), href: '/' }, { label: t('guideTitle') }]),
      h('div.info-hero',
        h('div.eyebrow', ui.icon('check-circle', 'icon-sm'), h('span', T('دليل التسوّق', 'Shopping guide'))),
        h('h1', t('guideTitle')),
        h('p', T('كل ما تحتاج معرفته للتسوّق بثقة في فيندورا — من البحث حتى استلام الطلب.', 'Everything you need to shop with confidence on VENDORA — from search to delivery.')),
        h('div.info-hero-actions',
          h('a.btn.btn-gold', { href: ui.href('/products') }, ui.icon('grid', 'icon-sm'), T('تصفّح المنتجات', 'Browse products')),
          h('a.btn.btn-outline', { href: ui.href('/track') }, ui.icon('truck', 'icon-sm'), t('trackOrderTitle')))),
      h('div', ui.sectionHead(T('كيف تتسوّق في 4 خطوات', 'Shop in 4 steps')), stepCards),
      h('div.mt-6', ui.sectionHead(T('تسوّق حسب الفئة', 'Shop by category')), catLinks),
      h('div.mt-6', tips),
      h('div.mt-6', ui.sectionHead(T('ضمانات التسوّق', 'Shopping promises')), promises));
  }

  /* ---------------- Trust ---------------- */
  function renderTrust() {
    var items = [
      { i: 'wallet', ar: 'دفع عند الاستلام', en: 'Cash on delivery', dar: 'ادفع نقدًا عند وصول طلبك — دون أي مخاطرة مسبقة.', den: 'Pay cash when your order arrives — no upfront risk.' },
      { i: 'refresh', ar: 'إرجاع خلال 3 أيام', en: '3-day returns', dar: 'أرجِع أو استبدل المنتج غير المستخدم خلال 3 أيام.', den: 'Return or exchange unused items within 3 days.' },
      { i: 'shield', ar: 'حماية المشتري', en: 'Buyer protection', dar: 'نضمن استلام ما طلبته أو استرداد أموالك.', den: 'We ensure you receive what you ordered or get a refund.' },
      { i: 'check-circle', ar: 'منتجات موثوقة', en: 'Verified products', dar: 'نتعامل مع موردين ومورّدين موثوقين فقط.', den: 'We work only with trusted suppliers.' },
      { i: 'lock', ar: 'بيانات آمنة', en: 'Data security', dar: 'لا نشارك بياناتك مع أي طرف ثالث.', den: 'We never share your data with third parties.' },
      { i: 'headset', ar: 'دعم متواصل', en: 'Ongoing support', dar: 'فريق دعم يجيبك على استفساراتك قبل وبعد الشراء.', den: 'A support team answers you before and after purchase.' }
    ];

    var strip = h('div.info-strip',
      h('div.info-strip__item', ui.icon('wallet'), h('div', h('strong', T('لا مخاطرة', 'Zero risk')), h('div.muted', T('الدفع عند التسليم فقط', 'Pay on delivery only')))),
      h('div.info-strip__item', ui.icon('refresh'), h('div', h('strong', T('إرجاع 3 أيام', '3-day returns')), h('div.muted', T('منتج غير مستخدم بحالته', 'Unused, original condition')))),
      h('div.info-strip__item', ui.icon('shield'), h('div', h('strong', T('حماية المشتري', 'Buyer protection')), h('div.muted', T('استلام ما طلبته أو استرداد', 'Receive it or get refunded'))))
    );

    var grid = h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' } });
    items.forEach(function (x) { grid.appendChild(h('div.card.card-pad', { style: { textAlign: 'center' } }, h('span.ti-ico', ui.icon(x.i, 'icon-sm')), h('h3.mt-3', T(x.ar, x.en)), h('p.muted', T(x.dar, x.den)))); });

    var policyLinks = h('div.info-links', [
      { l: t('privacyTitle'), hh: '/page/privacy' },
      { l: t('termsTitle'), hh: '/page/terms' },
      { l: t('shippingPolicyTitle'), hh: '/page/shipping' },
      { l: t('returnsPolicyTitle'), hh: '/page/returns' }
    ].map(function (p) { return h('a.btn.btn-outline.btn-sm', { href: ui.href(p.hh) }, ui.icon('receipt', 'icon-sm'), h('span', p.l)); }));

    return h('div.container', { style: { paddingBlock: 'var(--s6)', maxWidth: '1040px' } },
      ui.breadcrumb([{ label: t('navHome'), href: '/' }, { label: t('trustTitle') }]),
      h('div.info-hero',
        h('div.eyebrow', ui.icon('shield', 'icon-sm'), h('span', T('الثقة والأمان', 'Trust & safety'))),
        h('h1', t('trustTitle')),
        h('p', T('التزامنا بثقتك شعارنا. تعرّف على ما يمنحك الطمأنينة عند التسوّق معنا — دفع آمن، إرجاع مرن، وحماية كاملة للمشتري.', 'Your trust is our promise. See what gives you peace of mind — secure payment, flexible returns and full buyer protection.')),
        h('div.info-hero-actions',
          h('a.btn.btn-gold', { href: ui.href('/products') }, ui.icon('grid', 'icon-sm'), T('ابدأ التسوّق', 'Start shopping')),
          h('a.btn.btn-outline', { href: ui.href('/contact') }, ui.icon('headset', 'icon-sm'), t('navContact')))),
      h('div', ui.sectionHead(T('ضماناتنا لك', 'Our guarantees')), strip),
      h('div.mt-6', ui.sectionHead(T('لماذا تثق بنا', 'Why trust us')), grid),
      h('div.mt-6', ui.sectionHead(T('السياسات ذات الصلة', 'Related policies')), policyLinks),
      h('div.mt-6', ui.alert(T('جميع الطلبات تخضع لسياسة الإرجاع والاستبدال المنشورة في صفحة السياسات.', 'All orders are subject to the return & exchange policy published on the policies page.'), 'info')));
  }

  /* ---------------- About ---------------- */
  function renderAbout() {
    var grid = h('div.grid.mt-4', { style: { gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' } });
    [['500+', T('منتج متنوّع', 'products')], ['7', T('أسواق', 'markets')], ['8', T('فئات رئيسية', 'categories')], ['14', T('يومًا للإرجاع', 'day returns')]].forEach(function (s) {
      grid.appendChild(h('div.card.card-pad', { style: { textAlign: 'center' } }, h('strong', { style: { fontSize: '1.8rem', color: 'var(--gold)' } }, s[0]), h('div.muted', s[1])));
    });
    return pageWrap(null, t('aboutTitle'),
      h('p.mt-3', T('فيندورا متجر إلكتروني شامل يجمع الإلكترونيات والأزياء والعطور والمنزل والرياضة والمزيد، في تجربة تسوّق عربية أولًا بأسعار مناسبة ودفع عند الاستلام.', 'VENDORA is a comprehensive online store spanning electronics, fashion, perfumes, home, sports and more — an Arabic-first shopping experience with fair prices and cash on delivery.')),
      grid,
      h('div.mt-5', ui.sectionHead(T('قيمنا', 'Our values')),
        h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' } },
          [['handshake', T('الثقة', 'Trust'), T('نضع العميل أولًا ونفي بوعودنا.', 'Customer first, promises kept.')],
           ['tag', T('القيمة', 'Value'), T('أسعار تنافسية وعروض حقيقية.', 'Competitive prices, real offers.')],
           ['globe', T('الانتشار', 'Reach'), T('خدمة عدة أسواق بعملاتها.', 'Serving multiple markets and currencies.')]].map(function (x) { return h('div.card.card-pad', h('span.ti-ico', ui.icon(x[0])), h('h3.mt-3', x[1]), h('p.muted', x[2])); }))));
  }

  /* ---------------- Contact ---------------- */
  function renderContact() {
    var nameI = h('input.input', { placeholder: t('fullName') });
    var emailI = h('input.input', { type: 'email', placeholder: t('email') });
    var msgI = h('textarea.textarea', { placeholder: t('yourMessage'), rows: 4 });
    var btn = h('button.btn.btn-primary', { type: 'button' }, t('send'));
    btn.addEventListener('click', function () {
      if (!nameI.value.trim() || !msgI.value.trim()) { ui.toast(t('fieldsRequired'), 'error'); return; }
      ui.toast(T('تم إرسال رسالتك، سنعاود التواصل قريبًا.', 'Message sent, we will get back to you soon.'), 'success');
      nameI.value = emailI.value = msgI.value = '';
    });
    var info = h('div.card.card-pad.stack',
      h('h3', t('contactInfo')),
      h('div.row', ui.icon('phone', 'icon-sm'), h('span', '+967 700 000 000')),
      h('div.row', ui.icon('mail', 'icon-sm'), h('span', 'support@vendora.local')),
      h('div.row', ui.icon('pin', 'icon-sm'), h('span', T('صنعاء، اليمن', 'Sanaa, Yemen'))),
      h('div.row', ui.icon('clock', 'icon-sm'), h('span', T('السبت–الخميس 9ص–6م', 'Sat–Thu 9am–6pm')))
    );
    var form = h('div.card.card-pad.stack', h('h3', t('contactUs')),
      h('label.field', h('span.f-label', t('fullName')), nameI),
      h('label.field', h('span.f-label', t('email')), emailI),
      h('label.field', h('span.f-label', t('yourMessage')), msgI), btn);
    return pageWrap(null, t('contactTitle'),
      h('div.grid.mt-4', { style: { gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' } }, form, info));
  }

  /* ---------------- FAQ ---------------- */
  function renderFaq() {
    var faqs = [
      { ar: 'كيف أتابع طلبي؟', en: 'How do I track my order?', dar: 'افتح صفحة تتبّع الطلب وأدخل رقم الطلب.', den: 'Open the tracking page and enter your order number.' },
      { ar: 'ما طرق الدفع المتاحة؟', en: 'What payment methods are available?', dar: 'الدفع عند الاستلام فقط في هذه النسخة.', den: 'Cash on delivery only in this version.' },
      { ar: 'كم تستغرق مدة التوصيل؟', en: 'How long does delivery take?', dar: 'عادة 2 إلى 5 أيام عمل حسب المدينة.', den: 'Usually 2 to 5 business days depending on the city.' },
      { ar: 'هل يمكنني إلغاء الطلب؟', en: 'Can I cancel my order?', dar: 'يمكن الإلغاء قبل الشحن من صفحة الطلبات.', den: 'You can cancel before shipping from the orders page.' },
      { ar: 'كيف أرجِع منتجًا؟', en: 'How do I return a product?', dar: 'اطلب الإرجاع خلال 3 أيام من الاستلام عبر الدعم.', den: 'Request a return within 3 days of delivery via support.' },
      { ar: 'هل الأسعار تشمل الضريبة؟', en: 'Are prices tax inclusive?', dar: 'تُحسب الضريبة حسب السوق وتظهر في ملخص الطلب.', den: 'Tax is computed per market and shown in the order summary.' }
    ];
    return pageWrap(null, t('faqTitle'),
      h('div.mt-4', ui.accordion(faqs.map(function (f) { return { q: T(f.ar, f.en), a: T(f.dar, f.den) }; }))));
  }

  /* ---------------- Policies ---------------- */
  var POLICIES = {
    privacy: { ar: 'سياسة الخصوصية', en: 'Privacy policy', bodyAr: ['نجمع الحد الأدنى من البيانات اللازمة لإتمام طلبك: الاسم، رقم التواصل، عنوان الشحن.', 'تُستخدم بياناتك لتنفيذ الطلبات وتحسين الخدمة فقط.', 'لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة.', 'يمكنك طلب حذف حسابك وبياناتك عبر التواصل مع الدعم.'], bodyEn: ['We collect the minimum data needed to fulfill your order: name, contact number, shipping address.', 'Your data is used only to process orders and improve the service.', 'We never sell or share your data with third parties.', 'You may request deletion of your account and data via support.'] },
    terms: { ar: 'الشروط والأحكام', en: 'Terms & conditions', bodyAr: ['باستخدامك الموقع فإنك توافق على هذه الشروط.', 'الأسعار قابلة للتغيير والعروض محدودة بمدتها وكميتها.', 'أنت مسؤول عن دقة بيانات الشحن التي تقدّمها.', 'نحتفظ بحق إلغاء أي طلب مشتبه به أو غير مكتمل.'], bodyEn: ['By using this site you agree to these terms.', 'Prices may change and offers are limited in time and quantity.', 'You are responsible for the accuracy of the shipping details you provide.', 'We reserve the right to cancel any suspicious or incomplete order.'] },
    shipping: { ar: 'سياسة الشحن', en: 'Shipping policy', bodyAr: ['نشحن إلى أغلب المدن في الأسواق المدعومة.', 'تكلفة الشحن ثابتة لكل سوق، وتصبح مجانية عند تجاوز حد معين.', 'مدة التوصيل تقديرية 2–5 أيام عمل.', 'يتم تحصيل المبلغ نقدًا عند التسليم.'], bodyEn: ['We ship to most cities in supported markets.', 'Shipping is a flat fee per market and becomes free above a threshold.', 'Estimated delivery is 2–5 business days.', 'Payment is collected in cash upon delivery.'] },
    returns: { ar: 'سياسة الإرجاع', en: 'Returns policy', bodyAr: ['يمكن إرجاع أو استبدال المنتج غير المستخدم بحالته الأصلية خلال 3 أيام.', 'يجب أن يكون المنتج بكامل ملحقاته وعبوته.', 'تُعاد قيمة المنتج فقط ولا تُعاد تكلفة الشحن إلا في حال وجود عيب.', 'تُعالج طلبات الإرجاع عبر الدعم بعد التسليم.'], bodyEn: ['Unused products in original condition can be returned or exchanged within 3 days.', 'The product must include all accessories and its packaging.', 'Only the product value is refunded; shipping is non-refundable unless the item is defective.', 'Return requests are handled via support after delivery.'] }
  };

  function renderPolicy(ctx) {
    var slug = ctx.params.slug;
    var p = POLICIES[slug];
    if (!p) return renderNotFound(ctx);
    var body = isAr() ? p.bodyAr : p.bodyEn;
    return pageWrap(null, isAr() ? p.ar : p.en, h('div.mt-4.stack', body.map(function (x) { return h('p', x); })));
  }

  /* ---------------- 404 ---------------- */
  function renderNotFound() {
    return h('div.container', { style: { paddingBlock: 'var(--s6)', maxWidth: '640px' } },
      h('div.empty',
        h('div', { style: { fontSize: '4rem', fontWeight: 800, color: 'var(--gold)' } }, '404'),
        h('h1.page-title', t('notFoundTitle')),
        h('p.muted', t('notFoundText')),
        h('div.mt-4.row', { style: { justifyContent: 'center' } },
          h('a.btn.btn-primary', { href: ui.href('/') }, t('backHome')),
          h('a.btn.btn-outline', { href: ui.href('/products') }, t('continueShopping')))));
  }

  V.pages = V.pages || {};
  V.pages.guide = renderGuide;
  V.pages.trust = renderTrust;
  V.pages.about = renderAbout;
  V.pages.contact = renderContact;
  V.pages.faq = renderFaq;
  V.pages.policy = renderPolicy;
  V.pages.notFound = renderNotFound;
})(window);
