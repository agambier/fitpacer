import { describe, expect, it } from "vitest";
import { parseProgram } from "../src/core/program";
import { exportMarkdown, journalLine } from "../src/core/journal";
import {
  claudeInstructions, EXAMPLE_EXPORT, EXAMPLE_HOME, EXAMPLE_JOURNAL_HOME, EXAMPLE_JOURNAL_TREADMILL, EXAMPLE_SHORT, EXAMPLE_TREADMILL,
} from "../src/core/instructions";
import { advance, start } from "./helpers";

process.env.TZ = "Europe/Paris"; // the export shows local times

// The journal examples shown to Claude must be exactly what the app produces.
describe("journal examples in the Claude instructions", () => {
  it("treadmill: watch connected, one added pause", () => {
    const { sess, clock } = start(parseProgram(EXAMPLE_TREADMILL));
    const hr = (t: number) =>
      t < 300 ? 95 + Math.round(t / 12) : t < 1800 ? Math.round(122 + ((t - 300) / 1500) * 18) : Math.max(98, Math.round(140 - (t - 1800) / 9));
    advance(sess, clock, 13 * 60, hr);
    const p0 = clock.ms;
    sess.pause();
    advance(sess, clock, 80, () => Math.round(128 - (clock.ms - p0) / 5000));
    sess.resume();
    advance(sess, clock, 40 * 60, hr);
    expect(journalLine(sess, { rpe: 7, comment: "salle chaude", weight: "82,4", waist: "" })).toBe(EXAMPLE_JOURNAL_TREADMILL);
  });

  it("home: no watch, one skipped and one shortened step", () => {
    const { sess, clock } = start(parseProgram(EXAMPLE_HOME));
    while (sess.state !== "finished") {
      const s = sess.step;
      if (s.label.startsWith("Dead bug") && s.rep?.r === 3) { sess.next(); continue; }
      if (s.kind === "reps") { advance(sess, clock, 40); sess.done(); continue; }
      if (s.label.startsWith("Planche") && s.rep?.r === 2) { advance(sess, clock, 18); sess.next(); continue; }
      advance(sess, clock, 1);
    }
    expect(journalLine(sess, { rpe: 6, comment: "", weight: "", waist: "" })).toBe(EXAMPLE_JOURNAL_HOME);
  });

  it("are included in the instructions", () => {
    expect(claudeInstructions()).toContain(EXAMPLE_JOURNAL_TREADMILL);
    expect(claudeInstructions()).toContain(EXAMPLE_JOURNAL_HOME);
  });
});

describe("export example in the Claude instructions", () => {
  it("is the app export, HR samples shortened", () => {
    const { sess, clock } = start(parseProgram(EXAMPLE_SHORT));
    const hr = (t: number) =>
      t < 180 ? 92 + Math.round(t / 6) : t < 520 ? Math.round(122 + ((t - 180) / 340) * 16) : Math.max(100, Math.round(138 - (t - 520) / 5));
    advance(sess, clock, 4 * 60, hr);
    const p0 = clock.ms;
    sess.pause();
    advance(sess, clock, 50, () => Math.round(130 - (clock.ms - p0) / 4000));
    sess.resume();
    while (sess.state !== "finished") {
      if (sess.step.label === "Montée (tour 2)") { advance(sess, clock, 40, hr); sess.next(); continue; }
      advance(sess, clock, 1, hr);
    }
    const md = exportMarkdown(sess, { rpe: 7, comment: "jambes lourdes", weight: "", waist: "" }, { source: EXAMPLE_SHORT, cap: 150, device: "Suunto Race" });
    // drop the HR samples elided by "…" in the example
    const lines = md.trimEnd().split("\n");
    const csv = lines.flatMap((l, i) => (/^\d\d:\d\d:\d\d,\d+,\d+$/.test(l) ? [i] : []));
    const kept = lines.filter((_, i) => !csv.slice(3, -2).includes(i));
    kept.splice(csv[0] + 3, 0, "…");
    expect(EXAMPLE_EXPORT).toBe(kept.join("\n"));
    expect(claudeInstructions()).toContain(EXAMPLE_EXPORT);
    expect(parseProgram(EXAMPLE_SHORT).errors).toEqual([]);
  });
});
