/* ============================================================
   VENDORA — Page: store home
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var h = V.h;
  var ui = V.ui;
  function t(k, v) { return V.t(k, v); }
  function isAr() { return V.state.get('lang') === 'ar'; }

  function productGrid(list, wide) {
    var g = h('div.product-grid' + (wide ? '.wide' : ''));
    list.forEach(function (p) { g.appendChild(ui.pcard(p)); });
    return g;
  }

  function hero() {
    var banner = V.config.IMG.banners + 'banner-1.jpg';
    return h('section.hero',
      h('img', { src: banner, alt: t('tagline') }),
      h('div.hero-overlay.container',
        h('div.eyebrow', h('span.badge.badge-gold', isAr() ? 'تخفيضات الموسم' : 'Season sale')),
        h('h1', isAr() ? 'كل ما تحب، في مكان واحد.' : 'Everything you love, one place.'),
        h('p', isAr() ? 'تسوّق آلاف المنتجات بأسعار مناسبة، دفع عند الاستلام، وإرجاع سهل خلال 3 أيام.' : 'Shop thousands of products at fair prices, cash on delivery and easy 3-day returns.'),
        h('div.row.wrap.mt-4',
          h('a.btn.btn-gold.btn-lg', { href: ui.href('/products') }, t('continueShopping')),
          h('a.btn.btn-outline.btn-lg', { href: ui.href('/offers') }, t('offersTitle'))
        )
      )
    );
  }

  function trustStrip() {
    var items = [
      { i: 'wallet', t: t('trustCod'), d: t('trustCodDesc') },
      { i: 'repeat', t: t('trustReturns'), d: t('trustReturnsDesc') },
      { i: 'shield', t: t('trustShield'), d: t('trustShieldDesc') },
      { i: 'headset', t: t('trustSupport'), d: t('trustSupportDesc') }
    ];
    var g = h('div.trust-grid');
    items.forEach(function (it) {
      g.appendChild(h('div.trust-item', h('div.ti-ico', ui.icon(it.i)), h('strong', it.t), h('p.muted', it.d)));
    });
    return h('section.section-sm', h('div.container', g));
  }

  function brandsRow() {
    var brands = V.catalog.brands().filter(function (b) { return b.featured; }).slice(0, 10);
    var wrap = h('div.row.wrap', { style: { justifyContent: 'center', gap: '14px' } });
    brands.forEach(function (b) {
      wrap.appendChild(h('a.chip', { href: ui.href('/brand/' + b.slug) }, V.loc(b, 'name')));
    });
    return h('section.section-sm', h('div.container', ui.sectionHead(t('topBrands'), { link: { href: '/brands', label: t('showMore') } }), wrap));
  }

  function testimonials() {
    var data = [
      { n: isAr() ? 'أحمد الشامي' : 'Ahmed Al-Shami', c: isAr() ? 'صنعاء' : 'Sanaa', r: 5, q: isAr() ? 'تجربة شراء ممتازة، المنتج وصلني بسرعة وبجودة عالية. أنصح به بشدة.' : 'Excellent shopping experience, fast delivery and great quality.' },
      { n: isAr() ? 'سارة العلي' : 'Sara Al-Ali', c: isAr() ? 'الرياض' : 'Riyadh', r: 5, q: isAr() ? 'أسعار منافسة وخدمة عملاء راقية. طلبي الثاني ولن يكون الأخير.' : 'Competitive prices and premium service. My second order, not the last.' },
      { n: isAr() ? 'محمد الحسن' : 'Mohammed Al-Hasan', c: isAr() ? 'دبي' : 'Dubai', r: 4, q: isAr() ? 'تنوع كبير في المنتجات والدفع عند الاستلام سهّل عليّ التجربة.' : 'Huge variety and cash on delivery made it easy to try.' },
      { n: isAr() ? 'نورة القحطاني' : 'Noura Al-Qahtani', c: isAr() ? 'الدمام' : 'Dammam', r: 5, q: isAr() ? 'جودة تغليف رائعة وإرجاع سهل. تجربة تستحق الثقة.' : 'Beautiful packaging and easy returns. A trustworthy experience.' }
    ];
    var grid = h('div.review-grid');
    data.forEach(function (d) {
      grid.appendChild(h('div.review-card',
        h('div.review-head',
          h('div.review-avatar', d.n.charAt(0)),
          h('div', h('strong', d.n), h('div.review-city', d.c))
        ),
        ui.stars(d.r, 0),
        h('p.review-quote', '“' + d.q + '”')
      ));
    });
    return h('section.section', h('div.container',
      ui.sectionHead(isAr() ? 'ماذا يقول عملاؤنا' : 'What our customers say', { eyebrow: isAr() ? 'آراء العملاء' : 'Testimonials' }),
      grid
    ));
  }

  function render() {
    var wrap = h('div');
    if (V.seo) V.seo.set({
      title: '',
      description: isAr() ? 'فيندورا — متجر إلكتروني شامل: إلكترونيات، أزياء، عطور، منزل، رياضة والمزيد. دفع عند الاستلام وإرجاع خلال 3 أيام.' : 'VENDORA — a full online store: electronics, fashion, fragrances, home, sports and more. Cash on delivery and 3-day returns.',
      type: 'website'
    });
    wrap.appendChild(hero());

    // categories
    var cats = h('div.cat-grid');
    V.catalog.categories().forEach(function (c) { cats.appendChild(ui.catTile(c)); });
    wrap.appendChild(h('section.section', h('div.container', ui.sectionHead(t('featuredCategories'), { eyebrow: isAr() ? 'تصفّح' : 'Browse' }), cats)));

    // featured products
    wrap.appendChild(h('section.section', h('div.container', ui.sectionHead(t('featuredProducts'), { link: { href: '/products', label: t('all') } }), productGrid(V.catalog.featured(8)))));

    wrap.appendChild(trustStrip());

    // new arrivals
    wrap.appendChild(h('section.section', h('div.container', ui.sectionHead(t('newArrivalsTitle'), { link: { href: '/new', label: t('all') } }), productGrid(V.catalog.newArrivals(8)))));

    // promo banner
    wrap.appendChild(h('section.section-sm', h('div.container',
      h('div.hero', h('img', { src: V.config.IMG.banners + 'banner-2.jpg', alt: '' }),
        h('div.hero-overlay', h('h2', isAr() ? 'عروض تصل إلى 40%' : 'Up to 40% off'), h('p', isAr() ? 'على مجموعة مختارة من المنتجات.' : 'On selected products.'), h('a.btn.btn-gold.mt-3', { href: ui.href('/offers') }, t('offersTitle'))))
    )));

    // best sellers
    wrap.appendChild(h('section.section', h('div.container', ui.sectionHead(t('bestSellersTitle'), { link: { href: '/best', label: t('all') } }), productGrid(V.catalog.bestSellers(8)))));

    // testimonials (social proof)
    wrap.appendChild(testimonials());

    // on sale
    wrap.appendChild(h('section.section', h('div.container', ui.sectionHead(t('offersTitle'), { link: { href: '/offers', label: t('all') } }), productGrid(V.catalog.onSale(4)))));

    wrap.appendChild(brandsRow());

    // value props
    wrap.appendChild(h('section.section', h('div.container',
      ui.sectionHead(t('whyVendora')),
      h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' } },
        [['truck', isAr() ? 'توصيل لكل المدن' : 'Nationwide delivery', isAr() ? 'نوصل إلى أغلب المدن في الأسواق السبعة.' : 'We deliver to most cities in all 7 markets.'],
         ['badge-check', isAr() ? 'منتجات أصلية' : 'Authentic products', isAr() ? 'نتعامل مع موردين موثوقين.' : 'Sourced from trusted suppliers.'],
         ['percent', isAr() ? 'أسعار تنافسية' : 'Competitive prices', isAr() ? 'عروض وخصومات مستمرة.' : 'Ongoing offers and discounts.'],
         ['headset', isAr() ? 'دعم سريع' : 'Fast support', isAr() ? 'فريق دعم يرد على استفساراتك.' : 'A support team that responds.']
        ].map(function (x) { return h('div.feature-card', h('div.ti-ico', ui.icon(x[0])), h('h3', x[1]), h('p.muted', x[2])); }))
    )));

    return wrap;
  }

  V.pages = V.pages || {};
  V.pages.home = render;
})(window);
