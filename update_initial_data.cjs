const fs = require('fs');
let code = fs.readFileSync('src/initialData.ts', 'utf8');

code = code.replace(
  "import { User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog } from './types';",
  "import { User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, InventoryItem, InventoryTransaction } from './types';"
);

const newInitData = `
export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', name: 'كابل ألمنيوم 16 ملم', category: 'cables', quantity: 1500, unit: 'متر', minAlertLevel: 500, lastUpdated: new Date().toISOString() },
  { id: 'inv-2', name: 'عداد إلكتروني ذكي 1 فاز', category: 'meters', quantity: 12, unit: 'حبة', minAlertLevel: 20, lastUpdated: new Date().toISOString() },
  { id: 'inv-3', name: 'زيت محولات 10KV', category: 'oil', quantity: 50, unit: 'لتر', minAlertLevel: 100, lastUpdated: new Date().toISOString() },
  { id: 'inv-4', name: 'قاطع هوائي 630 أمبير', category: 'breakers', quantity: 5, unit: 'حبة', minAlertLevel: 2, lastUpdated: new Date().toISOString() },
];

export const INITIAL_INVENTORY_TRANSACTIONS: InventoryTransaction[] = [];
`;

fs.writeFileSync('src/initialData.ts', code + newInitData);
console.log('Initial data updated.');
