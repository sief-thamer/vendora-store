/* ============================================================
   VENDORA — Data layer: markets (currencies, shipping, tax)
   Prices are INDEPENDENT per market (not currency conversions).
   ============================================================ */
(function (global) {
  'use strict';
  var V = global.V;

  V.markets = [
    { code: 'YE', nameAr: 'اليمن', nameEn: 'Yemen', currency: 'YER', symbolAr: 'ر.ي', flag: '🇾🇪', region: 'اليمن',
      taxRate: 0, shippingFlat: 2000, freeShippingOver: 30000, priceTier: 1, citiesAr: ['صنعاء', 'عدن', 'تعز', 'الحديدة', 'إب', 'المكلا', 'حضرموت'],
      citiesEn: ['Sanaa', 'Aden', 'Taiz', 'Hodeidah', 'Ibb', 'Mukalla', 'Hadhramaut'], phoneCode: '+967' },
    { code: 'SA', nameAr: 'السعودية', nameEn: 'Saudi Arabia', currency: 'SAR', symbolAr: 'ر.س', flag: '🇸🇦', region: 'السعودية',
      taxRate: 0.15, shippingFlat: 25, freeShippingOver: 300, priceTier: 2.4, citiesAr: ['الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'أبها'],
      citiesEn: ['Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam', 'Khobar', 'Abha'], phoneCode: '+966' },
    { code: 'AE', nameAr: 'الإمارات', nameEn: 'UAE', currency: 'AED', symbolAr: 'د.إ', flag: '🇦🇪', region: 'الإمارات',
      taxRate: 0.05, shippingFlat: 20, freeShippingOver: 250, priceTier: 2.3, citiesAr: ['دبي', 'أبوظبي', 'الشارقة', 'عجمان', 'رأس الخيمة', 'الفجيرة'],
      citiesEn: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah'], phoneCode: '+971' },
    { code: 'KW', nameAr: 'الكويت', nameEn: 'Kuwait', currency: 'KWD', symbolAr: 'د.ك', flag: '🇰🇼', region: 'الكويت',
      taxRate: 0, shippingFlat: 2, freeShippingOver: 25, priceTier: 0.2, citiesAr: ['مدينة الكويت', 'حولي', 'الفروانية', 'الأحمدي', 'الجهراء'],
      citiesEn: ['Kuwait City', 'Hawalli', 'Farwaniya', 'Ahmadi', 'Jahra'], phoneCode: '+965' },
    { code: 'QA', nameAr: 'قطر', nameEn: 'Qatar', currency: 'QAR', symbolAr: 'ر.ق', flag: '🇶🇦', region: 'قطر',
      taxRate: 0, shippingFlat: 20, freeShippingOver: 250, priceTier: 2.3, citiesAr: ['الدوحة', 'الوكرة', 'الخور', 'الريان', 'الشمال'],
      citiesEn: ['Doha', 'Al Wakrah', 'Al Khor', 'Ar Rayyan', 'Ash Shamal'], phoneCode: '+974' },
    { code: 'BH', nameAr: 'البحرين', nameEn: 'Bahrain', currency: 'BHD', symbolAr: 'د.ب', flag: '🇧🇭', region: 'البحرين',
      taxRate: 0.10, shippingFlat: 2, freeShippingOver: 25, priceTier: 0.2, citiesAr: ['المنامة', 'المحرق', 'الرفاع', 'مدينة عيسى', 'سترة'],
      citiesEn: ['Manama', 'Muharraq', 'Riffa', 'Isa Town', 'Sitra'], phoneCode: '+973' },
    { code: 'OM', nameAr: 'عُمان', nameEn: 'Oman', currency: 'OMR', symbolAr: 'ر.ع', flag: '🇴🇲', region: 'عُمان',
      taxRate: 0.05, shippingFlat: 2, freeShippingOver: 25, priceTier: 0.2, citiesAr: ['مسقط', 'صلالة', 'صحار', 'نزوى', 'صور'],
      citiesEn: ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur'], phoneCode: '+968' }
  ];

  V.getMarket = function (code) {
    for (var i = 0; i < V.markets.length; i++) { if (V.markets[i].code === code) return V.markets[i]; }
    return V.markets[0];
  };

  // Round a price to market-appropriate "pretty" value respecting decimals.
  V.roundMarketPrice = function (value, marketCode) {
    var mk = V.getMarket(marketCode);
    var d = V.utils.currencyDecimals(mk.currency);
    if (d === 3) {
      // KWD/BHD/OMR: round to nearest 0.5 / 0.05 style
      var v = value < 5 ? Math.round(value * 100) / 100 : Math.round(value * 2) / 2;
      return Math.max(0.1, Number(v.toFixed(3)));
    }
    if (value >= 1000) return Math.round(value / 50) * 50;
    if (value >= 100) return Math.round(value / 5) * 5;
    if (value >= 20) return Math.round(value / 1) * 1;
    return Math.round(value * 100) / 100;
  };

  // Build an independent price map for a product from a base (Yemen) price.
  V.buildPrices = function (baseYER, jitter) {
    var prices = {};
    V.markets.forEach(function (mk, i) {
      var j = jitter ? (1 + (jitter[i] || 0)) : 1;
      var raw = baseYER * mk.priceTier * j;
      prices[mk.code] = V.roundMarketPrice(raw, mk.code);
    });
    return prices;
  };
})(window);
