// Speech synthesis (French voice), can be switched off.
import { store } from "./store";

const KEY = "fitpacer.voice";
let enabled = store.get(KEY, "1") === "1";
let voice: SpeechSynthesisVoice | null = null;

const supported = () => typeof window !== "undefined" && "speechSynthesis" in window;

function pickVoice() {
  if (!supported()) return;
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("fr"));
  voice = vs.find((v) => /fr-FR/i.test(v.lang) && v.localService) || vs.find((v) => /fr-FR/i.test(v.lang)) || vs[0] || null;
}
if (supported()) {
  pickVoice();
  speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
}

export const voiceSupported = supported;
export const voiceEnabled = () => enabled && supported();

export function setVoiceEnabled(on: boolean) {
  enabled = on;
  store.set(KEY, on ? "1" : "0");
  if (!on && supported()) speechSynthesis.cancel();
}

/** Speaks `text`; `interrupt` cancels what is being said (new step). */
export function say(text: string, { interrupt = false, delay = 0 } = {}) {
  if (!voiceEnabled() || !text) return;
  const go = () => {
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    if (voice) u.voice = voice;
    u.rate = 1.05;
    speechSynthesis.speak(u);
  };
  if (delay) setTimeout(go, delay);
  else go();
}

/** Must be called from a user gesture on some browsers to allow later speech. */
export function unlockVoice() {
  if (!supported()) return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}
