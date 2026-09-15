import { Platform } from "react-native";
import { encode, decode } from "base-64";

export type ConnectionMode = "classic" | "ble" | "usb";
export type ObdReading = { name: string; value: string; unit: string; command: string; updatedAt: number };
export type Dtc = { code: string; description: string; status: "stored" | "pending" | "permanent" };

const SPP_UUID = "00001101-0000-1000-8000-00805F9B34FB";

const PID_COMMANDS = [
  { name: "RPM", command: "010C", unit: "rpm" },
  { name: "Velocidad", command: "010D", unit: "km/h" },
  { name: "Temperatura", command: "0105", unit: "°C" },
  { name: "Carga motor", command: "0104", unit: "%" },
  { name: "Acelerador", command: "0111", unit: "%" },
  { name: "MAF", command: "0110", unit: "g/s" },
  { name: "Temp. admisión", command: "010F", unit: "°C" },
  { name: "Presión admisión", command: "010B", unit: "kPa" },
  { name: "Nivel combustible", command: "012F", unit: "%" },
];

// Protocolos ELM327 (ATSPn) probados en cascada cuando la auto-detección (ATSP0) no logra hablar con la ECU.
const PROTOCOL_FALLBACK: { code: string; label: string }[] = [
  { code: "6", label: "ISO 15765-4 CAN 11bit/500k" },
  { code: "8", label: "ISO 15765-4 CAN 11bit/250k" },
  { code: "7", label: "ISO 15765-4 CAN 29bit/500k" },
  { code: "9", label: "ISO 15765-4 CAN 29bit/250k" },
  { code: "3", label: "ISO 9141-2" },
  { code: "4", label: "ISO 14230-4 KWP (5-baud)" },
  { code: "5", label: "ISO 14230-4 KWP (fast)" },
  { code: "1", label: "SAE J1850 PWM" },
  { code: "2", label: "SAE J1850 VPW" },
];

// UUIDs BLE conocidos de adaptadores ELM327 / clones (probados antes del descubrimiento genérico).
const KNOWN_BLE_PROFILES = [
  { service: "0000ffe0-0000-1000-8000-00805f9b34fb", write: "0000ffe1-0000-1000-8000-00805f9b34fb", notify: "0000ffe1-0000-1000-8000-00805f9b34fb" }, // HM-10 / clones genéricos
  { service: "6e400001-b5a3-f393-e0a9-e50e24dcca9e", write: "6e400002-b5a3-f393-e0a9-e50e24dcca9e", notify: "6e400003-b5a3-f393-e0a9-e50e24dcca9e" }, // Nordic UART
  { service: "0000fff0-0000-1000-8000-00805f9b34fb", write: "0000fff2-0000-1000-8000-00805f9b34fb", notify: "0000fff1-0000-1000-8000-00805f9b34fb" }, // Vgate/iCar tipo FFF0
];

const ELM327_NAME_PATTERNS = /obd|elm327|elm 327|obdii|obd2|vlink|vgate|icar|konnwei|bafx|torque|veepeak|blueobd|wifi327/i;

function nativeClassic(): any | null {
  if (Platform.OS === "web") return null;
  try { const module = require("react-native-bluetooth-classic"); return module.default || module; } catch { return null; }
}
function nativeBle(): any | null {
  if (Platform.OS === "web") return null;
  try { return require("react-native-ble-plx"); } catch { return null; }
}

export function isLikelyElm327Name(name?: string | null): boolean {
  return Boolean(name && ELM327_NAME_PATTERNS.test(name));
}

function sortByLikelyMatch<T extends { name?: string }>(devices: T[]): T[] {
  return [...devices].sort((a, b) => Number(isLikelyElm327Name(b.name)) - Number(isLikelyElm327Name(a.name)));
}

export class Elm327Client {
  private device: any = null;
  private subscription: any = null;
  private disconnectSubscription: any = null;
  private mode: ConnectionMode | null = null;
  private response = "";
  private onStatus?: (status: string) => void;
  private onData?: (data: string) => void;
  private onUnexpectedDisconnect?: () => void;

  // Cola de comandos: evita que dos operaciones (p.ej. el refresco automático y la terminal AT)
  // escriban/lean sobre el mismo buffer serial al mismo tiempo.
  private queue: Promise<unknown> = Promise.resolve();
  private pendingResolve: ((raw: string) => void) | null = null;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;

  private connectedProtocol: string | null = null;
  private adapterId = "";

  constructor(callbacks: { onStatus?: (status: string) => void; onData?: (data: string) => void; onUnexpectedDisconnect?: () => void } = {}) {
    this.onStatus = callbacks.onStatus;
    this.onData = callbacks.onData;
    this.onUnexpectedDisconnect = callbacks.onUnexpectedDisconnect;
  }

  // ---------- Descubrimiento ----------

  async listDevices(): Promise<any[]> {
    const classic = nativeClassic();
    if (!classic?.getBondedDevices) return [];
    const enabled = await classic.isBluetoothEnabled();
    if (!enabled) await classic.requestBluetoothEnabled();
    const bonded = (await classic.getBondedDevices()).map((d: any) => Object.assign(d, { paired: true }));
    let discovered: any[] = [];
    try { discovered = classic.startDiscovery ? (await classic.startDiscovery()).map((d: any) => Object.assign(d, { paired: false })) : []; } catch { discovered = []; }
    const all = [...bonded, ...discovered].filter((d: any, index: number, list: any[]) => list.findIndex((x) => x.address === d.address) === index);
    return sortByLikelyMatch(all.map((d: any) => Object.assign(d, { mode: "classic", likely: isLikelyElm327Name(d.name) })));
  }

  async scanBle(timeoutMs = 15000): Promise<any[]> {
    const ble = nativeBle();
    if (!ble?.BleManager) return [];
    const manager = new ble.BleManager();
    const found: any[] = [];
    return new Promise((resolve) => {
      let earlyExitTimer: ReturnType<typeof setTimeout> | null = null;
      const finish = () => {
        try { manager.stopDeviceScan(); } catch {}
        if (earlyExitTimer) clearTimeout(earlyExitTimer);
        resolve(sortByLikelyMatch(found));
      };
      const timer = setTimeout(finish, timeoutMs);
      manager.startDeviceScan(null, { allowDuplicates: false }, (error: any, device: any) => {
        if (error || !device?.id || found.some((x) => x.id === device.id)) return;
        const entry = { ...device, mode: "ble", likely: isLikelyElm327Name(device.name) };
        found.push(entry);
        // Si aparece un nombre que claramente es un adaptador OBD, no hace falta agotar los 15s.
        if (entry.likely && !earlyExitTimer) earlyExitTimer = setTimeout(finish, 1500);
      });
      void timer;
    });
  }

  // ---------- Emparejado ----------

  async pair(device: any): Promise<void> {
    const classic = nativeClassic();
    if (!classic?.pairDevice) throw new Error("El emparejamiento requiere una compilación Android nativa");
    this.onStatus?.("Esperando confirmación de emparejamiento…");
    await classic.pairDevice(device.address || device.id);
    this.onStatus?.("Emparejado; conectando…");
  }

  // ---------- Conexión ----------

  /**
   * Conecta y ejecuta el handshake ELM327. Reintenta hasta `attempts` veces
   * (con backoff corto) antes de rendirse, porque el primer intento de SPP
   * falla con frecuencia en Android aunque el adaptador esté bien.
   */
  async connect(device: any, mode: ConnectionMode = device?.mode || "classic", attempts = 3): Promise<void> {
    let lastError: any = null;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        if (attempt > 1) this.onStatus?.(`Reintentando conexión (${attempt}/${attempts})…`);
        await this.connectOnce(device, mode);
        return;
      } catch (error) {
        lastError = error;
        await this.disconnect(true);
        if (attempt < attempts) await this.delay(600 * attempt);
      }
    }
    this.onStatus?.("No se pudo conectar con el ELM327");
    throw lastError instanceof Error ? lastError : new Error("No se pudo conectar con el ELM327");
  }

  private async connectOnce(device: any, mode: ConnectionMode): Promise<void> {
    this.mode = mode;
    this.response = "";
    this.onStatus?.("Conectando…");

    if (mode === "classic") await this.connectClassic(device);
    else if (mode === "ble") await this.connectBle(device);
    else throw new Error("USB está preparado para integración nativa específica del adaptador");

    this.onStatus?.("Inicializando ELM327…");
    await this.initHandshake();

    this.onStatus?.(this.mode === "ble" ? "Conectado por BLE" : "Conectado");
  }

  private async connectClassic(device: any): Promise<void> {
    const classic = nativeClassic();
    if (!classic?.connectToDevice && !device?.connect) throw new Error("Bluetooth clásico requiere una compilación Android nativa");

    this.device = device?.connect
      ? device
      : await this.withTimeout(classic.connectToDevice(device.address || device.id, { uuid: SPP_UUID, delimiter: "" }), 12000, "Tiempo de espera agotado conectando por SPP");

    this.subscription = this.device.onDataReceived?.((event: any) => this.handleIncoming(event?.data || ""));
    this.disconnectSubscription = this.device.onDisconnected?.(() => this.handleUnexpectedDisconnect());

    if (device?.connect) await this.withTimeout(this.device.connect({ uuid: SPP_UUID, delimiter: "" }), 12000, "Tiempo de espera agotado conectando por SPP");
  }

  private async connectBle(device: any): Promise<void> {
    const ble = nativeBle();
    if (!ble?.BleManager) throw new Error("BLE requiere una compilación Android nativa");
    const manager = new ble.BleManager();
    this.device = await this.withTimeout(manager.connectToDevice(device.id), 12000, "Tiempo de espera agotado conectando por BLE");
    await this.device.discoverAllServicesAndCharacteristics();

    manager.onDeviceDisconnected?.(this.device.id, () => this.handleUnexpectedDisconnect());

    // 1) Intentar primero perfiles conocidos de clones ELM327 (más rápido y confiable).
    for (const profile of KNOWN_BLE_PROFILES) {
      try {
        const characteristics = await this.device.characteristicsForService(profile.service);
        const writable = characteristics.find((c: any) => c.uuid.toLowerCase() === profile.write.toLowerCase());
        const notifiable = characteristics.find((c: any) => c.uuid.toLowerCase() === profile.notify.toLowerCase());
        if (writable) {
          this.device.writeCharacteristic = writable;
          if (notifiable) this.subscription = manager.monitorCharacteristicForDevice(this.device.id, profile.service, notifiable.uuid, (error: any, characteristic: any) => {
            if (!error && characteristic?.value) this.handleIncoming(this.decodeBase64(characteristic.value));
          });
          return;
        }
      } catch { /* este perfil no existe en el dispositivo, seguimos probando */ }
    }

    // 2) Fallback genérico: primera característica escribible/notificable que encontremos.
    const services = await this.device.services();
    for (const service of services) {
      const characteristics = await this.device.characteristicsForService(service.uuid);
      const writable = characteristics.find((c: any) => c.isWritableWithResponse || c.isWritableWithoutResponse);
      const notifiable = characteristics.find((c: any) => c.isNotifiable || c.isIndicatable);
      if (notifiable) this.subscription = manager.monitorCharacteristicForDevice(this.device.id, service.uuid, notifiable.uuid, (error: any, characteristic: any) => {
        if (!error && characteristic?.value) this.handleIncoming(this.decodeBase64(characteristic.value));
      });
      if (writable) this.device.writeCharacteristic = writable;
      if (writable && notifiable) break;
    }
    if (!this.device.writeCharacteristic) throw new Error("No se encontró una característica BLE escribible en el adaptador");
  }

  private handleUnexpectedDisconnect(): void {
    if (!this.device) return; // ya lo desconectamos nosotros mismos
    this.device = null;
    this.subscription = null;
    this.mode = null;
    this.onStatus?.("Desconectado (conexión perdida)");
    this.onUnexpectedDisconnect?.();
  }

  // ---------- Handshake / inicialización ----------

  private async initHandshake(): Promise<void> {
    // Reset y verificación de identidad: si ATZ no devuelve nada, no es (o no responde como) un ELM327.
    const boot = await this.rawTransact("ATZ", 3000, 2);
    if (!this.cleanResponse(boot)) throw new Error("El adaptador no respondió a ATZ: no parece ser un ELM327 o el módulo Bluetooth está mal emparejado");
    this.adapterId = this.cleanResponse(boot);

    await this.rawTransact("ATE0", 1500, 2); // eco off
    await this.rawTransact("ATL0", 1500, 2); // saltos de línea off
    await this.rawTransact("ATS0", 1500, 2); // espacios off
    await this.rawTransact("ATH0", 1500, 2); // encabezados off
    await this.rawTransact("ATAT1", 1500, 1); // timing adaptativo (mejora confiabilidad en buses lentos)

    // Auto-detección de protocolo primero.
    await this.rawTransact("ATSP0", 1500, 2);
    let confirmed = await this.confirmEcuTalking();
    if (confirmed) { this.connectedProtocol = "Auto (0)"; return; }

    // Si la auto-detección no encontró la ECU, forzamos protocolos comunes en cascada.
    for (const protocol of PROTOCOL_FALLBACK) {
      this.onStatus?.(`Probando protocolo ${protocol.label}…`);
      await this.rawTransact(`ATSP${protocol.code}`, 1200, 1);
      confirmed = await this.confirmEcuTalking();
      if (confirmed) { this.connectedProtocol = protocol.label; return; }
    }

    // No se pudo confirmar comunicación con la ECU, pero el adaptador sí responde:
    // dejamos la conexión abierta (el auto puede estar apagado / en OFF) en vez de
    // cortarla, y devolvemos igual, ya que el objetivo mínimo es "hablar con el ELM327".
    this.connectedProtocol = "Sin confirmar (adaptador OK, ECU sin respuesta)";
  }

  private async confirmEcuTalking(): Promise<boolean> {
    const raw = await this.rawTransact("0100", 2000, 1); // PIDs soportados 01-20
    const clean = this.cleanResponse(raw).toUpperCase();
    if (!clean) return false;
    if (clean.includes("NO DATA") || clean.includes("UNABLE") || clean.includes("ERROR") || clean === "?") return false;
    return /41\s*00/.test(clean) || /^[0-9A-F\s]+$/.test(clean.replace(/SEARCHING\.*/gi, "").trim()) && clean.replace(/[^0-9A-F]/g, "").length >= 4;
  }

  getConnectedProtocol(): string | null { return this.connectedProtocol; }
  getAdapterId(): string { return this.adapterId; }

  async readAdapterVoltage(): Promise<string> {
    const raw = await this.rawTransact("ATRV", 1200, 1);
    const clean = this.cleanResponse(raw);
    return clean || "Esperando…";
  }

  // ---------- Lectura de datos ----------

  async readLive(): Promise<ObdReading[]> {
    const values: ObdReading[] = [];
    for (const pid of PID_COMMANDS) {
      const raw = await this.rawTransact(pid.command, 1500, 1);
      const clean = this.cleanResponse(raw);
      const value = this.decode(pid.command, clean);
      if (value !== null) values.push({ ...pid, value: String(value), updatedAt: Date.now() });
    }
    return values;
  }

  async readDtc(): Promise<Dtc[]> {
    const raw = await this.rawTransact("03", 2000, 1);
    return this.decodeCodes(this.cleanResponse(raw), "stored");
  }

  async readPendingDtc(): Promise<Dtc[]> {
    const raw = await this.rawTransact("07", 2000, 1);
    return this.decodeCodes(this.cleanResponse(raw), "pending");
  }

  async clearDtc(): Promise<string> {
    await this.rawTransact("04", 2000, 1);
    return "Comando de borrado enviado a la ECU";
  }

  async sendCommand(command: string): Promise<string> {
    const raw = await this.rawTransact(command.trim(), 3000, 0);
    const clean = this.cleanResponse(raw);
    return clean || "(sin respuesta)";
  }

  async disconnect(silent = false): Promise<void> {
    try { this.subscription?.remove?.(); } catch {}
    try { this.disconnectSubscription?.remove?.(); } catch {}
    try { await this.device?.disconnect?.(); } catch {}
    this.subscription = null;
    this.disconnectSubscription = null;
    this.device = null;
    this.mode = null;
    this.connectedProtocol = null;
    if (this.pendingResolve) { this.pendingResolve(this.response); this.pendingResolve = null; }
    if (this.pendingTimer) { clearTimeout(this.pendingTimer); this.pendingTimer = null; }
    if (!silent) this.onStatus?.("Desconectado");
  }

  // ---------- Transporte de bajo nivel ----------

  private handleIncoming(chunk: string) {
    if (!chunk) return;
    this.response += chunk;
    this.onData?.(chunk);
    if (this.response.includes(">") && this.pendingResolve) {
      const resolve = this.pendingResolve;
      this.pendingResolve = null;
      if (this.pendingTimer) { clearTimeout(this.pendingTimer); this.pendingTimer = null; }
      resolve(this.response);
    }
  }

  private waitForPrompt(timeoutMs: number): Promise<string> {
    if (this.response.includes(">")) return Promise.resolve(this.response);
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.pendingTimer = setTimeout(() => {
        this.pendingResolve = null;
        resolve(this.response); // se agotó el tiempo: devolvemos lo que haya llegado en vez de colgar para siempre
      }, timeoutMs);
    });
  }

  /** Serializa comandos para que nunca se lean/escriban dos a la vez sobre el mismo enlace serial. */
  private rawTransact(command: string, timeoutMs: number, retries: number): Promise<string> {
    const run = () => this.queue.then(async () => {
      let lastRaw = "";
      for (let attempt = 0; attempt <= retries; attempt++) {
        this.response = "";
        const waiter = this.waitForPrompt(timeoutMs);
        await this.write(command);
        lastRaw = await waiter;
        const clean = this.cleanResponse(lastRaw);
        if (clean) return lastRaw;
        if (attempt < retries) await this.delay(200);
      }
      return lastRaw;
    });
    const result = run();
    this.queue = result.then(() => undefined, () => undefined);
    return result as Promise<string>;
  }

  private async write(command: string): Promise<void> {
    if (!this.device) throw new Error("No hay una conexión activa con el ELM327");
    if (this.mode === "classic") {
      await this.device.write(`${command}\r`);
    } else if (this.mode === "ble") {
      const characteristic = this.device.writeCharacteristic;
      if (!characteristic) throw new Error("No se encontró una característica BLE escribible");
      const value = this.encodeBase64(`${command}\r`);
      if (characteristic.isWritableWithResponse) await characteristic.writeWithResponse(value);
      else await characteristic.writeWithoutResponse(value);
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); });
    try { return await Promise.race([promise, timeout]); } finally { clearTimeout(timer!); }
  }

  private cleanResponse(raw: string): string {
    return raw
      .replace(/SEARCHING\.*/gi, "")
      .replace(/[\r\n>]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private decode(command: string, clean: string): number | null {
    const upper = clean.toUpperCase();
    if (!upper || upper.includes("NO DATA") || upper.includes("UNABLE") || upper.includes("ERROR") || upper === "?") return null;
    const bytes = upper.replace(/[^0-9A-F]/g, "");
    const index = bytes.indexOf(command.slice(2));
    const hex = index >= 0 ? bytes.slice(index + 2, index + 6) : "";
    if (hex.length < 2) return null;
    const a = parseInt(hex.slice(0, 2), 16);
    const b = parseInt(hex.slice(2, 4) || "00", 16);
    if (command === "010C") return Math.round(((a * 256 + b) / 4) * 10) / 10;
    if (command === "010D") return a;
    if (command === "0105" || command === "010F") return a - 40;
    if (command === "0104" || command === "0111" || command === "012F") return Math.round((a * 100 / 255) * 10) / 10;
    if (command === "0110") return Math.round(((a * 256 + b) / 100) * 10) / 10;
    if (command === "010B") return a;
    return null;
  }

  private decodeCodes(clean: string, status: Dtc["status"]): Dtc[] {
    const bytes = clean.toUpperCase().replace(/[^0-9A-F]/g, "");
    const result: Dtc[] = [];
    for (let i = 0; i + 4 <= bytes.length; i += 4) {
      const chunk = bytes.slice(i, i + 4);
      if (chunk === "4300" || chunk === "0000" || chunk === "4700") continue;
      const first = parseInt(chunk[0], 16);
      const type = ["P", "C", "B", "U"][first >> 2] || "P";
      const code = `${type}${chunk.slice(1)}`;
      if (/^[PCBU][0-9A-F]{3}$/.test(code)) result.push({ code, description: "Código reportado por la ECU", status });
    }
    return result;
  }

  private delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
  private encodeBase64(text: string) { return encode(text); }
  private decodeBase64(value: string) { return decode(value); }
}

export const ELM327_PID_COMMANDS = PID_COMMANDS;
export const elm327HasNativeBluetooth = () => Boolean(nativeClassic() || nativeBle());
