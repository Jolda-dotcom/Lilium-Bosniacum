const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toNumberOr = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeBrand = (brand) => String(brand || "").trim().toLowerCase();

const buildRestartProfile = (device = {}) => {
  const brand = normalizeBrand(device.brand);

  const baseProfile = {
    initialDelayMs: 18000,
    maxAttempts: 8,
    burstCount: 3,
    burstPauseMs: 400,
    postWakePingDelayMs: 6000,
    betweenAttemptsDelayMs: 7000,
    failedWakeBackoffMs: 5000,
  };

  if (brand === "webos" || brand === "lg") {
    const status = String(device.status || "").toLowerCase();
    const power = String(device.power_state || device.powerState || "").toLowerCase();
    const name = String(device.name || "").toLowerCase();

    if (status === "offline" || power === "off") {
      baseProfile.initialDelayMs = 22000;
      baseProfile.maxAttempts = 10;
      baseProfile.betweenAttemptsDelayMs = 8000;
    }

    if (name.includes("oled") || name.includes("nano")) {
      baseProfile.initialDelayMs += 2000;
    }
  }

  const envProfile = {
    initialDelayMs: process.env.RESTART_INITIAL_DELAY_MS,
    maxAttempts: process.env.RESTART_MAX_ATTEMPTS,
    burstCount: process.env.RESTART_BURST_COUNT,
    burstPauseMs: process.env.RESTART_BURST_PAUSE_MS,
    postWakePingDelayMs: process.env.RESTART_POST_WAKE_PING_DELAY_MS,
    betweenAttemptsDelayMs: process.env.RESTART_BETWEEN_ATTEMPTS_DELAY_MS,
    failedWakeBackoffMs: process.env.RESTART_FAILED_WAKE_BACKOFF_MS,
  };

  const merged = {
    initialDelayMs: toNumberOr(envProfile.initialDelayMs, baseProfile.initialDelayMs),
    maxAttempts: toNumberOr(envProfile.maxAttempts, baseProfile.maxAttempts),
    burstCount: toNumberOr(envProfile.burstCount, baseProfile.burstCount),
    burstPauseMs: toNumberOr(envProfile.burstPauseMs, baseProfile.burstPauseMs),
    postWakePingDelayMs: toNumberOr(envProfile.postWakePingDelayMs, baseProfile.postWakePingDelayMs),
    betweenAttemptsDelayMs: toNumberOr(envProfile.betweenAttemptsDelayMs, baseProfile.betweenAttemptsDelayMs),
    failedWakeBackoffMs: toNumberOr(envProfile.failedWakeBackoffMs, baseProfile.failedWakeBackoffMs),
  };

  return {
    initialDelayMs: clamp(Math.round(merged.initialDelayMs), 8000, 60000),
    maxAttempts: clamp(Math.round(merged.maxAttempts), 2, 20),
    burstCount: clamp(Math.round(merged.burstCount), 1, 6),
    burstPauseMs: clamp(Math.round(merged.burstPauseMs), 100, 2000),
    postWakePingDelayMs: clamp(Math.round(merged.postWakePingDelayMs), 2000, 20000),
    betweenAttemptsDelayMs: clamp(Math.round(merged.betweenAttemptsDelayMs), 1500, 15000),
    failedWakeBackoffMs: clamp(Math.round(merged.failedWakeBackoffMs), 1000, 12000),
  };
};

module.exports = {
  buildRestartProfile,
};
