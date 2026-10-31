import { describe, expect, it } from "vitest";
import { btUnsupportedMessage, type BtEnv } from "../src/device/heartRate";

const env = (o: Partial<BtEnv>): BtEnv => ({ secure: true, hasBluetooth: false, ua: "", touchPoints: 5, isBrave: false, ...o });
const CHROME = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";

describe("btUnsupportedMessage", () => {
  it("accepts Chrome / Brave with Web Bluetooth", () => {
    expect(btUnsupportedMessage(env({ hasBluetooth: true, ua: CHROME }))).toBeNull();
    expect(btUnsupportedMessage(env({ hasBluetooth: true, ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Bluefy" }))).toBeNull();
  });
  it("explains each unsupported case", () => {
    expect(btUnsupportedMessage(env({ ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari" }))).toMatch(/iPhone \/ iPad/);
    expect(btUnsupportedMessage(env({ ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari", touchPoints: 5 }))).toMatch(/iOS/);
    expect(btUnsupportedMessage(env({ ua: CHROME, isBrave: true }))).toMatch(/brave:\/\/flags/);
    expect(btUnsupportedMessage(env({ ua: "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0" }))).toMatch(/Firefox/);
    expect(btUnsupportedMessage(env({ ua: CHROME.replace("Chrome/130.0", "SamsungBrowser/26.0 Chrome/130.0") }))).toMatch(/Samsung/);
    expect(btUnsupportedMessage(env({ ua: CHROME.replace("Pixel 7)", "Pixel 7; wv)") }))).toMatch(/intégré/);
    expect(btUnsupportedMessage(env({ ua: CHROME }))).toMatch(/Ce navigateur/);
    expect(btUnsupportedMessage(env({ hasBluetooth: true, secure: false, ua: CHROME }))).toMatch(/https/);
  });
});
