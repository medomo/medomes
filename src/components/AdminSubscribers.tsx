import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Subscriber, MeterReading, Payment, SystemSettings, User, AuditLog, TariffType
} from '../types';
import { 
  Users, Plus, Search, Trash2, Edit2, FileText, UserX, XCircle, Key, FileCode, CheckCircle2,
  ChevronLeft, ChevronRight, BarChart3, AlertTriangle, Send, Download, Upload, Map as MapIcon, List
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { SubscribersMap } from './SubscribersMap';

interface AdminSubscribersProps {
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  currentUser: User;
  onUpdateSubscribers: (subs: Subscriber[]) => void;
  onAddAuditLog: (log: AuditLog) => void;
}

export const AdminSubscribers: React.FC<AdminSubscribersProps> = ({
  subscribers, readings, payments, settings, currentUser, onUpdateSubscribers, onAddAuditLog
}) => {
  // State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [subSearch, setSubSearch] = useState('');
  const [filterZone, setFilterZone] = useState('all');
  const [filterTransformer, setFilterTransformer] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDebt, setFilterDebt] = useState('all');
  const [filterTariff, setFilterTariff] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscriber | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Subscriber | null>(null);

  // Form states for Add/Edit
  const [newSubName, setNewSubName] = useState('');
  const [newSubPhone, setNewSubPhone] = useState('');
  const [newSubMeter, setNewSubMeter] = useState('');
  const [newSubZone, setNewSubZone] = useState('المنطقة (أ) - وسط المدينة');
  const [newSubTransformer, setNewSubTransformer] = useState("");
  const [newSubTariff, setNewSubTariff] = useState<TariffType>('residential');
  const [newSubInitial, setNewSubInitial] = useState('');
  const [newSubOpeningBalance, setNewSubOpeningBalance] = useState('');
  const [newSubLat, setNewSubLat] = useState('');
  const [newSubLng, setNewSubLng] = useState('');

  // Extract unique zones & transformers
  const uniqueZones = useMemo(() => {
    const zones = new Set(subscribers.map(s => s.zone));
    return Array.from(zones);
  }, [subscribers]);

  const uniqueTransformers = useMemo(() => {
    const fromSettings = (Array.isArray(settings.transformers) ? settings.transformers : []).map((t: any) => typeof t === 'object' ? t.name : t).filter(Boolean);
    const fromSubs = subscribers.map(s => s.transformer).filter(Boolean) as string[];
    return Array.from(new Set([...fromSettings, ...fromSubs]));
  }, [settings.transformers, subscribers]);

  // Filtering
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(sub => {
      const matchesSearch = sub.name.includes(subSearch) || sub.meterNumber.includes(subSearch) || sub.phone.includes(subSearch);
      const matchesZone = filterZone === 'all' || sub.zone === filterZone;
      const matchesTransformer = filterTransformer === 'all' || (filterTransformer === 'none' ? !sub.transformer : sub.transformer === filterTransformer);
      const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
      
      const matchesTariff = filterTariff === 'all' || sub.tariffType === filterTariff;
      let matchesDebt = true;
      if (filterDebt === 'has_debt') matchesDebt = sub.currentBalance > 0;
      if (filterDebt === 'high_debt') matchesDebt = sub.currentBalance > 10000;
      if (filterDebt === 'critical_debt') matchesDebt = sub.currentBalance > 50000;
      
      return matchesSearch && matchesZone && matchesTransformer && matchesStatus && matchesTariff && matchesDebt;
    });
  }, [subscribers, subSearch, filterZone, filterTransformer, filterStatus, filterTariff, filterDebt]);

  // Pagination
  const totalPages = Math.ceil(filteredSubscribers.length / itemsPerPage);
  const paginatedSubscribers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSubscribers.slice(start, start + itemsPerPage);
  }, [filteredSubscribers, currentPage, itemsPerPage]);

  // Handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const toggleAll = () => {
    if (selectedIds.length === paginatedSubscribers.length && paginatedSubscribers.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedSubscribers.map(s => s.id));
    }
  };

  const handleBulkStatusToggle = (newStatus: 'active' | 'suspended') => {
    if (selectedIds.length === 0) return;
    

    const updated = subscribers.map(s => {
      if (selectedIds.includes(s.id)) return { ...s, status: newStatus };
      return s;
    });
    onUpdateSubscribers(updated);
    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      action: 'تحديث حالة مشتركين',
      details: `تم تغيير حالة ${selectedIds.length} مشترك إلى ${newStatus}`,
      timestamp: new Date().toISOString()
    });
    setSelectedIds([]);
  };

      const handleBulkReminder = () => {
    if (selectedIds.length === 0) {
      alert('يرجى تحديد مشترك واحد على الأقل');
      return;
    }
    
    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      action: 'إرسال تذكير',
      details: `إرسال تذكير بالدفع لـ ${selectedIds.length} مشترك`,
      timestamp: new Date().toISOString()
    });
    
    setSelectedIds([]);
  };

  const handleBulkExport = () => {
    if (selectedIds.length === 0) return;
    const selectedSubs = subscribers.filter(s => selectedIds.includes(s.id));
    const csvContent = [
      ['ID', 'Name', 'Phone', 'Meter Number', 'Zone', 'Status', 'Tariff Type', 'Current Balance', 'Created At'],
      ...selectedSubs.map(s => [s.id, s.name, s.phone, s.meterNumber, s.zone, s.status, s.tariffType, s.currentBalance, s.createdAt])
    ].map(e => e.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `subscribers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      if (lines.length <= 1) return; // Empty or just headers

      const newSubs: typeof subscribers = [];
      // Skip header line [0]
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(',');
        if (cols.length < 5) continue; // Basic validation

        // Assumed CSV format: Name, Phone, MeterNumber, Zone, TariffType
        const sub = {
          id: `sub-${Date.now()}-${i}`,
          name: cols[0]?.trim() || 'غير معروف',
          phone: cols[1]?.trim() || '',
          meterNumber: cols[2]?.trim() || `M-${Math.floor(Math.random() * 10000)}`,
          zone: cols[3]?.trim() || 'المنطقة (أ) - وسط المدينة',
          tariffType: (cols[4]?.trim() as any) || 'residential',
          status: 'active' as const,
          openingBalance: 0,
          currentBalance: 0,
          createdAt: new Date().toISOString()
        };
        newSubs.push(sub);
      }

      if (newSubs.length > 0) {
        onUpdateSubscribers([...subscribers, ...newSubs]);
        onAddAuditLog({
          id: `log-${Date.now()}`,
          userId: currentUser.id,
          username: currentUser.username,
          action: 'استيراد مشتركين',
          details: `تم استيراد ${newSubs.length} مشترك من ملف CSV`,
          timestamp: new Date().toISOString()
        });
        alert(`تم استيراد ${newSubs.length} مشترك بنجاح`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteSubscriber = (id: string, name: string) => {
      onUpdateSubscribers(subscribers.filter(s => s.id !== id));
      onAddAuditLog({
        id: `log-${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.username,
        action: 'حذف مشترك',
        details: `حذف المشترك: ${name}`,
        timestamp: new Date().toISOString()
      });
  };

  const toggleSubStatus = (sub: Subscriber) => {
    const newStatus = sub.status === 'active' ? 'suspended' : 'active';
    onUpdateSubscribers(subscribers.map(s => s.id === sub.id ? { ...s, status: newStatus } : s));
    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      action: 'تحديث حالة مشترك',
      details: `تغيير حالة المشترك ${sub.name} إلى ${newStatus}`,
      timestamp: new Date().toISOString()
    });
  };

  const saveNewSubscriber = () => {
    if (!newSubName || !newSubMeter) {
      alert("الاسم ورقم العداد مطلوبان.");
      return;
    }
    const newSub: Subscriber = {
      id: Date.now().toString(),
      name: newSubName,
      phone: newSubPhone,
      meterNumber: newSubMeter,
      zone: newSubZone,
      transformer: newSubTransformer,
      tariffType: newSubTariff,
      initialReading: Number(newSubInitial) || 0,
      currentReading: Number(newSubInitial) || 0,
      currentBalance: Number(newSubOpeningBalance) || 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      coordinates: newSubLat && newSubLng ? {
        lat: Number(newSubLat),
        lng: Number(newSubLng)
      } : undefined
    };
    onUpdateSubscribers([...subscribers, newSub]);
    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      action: 'إضافة مشترك',
      details: `تم إضافة المشترك الجديد: ${newSub.name}`,
      timestamp: new Date().toISOString()
    });
    setShowAddSubModal(false);
    setNewSubName(''); setNewSubPhone(''); setNewSubMeter(''); setNewSubInitial(''); setNewSubOpeningBalance('');
    setNewSubLat(''); setNewSubLng('');
  };

  const saveEditingSub = () => {
    if (!editingSub) return;
    onUpdateSubscribers(subscribers.map(s => s.id === editingSub.id ? editingSub : s));
    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      action: 'تعديل مشترك',
      details: `تعديل بيانات المشترك: ${editingSub.name}`,
      timestamp: new Date().toISOString()
    });
    setEditingSub(null);
  };

  return (
    <motion.div
      key="subscribers-sec"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right"
    >
      {/* Header & Main Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowAddSubModal(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مشترك جديد</span>
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>استيراد CSV</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".csv" 
            className="hidden" 
          />
        </div>
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            placeholder="البحث بالاسم، العداد، الجوال..."
            value={subSearch}
            onChange={e => {
              setSubSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-xl py-2.5 px-4 pr-10 text-slate-200 text-right text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
        </div>
      </div>

      {/* Advanced Filters & Bulk Actions */}
      <div className="bg-gradient-to-br from-slate-900/60 to-slate-900/30 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 flex flex-col xl:flex-row justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <List className="w-3.5 h-3.5" />
              قائمة
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              خريطة
            </button>
          </div>
          <div className="w-px h-6 bg-slate-800 mx-1"></div>
          <select 
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="bg-slate-900/80 border border-slate-700/60 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="suspended">موقوف</option>
          </select>
          <select 
            value={filterTariff}
            onChange={e => { setFilterTariff(e.target.value); setCurrentPage(1); }}
            className="bg-slate-900/80 border border-slate-700/60 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"
          >
            <option value="all">كل التعرفات</option>
            <option value="residential">منزلي</option>
            <option value="commercial">تجاري</option>
            <option value="industrial">صناعي</option>
          </select>
          <select 
            value={filterZone}
            onChange={e => { setFilterZone(e.target.value); setCurrentPage(1); }}
            className="bg-slate-900/80 border border-slate-700/60 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"
          >
            <option value="all">كل المناطق</option>
            {uniqueZones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          <select 
            value={filterTransformer}
            onChange={e => { setFilterTransformer(e.target.value); setCurrentPage(1); }}
            className="bg-slate-900/80 border border-slate-700/60 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"
          >
            <option value="all">كل المحولات / العدادات المركزية</option>
            <option value="none">بدون محول محدد</option>
            {uniqueTransformers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select 
            value={filterDebt}
            onChange={e => { setFilterDebt(e.target.value); setCurrentPage(1); }}
            className="bg-slate-900/80 border border-slate-700/60 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"
          >
            <option value="all">جميع الأرصدة</option>
            <option value="has_debt">عليه مديونية ({">"} 0)</option>
            <option value="high_debt">متعثر (أكثر من 10,000)</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2 items-center bg-slate-950/50 p-1.5 rounded-lg border border-slate-800/50">
          <span className="text-[10px] text-slate-400 font-bold px-2">إجراءات مجمعة ({selectedIds.length}):</span>
          <button 
            disabled={selectedIds.length === 0}
            onClick={() => handleBulkStatusToggle('suspended')}
            className={`text-[10px] px-3 py-1.5 rounded-md transition-all active:scale-95 flex items-center gap-1 ${selectedIds.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent' : 'bg-gradient-to-b from-rose-500/10 to-rose-500/5 text-rose-400 border border-rose-500/20 hover:from-rose-500/20 hover:to-rose-500/10 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]'}`}
          >
            <UserX className="w-3 h-3" />
            إيقاف الخدمة
          </button>
          <button 
            disabled={selectedIds.length === 0}
            onClick={() => handleBulkStatusToggle('active')}
            className={`text-[10px] px-3 py-1.5 rounded-md transition-all active:scale-95 flex items-center gap-1 ${selectedIds.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent' : 'bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 text-emerald-400 border border-emerald-500/20 hover:from-emerald-500/20 hover:to-emerald-500/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}
          >
            <CheckCircle2 className="w-3 h-3" />
            تفعيل الخدمة
          </button>
          <button 
            disabled={selectedIds.length === 0}
            onClick={handleBulkReminder}
            className={`text-[10px] px-3 py-1.5 rounded-md transition-all active:scale-95 flex items-center gap-1 ${selectedIds.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent' : 'bg-gradient-to-b from-cyan-500/10 to-cyan-500/5 text-cyan-400 border border-cyan-500/20 hover:from-cyan-500/20 hover:to-cyan-500/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]'}`}
          >
            <Send className="w-3 h-3" />
            رسالة تذكير
          </button>
          <button 
            disabled={selectedIds.length === 0}
            onClick={handleBulkExport}
            className={`text-[10px] px-3 py-1.5 rounded-md transition-all active:scale-95 flex items-center gap-1 ${selectedIds.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent' : 'bg-gradient-to-b from-amber-500/10 to-amber-500/5 text-amber-400 border border-amber-500/20 hover:from-amber-500/20 hover:to-amber-500/10 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]'}`}
          >
            <Download className="w-3 h-3" />
            تصدير CSV
          </button>
        </div>
      </div>

      {viewMode === 'map' ? (
        <SubscribersMap 
          subscribers={filteredSubscribers} 
          allSubscribers={subscribers}
          onUpdateSubscribers={onUpdateSubscribers}
          onAddAuditLog={onAddAuditLog}
          currentUser={currentUser}
          settings={settings}
        />
      ) : (
      <>
      <div className="bg-slate-950/40 rounded-2xl border border-slate-800/80 overflow-x-auto relative shadow-2xl backdrop-blur-xl">
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-slate-900/80 to-slate-800/50 text-slate-300 border-b border-slate-700/80 font-sans tracking-wide">
              <th className="p-4 w-12 text-center">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === paginatedSubscribers.length && paginatedSubscribers.length > 0}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 focus:ring-amber-500 text-amber-500"
                />
              </th>
              <th className="p-4 font-bold">المشترك</th>
              <th className="p-4 font-bold">رقم الهاتف</th>
              <th className="p-4 font-bold">المنطقة والمحول</th>
              <th className="p-4 font-bold text-center">الرصيد المستحق</th>
              <th className="p-4 font-bold text-center">الحالة</th>
              <th className="p-4 font-bold text-center">العمليات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {paginatedSubscribers.map(sub => (
              <tr key={sub.id} className={`transition-all cursor-pointer border-r-2 ${sub.currentBalance > 50000 ? 'bg-rose-950/20 hover:bg-rose-900/40 border-r-rose-500' : sub.currentBalance > 10000 ? 'bg-amber-950/20 hover:bg-amber-900/40 border-r-amber-500' : 'hover:bg-slate-800/40 border-r-transparent'}`}>
                <td className="p-4 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(sub.id)}
                    onChange={() => toggleSelection(sub.id)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 focus:ring-amber-500 text-amber-500"
                  />
                </td>
                <td className="p-4" onClick={() => setSelectedProfile(sub)}>
                  <span className="block font-bold text-amber-500 hover:underline">{sub.name}</span>
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{sub.meterNumber}</span>
                </td>
                <td className="p-4 font-mono text-slate-300" onClick={() => setSelectedProfile(sub)}>{sub.phone}</td>
                <td className="p-4" onClick={() => setSelectedProfile(sub)}>
                  <span className="block font-bold text-slate-300">{sub.zone.replace('المنطقة ', '')}</span>
                  <span className="block text-[10px] text-slate-500">{sub.transformer || 'بدون محول'}</span>
                </td>
                <td className="p-4 text-center font-mono font-bold" onClick={() => setSelectedProfile(sub)}>
                  <span className={sub.currentBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {sub.currentBalance.toLocaleString()} {settings.currency}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => toggleSubStatus(sub)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                      sub.status === 'active' 
                         ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20'
                         : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                    }`}
                  >
                    {sub.status === 'active' ? 'نشط' : 'موقف'}
                  </button>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setEditingSub(sub)}
                      className="bg-slate-950 hover:bg-slate-900 text-amber-400 border border-slate-800 p-1.5 rounded-lg transition-all"
                      title="تعديل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteSubscriber(sub.id, sub.name)}
                      className="bg-slate-950 hover:bg-rose-950/40 text-rose-400 border border-slate-800 hover:border-rose-500/30 p-1.5 rounded-lg transition-all"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginatedSubscribers.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  لا توجد نتائج مطابقة للبحث أو الفلاتر
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>إظهار</span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
          <span>مشترك</span>
          <span className="px-2 border-r border-slate-700">إجمالي: {filteredSubscribers.length}</span>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-300 px-3 font-medium">
              صفحة <span className="text-white">{currentPage}</span> من {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

</>
      )}
{typeof document !== 'undefined' && createPortal(<>
      {/* Modals and Drawers */}

      {/* Add Subscriber Modal */}
      <AnimatePresence>
        {showAddSubModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 rounded-3xl p-6 w-full max-w-2xl text-right border border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setShowAddSubModal(false)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-6 h-6" />
                </button>
                <h3 className="text-lg font-black text-white">إضافة مشترك جديد</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">اسم المشترك</label>
                  <input type="text" value={newSubName} onChange={e => setNewSubName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">رقم الهاتف</label>
                  <input type="text" value={newSubPhone} onChange={e => setNewSubPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">رقم العداد</label>
                  <input type="text" value={newSubMeter} onChange={e => setNewSubMeter(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-mono text-xs focus:border-amber-500 outline-none text-left" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">التعرفة</label>
                  <select value={newSubTariff} onChange={e => setNewSubTariff(e.target.value as TariffType)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none">
                    <option value="residential">سكني</option>
                    <option value="commercial">تجاري</option>
                    <option value="industrial">صناعي</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">المنطقة</label>
                  <select value={newSubZone} onChange={e => setNewSubZone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none">
                    <option value="">-- اختر المنطقة --</option>
                    {(Array.isArray(settings.zones) ? settings.zones : []).map((z: any) => {
                      const val = typeof z === 'object' ? z.name : z;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">المحول (اختياري)</label>
                  <select value={newSubTransformer} onChange={e => setNewSubTransformer(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none">
                    <option value="">-- اختر المحول --</option>
                    {(Array.isArray(settings.transformers) ? settings.transformers : []).map((t: any) => {
                      const val = typeof t === 'object' ? t.name : t;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">القراءة الافتتاحية</label>
                  <input type="number" value={newSubInitial} onChange={e => setNewSubInitial(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">الرصيد الافتتاحي (ديون سابقة)</label>
                  <input type="number" value={newSubOpeningBalance} onChange={e => setNewSubOpeningBalance(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">خط العرض (Latitude) - اختياري</label>
                  <input type="number" step="any" value={newSubLat} onChange={e => setNewSubLat(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left font-mono" placeholder="مثال: 15.3695" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">خط الطول (Longitude) - اختياري</label>
                  <input type="number" step="any" value={newSubLng} onChange={e => setNewSubLng(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left font-mono" placeholder="مثال: 44.1910" dir="ltr" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 text-right mt-3">
                💡 تلميح: يمكنك استخدام أداة "منظار تحديد الإحداثيات للمنازل" (المتقاطع) في تبويب الخريطة لتحديد أي موقع على الخريطة بنقرة واحدة، ثم نسخ الإحداثيات ولصقها هنا.
              </p>
              <div className="mt-4">
                <button onClick={saveNewSubscriber} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-xl text-sm transition-colors">
                  إضافة المشترك
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Edit Subscriber Modal */}
        {editingSub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 rounded-3xl p-6 w-full max-w-2xl text-right border border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setEditingSub(null)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-6 h-6" />
                </button>
                <h3 className="text-lg font-black text-white">تعديل بيانات المشترك</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">اسم المشترك</label>
                  <input type="text" value={editingSub.name} onChange={e => setEditingSub({ ...editingSub, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">رقم الهاتف</label>
                  <input type="text" value={editingSub.phone} onChange={e => setEditingSub({ ...editingSub, phone: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">رقم العداد</label>
                  <input type="text" value={editingSub.meterNumber} onChange={e => setEditingSub({ ...editingSub, meterNumber: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-mono text-xs focus:border-amber-500 outline-none text-left" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">التعرفة</label>
                  <select value={editingSub.tariffType} onChange={e => setEditingSub({ ...editingSub, tariffType: e.target.value as TariffType })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none">
                    <option value="residential">سكني</option>
                    <option value="commercial">تجاري</option>
                    <option value="industrial">صناعي</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">المنطقة</label>
                  <select value={editingSub.zone} onChange={e => setEditingSub({ ...editingSub, zone: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none">
                    <option value="">-- اختر المنطقة --</option>
                    {(Array.isArray(settings.zones) ? settings.zones : []).map((z: any) => {
                      const val = typeof z === 'object' ? z.name : z;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">المحول</label>
                  <select value={editingSub.transformer || ''} onChange={e => setEditingSub({ ...editingSub, transformer: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none">
                    <option value="">-- اختر المحول --</option>
                    {(Array.isArray(settings.transformers) ? settings.transformers : []).map((t: any) => {
                      const val = typeof t === 'object' ? t.name : t;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">تعديل المديونية يدوياً</label>
                  <input type="number" value={editingSub.currentBalance} onChange={e => setEditingSub({ ...editingSub, currentBalance: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-rose-400 font-bold text-xs focus:border-amber-500 outline-none text-left" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">خط العرض (Latitude) - اختياري</label>
                  <input type="number" step="any" value={editingSub.coordinates?.lat ?? ''} onChange={e => setEditingSub({ ...editingSub, coordinates: e.target.value ? { lat: Number(e.target.value), lng: editingSub.coordinates?.lng ?? 0 } : undefined })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left font-mono" placeholder="مثال: 15.3695" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">خط الطول (Longitude) - اختياري</label>
                  <input type="number" step="any" value={editingSub.coordinates?.lng ?? ''} onChange={e => setEditingSub({ ...editingSub, coordinates: e.target.value ? { lat: editingSub.coordinates?.lat ?? 0, lng: Number(e.target.value) } : undefined })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left font-mono" placeholder="مثال: 44.1910" dir="ltr" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 text-right mt-3">
                💡 تلميح: يمكنك استخدام أداة "منظار تحديد الإحداثيات للمنازل" (المتقاطع) في تبويب الخريطة لتحديد أي موقع على الخريطة بنقرة واحدة، ثم نسخ الإحداثيات ولصقها هنا.
              </p>
              <div className="mt-4">
                <button onClick={saveEditingSub} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-xl text-sm transition-colors">
                  حفظ التعديلات
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comprehensive Subscriber Profile Drawer (ملف شامل) */}
      <AnimatePresence>
        {selectedProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex justify-end bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-xl bg-gradient-to-b from-slate-900 to-slate-950 h-full overflow-y-auto border-l border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col"
            >
              <div className="p-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
                <button onClick={() => setSelectedProfile(null)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-white transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
                <div className="text-right">
                  <h2 className="text-lg font-black text-white">الملف الشامل للمشترك</h2>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedProfile.id}</p>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1 text-right">
                {/* Header Info */}
                <div className="flex items-center justify-end gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-amber-500">{selectedProfile.name}</h3>
                    <div className="flex items-center justify-end gap-2 mt-1 text-xs text-slate-400">
                      <span className="font-mono">{selectedProfile.phone}</span>
                      <span>|</span>
                      <span>{selectedProfile.zone} ({selectedProfile.transformer || 'بدون محول'})</span>
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Users className="w-8 h-8" />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 font-bold mb-1">الرصيد المستحق (ديون)</span>
                    <span className={`text-xl font-black font-mono ${selectedProfile.currentBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {selectedProfile.currentBalance.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 font-bold mb-1">الاستهلاك الحالي</span>
                    <span className="text-xl font-black font-mono text-cyan-400">
                      {selectedProfile.currentReading} <span className="text-sm">ك.و</span>
                    </span>
                  </div>
                </div>

                {/* Status & Alerts */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${selectedProfile.status === 'active' ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400' : 'bg-rose-950/30 border-rose-900/50 text-rose-400'}`}>
                  {selectedProfile.status === 'active' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                  <div>
                    <h4 className="font-bold text-sm">{selectedProfile.status === 'active' ? 'حالة الخدمة: نشطة' : 'حالة الخدمة: موقوفة'}</h4>
                    <p className="text-xs opacity-80 mt-1">
                      {selectedProfile.currentBalance > 5000 ? 'تحذير: المديونية مرتفعة، يرجى التوجيه بالسداد لتفادي الإيقاف.' : 'المشترك منتظم ضمن الحدود المسموحة.'}
                    </p>
                  </div>
                </div>

                {/* Chart placeholder (Mocked consumption data) */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                  <h4 className="text-xs font-bold text-slate-300 mb-4 text-right">منحنى الاستهلاك (الأشهر الستة الماضية)</h4>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { name: 'يناير', value: 120 },
                        { name: 'فبراير', value: 150 },
                        { name: 'مارس', value: 130 },
                        { name: 'أبريل', value: 180 },
                        { name: 'مايو', value: 210 },
                        { name: 'يونيو', value: 190 },
                      ]}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }}
                          itemStyle={{ color: '#22d3ee' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                                {/* Subscriber Timeline */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2">سجل الأحداث (الخط الزمني)</h4>
                  <div className="relative border-r border-slate-800 pr-4 space-y-6 before:absolute before:inset-y-0 before:right-0 before:w-px before:bg-slate-800">
                    
                    {/* Latest Status Event */}
                    {selectedProfile.status === 'suspended' && (
                      <div className="relative">
                        <span className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-slate-950"></span>
                        <div className="bg-rose-950/20 border border-rose-900/30 rounded-lg p-3">
                          <p className="text-xs font-bold text-rose-400">إيقاف الخدمة</p>
                          <p className="text-[10px] text-slate-400 mt-1">تم إيقاف الخدمة بسبب تجاوز الحد المسموح للمديونية.</p>
                        </div>
                      </div>
                    )}

                    {/* High Debt Warning Event */}
                    {selectedProfile.currentBalance > 10000 && (
                      <div className="relative">
                        <span className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-slate-950"></span>
                        <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-3">
                          <p className="text-xs font-bold text-amber-400">إنذار مديونية</p>
                          <p className="text-[10px] text-slate-400 mt-1">تجاوز الرصيد المستحق حاجز الـ 10,000 {settings.currency}. النظام يوصي بإرسال إشعار.</p>
                        </div>
                      </div>
                    )}

                    {/* Subscription Event */}
                    <div className="relative">
                      <span className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-slate-950"></span>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <p className="text-xs font-bold text-slate-300">إنشاء الاشتراك</p>
                        <p className="text-[10px] text-slate-500 mt-1">تم تسجيل المشترك في النظام وتفعيل الخدمة.</p>
                        <p className="text-[9px] text-slate-600 mt-1 font-mono">{new Date(selectedProfile.createdAt).toLocaleDateString('ar-EG')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transactions Ledger */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2">سجل العمليات الأخير</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {/* Interleaving latest 3 readings and 3 payments for demo */}
                    {readings.filter(r => r.subscriberId === selectedProfile.id).slice(-3).map(r => (
                      <div key={r.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                        <span className="font-mono text-rose-400 font-bold">-{r.totalAmount.toLocaleString()}</span>
                        <div className="text-right">
                          <p className="font-bold text-slate-300">فاتورة استهلاك ({r.consumption} ك.و)</p>
                          <p className="text-[10px] text-slate-500">{r.readingDate}</p>
                        </div>
                      </div>
                    ))}
                    {payments.filter(p => p.subscriberId === selectedProfile.id).slice(-3).map(p => (
                      <div key={p.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                        <span className="font-mono text-emerald-400 font-bold">+{p.amountPaid.toLocaleString()}</span>
                        <div className="text-right">
                          <p className="font-bold text-slate-300">سداد دفعة (سند: {p.receiptNumber})</p>
                          <p className="text-[10px] text-slate-500">{p.paymentDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </>, document.body)}
    </motion.div>
  );
};
