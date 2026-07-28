export type UserRole = 'admin' | 'collector' | 'manager' | 'accountant' | 'data_entry';

export interface User {
  id: string;
  username: string;
  passwordHash: string; // Storing plain/simple pass for local demo but labeled passwordHash
  role: UserRole;
  name: string;
  status: 'active' | 'suspended';
  permissions: string[];
  createdAt: string;
  phone?: string;
  address?: string;
  notes?: string;
  hasInternet?: boolean;
}

export type TariffType = 'residential' | 'commercial' | 'industrial';

export interface Subscriber {
  id: string;
  name: string;
  phone: string;
  meterNumber: string;
  zone: string;
  transformer?: string;
  tariffType: TariffType;
  status: 'active' | 'suspended' | 'disconnected';
  initialReading: number;
  currentReading: number; // Updated upon posting/submitting readings
  openingBalance?: number;
  currentBalance: number; // Positive is debt/due, negative is credit
  coordinates?: { lat: number; lng: number };
  createdAt: string;
}

export interface MeterReading {
  id: string;
  subscriberId: string;
  subscriberName: string;
  meterNumber: string;
  previousReading: number;
  currentReading: number;
  consumption: number; // currentReading - previousReading
  ratePerKwh: number;
  fixedFee: number;
  taxAmount: number;
  totalAmount: number;
  billingMonth: string; // e.g., "2026-07"
  readingDate: string;
  enteredBy: string; // Username of collector
  isPosted: boolean; // Transferred to billing/balance
  postedDate?: string;
  postedBy?: string;
  isRejected?: boolean;
  rejectionReason?: string;
  smsSent?: boolean; // Indicates if an SMS was initiated from admin panel
  notes?: string;
}

export interface Payment {
  id: string;
  subscriberId: string;
  subscriberName: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'transfer' | 'e-wallet';
  receivedBy: string; // Username of collector
  receiptNumber: string;
  isPosted: boolean; // Transferred to final closing
  postedDate?: string;
  postedBy?: string;
  isRejected?: boolean;
  rejectionReason?: string;
  smsSent?: boolean; // Indicates if an SMS was initiated from admin panel
}

export interface TransformerConfig {
  id: string;
  name: string;
  meterNumber: string;
  capacityKva?: number;
  zone?: string;
  previousMasterReading: number;
  currentMasterReading: number;
  ctRatio?: number;
  lastReadingDate?: string;
  notes?: string;
}

export interface LossAnalysis {
  transformerName: string;
  meterNumber: string;
  capacityKva: number;
  zone: string;
  prevReading: number;
  currReading: number;
  centralEnergyKwh: number;
  subMetersEnergyKwh: number;
  totalLossKwh: number;
  totalLossPercent: number;
  lossValueCurrency: number;
  technicalLossPercent: number;
  technicalLossKwh: number;
  commercialLossKwh: number;
  commercialLossPercent: number;
  trafficLight: 'green' | 'yellow' | 'red';
  status: 'normal' | 'warning' | 'alert';
  statusText: string;
  subscribersCount: number;
  recommendation: string;
}

export interface SystemSettings {
  stationName: string;
  stationNameEn?: string;
  ownerName?: string;
  ownerNameEn?: string;
  commercialRegister?: string;
  email?: string;
  whatsapp?: string;
  logoUrl?: string;
  phone: string;
  phone2?: string;
  address: string;
  notes?: string;
  logoText: string;
  currency: string;
  tariffs: {
    residential: number; // price per kWh
    commercial: number;
    industrial: number;
  };
  fixedFee: number;
  taxPercent: number;
  serviceFee: number;

  zones?: any[];
  transformers?: any[];
  centralMeters?: any[];
  squares?: any[];
  routes?: any[];
  contracts?: any[];
  services?: any[];
  fines?: any[];
  generators?: any[];
  openingBalances?: any[];
  tariffConsumption?: any[];
  tariffSubscription?: any[];

  // Reading & Field Visit Cycle (دورة النزول الميداني وقراءة العدادات)
  readingCycleIntervalDays?: number; // e.g. 10
  readingCycleMode?: 'decadal' | 'monthly' | 'weekly'; // 'decadal' = 3 times a month (every 10 days)

  // Theme & Appearance Customization
  themeColor?: 'amber' | 'blue' | 'emerald' | 'purple' | 'slate';
  fontFamily?: 'Cairo' | 'Tajawal' | 'Readex Pro' | 'IBM Plex Sans Arabic';
  sidebarStyle?: 'slate' | 'midnight' | 'glass';
  layoutDensity?: 'standard' | 'compact';

  // Additional Services & Gateway Integrations
  whatsappEnabled?: boolean;
  autoSmsEnabled?: boolean;
  smsGatewayProvider?: string;
  autoCloudBackup?: boolean;
  onlinePaymentEnabled?: boolean;
  meterQrScanningEnabled?: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface PostingStatus {
  lastReadingPostedDate: string;
  lastPaymentPostedDate: string;
  currentBillingCycle: string; // e.g., "July 2026"
}

export interface InventoryItem {
  id: string;
  code?: string;
  name: string;
  category: 'cables' | 'meters' | 'breakers' | 'oil' | 'transformers' | 'tools' | 'other' | string;
  quantity: number;
  unit: string;
  minAlertLevel: number;
  minQuantity?: number;
  costPrice?: number;
  unitPrice?: number;
  sellingPrice?: number;
  location?: string;
  supplier?: string;
  lastUpdated: string;
  notes?: string;
  barcode?: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out' | 'damage' | 'adjustment';
  quantity: number;
  unitPrice?: number;
  totalValue?: number;
  date: string;
  user: string;
  notes?: string;
  refNo?: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  recordedBy: string;
}

export interface Purchase {
  id: string;
  amount: number;
  items: string;
  date: string;
  supplier: string;
  recordedBy: string;
}

export interface EmployeeTransaction {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'salary' | 'advance' | 'allowance' | 'deduction' | 'repayment';
  amount: number;
  date: string;
  description: string;
  recordedBy: string;
  month?: string;
  voucherNo?: string;
}

export interface ServiceConnection {
  id: string;
  subscriberId: string;
  subscriberName: string;
  totalFee: number;
  paidAmount: number;
  date: string;
  materialsUsed: string;
  status: 'completed' | 'pending';
}

export interface Employee {
  id: string;
  code?: string;
  name: string;
  role: 'engineer' | 'technician' | 'admin' | 'accountant' | 'collector' | string;
  phone: string;
  nationalId?: string;
  department?: string;
  salary: number;
  allowances?: number;
  deductions?: number;
  status: 'active' | 'inactive';
  joinDate: string;
  bankAccount?: string;
  address?: string;
  notes?: string;
}

export interface TechnicalRequest {
  id: string;
  type: 'new_connection' | 'maintenance' | 'disconnection' | 'reconnection';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  applicantName: string;
  phone: string;
  address: string;
  description: string;
  createdAt: string;
  assignedTo?: string;
  completedAt?: string;
  subscriberId?: string;
  subscriberCode?: string;
  notes?: string;
  executedBy?: string;
  priority?: 'normal' | 'high' | 'urgent';
}

export interface CustomRoad {
  id: string;
  name: string;
  type: 'alley' | 'dirt_path' | 'side_street' | 'shortcut';
  path: [number, number][]; // Array of [lat, lng]
  createdAt: string;
  createdBy?: string;
  notes?: string;
}

export interface AIAlleyDetected {
  id: string;
  name: string;
  type: 'alley' | 'dirt_path' | 'side_street' | 'shortcut';
  confidence: number;
  description: string;
  path: [number, number][];
}
