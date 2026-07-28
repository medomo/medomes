import { useState, useEffect } from 'react';
import { 
  User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, InventoryItem, InventoryTransaction,
  Expense, Purchase, EmployeeTransaction, ServiceConnection, Employee, TechnicalRequest
} from './types';
import { 
  INITIAL_USERS, INITIAL_SUBSCRIBERS, INITIAL_READINGS, 
  INITIAL_PAYMENTS, DEFAULT_SETTINGS, INITIAL_AUDIT_LOGS, INITIAL_INVENTORY, INITIAL_INVENTORY_TRANSACTIONS } from './initialData';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { CollectorDashboard } from './components/CollectorDashboard';
import { 
  loadAllCloudData, 
  syncUserToCloud, 
  syncSubscriberToCloud, 
  syncReadingToCloud, 
  syncPaymentToCloud, 
  syncSettingsToCloud, 
  syncAuditLogToCloud,
  deleteUserFromCloud,
  deleteSubscriberFromCloud,
  deleteReadingFromCloud,
  deletePaymentFromCloud,
  syncBulkReadingsToCloud,
  syncBulkPaymentsToCloud,
  syncTreasuryTransferToCloud,
  deleteTreasuryTransferFromCloud,
  syncExpenseToCloud,
  deleteExpenseFromCloud,
  syncPurchaseToCloud,
  deletePurchaseFromCloud,
  syncJournalEntryToCloud,
  deleteJournalEntryFromCloud,
  syncEmployeeToCloud,
  deleteEmployeeFromCloud,
  syncEmployeeTxToCloud,
  deleteEmployeeTxFromCloud,
  syncConnectionToCloud,
  deleteConnectionFromCloud,
  syncTechRequestToCloud,
  deleteTechRequestFromCloud,
  syncInventoryItemToCloud,
  deleteInventoryItemFromCloud,
  syncInventoryTxToCloud,
  subscribeToSubscribersFromCloud,
  subscribeToTechRequestsFromCloud,
  subscribeToUsersFromCloud,
  TreasuryTransfer,
  JournalEntry,
  seedFirestore
} from './lib/firebase';
import { Cloud, RefreshCw, CheckCircle, Database } from 'lucide-react';
import { compressBase64Image } from './utils/imageCompressor';

export default function App() {
  // --- CLOUD STATE ---
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // --- ONLINE & OFFLINE QUEUE STATE ---
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  const [pendingSync, setPendingSync] = useState<{
    readings: MeterReading[];
    payments: Payment[];
    auditLogs: AuditLog[];
  }>(() => {
    const saved = localStorage.getItem('voltera_pending_sync');
    return saved ? JSON.parse(saved) : { readings: [], payments: [], auditLogs: [] };
  });

  // Keep localStorage in sync for pending operations
  useEffect(() => {
    localStorage.setItem('voltera_pending_sync', JSON.stringify(pendingSync));
  }, [pendingSync]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log("Device is online. Triggering pending sync...");
    };
    const handleOffline = () => {
      setIsOnline(false);
      console.log("Device offline.");
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- STATE MANAGERS ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('voltera_logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [subscribers, setSubscribers] = useState<Subscriber[]>(INITIAL_SUBSCRIBERS);
  const [readings, setReadings] = useState<MeterReading[]>(INITIAL_READINGS);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // Apply Font Family from settings dynamically across the entire app
  useEffect(() => {
    if (settings.fontFamily) {
      document.body.style.fontFamily = `"${settings.fontFamily}", Cairo, ui-sans-serif, system-ui, sans-serif`;
    }
  }, [settings.fontFamily]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>(INITIAL_INVENTORY_TRANSACTIONS);
  const [treasuryTransfers, setTreasuryTransfers] = useState<TreasuryTransfer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [manualJournalEntries, setManualJournalEntries] = useState<JournalEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeTxs, setEmployeeTxs] = useState<EmployeeTransaction[]>([]);
  const [connections, setConnections] = useState<ServiceConnection[]>([]);
  const [techRequests, setTechRequests] = useState<TechnicalRequest[]>([]);

  // --- LOAD FROM FIRESTORE OR LOCAL CACHE ON MOUNT ---
  useEffect(() => {
    async function initDb() {
      try {
        setCloudLoading(true);
        const data = await loadAllCloudData();
        
        // Merge offline pending queues so they aren't lost on reload
        const savedQueue = localStorage.getItem('voltera_pending_sync');
        const queue = savedQueue ? JSON.parse(savedQueue) : { readings: [], payments: [], auditLogs: [] };

        // 1. Merge readings: prepend any pending readings that aren't in the cloud list yet
        const cloudReadings = data.readings;
        const mergedReadings = [
          ...queue.readings.filter((pr: any) => !cloudReadings.some((cr: any) => cr.id === pr.id)),
          ...cloudReadings
        ];

        // 2. Merge payments
        const cloudPayments = data.payments;
        const mergedPayments = [
          ...queue.payments.filter((pp: any) => !cloudPayments.some((cp: any) => cp.id === pp.id)),
          ...cloudPayments
        ];

        // 3. Merge audit logs
        const cloudLogs = data.auditLogs;
        const mergedLogs = [
          ...queue.auditLogs.filter((pl: any) => !cloudLogs.some((cl: any) => cl.id === pl.id)),
          ...cloudLogs
        ];

        // 4. Update local states of subscribers with pending items to make sure local calculations are accurate!
        let updatedSubscribers = [...data.subscribers];
        for (const pendingRd of queue.readings) {
          updatedSubscribers = updatedSubscribers.map(sub => {
            if (sub.id === pendingRd.subscriberId) {
              return {
                ...sub,
                currentReading: pendingRd.currentReading,
                currentBalance: sub.currentBalance + pendingRd.totalAmount
              };
            }
            return sub;
          });
        }
        for (const pendingPay of queue.payments) {
          updatedSubscribers = updatedSubscribers.map(sub => {
            if (sub.id === pendingPay.subscriberId) {
              return {
                ...sub,
                currentBalance: sub.currentBalance - pendingPay.amountPaid
              };
            }
            return sub;
          });
        }

        setUsers(data.users);
        setSubscribers(updatedSubscribers);
        setReadings(mergedReadings);
        setPayments(mergedPayments);
        setSettings(data.settings);
        setAuditLogs(mergedLogs);

        // Populate new collections or fallback to localStorage
        const localTrfs = localStorage.getItem('voltera_treasuryTransfers');
        const localExp = localStorage.getItem('voltera_expenses');
        const localPur = localStorage.getItem('voltera_purchases');
        const localJe = localStorage.getItem('voltera_manualJournalEntries');
        const localEmp = localStorage.getItem('voltera_employees');
        const localEtx = localStorage.getItem('voltera_employeeTxs');
        const localConn = localStorage.getItem('voltera_connections');
        const localTrq = localStorage.getItem('voltera_tech_requests');

        const trfs = (data.treasuryTransfers && data.treasuryTransfers.length > 0) ? data.treasuryTransfers : (localTrfs ? JSON.parse(localTrfs) : []);
        const exps = (data.expenses && data.expenses.length > 0) ? data.expenses : (localExp ? JSON.parse(localExp) : []);
        const purs = (data.purchases && data.purchases.length > 0) ? data.purchases : (localPur ? JSON.parse(localPur) : []);
        const jes = (data.manualJournalEntries && data.manualJournalEntries.length > 0) ? data.manualJournalEntries : (localJe ? JSON.parse(localJe) : []);
        const emps = (data.employees && data.employees.length > 0) ? data.employees : (localEmp ? JSON.parse(localEmp) : []);
        const etxs = (data.employeeTxs && data.employeeTxs.length > 0) ? data.employeeTxs : (localEtx ? JSON.parse(localEtx) : []);
        const conns = (data.connections && data.connections.length > 0) ? data.connections : (localConn ? JSON.parse(localConn) : []);
        const trqs = (data.techRequests && data.techRequests.length > 0) ? data.techRequests : (localTrq ? JSON.parse(localTrq) : []);
        const invs = (data.inventory && data.inventory.length > 0) ? data.inventory : INITIAL_INVENTORY;
        const invTxs = (data.inventoryTransactions && data.inventoryTransactions.length > 0) ? data.inventoryTransactions : INITIAL_INVENTORY_TRANSACTIONS;

        setTreasuryTransfers(trfs);
        setExpenses(exps);
        setPurchases(purs);
        setManualJournalEntries(jes);
        setEmployees(emps);
        setEmployeeTxs(etxs);
        setConnections(conns);
        setTechRequests(trqs);
        setInventory(invs);
        setInventoryTransactions(invTxs);

        // Seed initial items if cloud had zero items but local/default had items
        if (data.treasuryTransfers.length === 0 && trfs.length > 0) {
          trfs.forEach((t: TreasuryTransfer) => syncTreasuryTransferToCloud(t));
        }
        if (data.expenses.length === 0 && exps.length > 0) {
          exps.forEach((e: Expense) => syncExpenseToCloud(e));
        }
        if (data.purchases.length === 0 && purs.length > 0) {
          purs.forEach((p: Purchase) => syncPurchaseToCloud(p));
        }
        if (data.manualJournalEntries.length === 0 && jes.length > 0) {
          jes.forEach((j: JournalEntry) => syncJournalEntryToCloud(j));
        }
        if (data.employees.length === 0 && emps.length > 0) {
          emps.forEach((emp: Employee) => syncEmployeeToCloud(emp));
        }
        if (data.employeeTxs.length === 0 && etxs.length > 0) {
          etxs.forEach((etx: EmployeeTransaction) => syncEmployeeTxToCloud(etx));
        }
        if (data.connections.length === 0 && conns.length > 0) {
          conns.forEach((c: ServiceConnection) => syncConnectionToCloud(c));
        }
        if (data.techRequests.length === 0 && trqs.length > 0) {
          trqs.forEach((trq: TechnicalRequest) => syncTechRequestToCloud(trq));
        }
        if (data.inventory.length === 0 && invs.length > 0) {
          invs.forEach((inv: InventoryItem) => syncInventoryItemToCloud(inv));
        }

        setCloudError(null);

        // Self-heal oversized logoUrl if present to fix Firestore 1MB document limit
        if (data.settings?.logoUrl && data.settings.logoUrl.startsWith('data:image') && data.settings.logoUrl.length > 150000) {
          compressBase64Image(data.settings.logoUrl, 250, 250, 0.85).then((compressed) => {
            const sanitizedSettings = { ...data.settings, logoUrl: compressed };
            setSettings(sanitizedSettings);
            localStorage.setItem('voltera_cache_settings', JSON.stringify(sanitizedSettings));
            syncSettingsToCloud(sanitizedSettings);
          });
        }

        // Cache in localStorage for offline use
        localStorage.setItem('voltera_cache_users', JSON.stringify(data.users));
        localStorage.setItem('voltera_cache_subscribers', JSON.stringify(updatedSubscribers));
        localStorage.setItem('voltera_cache_readings', JSON.stringify(mergedReadings));
        localStorage.setItem('voltera_cache_payments', JSON.stringify(mergedPayments));
        localStorage.setItem('voltera_cache_settings', JSON.stringify(data.settings));
        localStorage.setItem('voltera_cache_auditLogs', JSON.stringify(mergedLogs));
      } catch (e: any) {
        console.warn("Could not load from Firestore (expected in offline/poor network), falling back to local storage.", e);
        setCloudError('تم تشغيل التطبيق في وضع عدم الاتصال (Offline Mode) بشكل آمن وسلس من الذاكرة المحلية لجهازك.');
        
        // Fallback to cached data
        const cachedUsers = localStorage.getItem('voltera_cache_users');
        const cachedSubscribers = localStorage.getItem('voltera_cache_subscribers');
        const cachedReadings = localStorage.getItem('voltera_cache_readings');
        const cachedPayments = localStorage.getItem('voltera_cache_payments');
        const cachedSettings = localStorage.getItem('voltera_cache_settings');
        const cachedAuditLogs = localStorage.getItem('voltera_cache_auditLogs');

        if (cachedUsers) setUsers(JSON.parse(cachedUsers));
        if (cachedSubscribers) setSubscribers(JSON.parse(cachedSubscribers));
        if (cachedReadings) setReadings(JSON.parse(cachedReadings));
        if (cachedPayments) setPayments(JSON.parse(cachedPayments));
        if (cachedSettings) {
          const parsedSet = JSON.parse(cachedSettings);
          setSettings(parsedSet);
          if (parsedSet?.logoUrl && parsedSet.logoUrl.startsWith('data:image') && parsedSet.logoUrl.length > 150000) {
            compressBase64Image(parsedSet.logoUrl, 250, 250, 0.85).then((compressed) => {
              const sanitizedSettings = { ...parsedSet, logoUrl: compressed };
              setSettings(sanitizedSettings);
              localStorage.setItem('voltera_cache_settings', JSON.stringify(sanitizedSettings));
              syncSettingsToCloud(sanitizedSettings);
            });
          }
        }
        if (cachedAuditLogs) setAuditLogs(JSON.parse(cachedAuditLogs));
      } finally {
        setCloudLoading(false);
      }
    }
    initDb();
  }, []);

  // --- LIVE FIRESTORE SUBSCRIBERS LISTENER FOR REAL-TIME MAP & BALANCE UPDATES ---
  useEffect(() => {
    const unsub = subscribeToSubscribersFromCloud((cloudSubs) => {
      setSubscribers(prev => {
        const savedQueue = localStorage.getItem('voltera_pending_sync');
        const queue = savedQueue ? JSON.parse(savedQueue) : { readings: [], payments: [] };
        
        if ((!queue.readings || queue.readings.length === 0) && (!queue.payments || queue.payments.length === 0)) {
          return cloudSubs;
        }

        let updated = [...cloudSubs];
        for (const pendingRd of (queue.readings || [])) {
          updated = updated.map(sub => {
            if (sub.id === pendingRd.subscriberId) {
              return {
                ...sub,
                currentReading: Math.max(sub.currentReading, pendingRd.currentReading),
                currentBalance: sub.currentBalance + pendingRd.totalAmount
              };
            }
            return sub;
          });
        }
        for (const pendingPay of (queue.payments || [])) {
          updated = updated.map(sub => {
            if (sub.id === pendingPay.subscriberId) {
              return {
                ...sub,
                currentBalance: sub.currentBalance - pendingPay.amountPaid
              };
            }
            return sub;
          });
        }
        return updated;
      });
    });

    const unsubTech = subscribeToTechRequestsFromCloud((cloudTrqs) => {
      setTechRequests(cloudTrqs);
    });

    const unsubUsers = subscribeToUsersFromCloud((cloudUsers) => {
      if (cloudUsers && cloudUsers.length > 0) {
        setUsers(cloudUsers);
        localStorage.setItem('voltera_cache_users', JSON.stringify(cloudUsers));
      }
    });

    return () => {
      if (unsub) unsub();
      if (unsubTech) unsubTech();
      if (unsubUsers) unsubUsers();
    };
  }, []);

  // --- PERSIST LOGGED USER ---
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('voltera_logged_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('voltera_logged_user');
    }
  }, [currentUser]);

  // --- SYNCED UPDATERS ---
  const handleUpdateSubscribers = async (newSubs: Subscriber[]) => {
    // Optimistic UI update
    setSubscribers(newSubs);

    try {
      // Find modified or added subscribers
      const changed = newSubs.filter(newS => {
        const currentS = subscribers.find(s => s.id === newS.id);
        return !currentS || JSON.stringify(currentS) !== JSON.stringify(newS);
      });

      for (const sub of changed) {
        await syncSubscriberToCloud(sub);
      }

      // Check if any subscriber was deleted
      const deleted = subscribers.filter(s => !newSubs.some(newS => newS.id === s.id));
      for (const sub of deleted) {
        await deleteSubscriberFromCloud(sub.id);
      }
    } catch (err) {
      console.error("Error syncing subscribers to Firestore:", err);
    }
  };

  const handleUpdateUsers = async (newUsers: User[]) => {
    setUsers(newUsers);
    localStorage.setItem('voltera_cache_users', JSON.stringify(newUsers));

    // Update current user if self was edited
    if (currentUser) {
      const updatedSelf = newUsers.find(u => u.id === currentUser.id);
      if (updatedSelf) {
        setCurrentUser(updatedSelf);
        localStorage.setItem('voltera_logged_user', JSON.stringify(updatedSelf));
      }
    }

    try {
      const changed = newUsers.filter(newU => {
        const currentU = users.find(u => u.id === newU.id);
        return !currentU || JSON.stringify(currentU) !== JSON.stringify(newU);
      });

      for (const user of changed) {
        await syncUserToCloud(user);
      }

      const deleted = users.filter(u => !newUsers.some(newU => newU.id === u.id));
      for (const u of deleted) {
        await deleteUserFromCloud(u.id);
      }
    } catch (err) {
      console.error("Error syncing users to Firestore:", err);
    }
  };

  const handleUpdateReadings = async (newReadings: MeterReading[]) => {
    setReadings(newReadings);

    try {
      const changed = newReadings.filter(newR => {
        const currentR = readings.find(r => r.id === newR.id);
        return !currentR || JSON.stringify(currentR) !== JSON.stringify(newR);
      });

      if (changed.length > 5) {
        await syncBulkReadingsToCloud(changed);
      } else {
        for (const rd of changed) {
          await syncReadingToCloud(rd);
        }
      }
    } catch (err) {
      console.error("Error syncing readings to Firestore:", err);
    }
  };

  const handleUpdatePayments = async (newPayments: Payment[]) => {
    setPayments(newPayments);

    try {
      const changed = newPayments.filter(newP => {
        const currentP = payments.find(p => p.id === newP.id);
        return !currentP || JSON.stringify(currentP) !== JSON.stringify(newP);
      });

      if (changed.length > 5) {
        await syncBulkPaymentsToCloud(changed);
      } else {
        for (const pay of changed) {
          await syncPaymentToCloud(pay);
        }
      }
    } catch (err) {
      console.error("Error syncing payments to Firestore:", err);
    }
  };

  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    let settingsToSave = { ...newSettings };
    if (settingsToSave.logoUrl && settingsToSave.logoUrl.startsWith('data:image') && settingsToSave.logoUrl.length > 150000) {
      settingsToSave.logoUrl = await compressBase64Image(settingsToSave.logoUrl, 250, 250, 0.85);
    }
    setSettings(settingsToSave);
    localStorage.setItem('voltera_cache_settings', JSON.stringify(settingsToSave));
    try {
      await syncSettingsToCloud(settingsToSave);
    } catch (err) {
      console.error("Error syncing settings to Firestore:", err);
    }
  };

  const handleUpdateTreasuryTransfers = async (newTrfs: TreasuryTransfer[]) => {
    setTreasuryTransfers(newTrfs);
    localStorage.setItem('voltera_treasuryTransfers', JSON.stringify(newTrfs));
    try {
      const changed = newTrfs.filter(nT => !treasuryTransfers.some(oT => oT.id === nT.id && JSON.stringify(oT) === JSON.stringify(nT)));
      for (const t of changed) { await syncTreasuryTransferToCloud(t); }
      const deleted = treasuryTransfers.filter(oT => !newTrfs.some(nT => nT.id === oT.id));
      for (const d of deleted) { await deleteTreasuryTransferFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing treasury transfers to Firestore:", e);
    }
  };

  const handleUpdateExpenses = async (newExps: Expense[]) => {
    setExpenses(newExps);
    localStorage.setItem('voltera_expenses', JSON.stringify(newExps));
    try {
      const changed = newExps.filter(nE => !expenses.some(oE => oE.id === nE.id && JSON.stringify(oE) === JSON.stringify(nE)));
      for (const e of changed) { await syncExpenseToCloud(e); }
      const deleted = expenses.filter(oE => !newExps.some(nE => nE.id === oE.id));
      for (const d of deleted) { await deleteExpenseFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing expenses to Firestore:", e);
    }
  };

  const handleUpdatePurchases = async (newPurs: Purchase[]) => {
    setPurchases(newPurs);
    localStorage.setItem('voltera_purchases', JSON.stringify(newPurs));
    try {
      const changed = newPurs.filter(nP => !purchases.some(oP => oP.id === nP.id && JSON.stringify(oP) === JSON.stringify(nP)));
      for (const p of changed) { await syncPurchaseToCloud(p); }
      const deleted = purchases.filter(oP => !newPurs.some(nP => nP.id === oP.id));
      for (const d of deleted) { await deletePurchaseFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing purchases to Firestore:", e);
    }
  };

  const handleUpdateJournalEntries = async (newJes: JournalEntry[]) => {
    setManualJournalEntries(newJes);
    localStorage.setItem('voltera_manualJournalEntries', JSON.stringify(newJes));
    try {
      const changed = newJes.filter(nJ => !manualJournalEntries.some(oJ => oJ.id === nJ.id && JSON.stringify(oJ) === JSON.stringify(nJ)));
      for (const j of changed) { await syncJournalEntryToCloud(j); }
      const deleted = manualJournalEntries.filter(oJ => !newJes.some(nJ => nJ.id === oJ.id));
      for (const d of deleted) { await deleteJournalEntryFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing journal entries to Firestore:", e);
    }
  };

  const handleUpdateEmployees = async (newEmps: Employee[]) => {
    setEmployees(newEmps);
    localStorage.setItem('voltera_employees', JSON.stringify(newEmps));
    try {
      const changed = newEmps.filter(nE => !employees.some(oE => oE.id === nE.id && JSON.stringify(oE) === JSON.stringify(nE)));
      for (const emp of changed) { await syncEmployeeToCloud(emp); }
      const deleted = employees.filter(oE => !newEmps.some(nE => nE.id === oE.id));
      for (const d of deleted) { await deleteEmployeeFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing employees to Firestore:", e);
    }
  };

  const handleUpdateEmployeeTxs = async (newTxs: EmployeeTransaction[]) => {
    setEmployeeTxs(newTxs);
    localStorage.setItem('voltera_employeeTxs', JSON.stringify(newTxs));
    try {
      const changed = newTxs.filter(nT => !employeeTxs.some(oT => oT.id === nT.id && JSON.stringify(oT) === JSON.stringify(nT)));
      for (const tx of changed) { await syncEmployeeTxToCloud(tx); }
      const deleted = employeeTxs.filter(oT => !newTxs.some(nT => nT.id === oT.id));
      for (const d of deleted) { await deleteEmployeeTxFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing employee transactions to Firestore:", e);
    }
  };

  const handleUpdateConnections = async (newConns: ServiceConnection[]) => {
    setConnections(newConns);
    localStorage.setItem('voltera_connections', JSON.stringify(newConns));
    try {
      const changed = newConns.filter(nC => !connections.some(oC => oC.id === nC.id && JSON.stringify(oC) === JSON.stringify(nC)));
      for (const c of changed) { await syncConnectionToCloud(c); }
      const deleted = connections.filter(oC => !newConns.some(nC => nC.id === oC.id));
      for (const d of deleted) { await deleteConnectionFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing connections to Firestore:", e);
    }
  };

  const handleUpdateTechRequests = async (newTrqs: TechnicalRequest[]) => {
    setTechRequests(newTrqs);
    localStorage.setItem('voltera_tech_requests', JSON.stringify(newTrqs));
    try {
      const changed = newTrqs.filter(nT => !techRequests.some(oT => oT.id === nT.id && JSON.stringify(oT) === JSON.stringify(nT)));
      for (const trq of changed) { await syncTechRequestToCloud(trq); }
      const deleted = techRequests.filter(oT => !newTrqs.some(nT => nT.id === oT.id));
      for (const d of deleted) { await deleteTechRequestFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing tech requests to Firestore:", e);
    }
  };

  const syncPendingData = async () => {
    if (!navigator.onLine || isSyncing) return;
    
    const saved = localStorage.getItem('voltera_pending_sync');
    const queue = saved ? JSON.parse(saved) : pendingSync;
    
    if (queue.readings.length === 0 && queue.payments.length === 0 && queue.auditLogs.length === 0) {
      return;
    }

    setIsSyncing(true);
    setSyncMessage('جاري مزامنة البيانات المعلقة مع السحابة...');
    
    try {
      // 1. Sync readings
      const remainingReadings = [...queue.readings];
      for (const rd of queue.readings) {
        try {
          await syncReadingToCloud(rd);
          const idx = remainingReadings.findIndex(r => r.id === rd.id);
          if (idx > -1) remainingReadings.splice(idx, 1);
        } catch (e) {
          console.error("Error syncing reading", rd.id, e);
          break; // Stop if network error occurs
        }
      }

      // 2. Sync payments
      const remainingPayments = [...queue.payments];
      for (const pay of queue.payments) {
        try {
          await syncPaymentToCloud(pay);
          const idx = remainingPayments.findIndex(p => p.id === pay.id);
          if (idx > -1) remainingPayments.splice(idx, 1);
        } catch (e) {
          console.error("Error syncing payment", pay.id, e);
          break;
        }
      }

      // 3. Sync audit logs
      const remainingLogs = [...queue.auditLogs];
      for (const log of queue.auditLogs) {
        try {
          await syncAuditLogToCloud(log);
          const idx = remainingLogs.findIndex(l => l.id === log.id);
          if (idx > -1) remainingLogs.splice(idx, 1);
        } catch (e) {
          console.error("Error syncing audit log", log.id, e);
          break;
        }
      }

      // Update pending sync state
      const updatedQueue = {
        readings: remainingReadings,
        payments: remainingPayments,
        auditLogs: remainingLogs
      };
      setPendingSync(updatedQueue);
      
      if (updatedQueue.readings.length === 0 && updatedQueue.payments.length === 0 && updatedQueue.auditLogs.length === 0) {
        setSyncMessage('تمت مزامنة جميع البيانات بنجاح!');
        setTimeout(() => setSyncMessage(null), 3000);
      } else {
        setSyncMessage('تمت مزامنة بعض البيانات، وبقيت بعض العمليات معلقة.');
      }
    } catch (err) {
      console.error("Failed to complete sync:", err);
      setSyncMessage('فشلت المزامنة التلقائية. سيتم المحاولة لاحقاً.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Automatically sync when online status is restored
  useEffect(() => {
    if (isOnline) {
      syncPendingData();
    }
  }, [isOnline]);

  const handleAddReading = async (newReading: MeterReading) => {
    // 1. Update readings local state
    setReadings(prev => [newReading, ...prev]);

    // 2. Update subscriber state locally (reading & balance)
    setSubscribers(prevSubs => prevSubs.map(sub => {
      if (sub.id === newReading.subscriberId) {
        return {
          ...sub,
          currentReading: newReading.currentReading,
          currentBalance: sub.currentBalance + newReading.totalAmount
        };
      }
      return sub;
    }));

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || 'sys',
      username: currentUser?.username || 'collector',
      action: 'إدخل قراءة عداد',
      details: `إدخال قراءة للعداد ${newReading.meterNumber} للمشترك ${newReading.subscriberName}. القراءة: ${newReading.currentReading}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Cache updated lists locally
    setTimeout(() => {
      localStorage.setItem('voltera_cache_readings', JSON.stringify([newReading, ...readings]));
      localStorage.setItem('voltera_cache_auditLogs', JSON.stringify([newLog, ...auditLogs]));
      localStorage.setItem('voltera_cache_subscribers', JSON.stringify(
        subscribers.map(sub => {
          if (sub.id === newReading.subscriberId) {
            return {
              ...sub,
              currentReading: newReading.currentReading,
              currentBalance: sub.currentBalance + newReading.totalAmount
            };
          }
          return sub;
        })
      ));
    }, 100);

    // 3. Try to sync or queue
    if (navigator.onLine) {
      try {
        await syncReadingToCloud(newReading);
        await syncAuditLogToCloud(newLog);

        const updatedSub = subscribers.find(s => s.id === newReading.subscriberId);
        if (updatedSub) {
          await syncSubscriberToCloud({
            ...updatedSub,
            currentReading: newReading.currentReading,
            currentBalance: updatedSub.currentBalance + newReading.totalAmount
          });
        }
      } catch (err) {
        console.error("Failed online sync, queueing instead:", err);
        setPendingSync(prev => ({
          ...prev,
          readings: [...prev.readings, newReading],
          auditLogs: [...prev.auditLogs, newLog]
        }));
      }
    } else {
      setPendingSync(prev => ({
        ...prev,
        readings: [...prev.readings, newReading],
        auditLogs: [...prev.auditLogs, newLog]
      }));
    }
  };

  const handleAddPayment = async (newPayment: Payment) => {
    // 1. Update payments local state
    setPayments(prev => [newPayment, ...prev]);

    // 2. Update subscriber balance locally
    setSubscribers(prevSubs => prevSubs.map(sub => {
      if (sub.id === newPayment.subscriberId) {
        return {
          ...sub,
          currentBalance: sub.currentBalance - newPayment.amountPaid
        };
      }
      return sub;
    }));

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || 'sys',
      username: currentUser?.username || 'collector',
      action: 'تحصيل مبلغ مالي',
      details: `تحصيل مبلغ ${newPayment.amountPaid} ${settings.currency} من المشترك ${newPayment.subscriberName} سند رقم ${newPayment.receiptNumber}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Cache updated lists locally
    setTimeout(() => {
      localStorage.setItem('voltera_cache_payments', JSON.stringify([newPayment, ...payments]));
      localStorage.setItem('voltera_cache_auditLogs', JSON.stringify([newLog, ...auditLogs]));
      localStorage.setItem('voltera_cache_subscribers', JSON.stringify(
        subscribers.map(sub => {
          if (sub.id === newPayment.subscriberId) {
            return {
              ...sub,
              currentBalance: sub.currentBalance - newPayment.amountPaid
            };
          }
          return sub;
        })
      ));
    }, 100);

    // 3. Try to sync or queue
    if (navigator.onLine) {
      try {
        await syncPaymentToCloud(newPayment);
        await syncAuditLogToCloud(newLog);

        const updatedSub = subscribers.find(s => s.id === newPayment.subscriberId);
        if (updatedSub) {
          await syncSubscriberToCloud({
            ...updatedSub,
            currentBalance: updatedSub.currentBalance - newPayment.amountPaid
          });
        }
      } catch (err) {
        console.error("Failed online payment sync, queueing instead:", err);
        setPendingSync(prev => ({
          ...prev,
          payments: [...prev.payments, newPayment],
          auditLogs: [...prev.auditLogs, newLog]
        }));
      }
    } else {
      setPendingSync(prev => ({
        ...prev,
        payments: [...prev.payments, newPayment],
        auditLogs: [...prev.auditLogs, newLog]
      }));
    }
  };

  const handleDeleteReading = async (readingId: string) => {
    const readingToDelete = readings.find(r => r.id === readingId);
    if (!readingToDelete) return;

    // 1. Update readings local state
    setReadings(prev => prev.filter(r => r.id !== readingId));

    // 2. Update subscriber state locally
    setSubscribers(prevSubs => prevSubs.map(sub => {
      if (sub.id === readingToDelete.subscriberId) {
        return {
          ...sub,
          currentReading: readingToDelete.previousReading,
          currentBalance: sub.currentBalance - readingToDelete.totalAmount
        };
      }
      return sub;
    }));

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || 'sys',
      username: currentUser?.username || 'collector',
      action: 'حذف قراءة عداد',
      details: `حذف قراءة العداد ${readingToDelete.meterNumber} للمشترك ${readingToDelete.subscriberName}. القراءة المحذوفة: ${readingToDelete.currentReading}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Update local storage
    setTimeout(() => {
      localStorage.setItem('voltera_cache_readings', JSON.stringify(readings.filter(r => r.id !== readingId)));
      localStorage.setItem('voltera_cache_auditLogs', JSON.stringify([newLog, ...auditLogs]));
      localStorage.setItem('voltera_cache_subscribers', JSON.stringify(
        subscribers.map(sub => {
          if (sub.id === readingToDelete.subscriberId) {
            return {
              ...sub,
              currentReading: readingToDelete.previousReading,
              currentBalance: sub.currentBalance - readingToDelete.totalAmount
            };
          }
          return sub;
        })
      ));
    }, 100);

    // Remove from pending sync if it was there
    const wasPending = pendingSync.readings.some(r => r.id === readingId);
    if (wasPending) {
      setPendingSync(prev => ({
        ...prev,
        readings: prev.readings.filter(r => r.id !== readingId)
      }));
    }

    // Try cloud sync deletion
    if (navigator.onLine) {
      try {
        await deleteReadingFromCloud(readingId);
        await syncAuditLogToCloud(newLog);

        const updatedSub = subscribers.find(s => s.id === readingToDelete.subscriberId);
        if (updatedSub) {
          await syncSubscriberToCloud({
            ...updatedSub,
            currentReading: readingToDelete.previousReading,
            currentBalance: updatedSub.currentBalance - readingToDelete.totalAmount
          });
        }
      } catch (err) {
        console.error("Failed online delete sync:", err);
      }
    }
  };

  const handleEditReading = async (updatedReading: MeterReading) => {
    const originalReading = readings.find(r => r.id === updatedReading.id);
    if (!originalReading) return;

    const amountDifference = updatedReading.totalAmount - originalReading.totalAmount;

    // 1. Update readings local state
    setReadings(prev => prev.map(r => r.id === updatedReading.id ? updatedReading : r));

    // 2. Update subscriber state locally
    setSubscribers(prevSubs => prevSubs.map(sub => {
      if (sub.id === updatedReading.subscriberId) {
        return {
          ...sub,
          currentReading: updatedReading.currentReading,
          currentBalance: sub.currentBalance + amountDifference
        };
      }
      return sub;
    }));

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || 'sys',
      username: currentUser?.username || 'collector',
      action: 'تعديل قراءة عداد',
      details: `تعديل قراءة العداد ${updatedReading.meterNumber} للمشترك ${updatedReading.subscriberName}. من ${originalReading.currentReading} إلى ${updatedReading.currentReading}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Update local storage
    setTimeout(() => {
      localStorage.setItem('voltera_cache_readings', JSON.stringify(readings.map(r => r.id === updatedReading.id ? updatedReading : r)));
      localStorage.setItem('voltera_cache_auditLogs', JSON.stringify([newLog, ...auditLogs]));
      localStorage.setItem('voltera_cache_subscribers', JSON.stringify(
        subscribers.map(sub => {
          if (sub.id === updatedReading.subscriberId) {
            return {
              ...sub,
              currentReading: updatedReading.currentReading,
              currentBalance: sub.currentBalance + amountDifference
            };
          }
          return sub;
        })
      ));
    }, 100);

    // Update pending sync if it was there, or add to pending sync if offline
    const wasPending = pendingSync.readings.some(r => r.id === updatedReading.id);
    if (wasPending) {
      setPendingSync(prev => ({
        ...prev,
        readings: prev.readings.map(r => r.id === updatedReading.id ? updatedReading : r)
      }));
    }

    if (navigator.onLine) {
      try {
        await syncReadingToCloud(updatedReading);
        await syncAuditLogToCloud(newLog);

        const updatedSub = subscribers.find(s => s.id === updatedReading.subscriberId);
        if (updatedSub) {
          await syncSubscriberToCloud({
            ...updatedSub,
            currentReading: updatedReading.currentReading,
            currentBalance: updatedSub.currentBalance + amountDifference
          });
        }
      } catch (err) {
        console.error("Failed online edit sync, queueing instead:", err);
        if (!wasPending) {
          setPendingSync(prev => ({
            ...prev,
            readings: [...prev.readings, updatedReading]
          }));
        }
      }
    } else {
      if (!wasPending) {
        setPendingSync(prev => ({
          ...prev,
          readings: [...prev.readings, updatedReading]
        }));
      }
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const paymentToDelete = payments.find(p => p.id === paymentId);
    if (!paymentToDelete) return;

    // 1. Update payments local state
    setPayments(prev => prev.filter(p => p.id !== paymentId));

    // 2. Update subscriber balance locally
    setSubscribers(prevSubs => prevSubs.map(sub => {
      if (sub.id === paymentToDelete.subscriberId) {
        return {
          ...sub,
          currentBalance: sub.currentBalance + paymentToDelete.amountPaid
        };
      }
      return sub;
    }));

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || 'sys',
      username: currentUser?.username || 'collector',
      action: 'حذف سند قبض',
      details: `حذف سند القبض رقم ${paymentToDelete.receiptNumber} للمشترك ${paymentToDelete.subscriberName}. المبلغ المحذوف: ${paymentToDelete.amountPaid}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Update local storage
    setTimeout(() => {
      localStorage.setItem('voltera_cache_payments', JSON.stringify(payments.filter(p => p.id !== paymentId)));
      localStorage.setItem('voltera_cache_auditLogs', JSON.stringify([newLog, ...auditLogs]));
      localStorage.setItem('voltera_cache_subscribers', JSON.stringify(
        subscribers.map(sub => {
          if (sub.id === paymentToDelete.subscriberId) {
            return {
              ...sub,
              currentBalance: sub.currentBalance + paymentToDelete.amountPaid
            };
          }
          return sub;
        })
      ));
    }, 100);

    // Remove from pending sync if it was there
    const wasPending = pendingSync.payments.some(p => p.id === paymentId);
    if (wasPending) {
      setPendingSync(prev => ({
        ...prev,
        payments: prev.payments.filter(p => p.id !== paymentId)
      }));
    }

    // Try cloud sync deletion
    if (navigator.onLine) {
      try {
        await deletePaymentFromCloud(paymentId);
        await syncAuditLogToCloud(newLog);

        const updatedSub = subscribers.find(s => s.id === paymentToDelete.subscriberId);
        if (updatedSub) {
          await syncSubscriberToCloud({
            ...updatedSub,
            currentBalance: updatedSub.currentBalance + paymentToDelete.amountPaid
          });
        }
      } catch (err) {
        console.error("Failed online delete sync:", err);
      }
    }
  };

  const handleEditPayment = async (updatedPayment: Payment) => {
    const originalPayment = payments.find(p => p.id === updatedPayment.id);
    if (!originalPayment) return;

    const amountDifference = originalPayment.amountPaid - updatedPayment.amountPaid;

    // 1. Update payments local state
    setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));

    // 2. Update subscriber balance locally
    setSubscribers(prevSubs => prevSubs.map(sub => {
      if (sub.id === updatedPayment.subscriberId) {
        return {
          ...sub,
          currentBalance: sub.currentBalance + amountDifference
        };
      }
      return sub;
    }));

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || 'sys',
      username: currentUser?.username || 'collector',
      action: 'تعديل سند قبض',
      details: `تعديل سند القبض رقم ${updatedPayment.receiptNumber} للمشترك ${updatedPayment.subscriberName}. من ${originalPayment.amountPaid} إلى ${updatedPayment.amountPaid}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Update local storage
    setTimeout(() => {
      localStorage.setItem('voltera_cache_payments', JSON.stringify(payments.map(p => p.id === updatedPayment.id ? updatedPayment : p)));
      localStorage.setItem('voltera_cache_auditLogs', JSON.stringify([newLog, ...auditLogs]));
      localStorage.setItem('voltera_cache_subscribers', JSON.stringify(
        subscribers.map(sub => {
          if (sub.id === updatedPayment.subscriberId) {
            return {
              ...sub,
              currentBalance: sub.currentBalance + amountDifference
            };
          }
          return sub;
        })
      ));
    }, 100);

    // Update pending sync if it was there, or add to pending sync if offline
    const wasPending = pendingSync.payments.some(p => p.id === updatedPayment.id);
    if (wasPending) {
      setPendingSync(prev => ({
        ...prev,
        payments: prev.payments.map(p => p.id === updatedPayment.id ? updatedPayment : p)
      }));
    }

    if (navigator.onLine) {
      try {
        await syncPaymentToCloud(updatedPayment);
        await syncAuditLogToCloud(newLog);

        const updatedSub = subscribers.find(s => s.id === updatedPayment.subscriberId);
        if (updatedSub) {
          await syncSubscriberToCloud({
            ...updatedSub,
            currentBalance: updatedSub.currentBalance + amountDifference
          });
        }
      } catch (err) {
        console.error("Failed online edit sync, queueing instead:", err);
        if (!wasPending) {
          setPendingSync(prev => ({
            ...prev,
            payments: [...prev.payments, updatedPayment]
          }));
        }
      }
    } else {
      if (!wasPending) {
        setPendingSync(prev => ({
          ...prev,
          payments: [...prev.payments, updatedPayment]
        }));
      }
    }
  };

  const handleAddAuditLog = async (newLog: AuditLog) => {
    const sanitizedLog: AuditLog = {
      ...newLog,
      userId: newLog.userId || currentUser?.id || 'admin',
      username: newLog.username || currentUser?.name || currentUser?.username || 'admin'
    };
    setAuditLogs(prev => [sanitizedLog, ...prev]);
    try {
      await syncAuditLogToCloud(sanitizedLog);
    } catch (err) {
      console.error("Error syncing audit log:", err);
    }
  };

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: user.id,
      username: user.username,
      action: 'تسجيل دخول ناجح',
      details: `تسجيل دخول إلى النظام بصلاحية ${user.role}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setAuditLogs(prev => [newLog, ...prev]);
    try {
      await syncAuditLogToCloud(newLog);
    } catch (err) {
      console.error("Error syncing login log:", err);
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.username,
        action: 'تسجيل خروج',
        details: 'تسجيل خروج آمن من النظام',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      setAuditLogs(prev => [newLog, ...prev]);
      try {
        await syncAuditLogToCloud(newLog);
      } catch (err) {
        console.error("Error syncing logout log:", err);
      }
    }
    setCurrentUser(null);
  };

  const handleResetDatabase = async () => {
    setCloudLoading(true);
    try {
      await seedFirestore();
      const data = await loadAllCloudData();
      setUsers(data.users);
      setSubscribers(data.subscribers);
      setReadings(data.readings);
      setPayments(data.payments);
      setSettings(data.settings);
      setAuditLogs(data.auditLogs);
      setCurrentUser(null);
      localStorage.removeItem('voltera_logged_user');
    } catch (e) {
      console.error("Error resetting cloud database:", e);
    } finally {
      setCloudLoading(false);
    }
  };

  // --- LOADER VIEW ---
  if (cloudLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-sans text-center px-4">
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl shadow-xl max-w-md w-full flex flex-col items-center gap-6">
          <div className="relative">
            <Database className="w-16 h-16 text-amber-500 animate-pulse" />
            <Cloud className="w-8 h-8 text-cyan-400 absolute -top-2 -right-2 animate-bounce" />
          </div>
          <div>
            <h1 className="text-xl font-black mb-2 tracking-wide">نظام فولترا المحاسبي السحابي</h1>
            <p className="text-sm text-slate-400 font-medium">جاري الاتصال الآمن بسيرفر قاعدة البيانات سحابياً...</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-400 font-mono bg-slate-950 px-4 py-2 rounded-xl">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Firestore Database Connection Active</span>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW ROUTING ---
  if (!currentUser) {
    return <Login users={users} onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'accountant' || currentUser.role === 'data_entry') {
    return (
      <div className="relative min-h-screen">
        {/* Top Cloud Indicator */}
        <div className="bg-emerald-600 text-white text-[10px] sm:text-xs py-1.5 px-4 flex items-center justify-center gap-2 font-bold select-none text-center">
          <Cloud className="w-4 h-4" />
          <span>النظام نشط على السحابة مع قاعدة بيانات Firestore سحابية متكاملة ومؤمنة</span>
          <CheckCircle className="w-3.5 h-3.5 text-emerald-200" />
        </div>
        <AdminDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          subscribers={subscribers}
          readings={readings}
          payments={payments}
          settings={settings}
          inventory={inventory}
          inventoryTransactions={inventoryTransactions}
          onUpdateInventory={setInventory}
          onUpdateInventoryTransactions={setInventoryTransactions}
          treasuryTransfers={treasuryTransfers}
          onUpdateTreasuryTransfers={handleUpdateTreasuryTransfers}
          expenses={expenses}
          onUpdateExpenses={handleUpdateExpenses}
          purchases={purchases}
          onUpdatePurchases={handleUpdatePurchases}
          manualJournalEntries={manualJournalEntries}
          onUpdateManualJournalEntries={handleUpdateJournalEntries}
          employees={employees}
          onUpdateEmployees={handleUpdateEmployees}
          employeeTxs={employeeTxs}
          onUpdateEmployeeTxs={handleUpdateEmployeeTxs}
          connections={connections}
          onUpdateConnections={handleUpdateConnections}
          techRequests={techRequests}
          onUpdateTechRequests={handleUpdateTechRequests}
          auditLogs={auditLogs}
          users={users}
          onUpdateSubscribers={handleUpdateSubscribers}
          onUpdateReadings={handleUpdateReadings}
          onUpdatePayments={handleUpdatePayments}
          onUpdateSettings={handleUpdateSettings}
          onUpdateUsers={handleUpdateUsers}
          onAddAuditLog={handleAddAuditLog}
          onResetDatabase={handleResetDatabase}
        />
      </div>
    );
  }

  // Otherwise, collector dashboard
  return (
    <div className="relative min-h-screen">
      {/* Top Cloud Indicator */}
      <div className={`text-white text-[10px] sm:text-xs py-1.5 px-4 flex items-center justify-center gap-2 font-bold select-none text-center transition-all ${
        isOnline ? 'bg-emerald-600' : 'bg-rose-600 animate-pulse'
      }`}>
        <Cloud className="w-4 h-4" />
        <span>{isOnline ? 'وضع المزامنة السحابية الميدانية المباشرة نشط الآن' : 'أنت تعمل الآن في وضع عدم الاتصال بالشبكة (العمليات تحفظ محلياً)'}</span>
        <CheckCircle className="w-3.5 h-3.5 text-emerald-200" />
      </div>
      <CollectorDashboard
        currentUser={currentUser}
        onLogout={handleLogout}
        subscribers={subscribers}
        readings={readings}
        payments={payments}
        settings={settings}
        onAddReading={handleAddReading}
        onAddPayment={handleAddPayment}
        onDeleteReading={handleDeleteReading}
        onEditReading={handleEditReading}
        onDeletePayment={handleDeletePayment}
        onEditPayment={handleEditPayment}
        onUpdateSettings={handleUpdateSettings}
        onUpdateSubscribers={handleUpdateSubscribers}
        onAddAuditLog={log => setAuditLogs(prev => [log, ...prev])}
        isOnline={isOnline}
        pendingSyncCount={pendingSync.readings.length + pendingSync.payments.length}
        onSync={syncPendingData}
        isSyncing={isSyncing}
        techRequests={techRequests}
        onUpdateTechRequests={handleUpdateTechRequests}
      />
    </div>
  );
}
