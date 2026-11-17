/* ============================================================
   VENDORA — Data layer: brand definitions (bilingual seed)
   Brand logos render as monograms in the UI (no asset dependency).
   Uses well-known brand names; slugs are stable identifiers and are
   also the prefix of product/image filenames — do not rename casually.
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;

  // categories = category slugs this brand belongs to
  V.brandsSeed = [
    // Electronics
    { id: 'br_samsung', slug: 'samsung', nameAr: 'سامسونج', nameEn: 'Samsung', country: 'KR', categories: ['electronics'], featured: true, descAr: 'هواتف وشاشات وأجهزة إلكترونية عالمية.', descEn: 'World-class phones, displays and electronics.' },
    { id: 'br_apple', slug: 'apple', nameAr: 'آبل', nameEn: 'Apple', country: 'US', categories: ['electronics'], featured: true, descAr: 'تصميم أنيق وتجربة استخدام سلسة.', descEn: 'Elegant design and a seamless experience.' },
    { id: 'br_sony', slug: 'sony', nameAr: 'سوني', nameEn: 'Sony', country: 'JP', categories: ['electronics'], featured: true, descAr: 'صوت نقي وصورة سينمائية.', descEn: 'Pure sound, cinematic picture.' },
    { id: 'br_xiaomi', slug: 'xiaomi', nameAr: 'شاومي', nameEn: 'Xiaomi', country: 'CN', categories: ['electronics'], featured: false, descAr: 'تقنية ذكية بقيمة استثنائية.', descEn: 'Smart tech with exceptional value.' },
    { id: 'br_huawei', slug: 'huawei', nameAr: 'هواوي', nameEn: 'Huawei', country: 'CN', categories: ['electronics'], featured: false, descAr: 'ابتكار في الاتصال والطاقة.', descEn: 'Innovation in connectivity and power.' },
    { id: 'br_hp', slug: 'hp', nameAr: 'إتش بي', nameEn: 'HP', country: 'US', categories: ['electronics'], featured: false, descAr: 'حواسيب وطابعات موثوقة.', descEn: 'Reliable computers and printers.' },

    // Fashion
    { id: 'br_nike', slug: 'nike', nameAr: 'نايكي', nameEn: 'Nike', country: 'US', categories: ['fashion'], featured: true, descAr: 'أزياء رياضية وتصاميم أيقونية.', descEn: 'Iconic sportswear and design.' },
    { id: 'br_zara', slug: 'zara', nameAr: 'زارا', nameEn: 'Zara', country: 'ES', categories: ['fashion'], featured: true, descAr: 'أناقة عصرية بخطوط الموضة.', descEn: 'Modern fashion on the cutting edge.' },
    { id: 'br_adidas', slug: 'adidas', nameAr: 'أديداس', nameEn: 'Adidas', country: 'DE', categories: ['fashion'], featured: false, descAr: 'راحة وأداء في كل خطوة.', descEn: 'Comfort and performance in every step.' },
    { id: 'br_handm', slug: 'handm', nameAr: 'إتش آند إم', nameEn: 'H&M', country: 'SE', categories: ['fashion'], featured: false, descAr: 'أزياء يومية بأسعار في المتناول.', descEn: 'Everyday fashion at accessible prices.' },
    { id: 'br_puma', slug: 'puma', nameAr: 'بوما', nameEn: 'Puma', country: 'DE', categories: ['fashion'], featured: false, descAr: 'روح رياضية وأناقة حضرية.', descEn: 'Sporty spirit, urban style.' },

    // Perfume
    { id: 'br_dior', slug: 'dior', nameAr: 'ديور', nameEn: 'Dior', country: 'FR', categories: ['perfume'], featured: true, descAr: 'عطور فرنسية فاخرة بثبات استثنائي.', descEn: 'Luxury French fragrance, exceptional longevity.' },
    { id: 'br_chanel', slug: 'chanel', nameAr: 'شانيل', nameEn: 'Chanel', country: 'FR', categories: ['perfume'], featured: true, descAr: 'أناقة خالدة وعطر لا يُنسى.', descEn: 'Timeless elegance and an unforgettable scent.' },
    { id: 'br_gucci', slug: 'gucci', nameAr: 'غوتشي', nameEn: 'Gucci', country: 'IT', categories: ['perfume'], featured: false, descAr: 'فخامة إيطالية بلمسة جذابة.', descEn: 'Italian luxury with a captivating touch.' },
    { id: 'br_loreal', slug: 'loreal', nameAr: 'لوريال', nameEn: "L'Oréal", country: 'FR', categories: ['perfume'], featured: false, descAr: 'جمال وعطر لكل يوم.', descEn: 'Beauty and fragrance for every day.' },

    // Home & Kitchen
    { id: 'br_tefal', slug: 'tefal', nameAr: 'تيفال', nameEn: 'Tefal', country: 'FR', categories: ['home'], featured: true, descAr: 'أدوات مطبخ عملية عالية الجودة.', descEn: 'Quality, practical kitchen tools.' },
    { id: 'br_dyson', slug: 'dyson', nameAr: 'دايسون', nameEn: 'Dyson', country: 'GB', categories: ['home'], featured: false, descAr: 'تنظيف وأجهزة منزلية مبتكرة.', descEn: 'Innovative cleaning and home appliances.' },
    { id: 'br_ikea', slug: 'ikea', nameAr: 'إيكيا', nameEn: 'IKEA', country: 'SE', categories: ['home'], featured: false, descAr: 'ديكور منزلي دافئ وبسيط.', descEn: 'Warm, simple home decor.' },
    { id: 'br_panasonic', slug: 'panasonic', nameAr: 'باناسونيك', nameEn: 'Panasonic', country: 'JP', categories: ['home'], featured: false, descAr: 'أجهزة تبريد وتنقية موثوقة.', descEn: 'Reliable cooling and purifying appliances.' },

    // Furniture
    { id: 'br_ashley', slug: 'ashley', nameAr: 'آشلي', nameEn: 'Ashley', country: 'US', categories: ['furniture'], featured: true, descAr: 'أثاث عملي بجودة تدوم.', descEn: 'Practical furniture built to last.' },
    { id: 'br_wayfair', slug: 'wayfair', nameAr: 'ويفير', nameEn: 'Wayfair', country: 'US', categories: ['furniture'], featured: false, descAr: 'تصاميم متنوعة لكل غرفة.', descEn: 'Varied designs for every room.' },
    { id: 'br_lazboy', slug: 'lazboy', nameAr: 'لازي بوي', nameEn: 'La-Z-Boy', country: 'US', categories: ['furniture'], featured: false, descAr: 'راحة ودفء بلمسة عصرية.', descEn: 'Comfort with a modern touch.' },

    // Sports
    { id: 'br_underarmour', slug: 'underarmour', nameAr: 'أندر آرمور', nameEn: 'Under Armour', country: 'US', categories: ['sports'], featured: true, descAr: 'ملابس رياضية عالية الأداء.', descEn: 'High-performance sportswear.' },
    { id: 'br_reebok', slug: 'reebok', nameAr: 'ريبوك', nameEn: 'Reebok', country: 'GB', categories: ['sports'], featured: false, descAr: 'معدات قوة وتحمّل.', descEn: 'Strength and endurance gear.' },
    { id: 'br_asics', slug: 'asics', nameAr: 'أسيكس', nameEn: 'ASICS', country: 'JP', categories: ['sports'], featured: false, descAr: 'أحذية ومعدات الجري.', descEn: 'Running shoes and gear.' },
    { id: 'br_gatorade', slug: 'gatorade', nameAr: 'غاتوريد', nameEn: 'Gatorade', country: 'US', categories: ['sports'], featured: false, descAr: 'تغذية وترطيب رياضي.', descEn: 'Sports nutrition and hydration.' },

    // Stationery
    { id: 'br_muji', slug: 'muji', nameAr: 'موجي', nameEn: 'MUJI', country: 'JP', categories: ['stationery'], featured: true, descAr: 'دفاتر وأوراق بجودة عالية.', descEn: 'High-quality notebooks and paper.' },
    { id: 'br_pilot', slug: 'pilot', nameAr: 'بايلوت', nameEn: 'Pilot', country: 'JP', categories: ['stationery'], featured: false, descAr: 'أقلام دقيقة الكتابة.', descEn: 'Precision writing instruments.' },
    { id: 'br_fabercastell', slug: 'fabercastell', nameAr: 'فابر كاستل', nameEn: 'Faber-Castell', country: 'DE', categories: ['stationery'], featured: false, descAr: 'مستلزمات دراسة عملية.', descEn: 'Practical study supplies.' },

    // Kids
    { id: 'br_fisherprice', slug: 'fisherprice', nameAr: 'فيشر برايس', nameEn: 'Fisher-Price', country: 'US', categories: ['kids'], featured: true, descAr: 'مستلزمات الرضّع الآمنة.', descEn: 'Safe baby essentials.' },
    { id: 'br_lego', slug: 'lego', nameAr: 'ليغو', nameEn: 'LEGO', country: 'DK', categories: ['kids'], featured: true, descAr: 'ألعاب تعليمية ممتعة.', descEn: 'Fun educational toys.' },
    { id: 'br_carters', slug: 'carters', nameAr: 'كارترز', nameEn: "Carter's", country: 'US', categories: ['kids'], featured: false, descAr: 'ملابس أطفال ناعمة.', descEn: 'Soft kids clothing.' }
  ];

  V.brandsSeed.forEach(function (b) {
    b.status = 'active';
    b.logo = null; // monogram rendered in UI
  });

  V.getBrandSeed = function (slug) {
    for (var i = 0; i < V.brandsSeed.length; i++) { if (V.brandsSeed[i].slug === slug) return V.brandsSeed[i]; }
    return null;
  };

  V.brandsForCategory = function (catSlug) {
    return V.brandsSeed.filter(function (b) { return b.categories.indexOf(catSlug) !== -1; });
  };
})(window);
