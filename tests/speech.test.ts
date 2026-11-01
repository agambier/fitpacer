import { describe, expect, it } from "vitest";
import { parseProgram } from "../src/core/program";
import { parseRamp } from "../src/core/ramp";
import { rampAnnouncement, resumeAnnouncement, sayDuration, sayInfo, stepAnnouncement } from "../src/core/speech";

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
    expect(resumeAnnouncement(po, re, 0, [])).toBe("On reprend. Pompes. 10 répétitions. Touchez Fait quand c'est terminé.");
    expect(resumeAnnouncement(re, pl, 45, [])).toBe("On reprend. Repos, encore 45 secondes. Ensuite : Planche, 30 secondes.");
  });
});
