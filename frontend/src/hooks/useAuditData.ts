import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AuditLogEntry } from "../types/app";

interface UseAuditDataOptions {
  baseUrl: string;
  auditPage: number;
  auditPageSize: number;
  setAuditLogs: Dispatch<SetStateAction<AuditLogEntry[]>>;
  setAuditTotalCount: Dispatch<SetStateAction<number>>;
  setAuditLoading: Dispatch<SetStateAction<boolean>>;
  setAuditPage: Dispatch<SetStateAction<number>>;
}

export function useAuditData(options: UseAuditDataOptions) {
  const { baseUrl, auditPage, auditPageSize, setAuditLogs, setAuditTotalCount, setAuditLoading, setAuditPage } = options;

  const loadAuditLogs = useCallback(async (deviceId = "all", groupId = "all", page = auditPage, pageSize = auditPageSize) => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(pageSize));
      if (deviceId && deviceId !== "all") params.set("deviceId", deviceId);
      if (groupId && groupId !== "all") params.set("groupId", groupId);
      const response = await fetch(`${baseUrl}/audit-logs?${params.toString()}`);
      const data = await response.json();
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const total = typeof data?.total === "number" ? data.total : items.length;
      setAuditLogs(items);
      setAuditTotalCount(total);
      setAuditPage(page);
    } catch (error) {
      console.error("Učitavanje audit loga nije uspjelo:", error);
      setAuditLogs([]);
      setAuditTotalCount(0);
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage, auditPageSize, baseUrl, setAuditLoading, setAuditLogs, setAuditPage, setAuditTotalCount]);

  return { loadAuditLogs };
}
