import { useEffect, useRef, useState } from "react";
import type { Data } from "../models";
import { loadData, saveData, STORAGE_KEY } from "../storage";
import { failure } from "../lib/presentation";
export function useFinance() {
  const [initial] = useState(() => {
    try {
      return { data: loadData(), error: "" };
    } catch (e) {
      return { data: null, error: failure(e) };
    }
  });
  const [data, setData] = useState<Data | null>(initial.data);
  const [stale, setStale] = useState(false);
  const staleRef = useRef(false);
  useEffect(() => {
    const change = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) {
        staleRef.current = true;
        setStale(true);
      }
    };
    window.addEventListener("storage", change);
    return () => window.removeEventListener("storage", change);
  }, []);
  function commit(next: Data) {
    if (staleRef.current)
      throw new Error("มีการแก้ไขจากแท็บอื่น กรุณาโหลดหน้าใหม่");
    saveData(next);
    setData(next);
  }
  return {
    data,
    error: initial.error,
    stale,
    commit,
    acceptPersisted: setData,
  };
}
