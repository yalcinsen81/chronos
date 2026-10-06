// Sürükle-bırak (yalnızca web/masaüstü tarayıcı). Telefonda boş çalışır; orada eylemler uzun basma menüsündedir.

export interface DropInfo {
  /** Bırakılan noktanın hedef kutunun üstünden uzaklığı (piksel) */
  offsetY: number;
}

export function useDragSource(_id: string): undefined {
  return undefined;
}

export function useDropZone(_onDrop: (id: string, info: DropInfo) => void): { ref: undefined; over: boolean } {
  return { ref: undefined, over: false };
}
