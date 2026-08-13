export type ID = string;
export type QueueStatus = 'pending' | 'syncing' | 'failed';

export type Household = { id: ID; name: string; currency: string; created_at: string; updated_at: string };
export type ShoppingList = { id: ID; household_id: ID; name: string; created_at: string; updated_at: string };
export type ShoppingItem = { id: ID; list_id: ID; name: string; quantity: number; unit: string | null; category: string | null; estimated_price: number | null; checked: number; created_at: string; updated_at: string };
export type PantryItem = { id: ID; household_id: ID; name: string; quantity: number; unit: string | null; minimum_quantity: number; category: string | null; storage_location: string | null; expiry_date: string | null; purchase_price: number | null; created_at: string; updated_at: string };
export type Task = { id: ID; household_id: ID; title: string; completed: number; due_date: string | null; recurrence: string | null; created_at: string; updated_at: string };
export type Transaction = { id: ID; household_id: ID; type: 'expense' | 'income'; amount: number; category: string; title: string; date: string; note: string | null; created_at: string; updated_at: string };
export type Bill = { id: ID; household_id: ID; title: string; provider: string | null; amount: number; due_date: string; status: 'open' | 'paid' | 'overdue'; category: string | null; created_at: string; updated_at: string };
export type Device = { id: ID; household_id: ID; name: string; manufacturer: string | null; model: string | null; serial_number: string | null; purchase_date: string | null; warranty_until: string | null; location: string | null; created_at: string; updated_at: string };
