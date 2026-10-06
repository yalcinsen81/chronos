import { isBackupDue, nextAfterBackup, nextAfterSnooze, parseRemindFrom } from '../backupNudge';
import type { ISODate } from '../calendar';

const d = (s: string) => s as ISODate;

describe('backupNudge', () => {
  it('az notla ya da kayıtsız hatırlatmaz', () => {
    expect(isBackupDue(d('2026-10-01'), d('2026-10-06'), 4)).toBe(false);
    expect(isBackupDue(null, d('2026-10-06'), 50)).toBe(false);
  });
  it('tarih gelince hatırlatır', () => {
    expect(isBackupDue(d('2026-10-06'), d('2026-10-06'), 5)).toBe(true);
    expect(isBackupDue(d('2026-10-07'), d('2026-10-06'), 5)).toBe(false);
  });
  it('sonraki tarihleri hesaplar', () => {
    expect(nextAfterBackup(d('2026-10-30'))).toBe('2026-11-06');
    expect(nextAfterSnooze(d('2026-10-31'))).toBe('2026-11-02');
  });
  it('bozuk kaydı yok sayar', () => {
    expect(parseRemindFrom('abc')).toBeNull();
    expect(parseRemindFrom('2026-10-06')).toBe('2026-10-06');
  });
});
