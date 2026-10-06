// Yedek hatırlatması: veri yalnızca cihazda durduğu için haftada bir "yedek al" önerilir (saf, birim testli).

import { addDays, type ISODate } from './calendar';

/** Yedekten sonra bir sonraki hatırlatmaya kadar gün */
export const BACKUP_INTERVAL_DAYS = 7;
/** "Sonra" denince ertelenen gün */
export const BACKUP_SNOOZE_DAYS = 2;
/** Bu kadar not birikmeden hatırlatılmaz */
export const BACKUP_MIN_NOTES = 5;

/** Kayıtlı "şu tarihten önce hatırlatma" değerini okur; bozuksa null */
export function parseRemindFrom(raw: string | null | undefined): ISODate | null {
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? (raw as ISODate) : null;
}

/** Hatırlatma zamanı geldi mi? Kayıt yoksa ilk kez tanındığı için bugünden itibaren sayılır (burada false). */
export function isBackupDue(remindFrom: ISODate | null, today: ISODate, noteCount: number): boolean {
  if (noteCount < BACKUP_MIN_NOTES || !remindFrom) return false;
  return today >= remindFrom;
}

export const nextAfterBackup = (today: ISODate): ISODate => addDays(today, BACKUP_INTERVAL_DAYS);
export const nextAfterSnooze = (today: ISODate): ISODate => addDays(today, BACKUP_SNOOZE_DAYS);
