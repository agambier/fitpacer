import { describe, expect, it } from "vitest";
import { parseProgram } from "../src/core/program";
import { journalLine } from "../src/core/journal";
import {
  claudeInstructions, EXAMPLE_HOME, EXAMPLE_JOURNAL_HOME, EXAMPLE_JOURNAL_TREADMILL, EXAMPLE_TREADMILL,
} from "../src/core/instructions";
import { advance, start } from "./helpers";

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
