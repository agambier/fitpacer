import { describe, expect, it } from "vitest";
import { parseProgram } from "../src/core/program";
import { parseRamp } from "../src/core/ramp";
import { rampAnnouncement, sayDuration, sayInfo, stepAnnouncement } from "../src/core/speech";

describe("speech", () => {
  it("reads durations and infos", () => {
    expect(sayDuration(90)).toBe("1 minute 30");
    expect(sayDuration(300)).toBe("5 minutes");
    expect(sayDuration(45)).toBe("45 secondes");
    expect(sayInfo("5,5 km/h")).toBe("5,5 kilomètres heure");
    expect(sayInfo("9 %")).toBe("pente 9 pour cent");
    expect(sayInfo("4 → 5,5 km/h")).toBe("de 4 à 5,5 kilomètres heure");
    expect(sayInfo("-0,5 km/h / 30 s")).toBe("moins 0,5 kilomètres heure toutes les 30 secondes");
  });
  it("announces steps by kind", () => {
    const p = parseProgram("Montée | 1:00 | 5,5 km/h | 9 %\nPompes | 10 rép\nRepos | 1:30\nPlanche | 30s\nRepos | 10s\nDead bug | 8 rép par côté");
    const [mont, pomp, rep, , rep10] = p.steps;
    expect(stepAnnouncement(mont, pomp)).toBe("Montée. 1 minute. 5,5 kilomètres heure, pente 9 pour cent.");
    expect(stepAnnouncement(pomp, rep)).toBe("Pompes. 10 répétitions. Touchez Fait quand c'est terminé.");
    expect(stepAnnouncement(rep, p.steps[3])).toBe("Repos, 1 minute 30. Ensuite : Planche, 30 secondes.");
    expect(stepAnnouncement(rep10, p.steps[5])).toBe("Repos. Ensuite : Dead bug.");
  });
  it("announces ramp levels", () => {
    expect(rampAnnouncement([{ ramp: parseRamp("4 → 5,5 km/h")!, value: 5 }])).toBe("Passez à 5 kilomètres heure.");
    expect(rampAnnouncement([{ ramp: parseRamp("2 → 6 %")!, value: 3 }])).toBe("Pente 3 pour cent.");
  });
});
