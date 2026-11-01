// Scenarios that produce the journal / export examples shown in the Claude instructions.
// tests/instructions.test.ts checks the examples are exactly what the app produces.
import { parseProgram } from "../src/core/program";
import { exportMarkdown, journalLine } from "../src/core/journal";
import { EXAMPLE_HOME, EXAMPLE_SHORT, EXAMPLE_TREADMILL } from "../src/core/instructions";
import { advance, start } from "./helpers";

/** Treadmill: watch connected, one added pause. */
export function treadmillLine(): string {
  const { sess, clock } = start(parseProgram(EXAMPLE_TREADMILL));
  const hr = (t: number) =>
    t < 300 ? 95 + Math.round(t / 12) : t < 1800 ? Math.round(122 + ((t - 300) / 1500) * 18) : Math.max(98, Math.round(140 - (t - 1800) / 9));
  advance(sess, clock, 13 * 60, hr);
  const p0 = clock.ms;
  sess.pause();
  advance(sess, clock, 80, () => Math.round(128 - (clock.ms - p0) / 5000));
  sess.resume();
  advance(sess, clock, 40 * 60, hr);
  return journalLine(sess, { rpe: 7, comment: "salle chaude", weight: "82,4", waist: "" });
}

/** Home: no watch, one skipped and one shortened step. */
export function homeLine(): string {
  const { sess, clock } = start(parseProgram(EXAMPLE_HOME));
  while (sess.state !== "finished") {
    const s = sess.step;
    if (s.label.startsWith("Dead bug") && s.rep?.r === 3) { sess.next(); continue; }
    if (s.kind === "reps") { advance(sess, clock, 40); sess.done(); continue; }
    if (s.label.startsWith("Planche") && s.rep?.r === 2) { advance(sess, clock, 18); sess.next(); continue; }
    advance(sess, clock, 1);
  }
  return journalLine(sess, { rpe: 6, comment: "", weight: "", waist: "" });
}

/** Export of the short session, HR samples shortened with "…" (local times: run with TZ=Europe/Paris). */
export function exportExample(): string {
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
  const md = exportMarkdown(sess, { rpe: 7, comment: "jambes lourdes", weight: "", waist: "" }, { source: EXAMPLE_SHORT, device: "Suunto Race" });
  const lines = md.trimEnd().split("\n");
  const csv = lines.flatMap((l, i) => (/^\d\d:\d\d:\d\d,\d+,\d+$/.test(l) ? [i] : []));
  const kept = lines.filter((_, i) => !csv.slice(3, -2).includes(i));
  kept.splice(csv[0] + 3, 0, "…");
  return kept.join("\n");
}
