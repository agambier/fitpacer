// Spoken announcements (French). Pure text builders; the browser part lives in device/voice.ts.
import { fmtNum } from "./format";
import { rampValueTxt, type Ramp } from "./ramp";
import type { Step } from "./program";
import { COUNTDOWN } from "./session";

/** 90 -> "1 minute 30", 45 -> "45 secondes", 300 -> "5 minutes" */
export function sayDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (!m) return s + (s > 1 ? " secondes" : " seconde");
  const mm = m + (m > 1 ? " minutes" : " minute");
  return s ? m + " minute" + (m > 1 ? "s " : " ") + s : mm;
}

/** Makes an info readable by the speech engine. */
export function sayInfo(info: string): string {
  let t = info
    .replace(/\s+en\s+(\d+):(\d{2})\b/gi, (_, m, s) => " en " + sayDuration(+m * 60 + +s))
    .replace(/\s+par\s+(?=\d)/gi, " par paliers de ")
    .replace(/\b(\d+):(\d{2})(?=\s*(?:→|->|min\s*\/\s*km|\/\s*km|$|\s))/g, (_, m, s) => sayDuration(+m * 60 + +s))
    .replace(/min\s*\/\s*km/gi, "au kilomètre")
    .replace(/(-?\d+(?:[.,]\d+)?(?: minutes?(?: \d+)?)?)\s*(?:→|->)\s*/g, "de $1 à ")
    .replace(/km\s*\/\s*h/gi, "kilomètres heure")
    .replace(/(\d)\s*%/g, "$1 pour cent")
    .replace(/\bkg\b/gi, "kilos")
    .replace(/\brpm\b|tr\s*\/\s*min/gi, "tours par minute")
    .replace(/(\d)\s*W\b/g, "$1 watts")
    .replace(/(\d+)\s*s\b/g, "$1 secondes")
    .replace(/\s\/\s/g, " toutes les ")
    .replace(/(^|\s)-(\d)/g, "$1moins $2")
    .replace(/[−]/g, "moins ");
  return /pour cent/.test(t) ? "pente " + t : t;
}

const REPS_DONE = "Touchez Fait quand c'est terminé.";

function amountPhrase(s: Step): string {
  if (s.kind === "time") return sayDuration(s.dur);
  const extra = s.extra ? " " + s.extra : "";
  return s.reps === "Max" ? "maximum de répétitions" + extra : s.reps + " répétitions" + extra;
}

/** Characters spoken per second, roughly, by Android French voices at rate 1.05. */
const CHARS_PER_SEC = 14;
const fits = (txt: string, sec: number) => txt.length / CHARS_PER_SEC <= sec;

/**
 * Announcement when a step starts. Kept short enough not to overlap the 3-2-1 beeps
 * of a short timed step.
 */
/** Infos and note of a step, as spoken: " allongé sur le dos, bien respirer." ("" if none). */
function restInstructions(s: Step): string {
  const parts = [...s.infos.map(sayInfo), ...(s.note ? [s.note] : [])];
  return parts.length ? " " + parts.join(", ") + "." : "";
}

export function stepAnnouncement(s: Step, next: Step | undefined): string {
  if (s.isRest) {
    const nextTxt = next ? " Ensuite : " + next.name + ", " + amountPhrase(next) + "." : "";
    const instr = restInstructions(s);
    if (s.kind === "time" && s.dur < 15) {
      const short = "Repos." + (next ? " Ensuite : " + next.name + "." : "");
      const withInstr = "Repos." + instr + (next ? " Ensuite : " + next.name + "." : "");
      return instr && fits(withInstr, s.dur - COUNTDOWN - 1) ? withInstr : short;
    }
    const full = "Repos, " + amountPhrase(s) + "." + instr + nextTxt;
    // The next exercise matters most: drop the rest instructions rather than overlap the 3-2-1 beeps.
    return s.kind === "reps" || fits(full, s.dur - COUNTDOWN - 1) ? full : "Repos, " + amountPhrase(s) + "." + nextTxt;
  }
  const infos = s.infos.map(sayInfo).join(", ");
  const base = s.name + ". " + amountPhrase(s) + "." + (infos ? " " + infos + "." : "");
  if (s.kind === "reps") return base + " " + (s.note ? s.note + ". " : "") + REPS_DONE;
  const budget = s.dur - COUNTDOWN - 1; // finish before the 5-4-3-2-1 beeps
  const full = base + (s.note ? " " + s.note + "." : "");
  if (fits(full, budget)) return full;
  if (fits(base, budget)) return base;
  return s.name + ".";
}

/** "Passez à 5 kilomètres heure, pente 8 pour cent." */
export function rampAnnouncement(changes: { ramp: Ramp; value: number }[]): string {
  const parts = changes.map(({ ramp, value }) => sayInfo(rampValueTxt(ramp, value)));
  const txt = parts.join(", ");
  return (txt.startsWith("pente") ? "P" + txt.slice(1) : "Passez à " + txt) + ".";
}

/**
 * Reminder of the current step when resuming after a pause:
 * remaining time and current level of progressions instead of the full plan.
 */
export function resumeAnnouncement(s: Step, next: Step | undefined, remaining: number, rampValues: (number | null)[]): string {
  const left = s.kind === "time" ? "encore " + sayDuration(Math.max(1, Math.round(remaining))) : "";
  if (s.isRest) {
    return "On reprend. Repos" + (left ? ", " + left : "") + "." + restInstructions(s) + (next ? " Ensuite : " + next.name + ", " + amountPhrase(next) + "." : "");
  }
  const infos = s.infos
    .map((info, k) => {
      const r = s.ramps[k];
      const v = rampValues[k];
      return r && v != null ? sayInfo(rampValueTxt(r, v)) : sayInfo(info);
    })
    .join(", ");
  const amount = s.kind === "time" ? left : amountPhrase(s);
  const base = "On reprend. " + s.name + ". " + amount + "." + (infos ? " " + infos + "." : "") + (s.note ? " " + s.note + "." : "");
  return s.kind === "reps" ? base + " " + REPS_DONE : base;
}

export const finishAnnouncement = () => "Séance terminée. Bravo !";
export const hrAlertAnnouncement = (cap: number) => "Fréquence cardiaque au-dessus de " + fmtNum(cap) + ".";
