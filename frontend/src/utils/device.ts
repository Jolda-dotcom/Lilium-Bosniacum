export const isValidIp = (ip: string) =>
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(ip);

export const isValidMac = (mac: string) =>
  /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac)
  && mac.replace(/[:-]/g, "").toLowerCase() !== "000000000000"
  && mac.replace(/[:-]/g, "").toLowerCase() !== "ffffffffffff";

export const formatStatusText = (status: string) => {
  if (status === "Online") return "Na mreži";
  if (status === "Offline") return "Van mreže";
  return status;
};

export const formatPowerText = (powerState: string) => {
  if (powerState === "On") return "Uključen";
  if (powerState === "Off") return "Ugašen";
  return powerState;
};
