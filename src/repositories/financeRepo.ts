import { getDb } from '@/database/db';
import { enqueueSync } from '@/database/queue';
import { newId, nowIso } from '@/utils/id';
import type { Transaction } from '@/types/models';

export async function listTransactions(householdId:string):Promise<Transaction[]>{const db=await getDb();return db.getAllAsync('SELECT * FROM transactions WHERE household_id=? ORDER BY date DESC, created_at DESC',householdId);}
export async function addExpense(householdId:string,title:string,amount:number,category='Haushalt'):Promise<void>{const db=await getDb();const id=newId('tx'),now=nowIso();const date=now.slice(0,10);const p={id,household_id:householdId,type:'expense',amount,category,title:title.trim(),date,created_at:now,updated_at:now};await db.runAsync(`INSERT INTO transactions(id,household_id,type,amount,category,title,date,created_at,updated_at) VALUES(?,?,'expense',?,?,?,?,?,?)`,id,householdId,amount,category,p.title,date,now,now);await enqueueSync('transactions',id,'CREATE',p);}
export async function deleteTransaction(id:string):Promise<void>{const db=await getDb();await db.runAsync('DELETE FROM transactions WHERE id=?',id);await enqueueSync('transactions',id,'DELETE');}
export async function monthSpend(householdId:string,month:string):Promise<number>{const db=await getDb();const r=await db.getFirstAsync<{total:number|null}>(`SELECT SUM(amount) total FROM transactions WHERE household_id=? AND type='expense' AND substr(date,1,7)=?`,householdId,month);return r?.total??0;}
