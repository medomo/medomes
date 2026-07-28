import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { 
  Subscriber, MeterReading, Payment, SystemSettings, InventoryItem, InventoryTransaction,
  Expense, Purchase, EmployeeTransaction, ServiceConnection, Employee
} from '../types';
import { 
  BarChart3, TrendingUp, TrendingDown, Wallet, CreditCard, Activity, Map, FileText, 
  Download, Printer, Filter, Calendar, Search, Package, AlertTriangle, AlertCircle, 
  Zap, Gauge, ShieldAlert, ArrowUpDown, Layers, CheckCircle2, Users, Phone, ArrowUpRight,
  PieChart as PieChartIcon, DollarSign, RefreshCw, Sliders
} from 'lucide-react';
import { calculateTransformerLoss } from '../utils/lossEngine';
import { safePrint } from '../utils/exportUtils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface AdminReportsProps {
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  inventory: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  expenses?: Expense[];
  purchases?: Purchase[];
  treasuryTransfers?: any[];
  employees?: Employee[];
  employeeTxs?: EmployeeTransaction[];
  connections?: ServiceConnection[];
  activeTab: 'executive' | 'financial' | 'consumption' | 'debt_aging' | 'loss' | 'inventory' | 'hr_payroll' | 'statements';
}

function exportToCSV(filename: string, rows: (string | number)[][], headers: string[]) {
  const processRow = (row: (string | number)[]) => {
    return row.map(val => {
      let finalVal = val === null || val === undefined ? '' : String(val);
      finalVal = finalVal.replace(/"/g, '""');
      if (finalVal.search(/("|,|\n)/g) >= 0) {
        finalVal = `"${finalVal}"`;
      }
      return finalVal;
    }).join(',');
  };

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(processRow)].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const AdminReports: React.FC<AdminReportsProps> = ({
  subscribers = [],
  readings = [],
  payments = [],
  settings,
  inventory = [],
  inventoryTransactions = [],
  expenses = [],
  purchases = [],
  treasuryTransfers = [],
  employees = [],
  employeeTxs = [],
  connections = [],
  activeTab: initialTab
}) => {
  const [activeTab, setActiveTab] = useState<'executive' | 'financial' | 'consumption' | 'debt_aging' | 'loss' | 'inventory' | 'hr_payroll' | 'statements'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Global Filters State
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const COLORS = ['#0ea5e9', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-right text-white">
          <p className="font-bold text-amber-400 mb-1" dir="ltr">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs font-bold my-0.5 flex items-center justify-between gap-3">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-mono">{entry.value.toLocaleString()}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Preset Handlers
  const handlePresetMonth = (preset: 'this_month' | 'last_month' | 'this_year' | 'all') => {
    const today = new Date();
    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'this_month') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      setFromDate(`${year}-${month}-01`);
      setToDate(today.toISOString().split('T')[0]);
    } else if (preset === 'last_month') {
      const last = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const year = last.getFullYear();
      const month = String(last.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      setFromDate(`${year}-${month}-01`);
      setToDate(`${year}-${month}-${lastDay}`);
    } else if (preset === 'this_year') {
      const year = today.getFullYear();
      setFromDate(`${year}-01-01`);
      setToDate(today.toISOString().split('T')[0]);
    }
  };

  // --- Filtered Datasets ---
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(s => {
      const matchZone = zoneFilter === 'all' || s.zone === zoneFilter;
      const matchSearch = !searchQuery || s.name.includes(searchQuery) || s.meterNumber.includes(searchQuery) || s.phone.includes(searchQuery);
      return matchZone && matchSearch;
    });
  }, [subscribers, zoneFilter, searchQuery]);

  const filteredReadings = useMemo(() => {
    return readings.filter(r => {
      if (fromDate && r.readingDate && r.readingDate < fromDate) return false;
      if (toDate && r.readingDate && r.readingDate > toDate) return false;
      if (zoneFilter !== 'all') {
        const sub = subscribers.find(s => s.id === r.subscriberId);
        if (!sub || sub.zone !== zoneFilter) return false;
      }
      return true;
    });
  }, [readings, fromDate, toDate, zoneFilter, subscribers]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (p.isRejected) return false;
      if (fromDate && p.paymentDate < fromDate) return false;
      if (toDate && p.paymentDate > toDate) return false;
      if (zoneFilter !== 'all') {
        const sub = subscribers.find(s => s.id === p.subscriberId);
        if (!sub || sub.zone !== zoneFilter) return false;
      }
      return true;
    });
  }, [payments, fromDate, toDate, zoneFilter, subscribers]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (fromDate && e.date < fromDate) return false;
      if (toDate && e.date > toDate) return false;
      return true;
    });
  }, [expenses, fromDate, toDate]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (fromDate && p.date < fromDate) return false;
      if (toDate && p.date > toDate) return false;
      return true;
    });
  }, [purchases, fromDate, toDate]);

  const filteredConnections = useMemo(() => {
    return connections.filter(c => {
      if (fromDate && c.date < fromDate) return false;
      if (toDate && c.date > toDate) return false;
      return true;
    });
  }, [connections, fromDate, toDate]);

  // --- Executive & Financial Aggregations ---
  const totalBilledInvoices = useMemo(() => filteredReadings.reduce((sum, r) => sum + r.totalAmount, 0), [filteredReadings]);
  const totalCashCollected = useMemo(() => filteredPayments.reduce((sum, p) => sum + p.amountPaid, 0), [filteredPayments]);
  const totalConnectionFees = useMemo(() => filteredConnections.reduce((sum, c) => sum + (c.paidAmount || 0), 0), [filteredConnections]);
  
  const totalOperatingExpensesAmount = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);
  const totalPurchasesAmount = useMemo(() => filteredPurchases.reduce((sum, p) => sum + p.amount, 0), [filteredPurchases]);
  const totalSalariesPaid = useMemo(() => {
    return (employeeTxs || []).filter(tx => tx.type === 'salary').reduce((sum, tx) => sum + tx.amount, 0);
  }, [employeeTxs]);

  const totalAllExpenses = useMemo(() => {
    return totalOperatingExpensesAmount + totalPurchasesAmount + totalSalariesPaid;
  }, [totalOperatingExpensesAmount, totalPurchasesAmount, totalSalariesPaid]);

  const totalRevenueCombined = useMemo(() => totalCashCollected + totalConnectionFees, [totalCashCollected, totalConnectionFees]);
  const netOperatingProfit = useMemo(() => totalRevenueCombined - totalAllExpenses, [totalRevenueCombined, totalAllExpenses]);

  const totalUncollectedDebt = useMemo(() => {
    return filteredSubscribers.reduce((sum, s) => sum + (s.currentBalance > 0 ? s.currentBalance : 0), 0);
  }, [filteredSubscribers]);

  const totalConsumptionKwh = useMemo(() => filteredReadings.reduce((sum, r) => sum + r.consumption, 0), [filteredReadings]);

  // Monthly Revenue & Expense Trend
  const monthlyFinancialTrend = useMemo(() => {
    const trendMap: Record<string, { month: string; revenue: number; expenses: number; profit: number }> = {};
    
    filteredPayments.forEach(p => {
      const month = p.paymentDate.substring(0, 7);
      if (!trendMap[month]) trendMap[month] = { month, revenue: 0, expenses: 0, profit: 0 };
      trendMap[month].revenue += p.amountPaid;
    });

    filteredExpenses.forEach(e => {
      const month = e.date.substring(0, 7);
      if (!trendMap[month]) trendMap[month] = { month, revenue: 0, expenses: 0, profit: 0 };
      trendMap[month].expenses += e.amount;
    });

    return Object.values(trendMap).map(m => ({
      ...m,
      profit: m.revenue - m.expenses
    })).sort((a, b) => a.month.localeCompare(b.month)).slice(-8);
  }, [filteredPayments, filteredExpenses]);

  // Debt Aging Breakdown
  const debtAgingData = useMemo(() => {
    let bracket30 = 0;
    let bracket60 = 0;
    let bracket90 = 0;
    let bracketOver90 = 0;

    const debtorsList = subscribers.filter(s => s.currentBalance > 0).map(s => {
      const subReadings = readings.filter(r => r.subscriberId === s.id).sort((a, b) => b.readingDate.localeCompare(a.readingDate));
      const lastReadingDate = subReadings[0]?.readingDate || '2023-01-01';
      const daysOld = Math.floor((new Date().getTime() - new Date(lastReadingDate).getTime()) / (1000 * 3600 * 24));

      if (daysOld <= 30) bracket30 += s.currentBalance;
      else if (daysOld <= 60) bracket60 += s.currentBalance;
      else if (daysOld <= 90) bracket90 += s.currentBalance;
      else bracketOver90 += s.currentBalance;

      return {
        ...s,
        daysOld,
        lastReadingDate
      };
    }).sort((a, b) => b.currentBalance - a.currentBalance);

    return {
      bracket30,
      bracket60,
      bracket90,
      bracketOver90,
      debtorsList
    };
  }, [subscribers, readings]);

  // Collector Performance Table
  const collectorStats = useMemo(() => {
    const stats: Record<string, { collectorName: string; totalCollected: number; receiptsCount: number }> = {};
    
    filteredPayments.forEach(p => {
      const name = p.receivedBy || (p as any).collectorName || 'غير محدد';
      if (!stats[name]) stats[name] = { collectorName: name, totalCollected: 0, receiptsCount: 0 };
      stats[name].totalCollected += p.amountPaid;
      stats[name].receiptsCount += 1;
    });

    return Object.values(stats).sort((a, b) => b.totalCollected - a.totalCollected);
  }, [filteredPayments]);

  // Top Consuming Subscribers
  const topConsumingSubscribers = useMemo(() => {
    const subMap: Record<string, { id: string; name: string; meterNumber: string; zone: string; totalConsumption: number; totalBilled: number }> = {};

    filteredReadings.forEach(r => {
      if (!subMap[r.subscriberId]) {
        subMap[r.subscriberId] = {
          id: r.subscriberId,
          name: r.subscriberName,
          meterNumber: r.meterNumber,
          zone: r.zone || 'الرئيسية',
          totalConsumption: 0,
          totalBilled: 0
        };
      }
      subMap[r.subscriberId].totalConsumption += r.consumption;
      subMap[r.subscriberId].totalBilled += r.totalAmount;
    });

    return Object.values(subMap).sort((a, b) => b.totalConsumption - a.totalConsumption).slice(0, 15);
  }, [filteredReadings]);

  // --- Statement Sub State ---
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const statementSub = useMemo(() => subscribers.find(s => s.id === selectedSubId), [selectedSubId, subscribers]);
  const statementReadings = useMemo(() => readings.filter(r => r.subscriberId === selectedSubId).sort((a, b) => a.billingMonth.localeCompare(b.billingMonth)), [selectedSubId, readings]);
  const statementPayments = useMemo(() => payments.filter(p => p.subscriberId === selectedSubId).sort((a, b) => a.paymentDate.localeCompare(b.paymentDate)), [selectedSubId, payments]);

  const statementTimeline = useMemo(() => {
    if (!statementSub) return [];
    const timeline: any[] = [];
    
    statementReadings.forEach(r => {
      timeline.push({
        id: 'r_' + r.id,
        date: r.readingDate || r.billingMonth + '-01',
        type: 'reading',
        desc: `فاتورة استهلاك كهرباء (${r.billingMonth}) - قراءة: ${r.currentReading} [كمية: ${r.consumption} ك.و.س]`,
        debit: r.totalAmount,
        credit: 0
      });
    });

    statementPayments.forEach(p => {
      timeline.push({
        id: 'p_' + p.id,
        date: p.paymentDate,
        type: 'payment',
        desc: `سداد دفعة نقدية - إيصال رقم ${p.receiptNumber} (${p.receivedBy || 'المحصل'})`,
        debit: 0,
        credit: p.amountPaid
      });
    });

    const sorted = timeline.sort((a, b) => a.date.localeCompare(b.date));
    
    // Compute running balance
    let runningBalance = 0;
    return sorted.map(item => {
      runningBalance += item.debit - item.credit;
      return {
        ...item,
        runningBalance
      };
    });
  }, [statementSub, statementReadings, statementPayments]);

  const [printingStatement, setPrintingStatement] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  // --- Loss Analysis Calculations ---
  const [lossSortBy, setLossSortBy] = useState<'percent_desc' | 'percent_asc' | 'kwh_desc' | 'value_desc'>('percent_desc');
  const [lossZoneFilter, setLossZoneFilter] = useState<string>('all');
  const [dispatchedInspections, setDispatchedInspections] = useState<{ [transName: string]: boolean }>({});

  const allTransformerLossList = useMemo(() => {
    return (settings.transformers || []).map((t: any) => calculateTransformerLoss(t, subscribers, settings));
  }, [settings, subscribers]);

  const sortedFilteredTransformerLossList = useMemo(() => {
    const filtered = lossZoneFilter === 'all' 
      ? allTransformerLossList 
      : allTransformerLossList.filter(item => item.zone === lossZoneFilter);

    return [...filtered].sort((a, b) => {
      if (lossSortBy === 'percent_desc') return b.totalLossPercent - a.totalLossPercent;
      if (lossSortBy === 'percent_asc') return a.totalLossPercent - b.totalLossPercent;
      if (lossSortBy === 'kwh_desc') return b.totalLossKwh - a.totalLossKwh;
      if (lossSortBy === 'value_desc') return b.lossValueCurrency - a.lossValueCurrency;
      return 0;
    });
  }, [allTransformerLossList, lossZoneFilter, lossSortBy]);

  const zoneLossList = useMemo(() => {
    const zoneMap: { [zoneName: string]: { zoneName: string; centralEnergy: number; subMetersEnergy: number; totalLossKwh: number; lossValueCurrency: number; transformersCount: number; subscribersCount: number } } = {};

    (settings.zones || ['المنطقة الرئيسية']).forEach(z => {
      zoneMap[z] = { zoneName: z, centralEnergy: 0, subMetersEnergy: 0, totalLossKwh: 0, lossValueCurrency: 0, transformersCount: 0, subscribersCount: 0 };
    });

    allTransformerLossList.forEach(item => {
      const z = item.zone || 'المنطقة الرئيسية';
      if (!zoneMap[z]) {
        zoneMap[z] = { zoneName: z, centralEnergy: 0, subMetersEnergy: 0, totalLossKwh: 0, lossValueCurrency: 0, transformersCount: 0, subscribersCount: 0 };
      }
      zoneMap[z].centralEnergy += item.centralEnergyKwh;
      zoneMap[z].subMetersEnergy += item.subMetersEnergyKwh;
      zoneMap[z].totalLossKwh += item.totalLossKwh;
      zoneMap[z].lossValueCurrency += item.lossValueCurrency;
      zoneMap[z].transformersCount += 1;
      zoneMap[z].subscribersCount += item.subscribersCount;
    });

    return Object.values(zoneMap).map(z => {
      const lossPercent = z.centralEnergy > 0 ? (z.totalLossKwh / z.centralEnergy) * 100 : 0;
      let trafficLight: 'green' | 'yellow' | 'red' = 'green';
      if (lossPercent > 10) trafficLight = 'red';
      else if (lossPercent >= 5) trafficLight = 'yellow';

      return {
        ...z,
        lossPercent,
        trafficLight
      };
    }).sort((a, b) => b.lossPercent - a.lossPercent);
  }, [allTransformerLossList, settings.zones]);

  const overallLossTotals = useMemo(() => {
    const totalCentral = allTransformerLossList.reduce((sum, item) => sum + item.centralEnergyKwh, 0);
    const totalSubEnergy = allTransformerLossList.reduce((sum, item) => sum + item.subMetersEnergyKwh, 0);
    const totalLossKwh = allTransformerLossList.reduce((sum, item) => sum + item.totalLossKwh, 0);
    const totalLossCurrency = allTransformerLossList.reduce((sum, item) => sum + item.lossValueCurrency, 0);
    const overallLossPercent = totalCentral > 0 ? (totalLossKwh / totalCentral) * 100 : 0;
    const redCount = allTransformerLossList.filter(item => item.trafficLight === 'red').length;
    const yellowCount = allTransformerLossList.filter(item => item.trafficLight === 'yellow').length;

    return {
      totalCentral,
      totalSubEnergy,
      totalLossKwh,
      totalLossCurrency,
      overallLossPercent,
      redCount,
      yellowCount,
      totalTransformersCount: allTransformerLossList.length
    };
  }, [allTransformerLossList]);

  // Inventory Aggregations
  const inventoryValue = useMemo(() => inventory.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0), [inventory]);
  const lowStockItems = useMemo(() => inventory.filter(i => i.quantity <= i.minQuantity), [inventory]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    inventory.forEach(i => {
      if (!stats[i.category]) stats[i.category] = 0;
      stats[i.category] += i.quantity * i.unitPrice;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [inventory]);

  const downloadStatementAsImage = () => {
    setDownloadingImage(true);
    const printElement = document.querySelector('.statement-print-container');
    if (!printElement) {
      setDownloadingImage(false);
      return;
    }
    
    html2canvas(printElement as HTMLElement, {
      backgroundColor: '#FFFFFF',
      scale: 1.5,
      useCORS: true,
      logging: false,
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `voltera_statement_${statementSub?.name || 'subscriber'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setDownloadingImage(false);
    }).catch(err => {
      console.error("Failed to generate statement image", err);
      setDownloadingImage(false);
    });
  };

  useEffect(() => {
    if (printingStatement) {
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.error("Print failed:", e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printingStatement]);

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-amber-500" />
              <span>وحدة التقارير الشاملة وتحليلات النظام (ERP Reports)</span>
            </h2>
            <p className="text-xs text-slate-500 font-bold mt-1">
              مركز الرقابة واتخاذ القرار المالي والتشغيلي وإدارة المحطة
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const rows = filteredPayments.map(p => [
                  p.id, p.paymentDate, p.subscriberName, p.amountPaid, p.receiptNumber || '', p.receivedBy || ''
                ]);
                exportToCSV(`financial_report_${new Date().toISOString().split('T')[0]}.csv`, rows, ['المعرف', 'التاريخ', 'اسم المشترك', 'المبلغ', 'رقم الإيصال', 'المحصل']);
              }}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-200"
            >
              <Download className="w-4 h-4" />
              <span>تصدير Excel (CSV)</span>
            </button>
            <button
              onClick={() => safePrint()}
              className="bg-slate-800 hover:bg-slate-900 active:scale-95 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الشاشة</span>
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Presets */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
              <button onClick={() => handlePresetMonth('this_month')} className="px-2.5 py-1 rounded hover:bg-slate-100 text-slate-700">هذا الشهر</button>
              <button onClick={() => handlePresetMonth('last_month')} className="px-2.5 py-1 rounded hover:bg-slate-100 text-slate-700">الشهر السابق</button>
              <button onClick={() => handlePresetMonth('this_year')} className="px-2.5 py-1 rounded hover:bg-slate-100 text-slate-700">هذا العام</button>
              <button onClick={() => handlePresetMonth('all')} className="px-2.5 py-1 rounded hover:bg-slate-100 text-slate-700">كافة الفترات</button>
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">من:</span>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-transparent font-mono outline-none text-slate-800" />
              <span className="text-slate-500">إلى:</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-transparent font-mono outline-none text-slate-800" />
            </div>

            {/* Zone Filter */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
              <Map className="w-4 h-4 text-slate-400" />
              <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)} className="bg-transparent outline-none text-slate-800 font-bold cursor-pointer">
                <option value="all">كافة المناطق</option>
                {(settings.zones || []).map((z, i) => (
                  <option key={i} value={z}>{z}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Filters */}
          {(fromDate || toDate || zoneFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => { setFromDate(''); setToDate(''); setZoneFilter('all'); setSearchQuery(''); }}
              className="text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>

        {/* Tab Buttons Navigation */}
        <div className="flex flex-wrap items-center justify-start gap-2 p-1.5 bg-slate-100 rounded-xl">
          <button 
            onClick={() => setActiveTab('executive')} 
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'executive' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>الملخص التنفيذي</span>
          </button>

          <button 
            onClick={() => setActiveTab('financial')} 
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'financial' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>المالية والأرباح</span>
          </button>

          <button 
            onClick={() => setActiveTab('consumption')} 
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'consumption' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>استهلاك الطاقة</span>
          </button>

          <button 
            onClick={() => setActiveTab('debt_aging')} 
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'debt_aging' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>أعمار الديون</span>
          </button>

          <button 
            onClick={() => setActiveTab('loss')} 
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'loss' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 text-rose-500" />
            <span>الفاقد والتحليل الذكي</span>
          </button>

          <button 
            onClick={() => setActiveTab('inventory')} 
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'inventory' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>المخزون والجرد</span>
          </button>

          <button 
            onClick={() => setActiveTab('hr_payroll')} 
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'hr_payroll' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>المرتبات والموظفين</span>
          </button>

          <button 
            onClick={() => setActiveTab('statements')} 
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'statements' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>كشوف المشتركين</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* EXECUTIVE SUMMARY TAB */}
        {activeTab === 'executive' && (
          <motion.div key="executive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {/* Top Key Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><Wallet className="w-5 h-5" /></div>
                  <span className="text-[10px] font-bold px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg">إيرادات نقدية</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 font-mono mb-1">
                  {totalRevenueCombined.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                </h3>
                <p className="text-xs text-slate-500 font-bold">إجمالي التحصيل والاشتراكات</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600"><TrendingDown className="w-5 h-5" /></div>
                  <span className="text-[10px] font-bold px-2 py-1 bg-rose-100 text-rose-800 rounded-lg">مصروفات وتشغيل</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 font-mono mb-1">
                  {totalAllExpenses.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                </h3>
                <p className="text-xs text-slate-500 font-bold">مصاريف ديزل ومشتريات ورواتب</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className={`p-2.5 rounded-xl ${netOperatingProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${netOperatingProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {totalRevenueCombined > 0 ? ((netOperatingProfit / totalRevenueCombined) * 100).toFixed(1) : 0}% هامش
                  </span>
                </div>
                <h3 className={`text-2xl font-black font-mono mb-1 ${netOperatingProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {netOperatingProfit.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                </h3>
                <p className="text-xs text-slate-500 font-bold">صافي الأرباح التشغيلية</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2.5 bg-sky-50 rounded-xl text-sky-600"><Zap className="w-5 h-5" /></div>
                  <span className="text-[10px] font-bold px-2 py-1 bg-sky-100 text-sky-800 rounded-lg font-mono">{totalConsumptionKwh.toLocaleString()} ك.و</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 font-mono mb-1">
                  {subscribers.length} <span className="text-xs text-slate-500 font-sans">مشترك</span>
                </h3>
                <p className="text-xs text-slate-500 font-bold">إجمالي المشتركين بالمنظومة</p>
              </div>
            </div>

            {/* Income Statement & Financial P&L Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <span>قائمة الأرباح والخسائر المجمعة (Profit & Loss Statement)</span>
                </h3>
                <span className="text-xs font-mono text-slate-500">الفترة المحددة بالفلتر</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-bold">
                {/* Revenues Block */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-sm font-black text-emerald-700 pb-2 border-b border-slate-200 flex justify-between items-center">
                    <span>1. الإيرادات التشغيلية (Revenues)</span>
                    <span className="font-mono text-emerald-600">{totalRevenueCombined.toLocaleString()} {settings.currency}</span>
                  </h4>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600">تحصيلات فواتير استهلاك الكهرباء:</span>
                    <span className="font-mono text-slate-900">{totalCashCollected.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600">رسوم الاشتراكات والتوصيلات الجديدة:</span>
                    <span className="font-mono text-slate-900">{totalConnectionFees.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-dashed border-slate-200 pt-2">
                    <span className="text-slate-600">إجمالي الفواتير الصادرة (قبل التحصيل):</span>
                    <span className="font-mono text-amber-600">{totalBilledInvoices.toLocaleString()} {settings.currency}</span>
                  </div>
                </div>

                {/* Expenses Block */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-sm font-black text-rose-700 pb-2 border-b border-slate-200 flex justify-between items-center">
                    <span>2. المصروفات والتكاليف (Expenses)</span>
                    <span className="font-mono text-rose-600">{totalAllExpenses.toLocaleString()} {settings.currency}</span>
                  </h4>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600">مصروفات الوقود والتشغيل والصيانة:</span>
                    <span className="font-mono text-slate-900">{totalOperatingExpensesAmount.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600">مشتريات الأصول والمواد الكهربائية:</span>
                    <span className="font-mono text-slate-900">{totalPurchasesAmount.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600">رواتب وأجور الموظفين والفنيين:</span>
                    <span className="font-mono text-slate-900">{totalSalariesPaid.toLocaleString()} {settings.currency}</span>
                  </div>
                </div>
              </div>

              {/* Net Result Bar */}
              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                netOperatingProfit >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div>
                  <h4 className="font-black text-sm">النتيجة النهائية للنشاط التشغيلي</h4>
                  <p className="text-xs opacity-80 mt-0.5">الفارق المالي المتبقي بعد تغطية كافة المصروفات التشغيلية والمشتريات</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold block opacity-70">صافي الأرباح</span>
                  <span className="text-2xl font-black font-mono">
                    {netOperatingProfit.toLocaleString()} <span className="text-xs font-sans">{settings.currency}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Trend Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>مقارنة الإيرادات بالمصروفات شهرياً</span>
              </h3>
              <div className="h-[280px] w-full">
                {monthlyFinancialTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyFinancialTrend} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                      <Bar dataKey="revenue" name="التحصيل النقدي" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="المصروفات" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">لا توجد بيانات كافية خلال الفترة المحددة</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* FINANCIAL & PROFITS TAB */}
        {activeTab === 'financial' && (
          <motion.div key="financial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-emerald-50 rounded-lg"><Wallet className="w-5 h-5 text-emerald-600" /></div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 font-mono mb-1">{totalCashCollected.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span></h3>
                <p className="text-xs text-slate-500 font-bold">إجمالي التحصيل النقدي الفعلي</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-amber-50 rounded-lg"><FileText className="w-5 h-5 text-amber-600" /></div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 font-mono mb-1">{totalBilledInvoices.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span></h3>
                <p className="text-xs text-slate-500 font-bold">إجمالي الفواتير الصادرة</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-rose-50 rounded-lg"><CreditCard className="w-5 h-5 text-rose-600" /></div>
                </div>
                <h3 className="text-2xl font-black text-rose-600 font-mono mb-1">{totalUncollectedDebt.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span></h3>
                <p className="text-xs text-slate-500 font-bold">إجمالي الديون القائمة لم تُحصل</p>
              </div>
            </div>

            {/* Collector Performance Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>تقرير كفاءة تحصيلات المحصلين الميدانيين</span>
                </h3>
                <span className="text-xs font-mono text-slate-500">عدد المحصلين: {collectorStats.length}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="p-3">اسم المحصل</th>
                      <th className="p-3 text-center">عدد المقبوضات</th>
                      <th className="p-3 text-center">إجمالي المبلغ المحصل</th>
                      <th className="p-3 text-center">النسبة من إجمالي التحصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                    {collectorStats.map((col, idx) => {
                      const sharePercent = totalCashCollected > 0 ? (col.totalCollected / totalCashCollected) * 100 : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-black text-slate-900">{col.collectorName}</td>
                          <td className="p-3 text-center font-mono">{col.receiptsCount} إيصال</td>
                          <td className="p-3 text-center font-mono text-emerald-600">{col.totalCollected.toLocaleString()} {settings.currency}</td>
                          <td className="p-3 text-center font-mono">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-black">
                              {sharePercent.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {collectorStats.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-400">لا توجد حركات تحصيل مسجلة للفترة المحددة</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* CONSUMPTION TAB */}
        {activeTab === 'consumption' && (
          <motion.div key="consumption" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-sky-500" />
                  <span>تحليل استهلاك الطاقة الكهربائية</span>
                </h3>
                <div className="bg-sky-50 text-sky-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
                  <span>إجمالي الاستهلاك:</span>
                  <span className="font-mono text-lg">{totalConsumptionKwh.toLocaleString()}</span>
                  <span>ك.و.س</span>
                </div>
              </div>

              {/* Top Consuming Subscribers Table */}
              <div className="space-y-3">
                <h4 className="font-black text-xs text-slate-700">المشتركون الأكثر استهلاكاً للطاقة الكهربائية (Top Consumers)</h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-900 text-white font-bold">
                      <tr>
                        <th className="p-3 text-center">الترتيب</th>
                        <th className="p-3">اسم المشترك</th>
                        <th className="p-3 text-center">رقم العداد</th>
                        <th className="p-3 text-center">المنطقة</th>
                        <th className="p-3 text-center">إجمالي الاستهلاك (ك.و.س)</th>
                        <th className="p-3 text-center">إجمالي المبالغ المفلوترة ({settings.currency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                      {topConsumingSubscribers.map((sub, idx) => (
                        <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center font-mono">#{idx + 1}</td>
                          <td className="p-3 font-black text-slate-900">{sub.name}</td>
                          <td className="p-3 text-center font-mono text-slate-600">{sub.meterNumber}</td>
                          <td className="p-3 text-center text-slate-600">{sub.zone}</td>
                          <td className="p-3 text-center font-mono text-sky-700 font-black">{sub.totalConsumption.toLocaleString()}</td>
                          <td className="p-3 text-center font-mono text-emerald-700 font-black">{sub.totalBilled.toLocaleString()}</td>
                        </tr>
                      ))}
                      {topConsumingSubscribers.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد قراءات مسجلة بالفترة المحددة</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* DEBT AGING TAB */}
        {activeTab === 'debt_aging' && (
          <motion.div key="debt_aging" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {/* Debt Aging Brackets Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md">حتى 30 يوماً</span>
                <h3 className="text-xl font-black text-slate-800 font-mono mt-2">{debtAgingData.bracket30.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span></h3>
                <p className="text-xs text-slate-500 font-bold mt-1">ديون حديثة جارية</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold px-2 py-1 bg-amber-50 text-amber-700 rounded-md">31 - 60 يوماً</span>
                <h3 className="text-xl font-black text-slate-800 font-mono mt-2">{debtAgingData.bracket60.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span></h3>
                <p className="text-xs text-slate-500 font-bold mt-1">ديون متوسطة التأخير</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold px-2 py-1 bg-orange-50 text-orange-700 rounded-md">61 - 90 يوماً</span>
                <h3 className="text-xl font-black text-slate-800 font-mono mt-2">{debtAgingData.bracket90.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span></h3>
                <p className="text-xs text-slate-500 font-bold mt-1">ديون متأخرة عاجلة</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-sm">
                <span className="text-[10px] font-bold px-2 py-1 bg-rose-600 text-white rounded-md">أكثر من 90 يوماً</span>
                <h3 className="text-xl font-black text-rose-600 font-mono mt-2">{debtAgingData.bracketOver90.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span></h3>
                <p className="text-xs text-slate-500 font-bold mt-1">ديون حرجة / يتعين القطع</p>
              </div>
            </div>

            {/* High Debtors Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-rose-600" />
                  <span>قائمة كبار المشتركين المدينين والديون القائمة</span>
                </h3>
                <span className="text-xs font-bold text-slate-500">إجمالي المدينين: {debtAgingData.debtorsList.length}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-3 text-center">الترتيب</th>
                      <th className="p-3">اسم المشترك</th>
                      <th className="p-3 text-center">رقم العداد</th>
                      <th className="p-3 text-center">الهاتف</th>
                      <th className="p-3 text-center">المنطقة</th>
                      <th className="p-3 text-center">الرصيد القائم (المديونية)</th>
                      <th className="p-3 text-center">عمر المديونية (أيام)</th>
                      <th className="p-3 text-center">تواصل مباشر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                    {debtAgingData.debtorsList.slice(0, 20).map((sub, idx) => (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center font-mono">#{idx + 1}</td>
                        <td className="p-3 font-black text-slate-900">{sub.name}</td>
                        <td className="p-3 text-center font-mono text-slate-600">{sub.meterNumber}</td>
                        <td className="p-3 text-center font-mono text-slate-600" dir="ltr">{sub.phone}</td>
                        <td className="p-3 text-center text-slate-600">{sub.zone || 'الرئيسية'}</td>
                        <td className="p-3 text-center font-mono text-rose-600 font-black text-sm">
                          {sub.currentBalance.toLocaleString()} {settings.currency}
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            sub.daysOld > 90 ? 'bg-rose-100 text-rose-700 font-black' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {sub.daysOld} يوم
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {sub.phone && (
                            <a
                              href={`https://wa.me/${sub.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`عزيزي المشترك ${sub.name}، نود تذكيركم برصيدكم القائم ${sub.currentBalance} ${settings.currency} لخدمة الكهرباء. يرجى التكرم بالسداد.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all inline-flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>واتساب</span>
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                    {debtAgingData.debtorsList.length === 0 && (
                      <tr><td colSpan={8} className="p-8 text-center text-slate-400">لا توجد ديون قائمة بحسب المعايير المحددة</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* LOSS & SMART ANALYTICS REPORTS */}
        {activeTab === 'loss' && (
          <motion.div key="loss-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 text-right">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2.5 bg-slate-100 rounded-xl text-slate-800"><Gauge className="w-5 h-5 text-amber-600" /></div>
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg">إجمالي الشبكة</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 font-mono mb-1">{overallLossTotals.totalTransformersCount} <span className="text-xs text-slate-500 font-sans">محول</span></h3>
                <p className="text-xs text-slate-500 font-bold">محولات الطاقة تحت الرقابة</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2.5 bg-sky-50 rounded-xl text-sky-600"><Zap className="w-5 h-5" /></div>
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg">العدادات المركزية</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 font-mono mb-1">{overallLossTotals.totalCentral.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ك.و.س</span></h3>
                <p className="text-xs text-slate-500 font-bold">إجمالي الطاقة المركزية الموزعة</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600"><TrendingUp className="w-5 h-5" /></div>
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-mono">{overallLossTotals.overallLossPercent.toFixed(1)}%</span>
                </div>
                <h3 className="text-2xl font-black text-rose-600 font-mono mb-1">{overallLossTotals.totalLossCurrency.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span></h3>
                <p className="text-xs text-slate-500 font-bold">إجمالي قيمة الفاقد ({overallLossTotals.totalLossKwh.toLocaleString()} ك.و.س)</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-600"><ShieldAlert className="w-5 h-5 text-rose-600" /></div>
                  <span className="text-[10px] font-bold px-2 py-1 bg-rose-500 text-white rounded-md">خطر عاجل</span>
                </div>
                <h3 className="text-2xl font-black text-rose-600 font-mono mb-1">{overallLossTotals.redCount} <span className="text-xs text-slate-500 font-sans">محول</span></h3>
                <p className="text-xs text-slate-500 font-bold">محولات مشبوهة تجاوزت الفاقد 10%</p>
              </div>
            </div>

            {/* SECTION 1: TOP LEAKAGE TRANSFORMERS REPORT */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    <span>تقرير المحولات الأكثر هادراً (Top Leakage Transformers)</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    ترتيب وتصنيف المحولات الكهربائية حسب نسب الهادر والفاقد للتركيز على المحولات المشبوهة
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                      value={lossZoneFilter}
                      onChange={e => setLossZoneFilter(e.target.value)}
                      className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="all">كافة المناطق الجغرافية</option>
                      {(settings.zones || []).map((z, idx) => (
                        <option key={idx} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
                    <ArrowUpDown className="w-4 h-4 text-slate-400" />
                    <select
                      value={lossSortBy}
                      onChange={e => setLossSortBy(e.target.value as any)}
                      className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="percent_desc">نسبة الفاقد % (الأعلى أولاً)</option>
                      <option value="percent_asc">نسبة الفاقد % (الأقل أولاً)</option>
                      <option value="kwh_desc">كمية الفاقد ك.و.س (الأعلى أولاً)</option>
                      <option value="value_desc">القيمة النقدية للفاقد (الأعلى أولاً)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Top Leakage Transformers Bar Chart */}
              {sortedFilteredTransformerLossList.length > 0 && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-black text-slate-700 mb-4 flex items-center justify-between">
                    <span>تحليل هادر المحولات مقارنة بالنسب المسموحة</span>
                    <span className="text-[10px] font-mono text-slate-500">طاقة بالـ ك.و.س %</span>
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sortedFilteredTransformerLossList.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="transformerName" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Bar dataKey="totalLossPercent" name="نسبة الفاقد %" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="centralEnergyKwh" name="استهلاك العداد المركزي (ك.و.س)" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Transformers Table List */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-3 text-center">التصنيف</th>
                      <th className="p-3">اسم المحول</th>
                      <th className="p-3">المنطقة</th>
                      <th className="p-3">رقم العداد المركزي</th>
                      <th className="p-3 text-center">القدرة</th>
                      <th className="p-3 text-center">قراءة المركزية (ك.و)</th>
                      <th className="p-3 text-center">مجموع المشتركين (ك.و)</th>
                      <th className="p-3 text-center">كمية الفاقد (ك.و.س)</th>
                      <th className="p-3 text-center">القيمة النقدية ({settings.currency})</th>
                      <th className="p-3 text-center">نسبة الفاقد</th>
                      <th className="p-3 text-center">حالة التنبيه</th>
                      <th className="p-3 text-center">إجراء ميداني</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold text-slate-800">
                    {sortedFilteredTransformerLossList.map((item, index) => {
                      const isRed = item.trafficLight === 'red';
                      const isYellow = item.trafficLight === 'yellow';
                      const isDispatched = dispatchedInspections[item.transformerName];

                      return (
                        <tr key={index} className={`hover:bg-slate-50 transition-colors ${isRed ? 'bg-rose-50/40' : isYellow ? 'bg-amber-50/30' : ''}`}>
                          <td className="p-3 text-center font-mono font-black">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs text-white ${
                              index === 0 ? 'bg-rose-600 font-black ring-2 ring-rose-300' : index === 1 ? 'bg-amber-500 font-bold' : 'bg-slate-700'
                            }`}>
                              #{index + 1}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-900">{item.transformerName}</td>
                          <td className="p-3 text-slate-600">{item.zone}</td>
                          <td className="p-3 font-mono text-slate-500 text-[11px]">{item.meterNumber}</td>
                          <td className="p-3 text-center font-mono text-amber-600">{item.capacityKva} KVA</td>
                          <td className="p-3 text-center font-mono text-sky-700">{item.centralEnergyKwh.toLocaleString()}</td>
                          <td className="p-3 text-center font-mono text-emerald-700">{item.subMetersEnergyKwh.toLocaleString()}</td>
                          <td className={`p-3 text-center font-mono ${isRed ? 'text-rose-600 font-black' : isYellow ? 'text-amber-600' : 'text-slate-700'}`}>
                            {item.totalLossKwh.toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono font-black text-slate-900">
                            {item.lossValueCurrency.toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono font-black text-sm">
                            <span className={`px-2 py-1 rounded-lg ${isRed ? 'bg-rose-100 text-rose-700' : isYellow ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {item.totalLossPercent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-[11px]">
                            {isRed ? (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-black bg-rose-100 px-2 py-0.5 rounded-md">
                                <ShieldAlert className="w-3.5 h-3.5" /> خطر &gt; 10%
                              </span>
                            ) : isYellow ? (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-md">
                                <AlertTriangle className="w-3.5 h-3.5" /> تنبيه 5-10%
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="w-3.5 h-3.5" /> طبيعي &lt; 5%
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {isRed || isYellow ? (
                              <button
                                onClick={() => setDispatchedInspections(prev => ({ ...prev, [item.transformerName]: true }))}
                                disabled={isDispatched}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm cursor-pointer ${
                                  isDispatched 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                                }`}
                              >
                                {isDispatched ? 'تم التوجيه 🚀' : 'نزول فريق تفتيش'}
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px]">مستقر</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {sortedFilteredTransformerLossList.length === 0 && (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-slate-400 font-bold">
                          لا توجد بيانات محولات مسجلة حالياً لهذه المنطقة.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <motion.div key="inventory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-purple-50 rounded-lg"><Package className="w-5 h-5 text-purple-600" /></div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 font-mono mb-1">{inventoryValue.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span></h3>
                <p className="text-xs text-slate-500 font-bold">إجمالي قيمة المخزون الحالي بالمستودع</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-rose-50 rounded-lg"><AlertTriangle className="w-5 h-5 text-rose-600" /></div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 font-mono mb-1">{lowStockItems.length} <span className="text-xs text-slate-500 font-sans">أصناف</span></h3>
                <p className="text-xs text-slate-500 font-bold">أصناف تجاوزت حد الطلب الأدنى</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">الأصناف المنخفضة بالمخزون (نواقص المستودع)</h3>
                <button
                  onClick={() => {
                    const rows = lowStockItems.map(i => [i.code, i.name, i.quantity, i.minQuantity, i.unitPrice, i.category]);
                    exportToCSV('low_stock_report.csv', rows, ['رقم الصنف', 'الاسم', 'الكمية', 'الحد الأدنى', 'سعر الوحدة', 'التصنيف']);
                  }}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="p-3">رقم الصنف</th>
                      <th className="p-3">الاسم</th>
                      <th className="p-3 text-center">الكمية المتوفرة</th>
                      <th className="p-3 text-center">الحد الأدنى</th>
                      <th className="p-3 text-center">التصنيف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                    {lowStockItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-slate-500">{item.code}</td>
                        <td className="p-3 font-black text-slate-900">{item.name}</td>
                        <td className="p-3 text-center">
                          <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded font-black font-mono text-xs">{item.quantity}</span>
                        </td>
                        <td className="p-3 text-center text-slate-500 font-mono">{item.minQuantity}</td>
                        <td className="p-3 text-center text-slate-500">{item.category}</td>
                      </tr>
                    ))}
                    {lowStockItems.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا توجد نواقص في المخزون حالياً</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* HR & PAYROLL TAB */}
        {activeTab === 'hr_payroll' && (
          <motion.div key="hr_payroll" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-indigo-50 rounded-lg"><Users className="w-5 h-5 text-indigo-600" /></div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 font-mono mb-1">{employees.length} <span className="text-xs text-slate-500 font-sans">موظف</span></h3>
                <p className="text-xs text-slate-500 font-bold">إجمالي كادر الموظفين والفنيين</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-emerald-50 rounded-lg"><Wallet className="w-5 h-5 text-emerald-600" /></div>
                </div>
                <h3 className="text-2xl font-black text-emerald-600 font-mono mb-1">{totalSalariesPaid.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span></h3>
                <p className="text-xs text-slate-500 font-bold">إجمالي الرواتب والبدلات المنصرفة</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-amber-50 rounded-lg"><CreditCard className="w-5 h-5 text-amber-600" /></div>
                </div>
                <h3 className="text-2xl font-black text-amber-600 font-mono mb-1">
                  {(employeeTxs || []).filter(t => t.type === 'advance').reduce((sum, t) => sum + t.amount, 0).toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                </h3>
                <p className="text-xs text-slate-500 font-bold">إجمالي السلف والقروض الممنوحة</p>
              </div>
            </div>

            {/* Employee Salary List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">بيانات كشف مرتبات الموظفين القائمة</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-3">اسم الموظف</th>
                      <th className="p-3 text-center">الوظيفة</th>
                      <th className="p-3 text-center">الراتب الأساسي</th>
                      <th className="p-3 text-center">البدلات</th>
                      <th className="p-3 text-center">الخصومات</th>
                      <th className="p-3 text-center">الصافي المستحق</th>
                      <th className="p-3 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                    {employees.map(emp => {
                      const net = (emp.salary || 0) + (emp.allowances || 0) - (emp.deductions || 0);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-black text-slate-900">{emp.name}</td>
                          <td className="p-3 text-center text-slate-600">{emp.role}</td>
                          <td className="p-3 text-center font-mono text-slate-700">{emp.salary?.toLocaleString()} {settings.currency}</td>
                          <td className="p-3 text-center font-mono text-emerald-600">+{emp.allowances?.toLocaleString() || 0}</td>
                          <td className="p-3 text-center font-mono text-rose-600">-{emp.deductions?.toLocaleString() || 0}</td>
                          <td className="p-3 text-center font-mono text-indigo-700 font-black text-sm">{net.toLocaleString()} {settings.currency}</td>
                          <td className="p-3 text-center">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-black">نشط</span>
                          </td>
                        </tr>
                      );
                    })}
                    {employees.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-400">لا توجد سجلات موظفين مسجلة</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUBSCRIBER STATEMENTS TAB */}
        {activeTab === 'statements' && (
          <motion.div key="statements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  <span>كشوف حسابات المشتركين الرسمية التفصيلية</span>
                </h3>
                
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <select 
                    value={selectedSubId}
                    onChange={(e) => setSelectedSubId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pr-9 pl-4 text-sm focus:outline-none focus:border-amber-500 transition-all font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="" disabled>اختر المشترك لاستعراض الكشف...</option>
                    {filteredSubscribers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} - رقم: {s.meterNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              {statementSub ? (
                <div className="space-y-6">
                  {/* Subscriber Summary Header */}
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="text-xl font-black text-slate-800">{statementSub.name}</h4>
                      <p className="text-slate-500 text-sm mt-1">
                        رقم العداد: <span className="font-mono font-bold text-slate-800">{statementSub.meterNumber}</span> | 
                        المنطقة: <span className="font-bold text-slate-800">{statementSub.zone || 'الرئيسية'}</span> | 
                        الهاتف: <span className="font-mono" dir="ltr">{statementSub.phone}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-bold mb-1">الرصيد القائم المستحق</p>
                      <p className={`text-2xl font-black font-mono ${statementSub.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {statementSub.currentBalance.toLocaleString()} <span className="text-xs font-sans text-slate-500">{settings.currency}</span>
                      </p>
                    </div>
                  </div>

                  {/* Statement Timeline Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-right">
                        <thead className="bg-slate-900 text-white font-bold">
                          <tr>
                            <th className="p-3 text-right">التاريخ</th>
                            <th className="p-3 text-right">بيان العملية والتفاصيل</th>
                            <th className="p-3 text-center">مدين (على المشترك)</th>
                            <th className="p-3 text-center">دائن (المسدد)</th>
                            <th className="p-3 text-center">الرصيد المتبقي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                          {statementTimeline.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-mono text-slate-500">{item.date}</td>
                              <td className="p-3 font-bold text-slate-800">{item.desc}</td>
                              <td className="p-3 font-mono text-rose-600 font-black text-center text-xs">
                                {item.debit > 0 ? `${item.debit.toLocaleString()} ${settings.currency}` : '-'}
                              </td>
                              <td className="p-3 font-mono text-emerald-600 font-black text-center text-xs">
                                {item.credit > 0 ? `${item.credit.toLocaleString()} ${settings.currency}` : '-'}
                              </td>
                              <td className="p-3 font-mono text-center font-black text-slate-900 text-xs">
                                {item.runningBalance.toLocaleString()} {settings.currency}
                              </td>
                            </tr>
                          ))}
                          {statementTimeline.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا توجد حركات مسجلة لهذا المشترك</td></tr>
                          )}
                        </tbody>
                        {statementTimeline.length > 0 && (
                          <tfoot className="bg-slate-50 border-t border-slate-200 font-black text-slate-900">
                            <tr>
                              <td colSpan={2} className="p-3 text-left">إجمالي المبالغ التراكمية:</td>
                              <td className="p-3 font-mono text-rose-600 text-center">
                                {statementTimeline.reduce((sum, i) => sum + i.debit, 0).toLocaleString()} {settings.currency}
                              </td>
                              <td className="p-3 font-mono text-emerald-600 text-center">
                                {statementTimeline.reduce((sum, i) => sum + i.credit, 0).toLocaleString()} {settings.currency}
                              </td>
                              <td className="p-3 font-mono text-center font-black text-rose-600">
                                {statementSub.currentBalance.toLocaleString()} {settings.currency}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={() => setPrintingStatement(true)}
                      className="bg-slate-900 hover:bg-slate-800 text-amber-400 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <Printer className="w-4 h-4" />
                      <span>معاينة وطباعة الكشف الرسمي A4</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-bold">الرجاء اختيار المشترك لعرض كشف الحساب والطباعة</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Printable Statement Overlay */}
      <AnimatePresence>
        {printingStatement && statementSub && (
          <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-md overflow-y-auto flex flex-col items-center justify-start p-4 md:py-10 print:bg-white print:m-0 print:p-0">
            {/* Command Bar */}
            <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl flex justify-between items-center mb-6 shadow-2xl print:hidden animate-fade-in">
              <button 
                onClick={() => setPrintingStatement(false)} 
                className="text-slate-300 hover:text-rose-400 bg-slate-950 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-50/30 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                تراجع وإغلاق
              </button>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 font-bold">معاينة كشف الحساب والطباعة</p>
                <p className="text-xs text-amber-500 font-black">نسخة كشف حساب رسمية (A4)</p>
              </div>
              <div className="flex gap-2">
                {isIframe && (
                  <button 
                    onClick={downloadStatementAsImage}
                    disabled={downloadingImage}
                    className="bg-slate-850 hover:bg-slate-800 disabled:opacity-50 text-amber-400 font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>{downloadingImage ? 'جاري تصدير الصورة...' : 'تنزيل كصورة'}</span>
                  </button>
                )}
                <button 
                  onClick={() => safePrint()} 
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>ابدأ الطباعة</span>
                </button>
              </div>
            </div>

            {/* A4 Print Sheet */}
            <div className="print:p-0 print:m-0 print:shadow-none print:border-none w-full flex justify-center">
              <div 
                className="statement-print-container w-[210mm] max-w-full min-h-0 print:min-h-0 bg-white text-slate-950 p-6 md:p-8 print:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative text-right" 
                dir="rtl"
                style={{ fontFamily: '"Cairo", "Inter", sans-serif' }}
              >
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 print:pb-2 mb-4 print:mb-2">
                  <div className="flex items-center gap-4">
                    {settings.logoUrl ? (
                      <div className="w-20 h-20 print:w-22 print:h-22 p-1.5 bg-white border-2 border-slate-900 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                        <img src={settings.logoUrl} alt="Station Logo" className="w-full h-full object-contain bg-white" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 print:w-20 print:h-20 p-2 bg-slate-950 text-amber-400 rounded-2xl flex items-center justify-center shrink-0 print:bg-slate-950 print:text-amber-400">
                        <Zap className="w-8 h-8" />
                      </div>
                    )}
                    <div>
                      <h1 className="text-xl print:text-2xl font-black text-slate-900">{settings.stationName}</h1>
                      {settings.logoText && <p className="text-xs text-slate-600 font-bold mt-0.5">{settings.logoText}</p>}
                      <div className="text-xs text-slate-500 space-y-0.5 mt-1">
                        {settings.phone && (
                          <p>
                            الهاتف:{' '}
                            <span dir="ltr" className="inline-block font-mono font-bold text-slate-800 text-left">
                              {settings.phone}
                            </span>
                          </p>
                        )}
                        {settings.address && <p>العنوان: {settings.address}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg print:text-xl font-black text-slate-800">كشف حساب مشترك تفصيلي</h2>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">التاريخ: {new Date().toLocaleDateString('en-GB')}</p>
                  </div>
                </div>

                {/* Subscriber Info Grid */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 print:p-3 rounded-2xl border border-slate-200 text-xs mb-4 print:mb-2">
                  <div className="space-y-1">
                    <p><span className="text-slate-500 font-bold">اسم المشترك:</span> <span className="font-extrabold text-slate-900">{statementSub.name}</span></p>
                    <p><span className="text-slate-500 font-bold">رقم المشترك:</span> <span className="font-mono font-bold">{statementSub.id}</span></p>
                    {statementSub.phone && (
                      <p>
                        <span className="text-slate-500 font-bold">رقم الهاتف:</span>{' '}
                        <span className="font-mono font-bold text-slate-900 inline-block text-left" dir="ltr">
                          {statementSub.phone}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p><span className="text-slate-500 font-bold">رقم العداد:</span> <span className="font-mono font-bold">{statementSub.meterNumber}</span></p>
                    <p><span className="text-slate-500 font-bold">المنطقة:</span> <span className="font-bold">{statementSub.zone || 'الرئيسية'}</span></p>
                    <p><span className="text-slate-500 font-bold">الحالة:</span> <span className={`font-bold ${statementSub.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>{statementSub.status === 'active' ? 'نشط' : 'موقف'}</span></p>
                  </div>
                </div>

                {/* Statement Table */}
                <table className="w-full text-xs text-right border-collapse mb-4 print:mb-2">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-400 text-slate-800 font-black">
                      <th className="p-2 text-right">التاريخ</th>
                      <th className="p-2 text-right">البيان</th>
                      <th className="p-2 text-left">مدين (عليه)</th>
                      <th className="p-2 text-left">دائن (له)</th>
                      <th className="p-2 text-left">الرصيد التراكمي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {statementTimeline.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-500 text-[11px]">{item.date}</td>
                        <td className="p-2 font-bold text-slate-700">{item.desc}</td>
                        <td className="p-2 font-mono text-rose-600 font-bold text-left">
                          {item.debit > 0 ? `${item.debit.toLocaleString()} ${settings.currency}` : '-'}
                        </td>
                        <td className="p-2 font-mono text-emerald-600 font-bold text-left">
                          {item.credit > 0 ? `${item.credit.toLocaleString()} ${settings.currency}` : '-'}
                        </td>
                        <td className="p-2 font-mono text-slate-900 font-black text-left">
                          {item.runningBalance.toLocaleString()} {settings.currency}
                        </td>
                      </tr>
                    ))}
                    {statementTimeline.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400 italic">لا توجد حركات سابقة مسجلة</td>
                      </tr>
                    )}
                  </tbody>
                  {statementTimeline.length > 0 && (
                    <tfoot className="bg-slate-50 border-t-2 border-slate-400">
                      <tr className="font-black text-slate-900">
                        <td colSpan={2} className="p-2 text-left">الرصيد التراكمي للعمليات:</td>
                        <td className="p-2 font-mono text-rose-600 text-left">
                          {statementTimeline.reduce((sum, i) => sum + i.debit, 0).toLocaleString()} {settings.currency}
                        </td>
                        <td className="p-2 font-mono text-emerald-600 text-left">
                          {statementTimeline.reduce((sum, i) => sum + i.credit, 0).toLocaleString()} {settings.currency}
                        </td>
                        <td className="p-2 font-mono text-rose-600 text-left">
                          {statementSub.currentBalance.toLocaleString()} {settings.currency}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {/* Final standing section */}
                <div className="flex justify-end mb-4 print:mb-2">
                  <div className="w-72 bg-slate-50 border-2 border-slate-900 p-3 rounded-xl text-center">
                    <span className="block text-xs font-black text-slate-600 mb-0.5">الرصيد النهائي المستحق</span>
                    <span className={`block font-mono font-black text-lg ${statementSub.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {statementSub.currentBalance.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-6 text-center text-xs mt-4 print:mt-2 pt-3 border-t border-slate-200">
                  <div>
                    <p className="font-bold text-slate-600">ختم وتوقيع إدارة المحطة</p>
                    <div className="h-10 print:h-8" />
                    <p className="font-bold text-slate-800">................................................</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-600">المحاسب المالي</p>
                    <div className="h-10 print:h-8" />
                    <p className="font-bold text-slate-800">................................................</p>
                  </div>
                </div>

                {/* Footer credit */}
                <p className="text-[9px] text-slate-400 font-mono text-center mt-4 print:mt-2 pt-2 border-t border-dashed border-slate-200">
                  تم إصدار هذا الكشف آلياً عبر نظام فولترا السحابي لخدمات الطاقة الكهربائية المتكاملة - Voltera ERP
                </p>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Styled Headless A4 Printing Layout Overrides */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }

          #root, div[role="dialog"], div[role="dialog"] > div {
            display: block !important;
            visibility: visible !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
          }

          body * { 
            visibility: hidden !important; 
          }
          
          header, nav, footer, sidebar, .print-hidden, .print\\:hidden, [role="dialog"] > div:first-child, button { 
            display: none !important; 
          }

          .statement-print-container, .statement-print-container * {
            visibility: visible !important;
          }

          .statement-print-container {
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            padding: 2mm 4mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            zoom: 88% !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
          }

          @page {
            size: A4 portrait;
            margin: 5mm 8mm;
          }
        }
      `}} />
    </div>
  );
};
