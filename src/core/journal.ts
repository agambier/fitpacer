// Session summary: HR stats, HR analyses, journal line and Markdown export.
import { fmtClock, fmtDateFr, fmtDateIso, fmtDur, fmtLong, fmtNum, fmtTime, fmtUtcOffset, parseNum, slug } from "./format";
import { amountTxt, type Step } from "./program";
import { stepStatuses, type Sample, type Session, type StepStatus } from "./session";

export interface Feedback {
  rpe: number | null;
  comment: string;
  /** Raw text typed by the user, e.g. "82,4". */
  weight: string;
  waist: string;
}

export interface HrStats {
  min: number;
  avg: number;
  max: number;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function hrStats(samples: Sample[]): HrStats | null {
  if (!samples.length) return null;
  const hrs = samples.map((s) => s.hr);
  return { min: Math.min(...hrs), avg: Math.round(mean(hrs)), max: Math.max(...hrs) };
}

/** Mean HR of the samples with lo <= t < hi, or null when fewer than 3 samples. */
function meanBetween(samples: Sample[], lo: number, hi: number): number | null {
  const xs = samples.filter((s) => s.t >= lo && s.t < hi).map((s) => s.hr);
  return xs.length >= 3 ? mean(xs) : null;
}

const stepKey = (s: Step) => s.name + "|" + s.infos.join(", ");

/* ---------- HR analyses ---------- */

export const DRIFT_MIN_PASS = 120; // s, each pass of a repeated step
export const DRIFT_MIN_SINGLE = 480; // s, single long step
export const DRIFT_MIN_DELTA = 5; // bpm
const HR_LAG = 60; // s ignored at the start of each pass

/** "dérive FC Marche ~128→142" for each long, steady effort whose HR rose (or fell) >= 5 bpm. */
export function hrDrift(sess: Session): string[] {
  const steps = sess.program.steps;
  const groups = new Map<string, { name: string; ranges: [number, number][]; dur: number }>();
  sess.logs.forEach((l) => {
    const s = steps[l.idx];
    if (s.kind !== "time" || s.isRest || l.status !== "fait") return;
    const g = groups.get(stepKey(s)) || { name: s.name, ranges: [], dur: s.dur };
    g.ranges.push([l.t0, l.t1]);
    groups.set(stepKey(s), g);
  });
  const out: string[] = [];
  groups.forEach((g) => {
    let a: number | null = null;
    let b: number | null = null;
    if (g.ranges.length >= 2 && g.dur >= DRIFT_MIN_PASS) {
      const [f, l] = [g.ranges[0], g.ranges[g.ranges.length - 1]];
      a = meanBetween(sess.samples, f[0] + HR_LAG, f[1]);
      b = meanBetween(sess.samples, l[0] + HR_LAG, l[1]);
    } else if (g.ranges.length === 1 && g.dur >= DRIFT_MIN_SINGLE) {
      const [t0, t1] = g.ranges[0];
      const mid = (t0 + HR_LAG + t1) / 2;
      a = meanBetween(sess.samples, t0 + HR_LAG, mid);
      b = meanBetween(sess.samples, mid, t1);
    }
    if (a != null && b != null && Math.abs(b - a) >= DRIFT_MIN_DELTA)
      out.push("dérive FC " + g.name + " ~" + Math.round(a) + "→" + Math.round(b));
  });
  return out;
}

/**
 * "récup FC 144→121 en 1 min, 112 en 5 min".
 * Effort ends where the trailing run of rest / cool-down steps starts.
 */
export function hrRecovery(sess: Session): string | null {
  const steps = sess.program.steps;
  const logs = sess.logs;
  let k = logs.length;
  while (k > 0 && (steps[logs[k - 1].idx].isRest || steps[logs[k - 1].idx].isCooldown)) k--;
  if (k === 0 || k === logs.length) return null;
  if (!logs.slice(k).some((l) => steps[l.idx].isCooldown || steps[l.idx].isRest)) return null;
  const tEnd = logs[k].t0;
  const tLast = logs[logs.length - 1].t1;
  if (tLast - tEnd < 60) return null;
  const peak = meanBetween(sess.samples, tEnd - 10, tEnd + 1);
  const at1 = meanBetween(sess.samples, tEnd + 55, tEnd + 66);
  const fin = meanBetween(sess.samples, tLast - 10, tLast + 1);
  if (peak == null || at1 == null) return null;
  let txt = "récup FC " + Math.round(peak) + "→" + Math.round(at1) + " en 1 min";
  const mins = Math.round((tLast - tEnd) / 60);
  if (fin != null && mins >= 2) txt += ", " + Math.round(fin) + " en " + mins + " min";
  return txt;
}

/* ---------- HR availability ---------- */

/** Below this share of the active time with HR, the HR is reported as partial. */
export const HR_PARTIAL_BELOW = 0.9;

/**
 * Tells Claude when HR data is missing, so it does not misread the session:
 * "montre non connectée : pas de FC (ni dérive ni récupération)" or
 * "FC partielle : reçue 23 min sur 35 (montre déconnectée)". Null when HR is complete.
 */
export function hrWarning(sess: Session): string | null {
  const total = activeDuration(sess);
  if (total < 1) return null;
  if (!sess.samples.length) return "montre non connectée : pas de FC (ni dérive ni récupération)";
  const got = Math.min(total, sess.samples.length);
  if (got / total >= HR_PARTIAL_BELOW) return null;
  return "FC partielle : reçue " + fmtLong(got) + " sur " + fmtLong(total) + " (montre déconnectée)";
}

/* ---------- Content and deviations ---------- */

function plannedTxt(s: Step): string {
  return s.kind === "time" ? fmtDur(s.dur) : s.reps === "Max" ? "max" : s.reps + " rép" + (s.extra ? " " + s.extra : "");
}

/** Exercises actually done, grouped (rests excluded): "Marche 5x4 min (5,5 km/h, 7 %)". */
export function doneContent(steps: Step[], statuses: StepStatus[]): string[] {
  const groups = new Map<string, { s: Step; n: number }>();
  steps.forEach((s, i) => {
    if (statuses[i] !== "fait" || s.isRest) return;
    const key = s.name + "|" + amountTxt(s) + "|" + s.infos.join(", ");
    const g = groups.get(key) || { s, n: 0 };
    g.n++;
    groups.set(key, g);
  });
  return [...groups.values()].map(
    ({ s, n }) => s.name + " " + (n > 1 ? n + "x" : "") + plannedTxt(s) + (s.infos.length ? " (" + s.infos.join(", ") + ")" : ""),
  );
}

/** "sauté : …", "écourté : …", "non fait (arrêt) : …" (rests ignored). */
export function deviations(sess: Session, statuses: StepStatus[]): string[] {
  const steps = sess.program.steps;
  const out: string[] = [];
  const skipped = steps.map((s, i) => (statuses[i] === "sauté" && !s.isRest ? s.label : "")).filter(Boolean);
  if (skipped.length) out.push("sauté : " + skipped.join(", "));
  const short: string[] = [];
  steps.forEach((s, i) => {
    if (statuses[i] !== "écourté" || s.isRest || s.kind !== "time") return;
    const best = Math.max(...sess.logs.filter((l) => l.idx === i).map((l) => l.t1 - l.t0));
    short.push(s.label + " " + fmtClock(best) + "/" + fmtClock(s.dur));
  });
  if (short.length) out.push("écourté : " + short.join(", "));
  const notDone = new Map<string, number>();
  steps.forEach((s, i) => {
    if (statuses[i] === "arrêt" && !s.isRest) notDone.set(s.name, (notDone.get(s.name) || 0) + 1);
  });
  if (notDone.size)
    out.push("non fait (arrêt) : " + [...notDone].map(([n, c]) => n + (c > 1 ? " x" + c : "")).join(", "));
  return out;
}

/* ---------- Journal line ---------- */

const clean = (s: string) => s.replace(/\s*\n\s*/g, " ; ").replace(/\|/g, "/").trim();

function measure(raw: string, unit: string): string {
  const v = parseNum(raw);
  return isNaN(v) || v <= 0 ? "–" : fmtNum(v) + " " + unit;
}

export const RPE_TXT = ["", "Très facile", "Très facile", "Facile", "Modéré", "Un peu dur", "Dur", "Dur", "Très dur", "Très dur", "Maximal"];

/** Duration actually trained (pauses excluded), seconds. */
export const activeDuration = (sess: Session) => (sess.logs.length ? sess.logs[sess.logs.length - 1].t1 : 0);

/**
 * 9 columns, never change their order (contract with Claude's journal):
 * date | type | durée | contenu et perfs | FC min/moy/max | ressenti x/10 | poids | tour de taille | remarque
 */
export function journalLine(sess: Session, fb: Feedback): string {
  const p = sess.program;
  const statuses = stepStatuses(sess);
  const content = [...doneContent(p.steps, statuses), ...deviations(sess, statuses)];
  const st = hrStats(sess.samples);
  const remark = [clean(fb.comment), hrWarning(sess) || "", ...hrDrift(sess), hrRecovery(sess) || ""].filter(Boolean).join(" ; ");
  return [
    fmtDateFr(new Date(sess.startWall)),
    p.type,
    fmtLong(activeDuration(sess)),
    clean(p.title) + (sess.stoppedByUser ? " (arrêtée avant la fin)" : "") + (content.length ? " : " + content.join(" ; ") : ""),
    st ? st.min + "/" + st.avg + "/" + st.max : "FC non reçue",
    "ressenti " + (fb.rpe ?? "?") + "/10",
    measure(fb.weight, "kg"),
    measure(fb.waist, "cm"),
    remark || "–",
  ].join(" | ");
}

/** HR mean / max per step (grouped by name + infos), for the summary table. */
export function hrPerStep(sess: Session): { label: string; avg: number; max: number }[] {
  const g = new Map<string, { sum: number; n: number; max: number }>();
  sess.samples.forEach((p) => {
    const s = sess.program.steps[p.idx];
    const key = s.name + (s.infos.length ? " (" + s.infos.join(", ") + ")" : "");
    const x = g.get(key) || { sum: 0, n: 0, max: 0 };
    x.sum += p.hr;
    x.n++;
    x.max = Math.max(x.max, p.hr);
    g.set(key, x);
  });
  return [...g].map(([label, x]) => ({ label, avg: Math.round(x.sum / x.n), max: x.max }));
}

/* ---------- Markdown export ---------- */

export interface ExportMeta {
  source: string;
  /** "v26.10.01" */
  appVersion?: string;
  cap: number;
  device: string | null;
}

const md = (s: string) => s.replace(/\|/g, "\\|");

export function exportFileName(sess: Session, ext = "md"): string {
  const d = new Date(sess.startWall);
  const hm = String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0");
  return "fitpacer-" + fmtDateIso(d) + "-" + hm + "-" + slug(sess.program.title) + "." + ext;
}

export function exportMarkdown(sess: Session, fb: Feedback, meta: ExportMeta): string {
  const p = sess.program;
  const start = new Date(sess.startWall);
  const end = new Date(sess.endWall || sess.startWall);
  const st = hrStats(sess.samples);
  const L: string[] = [];
  L.push("# FitPacer — " + p.title + " — " + fmtDateFr(start) + " " + fmtTime(start).slice(0, 5), "");
  L.push("## Ligne de journal", "", journalLine(sess, fb), "");
  if (meta.appVersion) L.push("Généré par FitPacer " + meta.appVersion + ".", "");
  L.push("## Séance", "");
  L.push("- Début : " + fmtDateIso(start) + " " + fmtTime(start) + " (heure locale, " + fmtUtcOffset(start) + ") — Fin : " + fmtTime(end) +
    " — Durée active : " + fmtClock(activeDuration(sess)) + " — Durée totale (pauses incluses) : " + fmtClock((sess.endWall - sess.startWall) / 1000));
  L.push("- Type : " + p.type + " — Plafond FC : " + meta.cap + " — Capteur FC : " + (meta.device || "aucun") +
    " — FC min/moy/max : " + (st ? st.min + "/" + st.avg + "/" + st.max : "FC non reçue"));
  const warn = hrWarning(sess);
  if (warn) L.push("- ⚠️ " + warn.charAt(0).toUpperCase() + warn.slice(1) + ". Les données de FC de cette séance sont incomplètes : se fier au fichier .fit de la montre s'il existe.");
  L.push("- Ressenti : " + (fb.rpe ? fb.rpe + "/10 (" + RPE_TXT[fb.rpe] + ")" : "non noté") + " — Poids : " + measure(fb.weight, "kg") +
    " — Tour de taille : " + measure(fb.waist, "cm"));
  L.push("- Commentaire : " + (clean(fb.comment) || "–"));
  L.push("- Arrêtée avant la fin : " + (sess.stoppedByUser ? "oui" : "non"), "");

  L.push("## Étapes", "");
  L.push("Heures locales. Statut : fait / écourté / sauté / arrêt (étape en cours quand la séance a été terminée). Les étapes jamais atteintes sont listées à la fin.", "");
  L.push("| # | Tour | Étape | Prévu | Consignes | Début | Fin | Durée | Statut | FC moy | FC max |");
  L.push("|---|------|-------|-------|-----------|-------|-----|-------|--------|--------|--------|");
  type Row = { wall: number; line: string };
  const rows: Row[] = sess.logs.map((l) => {
    const s = p.steps[l.idx];
    const hrs = sess.samples.filter((x) => x.t >= l.t0 && x.t < l.t1).map((x) => x.hr);
    return {
      wall: l.wall0,
      line: "| " + [
        l.idx + 1,
        s.rep ? s.rep.r + "/" + s.rep.n : "",
        md(s.name),
        amountTxt(s),
        md(s.infos.join(", ")),
        fmtTime(new Date(l.wall0)),
        fmtTime(new Date(l.wall1)),
        fmtClock(l.t1 - l.t0),
        l.status,
        hrs.length ? Math.round(mean(hrs)) : "–",
        hrs.length ? Math.max(...hrs) : "–",
      ].join(" | ") + " |",
    };
  });
  sess.pauses.forEach((pz) => {
    const w1 = pz.wall1 || sess.endWall;
    rows.push({
      wall: pz.wall0,
      line: "| | | *pause* | | | " + fmtTime(new Date(pz.wall0)) + " | " + fmtTime(new Date(w1)) + " | " + fmtClock((w1 - pz.wall0) / 1000) + " | pause | | |",
    });
  });
  rows.sort((a, b) => a.wall - b.wall).forEach((r) => L.push(r.line));
  const statuses = stepStatuses(sess);
  const never = p.steps.map((s, i) => (statuses[i] === "arrêt" && !sess.logs.some((l) => l.idx === i) ? i + 1 + ". " + s.label : "")).filter(Boolean);
  if (never.length) L.push("", "Jamais atteintes : " + never.join(", "));
  L.push("");

  const perStep = hrPerStep(sess);
  if (perStep.length) {
    L.push("## FC par exercice", "", "| Exercice | FC moy | FC max |", "|---|---|---|");
    perStep.forEach((x) => L.push("| " + md(x.label) + " | " + x.avg + " | " + x.max + " |"));
    L.push("");
  }
  const analyses = [...hrDrift(sess), hrRecovery(sess) || ""].filter(Boolean);
  if (analyses.length) L.push("## Analyses FC", "", ...analyses.map((a) => "- " + a), "");

  L.push("## Fréquence cardiaque (toutes les 5 s)", "");
  if (sess.samples.length) {
    L.push("```csv", "heure,fc,etape");
    let next = 0;
    sess.samples.forEach((x) => {
      if (x.t < next) return;
      next = Math.floor(x.t / 5) * 5 + 5;
      L.push(fmtTime(new Date(x.wall)) + "," + x.hr + "," + (x.idx + 1));
    });
    L.push("```", "");
  } else L.push("FC non reçue.", "");

  L.push("## Programme collé", "", "```", meta.source.trim(), "```", "");
  return L.join("\n");
}
