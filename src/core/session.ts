// Session engine: timing, step changes, pauses, ramps and HR samples.
// Pure logic: time is injected so it can be tested without a browser.
import { rampAt } from "./ramp";
import { weight, REP_GUESS, type Program, type Step } from "./program";

export type StepStatus = "fait" | "écourté" | "sauté" | "arrêt";

export interface StepLog {
  idx: number;
  /** Active session time (seconds, pauses excluded). */
  t0: number;
  t1: number;
  /** Wall clock, ms since epoch. */
  wall0: number;
  wall1: number;
  status: StepStatus;
}

export interface PauseLog {
  wall0: number;
  wall1: number;
  /** Step index when the pause started. */
  idx: number;
}

export interface Sample {
  /** Active session time, seconds. */
  t: number;
  wall: number;
  hr: number;
  idx: number;
}

export type SessionEvent =
  | { type: "countdown"; n: number }
  | { type: "step"; idx: number; announce: boolean }
  | { type: "ramp"; idx: number; changes: { info: number; value: number }[] }
  | { type: "hrAlert"; hr: number }
  | { type: "finish" };

export interface Clock {
  /** Monotonic time in ms (performance.now). */
  mono(): number;
  /** Wall clock in ms (Date.now). */
  wall(): number;
}

/** Fraction thresholds when leaving a timed step with "Suiv.". */
export const SKIP_MAX = 0.2;
export const DONE_MIN = 0.9;
const HR_ALERT_EVERY = 20; // seconds between two HR alerts

export class Session {
  state: "running" | "paused" | "finished" = "running";
  idx = 0;
  logs: StepLog[] = [];
  pauses: PauseLog[] = [];
  samples: Sample[] = [];
  readonly startWall: number;
  endWall = 0;
  stoppedByUser = false;

  private monoStart: number;
  private pausedTotal = 0;
  private pausedAt = 0;
  private stepStart = 0;
  private stepWall = 0;
  private lastCountdown: number | null = null;
  private rampLevels: number[] = [];
  private lastSampleSec = -1;
  private lastAlert = -Infinity;
  private events: SessionEvent[] = [];

  constructor(readonly program: Program, private clock: Clock) {
    this.monoStart = clock.mono();
    this.startWall = clock.wall();
    this.enter(0, false);
  }

  get step(): Step {
    return this.program.steps[this.idx];
  }

  /** Active session time, seconds. */
  elapsed(): number {
    const now = this.state === "paused" ? this.pausedAt : this.clock.mono();
    return (now - this.monoStart - this.pausedTotal) / 1000;
  }

  stepElapsed(): number {
    return this.elapsed() - this.stepStart;
  }

  /** Remaining time estimate, seconds. */
  remaining(): number {
    const s = this.step;
    let r = Math.max(0, (s.kind === "time" ? s.dur : REP_GUESS) - this.stepElapsed());
    for (let k = this.idx + 1; k < this.program.steps.length; k++) r += weight(this.program.steps[k]);
    return r;
  }

  /** Current level of each ramp of the current step. */
  rampStates() {
    const s = this.step;
    return s.ramps.map((r) => (r && s.kind === "time" ? rampAt(r, this.stepElapsed(), s.dur) : null));
  }

  pause() {
    if (this.state !== "running") return;
    this.state = "paused";
    this.pausedAt = this.clock.mono();
    this.pauses.push({ wall0: this.clock.wall(), wall1: 0, idx: this.idx });
  }

  resume() {
    if (this.state !== "paused") return;
    this.pausedTotal += this.clock.mono() - this.pausedAt;
    this.state = "running";
    this.pauses[this.pauses.length - 1].wall1 = this.clock.wall();
  }

  /** "Fait ✓" on a repetition step. */
  done() {
    if (this.state === "finished") return;
    this.resume();
    this.leave("fait");
  }

  /** "Suiv. ▶" */
  next() {
    if (this.state === "finished") return;
    const s = this.step;
    let status: StepStatus = "sauté";
    if (s.kind === "time") {
      const f = this.stepElapsed() / s.dur;
      status = f >= DONE_MIN ? "fait" : f >= SKIP_MAX ? "écourté" : "sauté";
    }
    this.leave(status);
  }

  /** "◀ Préc." : restarts the step, or goes back one step within the first 3 s. */
  prev() {
    if (this.state === "finished") return;
    const back = this.stepElapsed() <= 3 && this.idx > 0;
    this.enter(back ? this.idx - 1 : this.idx, false);
  }

  /** "Terminer la séance" */
  stop() {
    if (this.state === "finished") return;
    this.resume();
    const s = this.step;
    const f = s.kind === "time" ? this.stepElapsed() / s.dur : 0;
    if (f >= DONE_MIN) this.log("fait");
    else if (f >= SKIP_MAX) this.log("écourté");
    else this.log("arrêt");
    this.stoppedByUser = this.idx < this.program.steps.length - 1 || f < DONE_MIN;
    this.end();
  }

  /** Feeds the latest heart rate (or null when unavailable). */
  hr(bpm: number | null, cap: number) {
    if (this.state !== "running" || bpm == null) return;
    const t = this.elapsed();
    const sec = Math.floor(t);
    if (sec === this.lastSampleSec) return;
    this.lastSampleSec = sec;
    this.samples.push({ t, wall: this.clock.wall(), hr: bpm, idx: this.idx });
    if (bpm > cap && t - this.lastAlert >= HR_ALERT_EVERY) {
      this.lastAlert = t;
      this.events.push({ type: "hrAlert", hr: bpm });
    }
  }

  /** Advances time; returns what happened since the last call. */
  tick(): SessionEvent[] {
    if (this.state === "running") {
      const s = this.step;
      if (s.kind === "time") {
        const rem = s.dur - this.stepElapsed();
        if (rem <= 0) {
          this.leave("fait", true);
        } else {
          const sec = Math.ceil(rem);
          if (sec <= 3 && this.lastCountdown !== sec) {
            this.lastCountdown = sec;
            this.events.push({ type: "countdown", n: sec });
          }
          const changes: { info: number; value: number }[] = [];
          this.rampStates().forEach((st, i) => {
            if (st && st.level !== this.rampLevels[i]) {
              this.rampLevels[i] = st.level;
              changes.push({ info: i, value: st.value });
            }
          });
          if (changes.length) this.events.push({ type: "ramp", idx: this.idx, changes });
        }
      }
    }
    const ev = this.events;
    this.events = [];
    return ev;
  }

  private log(status: StepStatus, t1 = this.elapsed()) {
    this.logs.push({
      idx: this.idx,
      t0: this.stepStart,
      t1,
      wall0: this.stepWall,
      wall1: this.clock.wall(),
      status,
    });
  }

  private leave(status: StepStatus, auto = false) {
    // When a timed step ends on its own, the next one starts exactly at its planned end (no drift).
    const s = this.step;
    const t1 = auto && s.kind === "time" ? this.stepStart + s.dur : this.elapsed();
    this.log(status, t1);
    if (this.idx + 1 >= this.program.steps.length) { this.end(); return; }
    this.enter(this.idx + 1, this.state === "running", t1);
  }

  private enter(i: number, announce: boolean, at = this.elapsed()) {
    this.idx = i;
    this.stepStart = at;
    this.stepWall = this.clock.wall();
    this.lastCountdown = null;
    this.rampLevels = this.step.ramps.map(() => 0);
    this.events.push({ type: "step", idx: i, announce });
  }

  private end() {
    this.state = "finished";
    this.endWall = this.clock.wall();
    this.events.push({ type: "finish" });
  }
}

/** Final status of each program step, merging revisits (Préc.). Unvisited steps: "arrêt". */
export function stepStatuses(sess: Session): StepStatus[] {
  const rank: Record<StepStatus, number> = { fait: 3, "écourté": 2, "sauté": 1, "arrêt": 0 };
  return sess.program.steps.map((_, i) => {
    const own = sess.logs.filter((l) => l.idx === i);
    if (!own.length) return "arrêt";
    return own.reduce((best, l) => (rank[l.status] > rank[best] ? l.status : best), own[0].status);
  });
}
