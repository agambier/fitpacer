import { describe, expect, it } from "vitest";
import { parseProgram } from "../src/core/program";
import { cleanSamples, exportFileName, exportMarkdown, fmtPause, glitchEpisodes, hrGlitches, hrZoneSegments, hrDrift, hrRecovery, journalLine, pausesSegment } from "../src/core/journal";
import { advance, example, start } from "./helpers";

const fb = { rpe: 8, comment: "salle très chaude", weight: "82,4", waist: "" };

describe("journal line", () => {
  it("treadmill: 9 columns, content grouped, drift and recovery", () => {
    const { sess, clock } = start(parseProgram(example("tapis-incline-35-progressions.txt")));
    // HR rising during the walk blocks, falling during cool-down
    const hr = (t: number) => (t < 300 ? 100 : t < 1800 ? Math.round(120 + ((t - 300) / 1500) * 20) : Math.max(100, Math.round(144 - (t - 1800) / 8)));
    advance(sess, clock, 36 * 60, hr);
    const line = journalLine(sess, fb);
    const cols = line.split(" | ");
    expect(cols).toHaveLength(9);
    expect(cols[0]).toBe("31/10/2026");
    expect(cols[1]).toBe("salle");
    expect(cols[2]).toBe("35 min");
    expect(cols[3]).toBe(
      "Tapis incliné 35 min : Chauffe 5 min (4 → 5,5 km/h, 0 %) ; Marche 5x4 min (5,5 km/h, 7 %) ; Montée 5x1 min (5,5 km/h, 9 %) ; Retour au calme 5 min (5,5 → 3 km/h, 0 %)",
    );
    expect(cols[5]).toBe("ressenti 8/10");
    expect(cols[6]).toBe("82,4 kg");
    expect(cols[7]).toBe("–");
    expect(cols[8]).toMatch(/^salle très chaude ; dérive FC Marche ~\d+→\d+ ; récup FC \d+→\d+ en 1 min, \d+ en 5 min$/);
    expect(hrDrift(sess)).toHaveLength(1);
    expect(hrRecovery(sess)).not.toBeNull();
  });

  it("home: deviations, rests excluded, no HR", () => {
    const { sess, clock } = start(parseProgram(example("maison-pompes-gainage-corde.txt")));
    // play the session: Fait on reps, skip the 2nd Corde of round 3, stop during the last rest
    while (sess.state !== "finished") {
      const s = sess.step;
      if (s.kind === "reps") { advance(sess, clock, 30); sess.done(); continue; }
      if (s.label === "Corde (tour 3, 2e)") { sess.next(); continue; }
      if (s.isRest && s.rep?.r === 3 && sess.idx === 44) { sess.stop(); break; }
      advance(sess, clock, 1);
    }
    const cols = journalLine(sess, { rpe: null, comment: "", weight: "", waist: "" }).split(" | ");
    expect(cols).toHaveLength(9);
    expect(cols[1]).toBe("maison");
    expect(cols[3]).toContain("Maison pompes, gainage, corde (arrêtée avant la fin) : ");
    expect(cols[3]).toContain("Pompes 3x10 rép");
    expect(cols[3]).toContain("Corde 5x30 s");
    expect(cols[3]).toContain("Dead bug 3x8 rép par côté");
    expect(cols[3]).not.toContain("Repos");
    expect(cols[3]).toContain("sauté : Corde (tour 3, 2e)");
    expect(cols[3]).toMatch(/non fait \(arrêt\) : Étirements$/);
    expect(cols[4]).toBe("FC non reçue");
    expect(cols[5]).toBe("ressenti ?/10");
    expect(cols[8]).toBe("montre non connectée : pas de FC (ni dérive ni récupération)");
  });

  it("no drift on short efforts", () => {
    const { sess, clock } = start(parseProgram("x3 {\nCorde | 30s\nRepos | 30s\n}\nÉtirements | 3:00"));
    advance(sess, clock, 400, (t) => 100 + Math.round(t / 4));
    expect(hrDrift(sess)).toEqual([]);
  });
});

describe("markdown export", () => {
  it("contains journal line, steps table with times, HR series and source", () => {
    const src = example("tapis-incline-35-progressions.txt");
    const { sess, clock } = start(parseProgram(src));
    advance(sess, clock, 100, () => 110);
    sess.pause();
    advance(sess, clock, 30);
    sess.resume();
    advance(sess, clock, 10, () => 112);
    sess.stop();
    const md = exportMarkdown(sess, fb, { source: src, device: "Suunto Watch HR 1211" });
    expect(md).toContain("## Ligne de journal");
    expect(md).toContain(journalLine(sess, fb));
    expect(md).toMatch(/\| 1 \| {2}\| Chauffe \| 5:00 \|/);
    expect(md).toContain("| *pause ajoutée par l'utilisateur* |");
    expect(md).toContain("- Pauses ajoutées par l'utilisateur (bouton Pause, au moins 10 s, hors repos du programme) : 1, total 30 s");
    expect(journalLine(sess, fb)).toContain("pause ajoutée par l'utilisateur : Chauffe 30 s");
    expect(md).toContain("heure,fc,etape");
    expect(md).toContain("Jamais atteintes : 2. Marche (tour 1), 3. Montée (tour 1)");
    expect(md).toContain("Montée | 1:00 | 5,5 km/h | 9 %");
    expect(exportFileName(sess)).toMatch(/^fitpacer-2026-10-31-\d{4}-tapis-incline-35-min\.md$/);
  });
});

describe("missing HR", () => {
  it("says when the watch was not connected", () => {
    const { sess, clock } = start(parseProgram("A | 2:00\nRetour au calme | 2:00"));
    advance(sess, clock, 241);
    const cols = journalLine(sess, { rpe: 5, comment: "ok", weight: "", waist: "" }).split(" | ");
    expect(cols[4]).toBe("FC non reçue");
    expect(cols[8]).toBe("ok ; montre non connectée : pas de FC (ni dérive ni récupération)");
    expect(exportMarkdown(sess, fb, { source: "", device: null })).toContain("⚠️ Montre non connectée");
  });
  it("says when HR is partial", () => {
    const { sess, clock } = start(parseProgram("A | 10:00"));
    advance(sess, clock, 300, () => 120);
    advance(sess, clock, 301);
    const remark = journalLine(sess, { rpe: 5, comment: "", weight: "", waist: "" }).split(" | ")[8];
    expect(remark).toBe("FC partielle : reçue 5 min sur 10 min (montre déconnectée)");
  });
  it("says nothing when HR is complete", () => {
    const { sess, clock } = start(parseProgram("A | 2:00"));
    advance(sess, clock, 121, () => 120);
    expect(journalLine(sess, { rpe: 5, comment: "", weight: "", waist: "" }).split(" | ")[8]).toBe("–");
  });
});

describe("pauses added by the user", () => {
  it("formats pause durations", () => {
    expect(fmtPause(45)).toBe("45 s");
    expect(fmtPause(180)).toBe("3 min");
    expect(fmtPause(190)).toBe("3 min 10");
    expect(fmtPause(65)).toBe("1 min 05");
  });
  it("lists each pause with its step and the total, active duration unchanged", () => {
    const { sess, clock } = start(parseProgram("Marche | 2:00\nRepos | 0:30\nCorde | 1:00"));
    advance(sess, clock, 60);
    sess.pause();
    advance(sess, clock, 80);
    sess.resume();
    advance(sess, clock, 100);
    sess.pause();
    advance(sess, clock, 45);
    sess.resume();
    advance(sess, clock, 60);
    expect(pausesSegment(sess)).toBe("pauses ajoutées par l'utilisateur : 2 (Marche 1 min 20, Corde 45 s), total 2 min 05");
    const line = journalLine(sess, fb).split(" | ");
    expect(line[2]).toBe("3 min"); // 3:30 of effort, pauses excluded
    expect(line[3]).toMatch(/; pauses ajoutées par l'utilisateur : 2 \(Marche 1 min 20, Corde 45 s\), total 2 min 05$/);
  });
  it("ignores pauses shorter than 10 s (mistaken tap)", () => {
    const { sess, clock } = start(parseProgram("Marche | 2:00"));
    advance(sess, clock, 30);
    sess.pause();
    advance(sess, clock, 9);
    sess.resume();
    advance(sess, clock, 30);
    sess.pause();
    advance(sess, clock, 10);
    sess.resume();
    advance(sess, clock, 70);
    expect(pausesSegment(sess)).toBe("pause ajoutée par l'utilisateur : Marche 10 s");
    const md = exportMarkdown(sess, fb, { source: "", device: null });
    expect(md).toContain("| *pause courte (moins de 10 s, non comptée)* |");
    expect(md).toContain(": 1, total 10 s");
  });
  it("notes the HR at the start and at the end of each counted pause", () => {
    const { sess, clock } = start(parseProgram("Marche | 3:00\nCorde | 1:00"));
    const hr = () => (clock.ms < 60_000 ? 148 : clock.ms < 120_000 ? 120 : 140); // falls during the pause
    advance(sess, clock, 59.8, hr);
    sess.pause();
    advance(sess, clock, 60, hr);
    sess.resume();
    advance(sess, clock, 130, hr);
    sess.pause();
    advance(sess, clock, 20, () => null); // watch lost during the pause
    sess.resume();
    advance(sess, clock, 60);
    expect(pausesSegment(sess)).toBe("pauses ajoutées par l'utilisateur : 2 (Marche 1 min (FC 148→120), Corde 20 s (FC 140→?)), total 1 min 20");
    const md = exportMarkdown(sess, fb, { source: "", device: null });
    expect(md).toContain("| *pause ajoutée par l'utilisateur* | | FC 148→120 |");
  });
  it("adds nothing without pause", () => {
    const { sess, clock } = start(parseProgram("Marche | 1:00"));
    advance(sess, clock, 70);
    expect(pausesSegment(sess)).toBe("");
  });
});

describe("step HR ranges in the journal", () => {
  it("adds the share of time within each range (rounds grouped) and a column in the export", () => {
    const { sess, clock } = start(parseProgram("titre: T\nfc max: 160\nx2 {\n  Marche | 2:00 | 6 km/h | FC 120-140\n  Repos | 0:30\n}\nRetour au calme | 1:00"));
    // 1st pass: 90 s in range out of 120 ; 2nd pass: all in range
    advance(sess, clock, 30, () => 110);
    advance(sess, clock, 90, () => 130);
    advance(sess, clock, 30, () => 100);
    advance(sess, clock, 120, () => 135);
    advance(sess, clock, 61, () => 100);
    expect(hrZoneSegments(sess)).toEqual(["plage FC Marche 120-140 : 87 %"]);
    expect(journalLine(sess, fb).split(" | ")[8]).toMatch(/ ; plage FC Marche 120-140 : 87 %$/);
    const md = exportMarkdown(sess, fb, { source: "", device: null });
    expect(md).toContain("FC max de la séance : 160 —");
    expect(md).toMatch(/\| Marche \| 2:00 \| 6 km\/h \|.*\| 120-140 \(7[45] %\) \|/);
    expect(md).toContain("- plage FC Marche 120-140 : 87 %");
  });

  it("export: HR max missing or raised by a range", () => {
    let { sess, clock } = start(parseProgram("A | 1:00"));
    advance(sess, clock, 61);
    expect(exportMarkdown(sess, fb, { source: "", device: null })).toContain("FC max de la séance : absente de la séance (pas d'alerte)");
    ({ sess, clock } = start(parseProgram("fc max: 140\nA | 1:00 | FC 120-145")));
    advance(sess, clock, 61);
    expect(exportMarkdown(sess, fb, { source: "", device: null })).toContain("FC max de la séance : 145 (relevée par la plage FC de A ; fc max: 140 dans la séance)");
  });
});

describe("sensor dropouts", () => {
  const S = (hrs: number[]) => hrs.map((hr, t) => ({ t, wall: t * 1000, hr, idx: 0 }));

  it("flags a brief drop that comes back, not a genuine fast change", () => {
    const flat = Array(30).fill(110);
    const drop = [...flat.slice(0, 15), 49, 52, ...flat.slice(0, 15)];
    expect(hrGlitches(S(drop)).map((g) => g.hr)).toEqual([49, 52]);
    expect(glitchEpisodes(hrGlitches(S(drop)))).toHaveLength(1);
    const step = [...Array(20).fill(100), ...Array(20).fill(135)];
    expect(hrGlitches(S(step))).toEqual([]);
    const spike = [...flat, 190, ...flat];
    expect(hrGlitches(S(spike)).map((g) => g.hr)).toEqual([190]);
    expect(cleanSamples(S(spike))).toHaveLength(60);
  });

  it("journal line: min/avg/max without the dropout, remark segment", () => {
    const { sess, clock } = start(parseProgram(example("tapis-incline-35-progressions.txt")));
    advance(sess, clock, 6 * 60, (t) => (t >= 120 && t < 122 ? 49 : 110));
    sess.stop();
    const cols = journalLine(sess, { rpe: 5, comment: "", weight: "", waist: "" }).split(" | ");
    expect(cols[4]).toBe("110/110/110");
    expect(cols[8]).toBe("décrochement capteur FC ignoré : 49 à 2:00");
    expect(exportMarkdown(sess, { rpe: 5, comment: "", weight: "", waist: "" }, { source: "", device: "Montre", appVersion: "" }))
      .toContain("FC min/moy/max : 110/110/110 (décrochements brefs du capteur exclus)");
  });
});
