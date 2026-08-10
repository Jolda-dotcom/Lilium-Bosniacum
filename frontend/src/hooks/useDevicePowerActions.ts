import { useCallback } from "react";
import { showTransientStatusMessage } from "../utils/app";
import type { UseDeviceActionsOptions } from "./useDeviceActions";

export function useDevicePowerActions({
  baseUrl,
  devices,
  refreshAll,
  recordDeviceEvent,
  showToast,
  showMessage,
  setStatusMessage,
  setDevices,
  forcedOffIdsRef,
}: UseDeviceActionsOptions) {
  const applyOptimisticPowerOffState = useCallback(
    (ids: number[]) => {
      if (ids.length === 0) return;
      ids.forEach((id) => forcedOffIdsRef.current.add(id));
      setDevices((prev) =>
        prev.map((device) =>
          ids.includes(device.id)
            ? { ...device, powerState: "Off", power_state: "Off" }
            : device
        )
      );
    },
    [forcedOffIdsRef, setDevices]
  );

  const handlePowerOnAll = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/devices/poweron-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        showMessage(
          "Greška",
          `Nije uspjelo paljenje svih TV-a: ${errorData?.error || response.statusText}`
        );
        return;
      }

      const data = (await response.json()) as { results?: Array<{ poweredOn?: boolean }> };
      const results = data.results ?? [];
      forcedOffIdsRef.current.clear();
      showTransientStatusMessage(
        setStatusMessage,
        `Poslano WOL svim uređajima. Uspješno upaljeno ${results.filter((item) => item.poweredOn).length} od ${results.length}.`,
        4000
      );
      await refreshAll();
    } catch (error) {
      console.error("Greska pri paljenju svih TV-a:", error);
      showMessage("Greška", "Greška pri paljenju svih TV-a.");
    }
  }, [baseUrl, forcedOffIdsRef, refreshAll, setStatusMessage, showMessage]);

  const handlePowerOffAll = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/devices/poweroff-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        showMessage(
          "Greška",
          `Nije uspjelo gašenje svih TV-a: ${errorData?.error || response.statusText}`
        );
        return;
      }

      const data = (await response.json()) as { results?: Array<{ poweredOff?: boolean }> };
      const results = data.results ?? [];
      showTransientStatusMessage(
        setStatusMessage,
        `Poslano gašenje svim uređajima. Ugašeno ${results.filter((item) => item.poweredOff).length} od ${results.length}.`,
        4000
      );
      await refreshAll();
    } catch (error) {
      console.error("Greska pri gašenju svih TV-a:", error);
      showMessage("Greška", "Greška pri gašenju svih TV-a.");
    }
  }, [baseUrl, refreshAll, setStatusMessage, showMessage]);

  const handlePowerOffDevice = useCallback(
    async (id: number) => {
      const device = devices.find((d) => d.id === id);
      if (device) {
        forcedOffIdsRef.current.add(id);
        setDevices((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, powerState: "Off", power_state: "Off" } : d
          )
        );
        recordDeviceEvent({ ...device, powerState: "Off" }, "Manual power off requested");
        showTransientStatusMessage(setStatusMessage, "Zahtjev za gašenje poslan (status ažuriran lokalno).", 3000);
      }

      try {
        const response = await fetch(`${baseUrl}/devices/${id}/poweroff`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          forcedOffIdsRef.current.delete(id);
          showMessage("Greška pri gašenju", errorData?.reason || errorData?.error || `Greška: ${response.statusText}`);
          await refreshAll();
          return;
        }

        const data = await response.json();
        if (!data.success) {
          forcedOffIdsRef.current.delete(id);
          showMessage("Gašenje nije uspjelo", data.reason || "Nepoznana greška");
          await refreshAll();
        }
      } catch (error) {
        forcedOffIdsRef.current.delete(id);
        console.error("Greska pri gašenju uređaja:", error);
        showMessage("Greška", "Greška pri gašenju uređaja.");
        await refreshAll();
      }
    },
    [baseUrl, devices, forcedOffIdsRef, recordDeviceEvent, refreshAll, setDevices, setStatusMessage, showMessage]
  );

  const handlePowerOnDevice = useCallback(
    async (id: number) => {
      showToast("info", "Uključivanje", "Šaljem WoL paket za paljenje TV-a...");
      const device = devices.find((d) => d.id === id);
      if (device) {
        forcedOffIdsRef.current.delete(id);
        setDevices((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, powerState: "On", power_state: "On" } : d
          )
        );
        recordDeviceEvent({ ...device, powerState: "On" }, "Manual power on requested");
      }

      try {
        const response = await fetch(`${baseUrl}/devices/${id}/poweron`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          showToast("error", "Greška", `Nije uspjelo paljenje: ${errorData?.reason || errorData?.error || response.statusText}`);
          await refreshAll();
          return;
        }

        const data = await response.json();
        if (data.success) {
          showToast("success", "Zahtjev poslan", "WoL paket poslan. TV će se upaliti ako je WoL aktivan (Quick Start+ u postavkama TV-a).");
        } else {
          showToast("error", "Nije uspjelo", `Paljenje nije potvrđeno: ${data.reason || "Provjeri je li 'Quick Start+' uključen u postavkama LG TV-a"}.`);
        }
        await refreshAll();
      } catch (error) {
        console.error("Greska pri paljenju uređaja:", error);
        showToast("error", "Greška", "Greška pri paljenju uređaja.");
        await refreshAll();
      }
    },
    [baseUrl, devices, forcedOffIdsRef, refreshAll, recordDeviceEvent, setDevices, showToast]
  );

  const handleRestartDevice = useCallback(
    async (id: number) => {
      showToast("info", "Restart", "Šaljem naredbu za restart TV-a...");

      try {
        const response = await fetch(`${baseUrl}/devices/${id}/restart`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          showToast("error", "Greška", `Nije uspio restart: ${errorData?.reason || errorData?.error || response.statusText}`);
          return;
        }

        const data = await response.json();
        if (data.restarted && data.method === "webos") {
          showToast("success", "Restart pokrenuto", "TV se gasi... pokrenut će se automatski za otprilike 15-30 sekundi.");
        } else if (data.restarted) {
          showToast("success", "Restart poslan", `Zahtjev poslan za ${data.name || "uređaj"}.`);
        } else {
          showToast("info", "Restart zahtjev", "Restart zahtjev je poslan, ali nije potvrđen. Ako TV ima WoL, trebao bi se pokrenuti za nekoliko sekundi.");
        }
        await refreshAll();
      } catch (error) {
        console.error("Greska pri restartu uređaja:", error);
        showToast("error", "Greška", "Greška pri restartu uređaja.");
      }
    },
    [baseUrl, refreshAll, showToast]
  );

  const handleSendDeviceAction = useCallback(
    async (id: number, action: string, params: Record<string, unknown> = {}) => {
      if (!id || !action) return;
      try {
        const device = devices.find((d) => d.id === id);
        if (!device) {
          showMessage("Greška", "Uređaj nije pronađen.");
          return;
        }
        const response = await fetch(`${baseUrl}/devices/${id}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, action_params: params }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          showMessage("Greška", errorData?.error || "Nije moguće poslati akciju uređaju.");
          return;
        }
        showMessage("Info", `Akcija ${action} poslana.`);
      } catch (error) {
        console.error("Greška pri slanju akcije uređaju:", error);
        showMessage("Greška", "Akcija uređaju nije uspjela.");
      }
    },
    [baseUrl, devices, showMessage]
  );

  return {
    handlePowerOnAll,
    handlePowerOffDevice,
    handlePowerOnDevice,
    handleRestartDevice,
    handlePowerOffAll,
    handleSendDeviceAction,
  };
}
