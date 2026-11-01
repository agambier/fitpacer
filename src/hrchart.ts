import type { Sample } from "./core/session";
import { glitchEpisodes, hrGlitches } from "./core/journal";

const NS = "http://www.w3.org/2000/svg";
const H = 105; // chart height in px (= viewBox height, so labels can be placed in px)
const GAP = 15; // minimum vertical distance between two labels, px

interface Mark { cls: string; v: number; label: string; doubt?: boolean }

/** End-of-session HR chart: curve + horizontal markers (limit, max, average, min) labelled on the right. */
export function hrChart(box: HTMLElement, pts: Sample[], total: number, cap: number | null) {
  const svg = box.querySelector("svg")!;
  const labels = box.querySelector(".marks") as HTMLElement;
  const plot = box.querySelector(".plot") as HTMLElement;
  const note = box.nextElementSibling as HTMLElement;
  svg.replaceChildren();
  labels.replaceChildren();
  plot.querySelectorAll(".ring").forEach((r) => r.remove());
  const glitches = hrGlitches(pts);
  const hrs = pts.map((p) => p.hr);
  const lo = Math.min(80, ...hrs) - 5;
  const hi = Math.max((cap ?? 0) + 5, 120, ...hrs) + 5;
  const y = (v: number) => H - 4 - ((v - lo) / (hi - lo)) * (H - 8);
  const marks: Mark[] = [];
  if (cap != null) marks.push({ cls: "cap", v: cap, label: "limite" });
  if (hrs.length) {
    const avg = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length);
    const min = Math.min(...hrs), max = Math.max(...hrs);
    const doubt = (v: number) => glitches.some((g) => g.hr === v);
    marks.push(
      { cls: "max", v: max, label: "max", doubt: doubt(max) },
      { cls: "avg", v: avg, label: "moy" },
      { cls: "min", v: min, label: "min", doubt: doubt(min) },
    );
  }
  for (const m of marks) {
    const l = document.createElementNS(NS, "line");
    l.setAttribute("class", "mk " + m.cls + (m.doubt ? " doubt" : ""));
    l.setAttribute("x1", "0");
    l.setAttribute("x2", "300");
    l.setAttribute("y1", y(m.v).toFixed(1));
    l.setAttribute("y2", y(m.v).toFixed(1));
    svg.append(l);
  }
  if (pts.length >= 2) {
    const pl = document.createElementNS(NS, "polyline");
    pl.setAttribute("class", "ln");
    pl.setAttribute("points", pts.map((p) => ((p.t / total) * 300).toFixed(1) + "," + y(p.hr).toFixed(1)).join(" "));
    svg.append(pl);
  }
  // Labels: same height as their line, pushed apart when too close, kept inside the box.
  const pos = marks.map((m) => ({ m, top: y(m.v) })).sort((a, b) => a.top - b.top);
  for (let i = 1; i < pos.length; i++) pos[i].top = Math.max(pos[i].top, pos[i - 1].top + GAP);
  for (let i = pos.length - 1; i >= 0; i--) {
    const limit = i === pos.length - 1 ? H - GAP / 2 : pos[i + 1].top - GAP;
    pos[i].top = Math.max(GAP / 2, Math.min(pos[i].top, limit));
  }
  for (const { m, top } of pos) {
    const d = document.createElement("div");
    d.className = "mk " + m.cls + (m.doubt ? " doubt" : "");
    d.style.top = top.toFixed(1) + "px";
    d.innerHTML = "<b>" + m.v + "</b> " + m.label + (m.doubt ? " <i>?</i>" : "");
    labels.append(d);
  }
  // Doubtful points: circled on the curve, explained under the chart.
  // One ring per dropout episode (consecutive doubtful samples), on its most extreme point.
  const episodes = glitchEpisodes(glitches);
  const center = hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
  for (const ep of episodes) {
    const g = ep.reduce((a, b) => (Math.abs(b.hr - center) > Math.abs(a.hr - center) ? b : a));
    const r = document.createElement("div");
    r.className = "ring";
    r.style.left = ((g.t / total) * 100).toFixed(2) + "%";
    r.style.top = y(g.hr).toFixed(1) + "px";
    plot.append(r);
  }
  note.hidden = !glitches.length;
  if (glitches.length) {
    const clean = hrs.filter((_, i) => !glitches.includes(pts[i]));
    const vals = [...new Set(glitches.map((g) => g.hr))].join(", ");
    note.innerHTML = "<i>?</i> " + (episodes.length > 1 ? "Valeurs entourées (" + vals + ") : sans doute des erreurs" : "Valeur entourée (" + vals + ") : sans doute une erreur") +
      " de la montre (perte brève du signal). " + (episodes.length > 1 ? "Sans elles" : "Sans elle") + " : min " + Math.min(...clean) + ", max " + Math.max(...clean) + ".";
  }
}
