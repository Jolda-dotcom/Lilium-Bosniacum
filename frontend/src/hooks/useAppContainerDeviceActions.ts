import { useDevicePowerActions } from "./useDevicePowerActions";
import { useDeviceDiscoveryActions } from "./useDeviceDiscoveryActions";
import { useDeviceGroupActions } from "./useDeviceGroupActions";
import { useDeviceSelectionActions } from "./useDeviceSelectionActions";
import type { UseDeviceActionsOptions } from "./useDeviceActions";

export function useAppContainerDeviceActions(
  options: UseDeviceActionsOptions & { setDiscoveryModalOpen: (open: boolean) => void }
) {
  const { setDiscoveryModalOpen, ...deviceActionOptions } = options;

  const wrappedOptions = {
    ...deviceActionOptions,
    setShowDiscoveryModal: setDiscoveryModalOpen,
  } as UseDeviceActionsOptions;

  const {
    handlePowerOnAll,
    handlePowerOffAll,
    handlePowerOffDevice,
    handlePowerOnDevice,
    handleRestartDevice,
    handleSendDeviceAction,
  } = useDevicePowerActions(wrappedOptions);

  const {
    handleStartDiscovery,
    handleAddDiscoveredDevices,
    closeDiscoveryModal,
  } = useDeviceDiscoveryActions(wrappedOptions);

  const {
    handleCreateGroup,
    handleRestartGroup,
    handlePowerOnGroup,
    handlePowerOffGroup,
    openAssignGroupModal,
    assignGroupToSelected,
  } = useDeviceGroupActions(wrappedOptions);

  const {
    handleDeleteSelected,
    handleRestartSelected,
    toggleDevice,
  } = useDeviceSelectionActions(wrappedOptions);

  return {
    handlePowerOnAll,
    handlePowerOffAll,
    handlePowerOffDevice,
    handlePowerOnDevice,
    handleRestartDevice,
    handleSendDeviceAction,
    handleStartDiscovery,
    handleAddDiscoveredDevices,
    closeDiscoveryModal,
    handleCreateGroup,
    handleRestartGroup,
    handlePowerOnGroup,
    handlePowerOffGroup,
    openAssignGroupModal,
    assignGroupToSelected,
    handleDeleteSelected,
    handleRestartSelected,
    toggleDevice,
  };
}
