import { describe, expect, it } from "vitest";
import { parseProgram } from "../src/core/program";
import { parseRamp } from "../src/core/ramp";
import { hrZoneAnnouncement, rampAnnouncement, resumeAnnouncement, sayDuration, sayInfo, stepAnnouncement } from "../src/core/speech";

describe("speech", () => {
  it("reads durations and infos", () => {
    expect(sayDuration(90)).toBe("1 minute 30");
    expect(sayDuration(300)).toBe("5 minutes");
    expect(sayDuration(45)).toBe("45 secondes");
    expect(sayInfo("5,5 km/h")).toBe("5,5 kilomètres heure");
    expect(sayInfo("9 %")).toBe("pente 9 pour cent");
    expect(sayInfo("4 → 5,5 km/h")).toBe("de 4 à 5,5 kilomètres heure");
    expect(sayInfo("-0,5 km/h / 30 s")).toBe("moins 0,5 kilomètres heure toutes les 30 secondes");
    expect(sayInfo("3 → 5 km/h par 1 en 3:00")).toBe("de 3 à 5 kilomètres heure par paliers de 1 en 3 minutes");
    expect(sayInfo("2 → 6 % en 2:30")).toBe("pente de 2 à 6 pour cent en 2 minutes 30");
    expect(sayInfo("6:00 → 5:30 min/km")).toBe("de 6 minutes à 5 minutes 30 au kilomètre");
    expect(rampAnnouncement([{ ramp: parseRamp("6:00 → 5:30 min/km")!, value: 340 }])).toBe("Passez à 5 minutes 40 au kilomètre.");
  });
  it("announces steps by kind", () => {
    const p = parseProgram("Montée | 1:00 | 5,5 km/h | 9 %\nPompes | 10 rép\nRepos | 1:30\nPlanche | 30s\nRepos | 10s\nDead bug | 8 rép par côté");
    const [mont, pomp, rep, , rep10] = p.steps;
    expect(stepAnnouncement(mont, pomp)).toBe("Montée. 1 minute. 5,5 kilomètres heure, pente 9 pour cent.");
    expect(stepAnnouncement(pomp, rep)).toBe("Pompes. 10 répétitions.");
    expect(stepAnnouncement(rep, p.steps[3])).toBe("Repos, 1 minute 30. Ensuite : Planche, 30 secondes.");
    expect(stepAnnouncement(rep10, p.steps[5])).toBe("Repos. Ensuite : Dead bug.");
  });
  it("reads the instructions of a rest step", () => {
    const p = parseProgram("Repos | 1:30 | allongé sur le dos | | bien respirer\nPlanche | 30s\nRepos | 10s | | | debout\nPompes | x10\nRepos | 15s | | | allongé sur le dos, jambes surélevées contre le mur, relâcher les épaules et respirer lentement par le nez en comptant jusqu’à quatre\nPompes | x10");
    const [r1, pl, r10, po, r20] = p.steps;
    expect(stepAnnouncement(r1, pl)).toBe("Repos, 1 minute 30. allongé sur le dos, bien respirer. Ensuite : Planche, 30 secondes.");
    expect(stepAnnouncement(r10, po)).toBe("Repos. debout. Ensuite : Pompes.");
    // too long for a 15 s rest: the next exercise wins
    expect(stepAnnouncement(r20, p.steps[5])).toBe("Repos, 15 secondes. Ensuite : Pompes, 10 répétitions.");
    expect(resumeAnnouncement(r1, pl, 45, [])).toBe("On reprend. Repos, encore 45 secondes. allongé sur le dos, bien respirer. Ensuite : Planche, 30 secondes.");
  });
  it("announces ramp levels", () => {
    expect(rampAnnouncement([{ ramp: parseRamp("4 → 5,5 km/h")!, value: 5 }])).toBe("Passez à 5 kilomètres heure.");
    expect(rampAnnouncement([{ ramp: parseRamp("2 → 6 %")!, value: 3 }])).toBe("Pente 3 pour cent.");
  });

  it("repeats the step instructions when resuming", () => {
    const p = parseProgram("Chauffe | 5:00 | 4 → 5,5 km/h | 0 % | monter progressivement\nPompes | 10 rép\nRepos | 1:30\nPlanche | 30s");
    const [ch, po, re, pl] = p.steps;
    expect(resumeAnnouncement(ch, po, 200, [4.5, null])).toBe(
      "On reprend. Chauffe. encore 3 minutes 20. 4,5 kilomètres heure, pente 0 pour cent. monter progressivement.",
    );
    expect(resumeAnnouncement(po, re, 0, [])).toBe("On reprend. Pompes. 10 répétitions.");
    expect(resumeAnnouncement(re, pl, 45, [])).toBe("On reprend. Repos, encore 45 secondes. Ensuite : Planche, 30 secondes.");
  });
});

describe("HR range announcements", () => {
  it("states the range when a step starts, and reminds when out of it", () => {
    const p = parseProgram("fc max: 160\nMarche rapide | 10:00 | 6 km/h | FC 120-145");
    expect(stepAnnouncement(p.steps[0], undefined)).toContain("Fréquence cardiaque entre 120 et 145.");
    expect(hrZoneAnnouncement("high", p.steps[0].hr!)).toBe("Fréquence cardiaque au-dessus de 145 : ralentissez.");
    expect(hrZoneAnnouncement("low", p.steps[0].hr!)).toBe("Fréquence cardiaque sous 120 : accélérez.");
  });
});
