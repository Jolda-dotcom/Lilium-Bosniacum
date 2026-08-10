import type { Group } from '../types/app';

export type UseGroupsPagePropsOptions = {
  baseState: {
    groupName: string;
    setGroupName: (value: string) => void;
  };
  deviceHooks: {
    groupStatusSummary: Array<Group & { onlineCount: number; offlineCount: number }>;
    handleCreateGroup: () => void;
    handleRestartGroup: (id: number) => void;
    handlePowerOnGroup: (id: number) => void;
    handlePowerOffGroup: (id: number) => void;
    handleOpenAuditForGroup: (id: number) => void;
  };
};

export function buildGroupsProps(options: UseGroupsPagePropsOptions) {
  const { baseState, deviceHooks } = options;

  return {
    groupStatusSummary: deviceHooks.groupStatusSummary,
    groupName: baseState.groupName,
    setGroupName: baseState.setGroupName,
    handleCreateGroup: deviceHooks.handleCreateGroup,
    handleRestartGroup: deviceHooks.handleRestartGroup,
    handlePowerOnGroup: deviceHooks.handlePowerOnGroup,
    handlePowerOffGroup: deviceHooks.handlePowerOffGroup,
    handleOpenAuditForGroup: deviceHooks.handleOpenAuditForGroup,
  };
}
