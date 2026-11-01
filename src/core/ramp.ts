// Guided progressions: an info such as "4 → 5,5 km/h" is split into equal levels
// over the duration of a timed step.
// Options (any order, both optional):
//   "par 1"    level increment (any unit; required for units without a default increment)
//   "en 3:00"  duration of the progression; the step then stays on the last value
// Values may be clock values ("6:00 → 5:30 min/km"), for paces.
import { fmtClock, fmtNum, parseNum } from "./format";

export interface Ramp {
  from: number;
  to: number;
  /** Unit text as written, e.g. "km/h", "%". */
  unit: string;
  /** Level increment for this unit (seconds for clock values). */
  inc: number;
  /** Number of levels, from and to included (>= 2). */
  levels: number;
  /** Duration of the progression in seconds ("en 3:00"), null = whole step. */
  over: number | null;
  /** Values written as clock values ("5:30"), stored in seconds. */
  clock: boolean;
}

const UNIT_INC: [RegExp, number][] = [
  [/km\s*\/\s*h/i, 0.5],
  [/%/, 0.5],
  [/^niv/i, 1],
  [/rpm|tr\s*\/\s*min/i, 5],
  [/^w(atts?)?$/i, 10],
];
/** Default increment for clock values (paces such as min/km): 10 s. */
const CLOCK_INC = 10;
const MAX_LEVELS = 100;

const VAL = String.raw`-?\d+(?::\d{2}|[.,]\d+)?`;
const RAMP_RE = new RegExp(String.raw`^\s*(${VAL})\s*([^\d→>]*?)\s*(?:→|->)\s*(${VAL})\s*(.*?)\s*$`);
const OPT_RE = /\s+(par|en)\s+(\S+(?:\s*(?:min|s|sec|secondes?|minutes?)\b)?(?:\s+[^\s\d][^\s]*)?)\s*$/i;

/** "1:30" -> 90, "5,5" -> 5.5 (NaN if unreadable); `clock` tells which form was used. */
function parseVal(s: string): { v: number; clock: boolean } {
  const m = s.match(/^(-?\d+):(\d{2})$/);
  if (m) return { v: +m[1] * 60 + +m[2], clock: true };
  return { v: parseNum(s), clock: false };
}

/** Duration of "en …": "3:00", "3 min", "90 s", "3" (minutes). NaN if unreadable. */
function parseOver(s: string): number {
  const t = s.trim().toLowerCase().replace(",", ".");
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(\d+):(\d{2})$/))) return +m[1] * 60 + +m[2];
  if ((m = t.match(/^(\d+(?:\.\d+)?)\s*(?:s|sec|secondes?)$/))) return +m[1];
  if ((m = t.match(/^(\d+(?:\.\d+)?)\s*(?:min|minutes?)?$/))) return +m[1] * 60;
  return NaN;
}

/** Without "par", levels last at least this long (s): the default increment is enlarged if needed. */
export const MIN_AUTO_LEVEL = 20;

/**
 * Returns a ramp when the info is "A → B unit [par S] [en D]" with a usable increment, else null.
 * `stepDur` (timed step duration, s): without "par", the default increment of the unit is multiplied
 * so that each level lasts at least MIN_AUTO_LEVEL seconds ("2 → 6 %" over 1:00 → 2, 4, 6 %).
 */
export function parseRamp(info: string, stepDur?: number): Ramp | null {
  let rest = info.replace(/−/g, "-").trim();
  let inc = NaN;
  let over: number | null = null;
  let m: RegExpMatchArray | null;
  for (let i = 0; i < 2 && (m = rest.match(OPT_RE)); i++) {
    const [, key, raw] = m;
    if (key.toLowerCase() === "par") {
      if (!isNaN(inc)) return null;
      inc = parseVal(raw.trim().split(/\s+/)[0]).v;
      if (!(inc > 0)) return null;
    } else {
      if (over !== null) return null;
      over = parseOver(raw);
      if (!(over > 0)) return null;
    }
    rest = rest.slice(0, m.index).trim();
  }
  if (!(m = rest.match(RAMP_RE))) return null;
  const a = parseVal(m[1]);
  const b = parseVal(m[3]);
  const unit = (m[4] || m[2]).trim();
  if (isNaN(a.v) || isNaN(b.v) || a.clock !== b.clock || a.v === b.v || !unit) return null;
  if (isNaN(inc)) {
    const rule = a.clock ? (/min\s*\/\s*km|\/\s*km|\/\s*100\s*m/i.test(unit) ? CLOCK_INC : NaN) : UNIT_INC.find(([re]) => re.test(unit))?.[1];
    if (!rule) return null;
    inc = rule;
    const time = Math.min(over ?? stepDur ?? 0, stepDur ?? Infinity);
    if (time > 0) {
      // Same level timing as rampAt(): whole step = time / levels, "en D" = D / (levels - 1).
      const range = Math.abs(b.v - a.v);
      const fits = (k: number) => {
        const n = Math.ceil(range / (rule * k) - 1e-9) + 1;
        return (over ? time / (n - 1) : time / n) >= MIN_AUTO_LEVEL - 1e-9 || n <= 2;
      };
      let k = 1;
      while (!fits(k)) k++;
      inc = Math.round(rule * k * 100) / 100;
    }
  }
  const levels = Math.ceil(Math.abs(b.v - a.v) / inc - 1e-9) + 1;
  if (levels < 2 || levels > MAX_LEVELS) return null;
  return { from: a.v, to: b.v, unit, inc, levels, over, clock: a.clock };
}

export interface RampState {
  level: number;
  value: number;
  /** Seconds (step time) at which the next level starts, or null on the last level. */
  nextAt: number | null;
  /** Duration of one level, seconds. */
  len: number;
}

/**
 * Level reached after `elapsed` seconds of a step lasting `dur` seconds.
 * Whole step: every level, the last one included, gets the same time.
 * "en D": the last value is reached at D, then held until the end of the step.
 */
export function rampAt(r: Ramp, elapsed: number, dur: number): RampState {
  const len = r.over ? Math.min(r.over, dur) / (r.levels - 1) : dur / r.levels;
  const level = Math.min(r.levels - 1, Math.max(0, Math.floor(elapsed / len)));
  return { level, value: rampValue(r, level), nextAt: level < r.levels - 1 ? (level + 1) * len : null, len };
}

export function rampValue(r: Ramp, level: number): number {
  if (level >= r.levels - 1) return r.to;
  const sign = r.to > r.from ? 1 : -1;
  return Math.round((r.from + sign * r.inc * level) * 100) / 100;
}

/** "5,5 km/h", "8 %", "5:30 min/km" */
export function rampValueTxt(r: Ramp, value: number): string {
  return (r.clock ? fmtClock(value) : fmtNum(value)) + " " + r.unit;
}
