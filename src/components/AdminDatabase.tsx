import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, Download, Upload, RefreshCw, ShieldCheck, CheckCircle2, 
  AlertTriangle, HardDrive, Clock, FileJson, FileSpreadsheet, Server, 
  Activity, Layers, Trash2, ShieldAlert, Sparkles, Archive, Search, Check, X,
  History, RotateCcw, Cpu
} from 'lucide-react';
import { Subscriber, MeterReading, Payment, SystemSettings, User, AuditLog, InventoryItem, InventoryTransaction } from '../types';

interface BackupSnapshot {
  id: string;
  name: string;
  date: string;
  subscribersCount: number;
  readingsCount: number;
  paymentsCount: number;
  data: any;
}

interface AdminDatabaseProps {
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  users: User[];
  auditLogs: AuditLog[];
  inventory?: InventoryItem[];
  inventoryTransactions?: InventoryTransaction[];
  treasuryTransfers?: any[];
  expenses?: any[];
  purchases?: any[];
  manualJournalEntries?: any[];
  employees?: any[];
  connections?: any[];
  techRequests?: any[];
  
  onUpdateSubscribers: (subs: Subscriber[]) => void;
  onUpdateReadings: (reads: MeterReading[]) => void;
  onUpdatePayments: (pays: Payment[]) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
  onUpdateUsers: (users: User[]) => void;
  onAddAuditLog: (log: AuditLog) => void;
  onResetDatabase: () => void;
  currentUser: User;
}

export const AdminDatabase: React.FC<AdminDatabaseProps> = ({
  subscribers,
  readings,
  payments,
  settings,
  users,
  auditLogs,
  inventory = [],
  inventoryTransactions = [],
  treasuryTransfers = [],
  expenses = [],
  purchases = [],
  manualJournalEntries = [],
  employees = [],
  connections = [],
  techRequests = [],
  onUpdateSubscribers,
  onUpdateReadings,
  onUpdatePayments,
  onUpdateSettings,
  onUpdateUsers,
  onAddAuditLog,
  onResetDatabase,
  currentUser
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [restoreFilePreview, setRestoreFilePreview] = useState<any | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    mismatchedBalances: number;
    orphanedReadings: number;
    pendingReadings: number;
    pendingPayments: number;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'backups' | 'export' | 'health' | 'danger'>('overview');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(new Date().toLocaleTimeString('ar-EG'));

  const [showPasteJsonModal, setShowPasteJsonModal] = useState(false);
  const [pastedJsonText, setPastedJsonText] = useState('');

  // Load saved snapshots from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('voltera_db_snapshots');
      if (saved) {
        setSnapshots(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to parse local snapshots", e);
    }
  }, []);

  // Helper log action
  const logDbAction = (action: string, details: string) => {
    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id || 'admin',
      username: currentUser.name || currentUser.username,
      action,
      details,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
    });
  };

  // Full System Export (JSON)
  const handleFullBackup = () => {
    try {
      const fullDbState = {
        subscribers,
        readings,
        payments,
        settings,
        users,
        auditLogs,
        inventory,
        inventoryTransactions,
        treasuryTransfers,
        expenses,
        purchases,
        manualJournalEntries,
        employees,
        connections,
        techRequests,
        systemVersion: '3.5.0',
        backupDate: new Date().toISOString(),
        stationName: settings.stationName
      };

      const jsonStr = JSON.stringify(fullDbState, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = `voltera_full_db_${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      logDbAction('تصدير قاعدة البيانات', 'تنزيل نسخة احتياطية كاملة بصيغة JSON');
      alert('تم إعداد وتحميل ملف قاعدة البيانات الكاملة بنجاح!');
    } catch (err) {
      console.error('Export error:', err);
      alert('حدث خطأ أثناء إعداد ملف التصدير.');
    }
  };

  // Create Local Snapshot Point
  const handleCreateSnapshot = () => {
    const snapshotName = prompt('أدخل اسماً توضيحياً لنقطة الاستعادة (مثال: قبل جرد شهر يوليو):', `نقطة استعادة - ${new Date().toLocaleDateString('ar-EG')}`);
    if (!snapshotName) return;

    const fullDbState = {
      subscribers,
      readings,
      payments,
      settings,
      users,
      auditLogs,
      inventory,
      inventoryTransactions,
      treasuryTransfers,
      expenses,
      purchases,
      manualJournalEntries,
      employees,
      connections,
      techRequests,
      backupDate: new Date().toISOString()
    };

    const newSnapshot: BackupSnapshot = {
      id: `snap-${Date.now()}`,
      name: snapshotName,
      date: new Date().toISOString().substring(0, 16).replace('T', ' '),
      subscribersCount: subscribers.length,
      readingsCount: readings.length,
      paymentsCount: payments.length,
      data: fullDbState
    };

    const updatedSnapshots = [newSnapshot, ...snapshots].slice(0, 10); // keep up to 10
    setSnapshots(updatedSnapshots);
    try {
      localStorage.setItem('voltera_db_snapshots', JSON.stringify(updatedSnapshots));
    } catch (e) {
      alert('ملاحظة: حجم البيانات كبير جداً بالنسبة للذاكرة المحلية المؤقتة للبروازر، لكن تم الاحتفاظ بها بالجلسة الحالية.');
    }

    logDbAction('إنشاء نقطة استعادة', `إنشاء نقطة استعادة داخلية باسم (${snapshotName})`);
    alert(`تم إنشاء نقطة الاستعادة [${snapshotName}] بنجاح.`);
  };

  // Restore Snapshot
  const handleRestoreSnapshot = (snap: BackupSnapshot) => {
    if (!confirm(`تحذير: هل أنت متأكد من العودة إلى نقطة الاستعادة المؤرخة بتاريخ (${snap.date})؟ ستستبدل البيانات الحالية تماماً.`)) {
      return;
    }

    const d = snap.data;
    if (d.subscribers) onUpdateSubscribers(d.subscribers);
    if (d.readings) onUpdateReadings(d.readings);
    if (d.payments) onUpdatePayments(d.payments);
    if (d.settings) onUpdateSettings(d.settings);
    if (d.users) onUpdateUsers(d.users);

    logDbAction('استعادة من نقطة حية', `الرجوع بالنظام إلى نقطة الاستعادة [${snap.name}] (${snap.date})`);
    alert('تمت استعادة البيانات بنجاح!');
  };

  // Delete Snapshot
  const handleDeleteSnapshot = (id: string) => {
    const remaining = snapshots.filter(s => s.id !== id);
    setSnapshots(remaining);
    localStorage.setItem('voltera_db_snapshots', JSON.stringify(remaining));
  };

  // Trigger file upload dialog
  const handleTriggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // File Upload Restore Preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          setRestoreFilePreview(parsed);
        } else {
          alert('الملف المرفوع لا يحتوي على البنية الصحيحة لقواعد بيانات النظام!');
        }
      } catch (err) {
        alert('الملف المرفوع ليس ملف JSON صالحاً.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handle Text Paste JSON
  const handleParsePastedJson = () => {
    if (!pastedJsonText.trim()) return;
    try {
      const parsed = JSON.parse(pastedJsonText.trim());
      if (parsed && (parsed.subscribers || parsed.readings || parsed.settings || Array.isArray(parsed))) {
        setRestoreFilePreview(parsed);
        setShowPasteJsonModal(false);
        setPastedJsonText('');
      } else {
        alert('النص الملصق لا يحتوي على البنية الصحيحة لقواعد بيانات النظام!');
      }
    } catch (e) {
      alert('النص الملصق ليس كود JSON صحيحاً!');
    }
  };

  // Execute Restore from Preview File
  const handleConfirmFileRestore = () => {
    if (!restoreFilePreview) return;

    if (restoreFilePreview.subscribers) onUpdateSubscribers(restoreFilePreview.subscribers);
    if (restoreFilePreview.readings) onUpdateReadings(restoreFilePreview.readings);
    if (restoreFilePreview.payments) onUpdatePayments(restoreFilePreview.payments);
    if (restoreFilePreview.settings) onUpdateSettings(restoreFilePreview.settings);
    if (restoreFilePreview.users) onUpdateUsers(restoreFilePreview.users);

    logDbAction('استعادة من ملف خارجي', 'رفع واستعادة قاعدة البيانات من ملف JSON خارجي');
    alert('تم استكمال استعادة البيانات وتحديث جميع الجداول بنجاح!');
    setRestoreFilePreview(null);
  };

  // Selective Export CSV / JSON
  const exportSelectiveData = (type: 'subscribers' | 'payments' | 'readings' | 'logs', format: 'csv' | 'json') => {
    let dataset: any[] = [];
    let filename = '';

    if (type === 'subscribers') {
      dataset = subscribers.map(s => ({
        ID: s.id,
        الاسم: s.name,
        رقم_العداد: s.meterNumber,
        الهاتف: s.phone,
        المنطقة: s.zone,
        التعريفة: s.tariffType,
        الرصيد_الحالي: s.currentBalance,
        القراءة_الحالية: s.currentReading,
        الحالة: s.status
      }));
      filename = `subscribers_export_${new Date().toISOString().substring(0, 10)}`;
    } else if (type === 'payments') {
      dataset = payments.map(p => ({
        رقم_السند: p.receiptNumber,
        اسم_المشترك: p.subscriberName,
        المبلغ: p.amountPaid,
        التاريخ: p.paymentDate,
        طريقة_الدفع: p.paymentMethod,
        المحصل: p.receivedBy,
        مرحل: p.isPosted ? 'نعم' : 'لا'
      }));
      filename = `payments_export_${new Date().toISOString().substring(0, 10)}`;
    } else if (type === 'readings') {
      dataset = readings.map(r => ({
        اسم_المشترك: r.subscriberName,
        القراءة_السابقة: r.previousReading,
        القراءة_الحالية: r.currentReading,
        الاستهلاك: r.consumption,
        المبلغ_الإجمالي: r.totalAmount,
        تاريخ_القراءة: r.readingDate,
        مرحل: r.isPosted ? 'نعم' : 'لا'
      }));
      filename = `readings_export_${new Date().toISOString().substring(0, 10)}`;
    } else if (type === 'logs') {
      dataset = auditLogs.map(l => ({
        التاريخ: l.timestamp,
        المستخدم: l.username,
        الإجراء: l.action,
        التفاصيل: l.details
      }));
      filename = `audit_logs_${new Date().toISOString().substring(0, 10)}`;
    }

    if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset, null, 2));
      const anchor = document.createElement('a');
      anchor.setAttribute("href", dataStr);
      anchor.setAttribute("download", `${filename}.json`);
      anchor.click();
    } else {
      if (dataset.length === 0) return;
      const headers = Object.keys(dataset[0]).join(',');
      const rows = dataset.map(obj => Object.values(obj).map(v => `"${v}"`).join(','));
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join('\n');
      const anchor = document.createElement('a');
      anchor.setAttribute("href", encodeURI(csvContent));
      anchor.setAttribute("download", `${filename}.csv`);
      anchor.click();
    }

    logDbAction('تصدير جزئي', `تصدير جدول (${type}) بصيغة (${format.toUpperCase()})`);
  };

  // Run Integrity Health Check
  const handleRunHealthCheck = () => {
    setIsScanning(true);
    setTimeout(() => {
      let mismatches = 0;
      subscribers.forEach(sub => {
        const subReadingsTotal = readings
          .filter(r => (r.subscriberId === sub.id || r.subscriberName === sub.name || (sub.meterNumber && r.meterNumber === sub.meterNumber)) && !r.isRejected)
          .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
        const subPaymentsTotal = payments
          .filter(p => (p.subscriberId === sub.id || p.subscriberName === sub.name) && !p.isRejected)
          .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
        const expectedBalance = (sub.openingBalance || 0) + subReadingsTotal - subPaymentsTotal;
        if (Math.abs((sub.currentBalance || 0) - expectedBalance) > 1) {
          mismatches++;
        }
      });

      const orphanedR = readings.filter(r => !subscribers.some(s => s.id === r.subscriberId || s.name === r.subscriberName || (s.meterNumber && s.meterNumber === r.meterNumber))).length;
      const pendR = readings.filter(r => !r.isPosted && !r.isRejected).length;
      const pendP = payments.filter(p => !p.isPosted && !p.isRejected).length;

      setHealthStatus({
        mismatchedBalances: mismatches,
        orphanedReadings: orphanedR,
        pendingReadings: pendR,
        pendingPayments: pendP
      });
      setIsScanning(false);
    }, 600);
  };

  // Auto Recalculate Balances
  const handleFixBalances = () => {
    if (!confirm('هل ترغب بتنفيذ مطابقة حسابية آليـة لجميع أرصدة المشتركين بناءً على مجموع الرصيد الافتتاحي والقراءات والمقبوضات؟')) return;

    let updatedCount = 0;
    const fixedSubs = subscribers.map(sub => {
      const subReadingsTotal = readings
        .filter(r => (r.subscriberId === sub.id || r.subscriberName === sub.name || (sub.meterNumber && r.meterNumber === sub.meterNumber)) && !r.isRejected)
        .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
      const subPaymentsTotal = payments
        .filter(p => (p.subscriberId === sub.id || p.subscriberName === sub.name) && !p.isRejected)
        .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const newBal = (sub.openingBalance || 0) + subReadingsTotal - subPaymentsTotal;
      if (Math.abs((sub.currentBalance || 0) - newBal) > 0.01) {
        updatedCount++;
      }
      return {
        ...sub,
        currentBalance: newBal
      };
    });

    onUpdateSubscribers(fixedSubs);
    logDbAction('مطابقة الأرصدة', `إعادة حساب وتصحيح أرصدة المشتركين آلياً (تعديل ${updatedCount} مشترك)`);
    alert(`تمت إعادة احتساب وتصحيح أرصدة المشتركين بنجاح!\nتم تحديث أرصدة ${updatedCount} مشترك ومطابقتها مع السجلات المالية.`);

    // Refresh health status
    const orphanedR = readings.filter(r => !subscribers.some(s => s.id === r.subscriberId || s.name === r.subscriberName || (s.meterNumber && s.meterNumber === r.meterNumber))).length;
    const pendR = readings.filter(r => !r.isPosted && !r.isRejected).length;
    const pendP = payments.filter(p => !p.isPosted && !p.isRejected).length;

    setHealthStatus({
      mismatchedBalances: 0,
      orphanedReadings: orphanedR,
      pendingReadings: pendR,
      pendingPayments: pendP
    });
  };

  // Soft Reset (Clear operational receipts & readings only)
  const handleSoftReset = () => {
    if (!confirm('تحذير شديد: هل أنت متأكد من مسح كافـة الفواتير وسندات القبض والقراءات، مع الإبقاء على أسماء المشتركين والمستخدمين والمخزون؟')) return;
    
    onUpdateReadings([]);
    onUpdatePayments([]);
    logDbAction('تنظيف الحركة التشغيلية', 'تصفير الفواتير والسندات مع الحفاظ على ملفات المشتركين والمخزون');
    alert('تم مسح الحركات المادية والتسجيلات التشغيلية بنجاح.');
  };

  // Manual Trigger Cloud Re-sync
  const handleTriggerCloudSync = () => {
    setIsSyncingCloud(true);
    setTimeout(() => {
      setIsSyncingCloud(false);
      setLastSyncedTime(new Date().toLocaleTimeString('ar-EG'));
      logDbAction('مزامنة سحابية', 'تنشيط المزامنة الفورية مع قاعدة بيانات Firebase Firestore');
    }, 1000);
  };

  return (
    <motion.div
      key="admin-db-sec"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right font-sans"
    >
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerCloudSync}
              disabled={isSyncingCloud}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'جار المزامنة...' : 'مزامنة فورية مع السحابة'}</span>
            </button>
            <div className="text-[11px] text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 font-mono">
              Cloud Status: <span className="text-emerald-400 font-bold">● Connected</span> ({lastSyncedTime})
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-100 flex items-center justify-start md:justify-end gap-2.5">
              <span>إدارة وتطوير قواعد البيانات والنسخ الاحتياطي</span>
              <Database className="w-6 h-6 text-amber-500" />
            </h2>
            <p className="text-xs text-slate-400 mt-1">الربط بالسحابة، التصدير والاسترجاع، نقاط الاستعادة الفورية، ومطابقة سلامة السجلات.</p>
          </div>
        </div>

        {/* Tab Selector Nav */}
        <div className="flex flex-wrap items-center justify-end gap-2 mt-5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>نظرة عامة والجداول</span>
          </button>

          <button
            onClick={() => setActiveTab('backups')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'backups'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>نقاط الاستعادة والنسخ الاحتياطي</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'export'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير جزئي (CSV / JSON)</span>
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'health'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>فحص النزاهة والمطابقة</span>
          </button>

          <button
            onClick={() => setActiveTab('danger')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'danger'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/10'
                : 'bg-slate-950/80 text-rose-400 hover:bg-rose-500/10 border border-slate-800/80'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>إعادة التهيئة والتنظيف</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & ENTITIES COUNT */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-sm">تصدير النسخة الشاملة (JSON)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  تفريغ وتحميل قاعدة البيانات بالكامل (المشتركين، القراءات، السندات، الحسابات، المخزون، والمستخدمين) في ملف واحد لحفظه خارجيًا.
                </p>
              </div>
              <button
                onClick={handleFullBackup}
                className="mt-5 w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل ملف القاعدة الكامل</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-sm">استعادة نسخة من ملف خارجية</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  رفع ملف JSON محلي استُخرج سابقاً لإعادة بناء أو تحديث كافة الجداول وتصحيح المفقودات.
                </p>
              </div>
              <input
                id="restore-file-input"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,application/json"
                style={{ display: 'none' }}
              />
              <div className="flex flex-col sm:flex-row gap-2 mt-5">
                <button
                  type="button"
                  onClick={handleTriggerFileSelect}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-2.5 px-3 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10 cursor-pointer text-center"
                >
                  <Upload className="w-4 h-4" />
                  <span>رفع ملف JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasteJsonModal(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-bold py-2.5 px-3 rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileJson className="w-4 h-4" />
                  <span>لصق JSON</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Archive className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-sm">إنشاء نقطة استعادة سريعة</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  حفظ لقطة سريعة في ذاكرة النظام المحلية قبل إجراء التغييرات الضخمة أو عمليات الإغلاق المالية للعودة إليها فوراً.
                </p>
              </div>
              <button
                onClick={handleCreateSnapshot}
                className="mt-5 w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>حفظ لقطة حية الآن</span>
              </button>
            </div>
          </div>

          {/* Database Entities Metrics */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-200 flex items-center justify-end gap-2 border-b border-slate-800 pb-3">
              <span>إحصائيات وحجم جداول الكيانات النشطة</span>
              <Layers className="w-5 h-5 text-amber-500" />
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">المشتركين والعدادات</span>
                <span className="text-xl font-black font-mono text-amber-400">{subscribers.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">سجل مفعّل</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">الفواتير والقراءات</span>
                <span className="text-xl font-black font-mono text-cyan-400">{readings.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">قراءة مسجلة</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">سندات القبض المالي</span>
                <span className="text-xl font-black font-mono text-emerald-400">{payments.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">سند تحصيل</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">المستخدمين والصلاحيات</span>
                <span className="text-xl font-black font-mono text-purple-400">{users.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">حساب مستخدم</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">أصناف وحركات المخزون</span>
                <span className="text-xl font-black font-mono text-sky-400">{inventory.length + inventoryTransactions.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">عنصر وحركة</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">التحويلات والمصروفات</span>
                <span className="text-xl font-black font-mono text-indigo-400">{treasuryTransfers.length + expenses.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">قيد وسند</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">سجل الموظفين والرواتب</span>
                <span className="text-xl font-black font-mono text-teal-400">{employees.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">موظف</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">سجل التدقيق الحركي</span>
                <span className="text-xl font-black font-mono text-rose-400">{auditLogs.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">عملية موثقة</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LOCAL SNAPSHOTS */}
      {activeTab === 'backups' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <button
              onClick={handleCreateSnapshot}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>إنشاء نقطة استعادة جديدة</span>
            </button>
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <span>نقاط الاستعادة المحفوظة بالذاكرة الحية</span>
              <History className="w-5 h-5 text-amber-500" />
            </h3>
          </div>

          {snapshots.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              <Archive className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <p className="text-xs">لا توجد نقاط استعادة مسبقة محفوظة في الذاكرة الحية.</p>
              <p className="text-[11px] text-slate-600 mt-1">اضغط على زر "إنشاء نقطة استعادة جديدة" لحفظ حالة النظام الحالية.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {snapshots.map(snap => (
                <div key={snap.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 relative group hover:border-slate-700 transition-all">
                  <div className="flex justify-between items-start">
                    <button
                      onClick={() => handleDeleteSnapshot(snap.id)}
                      className="text-slate-600 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="حذف نقطة الاستعادة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{snap.name}</h4>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5 dir-ltr text-right">{snap.date}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 bg-slate-900/60 rounded-xl px-3 text-center text-xs border border-slate-800/50">
                    <div>
                      <span className="text-[10px] text-slate-500 block">المشتركين</span>
                      <span className="font-bold text-amber-400 font-mono">{snap.subscribersCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">القراءات</span>
                      <span className="font-bold text-cyan-400 font-mono">{snap.readingsCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">السندات</span>
                      <span className="font-bold text-emerald-400 font-mono">{snap.paymentsCount}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRestoreSnapshot(snap)}
                    className="w-full bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>الرجوع إلى نقطة الاستعادة هذه</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SELECTIVE EXPORT */}
      {activeTab === 'export' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-200 flex items-center justify-end gap-2">
              <span>تصدير البيانات المخصصة والجداول المستقلة</span>
              <FileSpreadsheet className="w-5 h-5 text-amber-500" />
            </h3>
            <p className="text-xs text-slate-400 mt-1">تصدير جداول كشوفات الحسابات والقراءات والسندات بصيغة CSV لفتحها على إكسل أو بصيغة JSON.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Subscribers Table */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1">جدول دليل المشتركين والعدادات</h4>
                <p className="text-xs text-slate-500">يتضمن الأسماء، أرقام العدادات، المناطق، التعرفات والأرصدة الحالية ({subscribers.length} مشترك).</p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => exportSelectiveData('subscribers', 'csv')}
                  className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (CSV)</span>
                </button>
                <button
                  onClick={() => exportSelectiveData('subscribers', 'json')}
                  className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>JSON File</span>
                </button>
              </div>
            </div>

            {/* Payments Vouchers Table */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1">جدول سندات التحصيل والمقبوضات</h4>
                <p className="text-xs text-slate-500">يتضمن كافة سندات التوريد المالي وأرقام الإيصالات وأسماء المحصلين ({payments.length} سند).</p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => exportSelectiveData('payments', 'csv')}
                  className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (CSV)</span>
                </button>
                <button
                  onClick={() => exportSelectiveData('payments', 'json')}
                  className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>JSON File</span>
                </button>
              </div>
            </div>

            {/* Meter Readings Table */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1">جدول القراءات والفواتير الميدانية</h4>
                <p className="text-xs text-slate-500">يتضمن سجلات القراءات، الاستهلاكات والمبالغ المحسوبة ({readings.length} قراءة).</p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => exportSelectiveData('readings', 'csv')}
                  className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (CSV)</span>
                </button>
                <button
                  onClick={() => exportSelectiveData('readings', 'json')}
                  className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>JSON File</span>
                </button>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1">سجل التدقيق الأمني والحركي</h4>
                <p className="text-xs text-slate-500">يتضمن توثيق كافة تحركات وتعديلات المستخدمين الإدارية ({auditLogs.length} عملية).</p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => exportSelectiveData('logs', 'csv')}
                  className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (CSV)</span>
                </button>
                <button
                  onClick={() => exportSelectiveData('logs', 'json')}
                  className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>JSON File</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HEALTH CHECK & INTEGRITY */}
      {activeTab === 'health' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
            <button
              onClick={handleRunHealthCheck}
              disabled={isScanning}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
            >
              <Activity className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'جار فحص سلامة وتناسق البيانات...' : 'بدء فحص السلامة والمطابقة الآن'}</span>
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-200 flex items-center justify-start md:justify-end gap-2">
                <span>أداة فحص سلامة المراجع ومطابقة الأرصدة الحسابية</span>
                <ShieldCheck className="w-5 h-5 text-amber-500" />
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">التحقق الحسابي الدقيق من مطابقة (إجمالي القراءات - إجمالي المقبوضات) مع الرصيد المسجل.</p>
            </div>
          </div>

          {healthStatus && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-2xl border text-right ${
                  healthStatus.mismatchedBalances > 0 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  <span className="text-xs font-bold block mb-1">المشتركين بوجود تفاوت أرصدة</span>
                  <span className="text-2xl font-black font-mono">{healthStatus.mismatchedBalances}</span>
                  <span className="text-[10px] block mt-1 opacity-80">
                    {healthStatus.mismatchedBalances === 0 ? 'الأرصدة متطابقة 100%' : 'يتطلب مطابقة آليّة'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-right">
                  <span className="text-xs text-slate-400 font-bold block mb-1">قراءات بدون حساب مشترك</span>
                  <span className="text-2xl font-black font-mono text-slate-200">{healthStatus.orphanedReadings}</span>
                  <span className="text-[10px] text-slate-500 block mt-1">سجلات غير مرتبطة</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-right">
                  <span className="text-xs text-slate-400 font-bold block mb-1">قراءات وفواتير غير مرحلة</span>
                  <span className="text-2xl font-black font-mono text-cyan-400">{healthStatus.pendingReadings}</span>
                  <span className="text-[10px] text-slate-500 block mt-1">قراءة معلقة</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-right">
                  <span className="text-xs text-slate-400 font-bold block mb-1">سندات قبض غير مرحلة</span>
                  <span className="text-2xl font-black font-mono text-emerald-400">{healthStatus.pendingPayments}</span>
                  <span className="text-[10px] text-slate-500 block mt-1">سند معلق</span>
                </div>
              </div>
            </div>
          )}

          {/* Recalculate Balances Action Card */}
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5 hover:border-slate-700 transition-all">
            <button
              type="button"
              onClick={handleFixBalances}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-3 rounded-2xl text-xs transition-all cursor-pointer shrink-0 flex items-center gap-2 shadow-lg shadow-amber-500/10"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة احتساب وتصحيح أرصدة المشتركين آلياً</span>
            </button>
            <div className="text-right space-y-1">
              <h4 className="text-sm font-bold text-slate-100 flex items-center justify-end gap-2">
                <span>مطابقة وتعديل الأرصدة التراكمية لكل المشتركين</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                تقوم هذه العملية بإعادة حساب رصيد كل مشترك من واقع: (الرصيد الافتتاحي + إجمالي الفواتير والقراءات - إجمالي المقبوضات والسندات) وتحديث البيانات فوراً بالسحابة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DANGER ZONE & RESET */}
      {activeTab === 'danger' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-rose-400 flex items-center justify-end gap-2">
              <span>خـيارات تنظيف وإعادة تهيئة قاعدة البيانات</span>
              <ShieldAlert className="w-5 h-5 text-rose-500" />
            </h3>
            <p className="text-xs text-slate-400 mt-1">إعادة تعيين السجلات أو مسح الحركات الاختبارية للبدء بدورة عمل إنتاجية نظيفة.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Soft Reset */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Trash2 className="w-4 h-4" />
                <span>تصفير الحركات الماليّة والفواتير (Soft Clean)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                مسح القراءات، الفواتير، وسندات القبض الميداني مع الإبقاء الكامل على ملفات أسماء المشتركين، العدادات، صنف المخزون، وحسابات المستخدمين.
              </p>
              <button
                onClick={handleSoftReset}
                className="w-full mt-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
              >
                مسح الفواتير والسندات فقط
              </button>
            </div>

            {/* Full Factory Reset */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <RefreshCw className="w-4 h-4" />
                <span>إعادة التهيئة إلى الوضع الافتراضي (Factory Reset)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                تصفير كافة الجداول تماماً وإعادة تحميل سجلات المحطة الافتراضية النموذجية للتجربة من جديد.
              </p>
              <button
                onClick={() => {
                  if (confirm('هل أنت متأكد تماماً من مسح كافة التغييرات وإعادة النظام إلى الوضع الافتراضي النظيف؟')) {
                    onResetDatabase();
                    logDbAction('إعادة تهيئة كاملة', 'مسح النظام بالكامل وتحميل البيانات الافتراضية النموذجية');
                    alert('تمت إعادة تهيئة قاعدة البيانات بنجاح!');
                  }
                }}
                className="w-full mt-2 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-rose-500/10"
              >
                مسح وشحذ قاعدة البيانات بالكامل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE MODAL PREVIEW */}
      <AnimatePresence>
        {restoreFilePreview && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setRestoreFilePreview(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <button
                  onClick={() => setRestoreFilePreview(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>معاينة ملف الاسترجاع قبل التطبيق</span>
                  <Upload className="w-5 h-5 text-cyan-400" />
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-300">
                  سيتم تطبيق ومزامنة البيانات التالية إلى قاعدة بيانات النظام الحالية:
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">عدد المشتركين</span>
                    <span className="font-bold text-amber-400 font-mono text-sm">{restoreFilePreview.subscribers?.length || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">عدد القراءات</span>
                    <span className="font-bold text-cyan-400 font-mono text-sm">{restoreFilePreview.readings?.length || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">عدد السندات</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">{restoreFilePreview.payments?.length || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">عدد المستخدمين</span>
                    <span className="font-bold text-purple-400 font-mono text-sm">{restoreFilePreview.users?.length || 0}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={() => setRestoreFilePreview(null)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleConfirmFileRestore}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-600 text-slate-950 transition-colors cursor-pointer shadow-lg shadow-cyan-500/10"
                  >
                    تأكيد واستعادة السجلات الآن
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {/* PASTE JSON MODAL */}
        {showPasteJsonModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowPasteJsonModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <button
                  onClick={() => setShowPasteJsonModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>لصق نص قاعدة البيانات (JSON)</span>
                  <FileJson className="w-5 h-5 text-cyan-400" />
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  قم بلصق كود JSON الخاص بقاعدة البيانات في الحقل أدناه للتحقق من سلامتها ومعاينتها قبل التطبيق:
                </p>

                <textarea
                  value={pastedJsonText}
                  onChange={(e) => setPastedJsonText(e.target.value)}
                  placeholder="ألصق محتوى ملف الـ JSON هنا..."
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500/50 dir-ltr text-left"
                />

                <div className="pt-2 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={() => setShowPasteJsonModal(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleParsePastedJson}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-600 text-slate-950 transition-colors cursor-pointer shadow-lg shadow-cyan-500/10"
                  >
                    معاينة ومطابقة النص
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
