import { AdminInventory } from './AdminInventory';
import { AdminHR } from './AdminHR';
import { AdminAccounting } from './AdminAccounting';
import { AdminDatabase } from './AdminDatabase';
import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, TariffType, UserRole, InventoryItem, InventoryTransaction
} from '../types';
import { FinancialAreaChart, ZoneBarChart, RevenueExpenseChart } from './StatsCharts';
import { AdminSubscribers } from './AdminSubscribers';
import { AdminReports } from "./AdminReports";
import { AdminDebt } from "./AdminDebt";
import { AdminOperations } from './AdminOperations';
import { AdminZones } from './AdminZones';
import { AdminRoles } from "./AdminRoles";
import { 
  syncNotificationStateToCloud, 
  subscribeNotificationStateFromCloud 
} from '../lib/firebase';
import { compressBase64Image } from '../utils/imageCompressor';
import { 
  LayoutDashboard, Users, ShieldAlert, Database, Settings, ArrowRightLeft, 
  LogOut, Plus, Search, Trash2, Edit2, CheckCircle2, XCircle, AlertTriangle, 
  Download, Upload, RefreshCw, Key, Shield, UserPlus, Sliders, Check, HelpCircle, FileText, Calendar,
  Globe, Activity, FileCode, Menu, Lock, Unlock, MessageSquare, Tv, Terminal, UserCheck,
  BookOpen, Sparkles, Clock, Wallet, ChevronLeft, ChevronDown, Layers, Folder, FolderOpen,
  File, Info, AlertCircle, CheckSquare, Send, BarChart3, Map, Printer, Receipt, Banknote, ShieldCheck, UserX
, Bell, BellRing, Package , Wrench, Image, Camera, UploadCloud, Link, MapPin, Phone, Mail, Award, FileBadge, Building2, Zap, Volume2, VolumeX, Eye, ArrowLeft, Filter, Palette } from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  auditLogs: AuditLog[];
  inventory: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  onUpdateInventory: (items: InventoryItem[]) => void;
  onUpdateInventoryTransactions: (txs: InventoryTransaction[]) => void;
  treasuryTransfers?: any[];
  onUpdateTreasuryTransfers?: (trfs: any[]) => void;
  expenses?: any[];
  onUpdateExpenses?: (exps: any[]) => void;
  purchases?: any[];
  onUpdatePurchases?: (purs: any[]) => void;
  manualJournalEntries?: any[];
  onUpdateManualJournalEntries?: (entries: any[]) => void;
  employees?: any[];
  onUpdateEmployees?: (emps: any[]) => void;
  employeeTxs?: any[];
  onUpdateEmployeeTxs?: (txs: any[]) => void;
  connections?: any[];
  onUpdateConnections?: (conns: any[]) => void;
  techRequests?: any[];
  onUpdateTechRequests?: (reqs: any[]) => void;
  users: User[];
  onUpdateSubscribers: (subs: Subscriber[]) => void;
  onUpdateReadings: (reads: MeterReading[]) => void;
  onUpdatePayments: (pays: Payment[]) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
  onUpdateUsers: (users: User[]) => void;
  onAddAuditLog: (log: AuditLog) => void;

  onResetDatabase: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onLogout,
  subscribers,
  readings,
  payments,
  settings,
  auditLogs,
  users,
  onUpdateSubscribers,
  onUpdateReadings,
  onUpdatePayments,
  onUpdateSettings,
  onUpdateUsers,
  onAddAuditLog,
  onResetDatabase,
  inventory,
  inventoryTransactions,
  onUpdateInventory,
  onUpdateInventoryTransactions,
  treasuryTransfers = [],
  onUpdateTreasuryTransfers,
  expenses = [],
  onUpdateExpenses,
  purchases = [],
  onUpdatePurchases,
  manualJournalEntries = [],
  onUpdateManualJournalEntries,
  employees = [],
  onUpdateEmployees,
  employeeTxs = [],
  onUpdateEmployeeTxs,
  connections = [],
  onUpdateConnections,
  techRequests = [],
  onUpdateTechRequests,
}) => {
  // Main Sections
  type ActiveSection = 'dashboard' | 'subscribers' | 'accounting' | 'debt' | 'zones' | 'roles' | 'inventory' | 'inventory-alerts' | 'operations-requests' | 'operations-zones' | 'admin-db' | 'admin-security' | 'admin-settings' | 'station-directory' | 'admin-postings' | 'admin-services' | 'system' | 'sms-templates' | 'sms-subscriptions' | 'sms-send' | 'sms-failed' | 'treasury-boxes' | 'treasury-transfers' | 'treasury-statements' | 'treasury-performance' | 'treasury-daily' | 'reporting-subscribers' | 'reporting-financial' | 'reporting-inventory' | 'reporting-hr';
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Interactive Tariff Simulator State
  const [calcSimKwh, setCalcSimKwh] = useState<number>(100);
  const [calcSimSector, setCalcSimSector] = useState<'residential' | 'commercial' | 'industrial'>('residential');

  // Render System Admin Header Navigation Tabs
  const renderSystemAdminHeader = (currentSec: string) => {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 mb-6 text-right">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-400 rounded-2xl border border-amber-500/30 shadow-lg shadow-amber-500/5">
              <Settings className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">مركز إدارة النظام والإعدادات العامة</h2>
                <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-bold">
                  v2.5 System Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                التحكم الشامل في هوية ودليل المحطة، تعرفة الكهرباء والشرائح، المستخدمين، الأمان، والنسخ الاحتياطي.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveSettings}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 px-5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>حفظ وتطبيق التغييرات</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSection('station-directory')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentSec === 'station-directory' || currentSec === 'system'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>تخصيص المظهر ودليل المحطة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('admin-settings')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentSec === 'admin-settings'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>تعرفة الكهرباء والأسعار</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('roles')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentSec === 'roles'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>المستخدمين والصلاحيات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('admin-db')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentSec === 'admin-db'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>قواعد البيانات والنسخ الاحتياطي</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('admin-security')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentSec === 'admin-security'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>الأمان وسجل التدقيق</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('admin-services')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentSec === 'admin-services'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>إعدادات السندات الحرارية</span>
          </button>
        </div>
      </div>
    );
  };
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    subscribers: false,
    finance: false,
    sms: false,
    system: false,
    inventory: false,
    treasury: false,
    hr: false,
    operations: false,
    reporting: false
  });
  
  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  // Sidebar responsive toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isManagerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
  const isAccountant = currentUser.role === 'accountant';
  const isDataEntry = currentUser.role === 'data_entry';
  const canSeeSubscribers = isManagerOrAdmin || isAccountant || isDataEntry;
  const canSeeFinance = isManagerOrAdmin || isAccountant;
  const canSeeInventory = isManagerOrAdmin || isDataEntry;
  const canSeeHR = isManagerOrAdmin;
  const canSeeOperations = isManagerOrAdmin || isDataEntry;
  const canSeeReporting = isManagerOrAdmin || isAccountant;
  const canSeeSMS = isManagerOrAdmin || isAccountant;
  const canSeeSystemAdmin = isManagerOrAdmin;

  const getRoleName = (r: string) => {
    switch(r) {
      case 'admin': return 'مدير نظام';
      case 'manager': return 'مدير عام';
      case 'accountant': return 'محاسب';
      case 'data_entry': return 'مدخل بيانات';
      case 'collector': return 'محصل ميداني';
      default: return r;
    }
  };

  // Search/Filters
  const [subSearch, setSubSearch] = useState('');
  const [selectedSubForLedger, setSelectedSubForLedger] = useState<Subscriber | null>(null);

  // SMS Management State
  const [smsTemplates, setSmsTemplates] = useState<{ id: string, name: string, content: string }[]>([
    { id: '1', name: 'إشعار فاتورة جديدة', content: 'الأخ المشترك: {اسم_المشترك}\nرقم العداد: {رقم_العداد}\nالاستهلاك: {الاستهلاك}\nمبلغ الفاتورة: {المبلغ}\nالمتأخرات: {المبالغ_المتأخره}\nالإجمالي المطلوب: {الرصيد_المتبقي}' },
    { id: '2', name: 'سند قبض', content: 'تم استلام مبلغ {المبلغ} من المشترك: {اسم_المشترك} بموجب سند رقم {رقم_السند}.\nالرصيد المتبقي: {الرصيد_المتبقي}\nشكرًا لتسديدكم.' },
    { id: '3', name: 'تذكير بالسداد', content: 'الأخ المشترك: {اسم_المشترك}\nنذكركم بأهمية تسديد المديونية المتأخرة البالغة {الرصيد_المتبقي} لتجنب فصل التيار.\nمحطة الكهرباء.' },
  ]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateContent, setEditingTemplateContent] = useState('');
  const [smsSelectedSubs, setSmsSelectedSubs] = useState<string[]>([]);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSearchQuery, setSmsSearchQuery] = useState('');
  const [isSendingSequence, setIsSendingSequence] = useState(false);
  const [smsQueueIndex, setSmsQueueIndex] = useState(0);

  // Enhanced Postings & Transfers State
  const [postingSubTab, setPostingSubTab] = useState<'pending' | 'posted' | 'rejected' | 'collectors' | 'audit_log'>('pending');
  const [postingSearch, setPostingSearch] = useState('');
  const [postingCollectorFilter, setPostingCollectorFilter] = useState('all');
  const [postingDateFilter, setPostingDateFilter] = useState('');
  const [selectedReadingIds, setSelectedReadingIds] = useState<string[]>([]);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [rejectModalItem, setRejectModalItem] = useState<{ type: 'reading' | 'payment', id: string, name: string } | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');


  // Advanced Subscribers UI State
  const [subscriberViewMode, setSubscriberViewMode] = useState<'table' | 'grid'>('table');
  const [subscriberFilterZone, setSubscriberFilterZone] = useState<string>('all');
  const [subscriberFilterStatus, setSubscriberFilterStatus] = useState<string>('all');
  const [subscriberFilterTariff, setSubscriberFilterTariff] = useState<string>('all');
  const [selectedSubscribersIds, setSelectedSubscribersIds] = useState<string[]>([]);
  
  // New Subscriber Modal / Form State
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubPhone, setNewSubPhone] = useState('');
  const [newSubMeter, setNewSubMeter] = useState('');
  const [newSubZone, setNewSubZone] = useState('المنطقة (أ) - وسط المدينة');
  const [newSubTransformer, setNewSubTransformer] = useState("");
  const [newSubTariff, setNewSubTariff] = useState<TariffType>('residential');
  const [newSubInitial, setNewSubInitial] = useState('');
  const [newSubOpeningBalance, setNewSubOpeningBalance] = useState('');

  // Editing Subscriber State
  const [editingSub, setEditingSub] = useState<Subscriber | null>(null);

  // New User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('collector');

  // File Upload Ref for DB Restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- SYSTEM MANAGEMENT RICH STATES (إدارة النظام) ---
  const [systemStyle, setSystemStyle] = useState<'amber' | 'emerald' | 'ocean' | 'crimson'>('amber');
  const [selectedSysFolder, setSelectedSysFolder] = useState<string>('db');
  const [selectedSysAction, setSelectedSysAction] = useState<string>('about');
  const [customDbName, setCustomDbName] = useState<string>('');
  const [createdDatabases, setCreatedDatabases] = useState<string[]>(['VOLTERA_MAIN_FIRESTORE', 'VOLTERA_DEMO_RECOVERY']);
  const [activeDb, setActiveDb] = useState<string>('VOLTERA_MAIN_FIRESTORE');
  const [operationsLocked, setOperationsLocked] = useState<boolean>(false);
  const [printFooterText, setPrintFooterText] = useState<string>('شكراً لكم لتعاملكم معنا. الرجاء السداد خلال 5 أيام لتفادي فصل الخدمة.');
  const [smsGateway, setSmsGateway] = useState<string>('https://api.sms-gateway.yemen/v1/send');
  const [smsApiKey, setSmsApiKey] = useState<string>('voltera_sms_secret_token_12345');
  const [smsTemplate, setSmsTemplate] = useState<string>('عزيزي المشترك {name}، فاتورتك لشهر {month} هي {amount} {currency}، نأمل السداد.');
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [dictionary, setDictionary] = useState<Array<{ key: string; ar: string; en: string }>>([
    { key: 'Subscriber', ar: 'مشترك', en: 'Subscriber' },
    { key: 'Balance', ar: 'رصيد', en: 'Balance' },
    { key: 'Active', ar: 'نشط', en: 'Active' },
    { key: 'Suspended', ar: 'موقف', en: 'Suspended' },
    { key: 'Collector', ar: 'محصل', en: 'Collector' },
    { key: 'Invoice', ar: 'فاتورة', en: 'Invoice' }
  ]);
  const [editDictIndex, setEditDictIndex] = useState<number | null>(null);
  const [editDictAr, setEditDictAr] = useState<string>('');
  const [editDictEn, setEditDictEn] = useState<string>('');
  const [integrityErrors, setIntegrityErrors] = useState<string[]>([]);

  // Helper audit log triggers
  const logAction = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      action,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    onAddAuditLog(newLog);
  };

  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('voltera_read_notifs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('voltera_dismissed_notifs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Subscribe to cloud notifications state from Firestore
  React.useEffect(() => {
    const unsub = subscribeNotificationStateFromCloud((cloudState) => {
      if (cloudState) {
        if (Array.isArray(cloudState.readIds)) {
          setReadNotifIds(cloudState.readIds);
          localStorage.setItem('voltera_read_notifs', JSON.stringify(cloudState.readIds));
        }
        if (Array.isArray(cloudState.dismissedIds)) {
          setDismissedNotifIds(cloudState.dismissedIds);
          localStorage.setItem('voltera_dismissed_notifs', JSON.stringify(cloudState.dismissedIds));
        }
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const [notifTab, setNotifTab] = useState<'all' | 'unread' | 'urgent'>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('voltera_notif_sound') !== 'disabled';
  });

  const toggleNotifSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('voltera_notif_sound', next ? 'enabled' : 'disabled');
  };

  const playNotifChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      // Audio context silently handled
    }
  };

  type NotificationType = 'high_consumption' | 'high_payment' | 'pending_readings' | 'pending_payments' | 'low_inventory' | 'suspended_debt' | 'tech_request';

  interface AdminNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    time: string;
    priority: 'high' | 'medium' | 'info';
    targetSection: ActiveSection;
    isRead: boolean;
  }

  const allGeneratedNotifications = useMemo(() => {
    const notifs: AdminNotification[] = [];

    // 1. High consumption readings
    const highReadings = readings.filter(r => r.consumption > 1000 && !r.isPosted);
    highReadings.forEach(r => {
      notifs.push({
        id: `notif-read-${r.id}`,
        type: 'high_consumption',
        title: 'استهلاك مرتفع جداً',
        message: `قراءة استهلاك كبرى (${r.consumption} ك.و) للمشترك ${r.subscriberName} بواسطة ${r.enteredBy}`,
        time: r.readingDate || new Date().toISOString().substring(0, 16).replace('T', ' '),
        priority: 'high',
        targetSection: 'admin-postings',
        isRead: readNotifIds.includes(`notif-read-${r.id}`)
      });
    });

    // 2. High payment receipts
    const highPayments = payments.filter(p => p.amountPaid >= 500000 && !p.isPosted);
    highPayments.forEach(p => {
      notifs.push({
        id: `notif-pay-${p.id}`,
        type: 'high_payment',
        title: 'تحصيل مالي ضخم',
        message: `سند قبض نقدي كبير (${p.amountPaid.toLocaleString()} ${settings.currency}) للمشترك ${p.subscriberName} بواسطة ${p.receivedBy}`,
        time: p.paymentDate || new Date().toISOString().substring(0, 16).replace('T', ' '),
        priority: 'high',
        targetSection: 'admin-postings',
        isRead: readNotifIds.includes(`notif-pay-${p.id}`)
      });
    });

    // 3. Pending readings waiting for posting
    const pendingReadsCount = readings.filter(r => !r.isPosted && !r.isRejected).length;
    if (pendingReadsCount > 0) {
      notifs.push({
        id: `notif-pending-readings-summary`,
        type: 'pending_readings',
        title: 'قراءات بانتظار الاعتماد والترحيل',
        message: `يوجد عدد (${pendingReadsCount}) قراءة عداد جديدة مدخلة بانتظار الترحيل المالي وتنزيل الفواتير.`,
        time: new Date().toISOString().substring(0, 16).replace('T', ' '),
        priority: 'medium',
        targetSection: 'admin-postings',
        isRead: readNotifIds.includes(`notif-pending-readings-summary`)
      });
    }

    // 4. Pending payments waiting for posting
    const pendingPaysCount = payments.filter(p => !p.isPosted && !p.isRejected).length;
    if (pendingPaysCount > 0) {
      notifs.push({
        id: `notif-pending-payments-summary`,
        type: 'pending_payments',
        title: 'سندات بانتظار الترحيل والتوريد',
        message: `يوجد عدد (${pendingPaysCount}) سند تحصيل قبض نقدي بانتظار المراجعة والترحيل للخزينة.`,
        time: new Date().toISOString().substring(0, 16).replace('T', ' '),
        priority: 'medium',
        targetSection: 'admin-postings',
        isRead: readNotifIds.includes(`notif-pending-payments-summary`)
      });
    }

    // 5. Low inventory alert
    const lowInventory = inventory.filter(i => i.quantity <= i.minAlertLevel);
    lowInventory.forEach(item => {
      notifs.push({
        id: `notif-inv-${item.id}`,
        type: 'low_inventory',
        title: 'تنبيه المخزون والمعدات',
        message: `الصنف (${item.name}) شارف على النفاذ! المتبقي (${item.quantity} ${item.unit})، حد التنبيه (${item.minAlertLevel}).`,
        time: item.lastUpdated || new Date().toISOString().substring(0, 16).replace('T', ' '),
        priority: 'high',
        targetSection: 'inventory-alerts',
        isRead: readNotifIds.includes(`notif-inv-${item.id}`)
      });
    });

    // 6. High debt & suspended users
    const suspendedWithDebt = subscribers.filter(s => s.status === 'suspended' && s.currentBalance >= 500000);
    suspendedWithDebt.forEach(s => {
      notifs.push({
        id: `notif-susp-${s.id}`,
        type: 'suspended_debt',
        title: 'تجاوز السقف الائتماني',
        message: `المشترك ${s.name} موقوف لتجاوز السقف الائتماني (${s.currentBalance.toLocaleString()} ${settings.currency})`,
        time: new Date().toISOString().substring(0, 16).replace('T', ' '),
        priority: 'high',
        targetSection: 'debt',
        isRead: readNotifIds.includes(`notif-susp-${s.id}`)
      });
    });

    // 7. Pending Technical/Service requests
    const pendingTech = (techRequests || []).filter(t => t.status === 'pending' || t.status === 'قيد الانتظار');
    pendingTech.forEach(tr => {
      notifs.push({
        id: `notif-tech-${tr.id}`,
        type: 'tech_request',
        title: 'طلب صيانة/خدمات جديد',
        message: `طلب خدمات فنية (${tr.requestType || 'صيانة عداد'}) للمشترك (${tr.subscriberName || 'عام'})`,
        time: tr.requestDate || new Date().toISOString().substring(0, 16).replace('T', ' '),
        priority: 'medium',
        targetSection: 'operations-requests',
        isRead: readNotifIds.includes(`notif-tech-${tr.id}`)
      });
    });

    // Exclude dismissed items
    return notifs.filter(n => !dismissedNotifIds.includes(n.id)).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [readings, payments, subscribers, settings.currency, inventory, techRequests, readNotifIds, dismissedNotifIds]);

  const unreadCount = useMemo(() => {
    return allGeneratedNotifications.filter(n => !n.isRead).length;
  }, [allGeneratedNotifications]);

  const adminNotifications = useMemo(() => {
    if (notifTab === 'unread') {
      return allGeneratedNotifications.filter(n => !n.isRead);
    }
    if (notifTab === 'urgent') {
      return allGeneratedNotifications.filter(n => n.priority === 'high');
    }
    return allGeneratedNotifications;
  }, [allGeneratedNotifications, notifTab]);

  const handleMarkAsRead = (id: string) => {
    if (!readNotifIds.includes(id)) {
      const updated = [...readNotifIds, id];
      setReadNotifIds(updated);
      localStorage.setItem('voltera_read_notifs', JSON.stringify(updated));
      syncNotificationStateToCloud({ readIds: updated, dismissedIds: dismissedNotifIds });
    }
  };

  const handleMarkAllAsRead = () => {
    const allIds = Array.from(new Set([...readNotifIds, ...allGeneratedNotifications.map(n => n.id)]));
    setReadNotifIds(allIds);
    localStorage.setItem('voltera_read_notifs', JSON.stringify(allIds));
    syncNotificationStateToCloud({ readIds: allIds, dismissedIds: dismissedNotifIds });
  };

  const handleDismissNotif = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = [...dismissedNotifIds, id];
    setDismissedNotifIds(updated);
    localStorage.setItem('voltera_dismissed_notifs', JSON.stringify(updated));
    syncNotificationStateToCloud({ readIds: readNotifIds, dismissedIds: updated });
  };

  const handleClearAllNotifs = () => {
    const allIds = Array.from(new Set([...dismissedNotifIds, ...allGeneratedNotifications.map(n => n.id)]));
    setDismissedNotifIds(allIds);
    localStorage.setItem('voltera_dismissed_notifs', JSON.stringify(allIds));
    syncNotificationStateToCloud({ readIds: readNotifIds, dismissedIds: allIds });
  };

  const handleNotifClick = (notif: AdminNotification) => {
    handleMarkAsRead(notif.id);
    setShowNotifications(false);
    if (notif.targetSection) {
      setActiveSection(notif.targetSection);
    }
  };

  // --- STATISTICS CALCULATIONS ---
  const activeSubs = subscribers.filter(s => s.status === 'active');
  const totalBalance = subscribers.reduce((sum, s) => sum + s.currentBalance, 0);
  
  // Consumption from posted readings
  const postedReadings = readings.filter(r => r.isPosted);
  const totalPowerConsumed = postedReadings.reduce((sum, r) => sum + r.consumption, 0);

  // Invoicing and Collections
  const totalBilled = readings.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

  // Zone statistics for charts
  const zonesList = Array.from(new Set(subscribers.map(s => s.zone)));
  const zoneChartData = zonesList.map(zone => {
    const zoneSubs = subscribers.filter(s => s.zone === zone);
    const zoneReads = readings.filter(r => r.isPosted && zoneSubs.some(s => s.id === r.subscriberId));
    const totalZoneConsumption = zoneReads.reduce((sum, r) => sum + r.consumption, 0);
    return {
      zone,
      active: zoneSubs.filter(s => s.status === 'active').length,
      consumption: totalZoneConsumption
    };
  });

  // Recent months financial comparison data
  const months = ['2026-05', '2026-06', '2026-07'];
  const financialChartData = months.map(m => {
    const monthReads = readings.filter(r => r.billingMonth === m);
    const monthBilled = monthReads.reduce((sum, r) => sum + r.totalAmount, 0);
    
    // Payments made in that month roughly
    const monthPays = payments.filter(p => p.paymentDate.startsWith(m));
    const monthCollected = monthPays.reduce((sum, p) => sum + p.amountPaid, 0);
    return {
      label: m === '2026-05' ? 'مايو' : m === '2026-06' ? 'يونيو' : 'يوليو',
      billed: monthBilled || (m === '2026-05' ? 1800 : 0), // fallback visual
      collected: monthCollected || (m === '2026-05' ? 1650 : 0)
    };
  });

  const revExpData = months.map(m => {
    // Revenues = payments + connections (if paid)
    const monthPays = payments.filter(p => p.paymentDate.startsWith(m));
    const paysRevenue = monthPays.reduce((sum, p) => sum + p.amountPaid, 0);
    
    const monthConns = connections.filter(c => c.date.startsWith(m) && c.status === 'completed');
    const connsRevenue = monthConns.reduce((sum, c) => sum + c.paidAmount, 0);
    
    const revenue = paysRevenue + connsRevenue;

    // Expenses = expenses + purchases + employeeTxs
    const monthExps = expenses.filter(e => e.date.startsWith(m));
    const expTotal = monthExps.reduce((sum, e) => sum + e.amount, 0);
    
    const monthPurchs = purchases.filter(p => p.date.startsWith(m));
    const purchTotal = monthPurchs.reduce((sum, p) => sum + p.amount, 0);
    
    const monthEmpTxs = employeeTxs.filter(tx => tx.date.startsWith(m));
    const empTotal = monthEmpTxs.reduce((sum, tx) => sum + tx.amount, 0);
    
    const expense = expTotal + purchTotal + empTotal;
    
    // Add mock data for visual purposes if no data
    let fallbackRev = 0;
    let fallbackExp = 0;
    if (m === '2026-05') { fallbackRev = 250000; fallbackExp = 120000; }
    if (m === '2026-06') { fallbackRev = 280000; fallbackExp = 150000; }
    if (m === '2026-07') { fallbackRev = 310000; fallbackExp = 180000; }

    return {
      label: m === '2026-05' ? 'مايو' : m === '2026-06' ? 'يونيو' : 'يوليو',
      revenue: revenue > 0 ? revenue : fallbackRev,
      expense: expense > 0 ? expense : fallbackExp
    };
  });


  // --- ACTION HANDLERS ---

  // Add Subscriber
  const handleAddSubscriber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName || !newSubMeter) return;

    // Check if meter exists
    if (subscribers.some(s => s.meterNumber.toLowerCase() === newSubMeter.trim().toLowerCase())) {
      alert('خطأ: رقم العداد هذا مسجل مسبقاً لمشترك آخر!');
      return;
    }

    const initVal = parseFloat(newSubInitial) || 0;
    const openingBal = parseFloat(newSubOpeningBalance) || 0;
    const newSub: Subscriber = {
      id: `sub-${Date.now()}`,
      name: newSubName,
      phone: newSubPhone || 'لا يوجد',
      meterNumber: newSubMeter,
      zone: newSubZone,
      transformer: newSubTransformer,
      tariffType: newSubTariff,
      status: 'active',
      initialReading: initVal,
      currentReading: initVal,
      openingBalance: openingBal,
      currentBalance: openingBal,
      createdAt: new Date().toISOString().substring(0, 10)
    };

    onUpdateSubscribers([newSub, ...subscribers]);
    logAction('إضافة مشترك جديد', `تم تسجيل المشترك: ${newSubName}، عداد رقم: ${newSubMeter}`);
    
    // Clear Form & Close
    setNewSubName('');
    setNewSubPhone('');
    setNewSubMeter('');
    setNewSubInitial('');
    setNewSubOpeningBalance('');
    setShowAddSubModal(false);
  };

  // Toggle subscriber status (Active/Suspended)
  const toggleSubStatus = (sub: Subscriber) => {
    const updated = subscribers.map(s => {
      if (s.id === sub.id) {
        const nextStatus = s.status === 'active' ? 'suspended' : 'active';
        logAction('تعديل حالة مشترك', `تغيير حالة المشترك ${s.name} إلى: ${nextStatus === 'active' ? 'نشط' : 'موقف'}`);
        return { ...s, status: nextStatus };
      }
      return s;
    });
    onUpdateSubscribers(updated);
  };

  // Edit subscriber details
  const saveSubEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;

    const updated = subscribers.map(s => {
      if (s.id === editingSub.id) {
        logAction('تعديل بيانات مشترك', `تعديل بيانات المشترك ${editingSub.name}`);
        return editingSub;
      }
      return s;
    });
    onUpdateSubscribers(updated);
    setEditingSub(null);
  };

  // Delete/Remove subscriber
  const deleteSubscriber = (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف المشترك "${name}" تماماً من النظام؟ ستفقد كافة بيانات العداد المترابطة.`)) {
      onUpdateSubscribers(subscribers.filter(s => s.id !== id));
      logAction('حذف مشترك', `حذف المشترك ${name} من قاعدة البيانات`);
    }
  };

  // Add User (Collector/Admin)
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newUserFullName) return;

    if (users.some(u => u.username.toLowerCase() === newUsername.toLowerCase().trim())) {
      alert('خطأ: اسم المستخدم هذا مستخدم بالفعل!');
      return;
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      username: newUsername.trim().toLowerCase(),
      passwordHash: newPassword,
      role: newUserRole,
      name: newUserFullName,
      status: 'active',
      permissions: newUserRole === 'admin' ? ['all_permissions'] : ['read_readings', 'write_readings', 'write_payments'],
      createdAt: new Date().toISOString().substring(0, 16).replace('T', ' ')
    };

    onUpdateUsers([...users, newUser]);
    logAction('إنشاء حساب مستخدم', `إضافة حساب جديد: ${newUserFullName} بصفة ${newUserRole === 'admin' ? 'مدير' : 'محصل'}`);

    setNewUsername('');
    setNewPassword('');
    setNewUserFullName('');
  };

  // Toggle user status (Active/Suspended)
  const toggleUserStatus = (u: User) => {
    if (u.id === currentUser.id) {
      alert('خطأ: لا يمكنك إيقاف حسابك الفعال الذي تسجل به الدخول حالياً!');
      return;
    }
    const updated = users.map(user => {
      if (user.id === u.id) {
        const nextStatus = user.status === 'active' ? 'suspended' : 'active';
        logAction('تغيير حالة مستخدم', `تغيير حالة حساب ${user.name} إلى ${nextStatus === 'active' ? 'فعال' : 'موقف'}`);
        return { ...user, status: nextStatus };
      }
      return user;
    });
    onUpdateUsers(updated);
  };

  // Handle Station Logo File Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً. يرجى اختيار ملف صورة بحجم أقل من 5 ميجابايت.');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawBase64 = event.target?.result as string;
        // Compress image to ensure document size stays well below Firestore's 1MB limit
        const compressedBase64 = await compressBase64Image(rawBase64, 250, 250, 0.85);
        onUpdateSettings({
          ...settings,
          logoUrl: compressedBase64
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Update System Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    let updatedSettings = { ...settings };
    if (updatedSettings.logoUrl && updatedSettings.logoUrl.startsWith('data:image') && updatedSettings.logoUrl.length > 150000) {
      updatedSettings.logoUrl = await compressBase64Image(updatedSettings.logoUrl, 250, 250, 0.85);
    }
    onUpdateSettings(updatedSettings);
    logAction('تعديل دليل وإعدادات المحطة', `تم تحديث البيانات الرسمية للمحطة (${updatedSettings.stationName}) والشعار والإعدادات العامة`);
    alert('تم حفظ البيانات الرسمية ودليل المحطة والإعدادات بنجاح!');
  };

  // --- ENHANCED POSTINGS & TRANSFERS HANDLERS ---
  const pendingReadings = readings.filter(r => !r.isPosted && !r.isRejected);
  const pendingPayments = payments.filter(p => !p.isPosted && !p.isRejected);
  const postedPayments = payments.filter(p => p.isPosted);
  const rejectedReadings = readings.filter(r => r.isRejected);
  const rejectedPayments = payments.filter(p => p.isRejected);

  // Single Reading Post
  const postSingleReading = (readingId: string) => {
    const targetReading = readings.find(r => r.id === readingId);
    if (!targetReading) return;

    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');
    const updatedReadings = readings.map(r => 
      r.id === readingId 
        ? { ...r, isPosted: true, postedDate, postedBy: currentUser.name, isRejected: false } 
        : r
    );

    const updatedSubs = subscribers.map(sub => {
      if (sub.id === targetReading.subscriberId) {
        return {
          ...sub,
          currentReading: Math.max(sub.currentReading, targetReading.currentReading),
          currentBalance: sub.currentBalance + targetReading.totalAmount
        };
      }
      return sub;
    });

    onUpdateReadings(updatedReadings);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل قراءة عداد', `اعتماد وتطبيق قراءة المشترك (${targetReading.subscriberName}) بقيمة ${targetReading.totalAmount} ${settings.currency}`);
  };

  // Reject Single Reading
  const handleRejectReading = (readingId: string, reason: string) => {
    const targetReading = readings.find(r => r.id === readingId);
    if (!targetReading) return;

    const updatedReadings = readings.map(r => 
      r.id === readingId ? { ...r, isRejected: true, rejectionReason: reason || 'رفض للمراجعة الميدانية' } : r
    );

    onUpdateReadings(updatedReadings);
    logAction('رفض قراءة عداد', `رفض قراءة المشترك (${targetReading.subscriberName}) - السبب: ${reason}`);
    setRejectModalItem(null);
    setRejectionNote('');
  };

  // Unpost Single Reading
  const unpostSingleReading = (readingId: string) => {
    const targetReading = readings.find(r => r.id === readingId);
    if (!targetReading || !targetReading.isPosted) return;

    if (!confirm(`هل أنت متأكد من إلغاء ترحيل قراءة المشترك (${targetReading.subscriberName})؟ سيتم خصم الماليّة المعلقة من رصيده.`)) return;

    const updatedReadings = readings.map(r => 
      r.id === readingId ? { ...r, isPosted: false, postedDate: undefined, postedBy: undefined } : r
    );

    const updatedSubs = subscribers.map(sub => {
      if (sub.id === targetReading.subscriberId) {
        return {
          ...sub,
          currentBalance: Math.max(0, sub.currentBalance - targetReading.totalAmount)
        };
      }
      return sub;
    });

    onUpdateReadings(updatedReadings);
    onUpdateSubscribers(updatedSubs);
    logAction('إلغاء ترحيل قراءة', `إلغاء ترحيل قراءة المشترك (${targetReading.subscriberName}) بقيمة ${targetReading.totalAmount} ${settings.currency}`);
  };

  // Single Payment Post
  const postSinglePayment = (paymentId: string) => {
    const targetPayment = payments.find(p => p.id === paymentId);
    if (!targetPayment) return;

    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');
    const updatedPayments = payments.map(p => 
      p.id === paymentId ? { ...p, isPosted: true, postedDate, postedBy: currentUser.name, isRejected: false } : p
    );

    const updatedSubs = subscribers.map(sub => {
      if (sub.id === targetPayment.subscriberId) {
        return {
          ...sub,
          currentBalance: sub.currentBalance - targetPayment.amountPaid
        };
      }
      return sub;
    });

    onUpdatePayments(updatedPayments);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل سند قبض', `اعتماد وترحيل سند رقم (${targetPayment.receiptNumber}) للمشترك (${targetPayment.subscriberName}) بمبلغ ${targetPayment.amountPaid} ${settings.currency}`);
  };

  // Reject Single Payment
  const handleRejectPayment = (paymentId: string, reason: string) => {
    const targetPayment = payments.find(p => p.id === paymentId);
    if (!targetPayment) return;

    const updatedPayments = payments.map(p => 
      p.id === paymentId ? { ...p, isRejected: true, rejectionReason: reason || 'سند مرفوض للتدقيق' } : p
    );

    onUpdatePayments(updatedPayments);
    logAction('رفض سند قبض', `رفض سند رقم (${targetPayment.receiptNumber}) للمشترك (${targetPayment.subscriberName}) - السبب: ${reason}`);
    setRejectModalItem(null);
    setRejectionNote('');
  };

  // Unpost Single Payment
  const unpostSinglePayment = (paymentId: string) => {
    const targetPayment = payments.find(p => p.id === paymentId);
    if (!targetPayment || !targetPayment.isPosted) return;

    if (!confirm(`هل أنت متأكد من إلغاء ترحيل السند رقم (${targetPayment.receiptNumber})؟ سيتم إعادة تسجيل المبلغ كمديونية على المشترك.`)) return;

    const updatedPayments = payments.map(p => 
      p.id === paymentId ? { ...p, isPosted: false, postedDate: undefined, postedBy: undefined } : p
    );

    const updatedSubs = subscribers.map(sub => {
      if (sub.id === targetPayment.subscriberId) {
        return {
          ...sub,
          currentBalance: sub.currentBalance + targetPayment.amountPaid
        };
      }
      return sub;
    });

    onUpdatePayments(updatedPayments);
    onUpdateSubscribers(updatedSubs);
    logAction('إلغاء ترحيل سند قبض', `إلغاء ترحيل سند رقم (${targetPayment.receiptNumber}) للمشترك (${targetPayment.subscriberName})`);
  };

  // Batch Post Selected Readings
  const postBatchReadings = () => {
    if (selectedReadingIds.length === 0) return;
    const targetReads = readings.filter(r => selectedReadingIds.includes(r.id));
    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');

    const updatedReadings = readings.map(r => 
      selectedReadingIds.includes(r.id) ? { ...r, isPosted: true, postedDate, postedBy: currentUser.name, isRejected: false } : r
    );

    const updatedSubs = subscribers.map(sub => {
      const subReads = targetReads.filter(r => r.subscriberId === sub.id);
      if (subReads.length > 0) {
        const total = subReads.reduce((sum, r) => sum + r.totalAmount, 0);
        const maxRead = Math.max(...subReads.map(r => r.currentReading), sub.currentReading);
        return { ...sub, currentReading: maxRead, currentBalance: sub.currentBalance + total };
      }
      return sub;
    });

    onUpdateReadings(updatedReadings);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل دُفعة قراءات', `تم ترحيل عدد (${selectedReadingIds.length}) قراءة بنجاح`);
    setSelectedReadingIds([]);
  };

  // Batch Post Selected Payments
  const postBatchPayments = () => {
    if (selectedPaymentIds.length === 0) return;
    const targetPays = payments.filter(p => selectedPaymentIds.includes(p.id));
    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');

    const updatedPayments = payments.map(p => 
      selectedPaymentIds.includes(p.id) ? { ...p, isPosted: true, postedDate, postedBy: currentUser.name, isRejected: false } : p
    );

    const updatedSubs = subscribers.map(sub => {
      const subPays = targetPays.filter(p => p.subscriberId === sub.id);
      if (subPays.length > 0) {
        const total = subPays.reduce((sum, p) => sum + p.amountPaid, 0);
        return { ...sub, currentBalance: sub.currentBalance - total };
      }
      return sub;
    });

    onUpdatePayments(updatedPayments);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل دُفعة سندات', `تم ترحيل عدد (${selectedPaymentIds.length}) سند مالي بنجاح`);
    setSelectedPaymentIds([]);
  };

  // Post pending readings (ترحيل كافة القراءات للذمم المدنية)
  const postAllReadings = () => {
    if (pendingReadings.length === 0) {
      alert('لا توجد قراءات معلقة لترحيلها حالياً.');
      return;
    }

    const confirmPost = confirm(`هل أنت متأكد من ترحيل عدد (${pendingReadings.length}) قراءة عداد إلى الحسابات؟ سيتم ترحيل المبالغ لمديونية المشتركين وتحديث قراءاتهم النهائية.`);
    if (!confirmPost) return;

    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');
    const updatedReadings = readings.map(r => {
      if (!r.isPosted && !r.isRejected) {
        return { ...r, isPosted: true, postedDate, postedBy: currentUser.name };
      }
      return r;
    });

    const updatedSubs = subscribers.map(sub => {
      const subPendingReads = pendingReadings.filter(r => r.subscriberId === sub.id);
      if (subPendingReads.length > 0) {
        const totalCharge = subPendingReads.reduce((sum, r) => sum + r.totalAmount, 0);
        const latestReading = Math.max(...subPendingReads.map(r => r.currentReading), sub.currentReading);
        return {
          ...sub,
          currentReading: latestReading,
          currentBalance: sub.currentBalance + totalCharge
        };
      }
      return sub;
    });

    onUpdateReadings(updatedReadings);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل القراءات الميدانية', `ترحيل وإقرار عدد ${pendingReadings.length} قراءة، وتحميل المديونيات للمشتركين`);
    alert(`تم بنجاح ترحيل عدد (${pendingReadings.length}) قراءة وتحديث أرصدة المشتركين.`);
  };

  // Post pending payments (ترحيل كافة المقبوضات والسندات)
  const postAllPayments = () => {
    if (pendingPayments.length === 0) {
      alert('لا توجد سندات قبض معلقة لترحيلها حالياً.');
      return;
    }

    const confirmPost = confirm(`هل أنت متأكد من ترحيل عدد (${pendingPayments.length}) سند قبض مالي؟ سيتم خصم هذه المبالغ رسمياً من مديونيات المشتركين.`);
    if (!confirmPost) return;

    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');
    const updatedPayments = payments.map(p => {
      if (!p.isPosted && !p.isRejected) {
        return { ...p, isPosted: true, postedDate, postedBy: currentUser.name };
      }
      return p;
    });

    const updatedSubs = subscribers.map(sub => {
      const subPendingPays = pendingPayments.filter(p => p.subscriberId === sub.id);
      if (subPendingPays.length > 0) {
        const totalCredits = subPendingPays.reduce((sum, p) => sum + p.amountPaid, 0);
        return {
          ...sub,
          currentBalance: sub.currentBalance - totalCredits
        };
      }
      return sub;
    });

    onUpdatePayments(updatedPayments);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل السندات والمقبوضات', `ترحيل وإقرار عدد ${pendingPayments.length} سند قبض مالي للدفاتر الختامية`);
    alert(`تم بنجاح ترحيل عدد (${pendingPayments.length}) سند مالي وتنزيل مديونيات المشتركين.`);
  };

  // Settle Collector Cash & Create Treasury Transfer Voucher
  const settleCollectorCash = (collectorName: string, totalAmount: number) => {
    if (totalAmount <= 0) return;
    if (!confirm(`هل ترغب بترحيل وتوريد كاش المحصل (${collectorName}) بمبلغ (${totalAmount.toLocaleString()} ${settings.currency}) للصندوق الرئيسي؟`)) return;

    const collectorPays = payments.filter(p => p.receivedBy === collectorName && !p.isPosted && !p.isRejected);
    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');

    const updatedPayments = payments.map(p => 
      (p.receivedBy === collectorName && !p.isPosted && !p.isRejected) 
        ? { ...p, isPosted: true, postedDate, postedBy: currentUser.name } 
        : p
    );

    const updatedSubs = subscribers.map(sub => {
      const cPays = collectorPays.filter(p => p.subscriberId === sub.id);
      if (cPays.length > 0) {
        const total = cPays.reduce((sum, p) => sum + p.amountPaid, 0);
        return { ...sub, currentBalance: sub.currentBalance - total };
      }
      return sub;
    });

    onUpdatePayments(updatedPayments);
    onUpdateSubscribers(updatedSubs);

    const savedTrfs = localStorage.getItem('voltera_treasuryTransfers');
    const trfList = savedTrfs ? JSON.parse(savedTrfs) : [];
    const newTrf = {
      id: Date.now().toString(),
      transferNumber: `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      fromAccount: `عُهدة المحصل: ${collectorName}`,
      toAccount: 'الصندوق الرئيسي (الكاش)',
      amount: totalAmount,
      notes: `تصفية وتوريد عُهدة التحصيلات الميدانية للمحصل (${collectorName}) - إجمالي ${collectorPays.length} سند`,
      recordedBy: currentUser.name
    };

    const updatedTrfs = [newTrf, ...treasuryTransfers];
    if (onUpdateTreasuryTransfers) {
      onUpdateTreasuryTransfers(updatedTrfs);
    } else {
      localStorage.setItem('voltera_treasuryTransfers', JSON.stringify(updatedTrfs));
    }

    logAction('تصفية عُهدة محصل', `توريد عُهدة المحصل (${collectorName}) بمبلغ ${totalAmount} ${settings.currency} وتوليد سند تحويل رقم (${newTrf.transferNumber})`);
    alert(`تم توريد وتصفية عُهدة المحصل (${collectorName}) بنجاح وتوليد سند تحويل الخزينة (${newTrf.transferNumber}).`);
  };

  const parseSmsTemplate = (template: string, sub?: Subscriber, amountStr?: string, receiptStr?: string, reading?: MeterReading, payment?: Payment) => {
    if (!template) return '';
    let parsed = template;
    
    if (sub) {
      parsed = parsed.replace(/{اسم_المشترك}/g, sub.name);
      parsed = parsed.replace(/{رقم_العداد}/g, sub.meterNumber);
      
      let pastDue = sub.currentBalance;
      let totalRemaining = sub.currentBalance;
      let consumption = '0';
      
      if (reading) {
        consumption = reading.consumption.toString();
        if (!reading.isPosted) {
          pastDue = sub.currentBalance;
          totalRemaining = sub.currentBalance + reading.totalAmount;
        } else {
          totalRemaining = sub.currentBalance;
          pastDue = Math.max(0, sub.currentBalance - reading.totalAmount);
        }
      } else {
        const lastReading = [...readings].sort((a,b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime()).find(r => r.subscriberId === sub.id);
        if (lastReading) {
          consumption = lastReading.consumption.toString();
          if (!lastReading.isPosted) {
             pastDue = sub.currentBalance;
             totalRemaining = sub.currentBalance + lastReading.totalAmount;
          } else {
             totalRemaining = sub.currentBalance;
             pastDue = Math.max(0, sub.currentBalance - lastReading.totalAmount);
          }
        }
      }
      
      if (payment && !payment.isPosted) {
        totalRemaining = Math.max(0, totalRemaining - payment.amountPaid);
      }
      
      parsed = parsed.replace(/{الاستهلاك}/g, consumption);
      parsed = parsed.replace(/{الرصيد_المتبقي}/g, `${totalRemaining.toLocaleString()} ${settings.currency}`);
      parsed = parsed.replace(/{المبالغ_المتأخره}/g, `${pastDue.toLocaleString()} ${settings.currency}`);
    }
    
    if (amountStr) {
      parsed = parsed.replace(/{المبلغ}/g, amountStr);
    }
    
    if (receiptStr) {
      parsed = parsed.replace(/{رقم_السند}/g, receiptStr);
    }
    
    return parsed;
  };

  const handleSendReadingSMS = (r: MeterReading) => {
    const sub = subscribers.find(s => s.id === r.subscriberId);
    const phone = sub?.phone || '';
    const template = smsTemplates.find(t => t.id === '1')?.content || 'الأخ المشترك: {اسم_المشترك}\nرقم العداد: {رقم_العداد}\nالاستهلاك: {الاستهلاك}\nمبلغ الفاتورة: {المبلغ}\nالمتأخرات: {المبالغ_المتأخره}\nالإجمالي المطلوب: {الرصيد_المتبقي}';
    
    const msg = parseSmsTemplate(template, sub, `${r.totalAmount.toLocaleString()} ${settings.currency}`, undefined, r);
    window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, '_self');
    
    const updatedReadings = readings.map(reading => 
      reading.id === r.id ? { ...reading, smsSent: true } : reading
    );
    onUpdateReadings(updatedReadings);
  };

  const handleSendPaymentSMS = (p: Payment) => {
    const sub = subscribers.find(s => s.id === p.subscriberId);
    const phone = sub?.phone || '';
    const template = smsTemplates.find(t => t.id === '2')?.content || 'تم استلام مبلغ {المبلغ} من المشترك: {اسم_المشترك} بموجب سند رقم {رقم_السند}.\nالرصيد المتبقي: {الرصيد_المتبقي}\nشكرًا لتسديدكم.';
    
    const msg = parseSmsTemplate(template, sub, `${p.amountPaid.toLocaleString()} ${settings.currency}`, p.receiptNumber, undefined, p);
    window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, '_self');
    
    const updatedPayments = payments.map(payment => 
      payment.id === p.id ? { ...payment, smsSent: true } : payment
    );
    onUpdatePayments(updatedPayments);
  };

  const saveSmsTemplate = (id: string) => {
    setSmsTemplates(prev => prev.map(t => t.id === id ? { ...t, content: editingTemplateContent } : t));
    setEditingTemplateId(null);
    alert('تم حفظ القالب بنجاح');
  };

  const handleStartSmsSequence = () => {
    if (smsSelectedSubs.length === 0) {
      alert('يرجى تحديد مشترك واحد على الأقل.');
      return;
    }
    if (!smsMessage) {
      alert('يرجى كتابة نص الرسالة.');
      return;
    }

    const hasPhones = smsSelectedSubs.some(id => subscribers.find(s => s.id === id)?.phone);
    if (!hasPhones) {
      alert('لم يتم العثور على أرقام هواتف صالحة للمشتركين المحددين.');
      return;
    }

    setIsSendingSequence(true);
    setSmsQueueIndex(0);
  };

  const handleSendNextSms = () => {
    if (smsQueueIndex < smsSelectedSubs.length) {
      const subId = smsSelectedSubs[smsQueueIndex];
      const sub = subscribers.find(s => s.id === subId);
      
      if (sub && sub.phone) {
        const msg = parseSmsTemplate(smsMessage, sub);
        window.open(`sms:${sub.phone}?body=${encodeURIComponent(msg)}`, '_self');
      }
      
      setSmsQueueIndex(prev => prev + 1);
    }
    
    if (smsQueueIndex >= smsSelectedSubs.length - 1) {
      setIsSendingSequence(false);
      alert('تم الانتهاء من القائمة المحددة.');
    }
  };

  const handleCancelSequence = () => {
    setIsSendingSequence(false);
    setSmsQueueIndex(0);
  };

  // Close Billing Cycle (إغلاق الدورة المالية وتصفير الشهر)
  const handleCloseFiscalCycle = () => {
    if (pendingReadings.length > 0 || pendingPayments.length > 0) {
      alert('تحذير: لا يمكن إغلاق الدورة المالية وهناك قراءات أو سندات معلقة لم يتم ترحيلها بعد! يرجى ترحيلها أولاً.');
      return;
    }

    const cycleName = prompt('يرجى تحديد مسمى الدورة المالية المغلقة (مثال: يوليو 2026):', 'يوليو 2026');
    if (!cycleName) return;

    logAction('إغلاق الدورة المالية', `إغلاق الدورة المالية رسميًا لشهر [${cycleName}] وأرشفة السجلات`);
    alert(`تم إغلاق الدورة المالية لـ (${cycleName}) وأرشفة البيانات التاريخية للمحطة بنجاح.`);
  };

  // --- DATABASE MANAGEMENT FUNCTIONS (إدارة قاعدة البيانات) ---
  
  // Backup as JSON
  const downloadBackup = () => {
    const fullDbState = {
      subscribers,
      readings,
      payments,
      settings,
      users,
      auditLogs,
      backupDate: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullDbState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `voltera_backup_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    logAction('نسخ احتياطي للبيانات', 'تصدير نسخة كاملة لقاعدة البيانات بصيغة JSON');
  };

  // Restore from JSON File
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const restoredState = JSON.parse(event.target?.result as string);
        
        if (
          restoredState.subscribers && 
          restoredState.readings && 
          restoredState.payments && 
          restoredState.settings && 
          restoredState.users
        ) {
          onUpdateSubscribers(restoredState.subscribers);
          onUpdateReadings(restoredState.readings);
          onUpdatePayments(restoredState.payments);
          onUpdateSettings(restoredState.settings);
          onUpdateUsers(restoredState.users);
          
          logAction('استعادة قاعدة البيانات', 'استيراد ناجح لملف النسخة الاحتياطية وإعادة بناء الجداول');
          alert('تمت استعادة قاعدة البيانات بالكامل وبنجاح تام!');
        } else {
          alert('خطأ: بنية الملف المرفوع غير صالحة ولا تحتوي على جداول النظام القياسية.');
        }
      } catch (err) {
        alert('حدث خطأ أثناء معالجة ملف JSON المرفوع.');
      }
    };
    reader.readAsText(file);
  };

  // --- FILTERED LISTINGS ---
  const filteredSubscribers = subscribers.filter(sub => {
    const q = subSearch.toLowerCase().trim();
    const matchSearch = sub.name.toLowerCase().includes(q) || sub.meterNumber.toLowerCase().includes(q) || sub.phone.includes(q);
    const matchZone = subscriberFilterZone === 'all' ? true : sub.zone === subscriberFilterZone;
    const matchStatus = subscriberFilterStatus === 'all' ? true : sub.status === subscriberFilterStatus;
    const matchTariff = subscriberFilterTariff === 'all' ? true : sub.tariffType === subscriberFilterTariff;
    return matchSearch && matchZone && matchStatus && matchTariff;
  });

  const handleBulkDelete = () => {
    if (confirm(`هل أنت متأكد من حذف ${selectedSubscribersIds.length} مشتركين؟`)) {
      const remaining = subscribers.filter(s => !selectedSubscribersIds.includes(s.id));
      onUpdateSubscribers(remaining);
      setSelectedSubscribersIds([]);
      logAction('حذف مشتركين بالجملة', `تم حذف ${selectedSubscribersIds.length} مشتركين من النظام`);
    }
  };

  const handleBulkToggleStatus = (targetStatus: 'active' | 'inactive') => {
      const updated = subscribers.map(s => {
          if (selectedSubscribersIds.includes(s.id)) {
              return { ...s, status: targetStatus };
          }
          return s;
      });
      onUpdateSubscribers(updated);
      setSelectedSubscribersIds([]);
      logAction('تغيير حالة مشتركين بالجملة', `تم تغيير حالة ${selectedSubscribersIds.length} مشتركين إلى ${targetStatus === 'active' ? 'نشط' : 'موقف'}`);
  };

  const toggleSubscriberSelection = (id: string) => {
      if (selectedSubscribersIds.includes(id)) {
          setSelectedSubscribersIds(selectedSubscribersIds.filter(i => i !== id));
      } else {
          setSelectedSubscribersIds([...selectedSubscribersIds, id]);
      }
  };
  
  const toggleAllSubscribersSelection = () => {
      if (selectedSubscribersIds.length === filteredSubscribers.length) {
          setSelectedSubscribersIds([]);
      } else {
          setSelectedSubscribersIds(filteredSubscribers.map(s => s.id));
      }
  };


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      
      {/* Top Admin Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-3 py-2.5 sm:px-6 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button 
            onClick={onLogout}
            className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-slate-600 p-2 sm:py-1.5 sm:px-3 rounded-xl text-xs transition-all font-bold cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>
          <div className="h-6 w-px bg-slate-200 shrink-0" />
          <div className="text-right min-w-0">
            <span className="block text-[9px] sm:text-[10px] text-amber-600 font-bold uppercase tracking-wider">مدير النظام</span>
            <span className="block text-[11px] sm:text-xs font-bold text-slate-800 truncate max-w-[80px] sm:max-w-[150px] md:max-w-none">{currentUser.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Real-time Notification Center */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications && unreadCount > 0) {
                  playNotifChime();
                }
              }}
              className="relative p-2 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer flex items-center justify-center transition-all focus:outline-none shrink-0"
              title="مركز التنبيهات والتنسيق المباشر">
              <Bell className={`w-4.5 h-4.5 ${unreadCount > 0 ? 'text-amber-500 animate-bounce' : 'text-slate-600'}`} />
              {unreadCount > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full border-2 border-white shadow-md">
                    {unreadCount}
                  </span>
                  <span className="absolute -top-1 -right-1 bg-rose-400 animate-ping w-4 h-4 rounded-full opacity-75" />
                </>
              )}
            </button>

            {/* Dropdown for Notifications */}
            <AnimatePresence>
              {showNotifications && (
                <>
                  {/* Backdrop overlay for focus and closing on click outside */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-950/20 backdrop-blur-[2px] z-[110]"
                    onClick={() => setShowNotifications(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: -12, x: "-50%", scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                    exit={{ opacity: 0, y: -12, x: "-50%", scale: 0.96 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="fixed top-16 sm:top-20 left-1/2 w-[92vw] sm:w-[440px] max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-[120] text-right font-sans"
                  >
                  {/* Header */}
                  <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleNotifSound}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          soundEnabled 
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30' 
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                        title={soundEnabled ? 'صوت التنبيهات مفعل (انقر للتعطيل)' : 'صوت التنبيهات معطل (انقر للتمكين)'}
                      >
                        {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="إغلاق القائمة"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <h3 className="text-white text-xs font-black flex items-center gap-1.5">
                          <span>مركز التنبيهات المباشرة</span>
                          <BellRing className="w-4 h-4 text-amber-400" />
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">متابعة الفوترة والمخزون والتحصيلات</p>
                      </div>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="bg-slate-100 p-1.5 flex items-center justify-between gap-1 border-b border-slate-200 text-xs font-bold">
                    <button
                      onClick={() => setNotifTab('all')}
                      className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center text-[11px] ${
                        notifTab === 'all'
                          ? 'bg-white text-slate-900 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      الكل ({allGeneratedNotifications.length})
                    </button>
                    <button
                      onClick={() => setNotifTab('unread')}
                      className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center text-[11px] flex items-center justify-center gap-1 ${
                        notifTab === 'unread'
                          ? 'bg-rose-500 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-rose-600'
                      }`}
                    >
                      <span>غير مقروءة</span>
                      {unreadCount > 0 && <span className="bg-rose-700 text-white px-1.5 py-0.2 rounded-full text-[9px]">{unreadCount}</span>}
                    </button>
                    <button
                      onClick={() => setNotifTab('urgent')}
                      className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center text-[11px] ${
                        notifTab === 'urgent'
                          ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-amber-600'
                      }`}
                    >
                      عاجل ({allGeneratedNotifications.filter(n => n.priority === 'high').length})
                    </button>
                  </div>

                  {/* Bulk Controls */}
                  {allGeneratedNotifications.length > 0 && (
                    <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex justify-between items-center text-[10px]">
                      <button
                        onClick={handleClearAllNotifs}
                        className="text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer font-semibold"
                      >
                        <Trash2 className="w-3 h-3 text-rose-500" />
                        <span>مسح القائمة</span>
                      </button>

                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors cursor-pointer font-bold"
                        >
                          <CheckCircle2 className="w-3 h-3 text-amber-500" />
                          <span>تحديد الكل كمقروء</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Scrollable Notifications List */}
                  <div className="max-h-88 overflow-y-auto p-2 space-y-2 bg-slate-100/60 custom-scrollbar">
                    {adminNotifications.length === 0 ? (
                      <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 stroke-[1.5]" />
                        <p className="text-xs font-bold text-slate-700">لا توجد تنبيهات جديدة حالياً</p>
                        <p className="text-[10px] text-slate-500">جميع العمليات والقراءات والمخزون في وضع مستقر</p>
                      </div>
                    ) : (
                      adminNotifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotifClick(notif)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-xs flex flex-col gap-2 relative ${
                            !notif.isRead 
                              ? 'bg-white border-amber-300 ring-1 ring-amber-400/20 shadow-sm' 
                              : 'bg-white/80 border-slate-200/80 hover:bg-white opacity-85'
                          }`}
                        >
                          {/* Top Row */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => handleDismissNotif(notif.id, e)}
                                className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="إخفاء التنبيه"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                              {!notif.isRead && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="غير مقروء" />
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                {notif.time.substring(11, 16) || notif.time}
                              </span>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                notif.type === 'high_consumption' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                notif.type === 'high_payment' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                notif.type === 'low_inventory' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                notif.type === 'pending_readings' || notif.type === 'pending_payments' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                notif.type === 'tech_request' ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' :
                                'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                                {notif.type === 'high_consumption' && <Zap className="w-3 h-3 text-amber-600" />}
                                {notif.type === 'high_payment' && <Banknote className="w-3 h-3 text-emerald-600" />}
                                {notif.type === 'low_inventory' && <Package className="w-3 h-3 text-purple-600" />}
                                {(notif.type === 'pending_readings' || notif.type === 'pending_payments') && <Clock className="w-3 h-3 text-blue-600" />}
                                {notif.type === 'tech_request' && <Wrench className="w-3 h-3 text-cyan-600" />}
                                {notif.type === 'suspended_debt' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                                <span>{notif.title}</span>
                              </span>
                            </div>
                          </div>

                          {/* Message Body */}
                          <p className="text-xs text-slate-800 font-semibold leading-relaxed text-right">
                            {notif.message}
                          </p>

                          {/* Footer Action */}
                          <div className="pt-1 border-t border-slate-100 flex justify-between items-center text-[10px]">
                            <span className="text-amber-600 font-bold flex items-center gap-1 group-hover:translate-x-[-2px] transition-transform">
                              <span>عرض والتنفيذ</span>
                              <ArrowLeft className="w-3 h-3 text-amber-500" />
                            </span>

                            <span className="text-slate-400 font-medium">
                              {notif.priority === 'high' ? '⚠️ عالي الأهمية' : 'ℹ️ تنبيه عادي'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 transition-all focus:outline-none shrink-0"
            aria-label="القائمة"
          >
            <Menu className="w-4 h-4 text-amber-600" />
            <span className="text-[10px] font-bold hidden sm:inline">قائمة النظام</span>
          </button>

          <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 hidden sm:block">
            {settings.stationName}
          </h1>
          <div className="p-1.5 sm:p-2 bg-amber-400/10 rounded-xl border border-amber-400/30 shrink-0">
            <Shield className="w-4.5 h-4.5 sm:w-5 h-5 text-amber-600" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Responsive Mobile Sidebar Backdrop */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          />
        )}

        {/* RIGHT SIDEBAR (Control Navigation) */}
        <nav className={`fixed lg:relative inset-y-0 right-0 z-50 lg:z-10 w-72 bg-slate-900 border-l border-slate-800 p-4 transform-gpu transition-transform duration-300 lg:transform-none flex flex-col gap-6 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } overflow-y-auto overflow-x-hidden custom-scrollbar`}>
          
          <div className="flex items-center justify-between lg:justify-start gap-2 text-right border-b border-slate-800/40 pb-4">
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              title="إغلاق القائمة">
              <XCircle className="w-4.5 h-4.5" />
            </button>
            <div className="flex flex-col gap-0.5 text-right">
              <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">نظام إدارة موارد المؤسسة</h3>
              <span className="text-white text-sm font-black flex items-center justify-start gap-1.5">
                 ERP System <Package className="w-4 h-4 text-amber-500" />
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-1 pr-1 w-full">
            
            {/* Standalone Link: Dashboard */}
            <button
              onClick={() => { setActiveSection('dashboard'); setSidebarOpen(false); }}
              className={`flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeSection === 'dashboard'
                  ? 'bg-amber-500/15 text-amber-400 font-bold border-r-2 border-amber-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>لوحة القيادة والمؤشرات</span>
              <LayoutDashboard className={`w-4.5 h-4.5 shrink-0 ${activeSection === 'dashboard' ? 'text-amber-400' : 'text-slate-400'}`} />
            </button>

            {canSeeSubscribers && (
              <>
                {/* Group 1: Subscribers & Billing */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('subscribers')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>المشتركين والفوترة</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.subscribers ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.subscribers && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('subscribers'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'subscribers'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>إدارة المشتركين</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('debt'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'debt'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>إدارة الديون والمتأخرات</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('zones'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'zones'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>المناطق والمحولات</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

              </>
            )}

            {canSeeFinance && (
              <>
                {/* Group 2: Finance & Accounting */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('finance')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-500" />
                  <span>المالية والمحاسبة</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.finance ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.finance && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('accounting'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'accounting'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>النظام المحاسبي الشامل</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('admin-postings'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'admin-postings'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      {pendingReadings.length + pendingPayments.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse ml-2" />
                      )}
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الترحيلات المالية والقيود</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

              </>
            )}

            {canSeeInventory && (
              <>
                {/* Group: Inventory */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('inventory')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-500" />
                  <span>المخزون والمستودع</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.inventory ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.inventory && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('inventory-catalog'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'inventory-catalog'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>دليل الأصناف</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('inventory-transactions'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'inventory-transactions'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>حركات المستودع</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('inventory-alerts'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'inventory-alerts'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الجرد والتنبيهات</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
              </>
            )}

            {canSeeFinance && (
              <>
                {/* Group: Treasury & Collector Funds */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('treasury')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-500" />
                  <span>الصناديق والتحويلات المالية</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.treasury ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.treasury && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('treasury-boxes'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'treasury-boxes'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>صناديق المحصلين والخزائن</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('treasury-transfers'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'treasury-transfers'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>سندات التوريد والتحويلات</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('treasury-statements'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'treasury-statements'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>كشف حساب محصل تفصيلي</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('treasury-performance'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'treasury-performance'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>تقييم أداء المحصلين</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('treasury-daily'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'treasury-daily'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الجرد والتدفقات اليومية</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
              </>
            )}

            {canSeeHR && (
              <>
                {/* Group: HR */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('hr')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>وحدة الموارد البشرية (HR)</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.hr ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.hr && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('hr-employees'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'hr-employees'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>ملفات الموظفين</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('hr-payroll'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'hr-payroll'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الرواتب والسلف</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
              </>
            )}

            {canSeeOperations && (
              <>
                {/* Group: Operations */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('operations')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-orange-500" />
                  <span>العمليات والمناطق</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.operations ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.operations && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('operations-zones'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'operations-zones'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>المناطق والمحولات</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('operations-requests'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'operations-requests'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الطلبات الفنية</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
              </>
            )}

            {canSeeReporting && (
              <>
                {/* Group: Reporting */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('reporting')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-pink-500" />
                  <span>وحدة التقارير الشاملة</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.reporting ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.reporting && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('reporting-executive'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-executive'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>الملخص التنفيذي الشامل</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-financial'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-financial'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>تقارير مالية وأرباح</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-consumption'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-consumption'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                      <span>تقارير استهلاك</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-debt'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-debt'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                      <span>أعمار الديون والتحصيل</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-loss'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-loss'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                      <span>الفاقد والتحليل الذكي</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-inventory'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-inventory'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      <span>تقارير الجرد والمخزون</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-hr'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-hr'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>تقارير الموظفين والرواتب</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-statements'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-statements'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>كشوف الحسابات الرسمية</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>



              </>
            )}

            {canSeeSMS && (
              <>
                {/* Group 3: SMS System */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('sms')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-500" />
                  <span>نظام الرسائل النصية SMS</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.sms ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.sms && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('sms-templates'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'sms-templates'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>قوالب الرسائل</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('sms-subscriptions'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'sms-subscriptions'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>دليل المشتركين</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('sms-send'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'sms-send'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>إرسال رسالة</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('sms-failed'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'sms-failed'
                          ? 'bg-slate-800/80 text-white font-bold text-rose-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <span className={activeSection === 'sms-failed' ? 'text-rose-400' : ''}>الرسائل المتعثرة</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

              </>
            )}

            {canSeeSystemAdmin && (
              <>
                {/* Group 4: System Admin */}
            <div className="mt-2">
              <button
                onClick={() => {
                  toggleMenu('system');
                  if (!['roles', 'admin-db', 'admin-security', 'station-directory', 'admin-settings', 'admin-services', 'system'].includes(activeSection)) {
                    setActiveSection('station-directory');
                  }
                }}
                className={`w-full flex items-center justify-between text-xs font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none ${
                  ['roles', 'admin-db', 'admin-security', 'station-directory', 'admin-settings', 'admin-services', 'system'].includes(activeSection)
                    ? 'text-amber-400 bg-slate-800/50'
                    : 'text-slate-400'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-rose-500" />
                  <span>إدارة النظام والإعدادات</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.system ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.system && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('roles'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'roles'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>المستخدمين والصلاحيات</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('admin-db'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'admin-db'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>قواعد البيانات والنسخ الاحتياطي</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('admin-security'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'admin-security'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الأمان وسجل التدقيق</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('station-directory'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'station-directory'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>تخصيص المظهر وخدمات إضافية</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('admin-settings'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'admin-settings'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>تعرفة الكهرباء والرسوم</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('admin-services'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'admin-services'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>السندات الحرارية والخدمات المتقدمة</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            </>
          )}
          </div>

          {/* Bottom profile and version */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-3">
            <button
              onClick={onLogout}
              className="flex items-center justify-start gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 transition-all cursor-pointer w-full"
            >
              <span>تسجيل الخروج من النظام</span>
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
            
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3 text-right">
              <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-slate-900 font-bold font-mono">
                {currentUser.name.substring(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400">مدير عام المحطة</p>
              </div>
            </div>
          </div>
        </nav>


        {/* MAIN WORKSPACE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          
          <AnimatePresence mode="wait">
            {/* 1. DASHBOARD VIEW */}
            {activeSection === 'dashboard' && (
              <motion.div
                key="dashboard-sec"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6">
                {/* Visual Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-right">
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <span className="block text-[10px] sm:text-xs text-slate-400 font-bold tracking-wider">إجمالي المشتركين النشطين</span>
                    <span className="block text-xl sm:text-3xl font-black font-sans text-slate-900 mt-1">{activeSubs.length}</span>
                    <span className="block text-[9px] text-slate-500 mt-1 font-medium">من أصل {subscribers.length} مسجلين</span>
                  </div>
                  <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-white">
                    <span className="block text-[10px] sm:text-xs text-slate-400 font-bold tracking-wider">صافي المديونية المستحقة</span>
                    <span className="block text-xl sm:text-3xl font-black font-sans text-amber-400 mt-1">{totalBalance.toLocaleString()} {settings.currency}</span>
                    <span className="block text-[9px] text-slate-300 mt-1 font-medium">ديون متراكمة لم تحصل بعد</span>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <span className="block text-[10px] sm:text-xs text-slate-400 font-bold tracking-wider">الطاقة المستهلكة الموزعة</span>
                    <span className="block text-xl sm:text-3xl font-black font-sans text-slate-900 mt-1">{totalPowerConsumed.toLocaleString()} ك.و</span>
                    <span className="block text-[9px] text-slate-500 mt-1 font-medium font-sans">إجمالي قراءات العداد المعتمدة</span>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <span className="block text-[10px] sm:text-xs text-slate-400 font-bold tracking-wider">نسبة التحصيل المالي</span>
                    <span className="block text-xl sm:text-3xl font-black font-sans text-emerald-600 mt-1">{collectionRate.toFixed(1)}%</span>
                    <span className="block text-[9px] text-slate-500 mt-1 font-medium">المحقق من إجمالي الفوترة</span>
                  </div>
                </div>

                {/* SVG Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RevenueExpenseChart data={revExpData} currency={settings.currency} />
                  <FinancialAreaChart data={financialChartData} currency={settings.currency} />
                  <div className="lg:col-span-2">
                    <ZoneBarChart data={zoneChartData} />
                  </div>
                </div>

                {/* Dynamic Collectors Tracking & Audit log */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-right">
                  
                  {/* Active Collectors Tracker */}
                  <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">تتبع كفاءة المحصلين</h3>
                    <div className="space-y-3">
                      {users.filter(u => u.role === 'collector').map(user => {
                        const collPays = payments.filter(p => p.receivedBy === user.username);
                        const collSum = collPays.reduce((sum, p) => sum + p.amountPaid, 0);
                        return (
                          <div key={user.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                            <div className="text-left font-mono text-emerald-600 font-bold">
                              {collSum.toLocaleString()} {settings.currency}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{user.name}</p>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] inline-block font-semibold ${
                                user.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {user.status === 'active' ? 'نشط في الميدان' : 'موقف'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Audit Logs */}
                  <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">سجل التدقيق والعمليات الأخيرة</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {auditLogs.map(log => (
                        <div key={log.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-start text-xs gap-4">
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 mt-0.5">{log.timestamp}</span>
                          <div className="text-right">
                            <p className="font-semibold text-slate-800">
                              <span className="text-amber-600 font-black">{log.username}</span> : {log.action}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{log.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* 2. SUBSCRIBERS MANAGEMENT */}
            {activeSection === 'subscribers' && (
              <AdminSubscribers 
                subscribers={subscribers}
                readings={readings}
                payments={payments}
                settings={settings}
                currentUser={currentUser}
                onUpdateSubscribers={onUpdateSubscribers}
                onAddAuditLog={onAddAuditLog}
              />
            )}

            {/* 3. DATABASE MANAGEMENT (إدارة قواعد البيانات) */}
                    {activeSection === 'inventory-catalog' && (
          <AdminInventory 
            activeTab="catalog"
            inventory={inventory}
            inventoryTransactions={inventoryTransactions}
            onUpdateInventory={onUpdateInventory}
            onUpdateInventoryTransactions={onUpdateInventoryTransactions}
            currentUser={currentUser}
            logAction={logAction}
          />
        )}
        {activeSection === 'inventory-transactions' && (
          <AdminInventory 
            activeTab="transactions"
            inventory={inventory}
            inventoryTransactions={inventoryTransactions}
            onUpdateInventory={onUpdateInventory}
            onUpdateInventoryTransactions={onUpdateInventoryTransactions}
            currentUser={currentUser}
            logAction={logAction}
          />
        )}
        {(activeSection === 'inventory-alerts' || activeSection === 'inventory') && (
          <AdminInventory 
            activeTab="alerts"
            inventory={inventory}
            inventoryTransactions={inventoryTransactions}
            onUpdateInventory={onUpdateInventory}
            onUpdateInventoryTransactions={onUpdateInventoryTransactions}
            currentUser={currentUser}
            logAction={logAction}
          />
        )}
        {activeSection === 'hr-employees' && (
          <AdminHR 
            settings={settings}
            currentUser={currentUser}
            activeTab="employees"
            logAction={logAction}
            employees={employees}
            onUpdateEmployees={onUpdateEmployees}
            employeeTxs={employeeTxs}
            onUpdateEmployeeTxs={onUpdateEmployeeTxs}
          />
        )}
        {activeSection === 'hr-payroll' && (
          <AdminHR 
            settings={settings}
            currentUser={currentUser}
            activeTab="payroll"
            logAction={logAction}
            employees={employees}
            onUpdateEmployees={onUpdateEmployees}
            employeeTxs={employeeTxs}
            onUpdateEmployeeTxs={onUpdateEmployeeTxs}
          />
        )}
        
        {activeSection === 'accounting' && (
          <AdminAccounting 
            settings={settings} 
            currentUser={currentUser} 
            subscribers={subscribers} 
            readings={readings} 
            payments={payments}
            treasuryTransfers={treasuryTransfers}
            onUpdateTreasuryTransfers={onUpdateTreasuryTransfers}
            expenses={expenses}
            onUpdateExpenses={onUpdateExpenses}
            purchases={purchases}
            onUpdatePurchases={onUpdatePurchases}
            manualJournalEntries={manualJournalEntries}
            onUpdateManualJournalEntries={onUpdateManualJournalEntries}
            employees={employees}
            onUpdateEmployees={onUpdateEmployees}
            employeeTxs={employeeTxs}
            onUpdateEmployeeTxs={onUpdateEmployeeTxs}
            connections={connections}
            onUpdateConnections={onUpdateConnections}
          />
        )}

        {(activeSection === 'treasury-boxes' || 
          activeSection === 'treasury-transfers' || 
          activeSection === 'treasury-statements' || 
          activeSection === 'treasury-performance' || 
          activeSection === 'treasury-daily') && (
          <AdminAccounting 
            settings={settings} 
            currentUser={currentUser} 
            subscribers={subscribers} 
            readings={readings} 
            payments={payments}
            initialTab="treasury"
            initialTreasurySubTab={
              activeSection === 'treasury-boxes' ? 'boxes' :
              activeSection === 'treasury-transfers' ? 'transfers' :
              activeSection === 'treasury-statements' ? 'statements' :
              activeSection === 'treasury-performance' ? 'performance' :
              'daily'
            }
            treasuryTransfers={treasuryTransfers}
            onUpdateTreasuryTransfers={onUpdateTreasuryTransfers}
            expenses={expenses}
            onUpdateExpenses={onUpdateExpenses}
            purchases={purchases}
            onUpdatePurchases={onUpdatePurchases}
            manualJournalEntries={manualJournalEntries}
            onUpdateManualJournalEntries={onUpdateManualJournalEntries}
            employees={employees}
            onUpdateEmployees={onUpdateEmployees}
            employeeTxs={employeeTxs}
            onUpdateEmployeeTxs={onUpdateEmployeeTxs}
            connections={connections}
            onUpdateConnections={onUpdateConnections}
          />
        )}

        
            {(activeSection === 'reporting-executive' ||
              activeSection === 'reporting-financial' ||
              activeSection === 'reporting-consumption' ||
              activeSection === 'reporting-debt' ||
              activeSection === 'reporting-loss' ||
              activeSection === 'reporting-inventory' ||
              activeSection === 'reporting-hr' ||
              activeSection === 'reporting-statements') && (
              <AdminReports
                subscribers={subscribers}
                readings={readings}
                payments={payments}
                settings={settings}
                inventory={inventory}
                inventoryTransactions={inventoryTransactions}
                expenses={expenses}
                purchases={purchases}
                treasuryTransfers={treasuryTransfers}
                employees={employees}
                employeeTxs={employeeTxs}
                connections={connections}
                activeTab={
                  activeSection === 'reporting-executive' ? 'executive' :
                  activeSection === 'reporting-financial' ? 'financial' :
                  activeSection === 'reporting-consumption' ? 'consumption' :
                  activeSection === 'reporting-debt' ? 'debt_aging' :
                  activeSection === 'reporting-loss' ? 'loss' :
                  activeSection === 'reporting-inventory' ? 'inventory' :
                  activeSection === 'reporting-hr' ? 'hr_payroll' :
                  'statements'
                }
              />
            )}


            {activeSection === 'debt' && (
              <AdminDebt subscribers={subscribers} readings={readings} payments={payments} settings={settings} />
            )}

            {activeSection === 'zones' && (
              <AdminZones subscribers={subscribers} settings={settings} onUpdateSettings={onUpdateSettings} />
            )}

            {activeSection === 'operations-zones' && (
              <AdminOperations subscribers={subscribers} settings={settings} currentUser={currentUser} onUpdateSettings={onUpdateSettings} activeTab="zones" techRequests={techRequests} onUpdateTechRequests={onUpdateTechRequests} employees={employees} />
            )}
            {activeSection === 'operations-requests' && (
              <AdminOperations subscribers={subscribers} settings={settings} currentUser={currentUser} onUpdateSettings={onUpdateSettings} activeTab="requests" techRequests={techRequests} onUpdateTechRequests={onUpdateTechRequests} employees={employees} />
            )}


            {activeSection === 'roles' && (
              <div>
                {renderSystemAdminHeader('roles')}
                <AdminRoles 
                  users={users} 
                  onUpdateUsers={onUpdateUsers}
                  currentUser={currentUser}
                  onAddAuditLog={onAddAuditLog}
                  auditLogs={auditLogs}
                  initialTab="roles"
                />
              </div>
            )}
            {activeSection === 'admin-db' && (
              <div>
                {renderSystemAdminHeader('admin-db')}
                <AdminDatabase
                  subscribers={subscribers}
                  readings={readings}
                  payments={payments}
                  settings={settings}
                  users={users}
                  auditLogs={auditLogs}
                  inventory={inventory}
                  inventoryTransactions={inventoryTransactions}
                  treasuryTransfers={treasuryTransfers}
                  expenses={expenses}
                  purchases={purchases}
                  manualJournalEntries={manualJournalEntries}
                  employees={employees}
                  connections={connections}
                  techRequests={techRequests}
                  onUpdateSubscribers={onUpdateSubscribers}
                  onUpdateReadings={onUpdateReadings}
                  onUpdatePayments={onUpdatePayments}
                  onUpdateSettings={onUpdateSettings}
                  onUpdateUsers={onUpdateUsers}
                  onAddAuditLog={onAddAuditLog}
                  onResetDatabase={onResetDatabase}
                  currentUser={currentUser}
                />
              </div>
            )}

            {/* 4. SECURITY & PERMISSIONS (إدارة الأمان والصلاحيات) */}
            {activeSection === 'admin-security' && (
              <div>
                {renderSystemAdminHeader('admin-security')}
                <AdminRoles 
                  users={users} 
                  onUpdateUsers={onUpdateUsers}
                  currentUser={currentUser}
                  onAddAuditLog={onAddAuditLog}
                  auditLogs={auditLogs}
                  initialTab="policies"
                />
              </div>
            )}

            {/* 5. STATION DIRECTORY & IDENTITY (دليل وسجل هوية المحطة والشعار) */}
            {(activeSection === 'station-directory' || activeSection === 'system') && (
              <motion.div
                key="station-dir-sec"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-right">
                
                {renderSystemAdminHeader(activeSection)}
                
                {/* Header & Controls */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
                  <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 px-6 rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>حفظ بيانات وتحديث دليل المحطة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection('admin-settings')}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer border border-slate-700 flex items-center gap-1.5"
                      >
                        <Sliders className="w-4 h-4 text-amber-400" />
                        <span>إعدادات التعرفة والأسعار</span>
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <h3 className="text-lg font-black text-white">دليل المحطة وسجل الهوية الرسمية</h3>
                        <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                          <Building2 className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">تعديل الشعار، اسم المحطة بالعربي والإنجليزي، المالك، الترخيص، أرقام التواصل، والعنوان المعتمد بالفواتير والسندات.</p>
                    </div>
                  </div>

                  {/* Main Grid: Left Inputs, Right Identity Card Preview */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                    
                    {/* Left Side: Form Controls (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                      
                      {/* Box 1: Logo & Visual Identity */}
                      <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800/80 space-y-4 shadow-inner">
                        <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-2 flex items-center justify-between">
                          <span className="text-slate-500 font-mono text-[10px] uppercase">Branding & Logo</span>
                          <span className="flex items-center gap-1.5">
                            <span>الشعار والهوية البصرية</span>
                            <Camera className="w-4 h-4" />
                          </span>
                        </h4>

                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                          {/* Logo Preview Container */}
                          <div className="w-24 h-24 bg-white rounded-xl border-2 border-dashed border-amber-500/60 p-2 flex flex-col items-center justify-center shrink-0 relative overflow-hidden group shadow-md">
                            {settings.logoUrl ? (
                              <img src={settings.logoUrl} alt="Station Logo" className="w-full h-full object-contain" />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                                <Zap className="w-8 h-8 text-amber-500 fill-amber-500" />
                                <span className="text-[9px] font-bold text-slate-600">لا يوجد شعار</span>
                              </div>
                            )}
                          </div>

                          {/* Logo Upload Buttons & Actions */}
                          <div className="flex-1 space-y-2 text-right w-full">
                            <input
                              type="file"
                              ref={logoInputRef}
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                            
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => logoInputRef.current?.click()}
                                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-3.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                              >
                                <UploadCloud className="w-4 h-4" />
                                <span>تحميل صورة شعار من الجهاز</span>
                              </button>

                              {settings.logoUrl && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateSettings({ ...settings, logoUrl: '' })}
                                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-2 px-3 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>حذف الشعار الحالي</span>
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500">يدعم صيغ PNG, JPG, SVG بحجم أقصى 3 ميجابايت. يُفضل شعار بخلفية شفافة.</p>
                          </div>
                        </div>

                        {/* Direct Image URL input */}
                        <div>
                          <label className="block text-slate-400 mb-1.5 font-bold">أو أدخل رابط صورة الشعار المباشر (URL):</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={settings.logoUrl || ''}
                              onChange={e => onUpdateSettings({ ...settings, logoUrl: e.target.value })}
                              placeholder="https://example.com/logo.png"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-3 pr-9 text-slate-200 text-left font-mono text-xs focus:outline-none focus:border-amber-500/50"
                              dir="ltr"
                            />
                            <Link className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                          </div>
                        </div>

                        {/* Logo Text / Slogan */}
                        <div>
                          <label className="block text-slate-400 mb-1.5 font-bold">الشعار اللفظي / الرمز الخطي المطبوع (Logo Code):</label>
                          <input
                            type="text"
                            value={settings.logoText || ''}
                            onChange={e => onUpdateSettings({ ...settings, logoText: e.target.value })}
                            placeholder="مثال: VOLTA / كهرباء العاصمة"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Box 2: Official Name & Ownership */}
                      <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800/80 space-y-4 shadow-inner">
                        <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-2 flex items-center justify-between">
                          <span className="text-slate-500 font-mono text-[10px] uppercase">Legal Profile</span>
                          <span className="flex items-center gap-1.5">
                            <span>المسمى الرسمي والبيانات القانونية</span>
                            <FileBadge className="w-4 h-4" />
                          </span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-slate-400 mb-1.5 font-bold">اسم محطة الكهرباء (بالعربية) *</label>
                            <input
                              type="text"
                              required
                              value={settings.stationName || ''}
                              onChange={e => onUpdateSettings({ ...settings, stationName: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500/50"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1.5 font-bold">اسم المحطة بالإنجليزية (English Name)</label>
                            <input
                              type="text"
                              value={settings.stationNameEn || ''}
                              onChange={e => onUpdateSettings({ ...settings, stationNameEn: e.target.value })}
                              placeholder="e.g. Al-Asema Electric Station"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-left font-sans focus:outline-none focus:border-amber-500/50"
                              dir="ltr"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1.5 font-bold">اسم المالك / المدير العام (بالعربية)</label>
                            <input
                              type="text"
                              value={settings.ownerName || ''}
                              onChange={e => onUpdateSettings({ ...settings, ownerName: e.target.value })}
                              placeholder="مثال: المهندس عبدالكريم العولقي"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1.5 font-bold">رقم السجل التجاري / ترخيص التوليد</label>
                            <input
                              type="text"
                              value={settings.commercialRegister || ''}
                              onChange={e => onUpdateSettings({ ...settings, commercialRegister: e.target.value })}
                              placeholder="مثال: CR-99824-YE"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right font-mono focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Box 3: Communication & Address */}
                      <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800/80 space-y-4 shadow-inner">
                        <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-2 flex items-center justify-between">
                          <span className="text-slate-500 font-mono text-[10px] uppercase">Contact Details</span>
                          <span className="flex items-center gap-1.5">
                            <span>أرقام التواصل والعنوان الجغرافي</span>
                            <Phone className="w-4 h-4" />
                          </span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-slate-400 mb-1.5 font-bold">هاتف المحطة الرئيسي *</label>
                            <input
                              type="text"
                              required
                              value={settings.phone || ''}
                              onChange={e => onUpdateSettings({ ...settings, phone: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right font-mono focus:outline-none"
                              dir="ltr"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1.5 font-bold">رقم الطوارئ / الهاتف الثاني</label>
                            <input
                              type="text"
                              value={settings.phone2 || ''}
                              onChange={e => onUpdateSettings({ ...settings, phone2: e.target.value })}
                              placeholder="+967 733 987 654"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right font-mono focus:outline-none"
                              dir="ltr"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1.5 font-bold">رقم الواتساب الرسمي (WhatsApp)</label>
                            <input
                              type="text"
                              value={settings.whatsapp || ''}
                              onChange={e => onUpdateSettings({ ...settings, whatsapp: e.target.value })}
                              placeholder="+967 771 234 567"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right font-mono focus:outline-none"
                              dir="ltr"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1.5 font-bold">البريد الإلكتروني الرسمي</label>
                            <input
                              type="email"
                              value={settings.email || ''}
                              onChange={e => onUpdateSettings({ ...settings, email: e.target.value })}
                              placeholder="info@alasema-electric.ye"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-left font-mono text-xs focus:outline-none"
                              dir="ltr"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-slate-400 mb-1.5 font-bold">العنوان التفصيلي وموقع المحطة *</label>
                            <input
                              type="text"
                              required
                              value={settings.address || ''}
                              onChange={e => onUpdateSettings({ ...settings, address: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1.5 font-bold">العملة المعتمدة في المطبوعات *</label>
                            <input
                              type="text"
                              required
                              value={settings.currency || 'ر.ي'}
                              onChange={e => onUpdateSettings({ ...settings, currency: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Box 4: Terms & Notes */}
                      <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800/80 space-y-4 shadow-inner">
                        <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-2 flex items-center justify-between">
                          <span className="text-slate-500 font-mono text-[10px] uppercase">Policy & Terms</span>
                          <span className="flex items-center gap-1.5">
                            <span>سياسات وشروط الفواتير المطبوعة</span>
                            <FileText className="w-4 h-4" />
                          </span>
                        </h4>

                        <div>
                          <label className="block text-slate-400 mb-1.5 font-bold">شروط وتنويهات الفاتورة (تظهر بأسفل السندات والمطالبات المطبوعة):</label>
                          <textarea
                            rows={3}
                            value={settings.notes || ''}
                            onChange={e => onUpdateSettings({ ...settings, notes: e.target.value })}
                            placeholder="مثال: المحطة غير مسؤولة عن التمديدات الداخلية الخاطئة. يرجى سداد المبالغ قبل تاريخ 5 من الشهر التالي."
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-200 text-right focus:outline-none leading-relaxed text-xs resize-none"
                          />
                        </div>
                      </div>

                      {/* Box 5: Theme & UI Customization (تخصيص المظهر والواجهة) */}
                      <div className="bg-slate-950/80 p-5 rounded-xl border border-amber-500/30 space-y-4 shadow-inner">
                        <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-2 flex items-center justify-between">
                          <span className="text-slate-500 font-mono text-[10px] uppercase">UI & Theme Customization</span>
                          <span className="flex items-center gap-1.5">
                            <span>تخصيص ألوان مظهر النظام والواجهات</span>
                            <Palette className="w-4 h-4 text-amber-400" />
                          </span>
                        </h4>

                        {/* Theme Accent Color Selector */}
                        <div>
                          <label className="block text-slate-300 mb-2 font-bold">اللون الرئيسي المميز للمظهر (Theme Primary Accent):</label>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                            {[
                              { id: 'amber', name: 'الذهبي الوقاد', bg: 'bg-amber-500' },
                              { id: 'blue', name: 'الأزرق الكهربائي', bg: 'bg-blue-500' },
                              { id: 'emerald', name: 'الأخضر الكهروضوئي', bg: 'bg-emerald-500' },
                              { id: 'purple', name: 'الأرجواني الفاخر', bg: 'bg-purple-500' },
                              { id: 'slate', name: 'الرمادي التيتانيوم', bg: 'bg-slate-500' },
                            ].map(col => (
                              <button
                                key={col.id}
                                type="button"
                                onClick={() => onUpdateSettings({ ...settings, themeColor: col.id as any })}
                                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  (settings.themeColor || 'amber') === col.id
                                    ? 'bg-slate-900 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-full ${col.bg} shadow-sm border border-white/20`} />
                                <span className="text-[10px] font-bold text-slate-300">{col.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Font Family Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="block text-slate-300 mb-1.5 font-bold">خط الواجهة العربي (Typography Font):</label>
                            <select
                              value={settings.fontFamily || 'Cairo'}
                              onChange={e => onUpdateSettings({ ...settings, fontFamily: e.target.value as any })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right font-bold focus:outline-none"
                            >
                              <option value="Cairo">خط القاهرة (Cairo - الافتراضي)</option>
                              <option value="Tajawal">خط تجوال (Tajawal)</option>
                              <option value="Readex Pro">خط ريدكس برو (Readex Pro)</option>
                              <option value="IBM Plex Sans Arabic">خط آي بي إم بلكس (IBM Plex)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-300 mb-1.5 font-bold">نمط القائمة الجانبية (Sidebar Style):</label>
                            <select
                              value={settings.sidebarStyle || 'slate'}
                              onChange={e => onUpdateSettings({ ...settings, sidebarStyle: e.target.value as any })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right font-bold focus:outline-none"
                            >
                              <option value="slate">داكن كلاسيكي (Dark Slate)</option>
                              <option value="midnight">أسود منتصف الليل (Midnight Black)</option>
                              <option value="glass">شفاف زجاجي (Glassmorphism)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Box 6: Additional System Services & Integrations (خدمات النظام المتقدمة) */}
                      <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800/80 space-y-4 shadow-inner">
                        <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-2 flex items-center justify-between">
                          <span className="text-slate-500 font-mono text-[10px] uppercase">Service Addons</span>
                          <span className="flex items-center gap-1.5">
                            <span>خدمات النظام المتقدمة وبوابات المتابعة</span>
                            <Sparkles className="w-4 h-4 text-amber-400" />
                          </span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Service 1: WhatsApp */}
                          <div 
                            onClick={() => onUpdateSettings({ ...settings, whatsappEnabled: !settings.whatsappEnabled })}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              settings.whatsappEnabled 
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' 
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <div className="space-y-0.5 text-right">
                              <h5 className="font-bold text-xs text-white">إشعارات الواتساب المباشرة</h5>
                              <p className="text-[10px] text-slate-400">إرسال الفاتورة تلقائياً لرقم واتساب المشترك.</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${settings.whatsappEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                              {settings.whatsappEnabled ? 'مفعّل' : 'معطّل'}
                            </span>
                          </div>

                          {/* Service 2: Auto Cloud Backup */}
                          <div 
                            onClick={() => onUpdateSettings({ ...settings, autoCloudBackup: !settings.autoCloudBackup })}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              settings.autoCloudBackup 
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' 
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <div className="space-y-0.5 text-right">
                              <h5 className="font-bold text-xs text-white">النسخ الاحتياطي السحابي اليومي</h5>
                              <p className="text-[10px] text-slate-400">حفظ تلقائي يومي لقواعد البيانات والسجلات.</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${settings.autoCloudBackup ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                              {settings.autoCloudBackup ? 'مفعّل' : 'معطّل'}
                            </span>
                          </div>

                          {/* Service 3: Online Payment QR */}
                          <div 
                            onClick={() => onUpdateSettings({ ...settings, onlinePaymentEnabled: !settings.onlinePaymentEnabled })}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              settings.onlinePaymentEnabled 
                                ? 'bg-sky-500/10 border-sky-500/40 text-sky-300' 
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <div className="space-y-0.5 text-right">
                              <h5 className="font-bold text-xs text-white">رمز QR السداد الإلكتروني</h5>
                              <p className="text-[10px] text-slate-400">طباعة QR المحافظ المباشرة بالفواتير.</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${settings.onlinePaymentEnabled ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-500'}`}>
                              {settings.onlinePaymentEnabled ? 'مفعّل' : 'معطّل'}
                            </span>
                          </div>

                          {/* Service 4: Meter QR Scanning */}
                          <div 
                            onClick={() => onUpdateSettings({ ...settings, meterQrScanningEnabled: !settings.meterQrScanningEnabled })}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              settings.meterQrScanningEnabled 
                                ? 'bg-purple-500/10 border-purple-500/40 text-purple-300' 
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <div className="space-y-0.5 text-right">
                              <h5 className="font-bold text-xs text-white">مسح QR وسوم العدادات</h5>
                              <p className="text-[10px] text-slate-400">قراءة العداد بالمحمول عبر الكاميرا والبارکود.</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${settings.meterQrScanningEnabled ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-500'}`}>
                              {settings.meterQrScanningEnabled ? 'مفعّل' : 'معطّل'}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Right Side: Live Identity Badge & Document Preview (5 cols) */}
                    <div className="lg:col-span-5 space-y-6">
                      <div className="sticky top-20 bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-5 shadow-2xl">
                        
                        <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md font-mono text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            معاينة حية مباشرة
                          </span>
                          <h4 className="font-black text-slate-200 flex items-center gap-1.5">
                            <span>بطاقة هوية ورأسية المحطة</span>
                            <Award className="w-4 h-4 text-amber-400" />
                          </h4>
                        </div>

                        {/* Official Station ID Card Graphic */}
                        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-xl p-5 border border-slate-800 space-y-4 text-right relative overflow-hidden shadow-lg">
                          {/* Background Watermark Zap */}
                          <div className="absolute -left-6 -bottom-6 opacity-5 pointer-events-none">
                            <Zap className="w-36 h-36 text-amber-400" />
                          </div>

                          <div className="flex items-start justify-between border-b border-slate-800 pb-3 gap-3">
                            <div className="text-left space-y-1 font-mono text-[10px] text-slate-400">
                              {settings.commercialRegister && <p>Reg: <span className="text-amber-400 font-bold">{settings.commercialRegister}</span></p>}
                              {settings.stationNameEn && <p className="text-[10px] text-slate-400 font-sans">{settings.stationNameEn}</p>}
                            </div>

                            <div className="flex items-center gap-3">
                              <div>
                                <h3 className="font-black text-sm text-white">{settings.stationName || 'اسم المحطة غير محدد'}</h3>
                                {settings.logoText && <p className="text-[10px] font-bold text-amber-400 font-mono">{settings.logoText}</p>}
                              </div>
                              <div className="w-12 h-12 bg-white border border-amber-500/30 rounded-xl p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                                {settings.logoUrl ? (
                                  <img src={settings.logoUrl} alt="Station Logo" className="w-full h-full object-contain" />
                                ) : (
                                  <Zap className="w-6 h-6 text-amber-500 fill-current" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Details List */}
                          <div className="space-y-2 text-[11px] text-slate-300">
                            {settings.ownerName && (
                              <div className="flex justify-between items-center border-b border-slate-800/40 pb-1.5">
                                <span className="font-bold text-slate-200">{settings.ownerName}</span>
                                <span className="text-slate-500">المالك / المدير:</span>
                              </div>
                            )}

                            <div className="flex justify-between items-center border-b border-slate-800/40 pb-1.5">
                              <span className="font-mono text-amber-400 font-bold" dir="ltr">{settings.phone}</span>
                              <span className="text-slate-500">الهاتف الرئيسي:</span>
                            </div>

                            {settings.phone2 && (
                              <div className="flex justify-between items-center border-b border-slate-800/40 pb-1.5">
                                <span className="font-mono text-slate-300" dir="ltr">{settings.phone2}</span>
                                <span className="text-slate-500">هاتف الطوارئ:</span>
                              </div>
                            )}

                            {settings.address && (
                              <div className="flex justify-between items-center border-b border-slate-800/40 pb-1.5">
                                <span className="text-slate-200 text-[10px] font-medium">{settings.address}</span>
                                <span className="text-slate-500 shrink-0">العنوان:</span>
                              </div>
                            )}

                            {settings.email && (
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-slate-300 text-[10px]" dir="ltr">{settings.email}</span>
                                <span className="text-slate-500">البريد:</span>
                              </div>
                            )}
                          </div>

                          {/* Stamp / Verification Footer */}
                          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px]">
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded font-mono font-bold">
                              {settings.currency} Currency
                            </span>
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              الختم الرقمي المعتمد للمحطة
                            </span>
                          </div>
                        </div>

                        {/* Thermal Print Header Miniature Preview */}
                        <div className="bg-white text-slate-900 p-4 rounded-xl border border-slate-300 text-center space-y-1 shadow-md">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1 mb-2">نموذج ترويسة سندات القابض الحرارية (80mm)</p>
                          <div className="w-12 h-12 mx-auto flex items-center justify-center">
                            {settings.logoUrl ? (
                              <img src={settings.logoUrl} alt="Thermal Logo" className="w-full h-full object-contain" />
                            ) : (
                              <Zap className="w-6 h-6 text-slate-800" />
                            )}
                          </div>
                          <h4 className="font-black text-xs text-slate-950">{settings.stationName}</h4>
                          {settings.logoText && <p className="text-[9px] font-bold text-slate-600 font-mono">{settings.logoText}</p>}
                          <p className="text-[9px] text-slate-500">{settings.phone} | {settings.address}</p>
                        </div>

                        <button
                          type="button"
                          onClick={handleSaveSettings}
                          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          <span>تأكيد وحفظ دليل المحطة</span>
                        </button>

                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {/* 5.1 SYSTEM SETTINGS (إدارة إعدادات النظام والتعرفة) */}
            {activeSection === 'admin-settings' && (
              <motion.div
                key="settings-sec"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-right">
                
                {renderSystemAdminHeader('admin-settings')}

                <form onSubmit={handleSaveSettings} className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-6">
                  <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 px-6 rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>حفظ تعرفة الكهرباء الجديدة</span>
                    </button>
                    <div>
                      <h3 className="text-base font-bold text-slate-200">تعديل تعرفة الكهرباء ورسوم المحطة</h3>
                      <p className="text-xs text-slate-500 mt-1">تحديد أسعار الكيلوواط الساعي لمختلف القطاعات، بالإضافة لضريبة القيمة المضافة والرسوم الثابتة.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
                    {/* Price Tariffs */}
                    <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 space-y-4">
                      <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-1 flex items-center justify-start gap-1.5">
                        <span>أسعار شرائح الاستهلاك (ك.و/ساعة)</span>
                        <Sliders className="w-4 h-4" />
                      </h4>
                      <div>
                        <label className="block text-slate-400 mb-1.5">القطاع السكني (ر.ي)</label>
                        <input
                          type="number"
                          required
                          value={settings.tariffs.residential}
                          onChange={e => onUpdateSettings({
                            ...settings,
                            tariffs: { ...settings.tariffs, residential: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1.5">القطاع التجاري (ر.ي)</label>
                        <input
                          type="number"
                          required
                          value={settings.tariffs.commercial}
                          onChange={e => onUpdateSettings({
                            ...settings,
                            tariffs: { ...settings.tariffs, commercial: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1.5">القطاع الصناعي والشركات (ر.ي)</label>
                        <input
                          type="number"
                          required
                          value={settings.tariffs.industrial}
                          onChange={e => onUpdateSettings({
                            ...settings,
                            tariffs: { ...settings.tariffs, industrial: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Fixed Fees & Taxes */}
                    <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 space-y-4">
                      <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-1 flex items-center justify-start gap-1.5">
                        <span>الرسوم الثابتة والضريبة المستحقة</span>
                        <HelpCircle className="w-4 h-4" />
                      </h4>
                      <div>
                        <label className="block text-slate-400 mb-1.5">الرسوم الثابتة لكل اشتراك (شهرياً)</label>
                        <input
                          type="number"
                          required
                          value={settings.fixedFee}
                          onChange={e => onUpdateSettings({
                            ...settings,
                            fixedFee: parseFloat(e.target.value) || 0
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1.5">رسوم الصيانة والخدمة (شهرياً)</label>
                        <input
                          type="number"
                          required
                          value={settings.serviceFee}
                          onChange={e => onUpdateSettings({
                            ...settings,
                            serviceFee: parseFloat(e.target.value) || 0
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1.5">ضريبة المبيعات والقيمة المضافة (%)</label>
                        <input
                          type="number"
                          required
                          value={settings.taxPercent}
                          onChange={e => onUpdateSettings({
                            ...settings,
                            taxPercent: parseFloat(e.target.value) || 0
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Field Reading & Visit Cycle Settings */}
                    <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 space-y-4">
                      <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-1 flex items-center justify-start gap-1.5">
                        <span>دورة النزول الميداني وقراءة العدادات</span>
                        <Calendar className="w-4 h-4" />
                      </h4>
                      <div>
                        <label className="block text-slate-400 mb-1.5">نظام دورة أخذ القراءات للمحصلين</label>
                        <select
                          value={settings.readingCycleMode || 'decadal'}
                          onChange={e => {
                            const mode = e.target.value as 'decadal' | 'monthly' | 'weekly';
                            const interval = mode === 'decadal' ? 10 : mode === 'weekly' ? 7 : 30;
                            onUpdateSettings({
                              ...settings,
                              readingCycleMode: mode,
                              readingCycleIntervalDays: interval
                            });
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none"
                        >
                          <option value="decadal">نظام العشرية - كل 10 أيام (3 مرات شهرياً)</option>
                          <option value="weekly">نظام أسبوعي - كل 7 أيام (4 مرات شهرياً)</option>
                          <option value="monthly">نظام شهري - كل 30 يوماً (مرة واحدة شهرياً)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1.5">عدد أيام الفاصل بين كل نزول ميداني</label>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs">أيام</span>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={settings.readingCycleIntervalDays || 10}
                            onChange={e => onUpdateSettings({
                              ...settings,
                              readingCycleIntervalDays: parseInt(e.target.value) || 10
                            })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none font-mono"
                          />
                        </div>
                        <p className="text-[10px] text-amber-400/80 mt-1.5 leading-relaxed">
                          ⚡ عند تحديد 10 أيام، يتم النزول الميداني 3 مرات شهرياً (العشرية الأولى 1-10، الثانية 11-20، الثالثة 21-30).
                        </p>
                      </div>
                    </div>

                    {/* Quick Info Summary */}
                    <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 space-y-4">
                      <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-1 flex items-center justify-start gap-1.5">
                        <span>بيانات المحطة المرتبطة</span>
                        <Building2 className="w-4 h-4" />
                      </h4>
                      <div className="space-y-2 text-slate-300">
                        <div className="flex justify-between border-b border-slate-900 pb-1.5">
                          <span className="font-bold text-white">{settings.stationName || 'غير محدد'}</span>
                          <span className="text-slate-500">اسم المحطة:</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-900 pb-1.5">
                          <span className="font-mono text-amber-400 font-bold">{settings.phone || 'غير محدد'}</span>
                          <span className="text-slate-500">الهاتف:</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-900 pb-1.5">
                          <span className="font-mono text-slate-200">{settings.currency || 'ر.ي'}</span>
                          <span className="text-slate-500">العملة:</span>
                        </div>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setActiveSection('station-directory')}
                            className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Building2 className="w-4 h-4" />
                            <span>تعديل دليل المحطة والشعار بالكامل</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Tariff & Bill Calculation Simulator */}
                  <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 rounded-2xl border border-amber-500/30 space-y-5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                          <Sparkles className="w-5 h-5" />
                        </span>
                        <div>
                          <h4 className="font-black text-sm text-white">حاسبة محاكاة الفواتير المباشرة (Live Bill Tariff Simulator)</h4>
                          <p className="text-[11px] text-slate-400">اختبر احتساب قيمة الفاتورة فورياً بناءً على التعرفة والرسوم الثابتة المحددة أعلاه.</p>
                        </div>
                      </div>
                      
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono text-[10px] font-bold">
                        حساب تلقائي دقيق
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs">
                      {/* Input controls (5 cols) */}
                      <div className="md:col-span-5 space-y-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                        <div>
                          <label className="block text-slate-300 mb-1.5 font-bold">كمية الاستهلاك للتجربة (كيلوواط/ساعة):</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={calcSimKwh}
                              onChange={e => setCalcSimKwh(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-amber-400 font-mono font-bold text-sm text-right focus:outline-none focus:border-amber-500"
                            />
                            <span className="text-slate-400 font-bold shrink-0">ك.و/س</span>
                          </div>
                          {/* Quick buttons */}
                          <div className="flex gap-1.5 mt-2">
                            {[50, 100, 200, 500, 1000].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setCalcSimKwh(val)}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                  calcSimKwh === val 
                                    ? 'bg-amber-500 text-slate-950 font-black' 
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {val} ك.و
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-300 mb-1.5 font-bold">نوع الاشتراك / القطاع التجريبي:</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['residential', 'commercial', 'industrial'] as const).map(sec => (
                              <button
                                key={sec}
                                type="button"
                                onClick={() => setCalcSimSector(sec)}
                                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                  calcSimSector === sec
                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm'
                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                                }`}
                              >
                                {sec === 'residential' ? 'سكني' : sec === 'commercial' ? 'تجاري' : 'صناعي'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Real-time Calculation Breakdown (7 cols) */}
                      <div className="md:col-span-7 bg-slate-950/90 p-5 rounded-xl border border-slate-800 space-y-3">
                        {(() => {
                          const rate = settings.tariffs[calcSimSector] || 0;
                          const energyCost = calcSimKwh * rate;
                          const fixedFee = settings.fixedFee || 0;
                          const serviceFee = settings.serviceFee || 0;
                          const subtotal = energyCost + fixedFee + serviceFee;
                          const taxVal = subtotal * ((settings.taxPercent || 0) / 100);
                          const totalInvoice = subtotal + taxVal;

                          return (
                            <>
                              <div className="flex justify-between items-center text-slate-400 border-b border-slate-800/80 pb-2">
                                <span>سعر الكيلوواط للقطاع {calcSimSector === 'residential' ? 'السكني' : calcSimSector === 'commercial' ? 'التجاري' : 'الصناعي'}:</span>
                                <span className="font-mono text-amber-400 font-bold">{rate.toLocaleString()} {settings.currency} / ك.و</span>
                              </div>

                              <div className="space-y-1.5 text-xs text-slate-300">
                                <div className="flex justify-between items-center">
                                  <span>قيمة استهلاك الطاقـــة ({calcSimKwh} × {rate}):</span>
                                  <span className="font-mono font-bold text-white">{energyCost.toLocaleString()} {settings.currency}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>الرسوم الثابتة الشهرية (اشتراك):</span>
                                  <span className="font-mono font-bold text-slate-300">{fixedFee.toLocaleString()} {settings.currency}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>رسوم الصيانة والخدمة الشهرية:</span>
                                  <span className="font-mono font-bold text-slate-300">{serviceFee.toLocaleString()} {settings.currency}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-400">
                                  <span>ضريبة القيمة المضافة ({settings.taxPercent}%):</span>
                                  <span className="font-mono font-bold text-amber-300/80">+{taxVal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {settings.currency}</span>
                                </div>
                              </div>

                              <div className="pt-3 border-t border-slate-800 flex justify-between items-center bg-slate-900/60 p-3 rounded-lg">
                                <span className="font-black text-amber-400 text-sm">إجمالي الفاتورة المتوقعة:</span>
                                <span className="font-mono font-black text-emerald-400 text-base">
                                  {totalInvoice.toLocaleString(undefined, { maximumFractionDigits: 2 })} {settings.currency}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                </form>
              </motion.div>
            )}

            {/* 5.2 THERMAL PRINT & SERVICES SETTINGS (تخصيص السندات الحرارية والطباعة) */}
            {activeSection === 'admin-services' && (
              <motion.div
                key="services-sec"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-right">
                
                {renderSystemAdminHeader('admin-services')}

                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
                  <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 px-6 rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>حفظ وتطبيق إعدادات السندات والطباعة</span>
                    </button>
                    <div>
                      <h3 className="text-lg font-black text-white">تخصيص السندات الحرارية والطباعة والخدمات المتقدمة</h3>
                      <p className="text-xs text-slate-400 mt-1">ضبط المقاسات الحرارية (80mm/58mm)، الشعار، البارکود، والختم الرقمي للفواتير والتحصيل.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                    {/* Left Settings Controls (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                      
                      {/* Thermal Printer Size & Format */}
                      <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-4">
                        <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-2 flex items-center justify-between">
                          <span className="text-slate-500 font-mono text-[10px] uppercase">Printer Hardware</span>
                          <span className="flex items-center gap-1.5">
                            <span>طبيعة ونوع الطابعة وسندات القبض</span>
                            <Printer className="w-4 h-4" />
                          </span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-slate-900 p-4 rounded-xl border border-amber-500/40 text-center space-y-2 cursor-pointer hover:border-amber-400 transition-all">
                            <Receipt className="w-6 h-6 text-amber-400 mx-auto" />
                            <h5 className="font-black text-white text-xs">طابعة حرارية 80mm</h5>
                            <p className="text-[10px] text-slate-400">النموذج القياسي المعتمد لسندات القبض والمطالبات الميدانية.</p>
                            <span className="inline-block px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded">موصى به</span>
                          </div>

                          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center space-y-2 cursor-pointer hover:border-slate-700 transition-all">
                            <Receipt className="w-6 h-6 text-slate-400 mx-auto" />
                            <h5 className="font-black text-slate-300 text-xs">طابعة حرارية جيبية 58mm</h5>
                            <p className="text-[10px] text-slate-400">مناسبة للطابعات المحمولة عبر البلوتوث للمحصلين.</p>
                          </div>

                          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center space-y-2 cursor-pointer hover:border-slate-700 transition-all">
                            <FileText className="w-6 h-6 text-slate-400 mx-auto" />
                            <h5 className="font-black text-slate-300 text-xs">ورق A4 / A5 رسمي</h5>
                            <p className="text-[10px] text-slate-400">للمطالبات الشهرية الكبيرة وكشوفات الحسابات الرسمية.</p>
                          </div>
                        </div>
                      </div>

                      {/* Header and Footer Text Settings */}
                      <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-4">
                        <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-2 flex items-center justify-between">
                          <span className="text-slate-500 font-mono text-[10px] uppercase">Receipt Layout</span>
                          <span className="flex items-center gap-1.5">
                            <span>نصوص الترويسة والتذييل بالشروط</span>
                            <FileText className="w-4 h-4" />
                          </span>
                        </h4>

                        <div>
                          <label className="block text-slate-300 mb-1.5 font-bold">الشعار اللفظي الأعلى (Header Code):</label>
                          <input
                            type="text"
                            value={settings.logoText || ''}
                            onChange={e => onUpdateSettings({ ...settings, logoText: e.target.value })}
                            placeholder="مثال: VOLTA ELECTRIC / كهرباء العاصمة"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 mb-1.5 font-bold">ملاحظات وشروط الفاتورة المطبوعة أسفل السند:</label>
                          <textarea
                            rows={3}
                            value={settings.notes || ''}
                            onChange={e => onUpdateSettings({ ...settings, notes: e.target.value })}
                            placeholder="مثال: المحطة غير مسؤولة عن التمديدات الداخلية الخاطئة. يرجى سداد المبالغ قبل تاريخ 5 من الشهر التالي."
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-200 text-right focus:outline-none text-xs resize-none"
                          />
                        </div>
                      </div>

                      {/* Elements visibility toggles */}
                      <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-4">
                        <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-2 flex items-center justify-between">
                          <span className="text-slate-500 font-mono text-[10px] uppercase">Print Features</span>
                          <span className="flex items-center gap-1.5">
                            <span>عناصر السند الحراري النشطة</span>
                            <CheckSquare className="w-4 h-4" />
                          </span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
                            <span className="text-slate-200 font-bold">إظهار الختم الرقمي للمحطة</span>
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] rounded font-bold">مفعّل</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
                            <span className="text-slate-200 font-bold">إظهار رمز QR للدفع والتأكيد</span>
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] rounded font-bold">مفعّل</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
                            <span className="text-slate-200 font-bold">إظهار تفاصيل القراءة السابقة والجديدة</span>
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] rounded font-bold">مفعّل</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
                            <span className="text-slate-200 font-bold">إظهار اسم المحصل واسم المستخدم</span>
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] rounded font-bold">مفعّل</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Right Live Thermal Receipt Preview (5 cols) */}
                    <div className="lg:col-span-5 space-y-6">
                      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-2xl sticky top-20">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-mono text-[10px] font-bold flex items-center gap-1">
                            <Printer className="w-3.5 h-3.5" />
                            معاينة سند حراري قياسي (80mm)
                          </span>
                          <h4 className="font-bold text-white text-xs">نموذج الإخراج النهائي</h4>
                        </div>

                        {/* Thermal Paper Receipt Representation */}
                        <div className="bg-white text-slate-900 rounded-xl p-5 shadow-2xl font-mono text-[11px] space-y-3 border border-slate-300">
                          {/* Station Header */}
                          <div className="text-center space-y-1 border-b border-dashed border-slate-400 pb-3">
                            <div className="w-12 h-12 mx-auto flex items-center justify-center">
                              {settings.logoUrl ? (
                                <img src={settings.logoUrl} alt="Thermal Logo" className="w-full h-full object-contain" />
                              ) : (
                                <Zap className="w-8 h-8 text-slate-900 fill-slate-900" />
                              )}
                            </div>
                            <h3 className="font-black text-sm text-slate-950">{settings.stationName || 'محطة الكهرباء'}</h3>
                            {settings.logoText && <p className="text-[10px] font-bold text-slate-600">{settings.logoText}</p>}
                            <p className="text-[9px] text-slate-500">{settings.phone} | {settings.address}</p>
                            {settings.commercialRegister && <p className="text-[9px] text-slate-400">ترخيص: {settings.commercialRegister}</p>}
                          </div>

                          {/* Receipt Title & Info */}
                          <div className="text-right space-y-1 border-b border-dashed border-slate-300 pb-2 text-[10px]">
                            <div className="flex justify-between text-slate-700">
                              <span className="font-bold">#REC-2026-8841</span>
                              <span className="font-bold text-slate-950">سند قبض استهلاك كهرباء</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>التاريخ: {new Date().toISOString().substring(0, 10)}</span>
                              <span>المشترك: أحمد محمد علي</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>رقم العداد: 40918</span>
                              <span>المنطقة: المنطقة الأولى</span>
                            </div>
                          </div>

                          {/* Consumption Details */}
                          <div className="space-y-1.5 text-[10px] border-b border-dashed border-slate-300 pb-2">
                            <div className="flex justify-between">
                              <span className="font-bold">12,450 ك.و</span>
                              <span>القراءة الحالية:</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>12,350 ك.و</span>
                              <span>القراءة السابقة:</span>
                            </div>
                            <div className="flex justify-between text-slate-800 font-bold">
                              <span>100 ك.و/س</span>
                              <span>صافي الاستهلاك:</span>
                            </div>
                          </div>

                          {/* Financials */}
                          <div className="space-y-1 text-[11px] pt-1">
                            <div className="flex justify-between font-bold text-slate-900">
                              <span>{(100 * (settings.tariffs?.residential || 350)).toLocaleString()} {settings.currency}</span>
                              <span>قيمة الطاقة:</span>
                            </div>
                            <div className="flex justify-between text-slate-600 text-[10px]">
                              <span>{(settings.fixedFee || 0).toLocaleString()} {settings.currency}</span>
                              <span>الرسوم الثابتة:</span>
                            </div>
                            <div className="flex justify-between text-slate-600 text-[10px]">
                              <span>{(settings.serviceFee || 0).toLocaleString()} {settings.currency}</span>
                              <span>رسوم الصيانة:</span>
                            </div>
                            <div className="flex justify-between font-black text-slate-950 text-xs pt-1 border-t border-slate-900 mt-1">
                              <span>
                                {((100 * (settings.tariffs?.residential || 350)) + (settings.fixedFee || 0) + (settings.serviceFee || 0)).toLocaleString()} {settings.currency}
                              </span>
                              <span>الإجمالي المستحق:</span>
                            </div>
                          </div>

                          {/* Stamp & Footer Note */}
                          <div className="pt-2 border-t border-dashed border-slate-300 text-center space-y-1">
                            <p className="text-[9px] text-slate-500 leading-tight">
                              {settings.notes || 'شكراً لسدادكم الكترونياً. يرجى الاحتفاظ بالسند لغرض المراجعة.'}
                            </p>
                            <div className="pt-2 flex items-center justify-center gap-1 text-[9px] font-bold text-slate-700">
                              <ShieldCheck className="w-3.5 h-3.5 text-slate-800" />
                              <span>ختم إلكتروني معتمد - محطة العاصمة</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>
                </div>

              </motion.div>
            )}

            {/* 6. ENHANCED POSTINGS & TRANSFERS (إدارة الترحيلات والتحويلات المالية) */}
            {activeSection === 'admin-postings' && (
              <motion.div
                key="postings-sec"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-right">

                {/* Header Banner */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                      <ArrowRightLeft className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">إدارة الترحيلات المالية والتحويلات الميدانية</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        فحص، مطابقة وإقرار القراءات والسندات الميدانية وتصفية عُهد المحصلين إلى الحسابات الختامية.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleCloseFiscalCycle}
                      className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer">
                      <Lock className="w-4 h-4" />
                      <span>إغلاق الدورة المالية وتصفير الشهر</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer">
                      <Printer className="w-4 h-4 text-slate-400" />
                      <span>طباعة محضر الترحيل</span>
                    </button>
                  </div>
                </div>

                {/* KPI Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-slate-900/80 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex justify-between items-center text-slate-400 text-xs mb-2">
                      <span>القراءات المعلقة</span>
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-amber-400">
                      {pendingReadings.reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString()} {settings.currency}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">عدد ({pendingReadings.length}) قراءة عداد بانتظار الاعتماد</p>
                  </div>

                  <div className="bg-slate-900/80 border border-emerald-500/20 rounded-xl p-4">
                    <div className="flex justify-between items-center text-slate-400 text-xs mb-2">
                      <span>المقبوضات المعلقة</span>
                      <Banknote className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {pendingPayments.reduce((sum, p) => sum + p.amountPaid, 0).toLocaleString()} {settings.currency}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">عدد ({pendingPayments.length}) سند قبض مالي بانتظار الترحيل</p>
                  </div>

                  <div className="bg-slate-900/80 border border-sky-500/20 rounded-xl p-4">
                    <div className="flex justify-between items-center text-slate-400 text-xs mb-2">
                      <span>إجمالي الترحيلات المعتمدة</span>
                      <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-sky-400">
                      {(postedReadings.reduce((s, r) => s + r.totalAmount, 0) + postedPayments.reduce((s, p) => s + p.amountPaid, 0)).toLocaleString()} {settings.currency}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">مرحّلة في الأرصدة الختامية ({postedReadings.length + postedPayments.length} عملية)</p>
                  </div>

                  <div className="bg-slate-900/80 border border-rose-500/20 rounded-xl p-4">
                    <div className="flex justify-between items-center text-slate-400 text-xs mb-2">
                      <span>سجلات مرفوضة للتدقيق</span>
                      <XCircle className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-rose-400">
                      {rejectedReadings.length + rejectedPayments.length}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">تحتاج مراجعة مع المحصل الميداني</p>
                  </div>

                  <div className="bg-slate-900/80 border border-indigo-500/20 rounded-xl p-4">
                    <div className="flex justify-between items-center text-slate-400 text-xs mb-2">
                      <span>عُهد المحصلين المعلقة</span>
                      <Wallet className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-indigo-400">
                      {pendingPayments.reduce((s, p) => s + p.amountPaid, 0).toLocaleString()} {settings.currency}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">جاهزة للتوريد إلى الصندوق الرئيسي</p>
                  </div>
                </div>

                {/* Sub-Tabs Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                      onClick={() => setPostingSubTab('pending')}
                      className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        postingSubTab === 'pending'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}>
                      <Clock className="w-4 h-4" />
                      <span>الترحيلات المعلقة</span>
                      <span className="px-1.5 py-0.2 bg-slate-950/40 rounded-full text-[10px]">
                        {pendingReadings.length + pendingPayments.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setPostingSubTab('posted')}
                      className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        postingSubTab === 'posted'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>السجلات المرحّلة والمعتمدة</span>
                      <span className="px-1.5 py-0.2 bg-slate-950/40 rounded-full text-[10px]">
                        {postedReadings.length + postedPayments.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setPostingSubTab('rejected')}
                      className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        postingSubTab === 'rejected'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}>
                      <AlertCircle className="w-4 h-4" />
                      <span>المرفوضة للتدقيق</span>
                      <span className="px-1.5 py-0.2 bg-slate-950/40 rounded-full text-[10px]">
                        {rejectedReadings.length + rejectedPayments.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setPostingSubTab('collectors')}
                      className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        postingSubTab === 'collectors'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}>
                      <Wallet className="w-4 h-4" />
                      <span>تصفية عُهد المحصلين</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                    <input
                      type="text"
                      placeholder="ابحث باسم المشترك، رقم العداد، رقم السند..."
                      value={postingSearch}
                      onChange={e => setPostingSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pr-9 pl-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <select
                      value={postingCollectorFilter}
                      onChange={e => setPostingCollectorFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl py-2 px-3 focus:outline-none">
                      <option value="all">كافة المحصلين الميدانيين</option>
                      {Array.from(new Set([...readings.map(r => r.enteredBy), ...payments.map(p => p.receivedBy)])).filter(Boolean).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    {postingSubTab === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={postAllReadings}
                          disabled={pendingReadings.length === 0}
                          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer">
                          ترحيل كل القراءات ({pendingReadings.length})
                        </button>
                        <button
                          onClick={postAllPayments}
                          disabled={pendingPayments.length === 0}
                          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer">
                          ترحيل كل السندات ({pendingPayments.length})
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* TAB 1: PENDING POSTINGS */}
                {postingSubTab === 'pending' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pending Meter Readings */}
                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex flex-col gap-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                          <h3 className="font-bold text-slate-200 text-sm">قراءات العدادات بانتظار الاعتماد</h3>
                        </div>
                        <span className="text-xs text-amber-400 font-mono font-bold">
                          {pendingReadings.filter(r => 
                            (!postingSearch || r.subscriberName.includes(postingSearch) || r.meterNumber.includes(postingSearch)) &&
                            (postingCollectorFilter === 'all' || r.enteredBy === postingCollectorFilter)
                          ).reduce((s, r) => s + r.totalAmount, 0).toLocaleString()} {settings.currency}
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                        {pendingReadings.filter(r => 
                          (!postingSearch || r.subscriberName.includes(postingSearch) || r.meterNumber.includes(postingSearch)) &&
                          (postingCollectorFilter === 'all' || r.enteredBy === postingCollectorFilter)
                        ).length === 0 ? (
                          <div className="text-center py-12 text-slate-600 text-xs">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-2" />
                            <p>جميع القراءات الميدانية مرحّلة ومطابقة بالكامل.</p>
                          </div>
                        ) : (
                          pendingReadings.filter(r => 
                            (!postingSearch || r.subscriberName.includes(postingSearch) || r.meterNumber.includes(postingSearch)) &&
                            (postingCollectorFilter === 'all' || r.enteredBy === postingCollectorFilter)
                          ).map(r => (
                            <div key={r.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                              <div className="text-right flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-slate-200 text-xs">{r.subscriberName}</h4>
                                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded font-mono">
                                    عداد #{r.meterNumber}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">
                                  القراءة: <strong className="text-amber-400">{r.currentReading}</strong> (السابق: {r.previousReading}) | الاستهلاك: <strong className="text-slate-200">{r.consumption} ك.و.س</strong>
                                </p>
                                <p className="text-[9px] text-slate-500 mt-0.5">
                                  المحصل: {r.enteredBy} | التاريخ: {r.readingDate} | الشهر: {r.billingMonth}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <div className="text-left font-mono font-bold text-amber-400 text-sm ml-2">
                                  {r.totalAmount.toLocaleString()} {settings.currency}
                                </div>
                                <button
                                  onClick={() => postSingleReading(r.id)}
                                  className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                  title="اعتماد وترحيل القراءة">
                                  <Check className="w-4 h-4" />
                                  <span>اعتماد</span>
                                </button>
                                <button
                                  onClick={() => setRejectModalItem({ type: 'reading', id: r.id, name: r.subscriberName })}
                                  className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                  title="رفض القراءة">
                                  <XCircle className="w-4 h-4" />
                                  <span>رفض</span>
                                </button>
                                <button
                                  onClick={() => handleSendReadingSMS(r)}
                                  className="p-1.5 bg-slate-800 text-sky-400 hover:bg-sky-500/20 rounded-lg transition-colors cursor-pointer"
                                  title="إرسال SMS">
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Pending Payments */}
                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex flex-col gap-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <h3 className="font-bold text-slate-200 text-sm">سندات القبض النقدية بانتظار الترحيل</h3>
                        </div>
                        <span className="text-xs text-emerald-400 font-mono font-bold">
                          {pendingPayments.filter(p => 
                            (!postingSearch || p.subscriberName.includes(postingSearch) || p.receiptNumber.includes(postingSearch)) &&
                            (postingCollectorFilter === 'all' || p.receivedBy === postingCollectorFilter)
                          ).reduce((s, p) => s + p.amountPaid, 0).toLocaleString()} {settings.currency}
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                        {pendingPayments.filter(p => 
                          (!postingSearch || p.subscriberName.includes(postingSearch) || p.receiptNumber.includes(postingSearch)) &&
                          (postingCollectorFilter === 'all' || p.receivedBy === postingCollectorFilter)
                        ).length === 0 ? (
                          <div className="text-center py-12 text-slate-600 text-xs">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-2" />
                            <p>جميع سندات القبض المستلمة مرحّلة ومرحلة للحسابات.</p>
                          </div>
                        ) : (
                          pendingPayments.filter(p => 
                            (!postingSearch || p.subscriberName.includes(postingSearch) || p.receiptNumber.includes(postingSearch)) &&
                            (postingCollectorFilter === 'all' || p.receivedBy === postingCollectorFilter)
                          ).map(p => (
                            <div key={p.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                              <div className="text-right flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-slate-200 text-xs">{p.subscriberName}</h4>
                                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded font-mono">
                                    سند #{p.receiptNumber}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">
                                  الوسيط: <strong className="text-slate-200">{p.paymentMethod === 'cash' ? 'كاش مادي' : p.paymentMethod === 'e-wallet' ? 'محفظة إلكترونية' : 'تحويل بنكي'}</strong>
                                </p>
                                <p className="text-[9px] text-slate-500 mt-0.5">
                                  استلمها المحصل: {p.receivedBy} | التاريخ: {p.paymentDate}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <div className="text-left font-mono font-bold text-emerald-400 text-sm ml-2">
                                  {p.amountPaid.toLocaleString()} {settings.currency}
                                </div>
                                <button
                                  onClick={() => postSinglePayment(p.id)}
                                  className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                  title="اعتماد وترحيل السند">
                                  <Check className="w-4 h-4" />
                                  <span>اعتماد</span>
                                </button>
                                <button
                                  onClick={() => setRejectModalItem({ type: 'payment', id: p.id, name: p.subscriberName })}
                                  className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                  title="رفض السند">
                                  <XCircle className="w-4 h-4" />
                                  <span>رفض</span>
                                </button>
                                <button
                                  onClick={() => handleSendPaymentSMS(p)}
                                  className="p-1.5 bg-slate-800 text-sky-400 hover:bg-sky-500/20 rounded-lg transition-colors cursor-pointer"
                                  title="إرسال SMS">
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: POSTED ARCHIVE */}
                {postingSubTab === 'posted' && (
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <h3 className="font-bold text-slate-200 text-sm border-b border-slate-800 pb-3 flex items-center justify-between">
                      <span>أرشيف السجلات والقراءات المرحّلة رسمياً</span>
                      <span className="text-xs font-mono text-sky-400">إجمالي {postedReadings.length + postedPayments.length} سجل مرحّل</span>
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                            <th className="p-3">النوع</th>
                            <th className="p-3">اسم المشترك / المرجع</th>
                            <th className="p-3">المبلغ المرحّل</th>
                            <th className="p-3">المحكم/المعتمد</th>
                            <th className="p-3">تاريخ الترحيل</th>
                            <th className="p-3 text-center">الإجراءات والتحكم</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {postedReadings.map(r => (
                            <tr key={r.id} className="hover:bg-slate-900/80 transition-colors">
                              <td className="p-3">
                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-md font-bold text-[10px]">
                                  قراءة عداد
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-slate-200">{r.subscriberName}</div>
                                <div className="text-[10px] text-slate-500">عداد #{r.meterNumber} | {r.consumption} ك.و.س</div>
                              </td>
                              <td className="p-3 font-mono font-bold text-amber-400">
                                +{r.totalAmount.toLocaleString()} {settings.currency}
                              </td>
                              <td className="p-3 text-slate-300">{r.postedBy || r.enteredBy || 'النظام'}</td>
                              <td className="p-3 text-slate-400 font-mono text-[11px]">{r.postedDate || r.readingDate}</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => unpostSingleReading(r.id)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[11px] font-bold transition-all cursor-pointer">
                                  إلغاء الترحيل
                                </button>
                              </td>
                            </tr>
                          ))}

                          {postedPayments.map(p => (
                            <tr key={p.id} className="hover:bg-slate-900/80 transition-colors">
                              <td className="p-3">
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md font-bold text-[10px]">
                                  سند قبض
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-slate-200">{p.subscriberName}</div>
                                <div className="text-[10px] text-slate-500">سند #{p.receiptNumber}</div>
                              </td>
                              <td className="p-3 font-mono font-bold text-emerald-400">
                                -{p.amountPaid.toLocaleString()} {settings.currency}
                              </td>
                              <td className="p-3 text-slate-300">{p.postedBy || p.receivedBy || 'النظام'}</td>
                              <td className="p-3 text-slate-400 font-mono text-[11px]">{p.postedDate || p.paymentDate}</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => unpostSinglePayment(p.id)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[11px] font-bold transition-all cursor-pointer">
                                  إلغاء الترحيل
                                </button>
                              </td>
                            </tr>
                          ))}

                          {postedReadings.length === 0 && postedPayments.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center py-12 text-slate-600">
                                لا توجد سجلات مرحّلة سابقة.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 3: REJECTED ITEMS */}
                {postingSubTab === 'rejected' && (
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <h3 className="font-bold text-slate-200 text-sm border-b border-slate-800 pb-3 flex items-center justify-between">
                      <span className="text-rose-400">سجلات وقراءات مرفوضة لإعادة التدقيق الميداني</span>
                      <span className="text-xs font-mono text-slate-400">عدد {rejectedReadings.length + rejectedPayments.length} سجل مرفوض</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rejectedReadings.map(r => (
                        <div key={r.id} className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[10px] rounded font-bold">قراءة مرفوضة</span>
                              <h4 className="font-bold text-slate-200 text-xs">{r.subscriberName}</h4>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">العداد: #{r.meterNumber} | القراءة: {r.currentReading}</p>
                            <p className="text-xs text-rose-400 font-semibold mt-1">سبب الرفض: {r.rejectionReason || 'عدم تطابق القراءة'}</p>
                            <p className="text-[10px] text-slate-500 mt-1">بإدخال: {r.enteredBy} | {r.readingDate}</p>
                          </div>
                          <button
                            onClick={() => postSingleReading(r.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer">
                            إعادة الاعتماد
                          </button>
                        </div>
                      ))}

                      {rejectedPayments.map(p => (
                        <div key={p.id} className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[10px] rounded font-bold">سند قبض مرفوض</span>
                              <h4 className="font-bold text-slate-200 text-xs">{p.subscriberName}</h4>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">سند #{p.receiptNumber} | المبلغ: {p.amountPaid.toLocaleString()} {settings.currency}</p>
                            <p className="text-xs text-rose-400 font-semibold mt-1">سبب الرفض: {p.rejectionReason || 'عدم تطابق السند المادي'}</p>
                            <p className="text-[10px] text-slate-500 mt-1">المحصل: {p.receivedBy} | {p.paymentDate}</p>
                          </div>
                          <button
                            onClick={() => postSinglePayment(p.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer">
                            إعادة الاعتماد
                          </button>
                        </div>
                      ))}

                      {rejectedReadings.length === 0 && rejectedPayments.length === 0 && (
                        <div className="col-span-2 text-center py-12 text-slate-600 text-xs">
                          لا توجد أي قراءات أو سندات مرفوضة.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: COLLECTOR VAULT SETTLEMENT */}
                {postingSubTab === 'collectors' && (
                  <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-6">
                    <div>
                      <h3 className="font-bold text-slate-200 text-sm">تصفية وتوريد عُهد المحصلين الميدانيين للصندوق الرئيسي</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        يمكنك هنا مراجعة مبالغ التحصيلات النقدية المتراكمة في عُهدة كل محصل وتوريدها مباشرة بحوالة صندوق موثقة للخزينة الرئيسية.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from(new Set(payments.map(p => p.receivedBy))).filter((name): name is string => Boolean(name)).map(collectorName => {
                        const colPayments = payments.filter(p => p.receivedBy === collectorName && !p.isPosted && !p.isRejected);
                        const colTotal = colPayments.reduce((s, p) => s + p.amountPaid, 0);

                        return (
                          <div key={collectorName} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between gap-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-slate-100 text-sm">{collectorName}</h4>
                                <span className="text-[10px] text-slate-500">محصل ميداني</span>
                              </div>
                              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                                <Wallet className="w-5 h-5" />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="text-xs text-slate-400">عُهدة نقدية بانتظار التوريد:</div>
                              <div className="text-xl font-mono font-bold text-emerald-400">
                                {colTotal.toLocaleString()} {settings.currency}
                              </div>
                              <p className="text-[10px] text-slate-500">إجمالي عدد ({colPayments.length}) سند غير مورد</p>
                            </div>

                            <button
                              onClick={() => settleCollectorCash(collectorName, colTotal)}
                              disabled={colTotal === 0}
                              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2">
                              <ArrowRightLeft className="w-4 h-4" />
                              <span>توريد وتصفية إلى الصندوق الرئيسي</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Rejection Reason Modal */}
                {rejectModalItem && (
                  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-right space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <h3 className="font-bold text-slate-100 text-sm">رفض السند/القراءة للتدقيق</h3>
                        <button onClick={() => setRejectModalItem(null)} className="text-slate-500 hover:text-white">✕</button>
                      </div>

                      <p className="text-xs text-slate-300">
                        الرجاء كتابة سبب رفض {rejectModalItem.type === 'reading' ? 'قراءة' : 'سند'} المشترك (<strong>{rejectModalItem.name}</strong>):
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {['خطأ في القراءة الميدانية', 'مبلغ السند غير مطابق', 'صورة العداد غير واضحة', 'مطلوب إعادة معاينة'].map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setRejectionNote(tag)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px]">
                            {tag}
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={rejectionNote}
                        onChange={e => setRejectionNote(e.target.value)}
                        placeholder="اكتب تفاصيل سبب الرفض هنا..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500/50 min-h-[90px] resize-none"
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (rejectModalItem.type === 'reading') {
                              handleRejectReading(rejectModalItem.id, rejectionNote);
                            } else {
                              handleRejectPayment(rejectModalItem.id, rejectionNote);
                            }
                          }}
                          className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs cursor-pointer">
                          تأكيد الرفض
                        </button>
                        <button
                          onClick={() => setRejectModalItem(null)}
                          className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">
                          إلغاء
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </motion.div>
            )}

            {/* SMS Management Sections */}
            {activeSection === 'sms-templates' && (
              <motion.div
                key="sms-templates-sec"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-right">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center justify-start gap-2 mb-6 border-b border-slate-800 pb-3">
                    <span>قوالب الرسائل النصية</span>
                    <FileText className="w-5 h-5 text-amber-500" />
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {smsTemplates.map(template => (
                      <div key={template.id} className="bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                          <button
                            onClick={() => {
                              setEditingTemplateId(template.id);
                              setEditingTemplateContent(template.content);
                            }}
                            className="text-amber-400 hover:text-amber-300 text-xs font-bold">
                            تعديل
                          </button>
                          <h3 className="font-bold text-slate-200 text-sm">{template.name}</h3>
                        </div>
                        {editingTemplateId === template.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={editingTemplateContent}
                              onChange={(e) => setEditingTemplateContent(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white min-h-[100px] text-right resize-none focus:outline-none focus:border-amber-500/50"
                              dir="rtl"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveSmsTemplate(template.id)}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-1.5 rounded-lg transition-colors">
                                حفظ
                              </button>
                              <button
                                onClick={() => setEditingTemplateId(null)}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-1.5 rounded-lg transition-colors">
                                إلغاء
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-400 min-h-[100px] whitespace-pre-wrap">
                            {template.content}
                          </div>
                        )}
                        <p className="text-[10px] text-slate-500 flex flex-wrap gap-1 mt-2">
                          <span>المتغيرات المدعومة:</span>
                          <span className="text-amber-500/70">{'{اسم_المشترك}'}</span>, 
                          <span className="text-amber-500/70">{'{رقم_العداد}'}</span>,
                          <span className="text-amber-500/70">{'{الاستهلاك}'}</span>,
                          <span className="text-amber-500/70">{'{الرصيد_المتبقي}'}</span>,
                          <span className="text-amber-500/70">{'{المبالغ_المتأخره}'}</span>,
                          <span className="text-amber-500/70">{'{المبلغ}'}</span>, 
                          <span className="text-amber-500/70">{'{رقم_السند}'}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'sms-subscriptions' && (
              <motion.div
                key="sms-subscriptions-sec"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-right">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center justify-start gap-2 mb-6 border-b border-slate-800 pb-3">
                    <span>دليل اشتراك الرسائل القصيرة</span>
                    <Users className="w-5 h-5 text-amber-500" />
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-slate-400">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-950/50 border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">حالة الهاتف</th>
                          <th className="px-4 py-3">رقم الهاتف</th>
                          <th className="px-4 py-3">رقم العداد</th>
                          <th className="px-4 py-3 text-slate-200">اسم المشترك</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscribers.map(sub => (
                          <tr key={sub.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                            <td className="px-4 py-3">
                              {sub.phone && sub.phone.length >= 9 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                                  <Check className="w-3 h-3" />
                                  جاهز للاستلام
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold">
                                  <AlertCircle className="w-3 h-3" />
                                  لا يوجد رقم
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono">{sub.phone || '-'}</td>
                            <td className="px-4 py-3 font-mono">{sub.meterNumber}</td>
                            <td className="px-4 py-3 font-bold text-slate-300">{sub.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'sms-failed' && (
              <motion.div
                key="sms-failed-sec"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-right">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center justify-start gap-2 mb-6 border-b border-slate-800 pb-3">
                    <span>الرسائل غير المرسلة</span>
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Unsent Readings */}
                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                      <h3 className="text-sm font-bold text-amber-500 flex justify-start gap-2 mb-4 border-b border-slate-800/60 pb-2">
                        <span>فواتير قراءات لم تُرسل</span>
                        <FileText className="w-4 h-4" />
                      </h3>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {readings.filter(r => !r.smsSent).length === 0 ? (
                          <div className="text-center py-12 text-slate-600 text-xs">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-2" />
                            <p>جميع إشعارات الفواتير مُرسلة بنجاح.</p>
                          </div>
                        ) : (
                          readings.filter(r => !r.smsSent).sort((a,b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime()).slice(0, 50).map(r => (
                            <div key={r.id} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                              <div className="flex items-center gap-3">
                                <div className="text-left font-mono font-bold text-amber-400">
                                  {r.totalAmount.toLocaleString()} {settings.currency}
                                </div>
                                <button
                                  onClick={() => handleSendReadingSMS(r)}
                                  className="p-1.5 bg-slate-800 text-sky-400 hover:bg-sky-500/20 hover:text-sky-300 rounded-lg transition-colors cursor-pointer"
                                  title="إعادة محاولة الإرسال">
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="text-right">
                                <h5 className="font-bold text-slate-200">{r.subscriberName}</h5>
                                <p className="text-[10px] text-slate-500">
                                  العداد: {r.meterNumber} | {r.readingDate}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Unsent Payments */}
                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                      <h3 className="text-sm font-bold text-emerald-500 flex justify-start gap-2 mb-4 border-b border-slate-800/60 pb-2">
                        <span>سندات قبض لم تُرسل</span>
                        <Wallet className="w-4 h-4" />
                      </h3>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {payments.filter(p => !p.smsSent).length === 0 ? (
                          <div className="text-center py-12 text-slate-600 text-xs">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-2" />
                            <p>جميع سندات القبض مُرسلة بنجاح.</p>
                          </div>
                        ) : (
                          payments.filter(p => !p.smsSent).sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).slice(0, 50).map(p => (
                            <div key={p.id} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                              <div className="flex items-center gap-3">
                                <div className="text-left font-mono font-bold text-emerald-400">
                                  {p.amountPaid.toLocaleString()} {settings.currency}
                                </div>
                                <button
                                  onClick={() => handleSendPaymentSMS(p)}
                                  className="p-1.5 bg-slate-800 text-sky-400 hover:bg-sky-500/20 hover:text-sky-300 rounded-lg transition-colors cursor-pointer"
                                  title="إعادة محاولة الإرسال">
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="text-right">
                                <h5 className="font-bold text-slate-200">{p.subscriberName}</h5>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  رقم السند: {p.receiptNumber} | {p.paymentDate}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {activeSection === 'sms-send' && (
              <motion.div
                key="sms-send-sec"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-right">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Form */}
                  <div className="flex flex-col gap-4 order-2 lg:order-1">
                    <h2 className="text-lg font-bold text-slate-100 flex items-center justify-start gap-2 border-b border-slate-800 pb-3">
                      <span>إرسال رسالة مخصصة</span>
                      <MessageSquare className="w-5 h-5 text-amber-500" />
                    </h2>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-400">نص الرسالة</label>
                      <textarea
                        value={smsMessage}
                        onChange={(e) => setSmsMessage(e.target.value)}
                        placeholder="اكتب رسالتك هنا..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 min-h-[150px] resize-none focus:outline-none focus:border-amber-500/50"
                        dir="rtl"
                      />
                      <p className="text-[10px] text-slate-500 flex flex-wrap gap-1 mt-1">
                        <span>المتغيرات المدعومة:</span>
                        <span className="text-sky-500/70">{'{اسم_المشترك}'}</span>, 
                        <span className="text-sky-500/70">{'{رقم_العداد}'}</span>,
                        <span className="text-sky-500/70">{'{الاستهلاك}'}</span>,
                        <span className="text-sky-500/70">{'{الرصيد_المتبقي}'}</span>,
                        <span className="text-sky-500/70">{'{المبالغ_المتأخره}'}</span>
                      </p>
                    </div>
                    
                    {!isSendingSequence ? (
                      <button
                        onClick={handleStartSmsSequence}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2">
                        <Send className="w-5 h-5" />
                        <span>بدء إرسال متسلسل ({smsSelectedSubs.length} مستلم)</span>
                      </button>
                    ) : (
                      <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 flex flex-col gap-3 mt-2">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-amber-400">
                            جاري الإرسال المتسلسل... ({Math.min(smsQueueIndex + 1, smsSelectedSubs.length)} / {smsSelectedSubs.length})
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={handleSendNextSms}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
                            <Send className="w-4 h-4" />
                            <span>فتح تطبيق الرسائل للتالي</span>
                          </button>
                          
                          <button
                            onClick={handleCancelSequence}
                            className="bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold py-2 px-4 rounded-lg transition-colors">
                            إيقاف
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 text-xs text-sky-400 mt-2">
                      <p className="flex items-start gap-2">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>سيتم فتح تطبيق المراسلة في هاتفك مع إضافة الرقم الحالي والنص. قم بالإرسال من هاتفك ثم اضغط "التالي" هنا.</span>
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Subscribers List */}
                  <div className="flex flex-col gap-4 order-1 lg:order-2 border-b lg:border-b-0 lg:border-l border-slate-800 pb-6 lg:pb-0 lg:pl-6">
                    <h2 className="text-sm font-bold text-slate-100 flex items-center justify-start gap-2 border-b border-slate-800 pb-3">
                      <span>تحديد المستلمين</span>
                      <Users className="w-4 h-4 text-slate-400" />
                    </h2>
                    
                    <div className="flex items-center justify-between bg-slate-950 rounded-lg p-2 border border-slate-800">
                      <button
                        onClick={() => setSmsSelectedSubs([])}
                        className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1">
                        إلغاء التحديد
                      </button>
                      <button
                        onClick={() => {
                          const filtered = subscribers.filter(s => 
                            s.phone && (
                              s.name.includes(smsSearchQuery) || 
                              s.phone.includes(smsSearchQuery)
                            )
                          );
                          setSmsSelectedSubs(filtered.map(s => s.id));
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1">
                        تحديد الكل ({subscribers.filter(s => s.phone && (s.name.includes(smsSearchQuery) || s.phone.includes(smsSearchQuery))).length})
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="البحث بالاسم أو الرقم..."
                        value={smsSearchQuery}
                        onChange={(e) => setSmsSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 pr-8 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                        dir="rtl"
                      />
                      <Search className="w-4 h-4 text-slate-500 absolute top-2.5 right-2.5" />
                    </div>

                    <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                      {subscribers.filter(s => s.phone && (s.name.includes(smsSearchQuery) || s.phone.includes(smsSearchQuery))).map(sub => (
                        <label key={sub.id} className="flex items-center justify-between p-3 border-b border-slate-800 hover:bg-slate-900 cursor-pointer transition-colors">
                          <div className="text-right">
                            <h4 className="text-xs font-bold text-slate-300">{sub.name}</h4>
                            <p className="text-[10px] text-slate-500 font-mono">{sub.phone}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={smsSelectedSubs.includes(sub.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSmsSelectedSubs([...smsSelectedSubs, sub.id]);
                              } else {
                                setSmsSelectedSubs(smsSelectedSubs.filter(id => id !== sub.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-950"
                          />
                        </label>
                      ))}
                      {subscribers.filter(s => s.phone && (s.name.includes(smsSearchQuery) || s.phone.includes(smsSearchQuery))).length === 0 && (
                        <div className="p-6 text-center text-slate-500 text-xs">
                          لا يوجد مشتركون مطابقون للبحث لديهم أرقام هواتف مسجلة.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* NEW SUBSCRIBER MODAL */}
      {showAddSubModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-right space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <button 
                onClick={() => setShowAddSubModal(false)}
                className="text-slate-500 hover:text-slate-300">
                إغلاق
              </button>
              <h3 className="font-bold text-slate-200 text-sm">تسجيل مشترك جديد ومقايسة عداد</h3>
            </div>

            <form onSubmit={handleAddSubscriber} className="space-y-4 text-xs text-right">
              <div>
                <label className="block text-slate-400 mb-1">الاسم الكامل للمشترك</label>
                <input
                  type="text"
                  required
                  value={newSubName}
                  onChange={e => setNewSubName(e.target.value)}
                  placeholder="مثال: صالح عمر الجبري"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={newSubPhone}
                  onChange={e => setNewSubPhone(e.target.value)}
                  placeholder="مثال: 777321456"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">رقم تسلسلي للعداد</label>
                  <input
                    type="text"
                    required
                    value={newSubMeter}
                    onChange={e => setNewSubMeter(e.target.value)}
                    placeholder="مثال: M-10905"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">القراءة الأولية للعداد</label>
                  <input
                    type="number"
                    value={newSubInitial}
                    onChange={e => setNewSubInitial(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">المنطقة الجغرافية</label>
                  <select
                    value={newSubZone}
                    onChange={e => setNewSubZone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 text-right focus:outline-none focus:border-amber-500">
                    <option value="">-- اختر المنطقة --</option>
                    {(Array.isArray(settings.zones) ? settings.zones : []).map((z: any) => {
                      const val = typeof z === 'object' ? z.name : z;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">المحول المغذي</label>
                  <select
                    value={newSubTransformer}
                    onChange={e => setNewSubTransformer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 text-right focus:outline-none focus:border-amber-500">
                    <option value="">-- اختر المحول --</option>
                    {(Array.isArray(settings.transformers) ? settings.transformers : []).map((t: any) => {
                      const val = typeof t === 'object' ? t.name : t;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">فئة التعرفة الكهربائية</label>
                  <select
                    value={newSubTariff}
                    onChange={e => setNewSubTariff(e.target.value as TariffType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 text-right focus:outline-none focus:border-amber-500">
                    <option value="residential">منزلية (سكني)</option>
                    <option value="commercial">مؤسسة (تجاري)</option>
                    <option value="industrial">مصنع (صناعي)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">الرصيد الافتتاحي (اختياري)</label>
                <input
                  type="number"
                  value={newSubOpeningBalance}
                  onChange={e => setNewSubOpeningBalance(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition-all cursor-pointer">
                اعتماد وتركيب العداد للمشترك
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* EDIT SUBSCRIBER MODAL */}
      {editingSub && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-right space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <button 
                onClick={() => setEditingSub(null)}
                className="text-slate-500 hover:text-slate-300">
                إلغاء
              </button>
              <h3 className="font-bold text-slate-200 text-sm">تعديل بيانات العداد والمشترك</h3>
            </div>

            <form onSubmit={saveSubEdit} className="space-y-4 text-xs text-right">
              <div>
                <label className="block text-slate-400 mb-1">الاسم الكامل للمشترك</label>
                <input
                  type="text"
                  required
                  value={editingSub.name}
                  onChange={e => setEditingSub({ ...editingSub, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={editingSub.phone}
                  onChange={e => setEditingSub({ ...editingSub, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">رقم العداد (مغلق للتعديل)</label>
                  <input
                    type="text"
                    disabled
                    value={editingSub.meterNumber}
                    className="w-full bg-slate-950 border border-slate-800/40 rounded-lg py-2 px-3 text-slate-500 text-right cursor-not-allowed font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">تعديل الرصيد المالي المستحق</label>
                  <input
                    type="number"
                    value={editingSub.currentBalance}
                    onChange={e => setEditingSub({ ...editingSub, currentBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">المنطقة الجغرافية</label>
                  <select
                    value={editingSub.zone}
                    onChange={e => setEditingSub({ ...editingSub, zone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 text-right focus:outline-none focus:border-amber-500">
                    <option value="">-- اختر المنطقة --</option>
                    {(Array.isArray(settings.zones) ? settings.zones : []).map((z: any) => {
                      const val = typeof z === 'object' ? z.name : z;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">المحول المغذي</label>
                  <select
                    value={editingSub.transformer || ''}
                    onChange={e => setEditingSub({ ...editingSub, transformer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 text-right focus:outline-none focus:border-amber-500">
                    <option value="">-- اختر المحول --</option>
                    {(Array.isArray(settings.transformers) ? settings.transformers : []).map((t: any) => {
                      const val = typeof t === 'object' ? t.name : t;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">فئة التعرفة الكهربائية</label>
                  <select
                    value={editingSub.tariffType}
                    onChange={e => setEditingSub({ ...editingSub, tariffType: e.target.value as TariffType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 text-right focus:outline-none focus:border-amber-500">
                    <option value="residential">منزلية (سكني)</option>
                    <option value="commercial">مؤسسة (تجاري)</option>
                    <option value="industrial">مصنع (صناعي)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">تعديل الرصيد الافتتاحي</label>
                <input
                  type="number"
                  value={editingSub.openingBalance || 0}
                  onChange={e => setEditingSub({ ...editingSub, openingBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition-all cursor-pointer">
                حفظ التعديلات المحدثة
              </button>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
};
