import type { AuditLogEntry, Device, Group } from '../types/app';

export type UseAuditPagePropsOptions = {
  baseState: {
    auditDeviceFilter: string;
    setAuditDeviceFilter: (value: string) => void;
    auditGroupFilter: string;
    setAuditGroupFilter: (value: string) => void;
    auditLoading: boolean;
    devices: Device[];
    groups: Group[];
    auditLogs: AuditLogEntry[];
    auditPage: number;
    setAuditPage: (value: number) => void;
    auditPageSize: number;
    auditTotalCount: number;
  };
  loadAuditLogs: () => Promise<void>;
};

export function buildAuditProps(options: UseAuditPagePropsOptions) {
  const { baseState, loadAuditLogs } = options;

  return {
    auditDeviceFilter: baseState.auditDeviceFilter,
    setAuditDeviceFilter: baseState.setAuditDeviceFilter,
    auditGroupFilter: baseState.auditGroupFilter,
    setAuditGroupFilter: baseState.setAuditGroupFilter,
    loadAuditLogs,
    auditLoading: baseState.auditLoading,
    devices: baseState.devices,
    groups: baseState.groups,
    auditLogs: baseState.auditLogs,
    auditPage: baseState.auditPage,
    setAuditPage: baseState.setAuditPage,
    auditPageSize: baseState.auditPageSize,
    auditTotalCount: baseState.auditTotalCount,
  };
}
