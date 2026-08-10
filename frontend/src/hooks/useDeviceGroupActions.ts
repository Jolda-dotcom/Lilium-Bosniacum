import { useCallback } from "react";
import type { UseDeviceActionsOptions } from "./useDeviceActions";

export function useDeviceGroupActions({
  baseUrl,
  devices,
  groups,
  groupName,
  refreshAll,
  setGroupName,
  selectedAssignGroupId,
  setSelectedAssignGroupId,
  setShowAssignGroupModal,
  forcedOffIdsRef,
  showMessage,
}: UseDeviceActionsOptions) {
  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
      showMessage("Greška", "Unesite naziv grupe.");
      return;
    }

    await fetch(`${baseUrl}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupName.trim() }),
    });

    setGroupName("");
    await refreshAll();
    showMessage("Info", "Grupa je kreirana.");
  }, [baseUrl, groupName, refreshAll, setGroupName, showMessage]);

  const handleRestartGroup = useCallback(async (groupId: number) => {
    showMessage("Info", "Restart grupe");
    await fetch(`${baseUrl}/groups/${groupId}/restart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    showMessage("Info", "Restart pokrenuto");
  }, [baseUrl, showMessage]);

  const handlePowerOnGroup = useCallback(async (groupId: number) => {
    try {
      const response = await fetch(`${baseUrl}/groups/${groupId}/poweron`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        showMessage("Greška", `Nije uspjelo paljenje grupe: ${errorData?.error || response.statusText}`);
        return;
      }

      const data = (await response.json()) as { results?: Array<{ poweredOn?: boolean }> };
      const count = (data.results ?? []).filter((item) => item.poweredOn).length;
      const groupDeviceIds = devices.filter((device) => device.groupId === groupId).map((device) => device.id);
      groupDeviceIds.forEach((id) => forcedOffIdsRef.current.delete(id));
      showMessage("Info", `Poslano paljenje grupe. Uspješno upaljeno ${count} uređaja.`);
      await refreshAll();
    } catch (error) {
      console.error("Greška pri paljenju grupe:", error);
      showMessage("Greška", "Greška pri paljenju grupe.");
    }
  }, [baseUrl, devices, forcedOffIdsRef, refreshAll, showMessage]);

  const handlePowerOffGroup = useCallback(async (groupId: number) => {
    const groupDeviceIds = devices.filter((device) => device.groupId === groupId).map((device) => device.id);
    try {
      const response = await fetch(`${baseUrl}/groups/${groupId}/poweroff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        showMessage("Greška", `Nije uspjelo gašenje grupe: ${errorData?.error || response.statusText}`);
        await refreshAll();
        return;
      }

      const data = (await response.json()) as { results?: Array<{ poweredOff?: boolean }> };
      const successCount = (data.results ?? []).filter((item) => item.poweredOff).length;
      showMessage("Info", `Poslano gašenje grupe. Ugašeno ${successCount} uređaja.`);
    } catch (error) {
      console.error("Greška pri gašenju grupe:", error);
      showMessage("Greška", "Greška pri gašenju grupe.");
      await refreshAll();
    }
  }, [baseUrl, devices, refreshAll, showMessage]);

  const openAssignGroupModal = useCallback(() => {
    const selectedDevices = devices.filter((device) => device.selected);
    if (selectedDevices.length === 0) {
      showMessage("Greška", "Označi uređaje prije dodjeljivanja grupe.");
      return;
    }

    if (groups.length === 0) {
      showMessage("Greška", "Nema dostupnih grupa. Kreiraj grupu prvo.");
      return;
    }

    setSelectedAssignGroupId(null);
    setShowAssignGroupModal(true);
  }, [devices, groups.length, setSelectedAssignGroupId, setShowAssignGroupModal, showMessage]);

  const assignGroupToSelected = useCallback(async () => {
    if (selectedAssignGroupId === null) {
      showMessage("Greška", "Izaberi grupu za dodjelu.");
      return;
    }

    await fetch(`${baseUrl}/groups/${selectedAssignGroupId}/devices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceIds: devices.filter((device) => device.selected).map((device) => device.id),
      }),
    });

    await refreshAll();
    setShowAssignGroupModal(false);
    setSelectedAssignGroupId(null);
  }, [baseUrl, devices, refreshAll, selectedAssignGroupId, setSelectedAssignGroupId, setShowAssignGroupModal, showMessage]);

  return {
    handleCreateGroup,
    handleRestartGroup,
    handlePowerOnGroup,
    handlePowerOffGroup,
    openAssignGroupModal,
    assignGroupToSelected,
  };
}
