import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  onSnapshot,
  writeBatch 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, 
  Expense, Purchase, EmployeeTransaction, ServiceConnection, Employee, TechnicalRequest, InventoryItem, InventoryTransaction 
} from '../types';
import { 
  DEFAULT_SETTINGS, INITIAL_USERS, INITIAL_SUBSCRIBERS, INITIAL_READINGS, INITIAL_PAYMENTS, INITIAL_AUDIT_LOGS, INITIAL_INVENTORY 
} from '../initialData';
import { compressBase64Image } from '../utils/imageCompressor';

export interface JournalEntry {
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

export interface TreasuryTransfer {
  id: string;
  transferNumber: string;
  date: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  notes: string;
  recordedBy: string;
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId if specified and enable long polling
export const db = firebaseConfig.firestoreDatabaseId 
  ? initializeFirestore(app, { experimentalForceLongPolling: true, useFetchStreams: false } as any, firebaseConfig.firestoreDatabaseId)
  : initializeFirestore(app, { experimentalForceLongPolling: true, useFetchStreams: false } as any);

export const auth = getAuth(app);

// Collection Names
const USERS_COLLECTION = 'users';
const SUBSCRIBERS_COLLECTION = 'subscribers';
const READINGS_COLLECTION = 'readings';
const PAYMENTS_COLLECTION = 'payments';
const SETTINGS_COLLECTION = 'settings';
const AUDIT_LOGS_COLLECTION = 'audit_logs';
const TREASURY_TRANSFERS_COLLECTION = 'treasury_transfers';
const EXPENSES_COLLECTION = 'expenses';
const PURCHASES_COLLECTION = 'purchases';
const JOURNAL_ENTRIES_COLLECTION = 'manual_journal_entries';
const EMPLOYEES_COLLECTION = 'employees';
const EMPLOYEE_TXS_COLLECTION = 'employee_txs';
const CONNECTIONS_COLLECTION = 'connections';
const TECH_REQUESTS_COLLECTION = 'tech_requests';
const INVENTORY_COLLECTION = 'inventory';
const INVENTORY_TXS_COLLECTION = 'inventory_transactions';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errorMsg = error instanceof Error ? error.message : String(error);
  
  const isNetworkOrTimeout = 
    errorMsg.includes('timeout') || 
    errorMsg.includes('مهلة') || 
    errorMsg.includes('Could not reach') || 
    errorMsg.includes('unavailable') || 
    errorMsg.includes('offline') ||
    errorMsg.includes('الاتصال') ||
    errorMsg.includes('الإنترنت') ||
    errorMsg.includes('الخادم') ||
    errorMsg.includes('NetworkError') ||
    errorMsg.includes('Failed to get document') ||
    errorMsg.includes('Failed to fetch');

  const errInfo: FirestoreErrorInfo = {
    error: errorMsg,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isNetworkOrTimeout) {
    console.warn('[Firestore Offline/Timeout Handled]:', errorMsg);
    throw new Error("فشل الاتصال بالخادم السحابي - يتم تشغيل وضع عدم الاتصال بالإنترنت حالياً بشكل آمن وسلس.");
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }
}

/**
 * Seeding helper to pre-populate Firestore with template data
 */
export async function seedFirestore() {
  console.log('Seeding Firestore database with template accounting data...');
  try {
    // 1. Seed settings (single document)
    await setDoc(doc(db, SETTINGS_COLLECTION, 'system'), DEFAULT_SETTINGS);

    // 2. Seed Users
    for (const user of INITIAL_USERS) {
      await setDoc(doc(db, USERS_COLLECTION, user.id), user);
    }

    // 3. Seed Subscribers
    for (const sub of INITIAL_SUBSCRIBERS) {
      await setDoc(doc(db, SUBSCRIBERS_COLLECTION, sub.id), sub);
    }

    // 4. Seed Readings
    for (const reading of INITIAL_READINGS) {
      await setDoc(doc(db, READINGS_COLLECTION, reading.id), reading);
    }

    // 5. Seed Payments
    for (const payment of INITIAL_PAYMENTS) {
      await setDoc(doc(db, PAYMENTS_COLLECTION, payment.id), payment);
    }

    // 6. Seed Audit Logs
    for (const log of INITIAL_AUDIT_LOGS) {
      await setDoc(doc(db, AUDIT_LOGS_COLLECTION, log.id), log);
    }

    // 7. Seed Inventory
    for (const inv of INITIAL_INVENTORY) {
      await setDoc(doc(db, INVENTORY_COLLECTION, inv.id), inv);
    }
    
    console.log('Firestore seeding completed successfully!');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed');
  }
}

/**
 * Helper to run a promise with a timeout to handle offline states gracefully
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMsg));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Loads all data from Firestore, and if settings do not exist, seeds the database first.
 */
export async function loadAllCloudData() {
  try {
    // Check if settings exist, otherwise seed
    let settingsSnap;
    try {
      settingsSnap = await withTimeout(
        getDocs(collection(db, SETTINGS_COLLECTION)),
        6000,
        "فشل الاتصال بالخادم السحابي (انتهت مهلة 6 ثوانٍ) - يتم تشغيل وضع عدم الاتصال بالإنترنت حالياً بشكل آمن وسلس."
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, SETTINGS_COLLECTION);
    }

    if (settingsSnap.empty) {
      await seedFirestore();
    }

    // Load Collections
    let usersSnap, subscribersSnap, readingsSnap, paymentsSnap, settingsListSnap, auditLogsSnap;
    let treasuryTransfersSnap, expensesSnap, purchasesSnap, journalEntriesSnap, employeesSnap, employeeTxsSnap, connectionsSnap, techRequestsSnap, inventorySnap, inventoryTxsSnap;

    try { usersSnap = await getDocs(collection(db, USERS_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, USERS_COLLECTION); }
    try { subscribersSnap = await getDocs(collection(db, SUBSCRIBERS_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, SUBSCRIBERS_COLLECTION); }
    try { readingsSnap = await getDocs(collection(db, READINGS_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, READINGS_COLLECTION); }
    try { paymentsSnap = await getDocs(collection(db, PAYMENTS_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, PAYMENTS_COLLECTION); }
    try { settingsListSnap = await getDocs(collection(db, SETTINGS_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, SETTINGS_COLLECTION); }
    try { auditLogsSnap = await getDocs(collection(db, AUDIT_LOGS_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, AUDIT_LOGS_COLLECTION); }
    try { treasuryTransfersSnap = await getDocs(collection(db, TREASURY_TRANSFERS_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, TREASURY_TRANSFERS_COLLECTION); }
    try { expensesSnap = await getDocs(collection(db, EXPENSES_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, EXPENSES_COLLECTION); }
    try { purchasesSnap = await getDocs(collection(db, PURCHASES_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, PURCHASES_COLLECTION); }
    try { journalEntriesSnap = await getDocs(collection(db, JOURNAL_ENTRIES_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, JOURNAL_ENTRIES_COLLECTION); }
    try { employeesSnap = await getDocs(collection(db, EMPLOYEES_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, EMPLOYEES_COLLECTION); }
    try { employeeTxsSnap = await getDocs(collection(db, EMPLOYEE_TXS_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, EMPLOYEE_TXS_COLLECTION); }
    try { connectionsSnap = await getDocs(collection(db, CONNECTIONS_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, CONNECTIONS_COLLECTION); }
    try { techRequestsSnap = await getDocs(collection(db, TECH_REQUESTS_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, TECH_REQUESTS_COLLECTION); }
    try { inventorySnap = await getDocs(collection(db, INVENTORY_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, INVENTORY_COLLECTION); }
    try { inventoryTxsSnap = await getDocs(collection(db, INVENTORY_TXS_COLLECTION)); } catch (err) { handleFirestoreError(err, OperationType.LIST, INVENTORY_TXS_COLLECTION); }

    const cloudUsers: User[] = [];
    usersSnap.forEach((doc) => cloudUsers.push(doc.data() as User));

    const cloudSubscribers: Subscriber[] = [];
    subscribersSnap.forEach((doc) => cloudSubscribers.push(doc.data() as Subscriber));

    const cloudReadings: MeterReading[] = [];
    readingsSnap.forEach((doc) => cloudReadings.push(doc.data() as MeterReading));

    const cloudPayments: Payment[] = [];
    paymentsSnap.forEach((doc) => cloudPayments.push(doc.data() as Payment));

    let cloudSettings: SystemSettings = DEFAULT_SETTINGS;
    settingsListSnap.forEach((doc) => {
      if (doc.id === 'system') {
        cloudSettings = doc.data() as SystemSettings;
      }
    });

    const cloudAuditLogs: AuditLog[] = [];
    auditLogsSnap.forEach((doc) => cloudAuditLogs.push(doc.data() as AuditLog));

    const cloudTreasuryTransfers: TreasuryTransfer[] = [];
    treasuryTransfersSnap.forEach((doc) => cloudTreasuryTransfers.push(doc.data() as TreasuryTransfer));

    const cloudExpenses: Expense[] = [];
    expensesSnap.forEach((doc) => cloudExpenses.push(doc.data() as Expense));

    const cloudPurchases: Purchase[] = [];
    purchasesSnap.forEach((doc) => cloudPurchases.push(doc.data() as Purchase));

    const cloudJournalEntries: JournalEntry[] = [];
    journalEntriesSnap.forEach((doc) => cloudJournalEntries.push(doc.data() as JournalEntry));

    const cloudEmployees: Employee[] = [];
    employeesSnap.forEach((doc) => cloudEmployees.push(doc.data() as Employee));

    const cloudEmployeeTxs: EmployeeTransaction[] = [];
    employeeTxsSnap.forEach((doc) => cloudEmployeeTxs.push(doc.data() as EmployeeTransaction));

    const cloudConnections: ServiceConnection[] = [];
    connectionsSnap.forEach((doc) => cloudConnections.push(doc.data() as ServiceConnection));

    const cloudTechRequests: TechnicalRequest[] = [];
    techRequestsSnap.forEach((doc) => cloudTechRequests.push(doc.data() as TechnicalRequest));

    const cloudInventory: InventoryItem[] = [];
    inventorySnap.forEach((doc) => cloudInventory.push(doc.data() as InventoryItem));

    const cloudInventoryTxs: InventoryTransaction[] = [];
    inventoryTxsSnap.forEach((doc) => cloudInventoryTxs.push(doc.data() as InventoryTransaction));

    // Sort logs by timestamp desc
    cloudAuditLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return {
      users: cloudUsers,
      subscribers: cloudSubscribers,
      readings: cloudReadings,
      payments: cloudPayments,
      settings: cloudSettings,
      auditLogs: cloudAuditLogs,
      treasuryTransfers: cloudTreasuryTransfers,
      expenses: cloudExpenses,
      purchases: cloudPurchases,
      manualJournalEntries: cloudJournalEntries,
      employees: cloudEmployees,
      employeeTxs: cloudEmployeeTxs,
      connections: cloudConnections,
      techRequests: cloudTechRequests,
      inventory: cloudInventory,
      inventoryTransactions: cloudInventoryTxs
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isNetworkOrTimeout = 
      errorMsg.includes('timeout') || 
      errorMsg.includes('مهلة') || 
      errorMsg.includes('Could not reach') || 
      errorMsg.includes('unavailable') || 
      errorMsg.includes('offline') ||
      errorMsg.includes('الاتصال') ||
      errorMsg.includes('الإنترنت') ||
      errorMsg.includes('الخادم') ||
      errorMsg.includes('NetworkError') ||
      errorMsg.includes('Failed to get document') ||
      errorMsg.includes('Failed to fetch');

    if (isNetworkOrTimeout) {
      console.warn('Error loading data from Firestore (Offline/Timeout Handled):', errorMsg);
    } else {
      console.error('Error loading data from Firestore:', error);
    }
    throw error;
  }
}

// Helper to clean undefined fields before sending to Firestore
function cleanForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// Individual mutation sync helpers
export async function syncUserToCloud(user: User) {
  try {
    await setDoc(doc(db, USERS_COLLECTION, user.id), cleanForFirestore(user));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${USERS_COLLECTION}/${user.id}`);
  }
}

export async function syncSubscriberToCloud(sub: Subscriber) {
  try {
    await setDoc(doc(db, SUBSCRIBERS_COLLECTION, sub.id), cleanForFirestore(sub));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${SUBSCRIBERS_COLLECTION}/${sub.id}`);
  }
}

export async function syncReadingToCloud(reading: MeterReading) {
  try {
    await setDoc(doc(db, READINGS_COLLECTION, reading.id), cleanForFirestore(reading));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${READINGS_COLLECTION}/${reading.id}`);
  }
}

export async function syncPaymentToCloud(payment: Payment) {
  try {
    await setDoc(doc(db, PAYMENTS_COLLECTION, payment.id), cleanForFirestore(payment));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${PAYMENTS_COLLECTION}/${payment.id}`);
  }
}

export async function syncSettingsToCloud(settings: SystemSettings) {
  try {
    let payload = { ...settings };
    if (payload.logoUrl && payload.logoUrl.startsWith('data:image') && payload.logoUrl.length > 150000) {
      payload.logoUrl = await compressBase64Image(payload.logoUrl, 250, 250, 0.85);
    }
    await setDoc(doc(db, SETTINGS_COLLECTION, 'system'), cleanForFirestore(payload));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${SETTINGS_COLLECTION}/system`);
  }
}

export async function syncNotificationStateToCloud(state: { readIds: string[], dismissedIds: string[] }) {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, 'notifications'), cleanForFirestore({
      ...state,
      updatedAt: new Date().toISOString()
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${SETTINGS_COLLECTION}/notifications`);
  }
}

export function subscribeNotificationStateFromCloud(callback: (state: { readIds?: string[], dismissedIds?: string[] }) => void) {
  try {
    return onSnapshot(doc(db, SETTINGS_COLLECTION, 'notifications'), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as any);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `${SETTINGS_COLLECTION}/notifications`);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${SETTINGS_COLLECTION}/notifications`);
    return () => {};
  }
}

export function subscribeToUsersFromCloud(callback: (users: User[]) => void) {
  try {
    return onSnapshot(collection(db, USERS_COLLECTION), (snapshot) => {
      const usersList: User[] = [];
      snapshot.forEach((doc) => {
        usersList.push(doc.data() as User);
      });
      if (usersList.length > 0) {
        callback(usersList);
      }
    }, (err) => {
      console.warn('Live users subscription error:', err);
    });
  } catch (err) {
    console.warn('Failed to subscribe to users collection:', err);
    return () => {};
  }
}

export function subscribeToSubscribersFromCloud(callback: (subs: Subscriber[]) => void) {
  try {
    return onSnapshot(collection(db, SUBSCRIBERS_COLLECTION), (snapshot) => {
      const subs: Subscriber[] = [];
      snapshot.forEach((doc) => {
        subs.push(doc.data() as Subscriber);
      });
      if (subs.length > 0) {
        callback(subs);
      }
    }, (err) => {
      console.warn('Live subscriber subscription error:', err);
    });
  } catch (err) {
    console.warn('Failed to subscribe to subscribers collection:', err);
    return () => {};
  }
}

export async function syncSecurityPoliciesToCloud(policies: any) {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, 'security'), {
      ...policies,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${SETTINGS_COLLECTION}/security`);
  }
}

export async function loadSecurityPoliciesFromCloud() {
  try {
    const snap = await getDoc(doc(db, SETTINGS_COLLECTION, 'security'));
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${SETTINGS_COLLECTION}/security`);
  }
  return null;
}

export function subscribeSecurityPoliciesFromCloud(callback: (policies: any) => void) {
  try {
    return onSnapshot(doc(db, SETTINGS_COLLECTION, 'security'), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `${SETTINGS_COLLECTION}/security`);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${SETTINGS_COLLECTION}/security`);
    return () => {};
  }
}

export async function syncAuditLogToCloud(log: AuditLog) {
  try {
    await setDoc(doc(db, AUDIT_LOGS_COLLECTION, log.id), log);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${AUDIT_LOGS_COLLECTION}/${log.id}`);
  }
}

export async function syncTreasuryTransferToCloud(transfer: TreasuryTransfer) {
  try {
    await setDoc(doc(db, TREASURY_TRANSFERS_COLLECTION, transfer.id), transfer);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${TREASURY_TRANSFERS_COLLECTION}/${transfer.id}`);
  }
}

export async function deleteTreasuryTransferFromCloud(id: string) {
  const { deleteDoc, doc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(db, TREASURY_TRANSFERS_COLLECTION, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${TREASURY_TRANSFERS_COLLECTION}/${id}`);
  }
}

export async function syncExpenseToCloud(expense: Expense) {
  try {
    await setDoc(doc(db, EXPENSES_COLLECTION, expense.id), expense);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${EXPENSES_COLLECTION}/${expense.id}`);
  }
}

export async function deleteExpenseFromCloud(id: string) {
  const { deleteDoc, doc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(db, EXPENSES_COLLECTION, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${EXPENSES_COLLECTION}/${id}`);
  }
}

export async function syncPurchaseToCloud(purchase: Purchase) {
  try {
    await setDoc(doc(db, PURCHASES_COLLECTION, purchase.id), purchase);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${PURCHASES_COLLECTION}/${purchase.id}`);
  }
}

export async function deletePurchaseFromCloud(id: string) {
  const { deleteDoc, doc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(db, PURCHASES_COLLECTION, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${PURCHASES_COLLECTION}/${id}`);
  }
}

export async function syncJournalEntryToCloud(entry: JournalEntry) {
  try {
    await setDoc(doc(db, JOURNAL_ENTRIES_COLLECTION, entry.id), entry);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${JOURNAL_ENTRIES_COLLECTION}/${entry.id}`);
  }
}

export async function deleteJournalEntryFromCloud(id: string) {
  const { deleteDoc, doc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(db, JOURNAL_ENTRIES_COLLECTION, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${JOURNAL_ENTRIES_COLLECTION}/${id}`);
  }
}

export async function syncEmployeeToCloud(employee: Employee) {
  try {
    await setDoc(doc(db, EMPLOYEES_COLLECTION, employee.id), employee);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${EMPLOYEES_COLLECTION}/${employee.id}`);
  }
}

export async function deleteEmployeeFromCloud(id: string) {
  const { deleteDoc, doc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(db, EMPLOYEES_COLLECTION, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${EMPLOYEES_COLLECTION}/${id}`);
  }
}

export async function syncEmployeeTxToCloud(tx: EmployeeTransaction) {
  try {
    await setDoc(doc(db, EMPLOYEE_TXS_COLLECTION, tx.id), tx);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${EMPLOYEE_TXS_COLLECTION}/${tx.id}`);
  }
}

export async function deleteEmployeeTxFromCloud(id: string) {
  const { deleteDoc, doc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(db, EMPLOYEE_TXS_COLLECTION, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${EMPLOYEE_TXS_COLLECTION}/${id}`);
  }
}

export async function syncConnectionToCloud(conn: ServiceConnection) {
  try {
    await setDoc(doc(db, CONNECTIONS_COLLECTION, conn.id), conn);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${CONNECTIONS_COLLECTION}/${conn.id}`);
  }
}

export async function deleteConnectionFromCloud(id: string) {
  const { deleteDoc, doc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(db, CONNECTIONS_COLLECTION, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${CONNECTIONS_COLLECTION}/${id}`);
  }
}

export async function syncTechRequestToCloud(req: TechnicalRequest) {
  try {
    await setDoc(doc(db, TECH_REQUESTS_COLLECTION, req.id), req);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${TECH_REQUESTS_COLLECTION}/${req.id}`);
  }
}

export function subscribeToTechRequestsFromCloud(callback: (trqs: TechnicalRequest[]) => void) {
  try {
    return onSnapshot(collection(db, TECH_REQUESTS_COLLECTION), (snapshot) => {
      const trqs: TechnicalRequest[] = [];
      snapshot.forEach((doc) => {
        trqs.push(doc.data() as TechnicalRequest);
      });
      if (trqs.length > 0) {
        callback(trqs);
      }
    }, (err) => {
      console.warn('Live tech requests subscription error:', err);
    });
  } catch (err) {
    console.warn('Failed to subscribe to tech requests collection:', err);
    return () => {};
  }
}

export async function deleteTechRequestFromCloud(id: string) {
  const { deleteDoc, doc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(db, TECH_REQUESTS_COLLECTION, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${TECH_REQUESTS_COLLECTION}/${id}`);
  }
}

export async function syncInventoryItemToCloud(item: InventoryItem) {
  try {
    await setDoc(doc(db, INVENTORY_COLLECTION, item.id), item);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${INVENTORY_COLLECTION}/${item.id}`);
  }
}

export async function deleteInventoryItemFromCloud(id: string) {
  const { deleteDoc, doc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(db, INVENTORY_COLLECTION, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${INVENTORY_COLLECTION}/${id}`);
  }
}

export async function syncInventoryTxToCloud(tx: InventoryTransaction) {
  try {
    await setDoc(doc(db, INVENTORY_TXS_COLLECTION, tx.id), tx);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${INVENTORY_TXS_COLLECTION}/${tx.id}`);
  }
}

export async function deleteUserFromCloud(userId: string) {
  const { deleteDoc, doc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${USERS_COLLECTION}/${userId}`);
  }
}

export async function deleteSubscriberFromCloud(subId: string) {
  const { deleteDoc, doc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(db, SUBSCRIBERS_COLLECTION, subId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${SUBSCRIBERS_COLLECTION}/${subId}`);
  }
}

export async function deleteReadingFromCloud(readingId: string) {
  const { deleteDoc, doc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(db, READINGS_COLLECTION, readingId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${READINGS_COLLECTION}/${readingId}`);
  }
}

export async function deletePaymentFromCloud(paymentId: string) {
  const { deleteDoc, doc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(db, PAYMENTS_COLLECTION, paymentId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${PAYMENTS_COLLECTION}/${paymentId}`);
  }
}

/**
 * Bulk save function for billing/closing posts (ترحيل)
 */
export async function syncBulkSubscribersToCloud(subs: Subscriber[]) {
  try {
    const batch = writeBatch(db);
    for (const sub of subs) {
      const docRef = doc(db, SUBSCRIBERS_COLLECTION, sub.id);
      batch.set(docRef, sub);
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `bulk/${SUBSCRIBERS_COLLECTION}`);
  }
}

export async function syncBulkReadingsToCloud(rds: MeterReading[]) {
  try {
    const batch = writeBatch(db);
    for (const rd of rds) {
      const docRef = doc(db, READINGS_COLLECTION, rd.id);
      batch.set(docRef, rd);
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `bulk/${READINGS_COLLECTION}`);
  }
}

export async function syncBulkPaymentsToCloud(pays: Payment[]) {
  try {
    const batch = writeBatch(db);
    for (const pay of pays) {
      const docRef = doc(db, PAYMENTS_COLLECTION, pay.id);
      batch.set(docRef, pay);
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `bulk/${PAYMENTS_COLLECTION}`);
  }
}
