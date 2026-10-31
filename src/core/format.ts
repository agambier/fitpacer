// Small formatting helpers shared by the whole app (French output).

/** 75 -> "1:15" */
export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return m + ":" + String(s % 60).padStart(2, "0");
}

/** Session length for the journal: "35 min", "1 h 05". */
export function fmtLong(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? h + " h " + String(m).padStart(2, "0") : Math.max(1, m) + " min";
}

/** Planned duration in the journal: "45 s", "5 min", "1:30". */
export function fmtDur(sec: number): string {
  if (sec < 60) return sec + " s";
  return sec % 60 ? fmtClock(sec) : sec / 60 + " min";
}

/** 5.5 -> "5,5", 4 -> "4", -0.5 -> "-0,5" */
export function fmtNum(x: number): string {
  const r = Math.round(x * 100) / 100;
  return String(r).replace(".", ",");
}

/** "5,5" -> 5.5 ; returns NaN when not a number. */
export function parseNum(s: string): number {
  const t = s.trim().replace(/\s/g, "").replace(",", ".").replace(/[−–]/g, "-");
  return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : NaN;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "31/10/2026" */
export function fmtDateFr(d: Date): string {
  return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear();
}

/** "11:02:14" */
export function fmtTime(d: Date): string {
  return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
}

/** "2026-10-31" */
export function fmtDateIso(d: Date): string {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

/** "UTC+1", "UTC-3:30" */
export function fmtUtcOffset(d: Date): string {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const a = Math.abs(off);
  return "UTC" + sign + Math.floor(a / 60) + (a % 60 ? ":" + pad(a % 60) : "");
}

/** "Tapis incliné 35 min" -> "tapis-incline-35-min" */
export function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "seance";
}
