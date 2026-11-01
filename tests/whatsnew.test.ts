import { describe, expect, it } from "vitest";
import { launchPopup, notesSince, RELEASES, versionNumber } from "../src/core/whatsnew";
import { APP_VERSION } from "../src/version";

describe("whats new", () => {
  it("reads versions, with or without -dev", () => {
    expect(versionNumber("v26.11.01-dev")).toBe(261101);
    expect(versionNumber("v26.10.04")).toBe(261004);
    expect(versionNumber("abc")).toBeNaN();
  });
  it("has notes for the current version, newest first, without -dev", () => {
    expect(RELEASES[0].version).toBe(APP_VERSION.replace(/-dev$/, ""));
    for (const r of RELEASES) expect(r.items.length).toBeGreaterThan(0);
    const n = RELEASES.map((r) => versionNumber(r.version));
    expect([...n].sort((a, b) => b - a)).toEqual(n);
  });
  it("lists the versions newer than the one seen", () => {
    expect(notesSince("v26.10.04", "v26.11.01-dev").map((r) => r.version)).toEqual(["v26.11.01"]);
    expect(notesSince("v26.11.01", "v26.11.01")).toEqual([]);
    expect(notesSince("", "v26.11.01").length).toBe(RELEASES.length);
  });
  it("chooses the popup at launch", () => {
    expect(launchPopup("", false, "v26.11.01")).toBe("welcome");
    expect(launchPopup("v26.10.04", false, "v26.11.01")).toBe("welcome");
    expect(launchPopup("", true, "v26.11.01")).toBe("whatsnew"); // used the app before versions were recorded
    expect(launchPopup("v26.10.04", true, "v26.11.01-dev")).toBe("whatsnew");
    expect(launchPopup("v26.11.01-dev", true, "v26.11.01-dev")).toBe("none");
    expect(launchPopup("v26.11.01", true, "v26.11.01")).toBe("none");
    expect(launchPopup("v26.11.02", true, "v26.11.01")).toBe("none"); // older app (dev → stable): nothing
  });
});
