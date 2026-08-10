import { useEffect, type RefObject } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Device } from "../types/app";

interface UseRealtimeDeviceSyncOptions {
  baseUrl: string;
  setDevices: Dispatch<SetStateAction<Device[]>>;
  devicesRef: RefObject<Device[]>;
  recordDeviceEvent: (device: Device, note: string) => void;
  resolvePowerStateWithForcedOff: (incoming: { id: number; powerState?: string; power_state?: string; status?: string }, fallback?: Device) => string;
  setLastRefresh: Dispatch<SetStateAction<string>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
}

type DeviceApiShape = Device & { power_state?: string };

export function useRealtimeDeviceSync(options: UseRealtimeDeviceSyncOptions) {
  const { baseUrl, setDevices, setLastRefresh, setStatusMessage, recordDeviceEvent, resolvePowerStateWithForcedOff, devicesRef } = options;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let keepTrying = true;
    let cleanupRequested = false;
    const wsUrl = baseUrl.replace(/^http/, "ws");
    let didOpen = false;

    const connect = async () => {
      try {
        const healthResponse = await fetch(`${baseUrl}/health/summary`, { cache: "no-store" });
        if (!healthResponse.ok) throw new Error(`Health check failed with status ${healthResponse.status}`);
      } catch (e) {
        if (!keepTrying) return;
        reconnectAttempts += 1;
        reconnectTimer = window.setTimeout(connect, Math.min(1000 * 2 ** reconnectAttempts, 30000));
        console.warn("WS backend not ready, retrying...", e);
        return;
      }

      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          didOpen = true;
          reconnectAttempts = 0;
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === "device:update" && msg.device) {
              const dev = msg.device;
              const current = devicesRef.current.find((x) => x.id === dev.id);
              const resolvedPowerState = resolvePowerStateWithForcedOff(dev, current);
              setDevices((prev) => prev.map((d) => (d.id === dev.id ? { ...d, ...dev, powerState: resolvedPowerState } : d)));
              recordDeviceEvent({ ...(current || dev), powerState: resolvedPowerState }, "State updated from server");
            } else if (msg.type === "devices:init" && Array.isArray(msg.devices)) {
              setDevices(msg.devices.map((raw: unknown) => {
                const d = raw as DeviceApiShape;
                const current = devicesRef.current.find((x) => x.id === d.id);
                const resolvedPowerState = resolvePowerStateWithForcedOff(d, current);
                return { ...d, powerState: resolvedPowerState };
              }));
            }
          } catch (e) {
            console.error("WS message parse error", e);
          }
        };
        ws.onclose = () => {
          if (cleanupRequested) return;
          if (!didOpen) return;
          if (!keepTrying) return;
          reconnectAttempts += 1;
          reconnectTimer = window.setTimeout(connect, Math.min(1000 * 2 ** reconnectAttempts, 30000));
        };
        ws.onerror = () => {
          if (cleanupRequested) return;
          if (!didOpen) return;
        };
      } catch (e) {
        console.error("WS init failed", e);
        if (keepTrying) {
          reconnectAttempts += 1;
          reconnectTimer = window.setTimeout(connect, Math.min(1000 * 2 ** reconnectAttempts, 30000));
        }
      }
    };

    connect();
    return () => {
      keepTrying = false;
      cleanupRequested = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws && ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) {
        try { ws.close(); } catch (e) { console.warn("WS cleanup failed", e); }
      }
    };
  }, [baseUrl, recordDeviceEvent, resolvePowerStateWithForcedOff, setDevices, setLastRefresh, setStatusMessage]);
}
