import { useCallback } from "react";
import type { UseDeviceActionsOptions } from "./useDeviceActions";

export function useDeviceSelectionActions({
  baseUrl,
  devices,
  setDevices,
  showConfirm,
  showMessage,
  refreshAll,
}: UseDeviceActionsOptions) {
  const handleDeleteSelectedConfirmed = useCallback(async () => {
    const selectedDevices = devices.filter((device) => device.selected);
    if (selectedDevices.length === 0) {
      showMessage("Greška", "Nema označenih uređaja.");
      return;
    }

    await Promise.all(
      selectedDevices.map((device) =>
        fetch(`${baseUrl}/devices/${device.id}`, {
          method: "DELETE",
        })
      )
    );

    setDevices(devices.filter((device) => !device.selected));
  }, [baseUrl, devices, setDevices, showMessage]);

  const handleDeleteSelected = useCallback(() => {
    const selectedDevices = devices.filter((device) => device.selected);
    if (selectedDevices.length === 0) {
      showMessage("Greška", "Nema označenih uređaja.");
      return;
    }

    showConfirm(
      "Potvrda brisanja",
      "Obrisati označene uređaje?",
      handleDeleteSelectedConfirmed,
      "Obriši",
      "Odustani"
    );
  }, [devices, handleDeleteSelectedConfirmed, showConfirm, showMessage]);

  const handleRestartSelected = useCallback(async () => {
    const selectedIds = devices.filter((device) => device.selected).map((device) => device.id);
    if (selectedIds.length === 0) {
      showMessage("Greška", "Nema označenih uređaja.");
      return;
    }

    showMessage("Info", `Saljem naredbu za restart ${selectedIds.length} uredaj(a)...`);

    await fetch(`${baseUrl}/devices/restart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds }),
    });

    showMessage("Info", `Restart pokrenut za ${selectedIds.length} uređaj(a). WebOS TV-i se gase i pale automatski za otprilike 15-30 sekundi.`);
  }, [baseUrl, devices, showMessage]);

  const toggleDevice = useCallback(
    (id: number) => {
      setDevices(
        devices.map((device) =>
          device.id === id ? { ...device, selected: !device.selected } : device
        )
      );
    },
    [devices, setDevices]
  );

  return {
    handleDeleteSelectedConfirmed,
    handleDeleteSelected,
    handleRestartSelected,
    toggleDevice,
  };
}
