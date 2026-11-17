/* ============================================================
   VENDORA — Data layer: product profiles per category
   Bilingual templates (nouns, adjectives, models, specs, options)
   used by seed.js to generate the deterministic demo catalog.
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;

  // helper shorthand
  function o(ar, en) { return { ar: ar, en: en }; }

  V.profiles = {
    electronics: {
      priceBase: [12000, 520000],
      nouns: [
        o('هاتف ذكي', 'Smartphone'), o('حاسوب محمول', 'Laptop'), o('سماعة لاسلكية', 'Wireless Headphones'),
        o('ساعة ذكية', 'Smartwatch'), o('شاحن سريع', 'Fast Charger'), o('مكبر صوت بلوتوث', 'Bluetooth Speaker'),
        o('لوحة مفاتيح ميكانيكية', 'Mechanical Keyboard'), o('بطارية متنقلة', 'Power Bank'),
        o('شاشة احترافية', 'Pro Monitor'), o('كاميرا ويب', 'Webcam'), o('ماوس لاسلكي', 'Wireless Mouse'),
        o('راوتر واي فاي', 'Wi-Fi Router')
      ],
      models: [o('', ''), o('برو', 'Pro'), o('ماكس', 'Max'), o('لايت', 'Lite'), o('بلس', 'Plus'), o('إير', 'Air')],
      adjectives: [
        o('فاخر', 'Premium'), o('خفيف', 'Lightweight'), o('احترافي', 'Professional'), o('ذكي', 'Smart'),
        o('عملي', 'Practical'), o('أنيق', 'Sleek')
      ],
      specs: [
        { k: o('المعالج', 'Processor'), v: [o('ثنائي النواة', 'Dual-core'), o('رباعي النواة', 'Quad-core'), o('ثماني النواة', 'Octa-core')] },
        { k: o('الذاكرة العشوائية', 'RAM'), v: [o('4 جيجابايت', '4 GB'), o('8 جيجابايت', '8 GB'), o('16 جيجابايت', '16 GB')] },
        { k: o('الشاشة', 'Display'), v: [o('5.5 بوصة', '5.5 in'), o('6.5 بوصة', '6.5 in'), o('13 بوصة', '13 in')] },
        { k: o('البطارية', 'Battery'), v: [o('3000 مللي أمبير', '3000 mAh'), o('4500 مللي أمبير', '4500 mAh'), o('5000 مللي أمبير', '5000 mAh')] },
        { k: o('الاتصال', 'Connectivity'), v: [o('بلوتوث 5.0', 'Bluetooth 5.0'), o('واي فاي 6', 'Wi-Fi 6'), o('USB-C', 'USB-C')] }
      ],
      colors: [o('أسود', 'Black'), o('أبيض', 'White'), o('رمادي', 'Gray'), o('أزرق', 'Blue'), o('فضي', 'Silver')],
      sizes: [],
      warranty: o('ضمان 12 شهرًا', '12-month warranty'),
      imgCount: 6
    },

    fashion: {
      priceBase: [3000, 68000],
      nouns: [
        o('قميص قطني', 'Cotton Shirt'), o('بنطال جينز', 'Denim Jeans'), o('حذاء رياضي', 'Sneakers'),
        o('حقيبة يد', 'Handbag'), o('ساعة يد', 'Wristwatch'), o('جاكيت', 'Jacket'), o('فستان', 'Dress'),
        o('محفظة', 'Wallet'), o('نظارات شمسية', 'Sunglasses'), o('حزام جلد', 'Leather Belt'),
        o('كنزة صوف', 'Wool Sweater'), o('وشاح', 'Scarf')
      ],
      models: [o('', ''), o('كلاسيك', 'Classic'), o('عصري', 'Modern'), o('صيفي', 'Summer'), o('شتوي', 'Winter')],
      adjectives: [o('قطني', 'Cotton'), o('جلدي', 'Leather'), o('أنيق', 'Elegant'), o('مريح', 'Comfortable'), o('عملي', 'Practical')],
      specs: [
        { k: o('الخامة', 'Material'), v: [o('قطن 100%', '100% Cotton'), o('جلد طبيعي', 'Genuine Leather'), o('بوليستر', 'Polyester')] },
        { k: o('القَصّة', 'Fit'), v: [o('ضيّقة', 'Slim'), o('عادية', 'Regular'), o('واسعة', 'Relaxed')] },
        { k: o('العناية', 'Care'), v: [o('غسيل يدوي', 'Hand wash'), o('غسيل آلي', 'Machine wash')] }
      ],
      colors: [o('أسود', 'Black'), o('كحلي', 'Navy'), o('بيج', 'Beige'), o('أبيض', 'White'), o('أحمر', 'Red'), o('بني', 'Brown')],
      sizes: [o('S', 'S'), o('M', 'M'), o('L', 'L'), o('XL', 'XL'), o('XXL', 'XXL')],
      warranty: o('استبدال خلال 3 أيام', 'Exchange within 3 days'),
      imgCount: 6
    },

    perfume: {
      priceBase: [6000, 160000],
      nouns: [
        o('عطر شرقي', 'Oriental Perfume'), o('أو دو بارفان', 'Eau de Parfum'), o('بخور فاخر', 'Luxury Incense'),
        o('مسك', 'Musk'), o('معطر الجسم', 'Body Mist'), o('دهن عود', 'Oud Oil'), o('كولونيا', 'Cologne')
      ],
      models: [o('', ''), o('رويال', 'Royal'), o('نوار', 'Noir'), o('ذهبي', 'Gold'), o('أوركيد', 'Orchid')],
      adjectives: [o('فاخر', 'Luxury'), o('دافئ', 'Warm'), o('منعش', 'Fresh'), o('غامض', 'Mysterious'), o('شرقي', 'Oriental')],
      specs: [
        { k: o('الحجم', 'Volume'), v: [o('30 مل', '30 ml'), o('50 مل', '50 ml'), o('100 مل', '100 ml')] },
        { k: o('العائلة العطرية', 'Family'), v: [o('شرقي', 'Oriental'), o('خشبي', 'Woody'), o('زهري', 'Floral'), o('حمضي', 'Citrus')] },
        { k: o('الثبات', 'Longevity'), v: [o('طويل', 'Long'), o('طويل جدًا', 'Very long')] }
      ],
      colors: [],
      sizes: [o('30 مل', '30 ml'), o('50 مل', '50 ml'), o('100 مل', '100 ml')],
      warranty: o('أصلي 100%', '100% authentic'),
      imgCount: 6
    },

    home: {
      priceBase: [2500, 120000],
      nouns: [
        o('طقم أكواب', 'Mug Set'), o('مقلاة مانعة للالتصاق', 'Non-stick Frying Pan'), o('محضرة طعام', 'Food Processor'),
        o('منظّم أدراج', 'Drawer Organizer'), o('غلاية كهربائية', 'Electric Kettle'), o('طقم سكاكين', 'Knife Set'),
        o('مرطّب هواء', 'Humidifier'), o('سجادة أرضية', 'Floor Rug'), o('طقم تخزين', 'Storage Set'), o('خلاط كهربائي', 'Blender')
      ],
      models: [o('', ''), o('برو', 'Pro'), o('ستيل', 'Steel'), o('كومباكت', 'Compact'), o('ديلوكس', 'Deluxe')],
      adjectives: [o('عملي', 'Practical'), o('متين', 'Durable'), o('أنيق', 'Sleek'), o('اقتصادي', 'Economical'), o('سعة كبيرة', 'Large capacity')],
      specs: [
        { k: o('الخامة', 'Material'), v: [o('ستانلس ستيل', 'Stainless steel'), o('زجاج', 'Glass'), o('سيليكون', 'Silicone')] },
        { k: o('الاستخدام', 'Use'), v: [o('كهربائي', 'Electric'), o('يدوي', 'Manual')] },
        { k: o('آمن في غسالة الأطباق', 'Dishwasher safe'), v: [o('نعم', 'Yes'), o('لا', 'No')] }
      ],
      colors: [o('فضي', 'Silver'), o('أسود', 'Black'), o('أبيض', 'White'), o('بيج', 'Beige')],
      sizes: [],
      warranty: o('ضمان سنة على العيوب المصنعية', '1-year manufacturing warranty'),
      imgCount: 6
    },

    furniture: {
      priceBase: [25000, 480000],
      nouns: [
        o('صوفا ثلاثية', '3-Seater Sofa'), o('سرير خشبي', 'Wooden Bed'), o('طاولة سفرة', 'Dining Table'),
        o('خزانة ملابس', 'Wardrobe'), o('كرسي مكتبي', 'Office Chair'), o('مكتب عمل', 'Work Desk'), o('رف كتب', 'Bookshelf'),
        o('طاولة قهوة', 'Coffee Table'), o('كنبة زاوية', 'Corner Sofa'), o('تسريحة', 'Dresser')
      ],
      models: [o('', ''), o('مودرن', 'Modern'), o('كلاسيك', 'Classic'), o('نورديك', 'Nordic'), o('كونر', 'Corner')],
      adjectives: [o('خشبي', 'Wooden'), o('فاخر', 'Premium'), o('عملي', 'Practical'), o('متين', 'Sturdy'), o('مريح', 'Comfortable')],
      specs: [
        { k: o('الخامة', 'Material'), v: [o('خشب MDF', 'MDF'), o('خشب زان', 'Beech wood'), o('معدن وخشب', 'Metal & wood')] },
        { k: o('الأبعاد', 'Dimensions'), v: [o('180×90×75 سم', '180×90×75 cm'), o('200×100×80 سم', '200×100×80 cm')] },
        { k: o('التجميع', 'Assembly'), v: [o('يتطلب تجميعًا', 'Assembly required'), o('جاهز', 'Assembled')] }
      ],
      colors: [o('بني', 'Brown'), o('رمادي', 'Gray'), o('أبيض', 'White'), o('أسود', 'Black'), o('أوف وايت', 'Off-white')],
      sizes: [],
      warranty: o('ضمان هيكل سنتان', '2-year frame warranty'),
      imgCount: 6
    },

    sports: {
      priceBase: [1800, 90000],
      nouns: [
        o('دمبل قابل للتعديل', 'Adjustable Dumbbell'), o('سجادة يوغا', 'Yoga Mat'), o('حذاء جري', 'Running Shoes'),
        o('بروتين واي', 'Whey Protein'), o('زجاجة ماء رياضية', 'Sports Water Bottle'), o('حبل مقاومة', 'Resistance Band'),
        o('كرة قدم', 'Football'), o('قفاز تدريب', 'Training Gloves'), o('حزام رفع أثقال', 'Weight Belt')
      ],
      models: [o('', ''), o('برو', 'Pro'), o('إليت', 'Elite'), o('فِت', 'Fit'), o('ماكس', 'Max')],
      adjectives: [o('احترافي', 'Professional'), o('خفيف', 'Lightweight'), o('متين', 'Durable'), o('مرن', 'Flexible'), o('مضاد للانزلاق', 'Anti-slip')],
      specs: [
        { k: o('الخامة', 'Material'), v: [o('مطاط', 'Rubber'), o('نيلون', 'Nylon'), o('حديد', 'Steel')] },
        { k: o('الوزن', 'Weight'), v: [o('1 كجم', '1 kg'), o('5 كجم', '5 kg'), o('10 كجم', '10 kg')] },
        { k: o('الاستخدام', 'Use'), v: [o('منزل', 'Home'), o('صالة رياضية', 'Gym'), o('خارجي', 'Outdoor')] }
      ],
      colors: [o('أسود', 'Black'), o('أحمر', 'Red'), o('أزرق', 'Blue'), o('أخضر', 'Green')],
      sizes: [o('S', 'S'), o('M', 'M'), o('L', 'L')],
      warranty: o('ضمان 6 أشهر', '6-month warranty'),
      imgCount: 6
    },

    stationery: {
      priceBase: [500, 22000],
      nouns: [
        o('دفتر ملاحظات', 'Notebook'), o('طقم أقلام', 'Pen Set'), o('منظّم ملفات', 'File Organizer'),
        o('آلة حاسبة', 'Calculator'), o('طقم هندسة', 'Geometry Set'), o('حبر إعادة تعبئة', 'Refill Ink'),
        o('دباسة مكتبية', 'Stapler'), o('طقم أقلام تلوين', 'Colored Pencils'), o('مفكرة جيب', 'Pocket Planner')
      ],
      models: [o('', ''), o('أيه تو', 'A2'), o('أيه فور', 'A4'), o('أيه فايف', 'A5'), o('بريميوم', 'Premium')],
      adjectives: [o('عالية الجودة', 'High quality'), o('مدمج', 'Compact'), o('عملية', 'Practical'), o('أنيقة', 'Stylish')],
      specs: [
        { k: o('المقاس', 'Size'), v: [o('A4', 'A4'), o('A5', 'A5'), o('A6', 'A6')] },
        { k: o('عدد الصفحات', 'Pages'), v: [o('80', '80'), o('120', '120'), o('200', '200')] },
        { k: o('الخامة', 'Material'), v: [o('ورق', 'Paper'), o('بلاستيك', 'Plastic'), o('معدن', 'Metal')] }
      ],
      colors: [o('أزرق', 'Blue'), o('أسود', 'Black'), o('أحمر', 'Red'), o('أخضر', 'Green')],
      sizes: [],
      warranty: o('لا يشمل الضمان', 'Not covered'),
      imgCount: 6
    },

    kids: {
      priceBase: [1500, 110000],
      nouns: [
        o('لعبة تعليمية', 'Educational Toy'), o('عربة أطفال', 'Stroller'), o('سرير أطفال', 'Baby Crib'),
        o('مكعبات بناء', 'Building Blocks'), o('دمية قماشية', 'Plush Doll'), o('طقم ملابس أطفال', 'Kids Clothing Set'),
        o('حفاضات', 'Diaper Pack'), o('كرسي طعام', 'High Chair'), o('بازل خشبي', 'Wooden Puzzle'), o('حقيبة مدرسية', 'School Bag')
      ],
      models: [o('', ''), o('بيبي', 'Baby'), o('جونيور', 'Junior'), o('سوفت', 'Soft'), o('فان', 'Fun')],
      adjectives: [o('آمن', 'Safe'), o('ملوّن', 'Colorful'), o('ناعم', 'Soft'), o('تعليمي', 'Educational'), o('متين', 'Durable')],
      specs: [
        { k: o('العمر المناسب', 'Age'), v: [o('0-6 أشهر', '0-6 months'), o('1-3 سنوات', '1-3 years'), o('3-6 سنوات', '3-6 years'), o('6+ سنوات', '6+ years')] },
        { k: o('الخامة', 'Material'), v: [o('بلاستيك آمن', 'BPA-free plastic'), o('قماش', 'Fabric'), o('خشب', 'Wood')] },
        { k: o('معايير السلامة', 'Safety'), v: [o('معتمد آمن للأطفال', 'Child-safe certified'), o('خالٍ من القطع الصغيرة', 'No small parts')] }
      ],
      colors: [o('متعدد الألوان', 'Multicolor'), o('أزرق', 'Blue'), o('وردي', 'Pink'), o('أصفر', 'Yellow')],
      sizes: [o('0-6 أشهر', '0-6m'), o('6-12 شهر', '6-12m'), o('1-3 سنوات', '1-3y'), o('3-6 سنوات', '3-6y')],
      warranty: o('ضمان ضد عيوب الصناعة', 'Manufacturing defect warranty'),
      imgCount: 6
    }
  };

  V.getProfile = function (slug) { return V.profiles[slug] || V.profiles.electronics; };
})(window);
