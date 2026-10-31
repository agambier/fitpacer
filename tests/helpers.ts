import { readFileSync } from "node:fs";
import { Session, type Clock } from "../src/core/session";
import type { Program } from "../src/core/program";

export const example = (name: string) => readFileSync(new URL("../examples/" + name, import.meta.url), "utf8");

export class FakeClock implements Clock {
  ms = 0;
  wallStart = Date.UTC(2026, 9, 31, 10, 2, 14);
  mono() { return this.ms; }
  wall() { return this.wallStart + this.ms; }
}

/** Runs the session, ticking every 200 ms for `sec` seconds, feeding hr(t). */
export function advance(sess: Session, clock: FakeClock, sec: number, hr?: (t: number) => number | null, cap = 150) {
  const events = [];
  const end = clock.ms + sec * 1000;
  while (clock.ms < end && sess.state !== "finished") {
    clock.ms += 200;
    events.push(...sess.tick());
    if (hr) sess.hr(hr(sess.elapsed()), cap);
  }
  return events;
}

export function start(p: Program) {
  const clock = new FakeClock();
  const sess = new Session(p, clock);
  return { clock, sess };
}
