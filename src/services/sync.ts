import * as Network from 'expo-network';
import { getDb } from '@/database/db';
import { supabase, supabaseConfigured } from './supabase';

type QueueRow={id:string;entity_type:string;entity_id:string;operation:'CREATE'|'UPDATE'|'DELETE';payload:string|null;retry_count:number};
type SyncResult={synced:number;failed:number;skipped:boolean;reason?:string};
const allowedTables=new Set(['households','shopping_lists','shopping_items','pantry_items','tasks','transactions','bills','devices']);

export async function flushSyncQueue():Promise<SyncResult>{
  if(!supabaseConfigured)return{synced:0,failed:0,skipped:true,reason:'Supabase ist nicht konfiguriert.'};
  const state=await Network.getNetworkStateAsync();
  if(!state.isConnected)return{synced:0,failed:0,skipped:true,reason:'Keine Internetverbindung.'};
  const {data:{session},error:sessionError}=await supabase.auth.getSession();
  if(sessionError)return{synced:0,failed:0,skipped:true,reason:'Anmeldestatus konnte nicht geprüft werden.'};
  if(!session)return{synced:0,failed:0,skipped:true,reason:'Für Cloud-Sync ist eine Anmeldung erforderlich.'};

  const db=await getDb();
  const rows=await db.getAllAsync<QueueRow>(`SELECT * FROM sync_queue WHERE status IN ('pending','failed') ORDER BY created_at LIMIT 50`);
  let synced=0;
  let failed=0;
  let firstError:string|undefined;

  for(const row of rows){
    if(!allowedTables.has(row.entity_type)){
      await db.runAsync(`UPDATE sync_queue SET status='failed',last_error=? WHERE id=?`,'Unsupported entity',row.id);
      failed++;
      firstError??=`Nicht unterstützter Datentyp: ${row.entity_type}`;
      continue;
    }
    await db.runAsync(`UPDATE sync_queue SET status='syncing' WHERE id=?`,row.id);
    try{
      let error:{message:string}|null=null;
      if(row.operation==='DELETE'){
        const r=await supabase.from(row.entity_type).delete().eq('id',row.entity_id);error=r.error;
      }else{
        const payload=row.payload?JSON.parse(row.payload):{};
        if(row.entity_type==='households')payload.owner_id=session.user.id;
        if(row.entity_type==='shopping_lists')payload.created_by=session.user.id;
        const r=await supabase.from(row.entity_type).upsert(payload,{onConflict:'id'});error=r.error;
        if(!error&&row.entity_type==='households'){
          const member=await supabase.from('household_members').upsert({household_id:row.entity_id,user_id:session.user.id,role:'owner'},{onConflict:'household_id,user_id'});
          error=member.error;
        }
      }
      if(error){
        failed++;
        firstError??=error.message;
        await db.runAsync(`UPDATE sync_queue SET status='failed',retry_count=retry_count+1,last_error=? WHERE id=?`,error.message,row.id);
      }else{
        await db.runAsync('DELETE FROM sync_queue WHERE id=?',row.id);
        synced++;
      }
    }catch(error){
      failed++;
      const message=error instanceof Error?error.message:'Unbekannter Sync-Fehler';
      firstError??=message;
      await db.runAsync(`UPDATE sync_queue SET status='failed',retry_count=retry_count+1,last_error=? WHERE id=?`,message,row.id);
    }
  }
  return{synced,failed,skipped:false,reason:firstError};
}
