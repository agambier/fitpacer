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
  /** Heart rate when the pause started / ended (null if not received). */
  hr0: number | null;
  hr1: number | null;
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

/** Beeps during the last seconds of a timed step, and before a level change: 5-4-3-2-1. */
export const COUNTDOWN = 5;
/** No countdown before level changes closer than this (seconds): it would beep all the time. */
export const RAMP_COUNTDOWN_MIN_LEN = 15;

export type SessionEvent =
  | { type: "countdown"; n: number; ramp?: boolean }
  | { type: "step"; idx: number; announce: boolean }
  | { type: "ramp"; idx: number; changes: { info: number; value: number }[] }
  | { type: "hrAlert"; hr: number }
  | { type: "hrZone"; dir: "low" | "high"; hr: number }
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
/** Outside the step HR range for this long (s) before a voice reminder, then at most every ZONE_ALERT_EVERY s. */
export const ZONE_ALERT_AFTER = 15;
export const ZONE_ALERT_EVERY = 30;

/** Where a heart rate stands against the step range: "low" | "in" | "high" (null without range). */
export function zoneState(bpm: number, z: { lo: number; hi: number } | null): "low" | "in" | "high" | null {
  if (!z) return null;
  return bpm < z.lo ? "low" : bpm > z.hi ? "high" : "in";
}

export class Session {
  state: "running" | "paused" | "finished" = "running";
  idx = 0;
  logs: StepLog[] = [];
  pauses: PauseLog[] = [];
  samples: Sample[] = [];
  readonly startWall: number;
  endWall = 0;
  stoppedByUser = false;
  /** Answer to "chest strap worn?" (asked only when the workout recommends it), null if not asked. */
  strap: boolean | null = null;

  private monoStart: number;
  private pausedTotal = 0;
  private pausedAt = 0;
  private stepStart = 0;
  private stepWall = 0;
  private lastCountdown: number | null = null;
  private lastRampCountdown: string | null = null;
  private liveHr: number | null = null;
  private rampLevels: number[] = [];
  private lastSampleSec = -1;
  private lastAlert = -Infinity;
  /** Out of the step HR range: direction, since when (active s), last reminder (active s). */
  private zoneOut: { dir: "low" | "high"; since: number; last: number } | null = null;
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

  /**
   * Seconds left before the next level change (the earliest one if several progressions), when it is
   * within COUNTDOWN and levels last long enough (RAMP_COUNTDOWN_MIN_LEN) for a countdown to make sense.
   */
  rampCountdown(): { n: number; at: number } | null {
    const el = this.stepElapsed();
    let best: { n: number; at: number } | null = null;
    for (const st of this.rampStates()) {
      if (!st || st.nextAt == null || st.len < RAMP_COUNTDOWN_MIN_LEN) continue;
      const n = Math.ceil(st.nextAt - el);
      if (n >= 1 && n <= COUNTDOWN && (!best || st.nextAt < best.at)) best = { n, at: st.nextAt };
    }
    return best;
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
    this.pauses.push({ wall0: this.clock.wall(), wall1: 0, idx: this.idx, hr0: this.liveHr, hr1: null });
  }

  resume() {
    if (this.state !== "paused") return;
    this.pausedTotal += this.clock.mono() - this.pausedAt;
    this.state = "running";
    const pz = this.pauses[this.pauses.length - 1];
    pz.wall1 = this.clock.wall();
    pz.hr1 = this.liveHr;
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
  hr(bpm: number | null, cap: number | null) {
    this.liveHr = bpm; // kept during pauses too: HR at the start / end of a pause
    if (this.state !== "running" || bpm == null) return;
    const t = this.elapsed();
    const sec = Math.floor(t);
    if (sec === this.lastSampleSec) return;
    this.lastSampleSec = sec;
    this.samples.push({ t, wall: this.clock.wall(), hr: bpm, idx: this.idx });
    if (cap != null && bpm > cap) {
      // Danger first: the session HR max overrides the step range.
      this.zoneOut = null;
      if (t - this.lastAlert >= HR_ALERT_EVERY) {
        this.lastAlert = t;
        this.events.push({ type: "hrAlert", hr: bpm });
      }
      return;
    }
    const z = zoneState(bpm, this.step.hr);
    if (z !== "low" && z !== "high") { this.zoneOut = null; return; }
    // Whole seconds (one sample per second): no float rounding at the thresholds.
    if (!this.zoneOut || this.zoneOut.dir !== z) this.zoneOut = { dir: z, since: sec, last: -Infinity };
    const o = this.zoneOut;
    if (sec - o.since >= ZONE_ALERT_AFTER && sec - o.last >= ZONE_ALERT_EVERY) {
      o.last = sec;
      this.events.push({ type: "hrZone", dir: z, hr: bpm });
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
          if (sec <= COUNTDOWN && this.lastCountdown !== sec) {
            this.lastCountdown = sec;
            this.events.push({ type: "countdown", n: sec });
          }
          // Countdown before the next level of a progression; the step countdown has priority.
          const next = this.rampCountdown();
          if (next && sec > COUNTDOWN) {
            const key = next.at + ":" + next.n;
            if (this.lastRampCountdown !== key) {
              this.lastRampCountdown = key;
              this.events.push({ type: "countdown", n: next.n, ramp: true });
            }
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
    this.lastRampCountdown = null;
    this.rampLevels = this.step.ramps.map(() => 0);
    this.zoneOut = null;
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
