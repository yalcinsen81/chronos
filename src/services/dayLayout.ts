// Gün görünümü saat çizelgesinin yerleşimi (saf, birim testli).
// Notların yalnızca başlangıç saati vardır; her not sabit yükseklikte bir blok olarak çizilir.
// Üst üste binen bloklar yan yana şeritlere (lane) dizilir.

export const HOUR_HEIGHT = 64; // bir saatin piksel yüksekliği
export const BLOCK_MINUTES = 45; // bir bloğun kapladığı süre (görsel; HOUR_HEIGHT'a oranlanır)

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export interface Placed {
  id: string;
  minutes: number;
  /** Şerit numarası (soldan) */
  lane: number;
  /** Aynı kümedeki toplam şerit sayısı */
  lanes: number;
}

export function layoutDay(items: { id: string; minutes: number }[], blockMinutes = BLOCK_MINUTES): Placed[] {
  const sorted = [...items].sort((a, b) => a.minutes - b.minutes);
  const out: Placed[] = [];
  let cluster: Placed[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    for (const p of cluster) p.lanes = laneEnds.length;
    out.push(...cluster);
    cluster = [];
    laneEnds = [];
  };

  for (const it of sorted) {
    if (cluster.length > 0 && it.minutes >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= it.minutes);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = it.minutes + blockMinutes;
    clusterEnd = Math.max(clusterEnd, it.minutes + blockMinutes);
    cluster.push({ id: it.id, minutes: it.minutes, lane, lanes: 1 });
  }
  flush();
  return out;
}

/** Çizelgenin görünen saat aralığı: en az 07–22; dışına taşan notlar aralığı genişletir. */
export function hourRange(minutes: number[], defStart = 7, defEnd = 22): { start: number; end: number } {
  let start = defStart;
  let end = defEnd;
  for (const m of minutes) {
    start = Math.min(start, Math.floor(m / 60));
    end = Math.max(end, Math.floor(m / 60) + 1);
  }
  return { start: Math.max(0, start), end: Math.min(24, end) };
}
