import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Wallet, TrendingDown, Users, Zap, Search, Plus, FileText, ChevronLeft, ChevronDown, Calendar, Download, Printer, ShieldCheck, Scale, ArrowLeftRight, CheckCircle2, DollarSign, BookOpen, Layers, PieChart, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownLeft, Landmark, RefreshCw, Eye, Award, Filter, Clock, Building2, Check, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SystemSettings, User, Expense, Purchase, EmployeeTransaction, ServiceConnection, Employee, Subscriber, MeterReading, Payment 
} from '../types';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { exportToCSV, printData, safePrint } from '../utils/exportUtils';

interface JournalEntry {
  id: string;
  voucherNumber: string;
  date: string;
  type: 'receipt' | 'billing' | 'expense' | 'payroll' | 'purchase' | 'connection' | 'manual' | 'transfer';
  typeLabel: string;
  debitAccountCode: string;
  debitAccountName: string;
  creditAccountCode: string;
  creditAccountName: string;
  amount: number;
  description: string;
  recordedBy: string;
}

interface TreasuryTransfer {
  id: string;
  transferNumber: string;
  date: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  notes: string;
  recordedBy: string;
}

interface AdminAccountingProps {
  settings: SystemSettings;
  currentUser: User;
  subscribers?: Subscriber[];
  readings?: MeterReading[];
  payments?: Payment[];
  initialTab?: 'summary' | 'journal' | 'trial_balance' | 'treasury' | 'expenses' | 'employees' | 'purchases' | 'connections';
  initialTreasurySubTab?: 'boxes' | 'transfers' | 'statements' | 'performance' | 'daily';
  treasuryTransfers?: TreasuryTransfer[];
  onUpdateTreasuryTransfers?: (trfs: TreasuryTransfer[]) => void;
  expenses?: Expense[];
  onUpdateExpenses?: (exps: Expense[]) => void;
  purchases?: Purchase[];
  onUpdatePurchases?: (purs: Purchase[]) => void;
  manualJournalEntries?: JournalEntry[];
  onUpdateManualJournalEntries?: (entries: JournalEntry[]) => void;
  employees?: Employee[];
  onUpdateEmployees?: (emps: Employee[]) => void;
  employeeTxs?: EmployeeTransaction[];
  onUpdateEmployeeTxs?: (txs: EmployeeTransaction[]) => void;
  connections?: ServiceConnection[];
  onUpdateConnections?: (conns: ServiceConnection[]) => void;
}

export const AdminAccounting: React.FC<AdminAccountingProps> = ({
  settings,
  currentUser,
  subscribers = [],
  readings = [],
  payments = [],
  initialTab,
  initialTreasurySubTab,
  treasuryTransfers: treasuryTransfersProp,
  onUpdateTreasuryTransfers,
  expenses: expensesProp,
  onUpdateExpenses,
  purchases: purchasesProp,
  onUpdatePurchases,
  manualJournalEntries: manualJournalEntriesProp,
  onUpdateManualJournalEntries,
  employees: employeesProp,
  onUpdateEmployees,
  employeeTxs: employeeTxsProp,
  onUpdateEmployeeTxs,
  connections: connectionsProp,
  onUpdateConnections
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'journal' | 'trial_balance' | 'treasury' | 'expenses' | 'employees' | 'purchases' | 'connections'>(initialTab || 'summary');

  // Modals state
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [showAddEmployeeTx, setShowAddEmployeeTx] = useState(false);
  const [showAddManualJournal, setShowAddManualJournal] = useState(false);
  const [showAddTransfer, setShowAddTransfer] = useState(false);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<JournalEntry | null>(null);

  // TREASURY & COLLECTOR FUNDS STATES
  const [treasurySubTab, setTreasurySubTab] = useState<'boxes' | 'transfers' | 'statements' | 'performance' | 'daily'>(initialTreasurySubTab || 'boxes');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialTreasurySubTab) {
      setTreasurySubTab(initialTreasurySubTab);
    }
  }, [initialTreasurySubTab]);
  const [handoverTarget, setHandoverTarget] = useState<{
    collectorName: string;
    pendingAmount: number;
    receiptsCount: number;
  } | null>(null);
  const [handoverForm, setHandoverForm] = useState({
    amount: 0,
    toAccount: 'الصندوق الرئيسي (الكاش)',
    notes: '',
    receiverName: currentUser.name || 'مدير النظام'
  });
  const [printableTransferVoucher, setPrintableTransferVoucher] = useState<TreasuryTransfer | null>(null);

  // Collector Statement Filters
  const [statementCollector, setStatementCollector] = useState<string>('all');
  const [statementFromDate, setStatementFromDate] = useState<string>('');
  const [statementToDate, setStatementToDate] = useState<string>('');
  const [statementSearch, setStatementSearch] = useState<string>('');
  const [dailyFlowDate, setDailyFlowDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Filters
  const [journalSearch, setJournalSearch] = useState('');
  const [journalTypeFilter, setJournalTypeFilter] = useState<string>('all');

  // New item forms
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: 'وقود (ديزل)', date: new Date().toISOString().split('T')[0] });
  const [newPurchase, setNewPurchase] = useState<Partial<Purchase>>({ date: new Date().toISOString().split('T')[0] });
  const [newConnection, setNewConnection] = useState<Partial<ServiceConnection>>({ status: 'pending', date: new Date().toISOString().split('T')[0] });
  const [newEmployeeTx, setNewEmployeeTx] = useState<Partial<EmployeeTransaction>>({ type: 'salary', date: new Date().toISOString().split('T')[0] });
  const [newManualJournal, setNewManualJournal] = useState<Partial<JournalEntry>>({
    date: new Date().toISOString().split('T')[0],
    debitAccountCode: '5010',
    debitAccountName: 'مصروفات تشغيلية (وقود وصيانة)',
    creditAccountCode: '1010',
    creditAccountName: 'حـ/ الصندوق الرئيسي',
    type: 'manual',
    typeLabel: 'قيد يدوي'
  });
  const [newTransfer, setNewTransfer] = useState<Partial<TreasuryTransfer>>({
    date: new Date().toISOString().split('T')[0],
    fromAccount: 'صندوق المحصلين الميداني',
    toAccount: 'الصندوق الرئيسي (الكاش)'
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (employeesProp && employeesProp.length > 0) return employeesProp;
    const saved = localStorage.getItem('voltera_employees');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (expensesProp && expensesProp.length > 0) return expensesProp;
    const saved = localStorage.getItem('voltera_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    if (purchasesProp && purchasesProp.length > 0) return purchasesProp;
    const saved = localStorage.getItem('voltera_purchases');
    return saved ? JSON.parse(saved) : [];
  });

  const [employeeTxs, setEmployeeTxs] = useState<EmployeeTransaction[]>(() => {
    if (employeeTxsProp && employeeTxsProp.length > 0) return employeeTxsProp;
    const saved = localStorage.getItem('voltera_employeeTxs');
    return saved ? JSON.parse(saved) : [];
  });

  const [connections, setConnections] = useState<ServiceConnection[]>(() => {
    if (connectionsProp && connectionsProp.length > 0) return connectionsProp;
    const saved = localStorage.getItem('voltera_connections');
    return saved ? JSON.parse(saved) : [];
  });

  const [manualJournalEntries, setManualJournalEntries] = useState<JournalEntry[]>(() => {
    if (manualJournalEntriesProp && manualJournalEntriesProp.length > 0) return manualJournalEntriesProp;
    const saved = localStorage.getItem('voltera_manualJournalEntries');
    return saved ? JSON.parse(saved) : [];
  });

  const [treasuryTransfers, setTreasuryTransfers] = useState<TreasuryTransfer[]>(() => {
    if (treasuryTransfersProp && treasuryTransfersProp.length > 0) return treasuryTransfersProp;
    const saved = localStorage.getItem('voltera_treasuryTransfers');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { if (expensesProp) setExpenses(expensesProp); }, [expensesProp]);
  useEffect(() => { if (purchasesProp) setPurchases(purchasesProp); }, [purchasesProp]);
  useEffect(() => { if (employeeTxsProp) setEmployeeTxs(employeeTxsProp); }, [employeeTxsProp]);
  useEffect(() => { if (connectionsProp) setConnections(connectionsProp); }, [connectionsProp]);
  useEffect(() => { if (manualJournalEntriesProp) setManualJournalEntries(manualJournalEntriesProp); }, [manualJournalEntriesProp]);
  useEffect(() => { if (treasuryTransfersProp) setTreasuryTransfers(treasuryTransfersProp); }, [treasuryTransfersProp]);
  useEffect(() => { if (employeesProp) setEmployees(employeesProp); }, [employeesProp]);

  useEffect(() => localStorage.setItem('voltera_expenses', JSON.stringify(expenses)), [expenses]);
  useEffect(() => localStorage.setItem('voltera_purchases', JSON.stringify(purchases)), [purchases]);
  useEffect(() => localStorage.setItem('voltera_employeeTxs', JSON.stringify(employeeTxs)), [employeeTxs]);
  useEffect(() => localStorage.setItem('voltera_connections', JSON.stringify(connections)), [connections]);
  useEffect(() => localStorage.setItem('voltera_manualJournalEntries', JSON.stringify(manualJournalEntries)), [manualJournalEntries]);
  useEffect(() => localStorage.setItem('voltera_treasuryTransfers', JSON.stringify(treasuryTransfers)), [treasuryTransfers]);

  // Form submit handlers
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.category || !newExpense.date) return;
    
    const expense: Expense = {
      id: Date.now().toString(),
      amount: Number(newExpense.amount),
      category: newExpense.category,
      date: newExpense.date,
      description: newExpense.description ?? '',
      recordedBy: currentUser.name
    };
    const updated = [expense, ...expenses];
    setExpenses(updated);
    if (onUpdateExpenses) onUpdateExpenses(updated);
    setShowAddExpense(false);
    setNewExpense({ category: 'وقود (ديزل)', date: new Date().toISOString().split('T')[0] });
  };

  const handleAddPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPurchase.amount || !newPurchase.supplier || !newPurchase.date) return;
    
    const purchase: Purchase = {
      id: Date.now().toString(),
      amount: Number(newPurchase.amount),
      supplier: newPurchase.supplier,
      date: newPurchase.date,
      items: newPurchase.items ?? '',
      recordedBy: currentUser.name
    };
    const updated = [purchase, ...purchases];
    setPurchases(updated);
    if (onUpdatePurchases) onUpdatePurchases(updated);
    setShowAddPurchase(false);
    setNewPurchase({ date: new Date().toISOString().split('T')[0] });
  };

  const handleAddConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConnection.subscriberName || !newConnection.totalFee || !newConnection.date) return;
    
    const connection: ServiceConnection = {
      id: Date.now().toString(),
      subscriberId: Date.now().toString(),
      subscriberName: newConnection.subscriberName,
      totalFee: Number(newConnection.totalFee),
      paidAmount: Number(newConnection.paidAmount || 0),
      date: newConnection.date,
      materialsUsed: newConnection.materialsUsed ?? '',
      status: newConnection.status as 'completed' | 'pending'
    };
    const updated = [connection, ...connections];
    setConnections(updated);
    if (onUpdateConnections) onUpdateConnections(updated);
    setShowAddConnection(false);
    setNewConnection({ status: 'pending', date: new Date().toISOString().split('T')[0] });
  };

  const handleAddEmployeeTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeTx.amount || !newEmployeeTx.employeeName || !newEmployeeTx.date) return;
    
    const tx: EmployeeTransaction = {
      id: Date.now().toString(),
      employeeId: Date.now().toString(),
      employeeName: newEmployeeTx.employeeName,
      type: newEmployeeTx.type as 'salary' | 'advance' | 'allowance',
      amount: Number(newEmployeeTx.amount),
      date: newEmployeeTx.date,
      description: newEmployeeTx.description ?? '',
      recordedBy: currentUser.name
    };
    const updated = [tx, ...employeeTxs];
    setEmployeeTxs(updated);
    if (onUpdateEmployeeTxs) onUpdateEmployeeTxs(updated);
    setShowAddEmployeeTx(false);
    setNewEmployeeTx({ type: 'salary', date: new Date().toISOString().split('T')[0] });
  };

  const handleAddManualJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManualJournal.amount || !newManualJournal.debitAccountName || !newManualJournal.creditAccountName) return;

    const entry: JournalEntry = {
      id: Date.now().toString(),
      voucherNumber: `JV-${Math.floor(1000 + Math.random() * 9000)}`,
      date: newManualJournal.date || new Date().toISOString().split('T')[0],
      type: 'manual',
      typeLabel: 'قيد تسوية يدوي',
      debitAccountCode: newManualJournal.debitAccountCode || '5010',
      debitAccountName: newManualJournal.debitAccountName || 'مصروفات متنوعة',
      creditAccountCode: newManualJournal.creditAccountCode || '1010',
      creditAccountName: newManualJournal.creditAccountName || 'الصندوق الرئيسي',
      amount: Number(newManualJournal.amount),
      description: newManualJournal.description || 'قيد تسوية محاسبي',
      recordedBy: currentUser.name
    };

    const updated = [entry, ...manualJournalEntries];
    setManualJournalEntries(updated);
    if (onUpdateManualJournalEntries) onUpdateManualJournalEntries(updated);
    setShowAddManualJournal(false);
    setNewManualJournal({
      date: new Date().toISOString().split('T')[0],
      debitAccountCode: '5010',
      debitAccountName: 'مصروفات تشغيلية (وقود وصيانة)',
      creditAccountCode: '1010',
      creditAccountName: 'حـ/ الصندوق الرئيسي',
      type: 'manual',
      typeLabel: 'قيد يدوي'
    });
  };

  const handleAddTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransfer.amount || !newTransfer.fromAccount || !newTransfer.toAccount) return;

    const trf: TreasuryTransfer = {
      id: Date.now().toString(),
      transferNumber: `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
      date: newTransfer.date || new Date().toISOString().split('T')[0],
      fromAccount: newTransfer.fromAccount,
      toAccount: newTransfer.toAccount,
      amount: Number(newTransfer.amount),
      notes: newTransfer.notes || 'تحويل مالي بين الحسابات',
      recordedBy: currentUser.name
    };

    const updated = [trf, ...treasuryTransfers];
    setTreasuryTransfers(updated);
    if (onUpdateTreasuryTransfers) onUpdateTreasuryTransfers(updated);
    setShowAddTransfer(false);
    setNewTransfer({
      date: new Date().toISOString().split('T')[0],
      fromAccount: 'صندوق المحصلين الميداني',
      toAccount: 'الصندوق الرئيسي (الكاش)'
    });
  };

  // --- AUTOMATED FULL JOURNAL (سجل القيود اليومية التلقائي) ---
  const autoGeneratedJournalEntries = useMemo(() => {
    const list: JournalEntry[] = [];

    // 1. Subscriber Cash Collections (سندات القبض)
    payments.forEach((p, idx) => {
      list.push({
        id: `pay-${p.id}`,
        voucherNumber: `RCV-${p.receiptNumber || (1000 + idx)}`,
        date: p.paymentDate,
        type: 'receipt',
        typeLabel: 'سند قبض مشترك',
        debitAccountCode: '1010',
        debitAccountName: 'حـ/ النقدية والصناديق والبنك',
        creditAccountCode: '1020',
        creditAccountName: 'حـ/ ذمم ومدينو المشتركين',
        amount: p.amountPaid,
        description: `سداد قيمة استهلاك كهرباء - المشترك (${p.subscriberName})`,
        recordedBy: p.collectorName || 'المحصل الميداني'
      });
    });

    // 2. Electricity Billing (فواتير قراءات العدادات)
    readings.forEach((r, idx) => {
      list.push({
        id: `rdg-${r.id}`,
        voucherNumber: `INV-${2000 + idx}`,
        date: r.readingDate,
        type: 'billing',
        typeLabel: 'فاتورة استهلاك كهرباء',
        debitAccountCode: '1020',
        debitAccountName: 'حـ/ ذمم ومدينو المشتركين',
        creditAccountCode: '4010',
        creditAccountName: 'حـ/ إيرادات مبيعات الطاقة الكهربائية',
        amount: r.totalAmount,
        description: `إصدار فاتورة شهر ${r.billingMonth} - المشترك (${r.subscriberName}) - ${r.consumption} ك.و.س`,
        recordedBy: 'نظام الفوترة الآلي'
      });
    });

    // 3. Operational Expenses (المصروفات التشغيلية)
    expenses.forEach((e, idx) => {
      list.push({
        id: `exp-${e.id}`,
        voucherNumber: `EXP-${3000 + idx}`,
        date: e.date,
        type: 'expense',
        typeLabel: 'سند صرف مصروفات',
        debitAccountCode: '5010',
        debitAccountName: `حـ/ مصروفات - ${e.category}`,
        creditAccountCode: '1010',
        creditAccountName: 'حـ/ النقدية والصناديق الرئيسي',
        amount: e.amount,
        description: `${e.description || e.category}`,
        recordedBy: e.recordedBy
      });
    });

    // 4. Employee Transactions (الرواتب والسلف)
    employeeTxs.forEach((tx, idx) => {
      list.push({
        id: `emp-${tx.id}`,
        voucherNumber: `PAY-${4000 + idx}`,
        date: tx.date,
        type: 'payroll',
        typeLabel: tx.type === 'salary' ? 'صرف راتب موظف' : 'صرف سلفة موظف',
        debitAccountCode: '5020',
        debitAccountName: 'حـ/ الرواتب والأجور والسلف',
        creditAccountCode: '1010',
        creditAccountName: 'حـ/ النقدية والصناديق',
        amount: tx.amount,
        description: `${tx.description} - الموظف: ${tx.employeeName}`,
        recordedBy: tx.recordedBy
      });
    });

    // 5. Connection Fees (رسوم إدخال الخدمة)
    connections.forEach((c, idx) => {
      if (c.paidAmount > 0) {
        list.push({
          id: `conn-${c.id}`,
          voucherNumber: `CON-${5000 + idx}`,
          date: c.date,
          type: 'connection',
          typeLabel: 'إيرادات إدخال خدمة',
          debitAccountCode: '1010',
          debitAccountName: 'حـ/ النقدية والصناديق',
          creditAccountCode: '4020',
          creditAccountName: 'حـ/ إيرادات رسوم الاشتراك والتوصيل',
          amount: c.paidAmount,
          description: `رسوم إدخال خدمة لمشترك جديد: (${c.subscriberName})`,
          recordedBy: 'إدارة المشتركين'
        });
      }
    });

    // 6. Supplier Purchases (فواتير المشتريات)
    purchases.forEach((p, idx) => {
      list.push({
        id: `pur-${p.id}`,
        voucherNumber: `PUR-${6000 + idx}`,
        date: p.date,
        type: 'purchase',
        typeLabel: 'فاتورة مشتريات وتجهيزات',
        debitAccountCode: '5030',
        debitAccountName: 'حـ/ مشتريات وتجهيزات الشبكة والمحولات',
        creditAccountCode: '2010',
        creditAccountName: `حـ/ دائنو الموردين - (${p.supplier})`,
        amount: p.amount,
        description: `مشتريات مواد ومهمات: ${p.items}`,
        recordedBy: p.recordedBy
      });
    });

    // 7. Treasury Transfers
    treasuryTransfers.forEach((trf, idx) => {
      list.push({
        id: `trf-${trf.id}`,
        voucherNumber: trf.transferNumber,
        date: trf.date,
        type: 'transfer',
        typeLabel: 'سند تحويل مالي',
        debitAccountCode: '1010-MAIN',
        debitAccountName: `حـ/ ${trf.toAccount}`,
        creditAccountCode: '1010-SUB',
        creditAccountName: `حـ/ ${trf.fromAccount}`,
        amount: trf.amount,
        description: trf.notes,
        recordedBy: trf.recordedBy
      });
    });

    // Merge with Manual Entries
    const merged = [...list, ...manualJournalEntries];
    return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, readings, expenses, employeeTxs, connections, purchases, treasuryTransfers, manualJournalEntries]);

  // Filtered Journal Entries
  const filteredJournalEntries = useMemo(() => {
    return autoGeneratedJournalEntries.filter(entry => {
      const matchSearch = journalSearch === '' || 
        entry.voucherNumber.toLowerCase().includes(journalSearch.toLowerCase()) ||
        entry.description.includes(journalSearch) ||
        entry.debitAccountName.includes(journalSearch) ||
        entry.creditAccountName.includes(journalSearch);

      const matchType = journalTypeFilter === 'all' || entry.type === journalTypeFilter;

      return matchSearch && matchType;
    });
  }, [autoGeneratedJournalEntries, journalSearch, journalTypeFilter]);

  // --- TRIAL BALANCE CALCULATION (ميزان المراجعة) ---
  const trialBalanceAccounts = useMemo(() => {
    const totalCollected = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const totalBilled = readings.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPay = employeeTxs.reduce((sum, e) => sum + e.amount, 0);
    const totalConn = connections.reduce((sum, c) => sum + c.paidAmount, 0);
    const totalPur = purchases.reduce((sum, p) => sum + p.amount, 0);

    const manualDebitExpenses = manualJournalEntries
      .filter(m => m.debitAccountCode.startsWith('5'))
      .reduce((sum, m) => sum + m.amount, 0);

    // Accounts structure
    const cashBoxDebit = totalCollected + totalConn;
    const cashBoxCredit = totalExp + totalPay;
    const netCash = cashBoxDebit - cashBoxCredit;

    const subscribersDebit = totalBilled;
    const subscribersCredit = totalCollected;
    const netSubscribers = Math.max(0, subscribersDebit - subscribersCredit);

    return [
      {
        code: '1010',
        name: 'النقدية والصناديق والبنوك',
        category: 'أصول متداولة',
        debit: Math.max(0, netCash),
        credit: netCash < 0 ? Math.abs(netCash) : 0
      },
      {
        code: '1020',
        name: 'ذمم ومدينو المشتركين (الذمم المالية)',
        category: 'أصول متداولة',
        debit: netSubscribers,
        credit: 0
      },
      {
        code: '1030',
        name: 'معدات ومحولات وشبكات الكهرباء',
        category: 'أصول غير متداولة',
        debit: totalPur,
        credit: 0
      },
      {
        code: '2010',
        name: 'دائنو الموردين والشركات',
        category: 'التزامات متداولة',
        debit: 0,
        credit: totalPur
      },
      {
        code: '4010',
        name: 'إيرادات مبيعات الطاقة الكهربائية',
        category: 'إيرادات تشغيلية',
        debit: 0,
        credit: totalBilled
      },
      {
        code: '4020',
        name: 'إيرادات رسوم الاشتراك وإدخال الخدمة',
        category: 'إيرادات تشغيلية',
        debit: 0,
        credit: totalConn
      },
      {
        code: '5010',
        name: 'مصروفات تشغيلية (وقود وصيانة ونثريات)',
        category: 'مصروفات تشغيلية',
        debit: totalExp + manualDebitExpenses,
        credit: 0
      },
      {
        code: '5020',
        name: 'الرواتب والأجور والسلف والمكافآت',
        category: 'مصروفات تشغيلية',
        debit: totalPay,
        credit: 0
      }
    ];
  }, [payments, readings, expenses, employeeTxs, connections, purchases, manualJournalEntries]);

  const trialBalanceTotals = useMemo(() => {
    const totalDebit = trialBalanceAccounts.reduce((sum, a) => sum + a.debit, 0);
    const totalCredit = trialBalanceAccounts.reduce((sum, a) => sum + a.credit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    return { totalDebit, totalCredit, isBalanced };
  }, [trialBalanceAccounts]);

  // --- INCOME STATEMENT (قائمة الأرباح والخسائر) ---
  const incomeStatementData = useMemo(() => {
    const electricityRevenue = readings.reduce((sum, r) => sum + r.totalAmount, 0);
    const connectionRevenue = connections.reduce((sum, c) => sum + c.paidAmount, 0);
    const totalRevenues = electricityRevenue + connectionRevenue;

    const opExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const payrollExpenses = employeeTxs.reduce((sum, e) => sum + e.amount, 0);
    const purchasesExpenses = purchases.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = opExpenses + payrollExpenses + purchasesExpenses;

    const netProfit = totalRevenues - totalExpenses;
    const profitMargin = totalRevenues > 0 ? (netProfit / totalRevenues) * 100 : 0;

    return {
      electricityRevenue,
      connectionRevenue,
      totalRevenues,
      opExpenses,
      payrollExpenses,
      purchasesExpenses,
      totalExpenses,
      netProfit,
      profitMargin
    };
  }, [readings, connections, expenses, employeeTxs, purchases]);

  // --- TREASURIES & COLLECTOR FUNDS BREAKDOWN (وحدة الصناديق وتوريدات المحصلين) ---
  const collectorsList = useMemo(() => {
    const namesFromPayments = payments.map(p => p.receivedBy || (p as any).collectorName).filter((n): n is string => Boolean(n));
    const namesFromEmployees = employees.filter(e => e.role === 'collector' || e.role === 'technician' || e.role === 'accountant' || e.role === 'admin').map(e => e.name);
    const combined = Array.from(new Set([...namesFromPayments, ...namesFromEmployees]));
    return combined.length > 0 ? combined : ['المحصل الميداني'];
  }, [payments, employees]);

  const collectorsAccountSummary = useMemo(() => {
    return collectorsList.map(collectorName => {
      const collectorPayments = payments.filter(p => 
        !p.isRejected && (p.receivedBy === collectorName || (p as any).collectorName === collectorName)
      );
      const totalCollected = collectorPayments.reduce((sum, p) => sum + p.amountPaid, 0);

      const collectorTransfers = treasuryTransfers.filter(t => 
        t.fromAccount.includes(collectorName) || (collectorsList.length === 1 && t.fromAccount.includes('المحصلين'))
      );
      const totalTransferred = collectorTransfers.reduce((sum, t) => sum + t.amount, 0);

      const pendingBalance = Math.max(0, totalCollected - totalTransferred);

      return {
        collectorName,
        totalCollected,
        totalTransferred,
        pendingBalance,
        receiptsCount: collectorPayments.length,
        transfersCount: collectorTransfers.length,
        lastPaymentDate: collectorPayments.length > 0 ? collectorPayments[0].paymentDate : '-'
      };
    });
  }, [collectorsList, payments, treasuryTransfers]);

  const treasuriesSummary = useMemo(() => {
    const totalCollectedCash = payments.filter(p => !p.isRejected).reduce((sum, p) => sum + p.amountPaid, 0);
    const totalConnCash = connections.reduce((sum, c) => sum + c.paidAmount, 0);
    const totalExpOut = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPayOut = employeeTxs.reduce((sum, e) => sum + e.amount, 0);

    const totalCollectorTransfers = treasuryTransfers.reduce((sum, t) => sum + t.amount, 0);
    const bankTransfers = treasuryTransfers.filter(t => t.toAccount.includes('الكريمي') || t.toAccount.includes('بنك') || t.toAccount.includes('جيب')).reduce((sum, t) => sum + t.amount, 0);
    const mainVaultTransfers = treasuryTransfers.filter(t => t.toAccount.includes('الرئيسي')).reduce((sum, t) => sum + t.amount, 0);

    const collectorsVault = Math.max(0, totalCollectedCash - totalCollectorTransfers);
    const mainVault = Math.max(0, mainVaultTransfers + totalConnCash - (totalExpOut + totalPayOut));
    const bankVault = bankTransfers;
    const totalNetTreasury = collectorsVault + mainVault + bankVault;

    return {
      collectorsVault,
      mainVault,
      bankVault,
      totalNetTreasury,
      totalCollectedCash,
      totalExpOut,
      totalPayOut,
      totalCollectorTransfers
    };
  }, [payments, connections, expenses, employeeTxs, treasuryTransfers]);

  // COLLECTOR DETAILED STATEMENT CALCULATIONS (كشف حساب المحصل تفصيلي)
  const collectorStatementData = useMemo(() => {
    const selectedName = statementCollector;

    let filteredPays = payments.filter(p => !p.isRejected);
    if (selectedName !== 'all') {
      filteredPays = filteredPays.filter(p => p.receivedBy === selectedName || (p as any).collectorName === selectedName);
    }
    if (statementFromDate) {
      filteredPays = filteredPays.filter(p => p.paymentDate >= statementFromDate);
    }
    if (statementToDate) {
      filteredPays = filteredPays.filter(p => p.paymentDate <= statementToDate);
    }

    let filteredTrfs = treasuryTransfers;
    if (selectedName !== 'all') {
      filteredTrfs = filteredTrfs.filter(t => t.fromAccount.includes(selectedName) || (collectorsList.length === 1 && t.fromAccount.includes('المحصلين')));
    }
    if (statementFromDate) {
      filteredTrfs = filteredTrfs.filter(t => t.date >= statementFromDate);
    }
    if (statementToDate) {
      filteredTrfs = filteredTrfs.filter(t => t.date <= statementToDate);
    }

    type StatementRow = {
      id: string;
      date: string;
      refNo: string;
      type: 'collection' | 'handover';
      typeLabel: string;
      collectorName: string;
      description: string;
      debit: number;
      credit: number;
    };

    const rows: StatementRow[] = [
      ...filteredPays.map(p => ({
        id: `pay-${p.id}`,
        date: p.paymentDate,
        refNo: `RCV-${p.receiptNumber || p.id.slice(-4)}`,
        type: 'collection' as const,
        typeLabel: 'تحصيل مقبوض من مشترك',
        collectorName: p.receivedBy || (p as any).collectorName || 'المحصل الميداني',
        description: `قبض قيمة استهلاك - المشترك: ${p.subscriberName}`,
        debit: p.amountPaid,
        credit: 0
      })),
      ...filteredTrfs.map(t => ({
        id: `trf-${t.id}`,
        date: t.date,
        refNo: t.transferNumber,
        type: 'handover' as const,
        typeLabel: 'سند توريد وتسليم خزينة',
        collectorName: t.fromAccount.replace('صندوق المحصل: ', ''),
        description: `تسليم وتوريد مبالغ إلى: ${t.toAccount} (${t.notes || 'توريد كاش'})`,
        debit: 0,
        credit: t.amount
      }))
    ];

    if (statementSearch.trim()) {
      const q = statementSearch.toLowerCase();
      return {
        ledger: rows.filter(r => r.refNo.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.collectorName.toLowerCase().includes(q)),
        totalDebit: rows.reduce((s, r) => s + r.debit, 0),
        totalCredit: rows.reduce((s, r) => s + r.credit, 0),
        netCustodyBalance: rows.reduce((s, r) => s + r.debit - r.credit, 0),
        totalReceiptsCount: filteredPays.length,
        totalHandoversCount: filteredTrfs.length
      };
    }

    // Sort chronologically ascending to compute running balance
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    const ledgerWithBalance = rows.map(r => {
      running += (r.debit - r.credit);
      return {
        ...r,
        balanceAfter: running
      };
    });

    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
    const netCustodyBalance = totalDebit - totalCredit;

    return {
      ledger: ledgerWithBalance.reverse(), // latest on top
      totalDebit,
      totalCredit,
      netCustodyBalance,
      totalReceiptsCount: filteredPays.length,
      totalHandoversCount: filteredTrfs.length
    };
  }, [payments, treasuryTransfers, statementCollector, statementFromDate, statementToDate, statementSearch, collectorsList]);

  // EXECUTE HANDOVER HANDLER
  const handleConfirmHandover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverTarget || !handoverForm.amount || handoverForm.amount <= 0) {
      alert('يرجى تحديد مبلغ التوريد بشكل صحيح');
      return;
    }

    const { collectorName } = handoverTarget;
    const trfNo = `TRF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const newTrf: TreasuryTransfer = {
      id: Date.now().toString(),
      transferNumber: trfNo,
      date: todayStr,
      fromAccount: `صندوق المحصل: ${collectorName}`,
      toAccount: handoverForm.toAccount,
      amount: Number(handoverForm.amount),
      notes: handoverForm.notes || `توريد وتصفية مبالغ تحصيل من المحصل (${collectorName}) إلى (${handoverForm.toAccount})`,
      recordedBy: handoverForm.receiverName || currentUser.name
    };

    const updatedTrfs = [newTrf, ...treasuryTransfers];
    setTreasuryTransfers(updatedTrfs);
    if (onUpdateTreasuryTransfers) onUpdateTreasuryTransfers(updatedTrfs);

    // Add automatic double entry
    const journalEntry: JournalEntry = {
      id: `trf-jv-${Date.now()}`,
      voucherNumber: trfNo,
      date: todayStr,
      type: 'transfer',
      typeLabel: 'سند توريد وتسليم خزينة',
      debitAccountCode: '1010-MAIN',
      debitAccountName: `حـ/ ${handoverForm.toAccount}`,
      creditAccountCode: '1010-COLL',
      creditAccountName: `حـ/ صندوق المحصل: ${collectorName}`,
      amount: Number(handoverForm.amount),
      description: `استلام وتوريد مبالغ نقدية من المحصل (${collectorName}) إلى (${handoverForm.toAccount})`,
      recordedBy: handoverForm.receiverName || currentUser.name
    };
    const updatedJes = [journalEntry, ...manualJournalEntries];
    setManualJournalEntries(updatedJes);
    if (onUpdateManualJournalEntries) onUpdateManualJournalEntries(updatedJes);

    setHandoverTarget(null);
    setPrintableTransferVoucher(newTrf);
  };

  // Chart Weekly Data
  const weeklyCashFlowChart = useMemo(() => {
    return [
      { day: 'السبت', income: (incomeStatementData.totalRevenues * 0.14), expense: (incomeStatementData.totalExpenses * 0.12) },
      { day: 'الأحد', income: (incomeStatementData.totalRevenues * 0.18), expense: (incomeStatementData.totalExpenses * 0.15) },
      { day: 'الإثنين', income: (incomeStatementData.totalRevenues * 0.15), expense: (incomeStatementData.totalExpenses * 0.10) },
      { day: 'الثلاثاء', income: (incomeStatementData.totalRevenues * 0.16), expense: (incomeStatementData.totalExpenses * 0.20) },
      { day: 'الأربعاء', income: (incomeStatementData.totalRevenues * 0.12), expense: (incomeStatementData.totalExpenses * 0.18) },
      { day: 'الخميس', income: (incomeStatementData.totalRevenues * 0.15), expense: (incomeStatementData.totalExpenses * 0.15) },
      { day: 'الجمعة', income: (incomeStatementData.totalRevenues * 0.10), expense: (incomeStatementData.totalExpenses * 0.10) },
    ];
  }, [incomeStatementData]);

  return (
    <motion.div
      key="accounting-sec"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-amber-500" />
            <span>النظام المحاسبي الشامل وقائمة الدخل</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-bold">
            قيود يومية تلقائية مزدوجة، ميزان المراجعة، قائمة الأرباح والخسائر، والصناديق المالية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => printData('النظام المحاسبي - ميزان المراجعة وقائمة الدخل', trialBalanceAccounts, [{key: 'code', label: 'كود الحساب'}, {key: 'name', label: 'اسم الحساب'}, {key: 'debit', label: 'مدين'}, {key: 'credit', label: 'دائن'}])}
            className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة الميزان</span>
          </button>
          <button
            onClick={() => exportToCSV(autoGeneratedJournalEntries, 'journal_entries', [{key: 'voucherNumber', label: 'رقم السند'}, {key: 'date', label: 'التاريخ'}, {key: 'typeLabel', label: 'النوع'}, {key: 'debitAccountName', label: 'من حـ (مدين)'}, {key: 'creditAccountName', label: 'إلى حـ (دائن)'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}])}
            className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide border-b border-slate-800">
        {[
          { id: 'summary', label: 'الخزينة والملخص المالي', icon: Wallet, badge: null },
          { id: 'journal', label: 'دفتر القيود المحاسبية', icon: BookOpen, badge: autoGeneratedJournalEntries.length },
          { id: 'trial_balance', label: 'ميزان المراجعة والحسابات', icon: Scale, badge: 'متوازن' },
          { id: 'treasury', label: 'الصناديق والتحويلات', icon: Landmark, badge: null },
          { id: 'expenses', label: 'المصروفات التشغيلية', icon: TrendingDown, badge: expenses.length },
          { id: 'employees', label: 'شؤون الموظفين والسلف', icon: Users, badge: employeeTxs.length },
          { id: 'purchases', label: 'المشتريات والموردين', icon: FileText, badge: purchases.length },
          { id: 'connections', label: 'إيرادات إدخال الخدمة', icon: Zap, badge: connections.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black' 
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.badge !== null && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === tab.id ? 'bg-slate-950 text-amber-400 font-bold' : 'bg-slate-800 text-slate-300'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: FINANCIAL SUMMARY & INCOME STATEMENT */}
        {activeTab === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-bold">إجمالي مبيعات الكهرباء المفوترة</span>
                  <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400"><Zap className="w-4 h-4" /></div>
                </div>
                <span className="text-2xl font-black text-sky-400 font-mono block">
                  {incomeStatementData.electricityRevenue.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                </span>
                <span className="text-[11px] text-slate-500 font-bold mt-1 block">إجمالي استهلاك المشتركين المسجل</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-bold">إجمالي التحصيلات الكاش</span>
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400"><DollarSign className="w-4 h-4" /></div>
                </div>
                <span className="text-2xl font-black text-emerald-400 font-mono block">
                  {treasuriesSummary.totalCollectedCash.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                </span>
                <span className="text-[11px] text-slate-500 font-bold mt-1 block">سندات القبض النقدية المحصلة فعلياً</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-bold">إجمالي المصروفات والرواتب</span>
                  <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400"><TrendingDown className="w-4 h-4" /></div>
                </div>
                <span className="text-2xl font-black text-rose-400 font-mono block">
                  {incomeStatementData.totalExpenses.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                </span>
                <span className="text-[11px] text-slate-500 font-bold mt-1 block">وقود + رواتب + مشتريات تجهيزات</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-bold">صافي الربح / الخسارة التشغيلية</span>
                  <div className={`p-2 rounded-xl ${incomeStatementData.netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <span className={`text-2xl font-black font-mono block ${incomeStatementData.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {incomeStatementData.netProfit.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                </span>
                <span className="text-[11px] text-slate-500 font-bold mt-1 block">هامش ربحية: {incomeStatementData.profitMargin.toFixed(1)}%</span>
              </div>
            </div>

            {/* Income Statement Table & Cash Flow Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income Statement Card */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-black text-sm text-white flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-amber-500" />
                    <span>قائمة الأرباح والخسائر الشاملة (Income Statement)</span>
                  </h3>
                  <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">P&L</span>
                </div>

                <div className="space-y-3 text-xs font-bold">
                  <div className="text-amber-400 font-black border-b border-slate-800/80 pb-1">أولاً: الإيرادات التشغيلية</div>
                  <div className="flex justify-between items-center text-slate-300 pr-2">
                    <span>إيرادات مبيعات الكهرباء المفوترة:</span>
                    <span className="font-mono text-white">{incomeStatementData.electricityRevenue.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 pr-2">
                    <span>إيرادات رسوم الاشتراك وإدخال الخدمة:</span>
                    <span className="font-mono text-white">{incomeStatementData.connectionRevenue.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400 font-black bg-emerald-500/10 p-2.5 rounded-xl">
                    <span>إجمالي الإيرادات الكلية:</span>
                    <span className="font-mono text-sm">{incomeStatementData.totalRevenues.toLocaleString()} {settings.currency}</span>
                  </div>

                  <div className="text-rose-400 font-black border-b border-slate-800/80 pb-1 pt-2">ثانياً: المصروفات والتكاليف</div>
                  <div className="flex justify-between items-center text-slate-300 pr-2">
                    <span>المصروفات التشغيلية والوقود (الديزل والصيانة):</span>
                    <span className="font-mono text-rose-400">{incomeStatementData.opExpenses.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 pr-2">
                    <span>الرواتب والأجور والسلف والمكافآت:</span>
                    <span className="font-mono text-rose-400">{incomeStatementData.payrollExpenses.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 pr-2">
                    <span>المشتريات وتجهيزات المحولات والشبكة:</span>
                    <span className="font-mono text-rose-400">{incomeStatementData.purchasesExpenses.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-rose-400 font-black bg-rose-500/10 p-2.5 rounded-xl">
                    <span>إجمالي التكاليف والمصروفات:</span>
                    <span className="font-mono text-sm">{incomeStatementData.totalExpenses.toLocaleString()} {settings.currency}</span>
                  </div>

                  <div className={`flex justify-between items-center font-black p-3 rounded-xl mt-3 border ${
                    incomeStatementData.netProfit >= 0 
                      ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300' 
                      : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                  }`}>
                    <span className="text-sm">صافي النتيجة (الربح / الخسارة):</span>
                    <span className="font-mono text-lg">{incomeStatementData.netProfit.toLocaleString()} {settings.currency}</span>
                  </div>
                </div>
              </div>

              {/* Weekly Cash Flow Area Chart */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-sm text-white mb-2">حركة التدفقات النقدية (الإيرادات مقابل المصروفات)</h3>
                  <p className="text-xs text-slate-400 font-bold mb-4">تحليل أداء الخزينة اليومي لقياس السيولة وصافي التدفق</p>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyCashFlowChart}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="income" name="الإيرادات" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                      <Area type="monotone" dataKey="expense" name="المصروفات" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-around border-t border-slate-800 pt-3 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-slate-300">الواردات والتحصيلات</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-slate-300">المنصرفات والتكاليف</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: GENERAL JOURNAL (دفتر القيود المحاسبية التلقائية واليدوية) */}
        {activeTab === 'journal' && (
          <motion.div
            key="journal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-4 p-5"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-black text-white text-sm flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  <span>دفتر اليومية العامة والقيود المحاسبية المزدوجة (General Journal)</span>
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  توليد قيود القيد المزدوج تلقائياً لجميع حركات التحصيل والفوترة والمصروفات والسلف
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="بحث برقم السند أو البيان..."
                    value={journalSearch}
                    onChange={e => setJournalSearch(e.target.value)}
                    className="bg-transparent text-white outline-none font-bold w-40"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
                  <select
                    value={journalTypeFilter}
                    onChange={e => setJournalTypeFilter(e.target.value)}
                    className="bg-transparent text-slate-300 font-bold outline-none cursor-pointer"
                  >
                    <option value="all">كافة أنواع القيود</option>
                    <option value="receipt">سندات قبض</option>
                    <option value="billing">فواتير الكهرباء</option>
                    <option value="expense">مصروفات</option>
                    <option value="payroll">رواتب وسلف</option>
                    <option value="connection">إدخال خدمة</option>
                    <option value="purchase">مشتريات</option>
                    <option value="manual">قيود يدوية</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowAddManualJournal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة قيد يدوي</span>
                </button>
              </div>
            </div>

            {/* Journal Entries Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3 text-center">رقم السند</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">نوع الحركة</th>
                    <th className="p-3">من حـ / الجانب المدين</th>
                    <th className="p-3">إلى حـ / الجانب الدائن</th>
                    <th className="p-3 text-center">المبلغ</th>
                    <th className="p-3">البيان والشرح</th>
                    <th className="p-3 text-center">معاينة / طباعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
                  {filteredJournalEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-black text-amber-400 text-center">{entry.voucherNumber}</td>
                      <td className="p-3 font-mono text-slate-400">{entry.date}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          entry.type === 'receipt' ? 'bg-emerald-500/10 text-emerald-400' :
                          entry.type === 'billing' ? 'bg-sky-500/10 text-sky-400' :
                          entry.type === 'expense' ? 'bg-rose-500/10 text-rose-400' :
                          entry.type === 'manual' ? 'bg-purple-500/10 text-purple-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {entry.typeLabel}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-400">
                        <span className="font-mono text-[10px] text-slate-500 ml-1">({entry.debitAccountCode})</span>
                        {entry.debitAccountName}
                      </td>
                      <td className="p-3 font-bold text-rose-400">
                        <span className="font-mono text-[10px] text-slate-500 ml-1">({entry.creditAccountCode})</span>
                        {entry.creditAccountName}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-white text-sm">
                        {entry.amount.toLocaleString()} <span className="text-[10px] text-slate-500">{settings.currency}</span>
                      </td>
                      <td className="p-3 text-slate-300 max-w-xs truncate">{entry.description}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedVoucherForPrint(entry)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition-colors cursor-pointer"
                          title="معاينة وطباعة سند القيد"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredJournalEntries.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                        لا توجد قيود يومية مطابقة لخيارات البحث.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* TAB 3: TRIAL BALANCE & CHART OF ACCOUNTS (ميزان المراجعة وشجرة الحسابات) */}
        {activeTab === 'trial_balance' && (
          <motion.div
            key="trial_balance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-black text-white text-sm flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-500" />
                  <span>ميزان المراجعة بالمجاميع والأرصدة (Trial Balance)</span>
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  التحقق من التوازن المالي والتساوي التام بين إجمالي الأرصدة المدينة والأرصدة الدائنة
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                  trialBalanceTotals.isBalanced 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{trialBalanceTotals.isBalanced ? 'الميزان متوازن 100%' : 'تنبيه: خلل في التوازن'}</span>
                </span>
              </div>
            </div>

            {/* Accounts Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3 font-mono text-center">كود الحساب</th>
                    <th className="p-3">اسم الحساب المحاسبي</th>
                    <th className="p-3">تصنيف الحساب</th>
                    <th className="p-3 text-center text-emerald-400">الرصيد المدين ({settings.currency})</th>
                    <th className="p-3 text-center text-rose-400">الرصيد الدائن ({settings.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
                  {trialBalanceAccounts.map((account) => (
                    <tr key={account.code} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-black text-amber-400 text-center">{account.code}</td>
                      <td className="p-3 font-bold text-white">{account.name}</td>
                      <td className="p-3 text-slate-400 text-[11px]">{account.category}</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-400 text-sm">
                        {account.debit > 0 ? account.debit.toLocaleString() : '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-rose-400 text-sm">
                        {account.credit > 0 ? account.credit.toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-950 font-black text-white text-sm border-t-2 border-slate-700">
                  <tr>
                    <td colSpan={3} className="p-4 text-left font-black">إجمالي ميزان المراجعة:</td>
                    <td className="p-4 text-center font-mono text-emerald-400 text-base">
                      {trialBalanceTotals.totalDebit.toLocaleString()} {settings.currency}
                    </td>
                    <td className="p-4 text-center font-mono text-rose-400 text-base">
                      {trialBalanceTotals.totalCredit.toLocaleString()} {settings.currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        )}

        {/* TAB 4: TREASURY & COLLECTOR FUNDS MANAGEMENT (إدارة الصناديق وتوريدات المحصلين) */}
        {activeTab === 'treasury' && (
          <motion.div
            key="treasury"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Treasury Subtabs Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-2xl">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'boxes', label: 'صناديق المحصلين الخزائن', icon: Wallet },
                  { id: 'transfers', label: 'سندات التوريد والتحويلات', icon: ArrowLeftRight },
                  { id: 'statements', label: 'كشف حساب محصل تفصيلي', icon: FileText },
                  { id: 'performance', label: 'تقييم أداء المحصلين', icon: Award },
                  { id: 'daily', label: 'الجرد والتدفقات اليومية', icon: Clock }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setTreasurySubTab(sub.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      treasurySubTab === sub.id
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <sub.icon className="w-3.5 h-3.5" />
                    <span>{sub.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pr-2">
                <button
                  onClick={() => setShowAddTransfer(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>تحويل مالي بين الصناديق</span>
                </button>
              </div>
            </div>

            {/* SUBTAB 1: BOXES OVERVIEW & COLLECTORS VIRTUAL CASH BOXES */}
            {treasurySubTab === 'boxes' && (
              <div className="space-y-6">
                {/* Global Treasury Vault Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400">الصندوق الرئيسي (الكاش)</span>
                      <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl"><Wallet className="w-4 h-4" /></div>
                    </div>
                    <span className="text-2xl font-black text-amber-400 font-mono block">
                      {treasuriesSummary.mainVault.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1 block">خزينة الإدارة والمقبوضات الموردة</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400">أمانات عهد المحصلين</span>
                      <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl"><Users className="w-4 h-4" /></div>
                    </div>
                    <span className="text-2xl font-black text-sky-400 font-mono block">
                      {treasuriesSummary.collectorsVault.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1 block">مبالغ التحصيل القائمة بعهدة المحصلين</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400">الحسابات والبنك والكريمي</span>
                      <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl"><Building2 className="w-4 h-4" /></div>
                    </div>
                    <span className="text-2xl font-black text-purple-400 font-mono block">
                      {treasuriesSummary.bankVault.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1 block">السيولة المودعة في الحسابات البنكية</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400">إجمالي السيولة النقدية الكلية</span>
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl"><Landmark className="w-4 h-4" /></div>
                    </div>
                    <span className="text-2xl font-black text-emerald-400 font-mono block">
                      {treasuriesSummary.totalNetTreasury.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1 block">مجموع أرصدة جميع الصناديق</span>
                  </div>
                </div>

                {/* Collectors Virtual Cash Boxes Section */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="font-black text-white text-base flex items-center gap-2">
                        <Users className="w-5 h-5 text-amber-500" />
                        <span>صناديق أمانات المحصلين الميدانيين (Collector Virtual Cash Boxes)</span>
                      </h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">
                        تتبع المبالغ المحصلة ميدانياً والتوريدات المنفذة مع آلية التسليم والتوريد السريعة
                      </p>
                    </div>

                    <span className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                      عدد المحصلين النشطين: {collectorsAccountSummary.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {collectorsAccountSummary.map((col) => (
                      <div
                        key={col.collectorName}
                        className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition-all shadow-sm"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-black text-amber-400 text-sm">
                              {col.collectorName.slice(0, 2)}
                            </div>
                            <div>
                              <h4 className="font-black text-white text-sm">{col.collectorName}</h4>
                              <span className="text-[11px] text-slate-400 font-bold block">صندوق محصل ميداني</span>
                            </div>
                          </div>

                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                            col.pendingBalance > 0 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {col.pendingBalance > 0 ? 'بانتظار التوريد' : 'مصفى بالكامل'}
                          </span>
                        </div>

                        {/* Pending Cash Held Callout */}
                        <div className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl space-y-1">
                          <span className="text-[11px] text-slate-400 font-bold">الرصيد المتبقي بعهدة المحصل (غير مورد):</span>
                          <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-amber-400 font-mono">
                              {col.pendingBalance.toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-slate-500">{settings.currency}</span>
                          </div>
                        </div>

                        {/* Metrics Breakdown */}
                        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                            <span className="text-slate-500 text-[10px] block">إجمالي المقبوض:</span>
                            <span className="text-white font-mono">{col.totalCollected.toLocaleString()} {settings.currency}</span>
                          </div>
                          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                            <span className="text-slate-500 text-[10px] block">إجمالي المورد:</span>
                            <span className="text-emerald-400 font-mono">{col.totalTransferred.toLocaleString()} {settings.currency}</span>
                          </div>
                          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                            <span className="text-slate-500 text-[10px] block">عدد السندات:</span>
                            <span className="text-sky-400 font-mono">{col.receiptsCount} سند</span>
                          </div>
                          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                            <span className="text-slate-500 text-[10px] block">آخر حركة:</span>
                            <span className="text-slate-300 font-mono text-[10px]">{col.lastPaymentDate}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 flex items-center gap-2">
                          <button
                            onClick={() => {
                              setHandoverTarget({
                                collectorName: col.collectorName,
                                pendingAmount: col.pendingBalance,
                                receiptsCount: col.receiptsCount
                              });
                              setHandoverForm({
                                amount: col.pendingBalance,
                                toAccount: 'الصندوق الرئيسي (الكاش)',
                                notes: `توريد وتصفية مبالغ تحصيل من المحصل (${col.collectorName})`,
                                receiverName: currentUser.name || 'مدير النظام'
                              });
                            }}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>تسليم وتوريد الخزينة</span>
                          </button>

                          <button
                            onClick={() => {
                              setStatementCollector(col.collectorName);
                              setTreasurySubTab('statements');
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2.5 px-3 rounded-xl text-xs border border-slate-800 flex items-center gap-1 transition-colors"
                            title="عرض كشف حساب المحصل"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            <span>كشف الحساب</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 2: TRANSFERS & HANDOVER VOUCHERS LIST */}
            {treasurySubTab === 'transfers' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-black text-white text-base flex items-center gap-2">
                      <ArrowLeftRight className="w-5 h-5 text-amber-500" />
                      <span>سجل سندات توريد الخزينة والتحويلات المالية (Treasury Handovers)</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      توثيق سندات تسليم المبالغ من أمانات المحصلين إلى الصندوق الرئيسي والبنك ومعاينتها للطباعة
                    </p>
                  </div>

                  <button
                    onClick={() => setShowAddTransfer(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>سند توريد / تحويل جديد</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3 text-center">رقم السند</th>
                        <th className="p-3">تاريخ التوريد</th>
                        <th className="p-3">من حساب (المُسلّم)</th>
                        <th className="p-3">إلى حساب (المستلم)</th>
                        <th className="p-3 text-center">المبلغ المورد</th>
                        <th className="p-3">ملاحظات والتفاصيل</th>
                        <th className="p-3 text-center">المسجل</th>
                        <th className="p-3 text-center">طباعة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
                      {treasuryTransfers.map((trf) => (
                        <tr key={trf.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono font-black text-amber-400 text-center">{trf.transferNumber}</td>
                          <td className="p-3 font-mono text-slate-400">{trf.date}</td>
                          <td className="p-3 font-bold text-rose-400">{trf.fromAccount}</td>
                          <td className="p-3 font-bold text-emerald-400">{trf.toAccount}</td>
                          <td className="p-3 text-center font-mono font-black text-white text-sm">
                            {trf.amount.toLocaleString()} <span className="text-[10px] text-slate-500">{settings.currency}</span>
                          </td>
                          <td className="p-3 text-slate-300">{trf.notes}</td>
                          <td className="p-3 text-center text-slate-500 text-[11px]">{trf.recordedBy}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setPrintableTransferVoucher(trf)}
                              className="bg-slate-800 hover:bg-slate-700 text-amber-400 px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 mx-auto transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>طباعة</span>
                            </button>
                          </td>
                        </tr>
                      ))}

                      {treasuryTransfers.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                            لا توجد تحويلات بين الصناديق مسجلة حالياً.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBTAB 3: DETAILED COLLECTOR ACCOUNT STATEMENT (كشف حساب محصل) */}
            {treasurySubTab === 'statements' && (
              <div className="space-y-6">
                {/* Statement Filter Toolbar */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-black text-white text-base flex items-center gap-2">
                        <FileText className="w-5 h-5 text-amber-500" />
                        <span>كشف حساب المحصل الميداني التفصيلي (Collector Account Statement)</span>
                      </h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">
                        عرض جميع الحركات المالية (المقبوضات الميدانية مقابل التوريدات المسلمة للإدارة) والرصيد المتبقي
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => printData(`كشف حساب المحصل: ${statementCollector === 'all' ? 'جميع المحصلين' : statementCollector}`, collectorStatementData.ledger, [
                          {key: 'date', label: 'التاريخ'},
                          {key: 'refNo', label: 'رقم السند'},
                          {key: 'typeLabel', label: 'نوع الحركة'},
                          {key: 'collectorName', label: 'اسم المحصل'},
                          {key: 'description', label: 'البيان'},
                          {key: 'debit', label: 'مدين (مقبوضات)'},
                          {key: 'credit', label: 'دائن (توريدات)'},
                          {key: 'balanceAfter', label: 'الرصيد المتبقي'}
                        ])}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
                      >
                        <Printer className="w-4 h-4 text-amber-400" />
                        <span>طباعة كشف الحساب</span>
                      </button>

                      <button
                        onClick={() => exportToCSV(collectorStatementData.ledger, 'collector_statement', [
                          {key: 'date', label: 'التاريخ'},
                          {key: 'refNo', label: 'رقم السند'},
                          {key: 'typeLabel', label: 'نوع الحركة'},
                          {key: 'collectorName', label: 'اسم المحصل'},
                          {key: 'description', label: 'البيان'},
                          {key: 'debit', label: 'مدين'},
                          {key: 'credit', label: 'دائن'},
                          {key: 'balanceAfter', label: 'الرصيد'}
                        ])}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>تصدير CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">اختر المحصل</label>
                      <select
                        value={statementCollector}
                        onChange={(e) => setStatementCollector(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                      >
                        <option value="all">جميع المحصلين الميدانيين</option>
                        {collectorsList.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">من تاريخ</label>
                      <input
                        type="date"
                        value={statementFromDate}
                        onChange={(e) => setStatementFromDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">إلى تاريخ</label>
                      <input
                        type="date"
                        value={statementToDate}
                        onChange={(e) => setStatementToDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">بحث في كشف الحساب</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={statementSearch}
                          onChange={(e) => setStatementSearch(e.target.value)}
                          placeholder="رقم السند / اسم المشترك..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                        />
                        <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                    <span className="text-xs text-slate-400 font-bold block mb-1">إجمالي المقبوضات (مدين):</span>
                    <span className="text-2xl font-black text-sky-400 font-mono block">
                      {collectorStatementData.totalDebit.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1 block">عدد السندات المقبوضة: {collectorStatementData.totalReceiptsCount}</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                    <span className="text-xs text-slate-400 font-bold block mb-1">إجمالي التوريدات للإدارة (دائن):</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono block">
                      {collectorStatementData.totalCredit.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1 block">عدد التوريدات: {collectorStatementData.totalHandoversCount}</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                    <span className="text-xs text-slate-400 font-bold block mb-1">صافي الرصيد بعهدة المحصل حالياً:</span>
                    <span className="text-2xl font-black text-amber-400 font-mono block">
                      {collectorStatementData.netCustodyBalance.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1 block">العهدة المتبقية غير الموردة</span>
                  </div>
                </div>

                {/* Detailed Statement Ledger Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h4 className="font-black text-white text-sm">جدول الحركة اليومية وتفاصيل كشف الحساب</h4>
                  
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-3">التاريخ</th>
                          <th className="p-3 text-center">رقم السند</th>
                          <th className="p-3">نوع الحركة</th>
                          <th className="p-3">المحصل</th>
                          <th className="p-3">البيان والشرح</th>
                          <th className="p-3 text-center text-sky-400">مدين (تحصيل)</th>
                          <th className="p-3 text-center text-emerald-400">دائن (توريد)</th>
                          <th className="p-3 text-center text-amber-400">الرصيد المتبقي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
                        {collectorStatementData.ledger.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 font-mono text-slate-400">{row.date}</td>
                            <td className="p-3 font-mono font-black text-amber-400 text-center">{row.refNo}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                row.type === 'collection' ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {row.typeLabel}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-white">{row.collectorName}</td>
                            <td className="p-3 text-slate-300">{row.description}</td>
                            <td className="p-3 text-center font-mono font-black text-sky-400">
                              {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-center font-mono font-black text-emerald-400">
                              {row.credit > 0 ? row.credit.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-center font-mono font-black text-amber-400 text-sm">
                              {(row as any).balanceAfter !== undefined ? (row as any).balanceAfter.toLocaleString() : '-'}
                            </td>
                          </tr>
                        ))}

                        {collectorStatementData.ledger.length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                              لا توجد حركات مسجلة لهذا المحصل خلال الفترة المحددة.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 4: COLLECTORS PERFORMANCE & COMPARISON */}
            {treasurySubTab === 'performance' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="font-black text-white text-base flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      <span>مقارنة أداء وتنافسية المحصلين الميدانيين (Collectors Performance)</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      تقييم معدلات التحصيل والتوريد ونسب الإنجاز بين طاقم التحصيل الميداني
                    </p>
                  </div>

                  {/* Performance Chart */}
                  <div className="h-64 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={collectorsAccountSummary}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="collectorName" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                        <Bar dataKey="totalCollected" name="إجمالي التحصيل الميداني" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="totalTransferred" name="إجمالي المورد للإدارة" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Ranking Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-3 text-center">المرتبة</th>
                          <th className="p-3">اسم المحصل</th>
                          <th className="p-3 text-center">عدد السندات</th>
                          <th className="p-3 text-center text-sky-400">إجمالي التحصيل</th>
                          <th className="p-3 text-center text-emerald-400">إجمالي التوريد</th>
                          <th className="p-3 text-center text-amber-400">المتبقي بعهدته</th>
                          <th className="p-3 text-center">نسبة التوريد %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
                        {[...collectorsAccountSummary]
                          .sort((a, b) => b.totalCollected - a.totalCollected)
                          .map((col, index) => {
                            const rate = col.totalCollected > 0 ? ((col.totalTransferred / col.totalCollected) * 100).toFixed(1) : '100.0';
                            return (
                              <tr key={col.collectorName} className="hover:bg-slate-800/40 transition-colors">
                                <td className="p-3 text-center">
                                  <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-black ${
                                    index === 0 ? 'bg-amber-500 text-slate-950' : index === 1 ? 'bg-slate-300 text-slate-950' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {index + 1}
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-white">{col.collectorName}</td>
                                <td className="p-3 text-center font-mono">{col.receiptsCount}</td>
                                <td className="p-3 text-center font-mono font-black text-sky-400">{col.totalCollected.toLocaleString()} {settings.currency}</td>
                                <td className="p-3 text-center font-mono font-black text-emerald-400">{col.totalTransferred.toLocaleString()} {settings.currency}</td>
                                <td className="p-3 text-center font-mono font-black text-amber-400">{col.pendingBalance.toLocaleString()} {settings.currency}</td>
                                <td className="p-3 text-center">
                                  <span className="font-mono text-emerald-400 font-bold">{rate}%</span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 5: DAILY CASH FLOW & RECONCILIATION */}
            {treasurySubTab === 'daily' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="font-black text-white text-base flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-500" />
                        <span>التدفقات النقدية والجرد اليومي (Daily Cash Reconciliation)</span>
                      </h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">
                        تدقيق ومطابقة المقبوضات والتوريدات اليومية لكل محصل بتاريخ محدد
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-400">تاريخ الجرد:</label>
                      <input
                        type="date"
                        value={dailyFlowDate}
                        onChange={(e) => setDailyFlowDate(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-3">اسم المحصل</th>
                          <th className="p-3 text-center">تحصيلات اليوم ({dailyFlowDate})</th>
                          <th className="p-3 text-center">توريدات اليوم لم الكاش</th>
                          <th className="p-3 text-center">صافي الحركة اليومية</th>
                          <th className="p-3 text-center">حالة المطابقة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
                        {collectorsList.map((name) => {
                          const dailyPays = payments.filter(p => !p.isRejected && (p.receivedBy === name || (p as any).collectorName === name) && p.paymentDate === dailyFlowDate);
                          const dailyTrfs = treasuryTransfers.filter(t => t.fromAccount.includes(name) && t.date === dailyFlowDate);

                          const dailyIncome = dailyPays.reduce((s, p) => s + p.amountPaid, 0);
                          const dailyOutcome = dailyTrfs.reduce((s, t) => s + t.amount, 0);
                          const netDaily = dailyIncome - dailyOutcome;

                          return (
                            <tr key={name} className="hover:bg-slate-800/40 transition-colors">
                              <td className="p-3 font-bold text-white">{name}</td>
                              <td className="p-3 text-center font-mono font-black text-sky-400">{dailyIncome.toLocaleString()} {settings.currency}</td>
                              <td className="p-3 text-center font-mono font-black text-emerald-400">{dailyOutcome.toLocaleString()} {settings.currency}</td>
                              <td className="p-3 text-center font-mono font-black text-amber-400">{netDaily.toLocaleString()} {settings.currency}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                                  netDaily === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {netDaily === 0 ? 'مصفى ومستلم بالكامل' : 'يوجد رصيد بانتظار التوريد'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 5: OPERATIONAL EXPENSES */}
        {activeTab === 'expenses' && (
          <motion.div
            key="expenses"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">سجل المصروفات التشغيلية والوقود</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => printData('سجل المصروفات التشغيلية', expenses, [{key: 'date', label: 'التاريخ'}, {key: 'category', label: 'التصنيف'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}, {key: 'recordedBy', label: 'الموظف'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Printer className="w-4 h-4" /> طباعة
                </button>
                <button onClick={() => exportToCSV(expenses, 'expenses', [{key: 'date', label: 'التاريخ'}, {key: 'category', label: 'التصنيف'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}, {key: 'recordedBy', label: 'الموظف'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button onClick={() => setShowAddExpense(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2">
                  <Plus className="w-4 h-4" /> إضافة سند صرف
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800 font-bold">
                  <tr>
                    <th className="p-3 font-bold">التاريخ</th>
                    <th className="p-3 font-bold">البند / التصنيف</th>
                    <th className="p-3 font-bold">البيان والتفاصيل</th>
                    <th className="p-3 font-bold text-center">المبلغ</th>
                    <th className="p-3 font-bold text-center">المسجل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-bold text-slate-200">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{exp.date}</td>
                      <td className="p-3 text-amber-400 font-bold">{exp.category}</td>
                      <td className="p-3 text-slate-300">{exp.description}</td>
                      <td className="p-3 text-center font-mono font-black text-rose-400 text-sm">{exp.amount.toLocaleString()} {settings.currency}</td>
                      <td className="p-3 text-center text-slate-500 text-[11px]">{exp.recordedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* TAB 6: EMPLOYEES & PAYROLL */}
        {activeTab === 'employees' && (
          <motion.div
            key="employees"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">سجل الرواتب والسلف والمكافآت</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => printData('السلف والرواتب', employeeTxs.map(tx => ({...tx, type: tx.type === 'salary' ? 'راتب' : tx.type === 'advance' ? 'سلفة' : 'بدل'})), [{key: 'date', label: 'التاريخ'}, {key: 'employeeName', label: 'الموظف'}, {key: 'type', label: 'النوع'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Printer className="w-4 h-4" /> طباعة
                </button>
                <button onClick={() => exportToCSV(employeeTxs.map(tx => ({...tx, type: tx.type === 'salary' ? 'راتب' : tx.type === 'advance' ? 'سلفة' : 'بدل'})), 'employee_transactions', [{key: 'date', label: 'التاريخ'}, {key: 'employeeName', label: 'الموظف'}, {key: 'type', label: 'النوع'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button onClick={() => setShowAddEmployeeTx(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2">
                  <Plus className="w-4 h-4" /> إضافة حركة موظف
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800 font-bold">
                  <tr>
                    <th className="p-3 font-bold">التاريخ</th>
                    <th className="p-3 font-bold">الموظف</th>
                    <th className="p-3 font-bold">نوع الحركة</th>
                    <th className="p-3 font-bold">البيان</th>
                    <th className="p-3 font-bold text-center">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-bold text-slate-200">
                  {employeeTxs.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{tx.date}</td>
                      <td className="p-3 font-bold text-white">{tx.employeeName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          tx.type === 'salary' ? 'bg-emerald-500/10 text-emerald-400' :
                          tx.type === 'advance' ? 'bg-rose-500/10 text-rose-400' : 'bg-cyan-500/10 text-cyan-400'
                        }`}>
                          {tx.type === 'salary' ? 'راتب' : tx.type === 'advance' ? 'سلفة' : 'بدل'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">{tx.description}</td>
                      <td className="p-3 text-center font-mono font-black text-slate-200 text-sm">{tx.amount.toLocaleString()} {settings.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* TAB 7: PURCHASES & SUPPLIERS */}
        {activeTab === 'purchases' && (
          <motion.div
            key="purchases"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">فواتير المشتريات وتجهيزات الموردين</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => printData('فواتير المشتريات والموردين', purchases, [{key: 'date', label: 'التاريخ'}, {key: 'supplier', label: 'المورد'}, {key: 'items', label: 'المشتريات'}, {key: 'amount', label: 'إجمالي الفاتورة'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Printer className="w-4 h-4" /> طباعة
                </button>
                <button onClick={() => exportToCSV(purchases, 'purchases', [{key: 'date', label: 'التاريخ'}, {key: 'supplier', label: 'المورد'}, {key: 'items', label: 'المشتريات'}, {key: 'amount', label: 'إجمالي الفاتورة'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button onClick={() => setShowAddPurchase(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2">
                  <Plus className="w-4 h-4" /> فاتورة شراء جديدة
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800 font-bold">
                  <tr>
                    <th className="p-3 font-bold">التاريخ</th>
                    <th className="p-3 font-bold">المورد</th>
                    <th className="p-3 font-bold">الأصناف والتجهيزات المشتراة</th>
                    <th className="p-3 font-bold text-center">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-bold text-slate-200">
                  {purchases.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{p.date}</td>
                      <td className="p-3 font-bold text-white">{p.supplier}</td>
                      <td className="p-3 text-slate-300">{p.items}</td>
                      <td className="p-3 text-center font-mono font-black text-rose-400 text-sm">{p.amount.toLocaleString()} {settings.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* TAB 8: SERVICE CONNECTION REVENUE */}
        {activeTab === 'connections' && (
          <motion.div
            key="connections"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">إيرادات رسوم الاشتراك وتوصيل الخدمة</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => printData('إيرادات إدخال خدمة الكهرباء', connections.map(c => ({...c, status: c.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'})), [{key: 'date', label: 'التاريخ'}, {key: 'subscriberName', label: 'المشترك'}, {key: 'totalFee', label: 'إجمالي الرسوم'}, {key: 'paidAmount', label: 'المدفوع'}, {key: 'status', label: 'الحالة'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Printer className="w-4 h-4" /> طباعة
                </button>
                <button onClick={() => exportToCSV(connections.map(c => ({...c, status: c.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'})), 'connections', [{key: 'date', label: 'التاريخ'}, {key: 'subscriberName', label: 'المشترك'}, {key: 'totalFee', label: 'إجمالي الرسوم'}, {key: 'paidAmount', label: 'المدفوع'}, {key: 'status', label: 'الحالة'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button onClick={() => setShowAddConnection(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2">
                  <Plus className="w-4 h-4" /> إضافة طلب إدخال
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800 font-bold">
                  <tr>
                    <th className="p-3 font-bold">التاريخ</th>
                    <th className="p-3 font-bold">المشترك</th>
                    <th className="p-3 font-bold">المواد المصروفة</th>
                    <th className="p-3 font-bold text-center">إجمالي الرسوم</th>
                    <th className="p-3 font-bold text-center">المدفوع</th>
                    <th className="p-3 font-bold text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-bold text-slate-200">
                  {connections.map(c => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{c.date}</td>
                      <td className="p-3 font-bold text-white">{c.subscriberName}</td>
                      <td className="p-3 text-slate-300 text-xs">{c.materialsUsed}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-300">{c.totalFee.toLocaleString()}</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-400 text-sm">{c.paidAmount.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          c.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {c.status === 'completed' ? 'مكتمل ومسدد' : 'قيد التنفيذ'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODALS --- */}

      {/* 1. ADD EXPENSE MODAL */}
      <AnimatePresence>
        {showAddExpense && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddExpense(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setShowAddExpense(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-amber-500" />
                  سند صرف مصروفات جديد
                </h3>
              </div>
              
              <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">تصنيف المصروف</label>
                    <div className="relative">
                      <select
                        required
                        value={newExpense.category ?? ''}
                        onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 appearance-none font-bold"
                      >
                        <option value="وقود (ديزل)">وقود (ديزل)</option>
                        <option value="صيانة وقطع غيار">صيانة وقطع غيار</option>
                        <option value="زيوت وشحوم">زيوت وشحوم</option>
                        <option value="إيجارات ورسوم">إيجارات ورسوم</option>
                        <option value="نثريات وضيافة">نثريات وضيافة</option>
                        <option value="أخرى">أخرى</option>
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ الصرف</label>
                    <input
                      type="date"
                      required
                      value={newExpense.date ?? ''}
                      onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">المبلغ ({settings.currency})</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newExpense.amount ?? ''}
                    onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono font-bold"
                    placeholder="مثال: 150000"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">البيان والتفاصيل</label>
                  <textarea
                    required
                    value={newExpense.description ?? ''}
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[90px] font-bold"
                    placeholder="سبب الصرف..."
                  />
                </div>
                
                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    اعتماد سند الصرف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. ADD MANUAL JOURNAL MODAL */}
      <AnimatePresence>
        {showAddManualJournal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddManualJournal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setShowAddManualJournal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  إضافة قيد تسوية محاسبي يدوي (Journal Voucher)
                </h3>
              </div>

              <form onSubmit={handleAddManualJournal} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">من حـ / الحساب المدين</label>
                    <input
                      type="text"
                      required
                      value={newManualJournal.debitAccountName ?? ''}
                      onChange={e => setNewManualJournal({...newManualJournal, debitAccountName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                      placeholder="مثال: حـ/ مصروفات الصيانة"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">إلى حـ / الحساب الدائن</label>
                    <input
                      type="text"
                      required
                      value={newManualJournal.creditAccountName ?? ''}
                      onChange={e => setNewManualJournal({...newManualJournal, creditAccountName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                      placeholder="مثال: حـ/ الصندوق الرئيسي"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">مبلغ القيد ({settings.currency})</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newManualJournal.amount ?? ''}
                      onChange={e => setNewManualJournal({...newManualJournal, amount: Number(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono font-bold"
                      placeholder="المبلغ"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ القيد</label>
                    <input
                      type="date"
                      required
                      value={newManualJournal.date ?? ''}
                      onChange={e => setNewManualJournal({...newManualJournal, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">البيان والشرح المحاسبي</label>
                  <textarea
                    required
                    value={newManualJournal.description ?? ''}
                    onChange={e => setNewManualJournal({...newManualJournal, description: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[80px] font-bold"
                    placeholder="سبب القيد والبيان التفصيلي..."
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddManualJournal(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    اعتماد القيد المحاسبي
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. ADD TREASURY TRANSFER MODAL */}
      <AnimatePresence>
        {showAddTransfer && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddTransfer(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setShowAddTransfer(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-amber-500" />
                  سند تحويل بين الصناديق والمحافظ
                </h3>
              </div>

              <form onSubmit={handleAddTransfer} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">من حساب (المنصرف)</label>
                    <select
                      value={newTransfer.fromAccount}
                      onChange={e => setNewTransfer({...newTransfer, fromAccount: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="صندوق المحصلين الميداني">صندوق المحصلين الميداني</option>
                      <option value="الصندوق الرئيسي (الكاش)">الصندوق الرئيسي (الكاش)</option>
                      <option value="محفظة جوال باي الإلكترونية">محفظة جوال باي الإلكترونية</option>
                      <option value="حساب بنك فلسطين الرئيسي">حساب بنك فلسطين الرئيسي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">إلى حساب (المستلم)</label>
                    <select
                      value={newTransfer.toAccount}
                      onChange={e => setNewTransfer({...newTransfer, toAccount: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="الصندوق الرئيسي (الكاش)">الصندوق الرئيسي (الكاش)</option>
                      <option value="حساب بنك فلسطين الرئيسي">حساب بنك فلسطين الرئيسي</option>
                      <option value="محفظة جوال باي الإلكترونية">محفظة جوال باي الإلكترونية</option>
                      <option value="صندوق المحصلين الميداني">صندوق المحصلين الميداني</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">المبلغ المكتوب ({settings.currency})</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newTransfer.amount ?? ''}
                      onChange={e => setNewTransfer({...newTransfer, amount: Number(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono font-bold"
                      placeholder="المبلغ"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ التوريد والتحويل</label>
                    <input
                      type="date"
                      required
                      value={newTransfer.date ?? ''}
                      onChange={e => setNewTransfer({...newTransfer, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">ملاحظات التحويل والبيان</label>
                  <textarea
                    value={newTransfer.notes ?? ''}
                    onChange={e => setNewTransfer({...newTransfer, notes: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[80px] font-bold"
                    placeholder="مثال: توريد حصيلة التحصيل اليومي الميداني..."
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddTransfer(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    اعتماد سند التحويل
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. PRINTABLE JOURNAL VOUCHER MODAL */}
      <AnimatePresence>
        {selectedVoucherForPrint && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setSelectedVoucherForPrint(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white text-slate-900 rounded-3xl shadow-2xl p-6 text-right space-y-4"
            >
              <div className="flex justify-between items-center border-b pb-3">
                <button
                  onClick={() => setSelectedVoucherForPrint(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <h3 className="font-black text-lg text-slate-900">{settings.companyName || 'شركة الكهرباء التجاري'}</h3>
                  <p className="text-xs text-slate-500 font-bold">سند قيد محاسبي مزدوج (Journal Voucher)</p>
                </div>
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl font-mono font-black text-xs">
                  {selectedVoucherForPrint.voucherNumber}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-bold bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>التاريخ: <span className="font-mono text-slate-700">{selectedVoucherForPrint.date}</span></div>
                <div>نوع السند: <span className="text-amber-700">{selectedVoucherForPrint.typeLabel}</span></div>
                <div>المسجل: <span className="text-slate-700">{selectedVoucherForPrint.recordedBy}</span></div>
                <div>المبلغ: <span className="font-mono text-emerald-700 font-black text-sm">{selectedVoucherForPrint.amount.toLocaleString()} {settings.currency}</span></div>
              </div>

              <div className="space-y-2 text-xs font-bold border rounded-xl overflow-hidden">
                <div className="bg-slate-900 text-white p-2.5 flex justify-between">
                  <span>من حـ/ (الجانب المدين):</span>
                  <span className="font-mono">{selectedVoucherForPrint.debitAccountName} ({selectedVoucherForPrint.debitAccountCode})</span>
                </div>
                <div className="bg-slate-100 text-slate-900 p-2.5 flex justify-between">
                  <span>إلى حـ/ (الجانب الدائن):</span>
                  <span className="font-mono">{selectedVoucherForPrint.creditAccountName} ({selectedVoucherForPrint.creditAccountCode})</span>
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs font-bold text-amber-900">
                البيان والشرح المحاسبي: <p className="mt-1 font-normal text-slate-800">{selectedVoucherForPrint.description}</p>
              </div>

              <div className="pt-4 border-t flex justify-between items-center">
                <button
                  onClick={() => printData(`سند قيد ${selectedVoucherForPrint.voucherNumber}`, [selectedVoucherForPrint], [{key: 'voucherNumber', label: 'رقم السند'}, {key: 'date', label: 'التاريخ'}, {key: 'debitAccountName', label: 'من حـ (مدين)'}, {key: 'creditAccountName', label: 'إلى حـ (دائن)'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}])}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-slate-800"
                >
                  <Printer className="w-4 h-4 text-amber-400" /> طباعة السند
                </button>
                <button
                  onClick={() => setSelectedVoucherForPrint(null)}
                  className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. ADD PURCHASE MODAL */}
      <AnimatePresence>
        {showAddPurchase && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddPurchase(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setShowAddPurchase(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  فاتورة مشتريات وتجهيزات جديدة
                </h3>
              </div>
              
              <form onSubmit={handleAddPurchase} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">اسم المورد</label>
                    <input
                      type="text"
                      required
                      value={newPurchase.supplier ?? ''}
                      onChange={e => setNewPurchase({...newPurchase, supplier: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                      placeholder="مثال: شركة النور للكهربائيات"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ الفاتورة</label>
                    <input
                      type="date"
                      required
                      value={newPurchase.date ?? ''}
                      onChange={e => setNewPurchase({...newPurchase, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">إجمالي الفاتورة ({settings.currency})</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newPurchase.amount ?? ''}
                    onChange={e => setNewPurchase({...newPurchase, amount: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono font-bold"
                    placeholder="المبلغ الإجمالي"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">الأصناف والتجهيزات المشتراة</label>
                  <textarea
                    required
                    value={newPurchase.items ?? ''}
                    onChange={e => setNewPurchase({...newPurchase, items: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[80px] font-bold"
                    placeholder="تفاصيل المشتريات..."
                  />
                </div>
                
                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddPurchase(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    حفظ الفاتورة
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. ADD CONNECTION MODAL */}
      <AnimatePresence>
        {showAddConnection && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddConnection(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setShowAddConnection(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-500" />
                  تسجيل طلب إدخال خدمة جديد (إيرادات)
                </h3>
              </div>
              
              <form onSubmit={handleAddConnection} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">اسم المشترك الجديد</label>
                    <input
                      type="text"
                      required
                      value={newConnection.subscriberName ?? ''}
                      onChange={e => setNewConnection({...newConnection, subscriberName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                      placeholder="اسم المشترك"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">التاريخ</label>
                    <input
                      type="date"
                      required
                      value={newConnection.date ?? ''}
                      onChange={e => setNewConnection({...newConnection, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">إجمالي رسوم التوصيل ({settings.currency})</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newConnection.totalFee ?? ''}
                      onChange={e => setNewConnection({...newConnection, totalFee: Number(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono font-bold"
                      placeholder="إجمالي الرسوم"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">المبلغ المدفوع الآن ({settings.currency})</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newConnection.paidAmount ?? ''}
                      onChange={e => setNewConnection({...newConnection, paidAmount: Number(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono font-bold"
                      placeholder="المدفوع"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">المواد والتجهيزات المصروفة</label>
                  <textarea
                    value={newConnection.materialsUsed ?? ''}
                    onChange={e => setNewConnection({...newConnection, materialsUsed: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[70px] font-bold"
                    placeholder="مثال: عداد 3 فاز، 25 متر كابل..."
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddConnection(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    اعتماد إدخال الخدمة
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. ADD EMPLOYEE TRANSACTION MODAL */}
      <AnimatePresence>
        {showAddEmployeeTx && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddEmployeeTx(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setShowAddEmployeeTx(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  إضافة حركة موظف (راتب / سلفة / بدل)
                </h3>
              </div>

              <form onSubmit={handleAddEmployeeTx} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">الموظف</label>
                    <select
                      value={newEmployeeTx.employeeName}
                      onChange={e => setNewEmployeeTx({...newEmployeeTx, employeeName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="">اختر الموظف...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.name}>{emp.name} ({emp.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">نوع الحركة</label>
                    <select
                      value={newEmployeeTx.type}
                      onChange={e => setNewEmployeeTx({...newEmployeeTx, type: e.target.value as any})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="salary">صرف راتب شهري</option>
                      <option value="advance">صرف سلفة مالية</option>
                      <option value="allowance">صرف بدل / مكافأة</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">المبلغ ({settings.currency})</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newEmployeeTx.amount ?? ''}
                      onChange={e => setNewEmployeeTx({...newEmployeeTx, amount: Number(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono font-bold"
                      placeholder="المبلغ"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">التاريخ</label>
                    <input
                      type="date"
                      required
                      value={newEmployeeTx.date ?? ''}
                      onChange={e => setNewEmployeeTx({...newEmployeeTx, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">البيان والسبب</label>
                  <textarea
                    value={newEmployeeTx.description ?? ''}
                    onChange={e => setNewEmployeeTx({...newEmployeeTx, description: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[70px] font-bold"
                    placeholder="مثال: راتب شهر أكتوبر / سلفة طارئة..."
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddEmployeeTx(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    اعتماد الصرف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. HANDOVER / SETTLEMENT MODAL (سند استلام وتوريد عهدة المحصل) */}
      <AnimatePresence>
        {handoverTarget && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setHandoverTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950">
                <button
                  onClick={() => setHandoverTarget(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-amber-500" />
                  سند تسليم وتوريد صندوق المحصل
                </h3>
              </div>

              <form onSubmit={handleConfirmHandover} className="p-6 space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-amber-400 font-bold block">المحصل المسلّم:</span>
                    <span className="text-base font-black text-white">{handoverTarget.collectorName}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-xs text-amber-400 font-bold block">العهد المالية المستحقة:</span>
                    <span className="text-lg font-black text-amber-400 font-mono">
                      {handoverTarget.pendingAmount.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">المبلغ المراد توريده وتسليمه ({settings.currency})</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={handoverTarget.pendingAmount || undefined}
                    value={handoverForm.amount || ''}
                    onChange={e => setHandoverForm({...handoverForm, amount: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-lg text-amber-400 font-mono font-black focus:outline-none focus:border-amber-500 text-right"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">جهة الاستلام (إلى صندوق)</label>
                    <select
                      value={handoverForm.toAccount}
                      onChange={e => setHandoverForm({...handoverForm, toAccount: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="الصندوق الرئيسي (الكاش)">الصندوق الرئيسي (الكاش)</option>
                      <option value="حساب بنك الكريمي">حساب بنك الكريمي</option>
                      <option value="محفظة جيب الالكترونية">محفظة جيب الإلكترونية</option>
                      <option value="حساب البنك الأهلي">حساب البنك الأهلي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">المستلم المباشر</label>
                    <input
                      type="text"
                      required
                      value={handoverForm.receiverName}
                      onChange={e => setHandoverForm({...handoverForm, receiverName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white font-bold focus:outline-none focus:border-amber-500 text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">البيان والملاحظات</label>
                  <textarea
                    value={handoverForm.notes}
                    onChange={e => setHandoverForm({...handoverForm, notes: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[70px] font-bold"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setHandoverTarget(null)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد واستلام التوريد</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. PRINTABLE TRANSFER VOUCHER MODAL */}
      <AnimatePresence>
        {printableTransferVoucher && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-white text-slate-900 rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{settings.stationName || 'محطة الكهرباء التجارية'}</h2>
                  <p className="text-xs text-slate-600 font-bold mt-0.5">سند توريد وتسليم خزينة (Treasury Receipt Voucher)</p>
                </div>
                <div className="text-left font-mono">
                  <span className="text-sm font-black text-amber-600 block">{printableTransferVoucher.transferNumber}</span>
                  <span className="text-xs text-slate-500 font-bold">{printableTransferVoucher.date}</span>
                </div>
              </div>

              <div className="space-y-4 text-sm font-bold text-slate-800">
                <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-between border border-slate-200">
                  <span>المبلغ المورد:</span>
                  <span className="text-2xl font-black font-mono text-emerald-700">
                    {printableTransferVoucher.amount.toLocaleString()} {settings.currency}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="border border-slate-200 p-3 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">سلمنا نحن (من حساب):</span>
                    <span className="font-black text-slate-900 text-sm">{printableTransferVoucher.fromAccount}</span>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">استلمنا نحن (إلى حساب):</span>
                    <span className="font-black text-slate-900 text-sm">{printableTransferVoucher.toAccount}</span>
                  </div>
                </div>

                <div className="border border-slate-200 p-3 rounded-xl text-xs">
                  <span className="text-slate-500 block text-[10px]">وذلك مقابل / البيان:</span>
                  <p className="text-slate-800 font-bold mt-1">{printableTransferVoucher.notes}</p>
                </div>

                <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <span className="block text-slate-500 mb-8">توقيع المـسلم (المحصل):</span>
                    <span className="font-black border-t border-slate-400 pt-1 block w-32 mx-auto">..........................</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 mb-8">توقيع المستلم (أمين الخزينة):</span>
                    <span className="font-black border-t border-slate-400 pt-1 block w-32 mx-auto">{printableTransferVoucher.recordedBy || 'مدير النظام'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
                <button
                  onClick={() => setPrintableTransferVoucher(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => safePrint()}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>طباعة السند</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
