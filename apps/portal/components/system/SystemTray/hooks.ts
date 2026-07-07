"use client";
import { useState, useEffect, useCallback, useRef } from "react";
/* ------------------------------------------------------------------ */
//  Types for APIs not in all TS lib definitions
/* ------------------------------------------------------------------ */
interface BatteryManager extends eventTarget {
  charging: boolean;
  level: number;
  chargingTime: number;
  dischargingTime: number;
  addeventListener(
    _type:
      | "chargingchange"
      | "levelchange"
      | "chargingtimechange"
      | "dischargingtimechange",
    _listener: eventListenerOreventListenerObject,
  ): void;
  removeeventListener(
    _type:
      | "chargingchange"
      | "levelchange"
      | "chargingtimechange"
      | "dischargingtimechange",
    _listener: eventListenerOreventListenerObject,
  ): void;
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>;
}

interface NetworkConnection extends eventTarget {
  effectiveType?: "4g" | "3g" | "2g" | "slow-2g";
  type?:
    | "bluetooth"
    | "cellular"
    | "ethernet"
    | "none"
    | "wifi"
    | "wimax"
    | "other"
    | "unknown";
  downlink?: number;
  downlinkMax?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkConnection;
  mozConnection?: NetworkConnection;
  webkitConnection?: NetworkConnection;
}

/* ------------------------------------------------------------------ */
//  Helpers
/* ------------------------------------------------------------------ */
export function formatTimeSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0)
    return "Calculating…";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/* ------------------------------------------------------------------ */
//  useNetworkStatus
/* ------------------------------------------------------------------ */
export function useNetworkStatus() {
  const [online, setOnline] = useState(true);
  const [effectiveType, setEffectiveType] =
    useState<NetworkConnection["effectiveType"]>(undefined);
  const [connType, setConnType] =
    useState<NetworkConnection["type"]>(undefined);
  const [downlink, setDownlink] = useState<number | undefined>(undefined);
  const [rtt, setRtt] = useState<number | undefined>(undefined);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addeventListener("online", handleOnline);
    window.addeventListener("offline", handleOffline);

    const nav = navigator as NavigatorWithConnection;
    const connection =
      nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

    if (!connection) {
      setSupported(false);
    } else {
      setSupported(true);
      const sync = () => {
        setEffectiveType(connection.effectiveType);
        setConnType(connection.type);
        setDownlink(connection.downlink);
        setRtt(connection.rtt);
      };
      sync();
      connection.addeventListener("change", sync);
      return () => {
        window.removeeventListener("online", handleOnline);
        window.removeeventListener("offline", handleOffline);
        connection.removeeventListener("change", sync);
      };
    }

    return () => {
      window.removeeventListener("online", handleOnline);
      window.removeeventListener("offline", handleOffline);
    };
  }, []);

  return { online, effectiveType, connType, downlink, rtt, supported };
}

/* ------------------------------------------------------------------ */
//  useBatteryStatus
/* ------------------------------------------------------------------ */
export function useBatteryStatus() {
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState(false);
  const [chargingTime, setChargingTime] = useState<number>(Infinity);
  const [dischargingTime, setDischargingTime] = useState<number>(Infinity);
  const [supported, setSupported] = useState(true);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const nav = navigator as NavigatorWithBattery;
    if (!nav.getBattery) {
      setSupported(false);
      return;
    }

    let cancelled = false;

    nav.getBattery().then((b) => {
      if (cancelled) return;

      const sync = () => {
        setLevel(b.level);
        setCharging(b.charging);
        setChargingTime(b.chargingTime);
        setDischargingTime(b.dischargingTime);
      };
      sync();

      b.addeventListener("chargingchange", sync);
      b.addeventListener("levelchange", sync);
      b.addeventListener("chargingtimechange", sync);
      b.addeventListener("dischargingtimechange", sync);

      cleanupRef.current = () => {
        b.removeeventListener("chargingchange", sync);
        b.removeeventListener("levelchange", sync);
        b.removeeventListener("chargingtimechange", sync);
        b.removeeventListener("dischargingtimechange", sync);
      };
    });

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  return { level, charging, chargingTime, dischargingTime, supported };
}

/* ------------------------------------------------------------------ */
//  useAppVolume
/* ------------------------------------------------------------------ */
export function useAppVolume() {
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 75;
    const raw = window.localStorage.getItem("arch-app-volume");
    return raw ? Math.min(100, Math.max(0, Number(raw))) : 75;
  });
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("arch-app-muted") === "true";
  });

  const persist = useCallback((v: number, m: boolean) => {
    window.localStorage.setItem("arch-app-volume", String(v));
    window.localStorage.setItem("arch-app-muted", String(m));
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      persist(volume, !m);
      return !m;
    });
  }, [volume, persist]);

  const adjust = useCallback(
    (v: number) => {
      const clamped = Math.min(100, Math.max(0, v));
      setVolume(clamped);
      const m = clamped === 0;
      setMuted(m);
      persist(clamped, m);
    },
    [persist],
  );

  return { volume, muted, toggleMute, adjust };
}

/* ------------------------------------------------------------------ */
//  useNotificationCount
/* ------------------------------------------------------------------ */
export function useNotificationCount() {
  const [count, setCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem("arch-tray-notifications");
    return raw ? Math.max(0, Number(raw)) : 0;
  });

  const clear = useCallback(() => {
    setCount(0);
    window.localStorage.setItem("arch-tray-notifications", "0");
  }, []);

  return { count, clear };
}

/* ------------------------------------------------------------------ */
//  useServerHealth
/* ------------------------------------------------------------------ */
export interface HealthState {
  status: "healthy" | "error" | "degraded";
  db: "ok" | "unavailable";
  pooler: "ok" | "unavailable" | "disabled";
  redis: "ok" | "unavailable";
  aiRouter: "ok" | "unavailable" | "disabled";
  responseTime: number;
  timestamp: string;
  loading: boolean;
  lastFetched: number | null;
}

export function useServerHealth() {
  const [health, setHealth] = useState<HealthState>({
    status: "healthy",
    db: "ok",
    pooler: "ok",
    redis: "ok",
    aiRouter: "ok",
    responseTime: 0,
    timestamp: "",
    loading: true,
    lastFetched: null,
  });

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/health", {
          method: "GET",
          cache: "no-store",
        });
        const data = await res.json();
        if (!cancelled) {
          setHealth({
            status: data.status ?? "error",
            db: data.db ?? "unavailable",
            pooler: data.pooler ?? "disabled",
            redis: data.redis ?? "unavailable",
            aiRouter: data.aiRouter ?? "unavailable",
            responseTime: data.responseTime ?? 0,
            timestamp: data.timestamp ?? "",
            loading: false,
            lastFetched: Date.now(),
          });
        }
      } catch {
        if (!cancelled) {
          setHealth((prev) => ({
            ...prev,
            status: "error",
            loading: false,
            lastFetched: Date.now(),
          }));
        }
      }
    };

    fetchHealth();

    intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchHealth();
      }
    }, 30000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return health;
}

/* ------------------------------------------------------------------ */
//  Row Components
/* ------------------------------------------------------------------ */
