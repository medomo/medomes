import { User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, InventoryItem, InventoryTransaction } from './types';

export const INITIAL_USERS: User[] = [
  {
    id: 'u-1',
    username: 'admin',
    passwordHash: 'admin', // Simple passwords for easy demo login
    role: 'admin',
    name: 'المهندس أحمد صالح (مدير النظام)',
    status: 'active',
    permissions: ['all_permissions'],
    createdAt: '2026-01-01 08:00'
  },
  {
    id: 'u-2',
    username: 'coll1',
    passwordHash: '123',
    role: 'collector',
    name: 'محمد علي سالم (المحصل الميداني)',
    status: 'active',
    permissions: ['read_readings', 'write_readings', 'write_payments'],
    createdAt: '2026-01-15 09:30'
  },
  {
    id: 'u-3',
    username: 'coll2',
    passwordHash: '123',
    role: 'collector',
    name: 'خالد عبدالله عوض (المحصل الميداني)',
    status: 'active',
    permissions: ['read_readings', 'write_readings', 'write_payments'],
    createdAt: '2026-02-01 10:00'
  },
  {
    id: 'u-4',
    username: 'coll_sus',
    passwordHash: '123',
    role: 'collector',
    name: 'عمر ياسين سعيد (موقوف مؤقتاً)',
    status: 'suspended',
    permissions: ['read_readings'],
    createdAt: '2026-02-15 11:00'
  },
  {
    id: 'u-5',
    username: 'manager',
    passwordHash: 'manager',
    role: 'manager',
    name: 'عبدالله يحيى (المدير العام)',
    status: 'active',
    permissions: ['all_permissions'],
    createdAt: '2026-02-01 08:00'
  },
  {
    id: 'u-6',
    username: 'account',
    passwordHash: 'account',
    role: 'accountant',
    name: 'خالد سعيد (محاسب)',
    status: 'active',
    permissions: ['finance', 'reporting', 'subscribers'],
    createdAt: '2026-02-15 08:00'
  },
  {
    id: 'u-7',
    username: 'data',
    passwordHash: 'data',
    role: 'data_entry',
    name: 'سالم أحمد (مدخل بيانات)',
    status: 'active',
    permissions: ['subscribers', 'operations', 'inventory'],
    createdAt: '2026-03-01 08:00'
  }
];

export const INITIAL_SUBSCRIBERS: Subscriber[] = [
  {
    id: 'sub-1',
    name: 'أحمد محمد أحمد سالم',
    phone: '777123456',
    meterNumber: 'M-10901',
    zone: 'المنطقة (أ) - وسط المدينة',
    transformer: 'المحول الرئيسي 1',
    tariffType: 'residential',
    status: 'active',
    initialReading: 1250,
    currentReading: 1480,
    currentBalance: 120.00, coordinates: { lat: 15.37193, lng: 44.19240 }, // Still has unpaid bill
    createdAt: '2026-01-10'
  },
  {
    id: 'sub-2',
    name: 'مؤسسة الوفاء التجارية والمخازن',
    phone: '771987654',
    meterNumber: 'M-20412',
    zone: 'المنطقة (ب) - السوق التجاري',
    transformer: 'محول السوق',
    tariffType: 'commercial',
    status: 'active',
    initialReading: 4890,
    currentReading: 5320,
    currentBalance: 450.00, coordinates: { lat: 15.38920, lng: 44.20141 },
    createdAt: '2026-01-12'
  },
  {
    id: 'sub-3',
    name: 'مصنع الأمل للبلاستيك والعلب',
    phone: '770111222',
    meterNumber: 'M-30805',
    zone: 'المنطقة (ج) - المنطقة الصناعية',
    transformer: 'المحول الرئيسي 2',
    tariffType: 'industrial',
    status: 'active',
    initialReading: 12300,
    currentReading: 13950,
    currentBalance: 2150.00, coordinates: { lat: 15.38968, lng: 44.19016 },
    createdAt: '2026-01-15'
  },
  {
    id: 'sub-4',
    name: 'فاطمة صالح عبد الله سعيد',
    phone: '775333444',
    meterNumber: 'M-10902',
    zone: 'المنطقة (أ) - وسط المدينة',
    transformer: 'المحول الرئيسي 1',
    tariffType: 'residential',
    status: 'active',
    initialReading: 850,
    currentReading: 990,
    currentBalance: 0.00, coordinates: { lat: 15.36066, lng: 44.18768 }, // Fully paid
    createdAt: '2026-01-20'
  },
  {
    id: 'sub-5',
    name: 'سوبرماركت البركة والخيرات',
    phone: '773555666',
    meterNumber: 'M-20413',
    zone: 'المنطقة (ب) - السوق التجاري',
    transformer: 'محول السوق',
    tariffType: 'commercial',
    status: 'active',
    initialReading: 3410,
    currentReading: 3880,
    currentBalance: 615.50, coordinates: { lat: 15.37221, lng: 44.18968 },
    createdAt: '2026-01-22'
  },
  {
    id: 'sub-6',
    name: 'علي ناصر عمر الحربي (منزل)',
    phone: '772888999',
    meterNumber: 'M-10903',
    zone: 'المنطقة (أ) - وسط المدينة',
    transformer: 'المحول الرئيسي 1',
    tariffType: 'residential',
    status: 'suspended', // Suspended subscriber
    initialReading: 2100,
    currentReading: 2310,
    currentBalance: 320.00, coordinates: { lat: 15.35521, lng: 44.17647 },
    createdAt: '2026-01-25'
  },
  {
    id: 'sub-7',
    name: 'المهندس ياسر فضل هادي (منزل)',
    phone: '777444222',
    meterNumber: 'M-10904',
    zone: 'المنطقة (أ) - وسط المدينة',
    transformer: 'المحول الرئيسي 1',
    tariffType: 'residential',
    status: 'active',
    initialReading: 110,
    currentReading: 320,
    currentBalance: 85.00, coordinates: { lat: 15.38021, lng: 44.19871 },
    createdAt: '2026-02-01'
  }
];

export const INITIAL_READINGS: MeterReading[] = [
  {
    id: 'rd-1',
    subscriberId: 'sub-1',
    subscriberName: 'أحمد محمد أحمد سالم',
    meterNumber: 'M-10901',
    previousReading: 1250,
    currentReading: 1480,
    consumption: 230,
    ratePerKwh: 0.50, // Residential tariff
    fixedFee: 5.00,
    taxAmount: 6.00, // 5% of consumption cost (115 * 0.05) + fixed
    totalAmount: 126.00,
    billingMonth: '2026-06',
    readingDate: '2026-06-25 14:20',
    enteredBy: 'coll1',
    isPosted: true,
    postedDate: '2026-06-30 18:00'
  },
  {
    id: 'rd-2',
    subscriberId: 'sub-2',
    subscriberName: 'مؤسسة الوفاء التجارية والمخازن',
    meterNumber: 'M-20412',
    previousReading: 4890,
    currentReading: 5320,
    consumption: 430,
    ratePerKwh: 1.00, // Commercial tariff
    fixedFee: 10.00,
    taxAmount: 22.00,
    totalAmount: 462.00,
    billingMonth: '2026-06',
    readingDate: '2026-06-25 15:45',
    enteredBy: 'coll1',
    isPosted: true,
    postedDate: '2026-06-30 18:00'
  },
  {
    id: 'rd-3',
    subscriberId: 'sub-3',
    subscriberName: 'مصنع الأمل للبلاستيك والعلب',
    meterNumber: 'M-30805',
    previousReading: 12300,
    currentReading: 13950,
    consumption: 1650,
    ratePerKwh: 1.50, // Industrial tariff
    fixedFee: 25.00,
    taxAmount: 125.00,
    totalAmount: 2625.00,
    billingMonth: '2026-06',
    readingDate: '2026-06-26 10:15',
    enteredBy: 'coll2',
    isPosted: true,
    postedDate: '2026-06-30 18:00'
  },
  {
    id: 'rd-4',
    subscriberId: 'sub-4',
    subscriberName: 'فاطمة صالح عبد الله سعيد',
    meterNumber: 'M-10902',
    previousReading: 850,
    currentReading: 990,
    consumption: 140,
    ratePerKwh: 0.50,
    fixedFee: 5.00,
    taxAmount: 3.75,
    totalAmount: 78.75,
    billingMonth: '2026-06',
    readingDate: '2026-06-26 11:30',
    enteredBy: 'coll2',
    isPosted: true,
    postedDate: '2026-06-30 18:00'
  },
  {
    id: 'rd-5',
    subscriberId: 'sub-5',
    subscriberName: 'سوبرماركت البركة والخيرات',
    meterNumber: 'M-20413',
    previousReading: 3410,
    currentReading: 3880,
    consumption: 470,
    ratePerKwh: 1.00,
    fixedFee: 10.00,
    taxAmount: 24.00,
    totalAmount: 504.00,
    billingMonth: '2026-06',
    readingDate: '2026-06-27 16:10',
    enteredBy: 'coll1',
    isPosted: true,
    postedDate: '2026-06-30 18:00'
  },
  // Unposted readings for July 2026 (Waiting for manager's Posting action!)
  {
    id: 'rd-pending-1',
    subscriberId: 'sub-1',
    subscriberName: 'أحمد محمد أحمد سالم',
    meterNumber: 'M-10901',
    previousReading: 1480,
    currentReading: 1610,
    consumption: 130,
    ratePerKwh: 0.50,
    fixedFee: 5.00,
    taxAmount: 3.50,
    totalAmount: 73.50,
    billingMonth: '2026-07',
    readingDate: '2026-07-09 11:00',
    enteredBy: 'coll1',
    isPosted: false
  },
  {
    id: 'rd-pending-2',
    subscriberId: 'sub-2',
    subscriberName: 'مؤسسة الوفاء التجارية والمخازن',
    meterNumber: 'M-20412',
    previousReading: 5320,
    currentReading: 5710,
    consumption: 390,
    ratePerKwh: 1.00,
    fixedFee: 10.00,
    taxAmount: 20.00,
    totalAmount: 420.00,
    billingMonth: '2026-07',
    readingDate: '2026-07-09 11:30',
    enteredBy: 'coll1',
    isPosted: false
  }
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    subscriberId: 'sub-1',
    subscriberName: 'أحمد محمد أحمد سالم',
    amountPaid: 100.00,
    paymentDate: '2026-07-02 09:15',
    paymentMethod: 'cash',
    receivedBy: 'coll1',
    receiptNumber: 'REC-2026-001',
    isPosted: true,
    postedDate: '2026-07-05 18:00'
  },
  {
    id: 'pay-2',
    subscriberId: 'sub-4',
    subscriberName: 'فاطمة صالح عبد الله سعيد',
    amountPaid: 78.75,
    paymentDate: '2026-07-03 10:45',
    paymentMethod: 'e-wallet',
    receivedBy: 'coll2',
    receiptNumber: 'REC-2026-002',
    isPosted: true,
    postedDate: '2026-07-05 18:00'
  },
  {
    id: 'pay-3',
    subscriberId: 'sub-3',
    subscriberName: 'مصنع الأمل للبلاستيك والعلب',
    amountPaid: 2000.00,
    paymentDate: '2026-07-04 14:00',
    paymentMethod: 'transfer',
    receivedBy: 'coll2',
    receiptNumber: 'REC-2026-003',
    isPosted: true,
    postedDate: '2026-07-05 18:00'
  },
  // Unposted payments for July 2026 (Waiting for manager's Posting action!)
  {
    id: 'pay-pending-1',
    subscriberId: 'sub-5',
    subscriberName: 'سوبرماركت البركة والخيرات',
    amountPaid: 300.00,
    paymentDate: '2026-07-09 16:30',
    paymentMethod: 'cash',
    receivedBy: 'coll1',
    receiptNumber: 'REC-2026-004',
    isPosted: false
  },
  {
    id: 'pay-pending-2',
    subscriberId: 'sub-2',
    subscriberName: 'مؤسسة الوفاء التجارية والمخازن',
    amountPaid: 150.00,
    paymentDate: '2026-07-10 08:30',
    paymentMethod: 'cash',
    receivedBy: 'coll2',
    receiptNumber: 'REC-2026-005',
    isPosted: false
  }
];

export const DEFAULT_SETTINGS: SystemSettings = {
  stationName: 'محطة العاصمة للكهرباء التجارية',
  stationNameEn: 'Al-Asema Commercial Electric Station',
  ownerName: 'المهندس عبدالكريم العولقي',
  ownerNameEn: 'Eng. Abdulkarim Al-Awlaqi',
  commercialRegister: 'CR-99824-YE',
  email: 'contact@alasema-electric.ye',
  whatsapp: '+967 771 234 567',
  logoUrl: '',
  logoText: 'VOLTA',
  phone: '+967 771 234 567',
  phone2: '+967 733 987 654',
  address: 'صنعاء، شارع الستين، عمارة النجاح الدور الأول',
  notes: 'المحطة غير مسؤولة عن الأعطال الناجمة عن التمديدات الداخلية الخاطئة. يرجى تسديد الفواتير قبل بداية الشهر التالي لتفادي الغرامات وتجميد الاشتراك.',
  currency: 'ر.ي', // Yemeni Rial or generic localized currency
  readingCycleIntervalDays: 10, // Field visit every 10 days (3 times a month)
  readingCycleMode: 'decadal', // Decadal cycle (العشرية)
  tariffs: {
    residential: 180, // Price per kWh in Yemeni Rial or custom units
    commercial: 250,
    industrial: 350
  },
  fixedFee: 1500, // Fixed cost per subscription
  taxPercent: 5,  // 5% tax
  serviceFee: 500, // Maintenance/service fee
  zones: ['المنطقة (أ) - وسط المدينة', 'المنطقة (ب) - السوق التجاري', 'المنطقة (ج) - المنطقة الصناعية'],
  transformers: [
    {
      id: 'tr-1',
      name: 'المحول الرئيسي 1',
      meterNumber: 'MTR-CENTRAL-01',
      capacityKva: 500,
      zone: 'المنطقة (أ) - وسط المدينة',
      previousMasterReading: 10000,
      currentMasterReading: 11000, // Master Energy = 1,000 kWh vs Sub-meters energy = 790 kWh -> Loss = 210 kWh (21.0% -> High Alert)
      ctRatio: 1
    },
    {
      id: 'tr-2',
      name: 'المحول الرئيسي 2',
      meterNumber: 'MTR-CENTRAL-02',
      capacityKva: 750,
      zone: 'المنطقة (ج) - المنطقة الصناعية',
      previousMasterReading: 50000,
      currentMasterReading: 51730, // Master Energy = 1,730 kWh vs Sub-meters energy = 1,650 kWh -> Loss = 80 kWh (4.6% -> Normal Technical Loss)
      ctRatio: 1
    },
    {
      id: 'tr-3',
      name: 'محول السوق',
      meterNumber: 'MTR-CENTRAL-03',
      capacityKva: 300,
      zone: 'المنطقة (ب) - السوق التجاري',
      previousMasterReading: 20000,
      currentMasterReading: 20980, // Master Energy = 980 kWh vs Sub-meters energy = 900 kWh -> Loss = 80 kWh (8.16% -> Theft/Leakage Warning)
      ctRatio: 1
    }
  ]
};

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    userId: 'u-1',
    username: 'admin',
    action: 'تغيير إعدادات التعرفة',
    details: 'تعديل سعر الكيلوواط السكني من 170 إلى 180 ر.ي',
    timestamp: '2026-07-01 10:30'
  },
  {
    id: 'log-2',
    userId: 'u-1',
    username: 'admin',
    action: 'ترحيل الدورة المالية',
    details: 'ترحيل وإغلاق الدورة المالية لشهر يونيو 2026 وتصدير الأرصدة',
    timestamp: '2026-06-30 18:00'
  },
  {
    id: 'log-3',
    userId: 'u-2',
    username: 'coll1',
    action: 'إدخال قراءة عداد',
    details: 'إدخال قراءة جديدة للمشترك أحمد محمد سالم (العداد M-10901) - القراءة: 1610',
    timestamp: '2026-07-09 11:00'
  },
  {
    id: 'log-4',
    userId: 'u-3',
    username: 'coll2',
    action: 'تحصيل مبلغ مالي',
    details: 'تحصيل مبلغ 150 ر.ي من مؤسسة الوفاء التجارية سند رقم REC-2026-005',
    timestamp: '2026-07-10 08:30'
  }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', code: 'SKU-CBL-16', name: 'كابل ألمنيوم 16 ملم', category: 'cables', quantity: 1500, unit: 'متر', costPrice: 450, unitPrice: 450, sellingPrice: 550, location: 'مخزن أ - رف 1', supplier: 'الشركة اليمنية للكابلات', minAlertLevel: 500, minQuantity: 500, lastUpdated: new Date().toISOString(), notes: 'كابل ألمنيوم مغلف كفاءة عالية للنقل الهوائي' },
  { id: 'inv-2', code: 'SKU-MTR-1P', name: 'عداد إلكتروني ذكي 1 فاز', category: 'meters', quantity: 12, unit: 'حبة', costPrice: 18000, unitPrice: 18000, sellingPrice: 22000, location: 'مخزن ب - كبينة 3', supplier: 'المؤسسة الوطنية للأجهزة', minAlertLevel: 20, minQuantity: 20, lastUpdated: new Date().toISOString(), notes: 'عداد ذكي يدعم القراءة السريعة والشريحة الإلكترونية' },
  { id: 'inv-3', code: 'SKU-OIL-10K', name: 'زيت محولات 10KV', category: 'oil', quantity: 50, unit: 'لتر', costPrice: 3500, unitPrice: 3500, sellingPrice: 4200, location: 'المخزن الرئيسي - قسم البراميل', supplier: 'شركة النفط والزيوت', minAlertLevel: 100, minQuantity: 100, lastUpdated: new Date().toISOString(), notes: 'زيت عالي العزل للمحولات الكهربائية' },
  { id: 'inv-4', code: 'SKU-BRK-630', name: 'قاطع هوائي 630 أمبير', category: 'breakers', quantity: 5, unit: 'حبة', costPrice: 120000, unitPrice: 120000, sellingPrice: 140000, location: 'قسم القواطع - رف 2', supplier: 'مؤسسة الطاقة الكهربائية', minAlertLevel: 2, minQuantity: 2, lastUpdated: new Date().toISOString(), notes: 'قاطع حماية رئيسي للوحات التوزيع' },
  { id: 'inv-5', code: 'SKU-TRN-100K', name: 'محول كهربائي 100 KVA', category: 'transformers', quantity: 3, unit: 'حبة', costPrice: 850000, unitPrice: 850000, sellingPrice: 980000, location: 'ساحة المعدات الثقيلة', supplier: 'مصنع المحولات الوطنية', minAlertLevel: 1, minQuantity: 1, lastUpdated: new Date().toISOString(), notes: 'محول خفض الجهد 11/0.4 KV' },
  { id: 'inv-6', code: 'SKU-TL-CRIMP', name: 'مكبس كابلات هيدروليكي', category: 'tools', quantity: 4, unit: 'طقم', costPrice: 45000, unitPrice: 45000, sellingPrice: 52000, location: 'مخزن أدوات الصيانة - دولاب 1', supplier: 'شركة العدد الفنية', minAlertLevel: 2, minQuantity: 2, lastUpdated: new Date().toISOString(), notes: 'مكبس هيدروليكي لكبس عيون الكابلات حتي 300 ملم' },
];

export const INITIAL_INVENTORY_TRANSACTIONS: InventoryTransaction[] = [];
