import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./styles.css";
import { registerSW } from "virtual:pwa-register";

import { fmtClock, fmtLong } from "./core/format";
import { amountTxt, paramLabel, parseProgram, weight, type Program } from "./core/program";
import { rampValueTxt } from "./core/ramp";
import { Session, type Sample, type SessionEvent } from "./core/session";
import { exportFileName, exportMarkdown, hrPerStep, hrStats, journalLine, RPE_TXT, activeDuration, type Feedback } from "./core/journal";
import { finishAnnouncement, hrAlertAnnouncement, rampAnnouncement, resumeAnnouncement, stepAnnouncement } from "./core/speech";
import { APP_VERSION } from "./version";
import { claudeInstructions, FORMAT_VERSION } from "./core/instructions";
import { store } from "./device/store";
import { keepAwake, releaseAwake, sounds, unlockAudio } from "./device/feedback";
import { say, setVoiceEnabled, unlockVoice, voiceEnabled, voiceSupported } from "./device/voice";
import { canShareFiles, copyText, downloadText, shareText } from "./device/share";
import { HeartRateMonitor, type BtState } from "./device/heartRate";

registerSW({ immediate: true });

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = "") => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

function showMsg(t: string) {
  const m = $("msg");
  m.textContent = t;
  m.hidden = !t;
}

function show(id: "edit" | "run" | "done") {
  (["edit", "run", "done"] as const).forEach((x) => ($(x).hidden = x !== id));
  window.scrollTo(0, 0);
}

/** Temporarily changes a button label ("Copié"). */
function flashLabel(b: HTMLElement, txt: string) {
  const orig = b.dataset.label || b.textContent || "";
  b.dataset.label = orig;
  b.textContent = txt;
  setTimeout(() => (b.textContent = orig), 2500);
}

/* ---------- Editor ---------- */
const src = $<HTMLTextAreaElement>("src");
const cap = $<HTMLInputElement>("cap");
src.value = store.get("fitpacer.text", store.get("guidee.texte", ""));
cap.value = store.get("fitpacer.cap", store.get("guidee.plafond", "150"));
const capValue = () => +cap.value || 150;
let prog: Program = parseProgram("");

function refreshPlan() {
  prog = parseProgram(src.value);
  store.set("fitpacer.text", src.value);
  $("planTitle").textContent = prog.title;
  const errs = $("errors");
  errs.replaceChildren(...prog.errors.map((e) => el("li", "", e)));
  const plan = $("plan");
  plan.replaceChildren(
    ...prog.steps.map((s) => {
      const li = el("li", s.isRest ? "rest" : "");
      const a = el("span", "t" + (s.kind === "reps" ? " reps" : ""), s.kind === "time" ? fmtClock(s.dur) : s.reps === "Max" ? "max" : s.reps + "×");
      const b = el("span", "d", s.name + (s.rep ? "  (" + s.rep.r + "/" + s.rep.n + ")" : "") + (s.kind === "reps" && s.extra ? ", " + s.extra : ""));
      const c = el("span", "s", s.infos.join(" · "));
      li.append(a, b, c);
      return li;
    }),
  );
  const nReps = prog.steps.filter((s) => s.kind === "reps").length;
  $("total").textContent = prog.steps.length
    ? prog.steps.length + " étapes, environ " + fmtLong(prog.est) + (nReps ? " (dont " + nReps + " en répétitions, durée estimée)" : "") + "."
    : "Collez une séance pour commencer.";
  $<HTMLButtonElement>("startBtn").disabled = !prog.steps.length || prog.errors.length > 0;
}
src.addEventListener("input", refreshPlan);
cap.addEventListener("change", () => store.set("fitpacer.cap", cap.value));

$("pasteBtn").addEventListener("click", async () => {
  try {
    const t = await navigator.clipboard.readText();
    if (!t.trim()) {
      showMsg("Le presse-papiers est vide. Copiez d’abord la séance dans la conversation avec Claude.");
      return;
    }
    src.value = t.trim();
    refreshPlan();
    showMsg("");
    window.scrollTo(0, 0);
  } catch {
    src.focus();
    showMsg("Le navigateur n’autorise pas la lecture du presse-papiers. Faites un appui long dans la zone de texte, puis « Coller ».");
  }
});
$("clearBtn").addEventListener("click", () => {
  if (src.value.trim() && !confirm("Effacer la séance affichée ?")) return;
  src.value = "";
  refreshPlan();
  src.focus();
});
refreshPlan();

/* ---------- Claude instructions ---------- */
$("appVersion").textContent = APP_VERSION;
$("barVersion").textContent = APP_VERSION;

/* ---------- Top menu ---------- */
const menu = $("menu");
const menuBtn = $("menuBtn");
function setMenu(open: boolean) {
  menu.hidden = !open;
  menuBtn.setAttribute("aria-expanded", String(open));
}
menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  setMenu(menu.hidden === true);
});
document.addEventListener("click", (e) => {
  if (!menu.hidden && !menu.contains(e.target as Node)) setMenu(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});
menu.querySelectorAll<HTMLButtonElement>("[data-open]").forEach((b) =>
  b.addEventListener("click", () => {
    setMenu(false);
    $<HTMLDialogElement>(b.dataset.open!).showModal();
  }),
);
document.querySelectorAll<HTMLDialogElement>("dialog.info").forEach((d) => {
  d.querySelector("[data-close]")?.addEventListener("click", () => d.close());
  // tap on the backdrop closes the popup
  d.addEventListener("click", (e) => {
    if (e.target === d) d.close();
  });
});
$("aboutFmt").textContent = "Format FitPacer " + FORMAT_VERSION;
$("fmtVersion").textContent = "Format FitPacer " + FORMAT_VERSION + ".";
const instrName = "fitpacer-consignes-claude.md";
$("instrCopy").addEventListener("click", async (e) => {
  const ok = await copyText(claudeInstructions());
  flashLabel(e.currentTarget as HTMLElement, ok ? "Copié ✓" : "Copie impossible");
});
$("instrShare").addEventListener("click", async () => {
  const r = await shareText(instrName, claudeInstructions(), "Consignes FitPacer pour Claude");
  if (r === "unsupported") downloadText(instrName, claudeInstructions());
});
$("instrDownload").addEventListener("click", () => downloadText(instrName, claudeInstructions()));
if (!canShareFiles()) {
  $("instrShare").hidden = true;
  $("shareBtn").hidden = true;
}

/* ---------- Voice toggle ---------- */
const voiceBtn = $("voiceBtn");
function renderVoice() {
  const on = voiceEnabled();
  voiceBtn.textContent = on ? "🔊" : "🔇";
  voiceBtn.setAttribute("aria-pressed", String(on));
  voiceBtn.title = on ? "Annonces vocales activées" : "Annonces vocales coupées";
}
if (!voiceSupported()) voiceBtn.hidden = true;
voiceBtn.addEventListener("click", () => {
  setVoiceEnabled(!voiceEnabled());
  if (voiceEnabled()) {
    unlockVoice();
    say("Annonces vocales activées.", { interrupt: true });
  }
  renderVoice();
});
renderVoice();

/* ---------- Heart rate ---------- */
let hr: number | null = null;
let hrAt = 0;
const hrFresh = () => hr != null && performance.now() - hrAt < 5000;
const btBtn = $("btBtn");
const monitor = new HeartRateMonitor({
  onHr(bpm) {
    hr = bpm;
    hrAt = performance.now();
    renderHr();
  },
  onState(state: BtState, name?: string) {
    btBtn.dataset.s = state;
    btBtn.textContent =
      state === "on" ? (name || "Montre") + " connectée" : state === "connecting" ? "Connexion…" : state === "lost" ? "Reconnexion…" : monitor.wide ? "Chercher tous les appareils" : "Connecter la montre";
  },
  onMessage: showMsg,
});
function renderHr() {
  const box = $("hrBox");
  const c = capValue();
  $("hrVal").textContent = hrFresh() ? String(hr) : "--";
  box.className = "hr num " + (!hrFresh() ? "stale" : hr! > c ? "over" : hr! > c - 10 ? "near" : "calm");
}
btBtn.addEventListener("click", async () => {
  if (btBtn.dataset.s === "on") return;
  await monitor.connect();
  if (btBtn.dataset.s === "off") btBtn.textContent = monitor.wide ? "Chercher tous les appareils" : "Connecter la montre";
});
setInterval(renderHr, 1000);

/* ---------- Run ---------- */
let sess: Session | null = null;
let runSource = "";
const clock = { mono: () => performance.now(), wall: () => Date.now() };

function sparkline(svg: SVGSVGElement, pts: Sample[], total: number) {
  svg.replaceChildren();
  const c = capValue();
  const hrs = pts.map((p) => p.hr);
  const lo = Math.min(80, ...hrs) - 5;
  const hi = Math.max(c + 5, ...hrs) + 5;
  const y = (v: number) => 70 - ((v - lo) / (hi - lo)) * 66 - 2;
  const ns = "http://www.w3.org/2000/svg";
  const line = document.createElementNS(ns, "line");
  line.setAttribute("class", "cap");
  line.setAttribute("x1", "0");
  line.setAttribute("x2", "300");
  line.setAttribute("y1", String(y(c)));
  line.setAttribute("y2", String(y(c)));
  svg.append(line);
  if (pts.length < 2) return;
  const pl = document.createElementNS(ns, "polyline");
  pl.setAttribute("class", "ln");
  pl.setAttribute("points", pts.map((p) => ((p.t / total) * 300).toFixed(1) + "," + y(p.hr).toFixed(1)).join(" "));
  svg.append(pl);
}

function buildSegs() {
  $("segs").replaceChildren(
    ...prog.steps.map((s) => {
      const sp = el("span");
      sp.style.flex = weight(s) + " 0 0";
      return sp;
    }),
  );
}

function renderStep() {
  if (!sess) return;
  const i = sess.idx;
  const s = sess.step;
  const n = prog.steps[i + 1];
  $("sName").textContent = s.name;
  $("sRep").textContent = s.rep ? s.rep.r + "/" + s.rep.n : "";
  const params = $("params");
  params.replaceChildren(
    ...s.infos.map((v, k) => {
      const ramp = s.ramps[k];
      const d = el("div", "param" + (/%/.test(v) ? " slope" : "") + (ramp ? " ramping" : ""));
      d.dataset.k = String(k);
      d.append(el("div", "k", paramLabel(v)), el("div", "v", v));
      if (ramp) d.append(el("div", "r"));
      return d;
    }),
  );
  params.hidden = !s.infos.length;
  $("sNote").textContent = s.note;
  const isReps = s.kind === "reps";
  $("doneBtn").hidden = !isReps;
  const c = $("clock");
  c.classList.remove("last");
  if (isReps) {
    c.textContent = s.reps === "Max" ? "Max" : s.reps;
    c.append(el("span", "unit", (s.reps === "Max" ? "le plus possible" : "répétitions") + (s.extra ? " " + s.extra : "")));
  }
  $("nextTxt").textContent = n ? n.name + " (" + amountTxt(n) + ")" : "Fin de séance";
  [...$("segs").children].forEach((sp, k) => (sp.className = k < i ? "done" : k === i ? "cur" : ""));
  renderLive();
}

/** Current slope for the ramp drawing: guided value when the slope is a progression. */
function currentSlope(): number | null {
  if (!sess) return null;
  const s = sess.step;
  const states = sess.rampStates();
  for (let k = 0; k < s.infos.length; k++) {
    if (!/%/.test(s.infos[k])) continue;
    if (states[k]) return states[k]!.value;
    const m = s.infos[k].replace(/−/g, "-").match(/(-?\d+(?:[.,]\d+)?)\s*%\s*$/);
    if (m) return parseFloat(m[1].replace(",", "."));
  }
  return null;
}

/** Parts refreshed on every tick. */
function renderLive() {
  if (!sess) return;
  const s = sess.step;
  const el0 = sess.stepElapsed();
  if (s.kind === "time") {
    const rem = s.dur - el0;
    $("clock").textContent = fmtClock(Math.ceil(rem - 0.001));
    $("clock").classList.toggle("last", rem <= 10);
    $("sub").textContent = "";
  } else {
    $("sub").textContent = "En cours depuis " + fmtClock(el0);
  }
  // Guided progressions
  sess.rampStates().forEach((st, k) => {
    const ramp = s.ramps[k];
    if (!st || !ramp || s.kind !== "time") return;
    const box = $("params").querySelector<HTMLElement>('[data-k="' + k + '"]');
    if (!box) return;
    box.querySelector(".v")!.textContent = rampValueTxt(ramp, st.value);
    box.querySelector(".r")!.textContent =
      "→ " + rampValueTxt(ramp, ramp.to) + (st.nextAt != null ? " · palier dans " + fmtClock(Math.ceil(st.nextAt - el0)) : " · dernier palier");
  });
  const slope = currentSlope();
  $("ramp").hidden = slope === null;
  $("spacer").hidden = slope !== null;
  if (slope !== null) $("rampPath").setAttribute("d", "M0 58 L400 58 L400 " + (58 - Math.min(56, Math.max(2, slope * 4))) + " Z");
  $("elapsed").textContent = fmtClock(sess.elapsed());
  $("left").textContent = "reste ≈ " + fmtClock(sess.remaining());
}

function flashStage() {
  const st = $("stage");
  st.classList.add("flash");
  setTimeout(() => st.classList.remove("flash"), 1500);
}

function handle(events: SessionEvent[]) {
  if (!sess) return;
  for (const e of events) {
    switch (e.type) {
      case "countdown":
        sounds.countdown();
        break;
      case "step":
        renderStep();
        if (e.announce) {
          sounds.step();
          flashStage();
        }
        say(stepAnnouncement(prog.steps[e.idx], prog.steps[e.idx + 1]), { interrupt: true, delay: e.announce ? 500 : 0 });
        break;
      case "ramp": {
        const s = prog.steps[e.idx];
        if (sess.stepElapsed() < 1) break; // first level is part of the step announcement
        sounds.ramp();
        e.changes.forEach((c) => {
          const box = $("params").querySelector<HTMLElement>('[data-k="' + c.info + '"]');
          box?.classList.remove("bump");
          void box?.offsetWidth;
          box?.classList.add("bump");
        });
        say(rampAnnouncement(e.changes.map((c) => ({ ramp: s.ramps[c.info]!, value: c.value }))), { delay: 350 });
        break;
      }
      case "hrAlert":
        sounds.hrAlert();
        say(hrAlertAnnouncement(capValue()));
        break;
      case "finish":
        finish();
        return;
    }
  }
}

function loop() {
  if (!sess || sess.state === "finished") return;
  sess.hr(hrFresh() ? hr : null, capValue());
  handle(sess.tick());
  if (!sess) return; // finish() clears it
  renderLive();
  if (sess.state === "running" && sess.samples.length && sess.samples.length % 5 === 0)
    sparkline($<SVGSVGElement & HTMLElement>("spark"), sess.samples, Math.max(prog.est, sess.elapsed() + 1));
}
setInterval(loop, 200);

function startSession() {
  showMsg(monitor.supported ? "" : "Séance sans FC : ce navigateur ne permet pas de connecter la montre (détails : bouton « Connecter la montre »).");
  buildSegs();
  sparkline($<SVGSVGElement & HTMLElement>("spark"), [], prog.est);
  $("pauseBtn").textContent = "Pause";
  show("run");
  void keepAwake();
  sounds.start();
  runSource = src.value;
  sess = new Session(prog, clock);
  handle(sess.tick());
}

const watchDialog = $<HTMLDialogElement>("watchDialog");
$("startBtn").addEventListener("click", () => {
  refreshPlan();
  if (!prog.steps.length || prog.errors.length) return;
  unlockAudio();
  unlockVoice();
  // Watch not connected: ask before starting (Bluetooth chooser needs this user gesture).
  if (monitor.supported && btBtn.dataset.s !== "on" && typeof watchDialog.showModal === "function") {
    watchDialog.showModal();
    return;
  }
  startSession();
});
$("watchYes").addEventListener("click", async () => {
  watchDialog.close();
  await monitor.connect(); // opens the Bluetooth chooser
  startSession();
  if (btBtn.dataset.s !== "on" && btBtn.dataset.s !== "connecting")
    showMsg("Montre non connectée : séance sans FC. Le bouton en haut permet de la connecter à tout moment.");
});
$("watchNo").addEventListener("click", () => {
  watchDialog.close();
  startSession();
});
$("doneBtn").addEventListener("click", () => {
  if (!sess) return;
  sess.done();
  $("pauseBtn").textContent = "Pause";
  handle(sess.tick());
});
$("pauseBtn").addEventListener("click", () => {
  if (!sess) return;
  if (sess.state === "running") {
    sess.pause();
    $("pauseBtn").textContent = "Reprendre";
    say("Pause.", { interrupt: true });
  } else if (sess.state === "paused") {
    sess.resume();
    $("pauseBtn").textContent = "Pause";
    void keepAwake();
    const st = sess.step;
    const remaining = st.kind === "time" ? st.dur - sess.stepElapsed() : 0;
    say(resumeAnnouncement(st, prog.steps[sess.idx + 1], remaining, sess.rampStates().map((r) => (r ? r.value : null))), { interrupt: true });
  }
});
$("nextBtn").addEventListener("click", () => {
  if (!sess) return;
  sess.next();
  handle(sess.tick());
});
$("prevBtn").addEventListener("click", () => {
  if (!sess) return;
  sess.prev();
  handle(sess.tick());
});
$("stopBtn").addEventListener("click", () => {
  if (!sess || !confirm("Terminer la séance maintenant ?")) return;
  sess.stop();
  handle(sess.tick());
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && sess?.state === "running") void keepAwake();
});
window.addEventListener("beforeunload", (e) => {
  if (sess && sess.state !== "finished") e.preventDefault();
});

/* ---------- Summary ---------- */
const fb: Feedback = { rpe: null, comment: "", weight: "", waist: "" };
let finished: Session | null = null;

function finish() {
  if (!sess) return;
  finished = sess;
  sess = null;
  releaseAwake();
  sounds.finish();
  say(finishAnnouncement(), { interrupt: true, delay: 600 });

  const st = hrStats(finished.samples);
  const dur = activeDuration(finished);
  $("stats").replaceChildren(
    ...[
      ["Durée", fmtLong(dur)],
      ["FC min / moy", st ? st.min + " / " + st.avg : "–"],
      ["FC max", st ? String(st.max) : "–"],
    ].map(([k, v]) => {
      const d = el("div");
      d.append(el("div", "k", k), el("div", "v", v));
      return d;
    }),
  );
  sparkline($<SVGSVGElement & HTMLElement>("spark2"), finished.samples, Math.max(dur, 1));
  const tbl = $<HTMLTableElement>("perStep");
  tbl.replaceChildren();
  const per = hrPerStep(finished);
  if (per.length) {
    const head = tbl.insertRow();
    ["Étape", "FC moy", "FC max"].forEach((h, k) => {
      const th = el("th", k ? "r" : "", h);
      head.append(th);
    });
    per.forEach((x) => {
      const r = tbl.insertRow();
      r.insertCell().textContent = x.label;
      const b = r.insertCell();
      b.className = "r";
      b.textContent = String(x.avg);
      const c = r.insertCell();
      c.className = "r";
      c.textContent = String(x.max);
    });
  }
  fb.rpe = null;
  fb.comment = fb.weight = fb.waist = "";
  $<HTMLTextAreaElement>("comment").value = "";
  $<HTMLInputElement>("weight").value = "";
  $<HTMLInputElement>("waist").value = "";
  renderRpe();
  show("done");
}

const rpeBox = $("rpe");
for (let n = 1; n <= 10; n++) {
  const b = el("button", "", String(n));
  b.type = "button";
  b.setAttribute("role", "radio");
  b.setAttribute("aria-checked", "false");
  b.addEventListener("click", () => {
    fb.rpe = n;
    renderRpe();
  });
  rpeBox.append(b);
}
function renderRpe() {
  [...rpeBox.children].forEach((b, k) => b.setAttribute("aria-checked", String(k + 1 === fb.rpe)));
  $("rpeTxt").textContent = fb.rpe ? fb.rpe + "/10 : " + RPE_TXT[fb.rpe] : "Touchez une note.";
  updateJournal();
}
function updateJournal() {
  if (finished) $<HTMLTextAreaElement>("journal").value = journalLine(finished, fb);
}
$("comment").addEventListener("input", (e) => {
  fb.comment = (e.target as HTMLTextAreaElement).value;
  updateJournal();
});
$("weight").addEventListener("input", (e) => {
  fb.weight = (e.target as HTMLInputElement).value;
  updateJournal();
});
$("waist").addEventListener("input", (e) => {
  fb.waist = (e.target as HTMLInputElement).value;
  updateJournal();
});

const exportText = () => exportMarkdown(finished!, fb, { source: runSource, appVersion: APP_VERSION, cap: capValue(), device: monitor.name });
$("copyBtn").addEventListener("click", async (e) => {
  const ok = await copyText($<HTMLTextAreaElement>("journal").value, $<HTMLTextAreaElement>("journal"));
  flashLabel(e.currentTarget as HTMLElement, ok ? "Ligne copiée ✓" : "Sélectionnée, copiez-la");
});
$("shareBtn").addEventListener("click", async () => {
  if (!finished) return;
  const r = await shareText(exportFileName(finished), exportText(), "Séance FitPacer");
  if (r === "unsupported") downloadText(exportFileName(finished), exportText());
});
$("downloadBtn").addEventListener("click", () => {
  if (finished) downloadText(exportFileName(finished), exportText());
});
$("againBtn").addEventListener("click", () => show("edit"));
