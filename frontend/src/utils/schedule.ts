import type { Device } from "../types/app";

export interface ScheduleActionOption {
  value: string;
  label: string;
  supportedBrands: string[];
  description: string;
  requiresParameter?: boolean;
  parameterLabel?: string;
}

export const scheduleActions: ScheduleActionOption[] = [
  { value: "poweron", label: "Uključi TV", supportedBrands: ["all"], description: "Uključi uređaj pomoću WOL ili branda." },
  { value: "poweroff", label: "Isključi TV", supportedBrands: ["all"], description: "Isključi uređaj putem dostupnog protokola." },
  { value: "restart", label: "Restart TV", supportedBrands: ["all"], description: "Pošalji restart naredbu ili WOL paket." },
  { value: "launchApp", label: "Otvori aplikaciju / URL", supportedBrands: ["webos"], description: "Pokreni aplikaciju ili otvori URL na webOS uređaju.", requiresParameter: true, parameterLabel: "App ID ili URL" },
  { value: "mute", label: "Mute zvuk", supportedBrands: ["webos", "samsung"], description: "Isključi zvuk na podržanom uređaju." },
  { value: "unmute", label: "Unmute zvuk", supportedBrands: ["webos", "samsung"], description: "Uključi zvuk na podržanom uređaju." },
  { value: "volumeUp", label: "Pojačaj zvuk", supportedBrands: ["webos", "samsung"], description: "Povećaj glasnoću na podržanom uređaju." },
  { value: "volumeDown", label: "Smanji zvuk", supportedBrands: ["webos", "samsung"], description: "Smanji glasnoću na podržanom uređaju." },
  { value: "setVolume", label: "Postavi jačinu zvuka", supportedBrands: ["webos"], description: "Postavi preciznu jačinu zvuka 0-100.", requiresParameter: true, parameterLabel: "Volumen 0-100" },
];

export const getAvailableActionsForDevice = (device: Device | null) => {
  if (!device) {
    return scheduleActions;
  }

  const brand = device.brand?.toLowerCase() || "generic";
  return scheduleActions.filter((action) =>
    action.supportedBrands.includes("all") || action.supportedBrands.includes(brand)
  );
};

export const normalizeCronExpression = (expression: string) => {
  const trimmed = expression.trim();
  const timePattern = /^([01]?\d|2[0-3]):([0-5]\d)$/;
  if (timePattern.test(trimmed)) {
    const match = trimmed.match(timePattern);
    if (!match) return null;
    const [, hour, minute] = match;
    return `${minute} ${hour} * * *`;
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length < 5 || parts.length > 6) {
    return null;
  }

  return trimmed;
};

export const isCronValid = (expression: string) => {
  const normalized = normalizeCronExpression(expression);
  if (!normalized) {
    return false;
  }

  const parts = normalized.split(/\s+/);
  const fieldPattern = /^([*]|[0-9]|[1-5]?[0-9]|[1-2]?[0-9]|[1-3]?[0-9]|[1-7]|[0-9]-[0-9]|[0-9](,\s*[0-9])*(\/\d+)?|\*[/][0-9]+|[0-9]+-[0-9]+(\/\d+)?)$/;
  return parts.every((field) => fieldPattern.test(field) || field.includes("*") || field.includes("/") || field.includes(",") || field.includes("-"));
};

export const getActionLabel = (action: string) => {
  switch (action) {
    case "poweron":
      return "Uključi TV";
    case "poweroff":
      return "Isključi TV";
    case "restart":
      return "Restart TV";
    case "launchApp":
      return "Otvori aplikaciju / URL";
    case "mute":
      return "Mute zvuk";
    case "unmute":
      return "Unmute zvuk";
    case "volumeUp":
      return "Pojačaj zvuk";
    case "volumeDown":
      return "Smanji zvuk";
    case "setVolume":
      return "Postavi jačinu zvuka";
    default:
      return action;
  }
};

export const formatClock = (value: number) => String(value).padStart(2, "0");

export const buildCronExpression = (hour: number, minute: number, days: number[]) => {
  if (!Array.isArray(days) || days.length === 0) {
    return "0 0 * * *";
  }

  const sortedDays = [...days].sort((a, b) => a - b);
  return `${minute} ${hour} * * ${sortedDays.join(",")}`;
};

export const buildScheduleActionParams = (action: string, actionTarget: string) => {
  switch (action) {
    case "launchApp":
      return { target: actionTarget.trim() };
    case "setVolume":
      return { volume: Number(actionTarget) };
    default:
      return {};
  }
};

export const createScheduleActionSequence = (action: string, actionTarget: string) => {
  const primaryAction = action || "poweron";

  if (primaryAction === "poweron" || !primaryAction) {
    return [{ action: "poweron" }];
  }

  return [
    { action: "poweron" },
    { action: primaryAction, params: buildScheduleActionParams(primaryAction, actionTarget) },
  ];
};
