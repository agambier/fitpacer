// Bluetooth heart rate (standard GATT Heart Rate service 0x180D), with auto-reconnect.
import { store } from "./store";

const WATCH_KEY = "fitpacer.watch";

/** Name of the last watch connected on this phone (stored locally only), or null. */
export function savedWatch(): string | null {
  return store.get(WATCH_KEY, "") || null;
}
export function forgetWatch() {
  store.set(WATCH_KEY, "");
}

export interface BtEnv {
  secure: boolean;
  hasBluetooth: boolean;
  ua: string;
  touchPoints: number;
  isBrave: boolean;
}

export function currentBtEnv(): BtEnv {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  return {
    secure: typeof window === "undefined" || window.isSecureContext,
    hasBluetooth: !!nav && "bluetooth" in nav,
    ua: nav?.userAgent || "",
    touchPoints: nav?.maxTouchPoints || 0,
    isBrave: !!(nav as { brave?: unknown } | undefined)?.brave,
  };
}

const NO_HR = " La séance fonctionne sans FC ; la montre peut enregistrer l’activité de son côté.";

/**
 * Why the watch cannot be connected with this browser, or null when Web Bluetooth is available.
 * Order matters: iOS first (no browser there supports it, except special ones that expose navigator.bluetooth).
 */
export function btUnsupportedMessage(env: BtEnv): string | null {
  if (env.hasBluetooth && env.secure) return null;
  const ua = env.ua;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && env.touchPoints > 1);
  if (!env.secure) return "⚠️ La connexion de la montre exige une page sécurisée (adresse en https://)." + NO_HR;
  if (ios) return "⚠️ Connexion de la montre indisponible sur iPhone / iPad (iOS) : le Bluetooth web n’y est pas pris en charge." + NO_HR;
  if (env.isBrave)
    return "⚠️ Bluetooth web désactivé dans Brave. Activez-le via brave://flags (option « Web Bluetooth API »), relancez Brave, ou utilisez Chrome." + NO_HR;
  if (/Firefox|FxiOS/i.test(ua)) return "⚠️ Firefox ne prend pas en charge le Bluetooth web : utilisez Chrome (ou Brave) pour connecter la montre." + NO_HR;
  if (/SamsungBrowser/i.test(ua)) return "⚠️ Samsung Internet ne permet pas la connexion de la montre : utilisez Chrome (ou Brave)." + NO_HR;
  if (/; wv\)|FBAN|FBAV|Instagram|Line\//i.test(ua))
    return "⚠️ Ce navigateur intégré (ouvert depuis une autre app) ne permet pas le Bluetooth : ouvrez la page dans Chrome." + NO_HR;
  return "⚠️ Ce navigateur ne prend pas en charge le Bluetooth web : utilisez Chrome sur Android (ou Brave) pour connecter la montre." + NO_HR;
}

export type BtState = "off" | "connecting" | "on" | "lost";

export interface HrCallbacks {
  onHr(bpm: number): void;
  onState(state: BtState, name?: string): void;
  onMessage(msg: string): void;
}

export class HeartRateMonitor {
  device: BluetoothDevice | null = null;
  private retries = 0;
  private wideScan = false;

  constructor(private cb: HrCallbacks) {}

  get name() {
    return this.device?.name || null;
  }

  /** Web Bluetooth usable in this browser (it may still be switched off on the phone). */
  get supported() {
    return btUnsupportedMessage(currentBtEnv()) === null;
  }

  /**
   * Must be called from a user gesture.
   * `saved`: the chooser only lists the watch connected last time (still needs a tap on "Associer").
   */
  async connect(saved = false) {
    const savedName = saved ? savedWatch() : null;
    const unsupported = btUnsupportedMessage(currentBtEnv());
    if (unsupported) {
      this.cb.onMessage(unsupported);
      return;
    }
    try {
      // Bluetooth switched off, no adapter, or blocked by a policy.
      if (navigator.bluetooth.getAvailability && !(await navigator.bluetooth.getAvailability())) {
        this.cb.onMessage("⚠️ Bluetooth indisponible : activez le Bluetooth du téléphone, puis réessayez.");
        return;
      }
    } catch {
      /* getAvailability not usable: try anyway */
    }
    try {
      const opts: RequestDeviceOptions = savedName
        ? { filters: [{ name: savedName }], optionalServices: ["heart_rate"] }
        : this.wideScan
          ? { acceptAllDevices: true, optionalServices: ["heart_rate"] }
          : { filters: [{ services: ["heart_rate"] }] };
      const dev = await navigator.bluetooth.requestDevice(opts);
      if (this.device && this.device !== dev) this.device.removeEventListener("gattserverdisconnected", this.onDisconnect);
      this.device = dev;
      this.retries = 0;
      dev.addEventListener("gattserverdisconnected", this.onDisconnect);
      await this.attach(dev);
    } catch (e) {
      const err = e as Error;
      this.cb.onState(this.device?.gatt?.connected ? "on" : "off", this.device?.name);
      if (err.name === "NotFoundError" && savedName) {
        this.cb.onMessage(
          "« " + savedName + " » n’a pas été trouvée (ou la recherche a été annulée). Vérifiez que le partage de FC est actif sur la montre, ou choisissez une autre montre.",
        );
      } else if (err.name === "NotFoundError" && !this.wideScan) {
        this.wideScan = true;
        this.cb.onMessage(
          "Aucune montre trouvée en mode FC. Vérifiez le partage de FC et la localisation du téléphone, puis appuyez de nouveau : la recherche listera tous les appareils Bluetooth.",
        );
      } else if (err.name === "NotFoundError") {
        this.wideScan = false;
        this.cb.onMessage("Aucun appareil choisi. Vérifiez que le partage de FC est actif sur la montre et que la localisation du téléphone est activée.");
      } else if (err.name === "SecurityError" || err.name === "NotAllowedError") {
        this.cb.onMessage(
          "⚠️ Le navigateur bloque le Bluetooth pour ce site. Autorisez-le dans les paramètres du site (icône à gauche de l’adresse → Autorisations), ou ouvrez l’app dans Chrome.",
        );
      } else {
        this.cb.onMessage("Connexion impossible : " + err.message);
      }
    }
  }

  get wide() {
    return this.wideScan;
  }

  private async attach(dev: BluetoothDevice) {
    this.cb.onState("connecting");
    const server = await dev.gatt!.connect();
    let svc: BluetoothRemoteGATTService;
    try {
      svc = await server.getPrimaryService("heart_rate");
    } catch {
      this.device = null;
      try { dev.gatt!.disconnect(); } catch { /* ignore */ }
      throw new Error((dev.name || "Cet appareil") + " ne diffuse pas de FC. Activez le partage de FC sur la montre.");
    }
    const ch = await svc.getCharacteristic("heart_rate_measurement");
    ch.addEventListener("characteristicvaluechanged", (ev) => {
      const v = (ev.target as BluetoothRemoteGATTCharacteristic).value!;
      const flags = v.getUint8(0);
      const bpm = flags & 1 ? v.getUint16(1, true) : v.getUint8(1);
      if (bpm) this.cb.onHr(bpm);
    });
    await ch.startNotifications();
    this.retries = 0;
    if (dev.name) store.set(WATCH_KEY, dev.name);
    this.cb.onState("on", dev.name);
    this.cb.onMessage("");
  }

  private onDisconnect = () => {
    const dev = this.device;
    if (!dev) return;
    this.cb.onState("lost");
    if (this.retries++ < 15) {
      setTimeout(() => {
        if (this.device === dev) this.attach(dev).catch(this.onDisconnect);
      }, Math.min(1000 * this.retries, 5000));
    } else {
      this.cb.onState("off");
      this.cb.onMessage("La montre ne répond plus. Vérifiez que le partage de FC est actif, puis appuyez sur « Connecter la montre ».");
    }
  };
}
