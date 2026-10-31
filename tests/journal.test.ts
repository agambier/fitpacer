import { describe, expect, it } from "vitest";
import { parseProgram } from "../src/core/program";
import { exportFileName, exportMarkdown, hrDrift, hrRecovery, journalLine } from "../src/core/journal";
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
      "Tapis incliné 35 min : Chauffe 5 min (4 → 5,5 km/h, 0 %) ; Marche 5×4 min (5,5 km/h, 7 %) ; Montée 5×1 min (5,5 km/h, 9 %) ; Retour au calme 5 min (5,5 → 3 km/h, 0 %)",
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
    expect(cols[3]).toContain("Pompes 3×10 rép");
    expect(cols[3]).toContain("Corde 5×30 s");
    expect(cols[3]).toContain("Dead bug 3×8 rép par côté");
    expect(cols[3]).not.toContain("Repos");
    expect(cols[3]).toContain("sauté : Corde (tour 3, 2e)");
    expect(cols[3]).toMatch(/non fait \(arrêt\) : Étirements$/);
    expect(cols[4]).toBe("FC non reçue");
    expect(cols[5]).toBe("ressenti ?/10");
    expect(cols[8]).toBe("–");
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
    const md = exportMarkdown(sess, fb, { source: src, cap: 150, device: "Suunto Watch HR 1211" });
    expect(md).toContain("## Ligne de journal");
    expect(md).toContain(journalLine(sess, fb));
    expect(md).toMatch(/\| 1 \| {2}\| Chauffe \| 5:00 \|/);
    expect(md).toContain("| pause |");
    expect(md).toContain("heure,fc,etape");
    expect(md).toContain("Jamais atteintes : 2. Marche (tour 1), 3. Montée (tour 1)");
    expect(md).toContain("Montée | 1:00 | 5,5 km/h | 9 %");
    expect(exportFileName(sess)).toMatch(/^fitpacer-2026-10-31-\d{4}-tapis-incline-35-min\.md$/);
  });
});
