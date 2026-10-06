// Tarayıcı sürükle-bırak: notlar sürüklenir, gün sütunlarına ve saat çizelgesine bırakılır.
import { useCallback, useRef, useState } from 'react';

const MIME = 'application/x-chronos-note';

export interface DropInfo {
  offsetY: number;
}

// react-native-web, ref olarak gerçek DOM düğümünü verir
type Node = HTMLElement | null;

export function useDragSource(id: string) {
  return useCallback(
    (node: Node) => {
      if (!node || !('addEventListener' in node)) return;
      node.draggable = true;
      node.ondragstart = (e: DragEvent) => {
        e.dataTransfer?.setData(MIME, id);
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      };
    },
    [id],
  );
}

export function useDropZone(onDrop: (id: string, info: DropInfo) => void) {
  const [over, setOver] = useState(false);
  const handler = useRef(onDrop);
  handler.current = onDrop;
  const ref = useCallback((node: Node) => {
    if (!node || !('addEventListener' in node)) return;
    node.ondragover = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes(MIME)) return;
      e.preventDefault();
      setOver(true);
    };
    node.ondragleave = (e: DragEvent) => {
      if (!node.contains(e.relatedTarget as globalThis.Node | null)) setOver(false);
    };
    node.ondrop = (e: DragEvent) => {
      const id = e.dataTransfer?.getData(MIME);
      setOver(false);
      if (!id) return;
      e.preventDefault();
      handler.current(id, { offsetY: e.clientY - node.getBoundingClientRect().top });
    };
  }, []);
  return { ref, over };
}
