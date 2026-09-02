export type AppPage = "dashboard" | "devices" | "groups" | "audit" | "settings" | "users" | "notfound";

export function getActivePage(pathname: string): AppPage {
  switch (pathname) {
    case "/":
      return "dashboard";
    case "/devices":
      return "devices";
    case "/groups":
      return "groups";
    case "/audit":
      return "audit";
    case "/settings":
      return "settings";
    case "/users":
      return "users";
    default:
      return "notfound";
  }
}

export function normalizeBackendUrl(url: string) {
  return url.replace(/\/$/, "");
}

export function showTransientStatusMessage(
  setStatusMessage: (value: string) => void,
  message: string,
  delay = 2500
) {
  setStatusMessage(message);
  window.setTimeout(() => setStatusMessage(""), delay);
}
