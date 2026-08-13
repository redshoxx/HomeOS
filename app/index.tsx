import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/theme/theme';
import { useAppStore } from '@/store/appStore';
import { prepareDatabase } from '@/database/prepare';
import { migrateDatabase } from '@/database/db';

export default function Index(){
  const ready=useAppStore(s=>s.ready);
  const household=useAppStore(s=>s.activeHouseholdId);
  const hydrate=useAppStore(s=>s.hydrate);

  useEffect(()=>{
    if(ready)return;
    void (async()=>{
      try{
        await prepareDatabase();
        await migrateDatabase();
        await hydrate();
      }catch(error){
        console.error('HomeOS startup recovery failed',error);
        useAppStore.setState({ready:true,activeHouseholdId:null});
      }
    })();
  },[ready,hydrate]);

  if(!ready)return <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:colors.background}}><ActivityIndicator /></View>;
  return <Redirect href={household?'/today':'/onboarding'} />;
}
