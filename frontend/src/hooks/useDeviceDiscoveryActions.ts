import { useCallback } from "react";
import type { UseDeviceActionsOptions } from "./useDeviceActions";

export function useDeviceDiscoveryActions({
  baseUrl,
  discoveredDevices,
  selectedDiscoveredDevices,
  refreshAll,
  setDiscoveryLoading,
  setDiscoveredDevices,
  setSelectedDiscoveredDevices,
  setShowDiscoveryModal,
  showToast,
}: UseDeviceActionsOptions) {
  const handleStartDiscovery = useCallback(async () => {
    setDiscoveryLoading(true);
    setDiscoveredDevices([]);
    setSelectedDiscoveredDevices(new Set());

    try {
      const retryDelays = [0, 800, 1600];
      const clickId = `scan-${Date.now()}`;

      const discoverOnce = async (attempt: number) => {
        const response = await fetch(
          `${baseUrl}/devices/discover?clickId=${encodeURIComponent(clickId)}&clientAttempt=${attempt + 1}`,
          {
            credentials: "include",
            headers: {
              "X-Discovery-Click-Id": clickId,
              "X-Discovery-Client-Attempt": String(attempt + 1),
            },
          }
        );
        const traceId = response.headers.get("X-Discovery-Trace-Id") || "n/a";

        if (!response.ok) {
          const responseText = await response.text().catch(() => "");
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData?.error || errorData?.message || errorMessage;
          } catch {
            if (responseText) errorMessage = responseText;
          }
          console.error(`[Discovery][${clickId}] Attempt ${attempt + 1} failed. status=${response.status}, traceId=${traceId}, error=${errorMessage}`);
          throw new Error(`[trace ${traceId}] ${errorMessage}`);
        }

        const data = await response.json();
        if (!data?.success) {
          const message = data?.error || "Discovery request failed";
          console.error(`[Discovery][${clickId}] Attempt ${attempt + 1} returned unsuccessful payload. traceId=${data?.traceId || traceId}, error=${message}`);
          throw new Error(`[trace ${data?.traceId || traceId}] ${message}`);
        }

        console.info(`[Discovery][${clickId}] Attempt ${attempt + 1} success. traceId=${data?.traceId || traceId}, count=${Array.isArray(data?.devices) ? data.devices.length : 0}`);
        return data;
      };

      let data: { success: boolean; devices?: Array<{ ip: string; mac?: string; name?: string; brand?: string }> } | null = null;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < retryDelays.length; attempt++) {
        try {
          if (retryDelays[attempt] > 0) {
            await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
          }
          data = await discoverOnce(attempt);
          break;
        } catch (attemptError) {
          lastError = attemptError;
          console.warn(`[Discovery][${clickId}] Skeniranje nije uspjelo (pokušaj ${attempt + 1}/${retryDelays.length})`, attemptError);
        }
      }

      if (!data) {
        throw lastError || new Error("Skeniranje nije uspjelo");
      }

      if (data.success && data.devices) {
        setDiscoveredDevices(data.devices);
        if (data.devices.length === 0) {
          showToast("info", "Skeniranje", "Nisu pronađeni TV uređaji na mreži");
        } else {
          showToast("success", "Skeniranje", `Pronađeno ${data.devices.length} TV uređaja`);
        }
      }
    } catch (error) {
      console.error("Discovery error:", error);
      showToast("error", "Greška", "Greška pri skeniranju");
    } finally {
      setDiscoveryLoading(false);
    }
  }, [baseUrl, refreshAll, setDiscoveryLoading, setDiscoveredDevices, setSelectedDiscoveredDevices, showToast]);

  const handleAddDiscoveredDevices = useCallback(async () => {
    if (selectedDiscoveredDevices.size === 0) {
      showToast("info", "Skeniranje", "Odaberi barem jedan TV");
      return;
    }

    try {
      let successCount = 0;
      let failureCount = 0;

      for (const ip of selectedDiscoveredDevices) {
        const device = discoveredDevices.find((d) => d.ip === ip);
        if (!device) continue;
        const candidateMac = (device.mac || "").trim();

        try {
          const response = await fetch(`${baseUrl}/devices`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: device.name || `TV (${ip})`,
              ip: device.ip,
              mac: candidateMac || `02:${ip.split(".").map((p) => parseInt(p).toString(16).padStart(2, "0")).join(":")}`,
              brand: device.brand || "generic",
              groupId: null,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            const errData = await response.json().catch(() => ({}));
            console.error(`Failed to add device ${ip}:`, errData?.error);
            failureCount++;
          }
        } catch (err) {
          console.error(`Error adding device ${ip}:`, err);
          failureCount++;
        }
      }

      setShowDiscoveryModal(false);
      setSelectedDiscoveredDevices(new Set());
      setDiscoveredDevices([]);

      if (successCount > 0) {
        showToast("success", "Uspješno dodano", `${successCount} TV-a dodano u bazu`);
        await refreshAll();
      }

      if (failureCount > 0) {
        showToast(
          "error",
          "Greška pri dodavanju",
          `${failureCount} uređaj(a) nije dodano jer MAC nije bio validan ili greška pri dodavanju. Pokreni skeniranje ponovo dok je TV uključen.`
        );
      }
    } catch (error) {
      console.error("Add discovered devices error:", error);
      showToast("error", "Greška", "Greška pri dodavanju TV-a");
    }
  }, [baseUrl, discoveredDevices, selectedDiscoveredDevices, refreshAll, setDiscoveredDevices, setSelectedDiscoveredDevices, setShowDiscoveryModal, showToast]);

  const closeDiscoveryModal = useCallback(() => {
    setShowDiscoveryModal(false);
    setDiscoveredDevices([]);
    setSelectedDiscoveredDevices(new Set());
  }, [setDiscoveredDevices, setSelectedDiscoveredDevices, setShowDiscoveryModal]);

  return {
    handleStartDiscovery,
    handleAddDiscoveredDevices,
    closeDiscoveryModal,
  };
}
