import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./styles.css";
import { hrChart } from "./hrchart";
import { registerSW } from "virtual:pwa-register";

import { fmtClock, fmtLong } from "./core/format";
import { amountTxt, hrZoneTxt, paramLabel, parseProgram, sessionHrMax, weight, type HrZone, type Program } from "./core/program";
import { rampValueTxt } from "./core/ramp";
import { RAMP_COUNTDOWN_MIN_LEN, Session, zoneState, type Sample, type SessionEvent } from "./core/session";
import { exportFileName, exportMarkdown, hrGlitches, hrPerStep, hrStats, journalLine, RPE_TXT, activeDuration, type Feedback } from "./core/journal";
import { finishAnnouncement, hrAlertAnnouncement, hrZoneAnnouncement, rampAnnouncement, resumeAnnouncement, stepAnnouncement } from "./core/speech";
import { APP_VERSION, IS_DEV_BUILD } from "./version";
import { claudeInstructions, FORMAT_VERSION } from "./core/instructions";
import { launchPopup, notesSince, RELEASES } from "./core/whatsnew";
import { store } from "./device/store";
import { keepAwake, releaseAwake, sounds, unlockAudio } from "./device/feedback";
import { say, setVoiceEnabled, unlockVoice, voiceEnabled, voiceSupported } from "./device/voice";
import { canShareFiles, copyText, downloadText, shareText } from "./device/share";
import { HeartRateMonitor, type BtState } from "./device/heartRate";
import { applyTheme, currentTheme, setTheme, type Theme } from "./device/theme";

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

/** Yes/no question in the app's own popup (not the browser's confirm()). Resolves false if dismissed. */
function askConfirm(question: string, yes: string, no: string): Promise<boolean> {
  const d = $<HTMLDialogElement>("confirmDialog");
  if (typeof d.showModal !== "function") return Promise.resolve(confirm(question));
  $("confirmQ").textContent = question;
  $("confirmYes").textContent = yes;
  $("confirmNo").textContent = no;
  return new Promise((resolve) => {
    let answer = false;
    const pick = (v: boolean) => () => { answer = v; d.close(); };
    const yesB = $("confirmYes"), noB = $("confirmNo");
    const onYes = pick(true), onNo = pick(false);
    yesB.addEventListener("click", onYes);
    noB.addEventListener("click", onNo);
    d.addEventListener("close", () => {
      yesB.removeEventListener("click", onYes);
      noB.removeEventListener("click", onNo);
      resolve(answer);
    }, { once: true });
    d.showModal();
  });
}
const CHECK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
/** Feedback on an icon button: a check mark when it worked, otherwise a short text, then the icon again. */
function flashIcon(b: HTMLElement, ok: boolean, failTxt: string) {
  const orig = b.dataset.icon || b.innerHTML;
  b.dataset.icon = orig;
  if (ok) { b.innerHTML = CHECK_ICON; b.classList.add("done"); }
  else b.textContent = failTxt;
  setTimeout(() => { b.innerHTML = orig; b.classList.remove("done"); }, 2000);
}

/* ---------- Editor ---------- */
const src = $<HTMLTextAreaElement>("src");
src.value = store.get("fitpacer.text", store.get("guidee.texte", ""));
let prog: Program = parseProgram("");
/** HR alert threshold of the current session (written in the workout by the AI), or null. */
const capValue = (p: Program = sess?.program ?? prog) => sessionHrMax(p).value;
const NO_CAP_MSG = "FC max absente de la séance : pas d’alerte de FC trop haute. Demandez à l’IA d’ajouter la ligne « fc max: … ».";

/** Session HR max box on the program screen (read-only: written in the workout). */
function renderCapInfo() {
  const box = $("capInfo");
  box.hidden = !prog.steps.length;
  const c = sessionHrMax(prog);
  box.classList.toggle("missing", c.value == null);
  if (c.value == null) {
    box.replaceChildren(el("span", "", "FC max absente de la séance"), el("span", "h", "Pas d’alerte de FC trop haute. Demandez à l’IA d’ajouter la ligne « fc max: … »."));
    return;
  }
  const t = el("span", "", "FC max de la séance");
  const h = el("span", "h", c.raisedBy
    ? "Relevée par la plage FC de « " + c.raisedBy.name + " » (fc max: " + prog.hrMax + " dans la séance). Alerte au-dessus."
    : "Alerte au-dessus. Fixée dans la séance.");
  const left = el("span");
  left.append(t, h);
  box.replaceChildren(left, el("b", "num", c.value + " bpm"));
}

function refreshPlan() {
  prog = parseProgram(src.value);
  store.set("fitpacer.text", src.value);
  $("planTitle").textContent = prog.title;
  $("goal").hidden = !prog.goal;
  $("goalTxt").textContent = prog.goal;
  const errs = $("errors");
  errs.replaceChildren(...prog.errors.map((e) => el("li", "", e)));
  const plan = $("plan");
  plan.replaceChildren(
    ...prog.steps.map((s) => {
      const li = el("li", s.isRest ? "rest" : "");
      const a = el("span", "t" + (s.kind === "reps" ? " reps" : ""), s.kind === "time" ? fmtClock(s.dur) : s.reps === "Max" ? "max" : "x" + s.reps);
      const b = el("span", "d", s.name + (s.rep ? "  (" + s.rep.r + "/" + s.rep.n + ")" : "") + (s.kind === "reps" && s.extra ? ", " + s.extra : ""));
      if (s.hr) b.append(el("span", "planz num", "FC " + hrZoneTxt(s.hr).replace("-", "–")));
      const c = el("span", "s", s.infos.join(" · "));
      li.append(a, b, c);
      return li;
    }),
  );
  const nReps = prog.steps.filter((s) => s.kind === "reps").length;
  $("total").textContent = prog.steps.length
    ? prog.steps.length + (prog.steps.length > 1 ? " étapes" : " étape") + ", environ " + fmtLong(prog.est) + (nReps ? " (dont " + nReps + " en répétitions, durée estimée)" : "") + "."
    : "Collez une séance pour commencer.";
  $<HTMLButtonElement>("startBtn").disabled = !prog.steps.length || prog.errors.length > 0;
  renderCapInfo();
}
src.addEventListener("input", refreshPlan);

$("pasteBtn").addEventListener("click", async () => {
  try {
    const t = await navigator.clipboard.readText();
    if (!t.trim()) {
      showMsg("Le presse-papiers est vide. Copiez d’abord la séance dans la conversation avec l’IA.");
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
// Load a workout from a file on the phone (cloud drive, e-mail attachment, download…).
// The `accept` filter matters: without it, Android offers audio/camera capture and the browser
// asks for the microphone permission.
const fileIn = $("fileIn") as HTMLInputElement;
$("loadBtn").addEventListener("click", () => fileIn.click());
fileIn.addEventListener("change", async () => {
  const f = fileIn.files?.[0];
  fileIn.value = ""; // allow loading the same file again
  if (!f) return;
  if (f.size > 200_000) {
    showMsg("Fichier trop gros pour une séance (" + Math.round(f.size / 1000) + " ko). Choisissez un fichier texte (.txt ou .md).");
    return;
  }
  let t: string;
  try { t = await f.text(); } catch { showMsg("Impossible de lire ce fichier."); return; }
  if (/\0/.test(t)) { showMsg("Ce fichier n’est pas un fichier texte. Choisissez un fichier .txt ou .md."); return; }
  if (!t.trim()) { showMsg("Le fichier « " + f.name + " » est vide."); return; }
  src.value = t.replace(/^\uFEFF/, "").trim();
  refreshPlan();
  showMsg("");
  window.scrollTo(0, 0);
});
$("clearBtn").addEventListener("click", async () => {
  if (src.value.trim() && !(await askConfirm("Effacer la séance affichée ?", "Oui, effacer", "Non, garder"))) return;
  src.value = "";
  refreshPlan();
  src.focus();
});
refreshPlan();

/* ---------- Claude instructions ---------- */
$("appVersion").textContent = APP_VERSION;
$("barVersion").textContent = APP_VERSION;
$("devTag").hidden = !IS_DEV_BUILD;

/* ---------- Top menu ---------- */
const menu = $("menu");
const menuBtn = $("menuBtn");
const themeBtn = $("themeBtn");
const themeMenu = $("themeMenu");
function setThemeMenu(open: boolean) {
  themeMenu.hidden = !open;
  themeBtn.setAttribute("aria-expanded", String(open));
}
function setMenu(open: boolean) {
  menu.hidden = !open;
  if (!open) setThemeMenu(false);
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
/* ---------- Welcome popup, shown once on the very first launch ---------- */
const welcome = $<HTMLDialogElement>("welcomeDialog");
$("welcomeClaude").addEventListener("click", () => {
  welcome.close();
  $<HTMLDialogElement>("claudeDialog").showModal();
});
/* ---------- "Quoi de neuf ?" popup, shown once after each update ---------- */
const whatsNew = $<HTMLDialogElement>("whatsNewDialog");
function showWhatsNew(releases: typeof RELEASES) {
  const box = $("whatsNewList");
  box.replaceChildren();
  // A single window: one version is shown as is; several versions become collapsible sections,
  // the newest one open.
  releases.forEach((r, i) => {
    const ul = el("ul", "");
    for (const it of r.items) ul.append(el("li", "", it.replace(/« /g, "«\u00a0").replace(/ »/g, "\u00a0»")));
    if (releases.length === 1) {
      box.append(el("p", "relVer", "Version " + r.version), ul);
      return;
    }
    const d = el("details", "");
    d.open = i === 0;
    d.append(el("summary", "", "Version " + r.version), ul);
    box.append(d);
  });
  whatsNew.showModal();
  whatsNew.scrollTop = 0;
}
$("whatsNewBtn").addEventListener("click", () => {
  setMenu(false);
  showWhatsNew(RELEASES.slice(0, 3));
});
// Stable and dev apps share localStorage: each channel records its own version.
const versionKey = "fitpacer.version" + (IS_DEV_BUILD ? ".dev" : "");
if (typeof welcome.showModal === "function") {
  const seen = store.get(versionKey, "");
  const popup = launchPopup(seen, store.get("fitpacer.welcomed", "") === "1", APP_VERSION);
  // Recorded as soon as shown: never shown again, however the popup is closed.
  store.set("fitpacer.welcomed", "1");
  store.set(versionKey, APP_VERSION);
  if (popup === "welcome") {
    welcome.showModal();
    welcome.scrollTop = 0; // the focused button is at the bottom: keep the start of the text visible
  } else if (popup === "whatsnew") showWhatsNew(notesSince(seen, APP_VERSION));
}
/* ---------- Theme (dark / light) ---------- */
const themeItems = menu.querySelectorAll<HTMLButtonElement>("[data-theme-choice]");
function showTheme() {
  const t = currentTheme();
  themeItems.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.themeChoice === t)));
}
applyTheme();
showTheme();
themeBtn.addEventListener("click", () => setThemeMenu(themeMenu.hidden === true));
themeItems.forEach((b) =>
  b.addEventListener("click", () => {
    setTheme(b.dataset.themeChoice as Theme);
    showTheme();
    setMenu(false);
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
const instrName = "fitpacer-consignes-ia.md";
$("instrCopy").addEventListener("click", async (e) => {
  const ok = await copyText(claudeInstructions());
  flashIcon(e.currentTarget as HTMLElement, ok, "Copie impossible");
});
$("instrShare").addEventListener("click", async (e) => {
  const b = e.currentTarget as HTMLElement;
  const r = await shareText(instrName, claudeInstructions(), "Consignes FitPacer pour l’IA");
  if (r === "unsupported") { downloadText(instrName, claudeInstructions()); flashIcon(b, false, "Partage refusé : téléchargé"); }
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
  const fresh = hrFresh();
  $("hrVal").textContent = fresh ? String(hr) : "--";
  // With a step range: blue below, green inside, amber above; red above the session max in any case.
  const z = sess ? zoneState(hr ?? 0, sess.step.hr) : null;
  box.className = "hr num " + (!fresh ? "stale" : c != null && hr! > c ? "over" : z === "low" ? "low" : z === "high" ? "high" : z === "in" ? "calm" : c != null && hr! > c - 10 ? "near" : "calm");
  renderZone();
}

/** Step HR range (gauge + status) and danger banner, refreshed with the HR. */
function renderZone() {
  const c = capValue();
  const fresh = hrFresh();
  $("danger").hidden = !(sess && fresh && c != null && hr! > c);
  if (c != null) $("danger").textContent = "FC au-dessus de " + c + " : ralentissez, récupérez";
  const box = $("zone");
  const z: HrZone | null = sess?.step.hr ?? null;
  box.hidden = !z;
  if (!z) return;
  $("zoneRng").textContent = z.lo + " – " + z.hi;
  // Gauge scale: around the range, wide enough to show the session max.
  const lo = z.lo - 30;
  const hi = Math.max(z.hi + 20, (c ?? 0) + 10);
  const pc = (v: number) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
  const inEl = $("zoneIn");
  inEl.style.left = pc(z.lo) + "%";
  inEl.style.width = pc(z.hi) - pc(z.lo) + "%";
  const capEl = $("zoneCap");
  capEl.hidden = c == null;
  if (c != null) capEl.style.left = pc(c) + "%";
  const mk = $("zoneMk");
  mk.hidden = !fresh;
  const st = $("zoneSt");
  if (!fresh) {
    box.className = "zone nohr";
    st.textContent = "⚠ FC non reçue";
    return;
  }
  mk.style.left = pc(hr!) + "%";
  const state = c != null && hr! > c ? "danger" : zoneState(hr!, z);
  box.className = "zone " + (state === "in" ? "ok" : state);
  st.textContent = state === "danger" ? "FC max dépassée" : state === "in" ? "Dans la plage ✓" : state === "low" ? "En dessous : accélérez" : "Au-dessus : ralentissez";
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

function sparkline(svg: SVGSVGElement, pts: Sample[], total: number, c: number | null = capValue()) {
  svg.replaceChildren();
  const hrs = pts.map((p) => p.hr);
  const lo = Math.min(80, ...hrs) - 5;
  const hi = Math.max((c ?? 0) + 5, 120, ...hrs) + 5;
  const y = (v: number) => 70 - ((v - lo) / (hi - lo)) * 66 - 2;
  const ns = "http://www.w3.org/2000/svg";
  const line = document.createElementNS(ns, "line");
  line.setAttribute("class", "cap");
  line.setAttribute("x1", "0");
  line.setAttribute("x2", "300");
  line.setAttribute("y1", String(y(c ?? 0)));
  line.setAttribute("y2", String(y(c ?? 0)));
  if (c != null) svg.append(line);
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
  renderHr();
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
  // A rest step is already a pause: it cannot be extended. "Reprendre" stays available if the
  // session was paused before reaching the rest.
  $<HTMLButtonElement>("pauseBtn").disabled = s.isRest && sess.state === "running";
  // While paused: how long the pause has lasted, over the step.
  const paused = sess.state === "paused";
  $("pauseBox").hidden = !paused;
  if (paused) {
    const pz = sess.pauses[sess.pauses.length - 1];
    $("pauseFor").textContent = fmtClock(Math.max(0, Math.floor((clock.wall() - pz.wall0) / 1000)));
  }
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
    const r = box.querySelector<HTMLElement>(".r")!;
    if (st.nextAt != null) {
      const left = st.nextAt - el0;
      r.replaceChildren("→ " + rampValueTxt(ramp, ramp.to) + " · palier dans ", el("span", "rc num", fmtClock(Math.ceil(left))));
      // Same as the main clock: amber during the last 10 s (when levels are long enough to count down).
      r.classList.toggle("last", left <= 10 && st.len >= RAMP_COUNTDOWN_MIN_LEN);
    } else {
      r.textContent = "→ " + rampValueTxt(ramp, ramp.to) + " · dernier palier";
      r.classList.remove("last");
    }
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
        say(hrAlertAnnouncement(capValue()!));
        break;
      case "hrZone":
        if (sess.step.hr) {
          sounds.countdown();
          say(hrZoneAnnouncement(e.dir, sess.step.hr));
        }
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
  showMsg([
    monitor.supported ? "" : "Séance sans FC : ce navigateur ne permet pas de connecter la montre (détails : bouton « Connecter la montre »).",
    capValue(prog) == null ? NO_CAP_MSG : "",
  ].filter(Boolean).join(" "));
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
  const ok = await monitor.connect(); // opens the Bluetooth chooser
  startSession();
  if (!ok && btBtn.dataset.s !== "on")
    showMsg("Montre non connectée : séance sans FC. Le bouton en haut permet de la connecter à tout moment." + (capValue(prog) == null ? " " + NO_CAP_MSG : ""));
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
  if (sess.state === "running" && !sess.step.isRest) {
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
$("stopBtn").addEventListener("click", async () => {
  if (!sess || !(await askConfirm("Terminer la séance maintenant ?", "Oui, terminer", "Non, continuer"))) return;
  if (!sess) return;
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
  // Values coming from a sensor dropout get an orange "?" (explained under the chart).
  const doubtful = new Set(hrGlitches(finished.samples).map((g) => g.hr));
  const hrTxt = (v: number) => String(v) + (doubtful.has(v) ? "<i>?</i>" : "");
  $("stats").replaceChildren(
    ...[
      ["Durée", fmtLong(dur)],
      ["FC min / moy", st ? hrTxt(st.min) + " / " + st.avg : "–"],
      ["FC max", st ? hrTxt(st.max) : "–"],
    ].map(([k, v]) => {
      const d = el("div");
      const val = el("div", "v");
      val.innerHTML = v;
      d.append(el("div", "k", k), val);
      return d;
    }),
  );
  hrChart($("chart2"), finished.samples, Math.max(dur, 1), capValue(finished.program));
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

const exportText = () => exportMarkdown(finished!, fb, { source: runSource, appVersion: APP_VERSION, device: monitor.name });
$("copyBtn").addEventListener("click", async (e) => {
  const ok = await copyText($<HTMLTextAreaElement>("journal").value, $<HTMLTextAreaElement>("journal"));
  flashIcon(e.currentTarget as HTMLElement, ok, "Sélectionnée, copiez-la");
});
$("shareBtn").addEventListener("click", async (e) => {
  if (!finished) return;
  const b = e.currentTarget as HTMLElement;
  const r = await shareText(exportFileName(finished), exportText(), "Séance FitPacer");
  if (r === "unsupported") { downloadText(exportFileName(finished), exportText()); flashIcon(b, false, "Partage refusé : téléchargé"); }
});
$("downloadBtn").addEventListener("click", () => {
  if (finished) downloadText(exportFileName(finished), exportText());
});
$("againBtn").addEventListener("click", () => show("edit"));
