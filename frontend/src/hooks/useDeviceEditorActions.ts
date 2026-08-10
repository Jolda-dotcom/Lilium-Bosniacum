import { useCallback } from "react";
import { isValidIp, isValidMac } from "../utils/device";
import { showTransientStatusMessage } from "../utils/app";
import type { Dispatch, SetStateAction } from "react";
import type { Device, Group, MessageModalState } from "../types/app";

interface UseDeviceEditorActionsOptions {
  baseUrl: string;
  devices: Device[];
  groups: Group[];
  editingId: number | null;
  deviceName: string;
  deviceIp: string;
  deviceMac: string;
  deviceBrand: string;
  modalGroupId: number | null;
  selectedDeviceId: number | null;
  pendingDelete: number | null;
  showModal: boolean;
  showDiscoveryModal: boolean;
  messageModal: MessageModalState | null;
  setDevices: Dispatch<SetStateAction<Device[]>>;
  setEditingId: Dispatch<SetStateAction<number | null>>;
  setDeviceName: Dispatch<SetStateAction<string>>;
  setDeviceIp: Dispatch<SetStateAction<string>>;
  setDeviceMac: Dispatch<SetStateAction<string>>;
  setDeviceBrand: Dispatch<SetStateAction<string>>;
  setModalGroupId: Dispatch<SetStateAction<number | null>>;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  setSelectedDeviceId: Dispatch<SetStateAction<number | null>>;
  setPendingDelete: Dispatch<SetStateAction<number | null>>;
  setShowDeleteConfirm: Dispatch<SetStateAction<boolean>>;
  setShowDiscoveryModal: Dispatch<SetStateAction<boolean>>;
  setMessageModal: Dispatch<SetStateAction<MessageModalState | null>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
  setDetailTab: Dispatch<SetStateAction<"info" | "schedule">>;
  showMessage: (title: string, message: string) => void;
}

export function useDeviceEditorActions({
  baseUrl,
  devices,
  groups,
  editingId,
  deviceName,
  deviceIp,
  deviceMac,
  deviceBrand,
  modalGroupId,
  selectedDeviceId,
  pendingDelete,
  setDevices,
  setEditingId,
  setDeviceName,
  setDeviceIp,
  setDeviceMac,
  setDeviceBrand,
  setModalGroupId,
  setShowModal,
  setSelectedDeviceId,
  setPendingDelete,
  setShowDeleteConfirm,
  setShowDiscoveryModal,
  setMessageModal,
  setStatusMessage,
  setDetailTab,
  showMessage,
}: UseDeviceEditorActionsOptions) {
  const clearModalFields = useCallback(() => {
    setDeviceName("");
    setDeviceIp("");
    setDeviceMac("");
    setDeviceBrand("generic");
    setModalGroupId(null);
  }, [setDeviceBrand, setDeviceIp, setDeviceMac, setDeviceName, setModalGroupId]);

  const handleOpenModal = useCallback(() => {
    setEditingId(null);
    clearModalFields();
    setShowModal(true);
  }, [clearModalFields, setEditingId, setShowModal]);

  const handleSave = useCallback(async () => {
    if (!deviceName || !deviceIp || !deviceMac) {
      showMessage("Greška", "Popuni sva polja");
      return;
    }

    if (!isValidIp(deviceIp)) {
      showMessage("Greška", "IP adresa nije ispravna. Unesi format 192.168.1.10.");
      return;
    }

    if (!isValidMac(deviceMac)) {
      showMessage("Greška", "MAC adresa nije ispravna. Unesi format AA:BB:CC:DD:EE:FF.");
      return;
    }

    const payload = {
      name: deviceName,
      ip: deviceIp,
      mac: deviceMac,
      brand: deviceBrand,
      groupId: modalGroupId,
    };

    try {
      if (editingId !== null) {
        const response = await fetch(`${baseUrl}/devices/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          showMessage("Greška", `Greška pri uređivanju uređaja: ${errorData?.error || response.statusText}`);
          return;
        }

        setDevices((prev) =>
          prev.map((device) =>
            device.id === editingId
              ? {
                  ...device,
                  name: deviceName,
                  ip: deviceIp,
                  mac: deviceMac,
                  brand: deviceBrand,
                  groupId: modalGroupId,
                  groupName: groups.find((group) => group.id === modalGroupId)?.name || null,
                }
              : device
          )
        );
        setEditingId(null);
      } else {
        const response = await fetch(`${baseUrl}/devices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          showMessage("Greška", `Greška pri dodavanju uređaja: ${errorData?.error || response.statusText}`);
          return;
        }

        const newDevice = await response.json();
        setDevices((prev) => [
          ...prev,
          {
            ...newDevice,
            brand: newDevice.brand || "generic",
            powerState: newDevice.powerState || newDevice.power_state || "Off",
            selected: false,
            groupId: modalGroupId,
            groupName: groups.find((group) => group.id === modalGroupId)?.name || null,
          },
        ]);
      }

      clearModalFields();
      setShowModal(false);
      showTransientStatusMessage(setStatusMessage, "Uređaj je uspješno spremljen.", 2500);
    } catch (error) {
      console.error("Spremanje uređaja nije uspjelo:", error);
      showMessage("Greška", "Greška pri spremanju uređaja. Provjeri je li backend pokrenut.");
    }
  }, [baseUrl, clearModalFields, deviceBrand, deviceIp, deviceMac, deviceName, editingId, groups, modalGroupId, setDevices, setEditingId, setShowModal, setStatusMessage, showMessage]);

  const handleDelete = useCallback(async (id: number) => {
    await fetch(`${baseUrl}/devices/${id}`, { method: "DELETE" });

    setDevices((prev) => prev.filter((device) => device.id !== id));

    if (selectedDeviceId === id) {
      setSelectedDeviceId(null);
    }
  }, [baseUrl, selectedDeviceId, setDevices, setSelectedDeviceId]);

  const confirmDelete = useCallback(async () => {
    if (pendingDelete === null) return;
    await handleDelete(pendingDelete);
    setPendingDelete(null);
    setShowDeleteConfirm(false);
  }, [handleDelete, pendingDelete, setPendingDelete, setShowDeleteConfirm]);

  const cancelDelete = useCallback(() => {
    setPendingDelete(null);
    setShowDeleteConfirm(false);
  }, [setPendingDelete, setShowDeleteConfirm]);

  const handleViewDevice = useCallback((id: number) => {
    setSelectedDeviceId(id);
    setDetailTab("schedule");
  }, [setSelectedDeviceId, setDetailTab]);

  return {
    clearModalFields,
    handleOpenModal,
    handleSave,
    handleDelete,
    confirmDelete,
    cancelDelete,
    handleViewDevice,
  };
}
