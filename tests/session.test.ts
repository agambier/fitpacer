import { describe, expect, it } from "vitest";
import { parseProgram } from "../src/core/program";
import { stepStatuses } from "../src/core/session";
import { advance, example, start } from "./helpers";

describe("Session", () => {
  it("runs a timed program to the end without drift", () => {
    const { sess, clock } = start(parseProgram(example("tapis-incline-35-progressions.txt")));
    const ev = advance(sess, clock, 36 * 60);
    expect(sess.state).toBe("finished");
    expect(sess.logs).toHaveLength(12);
    expect(sess.logs.every((l) => l.status === "fait")).toBe(true);
    expect(sess.logs[11].t1).toBeCloseTo(2100, 5);
    expect(sess.stoppedByUser).toBe(false);
    const ramps = ev.filter((e) => e.type === "ramp");
    // warm-up 4 levels (3 changes) + cool-down 6 levels (5 changes)
    expect(ramps).toHaveLength(8);
    expect(ev.filter((e) => e.type === "countdown")).toHaveLength(12 * 3);
  });

  it("waits for Fait on repetition steps and logs skips", () => {
    const { sess, clock } = start(parseProgram("A | 10 rép\nB | 1:00\nC | 1:00\nD | 10 rép\nE | 1:00"));
    advance(sess, clock, 120);
    expect(sess.idx).toBe(0);
    sess.done();
    advance(sess, clock, 5);
    sess.next(); // B skipped (< 20 %)
    advance(sess, clock, 30);
    sess.next(); // C shortened (50 %)
    sess.next(); // D reps skipped
    advance(sess, clock, 10);
    sess.stop(); // E stopped at 17 %
    expect(stepStatuses(sess)).toEqual(["fait", "sauté", "écourté", "sauté", "arrêt"]);
    expect(sess.stoppedByUser).toBe(true);
  });

  it("excludes pauses from active time", () => {
    const { sess, clock } = start(parseProgram("A | 1:00"));
    advance(sess, clock, 20);
    sess.pause();
    advance(sess, clock, 100);
    expect(sess.elapsed()).toBeCloseTo(20, 0);
    sess.resume();
    advance(sess, clock, 41);
    expect(sess.state).toBe("finished");
    expect(sess.pauses).toHaveLength(1);
  });

  it("Préc. restarts the step, or goes back within 3 s", () => {
    const { sess, clock } = start(parseProgram("A | 1:00\nB | 1:00"));
    advance(sess, clock, 61);
    expect(sess.idx).toBe(1);
    sess.prev();
    expect(sess.idx).toBe(0);
    advance(sess, clock, 10);
    sess.prev();
    expect(sess.idx).toBe(0);
    expect(sess.stepElapsed()).toBe(0);
  });

  it("samples HR once per second and alerts over the cap every 20 s", () => {
    const { sess, clock } = start(parseProgram("A | 1:00"));
    const ev = advance(sess, clock, 50, () => 160, 150);
    expect(sess.samples.length).toBeGreaterThanOrEqual(49);
    expect(ev.filter((e) => e.type === "hrAlert")).toHaveLength(3);
  });
});
