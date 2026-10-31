// Beeps (WebAudio), vibrations and screen wake lock.
let actx: AudioContext | null = null;
let wakeLock: WakeLockSentinel | null = null;

/** Must be called from a user gesture (autoplay policy). */
export function unlockAudio() {
  try {
    actx = actx || new (window.AudioContext || (window as any).webkitAudioContext)();
    void actx.resume();
  } catch {
    actx = null;
  }
}

export function beep(freq: number, ms: number, delay = 0) {
  if (!actx) return;
  const t = actx.currentTime + delay / 1000;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  o.connect(g).connect(actx.destination);
  o.start(t);
  o.stop(t + ms / 1000 + 0.02);
}

export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

export async function keepAwake() {
  try {
    if ("wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => (wakeLock = null));
    }
  } catch {
    /* refused (battery saver…) */
  }
}

export function releaseAwake() {
  try {
    void wakeLock?.release();
  } catch {
    /* ignore */
  }
  wakeLock = null;
}

export const sounds = {
  start: () => beep(988, 250),
  countdown: () => { beep(880, 160); buzz(80); },
  step: () => { beep(1175, 450); buzz([300, 120, 300]); },
  ramp: () => { beep(1046, 120); beep(1318, 120, 170); buzz([120, 80, 120]); },
  hrAlert: () => { beep(440, 600); buzz([500, 200, 500]); },
  finish: () => { beep(660, 300); beep(990, 500, 320); buzz([400, 150, 400, 150, 600]); },
};
