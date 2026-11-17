# 06 — وثيقة UML (حالات الاستخدام، الفئات، التسلسل، النشاط)

**المشروع:** VENDORA | فيندورا · **الإصدار:** 1.2.0

---

## 1. حالات الاستخدام (Use Cases)
**العميل:** تصفّح، بحث، مقارنة/مفضلة، إضافة للسلة، تطبيق كوبون، دفع، تتبّع،
إدارة حساب/عناوين، إرجاع/استبدال، تقييم/إبلاغ، تنبيه توفّر.

**الإدارة:** إدارة منتجات/تصنيفات/علامات، إدارة مخزون، تنفيذ طلبات، مراجعة تحويلات،
اعتماد مرتجعات واستردادات، إدارة توصيل، كوبونات، محتوى، مراجعات، موظفون وصلاحيات،
إعدادات، نسخ احتياطي/استعادة، مراجعة سجل العمليات.

```
(العميل) ──> (المتجر)  : تصفّح/شراء/تتبّع/إرجاع
(موظف) ──> (لوحة الإدارة) : إدارة حسب الصلاحية
(مدير النظام) ──> (اعتماد الاسترداد/الإعدادات/النسخ) : تحكم كامل
```

## 2. مخطط الفئات (Class Diagram — خدمات النظام)
```
Account          Catalog           Cart/Commerce      Orders
+register()      +products()       +add()             +place()
+login()         +categories()     +totals()          +updateStatus()
+changePassword()+query()          +shippingInfo()     +cancel()
+deleteAccount() +stockOf()        +couponDiscount()   +requestReturn()
+addresses()     +suggest()                            +reviewReturn()
                                                       +printInvoice()

Inventory        Payments          Delivery           Reviews
+available()     +methods()        +adminRegions()      +add()
+adjust()        +confirmElectronic()+adminRates()      +moderate()
+addAlert()      +submitReceipt()  +saveRegion()        +verifiedPurchase()
+fireAlerts()    +reviewTransfer() +saveRate()          +report()
+movements()     +requestRefund()  +shippingInfo()
                 +decideRefund()

Db               Seo               Notify            Perms
+get/put/del()   +set()            +push()           +can()
+getAllByIndex() +reset()          +orderStatus()    +list()
+exportAll()                       +fireAlerts()
+importAll()
```

## 3. مخطط التسلسل (Sequence) — شراء ودفع إلكتروني
```
العميل   الواجهة     cart        orders        payments      stock
  |        |          |            |              |           |
  |--شراء-->|         |            |              |           |
  |        |--totals()->|          |              |           |
  |        |<--إجمالي--|           |              |           |
  |--تأكيد-->|         |            |              |           |
  |        |--------place(Idem)------------------->|          |
  |        |          |            |--حجز مؤقت--------------->|
  |        |<--------طلب جديد + بيانات دفع-----------|          |
  |--دفع-->|------------------>confirmElectronic----|          |
  |        |<-----------------مدفوع-----------------|          |
  |        |--------updateStatus(PENDING→CONFIRMED)->|          |
  |        |          |            |--commit حجز------------->|
```

## 4. مخطط التسلسل — تحويل بنكي ومراجعة
```
العميل --> submitReceipt(reference,bank) --> payments (awaiting_review)
Admin  --> reviewTransfer('accepted') --> payments(paid) + تحصيل
Admin  --> reviewTransfer('rejected'|'needs_info') --> إشعار العميل
(رقم عملية مكرر => خطأ reference_duplicate)
```

## 5. مخطط التسلسل — إرجاع واسترداد
```
العميل --> requestReturn --> returnRequests(requested)
Admin  --> reviewReturn('approved') --> order.returnStatus=approved
Order  --> RETURNED --> refundRequests(requested)
Admin(مدير فقط) --> decideRefund(true) --> REFUNDED + paymentStatus=refunded
```

## 6. مخطط النشاط (Activity) — دورة حياة الطلب
```
[بداية] -> PENDING
PENDING  -> CONFIRMED -> PROCESSING -> READY_TO_SHIP -> SHIPPED
SHIPPED  -> OUT_FOR_DELIVERY -> DELIVERED
أي مرحلة قبل SHIPPED -> CANCELLED (تحرير الحجز)
DELIVERED -> RETURN_REQUESTED -> RETURNED -> REFUNDED
SHIPPED/DELIVERY_FAILED -> RESCHEDULED -> (OUT_FOR_DELIVERY) -> DELIVERED
DELIVERY_FAILED -> RETURNED_TO_WAREHOUSE -> REFUNDED
[نهاية]
```

## 7. مخطط الحالة (State) — الطلب
| من | إلى المسموح |
|---|---|
| PENDING | CONFIRMED, CANCELLED |
| CONFIRMED | PROCESSING, CANCELLED |
| PROCESSING | READY_TO_SHIP, SHIPPED, CANCELLED |
| READY_TO_SHIP | SHIPPED, CANCELLED |
| SHIPPED | OUT_FOR_DELIVERY, DELIVERED, DELIVERY_FAILED |
| OUT_FOR_DELIVERY | DELIVERED, DELIVERY_FAILED |
| DELIVERY_FAILED | RESCHEDULED, RETURNED_TO_WAREHOUSE |
| RESCHEDULED | OUT_FOR_DELIVERY, DELIVERED, RETURNED_TO_WAREHOUSE |
| DELIVERED | RETURN_REQUESTED |
| RETURN_REQUESTED | RETURNED, DELIVERED |
| RETURNED | REFUNDED |
| RETURNED_TO_WAREHOUSE | REFUNDED |
| CANCELLED / REFUNDED | (نهائي) |
