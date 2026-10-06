import type { ISODate } from '../calendar';
import { countByDate, heatLevel, summarize, yearGrid } from '../stats';

const e = (date: string, done = false) => ({ date: date as ISODate, done });

describe('stats', () => {
  it('günlük adetleri sayar', () => {
    expect(countByDate([e('2026-10-06'), e('2026-10-06', true), e('2026-10-07')])).toEqual({
      '2026-10-06': 2,
      '2026-10-07': 1,
    });
  });

  it('yıl ızgarası 7 satırlı sütunlardır, yıl dışı günler boştur', () => {
    const grid = yearGrid({ '2026-01-01': 3 }, 2026);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid.length).toBeGreaterThanOrEqual(53);
    const cells = grid.flat().filter(Boolean);
    expect(cells).toHaveLength(365);
    expect(cells.find((c) => c!.date === '2026-01-01')!.count).toBe(3);
    expect(cells[0]!.date).toBe('2026-01-01');
  });

  it('koyuluk düzeyleri', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 20].map(heatLevel)).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
  });

  it('özet: ay, yıl, en iyi gün ve seriler', () => {
    const list = [
      e('2026-10-04', true), // Pazar
      e('2026-10-05', true), // Pazartesi
      e('2026-10-06', true), // Salı
      e('2026-10-06', false),
      e('2026-09-01', true), // Salı
      e('2025-12-31', true), // Çarşamba, geçen yıl
    ];
    const s = summarize(list, '2026-10-06');
    expect(s.monthTotal).toBe(4);
    expect(s.monthDone).toBe(3);
    expect(s.yearTotal).toBe(5);
    expect(s.yearDone).toBe(4);
    expect(s.activeDays).toBe(4);
    expect(s.bestWeekday).toBe(1);
    expect(s.longestRun).toBe(3);
    expect(s.currentRun).toBe(3);
  });

  it('bugün bir şey bitmediyse dünden sayar, boş veride null verir', () => {
    expect(summarize([e('2026-10-05', true)], '2026-10-06').currentRun).toBe(1);
    expect(summarize([e('2026-10-03', true)], '2026-10-06').currentRun).toBe(0);
    expect(summarize([], '2026-10-06').bestWeekday).toBeNull();
  });
});
