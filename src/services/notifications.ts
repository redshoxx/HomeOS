import * as Notifications from 'expo-notifications';

export async function ensureNotificationPermission():Promise<boolean>{const current=await Notifications.getPermissionsAsync();if(current.granted)return true;const asked=await Notifications.requestPermissionsAsync();return asked.granted;}
export async function scheduleLocalReminder(title:string,body:string,date:Date):Promise<string|null>{if(!(await ensureNotificationPermission()))return null;return Notifications.scheduleNotificationAsync({content:{title,body},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date}});}
