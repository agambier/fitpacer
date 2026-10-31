// Bluetooth heart rate (standard GATT Heart Rate service 0x180D), with auto-reconnect.

/** iPhone / iPad (including iPadOS, which reports itself as a Mac). */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

export const IOS_MESSAGE =
  "⚠️ Connexion de la montre indisponible sur iPhone / iPad (iOS) : le Bluetooth web n’y est pas pris en charge. La séance fonctionne sans FC ; la montre peut enregistrer l’activité de son côté.";

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

  get supported() {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  /** Must be called from a user gesture. */
  async connect() {
    if (!this.supported && isIOS()) {
      this.cb.onMessage(IOS_MESSAGE);
      return;
    }
    if (!this.supported) {
      this.cb.onMessage(
        "Le Bluetooth web n’est pas disponible. Dans Brave, activez-le via brave://flags (option « Web Bluetooth API »), puis relancez Brave. Sinon, utilisez Chrome sur Android.",
      );
      return;
    }
    try {
      const opts: RequestDeviceOptions = this.wideScan
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
      if (err.name === "NotFoundError" && !this.wideScan) {
        this.wideScan = true;
        this.cb.onMessage(
          "Aucune montre trouvée en mode FC. Vérifiez le partage de FC et la localisation du téléphone, puis appuyez de nouveau : la recherche listera tous les appareils Bluetooth.",
        );
      } else if (err.name === "NotFoundError") {
        this.wideScan = false;
        this.cb.onMessage("Aucun appareil choisi. Vérifiez que le partage de FC est actif sur la montre et que la localisation du téléphone est activée.");
      } else if (err.name === "SecurityError") {
        this.cb.onMessage("Le navigateur bloque le Bluetooth ici. Ouvrez l’app dans son propre onglet, puis réessayez.");
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
