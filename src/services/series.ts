// Tekrarlayan notların üretimi: her zincirin son notundan, verilen tarihe kadar eksik tekrarlar oluşturulur.
// Yinelenmez: yalnızca zincirin son tarihinden sonrası üretilir. Zinciri durdurmak için repo.changeSeries(id, null).

import type { Repository } from '../db/repository';
import type { ISODate } from './calendar';
import { isRepeatRule, occurrencesAfter } from './recurrence';

/** Eksik tekrarları `until` gününe kadar üretir; oluşturulan notların kimliklerini döner (alarmları kurulsun). */
export async function materializeSeries(repo: Repository, notebookId: string, until: ISODate): Promise<string[]> {
  const created: string[] = [];
  for (const tail of await repo.listSeriesTails(notebookId)) {
    if (!tail.date || !tail.series_id || !isRepeatRule(tail.repeat)) continue;
    for (const day of occurrencesAfter(tail.date, tail.repeat, until)) {
      const e = await repo.createEntry(notebookId, {
        text: tail.text_content,
        date: day,
        time: tail.time_slot,
        endTime: tail.end_time,
        color: tail.color,
        reminderMinutes: tail.reminder_minutes,
        repeat: tail.repeat,
        seriesId: tail.series_id,
      });
      created.push(e.id);
    }
  }
  return created;
}
