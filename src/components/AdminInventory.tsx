import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, InventoryTransaction, User } from '../types';
import { 
  Package, Plus, Search, ArrowUpRight, ArrowDownRight, AlertTriangle, 
  Filter, LayoutList, LayoutGrid, Download, Printer, Edit2, Trash2, 
  Barcode, MapPin, Tag, RefreshCw, Layers, DollarSign, Building2,
  CheckCircle2, X, SlidersHorizontal, ArrowUpDown
} from 'lucide-react';
import { exportToCSV, printData } from '../utils/exportUtils';
import { motion, AnimatePresence } from 'motion/react';

interface AdminInventoryProps {
  activeTab: 'catalog' | 'transactions' | 'alerts';
  inventory: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  onUpdateInventory: (items: InventoryItem[]) => void;
  onUpdateInventoryTransactions: (transactions: InventoryTransaction[]) => void;
  currentUser: User;
  logAction: (action: string, details: string) => void;
}

export function AdminInventory({
  activeTab: initialTab,
  inventory,
  inventoryTransactions,
  onUpdateInventory,
  onUpdateInventoryTransactions,
  currentUser,
  logAction
}: AdminInventoryProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'transactions' | 'alerts'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'available' | 'low' | 'out'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity-desc' | 'quantity-asc' | 'value-desc'>('name');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [transactionType, setTransactionType] = useState<'in' | 'out' | 'damage' | 'adjustment'>('in');

  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeItem, setBarcodeItem] = useState<InventoryItem | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Item Form State
  const [itemForm, setItemForm] = useState({
    code: '',
    name: '',
    category: 'cables',
    unit: 'متر',
    quantity: '',
    minAlertLevel: '10',
    costPrice: '',
    sellingPrice: '',
    location: '',
    supplier: '',
    notes: ''
  });

  // Transaction Form State
  const [transactionQty, setTransactionQty] = useState('');
  const [transactionNotes, setTransactionNotes] = useState('');
  const [transactionRefNo, setTransactionRefNo] = useState('');

  // Categories mapping
  const categories: Record<string, { label: string; icon: string }> = {
    cables: { label: 'كابلات وأسلاك', icon: '⚡' },
    meters: { label: 'عدادات كهربائية', icon: '📟' },
    breakers: { label: 'قواطع ومفاتيح', icon: '🔌' },
    oil: { label: 'زيوت محولات', icon: '🛢️' },
    transformers: { label: 'محولات ومحطات', icon: '🏭' },
    tools: { label: 'أدوات وصيانة', icon: '🛠️' },
    other: { label: 'أخرى ومستلزمات', icon: '📦' }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalItems = inventory.length;
    const totalValuation = inventory.reduce((sum, item) => {
      const price = item.costPrice || item.unitPrice || 0;
      return sum + (item.quantity * price);
    }, 0);
    const lowStockCount = inventory.filter(item => item.quantity <= item.minAlertLevel && item.quantity > 0).length;
    const outOfStockCount = inventory.filter(item => item.quantity <= 0).length;
    return { totalItems, totalValuation, lowStockCount, outOfStockCount };
  }, [inventory]);

  // Filtered & Sorted Inventory
  const filteredInventory = useMemo(() => {
    return inventory
      .filter(item => {
        const query = searchTerm.toLowerCase().trim();
        const matchesSearch = 
          item.name.toLowerCase().includes(query) ||
          (item.code && item.code.toLowerCase().includes(query)) ||
          (item.location && item.location.toLowerCase().includes(query)) ||
          (item.supplier && item.supplier.toLowerCase().includes(query)) ||
          (item.notes && item.notes.toLowerCase().includes(query));

        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

        let matchesStatus = true;
        if (stockStatusFilter === 'available') matchesStatus = item.quantity > item.minAlertLevel;
        if (stockStatusFilter === 'low') matchesStatus = item.quantity <= item.minAlertLevel && item.quantity > 0;
        if (stockStatusFilter === 'out') matchesStatus = item.quantity <= 0;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'ar');
        if (sortBy === 'quantity-desc') return b.quantity - a.quantity;
        if (sortBy === 'quantity-asc') return a.quantity - b.quantity;
        if (sortBy === 'value-desc') {
          const valA = a.quantity * (a.costPrice || a.unitPrice || 0);
          const valB = b.quantity * (b.costPrice || b.unitPrice || 0);
          return valB - valA;
        }
        return 0;
      });
  }, [inventory, searchTerm, selectedCategory, stockStatusFilter, sortBy]);

  // Handle Opening Add / Edit Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setItemForm({
      code: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      category: 'cables',
      unit: 'متر',
      quantity: '0',
      minAlertLevel: '10',
      costPrice: '',
      sellingPrice: '',
      location: '',
      supplier: '',
      notes: ''
    });
    setShowItemModal(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      code: item.code || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      name: item.name,
      category: item.category || 'cables',
      unit: item.unit || 'حبة',
      quantity: item.quantity.toString(),
      minAlertLevel: item.minAlertLevel.toString(),
      costPrice: (item.costPrice || item.unitPrice || '').toString(),
      sellingPrice: (item.sellingPrice || '').toString(),
      location: item.location || '',
      supplier: item.supplier || '',
      notes: item.notes || ''
    });
    setShowItemModal(true);
  };

  // Handle Save Item (Create or Update)
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(itemForm.costPrice) || 0;
    const selling = parseFloat(itemForm.sellingPrice) || 0;
    const qty = parseFloat(itemForm.quantity) || 0;
    const alertLvl = parseFloat(itemForm.minAlertLevel) || 0;

    if (editingItem) {
      // Update existing item
      const updatedList = inventory.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            code: itemForm.code,
            name: itemForm.name,
            category: itemForm.category,
            unit: itemForm.unit,
            quantity: qty,
            minAlertLevel: alertLvl,
            minQuantity: alertLvl,
            costPrice: cost,
            unitPrice: cost,
            sellingPrice: selling,
            location: itemForm.location,
            supplier: itemForm.supplier,
            notes: itemForm.notes,
            lastUpdated: new Date().toISOString()
          };
        }
        return item;
      });
      onUpdateInventory(updatedList);
      logAction('تحديث صنف مخزون', `تم تحديث بيانات الصنف: ${itemForm.name}`);
    } else {
      // Create new item
      const newItemObj: InventoryItem = {
        id: `inv-${Date.now()}`,
        code: itemForm.code || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        name: itemForm.name,
        category: itemForm.category,
        unit: itemForm.unit,
        quantity: qty,
        minAlertLevel: alertLvl,
        minQuantity: alertLvl,
        costPrice: cost,
        unitPrice: cost,
        sellingPrice: selling,
        location: itemForm.location,
        supplier: itemForm.supplier,
        notes: itemForm.notes,
        lastUpdated: new Date().toISOString()
      };
      onUpdateInventory([...inventory, newItemObj]);
      logAction('إضافة صنف مخزون', `تمت إضافة صنف جديد للمستودع: ${newItemObj.name}`);
    }

    setShowItemModal(false);
  };

  // Delete Item
  const handleDeleteItem = (id: string) => {
    const itemToDelete = inventory.find(i => i.id === id);
    if (!itemToDelete) return;

    const updated = inventory.filter(i => i.id !== id);
    onUpdateInventory(updated);
    logAction('حذف صنف مخزن', `تم حذف الصنف ${itemToDelete.name} من دليل الأصناف`);
    setShowDeleteConfirm(null);
  };

  // Handle Inventory Transactions
  const handleTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const qty = parseFloat(transactionQty);
    if (isNaN(qty) || qty <= 0) {
      alert('يرجى إدخال كمية صحيحة أكبر من الصفر');
      return;
    }

    if ((transactionType === 'out' || transactionType === 'damage') && qty > selectedItem.quantity) {
      alert('الكمية المطلوبة أكبر من المتوفر حالياً في المستودع!');
      return;
    }

    let newQty = selectedItem.quantity;
    if (transactionType === 'in') newQty += qty;
    if (transactionType === 'out' || transactionType === 'damage') newQty -= qty;
    if (transactionType === 'adjustment') newQty = qty; // Direct stock take count

    const unitCost = selectedItem.costPrice || selectedItem.unitPrice || 0;
    const tx: InventoryTransaction = {
      id: `tx-${Date.now()}`,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      type: transactionType,
      quantity: qty,
      unitPrice: unitCost,
      totalValue: qty * unitCost,
      date: new Date().toISOString(),
      user: currentUser.name,
      notes: transactionNotes,
      refNo: transactionRefNo || `REC-${Math.floor(10000 + Math.random() * 90000)}`
    };

    const updatedInventory = inventory.map(item => {
      if (item.id === selectedItem.id) {
        return {
          ...item,
          quantity: newQty,
          lastUpdated: new Date().toISOString()
        };
      }
      return item;
    });

    onUpdateInventory(updatedInventory);
    onUpdateInventoryTransactions([tx, ...inventoryTransactions]);

    const actionText = 
      transactionType === 'in' ? 'إذن توريد' : 
      transactionType === 'out' ? 'إذن صرف' : 
      transactionType === 'damage' ? 'تسجيل توالف' : 'تسوية جردية';

    logAction('عملية مخزنية', `تم تنفيذ ${actionText} بمقدار ${qty} ${selectedItem.unit} للصنف ${selectedItem.name}`);

    setShowTransactionModal(false);
    setTransactionQty('');
    setTransactionNotes('');
    setTransactionRefNo('');
  };

  return (
    <div className="space-y-6 animate-fade-in text-right" dir="rtl">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Package className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-black text-slate-900">دليل الأصناف والمستودع</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium">دليل شامل لإدارة المواد الكهربائية والمعدات، ومتابعة حركة الأرصدة والتكاليف المالية</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => printData(
              'دليل الأصناف والمستودع', 
              filteredInventory.map(item => ({
                code: item.code || '-',
                name: item.name,
                category: categories[item.category]?.label || item.category,
                quantity: `${item.quantity} ${item.unit}`,
                costPrice: (item.costPrice || item.unitPrice || 0).toLocaleString('ar-SA'),
                totalValuation: ((item.costPrice || item.unitPrice || 0) * item.quantity).toLocaleString('ar-SA'),
                location: item.location || '-',
                supplier: item.supplier || '-'
              })), 
              [
                { key: 'code', label: 'كود الصنف' },
                { key: 'name', label: 'اسم الصنف' },
                { key: 'category', label: 'التصنيف' },
                { key: 'quantity', label: 'الرصيد' },
                { key: 'costPrice', label: 'سعر التكلفة' },
                { key: 'totalValuation', label: 'إجمالي القيمة' },
                { key: 'location', label: 'موقع التخزين' }
              ]
            )} 
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>طباعة الدليل</span>
          </button>

          <button 
            onClick={() => exportToCSV(
              filteredInventory.map(item => ({
                ...item,
                categoryLabel: categories[item.category]?.label || item.category,
                totalVal: (item.costPrice || item.unitPrice || 0) * item.quantity
              })), 
              'inventory_catalog', 
              [
                { key: 'code', label: 'الكود' },
                { key: 'name', label: 'اسم الصنف' },
                { key: 'categoryLabel', label: 'التصنيف' },
                { key: 'quantity', label: 'الكمية' },
                { key: 'unit', label: 'الوحدة' },
                { key: 'costPrice', label: 'سعر الشراء' },
                { key: 'totalVal', label: 'إجمالي القيمة' },
                { key: 'location', label: 'الموقع' }
              ]
            )} 
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">إجمالي أصناف الدليل</p>
            <h3 className="text-2xl font-black text-slate-900 font-mono">{stats.totalItems} <span className="text-xs font-normal text-slate-400 font-sans">صنف</span></h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">القيمة المالية للمخزون</p>
            <h3 className="text-2xl font-black text-emerald-600 font-mono">{stats.totalValuation.toLocaleString('ar-SA')} <span className="text-xs font-normal text-slate-400 font-sans">ر.ي</span></h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">أصناف تحت حد الأمان</p>
            <h3 className="text-2xl font-black text-amber-600 font-mono">{stats.lowStockCount} <span className="text-xs font-normal text-slate-400 font-sans">نواقص</span></h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">أصناف منتهية الرصيد</p>
            <h3 className="text-2xl font-black text-rose-600 font-mono">{stats.outOfStockCount} <span className="text-xs font-normal text-slate-400 font-sans">نفد</span></h3>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 space-x-reverse space-x-4 bg-white px-4 rounded-2xl border shadow-sm">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'catalog'
              ? 'border-amber-500 text-amber-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>دليل الأصناف الرئيسية</span>
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">{inventory.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'transactions'
              ? 'border-amber-500 text-amber-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>سجل الحركة والأذونات</span>
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">{inventoryTransactions.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'alerts'
              ? 'border-amber-500 text-amber-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>تنبيهات نواقص المخزون</span>
          {stats.lowStockCount + stats.outOfStockCount > 0 && (
            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
              {stats.lowStockCount + stats.outOfStockCount}
            </span>
          )}
        </button>
      </div>

      {/* CATALOG TAB CONTENT */}
      {activeTab === 'catalog' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          
          {/* Controls Bar: Search, Category Pills, View Switcher */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            
            {/* Top row controls */}
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="ابحث باسم الصنف، الكود SKU، موقع التخزين، المورد..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs text-right focus:border-amber-500 focus:bg-white outline-none transition-all"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status filter dropdown */}
              <div className="relative w-full md:w-44">
                <select
                  value={stockStatusFilter}
                  onChange={e => setStockStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-amber-500 outline-none appearance-none text-right cursor-pointer"
                >
                  <option value="all">كل حالات الرصيد</option>
                  <option value="available">متوفر في المستودع</option>
                  <option value="low">تحت حد الأمان (نواقص)</option>
                  <option value="out">منتهي الرصيد (صفر)</option>
                </select>
              </div>

              {/* Sorting dropdown */}
              <div className="relative w-full md:w-44">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-amber-500 outline-none appearance-none text-right cursor-pointer"
                >
                  <option value="name">ترتيب حسب الاسم</option>
                  <option value="quantity-desc">الأعلى رصيداً</option>
                  <option value="quantity-asc">الأقل رصيداً</option>
                  <option value="value-desc">الأعلى قيمة مالية</option>
                </select>
              </div>

              {/* Grid / Table Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="عرض بطاقات"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="عرض جدول تفصيلي"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category Pills Slider */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>جميع التصنيفات</span>
                <span className="bg-white/20 px-1.5 py-0.2 rounded-md text-[10px] font-mono">{inventory.length}</span>
              </button>

              {Object.entries(categories).map(([key, cat]) => {
                const count = inventory.filter(i => i.category === key).length;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedCategory === key
                        ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat.icon} {cat.label}</span>
                    <span className="bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded-md text-[10px] font-mono">{count}</span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredInventory.map(item => {
                const unitCost = item.costPrice || item.unitPrice || 0;
                const totalLineVal = item.quantity * unitCost;
                const isLow = item.quantity <= item.minAlertLevel && item.quantity > 0;
                const isOut = item.quantity <= 0;
                
                // Progress bar safety calculation
                const safePercent = item.minAlertLevel > 0 
                  ? Math.min(100, Math.round((item.quantity / (item.minAlertLevel * 2)) * 100))
                  : 100;

                return (
                  <div 
                    key={item.id} 
                    className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group ${
                      isOut ? 'border-rose-200 bg-rose-50/20' : isLow ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200/80 hover:border-amber-400'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex justify-between items-center mb-3">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {item.code || `SKU-${item.id.slice(-4)}`}
                        </span>

                        {isOut ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>منتهي الرصيد</span>
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>تحت حد الأمان</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>متوفر</span>
                          </span>
                        )}
                      </div>

                      {/* Item Name & Category */}
                      <h3 className="font-bold text-slate-900 text-base mb-1 line-clamp-2 leading-snug">{item.name}</h3>
                      <p className="text-[11px] text-slate-500 font-medium mb-3 flex items-center gap-1">
                        <span>{categories[item.category]?.icon}</span>
                        <span>{categories[item.category]?.label || item.category}</span>
                        {item.location && (
                          <span className="mr-2 text-slate-400 flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            {item.location}
                          </span>
                        )}
                      </p>

                      {/* Stock Quantity & Health Bar */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
                        <div className="flex justify-between items-baseline mb-1.5">
                          <span className="text-xs text-slate-500 font-bold">الرصيد المتاح</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">{item.quantity}</span>
                            <span className="text-xs font-bold text-slate-600">{item.unit}</span>
                          </div>
                        </div>

                        {/* Visual Progress bar */}
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${safePercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
                          <span>حد التنبيه: {item.minAlertLevel} {item.unit}</span>
                          {unitCost > 0 && <span>القيمة: {totalLineVal.toLocaleString('ar-SA')} ر.ي</span>}
                        </div>
                      </div>

                      {/* Price info if available */}
                      {unitCost > 0 && (
                        <div className="grid grid-cols-2 gap-2 text-right text-[11px] bg-slate-50/50 p-2 rounded-lg border border-slate-100 mb-3 font-mono">
                          <div>
                            <span className="text-slate-400 block text-[9px] font-sans">التكلفة / الوحدة</span>
                            <span className="font-bold text-slate-800">{unitCost.toLocaleString('ar-SA')} <span className="text-[9px]">ر.ي</span></span>
                          </div>
                          {item.sellingPrice ? (
                            <div>
                              <span className="text-slate-400 block text-[9px] font-sans">سعر الإعادة</span>
                              <span className="font-bold text-emerald-600">{item.sellingPrice.toLocaleString('ar-SA')} <span className="text-[9px]">ر.ي</span></span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-slate-400 block text-[9px] font-sans">المورد</span>
                              <span className="font-bold text-slate-700 truncate block">{item.supplier || '-'}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Toolbar */}
                    <div className="border-t border-slate-100 pt-3 mt-2 space-y-2">
                      <div className="flex justify-between gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setTransactionType('in');
                            setShowTransactionModal(true);
                          }}
                          className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="إذن إدخال وتوريد"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>توريد</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setTransactionType('out');
                            setShowTransactionModal(true);
                          }}
                          className="flex-1 bg-sky-50 hover:bg-sky-100 text-sky-700 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="إذن صرف وإخراج"
                        >
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          <span>صرف</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setTransactionType('damage');
                            setShowTransactionModal(true);
                          }}
                          className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="تسجيل توالف"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>تالف</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-dashed border-slate-100 text-slate-400">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setTransactionType('adjustment');
                            setShowTransactionModal(true);
                          }}
                          className="text-[11px] hover:text-slate-800 font-bold flex items-center gap-1 p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="تسوية جردية"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          <span>تسوية جردية</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setBarcodeItem(item);
                              setShowBarcodeModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="طباعة بطاقة البار كود"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="تعديل الصنف"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setShowDeleteConfirm(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف الصنف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">الكود SKU</th>
                      <th className="px-4 py-3">اسم الصنف</th>
                      <th className="px-4 py-3">التصنيف</th>
                      <th className="px-4 py-3">موقع التخزين</th>
                      <th className="px-4 py-3">الرصيد المتاح</th>
                      <th className="px-4 py-3">تكلفة الوحدة</th>
                      <th className="px-4 py-3">إجمالي القيمة</th>
                      <th className="px-4 py-3">الحالة</th>
                      <th className="px-4 py-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInventory.map(item => {
                      const unitCost = item.costPrice || item.unitPrice || 0;
                      const isLow = item.quantity <= item.minAlertLevel && item.quantity > 0;
                      const isOut = item.quantity <= 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-700">{item.code || '-'}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{item.name}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {categories[item.category]?.icon} {categories[item.category]?.label || item.category}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{item.location || '-'}</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 text-sm">
                            {item.quantity} <span className="text-xs font-sans text-slate-500">{item.unit}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700">{unitCost > 0 ? unitCost.toLocaleString('ar-SA') : '-'}</td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-600">{(unitCost * item.quantity).toLocaleString('ar-SA')}</td>
                          <td className="px-4 py-3">
                            {isOut ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold">منتهي</span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">تحت الحماية</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">متوفر</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedItem(item);
                                  setTransactionType('in');
                                  setShowTransactionModal(true);
                                }}
                                className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-bold transition-all text-[11px] flex items-center gap-0.5 cursor-pointer"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>توريد</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedItem(item);
                                  setTransactionType('out');
                                  setShowTransactionModal(true);
                                }}
                                className="p-1.5 bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 font-bold transition-all text-[11px] flex items-center gap-0.5 cursor-pointer"
                              >
                                <ArrowDownRight className="w-3.5 h-3.5" />
                                <span>صرف</span>
                              </button>

                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  setBarcodeItem(item);
                                  setShowBarcodeModal(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Barcode className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredInventory.length === 0 && (
            <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">لا توجد أصناف مطابقة لنتائج البحث</h3>
              <p className="text-xs text-slate-500 mt-1">جرب تغيير معايير البحث أو اختيار تصنيف آخر</p>
            </div>
          )}

        </motion.div>
      )}

      {/* TRANSACTIONS TAB */}
      {activeTab === 'transactions' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">سجل الحركة والأذونات المخزنية</h3>
                <p className="text-xs text-slate-500">متابعة جميع عمليات التوريد والصرف والتوالف والتسويات الجردية</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => printData(
                    'سجل الحركات والأذونات',
                    inventoryTransactions.map(tx => ({
                      refNo: tx.refNo || '-',
                      date: new Date(tx.date).toLocaleString('ar-SA'),
                      itemName: tx.itemName,
                      type: tx.type === 'in' ? 'إذن توريد' : tx.type === 'out' ? 'إذن صرف' : tx.type === 'damage' ? 'تالف' : 'تسوية',
                      quantity: tx.quantity,
                      user: tx.user,
                      notes: tx.notes || '-'
                    })),
                    [
                      { key: 'refNo', label: 'رقم السند' },
                      { key: 'date', label: 'التاريخ والوقت' },
                      { key: 'itemName', label: 'اسم الصنف' },
                      { key: 'type', label: 'نوع الحركة' },
                      { key: 'quantity', label: 'الكمية' },
                      { key: 'user', label: 'المستخدم' },
                      { key: 'notes', label: 'البيان' }
                    ]
                  )}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة السجل</span>
                </button>

                <button
                  onClick={() => exportToCSV(
                    inventoryTransactions,
                    'inventory_transactions_log',
                    [
                      { key: 'refNo', label: 'رقم الإذن' },
                      { key: 'date', label: 'التاريخ' },
                      { key: 'itemName', label: 'الصنف' },
                      { key: 'type', label: 'النوع' },
                      { key: 'quantity', label: 'الكمية' },
                      { key: 'user', label: 'بواسطة' },
                      { key: 'notes', label: 'ملاحظات' }
                    ]
                  )}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير Excel</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">رقم الإذن</th>
                    <th className="px-4 py-3">التاريخ والوقت</th>
                    <th className="px-4 py-3">اسم الصنف</th>
                    <th className="px-4 py-3">نوع الحركة</th>
                    <th className="px-4 py-3">الكمية</th>
                    <th className="px-4 py-3">المستخدم المسئول</th>
                    <th className="px-4 py-3">البيان والملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventoryTransactions.length > 0 ? (
                    inventoryTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">{tx.refNo || '-'}</td>
                        <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                          {new Date(tx.date).toLocaleString('ar-SA')}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{tx.itemName}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold ${
                            tx.type === 'in' ? 'bg-emerald-100 text-emerald-800' :
                            tx.type === 'damage' ? 'bg-rose-100 text-rose-800' :
                            tx.type === 'adjustment' ? 'bg-purple-100 text-purple-800' :
                            'bg-sky-100 text-sky-800'
                          }`}>
                            {tx.type === 'in' ? '📥 توريد / إدخال' :
                             tx.type === 'damage' ? '⚠️ تالف / إتلاف' :
                             tx.type === 'adjustment' ? '⚙️ تسوية جردية' : '📤 صرف / إخراج'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-black text-slate-900 text-sm">{tx.quantity}</td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{tx.user}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-[220px] truncate" title={tx.notes}>
                          {tx.notes || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500">
                        لا توجد حركات مخزنية مسجلة سابقاً
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ALERTS TAB */}
      {activeTab === 'alerts' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <span>شاشة النواقص والطلب المبكر (Safety Stock Alerts)</span>
              </h3>
              <p className="text-xs text-slate-500">تنبيهات تلقائية للأصناف التي اقترب رصيدها من النفاد أو وصلت للحد الأدنى للتنبيه</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {inventory.filter(item => item.quantity <= item.minAlertLevel).map(item => {
                const isZero = item.quantity <= 0;
                return (
                  <div key={item.id} className={`p-5 rounded-2xl border flex flex-col justify-between relative overflow-hidden shadow-sm ${
                    isZero ? 'bg-rose-50/50 border-rose-300' : 'bg-amber-50/40 border-amber-300'
                  }`}>
                    <div className={`absolute top-0 right-0 w-1.5 h-full ${isZero ? 'bg-rose-500' : 'bg-amber-500'}`} />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-700">
                          {item.code || `SKU-${item.id.slice(-4)}`}
                        </span>
                        {isZero ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">منتهي (صفر)</span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">تحت حد الأمان</span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm mb-1">{item.name}</h4>
                      <p className="text-xs text-slate-500 mb-3">{categories[item.category]?.icon} {categories[item.category]?.label || item.category}</p>

                      <div className="bg-white/80 p-3 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">الرصيد الحالي:</span>
                          <span className={`font-mono font-black text-sm ${isZero ? 'text-rose-600' : 'text-amber-600'}`}>{item.quantity} {item.unit}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-1">
                          <span className="text-slate-500">حد التنبيه الأدنـى:</span>
                          <span className="font-mono font-bold text-slate-700">{item.minAlertLevel} {item.unit}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setTransactionType('in');
                          setShowTransactionModal(true);
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>طلب توريد فوري</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {inventory.filter(item => item.quantity <= item.minAlertLevel).length === 0 && (
              <div className="py-16 text-center text-emerald-600 flex flex-col items-center justify-center gap-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                <span className="font-black text-lg text-slate-800">جميع أرصدة المستودع آمنة وفي الحدود الطبيعية</span>
                <span className="text-xs text-slate-500">لا توجد أي نواقص أو مواد بحاجة لإعادة الشراء حالياً</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ADD / EDIT ITEM MODAL */}
      <AnimatePresence>
        {showItemModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowItemModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden border border-slate-100"
            >
              <div className="bg-slate-900 p-5 text-right flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-base">{editingItem ? 'تعديل بيانات صنف مخزني' : 'إضافة صنف جديد لدليل الأصناف'}</h3>
                </div>
                <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="p-6 space-y-4 text-right">
                {/* Code SKU & Auto-generate */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700">كود الصنف / SKU / البار كود</label>
                    <button
                      type="button"
                      onClick={() => setItemForm({ ...itemForm, code: `SKU-${Math.floor(1000 + Math.random() * 9000)}` })}
                      className="text-[11px] text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>توليد كود تلقائي</span>
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={itemForm.code}
                    onChange={e => setItemForm({ ...itemForm, code: e.target.value })}
                    placeholder="مثال: SKU-CBL-16"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right font-mono focus:border-amber-500 outline-none"
                  />
                </div>

                {/* Item Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الصنف الوصفي *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.name}
                    onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="مثال: كابل ألمنيوم 16 ملم مغلف"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right focus:border-amber-500 outline-none"
                  />
                </div>

                {/* Category & Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">التصنيف *</label>
                    <select
                      value={itemForm.category}
                      onChange={e => setItemForm({ ...itemForm, category: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right focus:border-amber-500 outline-none appearance-none"
                    >
                      {Object.entries(categories).map(([key, cat]) => (
                        <option key={key} value={key}>{cat.icon} {cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">وحدة القياس *</label>
                    <input
                      type="text"
                      required
                      value={itemForm.unit}
                      onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
                      placeholder="مثال: متر، حبة، لتر، طقم"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Initial Quantity & Alert Limit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الرصيد الحالي *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={itemForm.quantity}
                      onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right font-mono focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">حد التنبيه للنواقص *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={itemForm.minAlertLevel}
                      onChange={e => setItemForm({ ...itemForm, minAlertLevel: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right font-mono focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Prices: Cost & Selling */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">سعر الشراء / التكلفة (ر.ي)</label>
                    <input
                      type="number"
                      min="0"
                      value={itemForm.costPrice}
                      onChange={e => setItemForm({ ...itemForm, costPrice: e.target.value })}
                      placeholder="مثال: 450"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right font-mono focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">سعر البيع / الإعادة (ر.ي)</label>
                    <input
                      type="number"
                      min="0"
                      value={itemForm.sellingPrice}
                      onChange={e => setItemForm({ ...itemForm, sellingPrice: e.target.value })}
                      placeholder="مثال: 550"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right font-mono focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Storage Location & Supplier */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">موقع التخزين / الرف</label>
                    <input
                      type="text"
                      value={itemForm.location}
                      onChange={e => setItemForm({ ...itemForm, location: e.target.value })}
                      placeholder="مثال: مخزن أ - رف 2"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم المورد الرئيسي</label>
                    <input
                      type="text"
                      value={itemForm.supplier}
                      onChange={e => setItemForm({ ...itemForm, supplier: e.target.value })}
                      placeholder="اسم الشركة / المورد"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات الصنف</label>
                  <textarea
                    rows={2}
                    value={itemForm.notes}
                    onChange={e => setItemForm({ ...itemForm, notes: e.target.value })}
                    placeholder="إرشادات الاستخدام أو المواصفات الفنية..."
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right focus:border-amber-500 outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
                  >
                    {editingItem ? 'حفظ التعديلات' : 'إضافة الصنف للدليل'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowItemModal(false)}
                    className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TRANSACTION MODAL */}
      <AnimatePresence>
        {showTransactionModal && selectedItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowTransactionModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden border border-slate-100"
            >
              <div className={`p-5 text-right text-white ${
                transactionType === 'in' ? 'bg-emerald-600' :
                transactionType === 'damage' ? 'bg-rose-700' :
                transactionType === 'adjustment' ? 'bg-purple-700' : 'bg-sky-600'
              }`}>
                <h3 className="font-bold text-base">
                  {transactionType === 'in' ? 'سند إدخال وتوريد للمستودع' :
                   transactionType === 'out' ? 'سند إخراج وصرف مواد' :
                   transactionType === 'damage' ? 'تسجيل مواد تالفة' : 'تسوية جردية للرصيد'}
                </h3>
              </div>

              <form onSubmit={handleTransaction} className="p-6 space-y-4 text-right">
                {/* Item Card Info */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-slate-400 text-[10px] font-bold">الصنف المحدد:</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedItem.name}</p>
                  <div className="mt-2 flex justify-between items-center text-xs">
                    <span className="font-bold font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {selectedItem.quantity} {selectedItem.unit}
                    </span>
                    <span className="text-slate-500 font-bold">الرصيد الحالي بالمعاينة</span>
                  </div>
                </div>

                {/* Ref No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الإذن / السند / الفاتورة</label>
                  <input
                    type="text"
                    value={transactionRefNo}
                    onChange={e => setTransactionRefNo(e.target.value)}
                    placeholder={`مثال: REC-${Math.floor(10000 + Math.random() * 90000)}`}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-right focus:border-amber-500 outline-none"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {transactionType === 'adjustment' 
                      ? 'الرصيد الفعلي الجديد بعد الجرد' 
                      : `الكمية المراد ${transactionType === 'in' ? 'إضافتها' : 'خصمها'}`}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={transactionQty}
                    onChange={e => setTransactionQty(e.target.value)}
                    placeholder="أدخل الكمية..."
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm text-right font-mono font-bold focus:border-amber-500 outline-none"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البيان / جهة الصرف / سبب العملية</label>
                  <input
                    type="text"
                    value={transactionNotes}
                    onChange={e => setTransactionNotes(e.target.value)}
                    placeholder="ملاحظات تفصيلية لعملية الحركة..."
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black text-white transition-all cursor-pointer ${
                      transactionType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' :
                      transactionType === 'damage' ? 'bg-rose-700 hover:bg-rose-800' :
                      transactionType === 'adjustment' ? 'bg-purple-700 hover:bg-purple-800' : 'bg-sky-600 hover:bg-sky-700'
                    }`}
                  >
                    تأكيد وتسجيل العملية
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTransactionModal(false)}
                    className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BARCODE / TAG MODAL */}
      <AnimatePresence>
        {showBarcodeModal && barcodeItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowBarcodeModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden text-right border border-slate-100 p-6 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-base text-slate-900">بطاقة وسم الصنف</h3>
                </div>
                <button onClick={() => setShowBarcodeModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tag Printable Card */}
              <div className="bg-slate-50 border-2 border-slate-800 p-4 rounded-2xl text-center space-y-3 font-mono print:border-black">
                <h4 className="font-sans font-black text-slate-900 text-sm">{barcodeItem.name}</h4>
                <p className="text-[10px] text-slate-500 font-sans">{categories[barcodeItem.category]?.label || barcodeItem.category}</p>

                {/* Barcode Graphic Simulation */}
                <div className="bg-white p-3 rounded-xl border border-slate-300 flex flex-col items-center justify-center gap-1 my-2">
                  <div className="flex items-center justify-center h-12 w-full gap-1 px-4">
                    {Array.from({ length: 28 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900 h-full rounded-xs"
                        style={{ width: `${(idx % 3 === 0 ? 3 : idx % 2 === 0 ? 1 : 2)}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-900 tracking-widest">{barcodeItem.code || `SKU-${barcodeItem.id}`}</span>
                </div>

                <div className="flex justify-between items-center text-[11px] font-sans text-slate-600 border-t border-slate-200 pt-2">
                  <span>الموقع: {barcodeItem.location || 'المستودع الرئيسي'}</span>
                  <span>الرصيد: {barcodeItem.quantity} {barcodeItem.unit}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => printData(
                    'ملصق باركود صنف',
                    [{
                      code: barcodeItem.code || barcodeItem.id,
                      name: barcodeItem.name,
                      category: categories[barcodeItem.category]?.label || barcodeItem.category,
                      location: barcodeItem.location || '-',
                      unit: barcodeItem.unit
                    }],
                    [
                      { key: 'code', label: 'كود البار كود' },
                      { key: 'name', label: 'الصنف' },
                      { key: 'category', label: 'التصنيف' },
                      { key: 'location', label: 'الموقع' }
                    ]
                  )}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الملصق</span>
                </button>

                <button
                  onClick={() => setShowBarcodeModal(false)}
                  className="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden text-right p-6 space-y-4 border border-slate-100"
            >
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center">
                <h3 className="font-bold text-base text-slate-900">تأكيد حذف الصنف من المستودع</h3>
                <p className="text-xs text-slate-500 mt-1">هل أنت تأكد من رغبتك في إزالة هذا الصنف بشكل دائم من دليل الأصناف؟</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleDeleteItem(showDeleteConfirm)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  نعم، تأكيد الحذف
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
