const assert = require("assert");
const { isLikelyValidMac } = require("./tv-adapter");
const { buildRestartProfile } = require("./restart-profile");

const run = () => {
  assert.strictEqual(isLikelyValidMac("00:00:00:00:00:00"), false, "all-zero MAC must be invalid for WoL");
  assert.strictEqual(isLikelyValidMac("FF:FF:FF:FF:FF:FF"), false, "broadcast MAC must be invalid for WoL");
  assert.strictEqual(isLikelyValidMac("D8:74:EF:1D:A0:49"), true, "real MAC should be valid");

  const onlineProfile = buildRestartProfile({
    brand: "lg",
    status: "Online",
    power_state: "On",
    name: "LG TV",
  });

  const offlineProfile = buildRestartProfile({
    brand: "lg",
    status: "Offline",
    power_state: "Off",
    name: "LG OLED TV",
  });

  assert.ok(offlineProfile.initialDelayMs >= onlineProfile.initialDelayMs, "offline profile should wait at least as long");
  assert.ok(offlineProfile.maxAttempts >= onlineProfile.maxAttempts, "offline profile should retry at least as much");

  console.log("restart-invalid-mac.test passed");
};

run();
