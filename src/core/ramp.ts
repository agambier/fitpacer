// Guided progressions: an info such as "4 → 5,5 km/h" is split into equal levels
// over the duration of a timed step.
import { fmtNum, parseNum } from "./format";

export interface Ramp {
  from: number;
  to: number;
  /** Unit text as written, e.g. "km/h", "%". */
  unit: string;
  /** Level increment for this unit. */
  inc: number;
  /** Number of levels, from and to included (>= 2). */
  levels: number;
}

const UNIT_INC: [RegExp, number][] = [
  [/km\s*\/\s*h/i, 0.5],
  [/%/, 0.5],
  [/^niv/i, 1],
  [/rpm|tr\s*\/\s*min/i, 5],
  [/^w(atts?)?$/i, 10],
];

const RAMP_RE = /^\s*(-?\d+(?:[.,]\d+)?)\s*([^\d→>]*?)\s*(?:→|->)\s*(-?\d+(?:[.,]\d+)?)\s*(.*?)\s*$/;

/** Returns a ramp when the info is "A → B unit" with a supported unit, else null. */
export function parseRamp(info: string): Ramp | null {
  const m = info.replace(/−/g, "-").match(RAMP_RE);
  if (!m) return null;
  const from = parseNum(m[1]);
  const to = parseNum(m[3]);
  const unit = (m[4] || m[2]).trim();
  if (isNaN(from) || isNaN(to) || from === to || !unit) return null;
  const rule = UNIT_INC.find(([re]) => re.test(unit));
  if (!rule) return null;
  const inc = rule[1];
  const levels = Math.round(Math.abs(to - from) / inc) + 1;
  if (levels < 2) return null;
  return { from, to, unit, inc, levels };
}

export interface RampState {
  level: number;
  value: number;
  /** Seconds (step time) at which the next level starts, or null on the last level. */
  nextAt: number | null;
}

/** Level reached after `elapsed` seconds of a step lasting `dur` seconds. */
export function rampAt(r: Ramp, elapsed: number, dur: number): RampState {
  const len = dur / r.levels;
  const level = Math.min(r.levels - 1, Math.max(0, Math.floor(elapsed / len)));
  return { level, value: rampValue(r, level), nextAt: level < r.levels - 1 ? (level + 1) * len : null };
}

export function rampValue(r: Ramp, level: number): number {
  if (level >= r.levels - 1) return r.to;
  const sign = r.to > r.from ? 1 : -1;
  return Math.round((r.from + sign * r.inc * level) * 100) / 100;
}

/** "5,5 km/h", "8 %" */
export function rampValueTxt(r: Ramp, value: number): string {
  return fmtNum(value) + " " + r.unit;
}
