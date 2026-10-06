import type { ISODate } from '../calendar';
import { computeStreak } from '../streak';

const o = (date: string, done: boolean) => ({ date: date as ISODate, done });
const T = '2026-10-06' as ISODate;

describe('computeStreak', () => {
  it('boş listede 0 verir', () => {
    expect(computeStreak([], T)).toEqual({ current: 0, best: 0 });
  });
  it('üst üste tamamlananları sayar', () => {
    const list = [o('2026-10-03', true), o('2026-10-04', true), o('2026-10-05', true)];
    expect(computeStreak(list, T)).toEqual({ current: 3, best: 3 });
  });
  it('bugünün açık tekrarı seriyi bozmaz', () => {
    const list = [o('2026-10-04', true), o('2026-10-05', true), o('2026-10-06', false)];
    expect(computeStreak(list, T).current).toBe(2);
  });
  it('bugün tamamlandıysa seriye eklenir', () => {
    const list = [o('2026-10-05', true), o('2026-10-06', true)];
    expect(computeStreak(list, T).current).toBe(2);
  });
  it('geçmişteki kaçırılan tekrar seriyi keser, en iyi seri korunur', () => {
    const list = [
      o('2026-10-01', true),
      o('2026-10-02', true),
      o('2026-10-03', true),
      o('2026-10-04', false),
      o('2026-10-05', true),
    ];
    expect(computeStreak(list, T)).toEqual({ current: 1, best: 3 });
  });
  it('gelecektekileri yok sayar ve sırasız listeyi sıralar', () => {
    const list = [o('2026-10-07', true), o('2026-10-05', true), o('2026-10-04', true)];
    expect(computeStreak(list, T)).toEqual({ current: 2, best: 2 });
  });
});
