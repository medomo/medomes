import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { Subscriber, MeterReading, Payment, User, SystemSettings, AuditLog, TechnicalRequest } from '../types';
import { 
  Zap, LogOut, Search, UserRound, Calculator, Banknote, 
  Receipt, FileText, CheckCircle2, AlertTriangle, AlertCircle, Printer, Clock, FilePlus, CreditCard,
  Scissors, Calendar, Download, Wifi, WifiOff, RefreshCw, Bluetooth, Check, Activity, Info,
  Target, TrendingUp, UserCheck, Sparkles, Percent, MapPin, Gauge, ShieldAlert, Edit3,
  MessageSquare, Copy, Share2, Bell, Power, UserPlus, Wrench, Phone, X, Filter, ChevronRight, Radio
} from 'lucide-react';
import { calculateTransformerLoss } from '../utils/lossEngine';
import { getDecadalPeriodInfo, getReadingCycleStatus } from '../utils/cycleUtils';
import { SubscribersMap } from './SubscribersMap';

interface CollectorDashboardProps {
  currentUser: User;
  onLogout: () => void;
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  onAddReading: (reading: MeterReading) => void;
  onAddPayment: (payment: Payment) => void;
  onDeleteReading?: (id: string) => void;
  onEditReading?: (reading: MeterReading) => void;
  onDeletePayment?: (id: string) => void;
  onEditPayment?: (payment: Payment) => void;
  onUpdateSettings?: (settings: SystemSettings) => void;
  onUpdateSubscribers?: (subs: Subscriber[]) => void;
  onAddAuditLog?: (log: AuditLog) => void;
  isOnline?: boolean;
  pendingSyncCount?: number;
  onSync?: () => Promise<void>;
  isSyncing?: boolean;
  techRequests?: TechnicalRequest[];
  onUpdateTechRequests?: (reqs: TechnicalRequest[]) => void;
}

export const CollectorDashboard: React.FC<CollectorDashboardProps> = ({
  currentUser,
  onLogout,
  subscribers,
  readings,
  payments,
  settings,
  onAddReading,
  onAddPayment,
  onDeleteReading,
  onEditReading,
  onDeletePayment,
  onEditPayment,
  onUpdateSettings,
  onUpdateSubscribers,
  onAddAuditLog,
  isOnline = true,
  pendingSyncCount = 0,
  onSync,
  isSyncing = false,
  techRequests = [],
  onUpdateTechRequests
}) => {
  const [activeTab, setActiveTab] = useState<'reading' | 'master_reading' | 'payment' | 'statement' | 'history' | 'map'>('reading');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSub, setSelectedSub] = useState<Subscriber | null>(null);

  // Work Order & Manager Notifications States
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'disconnection' | 'reconnection' | 'maintenance'>('all');
  const [selectedOrderForExec, setSelectedOrderForExec] = useState<TechnicalRequest | null>(null);
  const [execNotes, setExecNotes] = useState('');
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('voltera_collector_read_notifs');
    return saved ? JSON.parse(saved) : [];
  });
  const [toastAlert, setToastAlert] = useState<TechnicalRequest | null>(null);
  const prevOrdersCountRef = React.useRef<number>(0);

  // Active work orders list (disconnection, reconnection, new connection, maintenance)
  const activeWorkOrders = useMemo(() => {
    return (techRequests || []).filter(r => 
      r.type === 'disconnection' || r.type === 'reconnection' || r.type === 'new_connection' || r.type === 'maintenance'
    );
  }, [techRequests]);

  const filteredWorkOrders = useMemo(() => {
    if (notifFilter === 'all') return activeWorkOrders;
    if (notifFilter === 'reconnection') return activeWorkOrders.filter(r => r.type === 'reconnection' || r.type === 'new_connection');
    return activeWorkOrders.filter(r => r.type === notifFilter);
  }, [activeWorkOrders, notifFilter]);

  const pendingNotifCount = useMemo(() => {
    return activeWorkOrders.filter(r => 
      (r.status === 'pending' || r.status === 'in_progress') && !readNotifIds.includes(r.id)
    ).length;
  }, [activeWorkOrders, readNotifIds]);

  // Real-time toast alert when manager issues new disconnection/reconnection order
  useEffect(() => {
    const currentPending = activeWorkOrders.filter(r => r.status === 'pending');
    if (currentPending.length > prevOrdersCountRef.current && prevOrdersCountRef.current > 0) {
      setToastAlert(currentPending[0]);
    }
    prevOrdersCountRef.current = currentPending.length;
  }, [activeWorkOrders]);

  const handleMarkAllNotifsRead = () => {
    const allIds = activeWorkOrders.map(r => r.id);
    setReadNotifIds(allIds);
    localStorage.setItem('voltera_collector_read_notifs', JSON.stringify(allIds));
  };

  const handleOpenNotifDrawer = () => {
    setIsNotifDrawerOpen(true);
    handleMarkAllNotifsRead();
  };

  const handleExecuteWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForExec || !onUpdateTechRequests) return;

    const req = selectedOrderForExec;
    const completedAt = new Date().toISOString().split('T')[0];
    const updatedReq: TechnicalRequest = {
      ...req,
      status: 'completed',
      completedAt,
      executedBy: currentUser.name,
      notes: execNotes ? `${req.notes ? req.notes + ' | ' : ''}تنفيذ المحصل: ${execNotes}` : req.notes
    };

    const updatedList = (techRequests || []).map(r => r.id === req.id ? updatedReq : r);
    onUpdateTechRequests(updatedList);

    // Update subscriber status if matched
    const matchedSub = subscribers.find(s => 
      (req.subscriberId && s.id === req.subscriberId) ||
      (req.subscriberCode && (s.accountNumber === req.subscriberCode || s.meterNumber === req.subscriberCode)) ||
      (s.name.trim() === req.applicantName.trim()) ||
      (req.phone && s.phone === req.phone)
    );

    if (matchedSub && onUpdateSubscribers) {
      let newSubStatus: Subscriber['status'] = matchedSub.status;
      if (req.type === 'disconnection') {
        newSubStatus = 'disconnected';
      } else if (req.type === 'reconnection' || req.type === 'new_connection') {
        newSubStatus = 'active';
      }

      const updatedSubscribers = subscribers.map(s => {
        if (s.id === matchedSub.id) {
          return {
            ...s,
            status: newSubStatus,
            notes: execNotes ? `${s.notes ? s.notes + '\n' : ''}[${completedAt}] تم ${req.type === 'disconnection' ? 'فصل الخدمة' : 'إعادة/توصيل الخدمة'}: ${execNotes}` : s.notes
          };
        }
        return s;
      });

      onUpdateSubscribers(updatedSubscribers);
    }

    if (onAddAuditLog) {
      onAddAuditLog({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'تنفيذ أمر ميداني',
        details: `قام المحصل ${currentUser.name} بتنفيذ أمر (${req.type === 'disconnection' ? 'فصل خدمة' : req.type === 'reconnection' ? 'إعادة خدمة' : 'طلب فني'}) للمشترك ${req.applicantName}. ${execNotes ? 'ملاحظات: ' + execNotes : ''}`
      });
    }

    setSelectedOrderForExec(null);
    setExecNotes('');
  };

  const handleUpdateOrderStatus = (req: TechnicalRequest, status: TechnicalRequest['status']) => {
    if (!onUpdateTechRequests) return;
    const updatedReq: TechnicalRequest = { ...req, status };
    const updatedList = (techRequests || []).map(r => r.id === req.id ? updatedReq : r);
    onUpdateTechRequests(updatedList);
  };

  // Master Meter Synchronized Reading States
  const [selectedMasterTransformer, setSelectedMasterTransformer] = useState<string>('');
  const [masterPrevReading, setMasterPrevReading] = useState<number>(0);
  const [masterCurrReading, setMasterCurrReading] = useState<number>(0);
  const [masterCtRatio, setMasterCtRatio] = useState<number>(1);
  const [masterMeterNum, setMasterMeterNum] = useState<string>('MTR-CENTRAL-01');
  const [masterCapacityKva, setMasterCapacityKva] = useState<number>(500);
  const [masterZone, setMasterZone] = useState<string>('المنطقة الرئيسية');
  const [masterReadingSuccess, setMasterReadingSuccess] = useState<string | null>(null);

  // Daily target collection HUD states
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    const saved = localStorage.getItem('voltera_collector_daily_goal');
    return saved ? parseInt(saved, 10) : 250000;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(dailyGoal.toString());

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(goalInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setDailyGoal(parsed);
      localStorage.setItem('voltera_collector_daily_goal', parsed.toString());
      setIsEditingGoal(false);
    }
  };

  // Print Job State
  const [printingJob, setPrintingJob] = useState<{
    type: 'invoice' | 'receipt' | 'statement' | 'shift_report';
    sub?: Subscriber;
    reading?: MeterReading;
    payment?: Payment;
  } | null>(null);

  const [downloadingImage, setDownloadingImage] = useState(false);
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Bluetooth Thermal Printing State
  const [printerDevice, setPrinterDevice] = useState<any>(null);
  const [printerCharacteristic, setPrinterCharacteristic] = useState<any>(null);
  const [btStatus, setBtStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [btError, setBtError] = useState<string | null>(null);
  const [btSuccessMessage, setBtSuccessMessage] = useState<string | null>(null);
  const [btPrinterName, setBtPrinterName] = useState<string | null>(null);
  const [isDirectPrinting, setIsDirectPrinting] = useState(false);
  const [showBtHelp, setShowBtHelp] = useState(false);

  const connectBluetoothPrinter = async () => {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      setBtError("متصفحك الحالي أو بيئة العمل لا تدعم ميزة البلوتوث اللاسلكي مباشرة. يرجى استخدام متصفح Google Chrome على الهاتف أو الكمبيوتر والتحقق من تشغيل البلوتوث.");
      return;
    }
    setBtStatus('connecting');
    setBtError(null);
    setBtSuccessMessage(null);
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard thermal printer BLE service
          '0000ffe0-0000-1000-8000-00805f9b34fb', // Common serial BLE service
          '0000ffe1-0000-1000-8000-00805f9b34fb', // Serial characteristic
          '00001101-0000-1000-8000-00805f9b34fb'  // Standard SPP
        ]
      });

      setBtPrinterName(device.name || "طابعة حرارية بلوتوث");
      
      const server = await device.gatt?.connect();
      if (!server) throw new Error("فشل الاتصال بـ GATT Server الخاص بالطابعة.");

      // Search for any write characteristic
      let char = null;
      try {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          try {
            const chars = await service.getCharacteristics();
            for (const c of chars) {
              if (c.properties.write || c.properties.writeWithoutResponse) {
                char = c;
                break;
              }
            }
          } catch (e) {
            console.warn("Could not get characteristics for service", service.uuid, e);
          }
          if (char) break;
        }
      } catch (e) {
        console.warn("Could not get primary services, trying default service FFE0", e);
        try {
          const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
          char = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
        } catch (innerErr) {
          console.error("Default FFE0 search also failed", innerErr);
        }
      }

      if (!char) {
        throw new Error("تم الاقتران بنجاح، ولكن لم يتم العثور على ميزة الكتابة المتوافقة (Write Characteristic) لإرسال البيانات.");
      }

      setPrinterDevice(device);
      setPrinterCharacteristic(char);
      setBtStatus('connected');
      setBtSuccessMessage("تم ربط الطابعة بنجاح وجاهزة للطباعة المباشرة!");
      setTimeout(() => setBtSuccessMessage(null), 3000);
      
      device.addEventListener('gattserverdisconnected', () => {
        setBtStatus('disconnected');
        setPrinterDevice(null);
        setPrinterCharacteristic(null);
        setBtPrinterName(null);
      });
    } catch (err: any) {
      console.error("Bluetooth connection failed", err);
      setBtStatus('disconnected');
      setBtError(err?.message || "فشلت عملية الاقتران بالطابعة. يرجى التحقق من تشغيل الطابعة وتفعيل البلوتوث.");
    }
  };

  const disconnectBluetoothPrinter = () => {
    if (printerDevice && printerDevice.gatt?.connected) {
      printerDevice.gatt.disconnect();
    }
    setBtStatus('disconnected');
    setPrinterDevice(null);
    setPrinterCharacteristic(null);
    setBtPrinterName(null);
    setBtSuccessMessage("تم قطع الاتصال بالطابعة بنجاح.");
    setTimeout(() => setBtSuccessMessage(null), 3000);
  };

  const printViaBluetooth = async () => {
    if (!printerCharacteristic || !printingJob) return;
    
    setIsDirectPrinting(true);
    setBtError(null);
    try {
      const encoder = new TextEncoder();
      
      // ESC/POS Command sequences
      const escInit = new Uint8Array([0x1B, 0x40]); // Initialize
      const escCenter = new Uint8Array([0x1B, 0x61, 0x01]); // Align center
      const escRight = new Uint8Array([0x1B, 0x61, 0x02]); // Align right
      const escLeft = new Uint8Array([0x1B, 0x61, 0x00]); // Align left
      const escBoldOn = new Uint8Array([0x1B, 0x45, 0x01]);
      const escBoldOff = new Uint8Array([0x1B, 0x45, 0x00]);
      const escDoubleSize = new Uint8Array([0x1D, 0x21, 0x11]);
      const escNormalSize = new Uint8Array([0x1D, 0x21, 0x00]);
      
      let chunks: Uint8Array[] = [];
      
      const addText = (text: string) => {
        chunks.push(encoder.encode(text + '\n'));
      };
      const addCmd = (cmd: Uint8Array) => {
        chunks.push(cmd);
      };

      // 1. Header (Station Name)
      addCmd(escInit);
      addCmd(escCenter);
      addCmd(escDoubleSize);
      addCmd(escBoldOn);
      addText(settings.stationName);
      addCmd(escNormalSize);
      addCmd(escBoldOff);
      
      if (settings.logoText) {
        addText(settings.logoText);
      }
      addText("================================");
      
      // 2. Ticket Title
      addCmd(escBoldOn);
      if (printingJob.type === 'invoice') {
        addText("فاتورة استهلاك تيار كهربائي");
      } else if (printingJob.type === 'receipt') {
        addText("سند قبض وتوريد مالي");
      } else if (printingJob.type === 'statement') {
        addText("كشف حساب مشترك تفصيلي");
      } else {
        addText("تقرير إغلاق الوردية والعهد");
      }
      addCmd(escBoldOff);
      addText("================================");
      
      // 3. Metadata
      addCmd(escRight);
      if (printingJob.type !== 'shift_report' && printingJob.sub) {
        addText(`اسم المشترك: ${printingJob.sub.name}`);
        addText(`رقم العداد: ${printingJob.sub.meterNumber}`);
        if (printingJob.sub.zone) {
          addText(`المنطقة: ${printingJob.sub.zone}`);
        }
      } else {
        addText(`المحصل الميداني: ${currentUser.name}`);
        addText(`نوع التقرير: إغلاق الوردية المالي`);
      }
      addText(`تاريخ الطباعة: ${new Date().toLocaleDateString('en-GB')}`);
      addText("--------------------------------");

      // 4. Dynamic details depending on job type
      if (printingJob.type === 'invoice' && printingJob.reading && printingJob.sub) {
        const rd = printingJob.reading;
        addText(`رقم الفاتورة: ${rd.id.substring(0, 14)}`);
        addText(`الفترة: ${rd.billingMonth}`);
        addText(`القراءة السابقة: ${rd.previousReading} ك.و`);
        addText(`القراءة الحالية: ${rd.currentReading} ك.و`);
        addText(`صافي الاستهلاك: ${rd.consumption} كيلوواط`);
        addText(`سعر الوحدة: ${rd.ratePerKwh} ${settings.currency}`);
        addText(`الرسوم الثابتة: ${rd.fixedFee} ${settings.currency}`);
        addText(`الضريبة: ${rd.taxAmount} ${settings.currency}`);
        addText("--------------------------------");
        addCmd(escCenter);
        addCmd(escDoubleSize);
        addCmd(escBoldOn);
        addText(`المطلوب: ${rd.totalAmount.toLocaleString()} ${settings.currency}`);
        addCmd(escNormalSize);
        addCmd(escBoldOff);
      } else if (printingJob.type === 'receipt' && printingJob.payment && printingJob.sub) {
        const pay = printingJob.payment;
        addText(`رقم السند: ${pay.receiptNumber}`);
        addText(`طريقة الدفع: ${pay.paymentMethod === 'cash' ? 'نقدا' : pay.paymentMethod === 'e-wallet' ? 'محفظة' : 'تحويل'}`);
        addText("--------------------------------");
        addCmd(escCenter);
        addCmd(escDoubleSize);
        addCmd(escBoldOn);
        addText(`المستلم: ${pay.amountPaid.toLocaleString()} ${settings.currency}`);
        addCmd(escNormalSize);
        addCmd(escBoldOff);
        addCmd(escRight);
        addText(`الرصيد المتبقي: ${printingJob.sub.currentBalance.toLocaleString()} ${settings.currency}`);
      } else if (printingJob.type === 'statement' && printingJob.sub) {
        const totalInvoices = readings.filter(r => r.subscriberId === printingJob.sub.id).reduce((sum, r) => sum + r.totalAmount, 0);
        const totalPayments = payments.filter(p => p.subscriberId === printingJob.sub.id).reduce((sum, p) => sum + p.amountPaid, 0);
        addText(`إجمالي الفواتير: ${totalInvoices.toLocaleString()} ${settings.currency}`);
        addText(`إجمالي المدفوعات: ${totalPayments.toLocaleString()} ${settings.currency}`);
        addText("--------------------------------");
        addCmd(escCenter);
        addCmd(escDoubleSize);
        addCmd(escBoldOn);
        addText(`الرصيد المستحق: ${printingJob.sub.currentBalance.toLocaleString()} ${settings.currency}`);
        addCmd(escNormalSize);
        addCmd(escBoldOff);
      } else if (printingJob.type === 'shift_report') {
        const cashTotal = myPaymentsToday.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amountPaid, 0);
        const walletTotal = myPaymentsToday.filter(p => p.paymentMethod === 'e-wallet').reduce((sum, p) => sum + p.amountPaid, 0);
        const bankTotal = myPaymentsToday.filter(p => p.paymentMethod === 'bank').reduce((sum, p) => sum + p.amountPaid, 0);
        
        addText(`المستهدف المالي لليوم: ${dailyGoal.toLocaleString()} ${settings.currency}`);
        addText(`إجمالي الفعلي المحصل: ${totalCollectedToday.toLocaleString()} ${settings.currency}`);
        addText(`- نقداً (كاش): ${cashTotal.toLocaleString()} ${settings.currency}`);
        addText(`- محفظة إلكترونية: ${walletTotal.toLocaleString()} ${settings.currency}`);
        addText(`- تحويل مصرفي: ${bankTotal.toLocaleString()} ${settings.currency}`);
        addText("--------------------------------");
        addText(`القراءات المسجلة اليوم: ${myReadingsToday.length} قراءة`);
        addText(`المشتركون المتبقون اليوم: ${remainingSubscribersToVisit} مشترك`);
        addText(`نسبة تحقيق الهدف اليومي: ${progressPercent}%`);
        addText("--------------------------------");
        addCmd(escCenter);
        addCmd(escDoubleSize);
        addCmd(escBoldOn);
        addText(`العهدة المسلمة: ${totalCollectedToday.toLocaleString()} ${settings.currency}`);
        addCmd(escNormalSize);
        addCmd(escBoldOff);
        addCmd(escRight);
      }

      // 5. Warnings and barcode mock-up
      addCmd(escCenter);
      addText("--------------------------------");
      if (printingJob.type !== 'shift_report') {
        addText("يرجى تسديد المتأخرات لتفادي الفصل");
        addText("تنبيه: يتم فصل التيار بعد 3 أيام");
      } else {
        addText("تقرير إغلاق الوردية اليومية المعتمد");
        addText("يرجى مراجعة وتدقيق المبالغ مع الإدارة");
      }
      addText("================================");
      addText(`المحصل: ${currentUser.name}`);
      addText(`نظام فولترا السحابي - Voltera Cloud`);
      addText(`تاريخ التوقيت: ${new Date().toLocaleString('ar-YE')}`);
      addText("\n\n\n\n"); // Extra spacing for paper tear

      // Concatenate payloads
      let totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      let payload = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        payload.set(chunk, offset);
        offset += chunk.length;
      }

      // Write chunks of 20 bytes with a delay
      const chunkSize = 20;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        await printerCharacteristic.writeValue(chunk);
        await new Promise(resolve => setTimeout(resolve, 35));
      }

      setBtSuccessMessage("تم إرسال الفاتورة للطابعة الحرارية بنجاح!");
      setTimeout(() => setBtSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error("Direct bluetooth print failed", err);
      setBtError("فشلت عملية الإرسال للطابعة: " + (err?.message || "خطأ غير متوقع في قنوات البلوتوث."));
    } finally {
      setIsDirectPrinting(false);
    }
  };

  const downloadReceiptAsImage = () => {
    setDownloadingImage(true);
    const printElement = document.querySelector('.print-container');
    if (!printElement) {
      setDownloadingImage(false);
      return;
    }
    
    html2canvas(printElement as HTMLElement, {
      backgroundColor: '#FAF9F5',
      scale: 2,
      useCORS: true,
      logging: false,
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `voltera_receipt_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setDownloadingImage(false);
    }).catch(err => {
      console.error("Failed to generate receipt image", err);
      setDownloadingImage(false);
    });
  };

  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  const handleShareWhatsApp = () => {
    if (!printingJob) return;
    const sub = printingJob.sub;
    const reading = printingJob.reading;
    const payment = printingJob.payment;

    let phone = sub?.phone ? sub.phone.replace(/[^0-9]/g, '') : '';
    if (phone.startsWith('0')) {
      phone = '967' + phone.slice(1);
    }

    let msg = `⚡ *${settings.stationName}*\n`;
    msg += `------------------------------\n`;
    if (printingJob.type === 'receipt' && payment) {
      msg += `📄 *إيصال إشعار سداد مالي*\n`;
      msg += `👤 *المشترك:* ${sub?.name || 'مشترك'}\n`;
      msg += `🔢 *رقم العداد:* ${sub?.meterNumber || '—'}\n`;
      msg += `🧾 *رقم السند:* ${payment.receiptNumber}\n`;
      msg += `💵 *المبلغ المدفوع:* ${payment.amountPaid.toLocaleString()} ${settings.currency}\n`;
      msg += `💳 *طريقة الدفع:* ${payment.paymentMethod === 'cash' ? 'نقداً (كاش)' : payment.paymentMethod === 'e-wallet' ? 'محفظة إلكترونية' : 'تحويل مصرفي'}\n`;
      msg += `💰 *الرصيد المستحق الحالي:* ${sub?.currentBalance.toLocaleString()} ${settings.currency}\n`;
    } else if (printingJob.type === 'invoice' && reading) {
      msg += `📄 *فاتورة استهلاك تيار كهربائي*\n`;
      msg += `👤 *المشترك:* ${sub?.name || 'مشترك'}\n`;
      msg += `🔢 *رقم العداد:* ${sub?.meterNumber || '—'}\n`;
      msg += `📊 *الاستهلاك:* ${reading.consumption} كيلوواط ساعي\n`;
      msg += `💵 *إجمالي الفاتورة:* ${reading.totalAmount.toLocaleString()} ${settings.currency}\n`;
      msg += `💰 *إجمالي الرصيد المستحق:* ${sub?.currentBalance.toLocaleString()} ${settings.currency}\n`;
    } else if (printingJob.type === 'statement' && sub) {
      msg += `📄 *كشف حساب مشترك تفصيلي*\n`;
      msg += `👤 *المشترك:* ${sub.name}\n`;
      msg += `🔢 *رقم العداد:* ${sub.meterNumber}\n`;
      msg += `💰 *الرصيد المتبقي المستحق:* ${sub.currentBalance.toLocaleString()} ${settings.currency}\n`;
    } else if (printingJob.type === 'shift_report') {
      msg += `📄 *تقرير إغلاق الوردية والعهد المالية*\n`;
      msg += `👤 *المحصل:* ${currentUser.name}\n`;
      msg += `💵 *إجمالي التحصيل اليومي:* ${totalCollectedToday.toLocaleString()} ${settings.currency}\n`;
      msg += `📊 *نسبة إنجاز الهدف:* ${progressPercent}%\n`;
    }
    msg += `------------------------------\n`;
    msg += `👤 *المحصل:* ${currentUser.name}\n`;
    msg += `📅 *التاريخ:* ${new Date().toLocaleDateString('ar-YE')}\n`;
    msg += `شكراً لتعاونكم معنا!`;

    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCopyReceiptText = () => {
    if (!printingJob) return;
    const sub = printingJob.sub;
    const reading = printingJob.reading;
    const payment = printingJob.payment;

    let txt = `⚡ ${settings.stationName}\n`;
    if (printingJob.type === 'receipt' && payment) {
      txt += `إيصال سداد: ${payment.receiptNumber}\nالمشترك: ${sub?.name}\nالعداد: ${sub?.meterNumber}\nالمبلغ: ${payment.amountPaid.toLocaleString()} ${settings.currency}\nالرصيد المتبقي: ${sub?.currentBalance.toLocaleString()} ${settings.currency}\nالمحصل: ${currentUser.name}\nالتاريخ: ${new Date().toLocaleString('ar-YE')}`;
    } else if (printingJob.type === 'invoice' && reading) {
      txt += `فاتورة كهرباء: ${reading.billingMonth}\nالمشترك: ${sub?.name}\nالعداد: ${sub?.meterNumber}\nالاستهلاك: ${reading.consumption} ك.و\nالإجمالي: ${reading.totalAmount.toLocaleString()} ${settings.currency}\nالمحصل: ${currentUser.name}\nالتاريخ: ${new Date().toLocaleString('ar-YE')}`;
    } else {
      txt += `المحصل: ${currentUser.name}\nإجمالي التحصيل: ${totalCollectedToday.toLocaleString()} ${settings.currency}\nالتاريخ: ${new Date().toLocaleString('ar-YE')}`;
    }

    navigator.clipboard.writeText(txt).then(() => {
      setCopyNotice("تم نسخ نص الفاتورة/السند بنجاح للحافظة!");
      setTimeout(() => setCopyNotice(null), 3000);
    });
  };

  useEffect(() => {
    if (printingJob) {
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.error("Print failed:", e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printingJob]);

  // Reading Form State
  const [currentReadingInput, setCurrentReadingInput] = useState('');
  const [readingSuccess, setReadingSuccess] = useState<MeterReading | null>(null);

  // Payment Form State
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'e-wallet'>('cash');
  const [paymentSuccess, setPaymentSuccess] = useState<Payment | null>(null);

  // Quick Edit / Delete State
  const [editingReading, setEditingReading] = useState<MeterReading | null>(null);
  const [editReadingInput, setEditReadingInput] = useState('');
  
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editPaymentAmountInput, setEditPaymentAmountInput] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'cash' | 'transfer' | 'e-wallet'>('cash');

  const [deletingItemId, setDeletingItemId] = useState<{ type: 'reading' | 'payment', id: string } | null>(null);

  // Today's Operations Log Live Filter & Search
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'readings' | 'payments' | 'pending_visit' | 'completed_visit'>('all');
  const [isBatchZeroModalOpen, setIsBatchZeroModalOpen] = useState(false);

  // Quick single Zero Reading handler (استهلاك صفر)
  const handleQuickZeroReading = (sub: Subscriber) => {
    const prevReading = sub.currentReading;
    const rate = sub.tariffType === 'residential' ? settings.tariffs.residential :
                 sub.tariffType === 'commercial' ? settings.tariffs.commercial : settings.tariffs.industrial;
    const total = settings.fixedFee + settings.serviceFee;

    const newReading: MeterReading = {
      id: `rd-zero-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      subscriberId: sub.id,
      subscriberName: sub.name,
      meterNumber: sub.meterNumber,
      previousReading: prevReading,
      currentReading: prevReading,
      consumption: 0,
      ratePerKwh: rate,
      fixedFee: settings.fixedFee,
      taxAmount: 0,
      totalAmount: total,
      billingMonth: new Date().toISOString().substring(0, 7),
      readingDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      enteredBy: currentUser.username,
      isPosted: false,
      notes: 'نزول ميداني - تأكيد عدم وجود استهلاك (0 ك.و)'
    };

    onAddReading(newReading);
  };

  // Helper to check if item can be edited/deleted (within 24 hours of issuance and not posted)
  const isActionAllowed = (item: { isPosted: boolean; readingDate?: string; paymentDate?: string }) => {
    if (item.isPosted) return false;
    const dateStr = item.readingDate || item.paymentDate;
    if (!dateStr) return false;
    try {
      const itemTime = new Date(dateStr.replace(' ', 'T')).getTime();
      const nowTime = new Date().getTime();
      const diffHours = (nowTime - itemTime) / (1000 * 60 * 60);
      return diffHours <= 24;
    } catch (e) {
      return false;
    }
  };

  // Filtered subscribers list
  const filteredSubscribers = subscribers.filter(sub => {
    const q = searchQuery.toLowerCase().trim();
    return (
      sub.name.toLowerCase().includes(q) ||
      sub.meterNumber.toLowerCase().includes(q) ||
      sub.phone.includes(q)
    );
  });

  // Calculate live reading details
  const previousReading = selectedSub ? selectedSub.currentReading : 0;
  const currentReadingVal = parseFloat(currentReadingInput) || 0;
  const consumption = currentReadingVal > previousReading ? currentReadingVal - previousReading : 0;
  
  const getTariffRate = (type: Subscriber['tariffType']) => {
    if (type === 'residential') return settings.tariffs.residential;
    if (type === 'commercial') return settings.tariffs.commercial;
    return settings.tariffs.industrial;
  };

  const currentRate = selectedSub ? getTariffRate(selectedSub.tariffType) : 0;
  const consumptionCost = consumption * currentRate;
  const taxAmount = selectedSub ? (consumptionCost * settings.taxPercent) / 100 : 0;
  const totalBillAmount = selectedSub && currentReadingVal > previousReading 
    ? consumptionCost + settings.fixedFee + settings.serviceFee + taxAmount 
    : 0;

  const handleSelectSubscriber = (sub: Subscriber) => {
    setSelectedSub(sub);
    setCurrentReadingInput('');
    setAmountPaidInput('');
    setReadingSuccess(null);
    setPaymentSuccess(null);
  };

  const submitReading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || currentReadingVal < previousReading) return;

    const newReading: MeterReading = {
      id: `rd-new-${Date.now()}`,
      subscriberId: selectedSub.id,
      subscriberName: selectedSub.name,
      meterNumber: selectedSub.meterNumber,
      previousReading,
      currentReading: currentReadingVal,
      consumption,
      ratePerKwh: currentRate,
      fixedFee: settings.fixedFee,
      taxAmount,
      totalAmount: totalBillAmount,
      billingMonth: new Date().toISOString().substring(0, 7), // "2026-07"
      readingDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      enteredBy: currentUser.username,
      isPosted: false // Reading starts as unposted, Admin must Transfer/Post it
    };

    onAddReading(newReading);
    setReadingSuccess(newReading);
    setCurrentReadingInput('');
    
    // Auto-update local state of selected subscriber so layout reflects temporary changes
    setSelectedSub({
      ...selectedSub,
      currentReading: currentReadingVal
    });
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountPaidVal = parseFloat(amountPaidInput) || 0;
    if (!selectedSub || amountPaidVal <= 0) return;

    const newPayment: Payment = {
      id: `pay-new-${Date.now()}`,
      subscriberId: selectedSub.id,
      subscriberName: selectedSub.name,
      amountPaid: amountPaidVal,
      paymentDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      paymentMethod,
      receivedBy: currentUser.username,
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
      isPosted: false // Starts as unposted, pending Admin Transfer/Posting
    };

    onAddPayment(newPayment);
    setPaymentSuccess(newPayment);
    setAmountPaidInput('');

    // Update local state temporarily
    setSelectedSub({
      ...selectedSub,
      currentBalance: selectedSub.currentBalance - amountPaidVal
    });
  };

  // Calculations for Editing Reading
  const editReadingPrev = editingReading ? editingReading.previousReading : 0;
  const editReadingVal = parseFloat(editReadingInput) || 0;
  const editConsumption = editReadingVal > editReadingPrev ? editReadingVal - editReadingPrev : 0;
  
  const editSub = editingReading ? subscribers.find(s => s.id === editingReading.subscriberId) : null;
  const editRate = editSub ? getTariffRate(editSub.tariffType) : currentRate;
  const editConsumptionCostVal = editConsumption * editRate;
  const editTaxAmount = editSub ? (editConsumptionCostVal * settings.taxPercent) / 100 : 0;
  const editTotalBillAmount = editSub && editReadingVal > editReadingPrev 
    ? editConsumptionCostVal + settings.fixedFee + settings.serviceFee + editTaxAmount 
    : 0;

  const handleStartEditReading = (reading: MeterReading) => {
    if (!isActionAllowed(reading)) {
      alert('لا يمكن تعديل الفاتورة بعد مرور 24 ساعة من إصدارها أو بعد اعتمادها وترحيلها.');
      return;
    }
    setEditingReading(reading);
    setEditReadingInput(reading.currentReading.toString());
  };

  const handleSaveEditReading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReading || !editSub || editReadingVal < editReadingPrev || !onEditReading) return;

    const updated: MeterReading = {
      ...editingReading,
      currentReading: editReadingVal,
      consumption: editConsumption,
      taxAmount: editTaxAmount,
      totalAmount: editTotalBillAmount
    };

    onEditReading(updated);
    
    if (selectedSub && selectedSub.id === editSub.id) {
      setSelectedSub({
        ...selectedSub,
        currentReading: editReadingVal
      });
    }

    setEditingReading(null);
  };

  const handleStartEditPayment = (payment: Payment) => {
    if (!isActionAllowed(payment)) {
      alert('لا يمكن تعديل سند القبض بعد مرور 24 ساعة من إصداره أو بعد اعتماده وترحيله.');
      return;
    }
    setEditingPayment(payment);
    setEditPaymentAmountInput(payment.amountPaid.toString());
    setEditPaymentMethod(payment.paymentMethod);
  };

  const handleSaveEditPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(editPaymentAmountInput) || 0;
    if (!editingPayment || amountVal <= 0 || !onEditPayment) return;

    const updated: Payment = {
      ...editingPayment,
      amountPaid: amountVal,
      paymentMethod: editPaymentMethod
    };

    onEditPayment(updated);
    setEditingPayment(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingItemId) return;
    const { type, id } = deletingItemId;
    
    if (type === 'reading' && onDeleteReading) {
      onDeleteReading(id);
      
      const rd = readings.find(r => r.id === id);
      if (rd && selectedSub && selectedSub.id === rd.subscriberId) {
        setSelectedSub({
          ...selectedSub,
          currentReading: rd.previousReading,
          currentBalance: selectedSub.currentBalance - rd.totalAmount
        });
      }
    } else if (type === 'payment' && onDeletePayment) {
      onDeletePayment(id);
      
      const pay = payments.find(p => p.id === id);
      if (pay && selectedSub && selectedSub.id === pay.subscriberId) {
        setSelectedSub({
          ...selectedSub,
          currentBalance: selectedSub.currentBalance + pay.amountPaid
        });
      }
    }
    
    setDeletingItemId(null);
  };

  // Collector's activity log for today
  const myReadingsToday = readings.filter(r => r.enteredBy === currentUser.username);
  const myPaymentsToday = payments.filter(p => p.receivedBy === currentUser.username);

  // Filtered lists for rendering today's history log
  const filteredReadingsToday = useMemo(() => {
    return myReadingsToday.filter(r => {
      if (historyFilter === 'payments' || historyFilter === 'pending_visit' || historyFilter === 'completed_visit') return false;
      if (historySearchQuery) {
        const q = historySearchQuery.toLowerCase().trim();
        return r.subscriberName.toLowerCase().includes(q) || (r.meterNumber && r.meterNumber.toLowerCase().includes(q));
      }
      return true;
    });
  }, [myReadingsToday, historyFilter, historySearchQuery]);

  const filteredPaymentsToday = useMemo(() => {
    return myPaymentsToday.filter(p => {
      if (historyFilter === 'readings' || historyFilter === 'pending_visit' || historyFilter === 'completed_visit') return false;
      if (historySearchQuery) {
        const q = historySearchQuery.toLowerCase().trim();
        return p.subscriberName.toLowerCase().includes(q) || (p.receiptNumber && p.receiptNumber.toLowerCase().includes(q));
      }
      return true;
    });
  }, [myPaymentsToday, historyFilter, historySearchQuery]);
  const totalCollectedToday = myPaymentsToday.reduce((sum, p) => sum + p.amountPaid, 0);

  const visitedSubscribersIds = useMemo(() => new Set(myReadingsToday.map(r => r.subscriberId)), [myReadingsToday]);
  const remainingSubscribersToVisit = useMemo(() => subscribers.filter(sub => !visitedSubscribersIds.has(sub.id)).length, [subscribers, visitedSubscribersIds]);
  const progressPercent = Math.min(100, Math.round((totalCollectedToday / dailyGoal) * 100));

  const completedSubscribersList = useMemo(() => {
    return subscribers.filter(sub => visitedSubscribersIds.has(sub.id));
  }, [subscribers, visitedSubscribersIds]);

  const pendingSubscribersList = useMemo(() => {
    return subscribers.filter(sub => !visitedSubscribersIds.has(sub.id));
  }, [subscribers, visitedSubscribersIds]);

  const filteredCompletedSubscribersList = useMemo(() => {
    return completedSubscribersList.filter(sub => {
      if (historySearchQuery) {
        const q = historySearchQuery.toLowerCase().trim();
        return sub.name.toLowerCase().includes(q) || 
               (sub.meterNumber && sub.meterNumber.toLowerCase().includes(q)) ||
               (sub.zone && sub.zone.toLowerCase().includes(q));
      }
      return true;
    });
  }, [completedSubscribersList, historySearchQuery]);

  const filteredPendingSubscribersList = useMemo(() => {
    return pendingSubscribersList.filter(sub => {
      if (historySearchQuery) {
        const q = historySearchQuery.toLowerCase().trim();
        return sub.name.toLowerCase().includes(q) || 
               (sub.meterNumber && sub.meterNumber.toLowerCase().includes(q)) ||
               (sub.zone && sub.zone.toLowerCase().includes(q));
      }
      return true;
    });
  }, [pendingSubscribersList, historySearchQuery]);

  // Temporal Shift Metrics
  const shiftTimes = useMemo(() => {
    const allOperations = [
      ...myReadingsToday.map(r => ({ date: r.readingDate })),
      ...myPaymentsToday.map(p => ({ date: p.paymentDate }))
    ].sort((a, b) => new Date(a.date.replace(' ', 'T')).getTime() - new Date(b.date.replace(' ', 'T')).getTime());

    if (allOperations.length === 0) {
      return {
        first: null,
        last: null,
        durationStr: 'لم تبدأ بعد'
      };
    }

    const firstOp = allOperations[0].date;
    const lastOp = allOperations[allOperations.length - 1].date;

    try {
      const firstTime = new Date(firstOp.replace(' ', 'T')).getTime();
      const lastTime = new Date(lastOp.replace(' ', 'T')).getTime();
      const diffMs = lastTime - firstTime;
      
      if (diffMs <= 0) {
        return {
          first: firstOp.substring(11, 16),
          last: lastOp.substring(11, 16),
          durationStr: 'عملية واحدة فقط'
        };
      }

      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      
      let durationStr = '';
      if (hours > 0) {
        durationStr += `${hours} ساعة `;
      }
      if (mins > 0 || hours === 0) {
        durationStr += `${mins} دقيقة`;
      }

      return {
        first: firstOp.substring(11, 16),
        last: lastOp.substring(11, 16),
        durationStr
      };
    } catch (e) {
      return {
        first: null,
        last: null,
        durationStr: '--'
      };
    }
  }, [myReadingsToday, myPaymentsToday]);

  // Average collection amount per subscriber
  const avgCollectionPerSub = useMemo(() => {
    const uniqueSubsWhoPaid = new Set(myPaymentsToday.map(p => p.subscriberId));
    if (uniqueSubsWhoPaid.size === 0) return 0;
    return Math.round(totalCollectedToday / uniqueSubsWhoPaid.size);
  }, [myPaymentsToday, totalCollectedToday]);

  // Targeted Zone Completion Metrics
  const zoneCompletionStats = useMemo(() => {
    // Group all subscribers by zone
    const zonesMap: { [key: string]: { total: number; visited: number } } = {};
    
    subscribers.forEach(sub => {
      const z = sub.zone || 'غير محدد';
      if (!zonesMap[z]) {
        zonesMap[z] = { total: 0, visited: 0 };
      }
      zonesMap[z].total += 1;
      // Visited today if they have a reading or payment
      const hasReading = myReadingsToday.some(r => r.subscriberId === sub.id);
      const hasPayment = myPaymentsToday.some(p => p.subscriberId === sub.id);
      if (hasReading || hasPayment) {
        zonesMap[z].visited += 1;
      }
    });

    return Object.entries(zonesMap).map(([zoneName, stats]) => {
      const pct = stats.total > 0 ? Math.round((stats.visited / stats.total) * 100) : 0;
      return {
        zoneName,
        total: stats.total,
        visited: stats.visited,
        percent: pct
      };
    }).sort((a, b) => b.percent - a.percent);
  }, [subscribers, myReadingsToday, myPaymentsToday]);

  const triggerPrint = (id: string) => {
    const printContent = document.getElementById(id);
    if (!printContent) return;
    
    // Create an iframe to print cleanly without messing up main page
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>طباعة</title>
            <style>
              body { font-family: 'Arial', sans-serif; direction: rtl; text-align: right; padding: 20px; color: #000; background: #fff; }
              .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 20px; }
              .row { display: flex; justify-content: space-between; margin: 10px 0; }
              .bold { font-weight: bold; }
              .footer { text-align: center; border-top: 2px dashed #000; padding-top: 10px; margin-top: 30px; font-size: 12px; }
              .price { font-size: 18px; font-weight: bold; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <script>
              window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }
            </script>
          </body>
        </html>
      `);
      doc.close();
    }
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-3 py-2.5 sm:px-6 sm:py-4 flex items-center justify-between">
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
            <span className="block text-[9px] sm:text-[10px] text-slate-400 font-bold">المحصل الحالي</span>
            <span className="block text-[11px] sm:text-xs font-black text-slate-800 truncate max-w-[80px] sm:max-w-[150px] md:max-w-none">{currentUser.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Work Orders Notification Bell Button */}
          <button
            onClick={handleOpenNotifDrawer}
            className={`relative p-2 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              pendingNotifCount > 0 
                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-md shadow-rose-500/10' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title="إشعارات الأوامر الميدانية (فصل وإعادة الخدمة)"
          >
            <Bell className={`w-4.5 h-4.5 sm:w-5 sm:h-5 ${pendingNotifCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-600'}`} />
            <span className="text-xs font-black hidden md:inline">الأوامر والإشعارات</span>
            {pendingNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse">
                {pendingNotifCount}
              </span>
            )}
          </button>

          {/* Network Status Pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all border ${
            isOnline 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
          }`} dir="rtl">
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-rose-600" />}
            <span>{isOnline ? 'متصل بالإنترنت' : 'غير متصل (محلي)'}</span>
          </div>

          <h2 className="text-xs sm:text-sm font-black text-slate-900 hidden sm:block">{settings.stationName}</h2>
          <div className="p-1.5 sm:p-2 bg-amber-400/10 rounded-xl border border-amber-400/30 shrink-0">
            <Zap className="w-4.5 h-4.5 sm:w-5 h-5 text-amber-600 fill-amber-500" />
          </div>
        </div>
      </header>

      {/* Main Body Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column (8 cols) - Main Interactive Workspace */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Pending Sync Notifications/Alerts */}
          <AnimatePresence>
            {pendingSyncCount > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 text-right w-full"
                dir="rtl"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/20 text-amber-600 rounded-xl mt-0.5 shrink-0">
                    <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">بيانات في انتظار المزامنة</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      يوجد <strong className="font-mono text-amber-600">{pendingSyncCount}</strong> عملية تم تسجيلها بدون إنترنت ومحفوظة بأمان على الهاتف.
                      {!isOnline && " سيتم ترحيلها تلقائياً للسيرفر بمجرد عودة الاتصال."}
                      {isOnline && " اضغط على زر المزامنة لرفعها إلى السيرفر الآن."}
                    </p>
                  </div>
                </div>
                {isOnline && onSync && (
                  <button
                    onClick={onSync}
                    disabled={isSyncing}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer shadow-sm shadow-amber-500/20 disabled:opacity-50 shrink-0"
                  >
                    {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>مزامنة البيانات الآن</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Offline Banner alert when offline and no pending items */}
          <AnimatePresence>
            {!isOnline && pendingSyncCount === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-slate-800 border border-slate-700 p-4 rounded-3xl flex items-start gap-3 text-right text-white w-full"
                dir="rtl"
              >
                <div className="p-2 bg-slate-700 text-slate-300 rounded-xl shrink-0">
                  <WifiOff className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">وضع العمل الميداني بدون إنترنت (نشط)</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    أنت الآن خارج نطاق التغطية. يمكنك الاستمرار في إدخال القراءات والتحصيل؛ وسنقوم بحفظ جميع مدخلاتك محلياً بشكل آمن دون أي قلق من فقدان البيانات.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collector Daily HUD */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white flex flex-col gap-4 shadow-xl text-right" dir="rtl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400/10 rounded-xl text-amber-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-100">لوحة الأداء اليومي الميداني</h3>
                  <p className="text-[10px] text-slate-400 font-medium">متابعة الأهداف والتحصيل والمشتركين لحظة بلحظة</p>
                </div>
              </div>

              {/* Progress Pill Indicator */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border transition-all ${
                progressPercent >= 100 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : progressPercent >= 50
                  ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {progressPercent >= 100 ? <Sparkles className="w-3.5 h-3.5" /> : <Percent className="w-3.5 h-3.5" />}
                <span>إنجاز الهدف: {progressPercent}%</span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Target Goal */}
              <div className="bg-slate-950/50 border border-slate-850 p-3.5 rounded-2xl flex flex-col gap-1 justify-between">
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-rose-400" />
                  <span>المستهدف المالي لليوم</span>
                </span>
                
                {isEditingGoal ? (
                  <form onSubmit={handleSaveGoal} className="flex items-center gap-1.5 mt-1.5">
                    <input
                      type="number"
                      value={goalInput}
                      onChange={e => setGoalInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                      placeholder="أدخل المبلغ..."
                      autoFocus
                    />
                    <button type="submit" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold px-2 py-1 rounded-lg text-[10px] cursor-pointer">حفظ</button>
                    <button type="button" onClick={() => { setIsEditingGoal(false); setGoalInput(dailyGoal.toString()); }} className="text-slate-400 hover:text-white text-[10px] cursor-pointer">إلغاء</button>
                  </form>
                ) : (
                  <div className="flex items-baseline justify-between gap-1 mt-1">
                    <span className="text-base sm:text-lg font-black text-slate-200 font-mono">
                      {dailyGoal.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">{settings.currency}</span>
                    </span>
                    <button 
                      onClick={() => { setIsEditingGoal(true); setGoalInput(dailyGoal.toString()); }}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer underline underline-offset-2"
                    >
                      تعديل
                    </button>
                  </div>
                )}
              </div>

              {/* Amount Collected */}
              <div className="bg-slate-950/50 border border-slate-850 p-3.5 rounded-2xl flex flex-col gap-1">
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>المبلغ الفعلي المحصل</span>
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-1">
                  {totalCollectedToday.toLocaleString()} <span className="text-[10px] font-bold text-emerald-500">{settings.currency}</span>
                </span>
              </div>

              {/* Remaining Subscribers to visit */}
              <div className="bg-slate-950/50 border border-slate-850 p-3.5 rounded-2xl flex flex-col gap-1">
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>المشتركون المتبقون للزيارة</span>
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
                    {remainingSubscribersToVisit}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">مشترك من أصل {subscribers.length}</span>
                </div>
              </div>
            </div>

            {/* Colored Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                <span>نسبة تحقيق الهدف اليومي</span>
                <span className="font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-950/40">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    progressPercent >= 100 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse' 
                      : progressPercent >= 50
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-400'
                      : 'bg-gradient-to-r from-amber-500 to-orange-400'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {progressPercent >= 100 && (
                <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 justify-center bg-emerald-500/10 py-1 px-3 rounded-lg border border-emerald-500/25 mt-2 animate-bounce">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تهانينا! لقد حققت الهدف المالي المطلوب لليوم بنجاح رائع 🌟</span>
                </p>
              )}
            </div>
          </div>

          {/* Dashboard Quick Stats */}
          <section className="grid grid-cols-3 gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-center">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="block text-[10px] sm:text-xs text-slate-500 font-bold">قراءات اليوم</span>
              <span className="block text-xl sm:text-2xl font-black text-amber-600 font-mono mt-1">{myReadingsToday.length}</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="block text-[10px] sm:text-xs text-slate-500 font-bold">سندات التحصيل</span>
              <span className="block text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-1">{myPaymentsToday.length}</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="block text-[10px] sm:text-xs text-slate-500 font-bold">إجمالي التحصيل اليومي</span>
              <span className="block text-sm sm:text-xl font-black text-slate-900 font-mono mt-1">
                {totalCollectedToday.toLocaleString()} <span className="text-[10px] font-bold">{settings.currency}</span>
              </span>
            </div>
          </section>

          {/* Action Tabs */}
          <div className="grid grid-cols-2 md:flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 gap-1 md:gap-0">
            <button
              onClick={() => { setActiveTab('reading'); setSelectedSub(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 md:py-3 md:flex-1 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                activeTab === 'reading'
                  ? 'bg-slate-900 text-white font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <FilePlus className="w-4 h-4" />
              <span>إدخال قراءة عداد</span>
            </button>
            <button
              onClick={() => { setActiveTab('master_reading'); setSelectedSub(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 md:py-3 md:flex-1 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                activeTab === 'master_reading'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Gauge className="w-4 h-4 text-amber-600" />
              <span>قراءة العداد المركزي (تزامن)</span>
            </button>
            <button
              onClick={() => { setActiveTab('payment'); setSelectedSub(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 md:py-3 md:flex-1 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                activeTab === 'payment'
                  ? 'bg-slate-900 text-white font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>تحصيل وسند قبض</span>
            </button>
            <button
              onClick={() => { setActiveTab('statement'); setSelectedSub(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 md:py-3 md:flex-1 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                activeTab === 'statement'
                  ? 'bg-slate-900 text-white font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>كشف حساب وطباعة</span>
            </button>
            <button
              onClick={() => { setActiveTab('history'); setSelectedSub(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 md:py-3 md:flex-1 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-slate-900 text-white font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>سجل عملي اليومي</span>
            </button>
            <button
              onClick={() => { setActiveTab('map'); setSelectedSub(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 md:py-3 md:flex-1 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>خريطة المشتركين</span>
            </button>
          </div>

          {/* Dynamic Area Based on Tab */}
          <AnimatePresence mode="wait">
            {activeTab === 'reading' && (() => {
              const decadalInfo = getDecadalPeriodInfo();
              const subLastReading = selectedSub ? readings.filter(r => r.subscriberId === selectedSub.id).sort((a,b) => b.readingDate.localeCompare(a.readingDate))[0] : null;
              const subLastReadingDate = subLastReading ? subLastReading.readingDate : selectedSub?.lastReadingDate;
              const cycleStatus = selectedSub ? getReadingCycleStatus(subLastReadingDate, settings.readingCycleIntervalDays || 10) : null;

              return (
              <motion.div
                key="reading-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6"
              >
                {/* 10-Day Field Reading Cycle Header Banner */}
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-slate-900/5 p-4 rounded-2xl border border-amber-300/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-right" dir="rtl">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/20 text-amber-700 rounded-xl shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-800">نظام أخذ القراءات: كل 10 أيام (3 مرات شهرياً)</h4>
                        <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full shadow-xs">
                          {decadalInfo.decadeShort}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-semibold">
                        {decadalInfo.decadeName} | اليوم الحالي من الشهر: {decadalInfo.currentDayOfMonth}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-amber-200 text-xs text-slate-700 font-bold shrink-0">
                    <span>دورات الشهر: <strong className="text-amber-600">3 نزولات ميدانية</strong></span>
                  </div>
                </div>

                {!selectedSub ? (
                  <div className="text-center py-12 text-slate-400">
                    <UserRound className="w-12 h-12 mx-auto text-slate-300 mb-3 animate-pulse" />
                    <p className="text-sm font-bold text-slate-800">يرجى اختيار مشترك من القائمة الجانبية للبدء</p>
                    <p className="text-xs text-slate-500 mt-1">ابحث عن الاسم، رقم العداد أو رقم الهاتف لتسجيل القراءة الجديدة</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Subscriber Details Card */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col gap-4 text-right">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                        <span className="px-2.5 py-1 bg-amber-100 border border-amber-200 rounded-lg text-[10px] text-amber-800 font-bold">
                          {selectedSub.tariffType === 'residential' ? 'سكني' : selectedSub.tariffType === 'commercial' ? 'تجاري' : 'صناعي'}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm">{selectedSub.name}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center shadow-xs">
                          <span className="text-slate-400 block text-[10px] font-bold">رقم العداد</span>
                          <span className="font-bold text-slate-800 font-mono block mt-1">{selectedSub.meterNumber}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center shadow-xs">
                          <span className="text-slate-400 block text-[10px] font-bold">المنطقة الجغرافية</span>
                          <span className="font-bold text-slate-800 block mt-1 text-[11px] truncate">{selectedSub.zone.replace('المنطقة ', '')}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center shadow-xs">
                          <span className="text-slate-400 block text-[10px] font-bold">القراءة السابقة</span>
                          <span className="font-bold text-amber-600 font-mono block mt-1">{previousReading} <span className="text-[9px]">كيلوواط</span></span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center shadow-xs">
                          <span className="text-slate-400 block text-[10px] font-bold">الرصيد الحالي</span>
                          <span className={`font-bold font-mono block mt-1 ${selectedSub.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {selectedSub.currentBalance.toLocaleString()} <span className="text-[9px]">{settings.currency}</span>
                          </span>
                        </div>
                      </div>

                      {/* 10-Day Reading Cycle Indicator */}
                      {cycleStatus && (
                        <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 shadow-xs ${cycleStatus.badgeClass}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-base">{cycleStatus.indicatorSymbol}</span>
                            <div>
                              <span className="block font-black text-[11px]">دورة النزول الميداني (كل 10 أيام)</span>
                              <span className="block font-bold text-[10px]">{cycleStatus.statusText}</span>
                            </div>
                          </div>
                          {cycleStatus.daysElapsed !== null && (
                            <span className="font-mono font-black text-[10px] bg-white/60 px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                              منذ {cycleStatus.daysElapsed} يوم
                            </span>
                          )}
                        </div>
                      )}

                      {selectedSub.status === 'suspended' && (
                        <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 p-2.5 rounded-xl text-rose-700 text-xs font-semibold">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>تنبيه: هذا المشترك موقوف عن الخدمة! تواصل مع المدير.</span>
                        </div>
                      )}
                    </div>

                    {/* Reading Entry Form */}
                    <div className="flex flex-col gap-4">
                      <form onSubmit={submitReading} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col gap-4">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider text-right flex items-center gap-1.5 justify-end">
                          <span>تسجيل القراءة الحالية والاحتساب الآلي</span>
                          <Calculator className="w-4 h-4 text-amber-600" />
                        </h4>

                        <div>
                          <div className="flex justify-between items-center mb-2" dir="rtl">
                            <label className="text-xs font-bold text-slate-500">أدخل القراءة الجديدة للعداد</label>
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentReadingInput(previousReading.toString());
                                setReadingSuccess(null);
                              }}
                              className="text-[10px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200/80 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <span>⚡ تسجيل عدم استهلاك (0 ك.و)</span>
                            </button>
                          </div>
                          <input
                            type="number"
                            required
                            min={previousReading}
                            value={currentReadingInput}
                            onChange={e => {
                              setCurrentReadingInput(e.target.value);
                              setReadingSuccess(null);
                            }}
                            placeholder={`يجب أن تكون ${previousReading} أو أكبر`}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-right text-sm focus:outline-none focus:border-slate-900"
                          />
                          {currentReadingInput !== '' && currentReadingVal < previousReading && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 mt-2 justify-end">
                                <span>القراءة المدخلة أقل من السابقة ({previousReading})!</span>
                                <AlertCircle className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {currentReadingInput !== '' && currentReadingVal >= previousReading && consumption > 1000 && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200 justify-end text-right">
                                <span>تحذير ذكي: الاستهلاك المحسوب ({consumption} ك.و) مرتفع جداً. يرجى المراجعة.</span>
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                            </div>
                          )}
                        </div>

                        {/* Live calculation breakdown */}
                        {currentReadingVal >= previousReading && currentReadingInput !== '' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-white p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs text-right overflow-hidden shadow-xs"
                          >
                            <div className="flex justify-between text-slate-500">
                              <span className="font-mono text-slate-800 font-semibold">{consumption} كيلوواط</span>
                              <span>حجم الاستهلاك:</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span className="font-mono text-slate-800 font-semibold">{currentRate} {settings.currency}</span>
                              <span>سعر الكيلوواط السكني:</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span className="font-mono text-slate-800 font-semibold">{consumptionCost.toLocaleString()} {settings.currency}</span>
                              <span>قيمة الاستهلاك الكهربائي:</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span className="font-mono text-slate-800 font-semibold">{(settings.fixedFee + settings.serviceFee).toLocaleString()} {settings.currency}</span>
                              <span>الرسوم الثابتة والصيانة:</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span className="font-mono text-slate-800 font-semibold">{taxAmount.toLocaleString()} {settings.currency}</span>
                              <span>ضريبة القيمة المضافة ({settings.taxPercent}%):</span>
                            </div>
                            <div className="border-t border-slate-100 pt-2 flex justify-between text-sm font-black text-amber-600">
                              <span className="font-mono">{totalBillAmount.toLocaleString()} {settings.currency}</span>
                              <span>المبلغ الإجمالي المستحق بالفاتورة:</span>
                            </div>
                          </motion.div>
                        )}

                        <button
                          type="submit"
                          disabled={currentReadingVal < previousReading || selectedSub.status === 'suspended'}
                          className={`w-full font-bold py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${
                            currentReadingVal >= previousReading && selectedSub.status !== 'suspended'
                              ? consumption > 1000 ? 'bg-amber-500 text-slate-900 hover:bg-amber-600 active:scale-95' : 'bg-slate-900 text-white hover:bg-slate-850 active:scale-95'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {consumption > 1000 ? 'تأكيد وإصدار الفاتورة (استهلاك مرتفع)' : 'حفظ القراءة وإصدار الفاتورة مؤقتاً'}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Print Invoice Area (Shows after success) */}
                {readingSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex flex-col gap-4 text-right"
                  >
                    <div className="flex items-center gap-2 text-emerald-800 justify-end text-sm font-bold">
                      <span>تم تسجيل الفاتورة بنجاح في النظام (بانتظار الترحيل النهائي)</span>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>

                    {/* Print Template (Hidden offscreen or shown in box) */}
                    <div id="print-invoice-box" className="bg-white text-slate-900 p-6 rounded-2xl border border-slate-200 shadow-sm max-w-sm mx-auto w-full dir-rtl font-sans text-sm">
                      <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-4">
                        <h3 className="font-bold text-lg text-slate-900">{settings.stationName}</h3>
                        <p className="text-[10px] text-slate-500 font-semibold">فاتورة استهلاك تيار كهربائي مؤقتة</p>
                        <p className="text-[10px] text-slate-500 font-mono">الهاتف: <span dir="ltr" className="inline-block">{settings.phone}</span></p>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{readingSuccess.id.replace('rd-new-', 'INV-')}</span>
                          <span className="text-slate-500 font-semibold">رقم الفاتورة:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{readingSuccess.subscriberName}</span>
                          <span className="text-slate-500 font-semibold">اسم المشترك:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{readingSuccess.meterNumber}</span>
                          <span className="text-slate-500 font-semibold">رقم العداد:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{readingSuccess.readingDate}</span>
                          <span className="text-slate-500 font-semibold">تاريخ القراءة:</span>
                        </div>
                        <div className="border-t border-dashed border-slate-200 my-2 pt-2" />
                        <div className="flex justify-between">
                          <span className="text-slate-700 font-semibold">{readingSuccess.previousReading}</span>
                          <span className="text-slate-500">القراءة السابقة:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{readingSuccess.currentReading}</span>
                          <span className="text-slate-500">القراءة الحالية:</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{readingSuccess.consumption} ك.و</span>
                          <span className="text-slate-500">صافي الاستهلاك:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-700">{readingSuccess.ratePerKwh} {settings.currency}</span>
                          <span className="text-slate-500">سعر وحدة الطاقة:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-700">{readingSuccess.fixedFee.toLocaleString()} {settings.currency}</span>
                          <span className="text-slate-500">الرسوم الثابتة:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-700">{readingSuccess.taxAmount.toLocaleString()} {settings.currency}</span>
                          <span className="text-slate-500">ضريبة القيمة المضافة:</span>
                        </div>
                        <div className="border-t border-dashed border-slate-350 my-2 pt-2 flex justify-between font-black text-base text-slate-900">
                          <span>{readingSuccess.totalAmount.toLocaleString()} {settings.currency}</span>
                          <span>المطلوب دفعه:</span>
                        </div>
                      </div>

                      <div className="text-center border-t border-dashed border-slate-300 pt-3 mt-4 text-[10px] text-slate-400">
                        <p>بإشراف المحصل المالي: {currentUser.name}</p>
                        <p className="font-bold mt-1 text-slate-500">تنبيه: تعتبر الفاتورة أولية حتى الترحيل النهائي</p>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <button
                        onClick={() => setPrintingJob({ type: 'invoice', sub: selectedSub!, reading: readingSuccess })}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 text-white py-2 px-6 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>طباعة الفاتورة الفورية للمشترك</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
              );
            })()}

            {/* TAB: SYNCHRONIZED MASTER METER READING */}
            {activeTab === 'master_reading' && (
              <motion.div
                key="master-reading-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6 text-right"
              >
                {/* Synchronized Readings Banner */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/20 text-amber-700 rounded-xl font-bold shrink-0">
                      <Gauge className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm mb-0.5">توحيد وتزامن فترة القراءة (Synchronized Readings)</h4>
                      <p className="text-slate-600 leading-relaxed">
                        تسجيل قراءة العداد المركزي للمحول في نفس يوم وساعة قراءة عدادات المشتركين، لضمان دقة المقارنة وعدم وجود تباين زمني.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-mono text-xs font-bold text-slate-800 shrink-0">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>تاريخ وساعة التزامن: {new Date().toLocaleDateString('ar-SA')} {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {masterReadingSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>{masterReadingSuccess}</span>
                    </div>
                    <button onClick={() => setMasterReadingSuccess(null)} className="text-emerald-600 hover:text-emerald-900">إغلاق</button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Form to Select Transformer & Record Reading */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col gap-4">
                    <h4 className="font-black text-slate-900 text-sm flex items-center justify-end gap-2 border-b border-slate-200 pb-3">
                      <span>إدخال قراءة المحول المركزي في الميدان</span>
                      <Edit3 className="w-4 h-4 text-amber-600" />
                    </h4>

                    {/* Transformer Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">اختر المحول الكهربائي للمنطقة</label>
                      <select
                        value={selectedMasterTransformer}
                        onChange={e => {
                          const transName = e.target.value;
                          setSelectedMasterTransformer(transName);
                          setMasterReadingSuccess(null);
                          const tObj = (settings.transformers || []).find((t: any) => {
                            const name = typeof t === 'string' ? t : t.name;
                            return name === transName;
                          });
                          if (tObj && typeof tObj === 'object') {
                            setMasterMeterNum(tObj.meterNumber || 'MTR-CENTRAL-01');
                            setMasterPrevReading(Number(tObj.previousMasterReading || 0));
                            setMasterCurrReading(Number(tObj.currentMasterReading || 0));
                            setMasterCtRatio(Number(tObj.ctRatio || 1));
                            setMasterCapacityKva(Number(tObj.capacityKva || 500));
                            setMasterZone(tObj.zone || 'المنطقة الرئيسية');
                          }
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-800 text-xs font-bold focus:border-slate-900 outline-none"
                      >
                        <option value="">-- اختر المحول المراد تسجيل قراءته المركزية --</option>
                        {(settings.transformers || []).map((t: any, idx: number) => {
                          const name = typeof t === 'string' ? t : t.name || `محول ${idx + 1}`;
                          return (
                            <option key={idx} value={name}>{name}</option>
                          );
                        })}
                      </select>
                    </div>

                    {selectedMasterTransformer ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-slate-400 block text-[10px] font-bold">القدرة الاستيعابية</span>
                            <span className="font-bold text-amber-600 font-mono block mt-1">{masterCapacityKva} KVA</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-slate-400 block text-[10px] font-bold">المنطقة الجغرافية</span>
                            <span className="font-bold text-slate-800 block mt-1">{masterZone}</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">رقم العداد المركزي (Master Meter ID)</label>
                          <input 
                            type="text"
                            value={masterMeterNum}
                            onChange={e => setMasterMeterNum(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs font-mono focus:border-slate-900 outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">القراءة السابقة (ك.و)</label>
                            <input 
                              type="number"
                              value={masterPrevReading}
                              onChange={e => setMasterPrevReading(Number(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs font-mono focus:border-slate-900 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">القراءة الحالية (ك.و)</label>
                            <input 
                              type="number"
                              value={masterCurrReading}
                              onChange={e => setMasterCurrReading(Number(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs font-mono focus:border-slate-900 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">معامل ضرب العداد / محول التيار (CT Ratio)</label>
                          <input 
                            type="number"
                            step="0.1"
                            value={masterCtRatio}
                            onChange={e => setMasterCtRatio(Number(e.target.value))}
                            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs font-mono focus:border-slate-900 outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!onUpdateSettings) return;
                            const currentTransformers = settings.transformers || [];
                            const updatedTransformers = currentTransformers.map((t: any) => {
                              const name = typeof t === 'string' ? t : t.name;
                              if (name === selectedMasterTransformer) {
                                return {
                                  id: typeof t === 'object' ? t.id : 'tr-' + Date.now(),
                                  name: selectedMasterTransformer,
                                  meterNumber: masterMeterNum,
                                  previousMasterReading: masterPrevReading,
                                  currentMasterReading: masterCurrReading,
                                  ctRatio: masterCtRatio,
                                  capacityKva: masterCapacityKva,
                                  zone: masterZone,
                                  lastReadingTimestamp: new Date().toISOString(),
                                  lastReadingCollector: currentUser.name
                                };
                              }
                              return t;
                            });

                            onUpdateSettings({
                              ...settings,
                              transformers: updatedTransformers
                            });

                            setMasterReadingSuccess(`تم توثيق وتزامن قراءة العداد المركزي للمحول [${selectedMasterTransformer}] بنجاح في نفس وقت قراءات المشتركين!`);
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>تسجيل وتوثيق القراءة المركزية المتزامنة</span>
                        </button>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400 text-xs font-bold">
                        الرجاء اختيار المحول من القائمة أعلاه لعرض واستكمال بيانات القراءة المركزية.
                      </div>
                    )}
                  </div>

                  {/* Synchronized Calculated Loss Results */}
                  {selectedMasterTransformer ? (
                    (() => {
                      const tempTransformerObj = {
                        name: selectedMasterTransformer,
                        meterNumber: masterMeterNum,
                        capacityKva: masterCapacityKva,
                        zone: masterZone,
                        previousMasterReading: masterPrevReading,
                        currentMasterReading: masterCurrReading,
                        ctRatio: masterCtRatio
                      };
                      const loss = calculateTransformerLoss(tempTransformerObj, subscribers, settings);
                      const isRed = loss.trafficLight === 'red';
                      const isYellow = loss.trafficLight === 'yellow';

                      return (
                        <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 flex flex-col justify-between gap-4 shadow-xl">
                          <div>
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                              <span className="text-xs font-mono text-amber-400 font-bold">{loss.subscribersCount} مشترك تابع للمحول</span>
                              <h4 className="font-bold text-slate-100 text-sm">مباشر: نتيجة مطابقة الفاقد المتزامنة</h4>
                            </div>

                            {/* Traffic Light Status */}
                            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs mb-4 ${
                              isRed 
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                                : isYellow 
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            }`}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-base">{loss.totalLossPercent.toFixed(1)}%</span>
                                <span className="text-[10px] text-slate-400 font-sans">نسبة الفاقد المحسوبة</span>
                              </div>
                              <div className="flex items-center gap-1.5 font-bold">
                                <span>{loss.statusText}</span>
                                {isRed ? <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" /> : isYellow ? <AlertTriangle className="w-5 h-5 text-amber-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                              </div>
                            </div>

                            {/* Energy Figures */}
                            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                                <span className="text-slate-400 block text-[10px] mb-1">استهلاك العداد المركزي</span>
                                <span className="font-mono font-bold text-amber-400 text-sm">{loss.centralEnergyKwh.toLocaleString()} ك.و.س</span>
                              </div>
                              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                                <span className="text-slate-400 block text-[10px] mb-1">مجموع استهلاك المشتركين</span>
                                <span className="font-mono font-bold text-emerald-400 text-sm">{loss.subMetersEnergyKwh.toLocaleString()} ك.و.س</span>
                              </div>
                            </div>

                            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                              <div className="flex justify-between items-center">
                                <span className={`font-mono font-bold ${isRed ? 'text-rose-400' : isYellow ? 'text-amber-400' : 'text-slate-200'}`}>
                                  {loss.totalLossKwh.toLocaleString()} ك.و.س
                                </span>
                                <span className="text-slate-400">إجمالي كمية الفاقد:</span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                                <span className={`font-mono font-black text-sm ${isRed ? 'text-rose-400' : isYellow ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {loss.lossValueCurrency.toLocaleString()} {settings.currency}
                                </span>
                                <span className="text-slate-300 font-bold">القيمة النقدية للفاقد:</span>
                              </div>
                            </div>
                          </div>

                          {isRed && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 space-y-1">
                              <div className="font-bold flex items-center gap-1.5 text-rose-400">
                                <ShieldAlert className="w-4 h-4" />
                                <span>تحذير: يتطلب نزول فريق تفتيش فني للمنطقة فوراً!</span>
                              </div>
                              <p className="text-[11px] text-rose-300/80 leading-relaxed">
                                نسبة الفاقد أعلى من 10%. يجب فحص العدادات والتوصيلات المباشرة لكشف التعديات والسرقات.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                      <Gauge className="w-12 h-12 text-slate-300" />
                      <p className="text-xs font-bold text-slate-600">لوحة تحليل الفاقد المباشر والمطابقة المتزامنة</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'payment' && (
              <motion.div
                key="payment-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6"
              >
                {!selectedSub ? (
                  <div className="text-center py-12 text-slate-400">
                    <UserRound className="w-12 h-12 mx-auto text-slate-300 mb-3 animate-pulse" />
                    <p className="text-sm font-bold text-slate-800">يرجى اختيار مشترك من القائمة الجانبية للبدء بالتحصيل مالي</p>
                    <p className="text-xs text-slate-500 mt-1">ابحث عن المشترك واطلع على مديونيته لتسديد جزء أو كامل المبلغ</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Subscriber Balance Card */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col gap-4 text-right">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                          selectedSub.currentBalance > 0 ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}>
                          {selectedSub.currentBalance > 0 ? 'مطالب بالدفع' : 'حساب مستقر'}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm">{selectedSub.name}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-center col-span-2 shadow-xs">
                          <span className="text-slate-400 block text-[10px] font-bold">الرصيد المستحق الحالي</span>
                          <span className={`font-mono text-xl font-black block mt-1 ${selectedSub.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {selectedSub.currentBalance.toLocaleString()} {settings.currency}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center shadow-xs">
                          <span className="text-slate-400 block text-[10px] font-bold">رقم الهاتف</span>
                          <span className="font-bold text-slate-800 block mt-1 font-mono">{selectedSub.phone}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center shadow-xs">
                          <span className="text-slate-400 block text-[10px] font-bold">رقم العداد</span>
                          <span className="font-bold text-slate-800 block mt-1 font-mono">{selectedSub.meterNumber}</span>
                        </div>
                      </div>
                    </div>

                    {/* Collection Form */}
                    <div className="flex flex-col gap-4">
                      <form onSubmit={submitPayment} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col gap-4">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider text-right flex items-center gap-1.5 justify-end">
                          <span>سند تحصيل وقبض مالي جديد</span>
                          <Banknote className="w-4 h-4 text-emerald-600" />
                        </h4>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2 text-right">المبلغ المستلم للتحصيل</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={amountPaidInput}
                            onChange={e => {
                              setAmountPaidInput(e.target.value);
                              setPaymentSuccess(null);
                            }}
                            placeholder="أدخل قيمة المبلغ النقدي"
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-right text-sm focus:outline-none focus:border-slate-900"
                          />
                          {parseFloat(amountPaidInput) > selectedSub.currentBalance && selectedSub.currentBalance > 0 && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200 justify-end text-right">
                                <span>المبلغ المدخل ({parseFloat(amountPaidInput).toLocaleString()} {settings.currency}) أكبر من الرصيد المستحق، سيقيد الفارق كرصيد دائن.</span>
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            </div>
                          )}
                          {parseFloat(amountPaidInput) > 1000000 && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 mt-2 justify-end text-right">
                                <span>تنبيه: المبلغ المدخل ضخم جداً. يرجى المراجعة.</span>
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2 text-right">طريقة الدفع</label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('cash')}
                              className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                paymentMethod === 'cash'
                                  ? 'bg-slate-900 text-white border-transparent'
                                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-950'
                              }`}
                            >
                              نقداً (كاش)
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('e-wallet')}
                              className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                paymentMethod === 'e-wallet'
                                  ? 'bg-slate-900 text-white border-transparent'
                                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-950'
                              }`}
                            >
                              محفظة إلكترونية
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('transfer')}
                              className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                paymentMethod === 'transfer'
                                  ? 'bg-slate-900 text-white border-transparent'
                                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-950'
                              }`}
                            >
                              تحويل بنكي
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={!amountPaidInput || parseFloat(amountPaidInput) <= 0}
                          className={`w-full font-bold py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${
                            amountPaidInput && parseFloat(amountPaidInput) > 0
                              ? 'bg-slate-900 text-white hover:bg-slate-850 active:scale-95'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          حفظ وإصدار سند القبض مؤقتاً
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Print Receipt Area (Shows after success) */}
                {paymentSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex flex-col gap-4 text-right"
                  >
                    <div className="flex items-center gap-2 text-emerald-800 justify-end text-sm font-bold">
                      <span>سند مالي مسجل في الانتظار (في دورة الترحيل الحالية)</span>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>

                    <div id="print-receipt-box" className="bg-white text-slate-900 p-6 rounded-2xl border border-slate-200 shadow-sm max-w-sm mx-auto w-full dir-rtl font-sans text-sm">
                      <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-4">
                        <h3 className="font-bold text-lg text-slate-900">{settings.stationName}</h3>
                        <p className="text-[10px] text-slate-500 font-semibold">سند قبض وتوريد مالي</p>
                        <p className="text-[10px] text-slate-500 font-mono">الهاتف: <span dir="ltr" className="inline-block">{settings.phone}</span></p>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{paymentSuccess.receiptNumber}</span>
                          <span className="text-slate-500 font-semibold">رقم السند:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{paymentSuccess.subscriberName}</span>
                          <span className="text-slate-500 font-semibold">المستلم من الأخ:</span>
                        </div>
                        <div className="flex justify-between text-slate-900">
                          <span className="font-black font-mono text-base">{paymentSuccess.amountPaid.toLocaleString()} {settings.currency}</span>
                          <span className="text-slate-500 font-semibold">مبلغ وقدره:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">
                            {paymentSuccess.paymentMethod === 'cash' ? 'نقداً' : paymentSuccess.paymentMethod === 'e-wallet' ? 'محفظة إلكترونية' : 'تحويل مصرفي'}
                          </span>
                          <span className="text-slate-500 font-semibold">طريقة التوريد:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{paymentSuccess.paymentDate}</span>
                          <span className="text-slate-500 font-semibold">تاريخ وتوقيت العملية:</span>
                        </div>
                        <div className="border-t border-dashed border-slate-200 my-2 pt-2" />
                        <p className="text-center text-[11px] text-slate-500 italic">"شكراً لتسديدكم المستحقات في وقتها لضمان استمرار الخدمة الكهربائية"</p>
                      </div>

                      <div className="text-center border-t border-dashed border-slate-300 pt-3 mt-4 text-[10px] text-slate-400">
                        <p>توقيع مستلم السند: {currentUser.name}</p>
                        <p className="font-bold mt-1 text-slate-500">تنبيه: لا يعتمد السند رسمياً للخصم المالي إلا بعد المراجعة والترحيل</p>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <button
                        onClick={() => setPrintingJob({ type: 'receipt', sub: selectedSub!, payment: paymentSuccess })}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 text-white py-2 px-6 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>طباعة السند الفوري للمشترك</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'statement' && (
              <motion.div
                key="statement-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6"
              >
                {!selectedSub ? (
                  <div className="text-center py-12 text-slate-400">
                    <UserRound className="w-12 h-12 mx-auto text-slate-300 mb-3 animate-pulse" />
                    <p className="text-sm font-bold text-slate-800">يرجى اختيار مشترك من القائمة الجانبية لعرض كشف الحساب والطباعة</p>
                    <p className="text-xs text-slate-500 mt-1">ابحث عن المشترك واطبع كشف الحساب أو فواتيره وسنداته السابقة</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 text-right" dir="rtl">
                    {/* Subscriber Profile & Statement Actions Header */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 justify-end md:justify-start">
                          <span className="px-2.5 py-1 bg-amber-100 border border-amber-200 rounded-lg text-[10px] text-amber-800 font-bold">
                            {selectedSub.tariffType === 'residential' ? 'سكني' : selectedSub.tariffType === 'commercial' ? 'تجاري' : 'صناعي'}
                          </span>
                          <h4 className="font-black text-slate-800 text-base">{selectedSub.name}</h4>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold">عداد رقم: <span className="font-mono">{selectedSub.meterNumber}</span> | جوال: <span className="font-mono" dir="ltr">{selectedSub.phone}</span></p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 justify-center md:justify-end">
                        <button
                          onClick={() => setPrintingJob({ type: 'statement', sub: selectedSub })}
                          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black py-2.5 px-5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          <Printer className="w-4 h-4 text-slate-950" />
                          <span>طباعة كشف الحساب كاملاً (80mm)</span>
                        </button>
                      </div>
                    </div>

                    {/* Balance Cards Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 text-center">
                        <span className="text-slate-500 block text-xs font-bold">إجمالي المطالبات والفواتير</span>
                        <span className="font-mono text-lg font-black text-amber-600 block mt-1">
                          {(readings.filter(r => r.subscriberId === selectedSub.id).reduce((sum, r) => sum + r.totalAmount, 0)).toLocaleString()} {settings.currency}
                        </span>
                      </div>
                      <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 text-center">
                        <span className="text-slate-500 block text-xs font-bold">إجمالي المبالغ المدفوعة</span>
                        <span className="font-mono text-lg font-black text-emerald-600 block mt-1">
                          {(payments.filter(p => p.subscriberId === selectedSub.id).reduce((sum, p) => sum + p.amountPaid, 0)).toLocaleString()} {settings.currency}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                        <span className="text-slate-500 block text-xs font-bold">الرصيد المتبقي المستحق</span>
                        <span className={`font-mono text-lg font-black block mt-1 ${selectedSub.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {selectedSub.currentBalance.toLocaleString()} {settings.currency}
                        </span>
                      </div>
                    </div>

                    {/* Historical Operations List with Thermal Print option for each item */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2">سجل العمليات والفواتير التفصيلية:</h4>
                      {(() => {
                        const subReadings = readings.filter(r => r.subscriberId === selectedSub.id);
                        const subPayments = payments.filter(p => p.subscriberId === selectedSub.id);
                        const list = [
                          ...subReadings.map(r => ({ id: r.id, date: r.readingDate, type: 'invoice' as const, typeName: 'فاتورة استهلاك تيار', amount: r.totalAmount, details: `${r.consumption} ك.و (القراءة: ${r.currentReading})`, reading: r })),
                          ...subPayments.map(p => ({ id: p.id, date: p.paymentDate, type: 'receipt' as const, typeName: 'سند قبض وتوريد', amount: p.amountPaid, details: `رقم السند: ${p.receiptNumber} (${p.paymentMethod === 'cash' ? 'نقداً' : p.paymentMethod === 'e-wallet' ? 'محفظة' : 'تحويل'})`, payment: p }))
                        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        return list.length > 0 ? (
                          <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-xs">
                            <div className="overflow-x-auto">
                              <table className="w-full text-right text-xs border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                                  <tr>
                                    <th className="py-3 px-4">التاريخ</th>
                                    <th className="py-3 px-4">نوع العملية</th>
                                    <th className="py-3 px-4">البيان</th>
                                    <th className="py-3 px-4">المبلغ</th>
                                    <th className="py-3 px-4 text-center w-28">الطباعة الحرارية</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {list.map((op, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="py-2.5 px-4 font-mono text-slate-500">{op.date}</td>
                                      <td className="py-2.5 px-4 font-bold">
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                                          op.type === 'invoice' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                        }`}>
                                          {op.typeName}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-4 text-slate-600 font-medium">{op.details}</td>
                                      <td className="py-2.5 px-4 font-mono font-bold text-slate-950">
                                        {op.amount.toLocaleString()} {settings.currency}
                                      </td>
                                      <td className="py-2.5 px-4">
                                        <div className="flex justify-center">
                                          <button
                                            onClick={() => setPrintingJob(
                                              op.type === 'invoice'
                                                ? { type: 'invoice', sub: selectedSub, reading: op.reading }
                                                : { type: 'receipt', sub: selectedSub, payment: op.payment }
                                            )}
                                            className="p-1 px-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer text-[10px] font-bold"
                                          >
                                            <Printer className="w-3 h-3" />
                                            <span>طباعة الإيصال</span>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <p className="text-center py-8 text-xs text-slate-400 italic">لا توجد أي فواتير أو سندات قبض سابقة مسجلة لهذا المشترك.</p>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4 text-right"
              >
                <div className="flex flex-col sm:flex-row-reverse sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                  <button
                    onClick={() => setPrintingJob({ type: 'shift_report' })}
                    className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 text-white font-black py-2.5 px-5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    <Printer className="w-4 h-4 text-amber-500" />
                    <span>طباعة تقرير الإغلاق المالي للوردية (80mm)</span>
                  </button>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-black text-slate-800">سجل عملياتك الميدانية لهذا اليوم</h3>
                    <p className="text-xs text-slate-500 font-semibold">قائمة بالفواتير والمبالغ التي قمت بإدخالها للنظام اليوم بانتظار ترحيل الإدارة.</p>
                  </div>
                </div>

                {/* KPI Performance & Efficiency Stats Dashboard */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" dir="rtl">
                  {/* Card 1: Shift Actual Duration */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4 text-right">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-black">مدة وتوقيت وردية العمل الفعلي</span>
                      <p className="font-mono text-sm font-extrabold text-slate-800">{shiftTimes.durationStr}</p>
                      {shiftTimes.first && (
                        <p className="text-[9px] text-slate-500 font-semibold">
                          أول عملية: {shiftTimes.first} | آخر عملية: {shiftTimes.last}
                        </p>
                      )}
                    </div>
                    <div className="p-3 bg-amber-500/10 rounded-xl">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>

                  {/* Card 2: Average Collection per Sub */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4 text-right">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-black">متوسط التحصيل لكل مشترك مالي</span>
                      <p className="font-mono text-sm font-extrabold text-emerald-600">
                        {avgCollectionPerSub.toLocaleString()} {settings.currency}
                      </p>
                      <p className="text-[9px] text-slate-500 font-semibold">
                        إجمالي المقبوضات: {myPaymentsToday.length} سندات
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>

                  {/* Card 3: Overall Performance Indicator */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4 text-right">
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[10px] text-slate-400 font-black">معدل التغطية الميدانية الإجمالي</span>
                        <span className="text-xs font-black text-indigo-600">
                          {subscribers.length > 0 ? Math.round((visitedSubscribersIds.size / subscribers.length) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1.5">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${subscribers.length > 0 ? Math.min(100, Math.round((visitedSubscribersIds.size / subscribers.length) * 100)) : 0}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-slate-500 font-semibold">
                        تمت زيارة {visitedSubscribersIds.size} مشترك من أصل {subscribers.length}
                      </p>
                    </div>
                    <div className="p-3 bg-indigo-500/10 rounded-xl shrink-0">
                      <Target className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                </div>

                {/* Zone Progress Tracking Widget - Interactive */}
                {zoneCompletionStats.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3 text-right" dir="rtl">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-indigo-500" />
                        <span>نسبة إنجاز وتغطية المربعات السكنية لليوم</span>
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold">اضغط على المربع لتصفيته في السجل أدناه</span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {zoneCompletionStats.map(stat => {
                        const isSelectedZone = historySearchQuery.toLowerCase() === stat.zoneName.toLowerCase();
                        
                        // Color schemes depending on progress
                        let progressColor = 'bg-rose-500';
                        let textColor = 'text-rose-700 font-bold';
                        let borderColor = 'border-rose-100';
                        let bgColor = 'bg-rose-50/20';

                        if (stat.percent >= 100) {
                          progressColor = 'bg-emerald-500';
                          textColor = 'text-emerald-700 font-bold';
                          borderColor = 'border-emerald-200';
                          bgColor = 'bg-emerald-50/30';
                        } else if (stat.percent >= 50) {
                          progressColor = 'bg-amber-500';
                          textColor = 'text-amber-700 font-bold';
                          borderColor = 'border-amber-200';
                          bgColor = 'bg-amber-50/20';
                        }

                        return (
                          <button
                            key={stat.zoneName}
                            type="button"
                            onClick={() => {
                              if (isSelectedZone) {
                                setHistorySearchQuery('');
                              } else {
                                setHistorySearchQuery(stat.zoneName);
                              }
                            }}
                            className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1.5 active:scale-95 cursor-pointer relative overflow-hidden ${
                              isSelectedZone 
                                ? 'ring-2 ring-indigo-500 border-indigo-300 bg-white shadow-sm' 
                                : `${borderColor} ${bgColor} hover:bg-white`
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-700 text-[11px] truncate max-w-[70%]">{stat.zoneName}</span>
                              <span className={`text-[10px] font-bold ${textColor}`}>{stat.percent}%</span>
                            </div>
                            <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                                style={{ width: `${stat.percent}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-slate-500 font-semibold">
                              <span>التغطية: {stat.visited}/{stat.total}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Live Filters & Search Bar */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col lg:flex-row-reverse gap-3 items-center justify-between" dir="rtl">
                  {/* Filter Tabs */}
                  <div className="flex flex-wrap bg-slate-200/60 p-1 rounded-xl w-full lg:w-auto gap-0.5 sm:gap-0">
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('all')}
                      className={`flex-1 sm:flex-initial py-1.5 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer text-center ${
                        historyFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      الكل ({myReadingsToday.length + myPaymentsToday.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('readings')}
                      className={`flex-1 sm:flex-initial py-1.5 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer text-center ${
                        historyFilter === 'readings'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      الفواتير ({myReadingsToday.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('payments')}
                      className={`flex-1 sm:flex-initial py-1.5 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer text-center ${
                        historyFilter === 'payments'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      التحصيلات ({myPaymentsToday.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('pending_visit')}
                      className={`flex-1 sm:flex-initial py-1.5 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                        historyFilter === 'pending_visit'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-rose-600 hover:text-rose-900'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse inline-block"></span>
                      <span>غير مقروء بالنزول الميداني ({pendingSubscribersList.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('completed_visit')}
                      className={`flex-1 sm:flex-initial py-1.5 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                        historyFilter === 'completed_visit'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-emerald-600 hover:text-emerald-900'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                      <span>مقروء بالنزول الميداني ({completedSubscribersList.length})</span>
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:max-w-xs">
                    <input
                      type="text"
                      placeholder="بحث باسم المشترك أو رقم الفاتورة/السند..."
                      value={historySearchQuery}
                      onChange={e => setHistorySearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 pr-9 text-slate-800 text-right text-xs placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    {historySearchQuery && (
                      <button
                        onClick={() => setHistorySearchQuery('')}
                        className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-Views Based on Filters */}
                {historyFilter === 'pending_visit' && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3" dir="rtl">
                      <h4 className="text-xs font-bold text-rose-700 flex items-center gap-1">
                        <span>مشتركون متبقون لم تقرأ عداداتهم اليوم ({filteredPendingSubscribersList.length})</span>
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                      </h4>

                      {filteredPendingSubscribersList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsBatchZeroModalOpen(true)}
                          className="w-full sm:w-auto px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>تسجيل استهلاك (0 ك.و) للجميع ({filteredPendingSubscribersList.length})</span>
                        </button>
                      )}
                    </div>

                    {filteredPendingSubscribersList.length === 0 ? (
                      <p className="text-center py-8 text-xs text-slate-400 font-semibold">
                        {pendingSubscribersList.length === 0 ? "رائع! لقد تم قراءة عدادات جميع المشتركين لليوم ولا يوجد أي مشترك متبقٍ 🎉" : "لا توجد نتائج تطابق البحث."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto pr-1">
                        {filteredPendingSubscribersList.map(sub => (
                          <div key={sub.id} className="bg-white p-4 rounded-2xl border border-slate-150 flex flex-col gap-3 shadow-xs text-right">
                            <div className="flex justify-between items-start gap-2">
                              <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 rounded text-[9px] font-black shrink-0">
                                غير مقروء اليوم
                              </span>
                              <div className="min-w-0">
                                <h5 className="font-extrabold text-slate-800 text-xs sm:text-sm truncate">{sub.name}</h5>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">منطقة: {sub.zone} | عداد رقم: <span className="font-mono font-bold text-slate-700">{sub.meterNumber}</span></p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-[11px] border-t border-slate-50 pt-2.5">
                              <div className="text-left font-mono">
                                <span className="text-slate-400 text-[10px] block font-bold">الرصيد المستحق</span>
                                <span className={`font-bold ${sub.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {sub.currentBalance.toLocaleString()} {settings.currency}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400 text-[10px] block font-bold">آخر قراءة</span>
                                <span className="font-bold text-slate-700 font-mono">{sub.currentReading} كيلوواط</span>
                              </div>
                            </div>
                            <div className="border-t border-slate-100 pt-2 flex flex-wrap sm:flex-nowrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleQuickZeroReading(sub)}
                                className="w-full sm:w-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                                title="تسجيل عدم وجود استهلاك بناءً على المعاينة الميدانية"
                              >
                                <span>⚡ استهلاك (0 ك.و)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('reading');
                                  setSelectedSub(sub);
                                  window.scrollTo({ top: 300, behavior: 'smooth' });
                                }}
                                className="w-full sm:w-auto px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                              >
                                <Calculator className="w-3.5 h-3.5" />
                                <span>إدخال قراءة</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {historyFilter === 'completed_visit' && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-xs">
                    <h4 className="text-xs font-bold text-emerald-700 mb-3 flex items-center justify-end gap-1">
                      <span>مشتركون تم قراءة عداداتهم اليوم ({filteredCompletedSubscribersList.length})</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </h4>
                    {filteredCompletedSubscribersList.length === 0 ? (
                      <p className="text-center py-8 text-xs text-slate-400 font-semibold">
                        {completedSubscribersList.length === 0 ? "لم تقم بتسجيل قراءات لأي مشترك اليوم بعد." : "لا توجد نتائج تطابق البحث."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto pr-1">
                        {filteredCompletedSubscribersList.map(sub => (
                          <div key={sub.id} className="bg-white p-4 rounded-2xl border border-slate-150 flex flex-col gap-3 shadow-xs text-right">
                            <div className="flex justify-between items-start gap-2">
                              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded text-[9px] font-black shrink-0">
                                تم إدخال القراءة
                              </span>
                              <div className="min-w-0">
                                <h5 className="font-extrabold text-slate-800 text-xs sm:text-sm truncate">{sub.name}</h5>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">منطقة: {sub.zone} | عداد رقم: <span className="font-mono font-bold text-slate-700">{sub.meterNumber}</span></p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-[11px] border-t border-slate-50 pt-2.5">
                              <div className="text-left font-mono">
                                <span className="text-slate-400 text-[10px] block font-bold">الرصيد الحالي</span>
                                <span className={`font-bold ${sub.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {sub.currentBalance.toLocaleString()} {settings.currency}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400 text-[10px] block font-bold">آخر قراءة مسجلة</span>
                                <span className="font-bold text-slate-700 font-mono">{sub.currentReading} كيلوواط</span>
                              </div>
                            </div>
                            <div className="border-t border-slate-100 pt-2 flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('payment');
                                  setSelectedSub(sub);
                                  window.scrollTo({ top: 300, behavior: 'smooth' });
                                }}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Banknote className="w-3.5 h-3.5" />
                                <span>سند تحصيل</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('statement');
                                  setSelectedSub(sub);
                                  window.scrollTo({ top: 300, behavior: 'smooth' });
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>كشف حساب</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {historyFilter !== 'pending_visit' && historyFilter !== 'completed_visit' && (
                  <div className={`grid grid-cols-1 ${historyFilter === 'all' ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6 mt-2`}>
                    {/* Daily Readings Log */}
                    {historyFilter !== 'payments' && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-xs">
                        <h4 className="text-xs font-bold text-amber-700 mb-3 flex items-center justify-end gap-1">
                          <span>الفواتير المسجلة اليوم ({filteredReadingsToday.length}{myReadingsToday.length !== filteredReadingsToday.length ? ` من ${myReadingsToday.length}` : ''})</span>
                          <FileText className="w-4 h-4 text-amber-600" />
                        </h4>
                        {filteredReadingsToday.length === 0 ? (
                          <p className="text-center py-6 text-xs text-slate-400 font-semibold">
                            {myReadingsToday.length === 0 ? "لم تقم بتسجيل أي قراءة بعد." : "لا توجد نتائج تطابق البحث."}
                          </p>
                        ) : (
                          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                            {filteredReadingsToday.map(r => {
                              const allowed = isActionAllowed(r);
                              return (
                                <div key={r.id} className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-2 shadow-xs">
                                  <div className="flex justify-between items-center text-xs text-right">
                                    <span className="font-mono text-amber-600 font-bold">{r.totalAmount.toLocaleString()} {settings.currency}</span>
                                    <div>
                                      <p className="font-bold text-slate-800">{r.subscriberName}</p>
                                      <p className="text-[10px] text-slate-500 font-medium">القراءة: {r.currentReading} ك.و (الاستهلاك: {r.consumption})</p>
                                    </div>
                                  </div>
                                  {allowed ? (
                                    <div className="flex justify-between items-center border-t border-slate-50 pt-2 text-[10px]" dir="rtl">
                                      <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">متاح للتعديل (24h)</span>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleStartEditReading(r)}
                                          className="px-2 py-1 text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100/70 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1"
                                        >
                                          <span>تعديل السريع</span>
                                        </button>
                                        <button
                                          onClick={() => setDeletingItemId({ type: 'reading', id: r.id })}
                                          className="px-2 py-1 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1"
                                        >
                                          <span>إلغاء العملية</span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="border-t border-slate-50 pt-1.5 flex justify-end items-center text-[9px] text-slate-400 font-medium" dir="rtl">
                                      <span>
                                        {r.isPosted ? '🔒 معتمدة ومرحلة من الإدارة' : '🔒 غير متاح للتعديل (تجاوزت 24 ساعة من الإصدار)'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Daily Receipts Log */}
                    {historyFilter !== 'readings' && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-xs">
                        <h4 className="text-xs font-bold text-emerald-700 mb-3 flex items-center justify-end gap-1">
                          <span>السندات المالية اليوم ({filteredPaymentsToday.length}{myPaymentsToday.length !== filteredPaymentsToday.length ? ` من ${myPaymentsToday.length}` : ''})</span>
                          <Receipt className="w-4 h-4 text-emerald-600" />
                        </h4>
                        {filteredPaymentsToday.length === 0 ? (
                          <p className="text-center py-6 text-xs text-slate-400 font-semibold">
                            {myPaymentsToday.length === 0 ? "لم تقم بتحصيل أي مبالغ بعد." : "لا توجد نتائج تطابق البحث."}
                          </p>
                        ) : (
                          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                            {filteredPaymentsToday.map(p => {
                              const allowed = isActionAllowed(p);
                              return (
                                <div key={p.id} className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-2 shadow-xs">
                                  <div className="flex justify-between items-center text-xs text-right">
                                    <div className="text-left">
                                      <p className="font-mono text-emerald-600 font-bold">{p.amountPaid.toLocaleString()} {settings.currency}</p>
                                      <p className="text-[9px] text-slate-500 font-sans font-semibold">
                                        {p.paymentMethod === 'cash' ? 'نقداً' : p.paymentMethod === 'e-wallet' ? 'محفظة' : 'تحويل'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-800">{p.subscriberName}</p>
                                      <p className="text-[10px] text-slate-500 font-mono">سند: {p.receiptNumber}</p>
                                    </div>
                                  </div>
                                  {allowed ? (
                                    <div className="flex justify-between items-center border-t border-slate-50 pt-2 text-[10px]" dir="rtl">
                                      <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">متاح للتعديل (24h)</span>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleStartEditPayment(p)}
                                          className="px-2 py-1 text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100/70 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1"
                                        >
                                          <span>تعديل السريع</span>
                                        </button>
                                        <button
                                          onClick={() => setDeletingItemId({ type: 'payment', id: p.id })}
                                          className="px-2 py-1 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1"
                                        >
                                          <span>إلغاء العملية</span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="border-t border-slate-50 pt-1.5 flex justify-end items-center text-[9px] text-slate-400 font-medium" dir="rtl">
                                      <span>
                                        {p.isPosted ? '🔒 معتمدة ومرحلة من الإدارة' : '🔒 غير متاح للتعديل (تجاوزت 24 ساعة من الإصدار)'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'map' && (
              <motion.div
                key="map-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col gap-4 text-right"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3" dir="rtl">
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      <span>الخريطة التفاعلية لمواقع المشتركين والعدادات الميدانية</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">عرض مواقع المشتركين بأحدث صور الأقمار الصناعية، تتبع الـ GPS المباشر، وتحديد المواقع تلقائياً.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>تتبع الـ GPS مفعل</span>
                  </div>
                </div>

                <div className="w-full h-[650px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                  <SubscribersMap
                    subscribers={subscribers}
                    allSubscribers={subscribers}
                    onUpdateSubscribers={onUpdateSubscribers}
                    onAddAuditLog={onAddAuditLog}
                    currentUser={currentUser}
                    onAddReading={onAddReading}
                    settings={settings}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column (4 cols) - Live Subscribers Search list */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col gap-4 h-[calc(100vh-140px)] min-h-[500px] shadow-sm">
            <h3 className="text-xs font-black text-slate-800 text-right flex items-center justify-end gap-2 border-b border-slate-100 pb-2">
              <span>قائمة المشتركين والعدادات</span>
              <UserRound className="w-4 h-4 text-slate-700" />
            </h3>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث بالاسم، رقم العداد، الجوال..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 pr-9 text-slate-800 text-right text-xs placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>

            {/* Subscribers scrollable container */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredSubscribers.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-12">لم يتم العثور على أي مشترك مطابق.</p>
              ) : (
                filteredSubscribers.map(sub => {
                  const isSelected = selectedSub?.id === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleSelectSubscriber(sub)}
                      className={`w-full text-right p-3.5 rounded-2xl border text-xs transition-all flex flex-col gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 text-slate-900 shadow-xs'
                          : 'bg-slate-50/60 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-mono text-[10px] text-slate-400 font-bold">{sub.meterNumber}</span>
                        <span className="font-bold truncate text-slate-800">{sub.name}</span>
                      </div>

                      <div className="flex justify-between items-center w-full text-[10px] text-slate-500 font-medium">
                        <span className={`font-mono font-bold ${sub.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {sub.currentBalance.toLocaleString()} {settings.currency}
                        </span>
                        <span>آخر قراءة: <span className="font-mono text-slate-700 font-bold">{sub.currentReading}</span></span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Premium Thermal Paper 3D Print Overlay */}
      <AnimatePresence>
        {printingJob && (
          <div className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-md overflow-y-auto flex flex-col items-center justify-start p-4 md:py-10 print:bg-white print:m-0 print:p-0">
            {/* Top Command Bar (Hidden during printing) */}
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl flex flex-col gap-3 mb-6 shadow-2xl print:hidden">
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setPrintingJob(null)} 
                  className="text-slate-300 hover:text-rose-400 bg-slate-950 hover:bg-rose-50/10 border border-slate-800 hover:border-rose-50/30 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  تراجع وإغلاق
                </button>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 font-bold">طابعة وتصدير إيصال المحصل</p>
                  <p className="text-xs text-amber-500 font-black">إصدار وإرسال الإيصال الميداني</p>
                </div>
                <button 
                  onClick={() => {
                    try {
                      window.print();
                    } catch (e) {
                      console.error("Print failed:", e);
                      alert("فشل فتح نافذة الطباعة. يرجى فتح التطبيق في علامة تبويب مستقلة.");
                    }
                  }} 
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة</span>
                </button>
              </div>

              {/* Quick Actions Bar: WhatsApp, Copy, PNG Download */}
              <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-3" dir="rtl">
                <button
                  onClick={handleShareWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
                  <span>إرسال واتساب</span>
                </button>
                <button
                  onClick={handleCopyReceiptText}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700 active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                  <span>نسخ النص</span>
                </button>
                <button
                  onClick={downloadReceiptAsImage}
                  disabled={downloadingImage}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700 active:scale-95 disabled:opacity-50"
                >
                  {downloadingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-slate-300" />}
                  <span>حفظ كصورة</span>
                </button>
              </div>

              {copyNotice && (
                <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-2 rounded-xl text-[10px] font-bold text-center animate-fade-in">
                  {copyNotice}
                </div>
              )}
            </div>

            {/* Bluetooth Thermal Printer Controller (Hidden when printing) */}
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl flex flex-col gap-3 mb-6 shadow-2xl print:hidden text-right" dir="rtl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Bluetooth className={`w-5 h-5 ${btStatus === 'connecting' ? 'animate-pulse text-amber-500' : btStatus === 'connected' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <h3 className="text-xs font-black">الربط والطباعة عبر البلوتوث (Bluetooth)</h3>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  btStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  btStatus === 'connecting' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {btStatus === 'connected' ? 'متصل' : btStatus === 'connecting' ? 'جاري الاتصال...' : 'غير متصل'}
                </span>
              </div>

              {/* Status Message & Actions */}
              {btStatus === 'connected' ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold">الطابعة النشطة الحالية:</p>
                      <p className="font-extrabold text-slate-200 mt-0.5 flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
                        <span>{btPrinterName}</span>
                      </p>
                    </div>
                    <button 
                      onClick={disconnectBluetoothPrinter}
                      className="text-rose-400 hover:text-rose-300 font-bold text-[10px] cursor-pointer"
                    >
                      قطع الاتصال
                    </button>
                  </div>

                  <button
                    onClick={printViaBluetooth}
                    disabled={isDirectPrinting}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer active:scale-95 transition-all"
                  >
                    {isDirectPrinting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>جاري إرسال البيانات للطابعة...</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4 text-slate-950" />
                        <span>أرسل واطبع الإيصال بالبلوتوث</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    يمكنك ربط التطبيق مباشرة بالطابعات الحرارية المحمولة لإصدار وطباعة الإيصالات فورياً للمشتركين في الميدان دون الحاجة لشبكة إنترنت.
                  </p>
                  <button
                    onClick={connectBluetoothPrinter}
                    disabled={btStatus === 'connecting'}
                    className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-700 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
                  >
                    <Bluetooth className="w-4 h-4 text-amber-500" />
                    <span>بحث وإقران طابعة حرارية عبر البلوتوث</span>
                  </button>
                </div>
              )}

              {/* Error Message */}
              {btError && (
                <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-2.5 rounded-xl text-[10px] leading-relaxed flex items-start gap-1.5 font-bold text-right" dir="rtl">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>{btError}</span>
                </div>
              )}

              {/* Success Message */}
              {btSuccessMessage && (
                <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-2.5 rounded-xl text-[10px] leading-relaxed flex items-start gap-1.5 font-bold text-right" dir="rtl">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{btSuccessMessage}</span>
                </div>
              )}

              {/* Instructions Toggler */}
              <div className="border-t border-slate-800/80 pt-2.5 mt-1">
                <button 
                  type="button"
                  onClick={() => setShowBtHelp(!showBtHelp)}
                  className="w-full flex items-center justify-between text-slate-400 hover:text-slate-200 text-[10px] font-bold cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-500" />
                    <span>كيف تعمل ميزة الطباعة بالبلوتوث في الميدان؟</span>
                  </span>
                  <span>{showBtHelp ? 'إخفاء' : 'عرض'}</span>
                </button>
                
                {showBtHelp && (
                  <div className="bg-slate-950/40 border border-slate-800/60 p-3 rounded-xl text-[10px] text-slate-400 space-y-1.5 mt-2 text-right leading-relaxed animate-fade-in">
                    <p className="font-extrabold text-slate-300">💡 خطوات التشغيل السريعة والربط:</p>
                    <ol className="list-decimal list-inside space-y-1 pr-1">
                      <li>قم بتشغيل الطابعة الحرارية المحمولة (Thermal Printer).</li>
                      <li>تأكد من تفعيل البلوتوث (Bluetooth) في هاتفك أو جهازك.</li>
                      <li>اضغط على زر <strong>"بحث وإقران طابعة حرارية"</strong> بالأعلى.</li>
                      <li>اختر اسم طابعتك من القائمة المعروضة (تبدأ عادةً بـ MTP أو PT أو Thermal) ثم اضغط <strong>Pair / اقتران</strong>.</li>
                      <li>بعد نجاح الربط، اضغط زر <strong>"أرسل واطبع الإيصال بالبلوتوث"</strong> لتوليد الإيصال فورا عبر الطابعة.</li>
                    </ol>
                    <p className="text-[9px] text-amber-500 font-bold mt-1.5 border-t border-slate-800/80 pt-1">
                      * ملاحظة: إذا كانت طابعتك قديمة أو لا تدعم ترميز اللغة العربية مباشرة، يمكنك استخدام خيار <strong>"ابدأ الطباعة"</strong> المدمج بالنظام أو تنزيلها كصورة بدقة عالية ومظهر منسق بالكامل.
                    </p>
                  </div>
                )}
              </div>
            </div>



            {/* 3D Realistic Thermal Paper Preview Wrapper */}
            <div className="print:p-0 print:m-0 print:shadow-none print:border-none w-full flex justify-center animate-fade-in">
              <div 
                className="print-container w-[80mm] min-h-[140mm] bg-[#FAF9F5] text-slate-950 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t-[8px] border-t-amber-500 border-b-[8px] border-b-dashed border-b-slate-300 relative select-text" 
                dir="rtl"
                style={{ fontFamily: '"Cairo", "Inter", sans-serif' }}
              >
                {/* Visual Upper Cutter Line indicator */}
                <div className="absolute top-0 left-0 right-0 h-1 border-b border-dashed border-slate-400/30 print:hidden" />
                
                {/* Scissors cut indicator top */}
                <div className="flex items-center justify-between text-slate-400 text-[10px] my-2 border-b border-dashed border-slate-300 pb-1 font-mono print:hidden select-none">
                  <Scissors className="w-3.5 h-3.5 rotate-180 text-slate-400" />
                  <span>خط قص الورق الحراري (80mm)</span>
                  <Scissors className="w-3.5 h-3.5 text-slate-400" />
                </div>

                {/* Header (Station Info) */}
                <div className="text-center mb-4 space-y-1">
                  <div className="flex justify-center mb-1.5">
                    {settings.logoUrl ? (
                      <div className="w-20 h-20 print:w-22 print:h-22 p-1.5 bg-white border-2 border-slate-900 rounded-2xl flex items-center justify-center overflow-hidden mx-auto shadow-sm">
                        <img src={settings.logoUrl} alt="Station Logo" className="w-full h-full object-contain bg-white" />
                      </div>
                    ) : (
                      <div className="p-2 bg-slate-950 text-white rounded-full print:bg-transparent print:text-black">
                        <Zap className="w-7 h-7" />
                      </div>
                    )}
                  </div>
                  <h1 className="text-lg font-black tracking-tight">{settings.stationName}</h1>
                  {settings.logoText && <p className="text-[10px] text-slate-600 font-bold">{settings.logoText}</p>}
                  
                  <div className="text-[9px] text-slate-500 space-y-0.5 pt-1">
                    {settings.phone && (
                      <p>
                        الهاتف:{' '}
                        <span dir="ltr" className="inline-block font-mono font-bold text-slate-800 text-left">
                          {settings.phone}
                        </span>
                        {settings.phone2 && (
                          <>
                            {' - '}
                            <span dir="ltr" className="inline-block font-mono font-bold text-slate-800 text-left">
                              {settings.phone2}
                            </span>
                          </>
                        )}
                      </p>
                    )}
                    {settings.address && <p>العنوان: {settings.address}</p>}
                  </div>
                </div>

                {/* Separator */}
                <div className="border-t border-dashed border-slate-400 my-3" />

                {/* Ticket Title */}
                <div className="text-center py-1.5 bg-slate-900 text-white rounded-md my-2 print:bg-transparent print:text-black print:border print:border-slate-400">
                  <h2 className="text-xs font-black uppercase tracking-wider">
                    {printingJob.type === 'statement' && 'كشف حساب مشترك تفصيلي'}
                    {printingJob.type === 'invoice' && 'فاتورة استهلاك تيار كهربائي'}
                    {printingJob.type === 'receipt' && 'سند قبض وتوريد مالي'}
                    {printingJob.type === 'shift_report' && 'تقرير إغلاق الوردية والعهد المالية'}
                  </h2>
                </div>

                {/* Separator */}
                <div className="border-t border-dashed border-slate-400 my-3" />

                {/* Subscriber & Metadata Grid */}
                {printingJob.type !== 'shift_report' && printingJob.sub ? (
                  <div className="space-y-1.5 text-[11px] mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">اسم المشترك:</span>
                      <span className="font-extrabold text-slate-900">{printingJob.sub.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">رقم المشترك:</span>
                      <span className="font-mono font-bold">{printingJob.sub.id.substring(0, 8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">رقم العداد:</span>
                      <span className="font-mono font-bold">{printingJob.sub.meterNumber}</span>
                    </div>
                    {printingJob.sub.phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">رقم الهاتف:</span>
                        <span className="font-mono font-bold text-slate-900 inline-block text-left" dir="ltr">{printingJob.sub.phone}</span>
                      </div>
                    )}
                    {printingJob.sub.zone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">المنطقة:</span>
                        <span className="font-bold">{printingJob.sub.zone.replace('المنطقة ', '')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">تاريخ الطباعة:</span>
                      <span className="font-mono">{new Date().toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-[11px] mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">المحصل الميداني:</span>
                      <span className="font-extrabold text-slate-900">{currentUser.name} ({currentUser.username})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">نوع التقرير:</span>
                      <span className="font-bold">إغلاق الوردية والعهدة المالية</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">تاريخ الإغلاق:</span>
                      <span className="font-mono">{new Date().toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                )}

                {/* Separator */}
                <div className="border-t border-dashed border-slate-400 my-3" />

                {/* Dynamic content depending on print type */}
                {printingJob.type === 'statement' && (
                  <>
                    {/* Statement details */}
                    <div className="space-y-1 text-xs mb-3 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                      <div className="flex justify-between text-slate-700">
                        <span className="font-mono font-bold">{(readings.filter(r => r.subscriberId === printingJob.sub.id).reduce((sum, r) => sum + r.totalAmount, 0)).toLocaleString()} {settings.currency}</span>
                        <span>إجمالي الفواتير:</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span className="font-mono font-bold">{(payments.filter(p => p.subscriberId === printingJob.sub.id).reduce((sum, p) => sum + p.amountPaid, 0)).toLocaleString()} {settings.currency}</span>
                        <span>إجمالي المدفوعات:</span>
                      </div>
                      <div className="border-t border-slate-300 pt-1 flex justify-between font-black text-rose-700">
                        <span className="font-mono">{printingJob.sub.currentBalance.toLocaleString()} {settings.currency}</span>
                        <span>الرصيد المتبقي المستحق:</span>
                      </div>
                    </div>

                    {/* Operations List */}
                    <div className="mb-3">
                      <h3 className="text-[10px] font-black text-slate-800 mb-1.5">كشف حركة الحساب بالتفصيل:</h3>
                      {(() => {
                        const subReadings = readings.filter(r => r.subscriberId === printingJob.sub.id);
                        const subPayments = payments.filter(p => p.subscriberId === printingJob.sub.id);
                        const list = [
                          ...subReadings.map(r => ({ date: r.readingDate, type: 'فاتورة', amount: r.totalAmount, details: `${r.consumption} ك.و`, isPositive: false })),
                          ...subPayments.map(p => ({ date: p.paymentDate, type: 'سداد', amount: p.amountPaid, details: `سند: ${p.receiptNumber}`, isPositive: true }))
                        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        return list.length > 0 ? (
                          <div className="border border-slate-300 rounded-md bg-white overflow-hidden">
                            <table className="w-full text-right text-[9px] border-collapse" dir="rtl">
                              <thead>
                                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black">
                                  <th className="py-1 px-1.5 text-right">التاريخ</th>
                                  <th className="py-1 px-1.5 text-right">البيان</th>
                                  <th className="py-1 px-1.5 text-left">المبلغ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {list.map((op, idx) => (
                                  <tr key={idx} className="text-slate-800">
                                    <td className="py-1 px-1.5 font-mono text-[8px] whitespace-nowrap">{op.date.substring(0, 10)}</td>
                                    <td className="py-1 px-1.5">
                                      <span>{op.type}</span>
                                      <span className="block text-[7px] text-slate-500 font-mono">{op.details}</span>
                                    </td>
                                    <td className="py-1 px-1.5 text-left font-mono font-bold">
                                      <span className={op.isPositive ? 'text-emerald-700' : 'text-slate-900'}>
                                        {op.isPositive ? '+' : '-'}{op.amount.toLocaleString()}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-[9px] text-slate-500 italic text-center py-2 bg-white border border-slate-200 rounded">
                            لا توجد عمليات سابقة مسجلة.
                          </p>
                        );
                      })()}
                    </div>
                  </>
                )}

                {printingJob.type === 'invoice' && printingJob.reading && (
                  <>
                    {/* Invoice breakdown details */}
                    <div className="space-y-1.5 text-[11px] mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-500">رقم الفاتورة:</span>
                        <span className="font-mono font-bold">{printingJob.reading.id.replace('rd-new-', 'INV-')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">فترة الفاتورة:</span>
                        <span className="font-bold">{printingJob.reading.billingMonth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">القراءة السابقة:</span>
                        <span className="font-mono">{printingJob.reading.previousReading} ك.و</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">القراءة الحالية:</span>
                        <span className="font-mono">{printingJob.reading.currentReading} ك.و</span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-slate-300 pb-1.5 mb-1.5 font-bold text-slate-900">
                        <span className="text-slate-500">صافي الاستهلاك:</span>
                        <span className="font-mono">{printingJob.reading.consumption} كيلوواط ساعي</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">سعر وحدة الطاقة:</span>
                        <span className="font-mono">{printingJob.reading.ratePerKwh} {settings.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">الرسوم الثابتة:</span>
                        <span className="font-mono">{printingJob.reading.fixedFee.toLocaleString()} {settings.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">ضريبة القيمة المضافة:</span>
                        <span className="font-mono">{printingJob.reading.taxAmount.toLocaleString()} {settings.currency}</span>
                      </div>
                    </div>

                    {/* Big invoice total box */}
                    <div className="bg-white border-2 border-slate-900 p-3 rounded-lg text-center my-4">
                      <span className="block text-[10px] font-black text-slate-600 mb-1">المبلغ الإجمالي المطلوب سداده</span>
                      <span className="block font-mono font-black text-2xl text-slate-950">
                        {printingJob.reading.totalAmount.toLocaleString()} 
                        <span className="text-xs font-sans font-bold mr-1">{settings.currency}</span>
                      </span>
                    </div>
                  </>
                )}

                {printingJob.type === 'receipt' && printingJob.payment && printingJob.sub && (
                  <>
                    {/* Receipt breakdown details */}
                    <div className="space-y-1.5 text-[11px] mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-500">رقم السند:</span>
                        <span className="font-mono font-bold">{printingJob.payment.receiptNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">المبلغ المستلم:</span>
                        <span className="font-mono font-black text-slate-950">{printingJob.payment.amountPaid.toLocaleString()} {settings.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">طريقة الدفع:</span>
                        <span className="font-bold">
                          {printingJob.payment.paymentMethod === 'cash' ? 'نقداً (كاش)' : printingJob.payment.paymentMethod === 'e-wallet' ? 'محفظة إلكترونية' : 'تحويل مصرفي'}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-dashed border-slate-300 pt-1.5 mt-1.5">
                        <span className="text-slate-500">الرصيد المتبقي المستحق:</span>
                        <span className="font-mono font-bold text-slate-900">{printingJob.sub.currentBalance.toLocaleString()} {settings.currency}</span>
                      </div>
                    </div>

                    {/* Big receipt cash box */}
                    <div className="bg-white border-2 border-slate-900 p-3 rounded-lg text-center my-4">
                      <span className="block text-[10px] font-black text-slate-600 mb-1">المبلغ المدفوع والمبين بالسند</span>
                      <span className="block font-mono font-black text-2xl text-emerald-800">
                        {printingJob.payment.amountPaid.toLocaleString()} 
                        <span className="text-xs font-sans font-bold mr-1">{settings.currency}</span>
                      </span>
                    </div>
                  </>
                )}

                {printingJob.type === 'shift_report' && (
                  <>
                    {/* Shift Report details */}
                    <div className="space-y-1.5 text-[11px] mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">المستهدف المالي اليومي:</span>
                        <span className="font-mono font-bold">{dailyGoal.toLocaleString()} {settings.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">إجمالي المبالغ المحصلة:</span>
                        <span className="font-mono font-black text-emerald-800">{totalCollectedToday.toLocaleString()} {settings.currency}</span>
                      </div>
                      <div className="border-t border-dashed border-slate-300 my-1.5 pt-1.5" />
                      
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>- نقداً (كاش):</span>
                        <span className="font-mono">{myPaymentsToday.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amountPaid, 0).toLocaleString()} {settings.currency}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>- محفظة إلكترونية:</span>
                        <span className="font-mono">{myPaymentsToday.filter(p => p.paymentMethod === 'e-wallet').reduce((sum, p) => sum + p.amountPaid, 0).toLocaleString()} {settings.currency}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>- تحويل مصرفي:</span>
                        <span className="font-mono">{myPaymentsToday.filter(p => p.paymentMethod === 'bank').reduce((sum, p) => sum + p.amountPaid, 0).toLocaleString()} {settings.currency}</span>
                      </div>
                      <div className="border-t border-dashed border-slate-300 my-1.5 pt-1.5" />
                      
                      <div className="flex justify-between">
                        <span className="text-slate-500">الفواتير الصادرة اليوم:</span>
                        <span className="font-bold">{myReadingsToday.length} فاتورة</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">المشتركون المتبقون اليوم:</span>
                        <span className="font-bold">{remainingSubscribersToVisit} مشترك</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">نسبة تحقيق الهدف:</span>
                        <span className="font-bold font-mono">{progressPercent}%</span>
                      </div>
                    </div>

                    {/* Big shift report total cash box */}
                    <div className="bg-slate-900 text-white p-3.5 rounded-lg text-center my-4 print:border print:border-slate-400">
                      <span className="block text-[10px] font-black text-slate-300 mb-1">إجمالي العهدة المترتب تسليمها</span>
                      <span className="block font-mono font-black text-2xl text-amber-400 print:text-black">
                        {totalCollectedToday.toLocaleString()} 
                        <span className="text-xs font-sans font-bold mr-1">{settings.currency}</span>
                      </span>
                    </div>
                  </>
                )}

                {/* Separator */}
                <div className="border-t border-dashed border-slate-400 my-3" />

                {/* Warnings and Instructions */}
                {printingJob.type !== 'shift_report' ? (
                  <div className="text-center text-[10px] text-slate-800 space-y-1.5 px-1 py-1 bg-white border border-slate-200 rounded-lg">
                    <p className="font-bold">عزيزي المشترك، نرجو منكم سرعة المبادرة بتسديد المبالغ المستحقة لضمان استمرار الخدمة الكهربائية وتفادي تراكم المديونية.</p>
                    <p className="font-black text-rose-600 bg-rose-50 py-1 rounded">⚠️ في حالة عدم السداد خلال 3 أيام من تاريخه سيتم فصل التيار رسمياً.</p>
                  </div>
                ) : (
                  <div className="text-center text-[10px] text-slate-800 space-y-1 px-1 py-1 bg-slate-100 border border-slate-200 rounded-lg">
                    <p className="font-bold">ملاحظة للإدارة: يعتبر هذا الكشف مسودة تسليم العهود المالية والميدانية للمحصل المذكور أعلاه.</p>
                    <p className="font-semibold text-[9px] text-slate-500">تحت المراجعة والتدقيق والترحيل النهائي.</p>
                  </div>
                )}

                {/* Barcode & Footer info */}
                <div className="mt-6 text-center space-y-2">
                  {/* barcode visual */}
                  <div className="font-mono text-xs tracking-[4px] text-slate-950 font-bold py-1 select-none">
                    ||||| | |||| ||| || ||| || |||
                  </div>
                  <p className="text-[8px] font-mono text-slate-400">مستند آلي صادر ميدانياً - المحصل: {currentUser.name}</p>
                  <p className="text-[8px] font-mono text-slate-500">تاريخ وتوقيت العملية: {new Date().toLocaleString('ar-YE')}</p>
                  <p className="text-[9px] font-bold text-slate-900">نظام فولترا السحابي - Voltera Cloud ERP</p>
                </div>

                {/* Visual Lower Cutter Line indicator */}
                <div className="flex items-center justify-between text-slate-400 text-[10px] mt-6 border-t border-dashed border-slate-300 pt-1 font-mono print:hidden select-none">
                  <Scissors className="w-3.5 h-3.5 rotate-90 text-slate-400" />
                  <span>نهاية الإيصال - يرجى القص</span>
                  <Scissors className="w-3.5 h-3.5 -rotate-90 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Styled Headless Native Printing Layout Overrides */}
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

          /* Hide standard elements */
          body * { 
            visibility: hidden !important; 
          }
          header, nav, footer, sidebar, .print-hidden, .print\\:hidden, [role="dialog"] > div:first-child, button { 
            display: none !important; 
          }
          
          /* Set standard margins & layout specifically for thermal receipt */
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          /* Position printable receipt container precisely */
          .print-container, .print-container * { 
            visibility: visible !important; 
          }
          .print-container { 
            position: relative !important; 
            left: 0 !important; 
            top: 0 !important; 
            right: 0 !important;
            width: 80mm !important; 
            max-width: 80mm !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            padding: 2mm 3mm !important; 
            margin: 0 auto !important; 
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Force pure high contrast on thermal paper */
          .bg-slate-900 {
            background-color: transparent !important;
            color: #000000 !important;
            border: 1px solid #000000 !important;
          }
        }
      `}} />

      {/* Edit Reading Modal */}
      <AnimatePresence>
        {editingReading && editSub && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md text-right flex flex-col gap-4"
              dir="rtl"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-500" />
                  <span>تعديل قراءة العداد السريع</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingReading(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-base"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="block text-slate-400 font-bold mb-1">المشترك</span>
                  <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {editingReading.subscriberName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-slate-400 font-bold mb-1">القراءة السابقة</span>
                    <p className="font-mono font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {editReadingPrev} ك.و
                    </p>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold mb-1">الاستهلاك المعدل</span>
                    <p className="font-mono font-bold text-amber-600 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                      {editConsumption} ك.و
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">القراءة الحالية الجديدة</label>
                  <input
                    type="number"
                    value={editReadingInput}
                    onChange={e => setEditReadingInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 font-mono text-slate-800 text-right focus:outline-none focus:border-slate-900"
                    placeholder="أدخل القراءة الحالية"
                    min={editReadingPrev}
                  />
                  {editReadingVal < editReadingPrev && (
                    <p className="text-[10px] text-rose-500 font-bold mt-1">يجب أن تكون القراءة الحالية أكبر من أو تساوي السابقة ({editReadingPrev}).</p>
                  )}
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">سعر الكيلوواط ({editSub.tariffType === 'residential' ? 'منزلي' : editSub.tariffType === 'commercial' ? 'تجاري' : 'صناعي'}):</span>
                    <span className="font-mono">{editRate} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">قيمة الاستهلاك:</span>
                    <span className="font-mono">{(editConsumption * editRate).toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">الرسوم الثابتة والخدمة:</span>
                    <span className="font-mono">{(settings.fixedFee + settings.serviceFee).toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">الضريبة المضافة (%{settings.taxPercent}):</span>
                    <span className="font-mono">{editTaxAmount.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="border-t border-slate-200/60 pt-2 flex justify-between font-bold text-slate-800">
                    <span>إجمالي الفاتورة الجديد:</span>
                    <span className="font-mono text-amber-600">{editTotalBillAmount.toLocaleString()} {settings.currency}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleSaveEditReading}
                  disabled={editReadingVal < editReadingPrev}
                  className="flex-1 bg-slate-900 hover:bg-slate-850 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  حفظ التعديلات
                </button>
                <button
                  onClick={() => setEditingReading(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Payment Modal */}
      <AnimatePresence>
        {editingPayment && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md text-right flex flex-col gap-4"
              dir="rtl"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-500" />
                  <span>تعديل سند القبض السريع</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-base"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="block text-slate-400 font-bold mb-1">المشترك</span>
                  <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {editingPayment.subscriberName}
                  </p>
                </div>

                <div>
                  <span className="block text-slate-400 font-bold mb-1">رقم السند</span>
                  <p className="font-mono font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {editingPayment.receiptNumber}
                  </p>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">المبلغ المحصل الجديد</label>
                  <input
                    type="number"
                    value={editPaymentAmountInput}
                    onChange={e => setEditPaymentAmountInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 font-mono text-slate-800 text-right focus:outline-none focus:border-slate-900 font-bold text-emerald-600 text-xs"
                    placeholder="أدخل المبلغ المستلم"
                    min={1}
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1.5">طريقة القبض</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cash', label: 'نقداً كاش' },
                      { id: 'e-wallet', label: 'محفظة إلكترونية' },
                      { id: 'transfer', label: 'تحويل بنكي' }
                    ].map(method => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setEditPaymentMethod(method.id as any)}
                        className={`py-2 px-1 rounded-xl border font-bold text-[10px] transition-all cursor-pointer ${
                          editPaymentMethod === method.id
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-extrabold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleSaveEditPayment}
                  disabled={!editPaymentAmountInput || parseFloat(editPaymentAmountInput) <= 0}
                  className="flex-1 bg-slate-900 hover:bg-slate-850 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  حفظ التعديلات
                </button>
                <button
                  onClick={() => setEditingPayment(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Dialog */}
      <AnimatePresence>
        {deletingItemId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-sm text-right flex flex-col gap-4"
              dir="rtl"
            >
              <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-sm font-black text-slate-850">إلغاء وتراجع عن العملية الميدانية</h3>
              </div>

              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                هل أنت متأكد من رغبتك في حذف وإلغاء هذه العملية نهائياً؟ 
                سيقوم النظام تلقائياً بإعادة رصيد المشترك وحساباته إلى حالتها السابقة قبل الإدخال.
              </p>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  نعم، احذف العملية
                </button>
                <button
                  onClick={() => setDeletingItemId(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Real-time Toast Alert for New Disconnection/Reconnection Orders */}
      <AnimatePresence>
        {toastAlert && (
          <div className="fixed top-16 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[150]" dir="rtl">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="bg-slate-900 border-2 border-rose-500 text-white p-4 rounded-2xl shadow-2xl flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    toastAlert.type === 'disconnection' 
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    <Bell className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider block">إشعار عاجل من الإدارة</span>
                    <h4 className="text-xs font-black text-white">
                      {toastAlert.type === 'disconnection' ? '🔌 أمر فصل خدمة (توقيف التيار)' : '⚡ أمر إعادة / إدخال خدمة'}
                    </h4>
                  </div>
                </div>
                <button onClick={() => setToastAlert(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-800/80 rounded-xl p-2.5 text-xs space-y-1 border border-slate-700/50">
                <p className="font-bold text-amber-300">المشترك: {toastAlert.applicantName}</p>
                <p className="text-[11px] text-slate-300">الهاتف: <span dir="ltr">{toastAlert.phone}</span> {toastAlert.address ? `| ${toastAlert.address}` : ''}</p>
                {toastAlert.description && <p className="text-[11px] text-slate-400 italic">البيان: {toastAlert.description}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setToastAlert(null)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white font-bold cursor-pointer"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => {
                    setIsNotifDrawerOpen(true);
                    setSelectedOrderForExec(toastAlert);
                    setToastAlert(null);
                  }}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>معالجة وتنفيذ الأمر ⚡</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications & Field Work Orders Drawer */}
      <AnimatePresence>
        {isNotifDrawerOpen && (
          <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-xs flex justify-end" dir="rtl">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-slate-900 text-white h-full shadow-2xl flex flex-col overflow-hidden border-r border-slate-800"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-500/20 rounded-2xl text-rose-400 border border-rose-500/30">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <span>إشعارات وأوامر الفصل والإعادة</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold">أوامر التشغيل الصادرة مباشرة من إدارة المحطة</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNotifDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/50 border-b border-slate-800/80 text-center text-xs">
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <span className="block text-[10px] text-slate-400 font-bold">إجمالي الأوامر</span>
                  <span className="text-sm font-black text-white">{activeWorkOrders.length}</span>
                </div>
                <div className="bg-rose-950/40 p-2 rounded-xl border border-rose-900/50">
                  <span className="block text-[10px] text-rose-400 font-bold">أوامر الفصل 🔌</span>
                  <span className="text-sm font-black text-rose-400">
                    {activeWorkOrders.filter(r => r.type === 'disconnection' && r.status !== 'completed').length}
                  </span>
                </div>
                <div className="bg-emerald-950/40 p-2 rounded-xl border border-emerald-900/50">
                  <span className="block text-[10px] text-emerald-400 font-bold">أوامر الإعادة ⚡</span>
                  <span className="text-sm font-black text-emerald-400">
                    {activeWorkOrders.filter(r => (r.type === 'reconnection' || r.type === 'new_connection') && r.status !== 'completed').length}
                  </span>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-3 border-b border-slate-800/80 overflow-x-auto text-xs">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'disconnection', label: '🔌 أوامر الفصل' },
                  { id: 'reconnection', label: '⚡ أوامر الإعادة والتوصيل' },
                  { id: 'maintenance', label: '🛠️ الصيانة' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setNotifFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      notifFilter === tab.id
                        ? 'bg-rose-600 text-white font-extrabold shadow-sm'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Orders List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredWorkOrders.length > 0 ? (
                  filteredWorkOrders.map(req => {
                    const isPending = req.status === 'pending' || req.status === 'in_progress';
                    const isDisconnection = req.type === 'disconnection';

                    return (
                      <div
                        key={req.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isPending
                            ? isDisconnection
                              ? 'bg-slate-900 border-rose-500/50 shadow-lg shadow-rose-950/20'
                              : 'bg-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                            : 'bg-slate-900/50 border-slate-800/80 opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 ${
                              req.type === 'disconnection'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : req.type === 'reconnection'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : req.type === 'new_connection'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {req.type === 'disconnection' && <Power className="w-3 h-3" />}
                              {req.type === 'reconnection' && <Zap className="w-3 h-3" />}
                              {req.type === 'new_connection' && <UserPlus className="w-3 h-3" />}
                              {req.type === 'maintenance' && <Wrench className="w-3 h-3" />}
                              <span>
                                {req.type === 'disconnection' ? '🔌 أمر فصل الخدمة' : req.type === 'reconnection' ? '⚡ أمر إعادة الخدمة' : req.type === 'new_connection' ? '👤 إدخال خدمة جديدة' : '🛠️ صيانة أعطال'}
                              </span>
                            </span>

                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              req.status === 'completed'
                                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                                : req.status === 'in_progress'
                                ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                                : 'bg-rose-900/60 text-rose-300 border border-rose-700/50 animate-pulse'
                            }`}>
                              {req.status === 'completed' ? 'تم التنفيذ بنجاح ✅' : req.status === 'in_progress' ? 'جاري التنفيذ 🚧' : 'معلق قيد التنفيذ ⏳'}
                            </span>
                          </div>

                          <span className="text-[10px] text-slate-500 font-mono">{req.createdAt}</span>
                        </div>

                        <div className="space-y-1.5 my-2">
                          <h4 className="text-sm font-black text-white flex items-center gap-2">
                            <span>{req.applicantName}</span>
                            {req.subscriberCode && <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">#{req.subscriberCode}</span>}
                          </h4>
                          {req.address && <p className="text-xs text-slate-300 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />{req.address}</p>}
                          {req.description && (
                            <p className="text-xs bg-slate-950/70 p-2.5 rounded-xl text-slate-300 border border-slate-800 leading-relaxed font-semibold">
                              💬 {req.description}
                            </p>
                          )}
                          {req.completedAt && (
                            <p className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/50">
                              ✅ تم التنفيذ بواسطة: {req.executedBy || 'المحصل الميداني'} بتاريخ {req.completedAt}
                              {req.notes ? ` (${req.notes})` : ''}
                            </p>
                          )}
                        </div>

                        {/* Action Toolbar */}
                        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {req.phone && (
                              <a
                                href={`tel:${req.phone}`}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                                title="اتصال مباشر بالمشترك"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="hidden sm:inline" dir="ltr">{req.phone}</span>
                              </a>
                            )}

                            <button
                              onClick={() => {
                                setIsNotifDrawerOpen(false);
                                setActiveTab('map');
                              }}
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="عرض موقع المشترك على الخريطة"
                            >
                              <MapPin className="w-3.5 h-3.5 text-amber-400" />
                              <span className="hidden sm:inline">الخريطة</span>
                            </button>
                          </div>

                          {isPending && (
                            <div className="flex items-center gap-2">
                              {req.status === 'pending' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(req, 'in_progress')}
                                  className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 transition-all cursor-pointer"
                                >
                                  تحديد كـ جاري التنفيذ
                                </button>
                              )}

                              <button
                                onClick={() => setSelectedOrderForExec(req)}
                                className={`px-3 py-1.5 text-xs font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1 ${
                                  req.type === 'disconnection'
                                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تنفيذ وتأكيد الأمر ⚡</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 text-center text-slate-500 space-y-3">
                    <Bell className="w-12 h-12 mx-auto text-slate-700" />
                    <p className="text-xs font-bold">لا توجد أوامر ميدانية حالياً ضمن هذا التصنيف</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Work Order Execution Modal */}
      <AnimatePresence>
        {selectedOrderForExec && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md text-right overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${
                    selectedOrderForExec.type === 'disconnection' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {selectedOrderForExec.type === 'disconnection' ? <Power className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      تأكيد تنفيذ {selectedOrderForExec.type === 'disconnection' ? 'أمر فصل الخدمة 🔌' : 'أمر إعادة/توصيل الخدمة ⚡'}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-semibold">تأكيد الإجراء الميداني وتحديث حالة المشترك آلياً</p>
                  </div>
                </div>
                <button onClick={() => setSelectedOrderForExec(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleExecuteWorkOrder} className="space-y-4">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-500">المشترك:</span>
                    <span className="font-black text-slate-900">{selectedOrderForExec.applicantName}</span>
                  </div>
                  {selectedOrderForExec.phone && (
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-500">الهاتف:</span>
                      <span className="font-mono font-bold text-slate-800" dir="ltr">{selectedOrderForExec.phone}</span>
                    </div>
                  )}
                  {selectedOrderForExec.address && (
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-500">العنوان:</span>
                      <span className="font-bold text-slate-800">{selectedOrderForExec.address}</span>
                    </div>
                  )}
                  {selectedOrderForExec.description && (
                    <div className="pt-1 border-t border-slate-200">
                      <span className="block text-[10px] text-slate-400 font-bold mb-0.5">سبب/تفاصيل الأمر من الإدارة:</span>
                      <p className="text-[11px] text-slate-700 italic font-medium">{selectedOrderForExec.description}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات المحصل عند التنفيذ الميداني</label>
                  <textarea
                    rows={3}
                    value={execNotes}
                    onChange={e => setExecNotes(e.target.value)}
                    placeholder={selectedOrderForExec.type === 'disconnection' ? 'مثال: تم فصل الكابل من القاطع الرئيسي وإغلاق الصندوق برقم كود 482' : 'مثال: تم إعادة ربط التوصيلات وتشغيل التيار وقياس الفولتية 220V'}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-indigo-600 font-medium resize-none"
                  ></textarea>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    عند الحفظ، سيتم تحويل حالة الأمر إلى "مكتمل" وتحديث حالة المشترك تلقائياً في السجل والإشعارات.
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className={`flex-1 font-black py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer ${
                      selectedOrderForExec.type === 'disconnection'
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    تأكيد وحفظ التنفيذ 💾
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForExec(null)}
                    className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Batch Zero Reading Confirmation Modal */}
      <AnimatePresence>
        {isBatchZeroModalOpen && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md text-right overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      تأكيد تسجيل قراءات صفرية (0 ك.و) للعدادات المتبقية
                    </h3>
                    <p className="text-[11px] text-slate-500 font-semibold">بناءً على نتائج المعاينة الميدانية</p>
                  </div>
                </div>
                <button onClick={() => setIsBatchZeroModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium space-y-2">
                  <p className="font-bold text-amber-950">
                    تمت المعاينة الميدانية وأتضح عدم وجود أي استهلاك كهربائي جديد.
                  </p>
                  <p>
                    سيتم تسجيل قراءة صفرية (0 ك.و) بصفة جماعية لعدد <strong className="text-amber-700 font-mono text-sm underline">{filteredPendingSubscribersList.length}</strong> مشتركون غير مقروءين اليوم، مع احتفاظ العداد بقراءته السابقة واحتساب رسوم الاشتراك للحد الأدنى إن وجدت.
                  </p>
                </div>

                <div className="max-h-36 overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1 custom-scrollbar">
                  <span className="block text-[10px] text-slate-400 font-bold mb-1">المشتركون المشمولون بالعملية ({filteredPendingSubscribersList.length}):</span>
                  {filteredPendingSubscribersList.map((s, idx) => (
                    <div key={s.id} className="flex justify-between items-center bg-white px-2.5 py-1 rounded-lg border border-slate-150 text-[11px]">
                      <span className="font-bold text-slate-800">{idx + 1}. {s.name}</span>
                      <span className="font-mono text-slate-500 font-semibold">{s.meterNumber}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const listToProcess = [...filteredPendingSubscribersList];
                      listToProcess.forEach((sub, idx) => {
                        setTimeout(() => {
                          handleQuickZeroReading(sub);
                        }, idx * 30);
                      });
                      setIsBatchZeroModalOpen(false);
                    }}
                    className="flex-1 font-black py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>تأكيد تسجيل قراءات استهلاك صفر (0 ك.و)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBatchZeroModalOpen(false)}
                    className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
