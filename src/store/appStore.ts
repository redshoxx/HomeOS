import { create } from 'zustand';
import { getSetting, setSetting } from '@/database/db';

type AppState={activeHouseholdId:string|null;ready:boolean;revision:number;hydrate:()=>Promise<void>;setHousehold:(id:string|null)=>Promise<void>;bump:()=>void};
export const useAppStore=create<AppState>((set)=>({activeHouseholdId:null,ready:false,revision:0,hydrate:async()=>{const id=await getSetting('active_household_id');set({activeHouseholdId:id,ready:true});},setHousehold:async(id)=>{if(id)await setSetting('active_household_id',id);set({activeHouseholdId:id});},bump:()=>set(s=>({revision:s.revision+1}))}));
