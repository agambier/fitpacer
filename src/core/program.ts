// Reads the workout text written by Claude (FitPacer format v1, see NOTES.md).
import { fmtClock } from "./format";
import { parseRamp, type Ramp } from "./ramp";

/** Estimated duration of a repetition step, in seconds. */
export const REP_GUESS = 40;

export interface RepInfo {
  /** Round number (1-based). */
  r: number;
  /** Number of rounds. */
  n: number;
  /** Identifies the block instance, to tell rounds of different blocks apart. */
  block: number;
}

interface StepBase {
  name: string;
  /** Free infos (speed, slope, load…) as written. */
  infos: string[];
  /** Ramp parsed from each info (same index), or null. */
  ramps: (Ramp | null)[];
  note: string;
  rep: RepInfo | null;
  isRest: boolean;
  isCooldown: boolean;
  /** Short label locating the step for deviations, e.g. "Corde (tour 3, 2e)". */
  label: string;
}
export interface TimedStep extends StepBase {
  kind: "time";
  dur: number;
}
export interface RepsStep extends StepBase {
  kind: "reps";
  /** "10" or "Max". */
  reps: string;
  /** Text after the count, e.g. "par côté". */
  extra: string;
}
export type Step = TimedStep | RepsStep;

export interface Program {
  title: string;
  type: string;
  steps: Step[];
  /** Estimated total duration, seconds. */
  est: number;
  errors: string[];
}

const REST_RE = /^(repos|r[ée]cup(?!ération active)|pause)\b/i;
const COOLDOWN_RE = /^(retour au calme|r[ée]cup[ée]ration active|[ée]tirements?|stretching|cool[\s-]?down)/i;

export const isRestName = (name: string) => REST_RE.test(name);

/** Normalizes characters that commonly appear when pasting from a chat. */
export function normalizeLine(raw: string): string {
  return raw
    .replace(/[   ]/g, " ")
    .replace(/\t/g, " ")
    .replace(/−/g, "-")
    .replace(/–(?=\s*\d)/g, "-")
    .replace(/->/g, "→")
    .trim();
}

export function parseDur(input: string): number {
  const s = input.trim().toLowerCase().replace(",", ".");
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d+):(\d{1,2})$/))) return +m[1] * 60 + +m[2];
  if ((m = s.match(/^(\d+)\s*(?:min|mn|m)\s*(\d+)\s*(?:s|sec)?$/))) return +m[1] * 60 + +m[2];
  if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:s|sec|secondes?)$/))) return Math.round(+m[1]);
  if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:min|mn|m|minutes?)?$/))) return Math.round(+m[1] * 60);
  return NaN;
}

type Amount = { kind: "time"; dur: number } | { kind: "reps"; reps: string; extra: string };

export function parseAmount(input: string): Amount | null {
  const s = input.trim();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^max(?:imum)?\b\.?\s*(.*)$/i))) return { kind: "reps", reps: "Max", extra: m[1].trim() };
  if ((m = s.match(/^(\d+)\s*(?:r[ée]p(?:[ée]titions?|s)?|reps?|[x×])(?![a-zà-ÿ])\.?\s*(.*)$/i)))
    return { kind: "reps", reps: m[1], extra: m[2].trim() };
  const d = parseDur(s);
  if (d > 0) return { kind: "time", dur: d };
  return null;
}

/** Label of an info shown above its value. */
export function paramLabel(v: string): string {
  if (/km\s*\/\s*h/i.test(v)) return "Vitesse";
  if (/%/.test(v)) return "Pente";
  if (/\bkg\b/i.test(v)) return "Charge";
  if (/rpm|tr\s*\/\s*min/i.test(v)) return "Cadence";
  if (/\d\s*w\b|watts?/i.test(v)) return "Puissance";
  if (/niv/i.test(v)) return "Niveau";
  return "Consigne";
}

interface Block {
  repeat: number;
  items: Item[];
}
type RawStep = Omit<Step, "rep" | "label" | "ramps" | "isRest" | "isCooldown">;
type Item = Block | RawStep;
const isBlock = (it: Item): it is Block => "repeat" in it;

export function parseProgram(text: string): Program {
  let title = "";
  let type = "";
  const root: Item[] = [];
  const stack: { items: Item[] }[] = [{ items: root }];
  const errors: string[] = [];

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = normalizeLine(raw);
    const where = "Ligne " + (i + 1) + " : ";
    if (!line || line.startsWith("#") || line.startsWith("```") || /^[-*_=]{3,}$/.test(line)) return;
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^titre\s*:\s*(.+)$/i))) { title = m[1].trim(); return; }
    if ((m = line.match(/^type\s*:\s*(.+)$/i))) { type = m[1].trim(); return; }
    if ((m = line.match(/^(?:[x×]\s*(\d+)|(\d+)\s*[x×])\s*\{$/i))) {
      const blk: Block = { repeat: +(m[1] || m[2]), items: [] };
      if (blk.repeat < 1) { errors.push(where + "nombre de répétitions invalide."); }
      stack[stack.length - 1].items.push(blk);
      stack.push(blk);
      return;
    }
    if (line === "}") {
      if (stack.length > 1) stack.pop();
      else errors.push(where + "« } » ferme un bloc qui n’a pas été ouvert.");
      return;
    }
    const p = line.split("|").map((x) => x.trim());
    const amt = parseAmount(p[1] || "");
    if (!p[0]) { errors.push(where + "nom d’étape manquant."); return; }
    if (!amt) { errors.push(where + "quantité illisible (« " + (p[1] || "") + " »). Exemples : 4:00, 45s, 10 rép, 10x, max."); return; }
    const infos = [p[2] || "", p[3] || ""].filter(Boolean);
    const note = p.slice(4).filter(Boolean).join(" ; ");
    stack[stack.length - 1].items.push({ name: p[0], infos, note, ...amt } as RawStep);
  });
  if (stack.length > 1) errors.push("Un bloc de répétition n’est pas fermé : ajoutez une ligne « } ».");

  const steps: Step[] = [];
  let blockSeq = 0;
  const flat = (items: Item[], rep: RepInfo | null) =>
    items.forEach((it) => {
      if (isBlock(it)) {
        const block = ++blockSeq;
        for (let r = 1; r <= it.repeat; r++) flat(it.items, { r, n: it.repeat, block });
      } else {
        steps.push({
          ...it,
          rep,
          ramps: it.kind === "time" ? it.infos.map(parseRamp) : it.infos.map(() => null),
          isRest: REST_RE.test(it.name),
          isCooldown: COOLDOWN_RE.test(it.name),
          label: it.name,
        } as Step);
      }
    });
  flat(root, null);

  // Labels: "Corde (tour 3, 2e)" when a name appears several times in the same round.
  steps.forEach((s) => {
    if (!s.rep) return;
    const same = steps.filter((o) => o.rep && o.rep.block === s.rep!.block && o.rep.r === s.rep!.r && o.name === s.name);
    const k = same.indexOf(s) + 1;
    s.label = s.name + " (tour " + s.rep.r + (same.length > 1 ? ", " + (k === 1 ? "1re" : k + "e") : "") + ")";
  });

  const est = steps.reduce((a, s) => a + weight(s), 0);
  return { title: title || "Séance", type: (type || "salle").toLowerCase(), steps, est, errors };
}

/** Duration used for estimates and the progress bar. */
export const weight = (s: Step) => (s.kind === "time" ? s.dur : REP_GUESS);

/** "4:00", "10 rép par côté", "max" */
export const amountTxt = (s: Step) =>
  s.kind === "time" ? fmtClock(s.dur) : s.reps === "Max" ? "max" : s.reps + " rép" + (s.extra ? " " + s.extra : "");
