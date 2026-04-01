import test from "node:test";
import assert from "node:assert/strict";

import {
  DNS_SETUP_ENDPOINT,
  CHROME_SECURITY_SETTINGS_URL,
  DNS_SETUP_STEPS
} from "../src/shared/dns-setup.js";

test("dns setup exposes the approved endpoint and settings url", () => {
  assert.equal(DNS_SETUP_ENDPOINT, "https://dshineedns.duckdns.org/dns-query");
  assert.equal(CHROME_SECURITY_SETTINGS_URL, "chrome://settings/security");
});

test("dns setup steps stay in the approved 3-step order", () => {
  assert.deepEqual(DNS_SETUP_STEPS, [
    "Bật Use secure DNS",
    "Chọn With",
    "Dán endpoint DNS ở trên"
  ]);
});
