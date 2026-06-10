import { useCallback, useEffect, useState } from "react";









const KEY = "gh_activity_log";
const MAX = 100;

function read() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch (e2) {
    return [];
  }
}

export function useActivityLog() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    setEntries(read());
    const onStorage = (e) => {
      if (e.key === KEY) setEntries(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const log = useCallback((entry) => {
    const next = {
      ...entry,
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
    };
    const list = [next, ...read()].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
    setEntries(list);
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
    setEntries([]);
  }, []);

  return { entries, log, clear };
}