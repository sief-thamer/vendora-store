/* ============================================================
   VENDORA — Data layer: category definitions (bilingual seed)
   Slugs match real photo assets: assets/images/categories/{slug}.jpg
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;
  var IMG = V.config.IMG;

  V.categoriesSeed = [
    {
      id: 'cat_electronics', slug: 'electronics', sort: 1, icon: 'box', color: '#1E5FA8',
      nameAr: 'الإلكترونيات', nameEn: 'Electronics',
      descAr: 'هواتف، حواسيب، سماعات وأجهزة ذكية بأحدث الإصدارات.',
      descEn: 'Phones, laptops, audio and smart devices — latest releases.',
      subcategories: [
        { id: 'sub_el_phones', slug: 'phones', nameAr: 'الهواتف الذكية', nameEn: 'Smartphones' },
        { id: 'sub_el_laptops', slug: 'laptops', nameAr: 'الحواسيب المحمولة', nameEn: 'Laptops' },
        { id: 'sub_el_audio', slug: 'audio', nameAr: 'السماعات والصوتيات', nameEn: 'Audio & Headphones' },
        { id: 'sub_el_wearables', slug: 'wearables', nameAr: 'الساعات الذكية', nameEn: 'Smartwatches' },
        { id: 'sub_el_accessories', slug: 'accessories', nameAr: 'الملحقات والشواحن', nameEn: 'Accessories & Chargers' }
      ]
    },
    {
      id: 'cat_fashion', slug: 'fashion', sort: 2, icon: 'tag', color: '#8E3B5C',
      nameAr: 'الأزياء', nameEn: 'Fashion',
      descAr: 'ملابس وأحذية وحقائب رجالية ونسائية بلمسة عصرية.',
      descEn: 'Clothing, shoes and bags for men and women — modern styles.',
      subcategories: [
        { id: 'sub_fa_men', slug: 'men', nameAr: 'ملابس رجالية', nameEn: 'Men' },
        { id: 'sub_fa_women', slug: 'women', nameAr: 'ملابس نسائية', nameEn: 'Women' },
        { id: 'sub_fa_shoes', slug: 'shoes', nameAr: 'الأحذية', nameEn: 'Shoes' },
        { id: 'sub_fa_bags', slug: 'bags', nameAr: 'الحقائب', nameEn: 'Bags' },
        { id: 'sub_fa_watches', slug: 'watches', nameAr: 'الساعات', nameEn: 'Watches' }
      ]
    },
    {
      id: 'cat_perfume', slug: 'perfume', sort: 3, icon: 'sparkles', color: '#7A5C2E',
      nameAr: 'العطور', nameEn: 'Perfume',
      descAr: 'عطور شرقية وفرنسية بخامات فاخرة وثبات طويل.',
      descEn: 'Oriental and French fragrances — premium, long lasting.',
      subcategories: [
        { id: 'sub_pe_men', slug: 'men-perfume', nameAr: 'عطور رجالية', nameEn: 'Men' },
        { id: 'sub_pe_women', slug: 'women-perfume', nameAr: 'عطور نسائية', nameEn: 'Women' },
        { id: 'sub_pe_oud', slug: 'oud', nameAr: 'عود وبخور', nameEn: 'Oud & Incense' },
        { id: 'sub_pe_body', slug: 'body', nameAr: 'معطرات الجسم', nameEn: 'Body Mists' }
      ]
    },
    {
      id: 'cat_home', slug: 'home', sort: 4, icon: 'home', color: '#2E7D64',
      nameAr: 'المنزل والمطبخ', nameEn: 'Home & Kitchen',
      descAr: 'أدوات مطبخ ومستلزمات منزلية تنظّم وتزيّن يومك.',
      descEn: 'Kitchen tools and home essentials to organize and beautify.',
      subcategories: [
        { id: 'sub_ho_kitchen', slug: 'kitchen', nameAr: 'أدوات المطبخ', nameEn: 'Kitchenware' },
        { id: 'sub_ho_appliances', slug: 'appliances', nameAr: 'الأجهزة المنزلية', nameEn: 'Appliances' },
        { id: 'sub_ho_decor', slug: 'decor', nameAr: 'الديكور المنزلي', nameEn: 'Home Decor' },
        { id: 'sub_ho_cleaning', slug: 'cleaning', nameAr: 'التنظيف والترتيب', nameEn: 'Cleaning & Storage' }
      ]
    },
    {
      id: 'cat_furniture', slug: 'furniture', sort: 5, icon: 'layers', color: '#6B4F3A',
      nameAr: 'الأثاث', nameEn: 'Furniture',
      descAr: 'أثاث غرف الجلوس والنوم بتصاميم عملية وأنيقة.',
      descEn: 'Living and bedroom furniture — practical and elegant.',
      subcategories: [
        { id: 'sub_fu_sofas', slug: 'sofas', nameAr: 'الكنب والصوفا', nameEn: 'Sofas' },
        { id: 'sub_fu_beds', slug: 'beds', nameAr: 'الأسرّة وغرف النوم', nameEn: 'Beds' },
        { id: 'sub_fu_tables', slug: 'tables', nameAr: 'الطاولات', nameEn: 'Tables' },
        { id: 'sub_fu_storage', slug: 'storage', nameAr: 'الخزائن والتخزين', nameEn: 'Storage' }
      ]
    },
    {
      id: 'cat_sports', slug: 'sports', sort: 6, icon: 'award', color: '#B5621E',
      nameAr: 'الرياضة واللياقة', nameEn: 'Sports & Fitness',
      descAr: 'معدات رياضية وملابس لياقة لممارسة صحية وسهلة.',
      descEn: 'Fitness gear and sportswear for a healthier routine.',
      subcategories: [
        { id: 'sub_sp_equipment', slug: 'equipment', nameAr: 'أجهزة اللياقة', nameEn: 'Equipment' },
        { id: 'sub_sp_apparel', slug: 'apparel', nameAr: 'ملابس رياضية', nameEn: 'Apparel' },
        { id: 'sub_sp_outdoor', slug: 'outdoor', nameAr: 'الرياضات الخارجية', nameEn: 'Outdoor' },
        { id: 'sub_sp_nutrition', slug: 'nutrition', nameAr: 'المكملات الغذائية', nameEn: 'Nutrition' }
      ]
    },
    {
      id: 'cat_stationery', slug: 'stationery', sort: 7, icon: 'book', color: '#3E5C8A',
      nameAr: 'القرطاسية', nameEn: 'Stationery',
      descAr: 'دفاتر وأقلام ومستلزمات مكتبية للدراسة والعمل.',
      descEn: 'Notebooks, pens and office supplies for study and work.',
      subcategories: [
        { id: 'sub_st_notebooks', slug: 'notebooks', nameAr: 'الدفاتر', nameEn: 'Notebooks' },
        { id: 'sub_st_pens', slug: 'pens', nameAr: 'الأقلام', nameEn: 'Pens' },
        { id: 'sub_st_office', slug: 'office', nameAr: 'المستلزمات المكتبية', nameEn: 'Office' },
        { id: 'sub_st_art', slug: 'art', nameAr: 'أدوات الفنون', nameEn: 'Art Supplies' }
      ]
    },
    {
      id: 'cat_kids', slug: 'kids', sort: 8, icon: 'gift', color: '#B5872E',
      nameAr: 'مستلزمات الأطفال', nameEn: 'Kids',
      descAr: 'ألعاب ومستلزمات الأطفال والرضّع من عمر صفر فما فوق.',
      descEn: 'Toys and essentials for kids and babies, ages 0 and up.',
      subcategories: [
        { id: 'sub_ki_toys', slug: 'toys', nameAr: 'الألعاب', nameEn: 'Toys' },
        { id: 'sub_ki_baby', slug: 'baby', nameAr: 'مستلزمات الرضّع', nameEn: 'Baby Care' },
        { id: 'sub_ki_clothing', slug: 'kids-clothing', nameAr: 'ملابس الأطفال', nameEn: 'Kids Clothing' },
        { id: 'sub_ki_education', slug: 'education', nameAr: 'الوسائل التعليمية', nameEn: 'Educational' }
      ]
    }
  ];

  // Attach resolved image paths (category banners)
  V.categoriesSeed.forEach(function (c) {
    c.image = IMG.categories + c.slug + '.jpg';
    c.status = 'active';
    c.productCount = 0; // filled at seed time
  });

  V.getCategorySeed = function (slug) {
    for (var i = 0; i < V.categoriesSeed.length; i++) {
      if (V.categoriesSeed[i].slug === slug) return V.categoriesSeed[i];
    }
    return null;
  };

  // category image helper for runtime docs loaded from DB
  V.categoryImage = function (cat) {
    if (!cat) return IMG.ui + 'placeholder.svg';
    var img = cat.image || (IMG.categories + (cat.slug || cat.id) + '.jpg');
    if (img.indexOf('assets/images/categories/') !== -1 && img.indexOf('.svg') !== -1) {
      img = img.replace(/\.svg$/, '.jpg');
    }
    return img;
  };
})(window);
